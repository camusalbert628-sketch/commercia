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
  // Check current logged in user first
  const rawUser = localStorage.getItem('commercia_user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const isUserPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && user?.subscription?.status === 'active'));
  const isFreeUser = user && !isUserPro;

  if (isFreeUser) {
    const freeSub: SubscriptionData = {
      id: 'sub-free',
      commerceId: localStorage.getItem('activeBusinessId') || 'bizz-default',
      planId: 'plan-free',
      etat: 'AUCUN',
      periodicite: 'mensuel',
      dateDebutPeriode: new Date().toISOString(),
      dateFinPeriode: new Date(Date.now() + 365 * 86400000).toISOString(),
      essaiUtilise: false,
      resiliationDemandee: false,
      renouvellementAuto: false,
      joursRestants: 0,
    };
    try { localStorage.setItem(SUB_KEY, JSON.stringify(freeSub)); } catch (e) { /* ignore */ }
    return freeSub;
  }

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
          sub.etat = 'EXPIRE';
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

  if (isUserPro) {
    const proSub: SubscriptionData = {
      id: 'sub-user-' + (user?.id || 'active'),
      commerceId: localStorage.getItem('activeBusinessId') || 'bizz-1',
      planId: `plan-${user?.subscription?.planName || 'pro'}`,
      etat: 'ACTIF',
      periodicite: 'mensuel',
      dateDebutPeriode: new Date().toISOString(),
      dateFinPeriode: user?.subscription?.endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      essaiUtilise: true,
      resiliationDemandee: false,
      renouvellementAuto: false,
      joursRestants: user?.subscription?.daysRemaining ?? 30,
    };
    try { localStorage.setItem(SUB_KEY, JSON.stringify(proSub)); } catch (e) { /* ignore */ }
    return proSub;
  }

  // Default clean state: Free account (Plan Gratuit)
  const defaultFreeSub: SubscriptionData = {
    id: 'sub-free',
    commerceId: localStorage.getItem('activeBusinessId') || 'bizz-default',
    planId: 'plan-free',
    etat: 'AUCUN',
    periodicite: 'mensuel',
    dateDebutPeriode: new Date().toISOString(),
    dateFinPeriode: new Date(Date.now() + 365 * 86400000).toISOString(),
    essaiUtilise: false,
    resiliationDemandee: false,
    renouvellementAuto: false,
    joursRestants: 0,
  };
  try { localStorage.setItem(SUB_KEY, JSON.stringify(defaultFreeSub)); } catch (e) { /* ignore */ }
  return defaultFreeSub;
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
  return [];
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
  return [];
}

export function saveAcquisitionChannels(channels: AcquisitionChannel[]) {
  try { localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels)); } catch (e) { /* ignore */ }
}

export function getAcquisitionCampaigns(): AcquisitionCampaign[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return [];
}

// -------------------------------------------------------------
// 3. MODULE B : TRÉSORERIE AVANCÉE & SCÉNARIOS
// -------------------------------------------------------------

// Sanitizes any residual demo data lingering in user browser's localStorage
export function sanitizeLegacyData(): void {
  try {
    const rawAcc = localStorage.getItem(ACCOUNTS_KEY);
    if (rawAcc) {
      const parsed = JSON.parse(rawAcc);
      if (
        Array.isArray(parsed) &&
        parsed.some(
          (a: any) =>
            a.id === 'acc-caisse' ||
            a.id === 'acc-banque' ||
            a.nom === 'Caisse Boutique' ||
            a.nom === 'Compte Pro UBA' ||
            (a.nom?.includes('Boutique') && a.soldeActuel === 200000)
        )
      ) {
        localStorage.removeItem(ACCOUNTS_KEY);
      }
    }

    const rawMvt = localStorage.getItem(MOVEMENTS_KEY);
    if (rawMvt) {
      const parsed = JSON.parse(rawMvt);
      if (
        Array.isArray(parsed) &&
        parsed.some(
          (m: any) =>
            m.numero === 'MVT-001' ||
            m.numero === 'MVT-002' ||
            m.numero === 'MVT-003' ||
            m.libelle?.includes('Apport initial') ||
            m.libelle?.includes('Approvisionnement caisse boutique')
        )
      ) {
        localStorage.removeItem(MOVEMENTS_KEY);
      }
    }

    const rawEch = localStorage.getItem(ECHEANCES_KEY);
    if (rawEch) {
      const parsed = JSON.parse(rawEch);
      if (
        Array.isArray(parsed) &&
        parsed.some(
          (e: any) =>
            e.tiers?.includes('Maman Chantal') ||
            e.id === 'ech-demo-1' ||
            e.id === 'ech-demo-2'
        )
      ) {
        localStorage.removeItem(ECHEANCES_KEY);
      }
    }

    const rawReceipts = localStorage.getItem(RECEIPTS_KEY);
    if (rawReceipts) {
      const parsed = JSON.parse(rawReceipts);
      if (
        Array.isArray(parsed) &&
        parsed.some((r: any) => r.id === 'rcpt-demo-1' || r.numero === 'REC-2026-1042')
      ) {
        localStorage.removeItem(RECEIPTS_KEY);
      }
    }
  } catch (_) {
    // Ignore any json parse error
  }
}

function getAccountsKey(): string {
  const bizId = localStorage.getItem('activeBusinessId') || 'default';
  return `${ACCOUNTS_KEY}_${bizId}`;
}

function getMovementsKey(): string {
  const bizId = localStorage.getItem('activeBusinessId') || 'default';
  return `${MOVEMENTS_KEY}_${bizId}`;
}

function getEcheancesKey(): string {
  const bizId = localStorage.getItem('activeBusinessId') || 'default';
  return `${ECHEANCES_KEY}_${bizId}`;
}

export function getTreasuryAccounts(): TreasuryAccount[] {
  sanitizeLegacyData();
  try {
    const key = getAccountsKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (a: any) => a.id !== 'acc-caisse' && a.id !== 'acc-banque' && a.nom !== 'Caisse Boutique'
        );
      }
    }
  } catch (e) { /* ignore */ }
  return [];
}

export function saveTreasuryAccounts(accs: TreasuryAccount[]) {
  try {
    const key = getAccountsKey();
    localStorage.setItem(key, JSON.stringify(accs));
  } catch (e) { /* ignore */ }
}

export function getTreasuryMovements(): TreasuryMovement[] {
  sanitizeLegacyData();
  try {
    const key = getMovementsKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (m: any) => !m.numero?.startsWith('MVT-001') && !m.libelle?.includes('Apport initial')
        );
      }
    }
  } catch (e) { /* ignore */ }
  return [];
}

export function saveTreasuryMovements(mvs: TreasuryMovement[]) {
  try {
    const key = getMovementsKey();
    localStorage.setItem(key, JSON.stringify(mvs));
  } catch (e) { /* ignore */ }
}

export function getTreasuryEcheances(): TreasuryEcheance[] {
  sanitizeLegacyData();
  try {
    const key = getEcheancesKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((e: any) => !e.tiers?.includes('Maman Chantal'));
      }
    }
  } catch (e) { /* ignore */ }
  return [];
}

export function saveTreasuryEcheances(echs: TreasuryEcheance[]) {
  try {
    const key = getEcheancesKey();
    localStorage.setItem(key, JSON.stringify(echs));
  } catch (e) { /* ignore */ }
}

export function calculateTreasuryOverview(): TreasuryOverview {
  sanitizeLegacyData();
  const accounts = getTreasuryAccounts();
  const echeances = getTreasuryEcheances();
  const movements = getTreasuryMovements();

  const tresorerieDisponible = accounts
    .filter(a => a.actif)
    .reduce((sum, a) => sum + (Number(a.soldeActuel) || 0), 0);

  // Daily average expenses strictly based on real recorded outflows
  const operatingOutflows = movements
    .filter(m => m.type === 'SORTIE')
    .reduce((sum, m) => sum + Number(m.montant || 0), 0);

  const depensesMoyennesJour = operatingOutflows > 0 ? Math.round(operatingOutflows / 30) : 0;
  const autonomieJours =
    depensesMoyennesJour > 0 && tresorerieDisponible > 0
      ? Math.floor(tresorerieDisponible / depensesMoyennesJour)
      : null;

  // Expected 30 days inflows & outflows
  const entreesAttendues30j = echeances
    .filter(e => e.type === 'A_ENCAISSER' && e.statut === 'en_attente')
    .reduce((sum, e) => sum + Number(e.montant), 0);

  const sortiesPrevues30j = echeances
    .filter(e => e.type === 'A_PAYER' && e.statut === 'en_attente')
    .reduce((sum, e) => sum + Number(e.montant), 0);

  const tresoreriePrevue30j = tresorerieDisponible + entreesAttendues30j - sortiesPrevues30j;

  // Result of current month
  const resultatMois = movements.reduce((acc, m) => {
    if (!m.imputableResultat) return acc;
    return m.type === 'ENTREE' ? acc + m.montant : acc - m.montant;
  }, 0);

  // Status Badge Evaluation
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
    accounts.length === 0
      ? 'Aucun compte financier configuré. Ajoutez votre premier compte (Caisse, Banque ou Mobile Money) pour activer le suivi.'
      : autonomieJours !== null
        ? `Vous pouvez tenir environ ${autonomieJours} jours au rythme actuel de vos dépenses.`
        : 'Trésorerie disponible sans historique de charges régulières.';

  // 30-day forecast simulation only generated when accounts exist
  const historiquePrevisionnel: Array<{ date: string; solde: number; dateJour: string }> = [];
  if (accounts.length > 0) {
    const runningSolde = tresorerieDisponible;
    for (let i = 0; i <= 30; i += 5) {
      const d = new Date(Date.now() + i * 86400000);
      const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      historiquePrevisionnel.push({
        date: dateStr,
        solde: runningSolde,
        dateJour: `J+${i}`,
      });
    }
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

