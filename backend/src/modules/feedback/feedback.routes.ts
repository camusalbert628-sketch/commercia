import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../config/security';

const router = Router();

// Endpoint public/authentifié pour la soumission de retours marchands
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      rating,
      category,
      categoryLabel,
      comment,
      module,
      userName,
      businessName,
      userPhone,
      userEmail,
      satisfactionTags,
    } = req.body || {};

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Le commentaire est obligatoire.' });
    }

    // Extraction éventuelle de l'identité utilisateur via JWT
    let identifiedUserId: string | null = null;
    let identifiedBusinessId: string | null = null;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, getJwtSecret());
        if (decoded?.id || decoded?.userId) {
          identifiedUserId = decoded.id || decoded.userId;
          const user = await (req as any).prisma.user.findUnique({
            where: { id: identifiedUserId },
            include: { businesses: { take: 1 } },
          });
          if (user) {
            identifiedBusinessId = user.businesses[0]?.businessId || null;
          }
        }
      } catch (_) {
        // Token non valide ou expiré : on continue en non authentifié
      }
    }

    const numericRating = Math.max(1, Math.min(10, Number(rating) || 5));
    const validCategory = (category || 'suggestion').trim().toLowerCase();

    const createdFeedback = await (req as any).prisma.userFeedback.create({
      data: {
        userId: identifiedUserId,
        businessId: identifiedBusinessId,
        rating: numericRating,
        category: validCategory,
        categoryLabel: categoryLabel || null,
        comment: comment.trim(),
        module: module || 'général',
        userName: userName || null,
        businessName: businessName || null,
        userPhone: userPhone || null,
        userEmail: userEmail || null,
        satisfactionTags: Array.isArray(satisfactionTags) ? JSON.stringify(satisfactionTags) : satisfactionTags || null,
        status: 'new',
        isPriority: numericRating <= 2 || validCategory === 'bug' || validCategory === 'reclamation',
      },
    });

    // Déclenchement automatique d'alerte commerciale pour les notes faibles ou réclamations
    if (numericRating <= 2 || validCategory === 'bug' || validCategory === 'reclamation') {
      await (req as any).prisma.commercialAlert.create({
        data: {
          title: `Avis négatif ou réclamation critique (${numericRating}/5)`,
          message: `${userName || 'Un commerçant'} a soumis un retour critique (${validCategory}) sur le module "${module || 'général'}": "${comment.slice(0, 120)}..."`,
          priority: numericRating === 1 ? 'critical' : 'high',
          category: 'feedback_spike',
          userId: identifiedUserId,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Merci pour votre retour ! Votre avis aide COMMERCIA à grandir.',
      feedback: createdFeedback,
    });
  } catch (error: any) {
    console.error('Erreur soumission feedback:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer votre évaluation.' });
  }
});

// Endpoint pour qu'un marchand authentifié consulte l'historique de ses feedbacks et réponses du support
router.get('/my-feedbacks', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, getJwtSecret());
    const userId = decoded?.id || decoded?.userId;
    if (!userId) return res.status(401).json({ error: 'Jeton invalide.' });

    const feedbacks = await (req as any).prisma.userFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.json({ feedbacks });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur récupération feedbacks.' });
  }
});

export { router as feedbackRouter };
