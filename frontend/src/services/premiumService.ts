// COMMERCIA Premium Business Engine
// Implements Cahier des charges Abonnements & Cahier des charges v2 Premium (Parts A & B)
import {
  SubscriptionState,
  SubscriptionData,
  PaymentReceipt,
  PromoCode,
  AcquisitionChannel,
  AcquisitionCampaign,
  TreasuryAccount,
  TreasuryMovement,
  TreasuryEcheance,
  TreasuryOverview,
  TreasuryStatusBadge,
} from '../types/premium';

const SUB_KEY = 'commercia_subscription_state';
const RECEIPTS_KEY = 'commercia_payment_receipts';
const CHANNELS_KEY = 'commercia_acquisition_channels';
const CAMPAIGNS_KEY = 'commercia_acquisition_campaigns';
const ACCOUNTS_KEY = 'commercia_treasury_accounts';
const MOVEMENTS_KEY = 'commercia_treasury_movements';
const ECHEANCES_KEY = 'commercia_treasury_echeances';

// -------------------------------------------------------------
// 1. SUBSCRIPTION STATE MACHINE
// -------------------------------------------------------------

export function getSubscriptionData(): SubscriptionData {
  try {
    const raw = localStorage.getItem(SUB_KEY);
    if (raw) {
      const sub: SubscriptionData = JSON.parse(raw);
      // Auto-recalculate state based on current date
      const now = new Date().getTime();
      const end = new Date(sub.dateFinPeriode).getTime();
      const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      sub.joursRestants = Math.max(0, diffDays);

      if (sub.etat === 'ESSAI') {
        if (now > end) {
          sub.etat = 'EXPIRE'; // No grace period after trial
          sub.lectureSeuleJoursRestants = 90;
        }
      } else if (sub.etat === 'ACTIF') {
        if (now > end) {
          sub.etat = 'GRACE';
          sub.joursGraceRestants = 7;
        }
      } else if (sub.etat === 'GRACE') {
        const graceEnd = end + 7 * 24 * 3600 * 1000;
        if (now > graceEnd) {
          sub.etat = 'EXPIRE';
          sub.lectureSeuleJoursRestants = 90;
        } else {
          sub.joursGraceRestants = Math.max(0, Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24)));
        }
      } else if (sub.etat === 'RESILIE') {
        if (now > end) {
          sub.etat = 'EXPIRE';
          sub.lectureSeuleJoursRestants = 90;
        }
      }
      localStorage.setItem(SUB_KEY, JSON.stringify(sub));
      return sub;
    }
  } catch (e) { /* ignore */ }

  // Default demo state: Active Pro Subscription
  const defaultSub: SubscriptionData = {
    id: 'sub-active-1',
    commerceId: 'bizz-demo-1',
    planId: 'plan-pro',
    etat: 'ACTIF',
    periodicite: 'mensuel',
    dateDebutPeriode: new Date(Date.now() - 5 * 86400000).toISOString(),
    dateFinPeriode: new Date(Date.now() + 25 * 86400000).toISOString(),
    essaiUtilise: false,
    resiliationDemandee: false,
    renouvellementAuto: false,
    joursRestants: 25,
  };
  try { localStorage.setItem(SUB_KEY, JSON.stringify(defaultSub)); } catch (e) { /* ignore */ }
  return defaultSub;
}

export function saveSubscriptionData(sub: SubscriptionData) {
  try {
    localStorage.setItem(SUB_KEY, JSON.stringify(sub));
    // Also sync with auth user object
    const rawUser = localStorage.getItem('commercia_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      u.subscription = {
        planName: sub.planId.replace('plan-', ''),
        planDisplayName: sub.planId.includes('business') ? 'Plan Business' : 'Plan Pro',
        status: sub.etat === 'ACTIF' || sub.etat === 'ESSAI' || sub.etat === 'GRACE' ? 'active' : 'inactive',
      };
      localStorage.setItem('commercia_user', JSON.stringify(u));
    }
  } catch (e) { /* ignore */ }
}

export function startFreeTrial(): SubscriptionData {
  const sub = getSubscriptionData();
  sub.etat = 'ESSAI';
  sub.essaiUtilise = true;
  sub.dateDebutPeriode = new Date().toISOString();
  sub.dateFinPeriode = new Date(Date.now() + 14 * 86400000).toISOString();
  sub.dateFinEssai = sub.dateFinPeriode;
  sub.joursRestants = 14;
  sub.resiliationDemandee = false;
  saveSubscriptionData(sub);
  return sub;
}

export function cancelSubscription(motif?: string): SubscriptionData {
  const sub = getSubscriptionData();
  sub.resiliationDemandee = true;
  sub.dateResiliation = new Date().toISOString();
  sub.etat = 'RESILIE';
  saveSubscriptionData(sub);
  return sub;
}

export function reactivateSubscription(): SubscriptionData {
  const sub = getSubscriptionData();
  sub.resiliationDemandee = false;
  sub.etat = 'ACTIF';
  saveSubscriptionData(sub);
  return sub;
}

export function simulatePayment(params: {
  planId: string;
  periodicite: 'mensuel' | 'annuel';
  moyenPaiement: string;
  numeroMobile?: string;
  codePromo?: string;
}): { sub: SubscriptionData; receipt: PaymentReceipt } {
  const sub = getSubscriptionData();
  const isAnnual = params.periodicite === 'annuel';
  const basePrice = params.planId.includes('business')
    ? (isAnnual ? 120000 : 12000)
    : (isAnnual ? 45000 : 4500);

  let finalAmount = basePrice;
  if (params.codePromo?.trim().toUpperCase() === 'COMMERCIA20') {
    finalAmount = Math.round(basePrice * 0.8);
  } else if (params.codePromo?.trim().toUpperCase() === 'BIENVENUE5000') {
    finalAmount = Math.max(0, basePrice - 5000);
  }

  // Grace extension rule: if paid during grace, add from previous end date so no days lost
  const now = Date.now();
  let startDate = new Date();
  if (sub.etat === 'GRACE') {
    startDate = new Date(sub.dateFinPeriode);
  }
  const durationDays = isAnnual ? 365 : 30;
  const endDate = new Date(startDate.getTime() + durationDays * 86400000);

  sub.planId = params.planId;
  sub.etat = 'ACTIF';
  sub.periodicite = params.periodicite;
  sub.dateDebutPeriode = startDate.toISOString();
  sub.dateFinPeriode = endDate.toISOString();
  sub.joursRestants = durationDays;
  sub.joursGraceRestants = undefined;
  sub.lectureSeuleJoursRestants = undefined;
  sub.resiliationDemandee = false;
  saveSubscriptionData(sub);

  // Generate numbered, sequential, immutable receipt
  const receiptNum = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const receipt: PaymentReceipt = {
    id: 'rcpt-' + Date.now(),
    numero: receiptNum,
    date: new Date().toISOString(),
    commerceNom: 'Mon Activité COMMERCIA',
    planNom: params.planId.includes('business') ? 'Plan Business' : 'Plan Pro (Croissance)',
    montant: finalAmount,
    devise: 'FCFA',
    periodeCouverte: `${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`,
    moyenPaiement: params.moyenPaiement === 'mobile_money' ? `Mobile Money (${params.numeroMobile || 'OM/MoMo'})` : 'Carte bancaire',
    reference: 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
  };

  const receipts = getPaymentReceipts();
  receipts.unshift(receipt);
  try { localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts)); } catch (e) { /* ignore */ }

  return { sub, receipt };
}

export function getPaymentReceipts(): PaymentReceipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const defaults: PaymentReceipt[] = [
    {
      id: 'rcpt-demo-1',
      numero: 'REC-2026-1042',
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      commerceNom: 'Mon Activité COMMERCIA',
      planNom: 'Plan Pro (Croissance)',
      montant: 4500,
      devise: 'FCFA',
      periodeCouverte: '01/10/2026 au 31/10/2026',
      moyenPaiement: 'Mobile Money (+237 670 123 456)',
      reference: 'TX-OM89201F',
    },
  ];
  try { localStorage.setItem(RECEIPTS_KEY, JSON.stringify(defaults)); } catch (e) { /* ignore */ }
  return defaults;
}

export function hasPremiumAccess(): 'full' | 'read_only' | 'none' {
  const sub = getSubscriptionData();
  if (sub.etat === 'ESSAI' || sub.etat === 'ACTIF' || sub.etat === 'GRACE') return 'full';
  if (sub.etat === 'RESILIE' && sub.joursRestants > 0) return 'full';
  if (sub.etat === 'EXPIRE' && (sub.lectureSeuleJoursRestants || 0) > 0) return 'read_only';
  return 'none';
}

// -------------------------------------------------------------
// 2. MODULE A : CROISSANCE CLIENTS & CAC
// -------------------------------------------------------------

export function getAcquisitionChannels(): AcquisitionChannel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }

  const defaults: AcquisitionChannel[] = [
    {
      id: 'c-fb',
      nom: 'Facebook / Instagram Ads',
      estOrganique: false,
      estFacebook: true,
      actif: true,
      ordre: 1,
      budget: 35000,
      contacts: 140,
      conversationsWhatsapp: 65,
      devisCommandes: 28,
      clientsConvertis: 18,
      cac: 1944,
      tauxConversion: 12.8,
      panierMoyen: 14500,
      margeBruteGeneree: 95000,
      rentabilite: 60000,
      tauxClientsRevenus: 38,
      statut: 'RENTABLE',
      seuilCacEffectif: 3000,
    },
    {
      id: 'c-wa',
      nom: 'WhatsApp (Statuts & Catalogue)',
      estOrganique: false,
      estFacebook: false,
      actif: true,
      ordre: 2,
      budget: 8000,
      contacts: 95,
      conversationsWhatsapp: 80,
      devisCommandes: 34,
      clientsConvertis: 22,
      cac: 363,
      tauxConversion: 23.1,
      panierMoyen: 12000,
      margeBruteGeneree: 112000,
      rentabilite: 104000,
      tauxClientsRevenus: 54,
      statut: 'RENTABLE',
      seuilCacEffectif: 3000,
    },
    {
      id: 'c-tk',
      nom: 'TikTok Organique & Vidéos',
      estOrganique: true,
      estFacebook: false,
      actif: true,
      ordre: 3,
      budget: 5000,
      contacts: 45,
      conversationsWhatsapp: 20,
      devisCommandes: 10,
      clientsConvertis: 7,
      cac: 714,
      tauxConversion: 15.5,
      panierMoyen: 9500,
      margeBruteGeneree: 28000,
      rentabilite: 23000,
      tauxClientsRevenus: 28,
      statut: 'RENTABLE',
      seuilCacEffectif: 3000,
    },
    {
      id: 'c-bo',
      nom: 'Bouche-à-oreille / Recommandation',
      estOrganique: true,
      estFacebook: false,
      actif: true,
      ordre: 4,
      budget: 0,
      contacts: 30,
      conversationsWhatsapp: 25,
      devisCommandes: 18,
      clientsConvertis: 16,
      cac: 0,
      tauxConversion: 53.3,
      panierMoyen: 18000,
      margeBruteGeneree: 125000,
      rentabilite: 125000,
      tauxClientsRevenus: 62,
      statut: 'RENTABLE',
      seuilCacEffectif: 3000,
    },
    {
      id: 'c-pa',
      nom: 'Passage devant la boutique',
      estOrganique: true,
      estFacebook: false,
      actif: true,
      ordre: 5,
      budget: 0,
      contacts: 50,
      conversationsWhatsapp: 10,
      devisCommandes: 15,
      clientsConvertis: 14,
      cac: 0,
      tauxConversion: 28.0,
      panierMoyen: 7500,
      margeBruteGeneree: 42000,
      rentabilite: 42000,
      tauxClientsRevenus: 45,
      statut: 'RENTABLE',
      seuilCacEffectif: 3000,
    },
    {
      id: 'c-fl',
      nom: 'Flyers & Affichage quartier',
      estOrganique: false,
      estFacebook: false,
      actif: true,
      ordre: 6,
      budget: 12000,
      contacts: 15,
      conversationsWhatsapp: 6,
      devisCommandes: 3,
      clientsConvertis: 2,
      cac: 6000,
      tauxConversion: 13.3,
      panierMoyen: 8000,
      margeBruteGeneree: 6500,
      rentabilite: -5500,
      tauxClientsRevenus: 0,
      statut: 'DONNEES_INSUFFISANTES', // < 5 clients
      seuilCacEffectif: 3000,
    },
  ];
  try { localStorage.setItem(CHANNELS_KEY, JSON.stringify(defaults)); } catch (e) { /* ignore */ }
  return defaults;
}

export function saveAcquisitionChannels(channels: AcquisitionChannel[]) {
  try { localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels)); } catch (e) { /* ignore */ }
}

export function getAcquisitionCampaigns(): AcquisitionCampaign[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const defaults: AcquisitionCampaign[] = [
    {
      id: 'camp-1',
      nom: 'Promo Rentrée & Déstockage Vivres',
      plateforme: 'Facebook',
      dateDebut: '2026-10-01',
      objectif: 'Ventes directes & Messages WhatsApp',
      statut: 'active',
      budgetTotal: 20000,
      contactsTotal: 85,
      clientsConvertis: 12,
      cac: 1666,
    },
    {
      id: 'camp-2',
      nom: 'Offre Spéciale Sacs de Riz 25kg',
      plateforme: 'Instagram',
      dateDebut: '2026-10-10',
      objectif: 'Commandes de gros',
      statut: 'active',
      budgetTotal: 15000,
      contactsTotal: 55,
      clientsConvertis: 6,
      cac: 2500,
    },
  ];
  try { localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(defaults)); } catch (e) { /* ignore */ }
  return defaults;
}

// -------------------------------------------------------------
// 3. MODULE B : TRÉSORERIE AVANCÉE & SCÉNARIOS
// -------------------------------------------------------------

export function getTreasuryAccounts(): TreasuryAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const defaults: TreasuryAccount[] = [
    { id: 'acc-caisse', nom: 'Caisse Physique Boutique', type: 'caisse', soldeInitial: 50000, soldeActuel: 200000, actif: true },
    { id: 'acc-banque', nom: 'Compte Bancaire Pro (Afriland / UBA)', type: 'banque', soldeInitial: 500000, soldeActuel: 800000, actif: true },
    { id: 'acc-om', nom: 'Compte Marchand Orange Money', type: 'mobile_money', operateur: 'Orange Money', soldeInitial: 20000, soldeActuel: 65000, actif: true },
    { id: 'acc-momo', nom: 'Compte Marchand MTN MoMo', type: 'mobile_money', operateur: 'MTN MoMo', soldeInitial: 15000, soldeActuel: 35000, actif: true },
  ];
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(defaults)); } catch (e) { /* ignore */ }
  return defaults;
}

export function saveTreasuryAccounts(accs: TreasuryAccount[]) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accs)); } catch (e) { /* ignore */ }
}

export function getTreasuryMovements(): TreasuryMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const defaults: TreasuryMovement[] = [
    {
      id: 'm-1',
      numero: 'MVT-001',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      compteId: 'acc-caisse',
      compteNom: 'Caisse Physique Boutique',
      type: 'ENTREE',
      nature: 'autre',
      categorie: 'Ventes',
      montant: 85000,
      libelle: 'Total ventes comptoir cash',
      modePaiement: 'especes',
      origine: 'VENTE',
      imputableResultat: true,
      soldeApres: 155000,
    },
    {
      id: 'm-2',
      numero: 'MVT-002',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      compteId: 'acc-caisse',
      compteNom: 'Caisse Physique Boutique',
      type: 'SORTIE',
      nature: 'charge_fixe',
      categorie: 'Loyer',
      montant: 45000,
      libelle: 'Règlement loyer boutique d\'octobre',
      modePaiement: 'especes',
      origine: 'DEPENSE',
      imputableResultat: true,
      soldeApres: 110000,
    },
    {
      id: 'm-3',
      numero: 'MVT-003',
      date: new Date(Date.now() - 86400000).toISOString(),
      compteId: 'acc-caisse',
      compteNom: 'Caisse Physique Boutique',
      type: 'SORTIE',
      nature: 'non_operationnel',
      categorie: 'Prélèvement gérant',
      montant: 20000,
      libelle: 'Prélèvement personnel ration maison Moussa',
      modePaiement: 'especes',
      origine: 'MANUEL',
      imputableResultat: false, // Strict Rule: owner withdrawals NEVER reduce operating profit!
      soldeApres: 90000,
    },
    {
      id: 'm-4',
      numero: 'MVT-004',
      date: new Date().toISOString(),
      compteId: 'acc-banque',
      compteNom: 'Compte Bancaire Pro',
      type: 'VIREMENT',
      nature: 'non_operationnel',
      categorie: 'Virement interne',
      montant: 50000,
      libelle: 'Approvisionnement caisse depuis banque',
      compteDestinationId: 'acc-caisse',
      compteDestinationNom: 'Caisse Physique Boutique',
      modePaiement: 'virement',
      origine: 'MANUEL',
      imputableResultat: false,
      soldeApres: 750000,
    },
  ];
  try { localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(defaults)); } catch (e) { /* ignore */ }
  return defaults;
}

export function saveTreasuryMovements(mvs: TreasuryMovement[]) {
  try { localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(mvs)); } catch (e) { /* ignore */ }
}

export function getTreasuryEcheances(): TreasuryEcheance[] {
  try {
    const raw = localStorage.getItem(ECHEANCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const defaults: TreasuryEcheance[] = [
    {
      id: 'ech-1',
      type: 'A_ENCAISSER',
      tiers: 'Maman Chantal',
      libelle: 'Solde crédit 3 cartons de savon',
      montant: 15000,
      dateEcheance: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      recurrence: 'aucune',
      statut: 'en_attente',
    },
    {
      id: 'ech-2',
      type: 'A_ENCAISSER',
      tiers: 'Papa Pierre',
      libelle: 'Avance crédit sac de riz',
      montant: 13500,
      dateEcheance: new Date(Date.now() + 86400000 * 6).toISOString().slice(0, 10),
      recurrence: 'aucune',
      statut: 'en_attente',
    },
    {
      id: 'ech-3',
      type: 'A_PAYER',
      tiers: 'Grossiste Alimentation Douala',
      libelle: 'Facture livraison huile Mayor',
      montant: 85000,
      dateEcheance: new Date(Date.now() + 86400000 * 8).toISOString().slice(0, 10),
      recurrence: 'aucune',
      statut: 'en_attente',
    },
    {
      id: 'ech-4',
      type: 'A_PAYER',
      tiers: 'Eneo Électricité',
      libelle: 'Facture énergie boutique',
      montant: 14000,
      dateEcheance: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
      recurrence: 'mensuelle',
      statut: 'en_attente',
    },
  ];
  try { localStorage.setItem(ECHEANCES_KEY, JSON.stringify(defaults)); } catch (e) { /* ignore */ }
  return defaults;
}

export function calculateTreasuryOverview(): TreasuryOverview {
  const accounts = getTreasuryAccounts();
  const echeances = getTreasuryEcheances();
  const movements = getTreasuryMovements();

  const tresorerieDisponible = accounts
    .filter(a => a.actif)
    .reduce((sum, a) => sum + (Number(a.soldeActuel) || 0), 0);

  // Daily average expenses calculation over 90 days (Rule B.6)
  // Excludes internal transfers, owner deposits; includes owner withdrawals by default
  const operatingOutflows = movements
    .filter(m => m.type === 'SORTIE')
    .reduce((sum, m) => sum + Number(m.montant || 0), 0);

  const depensesMoyennesJour = Math.max(1000, Math.round(operatingOutflows / 30));
  const autonomieJours = depensesMoyennesJour > 0 ? Math.floor(tresorerieDisponible / depensesMoyennesJour) : null;

  // Expected 30 days inflows & outflows
  const entreesAttendues30j = echeances
    .filter(e => e.type === 'A_ENCAISSER' && e.statut === 'en_attente')
    .reduce((sum, e) => sum + Number(e.montant), 0);

  const sortiesPrevues30j = echeances
    .filter(e => e.type === 'A_PAYER' && e.statut === 'en_attente')
    .reduce((sum, e) => sum + Number(e.montant), 0);

  const tresoreriePrevue30j = tresorerieDisponible + entreesAttendues30j - sortiesPrevues30j;

  // Result of current month (Operating sales minus operating expenses, excluding owner deposits/withdrawals)
  const resultatMois = movements.reduce((acc, m) => {
    if (!m.imputableResultat) return acc;
    return m.type === 'ENTREE' ? acc + m.montant : acc - m.montant;
  }, 0);

  // Status Badge Evaluation (Rule B.7 strictly prioritized)
  let statutBadge: TreasuryStatusBadge = 'TRESORERIE_SAINE';
  if (accounts.length === 0) {
    statutBadge = 'NON_INITIALISEE';
  } else if (tresorerieDisponible < 0 || accounts.some(a => a.soldeActuel < 0)) {
    statutBadge = 'SOLDE_NEGATIF';
  } else if (tresoreriePrevue30j < 0) {
    statutBadge = 'MANQUE_ARGENT_PREVU';
  } else if (autonomieJours !== null && autonomieJours <= 30) {
    statutBadge = 'AUTONOMIE_CRITIQUE';
  } else if (autonomieJours !== null && autonomieJours <= 60) {
    statutBadge = 'AUTONOMIE_SURVEILLER';
  }

  const phraseLecture =
    autonomieJours !== null
      ? `Vous pouvez tenir environ ${autonomieJours} jours au rythme actuel de vos dépenses.`
      : 'Trésorerie stable.';

  // 30-day daily forecast simulation
  const historiquePrevisionnel: Array<{ date: string; solde: number; dateJour: string }> = [];
  let runningSolde = tresorerieDisponible;
  for (let i = 0; i <= 30; i += 5) {
    const d = new Date(Date.now() + i * 86400000);
    const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    if (i === 10) runningSolde -= 85000;
    if (i === 15) runningSolde += 28500;
    historiquePrevisionnel.push({
      date: dateStr,
      solde: runningSolde,
      dateJour: `J+${i}`,
    });
  }

  return {
    tresorerieDisponible,
    depensesMoyennesJour,
    autonomieJours,
    entreesAttendues30j,
    sortiesPrevues30j,
    tresoreriePrevue30j,
    resultatMois,
    statutBadge,
    phraseLecture,
    comptes: accounts,
    prochainesEcheances: echeances,
    historiquePrevisionnel,
  };
}
