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
  Coins,
  Sparkles,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Info,
  Calendar,
  User,
  RotateCcw,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { CashSession } from '../types';
import { useAuthStore } from '../store/authStore';
import { PageGuideBanner } from '../components/common/PageGuideBanner';

const CASH_DENOMINATIONS = [
  { value: 10000, label: '10 000 F', type: 'bill', color: '#1E3A8A', bg: '#EFF6FF', badge: 'Billet 10 000 FCFA' },
  { value: 5000, label: '5 000 F', type: 'bill', color: '#047857', bg: '#ECFDF5', badge: 'Billet 5 000 FCFA' },
  { value: 2000, label: '2 000 F', type: 'bill', color: '#B45309', bg: '#FEF3C7', badge: 'Billet 2 000 FCFA' },
  { value: 1000, label: '1 000 F', type: 'bill', color: '#B91C1C', bg: '#FEF2F2', badge: 'Billet 1 000 FCFA' },
  { value: 500, label: '500 F', type: 'bill', color: '#6D28D9', bg: '#F5F3FF', badge: 'Billet / Pièce 500 F' },
  { value: 200, label: '200 F', type: 'coin', color: '#475569', bg: '#F8FAFC', badge: 'Pièce 200 FCFA' },
  { value: 100, label: '100 F', type: 'coin', color: '#475569', bg: '#F8FAFC', badge: 'Pièce 100 FCFA' },
  { value: 50, label: '50 F', type: 'coin', color: '#475569', bg: '#F8FAFC', badge: 'Pièce 50 FCFA' },
  { value: 25, label: '25 F', type: 'coin', color: '#475569', bg: '#F8FAFC', badge: 'Pièce 25 FCFA' },
];

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
  const [openMode, setOpenMode] = useState<'quick' | 'billetage'>('quick');
  const [openBreakdown, setOpenBreakdown] = useState<Record<number, number>>({
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    25: 0,
  });

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
  const [closeMode, setCloseMode] = useState<'quick' | 'billetage'>('quick');
  const [closeBreakdown, setCloseBreakdown] = useState<Record<number, number>>({
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    25: 0,
  });

  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const businessName = activeBusiness?.name || user?.businesses?.[0]?.name || 'Mon Activité';
  const currency = activeBusiness?.currency || 'FCFA';
  const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Caissier';
  const userRole = activeBusiness?.role === 'owner' ? 'Propriétaire' : activeBusiness?.role === 'manager' ? 'Gérant' : 'Caissier';

  // Fonctions de calcul du Billetage
  const updateOpenBreakdown = (val: number, delta: number) => {
    setOpenBreakdown(prev => {
      const nextCount = Math.max(0, (prev[val] || 0) + delta);
      const updated = { ...prev, [val]: nextCount };
      const total = Object.entries(updated).reduce((sum, [v, c]) => sum + (Number(v) * c), 0);
      setInitialCash(total);
      return updated;
    });
  };

  const setOpenBreakdownCount = (val: number, count: number) => {
    setOpenBreakdown(prev => {
      const nextCount = Math.max(0, count);
      const updated = { ...prev, [val]: nextCount };
      const total = Object.entries(updated).reduce((sum, [v, c]) => sum + (Number(v) * c), 0);
      setInitialCash(total);
      return updated;
    });
  };

  const resetOpenBreakdown = () => {
    const empty: Record<number, number> = { 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 25: 0 };
    setOpenBreakdown(empty);
    setInitialCash(0);
  };

  const updateCloseBreakdown = (val: number, delta: number) => {
    setCloseBreakdown(prev => {
      const nextCount = Math.max(0, (prev[val] || 0) + delta);
      const updated = { ...prev, [val]: nextCount };
      const total = Object.entries(updated).reduce((sum, [v, c]) => sum + (Number(v) * c), 0);
      setActualCash(total);
      return updated;
    });
  };

  const setCloseBreakdownCount = (val: number, count: number) => {
    setCloseBreakdown(prev => {
      const nextCount = Math.max(0, count);
      const updated = { ...prev, [val]: nextCount };
      const total = Object.entries(updated).reduce((sum, [v, c]) => sum + (Number(v) * c), 0);
      setActualCash(total);
      return updated;
    });
  };

  const resetCloseBreakdown = () => {
    const empty: Record<number, number> = { 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 25: 0 };
    setCloseBreakdown(empty);
    setActualCash(0);
  };

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

      <PageGuideBanner
        pageId="cash"
        title="Journal de Caisse & Contrôle des Espèces"
        subtitle="Sécurité anti-vol, réconciliation quotidienne et vérification du tiroir-caisse sans erreur de calcul"
        autoDomino={[
          "Chaque vente comptoir payée en 'Espèces' est automatiquement créditée au solde théorique de caisse.",
          "Chaque livraison COD (Cash On Delivery) encaissée par coursier et validée 'Livré' alimente directement la caisse.",
          "Calcul automatique de l'écart de caisse (Excédent ou Manquant) lors de la clôture du soir.",
          "Génération automatique du procès-verbal imprimable avec historique infalsifiable de la journée."
        ]}
        manualActions={[
          "Ouverture matinale obligatoire : compter et saisir le fond de caisse initial (ex: 20 000 FCFA pour faire la monnaie).",
          "Décaissements urgents : enregistrer manuellement chaque sortie (ex: 5 000 FCFA taxi fournisseur) avec motif.",
          "Clôture du soir : compter physiquement les billets et pièces dans le tiroir et saisir le montant réel."
        ]}
        concreteExample="Matin : vous démarrez avec 20 000 FCFA de monnaie. Dans la journée : 5 clients paient 15 000 FCFA en espèces (Théorique = 35 000 FCFA). Vous payez 3 000 FCFA pour un coursier (Théorique = 32 000 FCFA). Le soir, vous comptez 32 000 FCFA dans le tiroir -> Écart 0 FCFA, validation parfaite !"
        guideSectionId="cash"
      />

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
        /* When Cash is Closed — Tableau de Bord Pré-Ouverture */
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: '20px',
            border: '1.5px solid #334155',
            padding: '32px 28px',
            marginBottom: '32px',
            color: '#FFFFFF',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle decorative background circles */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
            <div style={{ maxWidth: '640px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#FCA5A5',
                  marginBottom: '14px',
                }}
              >
                <Lock size={13} />
                <span>SESSION ACTUELLEMENT FERMÉE • PRÊTE POUR L'OUVERTURE</span>
              </div>

              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '0 0 10px 0', color: '#FFFFFF', lineHeight: 1.25 }}>
                Démarrez votre journée avec une <span style={{ color: '#34D399' }}>Caisse à Zéro Faute</span>
              </h2>

              <p style={{ color: '#94A3B8', fontSize: '0.94rem', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                Saisissez votre fond de monnaie de départ (au franc près ou avec notre outil de <strong style={{ color: '#FFFFFF' }}>Billetage Express</strong>). Chaque vente en espèces ou sortie d'argent sera automatiquement réconciliée jusqu'à la clôture de ce soir.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowOpenModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                    cursor: 'pointer',
                  }}
                >
                  <Unlock size={20} />
                  <span>Ouvrir la Caisse du Jour (Prise de Poste)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenMode('billetage');
                    setShowOpenModal(true);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#FFFFFF',
                    padding: '12px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Coins size={16} color="#FBBF24" />
                  <span>Compter mes billets & pièces</span>
                </button>
              </div>
            </div>

            {/* Carte de rappel de la dernière clôture */}
            {pastSessions.length > 0 && pastSessions[0] && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  minWidth: '260px',
                  maxWidth: '300px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#94A3B8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800 }}>
                  <History size={14} color="#34D399" />
                  <span>Dernière Clôture Enregistrée</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginBottom: '4px' }}>
                  {pastSessions[0].closedAt
                    ? new Date(pastSessions[0].closedAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                    : 'Session récente'}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '6px' }}>
                  {(pastSessions[0].actualCash ?? pastSessions[0].theoreticalCash).toLocaleString('fr-FR')} {currency}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {Math.abs(pastSessions[0].cashDiscrepancy || 0) <= 50 ? (
                    <span style={{ fontSize: '0.72rem', background: '#065F46', color: '#A7F3D0', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Zéro écart (Conforme)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', background: '#991B1B', color: '#FECACA', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      Écart : {(pastSessions[0].cashDiscrepancy || 0) > 0 ? '+' : ''}{(pastSessions[0].cashDiscrepancy || 0).toLocaleString('fr-FR')} {currency}
                    </span>
                  )}
                </div>
                {pastSessions[0].initialCash > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setInitialCash(pastSessions[0].initialCash);
                      setShowOpenModal(true);
                    }}
                    style={{
                      marginTop: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: '#38BDF8',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Reprendre le même fond ({pastSessions[0].initialCash.toLocaleString('fr-FR')} {currency}) ➔
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3 Règles d'or de gestion du tiroir-caisse */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '26px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Coins size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>1. Petite monnaie prête</div>
                <div style={{ fontSize: '0.76rem', color: '#94A3B8', lineHeight: 1.4, marginTop: '2px' }}>
                  Ayez toujours des pièces de 500, 200 et 100 F pour ne jamais faire attendre un client.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>2. Zéro mélange de fonds</div>
                <div style={{ fontSize: '0.76rem', color: '#94A3B8', lineHeight: 1.4, marginTop: '2px' }}>
                  L'argent du tiroir n'est pas votre poche perso : tout prélèvement doit être enregistré.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calculator size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>3. Clôture le soir scellée</div>
                <div style={{ fontSize: '0.76rem', color: '#94A3B8', lineHeight: 1.4, marginTop: '2px' }}>
                  Compter chaque soir empêche 100% des erreurs invisibles et fuites de liquidités.
                </div>
              </div>
            </div>
          </div>
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

      {/* MODAL 1 : OUVRIR LA CAISSE (SUPERCHARGED AVEC BILLETAGE EXPRESS) */}
      {showOpenModal && (
        <div className="modal-overlay" style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <div
            className="modal-content"
            style={{
              maxWidth: openMode === 'billetage' ? '640px' : '520px',
              borderRadius: '20px',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Modal Header Premium */}
            <div
              style={{
                background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
                padding: '22px 24px',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <Unlock size={24} color="#A7F3D0" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    Ouverture de Caisse
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#A7F3D0', margin: '3px 0 0' }}>
                    Fonds de roulement & Monnaie de départ du service
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOpenModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Badges de contexte (Caissier, Date, Boutique) */}
            <div
              style={{
                padding: '10px 24px',
                background: '#ECFDF5',
                borderBottom: '1px solid #D1FAE5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#065F46',
                fontWeight: 700,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} />
                <span>{userName} ({userRole})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} />
                <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} />
                <span>Prise de poste : {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Onglets de mode : Saisie Rapide vs Billetage */}
            <div style={{ padding: '16px 24px 0', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setOpenMode('quick')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  border: openMode === 'quick' ? '2px solid #059669' : '1px solid #E2E8F0',
                  background: openMode === 'quick' ? '#ECFDF5' : '#F8FAFC',
                  color: openMode === 'quick' ? '#047857' : '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>⚡ Saisie Rapide</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenMode('billetage')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  border: openMode === 'billetage' ? '2px solid #059669' : '1px solid #E2E8F0',
                  background: openMode === 'billetage' ? '#ECFDF5' : '#F8FAFC',
                  color: openMode === 'billetage' ? '#047857' : '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Coins size={15} />
                <span>🧮 Billetage Express (Coupures)</span>
              </button>
            </div>

            <form onSubmit={handleOpenCash}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {openMode === 'quick' ? (
                  /* MODE 1 : SAISIE RAPIDE & PRESETS */
                  <div>
                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.90rem', color: '#0F172A', marginBottom: '8px' }}>
                      Fond de caisse initial ({currency}) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={initialCash}
                        onChange={e => setInitialCash(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        style={{
                          width: '100%',
                          fontSize: '1.6rem',
                          fontWeight: 900,
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '2px solid #059669',
                          background: '#F0FDF4',
                          color: '#065F46',
                        }}
                        placeholder="Ex: 10000"
                        autoFocus
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: '#059669',
                        }}
                      >
                        {currency}
                      </span>
                    </div>

                    {/* Presets rapides avec descriptif */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                        Montants fréquents au démarrage :
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '6px' }}>
                        {[
                          { amt: 0, label: '0 F', desc: 'Sans monnaie' },
                          { amt: 5000, label: '5 000 F', desc: 'Petite monnaie' },
                          { amt: 10000, label: '10 000 F', desc: 'Standard' },
                          { amt: 25000, label: '25 000 F', desc: 'Confort' },
                          { amt: 50000, label: '50 000 F', desc: 'Gros volume' },
                        ].map(item => (
                          <button
                            type="button"
                            key={item.amt}
                            onClick={() => setInitialCash(item.amt)}
                            style={{
                              background: initialCash === item.amt ? '#059669' : '#F8FAFC',
                              color: initialCash === item.amt ? '#FFFFFF' : '#334155',
                              border: initialCash === item.amt ? '2px solid #047857' : '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '8px 6px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>{item.label}</div>
                            <div style={{ fontSize: '0.64rem', opacity: initialCash === item.amt ? 0.9 : 0.6, marginTop: '1px' }}>
                              {item.desc}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Reprise de la dernière session si dispo */}
                      {pastSessions.length > 0 && pastSessions[0]?.initialCash > 0 && (
                        <button
                          type="button"
                          onClick={() => setInitialCash(pastSessions[0].initialCash)}
                          style={{
                            marginTop: '10px',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            color: '#1D4ED8',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            width: '100%',
                            justifyContent: 'center',
                          }}
                        >
                          <History size={13} />
                          <span>Reprendre le même fond que la dernière session ({pastSessions[0].initialCash.toLocaleString('fr-FR')} {currency})</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* MODE 2 : BILLETAGE EXPRESS */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                        Comptez vos coupures physiques dans le tiroir :
                      </span>
                      <button
                        type="button"
                        onClick={resetOpenBreakdown}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RotateCcw size={12} /> Réinitialiser
                      </button>
                    </div>

                    <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                      {CASH_DENOMINATIONS.map(den => {
                        const count = openBreakdown[den.value] || 0;
                        const subtotal = count * den.value;
                        return (
                          <div
                            key={den.value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: count > 0 ? den.bg : '#F8FAFC',
                              border: count > 0 ? `1.5px solid ${den.color}` : '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: den.color }}>
                                {den.label}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                ({den.type === 'bill' ? 'Billet' : 'Pièce'})
                              </span>
                            </div>

                            {/* Controls - / + */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => updateOpenBreakdown(den.value, -1)}
                                disabled={count === 0}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  background: count > 0 ? '#FFFFFF' : '#F1F5F9',
                                  color: count > 0 ? '#0F172A' : '#94A3B8',
                                  fontWeight: 800,
                                  cursor: count > 0 ? 'pointer' : 'default',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={count === 0 ? '' : count}
                                onChange={e => setOpenBreakdownCount(den.value, Number(e.target.value) || 0)}
                                placeholder="0"
                                style={{
                                  width: '44px',
                                  textAlign: 'center',
                                  padding: '4px',
                                  fontSize: '0.86rem',
                                  fontWeight: 800,
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => updateOpenBreakdown(den.value, 1)}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '6px',
                                  border: '1px solid #059669',
                                  background: '#059669',
                                  color: '#FFFFFF',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                +
                              </button>
                            </div>

                            <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 800, fontSize: '0.86rem', color: count > 0 ? den.color : '#94A3B8' }}>
                              {subtotal > 0 ? `${subtotal.toLocaleString('fr-FR')} F` : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total live du billetage */}
                    <div
                      style={{
                        marginTop: '10px',
                        background: '#064E3B',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Total Billetage Calculé :</span>
                      <strong style={{ fontSize: '1.25rem', color: '#A7F3D0' }}>
                        {Number(initialCash || 0).toLocaleString('fr-FR')} {currency}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Remarques / Caissier avec suggestions rapides */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.86rem', color: '#334155', marginBottom: '6px' }}>
                    Remarques / Caissier (optionnel)
                  </label>
                  <input
                    type="text"
                    value={openNotes}
                    onChange={e => setOpenNotes(e.target.value)}
                    placeholder="Ex: Prise de poste matin - 08h00"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {['Prise de poste matin - 08h00', 'Fond recompté', 'Relève après-midi'].map(note => (
                      <button
                        type="button"
                        key={note}
                        onClick={() => setOpenNotes(note)}
                        style={{
                          background: '#F1F5F9',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.70rem',
                          color: '#475569',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + {note}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note didactique & règle d'or */}
                <div
                  style={{
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <Info size={16} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#92400E', lineHeight: 1.45 }}>
                    <strong>Règle d'or de caisse :</strong> Le fond de caisse initial est votre monnaie de départ. Il n'est pas compté dans votre chiffre d'affaires et sera scellé ce soir lors de la clôture définitive.
                  </p>
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  padding: '14px 24px',
                  background: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOpenModal(false)}
                  style={{ padding: '9px 18px', fontWeight: 700 }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    padding: '10px 22px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    cursor: 'pointer',
                  }}
                >
                  <Unlock size={16} />
                  <span>
                    Valider & Ouvrir ({Number(initialCash || 0).toLocaleString('fr-FR')} {currency})
                  </span>
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

                {/* Mode toggle Clôture : Saisie Globale vs Billetage */}
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setCloseMode('quick')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        border: closeMode === 'quick' ? '2px solid #DC2626' : '1px solid #E2E8F0',
                        background: closeMode === 'quick' ? '#FEF2F2' : '#F8FAFC',
                        color: closeMode === 'quick' ? '#991B1B' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Saisie Globale du Tiroir
                    </button>
                    <button
                      type="button"
                      onClick={() => setCloseMode('billetage')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        border: closeMode === 'billetage' ? '2px solid #DC2626' : '1px solid #E2E8F0',
                        background: closeMode === 'billetage' ? '#FEF2F2' : '#F8FAFC',
                        color: closeMode === 'billetage' ? '#991B1B' : '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Coins size={14} />
                      <span>🧮 Billetage Express</span>
                    </button>
                  </div>

                  {closeMode === 'quick' ? (
                    <div>
                      <label style={{ display: 'block', fontWeight: 800, fontSize: '0.9rem', marginBottom: '6px', color: '#0F172A' }}>
                        Montant réellement compté dans le tiroir ({currency}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={actualCash}
                        onChange={e => setActualCash(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        style={{ fontSize: '1.4rem', fontWeight: 800, padding: '12px', width: '100%', borderRadius: '10px', border: '2px solid #DC2626' }}
                        placeholder="Ex: 85000"
                      />
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                          Comptez chaque billet et pièce dans le tiroir :
                        </span>
                        <button
                          type="button"
                          onClick={resetCloseBreakdown}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RotateCcw size={12} /> Réinitialiser
                        </button>
                      </div>

                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                        {CASH_DENOMINATIONS.map(den => {
                          const count = closeBreakdown[den.value] || 0;
                          const subtotal = count * den.value;
                          return (
                            <div
                              key={den.value}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: count > 0 ? den.bg : '#F8FAFC',
                                border: count > 0 ? `1.5px solid ${den.color}` : '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '5px 10px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '110px' }}>
                                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: den.color }}>{den.label}</span>
                                <span style={{ fontSize: '0.66rem', color: '#64748B' }}>({den.type === 'bill' ? 'Billet' : 'Pièce'})</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => updateCloseBreakdown(den.value, -1)}
                                  disabled={count === 0}
                                  style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #CBD5E1', cursor: count > 0 ? 'pointer' : 'default', fontWeight: 800 }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={count === 0 ? '' : count}
                                  onChange={e => setCloseBreakdownCount(den.value, Number(e.target.value) || 0)}
                                  placeholder="0"
                                  style={{ width: '42px', textAlign: 'center', padding: '3px', fontSize: '0.82rem', fontWeight: 800, borderRadius: '4px', border: '1px solid #CBD5E1' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateCloseBreakdown(den.value, 1)}
                                  style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #DC2626', background: '#DC2626', color: '#FFF', cursor: 'pointer', fontWeight: 800 }}
                                >
                                  +
                                </button>
                              </div>
                              <div style={{ minWidth: '80px', textAlign: 'right', fontWeight: 800, fontSize: '0.82rem', color: count > 0 ? den.color : '#94A3B8' }}>
                                {subtotal > 0 ? `${subtotal.toLocaleString('fr-FR')} F` : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: '8px', background: '#7F1D1D', color: '#FFF', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.80rem', fontWeight: 700 }}>Total Physique Recompté :</span>
                        <strong style={{ fontSize: '1.15rem', color: '#FECACA' }}>
                          {Number(actualCash || 0).toLocaleString('fr-FR')} {currency}
                        </strong>
                      </div>
                    </div>
                  )}
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
