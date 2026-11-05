import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const treasuryRouter = Router();
treasuryRouter.use(authenticate);

// -------------------------------------------------------------
// COMPTES FINANCIERS RÉELS
// -------------------------------------------------------------

const accountSchema = z.object({
  nom: z.string().min(1, 'Nom du compte requis'),
  type: z.enum(['caisse', 'banque', 'mobile_money']),
  soldeActuel: z.number().default(0),
});

treasuryRouter.get('/accounts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const accounts = await req.prisma.treasuryAccount.findMany({
      where: { businessId, actif: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

treasuryRouter.post('/accounts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const data = accountSchema.parse(req.body);

    const account = await req.prisma.treasuryAccount.create({
      data: {
        nom: data.nom,
        type: data.type,
        soldeActuel: data.soldeActuel,
        businessId,
      },
    });

    // Si solde initial > 0, enregistrer un mouvement initial
    if (data.soldeActuel > 0) {
      await req.prisma.treasuryMovement.create({
        data: {
          businessId,
          compteId: account.id,
          numero: `MVT-${Date.now().toString().slice(-6)}`,
          type: 'ENTREE',
          categorie: 'Solde initial',
          montant: data.soldeActuel,
          libelle: `Solde d'ouverture pour ${account.nom}`,
          soldeApres: data.soldeActuel,
        },
      });
    }

    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

treasuryRouter.delete('/accounts/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const existing = await req.prisma.treasuryAccount.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new AppError('Compte non trouvé ou accès non autorisé.', 404);
    }

    await req.prisma.treasuryAccount.update({
      where: { id },
      data: { actif: false },
    });

    res.json({ success: true, message: 'Compte désactivé.' });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// MOUVEMENTS DE TRÉSORERIE RÉELS
// -------------------------------------------------------------

const movementSchema = z.object({
  compteId: z.string().min(1, 'Compte obligatoire'),
  compteCibleId: z.string().optional().nullable(),
  type: z.enum(['ENTREE', 'SORTIE', 'VIREMENT']),
  categorie: z.string().min(1, 'Catégorie obligatoire'),
  montant: z.number().positive('Le montant doit être supérieur à zéro'),
  libelle: z.string().min(1, 'Libellé obligatoire'),
  date: z.string().optional(),
});

treasuryRouter.get('/movements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const movements = await req.prisma.treasuryMovement.findMany({
      where: { businessId },
      include: { compte: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(movements);
  } catch (error) {
    next(error);
  }
});

treasuryRouter.post('/movements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const data = movementSchema.parse(req.body);

    const sourceAccount = await req.prisma.treasuryAccount.findFirst({
      where: { id: data.compteId, businessId, actif: true },
    });

    if (!sourceAccount) {
      throw new AppError('Compte source introuvable.', 404);
    }

    const mvtNumero = `MVT-${Date.now().toString().slice(-6)}`;
    const moveDate = data.date ? new Date(data.date) : new Date();

    if (data.type === 'VIREMENT') {
      if (!data.compteCibleId) {
        throw new AppError('Compte destinataire obligatoire pour un virement.', 400);
      }
      const targetAccount = await req.prisma.treasuryAccount.findFirst({
        where: { id: data.compteCibleId, businessId, actif: true },
      });
      if (!targetAccount) {
        throw new AppError('Compte destinataire introuvable.', 404);
      }

      // Virement atomique
      const [updatedSource, updatedTarget, mvt] = await req.prisma.$transaction([
        req.prisma.treasuryAccount.update({
          where: { id: sourceAccount.id },
          data: { soldeActuel: { decrement: data.montant } },
        }),
        req.prisma.treasuryAccount.update({
          where: { id: targetAccount.id },
          data: { soldeActuel: { increment: data.montant } },
        }),
        req.prisma.treasuryMovement.create({
          data: {
            businessId,
            compteId: sourceAccount.id,
            compteCibleId: targetAccount.id,
            numero: mvtNumero,
            date: moveDate,
            type: 'VIREMENT',
            categorie: 'Virement interne',
            montant: data.montant,
            libelle: data.libelle || `Transfert de ${sourceAccount.nom} vers ${targetAccount.nom}`,
            soldeApres: sourceAccount.soldeActuel - data.montant,
          },
        }),
      ]);

      return res.status(201).json({ movement: mvt, updatedSource, updatedTarget });
    }

    // Entrée ou Sortie simple
    const delta = data.type === 'ENTREE' ? data.montant : -data.montant;
    const newBalance = sourceAccount.soldeActuel + delta;

    const [updatedAcc, mvt] = await req.prisma.$transaction([
      req.prisma.treasuryAccount.update({
        where: { id: sourceAccount.id },
        data: { soldeActuel: newBalance },
      }),
      req.prisma.treasuryMovement.create({
        data: {
          businessId,
          compteId: sourceAccount.id,
          numero: mvtNumero,
          date: moveDate,
          type: data.type,
          categorie: data.categorie,
          montant: data.montant,
          libelle: data.libelle,
          soldeApres: newBalance,
        },
      }),
    ]);

    res.status(201).json({ movement: mvt, account: updatedAcc });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// ÉCHÉANCES RÉELLES
// -------------------------------------------------------------

const echeanceSchema = z.object({
  compteId: z.string().optional().nullable(),
  type: z.enum(['ENCAISSEMENT', 'DECAISSEMENT']),
  dateEcheance: z.string().min(1, 'Date requise'),
  montant: z.number().positive('Montant supérieur à zéro requis'),
  tiers: z.string().min(1, 'Tiers requis'),
  motif: z.string().min(1, 'Motif requis'),
});

treasuryRouter.get('/echeances', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const echeances = await req.prisma.treasuryEcheance.findMany({
      where: { businessId },
      orderBy: { dateEcheance: 'asc' },
    });
    res.json(echeances);
  } catch (error) {
    next(error);
  }
});

treasuryRouter.post('/echeances', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const data = echeanceSchema.parse(req.body);

    const echeance = await req.prisma.treasuryEcheance.create({
      data: {
        businessId,
        compteId: data.compteId || null,
        type: data.type,
        dateEcheance: new Date(data.dateEcheance),
        montant: data.montant,
        tiers: data.tiers,
        motif: data.motif,
      },
    });

    res.status(201).json(echeance);
  } catch (error) {
    next(error);
  }
});

treasuryRouter.put('/echeances/:id/settle', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    const { compteId } = req.body;

    const echeance = await req.prisma.treasuryEcheance.findFirst({
      where: { id, businessId },
    });

    if (!echeance) {
      throw new AppError('Échéance non trouvée.', 404);
    }

    const updated = await req.prisma.treasuryEcheance.update({
      where: { id },
      data: {
        statut: 'REGLE',
        dateReglement: new Date(),
      },
    });

    // Si compteId fourni, générer le mouvement comptable correspondant
    if (compteId) {
      const targetAcc = await req.prisma.treasuryAccount.findFirst({
        where: { id: compteId, businessId, actif: true },
      });
      if (targetAcc) {
        const delta = echeance.type === 'ENCAISSEMENT' ? echeance.montant : -echeance.montant;
        const newBalance = targetAcc.soldeActuel + delta;
        await req.prisma.$transaction([
          req.prisma.treasuryAccount.update({
            where: { id: targetAcc.id },
            data: { soldeActuel: newBalance },
          }),
          req.prisma.treasuryMovement.create({
            data: {
              businessId,
              compteId: targetAcc.id,
              numero: `MVT-${Date.now().toString().slice(-6)}`,
              date: new Date(),
              type: echeance.type === 'ENCAISSEMENT' ? 'ENTREE' : 'SORTIE',
              categorie: echeance.type === 'ENCAISSEMENT' ? 'Encaissement échéance' : 'Règlement échéance',
              montant: echeance.montant,
              libelle: `Règlement échéance: ${echeance.motif} (${echeance.tiers})`,
              soldeApres: newBalance,
              reference: echeance.id,
            },
          }),
        ]);
      }
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

treasuryRouter.delete('/echeances/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;

    const existing = await req.prisma.treasuryEcheance.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      throw new AppError('Échéance non trouvée.', 404);
    }

    await req.prisma.treasuryEcheance.delete({ where: { id } });
    res.json({ success: true, message: 'Échéance supprimée.' });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// VUE D'ENSEMBLE CALCULÉE STRICTEMENT SUR DONNÉES RÉELLES
// -------------------------------------------------------------

treasuryRouter.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);

    const accounts = await req.prisma.treasuryAccount.findMany({
      where: { businessId, actif: true },
      orderBy: { createdAt: 'asc' },
    });

    const movements = await req.prisma.treasuryMovement.findMany({
      where: { businessId },
      include: { compte: true },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const echeances = await req.prisma.treasuryEcheance.findMany({
      where: { businessId, statut: 'EN_ATTENTE' },
      orderBy: { dateEcheance: 'asc' },
    });

    // Trésorerie totale réelle disponible
    const tresorerieDisponible = accounts.reduce((sum: number, a: any) => sum + (Number(a.soldeActuel) || 0), 0);

    // Dépenses réelles des 30 derniers jours pour estimer le rythme quotidien
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const recentOutflows = movements
      .filter((m: any) => m.type === 'SORTIE' && new Date(m.date) >= thirtyDaysAgo)
      .reduce((sum: number, m: any) => sum + Number(m.montant || 0), 0);

    // Si aucun mouvement dans la trésorerie, vérifier les dépenses réelles enregistrées dans le module Dépenses
    const totalExpensesDb = await req.prisma.expense.aggregate({
      where: { businessId, date: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });

    const combinedMonthlyOutflows = Math.max(recentOutflows, Number(totalExpensesDb._sum.amount || 0));
    const depensesMoyennesJour = combinedMonthlyOutflows > 0 ? Math.round(combinedMonthlyOutflows / 30) : 0;

    const autonomieJours =
      depensesMoyennesJour > 0 && tresorerieDisponible > 0
        ? Math.floor(tresorerieDisponible / depensesMoyennesJour)
        : null;

    const entreesAttendues30j = echeances
      .filter((e: any) => e.type === 'ENCAISSEMENT')
      .reduce((sum: number, e: any) => sum + Number(e.montant || 0), 0);

    const sortiesPrevues30j = echeances
      .filter((e: any) => e.type === 'DECAISSEMENT')
      .reduce((sum: number, e: any) => sum + Number(e.montant || 0), 0);

    const tresoreriePrevue30j = tresorerieDisponible + entreesAttendues30j - sortiesPrevues30j;

    // Calcul du résultat net réel du mois (ventes réelles - dépenses réelles)
    const salesMonth = await req.prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true },
    });
    const resultatMois = Number(salesMonth._sum.totalAmount || 0) - combinedMonthlyOutflows;

    // Détermination du statut de trésorerie réel
    let statutBadge: string = 'TRESORERIE_SAINE';
    let phraseLecture: string = 'Votre trésorerie réelle est équilibrée.';

    if (accounts.length === 0) {
      statutBadge = 'NON_INITIALISEE';
      phraseLecture = 'Aucun compte financier configuré. Ajoutez votre caisse ou compte bancaire réel.';
    } else if (tresorerieDisponible < 0) {
      statutBadge = 'SOLDE_NEGATIF';
      phraseLecture = 'Attention : solde total débiteur. Un apport ou recouvrement immédiat est requis.';
    } else if (tresoreriePrevue30j < 0) {
      statutBadge = 'MANQUE_ARGENT_PREVU';
      phraseLecture = 'Risque de découvert à 30 jours au vu des échéances planifiées.';
    } else if (autonomieJours !== null && autonomieJours < 15) {
      statutBadge = 'AUTONOMIE_CRITIQUE';
      phraseLecture = `Autonomie critique : ${autonomieJours} jour(s) de réserves financières restantes.`;
    } else if (autonomieJours !== null && autonomieJours < 30) {
      statutBadge = 'AUTONOMIE_SURVEILLER';
      phraseLecture = `Trésorerie sous surveillance : ${autonomieJours} jours d'autonomie financière.`;
    }

    // Historique prévisionnel sur 30 jours
    const historiquePrevisionnel: Array<{ date: string; solde: number; dateJour: string }> = [];
    let rolling = tresorerieDisponible;
    const now = new Date();
    for (let i = 0; i <= 30; i += 5) {
      const targetDate = new Date(now.getTime() + i * 24 * 3600 * 1000);
      const duesUntil = echeances.filter((e: any) => new Date(e.dateEcheance) <= targetDate);
      const delta = duesUntil.reduce(
        (sum: number, e: any) => sum + (e.type === 'ENCAISSEMENT' ? Number(e.montant) : -Number(e.montant)),
        0
      );
      historiquePrevisionnel.push({
        date: targetDate.toISOString().split('T')[0],
        solde: rolling + delta,
        dateJour: `J+${i}`,
      });
    }

    res.json({
      tresorerieDisponible,
      depensesMoyennesJour,
      autonomieJours,
      entreesAttendues30j,
      sortiesPrevues30j,
      tresoreriePrevue30j,
      resultatMois,
      statutBadge,
      phraseLecture,
      comptes: accounts,
      prochainesEcheances: echeances.map((e: any) => ({
        id: e.id,
        type: e.type === 'ENCAISSEMENT' ? 'A_ENCAISSER' : 'A_PAYER',
        tiers: e.tiers,
        libelle: e.motif,
        montant: e.montant,
        dateEcheance: e.dateEcheance.toISOString(),
        recurrence: 'aucune',
        statut: 'en_attente',
      })),
      historiquePrevisionnel,
    });
  } catch (error) {
    next(error);
  }
});
