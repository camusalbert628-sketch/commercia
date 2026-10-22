// COMMERCIA Premium Modules & Subscription Engine Types
// Conforms strictly to Cahier des charges v2 Premium & Cahier des charges Abonnements

export type SubscriptionState = 'AUCUN' | 'ESSAI' | 'ACTIF' | 'GRACE' | 'EXPIRE' | 'RESILIE';

export interface PlanData {
  id: string;
  code: string;
  nom: string;
  actif: boolean;
  prixMensuel: number;
  prixAnnuel: number;
  devise: string;
  droits: string[];
}

export interface SubscriptionData {
  id: string;
  commerceId: string;
  planId: string;
  etat: SubscriptionState;
  periodicite: 'mensuel' | 'annuel';
  dateDebutPeriode: string;
  dateFinPeriode: string;
  essaiUtilise: boolean;
  dateFinEssai?: string;
  resiliationDemandee: boolean;
  dateResiliation?: string;
  renouvellementAuto: boolean;
  joursRestants: number;
  joursGraceRestants?: number;
  lectureSeuleJoursRestants?: number;
}

export interface PaymentReceipt {
  id: string;
  numero: string;
  date: string;
  commerceNom: string;
  planNom: string;
  montant: number;
  devise: string;
  periodeCouverte: string;
  moyenPaiement: string;
  reference: string;
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'pourcentage' | 'montant' | 'mois_offerts';
  valeur: number;
  dateDebut: string;
  dateFin: string;
  usagesMax: number;
  usagesActuels: number;
  plansConcernes: string[];
}

// -------------------------------------------------------------
// MODULE A : CROISSANCE CLIENTS & CAC
// -------------------------------------------------------------

export interface AcquisitionChannel {
  id: string;
  nom: string;
  estOrganique: boolean;
  estFacebook: boolean;
  actif: boolean;
  ordre: number;
  seuilCacManuel?: number | null;
  // Metrics calculated for period
  budget: number;
  contacts: number;
  conversationsWhatsapp: number;
  devisCommandes: number;
  clientsConvertis: number;
  cac: number | null;
  tauxConversion: number | null;
  panierMoyen: number;
  margeBruteGeneree: number;
  rentabilite: number;
  tauxClientsRevenus: number;
  statut: 'DONNEES_INSUFFISANTES' | 'RENTABLE' | 'A_OPTIMISER' | 'NON_RENTABLE';
  seuilCacEffectif: number;
}

export interface AcquisitionCampaign {
  id: string;
  nom: string;
  plateforme: 'Facebook' | 'Instagram' | 'TikTok' | 'Autre';
  dateDebut: string;
  dateFin?: string;
  objectif?: string;
  statut: 'active' | 'en_pause' | 'terminee';
  budgetTotal: number;
  contactsTotal: number;
  clientsConvertis: number;
  cac: number | null;
}

// -------------------------------------------------------------
// MODULE B : TRÉSORERIE AVANCÉE & SCÉNARIOS
// -------------------------------------------------------------

export interface TreasuryAccount {
  id: string;
  nom: string;
  type: 'caisse' | 'banque' | 'mobile_money';
  operateur?: 'Orange Money' | 'MTN MoMo' | 'Wave' | 'Autre';
  soldeInitial: number;
  soldeActuel: number;
  actif: boolean;
}

export interface TreasuryMovement {
  id: string;
  numero: string;
  date: string;
  compteId: string;
  compteNom: string;
  type: 'ENTREE' | 'SORTIE' | 'VIREMENT';
  nature: 'charge_fixe' | 'charge_variable' | 'acquisition' | 'investissement' | 'non_operationnel' | 'autre';
  categorie: string;
  montant: number;
  libelle: string;
  compteDestinationId?: string;
  compteDestinationNom?: string;
  modePaiement: 'especes' | 'mobile_money' | 'virement' | 'cheque' | 'carte' | 'autre';
  reference?: string;
  origine: 'MANUEL' | 'VENTE' | 'DEPENSE';
  origineId?: string;
  imputableResultat: boolean; // false for Owner withdrawals, Owner deposits, Loans
  soldeApres: number;
  commentaire?: string;
}

export interface TreasuryEcheance {
  id: string;
  type: 'A_ENCAISSER' | 'A_PAYER';
  tiers: string;
  libelle: string;
  montant: number;
  dateEcheance: string;
  recurrence: 'aucune' | 'hebdo' | 'mensuelle' | 'annuelle';
  statut: 'en_attente' | 'reglee' | 'annulee';
  lienVenteId?: string;
  lienDepenseId?: string;
}

export type TreasuryStatusBadge =
  | 'NON_INITIALISEE'
  | 'SOLDE_NEGATIF'
  | 'MANQUE_ARGENT_PREVU'
  | 'AUTONOMIE_CRITIQUE'
  | 'AUTONOMIE_SURVEILLER'
  | 'TRESORERIE_SAINE';

export interface TreasuryOverview {
  tresorerieDisponible: number;
  depensesMoyennesJour: number;
  autonomieJours: number | null;
  entreesAttendues30j: number;
  sortiesPrevues30j: number;
  tresoreriePrevue30j: number;
  partCapitalConsommee?: number;
  resultatMois: number;
  statutBadge: TreasuryStatusBadge;
  phraseLecture: string;
  comptes: TreasuryAccount[];
  prochainesEcheances: TreasuryEcheance[];
  historiquePrevisionnel: Array<{ date: string; solde: number; dateJour: string }>;
}
