import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// =========================================================================
// 0. LISTE DES UTILISATEURS / COMMERÇANTS DISPONIBLES POUR LA MESSAGERIE
// =========================================================================
router.get('/communication/users', async (req: AuthRequest, res: Response, next) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const planFilter = (req.query.plan as string) || 'all';

    // Seuls les comptes commerçants (non-admin) sont des destinataires éligibles
    const users = await req.prisma.user.findMany({
      where: {
        isAdmin: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            plan: { select: { name: true, priceXAF: true } },
          },
        },
        businesses: {
          select: {
            business: { select: { id: true, name: true, sector: true } },
          },
          take: 1,
        },
      },
    });

    const formattedUsers = users
      .map((u: any) => {
        const businessName = u.businesses?.[0]?.business?.name || 'Commerce sans nom';
        const planName = u.subscription?.plan?.name || 'free';
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Commerçant';

        return {
          id: u.id,
          email: u.email,
          fullName,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          businessName,
          plan: planName,
          isActive: u.isActive,
          createdAt: u.createdAt,
        };
      })
      .filter((u: any) => {
        if (planFilter !== 'all' && u.plan.toLowerCase() !== planFilter.toLowerCase()) {
          return false;
        }
        if (!search) return true;
        return (
          u.fullName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.businessName.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search) ||
          (u.phone && u.phone.toLowerCase().includes(search))
        );
      });

    res.json({
      users: formattedUsers,
      total: formattedUsers.length,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 1. MODE A — MESSAGE PERSONNEL À UN UTILISATEUR PRÉCIS
// =========================================================================
router.post('/communication/send-individual', async (req: AuthRequest, res: Response, next) => {
  try {
    const { userId, title, content, importance, channel, templateId } = req.body || {};

    if (!userId || !title || !content) {
      throw new AppError('Destinataire, titre et contenu sont obligatoires.', 400);
    }

    const recipient = await req.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!recipient) {
      throw new AppError('Utilisateur destinataire introuvable en base de données.', 404);
    }

    const validImportance = ['info', 'important', 'urgent'].includes(importance)
      ? importance
      : 'info';

    const validChannel = channel || 'internal_notification';

    // 1. Enregistrement dans CommunicationMessage
    const comm = await req.prisma.communicationMessage.create({
      data: {
        type: 'personal',
        recipientId: recipient.id,
        importance: validImportance,
        channel: validChannel,
        title: title.trim(),
        content: content.trim(),
        templateId: templateId || null,
        status: 'delivered',
        sentBy: req.userId!,
        recipientCount: 1,
        successCount: 1,
        failureCount: 0,
      },
    });

    // 2. Création de l'entrée CommunicationRecipient pour le suivi de lecture
    await req.prisma.communicationRecipient.create({
      data: {
        messageId: comm.id,
        userId: recipient.id,
        status: 'unread',
        deliveredAt: new Date(),
      },
    });

    // 3. Création de la notification in-app dans la cloche du dashboard
    await req.prisma.notification.create({
      data: {
        userId: recipient.id,
        type: 'admin_message',
        title: `Message Admin: ${title.trim()}`,
        message: content.trim(),
      },
    });

    // 4. Journal d'audit officiel
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'COMMUNICATION_INDIVIDUAL_SENT',
        entity: 'CommunicationMessage',
        entityId: comm.id,
        details: JSON.stringify({
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          importance: validImportance,
          title: title.trim(),
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: `Message personnel envoyé avec succès à ${recipient.firstName || ''} ${recipient.lastName || ''} (${recipient.email}).`,
      communication: comm,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. MODE B — MESSAGE GROUPÉ À PLUSIEURS UTILISATEURS SÉLECTIONNÉS
// =========================================================================
router.post('/communication/send-group', async (req: AuthRequest, res: Response, next) => {
  try {
    const { userIds, title, content, importance, channel, templateId } = req.body || {};

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('Veuillez sélectionner au moins un utilisateur destinataire.', 400);
    }

    if (!title || !content) {
      throw new AppError('Le titre et le contenu du message sont obligatoires.', 400);
    }

    // Récupérer les utilisateurs valides non-admin
    const targetUsers = await req.prisma.user.findMany({
      where: {
        id: { in: userIds },
        isAdmin: false,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (targetUsers.length === 0) {
      throw new AppError('Aucun destinataire commerçant valide trouvé.', 404);
    }

    const validImportance = ['info', 'important', 'urgent'].includes(importance)
      ? importance
      : 'info';

    // 1. Enregistrement de la communication groupée
    const comm = await req.prisma.communicationMessage.create({
      data: {
        type: 'group',
        importance: validImportance,
        channel: channel || 'internal_notification',
        title: title.trim(),
        content: content.trim(),
        templateId: templateId || null,
        status: 'delivered',
        sentBy: req.userId!,
        recipientCount: targetUsers.length,
        successCount: targetUsers.length,
        failureCount: 0,
      },
    });

    // 2. Création par lot des destinataires avec statut non lu
    const recipientsData = targetUsers.map((u: any) => ({
      messageId: comm.id,
      userId: u.id,
      status: 'unread',
      deliveredAt: new Date(),
    }));

    await req.prisma.communicationRecipient.createMany({
      data: recipientsData,
      skipDuplicates: true,
    });

    // 3. Notifications in-app pour chaque utilisateur
    const notifsData = targetUsers.map((u: any) => ({
      userId: u.id,
      type: 'admin_message',
      title: `Message Admin: ${title.trim()}`,
      message: content.trim(),
    }));

    await req.prisma.notification.createMany({
      data: notifsData,
    });

    // 4. Journal d'audit
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'COMMUNICATION_GROUP_SENT',
        entity: 'CommunicationMessage',
        entityId: comm.id,
        details: JSON.stringify({
          recipientCount: targetUsers.length,
          importance: validImportance,
          title: title.trim(),
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: `Message groupé envoyé avec succès à ${targetUsers.length} utilisateur(s).`,
      communication: comm,
      recipientCount: targetUsers.length,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 3. MODE C — ANNONCE GÉNÉRALE À TOUS LES UTILISATEURS (BROADCAST)
// =========================================================================
router.post('/communication/send-broadcast', async (req: AuthRequest, res: Response, next) => {
  try {
    const { title, content, importance, channel, templateId, confirmAll } = req.body || {};

    if (!confirmAll) {
      throw new AppError('Confirmation explicite requise pour un envoi général à tous les utilisateurs.', 400);
    }

    if (!title || !content) {
      throw new AppError('Le titre et le contenu de l\'annonce générale sont obligatoires.', 400);
    }

    // Récupérer TOUS les commerçants actifs enregistrés dans Neon PostgreSQL (exclusion stricte du Super Admin)
    const targetUsers = await req.prisma.user.findMany({
      where: {
        isAdmin: false,
        isActive: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (targetUsers.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun utilisateur commerçant actif enregistré pour le moment.',
        recipientCount: 0,
      });
    }

    const validImportance = ['info', 'important', 'urgent'].includes(importance)
      ? importance
      : 'info';

    // 1. Enregistrement du message de diffusion générale
    const comm = await req.prisma.communicationMessage.create({
      data: {
        type: 'broadcast',
        targetAudience: 'all',
        importance: validImportance,
        channel: channel || 'internal_notification',
        title: title.trim(),
        content: content.trim(),
        templateId: templateId || null,
        status: 'delivered',
        sentBy: req.userId!,
        recipientCount: targetUsers.length,
        successCount: targetUsers.length,
        failureCount: 0,
      },
    });

    // 2. Création de chaque destinataire individuel pour suivi unitaire de lecture
    const recipientsData = targetUsers.map((u: any) => ({
      messageId: comm.id,
      userId: u.id,
      status: 'unread',
      deliveredAt: new Date(),
    }));

    await req.prisma.communicationRecipient.createMany({
      data: recipientsData,
      skipDuplicates: true,
    });

    // 3. Notification in-app globale
    const notifsData = targetUsers.map((u: any) => ({
      userId: u.id,
      type: 'admin_broadcast',
      title: `Annonce Générale: ${title.trim()}`,
      message: content.trim(),
    }));

    await req.prisma.notification.createMany({
      data: notifsData,
    });

    // 4. Audit Log
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'COMMUNICATION_BROADCAST_SENT',
        entity: 'CommunicationMessage',
        entityId: comm.id,
        details: JSON.stringify({
          recipientCount: targetUsers.length,
          importance: validImportance,
          title: title.trim(),
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: `Annonce générale transmise avec succès à l'ensemble des ${targetUsers.length} utilisateurs COMMERCIA !`,
      communication: comm,
      recipientCount: targetUsers.length,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 4. CAMPAGNES COLLECTIVES PAR SEGMENT (Pro, Business, Expiration, etc.)
// =========================================================================
router.post('/communication/send-campaign', async (req: AuthRequest, res: Response, next) => {
  try {
    const { targetAudience, title, content, importance, channel, isPromo, templateId } = req.body || {};

    if (!targetAudience || !title || !content) {
      throw new AppError('Segment d’audience, titre et contenu sont obligatoires.', 400);
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    let targetUsers: any[] = [];

    switch (targetAudience) {
      case 'pro':
        targetUsers = await req.prisma.user.findMany({
          where: {
            isAdmin: false,
            subscription: {
              status: 'active',
              plan: { name: 'pro' },
            },
          },
          select: { id: true, email: true },
        });
        break;

      case 'business':
        targetUsers = await req.prisma.user.findMany({
          where: {
            isAdmin: false,
            subscription: {
              status: 'active',
              plan: { name: 'business' },
            },
          },
          select: { id: true, email: true },
        });
        break;

      case 'free':
        targetUsers = await req.prisma.user.findMany({
          where: {
            isAdmin: false,
            OR: [
              { subscription: null },
              { subscription: { plan: { name: 'free' } } },
              { subscription: { status: 'free' } },
            ],
          },
          select: { id: true, email: true },
        });
        break;

      case 'expiring_7d':
        targetUsers = await req.prisma.user.findMany({
          where: {
            isAdmin: false,
            subscription: {
              status: { in: ['active', 'in_grace'] },
              endDate: {
                gte: now,
                lte: in7Days,
              },
            },
          },
          select: { id: true, email: true },
        });
        break;

      case 'expired':
        targetUsers = await req.prisma.user.findMany({
          where: {
            isAdmin: false,
            subscription: {
              status: 'expired',
            },
          },
          select: { id: true, email: true },
        });
        break;

      case 'suspended':
        targetUsers = await req.prisma.user.findMany({
          where: {
            isAdmin: false,
            isSuspended: true,
          },
          select: { id: true, email: true },
        });
        break;

      case 'all':
      default:
        targetUsers = await req.prisma.user.findMany({
          where: { isAdmin: false, isActive: true },
          select: { id: true, email: true },
        });
        break;
    }

    if (isPromo) {
      // Respect opt-in si applicable
      targetUsers = targetUsers.filter((u: any) => u.optInMarketing !== false);
    }

    if (targetUsers.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun utilisateur ne correspond aux critères de cette audience.',
        recipientCount: 0,
      });
    }

    const validImportance = ['info', 'important', 'urgent'].includes(importance)
      ? importance
      : 'info';

    const campaign = await req.prisma.communicationMessage.create({
      data: {
        type: 'campaign',
        targetAudience,
        importance: validImportance,
        channel: channel || 'internal_notification',
        title: title.trim(),
        content: content.trim(),
        templateId: templateId || null,
        status: 'delivered',
        sentBy: req.userId!,
        recipientCount: targetUsers.length,
        successCount: targetUsers.length,
        failureCount: 0,
      },
    });

    const recipientsData = targetUsers.map((u) => ({
      messageId: campaign.id,
      userId: u.id,
      status: 'unread',
      deliveredAt: new Date(),
    }));

    await req.prisma.communicationRecipient.createMany({
      data: recipientsData,
      skipDuplicates: true,
    });

    const notificationsData = targetUsers.map((u) => ({
      userId: u.id,
      type: isPromo ? 'promotion' : 'admin_broadcast',
      title: title.trim(),
      message: content.trim(),
    }));

    await req.prisma.notification.createMany({
      data: notificationsData,
    });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'COMMUNICATION_CAMPAIGN_SENT',
        entity: 'CommunicationMessage',
        entityId: campaign.id,
        details: JSON.stringify({
          targetAudience,
          recipientCount: targetUsers.length,
          title: title.trim(),
          isPromo: !!isPromo,
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: `Campagne envoyée avec succès à ${targetUsers.length} commerçants !`,
      campaign,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 5. HISTORIQUE AVEC TAUX ET STATISTIQUES DE LECTURE EN TEMPS RÉEL
// =========================================================================
router.get('/communication/history', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      req.prisma.communicationMessage.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          recipient: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          sender: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          recipients: {
            select: { id: true, status: true, readAt: true },
          },
        },
      }),
      req.prisma.communicationMessage.count(),
    ]);

    const formattedMessages = messages.map((m: any) => {
      const recipientCount = m.recipients.length > 0 ? m.recipients.length : (m.recipientCount || (m.recipientId ? 1 : 0));
      const readCount = m.recipients.filter((r: any) => r.status === 'read').length;
      const unreadCount = Math.max(0, recipientCount - readCount);
      const readRate = recipientCount > 0 ? Math.round((readCount / recipientCount) * 100) : 0;

      return {
        id: m.id,
        type: m.type,
        targetAudience: m.targetAudience,
        importance: m.importance || 'info',
        channel: m.channel,
        title: m.title,
        content: m.content,
        status: m.status,
        recipientCount,
        readCount,
        unreadCount,
        readRate,
        createdAt: m.createdAt,
        sender: m.sender,
        recipient: m.recipient,
      };
    });

    res.json({
      messages: formattedMessages,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 6. SUIVI DÉTAILLÉ PAR DESTINATAIRE (QUI A LU LE MESSAGE ET QUAND)
// =========================================================================
router.get('/communication/messages/:id/recipients', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const message = await req.prisma.communicationMessage.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!message) {
      throw new AppError('Communication introuvable.', 404);
    }

    const recipients = await req.prisma.communicationRecipient.findMany({
      where: { messageId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            subscription: {
              select: {
                status: true,
                plan: { select: { name: true } },
              },
            },
            businesses: {
              select: {
                business: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    const formattedRecipients = recipients.map((r: any) => {
      const u = r.user;
      return {
        id: r.id,
        userId: u?.id || r.userId,
        email: u?.email || 'N/A',
        fullName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Commerçant' : 'Inconnu',
        phone: u?.phone || null,
        businessName: u?.businesses?.[0]?.business?.name || 'Commerce',
        plan: u?.subscription?.plan?.name || 'free',
        status: r.status, // 'unread' | 'read'
        deliveredAt: r.deliveredAt,
        readAt: r.readAt,
      };
    });

    const totalRecipients = formattedRecipients.length;
    const readCount = formattedRecipients.filter((r: any) => r.status === 'read').length;
    const unreadCount = totalRecipients - readCount;
    const readRate = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

    res.json({
      message: {
        id: message.id,
        title: message.title,
        content: message.content,
        type: message.type,
        importance: message.importance || 'info',
        createdAt: message.createdAt,
        sender: message.sender,
      },
      stats: {
        totalRecipients,
        readCount,
        unreadCount,
        readRate,
      },
      recipients: formattedRecipients,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 7. BIBLIOTHÈQUE DE MODÈLES DE MESSAGES
// =========================================================================
router.get('/communication/templates', async (req: AuthRequest, res: Response, next) => {
  try {
    let templates = await req.prisma.communicationTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    if (templates.length === 0) {
      const defaults = [
        {
          name: 'Bienvenue sur COMMERCIA',
          category: 'welcome',
          title: 'Bienvenue sur COMMERCIA — Votre copilote de gestion commerciale',
          content: 'Bonjour {firstName},\n\nToute l’équipe de COMMERCIA vous souhaite la bienvenue ! Votre compte commerçant est opérationnel. N’hésitez pas à enregistrer vos premiers articles et vos premières ventes dès aujourd’hui.\n\nBesoin d’aide ? Contactez notre support disponible 7j/7.',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify(['firstName', 'businessName']),
        },
        {
          name: 'Rappel de Renouvellement (J-7)',
          category: 'renewal_reminder',
          title: 'Votre abonnement COMMERCIA expire dans 7 jours',
          content: 'Bonjour {firstName},\n\nVotre formule {planName} arrive à échéance le {endDate}. Renouvelez votre abonnement dès maintenant pour conserver un accès ininterrompu à vos statistiques avancées et à votre inventaire en temps réel.\n\nCliquez sur "Abonnement" pour renouveler.',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify(['firstName', 'planName', 'endDate']),
        },
        {
          name: 'Mise à Jour de la Plateforme',
          category: 'announcement',
          title: 'Nouvelles fonctionnalités disponibles sur COMMERCIA ! 🚀',
          content: 'Chers commerçants,\n\nUne nouvelle version de COMMERCIA est désormais en ligne avec plusieurs améliorations majeures :\n- Suivi de la rentabilité en temps réel\n- Messagerie directe avec l\'administration\n- Alertes intelligentes de réapprovisionnement\n\nMerci pour votre confiance continue !',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify([]),
        },
        {
          name: 'Maintenance Programmée',
          category: 'announcement',
          title: 'Information : Maintenance technique programmée',
          content: 'Chers utilisateurs,\n\nUne opération de maintenance technique et d\'optimisation de nos serveurs est prévue ce dimanche entre 02h00 et 04h00 UTC. L\'accès restera possible en mode hors-ligne.\n\nNous nous excusons pour la gêne occasionnée.',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify([]),
        },
      ];

      for (const d of defaults) {
        await req.prisma.communicationTemplate.create({ data: d });
      }

      templates = await req.prisma.communicationTemplate.findMany({ orderBy: { name: 'asc' } });
    }

    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

router.post('/communication/templates', async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, category, title, content, defaultChannel } = req.body || {};
    if (!name || !title || !content) {
      throw new AppError('Nom, titre et contenu sont requis.', 400);
    }

    const template = await req.prisma.communicationTemplate.create({
      data: {
        name: name.trim(),
        category: category || 'other',
        title: title.trim(),
        content: content.trim(),
        defaultChannel: defaultChannel || 'internal_notification',
      },
    });

    res.status(201).json({ success: true, template });
  } catch (error) {
    next(error);
  }
});

export { router as communicationAdminRouter };
