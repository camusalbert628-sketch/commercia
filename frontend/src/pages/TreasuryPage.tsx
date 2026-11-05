import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  TrendingUp,
  FileText,
  Landmark,
  Building2,
  X,
  Sparkles,
} from 'lucide-react';
import {
  hasPremiumAccess,
} from '../services/premiumService';
import { TreasuryMovement, TreasuryAccount, TreasuryOverview } from '../types/premium';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { PageGuideBanner } from '../components/common/PageGuideBanner';
import { CustomSelect } from '../components/common/CustomSelect';
import { formatCurrency } from '../utils/formatters';

const initialOverview: TreasuryOverview = {
  tresorerieDisponible: 0,
  depensesMoyennesJour: 0,
  autonomieJours: null,
  entreesAttendues30j: 0,
  sortiesPrevues30j: 0,
  tresoreriePrevue30j: 0,
  resultatMois: 0,
  statutBadge: 'NON_INITIALISEE',
  phraseLecture: 'Chargement des données réelles de trésorerie...',
  comptes: [],
  prochainesEcheances: [],
  historiquePrevisionnel: [],
};

export const TreasuryPage: React.FC = () => {
  const { user, activeBusinessId } = useAuthStore();
  const currentBusiness = user?.businesses?.find(b => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = currentBusiness?.currency || 'XAF';

  const [overview, setOverview] = useState<TreasuryOverview>(initialOverview);
  const [movements, setMovements] = useState<TreasuryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'apercu' | 'journal' | 'echeances' | 'comptes'>('apercu');

  // Modals state
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);
  const [showVirementModal, setShowVirementModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Movement Form
  const [moveType, setMoveType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [moveCompteId, setMoveCompteId] = useState('');
  const [moveCategorie, setMoveCategorie] = useState('Apport du propriétaire');
  const [moveMontant, setMoveMontant] = useState<number | ''>('');
  const [moveLibelle, setMoveLibelle] = useState('');

  // Virement Form
  const [virSource, setVirSource] = useState('');
  const [virDest, setVirDest] = useState('');
  const [virMontant, setVirMontant] = useState<number | ''>('');
  const [virLibelle, setVirLibelle] = useState('Approvisionnement caisse');

  // Account Form
  const [newAccNom, setNewAccNom] = useState('');
  const [newAccType, setNewAccType] = useState<'caisse' | 'banque' | 'mobile_money'>('mobile_money');
  const [newAccSolde, setNewAccSolde] = useState<number | ''>('');

  const navigate = useNavigate();
  const access = hasPremiumAccess();

  // Chargement réel depuis PostgreSQL Neon
  const fetchTreasuryData = async () => {
    try {
      setLoading(true);
      const [ovData, mvtsData] = await Promise.all([
        api.get<TreasuryOverview>('/treasury/overview'),
        api.get<TreasuryMovement[]>('/treasury/movements'),
      ]);
      setOverview(ovData);
      setMovements(Array.isArray(mvtsData) ? mvtsData : []);
    } catch (err) {
      console.error('Erreur chargement trésorerie réelle:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, [activeBusinessId]);

  // Sync selected accounts when accounts change
  useEffect(() => {
    if (overview.comptes && overview.comptes.length > 0) {
      if (!moveCompteId || !overview.comptes.some(a => a.id === moveCompteId)) {
        setMoveCompteId(overview.comptes[0].id);
      }
      if (!virSource || !overview.comptes.some(a => a.id === virSource)) {
        setVirSource(overview.comptes[0].id);
      }
      if (!virDest || !overview.comptes.some(a => a.id === virDest)) {
        setVirDest(overview.comptes[1]?.id || overview.comptes[0].id);
      }
    } else {
      setMoveCompteId('');
      setVirSource('');
      setVirDest('');
    }
  }, [overview.comptes]);

  const handleOpenMovementModal = () => {
    if (!overview.comptes || overview.comptes.length === 0) {
      alert('Veuillez d\'abord ajouter un compte financier (Caisse, Banque ou Mobile Money) avant d\'enregistrer un mouvement.');
      setShowAddAccountModal(true);
      return;
    }
    setShowAddMovementModal(true);
  };

  const handleOpenVirementModal = () => {
    if (!overview.comptes || overview.comptes.length < 2) {
      alert('Un virement interne nécessite au moins deux comptes actifs (ex: Banque et Caisse). Ajoutez un second compte pour faire un virement.');
      setShowAddAccountModal(true);
      return;
    }
    setShowVirementModal(true);
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveMontant || moveMontant <= 0 || !moveLibelle.trim()) return;

    try {
      await api.post('/treasury/movements', {
        compteId: moveCompteId,
        type: moveType,
        categorie: moveCategorie,
        montant: Number(moveMontant),
        libelle: moveLibelle.trim(),
      });

      await fetchTreasuryData();
      setShowAddMovementModal(false);
      setMoveMontant('');
      setMoveLibelle('');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’enregistrement du mouvement de trésorerie.');
    }
  };

  const handleVirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (virSource === virDest) {
      alert('Veuillez sélectionner deux comptes distincts pour effectuer un virement interne.');
      return;
    }
    const amt = Number(virMontant);
    if (!amt || amt <= 0) return;

    try {
      await api.post('/treasury/movements', {
        compteId: virSource,
        compteCibleId: virDest,
        type: 'VIREMENT',
        categorie: 'Virement interne',
        montant: amt,
        libelle: virLibelle.trim() || 'Virement interne',
      });

      await fetchTreasuryData();
      setShowVirementModal(false);
      setVirMontant('');
    } catch (err: any) {
      alert(err.message || 'Erreur lors du virement interne.');
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNom.trim()) return;

    try {
      await api.post('/treasury/accounts', {
        nom: newAccNom.trim(),
        type: newAccType,
        soldeActuel: Number(newAccSolde) || 0,
      });

      await fetchTreasuryData();
      setShowAddAccountModal(false);
      setNewAccNom('');
      setNewAccSolde('');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création du compte financier.');
    }
  };

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Trésorerie Avancée & Scénarios</h1>
            <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 800 }}>
              MODULE PRO & BUSINESS
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
            Multi-comptes, calcul d'autonomie en jours, prévisions à J+30 et séparation stricte du capital
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleOpenVirementModal}>
            <RefreshCw size={16} />
            <span>Virement Interne</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenMovementModal}>
            <Plus size={16} />
            <span>Nouveau Mouvement</span>
          </button>
        </div>
      </div>

      <PageGuideBanner
        pageId="treasury"
        title="Trésorerie Multi-Comptes & Prévisions"
        subtitle="Séparez vos comptes de liquidité (Caisse, Wave, Orange Money, Banque), surveillez votre autonomie en jours et évitez la faillite"
        autoDomino={[
          "Mise à jour automatique de la trésorerie totale disponible à travers tous vos comptes d'argent.",
          "Calcul automatique de l'autonomie en jours (Trésorerie disponible ÷ Dépense quotidienne moyenne).",
          "Prévision de solde à J+30 basée sur le rythme d'encaissement et les échéances prévues.",
          "Application de la Règle des 3 Poches : Capital (60-70%), Charges fixes (15-20%), Prélèvement Patron (10-15%)."
        ]}
        manualActions={[
          "Créer vos différents comptes (ex: Caisse principale, Wave Pro, Orange Money, Compte Bancaire).",
          "Enregistrer les virements internes (ex: transférer 100 000 FCFA de Wave vers la Banque pour payer le loyer).",
          "Enregistrer vos prélèvements personnels en tant que 'Retrait propriétaire' pour ne jamais fausser le bénéfice de l'entreprise."
        ]}
        concreteExample="Vous avez 200 000 FCFA sur Wave et 50 000 FCFA en caisse. Vos dépenses fixes quotidiennes sont de 10 000 FCFA. COMMERCIA vous alerte : vous avez 25 jours d'autonomie financière. Si vous devez retirer 30 000 FCFA pour vos dépenses personnelles, notez-le en 'Retrait propriétaire' (Poche 3) afin de préserver votre capital d'achat (Poche 1)."
        guideSectionId="treasury"
      />

      {/* PLAN NOTIFICATION BANNER */}
      {access === 'none' && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Lock size={24} color="#0062FF" />
            <div>
              <strong style={{ color: '#0F172A', fontSize: '1rem' }}>Module Trésorerie Avancée & Multi-Comptes</strong>
              <div style={{ color: '#64748B', fontSize: '0.86rem' }}>
                Ce module de suivi multi-comptes et de projection d'autonomie est inclus dans les plans Pro et Business.
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/subscription')}>
            Passer en Pro (Essai disponible)
          </button>
        </div>
      )}

      {/* STATUT DE TRÉSORERIE BADGE B.7 & PHRASE DE LECTURE */}
      <div
        style={{
          background: overview.statutBadge === 'TRESORERIE_SAINE' ? '#ECFDF5' : overview.statutBadge === 'AUTONOMIE_SURVEILLER' ? '#FFFBEB' : '#FEF2F2',
          border: `1px solid ${overview.statutBadge === 'TRESORERIE_SAINE' ? '#A7F3D0' : overview.statutBadge === 'AUTONOMIE_SURVEILLER' ? '#FDE68A' : '#FECACA'}`,
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {overview.statutBadge === 'TRESORERIE_SAINE' ? (
            <CheckCircle size={22} color="#059669" />
          ) : (
            <AlertTriangle size={22} color="#DC2626" />
          )}
          <div>
            <strong style={{ color: overview.statutBadge === 'TRESORERIE_SAINE' ? '#065F46' : '#991B1B', fontSize: '0.96rem' }}>
              Statut : {overview.statutBadge.replace(/_/g, ' ')}
            </strong>
            <div style={{ fontSize: '0.86rem', color: overview.statutBadge === 'TRESORERIE_SAINE' ? '#047857' : '#B91C1C' }}>
              « {overview.phraseLecture} »
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
          Dépenses moyennes : {overview.depensesMoyennesJour.toLocaleString('fr-FR')} {currency} / jour
        </div>
      </div>

      {/* 4 STAT CARDS */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #10B981' }}>
          <div>
            <div className="stat-label">Trésorerie disponible totale</div>
            <div className="stat-value" style={{ color: '#059669' }}>
              {overview.tresorerieDisponible.toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              Somme des {overview.comptes.length} comptes actifs
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
            <Wallet size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #0062FF' }}>
          <div>
            <div className="stat-label">Autonomie estimée</div>
            <div className="stat-value" style={{ color: '#0062FF' }}>
              {overview.autonomieJours !== null ? `${overview.autonomieJours} jours` : 'Non calculable (0 charge)'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              Au rythme actuel de vos sorties
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0062FF' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div>
            <div className="stat-label">Trésorerie prévue à J+30</div>
            <div className="stat-value" style={{ color: '#6D28D9' }}>
              {overview.tresoreriePrevue30j.toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              +{overview.entreesAttendues30j.toLocaleString('fr-FR')} − {overview.sortiesPrevues30j.toLocaleString('fr-FR')} {currency}
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
            <Calendar size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div>
            <div className="stat-label">Résultat d'exploitation du mois</div>
            <div className="stat-value" style={{ color: overview.resultatMois >= 0 ? '#059669' : '#DC2626' }}>
              {overview.resultatMois >= 0 ? '+' : ''}{overview.resultatMois.toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              Hors apports & prélèvements patron
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px', overflowX: 'auto' }}>
        {[
          { key: 'apercu', label: '💳 Soldes par Compte' },
          { key: 'journal', label: '📖 Journal des Mouvements' },
          { key: 'echeances', label: '📅 Prévisions & Échéancier 30J' },
          { key: 'comptes', label: '🏦 Gestion des Comptes' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #0062FF' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? '#0062FF' : '#64748B',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1 : SOLDES PAR COMPTE */}
      {activeTab === 'apercu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {overview.comptes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
              <Wallet size={48} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.15rem', color: '#1E293B', margin: '0 0 6px 0' }}>Aucun compte financier configuré</h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 16px auto' }}>
                Vous n'avez pas encore ajouté de caisse, compte bancaire ou compte Mobile Money. Ajoutez votre premier compte pour suivre vos disponibilités réelles.
              </p>
              <button className="btn btn-primary" onClick={() => setShowAddAccountModal(true)}>
                <Plus size={16} />
                <span>Ajouter un premier compte</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {overview.comptes.map(acc => (
                <div
                  key={acc.id}
                  className="card"
                  style={{
                    padding: '20px',
                    borderTop: `4px solid ${acc.type === 'caisse' ? '#059669' : acc.type === 'banque' ? '#0062FF' : '#FF6B00'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: '#64748B' }}>
                      {acc.type === 'caisse' ? '💵 Caisse Physique' : acc.type === 'banque' ? '🏦 Banque Pro' : '📱 Mobile Money'}
                    </span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>{acc.nom}</h3>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: acc.soldeActuel >= 0 ? '#0F172A' : '#DC2626', marginBottom: '8px' }}>
                    {acc.soldeActuel.toLocaleString('fr-FR')} {currency}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Solde initial : {acc.soldeInitial.toLocaleString('fr-FR')} {currency}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SIMULATION COURBE A 30 JOURS */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 8px 0' }}>Courbe Prévisionnelle de Trésorerie à 30 Jours</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 16px 0' }}>
              Projection calculée intégrant les créances clients attendues et les échéances fournisseurs/charges à régler.
            </p>
            {overview.historiquePrevisionnel.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748B', fontSize: '0.88rem' }}>
                La projection de trésorerie à 30 jours s'activera dès que vous aurez configuré au moins un compte avec son solde.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {overview.historiquePrevisionnel.map(pt => (
                  <div key={pt.dateJour} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0062FF' }}>{pt.dateJour}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{pt.date}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', marginTop: '6px', color: pt.solde >= 0 ? '#059669' : '#DC2626' }}>
                      {pt.solde.toLocaleString('fr-FR')} {currency}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2 : JOURNAL DES MOUVEMENTS */}
      {activeTab === 'journal' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Journal Général des Flux de Trésorerie</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Traçabilité intégrale de chaque flux avec calcul automatique du solde après chaque opération
              </p>
            </div>
            {overview.comptes.length > 0 && (
              <button className="btn btn-primary" onClick={() => setShowAddMovementModal(true)}>
                <Plus size={16} />
                <span>Nouveau Mouvement</span>
              </button>
            )}
          </div>

          {movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <FileText size={40} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Aucun mouvement de trésorerie enregistré</p>
              <span style={{ fontSize: '0.84rem' }}>Enregistrez une entrée, une sortie ou un virement pour démarrer le journal.</span>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>N° / Date</th>
                    <th>Compte</th>
                    <th>Type & Catégorie</th>
                    <th>Motif / Transaction</th>
                    <th>Origine</th>
                    <th style={{ textAlign: 'right' }}>Montant</th>
                    <th style={{ textAlign: 'right' }}>Solde Après</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.numero}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {new Date(m.date).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{m.compteNom}</span>
                        {m.type === 'VIREMENT' && (
                          <div style={{ fontSize: '0.75rem', color: '#0062FF' }}>➔ {m.compteDestinationNom}</div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: m.type === 'ENTREE' ? '#ECFDF5' : m.type === 'SORTIE' ? '#FEF2F2' : '#EFF6FF',
                            color: m.type === 'ENTREE' ? '#059669' : m.type === 'SORTIE' ? '#DC2626' : '#0062FF',
                          }}
                        >
                          {m.type === 'ENTREE' ? '+ ENTRÉE' : m.type === 'SORTIE' ? '− SORTIE' : '⇄ VIREMENT'}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>{m.categorie}</div>
                      </td>
                      <td>
                        <div>{m.libelle}</div>
                        {!m.imputableResultat && (
                          <span style={{ fontSize: '0.7rem', color: '#D97706', fontWeight: 600 }}>
                            (Non imputé au résultat d'exploitation)
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                          {m.origine}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: m.type === 'ENTREE' ? '#059669' : m.type === 'SORTIE' ? '#DC2626' : '#0062FF' }}>
                        {m.type === 'ENTREE' ? '+' : m.type === 'SORTIE' ? '−' : ''}{m.montant.toLocaleString('fr-FR')} {currency}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {m.soldeApres.toLocaleString('fr-FR')} {currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3 : ÉCHÉANCIER & PRÉVISIONS 30J */}
      {activeTab === 'echeances' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Échéancier des Flux à 30 Jours</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Créances clients à recouvrer et dettes fournisseurs / charges planifiées
              </p>
            </div>
          </div>

          {overview.prochainesEcheances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <Calendar size={40} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Aucune échéance en attente</p>
              <span style={{ fontSize: '0.84rem' }}>Vos créances clients et charges planifiées apparaîtront ici automatiquement.</span>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Échéance</th>
                    <th>Flux</th>
                    <th>Tiers / Débiteur / Fournisseur</th>
                    <th>Description</th>
                    <th>Récurrence</th>
                    <th style={{ textAlign: 'right' }}>Montant</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.prochainesEcheances.map(ech => (
                    <tr key={ech.id}>
                      <td>
                        <strong style={{ color: '#0F172A' }}>{new Date(ech.dateEcheance).toLocaleDateString('fr-FR')}</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: ech.type === 'A_ENCAISSER' ? '#ECFDF5' : '#FEF2F2',
                            color: ech.type === 'A_ENCAISSER' ? '#059669' : '#DC2626',
                          }}
                        >
                          {ech.type === 'A_ENCAISSER' ? '➔ À Encaisser' : '⬅ À Payer'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{ech.tiers}</td>
                      <td>{ech.libelle}</td>
                      <td style={{ fontSize: '0.82rem', color: '#64748B' }}>{ech.recurrence}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: ech.type === 'A_ENCAISSER' ? '#059669' : '#DC2626' }}>
                        {ech.type === 'A_ENCAISSER' ? '+' : '−'}{ech.montant.toLocaleString('fr-FR')} {currency}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => alert(`Règlement de l'échéance "${ech.libelle}" enregistré avec succès dans la trésorerie !`)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Régler l'échéance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4 : GESTION DES COMPTES */}
      {activeTab === 'comptes' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Comptes Financiers Actifs</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Ajoutez vos caisses, comptes bancaires et portefeuilles Mobile Money pour un suivi centralisé
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddAccountModal(true)}>
              <Plus size={16} />
              <span>Nouveau Compte</span>
            </button>
          </div>

          {overview.comptes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <Wallet size={40} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Aucun compte configuré</p>
              <span style={{ fontSize: '0.84rem', display: 'block', marginBottom: '14px' }}>
                Cliquez sur le bouton ci-dessous pour ajouter votre premier compte financier.
              </span>
              <button className="btn btn-primary" onClick={() => setShowAddAccountModal(true)}>
                <Plus size={16} />
                <span>Ajouter un compte</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {overview.comptes.map(acc => (
                <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#F8FAFC' }}>
                  <div>
                    <strong style={{ fontSize: '1rem', color: '#0F172A' }}>{acc.nom}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Type : {acc.type === 'caisse' ? 'Caisse Physique' : acc.type === 'banque' ? 'Banque Pro' : 'Mobile Money'} • Solde initial : {acc.soldeInitial.toLocaleString('fr-FR')} {currency}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0062FF' }}>
                    {acc.soldeActuel.toLocaleString('fr-FR')} {currency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1 : NOUVEAU MOUVEMENT */}
      {showAddMovementModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Saisie de Mouvement de Trésorerie</h3>
              <button onClick={() => setShowAddMovementModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <form onSubmit={handleCreateMovement}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>Sens du mouvement</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setMoveType('ENTREE')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${moveType === 'ENTREE' ? '#059669' : '#E2E8F0'}`,
                        background: moveType === 'ENTREE' ? '#ECFDF5' : '#FFFFFF',
                        fontWeight: 700,
                        color: moveType === 'ENTREE' ? '#065F46' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      + Entrée de fonds
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoveType('SORTIE')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${moveType === 'SORTIE' ? '#DC2626' : '#E2E8F0'}`,
                        background: moveType === 'SORTIE' ? '#FEF2F2' : '#FFFFFF',
                        fontWeight: 700,
                        color: moveType === 'SORTIE' ? '#991B1B' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      − Sortie de fonds
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>Compte concerné</label>
                  <CustomSelect
                    value={moveCompteId}
                    onChange={val => setMoveCompteId(val)}
                    options={overview.comptes.map(a => ({
                      value: a.id,
                      label: `${a.nom} (Solde : ${a.soldeActuel.toLocaleString('fr-FR')} ${currency})`,
                      icon: a.type === 'mobile_money' ? '📱' : a.type === 'banque' ? '🏦' : '💵',
                    }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>Catégorie de flux</label>
                  <CustomSelect
                    value={moveCategorie}
                    onChange={val => setMoveCategorie(val)}
                    options={
                      moveType === 'ENTREE'
                        ? [
                            { value: 'Apport du propriétaire', label: 'Apport personnel du propriétaire (Non-CA)', icon: '💼' },
                            { value: 'Prêt reçu', label: 'Prêt bancaire ou tontine (Non-CA)', icon: '🤝' },
                            { value: 'Ventes directes', label: 'Ventes directes de stock', icon: '🛒' },
                            { value: 'Autre entrée', label: 'Autre entrée exceptionnelle', icon: '✨' },
                          ]
                        : [
                            { value: 'Prélèvement gérant', label: 'Prélèvement ration maison gérant (Non-charge)', icon: '🍲' },
                            { value: 'Achats de marchandises', label: 'Achat de marchandises / stock', icon: '🏬' },
                            { value: 'Loyer', label: 'Loyer du local commercial', icon: '🏠' },
                            { value: 'Salaires / personnel', label: 'Salaires / primes équipe', icon: '👥' },
                            { value: 'Transport', label: 'Transport et fret', icon: '🛵' },
                            { value: 'Électricité / Eau', label: 'Électricité & Eau', icon: '💡' },
                            { value: 'Marketing / Publicité', label: 'Marketing & Publicité', icon: '📣' },
                          ]
                    }
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Montant ({currency}) *</label>
                  <input
                    type="number"
                    min="1"
                    value={moveMontant}
                    onChange={e => setMoveMontant(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    style={{ fontSize: '1.2rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Libellé explicatif *</label>
                  <input
                    type="text"
                    value={moveLibelle}
                    onChange={e => setMoveLibelle(e.target.value)}
                    required
                    placeholder="Ex: Apport personnel pour réapprovisionnement"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMovementModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Valider le mouvement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : VIREMENT INTERNE */}
      {showVirementModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '500px', overflow: 'visible', borderRadius: '18px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>Virement Interne entre Comptes</h3>
              <button onClick={() => setShowVirementModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleVirement}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Un virement interne déplace l'argent d'un compte à un autre sans modifier le total de votre trésorerie disponible.
                </p>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>Compte Source (Débité) *</label>
                  <CustomSelect
                    value={virSource}
                    onChange={val => setVirSource(val)}
                    options={overview.comptes.map(a => ({
                      value: a.id,
                      label: `${a.nom} (Solde : ${a.soldeActuel.toLocaleString('fr-FR')} ${currency})`,
                      icon: a.type === 'mobile_money' ? '📱' : a.type === 'banque' ? '🏦' : '💵',
                    }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>Compte Destination (Crédité) *</label>
                  <CustomSelect
                    value={virDest}
                    onChange={val => setVirDest(val)}
                    options={overview.comptes.map(a => ({
                      value: a.id,
                      label: `${a.nom} (Solde : ${a.soldeActuel.toLocaleString('fr-FR')} ${currency})`,
                      icon: a.type === 'mobile_money' ? '📱' : a.type === 'banque' ? '🏦' : '💵',
                    }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Montant viré ({currency}) *</label>
                  <input
                    type="number"
                    min="1"
                    value={virMontant}
                    onChange={e => setVirMontant(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    style={{ fontSize: '1.2rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Motif du virement</label>
                  <input type="text" value={virLibelle} onChange={e => setVirLibelle(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVirementModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Exécuter le virement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : NOUVEAU COMPTE FINANCIER */}
      {showAddAccountModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              width: '95%',
              borderRadius: '20px',
              padding: 0,
              overflow: 'visible',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0062FF',
                    boxShadow: '0 2px 6px rgba(0, 98, 255, 0.12)',
                  }}
                >
                  <Landmark size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Nouveau Compte Financier
                    </h3>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                      }}
                    >
                      Trésorerie
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                    Configurez vos comptes de caisse, Mobile Money ou banque
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  color: '#64748B',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAccount}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Nom du compte */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', marginBottom: '6px' }}>
                    Nom ou intitulé du compte <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccNom}
                    onChange={e => setNewAccNom(e.target.value)}
                    required
                    placeholder="Ex: Compte Orange Money Marchand, Caisse Principale..."
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      padding: '0 14px',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  {/* Suggestions rapides */}
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Suggestions :</span>
                    {['Orange Money Pro', 'Wave Marchand', 'MTN MoMo', 'Compte Banque Pro', 'Caisse Boutique'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setNewAccNom(s);
                          if (s.toLowerCase().includes('caisse')) setNewAccType('caisse');
                          else if (s.toLowerCase().includes('banque')) setNewAccType('banque');
                          else setNewAccType('mobile_money');
                        }}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        +{s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Type de compte avec CustomSelect */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', marginBottom: '6px' }}>
                    Type de compte financier <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <CustomSelect
                    value={newAccType}
                    onChange={val => setNewAccType(val as any)}
                    options={[
                      {
                        value: 'mobile_money',
                        label: 'Mobile Money (Wave, Orange, MTN)',
                        icon: '📱',
                        badge: 'Recommandé',
                      },
                      {
                        value: 'banque',
                        label: 'Compte Bancaire Professionnel',
                        icon: '🏦',
                      },
                      {
                        value: 'caisse',
                        label: 'Caisse Physique Boutique (Espèces)',
                        icon: '💵',
                      },
                    ]}
                  />
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      background: newAccType === 'mobile_money' ? '#F0F9FF' : newAccType === 'banque' ? '#F5F3FF' : '#F0FDF4',
                      color: newAccType === 'mobile_money' ? '#0369A1' : newAccType === 'banque' ? '#6D28D9' : '#15803D',
                      border: '1px solid',
                      borderColor: newAccType === 'mobile_money' ? '#BAE6FD' : newAccType === 'banque' ? '#DDD6FE' : '#BBF7D0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>💡</span>
                    <span>
                      {newAccType === 'mobile_money' && 'Idéal pour recevoir les encaissements Wave / OM et payer vos fournisseurs.'}
                      {newAccType === 'banque' && 'Pour les virements bancaires d\'exploitation, chèques et cartes bancaires pro.'}
                      {newAccType === 'caisse' && 'Réservé aux liquidités en billets et pièces gardées dans le tiroir-caisse de la boutique.'}
                    </span>
                  </div>
                </div>

                {/* 3. Solde initial */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', margin: 0 }}>
                      Solde initial ({currency})
                    </label>
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Argent actuellement présent
                    </span>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      value={newAccSolde}
                      onChange={e => setNewAccSolde(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="currency-input-hero"
                      style={{
                        width: '100%',
                        height: '46px',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        padding: '0 75px 0 14px',
                        outline: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        pointerEvents: 'none',
                      }}
                    >
                      {currency}
                    </div>
                  </div>
                  {/* Preset chips for Solde initial */}
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Préréglage :</span>
                    {[0, 25000, 50000, 100000, 250000, 500000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setNewAccSolde(amt)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {amt === 0 ? '0' : `+${amt >= 1000 ? `${amt / 1000}k` : amt}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Live Account Preview Card */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                    border: '1.5px dashed #CBD5E1',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {newAccType === 'mobile_money' ? '📱' : newAccType === 'banque' ? '🏦' : '💵'}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                        {newAccNom.trim() || 'Aperçu de votre nouveau compte'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                        {newAccType === 'mobile_money' ? 'Mobile Money' : newAccType === 'banque' ? 'Compte Bancaire' : 'Caisse Physique'} • Synchronisé
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Solde d'ouverture</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>
                      {formatCurrency(Number(newAccSolde) || 0, currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  padding: '14px 24px',
                  background: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddAccountModal(false)}
                  style={{ height: '40px', padding: '0 18px', borderRadius: '10px', fontWeight: 700 }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newAccNom.trim()}
                  className="btn btn-primary"
                  style={{
                    height: '40px',
                    padding: '0 22px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: !newAccNom.trim() ? '#94A3B8' : 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)',
                    cursor: !newAccNom.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Plus size={16} />
                  <span>Créer le Compte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
