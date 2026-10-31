import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  User,
  Calendar,
  Layers,
  Scissors,
  Check,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getBusinessProfile } from '../config/businessProfiles';
import { PageGuideBanner } from '../components/common/PageGuideBanner';

export const ServiceOrdersPage: React.FC = () => {
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'XAF';
  const profile = getBusinessProfile(activeBusiness?.profileId || activeBusiness?.sector);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Formulaire création
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceType, setServiceType] = useState(
    profile.id === 'atelier_couture' ? 'couture' :
    profile.id === 'reparation_telephones_info' ? 'reparation' :
    profile.id === 'garage_mecanique' ? 'garage' :
    profile.id === 'services_agence_digitale' ? 'agence' : 'prestation'
  );
  const [agreedAmount, setAgreedAmount] = useState<number | ''>('');
  const [advancePaid, setAdvancePaid] = useState<number | ''>('');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isQuoteOnly, setIsQuoteOnly] = useState<boolean>(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const res: any = await api.get('/service-orders');
      setOrders(res?.orders || []);
    } catch (err: any) {
      console.error('Erreur chargement commandes:', err);
      setError(err.message || 'Erreur lors du chargement des commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeBusinessId]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/service-orders', {
        title: title.trim(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        serviceType,
        agreedAmount: Number(agreedAmount),
        advancePaid: Number(advancePaid),
        estimatedDeliveryDate: estimatedDate || undefined,
        specsJson: specsText.trim() ? JSON.stringify({ notes: specsText.trim() }) : undefined,
        notes: orderNotes.trim() || undefined,
        isQuoteOnly,
      });

      setShowCreateModal(false);
      setSuccess(isQuoteOnly ? 'Devis enregistré avec succès !' : 'Commande et acompte enregistrés avec succès !');
      // Reset form
      setTitle('');
      setCustomerName('');
      setCustomerPhone('');
      setAgreedAmount('');
      setAdvancePaid('');
      setSpecsText('');
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Erreur création commande.');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPayment) return;
    try {
      await api.post(`/service-orders/${selectedOrderForPayment.id}/payments`, {
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes || undefined,
      });
      setSelectedOrderForPayment(null);
      setSuccess('Paiement enregistré et déduit du solde client !');
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Erreur enregistrement versement.');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/service-orders/${orderId}/status`, { status: newStatus });
      setSuccess(`Statut mis à jour : ${newStatus}`);
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Erreur changement de statut.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch =
      searchTerm === '' ||
      o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalAgreed = orders.reduce((sum, o) => sum + (o.status !== 'annule' ? o.agreedAmount : 0), 0);
  const totalAdvances = orders.reduce((sum, o) => sum + (o.status !== 'annule' ? o.advancePaid : 0), 0);
  const totalBalances = orders.reduce((sum, o) => sum + (o.status !== 'annule' && o.status !== 'livre' ? o.balanceDue : 0), 0);

  return (
    <div className="page-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
            <Wrench size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {profile.id === 'atelier_couture' ? 'Commandes, Modèles & Mesures' :
               profile.id === 'reparation_telephones_info' ? 'Fiches de Réparation & Diagnostics' :
               profile.id === 'garage_mecanique' ? 'Ordres de Réparation & Devis' :
               'Devis, Commandes & Prestations'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              Cycle complet : Devis, acomptes perçus, pièces/matériaux et encaissement du solde final.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: '#8B5CF6',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
          }}
        >
          <Plus size={18} />
          {profile.id === 'atelier_couture' ? 'Nouvelle confection' :
           profile.id === 'reparation_telephones_info' ? 'Nouvelle fiche de dépôt' :
           'Nouvelle commande / Devis'}
        </button>
      </div>

      <PageGuideBanner
        pageId="service_orders"
        title="Commandes, Ateliers & Fiches de Dépôt"
        subtitle="Suivez vos confections sur-mesure, réparations et prestations avec gestion des acomptes et bons de retrait WhatsApp."
        autoDomino={[
          "Chaque acompte versé à la commande crédite instantanément la Caisse Journalière ouverte.",
          "Le solde restant dû est rattaché au compte du client pour éviter les impayés lors du retrait.",
          "Lors de la livraison finale, l'encaissement du solde solde définitivement la commande et alimente le chiffre d'affaires réalisé.",
        ]}
        manualActions={[
          "Enregistrer la commande dès la réception de l'appareil ou du tissu avec description précise des travaux.",
          "Exiger un acompte initial obligatoire (ex: 30% à 50%) pour couvrir les fournitures.",
          "Passer le statut à « Prêt » puis envoyer la notification WhatsApp au client pour qu'il vienne récupérer son article.",
        ]}
        concreteExample="Un client dépose un complet en basin à coudre pour 35 000 F. Il verse 15 000 F d'acompte. Votre caisse prend +15 000 F et le solde dû reste à 20 000 F. Quand l'habit est prêt, vous cliquez sur WhatsApp pour le prévenir, il paie les 20 000 F et retire son colis."
      />

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>COMMANDES ENGAGÉES</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '4px' }}>
            {totalAgreed.toLocaleString('fr-FR')} {currency}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
            {orders.length} dossiers au total
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>ACOMPTES ENCAISSÉS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
            {totalAdvances.toLocaleString('fr-FR')} {currency}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '4px' }}>
            Argent réel en caisse
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>SOLDES À LA LIVRAISON</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EA580C', marginTop: '4px' }}>
            {totalBalances.toLocaleString('fr-FR')} {currency}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
            À percevoir lors du retrait
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'devis', 'confirme', 'en_cours', 'pret', 'livre'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: statusFilter === st ? '#8B5CF6' : '#E2E8F0',
                background: statusFilter === st ? '#F5F3FF' : '#FFFFFF',
                color: statusFilter === st ? '#7C3AED' : '#64748B',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {st === 'all' ? 'Toutes' :
               st === 'devis' ? 'Devis' :
               st === 'confirme' ? 'Confirmées' :
               st === 'en_cours' ? 'En cours' :
               st === 'pret' ? 'Prêt pour retrait' : 'Livrées'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Rechercher dossier, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
          <FileText size={40} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
            Aucune commande trouvée
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '420px', margin: '8px auto 16px auto' }}>
            Créez votre premier devis ou bon de commande avec acompte pour suivre vos travaux d’atelier.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '10px 20px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Nouvelle commande
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {filteredOrders.map((ord) => {
            const isFullyPaid = ord.balanceDue <= 0;
            return (
              <div key={ord.id} style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: ord.status === 'livre' ? '#ECFDF5' : ord.status === 'pret' ? '#FEF3C7' : '#EFF6FF', color: ord.status === 'livre' ? '#047857' : ord.status === 'pret' ? '#B45309' : '#1D4ED8' }}>
                      {ord.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '6px', fontWeight: 700 }}>
                      {ord.orderNumber}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginTop: '6px', marginBottom: '2px' }}>
                      {ord.title}
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                      Client : <strong>{ord.customer?.name || 'Client anonyme'}</strong> {ord.customer?.phone && `(${ord.customer.phone})`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
                      {ord.agreedAmount.toLocaleString('fr-FR')} {currency}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: isFullyPaid ? '#10B981' : '#EA580C', fontWeight: 700 }}>
                      {isFullyPaid ? '✅ Entièrement réglé' : `Reste : ${ord.balanceDue.toLocaleString('fr-FR')} ${currency}`}
                    </div>
                  </div>
                </div>

                {/* Progress / Acomptes */}
                <div style={{ padding: '10px', background: '#F8FAFC', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Acompte perçu : <strong>{ord.advancePaid.toLocaleString('fr-FR')} {currency}</strong></span>
                    {ord.estimatedDeliveryDate && (
                      <span style={{ color: '#0284C7' }}>
                        📅 Prévu : {new Date(ord.estimatedDeliveryDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  {ord.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                      « {ord.notes} »
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                  {ord.balanceDue > 0 && (
                    <button
                      onClick={() => {
                        setSelectedOrderForPayment(ord);
                        setPaymentAmount(ord.balanceDue);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#10B981',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Encaisser solde / acompte
                    </button>
                  )}

                  <select
                    value={ord.status}
                    onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="devis">Devis</option>
                    <option value="confirme">Confirmée</option>
                    <option value="en_cours">En confection/travail</option>
                    <option value="pret">Prêt (en attente retrait)</option>
                    <option value="livre">Livré / Clôturé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Paiement Acompte / Solde */}
      {selectedOrderForPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '420px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Encaisser sur {selectedOrderForPayment.orderNumber}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
              Solde restant dû : <strong>{selectedOrderForPayment.balanceDue.toLocaleString('fr-FR')} {currency}</strong>
            </p>

            <form onSubmit={handleAddPayment}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Montant versé ({currency}) :
                </label>
                <input
                  type="number"
                  min="100"
                  max={selectedOrderForPayment.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '1.1rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  Mode de règlement :
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                >
                  <option value="cash">💵 Espèces (Cash)</option>
                  <option value="mobile_money">📱 Mobile Money</option>
                  <option value="bank_transfer">🏦 Virement bancaire</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPayment(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Valider l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Créer Commande / Devis */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              {isQuoteOnly ? 'Établir un nouveau devis' : 'Enregistrer une commande sur-mesure'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: '16px' }}>
              Enregistrez le client, les spécifications techniques et l'acompte initial.
            </p>

            <form onSubmit={handleCreateOrder}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Intitulé du travail / modèle :
                </label>
                <input
                  type="text"
                  placeholder={profile.id === 'atelier_couture' ? 'ex: Robe de soirée pagne 3 pièces' : profile.id === 'reparation_telephones_info' ? 'ex: Remplacement écran iPhone 13' : 'ex: Prestation sur-mesure'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Nom du client :
                  </label>
                  <input
                    type="text"
                    placeholder="Nom et prénom du client"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Téléphone (WhatsApp) :
                  </label>
                  <input
                    type="text"
                    placeholder="ex: +237 6..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Prix convenu ({currency}) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={agreedAmount}
                    onChange={(e) => setAgreedAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    Acompte initial ({currency}) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={agreedAmount}
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Spécifications (Mesures / Diagnostic / Détails) :
                </label>
                <textarea
                  rows={3}
                  placeholder={profile.id === 'atelier_couture' ? 'Épaules: 42cm, Poitrine: 95cm, Taille: 76cm, Longueur: 140cm...' : 'Panne: écran scintille après chute, code déverrouillage: 1234...'}
                  value={specsText}
                  onChange={(e) => setSpecsText(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                  Date promise de livraison :
                </label>
                <input
                  type="date"
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#8B5CF6', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
