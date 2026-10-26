import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingBag, Globe, Truck, Store, Users, Package, MessageCircle, Target, Crown } from 'lucide-react';
import { api } from '../../services/api';
import { Product, Customer, Sale } from '../../types';
import { ReceiptModal } from './ReceiptModal';
import { growthService } from '../../services/growthService';
import { AcquisitionChannel } from '../../types/growth';
import { useAuthStore } from '../../store/authStore';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated: () => void;
}

type CustomerQuality = 'comptoir' | 'en_ligne' | 'livraison' | 'fidele' | 'grossiste';

export const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, onSaleCreated }) => {
  const { user } = useAuthStore();
  const isPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && user?.subscription?.status === 'active'));

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [channels, setChannels] = useState<AcquisitionChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [saleVariableCosts, setSaleVariableCosts] = useState<number | ''>('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank_transfer' | 'credit'>('cash');
  const [customerId, setCustomerId] = useState('');
  const [todaySalesCount, setTodaySalesCount] = useState<number>(0);
  
  // Customer Quality states
  const [customerQuality, setCustomerQuality] = useState<CustomerQuality>('comptoir');
  const [onlinePlatform, setOnlinePlatform] = useState<'whatsapp' | 'facebook' | 'tiktok' | 'instagram' | 'autre'>('whatsapp');
  const [onlineCustomerName, setOnlineCustomerName] = useState('');
  const [onlineCustomerPhone, setOnlineCustomerPhone] = useState('');
  const [deliveryCustomerName, setDeliveryCustomerName] = useState('');
  const [deliveryCustomerPhone, setDeliveryCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [b2bName, setB2bName] = useState('');
  const [b2bPhone, setB2bPhone] = useState('');
  const [saveToCrm, setSaveToCrm] = useState(false);

  const [items, setItems] = useState<Array<{ name: string; quantity: number; unitPrice: number; productId?: string }>>([
    { name: '', quantity: 1, unitPrice: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');

  const resetForm = () => {
    setItems([{ name: '', quantity: 1, unitPrice: 0 }]);
    setSelectedProductId('');
    setCustomerId('');
    setSelectedChannelId('');
    setSaleVariableCosts('');
    setCustomerQuality('comptoir');
    setOnlinePlatform('whatsapp');
    setOnlineCustomerName('');
    setOnlineCustomerPhone('');
    setDeliveryCustomerName('');
    setDeliveryCustomerPhone('');
    setDeliveryAddress('');
    setB2bName('');
    setB2bPhone('');
    setSaveToCrm(false);
    setPaymentMethod('cash');
    setReceivedAmount('');
    setError('');
    setSuccessMsg('');
    setCompletedSale(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      api.get<Product[]>('/products').then(setProducts).catch(() => {});
      api.get<Customer[]>('/customers').then(setCustomers).catch(() => {});
      growthService.getChannels().then(chans => {
        setChannels(chans);
      }).catch(() => {});
      // Track today's sales count for free quota gauge
      api.get<any>('/sales?limit=30').then(res => {
        const list = Array.isArray(res) ? res : res?.sales || [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const count = list.filter((s: any) => s.saleDate?.slice(0, 10) === todayStr).length;
        setTodaySalesCount(count);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (completedSale) {
    return (
      <ReceiptModal
        isOpen={true}
        sale={completedSale}
        onClose={handleClose}
        onNewSale={resetForm}
      />
    );
  }

  const handleProductSelect = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    // Check if product is already in items
    const existingIndex = items.findIndex(i => i.productId === prod.id);
    if (existingIndex > -1) {
      const nextItems = [...items];
      nextItems[existingIndex].quantity += 1;
      setItems(nextItems);
    } else {
      if (items.length === 1 && items[0].name === '' && items[0].unitPrice === 0) {
        setItems([{ name: prod.name, quantity: 1, unitPrice: prod.sellingPrice, productId: prod.id }]);
      } else {
        setItems([...items, { name: prod.name, quantity: 1, unitPrice: prod.sellingPrice, productId: prod.id }]);
      }
    }
    setSelectedProductId('');
  };

  const updateItem = (index: number, field: string, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ name: '', quantity: 1, unitPrice: 0 }]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: 1, unitPrice: 0 }]);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validItems = items.filter(i => i.name.trim() !== '' && i.unitPrice > 0);
    if (validItems.length === 0) {
      setError('Veuillez ajouter au moins un article avec un prix.');
      return;
    }

    // Determine customer info & notes based on selected quality
    let saleNotes = '';
    let customerNameToUse = '';
    let customerPhoneToUse = '';

    if (customerQuality === 'en_ligne') {
      customerNameToUse = onlineCustomerName.trim() || 'Client en ligne';
      customerPhoneToUse = onlineCustomerPhone.trim();
      const platformLabels: Record<string, string> = {
        whatsapp: 'WhatsApp',
        facebook: 'Facebook',
        tiktok: 'TikTok',
        instagram: 'Instagram',
        autre: 'Web',
      };
      const pLabel = platformLabels[onlinePlatform] || 'En Ligne';
      saleNotes = `🌐 En Ligne (${pLabel})${customerNameToUse ? ` • ${customerNameToUse}` : ''}${customerPhoneToUse ? ` • Tel: ${customerPhoneToUse}` : ''}`;
    } else if (customerQuality === 'livraison') {
      customerNameToUse = deliveryCustomerName.trim() || 'Client Livraison';
      customerPhoneToUse = deliveryCustomerPhone.trim();
      saleNotes = `🚚 Livraison${customerNameToUse ? ` • ${customerNameToUse}` : ''}${deliveryAddress.trim() ? ` • Dest: ${deliveryAddress.trim()}` : ''}${customerPhoneToUse ? ` • Tel: ${customerPhoneToUse}` : ''}`;
    } else if (customerQuality === 'grossiste') {
      customerNameToUse = b2bName.trim() || 'Client Grossiste';
      customerPhoneToUse = b2bPhone.trim();
      saleNotes = `📦 Grossiste / Revendeur${customerNameToUse ? ` • ${customerNameToUse}` : ''}${customerPhoneToUse ? ` • Tel: ${customerPhoneToUse}` : ''}`;
    } else if (customerQuality === 'fidele' || customerId) {
      const selected = customers.find(c => c.id === customerId);
      if (selected) {
        customerNameToUse = selected.name;
        customerPhoneToUse = selected.phone || '';
        saleNotes = `⭐ Client Fidèle • ${selected.name}`;
      }
    }

    if (paymentMethod === 'credit' && !customerId && !customerNameToUse) {
      setError('Veuillez renseigner le client pour une vente à crédit.');
      return;
    }

    try {
      setLoading(true);
      const computedTotal = validItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0);
      let effectiveCustomerId = customerId;

      // If user chose to save this new online/delivery client to CRM
      if (!effectiveCustomerId && customerNameToUse && (saveToCrm || paymentMethod === 'credit')) {
        try {
          const createdCust = await api.post<Customer>('/customers', {
            name: customerNameToUse,
            phone: customerPhoneToUse || undefined,
            notes: saleNotes,
          });
          if (createdCust && createdCust.id) {
            effectiveCustomerId = createdCust.id;
          }
        } catch (crmErr) {
          console.warn('Could not save customer in CRM:', crmErr);
        }
      }

      const selectedCustomer = customers.find(c => c.id === effectiveCustomerId) || (
        customerNameToUse ? ({ id: effectiveCustomerId || 'c-temp', name: customerNameToUse, phone: customerPhoneToUse } as any) : undefined
      );

      const res = await api.post<{ message: string; sale?: Sale }>('/sales', {
        items: validItems,
        totalAmount: computedTotal,
        paidAmount: paymentMethod === 'credit' ? 0 : computedTotal,
        paymentMethod,
        customerId: effectiveCustomerId || undefined,
        channelId: selectedChannelId || undefined,
        variableCosts: typeof saleVariableCosts === 'number' ? saleVariableCosts : 0,
        notes: saleNotes || undefined,
      });

      onSaleCreated();

      const created: Sale = res.sale || {
        id: 's-' + Date.now(),
        businessId: 'active',
        totalAmount: computedTotal,
        paidAmount: paymentMethod === 'credit' ? 0 : computedTotal,
        paymentMethod,
        status: 'completed',
        saleDate: new Date().toISOString(),
        customer: selectedCustomer,
        notes: saleNotes,
        items: validItems.map((item, idx) => ({
          id: 'item-' + idx,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      };

      setCompletedSale(created);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de la vente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: '#EFF6FF',
                color: '#0062FF',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Nouvelle Vente</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Enregistrement instantané (Cash, Mobile Money ou Crédit)
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', color: '#94A3B8' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Free Plan Quota Indicator */}
            {!isPro && (
              <div
                style={{
                  background: todaySalesCount >= 15 ? '#FEF2F2' : '#F0F9FF',
                  border: todaySalesCount >= 15 ? '1.5px solid #FCA5A5' : '1px solid #BAE6FD',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{todaySalesCount >= 15 ? '🛑' : '📊'}</span>
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: todaySalesCount >= 15 ? '#DC2626' : '#0369A1', display: 'block' }}>
                      {todaySalesCount >= 15
                        ? 'Quota gratuit atteint (15/15 ventes aujourd\'hui)'
                        : `Quota Plan Gratuit : ${todaySalesCount} / 15 ventes aujourd'hui`}
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {todaySalesCount >= 15
                        ? 'Passez à COMMERCIA PRO pour débloquer les ventes illimitées.'
                        : `Il vous reste ${Math.max(0, 15 - todaySalesCount)} vente(s) gratuite(s) pour cette journée.`}
                    </span>
                  </div>
                </div>
                <div style={{ width: '65px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                  <div
                    style={{
                      width: `${Math.min(100, (todaySalesCount / 15) * 100)}%`,
                      height: '100%',
                      background: todaySalesCount >= 15 ? '#DC2626' : '#0062FF',
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '12px 14px', background: '#DCFCE7', color: '#16A34A', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'pre-line' }}>
                {successMsg}
              </div>
            )}

            {/* Quick product selector from inventory */}
            {products.length > 0 && (
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Sélection rapide depuis le stock :
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => handleProductSelect(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choisir un produit en stock --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} — {p.sellingPrice.toLocaleString('fr-FR')} FCFA ({p.quantity} en stock)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Items list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Articles du panier</label>
                <button
                  type="button"
                  onClick={addItemRow}
                  style={{ background: 'transparent', color: '#059669', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Ajouter une ligne
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Désignation article"
                      value={item.name}
                      onChange={e => updateItem(idx, 'name', e.target.value)}
                      style={{ flex: 3 }}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qté"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      placeholder="Prix unit."
                      min="0"
                      step="50"
                      value={item.unitPrice || ''}
                      onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      style={{ flex: 2 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px', borderRadius: '8px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', margin: 0 }}>
                  Mode de règlement
                </label>
                {!isPro && (
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Crédits réservés au Plan Pro
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'cash', label: '💵 Espèces', isProOnly: false },
                  { id: 'mobile_money', label: '📱 Mobile Money', isProOnly: false },
                  { id: 'credit', label: '⏳ À Crédit (Dette)', isProOnly: true },
                ].map(m => {
                  const isSelected = paymentMethod === m.id;
                  const isLocked = m.isProOnly && !isPro;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          alert('La vente à crédit et le suivi du carnet de dettes sont réservés aux comptes PRO. Veuillez passer à COMMERCIA PRO.');
                          return;
                        }
                        setPaymentMethod(m.id as any);
                      }}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        border: isSelected ? '2px solid #0062FF' : isLocked ? '1px dashed #CBD5E1' : '1px solid #CBD5E1',
                        background: isSelected ? '#EFF6FF' : isLocked ? '#F8FAFC' : '#FFFFFF',
                        color: isSelected ? '#0062FF' : isLocked ? '#94A3B8' : '#475569',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        opacity: isLocked ? 0.75 : 1,
                      }}
                      title={isLocked ? 'Réservé aux comptes PRO' : undefined}
                    >
                      <span>{m.label}</span>
                      {m.isProOnly && (
                        <span
                          style={{
                            background: isPro ? '#0062FF' : '#FF6B00',
                            color: '#FFFFFF',
                            fontSize: '0.60rem',
                            fontWeight: 900,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Cash Change Calculator */}
            {paymentMethod === 'cash' && totalAmount > 0 && (
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', margin: 0 }}>
                    💵 Espèces remises par le client :
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setReceivedAmount(totalAmount)}
                      style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Montant exact
                    </button>
                    {[5000, 10000, 20000].filter(val => val > totalAmount).slice(0, 2).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setReceivedAmount(val)}
                        style={{ fontSize: '0.72rem', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {val.toLocaleString('fr-FR')} F
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder={`Ex: ${totalAmount >= 5000 ? (Math.ceil(totalAmount / 5000) * 5000) : 5000}`}
                    value={receivedAmount === '' ? '' : receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '1rem', fontWeight: 700, color: '#0F172A', background: '#FFFFFF' }}
                  />
                  <div style={{ minWidth: '150px', textAlign: 'right' }}>
                    {typeof receivedAmount === 'number' && receivedAmount >= totalAmount ? (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#15803D', fontWeight: 700, textTransform: 'uppercase' }}>Monnaie à rendre :</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A', fontFamily: 'Space Grotesk, sans-serif' }}>
                          {(receivedAmount - totalAmount).toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                    ) : typeof receivedAmount === 'number' && receivedAmount > 0 && receivedAmount < totalAmount ? (
                      <div style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 700 }}>
                        ⚠️ Reste : {(totalAmount - receivedAmount).toLocaleString('fr-FR')} F
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        Tapez le billet reçu
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Quality & Origin Selection */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Qualité & Type de Client :</span>
                  {paymentMethod === 'credit' && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>* (Obligatoire pour crédit)</span>}
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748B', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '10px' }}>
                  {customerQuality === 'comptoir' && 'Passage direct boutique'}
                  {customerQuality === 'en_ligne' && 'Commandes Réseaux Sociaux & Web'}
                  {customerQuality === 'livraison' && 'Expéditions et Colis'}
                  {customerQuality === 'fidele' && 'Client Répertoire Enregistré'}
                  {customerQuality === 'grossiste' && 'Revendeur / Gros volume'}
                </span>
              </div>

              {/* Quality selector tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {[
                  { id: 'comptoir', label: 'Comptoir', icon: Store },
                  { id: 'en_ligne', label: 'En Ligne', icon: Globe },
                  { id: 'livraison', label: 'Livraison', icon: Truck },
                  { id: 'fidele', label: 'Fidèle', icon: Users },
                  { id: 'grossiste', label: 'Grossiste', icon: Package },
                ].map(q => {
                  const Icon = q.icon;
                  const isActive = customerQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCustomerQuality(q.id as CustomerQuality);
                        if (q.id === 'comptoir') setCustomerId('');
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: isActive ? '1.5px solid #0062FF' : '1px solid #E2E8F0',
                        background: isActive ? '#EFF6FF' : '#FFFFFF',
                        color: isActive ? '#0062FF' : '#475569',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={16} />
                      <span>{q.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 1. Client Comptoir */}
              {customerQuality === 'comptoir' && (
                <div>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Client comptoir libre (Anonyme) --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} {c.totalOwed > 0 ? `— Doit: ${c.totalOwed} FCFA` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2. Client En Ligne (Réseaux sociaux / Web) */}
              {customerQuality === 'en_ligne' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'whatsapp', label: 'WhatsApp', color: '#10B981' },
                      { id: 'facebook', label: 'Facebook', color: '#2563EB' },
                      { id: 'tiktok', label: 'TikTok', color: '#0F172A' },
                      { id: 'instagram', label: 'Instagram', color: '#E11D48' },
                      { id: 'autre', label: 'Autre Web', color: '#64748B' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setOnlinePlatform(p.id as any)}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          border: onlinePlatform === p.id ? `1.5px solid ${p.color}` : '1px solid #CBD5E1',
                          background: onlinePlatform === p.id ? `${p.color}15` : '#FFFFFF',
                          color: onlinePlatform === p.id ? p.color : '#64748B',
                          cursor: 'pointer',
                        }}
                      >
                        ● {p.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <input
                        type="text"
                        placeholder="Nom ou pseudo client (ex: Diane WhatsApp) *"
                        value={onlineCustomerName}
                        onChange={e => setOnlineCustomerName(e.target.value)}
                        style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                        required={paymentMethod === 'credit'}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Téléphone / WhatsApp"
                        value={onlineCustomerPhone}
                        onChange={e => setOnlineCustomerPhone(e.target.value)}
                        style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                      />
                    </div>
                  </div>

                  <label style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveToCrm}
                      onChange={e => setSaveToCrm(e.target.checked)}
                    />
                    <span>Sauvegarder ce client dans mon répertoire de contacts</span>
                  </label>
                </div>
              )}

              {/* 3. Client Livraison */}
              {customerQuality === 'livraison' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nom du destinataire *"
                      value={deliveryCustomerName}
                      onChange={e => setDeliveryCustomerName(e.target.value)}
                      style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                      required={paymentMethod === 'credit'}
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone destinataire *"
                      value={deliveryCustomerPhone}
                      onChange={e => setDeliveryCustomerPhone(e.target.value)}
                      style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Lieu de livraison / Ville / Quartier / Agence de relais"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                    />
                  </div>
                  <label style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveToCrm}
                      onChange={e => setSaveToCrm(e.target.checked)}
                    />
                    <span>Sauvegarder les coordonnées de ce destinataire</span>
                  </label>
                </div>
              )}

              {/* 4. Client Fidèle / Répertoire */}
              {customerQuality === 'fidele' && (
                <div>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    required={paymentMethod === 'credit'}
                  >
                    <option value="">-- Choisir un client du carnet --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} {c.totalOwed > 0 ? `— Crédit en cours: ${c.totalOwed} FCFA` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 5. Grossiste / Revendeur */}
              {customerQuality === 'grossiste' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nom grossiste / Boutique revendeuse *"
                      value={b2bName}
                      onChange={e => setB2bName(e.target.value)}
                      style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                      required={paymentMethod === 'credit'}
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone / Contact"
                      value={b2bPhone}
                      onChange={e => setB2bPhone(e.target.value)}
                      style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
                    />
                  </div>
                  <label style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveToCrm}
                      onChange={e => setSaveToCrm(e.target.checked)}
                    />
                    <span>Sauvegarder ce grossiste dans mes partenaires</span>
                  </label>
                </div>
              )}
            </div>

            {/* Canal d'acquisition & Charges variables de la commande */}
            <div style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                    <Target size={14} color="#0062FF" />
                    <span>Canal d'acquisition (Source) :</span>
                  </label>
                  <select
                    value={selectedChannelId}
                    onChange={e => setSelectedChannelId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}
                  >
                    <option value="">-- Attribuer à un canal --</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} ({ch.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Charges variables commande (FCFA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 500 (livraison vendeur, emballage)"
                    value={saleVariableCosts === '' ? '' : saleVariableCosts}
                    onChange={e => setSaleVariableCosts(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '8px' }}
                  />
                </div>
              </div>
            </div>

            {/* Total Banner */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600, color: '#64748B' }}>Total à encaisser :</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0062FF', fontFamily: 'Space Grotesk, sans-serif' }}>
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || totalAmount <= 0 || (!isPro && todaySalesCount >= 15)}
              style={(!isPro && todaySalesCount >= 15) ? { background: '#94A3B8', cursor: 'not-allowed', borderColor: '#94A3B8' } : {}}
            >
              {loading
                ? 'Enregistrement...'
                : !isPro && todaySalesCount >= 15
                ? 'Quota Gratuit Atteint (15/15)'
                : `Valider la Vente (+${totalAmount.toLocaleString('fr-FR')} FCFA)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
