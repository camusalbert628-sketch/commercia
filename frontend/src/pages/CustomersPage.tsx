import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, AlertCircle, CheckCircle, MessageSquare, DollarSign, X } from 'lucide-react';
import { api } from '../services/api';
import { Customer } from '../types';
import { useAuthStore } from '../store/authStore';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyDebtors, setOnlyDebtors] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New Customer form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState('cash');

  const { user } = useAuthStore();
  const businessName = user?.businesses?.[0]?.name || 'notre boutique';

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = onlyDebtors ? '/customers?onlyDebtors=true' : '/customers';
      const data = await api.get<Customer[]>(url);
      setCustomers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [onlyDebtors]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await api.post('/customers', {
        name: newName,
        phone: newPhone || undefined,
        notes: newNotes || undefined,
      });
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
      fetchCustomers();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la création du client.');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !payAmount || payAmount <= 0) return;

    try {
      await api.post(`/customers/${selectedCustomer.id}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
      });
      setShowPaymentModal(false);
      setSelectedCustomer(null);
      setPayAmount('');
      fetchCustomers();
    } catch (e: any) {
      alert(e.message || 'Erreur lors du remboursement.');
    }
  };

  const openWhatsApp = (customer: Customer) => {
    if (!customer.phone) {
      alert('Aucun numéro de téléphone enregistré pour ce client.');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Bonjour ${customer.name}, j'espère que vous allez bien.\nPetit rappel amical de la part de ${businessName} concernant votre solde de ${customer.totalOwed.toLocaleString('fr-FR')} FCFA.\nMerci pour votre confiance et à très bientôt !`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const totalDebts = customers.reduce((sum, c) => sum + c.totalOwed, 0);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Clients & Carnet de Crédit</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            Total des créances à recouvrer : <strong style={{ color: '#EF4444' }}>{totalDebts.toLocaleString('fr-FR')} FCFA</strong>
          </p>
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>+ Nouveau Client</span>
        </button>
      </div>

      {/* Filter Toggle */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setOnlyDebtors(false)}
          className={`btn ${!onlyDebtors ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: '20px', padding: '8px 18px', fontSize: '0.85rem' }}
        >
          Tous les clients ({customers.length})
        </button>
        <button
          onClick={() => setOnlyDebtors(true)}
          className={`btn ${onlyDebtors ? 'btn-primary' : 'btn-outline'}`}
          style={{
            borderRadius: '20px',
            padding: '8px 18px',
            fontSize: '0.85rem',
            background: onlyDebtors ? '#EF4444' : 'transparent',
            borderColor: onlyDebtors ? '#EF4444' : '#E2E8F0',
            color: onlyDebtors ? 'white' : '#475569',
          }}
        >
          <AlertCircle size={15} />
          Clients avec crédit en cours
        </button>
      </div>

      {/* Customers Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
        {customers.map(c => (
          <div key={c.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0' }}>{c.name}</h3>
                {c.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#64748B' }}>
                    <Phone size={13} />
                    <span>{c.phone}</span>
                  </div>
                )}
              </div>

              {c.totalOwed > 0 ? (
                <span
                  style={{
                    background: '#FEE2E2',
                    color: '#DC2626',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  Doit de l'argent
                </span>
              ) : (
                <span
                  style={{
                    background: '#ECFDF5',
                    color: '#059669',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  À jour
                </span>
              )}
            </div>

            {c.notes && (
              <p style={{ fontSize: '0.82rem', color: '#64748B', fontStyle: 'italic', marginBottom: '14px' }}>
                "{c.notes}"
              </p>
            )}

            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '16px',
                marginTop: 'auto',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Cumul des achats</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.totalBought.toLocaleString('fr-FR')} FCFA</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Solde dû</div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    color: c.totalOwed > 0 ? '#EF4444' : '#10B981',
                  }}
                >
                  {c.totalOwed.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {c.totalOwed > 0 && (
                <>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setPayAmount(c.totalOwed);
                      setShowPaymentModal(true);
                    }}
                  >
                    <DollarSign size={15} />
                    <span>Remboursement</span>
                  </button>

                  <button
                    className="btn"
                    style={{ background: '#25D366', color: 'white', padding: '8px 12px' }}
                    title="Relance WhatsApp"
                    onClick={() => openWhatsApp(c)}
                  >
                    <MessageSquare size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {customers.length === 0 && !loading && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
            Aucun client trouvé. Cliquez sur "+ Nouveau Client" pour enregistrer votre carnet.
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Nouveau Client</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Nom complet du client *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maman Chantal, Papa Jean..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Numéro de Téléphone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: +237 677 00 11 22"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Note ou repère
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Voisine d'en face, paie tous les vendredis..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer le client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment / Debt Recovery Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem' }}>Règlement de Crédit</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'transparent', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ color: '#64748B', fontSize: '0.82rem' }}>Client :</div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedCustomer.name}</div>
                  <div style={{ color: '#DC2626', fontWeight: 700, fontSize: '0.92rem', marginTop: '4px' }}>
                    Reste à payer : {selectedCustomer.totalOwed.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Montant remboursé (FCFA) *
                  </label>
                  <input
                    type="number"
                    max={selectedCustomer.totalOwed}
                    min="100"
                    step="50"
                    value={payAmount}
                    onChange={e => setPayAmount(parseFloat(e.target.value) || '')}
                    style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Moyen de règlement
                  </label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option value="cash">💵 Espèces (Cash)</option>
                    <option value="mobile_money">📱 Mobile Money</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Valider le Remboursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
