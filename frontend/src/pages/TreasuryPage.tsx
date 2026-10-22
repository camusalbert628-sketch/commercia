import React, { useState } from 'react';
import {
  Wallet,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Building,
  Smartphone,
  CreditCard,
  Lock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileText,
} from 'lucide-react';
import {
  calculateTreasuryOverview,
  getTreasuryMovements,
  saveTreasuryMovements,
  getTreasuryAccounts,
  saveTreasuryAccounts,
  getTreasuryEcheances,
  hasPremiumAccess,
} from '../services/premiumService';
import { TreasuryMovement, TreasuryEcheance, TreasuryAccount } from '../types/premium';
import { useNavigate } from 'react-router-dom';

export const TreasuryPage: React.FC = () => {
  const [overview, setOverview] = useState(calculateTreasuryOverview());
  const [movements, setMovements] = useState<TreasuryMovement[]>(getTreasuryMovements());
  const [activeTab, setActiveTab] = useState<'apercu' | 'journal' | 'echeances' | 'comptes'>('apercu');

  // Modals state
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);
  const [showVirementModal, setShowVirementModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Movement Form
  const [moveType, setMoveType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [moveCompteId, setMoveCompteId] = useState('acc-caisse');
  const [moveCategorie, setMoveCategorie] = useState('Apport du propriétaire');
  const [moveMontant, setMoveMontant] = useState<number | ''>(50000);
  const [moveLibelle, setMoveLibelle] = useState('');

  // Virement Form
  const [virSource, setVirSource] = useState('acc-banque');
  const [virDest, setVirDest] = useState('acc-caisse');
  const [virMontant, setVirMontant] = useState<number | ''>(50000);
  const [virLibelle, setVirLibelle] = useState('Approvisionnement caisse');

  // Account Form
  const [newAccNom, setNewAccNom] = useState('');
  const [newAccType, setNewAccType] = useState<'caisse' | 'banque' | 'mobile_money'>('mobile_money');
  const [newAccSolde, setNewAccSolde] = useState<number | ''>(10000);

  const navigate = useNavigate();
  const access = hasPremiumAccess();

  const handleCreateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveMontant || moveMontant <= 0 || !moveLibelle.trim()) return;

    // Strict Rule B.5 & B.10: Owner Deposits & Owner Withdrawals are NOT operating income/expense
    const isOwnerDeposit = moveCategorie.includes('Apport') || moveCategorie.includes('Prêt');
    const isOwnerWithdrawal = moveCategorie.includes('Prélèvement') || moveCategorie.includes('Ration');
    const imputable = !isOwnerDeposit && !isOwnerWithdrawal;

    const accounts = getTreasuryAccounts();
    const acc = accounts.find(a => a.id === moveCompteId);
    if (!acc) return;

    const amt = Number(moveMontant);
    const newSolde = moveType === 'ENTREE' ? acc.soldeActuel + amt : acc.soldeActuel - amt;
    acc.soldeActuel = newSolde;
    saveTreasuryAccounts(accounts);

    const newMvt: TreasuryMovement = {
      id: 'm-' + Date.now(),
      numero: `MVT-00${movements.length + 1}`,
      date: new Date().toISOString(),
      compteId: acc.id,
      compteNom: acc.nom,
      type: moveType,
      nature: isOwnerWithdrawal ? 'non_operationnel' : isOwnerDeposit ? 'non_operationnel' : 'charge_fixe',
      categorie: moveCategorie,
      montant: amt,
      libelle: moveLibelle,
      modePaiement: acc.type === 'caisse' ? 'especes' : acc.type === 'mobile_money' ? 'mobile_money' : 'virement',
      origine: 'MANUEL',
      imputableResultat: imputable,
      soldeApres: newSolde,
    };

    const updatedMvts = [newMvt, ...movements];
    setMovements(updatedMvts);
    saveTreasuryMovements(updatedMvts);
    setOverview(calculateTreasuryOverview());
    setShowAddMovementModal(false);
    setMoveLibelle('');
  };

  const handleVirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (virSource === virDest) {
      alert('Veuillez sélectionner deux comptes distincts pour effectuer un virement interne.');
      return;
    }
    const amt = Number(virMontant);
    if (!amt || amt <= 0) return;

    const accounts = getTreasuryAccounts();
    const sAcc = accounts.find(a => a.id === virSource);
    const dAcc = accounts.find(a => a.id === virDest);
    if (!sAcc || !dAcc) return;

    sAcc.soldeActuel -= amt;
    dAcc.soldeActuel += amt;
    saveTreasuryAccounts(accounts);

    const newMvt: TreasuryMovement = {
      id: 'm-' + Date.now(),
      numero: `MVT-00${movements.length + 1}`,
      date: new Date().toISOString(),
      compteId: sAcc.id,
      compteNom: sAcc.nom,
      compteDestinationId: dAcc.id,
      compteDestinationNom: dAcc.nom,
      type: 'VIREMENT',
      nature: 'non_operationnel',
      categorie: 'Virement interne',
      montant: amt,
      libelle: virLibelle,
      modePaiement: 'virement',
      origine: 'MANUEL',
      imputableResultat: false,
      soldeApres: sAcc.soldeActuel,
    };

    const updatedMvts = [newMvt, ...movements];
    setMovements(updatedMvts);
    saveTreasuryMovements(updatedMvts);
    setOverview(calculateTreasuryOverview());
    setShowVirementModal(false);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNom.trim()) return;
    const accounts = getTreasuryAccounts();
    const newAcc: TreasuryAccount = {
      id: 'acc-' + Date.now(),
      nom: newAccNom,
      type: newAccType,
      soldeInitial: Number(newAccSolde) || 0,
      soldeActuel: Number(newAccSolde) || 0,
      actif: true,
    };
    const updated = [...accounts, newAcc];
    saveTreasuryAccounts(updated);
    setOverview(calculateTreasuryOverview());
    setShowAddAccountModal(false);
    setNewAccNom('');
  };

  return (
    <div className="page-wrapper">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Trésorerie Avancée & Scénarios</h1>
            <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 800 }}>
              MODULE PREMIUM B
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
            Multi-comptes, calcul d'autonomie en jours, prévisions à J+30 et séparation stricte du capital
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setShowVirementModal(true)}>
            <RefreshCw size={16} />
            <span>Virement Interne</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddMovementModal(true)}>
            <Plus size={16} />
            <span>Nouveau Mouvement</span>
          </button>
        </div>
      </div>

      {/* SOFT PAYWALL WARNING IF NOT PREMIUM */}
      {access === 'none' && (
        <div style={{ background: '#FFFBEB', border: '2px solid #F59E0B', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Lock size={24} color="#D97706" />
            <div>
              <strong style={{ color: '#92400E', fontSize: '1rem' }}>Aperçu avec données de démonstration</strong>
              <div style={{ color: '#B45309', fontSize: '0.86rem' }}>
                Ce module fait partie de la suite COMMERCIA Premium. Activez votre essai de 14 jours pour connecter vos ventes réelles.
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ background: '#D97706' }} onClick={() => navigate('/subscription')}>
            Passer en Premium (14 jours offerts)
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
          Dépenses moyennes : {overview.depensesMoyennesJour.toLocaleString('fr-FR')} FCFA / jour
        </div>
      </div>

      {/* 4 STAT CARDS B.8.1 */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #10B981' }}>
          <div>
            <div className="stat-label">Trésorerie disponible totale</div>
            <div className="stat-value" style={{ color: '#059669' }}>
              {overview.tresorerieDisponible.toLocaleString('fr-FR')} FCFA
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
              {overview.autonomieJours !== null ? `${overview.autonomieJours} jours` : 'Non calculable'}
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
              {overview.tresoreriePrevue30j.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              +{overview.entreesAttendues30j.toLocaleString('fr-FR')} F − {overview.sortiesPrevues30j.toLocaleString('fr-FR')} F
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
              {overview.resultatMois >= 0 ? '+' : ''}{overview.resultatMois.toLocaleString('fr-FR')} FCFA
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

      {/* TAB 1 : SOLDES PAR COMPTE (B.8.1) */}
      {activeTab === 'apercu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  {acc.soldeActuel.toLocaleString('fr-FR')} FCFA
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Solde de départ : {acc.soldeInitial.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            ))}
          </div>

          {/* SIMULATION JOUR PAR JOUR SUR 30 JOURS (B.8.4) */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 8px 0' }}>Courbe Prévisionnelle de Trésorerie à 30 Jours</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 16px 0' }}>
              Projection calculée intégrant les créances clients attendues et les échéances fournisseurs/charges à régler.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {overview.historiquePrevisionnel.map(pt => (
                <div key={pt.dateJour} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0062FF' }}>{pt.dateJour}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{pt.date}</div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', marginTop: '6px', color: pt.solde >= 0 ? '#059669' : '#DC2626' }}>
                    {pt.solde.toLocaleString('fr-FR')} F
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 : JOURNAL DES MOUVEMENTS (B.8.2) */}
      {activeTab === 'journal' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Journal Général des Flux de Trésorerie</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Traçabilité intégrale de chaque franc avec calcul automatique du solde après chaque opération
              </p>
            </div>
          </div>

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
                      {m.type === 'ENTREE' ? '+' : m.type === 'SORTIE' ? '−' : ''}{m.montant.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {m.soldeApres.toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3 : ÉCHÉANCIER & PRÉVISIONS 30J (B.8.4) */}
      {activeTab === 'echeances' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Échéancier des Flux à 30 Jours</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Créances clients à recouvrer et dettes fournisseurs / charges à payer
              </p>
            </div>
          </div>

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
                      {ech.type === 'A_ENCAISSER' ? '+' : '−'}{ech.montant.toLocaleString('fr-FR')} FCFA
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
        </div>
      )}

      {/* TAB 4 : GESTION DES COMPTES (B.4) */}
      {activeTab === 'comptes' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Comptes Financiers Actifs</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Ajoutez vos comptes bancaires et portefeuilles Mobile Money pour un suivi centralisé
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddAccountModal(true)}>
              <Plus size={16} />
              <span>Nouveau Compte</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview.comptes.map(acc => (
              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#F8FAFC' }}>
                <div>
                  <strong style={{ fontSize: '1rem', color: '#0F172A' }}>{acc.nom}</strong>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Type : {acc.type} • Solde d'origine : {acc.soldeInitial.toLocaleString('fr-FR')} F</div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0062FF' }}>
                  {acc.soldeActuel.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            ))}
          </div>
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
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Compte concerné</label>
                  <select value={moveCompteId} onChange={e => setMoveCompteId(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                    {overview.comptes.map(a => (
                      <option key={a.id} value={a.id}>{a.nom} (Solde : {a.soldeActuel.toLocaleString('fr-FR')} F)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Catégorie de flux</label>
                  <select value={moveCategorie} onChange={e => setMoveCategorie(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                    {moveType === 'ENTREE' ? (
                      <>
                        <option value="Apport du propriétaire">Apport personnel du propriétaire (Non-CA)</option>
                        <option value="Prêt reçu">Prêt bancaire ou tontine (Non-CA)</option>
                        <option value="Ventes directes">Ventes directes de stock</option>
                        <option value="Autre entrée">Autre entrée exceptionnelle</option>
                      </>
                    ) : (
                      <>
                        <option value="Prélèvement gérant">Prélèvement ration maison gérant (Non-charge)</option>
                        <option value="Achats de marchandises">Achat de marchandises / stock</option>
                        <option value="Loyer">Loyer du local commercial</option>
                        <option value="Salaires / personnel">Salaires / primes équipe</option>
                        <option value="Transport">Transport et fret</option>
                        <option value="Électricité / Eau">Électricité & Eau</option>
                        <option value="Marketing / Publicité">Marketing & Publicité</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Montant (FCFA) *</label>
                  <input type="number" min="1" value={moveMontant} onChange={e => setMoveMontant(Number(e.target.value))} required style={{ fontSize: '1.2rem', fontWeight: 700 }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Libellé explicatif *</label>
                  <input type="text" value={moveLibelle} onChange={e => setMoveLibelle(e.target.value)} required placeholder="Ex: Apport personnel pour achat de 10 sacs de riz" />
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Virement Interne entre Comptes</h3>
              <button onClick={() => setShowVirementModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <form onSubmit={handleVirement}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Règle B.10 : Un virement interne déplace l'argent d'un compte à un autre sans modifier le total de votre trésorerie disponible.
                </p>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Compte Source (Débité)</label>
                  <select value={virSource} onChange={e => setVirSource(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                    {overview.comptes.map(a => (
                      <option key={a.id} value={a.id}>{a.nom} (Solde : {a.soldeActuel.toLocaleString('fr-FR')} F)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Compte Destination (Crédité)</label>
                  <select value={virDest} onChange={e => setVirDest(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                    {overview.comptes.map(a => (
                      <option key={a.id} value={a.id}>{a.nom} (Solde : {a.soldeActuel.toLocaleString('fr-FR')} F)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Montant viré (FCFA) *</label>
                  <input type="number" min="1" value={virMontant} onChange={e => setVirMontant(Number(e.target.value))} required style={{ fontSize: '1.2rem', fontWeight: 700 }} />
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

      {/* MODAL 3 : AJOUT COMPTE */}
      {showAddAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Nouveau Compte Financier</h3>
              <button onClick={() => setShowAddAccountModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>×</button>
            </div>
            <form onSubmit={handleAddAccount}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Nom du compte *</label>
                  <input type="text" value={newAccNom} onChange={e => setNewAccNom(e.target.value)} required placeholder="Ex: Compte Orange Money Marchand" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Type de compte</label>
                  <select value={newAccType} onChange={e => setNewAccType(e.target.value as any)}>
                    <option value="mobile_money">Mobile Money (OM, MTN, Wave)</option>
                    <option value="banque">Compte bancaire</option>
                    <option value="caisse">Caisse secondaire</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>Solde initial (FCFA)</label>
                  <input type="number" min="0" value={newAccSolde} onChange={e => setNewAccSolde(Number(e.target.value))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddAccountModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer le compte</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
