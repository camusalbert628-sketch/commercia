import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  MapPin,
  User,
  DollarSign,
  Package,
  Calendar,
  Crown,
  ChevronRight,
  Filter,
  FileText,
  Printer,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageGuideBanner } from '../components/common/PageGuideBanner';

export interface DeliveryItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  landmark?: string; // Repère (ex: face station, carrefour...)
  itemsDescription: string;
  amountToCollect: number; // Montant total à encaisser à la livraison (COD)
  deliveryFee: number; // Frais de livraison
  feePaidBy: 'client' | 'merchant'; // Qui paie la livraison
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  courierName?: string; // Nom du livreur / moto-taxi
  courierPhone?: string; // Téléphone du coursier
  scheduledDate: string;
  scheduledTime?: string;
  notes?: string;
  createdAt: string;
}

export const DeliveriesPage: React.FC = () => {
  const { user, activeBusinessId } = useAuthStore();
  const navigate = useNavigate();

  const activeBizId = activeBusinessId || user?.businesses?.[0]?.id || 'default';
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBizId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'XAF';
  const deliveryKey = `commercia_deliveries_${activeBizId}`;

  const isPro = Boolean(user?.isAdmin || user?.subscription?.isPro);

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(() => {
    try {
      const saved = localStorage.getItem(deliveryKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (d: any) =>
              d &&
              !d.id?.startsWith('del-demo-') &&
              !d.customerName?.includes('Fatou Ndiaye')
          );
        }
      }
    } catch (_) {}
    return [];
  });

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [itemsDescription, setItemsDescription] = useState('');
  const [amountToCollect, setAmountToCollect] = useState<number | ''>('');
  const [deliveryFee, setDeliveryFee] = useState<number | ''>('');
  const [feePaidBy, setFeePaidBy] = useState<'client' | 'merchant'>('client');
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  // Synchronize on active business change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(deliveryKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setDeliveries(parsed.filter((d: any) => d && !d.customerName?.includes('Fatou Ndiaye')));
          return;
        }
      }
    } catch (_) {}
    setDeliveries([]);
  }, [deliveryKey]);

  // Save changes locally
  useEffect(() => {
    try {
      localStorage.setItem(deliveryKey, JSON.stringify(deliveries));
    } catch (_) {}
  }, [deliveries, deliveryKey]);

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) return;

    const newDel: DeliveryItem = {
      id: 'del-' + Date.now(),
      orderNumber: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      city: city.trim(),
      address: address.trim(),
      landmark: landmark.trim() || undefined,
      itemsDescription: itemsDescription.trim() || 'Colis marchandise',
      amountToCollect: Number(amountToCollect) || 0,
      deliveryFee: Number(deliveryFee) || 0,
      feePaidBy,
      status: 'pending',
      courierName: courierName.trim() || undefined,
      courierPhone: courierPhone.trim() || undefined,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: scheduledTime.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setDeliveries(prev => [newDel, ...prev]);
    setShowAddModal(false);

    // Reset form
    setCustomerName('');
    setCustomerPhone('');
    setAddress('');
    setLandmark('');
    setItemsDescription('');
    setAmountToCollect('');
    setCourierName('');
    setCourierPhone('');
    setNotes('');
  };

  const updateStatus = async (id: string, newStatus: DeliveryItem['status']) => {
    const targetItem = deliveries.find(d => d.id === id);
    setDeliveries(prev =>
      prev.map(d => (d.id === id ? { ...d, status: newStatus } : d))
    );

    // Si la livraison est marquée comme livrée avec succès et comportait un montant COD à encaisser
    if (newStatus === 'delivered' && targetItem && targetItem.amountToCollect > 0 && targetItem.status !== 'delivered') {
      try {
        await api.post('/cash/movement', {
          type: 'in',
          amount: Number(targetItem.amountToCollect),
          method: 'cash',
          category: 'manual_deposit',
          description: `Encaissement livraison #${targetItem.orderNumber} (${targetItem.customerName})`,
        });
      } catch (e) {
        // La caisse physique peut être fermée ou hors-ligne, ne bloque pas la livraison
        console.info('Caisse fermée lors du règlement de livraison:', e);
      }
    }
  };

  // WhatsApp share generator for courier
  const sendWhatsAppToCourier = (d: DeliveryItem) => {
    const text = `📦 *COMMANDE DE LIVRAISON : ${d.orderNumber}*
👤 *Client :* ${d.customerName}
📞 *Téléphone Client :* ${d.customerPhone}
📍 *Destination :* ${d.city} - ${d.address}
🗺️ *Repère :* ${d.landmark || 'Non précisé'}
🛍️ *Articles :* ${d.itemsDescription}
💵 *Montant à encaisser :* ${d.amountToCollect.toLocaleString('fr-FR')} ${currency} (${d.feePaidBy === 'client' ? `Articles + Frais de livraison inclus ${d.deliveryFee} ${currency}` : 'Frais de livraison déjà payés'})
⏰ *Heure prévue :* ${d.scheduledTime || 'Aujourd hui'}
📝 *Remarque :* ${d.notes || 'Aucune'}

_Transmis via COMMERCIA SaaS Gestion Commerciale_`;

    const targetPhone = (d.courierPhone || '').replace(/\D/g, '');
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filtered = deliveries.filter(d => {
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchSearch =
      search === '' ||
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.customerPhone.includes(search) ||
      d.address.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const countPending = deliveries.filter(d => d.status === 'pending').length;
  const countInTransit = deliveries.filter(d => d.status === 'in_transit').length;
  const countDelivered = deliveries.filter(d => d.status === 'delivered').length;
  const totalCashToCollect = deliveries
    .filter(d => d.status === 'pending' || d.status === 'in_transit')
    .reduce((sum, d) => sum + d.amountToCollect, 0);

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Livraisons & Expéditions E-commerce</h1>
            <span
              style={{
                background: '#FEF3C7',
                color: '#B45309',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Crown size={12} />
              <span>PLAN PRO</span>
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            Pilotez vos coursiers, expéditions à domicile et encaissements à la livraison (Cash On Delivery).
          </p>
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>+ Nouvelle Livraison</span>
        </button>
      </div>

      <PageGuideBanner
        pageId="deliveries"
        title="Livraisons, Coursiers & Paiement à la Livraison (COD)"
        subtitle="Suivez chaque colis expédié, générez l'ordre de mission WhatsApp du coursier et réconciliez les fonds encaissés"
        autoDomino={[
          "Génération en 1 clic du message d'expédition WhatsApp formaté pour le livreur (adresse, repère, montant exact à encaisser).",
          "Calcul automatique du total des fonds 'dans la nature' (Cash On Delivery en attente de retour du coursier).",
          "Dès que vous cochez une livraison comme 'Livrée', les fonds encaissés sont automatiquement versés dans le Journal de Caisse."
        ]}
        manualActions={[
          "Enregistrer la fiche de livraison : Nom du client, quartier, repère visuel (ex: face pharmacie), articles et numéro du livreur.",
          "Transmettre l'ordre de mission au livreur via le bouton vert WhatsApp.",
          "À la fin de sa tournée, récupérer les espèces auprès du coursier et marquer la livraison comme 'Livrée'."
        ]}
        concreteExample="Une cliente d'Instagram commande une robe à 15 000 FCFA + 1 500 FCFA de livraison à Cocody. Vous assignez le coursier Moussa et lui envoyez sa fiche par WhatsApp. Moussa livre la commande, encaisse 16 500 FCFA et vous remet l'argent le soir. Vous cliquez sur 'Marquer Livré' : les 16 500 FCFA entrent automatiquement dans votre caisse journalière !"
        guideSectionId="deliveries"
      />

      {/* KPI METRICS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#EFF6FF', color: '#0062FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>En Cours de Livraison</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0062FF' }}>{countInTransit} colis</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#FEFCE8', color: '#CA8A04', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>À Préparer / En Attente</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#CA8A04' }}>{countPending} colis</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#FFF4ED', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Cash à Encaisser (COD)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FF6B00' }}>
              {totalCashToCollect.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Livrées & Encaissées</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669' }}>{countDelivered} colis</div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Toutes les Livraisons' },
            { id: 'pending', label: `À préparer (${countPending})` },
            { id: 'in_transit', label: `En cours (${countInTransit})` },
            { id: 'delivered', label: `Livrées (${countDelivered})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterStatus === tab.id ? '#0062FF' : '#F1F5F9',
                color: filterStatus === tab.id ? '#FFFFFF' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Rechercher client, n° commande, quartier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
      </div>

      {/* DELIVERIES LIST / TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>N° Commande & Client</th>
                <th>Destination & Repère</th>
                <th>Articles & Colis</th>
                <th>Montant à Encaisser (COD)</th>
                <th>Livreur Assigné</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const isDelivered = d.status === 'delivered';
                const isInTransit = d.status === 'in_transit';

                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{d.orderNumber}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} color="#64748B" />
                        <span>{d.customerName}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#0062FF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} />
                        <a href={`tel:${d.customerPhone}`} style={{ color: '#0062FF', textDecoration: 'none' }}>
                          {d.customerPhone}
                        </a>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <MapPin size={14} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {d.city} — {d.address}
                          </div>
                          {d.landmark && (
                            <div style={{ fontSize: '0.76rem', color: '#64748B', fontStyle: 'italic' }}>
                              Repère : {d.landmark}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#334155', maxWidth: '220px', lineHeight: 1.3 }}>
                        {d.itemsDescription}
                      </div>
                      {d.scheduledTime && (
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '2px' }}>
                          Créneau : {d.scheduledTime}
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: isDelivered ? '#059669' : '#0F172A' }}>
                        {d.amountToCollect.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        Frais : {d.deliveryFee.toLocaleString('fr-FR')} F ({d.feePaidBy === 'client' ? 'Client' : 'Offert'})
                      </div>
                    </td>

                    <td>
                      {d.courierName ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>{d.courierName}</div>
                          {d.courierPhone && (
                            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{d.courierPhone}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic' }}>
                          Non assigné
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          background:
                            d.status === 'delivered'
                              ? '#ECFDF5'
                              : d.status === 'in_transit'
                              ? '#EFF6FF'
                              : d.status === 'cancelled'
                              ? '#FEE2E2'
                              : '#FEFCE8',
                          color:
                            d.status === 'delivered'
                              ? '#059669'
                              : d.status === 'in_transit'
                              ? '#0062FF'
                              : d.status === 'cancelled'
                              ? '#DC2626'
                              : '#CA8A04',
                        }}
                      >
                        {d.status === 'delivered'
                          ? '✅ Livré & Encaissé'
                          : d.status === 'in_transit'
                          ? '🚀 En cours de route'
                          : d.status === 'cancelled'
                          ? '❌ Annulée'
                          : '⏳ En attente'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* WhatsApp dispatch button */}
                        <button
                          type="button"
                          onClick={() => sendWhatsAppToCourier(d)}
                          title="Transmettre la fiche de livraison sur WhatsApp"
                          style={{
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            color: '#16A34A',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </button>

                        {/* Status switcher */}
                        {d.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(d.id, 'in_transit')}
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#0062FF',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            Expédier
                          </button>
                        )}

                        {d.status === 'in_transit' && (
                          <button
                            type="button"
                            onClick={() => updateStatus(d.id, 'delivered')}
                            style={{
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              color: '#059669',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            Encaissé
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    Aucune livraison trouvée. Cliquez sur "+ Nouvelle Livraison".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOUVELLE LIVRAISON */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Nouvelle Fiche de Livraison</h3>
                <span
                  style={{
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Crown size={12} />
                  <span>PRO</span>
                </span>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Client info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Nom du destinataire *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Mme Sandrine"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Téléphone du client *
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: 690 12 34 56"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Location & Landmark */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Ville *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Douala, Yaoundé..."
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Quartier / Adresse *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Akwa, Rue de la Joie"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Repère précis pour le livreur (carrefour, couleur barrière...)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Face pharmacie du Centre, portail vert"
                    value={landmark}
                    onChange={e => setLandmark(e.target.value)}
                  />
                </div>

                {/* Articles & Package details */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Articles du colis *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2x Robes Rouges Taille L, 1x Sandales"
                    value={itemsDescription}
                    onChange={e => setItemsDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Financials: Amount to collect (COD) & Delivery Fee */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0062FF', display: 'block', marginBottom: '4px' }}>
                      Montant à encaisser ({currency})
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={amountToCollect}
                      onChange={e => setAmountToCollect(parseFloat(e.target.value) || '')}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Paiement à la livraison</span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Frais de livraison ({currency})
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(parseFloat(e.target.value) || '')}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="feePaidBy"
                          checked={feePaidBy === 'client'}
                          onChange={() => setFeePaidBy('client')}
                        />
                        <span>Payé par client</span>
                      </label>
                      <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="feePaidBy"
                          checked={feePaidBy === 'merchant'}
                          onChange={() => setFeePaidBy('merchant')}
                        />
                        <span>Offert</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Courier info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Nom du coursier / moto-taxi
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Amadou Moto"
                      value={courierName}
                      onChange={e => setCourierName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Téléphone coursier
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: 671 00 22 33"
                      value={courierPhone}
                      onChange={e => setCourierPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Remarques / Instructions (facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Appeler avant darriver, monnaie sur 50 000 F..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer la livraison
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
