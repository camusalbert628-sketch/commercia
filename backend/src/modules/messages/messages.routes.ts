import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// =========================================================================
// HELPER: Sync legacy individual messages if any were created without recipient rows
// =========================================================================
async function syncLegacyMessagesForUser(prisma: any, userId: string) {
  try {
    const legacyMessages = await prisma.communicationMessage.findMany({
      where: {
        recipientId: userId,
        recipients: { none: { userId } },
      },
    });

    if (legacyMessages.length > 0) {
      await prisma.communicationRecipient.createMany({
        data: legacyMessages.map((m: any) => ({
          messageId: m.id,
          userId,
          status: 'unread',
          deliveredAt: m.createdAt,
          createdAt: m.createdAt,
        })),
        skipDuplicates: true,
      });
    }
  } catch (err) {
    console.warn('[MESSAGES] Legacy sync warning:', err);
  }
}

// =========================================================================
// 1. GET /api/messages — Boîte de réception de l'utilisateur connecté
// =========================================================================
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    await syncLegacyMessagesForUser(req.prisma, userId);

    const search = ((req.query.search as string) || '').trim();
    const filter = (req.query.filter as string) || 'all'; // all, unread, read, important, urgent
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Conditions sur CommunicationRecipient
    const recipientWhere: any = {
      userId,
    };

    if (filter === 'unread') {
      recipientWhere.status = 'unread';
    } else if (filter === 'read') {
      recipientWhere.status = 'read';
    }

    // Conditions sur le message associé
    const messageWhere: any = {};

    if (filter === 'important') {
      messageWhere.importance = 'important';
    } else if (filter === 'urgent') {
      messageWhere.importance = 'urgent';
    }

    if (search) {
      messageWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(messageWhere).length > 0) {
      recipientWhere.message = messageWhere;
    }

    const [recipients, total, unreadCount] = await Promise.all([
      req.prisma.communicationRecipient.findMany({
        where: recipientWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          message: {
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      }),
      req.prisma.communicationRecipient.count({ where: recipientWhere }),
      req.prisma.communicationRecipient.count({
        where: { userId, status: 'unread' },
      }),
    ]);

    const formattedMessages = recipients.map((r: any) => {
      const msg = r.message;
      const senderName = msg.sender
        ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || 'Administration COMMERCIA'
        : 'Direction COMMERCIA';

      return {
        id: r.id, // ID du recipient pour les actions de statut
        messageId: msg.id,
        title: msg.title,
        content: msg.content,
        importance: msg.importance || 'info', // 'info' | 'important' | 'urgent'
        status: r.status, // 'unread' | 'read'
        type: msg.type, // 'individual' | 'group' | 'broadcast'
        channel: msg.channel,
        senderName,
        deliveredAt: r.deliveredAt,
        createdAt: msg.createdAt,
        readAt: r.readAt,
      };
    });

    res.json({
      messages: formattedMessages,
      unreadCount,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. GET /api/messages/unread-count — Compteur en direct des messages non lus
// =========================================================================
router.get('/unread-count', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    await syncLegacyMessagesForUser(req.prisma, userId);

    const unreadCount = await req.prisma.communicationRecipient.count({
      where: { userId, status: 'unread' },
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. GET /api/messages/:id — Consultation d'un message avec passage auto à Lu
// =========================================================================
router.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // L'identifiant peut être l'ID de CommunicationRecipient OU le messageId
    let recipient = await req.prisma.communicationRecipient.findFirst({
      where: {
        userId,
        OR: [{ id }, { messageId: id }],
      },
      include: {
        message: {
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!recipient) {
      throw new AppError('Message introuvable ou non autorisé.', 404);
    }

    // Si le message est encore non lu, on le marque automatiquement comme lu
    if (recipient.status === 'unread') {
      const now = new Date();
      recipient = await req.prisma.communicationRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'read',
          readAt: now,
        },
        include: {
          message: {
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      });

      // Mettre à jour les stats du message parent
      await req.prisma.communicationMessage.update({
        where: { id: recipient.messageId },
        data: { readAt: now },
      }).catch(() => {});
    }

    const msg = recipient.message;
    const senderName = msg.sender
      ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || 'Administration COMMERCIA'
      : 'Direction COMMERCIA';

    res.json({
      message: {
        id: recipient.id,
        messageId: msg.id,
        title: msg.title,
        content: msg.content,
        importance: msg.importance || 'info',
        status: recipient.status,
        type: msg.type,
        channel: msg.channel,
        senderName,
        deliveredAt: recipient.deliveredAt,
        createdAt: msg.createdAt,
        readAt: recipient.readAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 4. PATCH /api/messages/:id/read — Marquer manuellement comme lu
// =========================================================================
router.patch('/:id/read', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const recipient = await req.prisma.communicationRecipient.findFirst({
      where: {
        userId,
        OR: [{ id }, { messageId: id }],
      },
    });

    if (!recipient) {
      throw new AppError('Message introuvable.', 404);
    }

    const now = new Date();
    const updated = await req.prisma.communicationRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'read',
        readAt: recipient.readAt || now,
      },
    });

    const unreadCount = await req.prisma.communicationRecipient.count({
      where: { userId, status: 'unread' },
    });

    res.json({ success: true, status: updated.status, readAt: updated.readAt, unreadCount });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 5. PATCH /api/messages/mark-all-read — Tout marquer comme lu
// =========================================================================
router.patch('/actions/mark-all-read', async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const result = await req.prisma.communicationRecipient.updateMany({
      where: {
        userId,
        status: 'unread',
      },
      data: {
        status: 'read',
        readAt: now,
      },
    });

    res.json({
      success: true,
      updatedCount: result.count,
      unreadCount: 0,
      message: `${result.count} message(s) marqué(s) comme lu(s).`,
    });
  } catch (error) {
    next(error);
  }
});

export { router as messagesRouter };

