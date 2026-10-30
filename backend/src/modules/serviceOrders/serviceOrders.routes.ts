import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  title: z.string().min(1, 'Intitulé de la commande ou prestation requis'),
  serviceType: z.enum(['couture', 'reparation', 'garage', 'agence', 'prestation', 'autre']).default('couture'),
  agreedAmount: z.number().min(0, 'Montant convenu invalide'),
  advancePaid: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'cheque']).default('cash'),
  estimatedDeliveryDate: z.string().optional(),
  specsJson: z.string().optional(), // Mesures, modèle, panne, véhicule
  notes: z.string().optional(),
  isQuoteOnly: z.boolean().default(false), // true = Devis, false = Commande confirmée
});

const addPaymentSchema = z.object({
  amount: z.number().min(1, 'Montant du versement requis'),
  paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'cheque']).default('cash'),
  notes: z.string().optional(),
});

const addCostSchema = z.object({
  category: z.enum(['materiel', 'piece', 'main_d_oeuvre', 'sous_traitance', 'transport', 'autre']).default('materiel'),
  description: z.string().min(1, 'Description de la charge requise'),
  amount: z.number().min(1, 'Montant de la charge requis'),
});

const updateStatusSchema = z.object({
  status: z.enum(['devis', 'confirme', 'en_cours', 'pret', 'termine', 'livre', 'annule']),
  notes: z.string().optional(),
});

// GET /api/service-orders
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { status, serviceType } = req.query;
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const whereClause: any = { businessId };
    if (status) whereClause.status = status as string;
    if (serviceType) whereClause.serviceType = serviceType as string;

    const orders = await req.prisma.serviceOrder.findMany({
      where: whereClause,
      include: {
        customer: true,
        costs: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// POST /api/service-orders
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = createOrderSchema.parse(req.body);

    let customerId = data.customerId;
    if (customerId) {
      const owned = await req.prisma.customer.findFirst({ where: { id: customerId, businessId } });
      if (!owned) throw new AppError('Client introuvable pour cette entreprise.', 404);
    }
    if (!customerId && (data.customerName || data.customerPhone)) {
      const newCust = await req.prisma.customer.create({
        data: {
          businessId,
          name: data.customerName || 'Client Prestation',
          phone: data.customerPhone || null,
        },
      });
      customerId = newCust.id;
    }

    const result = await req.prisma.$transaction(async (tx: any) => {
      const orderCount = await tx.serviceOrder.count({ where: { businessId } });
      const orderNumber = `CMD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;

      const advance = Math.min(data.advancePaid, data.agreedAmount);
      const balanceDue = Math.max(0, data.agreedAmount - advance);
      const status = data.isQuoteOnly ? 'devis' : (advance > 0 ? 'confirme' : 'confirme');

      const order = await tx.serviceOrder.create({
        data: {
          businessId,
          customerId: customerId || null,
          orderNumber,
          title: data.title,
          serviceType: data.serviceType,
          agreedAmount: data.agreedAmount,
          advancePaid: advance,
          balanceDue,
          status,
          estimatedDeliveryDate: data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : null,
          specsJson: data.specsJson || null,
          notes: data.notes || null,
          payments: advance > 0 ? {
            create: [{
              amount: advance,
              paymentMethod: data.paymentMethod,
              notes: 'Acompte initial à la commande',
            }],
          } : undefined,
        },
        include: { customer: true, payments: true, costs: true },
      });

      // Si la commande est confirmée (pas un simple devis), créer une Vente dans le moteur financier
      let sale = null;
      if (!data.isQuoteOnly) {
        sale = await tx.sale.create({
          data: {
            businessId,
            customerId: customerId || null,
            totalAmount: data.agreedAmount,
            paidAmount: advance,
            paymentMethod: data.paymentMethod,
            status: balanceDue === 0 ? 'completed' : 'pending',
            notes: `Prestation #${orderNumber} : ${data.title}`,
            items: {
              create: [{
                name: `${data.title} (${data.serviceType})`,
                quantity: 1,
                unitPrice: data.agreedAmount,
                costPrice: 0,
                totalPrice: data.agreedAmount,
              }],
            },
          },
        });
      }

      // Si acompte encaissé, lier à la session de caisse active
      if (advance > 0) {
        const activeSession = await tx.cashSession.findFirst({
          where: { businessId, status: 'open' },
        });
        if (activeSession) {
          await tx.cashMovement.create({
            data: {
              sessionId: activeSession.id,
              businessId,
              type: 'in',
              amount: advance,
              method: data.paymentMethod,
              category: 'sale',
              referenceId: sale ? sale.id : order.id,
              description: `Acompte ${order.orderNumber} - ${order.title}`,
            },
          });
        }
      }

      // Si un solde reste dû et qu'un client est rattaché, mettre à jour son carnet de dette
      if (balanceDue > 0 && customerId && !data.isQuoteOnly) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalBought: { increment: data.agreedAmount },
            totalOwed: { increment: balanceDue },
          },
        });
      }

      return order;
    });

    res.status(201).json({
      message: data.isQuoteOnly ? 'Devis généré avec succès !' : 'Commande confirmée et acompte enregistré.',
      order: result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/service-orders/:id/payments (Règlement acompte supplémentaire ou solde final)
router.post('/:id/payments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = addPaymentSchema.parse(req.body);

    const result = await req.prisma.$transaction(async (tx: any) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id, businessId },
      });
      if (!order) throw new AppError('Commande introuvable.', 404);

      if (order.status === 'devis' || order.status === 'annule') {
        throw new AppError('Aucun paiement possible sur un devis ou une commande annulée.', 400);
      }
      if (order.balanceDue <= 0) {
        throw new AppError('Cette commande est déjà intégralement réglée.', 400);
      }

      const paymentAmount = Math.min(data.amount, order.balanceDue);
      const newAdvance = order.advancePaid + paymentAmount;
      const newBalance = Math.max(0, order.agreedAmount - newAdvance);

      const payment = await tx.serviceOrderPayment.create({
        data: {
          orderId: id,
          amount: paymentAmount,
          paymentMethod: data.paymentMethod,
          notes: data.notes || (newBalance === 0 ? 'Règlement du solde final' : 'Versement partiel'),
        },
      });

      const updatedOrder = await tx.serviceOrder.update({
        where: { id },
        data: {
          advancePaid: newAdvance,
          balanceDue: newBalance,
          status: newBalance === 0 && order.status === 'pret' ? 'termine' : order.status,
        },
        include: { payments: true, customer: true },
      });

      // Mettre à jour la dette client
      if (order.customerId && paymentAmount > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { totalOwed: { decrement: paymentAmount } },
        });
      }

      // Synchroniser la Vente liée dans le moteur financier
      await tx.sale.updateMany({
        where: { businessId, notes: { contains: order.orderNumber } },
        data: {
          paidAmount: { increment: paymentAmount },
          status: newBalance === 0 ? 'completed' : 'pending',
        },
      });

      // Enregistrer en caisse
      const activeSession = await tx.cashSession.findFirst({
        where: { businessId, status: 'open' },
      });
      if (activeSession) {
        await tx.cashMovement.create({
          data: {
            sessionId: activeSession.id,
            businessId,
            type: 'in',
            amount: paymentAmount,
            method: data.paymentMethod,
            category: 'debt_payment',
            referenceId: payment.id,
            description: `Paiement ${order.orderNumber} (${newBalance === 0 ? 'Solde complet' : 'Acompte'})`,
          },
        });
      }

      return { updatedOrder, payment, paymentAmount };
    });

    res.json({
      message: `Paiement de ${result.paymentAmount.toLocaleString('fr-FR')} FCFA enregistré avec succès !`,
      order: result.updatedOrder,
      payment: result.payment,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/service-orders/:id/costs (Enregistrer des matériaux, pièces détachées ou sous-traitance)
router.post('/:id/costs', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = addCostSchema.parse(req.body);

    const result = await req.prisma.$transaction(async (tx: any) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id, businessId },
      });
      if (!order) throw new AppError('Commande introuvable.', 404);

      const cost = await tx.serviceOrderCost.create({
        data: {
          orderId: id,
          category: data.category,
          description: data.description,
          amount: data.amount,
        },
      });

      // Enregistrer une Dépense réelle pour que le compte de résultat et la marge nette soient exacts
      await tx.expense.create({
        data: {
          businessId,
          amount: data.amount,
          category: data.category === 'materiel' ? 'fournitures' : 'autre',
          description: `Frais #${order.orderNumber} : ${data.description}`,
          date: new Date(),
        },
      });

      // Mettre à jour le coût total de la commande
      let costField = 'otherCosts';
      if (data.category === 'materiel' || data.category === 'piece') {
        costField = 'materialsCost';
      } else if (data.category === 'main_d_oeuvre' || data.category === 'sous_traitance') {
        costField = 'laborCost';
      }

      const updatedOrder = await tx.serviceOrder.update({
        where: { id },
        data: {
          [costField]: { increment: data.amount },
        },
        include: { costs: true, payments: true },
      });

      return { updatedOrder, cost };
    });

    res.json({
      message: 'Charge directement imputée à la commande et au compte de résultat.',
      order: result.updatedOrder,
      cost: result.cost,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/service-orders/:id/status
router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { id } = req.params;
    if (!businessId) throw new AppError('Identifiant d’entreprise requis.', 400);

    const data = updateStatusSchema.parse(req.body);

    const result = await req.prisma.$transaction(async (tx: any) => {
      const order = await tx.serviceOrder.findFirst({
        where: { id, businessId },
      });
      if (!order) throw new AppError('Commande introuvable.', 404);

      if (order.status === 'annule' && data.status !== 'annule') {
        throw new AppError('Une commande annulée ne peut plus être réactivée directement.', 400);
      }

      // Si la commande est annulée, annuler la dette client restante s'il y en avait une
      if (data.status === 'annule' && order.balanceDue > 0 && order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalOwed: { decrement: order.balanceDue },
          },
        });
      }

      const completionDate = (data.status === 'termine' || data.status === 'livre') ? new Date() : order.completionDate;

      const updated = await tx.serviceOrder.update({
        where: { id },
        data: {
          status: data.status,
          completionDate,
          notes: data.notes ? `${order.notes || ''}\n[Statut: ${data.status}] ${data.notes}` : order.notes,
        },
      });

      return updated;
    });

    res.json({
      message: `Statut de la commande mis à jour : ${data.status}`,
      order: result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as serviceOrdersRouter };
