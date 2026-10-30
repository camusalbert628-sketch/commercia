import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Lock,
  Unlock,
  Plus,
  Minus,
  CheckCircle,
  AlertTriangle,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  X,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { CashSession } from '../types';
import { useAuthStore } from '../store/authStore';

export const CashPage: React.FC = () => {
  const [session, setSession] = useState<CashSession | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pastSessions, setPastSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedPastSession, setSelectedPastSession] = useState<CashSession | null>(null);

  // Forms
  const [initialCash, setInitialCash] = useState<number | ''>('');
  const [openNotes, setOpenNotes] = useState('');

  // Move form
  const [moveType, setMoveType] = useState<'in' | 'out'>('out');
  const [moveAmount, setMoveAmount] = useState<number | ''>('');
  const [moveCategory, setMoveCategory] = useState<'manual_withdrawal' | 'manual_deposit' | 'expense'>('manual_withdrawal');
  const [moveDesc, setMoveDesc] = useState('');

  // Close form
  const [actualCash, setActualCash] = useState<number | ''>('');
  const [actualMomo, setActualMomo] = useState<number | ''>('');
  const [closeReason, setCloseReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const { user } = useAuthStore();
  const businessName = user?.businesses?.[0]?.name || 'Mon Activité';

  const fetchCashState = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ isOpen: boolean; session: CashSession | null }>('/cash/current');
      setIsOpen(res.isOpen);
      setSession(res.session);

      const histRes = await api.get<{ sessions: CashSession[] }>('/cash/sessions?limit=10');
      setPastSessions(histRes.sessions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashState();
  }, []);

  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cash/open', {
        initialCash: Number(initialCash) || 0,
        notes: openNotes || undefined,
      });
      setShowOpenModal(false);
      setOpenNotes('');
      fetchCashState();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'ouverture de la caisse.');
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveAmount || moveAmount <= 0 || !moveDesc.trim()) return;

    try {
      await api.post('/cash/movement', {
        type: moveType,
        amount: Number(moveAmount),
        method: 'cash',
        category: moveCategory,
        description: moveDesc,
      });
      setShowMoveModal(false);
      setMoveAmount('');
      setMoveDesc('');
      fetchCashState();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'opération de caisse.');
    }
  };

  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCash === '' || Number(actualCash) < 0) {
      alert('Veuillez saisir le montant physique compté dans le tiroir-caisse.');
      return;
    }

    const theoretical = session?.theoreticalCash || 0;
    const discrepancy = Number(actualCash) - theoretical;

    if (Math.abs(discrepancy) > 100 && !closeReason.trim()) {
      alert('Un écart a été constaté. Vous devez obligatoirement expliquer la raison de cet écart.');
      return;
    }

    try {
      await api.post('/cash/close', {
        actualCash: Number(actualCash),
        actualMomo: actualMomo !== '' ? Number(actualMomo) : undefined,
        discrepancyReason: closeReason || undefined,
        notes: closeNotes || undefined,
      });
      setShowCloseModal(false);
      setActualCash('');
      setActualMomo('');
      setCloseReason('');
      setCloseNotes('');
      fetchCashState();
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la clôture de la caisse.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: '#059669', fontWeight: 700 }}>Chargement de la caisse...</div>
      </div>
    );
  }

  const discrepancyLive = actualCash !== '' && session ? Number(actualCash) - session.theoreticalCash : 0;

  return (
    <div className="page-wrapper">
      {/* Header Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Journal de Caisse</h1>
            <span
              style={{
                background: isOpen ? '#ECFDF5' : '#FEF2F2',
                color: isOpen ? '#059669' : '#DC2626',
                border: `1px solid ${isOpen ? '#A7F3D0' : '#FECACA'}`,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isOpen ? <Unlock size={14} /> : <Lock size={14} />}
              {isOpen ? 'Caisse Ouverte' : 'Caisse Clôturée'}
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            Contrôle physique des espèces, Mobile Money et réconciliation quotidienne
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isOpen ? (
            <button className="btn btn-primary btn-lg" onClick={() => setShowOpenModal(true)}>
              <Unlock size={18} />
              <span>Ouvrir la Caisse du Jour</span>
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setMoveType('in');
                  setMoveCategory('manual_deposit');
                  setShowMoveModal(true);
                }}
              >
                <Plus size={16} />
                <span>+ Entrée de fonds</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setMoveType('out');
                  setMoveCategory('manual_withdrawal');
                  setShowMoveModal(true);
                }}
              >
                <Minus size={16} />
                <span>- Sortie de fonds</span>
              </button>
              <button
                className="btn btn-danger"
                style={{ padding: '8px 16px', fontWeight: 700 }}
                onClick={() => {
                  setActualCash(session?.theoreticalCash || 0);
                  setShowCloseModal(true);
                }}
              >
                <Lock size={16} />
                <span>Clôturer la Caisse</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isOpen && session ? (
        <>
          {/* Active Session Stat Grid */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
            {/* Solde Théorique Espèces */}
            <div className="stat-card" style={{ borderLeft: '4px solid #059669', background: '#F0FDF4' }}>
              <div>
                <div className="stat-label">Espèces à avoir en caisse</div>
                <div className="stat-value" style={{ color: '#059669' }}>
                  {session.theoreticalCash.toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '4px' }}>
                  Fond initial + Ventes cash − Sorties
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#DCFCE7', color: '#059669' }}>
                <Wallet size={24} />
              </div>
            </div>

            {/* Fond initial */}
            <div className="stat-card">
              <div>
                <div className="stat-label">Fond de caisse initial</div>
                <div className="stat-value">
                  {session.initialCash.toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                  Monnaie saisie à l'ouverture
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#F1F5F9', color: '#475569' }}>
                <Clock size={24} />
              </div>
            </div>

            {/* Total Entrées Cash */}
            <div className="stat-card">
              <div>
                <div className="stat-label">Entrées Cash du jour</div>
                <div className="stat-value" style={{ color: '#2563EB' }}>
                  +{session.totalCashIn.toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                  Ventes liquide + Dettes recouvrées
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <ArrowDownLeft size={24} />
              </div>
            </div>

            {/* Total Sorties Cash */}
            <div className="stat-card">
              <div>
                <div className="stat-label">Sorties Cash déclarées</div>
                <div className="stat-value" style={{ color: '#DC2626' }}>
                  -{session.totalCashOut.toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                  Dépenses & Retraits personnels
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                <ArrowUpRight size={24} />
              </div>
            </div>

            {/* Mobile Money In */}
            <div className="stat-card" style={{ borderLeft: '4px solid #D97706' }}>
              <div>
                <div className="stat-label">Mobile Money encaissé</div>
                <div className="stat-value" style={{ color: '#D97706' }}>
                  {(session.totalMomoIn || 0).toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                  Sur compte Orange / MTN MoMo
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <span>📱</span>
              </div>
            </div>
          </div>

          {/* Movements Live Feed Table */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Mouvements de Caisse de la Journée</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
                  Traçabilité en temps réel de chaque franc entré ou sorti du tiroir
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <Printer size={15} />
                <span>Imprimer l'état actuel</span>
              </button>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Heure</th>
                    <th>Type</th>
                    <th>Motif / Transaction</th>
                    <th>Moyen</th>
                    <th style={{ textAlign: 'right' }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {session.movements && session.movements.length > 0 ? (
                    session.movements.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <span
                            style={{
                              background: m.type === 'in' ? '#DCFCE7' : '#FEE2E2',
                              color: m.type === 'in' ? '#166534' : '#991B1B',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            {m.type === 'in' ? '+ ENTRÉE' : '− SORTIE'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.description || m.category}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Catégorie : {m.category}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>
                            {m.method === 'mobile_money' ? '📱 Mobile Money' : '💵 Espèces'}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: m.type === 'in' ? '#059669' : '#DC2626',
                          }}
                        >
                          {m.type === 'in' ? '+' : '−'}
                          {m.amount.toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>
                        Aucun mouvement enregistré pour le moment. Enregistrez des ventes ou dépenses pour voir le flux !
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* When Cash is Closed */
        <div
          className="card"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', margin: '0 0 8px 0' }}>La caisse est actuellement fermée</h2>
          <p style={{ color: '#64748B', maxWidth: '480px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
            Ouvrez la journée en saisissant le fond de caisse initial (la monnaie dans votre tiroir) pour tracer automatiquement les entrées, sorties et écarts du jour.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setShowOpenModal(true)}>
            <Unlock size={20} />
            <span>Ouvrir la Caisse du Jour</span>
          </button>
        </div>
      )}

      {/* Past Closed Sessions History Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <History size={18} color="#059669" />
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Historique des Clôtures de Caisse</h3>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date d'ouverture</th>
                <th>Fond initial</th>
                <th>Espèces Théoriques</th>
                <th>Espèces Comptées</th>
                <th>Écart de Caisse</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {pastSessions.map(s => {
                const disc = s.cashDiscrepancy || 0;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(s.openedAt).toLocaleDateString('fr-FR')}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        {new Date(s.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {s.closedAt && ` ➔ ${new Date(s.closedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </td>
                    <td>{s.initialCash.toLocaleString('fr-FR')} FCFA</td>
                    <td style={{ fontWeight: 600 }}>{s.theoreticalCash.toLocaleString('fr-FR')} FCFA</td>
                    <td style={{ fontWeight: 700 }}>
                      {s.actualCash !== null && s.actualCash !== undefined
                        ? `${s.actualCash.toLocaleString('fr-FR')} FCFA`
                        : 'En cours'}
                    </td>
                    <td>
                      {s.status === 'closed' ? (
                        disc === 0 ? (
                          <span style={{ color: '#059669', fontWeight: 700 }}>0 FCFA (Équilibrée)</span>
                        ) : disc < 0 ? (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>
                            {disc.toLocaleString('fr-FR')} FCFA (Manquant)
                          </span>
                        ) : (
                          <span style={{ color: '#2563EB', fontWeight: 700 }}>
                            +{disc.toLocaleString('fr-FR')} FCFA (Excédent)
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#64748B' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          background: s.status === 'open' ? '#ECFDF5' : '#F1F5F9',
                          color: s.status === 'open' ? '#059669' : '#475569',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {s.status === 'open' ? 'Ouverte' : 'Clôturée'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedPastSession(s)}
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        Voir bilan
                      </button>
                    </td>
                  </tr>
                );
              })}

              {pastSessions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>
                    Aucune session de caisse passée enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1 : OUVRIR LA CAISSE */}
      {showOpenModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#ECFDF5', color: '#059669', padding: '8px', borderRadius: '10px' }}>
                  <Unlock size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Ouverture de Caisse</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    Indiquez le fond de monnaie disponible au démarrage
                  </p>
                </div>
              </div>
              <button onClick={() => setShowOpenModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleOpenCash}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Fond de caisse initial (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={initialCash}
                    onChange={e => setInitialCash(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    style={{ fontSize: '1.2rem', fontWeight: 700, padding: '12px' }}
                    placeholder="Ex: 10000"
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {[0, 5000, 10000, 25000, 50000].map(amt => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setInitialCash(amt)}
                        style={{
                          background: initialCash === amt ? '#059669' : '#F1F5F9',
                          color: initialCash === amt ? '#FFFFFF' : '#475569',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {amt.toLocaleString('fr-FR')} F
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Remarques / Caissier (optionnel)
                  </label>
                  <input
                    type="text"
                    value={openNotes}
                    onChange={e => setOpenNotes(e.target.value)}
                    placeholder="Ex: Prise de poste matin - 08h00"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOpenModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Valider l'ouverture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : MOUVEMENT MANUEL (ENTRÉE / SORTIE) */}
      {showMoveModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: moveType === 'in' ? '#ECFDF5' : '#FEE2E2', color: moveType === 'in' ? '#059669' : '#DC2626', padding: '8px', borderRadius: '10px' }}>
                  {moveType === 'in' ? <Plus size={22} /> : <Minus size={22} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                    {moveType === 'in' ? 'Entrée de Fonds en Caisse' : 'Sortie de Fonds de Caisse'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    Enregistrez tout mouvement physique d'argent hors vente/dépense directe
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMoveModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMovement}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Type de mouvement *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMoveType('in');
                        setMoveCategory('manual_deposit');
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${moveType === 'in' ? '#059669' : '#E2E8F0'}`,
                        background: moveType === 'in' ? '#ECFDF5' : '#FFFFFF',
                        fontWeight: 700,
                        color: moveType === 'in' ? '#065F46' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      + Entrée (Apport/Monnaie)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoveType('out');
                        setMoveCategory('manual_withdrawal');
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${moveType === 'out' ? '#DC2626' : '#E2E8F0'}`,
                        background: moveType === 'out' ? '#FEF2F2' : '#FFFFFF',
                        fontWeight: 700,
                        color: moveType === 'out' ? '#991B1B' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      − Sortie (Prélèvement patron)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={moveAmount}
                    onChange={e => setMoveAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    style={{ fontSize: '1.2rem', fontWeight: 700, padding: '12px' }}
                    placeholder="Ex: 5000"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Motif / Description *
                  </label>
                  <input
                    type="text"
                    value={moveDesc}
                    onChange={e => setMoveDesc(e.target.value)}
                    required
                    placeholder={moveType === 'out' ? 'Ex: Prélèvement ration maison par le patron' : 'Ex: Monnaie d\'appoint apportée'}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMoveModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer l'opération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : CLÔTURE DE CAISSE AVEC COMPTAGE PHYSIQUE & ÉCARTS */}
      {showCloseModal && session && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '8px', borderRadius: '10px' }}>
                  <Lock size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Clôture de Caisse Quotidienne</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    Comptage physique des espèces et réconciliation
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCloseModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCloseCash}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Rappel solde théorique */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748B' }}>Fond initial :</span>
                    <strong>{session.initialCash.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748B' }}>+ Entrées cash (ventes & encaissements) :</span>
                    <strong style={{ color: '#059669' }}>+{session.totalCashIn.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748B' }}>− Sorties cash (charges & retraits) :</span>
                    <strong style={{ color: '#DC2626' }}>-{session.totalCashOut.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #CBD5E1', fontSize: '1rem', fontWeight: 800 }}>
                    <span>Solde Théorique à avoir :</span>
                    <span style={{ color: '#0F172A' }}>{session.theoreticalCash.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>

                {/* Saisie montant compté */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                    Montant réellement compté dans le tiroir (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={actualCash}
                    onChange={e => setActualCash(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    style={{ fontSize: '1.25rem', fontWeight: 800, padding: '12px' }}
                    placeholder="Comptez vos billets et pièces"
                  />
                </div>

                {/* Live Discrepancy Alert */}
                {actualCash !== '' && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: discrepancyLive === 0 ? '#ECFDF5' : discrepancyLive < 0 ? '#FEF2F2' : '#EFF6FF',
                      border: `1px solid ${discrepancyLive === 0 ? '#A7F3D0' : discrepancyLive < 0 ? '#FECACA' : '#BFDBFE'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    {discrepancyLive === 0 ? (
                      <>
                        <CheckCircle size={20} color="#059669" />
                        <div>
                          <strong style={{ color: '#065F46' }}>Caisse parfaitement équilibrée !</strong>
                          <div style={{ fontSize: '0.8rem', color: '#047857' }}>Zéro écart constaté. Vos comptes sont impeccables.</div>
                        </div>
                      </>
                    ) : discrepancyLive < 0 ? (
                      <>
                        <AlertTriangle size={20} color="#DC2626" />
                        <div>
                          <strong style={{ color: '#991B1B' }}>
                            Manquant de caisse : {discrepancyLive.toLocaleString('fr-FR')} FCFA
                          </strong>
                          <div style={{ fontSize: '0.8rem', color: '#B91C1C' }}>
                            Il manque de l'argent physique par rapport aux enregistrements.
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={20} color="#2563EB" />
                        <div>
                          <strong style={{ color: '#1E40AF' }}>
                            Excédent de caisse : +{discrepancyLive.toLocaleString('fr-FR')} FCFA
                          </strong>
                          <div style={{ fontSize: '0.8rem', color: '#1D4ED8' }}>
                            Il y a plus d'argent que prévu dans le tiroir.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Justification de l'écart si présent */}
                {actualCash !== '' && Math.abs(discrepancyLive) > 100 && (
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#DC2626', marginBottom: '6px' }}>
                      Justification obligatoire de l'écart *
                    </label>
                    <textarea
                      value={closeReason}
                      onChange={e => setCloseReason(e.target.value)}
                      required
                      rows={2}
                      placeholder="Expliquez la cause (ex: erreur de monnaie rendue, ticket non saisi...)"
                      style={{ width: '100%', padding: '10px' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                    Solde Mobile Money au pointage (optionnel)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={actualMomo}
                    onChange={e => setActualMomo(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`Attendu : ${(session.totalMomoIn || 0).toLocaleString('fr-FR')} FCFA`}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-danger" style={{ fontWeight: 700 }}>
                  Confirmer la Clôture Définitive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4 : BILAN D'UNE CLÔTURE PASSÉE */}
      {selectedPastSession && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Rapport de Clôture de Caisse</h3>
              <button onClick={() => setSelectedPastSession(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '1px dashed #CBD5E1' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}>{businessName}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  Session du {new Date(selectedPastSession.openedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fond initial :</span>
                  <strong>{(selectedPastSession.initialCash || 0).toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Entrées cash :</span>
                  <strong style={{ color: '#059669' }}>+{(selectedPastSession.totalCashIn || 0).toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sorties cash :</span>
                  <strong style={{ color: '#DC2626' }}>-{(selectedPastSession.totalCashOut || 0).toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                  <span>Solde théorique :</span>
                  <strong>{(selectedPastSession.theoreticalCash || 0).toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Montant physique compté :</span>
                  <strong>{selectedPastSession.actualCash !== undefined && selectedPastSession.actualCash !== null ? `${selectedPastSession.actualCash.toLocaleString('fr-FR')} FCFA` : 'Non clôturée'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #CBD5E1', paddingTop: '8px', fontWeight: 800 }}>
                  <span>Écart constaté :</span>
                  <span style={{ color: (selectedPastSession.cashDiscrepancy || 0) === 0 ? '#059669' : '#DC2626' }}>
                    {(selectedPastSession.cashDiscrepancy || 0) > 0 ? '+' : ''}
                    {(selectedPastSession.cashDiscrepancy || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                {selectedPastSession.discrepancyReason && (
                  <div style={{ background: '#FFFBEB', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', color: '#92400E', marginTop: '6px' }}>
                    <strong>Motif de l'écart :</strong> {selectedPastSession.discrepancyReason}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedPastSession(null)}>
                Fermer
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} />
                <span>Imprimer le Bilan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
