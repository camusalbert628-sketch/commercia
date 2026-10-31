import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticate, getTenantBusinessId } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { getUserSubscriptionDetails } from '../../utils/subscriptionUtils';
import { createNotification } from '../../utils/notificationHelper';

const router = Router();
router.use(authenticate);

// POST /api/sales — Enregistrer une vente
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    
    const saleSchema = z.object({
      items: z.array(z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        unitPrice: z.number().min(0),
        costPrice: z.number().min(0).default(0),
        variableCosts: z.number().min(0).default(0),
        productId: z.string().optional(),
      })).min(1, 'Au moins un article requis'),
      paymentMethod: z.enum(['cash', 'mobile_money', 'bank_transfer', 'credit']).default('cash'),
      customerId: z.string().optional(),
      channelId: z.string().optional(),
      campaignId: z.string().optional(),
      variableCosts: z.number().min(0).default(0),
      discountAmount: z.number().min(0).default(0),
      status: z.enum(['completed', 'paid', 'delivered', 'pending', 'cancelled', 'refunded']).default('completed'),
      notes: z.string().optional(),
      totalAmount: z.number().optional(),
      paidAmount: z.number().optional(),
      saleDate: z.string().optional(),
    });
    
    const data = saleSchema.parse(req.body);

    // Idempotence : un rejeu avec la même clé ne recrée ni vente ni mouvement de stock
    const idemKeyRaw = req.headers['idempotency-key'];
    const idemKey = typeof idemKeyRaw === 'string' && idemKeyRaw.trim() ? idemKeyRaw.trim().slice(0, 100) : null;
    const idemMarker = idemKey ? `[idem:${idemKey}]` : null;
    if (idemMarker) {
      const existing = await req.prisma.sale.findFirst({
        where: { businessId, notes: { contains: idemMarker } },
        include: { items: true, customer: true, channel: true },
      });
      if (existing) {
        res.status(200).json({ message: 'Vente déjà enregistrée (requête rejouée).', sale: existing, idempotentReplay: true });
        return;
      }
    }

    // Isolation : client et produits doivent appartenir à l'entreprise active
    if (data.customerId) {
      const ownedCustomer = await req.prisma.customer.findFirst({ where: { id: data.customerId, businessId } });
      if (!ownedCustomer) throw new AppError('Client introuvable pour cette entreprise.', 404);
    }
    if ((data.paymentMethod === 'credit' || (data.paidAmount !== undefined && data.totalAmount !== undefined && data.paidAmount < data.totalAmount)) && !data.customerId) {
      throw new AppError('Une vente comportant une créance ou un crédit nécessite un client afin d’enregistrer la dette.', 400);
    }
    const productIds = Array.from(new Set(data.items.map(i => i.productId).filter(Boolean) as string[]));
    if (productIds.length > 0) {
      const ownedProducts = await req.prisma.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: { id: true },
      });
      if (ownedProducts.length !== productIds.length) {
        throw new AppError('Un ou plusieurs produits sont introuvables pour cette entreprise.', 404);
      }
    }

    // Vérifier les droits et quotas de l'abonnement en temps réel
    const subDetails = await getUserSubscriptionDetails(req.prisma, req.userId!);

    // Les ventes à crédit sont autorisées si le compte est PRO ou si le mode de pilotage est 'avec_credit' ou 'complet'
    const currentBusiness = await req.prisma.business.findUnique({
      where: { id: businessId },
      select: { trackingMode: true },
    });
    const hasCreditMode = currentBusiness?.trackingMode === 'avec_credit' || currentBusiness?.trackingMode === 'complet';

    if (data.paymentMethod === 'credit' && !subDetails.isPro && !hasCreditMode) {
      throw new AppError(
        'Les ventes à crédit et la gestion du carnet de dettes sont réservées aux modes « Carnet de Crédits Clients » ou au « Plan PRO ».',
        403
      );
    }

    // Quota Plan Gratuit : 15 ventes max / jour
    if (!subDetails.isPro) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const salesCountToday = await req.prisma.sale.count({
        where: { businessId, saleDate: { gte: today } },
      });
      if (salesCountToday >= 15) {
        throw new AppError(
          'Limite de 15 ventes journalières atteinte pour le Plan Gratuit. Passez à COMMERCIA PRO pour des ventes illimitées.',
          403
        );
      }
    }

    // Si le prix de revient ou charges variables ne sont pas fournis, les récupérer du catalogue produit
    const enrichedItems = await Promise.all(
      data.items.map(async item => {
        let costPrice = item.costPrice;
        let variableCosts = item.variableCosts;
        if (item.productId) {
          const product = await req.prisma.product.findUnique({
            where: { id: item.productId },
            select: { costPrice: true, variableCosts: true },
          });
          if (product) {
            if ((!costPrice || costPrice === 0) && product.costPrice > 0) {
              costPrice = product.costPrice;
            }
            if ((!variableCosts || variableCosts === 0) && product.variableCosts > 0) {
              variableCosts = product.variableCosts;
            }
          }
        }
        return {
          ...item,
          costPrice: costPrice || 0,
          variableCosts: variableCosts || 0,
        };
      })
    );

    const grossTotal = enrichedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const computedTotal = Math.max(0, grossTotal - (data.discountAmount || 0));
    const totalAmount = computedTotal;
    const paidAmount = data.paidAmount !== undefined
      ? Math.max(0, Math.min(data.paidAmount, computedTotal))
      : (data.paymentMethod === 'credit' ? 0 : computedTotal);
    const unpaidAmount = Math.max(0, totalAmount - paidAmount);

    // Attribuer le premier canal au client s'il est nouveau
    if (data.customerId && data.channelId) {
      const customer = await req.prisma.customer.findUnique({ where: { id: data.customerId } });
      if (customer && !customer.firstChannelId) {
        await req.prisma.customer.update({
          where: { id: data.customerId },
          data: {
            firstChannelId: data.channelId,
            acquiredAt: customer.acquiredAt || new Date(),
          },
        });
      }
    }

    // Vente + décrément de stock + mouvement : une seule transaction atomique.
    // Le décrément est conditionnel (quantity >= demandée) : pas de stock négatif ni de double vente concurrente.
    const sale = await req.prisma.$transaction(async (tx: any) => {
      const created = await tx.sale.create({
        data: {
          businessId,
          customerId: data.customerId || null,
          channelId: data.channelId || null,
          campaignId: data.campaignId || null,
          totalAmount: computedTotal,
          paidAmount,
          discountAmount: data.discountAmount || 0,
          variableCosts: data.variableCosts || 0,
          paymentMethod: data.paymentMethod,
          status: data.status,
          notes: [data.notes, idemMarker].filter(Boolean).join(' ') || null,
          saleDate: data.saleDate ? new Date(data.saleDate) : new Date(),
          items: {
            create: enrichedItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              variableCosts: item.variableCosts,
              totalPrice: item.unitPrice * item.quantity,
              productId: item.productId || null,
            })),
          },
        },
        include: { items: true, customer: true, channel: true },
      });

      for (const item of data.items) {
        if (!item.productId) continue;
        const updated = await tx.product.updateMany({
          where: { id: item.productId, businessId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new AppError(`Stock insuffisant pour « ${item.name} » : la vente est annulée.`, 409);
        }
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'out',
            quantity: item.quantity,
            reason: `Vente #${created.id.slice(0, 8)}`,
          },
        });
      }

      return created;
    });

    // Déclenchement automatique de notifications en cas de stock faible (Effet domino)
    for (const item of data.items) {
      if (item.productId) {
        try {
          const prod = await req.prisma.product.findUnique({ where: { id: item.productId } });
          if (prod && prod.quantity <= (prod.lowStockAlert ?? 5)) {
            await createNotification(req.prisma, {
              userId: req.userId!,
              businessId,
              type: 'stock_low',
              title: `Alerte Stock : ${prod.name}`,
              message: prod.quantity <= 0
                ? `Le produit « ${prod.name} » est ÉPUISÉ suite à la vente récente !`
                : `Stock faible pour « ${prod.name} » : plus que ${prod.quantity} pièce(s) restante(s).`,
              icon: prod.quantity <= 0 ? '🚨' : '📦',
              actionUrl: '/products',
            });
          }
        } catch (_) {}
      }
    }

    // Synchronisation avec les lots (hors transaction critique)
    for (const item of data.items) {
      // SYNCHRONISATION AUTOMATIQUE AVEC LES LOTS COMMERCIAUX :
      // Si l'article vendu correspond au nom d'un article d'un lot actif de cette boutique,
      // la vente et le mouvement de stock du lot sont décrémentés et comptabilisés en temps réel !
      try {
        const matchingLotItem = await req.prisma.lotItem.findFirst({
          where: {
            businessId,
            campaign: { status: 'active' },
            OR: [
              { name: { contains: item.name.trim(), mode: 'insensitive' } },
              { reference: { contains: item.name.trim(), mode: 'insensitive' } },
            ],
          },
          include: { campaign: true },
        });

        if (matchingLotItem && matchingLotItem.quantityRemaining >= item.quantity) {
          const campaignId = matchingLotItem.campaignId;
          const lineTotal = item.unitPrice * item.quantity;
          const lineCost = matchingLotItem.unitCost * item.quantity;
          const grossProfit = lineTotal - lineCost;

          await req.prisma.lotSale.create({
            data: {
              campaignId,
              businessId,
              saleDate: sale.saleDate,
              channel: 'comptoir',
              customerName: sale.customer ? sale.customer.name : null,
              customerPhone: sale.customer ? sale.customer.phone : null,
              totalAmount: lineTotal,
              discountAmount: 0,
              netAmount: lineTotal,
              amountPaid: lineTotal,
              amountDue: 0,
              variableCosts: item.variableCosts * item.quantity,
              paymentMethod: data.paymentMethod,
              paymentStatus: 'paid',
              notes: `Vente comptoir automatique synchronisée #${sale.id.slice(0, 8)}`,
              items: {
                create: [
                  {
                    lotItemId: matchingLotItem.id,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    unitCost: matchingLotItem.unitCost,
                    totalPrice: lineTotal,
                    totalCost: lineCost,
                    grossProfit,
                  },
                ],
              },
            },
          });

          await req.prisma.lotItem.update({
            where: { id: matchingLotItem.id },
            data: {
              quantitySold: { increment: item.quantity },
              quantityRemaining: { decrement: item.quantity },
            },
          });

          const totalInitial = matchingLotItem.quantityReceived;
          const newSold = matchingLotItem.quantitySold + item.quantity;
          const newRemaining = Math.max(0, matchingLotItem.quantityRemaining - item.quantity);

          await req.prisma.lotStockMovement.create({
            data: {
              campaignId,
              lotItemId: matchingLotItem.id,
              type: 'sale',
              quantity: -item.quantity,
              reason: `Vente comptoir auto #${sale.id.slice(0, 8)} (${item.quantity}x ${matchingLotItem.name} à ${item.unitPrice.toLocaleString('fr-FR')} FCFA) — Initial: ${totalInitial} pcs, Restant: ${newRemaining} pcs, Vendu total: ${newSold} pcs`,
            },
          });
        }
      } catch (err) {
        console.error('Error auto-syncing lot sale:', err);
      }
    }

    // If credit sale or partial payment with debt remaining, create customer debt
    if (unpaidAmount > 0 && data.customerId) {
      await req.prisma.customerDebt.create({
        data: {
          customerId: data.customerId,
          amount: unpaidAmount,
          description: `Vente ${data.paymentMethod === 'credit' ? 'à crédit' : 'avec solde dû'} - ${data.items.map(i => i.name).join(', ')}`,
        },
      });
      await req.prisma.customer.update({
        where: { id: data.customerId },
        data: {
          totalBought: { increment: totalAmount },
          totalOwed: { increment: unpaidAmount },
        },
      });
    } else if (data.customerId) {
      await req.prisma.customer.update({
        where: { id: data.customerId },
        data: { totalBought: { increment: totalAmount } },
      });
    }

    // Link sale encaissement to active cash session
    if (paidAmount > 0) {
      const activeSession = await req.prisma.cashSession.findFirst({
        where: { businessId, status: 'open' },
      });
      if (activeSession) {
        await req.prisma.cashMovement.create({
          data: {
            sessionId: activeSession.id,
            businessId,
            type: 'in',
            amount: paidAmount,
            method: data.paymentMethod,
            category: 'sale',
            referenceId: sale.id,
            description: `Vente #${sale.id.slice(0, 8)} (${data.items.map(i => i.name).join(', ')})`,
          },
        });
        await req.prisma.cashSession.update({
          where: { id: activeSession.id },
          data: {
            totalCashIn: data.paymentMethod === 'cash' ? { increment: paidAmount } : undefined,
            totalMomoIn: data.paymentMethod === 'mobile_money' ? { increment: paidAmount } : undefined,
            theoreticalCash: data.paymentMethod === 'cash' ? { increment: paidAmount } : undefined,
          },
        });
      }
    }


    // Audit log
    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'create',
        entity: 'sale',
        entityId: sale.id,
        details: JSON.stringify({ totalAmount, items: data.items.length }),
      },
    });

    res.status(201).json({
      message: `✅ Vente enregistrée\n+${totalAmount.toLocaleString('fr-FR')} FCFA`,
      sale,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return next(new AppError(error.errors[0].message, 400));
    next(error);
  }
});

// GET /api/sales — Lister les ventes
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const { page = '1', limit = '20', startDate, endDate, search } = req.query as any;
    
    const where: any = { businessId };
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const [sales, total] = await Promise.all([
      req.prisma.sale.findMany({
        where,
        include: { items: true, customer: true, channel: true, campaign: true },
        orderBy: { saleDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      req.prisma.sale.count({ where }),
    ]);

    res.json({
      sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sales/:id
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);
    const sale = await req.prisma.sale.findFirst({
      where: { id: req.params.id, businessId },
      include: { items: true, customer: true },
    });
    if (!sale) throw new AppError('Vente non trouvée.', 404);
    res.json(sale);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const businessId = await getTenantBusinessId(req);

    // Seuls les propriétaires ou gérants peuvent supprimer une vente
    const member = await req.prisma.businessMember.findFirst({
      where: { businessId, userId: req.userId, isActive: true },
    });
    if (member?.role === 'employee') {
      throw new AppError('Accès refusé. Les caissiers ne sont pas autorisés à supprimer ou annuler une vente enregistrée.', 403);
    }

    const sale = await req.prisma.sale.findFirst({
      where: { id: req.params.id, businessId },
      include: { items: true },
    });
    if (!sale) throw new AppError('Vente non trouvée.', 404);

    // Restore stock
    for (const item of sale.items) {
      if (item.productId) {
        await req.prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }
    }

    await req.prisma.sale.delete({ where: { id: sale.id } });

    await req.prisma.auditLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: 'delete',
        entity: 'sale',
        entityId: sale.id,
      },
    });

    res.json({ message: 'Vente supprimée.' });
  } catch (error) {
    next(error);
  }
});

export { router as salesRouter };
