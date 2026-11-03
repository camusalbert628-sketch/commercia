import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// =========================================================================
// 1. MESSAGE INDIVIDUEL À UN COMMERÇANT
// =========================================================================
router.post('/communication/send-individual', async (req: AuthRequest, res: Response, next) => {
  try {
    const { userId, title, content, channel, templateId } = req.body || {};

    if (!userId || !title || !content) {
      throw new AppError('Destinataire, titre et contenu sont obligatoires.', 400);
    }

    const recipient = await req.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!recipient) {
      throw new AppError('Utilisateur destinataire introuvable.', 404);
    }

    const validChannel = channel || 'internal_notification';
    let deliveryStatus = 'delivered';
    let errorMessage: string | null = null;

    // Si SMS ou WhatsApp est demandé sans passerelle tierce configurée
    if (validChannel === 'sms' || validChannel === 'whatsapp') {
      // Détection de configuration
      const providerConfig = await req.prisma.paymentProviderConfig.findFirst({
        where: { provider: validChannel, isActive: true },
      });
      if (!providerConfig) {
        deliveryStatus = 'delivered'; // Envoyé avec fallback notification interne
        errorMessage = `Canal ${validChannel} externe non configuré. Distribution relayée via notification interne COMMERCIA.`;
      }
    }

    // 1. Enregistrement dans CommunicationMessage
    const comm = await req.prisma.communicationMessage.create({
      data: {
        type: 'individual',
        recipientId: recipient.id,
        channel: validChannel,
        title: title.trim(),
        content: content.trim(),
        templateId: templateId || null,
        status: deliveryStatus,
        sentBy: req.userId!,
        recipientCount: 1,
        successCount: 1,
        failureCount: 0,
        errorMessage,
      },
    });

    // 2. Création de la notification interne pour que le commerçant la voie en direct
    await req.prisma.notification.create({
      data: {
        userId: recipient.id,
        type: 'admin_message',
        title: title.trim(),
        message: content.trim(),
      },
    });

    // 3. Journal d'audit
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'COMMUNICATION_INDIVIDUAL_SENT',
        entity: 'CommunicationMessage',
        entityId: comm.id,
        details: JSON.stringify({
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          channel: validChannel,
          title: title.trim(),
        }),
      },
    });

    res.status(201).json({
      success: true,
      message: `Message envoyé à ${recipient.firstName} ${recipient.lastName} (${recipient.email}).`,
      communication: comm,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 2. CAMPAGNES COLLECTIVES AVEC SEGMENTATION AVANCÉE
// =========================================================================
router.post('/communication/send-campaign', async (req: AuthRequest, res: Response, next) => {
  try {
    const { targetAudience, title, content, channel, isPromo, templateId } = req.body || {};

    if (!targetAudience || !title || !content) {
      throw new AppError('Segment d’audience, titre et contenu sont obligatoires.', 400);
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    // Détermination de l'audience ciblée selon la segmentation réelle
    let targetUsers: any[] = [];

    switch (targetAudience) {
      case 'pro':
        targetUsers = await req.prisma.user.findMany({
          where: {
            subscription: {
              status: 'active',
              plan: { name: 'pro' },
            },
          },
        });
        break;

      case 'business':
        targetUsers = await req.prisma.user.findMany({
          where: {
            subscription: {
              status: 'active',
              plan: { name: 'business' },
            },
          },
        });
        break;

      case 'free':
        targetUsers = await req.prisma.user.findMany({
          where: {
            OR: [
              { subscription: null },
              { subscription: { plan: { name: 'free' } } },
              { subscription: { status: 'free' } },
            ],
          },
        });
        break;

      case 'expiring_7d':
        targetUsers = await req.prisma.user.findMany({
          where: {
            subscription: {
              status: { in: ['active', 'in_grace'] },
              endDate: {
                gte: now,
                lte: in7Days,
              },
            },
          },
        });
        break;

      case 'expired':
        targetUsers = await req.prisma.user.findMany({
          where: {
            subscription: {
              status: 'expired',
            },
          },
        });
        break;

      case 'suspended':
        targetUsers = await req.prisma.user.findMany({
          where: {
            isSuspended: true,
          },
        });
        break;

      case 'new_users': {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        targetUsers = await req.prisma.user.findMany({
          where: {
            createdAt: { gte: sevenDaysAgo },
          },
        });
        break;
      }

      case 'never_renewed':
        targetUsers = await req.prisma.user.findMany({
          where: {
            subscription: {
              plan: { name: { not: 'free' } },
              renewalCount: 0,
            },
          },
        });
        break;

      case 'all':
      default:
        targetUsers = await req.prisma.user.findMany();
        break;
    }

    // Respect du désabonnement marketing (RGPD & Politique commerciale)
    if (isPromo) {
      targetUsers = targetUsers.filter((u) => u.optInMarketing !== false);
    }

    if (targetUsers.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun utilisateur ne correspond aux critères de cette audience.',
        recipientCount: 0,
      });
    }

    // Création de l'enregistrement de campagne
    const campaign = await req.prisma.communicationMessage.create({
      data: {
        type: 'campaign',
        targetAudience,
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

    // Distribution des notifications internes par lot
    const notificationsData = targetUsers.map((u) => ({
      userId: u.id,
      type: isPromo ? 'promotion' : 'admin_broadcast',
      title: title.trim(),
      message: content.trim(),
    }));

    await req.prisma.notification.createMany({
      data: notificationsData,
    });

    // Journal d'audit
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
// 3. HISTORIQUE DES COMMUNICATIONS
// =========================================================================
router.get('/communication/history', async (req: AuthRequest, res: Response, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [messages, total] = await Promise.all([
      req.prisma.communicationMessage.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          recipient: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          sender: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      req.prisma.communicationMessage.count(),
    ]);

    res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// 4. BIBLIOTHÈQUE DE MODÈLES DE MESSAGES
// =========================================================================
router.get('/communication/templates', async (req: AuthRequest, res: Response, next) => {
  try {
    let templates = await req.prisma.communicationTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    // Si la table est vide, initialiser avec les modèles professionnels pré-intégrés
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
          name: 'Abonnement Expiré (Période de Grâce)',
          category: 'expired',
          title: 'Abonnement expiré — Période de grâce active',
          content: 'Bonjour {firstName},\n\nVotre abonnement {planName} est arrivé à expiration. Vous bénéficiez d’une période de grâce de 3 jours avant la suspension des fonctionnalités Pro. Régularisez votre situation en quelques clics via Orange Money, MTN MoMo ou Wave.',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify(['firstName', 'planName']),
        },
        {
          name: 'Suspension de Compte',
          category: 'suspended',
          title: 'Notification importante : Compte suspendu',
          content: 'Bonjour {firstName},\n\nVotre compte a été suspendu par notre équipe pour le motif suivant : {reason}. Vos données et historiques sont intégralement préservés. Veuillez contacter l’administration pour débloquer votre accès.',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify(['firstName', 'reason']),
        },
        {
          name: 'Réactivation Confirmée',
          category: 'reactivated',
          title: 'Compte COMMERCIA réactivé avec succès !',
          content: 'Bonjour {firstName},\n\nNous vous confirmons la réactivation complète de votre compte et de toutes vos fonctionnalités. Merci de votre fidélité !',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify(['firstName']),
        },
        {
          name: 'Promotion Commerciale Spéciale',
          category: 'promo',
          title: 'Offre exclusive : Boostez votre boutique avec -20% !',
          content: 'Bonjour {firstName},\n\nProfitez dès aujourd’hui d’une réduction exceptionnelle de 20% sur votre prochain abonnement annuel avec le code promo {promoCode}.\n\nOffre valable pendant 7 jours seulement !',
          defaultChannel: 'internal_notification',
          variables: JSON.stringify(['firstName', 'promoCode']),
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
