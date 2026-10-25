import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Package,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Sliders,
  ShieldCheck,
  Crown,
  Lock,
  Layers,
  ShoppingBag,
  Truck,
  RotateCcw,
  Printer,
  Sparkles,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Zap,
  Globe,
  PieChart,
  Clock,
  Copy,
  Check,
  Flame,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { lotsService } from '../services/lotsService';
import {
  LotsOverviewResponse,
  CampaignSummaryItem,
  LotCampaignDetailResponse,
  CommercialLotCampaign,
  LotItem,
  ChannelRecommendation,
} from '../types/lots';

export const LotsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && user?.subscription?.status === 'active'));

  // View state: 'list' (overview of all campaigns) or 'detail' (single campaign)
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<LotsOverviewResponse | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<LotCampaignDetailResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'closed' | 'draft'>('all');

  // Detail view active tab
  const [detailTab, setDetailTab] = useState<
    'dashboard' | 'channels' | 'supply' | 'items' | 'stock' | 'sales' | 'expenses' | 'profitability' | 'reports'
  >('dashboard');
  const [copiedScriptChannel, setCopiedScriptChannel] = useState<string | null>(null);

  // Modals state
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showStockLossModal, setShowStockLossModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Wizard Form state
  // Step 1: Info
  const [wName, setWName] = useState('');
  const [wGoodsType, setWGoodsType] = useState('Vêtements / Friperie');
  const [wDescription, setWDescription] = useState('');
  const [wSupplier, setWSupplier] = useState('');
  const [wOrigin, setWOrigin] = useState('Dubaï');
  const [wDate, setWDate] = useState(new Date().toISOString().slice(0, 10));
  const [wCurrency, setWCurrency] = useState('XAF');
  const [wExchangeRate, setWExchangeRate] = useState<number>(1.0);
  const [wPurchasePrice, setWPurchasePrice] = useState<number>(200000);
  const [wNotes, setWNotes] = useState('');

  // Step 2: Supply costs
  const [wTransport, setWTransport] = useState<number>(25000);
  const [wCustoms, setWCustoms] = useState<number>(20000);
  const [wFees, setWFees] = useState<number>(5000);
  const [wPackaging, setWPackaging] = useState<number>(5000);
  const [wOtherCosts, setWOtherCosts] = useState<number>(0);

  // Step 3: Items & Allocation
  const [wAllocationMethod, setWAllocationMethod] = useState<'unit' | 'value_weighted' | 'custom'>('value_weighted');
  const [wItems, setWItems] = useState<
    Array<{
      name: string;
      reference?: string;
      category?: string;
      variant?: string;
      quantityReceived: number;
      estimatedSellingPrice: number;
      customUnitCost?: number;
    }>
  >([
    { name: 'Robes Soie 1er Choix', variant: 'Taille Unique', quantityReceived: 40, estimatedSellingPrice: 5000 },
    { name: 'Jupes & Ensembles 2ème Choix', variant: 'Standard', quantityReceived: 60, estimatedSellingPrice: 3000 },
    { name: 'T-Shirts & Tops Décontractés', variant: 'Mixte', quantityReceived: 50, estimatedSellingPrice: 1500 },
  ]);

  // Sale form state inside campaign
  const [saleLotItemId, setSaleLotItemId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleUnitPrice, setSaleUnitPrice] = useState<number>(0);
  const [saleChannel, setSaleChannel] = useState<'comptoir' | 'whatsapp' | 'facebook' | 'instagram' | 'site_web' | 'autre'>('comptoir');
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [saleVariableCosts, setSaleVariableCosts] = useState<number>(0);
  const [salePaymentMethod, setSalePaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer' | 'credit'>('cash');

  // Expense form state inside campaign
  const [expAmount, setExpAmount] = useState<number>(5000);
  const [expCategory, setExpCategory] = useState('blanchisserie');
  const [expDescription, setExpDescription] = useState('Pressing et défroissage pour exposition');

  // Stock Loss form state
  const [lossItemId, setLossItemId] = useState('');
  const [lossQuantity, setLossQuantity] = useState(1);
  const [lossReason, setLossReason] = useState('Tache indélébile / fermeture cassée');

  // Add Item to existing lot state
  const [newItemName, setNewItemName] = useState('');
  const [newItemVariant, setNewItemVariant] = useState('');
  const [newItemQty, setNewItemQty] = useState(10);
  const [newItemPrice, setNewItemPrice] = useState(3000);
  const [newItemCost, setNewItemCost] = useState(1500);

  // Load Overview Data
  const loadOverview = async () => {
    if (!isPro) {
      setLoading(false);
      return;
    }
    try {
      setRefreshing(true);
      const data = await lotsService.getOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Error loading lots overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load Campaign Detail Data
  const loadCampaignDetail = async (id: string) => {
    try {
      setLoading(true);
      const data = await lotsService.getCampaign(id);
      setCampaignDetail(data);
      setSelectedCampaignId(id);
      setCurrentView('detail');
    } catch (err: any) {
      alert('Erreur lors du chargement de la campagne: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [isPro]);

  // Landed Cost calculations for Wizard
  const wizardPurchaseXaf = Math.round((Number(wPurchasePrice) || 0) * (Number(wExchangeRate) || 1));
  const wizardTotalLandedCost = Math.round(
    wizardPurchaseXaf +
    (Number(wTransport) || 0) +
    (Number(wCustoms) || 0) +
    (Number(wFees) || 0) +
    (Number(wPackaging) || 0) +
    (Number(wOtherCosts) || 0)
  );

  const wizardTotalUnits = wItems.reduce((s, it) => s + (Number(it.quantityReceived) || 0), 0);
  const wizardTotalEstimatedSalesValue = wItems.reduce(
    (s, it) => s + ((Number(it.quantityReceived) || 0) * (Number(it.estimatedSellingPrice) || 0)),
    0
  );

  // Compute preview unit costs for items
  const computedWizardItems = useMemo(() => {
    return wItems.map(it => {
      let unitCost = 0;
      if (wAllocationMethod === 'unit') {
        unitCost = wizardTotalUnits > 0 ? Math.round(wizardTotalLandedCost / wizardTotalUnits) : 0;
      } else if (wAllocationMethod === 'value_weighted') {
        if (wizardTotalEstimatedSalesValue > 0 && it.estimatedSellingPrice > 0) {
          const itemWeight = (it.estimatedSellingPrice * it.quantityReceived) / wizardTotalEstimatedSalesValue;
          unitCost = Math.round((wizardTotalLandedCost * itemWeight) / it.quantityReceived);
        } else {
          unitCost = wizardTotalUnits > 0 ? Math.round(wizardTotalLandedCost / wizardTotalUnits) : 0;
        }
      } else {
        unitCost = it.customUnitCost || 0;
      }

      const unitMargin = it.estimatedSellingPrice - unitCost;
      const marginRate = it.estimatedSellingPrice > 0 ? Math.round((unitMargin / it.estimatedSellingPrice) * 100) : 0;

      return {
        ...it,
        unitCost,
        unitMargin,
        marginRate,
      };
    });
  }, [wItems, wAllocationMethod, wizardTotalLandedCost, wizardTotalUnits, wizardTotalEstimatedSalesValue]);

  // Create Campaign Submit
  const handleCreateCampaignSubmit = async (statusToUse: 'active' | 'draft') => {
    if (!wName.trim()) {
      alert('Veuillez renseigner un nom pour la campagne.');
      return;
    }
    if (wItems.length === 0) {
      alert('Veuillez ajouter au moins un article dans le lot.');
      return;
    }

    try {
      setLoading(true);
      const res = await lotsService.createCampaign({
        name: wName.trim(),
        goodsType: wGoodsType,
        description: wDescription.trim() || undefined,
        supplierName: wSupplier.trim() || undefined,
        originCountry: wOrigin.trim() || undefined,
        purchaseDate: wDate || undefined,
        purchaseCurrency: wCurrency,
        exchangeRate: Number(wExchangeRate) || 1,
        purchasePriceOriginal: Number(wPurchasePrice) || 0,
        transportCost: Number(wTransport) || 0,
        customsCost: Number(wCustoms) || 0,
        transactionFees: Number(wFees) || 0,
        packagingCost: Number(wPackaging) || 0,
        otherSupplyCosts: Number(wOtherCosts) || 0,
        costAllocationMethod: wAllocationMethod,
        status: statusToUse,
        notes: wNotes.trim() || undefined,
        items: computedWizardItems.map(it => ({
          name: it.name,
          reference: it.reference,
          category: it.category,
          variant: it.variant,
          quantityReceived: it.quantityReceived,
          estimatedSellingPrice: it.estimatedSellingPrice,
          customUnitCost: it.unitCost,
        })),
      });

      setShowWizardModal(false);
      setWizardStep(1);
      // Reset form
      setWName('');
      alert(`Campagne "${res.campaign.name}" créée avec succès !`);
      await loadOverview();
      loadCampaignDetail(res.campaign.id);
    } catch (err: any) {
      alert('Erreur lors de la création : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add Item Line to Wizard
  const addWizardItemLine = () => {
    setWItems([
      ...wItems,
      { name: 'Nouvel article', variant: 'Standard', quantityReceived: 20, estimatedSellingPrice: 2500 },
    ]);
  };

  const removeWizardItemLine = (idx: number) => {
    if (wItems.length <= 1) {
      alert('Le lot doit comporter au moins un article.');
      return;
    }
    setWItems(wItems.filter((_, i) => i !== idx));
  };

  const updateWizardItemLine = (idx: number, field: string, val: any) => {
    const copy = [...wItems];
    copy[idx] = { ...copy[idx], [field]: val };
    setWItems(copy);
  };

  // Record Sale on Campaign
  const handleRecordSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !saleLotItemId) return;

    try {
      await lotsService.recordSale(selectedCampaignId, {
        channel: saleChannel,
        customerName: saleCustomerName.trim() || undefined,
        customerPhone: saleCustomerPhone.trim() || undefined,
        discountAmount: Number(saleDiscount) || 0,
        variableCosts: Number(saleVariableCosts) || 0,
        paymentMethod: salePaymentMethod,
        items: [
          {
            lotItemId: saleLotItemId,
            quantity: Number(saleQuantity) || 1,
            unitPrice: Number(saleUnitPrice) || 0,
          },
        ],
      });

      setShowSaleModal(false);
      setSaleCustomerName('');
      setSaleCustomerPhone('');
      setSaleDiscount(0);
      setSaleVariableCosts(0);
      alert('Vente enregistrée avec succès ! Le stock et la rentabilité du lot ont été actualisés.');
      loadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert('Erreur enregistrement vente : ' + err.message);
    }
  };

  // Record Expense on Campaign
  const handleRecordExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;

    try {
      await lotsService.recordExpense(selectedCampaignId, {
        amount: Number(expAmount) || 0,
        category: expCategory,
        description: expDescription.trim() || undefined,
      });

      setShowExpenseModal(false);
      alert('Dépense imputée à la campagne avec succès !');
      loadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert('Erreur enregistrement dépense : ' + err.message);
    }
  };

  // Record Stock Loss
  const handleRecordStockLossSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !lossItemId) return;

    try {
      await lotsService.recordStockAdjustment(selectedCampaignId, {
        lotItemId: lossItemId,
        type: 'defective',
        quantity: Number(lossQuantity) || 1,
        reason: lossReason.trim() || undefined,
      });

      setShowStockLossModal(false);
      alert('Perte / article défectueux enregistré. Le stock restant a été ajusté.');
      loadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert('Erreur enregistrement perte : ' + err.message);
    }
  };

  // Add Item to existing campaign
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !newItemName.trim()) return;

    try {
      await lotsService.addItem(selectedCampaignId, {
        name: newItemName.trim(),
        variant: newItemVariant.trim() || undefined,
        quantityReceived: Number(newItemQty) || 1,
        estimatedSellingPrice: Number(newItemPrice) || 0,
        unitCost: Number(newItemCost) || 0,
      });

      setShowAddItemModal(false);
      setNewItemName('');
      alert('Nouvel article ajouté au lot avec succès !');
      loadCampaignDetail(selectedCampaignId);
    } catch (err: any) {
      alert('Erreur ajout article : ' + err.message);
    }
  };

  // Format FCFA
  const fmt = (num?: number | null) => {
    if (num === undefined || num === null) return '0 FCFA';
    return `${Math.round(num).toLocaleString('fr-FR')} FCFA`;
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (!overview?.campaigns) return [];
    return overview.campaigns.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.goodsType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.supplierName && c.supplierName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' ? true : c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [overview, searchQuery, statusFilter]);

  // =========================================================================
  // PRESENTATION PAGE FOR NON-PRO USERS (SECTION 2 DU CAHIER DES CHARGES)
  // =========================================================================
  if (!isPro) {
    return (
      <div className="page-wrapper" style={{ padding: '32px 20px', maxWidth: '960px', margin: '0 auto' }}>
        <div
          className="card"
          style={{
            padding: '44px 36px',
            textAlign: 'center',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 20px 40px -10px rgba(0, 98, 255, 0.12)',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 20px rgba(109, 40, 217, 0.3)',
            }}
          >
            <Boxes size={36} color="#FFFFFF" />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EDE9FE', color: '#6D28D9', padding: '4px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 800, marginBottom: '14px' }}>
            <Crown size={15} />
            MODULE PRO & BUSINESS COMMERCIA
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Gestion des Lots Commerciaux
          </h1>

          <p style={{ color: '#475569', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            L'espace de travail spécialisé dans la gestion financière et commerciale des achats en gros (balles de friperie, containers, cartons Alibaba, lots de téléphones/chaussures) et de leur transformation en articles vendus au détail.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px',
              textAlign: 'left',
              marginBottom: '36px',
            }}
          >
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <DollarSign size={20} color="#0062FF" />
                <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>Coût de revient au centime</strong>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Décomposez un achat global en articles individuels avec coût de revient calculé selon la méthode égalitaire ou pondérée par le prix de vente cible.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Truck size={20} color="#10B981" />
                <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>Ventilation des frais d'approche</strong>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Intégrez sans double comptage les frais de transport, transit, douane, manutention, change de devise et commissions de transfert.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ShieldCheck size={20} color="#FF6B00" />
                <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>Point mort & Remboursement</strong>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Suivez en direct le pourcentage de capital déjà récupéré et sachez avec certitude à quelle vente exacte votre balle commence à générer du bénéfice pur.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Layers size={20} color="#8B5CF6" />
                <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>Multi-Campagnes Étanches</strong>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Gérez simultanément vos balles de vêtements, lots de téléphones et cartons de cosmétiques sans jamais mélanger leurs stocks ni leurs bénéfices.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: 800,
                boxShadow: '0 8px 20px rgba(255, 107, 0, 0.35)',
              }}
              onClick={() => navigate('/subscription')}
            >
              Passer à COMMERCIA PRO (Essai 14 jours)
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '14px 22px', fontSize: '0.92rem' }}
              onClick={() => navigate('/dashboard')}
            >
              Retour au Tableau de Bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PRO VIEW - 1. OVERVIEW & CAMPAIGNS LIST
  // =========================================================================
  return (
    <div className="page-wrapper" style={{ paddingBottom: '60px' }}>
      {/* HEADER WITH MODULE NAME & ACTION BUTTON */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentView === 'detail' && (
              <button
                onClick={() => {
                  setCurrentView('list');
                  setSelectedCampaignId(null);
                  loadOverview();
                }}
                className="btn btn-secondary"
                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}
              >
                <ArrowLeft size={16} /> Retour aux lots
              </button>
            )}
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#0F172A' }}>
              {currentView === 'list' ? 'Gestion des Lots Commerciaux' : campaignDetail?.campaign.name}
            </h1>
            <span
              style={{
                background: '#EDE9FE',
                color: '#6D28D9',
                border: '1px solid #DDD6FE',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              MODULE PRO
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
            {currentView === 'list'
              ? 'Pilotage financier des achats en gros, décomposition d\'inventaire, point mort et vente multi-canaux.'
              : `${campaignDetail?.campaign.goodsType} • Acheté le ${campaignDetail?.campaign.purchaseDate.slice(0, 10)} • Fournisseur: ${campaignDetail?.campaign.supplierName || 'Non spécifié'}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (currentView === 'list') loadOverview();
              else if (selectedCampaignId) loadCampaignDetail(selectedCampaignId);
            }}
            title="Rafraîchir"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>Rafraîchir</span>
          </button>

          {currentView === 'list' ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                setWizardStep(1);
                setShowWizardModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)' }}
            >
              <Plus size={16} />
              <span>+ Nouvelle Campagne de Gestion de Lot</span>
            </button>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (campaignDetail && campaignDetail.campaign.items && campaignDetail.campaign.items.length > 0) {
                    const firstItem = campaignDetail.campaign.items.find(i => i.quantityRemaining > 0) || campaignDetail.campaign.items[0];
                    setSaleLotItemId(firstItem.id);
                    setSaleUnitPrice(firstItem.estimatedSellingPrice);
                  }
                  setShowSaleModal(true);
                }}
                disabled={campaignDetail?.campaign.status === 'closed'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10B981' }}
              >
                <ShoppingBag size={16} />
                <span>+ Vente sur ce lot</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setShowExpenseModal(true)}
                disabled={campaignDetail?.campaign.status === 'closed'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <DollarSign size={16} />
                <span>+ Dépense lot</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Rapport PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* VIEW 1: CONSOLIDATED OVERVIEW & CAMPAIGNS LIST */}
      {currentView === 'list' && overview && (
        <div>
          {/* 8 MANDATORY CONSOLIDATED CARDS (SECTION 3 DU CAHIER DES CHARGES) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}
          >
            {/* 1. Total Campagnes */}
            <div className="stat-card" style={{ borderLeft: '4px solid #0062FF' }}>
              <div>
                <div className="stat-label">Total Campagnes Lots</div>
                <div className="stat-value" style={{ color: '#0062FF' }}>{overview.summary.totalCampaigns}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  {overview.summary.activeCampaignsCount} en cours • {overview.summary.closedCampaignsCount} clôturées
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0062FF' }}>
                <Boxes size={22} />
              </div>
            </div>

            {/* 2. Montant Total Investi */}
            <div className="stat-card" style={{ borderLeft: '4px solid #7C3AED' }}>
              <div>
                <div className="stat-label">Total Investi (Lots)</div>
                <div className="stat-value" style={{ color: '#7C3AED' }}>{fmt(overview.summary.totalInvested)}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>Coût total d'approvisionnement</div>
              </div>
              <div className="stat-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                <Truck size={22} />
              </div>
            </div>

            {/* 3. Chiffre d'Affaires Cumulé */}
            <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
              <div>
                <div className="stat-label">Chiffre d'Affaires Cumulé</div>
                <div className="stat-value" style={{ color: '#059669' }}>{fmt(overview.summary.totalRevenue)}</div>
                <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: '4px' }}>
                  Ventes encaissées sur les lots
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#DCFCE7', color: '#059669' }}>
                <ShoppingBag size={22} />
              </div>
            </div>

            {/* 4. Bénéfice Cumulé Réalisé */}
            <div
              className="stat-card"
              style={{
                borderLeft: `4px solid ${overview.summary.totalRealizedProfit >= 0 ? '#10B981' : '#EF4444'}`,
                background: overview.summary.totalRealizedProfit >= 0 ? '#F0FDF4' : '#FEF2F2',
              }}
            >
              <div>
                <div className="stat-label">Bénéfice Réalisé Cumulé</div>
                <div
                  className="stat-value"
                  style={{ color: overview.summary.totalRealizedProfit >= 0 ? '#15803D' : '#DC2626' }}
                >
                  {fmt(overview.summary.totalRealizedProfit)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  CA net - COGS - Variables - Dépenses
                </div>
              </div>
              <div
                className="stat-icon"
                style={{
                  background: overview.summary.totalRealizedProfit >= 0 ? '#DCFCE7' : '#FEE2E2',
                  color: overview.summary.totalRealizedProfit >= 0 ? '#15803D' : '#DC2626',
                }}
              >
                <TrendingUp size={22} />
              </div>
            </div>

            {/* 5. Valeur Estimée du Stock Restant */}
            <div className="stat-card" style={{ borderLeft: '4px solid #FF6B00' }}>
              <div>
                <div className="stat-label">Stock Restant (Valeur Cible)</div>
                <div className="stat-value" style={{ color: '#FF6B00' }}>
                  {fmt(overview.summary.totalRemainingStockMarketValue)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Coût d'achat: {fmt(overview.summary.totalRemainingStockCost)}
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FFF7ED', color: '#FF6B00' }}>
                <Package size={22} />
              </div>
            </div>

            {/* 6. Dépenses Supplémentaires Totales */}
            <div className="stat-card" style={{ borderLeft: '4px solid #E11D48' }}>
              <div>
                <div className="stat-label">Dépenses Additionnelles</div>
                <div className="stat-value" style={{ color: '#E11D48' }}>
                  {fmt(overview.summary.totalAdditionalExpenses)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Pressing, réparation, publicité
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FFE4E6', color: '#E11D48' }}>
                <DollarSign size={22} />
              </div>
            </div>

            {/* 7. Taux Global de Récupération du Capital */}
            <div className="stat-card" style={{ borderLeft: '4px solid #0284C7' }}>
              <div>
                <div className="stat-label">Taux Récupération Capital</div>
                <div className="stat-value" style={{ color: '#0284C7' }}>
                  {overview.summary.globalRecoveryRate}%
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Remboursement investissement initial
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                <ShieldCheck size={22} />
              </div>
            </div>

            {/* 8. Campagnes sous surveillance */}
            <div className="stat-card" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div>
                <div className="stat-label">Lots à Optimiser</div>
                <div className="stat-value" style={{ color: overview.campaignsNeedingAttention.length > 0 ? '#D97706' : '#10B981' }}>
                  {overview.campaignsNeedingAttention.length}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Récupération &lt; 60% après 5+ ventes
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <AlertTriangle size={22} />
              </div>
            </div>
          </div>

          {/* ATTENTION BANNER IF ANY CAMPAIGN NEEDS ATTENTION */}
          {overview.campaignsNeedingAttention.length > 0 && (
            <div
              style={{
                background: '#FFFBEB',
                border: '1.5px solid #FDE68A',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.88rem', color: '#92400E' }}>
                <strong>Attention rentabilité :</strong> {overview.campaignsNeedingAttention.map(c => c.name).join(', ')} requièrent une accélération des ventes ou une révision des prix pour rembourser leur coût d'approvisionnement initial.
              </div>
            </div>
          )}

          {/* SEARCH, FILTER & ACTIONS BAR */}
          <div
            className="card"
            style={{
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1 }}>
              <Search size={18} color="#64748B" />
              <input
                type="text"
                placeholder="Rechercher par nom de campagne, type de marchandise ou fournisseur..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'Toutes les campagnes' },
                { key: 'active', label: 'En cours' },
                { key: 'paused', label: 'En pause' },
                { key: 'closed', label: 'Clôturées' },
                { key: 'draft', label: 'Brouillons' },
              ].map(st => (
                <button
                  key={st.key}
                  onClick={() => setStatusFilter(st.key as any)}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: statusFilter === st.key ? 700 : 500,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: statusFilter === st.key ? '1.5px solid #0062FF' : '1px solid #E2E8F0',
                    background: statusFilter === st.key ? '#EFF6FF' : '#FFFFFF',
                    color: statusFilter === st.key ? '#0062FF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* CAMPAIGNS LIST TABLE */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px' }}>Campagne & Marchandises</th>
                  <th style={{ padding: '14px 10px' }}>Enregistrement (Date & Heure)</th>
                  <th style={{ padding: '14px 10px' }}>Investissement Total</th>
                  <th style={{ padding: '14px 10px' }}>Chiffre d'Affaires</th>
                  <th style={{ padding: '14px 10px' }}>Bénéfice Réalisé</th>
                  <th style={{ padding: '14px 10px' }}>Stock Restant</th>
                  <th style={{ padding: '14px 10px' }}>Remboursement</th>
                  <th style={{ padding: '14px 10px' }}>Statut & Épuisement</th>
                  <th style={{ padding: '14px 10px' }}>Canal Vente Rapide</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                      Aucune campagne de lot trouvée. Cliquez sur « + Nouvelle Campagne » pour démarrer votre première gestion de lot.
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map(camp => (
                    <tr key={camp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#475569',
                              flexShrink: 0,
                            }}
                          >
                            <Boxes size={20} />
                          </div>
                          <div>
                            <strong style={{ color: '#0F172A', fontSize: '0.94rem', display: 'block' }}>
                              {camp.name}
                            </strong>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                              <span style={{ background: '#EFF6FF', color: '#0062FF', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {camp.goodsType}
                              </span>
                              {camp.supplierName ? ` • ${camp.supplierName}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} color="#0062FF" />
                            {camp.createdAt ? new Date(camp.createdAt).toLocaleDateString('fr-FR') + ' à ' + new Date(camp.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : camp.purchaseDate.slice(0, 10)}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Acheté le {camp.purchaseDate.slice(0, 10)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px', fontWeight: 700, color: '#0F172A' }}>
                        {fmt(camp.totalLandedCost)}
                      </td>
                      <td style={{ padding: '14px 10px', fontWeight: 600, color: '#059669' }}>
                        {fmt(camp.revenue)}
                      </td>
                      <td
                        style={{
                          padding: '14px 10px',
                          fontWeight: 800,
                          color: camp.realizedProfit >= 0 ? '#16A34A' : '#DC2626',
                        }}
                      >
                        {camp.realizedProfit >= 0 ? '+' : ''}{fmt(camp.realizedProfit)}
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <strong>{camp.totalQuantityRemaining}</strong> / {camp.totalQuantityReceived} pcs
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          Valeur: {fmt(camp.remainingStockMarketValue)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                          <span>{camp.recoveryRate}%</span>
                          <span style={{ color: camp.isBreakevenReached ? '#16A34A' : '#D97706' }}>
                            {camp.isBreakevenReached ? 'Bénéfice pur' : 'En amortissement'}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, camp.recoveryRate)}%`,
                              height: '100%',
                              background: camp.isBreakevenReached ? '#10B981' : '#0062FF',
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {camp.depletedAt || camp.depletionStats?.isDepleted ? (
                            <>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontWeight: 800,
                                  background: '#DCFCE7',
                                  color: '#15803D',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  width: 'fit-content',
                                }}
                              >
                                <CheckCircle2 size={12} /> Épuisé
                              </span>
                              {camp.depletedAt && (
                                <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700 }}>
                                  🏁 {new Date(camp.depletedAt).toLocaleDateString('fr-FR')} à {new Date(camp.depletedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {camp.depletionStats?.durationLabel && (
                                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                  {camp.depletionStats.durationLabel}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontWeight: 700,
                                  background:
                                    camp.status === 'active'
                                      ? '#EFF6FF'
                                      : camp.status === 'paused'
                                      ? '#FEF3C7'
                                      : '#F1F5F9',
                                  color:
                                    camp.status === 'active'
                                      ? '#1D4ED8'
                                      : camp.status === 'paused'
                                      ? '#D97706'
                                      : '#64748B',
                                  width: 'fit-content',
                                }}
                              >
                                {camp.status === 'active'
                                  ? 'En cours'
                                  : camp.status === 'paused'
                                  ? 'En pause'
                                  : 'Brouillon'}
                              </span>
                              {camp.depletionStats?.durationLabel && (
                                <span style={{ fontSize: '0.70rem', color: '#64748B' }}>
                                  ⏳ {camp.depletionStats.durationLabel}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        {camp.topRecommendedChannel ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#6D28D9',
                                background: '#F5F3FF',
                                border: '1px solid #DDD6FE',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                width: 'fit-content',
                              }}
                            >
                              <Zap size={12} color="#7C3AED" />
                              {camp.topRecommendedChannel.channelName.split('&')[0]} ({camp.topRecommendedChannel.velocityScore}%)
                            </span>
                            <span style={{ fontSize: '0.70rem', color: '#059669', fontWeight: 600 }}>
                              {camp.topRecommendedChannel.speedBadge}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => loadCampaignDetail(camp.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Ouvrir</span>
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED INDEPENDENT CAMPAIGN VIEW (SECTION 5 DU CAHIER DES CHARGES) */}
      {currentView === 'detail' && campaignDetail && (
        <div>
          {/* HORODATAGE CERTIFIÉ & CYCLE DE VIE DU LOT */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '18px 22px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
              {/* Date & Heure exacte d'enregistrement */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#EFF6FF',
                    color: '#0062FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Date & Heure d'Enregistrement du Lot
                  </div>
                  <strong style={{ fontSize: '0.96rem', color: '#0F172A', display: 'block' }}>
                    {campaignDetail.depletionStats?.registeredAtFormatted ||
                      new Date(campaignDetail.campaign.createdAt).toLocaleString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Acheté le {campaignDetail.campaign.purchaseDate.slice(0, 10)} auprès de {campaignDetail.campaign.supplierName || 'Fournisseur non spécifié'}
                  </span>
                </div>
              </div>

              {/* Date Complète d'Épuisement */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: campaignDetail.depletionStats?.isDepleted ? '#DCFCE7' : '#FEF3C7',
                    color: campaignDetail.depletionStats?.isDepleted ? '#15803D' : '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {campaignDetail.depletionStats?.isDepleted ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Date Complète d'Épuisement du Lot
                  </div>
                  <strong
                    style={{
                      fontSize: '0.96rem',
                      display: 'block',
                      color: campaignDetail.depletionStats?.isDepleted ? '#15803D' : '#D97706',
                    }}
                  >
                    {campaignDetail.depletionStats?.isDepleted
                      ? `Épuisé le ${campaignDetail.depletionStats.depletedAtFormatted || new Date(campaignDetail.campaign.depletedAt!).toLocaleString('fr-FR')}`
                      : `Non Épuisé (${campaignDetail.financials.totalQuantityRemaining} articles restants)`}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#475569' }}>
                    {campaignDetail.depletionStats?.durationLabel}
                    {!campaignDetail.depletionStats?.isDepleted && campaignDetail.depletionStats?.estimatedDepletionLabel && (
                      <> • <span style={{ color: '#0062FF', fontWeight: 600 }}>{campaignDetail.depletionStats.estimatedDepletionLabel}</span></>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick recommendation CTA */}
            {campaignDetail.channelRecommendations && campaignDetail.channelRecommendations.length > 0 && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                  border: '1.5px solid #DDD6FE',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#6D28D9', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={13} /> CANAL RECOMMANDÉ POUR VENTE RAPIDE :
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4C1D95' }}>
                    {campaignDetail.channelRecommendations[0].channelName} ({campaignDetail.channelRecommendations[0].velocityScore}%)
                  </div>
                </div>
                <button
                  onClick={() => setDetailTab('channels')}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.80rem',
                    background: '#7C3AED',
                    borderColor: '#7C3AED',
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                  }}
                >
                  Voir Stratégies 🚀
                </button>
              </div>
            )}
          </div>

          {/* TABS OF THE CAMPAIGN */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              borderBottom: '2px solid #E2E8F0',
              marginBottom: '24px',
              overflowX: 'auto',
            }}
          >
            {[
              { key: 'dashboard', label: '📊 Tableau de bord du lot' },
              { key: 'channels', label: '🚀 Canaux Vente Rapide (Suggestions IA)' },
              { key: 'supply', label: '🚚 Coûts d\'Approvisionnement' },
              { key: 'items', label: '📦 Articles & Inventaire' },
              { key: 'stock', label: '🔄 Stock & Mouvements' },
              { key: 'sales', label: `💰 Ventes (${campaignDetail.campaign.sales?.length || 0})` },
              { key: 'expenses', label: `💸 Dépenses (${campaignDetail.campaign.expenses?.length || 0})` },
              { key: 'profitability', label: '📈 Rentabilité Financière' },
              { key: 'reports', label: '📑 Historique & Rapports' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setDetailTab(tab.key as any)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: detailTab === tab.key ? '3px solid #0062FF' : '3px solid transparent',
                  background: 'transparent',
                  color: detailTab === tab.key ? '#0062FF' : '#64748B',
                  fontWeight: detailTab === tab.key ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: TABLEAU DE BORD DU LOT */}
          {detailTab === 'dashboard' && (
            <div>
              {/* Financial Progress Banner */}
              <div
                className="card"
                style={{
                  padding: '20px 24px',
                  marginBottom: '24px',
                  background: campaignDetail.financials.isBreakevenReached
                    ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
                    : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  border: `1.5px solid ${campaignDetail.financials.isBreakevenReached ? '#86EFAC' : '#BFDBFE'}`,
                  borderRadius: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {campaignDetail.financials.isBreakevenReached ? (
                      <CheckCircle2 size={24} color="#15803D" />
                    ) : (
                      <TrendingUp size={24} color="#1D4ED8" />
                    )}
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: '#0F172A' }}>
                        {campaignDetail.financials.isBreakevenReached
                          ? '🎉 Félicitations : Seuil de Rentabilité Atteint !'
                          : 'Progression de Remboursement du Lot :'}
                      </strong>
                      <div style={{ fontSize: '0.84rem', color: '#475569' }}>
                        {campaignDetail.financials.isBreakevenReached
                          ? 'Votre investissement initial a été amorti à 100%. Chaque article vendu supplémentaire est désormais du bénéfice pur !'
                          : `Reste ${fmt(campaignDetail.financials.remainingToBreakeven)} à encaisser (soit environ ${campaignDetail.financials.unitsToBreakeven} articles) pour récupérer l'intégralité de votre mise de départ.`}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: campaignDetail.financials.isBreakevenReached ? '#15803D' : '#1D4ED8' }}>
                    {campaignDetail.financials.recoveryRate}% Récupéré
                  </div>
                </div>

                <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, campaignDetail.financials.recoveryRate)}%`,
                      height: '100%',
                      background: campaignDetail.financials.isBreakevenReached ? '#16A34A' : '#0062FF',
                      borderRadius: '6px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* FAST-SELLING CHANNELS SUMMARY CARD */}
              {campaignDetail.channelRecommendations && campaignDetail.channelRecommendations.length > 0 && (
                <div
                  className="card"
                  style={{
                    padding: '20px 24px',
                    marginBottom: '24px',
                    borderRadius: '16px',
                    border: '1.5px solid #E9D5FF',
                    background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: '#7C3AED',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Zap size={20} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.05rem', color: '#4C1D95' }}>
                          ⚡ Canaux Recommandés pour Vendre Rapidement ce Lot
                        </strong>
                        <div style={{ fontSize: '0.82rem', color: '#6B21A8' }}>
                          Suggestions algorithmiques d'écoulement éclair pour déstocker les {campaignDetail.financials.totalQuantityRemaining} articles restants au meilleur profit.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setDetailTab('channels')}
                      style={{
                        background: '#7C3AED',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>Voir les {campaignDetail.channelRecommendations.length} canaux & scripts complets</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {campaignDetail.channelRecommendations.slice(0, 2).map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '12px',
                          padding: '16px',
                          border: '1px solid #E9D5FF',
                          boxShadow: '0 2px 4px rgba(124, 58, 237, 0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.94rem', color: '#1E1B4B' }}>{rec.channelName}</strong>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: '#F3E8FF',
                              color: '#7C3AED',
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            Score {rec.velocityScore}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginBottom: '6px' }}>
                          {rec.speedBadge}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                          {rec.recommendedAction}
                        </p>
                        <div
                          style={{
                            background: '#F8FAFC',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            color: '#0F172A',
                            borderLeft: '3px solid #7C3AED',
                            marginBottom: '10px',
                          }}
                        >
                          <strong>Offre suggérée :</strong> {rec.suggestedOffer}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(rec.copyableSalesScript);
                              setCopiedScriptChannel(rec.channel);
                              setTimeout(() => setCopiedScriptChannel(null), 2500);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '6px 10px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            {copiedScriptChannel === rec.channel ? <CheckCircle2 size={13} color="#16A34A" /> : <Copy size={13} />}
                            <span>{copiedScriptChannel === rec.channel ? 'Texte copié !' : 'Copier texte'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSaleChannel(rec.channel as any);
                              setShowSaleModal(true);
                            }}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '6px 10px', flex: 1, background: '#0062FF' }}
                          >
                            + Vente {rec.channel}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KPI Cards of this Campaign */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #7C3AED' }}>
                  <div>
                    <div className="stat-label">Investissement Total</div>
                    <div className="stat-value" style={{ color: '#7C3AED' }}>{fmt(campaignDetail.financials.totalLandedCost)}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>Achat + Fret + Douane</div>
                  </div>
                  <div className="stat-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                    <Truck size={22} />
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
                  <div>
                    <div className="stat-label">Chiffre d'Affaires Net</div>
                    <div className="stat-value" style={{ color: '#059669' }}>{fmt(campaignDetail.financials.totalRevenue)}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>{campaignDetail.financials.totalQuantitySold} articles vendus</div>
                  </div>
                  <div className="stat-icon" style={{ background: '#DCFCE7', color: '#059669' }}>
                    <ShoppingBag size={22} />
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #10B981' }}>
                  <div>
                    <div className="stat-label">Bénéfice Réalisé Encaissé</div>
                    <div className="stat-value" style={{ color: campaignDetail.financials.realizedProfit >= 0 ? '#15803D' : '#DC2626' }}>
                      {fmt(campaignDetail.financials.realizedProfit)}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>CA - COGS - Variables - Dépenses</div>
                  </div>
                  <div className="stat-icon" style={{ background: '#DCFCE7', color: '#15803D' }}>
                    <TrendingUp size={22} />
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #FF6B00' }}>
                  <div>
                    <div className="stat-label">Stock Restant (Pièces)</div>
                    <div className="stat-value" style={{ color: '#FF6B00' }}>
                      {campaignDetail.financials.totalQuantityRemaining} pcs
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                      Sur {campaignDetail.financials.totalQuantityReceived} reçues initialement
                    </div>
                  </div>
                  <div className="stat-icon" style={{ background: '#FFF7ED', color: '#FF6B00' }}>
                    <Package size={22} />
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #0284C7' }}>
                  <div>
                    <div className="stat-label">Valeur Cible Stock Restant</div>
                    <div className="stat-value" style={{ color: '#0284C7' }}>
                      {fmt(campaignDetail.financials.remainingStockMarketValue)}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                      Coût restant: {fmt(campaignDetail.financials.remainingStockCostValue)}
                    </div>
                  </div>
                  <div className="stat-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                    <DollarSign size={22} />
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
                  <div>
                    <div className="stat-label">Bénéfice Potentiel Restant</div>
                    <div className="stat-value" style={{ color: '#8B5CF6' }}>
                      {fmt(campaignDetail.financials.potentialFutureProfit)}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                      Si tout le stock restant est vendu
                    </div>
                  </div>
                  <div className="stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
                    <Sparkles size={22} />
                  </div>
                </div>
              </div>

              {/* Status Actions Bar */}
              <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>État de la campagne :</strong>
                  <span style={{ marginLeft: '8px', fontSize: '0.8rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, background: '#EFF6FF', color: '#0062FF' }}>
                    {campaignDetail.campaign.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {campaignDetail.campaign.status === 'active' ? (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem' }}
                      onClick={async () => {
                        await lotsService.updateStatus(campaignDetail.campaign.id, 'paused');
                        loadCampaignDetail(campaignDetail.campaign.id);
                      }}
                    >
                      Suspendre la Campagne
                    </button>
                  ) : campaignDetail.campaign.status === 'paused' ? (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem' }}
                      onClick={async () => {
                        await lotsService.updateStatus(campaignDetail.campaign.id, 'active');
                        loadCampaignDetail(campaignDetail.campaign.id);
                      }}
                    >
                      Reprendre la Campagne
                    </button>
                  ) : null}

                  {campaignDetail.campaign.status !== 'closed' ? (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', color: '#DC2626' }}
                      onClick={async () => {
                        if (window.confirm('Voulez-vous vraiment clôturer ce lot ? Les calculs resteront figés et consultables.')) {
                          await lotsService.updateStatus(campaignDetail.campaign.id, 'closed');
                          loadCampaignDetail(campaignDetail.campaign.id);
                        }
                      }}
                    >
                      Clôturer le Lot
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', color: '#16A34A' }}
                      onClick={async () => {
                        if (window.confirm('Voulez-vous réouvrir ce lot clôturé ?')) {
                          await lotsService.updateStatus(campaignDetail.campaign.id, 'active');
                          loadCampaignDetail(campaignDetail.campaign.id);
                        }
                      }}
                    >
                      Réouvrir le Lot
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1b: CANAUX DE VENTE RAPIDE (SUGGESTIONS ALGORITHMIQUES IA) */}
          {detailTab === 'channels' && (
            <div>
              {/* Header card with summary metrics */}
              <div
                className="card"
                style={{
                  padding: '24px',
                  marginBottom: '24px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 50%, #EDE9FE 100%)',
                  border: '1.5px solid #DDD6FE',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: '#7C3AED',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                      }}
                    >
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#4C1D95' }}>
                        Canaux de Vente Recommandés pour Écoulement Rapide
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#6B21A8' }}>
                        Analyse prédictive COMMERCIA basée sur votre type de marchandise ({campaignDetail.campaign.goodsType}), vos marges et votre niveau d'amortissement actuel.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        setShowSaleModal(true);
                      }}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      <Plus size={16} />
                      <span>+ Enregistrer une Vente sur ce Lot</span>
                    </button>
                  </div>
                </div>

                {/* Status KPI summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E9D5FF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#6B21A8', fontWeight: 700, textTransform: 'uppercase' }}>
                      Stock Restant à Déstocker
                    </div>
                    <strong style={{ fontSize: '1.15rem', color: '#0F172A' }}>
                      {campaignDetail.financials.totalQuantityRemaining} pcs
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Valeur cible : {fmt(campaignDetail.financials.remainingStockMarketValue)}
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E9D5FF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#6B21A8', fontWeight: 700, textTransform: 'uppercase' }}>
                      Objectif Récupération Capital
                    </div>
                    <strong style={{ fontSize: '1.15rem', color: campaignDetail.financials.isBreakevenReached ? '#15803D' : '#D97706' }}>
                      {campaignDetail.financials.isBreakevenReached ? 'Amorti à 100%' : `${fmt(campaignDetail.financials.remainingToBreakeven)} restants`}
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {campaignDetail.financials.isBreakevenReached ? 'Bénéfice 100% pur sur les ventes' : `~${campaignDetail.financials.unitsToBreakeven} articles pour point mort`}
                    </div>
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E9D5FF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#6B21A8', fontWeight: 700, textTransform: 'uppercase' }}>
                      Cadence & Épuisement
                    </div>
                    <strong style={{ fontSize: '1.15rem', color: '#0F172A' }}>
                      {campaignDetail.depletionStats?.isDepleted ? 'Lot Déjà Épuisé' : (campaignDetail.depletionStats?.durationLabel || 'En cours')}
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: '#0062FF', fontWeight: 600 }}>
                      {campaignDetail.depletionStats?.isDepleted ? `Épuisé le ${campaignDetail.depletionStats.depletedAtFormatted}` : `Rythme : ${campaignDetail.depletionStats?.dailyVelocity || 0} pcs/jour`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Channels Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {campaignDetail.channelRecommendations?.map((rec, idx) => (
                  <div
                    key={rec.channel}
                    className="card"
                    style={{
                      padding: '24px',
                      borderRadius: '16px',
                      border: idx === 0 ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                      boxShadow: idx === 0 ? '0 4px 14px rgba(124, 58, 237, 0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {idx === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '16px',
                          right: '-32px',
                          background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '4px 36px',
                          transform: 'rotate(45deg)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        }}
                      >
                        TOP CHOIX
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: '#F5F3FF',
                              color: '#7C3AED',
                              fontWeight: 900,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                            {rec.channelName}
                          </h4>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              padding: '3px 10px',
                              borderRadius: '12px',
                              background: rec.priority === 'HAUTE' ? '#DCFCE7' : '#EFF6FF',
                              color: rec.priority === 'HAUTE' ? '#15803D' : '#1D4ED8',
                            }}
                          >
                            Priorité {rec.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{rec.speedBadge}</span> • <span>Délai estimé : {rec.estimatedDaysToSell}</span>
                        </div>
                      </div>

                      {/* Velocity score gauge */}
                      <div style={{ textAlign: 'right', minWidth: '160px' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                          Score de Rapidité d'Écoulement
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7C3AED' }}>
                          {rec.velocityScore} / 100
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                          <div
                            style={{
                              width: `${rec.velocityScore}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Strategy and Action Playbook */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      {/* Left: Tactical steps */}
                      <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <strong style={{ fontSize: '0.90rem', color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                          🎯 Stratégie : {rec.strategyTitle}
                        </strong>
                        <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                          {rec.recommendedAction}
                        </p>
                        <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                          Plan d'action en 3 étapes :
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.80rem', color: '#334155', lineHeight: 1.6 }}>
                          {rec.actionSteps.map((step, sIdx) => (
                            <li key={sIdx}>{step}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Right: Commercial Offer & Rationale */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ background: '#F0FDF4', padding: '14px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
                            💡 Offre Commerciale Incitative Conseillée
                          </div>
                          <div style={{ fontSize: '0.86rem', color: '#14532D', fontWeight: 600 }}>
                            {rec.suggestedOffer}
                          </div>
                        </div>

                        <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                            📊 Pourquoi ce canal sur ce lot ?
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
                            {rec.financialRationale}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '6px' }}>
                            <strong>Cible :</strong> {rec.targetAudience}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sales Script Box with copy button & direct sale trigger */}
                    <div
                      style={{
                        background: '#FAF5FF',
                        border: '1px dashed #DDD6FE',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', marginBottom: '4px' }}>
                          📢 Modèle de texte commercial prêt à publier ({rec.channel}) :
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#4C1D95', fontStyle: 'italic', lineHeight: 1.4 }}>
                          "{rec.copyableSalesScript}"
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(rec.copyableSalesScript);
                            setCopiedScriptChannel(rec.channel);
                            setTimeout(() => setCopiedScriptChannel(null), 2500);
                          }}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.78rem',
                            padding: '8px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#FFFFFF',
                          }}
                        >
                          {copiedScriptChannel === rec.channel ? (
                            <>
                              <CheckCircle2 size={15} color="#16A34A" />
                              <span style={{ color: '#16A34A', fontWeight: 700 }}>Texte Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy size={15} />
                              <span>Copier l'annonce</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setSaleChannel(rec.channel as any);
                            setShowSaleModal(true);
                          }}
                          className="btn btn-primary"
                          style={{
                            fontSize: '0.78rem',
                            padding: '8px 14px',
                            background: '#0062FF',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>+ Vendre sur {rec.channel}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: INFORMATIONS & COÛTS D'APPROVISIONNEMENT */}
          {detailTab === 'supply' && (
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0F172A' }}>
                Décomposition Détaillée des Coûts d'Approvisionnement
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Achat Initial</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                    {fmt(campaignDetail.campaign.purchasePriceXaf)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                    Devise d'origine: {campaignDetail.campaign.purchasePriceOriginal.toLocaleString('fr-FR')} {campaignDetail.campaign.purchaseCurrency} (Taux: {campaignDetail.campaign.exchangeRate})
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Transport & Fret</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0062FF', marginTop: '4px' }}>
                    {fmt(campaignDetail.campaign.transportCost)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Fret maritime / aérien / routier</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Douane & Transit</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                    {fmt(campaignDetail.campaign.customsCost)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Frais d'importation et taxes</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Frais Transaction & Change</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#475569', marginTop: '4px' }}>
                    {fmt(campaignDetail.campaign.transactionFees)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Commissions transfert et conversion</div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Emballage & Manutention</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#475569', marginTop: '4px' }}>
                    {fmt(campaignDetail.campaign.packagingCost + campaignDetail.campaign.otherSupplyCosts)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Conditionnement et déchargement</div>
                </div>

                <div style={{ background: '#EFF6FF', padding: '18px', borderRadius: '12px', border: '1.5px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.82rem', color: '#1D4ED8', fontWeight: 800, textTransform: 'uppercase' }}>Coût Total d'Approvisionnement</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1D4ED8', marginTop: '4px' }}>
                    {fmt(campaignDetail.financials.totalLandedCost)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#1D4ED8', marginTop: '4px' }}>
                    Méthode de répartition: {campaignDetail.campaign.costAllocationMethod === 'value_weighted' ? 'Pondérée par le prix cible' : 'Égalitaire par pièce'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARTICLES & INVENTAIRE DU LOT */}
          {detailTab === 'items' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Inventaire Décomposé du Lot
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.84rem', margin: '2px 0 0 0' }}>
                    Suivez la quantité reçue, vendue, défectueuse et restante pour chaque article du lot avec son coût unitaire calculé.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddItemModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Ajouter une Référence</span>
                </button>
              </div>

              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Article & Variante</th>
                      <th style={{ padding: '12px 10px' }}>Reçus Initialement</th>
                      <th style={{ padding: '12px 10px' }}>Vendus</th>
                      <th style={{ padding: '12px 10px' }}>Avariés / Pertes</th>
                      <th style={{ padding: '12px 10px' }}>Stock Restant</th>
                      <th style={{ padding: '12px 10px' }}>Coût Revient Unit.</th>
                      <th style={{ padding: '12px 10px' }}>Prix Vente Cible</th>
                      <th style={{ padding: '12px 10px' }}>Marge Unit. Cible</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignDetail.campaign.items?.map(it => {
                      const unitMargin = it.estimatedSellingPrice - it.unitCost;
                      const marginRate = it.estimatedSellingPrice > 0 ? Math.round((unitMargin / it.estimatedSellingPrice) * 100) : 0;

                      return (
                        <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <strong style={{ color: '#0F172A', display: 'block' }}>{it.name}</strong>
                            <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                              {it.variant || 'Standard'} {it.reference ? `• Réf: ${it.reference}` : ''}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{it.quantityReceived} pcs</td>
                          <td style={{ padding: '12px 10px', color: '#059669', fontWeight: 700 }}>{it.quantitySold} pcs</td>
                          <td style={{ padding: '12px 10px', color: it.quantityDefective > 0 ? '#DC2626' : '#64748B' }}>
                            {it.quantityDefective} pcs
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <strong style={{ color: it.quantityRemaining > 0 ? '#0F172A' : '#DC2626' }}>
                              {it.quantityRemaining} pcs
                            </strong>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: '#475569' }}>
                            {fmt(it.unitCost)}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: '#0F172A' }}>
                            {fmt(it.estimatedSellingPrice)}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: unitMargin >= 0 ? '#16A34A' : '#DC2626' }}>
                            +{fmt(unitMargin)} ({marginRate}%)
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                              onClick={() => {
                                setSaleLotItemId(it.id);
                                setSaleUnitPrice(it.estimatedSellingPrice);
                                setShowSaleModal(true);
                              }}
                              disabled={it.quantityRemaining <= 0 || campaignDetail.campaign.status === 'closed'}
                            >
                              Vendre
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: STOCK & MOUVEMENTS */}
          {detailTab === 'stock' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Journal des Mouvements de Stock du Lot
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.84rem', margin: '2px 0 0 0' }}>
                    Traçabilité complète des sorties de stock par vente, avaries déclarées et retours.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowStockLossModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626' }}
                >
                  <AlertTriangle size={16} />
                  <span>Déclarer une Avarie / Perte</span>
                </button>
              </div>

              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 10px' }}>Article Concerné</th>
                      <th style={{ padding: '12px 10px' }}>Type de Mouvement</th>
                      <th style={{ padding: '12px 10px' }}>Quantité</th>
                      <th style={{ padding: '12px 16px' }}>Motif / Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!campaignDetail.campaign.movements || campaignDetail.campaign.movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                          Aucun mouvement enregistré pour le moment.
                        </td>
                      </tr>
                    ) : (
                      campaignDetail.campaign.movements.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 16px', color: '#64748B' }}>{m.createdAt.slice(0, 16).replace('T', ' ')}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{m.lotItem?.name || 'Article'}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                background: m.type === 'sale' ? '#DCFCE7' : m.type === 'defective' ? '#FEE2E2' : '#EFF6FF',
                                color: m.type === 'sale' ? '#15803D' : m.type === 'defective' ? '#DC2626' : '#0062FF',
                              }}
                            >
                              {m.type === 'sale' ? 'Vente Sortie' : m.type === 'defective' ? 'Perte / Avarie' : 'Ajustement'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: m.quantity < 0 ? '#DC2626' : '#16A34A' }}>
                            {m.quantity} pcs
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>{m.reason || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: VENTES DU LOT */}
          {detailTab === 'sales' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Ventes Réalisées sur ce Lot
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.84rem', margin: '2px 0 0 0' }}>
                    Commandes physiques et en ligne (WhatsApp, Facebook, Comptoir) rattachées à la campagne.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSaleModal(true)}
                  disabled={campaignDetail.campaign.status === 'closed'}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10B981' }}
                >
                  <Plus size={16} />
                  <span>Enregistrer une Vente</span>
                </button>
              </div>

              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 10px' }}>Canal de Vente</th>
                      <th style={{ padding: '12px 10px' }}>Client</th>
                      <th style={{ padding: '12px 10px' }}>Articles Vendus</th>
                      <th style={{ padding: '12px 10px' }}>Montant Encaissé</th>
                      <th style={{ padding: '12px 10px' }}>Coût Revient (COGS)</th>
                      <th style={{ padding: '12px 10px' }}>Charges Variables</th>
                      <th style={{ padding: '12px 16px' }}>Bénéfice Net Vente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!campaignDetail.campaign.sales || campaignDetail.campaign.sales.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                          Aucune vente enregistrée sur ce lot pour le moment.
                        </td>
                      </tr>
                    ) : (
                      campaignDetail.campaign.sales.map(sale => {
                        const saleCogs = sale.items.reduce((s, it) => s + (it.totalCost || 0), 0);
                        const netProfit = (sale.netAmount || sale.totalAmount) - saleCogs - (sale.variableCosts || 0);

                        return (
                          <tr key={sale.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 16px', color: '#64748B' }}>
                              {sale.saleDate.slice(0, 16).replace('T', ' ')}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, background: '#EFF6FF', color: '#0062FF', padding: '2px 8px', borderRadius: '10px' }}>
                                {sale.channel.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <strong style={{ color: '#0F172A', display: 'block' }}>{sale.customerName || 'Client Comptoir'}</strong>
                              {sale.customerPhone && <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{sale.customerPhone}</span>}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              {sale.items.map((it, idx) => (
                                <div key={idx} style={{ fontSize: '0.78rem' }}>
                                  {it.quantity}x {it.lotItem?.name || 'Article'}
                                </div>
                              ))}
                            </td>
                            <td style={{ padding: '12px 10px', fontWeight: 700, color: '#0F172A' }}>
                              {fmt(sale.netAmount || sale.totalAmount)}
                            </td>
                            <td style={{ padding: '12px 10px', color: '#64748B' }}>
                              {fmt(saleCogs)}
                            </td>
                            <td style={{ padding: '12px 10px', color: '#E11D48' }}>
                              {fmt(sale.variableCosts)}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: netProfit >= 0 ? '#16A34A' : '#DC2626' }}>
                              {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: DÉPENSES DU LOT */}
          {detailTab === 'expenses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Dépenses Additionnelles Imputées au Lot
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.84rem', margin: '2px 0 0 0' }}>
                    Frais de blanchisserie/pressing, réparation, publicité spécifique, étiquetage.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowExpenseModal(true)}
                  disabled={campaignDetail.campaign.status === 'closed'}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Ajouter une Dépense</span>
                </button>
              </div>

              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 10px' }}>Catégorie</th>
                      <th style={{ padding: '12px 10px' }}>Description</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!campaignDetail.campaign.expenses || campaignDetail.campaign.expenses.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                          Aucune dépense additionnelle enregistrée sur ce lot.
                        </td>
                      </tr>
                    ) : (
                      campaignDetail.campaign.expenses.map(exp => (
                        <tr key={exp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 16px', color: '#64748B' }}>{exp.expenseDate.slice(0, 10)}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 600, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '10px' }}>
                              {exp.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', color: '#1E293B' }}>{exp.description || '—'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                            -{fmt(exp.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: RENTABILITÉ FINANCIÈRE DE LA CAMPAGNE */}
          {detailTab === 'profitability' && (
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0F172A' }}>
                Compte de Résultat Simplifié du Lot Commercial
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '650px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>(+) Chiffre d'Affaires Net Encaissé :</span>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.05rem' }}>{fmt(campaignDetail.financials.totalRevenue)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>(-) Coût des Marchandises Vendues (COGS) :</span>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>-{fmt(campaignDetail.financials.totalCogs)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>(-) Charges Variables de Vente (Livraisons / Commissions) :</span>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>-{fmt(campaignDetail.financials.totalVariableCosts)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>(-) Dépenses Opérationnelles Additionnelles (Pressing / Réparation) :</span>
                  <span style={{ fontWeight: 700, color: '#DC2626' }}>-{fmt(campaignDetail.financials.totalAdditionalExpenses)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', background: campaignDetail.financials.realizedProfit >= 0 ? '#DCFCE7' : '#FEE2E2', borderRadius: '10px', marginTop: '6px' }}>
                  <span style={{ fontWeight: 800, color: campaignDetail.financials.realizedProfit >= 0 ? '#15803D' : '#DC2626', fontSize: '1.05rem' }}>
                    (=) Bénéfice Net Réalisé (Déjà Encaissé) :
                  </span>
                  <span style={{ fontWeight: 900, color: campaignDetail.financials.realizedProfit >= 0 ? '#15803D' : '#DC2626', fontSize: '1.25rem' }}>
                    {campaignDetail.financials.realizedProfit >= 0 ? '+' : ''}{fmt(campaignDetail.financials.realizedProfit)}
                  </span>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '18px 20px', borderRadius: '12px', border: '1px solid #CBD5E1', maxWidth: '650px' }}>
                <strong style={{ fontSize: '0.92rem', color: '#0F172A', display: 'block', marginBottom: '8px' }}>
                  Valeur et Potentiel du Stock Non Vendu ({campaignDetail.financials.totalQuantityRemaining} articles restants) :
                </strong>
                <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                  Conformément aux règles comptables strictes de COMMERCIA, la valeur du stock restant n'est pas qualifiée de bénéfice réalisé tant que les articles ne sont pas effectivement vendus et payés.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '4px' }}>
                  <span>Valeur au coût de revient :</span>
                  <strong>{fmt(campaignDetail.financials.remainingStockCostValue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '4px' }}>
                  <span>Valeur de vente cible estimée :</span>
                  <strong style={{ color: '#0062FF' }}>{fmt(campaignDetail.financials.remainingStockMarketValue)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', fontWeight: 800, color: '#8B5CF6' }}>
                  <span>Bénéfice potentiel futur :</span>
                  <span>+{fmt(campaignDetail.financials.potentialFutureProfit)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: HISTORIQUE & RAPPORTS */}
          {detailTab === 'reports' && (
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0F172A' }}>
                Rapports & Clôture de la Campagne
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '20px' }}>
                Imprimez le rapport officiel d'audit de cette campagne ou exportez ses données en format CSV pour vos bilans financiers.
              </p>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
                >
                  <Printer size={18} />
                  <span>Imprimer le Bilan Financier du Lot (PDF)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4-STEP WIZARD MODAL FOR NEW CAMPAIGN CREATION (SECTION 4 DU CAHIER DES CHARGES) */}
      {/* ========================================================================= */}
      {showWizardModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  Nouvelle Campagne de Gestion de Lot — Étape {wizardStep} sur 4
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {wizardStep === 1 && 'Informations Générales & Origine du Lot'}
                  {wizardStep === 2 && 'Coûts d\'Approvisionnement & Frais d\'Approche'}
                  {wizardStep === 3 && 'Inventaire & Décomposition en Articles Individuels'}
                  {wizardStep === 4 && 'Récapitulatif Financier & Validation'}
                </span>
              </div>
              <button
                onClick={() => setShowWizardModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}
              >
                ✕
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '12px 24px', background: '#F8FAFC' }}>
              {[
                { step: 1, label: '1. Généralités' },
                { step: 2, label: '2. Coûts Approvisionnement' },
                { step: 3, label: '3. Articles & Coûts Unitaires' },
                { step: 4, label: '4. Validation' },
              ].map(s => (
                <div
                  key={s.step}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: wizardStep === s.step ? 800 : 500,
                    color: wizardStep === s.step ? '#0062FF' : wizardStep > s.step ? '#10B981' : '#64748B',
                    borderBottom: wizardStep === s.step ? '2px solid #0062FF' : 'none',
                    paddingBottom: '4px',
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '24px' }}>
              {/* STEP 1 : INFORMATIONS GÉNÉRALES */}
              {wizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Nom de la Campagne * (ex: Balle Friperie Robes Dubaï, Lot 25 iPhone 13 Pro, Palette Chaussures Italie)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Balle Friperie Robes Dubaï"
                      value={wName}
                      onChange={e => setWName(e.target.value)}
                      style={{ width: '100%', padding: '10px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Type de marchandises * (libre ou personnalisé)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Vêtements, Téléphones, Chaussures, Cosmétiques..."
                        value={wGoodsType}
                        onChange={e => setWGoodsType(e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Fournisseur / Négociant
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Grossiste Dubaï, Fournisseur Alibaba, Importateur Cotonou"
                        value={wSupplier}
                        onChange={e => setWSupplier(e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Pays d'origine ou Lieu d'achat
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Dubaï, Chine, Turquie, France, Nigeria..."
                        value={wOrigin}
                        onChange={e => setWOrigin(e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Date d'achat du lot
                      </label>
                      <input
                        type="date"
                        value={wDate}
                        onChange={e => setWDate(e.target.value)}
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Devise d'achat
                      </label>
                      <select
                        value={wCurrency}
                        onChange={e => {
                          setWCurrency(e.target.value);
                          if (e.target.value === 'XAF') setWExchangeRate(1.0);
                          else if (e.target.value === 'USD') setWExchangeRate(615);
                          else if (e.target.value === 'EUR') setWExchangeRate(655.957);
                          else if (e.target.value === 'CNY') setWExchangeRate(85);
                        }}
                        style={{ width: '100%', padding: '10px' }}
                      >
                        <option value="XAF">FCFA (XAF / XOF)</option>
                        <option value="USD">Dollar US ($ USD)</option>
                        <option value="EUR">Euro (€ EUR)</option>
                        <option value="CNY">Yuan Chinois (¥ CNY)</option>
                        <option value="AUTRE">Autre devise</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Taux de change (en FCFA)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={wExchangeRate}
                        onChange={e => setWExchangeRate(parseFloat(e.target.value) || 1)}
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Montant Achat ({wCurrency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wPurchasePrice}
                        onChange={e => setWPurchasePrice(parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Notes & Observations
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Spécifications particulières, numéro de connaissement, contact transporteur..."
                      value={wNotes}
                      onChange={e => setWNotes(e.target.value)}
                      style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2 : COÛTS D'APPROVISIONNEMENT */}
              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#EFF6FF', padding: '14px 18px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '0.82rem', color: '#1D4ED8', fontWeight: 700 }}>PRIX D'ACHAT DU LOT CONVERTI :</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1D4ED8' }}>
                      {fmt(wizardPurchaseXaf)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Fret & Transport (FCFA)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wTransport}
                        onChange={e => setWTransport(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        style={{ width: '100%', padding: '10px' }}
                      />
                      <span style={{ fontSize: '0.74rem', color: '#64748B' }}>Frais maritime, aérien ou livraison port</span>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Douane & Frais d'importation (FCFA)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wCustoms}
                        onChange={e => setWCustoms(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        style={{ width: '100%', padding: '10px' }}
                      />
                      <span style={{ fontSize: '0.74rem', color: '#64748B' }}>Dédouanement et taxes de transit</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Frais Transaction / Transfert
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wFees}
                        onChange={e => setWFees(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Emballage & Conditionnement
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wPackaging}
                        onChange={e => setWPackaging(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Autres frais annexes
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wOtherCosts}
                        onChange={e => setWOtherCosts(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        style={{ width: '100%', padding: '10px' }}
                      />
                    </div>
                  </div>

                  <div style={{ background: '#F0FDF4', padding: '18px', borderRadius: '12px', border: '1.5px solid #86EFAC', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                          COÛT TOTAL D'APPROVISIONNEMENT DU LOT (LANDED COST) :
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803D' }}>
                          {fmt(wizardTotalLandedCost)}
                        </div>
                      </div>
                      <ShieldCheck size={32} color="#16A34A" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 : INVENTAIRE DU LOT & RÉPARTITION */}
              {wizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                      Méthode de Répartition des Coûts d'Approvisionnement :
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {[
                        { key: 'value_weighted', label: 'Pondérée par le prix cible (Recommandé)', desc: 'Chaque article supporte un coût proportionnel à sa valeur marchande' },
                        { key: 'unit', label: 'Égalitaire par unité', desc: 'Même coût moyen par pièce pour tous les articles' },
                        { key: 'custom', label: 'Manuelle / Forfaitaire', desc: 'Vous spécifiez le coût unitaire de chaque article' },
                      ].map(m => (
                        <div
                          key={m.key}
                          onClick={() => setWAllocationMethod(m.key as any)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: wAllocationMethod === m.key ? '2px solid #0062FF' : '1px solid #CBD5E1',
                            background: wAllocationMethod === m.key ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <strong style={{ fontSize: '0.82rem', color: wAllocationMethod === m.key ? '#0062FF' : '#1E293B', display: 'block' }}>
                            {m.label}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{m.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1E293B' }}>
                      Articles décomposés ({wizardTotalUnits} pièces au total) :
                    </div>
                    <button
                      type="button"
                      onClick={addWizardItemLine}
                      style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={15} /> Ajouter un article
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {computedWizardItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '3fr 2fr 1fr 2fr 2fr auto',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '10px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Désignation (ex: Robe Longue)"
                          value={item.name}
                          onChange={e => updateWizardItemLine(idx, 'name', e.target.value)}
                          style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                          required
                        />

                        <input
                          type="text"
                          placeholder="Variante (ex: 1er Choix)"
                          value={item.variant}
                          onChange={e => updateWizardItemLine(idx, 'variant', e.target.value)}
                          style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                        />

                        <input
                          type="number"
                          min="1"
                          placeholder="Qté"
                          value={item.quantityReceived}
                          onChange={e => updateWizardItemLine(idx, 'quantityReceived', parseInt(e.target.value) || 1)}
                          style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                          required
                        />

                        <input
                          type="number"
                          min="0"
                          placeholder="Prix Vente Cible"
                          value={item.estimatedSellingPrice}
                          onChange={e => updateWizardItemLine(idx, 'estimatedSellingPrice', parseFloat(e.target.value) || 0)}
                          style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                          required
                        />

                        <div style={{ fontSize: '0.78rem', textAlign: 'right' }}>
                          <span style={{ color: '#64748B', display: 'block' }}>Coût Revient :</span>
                          <strong style={{ color: '#0062FF' }}>{fmt(item.unitCost)} / pc</strong>
                          <span style={{ fontSize: '0.7rem', color: item.unitMargin >= 0 ? '#16A34A' : '#DC2626', display: 'block' }}>
                            Marge: +{fmt(item.unitMargin)} ({item.marginRate}%)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeWizardItemLine(idx)}
                          style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4 : VALIDATION & RÉCAPITULATIF */}
              {wizardStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#EFF6FF', padding: '20px', borderRadius: '14px', border: '1.5px solid #BFDBFE' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#1D4ED8' }}>
                      Synthèse Prévisionnelle du Lot : {wName}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.76rem', color: '#64748B', display: 'block' }}>Total Marchandises</span>
                        <strong style={{ fontSize: '1rem', color: '#0F172A' }}>{wizardTotalUnits} articles</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.76rem', color: '#64748B', display: 'block' }}>Investissement Initial</span>
                        <strong style={{ fontSize: '1rem', color: '#7C3AED' }}>{fmt(wizardTotalLandedCost)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.76rem', color: '#64748B', display: 'block' }}>Chiffre d'Affaires Cible</span>
                        <strong style={{ fontSize: '1rem', color: '#059669' }}>{fmt(wizardTotalEstimatedSalesValue)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.76rem', color: '#64748B', display: 'block' }}>Bénéfice Net Cible</span>
                        <strong style={{ fontSize: '1rem', color: '#16A34A' }}>
                          +{fmt(wizardTotalEstimatedSalesValue - wizardTotalLandedCost)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                      Articles Prêts à être Déstockés :
                    </div>
                    {computedWizardItems.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0', borderBottom: '1px dashed #E2E8F0' }}>
                        <span>{it.quantityReceived}x {it.name} ({it.variant})</span>
                        <span>Coût: {fmt(it.unitCost)} • Vente: {fmt(it.estimatedSellingPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Footer */}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setWizardStep((wizardStep - 1) as any)}
                  >
                    Précédent
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setWizardStep((wizardStep + 1) as any)}
                  >
                    Suivant ({wizardStep + 1}/4)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleCreateCampaignSubmit('draft')}
                      disabled={loading}
                    >
                      Enregistrer en Brouillon
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleCreateCampaignSubmit('active')}
                      disabled={loading}
                      style={{ background: '#10B981' }}
                    >
                      {loading ? 'Création en cours...' : 'Valider et Lancer la Campagne'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOUVELLE VENTE SUR LE LOT */}
      {showSaleModal && campaignDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Enregistrer une Vente — {campaignDetail.campaign.name}
              </h3>
              <button
                onClick={() => setShowSaleModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordSaleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Article du lot vendu *
                  </label>
                  <select
                    value={saleLotItemId}
                    onChange={e => {
                      setSaleLotItemId(e.target.value);
                      const chosen = campaignDetail.campaign.items?.find(i => i.id === e.target.value);
                      if (chosen) setSaleUnitPrice(chosen.estimatedSellingPrice);
                    }}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  >
                    <option value="">-- Choisir un article --</option>
                    {campaignDetail.campaign.items?.map(it => (
                      <option key={it.id} value={it.id} disabled={it.quantityRemaining <= 0}>
                        {it.name} ({it.variant}) — {it.quantityRemaining} en stock (Coût: {fmt(it.unitCost)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Quantité vendue *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={saleQuantity}
                      onChange={e => setSaleQuantity(parseInt(e.target.value) || 1)}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Prix unitaire réel (FCFA) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={saleUnitPrice}
                      onChange={e => setSaleUnitPrice(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '8px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Canal de vente *
                    </label>
                    <select
                      value={saleChannel}
                      onChange={e => setSaleChannel(e.target.value as any)}
                      style={{ width: '100%', padding: '8px' }}
                    >
                      <option value="comptoir">Passage Comptoir</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="site_web">Site Web</option>
                      <option value="autre">Autre canal</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Charges variables (livraison vendeur...)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={saleVariableCosts}
                      onChange={e => setSaleVariableCosts(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Nom du client (facultatif)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Diane WhatsApp"
                      value={saleCustomerName}
                      onChange={e => setSaleCustomerName(e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Téléphone / Contact
                    </label>
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={saleCustomerPhone}
                      onChange={e => setSaleCustomerPhone(e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#64748B' }}>Total à encaisser :</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0062FF' }}>
                    {fmt((saleQuantity * saleUnitPrice) - (saleDiscount || 0))}
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSaleModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10B981' }}>
                  Valider la Vente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER UNE DÉPENSE SUR LE LOT */}
      {showExpenseModal && campaignDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Imputer une Dépense au Lot
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordExpenseSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Montant de la dépense (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmount}
                    onChange={e => setExpAmount(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Catégorie de la dépense
                  </label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="blanchisserie">Blanchisserie / Pressing / Nettoyage</option>
                    <option value="reparation">Réparation / Remise en état</option>
                    <option value="publicite">Publicité dédiée à ce lot</option>
                    <option value="transport">Transport / Navette</option>
                    <option value="emballage">Emballage spécifique</option>
                    <option value="autre">Autre dépense</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Description & Justificatif
                  </label>
                  <textarea
                    rows={2}
                    value={expDescription}
                    onChange={e => setExpDescription(e.target.value)}
                    placeholder="Ex: Pressing de 40 robes chez Lavoir Express"
                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Imputer la Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DÉCLARER UNE PERTE / AVARIE */}
      {showStockLossModal && campaignDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#DC2626' }}>
                Déclarer un Article Défectueux / Perte
              </h3>
              <button
                onClick={() => setShowStockLossModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordStockLossSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Article concerné *
                  </label>
                  <select
                    value={lossItemId}
                    onChange={e => setLossItemId(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  >
                    <option value="">-- Choisir un article --</option>
                    {campaignDetail.campaign.items?.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.variant}) — {it.quantityRemaining} restants
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Quantité avariée / invendable *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lossQuantity}
                    onChange={e => setLossQuantity(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Motif de la perte
                  </label>
                  <input
                    type="text"
                    value={lossReason}
                    onChange={e => setLossReason(e.target.value)}
                    placeholder="Ex: Tissu déchiré, écran brisé, produit périmé..."
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStockLossModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#DC2626' }}>
                  Enregistrer la Perte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER NOUVEL ARTICLE AU LOT EXISTANT */}
      {showAddItemModal && campaignDetail && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Ajouter une Référence au Lot
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddItemSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Désignation de l'article *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Robes Courtes Soie"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Variante (grade/taille)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 1er Choix"
                      value={newItemVariant}
                      onChange={e => setNewItemVariant(e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Quantité reçue *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newItemQty}
                      onChange={e => setNewItemQty(parseInt(e.target.value) || 1)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Prix de vente cible (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newItemPrice}
                      onChange={e => setNewItemPrice(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Coût de revient unitaire (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newItemCost}
                      onChange={e => setNewItemCost(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddItemModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Ajouter au Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
