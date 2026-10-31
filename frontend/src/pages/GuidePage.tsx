import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Zap,
  HandMetal,
  Lightbulb,
  Printer,
  ChevronRight,
  ShoppingCart,
  Wallet,
  Boxes,
  Truck,
  Landmark,
  Users,
  Package,
  TrendingDown,
  TrendingUp,
  Bot,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Store,
  Utensils,
  Wrench,
  Smartphone,
  BarChart3,
  Sparkles,
  Scissors,
  SlidersHorizontal,
  Check,
  Clock,
  Compass,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import {
  BUSINESS_PROFILES,
  BUSINESS_FAMILIES,
  BusinessProfileFamily,
  getBusinessProfile,
  getProfilesGroupedByFamily,
} from '../config/businessProfiles';
import { getBusinessDayScenario } from '../config/businessDayScenarios';
import { TradeConfigModal } from '../components/common/TradeConfigModal';

interface GuideSection {
  id: string;
  title: string;
  category: string;
  icon: any;
  route: string;
  badge: string;
  badgeColor: string;
  summary: string;
  whyCrucial: string;
  howToSteps: string[];
  autoDomino: string[];
  manualRole: string[];
  realExample: string;
  pitfallsToAvoid: string[];
}

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeBusinessId, updateUser } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currentActiveProfile = getBusinessProfile(activeBusiness?.profileId || 'epicerie_alimentation');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSectionId, setActiveSectionId] = useState<string>('intro');

  // État de l'immersion métier
  const [selectedTradeId, setSelectedTradeId] = useState<string>(activeBusiness?.profileId || 'epicerie_alimentation');
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('all');
  const [showTradeModal, setShowTradeModal] = useState<boolean>(false);
  const [applyingProfile, setApplyingProfile] = useState<boolean>(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const selectedProfileConfig = getBusinessProfile(selectedTradeId);
  const selectedDayScenario = getBusinessDayScenario(selectedTradeId);

  const handleApplyProfileDirectly = async (profileId: string) => {
    setApplyingProfile(true);
    setApplyMessage(null);
    try {
      const prof = getBusinessProfile(profileId);
      await api.put('/business/profile', {
        profileId,
        currency: activeBusiness?.currency || 'FCFA',
        trackingMode: prof.defaultTrackingMode || 'avec_stock',
        activeModules: prof.recommendedModules,
      });

      if (user) {
        const updatedBusinesses = (user.businesses || []).map((b: any) => {
          if (b.id === activeBusiness?.id) {
            return {
              ...b,
              profileId,
              trackingMode: prof.defaultTrackingMode || 'avec_stock',
              activeModules: prof.recommendedModules,
            };
          }
          return b;
        });
        updateUser({ businesses: updatedBusinesses });
      }

      setApplyMessage(`Succès ! Votre boutique est désormais personnalisée pour : ${prof.name} !`);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err: any) {
      setApplyMessage(err.response?.data?.message || 'Erreur lors de l\'application du profil.');
    } finally {
      setApplyingProfile(false);
    }
  };

  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      setActiveSectionId(hash);
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const SECTIONS: GuideSection[] = [
    {
      id: 'dashboard',
      title: 'Tableau de Bord : La Tour de Contrôle Financière',
      category: 'pilotage',
      icon: Layers,
      route: '/dashboard',
      badge: 'GRATUIT',
      badgeColor: '#10B981',
      summary: 'Vue synthétique en direct de votre santé financière, de vos encaissements et de vos alertes critiques.',
      whyCrucial: 'Sans tableau de bord, vous pilotez votre entreprise les yeux fermés. Il vous évite de devoir recalculer vos chiffres en fin de journée et vous prévient instantanément si vos charges dépassent vos ventes.',
      howToSteps: [
        'Consultez vos 4 KPIs du jour dès votre connexion : Chiffre d\'affaires encaissé, Bénéfice net estimé, Espèces en caisse et Total des crédits dehors.',
        'Observez la courbe d\'évolution sur 7 jours pour identifier vos meilleurs jours de vente.',
        'Agissez immédiatement sur les alertes en rouge (ruptures imminentes de stock, clients en retard de paiement).',
      ],
      autoDomino: [
        'Chaque vente validée met à jour le chiffre d\'affaires et le bénéfice net en direct.',
        'Toute dépense enregistrée réduit instantanément la marge nette du jour.',
        'La caisse journalière et les créances clients sont synchronisées en continu.',
      ],
      manualRole: [
        'Consulter le tableau au moins 2 fois par jour (à midi et le soir).',
        'Cliquer sur les boutons d\'action rapide pour réapprovisionner ou relancer les clients.',
      ],
      realExample: 'À 14h, le tableau affiche 120 000 F de ventes et 25 000 F de charges. Bénéfice net en direct = +95 000 F. Une alerte signale que le stock de pantalons noirs est tombé à 2 pièces : vous pouvez lancer votre commande fournisseur avant la rupture.',
      pitfallsToAvoid: [
        'Ne regarder que le Chiffre d\'Affaires : un CA élevé avec des dépenses incontrôlées peut cacher une perte sèche.',
        'Ignorer les alertes oranges et rouges jusqu\'à la fin du mois.',
      ],
    },
    {
      id: 'sales',
      title: 'Ventes & Encaissements : La Vitesse au Comptoir',
      category: 'pilotage',
      icon: ShoppingCart,
      route: '/sales',
      badge: 'GRATUIT',
      badgeColor: '#10B981',
      summary: 'Enregistrez vos ventes en 10 secondes avec calcul automatique de la monnaie, impression de ticket et reçu WhatsApp.',
      whyCrucial: 'Chaque vente non enregistrée est une fuite de stock invisible et un trou dans vos comptes. Ce module garantit que chaque article qui quitte votre boutique laisse une trace écrite.',
      howToSteps: [
        'Cliquez sur le bouton bleu « + Nouvelle Vente » (accessible partout en haut à droite).',
        'Sélectionnez l\'article dans votre catalogue ou tapez directement son prix.',
        'Choisissez le mode de paiement : Espèces (avec calcul de la monnaie à rendre), Mobile Money (Wave, Orange, MTN), Virement ou Crédit (ardoise).',
        'Validez : partagez le reçu officiel au client sur WhatsApp ou imprimez le ticket de caisse thermique.',
      ],
      autoDomino: [
        'Le stock de l\'article vendu est décompté automatiquement.',
        'Si payé en Espèces ➔ Le montant est crédité directement dans votre Caisse Journalière ouverte.',
        'Si payé par Mobile Money / Wave ➔ L\'argent va dans votre Trésorerie Mobile Money sans polluer le tiroir de caisse physique.',
        'Si vente à Crédit ➔ La dette est ajoutée instantanément sur la fiche du client dans « Clients & Dettes ».',
        'Si l\'article fait partie d\'un Lot commercial ➔ La rentabilité et le point mort du lot sont recalculés sur-le-champ.',
      ],
      manualRole: [
        'Demander au client son mode de règlement exact avant de valider.',
        'Bien compter les billets reçus avant de taper le montant dans la calculatrice de monnaie.',
        'Accorder ou refuser une remise commerciale exceptionnelle.',
      ],
      realExample: 'Un client achète 3 chemises à 5 000 F (total 15 000 F). Il vous tend un billet de 10 000 F en liquide et paie 5 000 F par Wave. Vous notez 10 000 F Espèces et 5 000 F Wave. La caisse physique prend +10 000 F, Wave prend +5 000 F, et le stock diminue de 3 chemises.',
      pitfallsToAvoid: [
        'Reporter l\'enregistrement des ventes au soir : vous oublierez inévitablement des articles ou des montants.',
        'Enregistrer une vente à crédit comme une vente espèces : vous croirez avoir du liquide alors que l\'argent est dehors.',
      ],
    },
    {
      id: 'cash',
      title: 'Caisse Journalière : Le Gardien de vos Billets Physiques',
      category: 'pilotage',
      icon: Wallet,
      route: '/cash',
      badge: 'GRATUIT',
      badgeColor: '#10B981',
      summary: 'Ouverture le matin avec fond de caisse, suivi des billets dans le tiroir et clôture obligatoire avec détection d\'écart.',
      whyCrucial: 'C\'est l\'outil anti-vol par excellence. Sans clôture journalière avec comptage des billets, les erreurs de monnaie rendue et les prélèvements non déclarés vous font perdre jusqu\'à 15% de votre marge sans que vous le sachiez.',
      howToSteps: [
        'Le matin à 8h : Cliquez sur « Ouvrir la Caisse » et saisissez votre fond initial (la monnaie de départ, ex: 25 000 F).',
        'Pendant la journée : Toutes vos ventes espèces entrent automatiquement. Pour une petite dépense imprévue (sacs, repas), cliquez sur « Décaissement » et notez le motif.',
        'Le soir à la fermeture : Cliquez sur « Clôturer la Caisse », videz votre tiroir et comptez vos billets et pièces réels.',
        'Le système compare avec le solde théorique. S\'il y a un écart (manquant ou excédent), justifiez-le obligatoirement et validez pour sceller la journée.',
      ],
      autoDomino: [
        'Toutes les ventes en espèces au comptoir s\'ajoutent automatiquement au solde théorique.',
        'Toutes les livraisons e-commerce marquées « Livrées & Encaissées » (COD) créditent automatiquement la caisse.',
        'À la clôture, le solde final scellé est archivé dans l\'historique inaltérable et alimente le rapport de gestion.',
      ],
      manualRole: [
        'Compter physiquement chaque billet et pièce le soir (aucun logiciel ne peut le faire à votre place !).',
        'Justifier avec sincérité tout écart de caisse constaté.',
        'Ne jamais prêter d\'argent liquide du tiroir sans enregistrer un mouvement de sortie.',
      ],
      realExample: 'Fond du matin : 20 000 F. Ventes espèces du jour : 65 000 F. Achat de sacs d\'emballage : -5 000 F. Solde théorique = 80 000 F. Vous comptez votre tiroir : vous trouvez 80 000 F. Écart = 0 F. Caisse parfaite, vous pouvez rentrer dormir l\'esprit tranquille.',
      pitfallsToAvoid: [
        'Laisser la caisse ouverte plusieurs jours d\'affilée sans clôturer chaque soir.',
        'Piocher dans le tiroir-caisse pour des dépenses personnelles sans enregistrer un prélèvement gérant.',
      ],
    },
    {
      id: 'lots',
      title: 'Lots Commerciaux & Déballages : Rentabilité des Ballots & Containers',
      category: 'pro',
      icon: Boxes,
      route: '/lots',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Pour les ballots de friperie, cartons d\'importation et containers. Calcul du Landed Cost, répartition sur les articles et suivi du Point Mort en temps réel.',
      whyCrucial: 'Quand vous achetez un ballot à 200 000 F, les articles n\'ont pas tous la même valeur. Sans cet outil, vous risquez de brader le 1er choix et de garder les invendus sans jamais savoir si vous avez récupéré votre capital de départ.',
      howToSteps: [
        'Cliquez sur « + Nouvelle Campagne » : notez le nom du lot, le prix d\'achat, les frais de transport et de douane (Landed Cost).',
        'Utilisez le tableau rapide pour décomposer vos articles (ex: 40 pièces VIP 1er choix à 5 000 F, 60 pièces 2e choix à 2 500 F, 50 pièces 3e choix à 1 000 F).',
        'COMMERCIA calcule votre coût de revient unitaire et votre Point Mort (nombre exact d\'articles à vendre pour rembourser 100% de la mise).',
        'Enregistrez les ventes au fur et à mesure du déballage : la jauge d\'amortissement progresse en direct.',
        'Consultez les stratégies d\'écoulement recommandées par l\'IA (WhatsApp VIP, TikTok Live, Vente flash).',
      ],
      autoDomino: [
        'Chaque vente d\'un article du lot décompte le stock restant et augmente le chiffre d\'affaires encaissé de la campagne.',
        'Le taux de récupération du capital (%) et le nombre d\'articles restant à vendre pour atteindre le point mort se recalculent instantanément.',
        'Le Copilote IA intègre les métriques de ce lot dans ses analyses financières vocales et écrites.',
      ],
      manualRole: [
        'Trier physiquement les articles à l\'ouverture du ballot en estimant les prix de vente réalistes selon la demande.',
        'Déclarer les articles défectueux ou déchirés dans la rubrique « Pertes & Avaries » pour recalculer le coût des pièces restantes.',
        'Lancer des promotions de déstockage sur le solde restant une fois le point mort dépassé.',
      ],
      realExample: 'Ballot acheté 200 000 F total. 55 chemises vendues sur les 150 du ballot ➔ 200 000 F encaissés. Point Mort atteint ! Les 95 chemises restantes dans votre boutique représentent 200 000 F de bénéfice net à 100%. Tout ce que vous vendez désormais est du pur profit.',
      pitfallsToAvoid: [
        'Manger l\'argent des premières ventes du ballot en croyant que c\'est du bénéfice : c\'est le remboursement de votre capital d\'achat !',
        'Oublier d\'inclure le transport et les frais de douane dans le coût de revient du lot.',
      ],
    },
    {
      id: 'treasury',
      title: 'Trésorerie Avancée & Multi-Comptes : La Richesse à J+30',
      category: 'pro',
      icon: Landmark,
      route: '/treasury',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Centralisez vos avoirs (Caisse physique + Wave + Banques), effectuez des virements internes et suivez votre autonomie en jours.',
      whyCrucial: 'Une entreprise ne meurt pas parce qu\'elle manque de clients, mais parce qu\'elle tombe en panne de liquidités. Ce module vous donne la visibilité sur vos 30 prochains jours pour ne jamais être pris de court par le loyer ou les fournisseurs.',
      howToSteps: [
        'Créez vos comptes financiers réels : Caisse Espèces, Compte Mobile Money (Wave / Orange), et Compte Banque / Réserve.',
        'Consultez votre indicateur d\'autonomie en jours : il vous dit combien de jours vous pouvez survivre sans faire de vente.',
        'Utilisez le « Virement Interne » pour déplacer du cash de la caisse vers votre compte de réserve sans fausser vos bénéfices.',
        'Ajoutez vos échéances prévues (loyer, acompte marchandise, factures) pour voir la trésorerie nette attendue à J+30.',
      ],
      autoDomino: [
        'Les encaissements espèces de la caisse et les paiements Mobile Money alimentent automatiquement les comptes respectifs.',
        'Les dépenses d\'exploitation déduisent immédiatement la trésorerie disponible.',
        'L\'indicateur d\'autonomie se recalcule en temps réel en fonction de vos dépenses moyennes quotidiennes.',
      ],
      manualRole: [
        'Décider quand sécuriser le liquide physique en faisant un virement interne vers la banque ou Wave.',
        'Enregistrer les échéances futures de paiement (loyer, salaires, impôts).',
        'Vérifier au moins une fois par semaine la courbe de trésorerie prévisionnelle à J+30.',
      ],
      realExample: 'Vous avez 80 000 F en caisse, 150 000 F sur Wave, et 300 000 F en banque. Trésorerie totale = 530 000 F. Vos charges moyennes sont de 10 000 F/jour. Autonomie = 53 jours (voyant vert). Vous prévoyez 150 000 F de loyer dans 10 jours : COMMERCIA confirme que vous resterez largement en positif (+380 000 F).',
      pitfallsToAvoid: [
        'Confondre le solde bancaire avec le bénéfice du mois.',
        'Garder trop d\'espèces liquides dans la boutique au lieu de faire un virement interne de sécurisation.',
      ],
    },
    {
      id: 'deliveries',
      title: 'Livraisons & Expéditions E-commerce : Maîtriser le COD',
      category: 'pro',
      icon: Truck,
      route: '/deliveries',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Gérez vos commandes en ligne (WhatsApp, TikTok, Facebook), transmettez le bon de livraison au coursier et réconciliez les encaissements à la livraison.',
      whyCrucial: 'Dans le commerce en ligne africain, 80% des clients paient à la réception (Cash On Delivery). Ce module empêche que des coursiers ou livreurs disparaissent avec vos colis ou vos fonds.',
      howToSteps: [
        'Dès qu\'un client commande en ligne : Cliquez sur « + Nouvelle Livraison » avec son nom, téléphone, ville, quartier et repère GPS.',
        'Précisez le montant à encaisser à la livraison et attribuez la course à un coursier moto.',
        'Cliquez sur l\'icône WhatsApp : un bordereau complet de livraison est généré et transmis au livreur en 1 clic.',
        'Suivez le colis : En attente ➔ En cours de route ➔ Livré & Encaissé.',
      ],
      autoDomino: [
        'Dès que vous passez le statut à « Livré & Encaissé », le montant liquide encaissé par le coursier est AUTOMATIQUEMENT crédité dans votre Caisse Journalière ouverte.',
        'Le stock de l\'article expédié est décompté du magasin.',
        'La fiche client est mise à jour avec son historique d\'achats.',
      ],
      manualRole: [
        'Vérifier avec le coursier qu\'il vous tend bien la somme en rentrant le soir avant de marquer la course comme « Livrée ».',
        'Appeler le client en cas de retard du livreur en cliquant sur son numéro.',
      ],
      realExample: 'Une cliente commande 2 robes à 25 000 F à livrer à Angré Carrefour Pétro Ivoire. Vous confiez le colis au coursier Moussa avec le bon WhatsApp. À 18h, Moussa revient et vous donne les 25 000 F. Vous cochez « Livré » ➔ Les 25 000 F s\'ajoutent automatiquement dans votre tiroir-caisse de la journée.',
      pitfallsToAvoid: [
        'Envoyer un coursier sans bon de livraison avec montant exact à encaisser.',
        'Marquer un colis comme livré avant d\'avoir touché l\'argent en main propre ou sur votre téléphone.',
      ],
    },
    {
      id: 'customers',
      title: 'Clients & Dettes : Récupérer son Argent Dehors',
      category: 'pilotage',
      icon: Users,
      route: '/customers',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Suivi nominatif des ardoises et crédits clients, historique des acomptes et relances WhatsApp cordiales en un clic.',
      whyCrucial: 'L\'argent dehors n\'achète pas la marchandise de demain. Le crédit non maîtrisé est la première cause de faillite des boutiques de quartier. Ce module garde vos créances sous contrôle strict.',
      howToSteps: [
        'Lors d\'une vente à crédit : sélectionnez le client existant ou créez sa fiche avec son numéro de téléphone.',
        'Consultez la liste de vos débiteurs triée par montant dû.',
        'Quand un client fait un versement partiel : ouvrez sa fiche, cliquez sur « Enregistrer un versement » et saisissez l\'acompte.',
        'Pour relancer : cliquez sur le bouton vert WhatsApp pour envoyer un rappel courtois pré-rédigé.',
      ],
      autoDomino: [
        'Toute vente avec reste à crédit s\'impute instantanément sur le compte du client.',
        'Tout versement reçu crédite immédiatement la caisse ou le compte bancaire et diminue la dette restante.',
        'Le montant global des crédits dehors s\'actualise sur votre tableau de bord et dans le diagnostic du Copilote IA.',
      ],
      manualRole: [
        'Fixer un plafond de crédit strict (ex: maximum 25 000 F par client).',
        'Déclencher les relances WhatsApp régulièrement (au moins une fois par semaine).',
        'Refuser tout nouveau crédit à un client qui n\'a pas soldé son ardoise précédente.',
      ],
      realExample: 'Mme Traoré vous doit 30 000 F depuis 15 jours. Vous cliquez sur l\'icône WhatsApp : l\'application génère un message cordial rappelant le montant et le nom de votre boutique. Elle vous répond et vous fait un virement Wave de 15 000 F. Vous enregistrez l\'acompte : sa dette passe à 15 000 F en un clin d\'œil.',
      pitfallsToAvoid: [
        'Faire du crédit sans noter le numéro de téléphone et le nom complet du client.',
        'Laisser le total de vos dettes dehors dépasser 20% de votre chiffre d\'affaires mensuel.',
      ],
    },
    {
      id: 'products',
      title: 'Stock & Alertes Ruptures : Ne Jamais Rater une Vente',
      category: 'catalogue',
      icon: Package,
      route: '/products',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Fiches articles complètes, prix d\'achat et de vente, valorisation du stock au Coût Moyen Pondéré et seuils d\'alerte automatique.',
      whyCrucial: 'Un client qui entre pour acheter un article en rupture ira chez votre concurrent. Savoir exactement ce qu\'il vous reste en magasin et à quel prix racheter est indispensable pour préserver vos marges.',
      howToSteps: [
        'Cliquez sur « + Nouveau Produit » : indiquez le nom, la catégorie, le prix d\'achat fournisseur et le prix de vente.',
        'Fixez un « Seuil d\'alerte » (ex: 5 unités). Dès que le stock descend sous ce chiffre, l\'article passe en orange/rouge.',
        'Lors d\'un réassort : cliquez sur « Entrée de Stock » pour ajouter les nouvelles quantités reçues.',
      ],
      autoDomino: [
        'Chaque vente comptoir, vente en ligne ou sortie de lot décrémente automatiquement le stock.',
        'Dès qu\'un article passe sous son seuil, une alerte apparaît sur le Tableau de Bord et le Copilote IA vous prévient.',
        'La valeur marchande totale de votre magasin est recalculée en temps réel.',
      ],
      manualRole: [
        'Faire un inventaire physique rapide de contrôle une fois par mois pour corriger les éventuelles casses ou écarts.',
        'Ajuster les prix de vente en cas de hausse des tarifs chez vos grossistes.',
      ],
      realExample: 'Vous vendez du riz parfumé 25kg. Seuil d\'alerte fixé à 4 sacs. À la 6e vente de la semaine, il reste 3 sacs. L\'icône de rupture s\'allume : vous pouvez appeler votre fournisseur avant la rupture totale du week-end.',
      pitfallsToAvoid: [
        'Ne pas renseigner le prix d\'achat réel : l\'application ne pourra pas calculer votre marge brute exacte.',
        'Vendre un article en stock négatif sans avoir saisi l\'entrée de réassort.',
      ],
    },
    {
      id: 'growth',
      title: 'Croissance & Canaux : Savoir Quel Réseau Rend Riche',
      category: 'pro',
      icon: TrendingUp,
      route: '/growth',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Suivez la rentabilité de chaque canal de vente (TikTok Live, Statuts WhatsApp, Facebook Ads, Comptoir) et calculez votre Coût d\'Acquisition Client (CAC).',
      whyCrucial: 'Tous les clients ne se valent pas. Si vous payez 20 000 F de pub Facebook pour ne vendre que 15 000 F de robes, vous perdez de l\'argent. Ce module vous dit où concentrer vos efforts pour exploser vos ventes.',
      howToSteps: [
        'Activez vos canaux de vente (WhatsApp VIP, TikTok Déballage, Facebook Marketplace, Vente comptoir).',
        'Renseignez vos éventuelles dépenses de publicité ou de sponsoring.',
        'Attribuez chaque vente à son canal d\'origine lors de l\'encaissement.',
        'Consultez le classement des canaux par bénéfice net réel généré.',
      ],
      autoDomino: [
        'Toutes les ventes liées à un canal augmentent son chiffre d\'affaires et son taux de conversion.',
        'Le Coût d\'Acquisition Client (CAC) et le Retour sur Investissement (ROAS) se mettent à jour automatiquement.',
        'Le rapport d\'optimisation suggère quel canal accélérer ou arrêter.',
      ],
      manualRole: [
        'Demander poliment aux nouveaux clients comment ils vous ont connu (statut WhatsApp, TikTok ou bouche-à-oreille).',
        'Ajuster vos budgets de sponsoring sur les canaux qui ont le CAC le plus faible.',
      ],
      realExample: 'Vous dépensez 0 F sur WhatsApp VIP ➔ 145 000 F de bénéfice net. Vous dépensez 25 000 F sur Facebook Ads ➔ 60 000 F de bénéfice net. Conclusion de COMMERCIA : Vos statuts WhatsApp sont 3 fois plus rentables que Facebook ! Doublez vos publications WhatsApp cette semaine.',
      pitfallsToAvoid: [
        'Payer des influenceurs ou de la publicité sans enregistrer les ventes correspondantes dans le module Croissance.',
      ],
    },
    {
      id: 'copilot',
      title: 'Copilote IA : Votre Directeur Financier de Poche avec Mémoire',
      category: 'pro',
      icon: Bot,
      route: '/copilot',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Une IA ultra-puissante qui connaît tout de votre boutique, répond naturellement à vos questions, surveille votre trésorerie et retient vos règles de gestion.',
      whyCrucial: 'Les commerçants sont souvent seuls pour prendre des décisions financières complexes. Le Copilote analyse vos vrais chiffres en direct et vous conseille comme le ferait un directeur financier d\'élite bienveillant.',
      howToSteps: [
        'Posez vos questions simplement par écrit ou à la voix : « Quel est mon bénéfice net aujourd\'hui ? », « Où en est mon ballot ? », « Qui me doit de l\'argent ? ».',
        'Apprenez-lui vos habitudes : dites-lui simplement « Rappelle-toi que mon livreur passe le jeudi » ou « Note que je ferme le dimanche ».',
        'Demandez-lui : « Que sais-tu sur moi ? » pour consulter tout ce qu\'il a en mémoire.',
        'Demandez-lui de vous rédiger des messages de relance client ou des annonces promotionnelles de déstockage.',
      ],
      autoDomino: [
        'Le Copilote lit en temps réel l\'état de votre caisse, de vos ventes, de vos crédits et de vos lots sans que vous n\'ayez rien à lui expliquer.',
        'Toute information mémorisée est enregistrée de manière continue et utilisée dans ses recommandations futures.',
        'Il applique automatiquement la règle des 3 poches pour protéger votre capital marchandise.',
      ],
      manualRole: [
        'Interroger le Copilote régulièrement pour obtenir un diagnostic objectif de vos finances.',
        'Lui apprendre les spécificités de votre commerce (fournisseurs, habitudes de paiement, jours de fermeture).',
      ],
      realExample: 'Vous demandez : « Copilote, puis-je acheter 2 nouveaux ballots demain ? » Le Copilote consulte votre caisse, votre compte Wave et vos dépenses prévues et répond : « Oui, car ton ballot actuel a dépassé son point mort et ta trésorerie nette disponible est de 320 000 F. Laisse 70 000 F pour le loyer et tu peux engager 250 000 F pour ton réassort sans danger ! »',
      pitfallsToAvoid: [
        'Considérer le Copilote comme un simple robot de discussion générique : il est connecté à vos vraies données de boutique.',
      ],
    },
    {
      id: 'team',
      title: 'Équipe & Multi-Caissiers : Déléguer sans Risque de Fuites',
      category: 'pro',
      icon: Users,
      route: '/dashboard',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Créez des comptes individuels pour vos caissiers avec code PIN, masquage des marges d\'achat et interdiction de suppression des ventes.',
      whyCrucial: 'Quand vous n\'êtes pas à la boutique, un employé sans rôle restreint peut voir vos marges réelles, modifier les prix ou supprimer des ventes pour empocher l\'argent en liquide. Le mode Caissier scelle les données confidentielles.',
      howToSteps: [
        'Cliquez sur le bouton « Équipe » en haut dans la barre de navigation.',
        'Cliquez sur « + Nouveau Caissier / Collaborateur » : notez son prénom, email, téléphone et définissez un code PIN.',
        'Choisissez le rôle : « Caissier / Vendeur » (ventes au comptoir, caisse du jour, marges masquées) ou « Gérant » (stock et achats).',
        'Le caissier se connecte sur son propre téléphone ou sur la tablette du magasin avec ses identifiants personnels.',
      ],
      autoDomino: [
        'Dès qu\'un caissier se connecte, l\'application masque automatiquement les prix d\'achat fournisseurs et les bénéfices nets.',
        'Le bouton de suppression des ventes est désactivé pour empêcher l\'effacement d\'encaissements.',
        'Toutes les ventes enregistrées portent le nom du caissier dans le journal d\'audit.',
      ],
      manualRole: [
        'Ne jamais partager le mot de passe Propriétaire avec un employé ou un vendeur.',
        'Faire le point de caisse le soir avec le caissier en vérifiant son solde réel par rapport au solde théorique calculé.',
        'Désactiver en 1 clic l\'accès d\'un collaborateur qui quitte votre entreprise.',
      ],
      realExample: 'Vous partez en voyage pendant 3 jours. Vous confiez la boutique à votre vendeur avec le profil « Caissier ». Il enregistre 85 ventes pour 420 000 F. Il ne peut ni voir à combien vous achetez les articles chez le grossiste, ni supprimer une vente après avoir encaissé le client. Vous suivez les ventes en direct depuis votre téléphone à distance.',
      pitfallsToAvoid: [
        'Laisser la session du compte Propriétaire ouverte sur la tablette de vente au comptoir.',
        'Donner les droits de Gérant à un nouveau stagiaire ou vendeur non confirmé.',
      ],
    },
    {
      id: 'multi_stores',
      title: 'Multi-Boutiques & Succursales : Piloter un Réseau de Vente',
      category: 'pro',
      icon: Store,
      route: '/dashboard',
      badge: 'BUSINESS',
      badgeColor: '#EC4899',
      summary: 'Gérez plusieurs magasins, annexes ou dépôts depuis un compte unique. Basculez d\'une boutique à l\'autre en 1 clic.',
      whyCrucial: 'Développer une 2e boutique ou un entrepôt ne doit pas multiplier votre charge mentale. Le multi-boutiques isole les stocks et les caisses tout en vous donnant une vision d\'ensemble de votre empire commercial.',
      howToSteps: [
        'Cliquez sur le nom de votre boutique en haut à gauche dans la barre de navigation.',
        'Cliquez sur « + Ajouter une boutique / succursale ».',
        'Saisissez le nom (ex: Boutique Plateau, Dépôt Port, Annexe Nord), le métier et la devise.',
        'Validez : votre nouvelle boutique est prête avec son propre catalogue, sa caisse et son stock séparé.',
        'Cliquez sur le menu déroulant pour basculer instantanément d\'un point de vente à l\'autre.',
      ],
      autoDomino: [
        'Chaque boutique possède son propre stock, sa propre caisse journalière et ses propres clients.',
        'Le changement de boutique dans la barre de navigation filtre immédiatement toutes les statistiques, alertes et rapports pour ce point de vente précis.',
        'Vous pouvez affecter des caissiers différents à chaque point de vente.',
      ],
      manualRole: [
        'Bien vérifier dans quelle boutique vous vous trouvez avant d\'enregistrer une dépense de loyer ou un arrivage de marchandise.',
        'Comparer les performances hebdomadaires de vos différentes succursales.',
      ],
      realExample: 'Vous avez une boutique de vêtements au Centre-ville et une annexe au Marché HLM. Vous basculez sur l\'annexe HLM : vous constatez que le stock de robes rouges est épuisé alors qu\'il en reste 15 au Centre-ville. Vous organisez un transfert de stock pour ne rater aucune vente.',
      pitfallsToAvoid: [
        'Mélanger les fonds de caisse physique entre deux boutiques distinctes.',
      ],
    },
    {
      id: 'expenses',
      title: 'Dépenses & Sorties de Caisse : Maîtriser les Fuites Silencieuses',
      category: 'pilotage',
      icon: TrendingDown,
      route: '/expenses',
      badge: 'GRATUIT',
      badgeColor: '#10B981',
      summary: 'Enregistrez chaque sortie d\'argent pour calculer votre vrai bénéfice net et éviter la faillite par petites dépenses invisibles.',
      whyCrucial: 'Une entreprise ne meurt pas par manque de ventes, mais par accumulation de petites fuites d\'argent (carburant, repas, sacs, crédits téléphoniques) non comptabilisées.',
      howToSteps: [
        'Cliquez sur le bouton rouge « - Dépense » dès que vous donnez de l\'argent physique ou faites un virement.',
        'Saisissez le montant et choisissez la catégorie exacte (Loyer, Transport, Électricité, Marchandise, Salaires).',
        'Précisez le mode de règlement (Espèces du tiroir, Wave, Virement bancaire).',
        'Validez pour ajuster immédiatement votre trésorerie.',
      ],
      autoDomino: [
        'Toute dépense déduit en temps réel le bénéfice net de la journée.',
        'Si payée en espèces, la sortie est automatiquement déduite du solde théorique de la Caisse Journalière.',
        'Le Copilote IA intègre ces charges réelles dans le calcul d\'autonomie financière à J+30.',
      ],
      manualRole: [
        'Noter la dépense au moment où vous sortez les billets, sans attendre le soir.',
        'Exiger systématiquement une facturette ou un reçu signé.',
        'Ne pas payer des dépenses personnelles familiales avec l\'argent de la boutique sans les déclarer comme prélèvement gérant.',
      ],
      realExample: 'Vous réalisez 150 000 F de ventes. Vous payez 10 000 F de livraison moto et 5 000 F d\'emballages. Le tableau affiche immédiatement 15 000 F de charges et un bénéfice net réel de 135 000 F, évitant l\'illusion d\'avoir 150 000 F de profit.',
      pitfallsToAvoid: [
        'Oublier les petites dépenses de 500 F ou 1 000 F qui, cumulées sur un mois, représentent souvent plus de 50 000 F de perte invisible.',
      ],
    },
    {
      id: 'products',
      title: 'Catalogue Articles & Gestion de Stock : Zéro Rupture',
      category: 'catalogue',
      icon: Package,
      route: '/products',
      badge: 'GRATUIT',
      badgeColor: '#10B981',
      summary: 'Répertoire complet de vos articles avec prix de vente, coût d\'achat, quantité en rayon et alertes automatiques de réapprovisionnement.',
      whyCrucial: 'Un article en rupture est une vente perdue directement au profit du concurrent de la rue d\'à côté. Ce module vous prévient avant que vos rayons ne soient vides.',
      howToSteps: [
        'Cliquez sur « + Nouveau Produit » : renseignez le nom, la catégorie, le prix de vente et le coût d\'achat.',
        'Fixez un « Seuil d\'alerte stock » (ex: 5 unités).',
        'À chaque arrivage fournisseur, cliquez sur « Réassort » pour ajouter les nouvelles pièces reçues.',
        'Consultez la liste filtrée « Stock faible » pour préparer vos commandes fournisseurs.',
      ],
      autoDomino: [
        'Chaque vente au comptoir ou livraison décrémente automatiquement le stock disponible.',
        'Quand la quantité passe sous le seuil d\'alerte, une notification rouge s\'affiche sur le tableau de bord.',
        'Pour les employés/caissiers, les coûts d\'achat et les marges sont automatiquement masqués.',
      ],
      manualRole: [
        'Faire un inventaire physique rapide chaque semaine pour vérifier la concordance avec les chiffres de l\'écran.',
        'Ajuster le stock en cas de casse ou de vol constaté.',
      ],
      realExample: 'Vous vendez des packs d\'eau minérale. Le seuil est fixé à 4 packs. Dès la vente du 16e pack sur vos 20 initiaux, COMMERCIA affiche l\'alerte : vous commandez auprès du livreur avant que les clients ne trouvent le frigo vide.',
      pitfallsToAvoid: [
        'Ne pas saisir les nouveaux arrivages de marchandises le jour même de la livraison.',
      ],
    },
    {
      id: 'customers',
      title: 'Clients & Carnet de Crédit : Récupérer son Argent sans se Fâcher',
      category: 'pilotage',
      icon: Users,
      route: '/customers',
      badge: 'GRATUIT',
      badgeColor: '#10B981',
      summary: 'Fiches clients, carnet d\'ardoise numérique, suivi des dates d\'échéance et messages de relance polis prêts à envoyer sur WhatsApp.',
      whyCrucial: 'Le crédit informel tue des milliers de commerçants qui ont honte de réclamer leur argent ou qui oublient qui leur doit quoi. Avec un carnet propre, vous êtes respecté et payé à l\'heure.',
      howToSteps: [
        'Créez la fiche du client avec son nom et son numéro WhatsApp.',
        'Lors d\'une vente à crédit, sélectionnez le client : sa dette totale est automatiquement incrémentée.',
        'Consultez l\'onglet « Débiteurs » pour voir qui dépasse les délais convenus.',
        'Cliquez sur l\'icône WhatsApp : un message de relance courtois et précis avec le montant exact est généré en 1 clic.',
        'Quand le client vient rembourser, cliquez sur « Encaisser un versement ».',
      ],
      autoDomino: [
        'La vente à crédit n\'augmente PAS la caisse liquide (zéro illusion de cash).',
        'Le remboursement du client crédite automatiquement la caisse physique du jour et déduit sa dette.',
        'Le total des crédits dehors s\'actualise en direct sur le tableau de bord.',
      ],
      manualRole: [
        'Définir clairement la date de remboursement avec le client avant de lui tendre la marchandise.',
        'Envoyer la relance WhatsApp 24h avant l\'échéance convenue.',
      ],
      realExample: 'Mamadou vous doit 25 000 F depuis 10 jours. Vous cliquez sur le bouton vert WhatsApp : COMMERCIA rédige « Bonjour Mamadou, rappel amical de ton solde de 25 000 F chez Boutique Moderne pour tes achats du 15 ». Il vous envoie un Wave 1 heure plus tard.',
      pitfallsToAvoid: [
        'Accorder du crédit à un inconnu sans avoir enregistré son numéro de téléphone.',
      ],
    },
    {
      id: 'food_prep',
      title: 'Restauration & Fiches Techniques : Maîtriser le Coût par Plat',
      category: 'pro',
      icon: Utensils,
      route: '/food-prep',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Idéal pour restaurants, fast-foods et boulangeries. Transformez des ingrédients bruts en portions, calculez le coût matière exact et suivez les invendus.',
      whyCrucial: 'En cuisine, la marge s\'évapore dans les surdosages et les restes jetés le soir. Une fiche technique précise garantit que chaque plat dégage son bénéfice prévu.',
      howToSteps: [
        'Créez vos fiches recettes avec la liste des ingrédients bruts (riz, viande, épices, huile) pour 10 ou 50 portions.',
        'Le matin, cliquez sur « Préparation du jour » pour enregistrer les marmites cuisinées.',
        'Vendez les portions au comptoir en 1 clic.',
        'Le soir, déclarez les barquettes restantes dans « Invendus & Pertes » pour sceller la journée.',
      ],
      autoDomino: [
        'La préparation décompte immédiatement le stock des ingrédients bruts.',
        'Chaque portion vendue alimente directement la caisse physique.',
        'Le ratio de vente (%) et le coût de revient unitaire sont calculés sans erreur.',
      ],
      manualRole: [
        'Peser ou mesurer scrupuleusement les ingrédients en cuisine.',
        'Compter physiquement les portions restantes avant la fermeture.',
      ],
      realExample: 'Marmite de 40 portions de Tiep préparée pour 30 000 F de matière première (750 F/portion). Vous vendez 38 portions à 1 500 F (total 57 000 F). Marge brute nette = +27 000 F.',
      pitfallsToAvoid: [
        'Ne pas déclarer les invendus ou les plats offerts au personnel.',
      ],
    },
    {
      id: 'service_orders',
      title: 'Ateliers & Confections : Fiches de Dépôt et Acomptes',
      category: 'pro',
      icon: Wrench,
      route: '/service-orders',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Pour couturiers, menuisiers, réparateurs téléphones et pressings. Suivi des commandes sur-mesure, fiches de mesure, acomptes et bons de retrait.',
      whyCrucial: 'Évite les disputes lors de la récupération du vêtement ou de l\'appareil réparé. Tout est tracé : ce qui a été convenu, l\'acompte versé et le solde restant dû.',
      howToSteps: [
        'À l\'arrivée du client, créez une commande avec la description exacte du travail et le tarif convenu.',
        'Enregistrez l\'acompte obligatoire (ex: 40%).',
        'Partagez le reçu de dépôt avec le numéro de bon sur WhatsApp.',
        'Quand le travail est terminé, passez le statut à « Prêt » et notifiez le client.',
        'À la livraison, encaissez le solde et marquez « Livré ».',
      ],
      autoDomino: [
        'L\'acompte entre immédiatement dans la caisse du jour.',
        'Le solde restant dû apparaît dans les créances en attente de livraison.',
        'Le bon de retrait WhatsApp comporte le détail scellé inaltérable.',
      ],
      manualRole: [
        'Prendre des photos de l\'appareil ou du tissu lors du dépôt pour prouver son état initial.',
        'Exiger le bon de retrait avant de restituer le matériel.',
      ],
      realExample: 'Réparation d\'écran smartphone à 25 000 F. Acompte de 10 000 F encaissé. À la restitution, le client paie les 15 000 F restants. Caisse totale = 25 000 F, zéro litige.',
      pitfallsToAvoid: [
        'Démarrer un travail sur-mesure sans exiger un acompte préalable.',
      ],
    },
    {
      id: 'mobile_money',
      title: 'Points Wave & Mobile Money : Trésorerie d\'Agence sans Risque',
      category: 'pro',
      icon: Smartphone,
      route: '/mobile-money',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Gestion des kiosques multiservices Wave, Orange Money et MTN. Suivi des dépôts, retraits et commissions sans confondre l\'argent des clients avec le CA.',
      whyCrucial: 'L\'erreur mortelle des gérants de points Wave est de croire que les 500 000 F reçus en dépôt sont du bénéfice. Ce module isole strictement votre commission réelle de l\'argent qui ne fait que transiter.',
      howToSteps: [
        'Chaque matin, vérifiez votre cash liquide et votre solde électronique (UV / monnaie digitale).',
        'Enregistrez chaque opération : Dépôt (cash reçu, UV envoyés) ou Retrait (UV reçus, cash remis).',
        'Le système calcule automatiquement la commission opérateur acquise.',
        'Vérifiez le point de rentabilité nette à la clôture.',
      ],
      autoDomino: [
        'Les dépôts augmentent le cash physique et réduisent la monnaie électronique.',
        'Les retraits réduisent le cash physique et augmentent la monnaie électronique.',
        'Seule la commission nette acquise est comptabilisée dans votre vrai bénéfice d\'agence.',
      ],
      manualRole: [
        'Attendre le SMS officiel de confirmation sur le terminal opérateur avant de donner le moindre billet.',
        'Pointer les soldes deux fois par jour.',
      ],
      realExample: 'Vous réalisez 1 200 000 F de transactions dans la journée. Votre commission nette opérateur s\'élève à 12 500 F. COMMERCIA note exactement 12 500 F de revenu d\'activité.',
      pitfallsToAvoid: [
        'Accepter des retraits sur promesse de SMS ou d\'appel téléphonique non vérifié.',
      ],
    },
    {
      id: 'growth',
      title: 'Croissance & Canaux d\'Acquisition : Mesurer le ROI Publicitaire',
      category: 'pro',
      icon: TrendingUp,
      route: '/growth',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Attribuez vos ventes à vos canaux réels (WhatsApp VIP, TikTok Live, Facebook Ads, Passants boutique) et calculez votre Coût d\'Acquisition Client (CAC).',
      whyCrucial: 'Pour arrêter de gaspiller de l\'argent dans des publicités inefficaces. Vous savez au centime près quel canal vous rapporte le plus de clients fidèles.',
      howToSteps: [
        'Définissez vos canaux actifs (ex: Statut WhatsApp, TikTok, Bouche-à-oreille, Enseigne).',
        'Lors d\'une vente ou d\'une commande en ligne, sélectionnez le canal d\'origine.',
        'Consultez la matrice ROI : comparez le budget dépensé sur le canal avec les ventes générées.',
      ],
      autoDomino: [
        'Chaque vente attribuée enrichit les métriques de rentabilité du canal.',
        'Le Coût d\'Acquisition Client (CAC) et le Panier Moyen par canal se recalculent en continu.',
        'Le Copilote IA vous suggère où réinvestir votre budget marketing.',
      ],
      manualRole: [
        'Demander poliment à chaque nouveau client : « Comment avez-vous découvert notre boutique ? ».',
        'Alimenter vos canaux les plus rentables en contenu régulier.',
      ],
      realExample: 'Vous dépensez 20 000 F en boost TikTok qui vous apportent 150 000 F de commandes, alors qu\'une affiche à 30 000 F ne vous a apporté aucun client. Vous coupez l\'affiche et doublez votre budget TikTok.',
      pitfallsToAvoid: [
        'Investir dans la pub sans demander aux clients comment ils vous ont connu.',
      ],
    },
    {
      id: 'analytics',
      title: 'Analytique & Diagnostic 360° : Le Bilan Financier Conforme OHADA',
      category: 'pro',
      icon: BarChart3,
      route: '/analytics',
      badge: 'PRO & BUSINESS',
      badgeColor: '#8B5CF6',
      summary: 'Diagnostic radar santé d\'entreprise, analyse des postes de charges et export du rapport de gestion prêt pour les banques ou les associés.',
      whyCrucial: 'Quand vous voulez obtenir un prêt bancaire ou convaincre un investisseur, il vous demande vos chiffres. Ce module génère un bilan professionnel propre et certifié.',
      howToSteps: [
        'Consultez votre Radar Santé 360° : Rentabilité, Maîtrise des charges, Recouvrement des dettes et Rotation de stock.',
        'Identifiez immédiatement le point faible de votre commerce (ex: trop de crédits non recouvrés).',
        'Cliquez sur « Imprimer le rapport » pour générer le récapitulatif périodique propre.',
      ],
      autoDomino: [
        'Toutes les ventes, dépenses, créances et marges sont compilées en ratios financiers normalisés.',
        'Le Copilote IA rédige une synthèse écrite et des conseils d\'optimisation personnalisés.',
      ],
      manualRole: [
        'Prendre 15 minutes chaque fin de mois pour analyser vos tendances.',
        'Partager le rapport avec votre comptable ou votre banquier.',
      ],
      realExample: 'Votre score de recouvrement est à 40/100. Vous prenez conscience que trop d\'argent dort chez les clients. Vous lancez une semaine sans crédit et faites rentrer 180 000 F de liquidités en banque.',
      pitfallsToAvoid: [
        'Piloter sans regarder ses ratios mensuels de rentabilité nette.',
      ],
    },
  ];

  const categories = [
    { id: 'all', label: 'Tout le Guide' },
    { id: 'metiers', label: '🧭 Guides par Métier (20 Secteurs)' },
    { id: 'pilotage', label: 'Pilotage Quotidien' },
    { id: 'pro', label: 'Modules Avancés PRO' },
    { id: 'catalogue', label: 'Stocks & Articles' },
  ];

  const filtered = SECTIONS.filter(sec => {
    const matchCat =
      selectedCategory === 'all' ||
      sec.category === selectedCategory ||
      (selectedCategory === 'metiers' &&
        ['lots', 'food_prep', 'service_orders', 'mobile_money', 'cash', 'sales', 'products'].includes(sec.id));
    const matchSearch =
      searchTerm === '' ||
      sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.whyCrucial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.realExample.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 100%)',
          borderRadius: '16px',
          padding: '32px 30px',
          color: '#FFFFFF',
          marginBottom: '28px',
          boxShadow: '0 10px 30px rgba(11, 25, 44, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.80rem',
              fontWeight: 800,
              marginBottom: '14px',
              color: '#FFFFFF',
            }}
          >
            <BookOpen size={16} color="#38BDF8" />
            <span style={{ color: '#F8FAFC', letterSpacing: '0.5px' }}>
              MANUEL COMPLET & GUIDE D'EXCELLENCE COMMERCIALE
            </span>
          </div>

          <h1
            style={{
              fontSize: '2.3rem',
              fontWeight: 900,
              margin: '0 0 14px 0',
              lineHeight: 1.2,
              color: '#FFFFFF',
            }}
          >
            <span style={{ color: '#FFFFFF' }}>Comment Fonctionne </span>
            <span
              style={{
                color: '#FF7A00',
                textShadow: '0 0 24px rgba(255, 122, 0, 0.45)',
              }}
            >
              COMMERCIA
            </span>
            <span style={{ color: '#FFFFFF' }}> ?</span>
          </h1>

          <p
            style={{
              fontSize: '1.02rem',
              color: '#E2E8F0',
              lineHeight: 1.6,
              margin: '0 0 24px 0',
              maxWidth: '1200px',
            }}
          >
            Découvrez l'effet domino de chaque outil : ce qui est{' '}
            <strong style={{ color: '#FFFFFF' }}>100% automatisé</strong> pour
            vous faire gagner du temps, ce qui reste{' '}
            <strong style={{ color: '#FFFFFF' }}>sous votre contrôle humain</strong>{' '}
            pour protéger vos fonds, et comment appliquer la{' '}
            <strong style={{ color: '#FCD34D' }}>Règle d'or des 3 Poches</strong>{' '}
            pour bâtir un commerce durablement prospère.
          </p>

          {/* Quick Search inside Guide */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', maxWidth: '750px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search
                size={18}
                color="#94A3B8"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Rechercher un outil (ex: point mort, caisse, relance, ballot...)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                }}
              />
            </div>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 20px',
                fontWeight: 700,
                fontSize: '0.90rem',
                borderRadius: '10px',
                border: 'none',
              }}
              title="Imprimer ou enregistrer le guide en PDF"
            >
              <Printer size={16} />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* RÈGLE D'OR DES 3 POCHES : LE PILIER FONDATEUR */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #E2E8F0',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: '#0F172A' }}>
              Le Pilier Fondateur : La Règle des 3 Poches COMMERCIA
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#64748B' }}>
              Le secret absolu qui sépare les commerçants qui durent et s'enrichissent de ceux qui font faillite.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#1D4ED8', fontSize: '0.96rem' }}>1️⃣ Poche 1 : Le Capital Marchandise</strong>
              <span style={{ background: '#1D4ED8', color: '#FFF', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>60% à 70%</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#1E3A8A', margin: 0, lineHeight: 1.5 }}>
              <strong>Cet argent ne vous appartient pas !</strong> Il appartient à la boutique. Il sert exclusivement à racheter la marchandise vendue dès demain chez vos grossistes ou vos fournisseurs de ballots.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#334155', fontSize: '0.96rem' }}>2️⃣ Poche 2 : Les Charges Fixes & Sécurité</strong>
              <span style={{ background: '#475569', color: '#FFF', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>15% à 20%</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Cette somme est mise de côté chaque jour pour payer le loyer de la boutique, la facture d'électricité, les sacs plastiques, le transport et les imprévus sans jamais stresser en fin de mois.
            </p>
          </div>

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#047857', fontSize: '0.96rem' }}>3️⃣ Poche 3 : Votre Vrai Salaire & Bénéfice</strong>
              <span style={{ background: '#059669', color: '#FFF', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>10% à 15%</span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#065F46', margin: 0, lineHeight: 1.5 }}>
              C'est <strong>VOTRE argent personnel</strong> que vous pouvez ramener à la maison pour votre famille. Fixez-vous une rémunération claire au lieu de puiser directement dans le tiroir-caisse !
            </p>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIGURATION DU MÉTIER */}
      <TradeConfigModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
      />

      {/* SECTION D'IMMERSION MÉTIER : COMMERCIA CONÇU SPÉCIFIQUEMENT POUR VOTRE SECTEUR */}
      <div
        id="metiers"
        style={{
          background: 'linear-gradient(135deg, #0B192C 0%, #1E293B 100%)',
          borderRadius: '16px',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          padding: '26px',
          marginBottom: '28px',
          color: '#FFFFFF',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* En-tête de section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 800, color: '#38BDF8', marginBottom: '10px' }}>
              <Compass size={14} />
              <span>COMMERCIA PAR SECTEUR : 20 MÉTIERS CONFIGURÉS EN AFRIQUE</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#FFFFFF', lineHeight: 1.3 }}>
              Une application qui s'adapte à <span style={{ color: '#FF7A00' }}>100% à votre activité</span>
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#94A3B8', maxWidth: '850px', lineHeight: 1.5 }}>
              Que vous vendiez des ballots de friperie, des beignets au carrefour, des pièces détachées ou des forfaits coiffure, COMMERCIA change son vocabulaire, ses indicateurs et ses modules pour coller exactement à votre quotidien.
            </p>
          </div>

          {/* Badge du métier actif de la boutique */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{currentActiveProfile.emoji}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Votre Métier Actuel</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF' }}>{currentActiveProfile.name}</div>
              </div>
            </div>
            <button
              onClick={() => setShowTradeModal(true)}
              style={{
                background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={12} />
              <span>Changer le profil de ma boutique</span>
            </button>
          </div>
        </div>

        {applyMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: applyMessage.includes('Succès') ? '#065F46' : '#991B1B',
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 700,
              marginBottom: '18px',
            }}
          >
            {applyMessage}
          </div>
        )}

        {/* 1. Sélecteur de Famille Métier */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            1. Choisissez une famille de commerce pour explorer le guide dédié :
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedFamilyFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.80rem',
                fontWeight: 700,
                border: selectedFamilyFilter === 'all' ? '2px solid #FF7A00' : '1px solid rgba(255,255,255,0.2)',
                background: selectedFamilyFilter === 'all' ? 'rgba(255, 122, 0, 0.25)' : 'rgba(255,255,255,0.06)',
                color: selectedFamilyFilter === 'all' ? '#FFA500' : '#E2E8F0',
                cursor: 'pointer',
              }}
            >
              Tous les Métiers (20)
            </button>
            {Object.entries(BUSINESS_FAMILIES).map(([fKey, fData]) => (
              <button
                key={fKey}
                onClick={() => setSelectedFamilyFilter(fKey)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  border: selectedFamilyFilter === fKey ? '2px solid #FF7A00' : '1px solid rgba(255,255,255,0.2)',
                  background: selectedFamilyFilter === fKey ? 'rgba(255, 122, 0, 0.25)' : 'rgba(255,255,255,0.06)',
                  color: selectedFamilyFilter === fKey ? '#FFA500' : '#E2E8F0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{fData.emoji}</span>
                <span>{fData.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Liste des métiers sous forme de mini-onglets */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            2. Métier sélectionné :
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '160px', overflowY: 'auto', paddingRight: '6px' }}>
            {Object.values(BUSINESS_PROFILES)
              .filter(p => selectedFamilyFilter === 'all' || p.family === selectedFamilyFilter)
              .map(p => {
                const isSelected = selectedTradeId === p.id;
                const isCurrentActive = activeBusiness?.profileId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTradeId(p.id)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      border: isSelected ? '2px solid #38BDF8' : '1px solid rgba(255,255,255,0.15)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255,255,255,0.04)',
                      color: isSelected ? '#FFFFFF' : '#CBD5E1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                    {isCurrentActive && (
                      <span style={{ fontSize: '0.62rem', background: '#10B981', color: '#FFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                        ACTIF
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>

        {/* 3. FICHE DÉTAILLÉE DU MÉTIER CHOISI */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            padding: '22px',
          }}
        >
          {/* Header du profil métier sélectionné */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  boxShadow: '0 4px 12px rgba(255, 107, 0, 0.35)',
                  flexShrink: 0,
                }}
              >
                {selectedProfileConfig.emoji}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    {selectedProfileConfig.name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.15)', color: '#F1F5F9', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    {selectedProfileConfig.familyName}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#8B5CF6', color: '#FFF', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                    Plan recommandé : {selectedDayScenario.recommendedPlan}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#94A3B8' }}>
                  {selectedProfileConfig.tagline}
                </p>
              </div>
            </div>

            {/* Bouton pour appliquer le profil si ce n'est pas le profil actif */}
            {activeBusiness?.profileId !== selectedProfileConfig.id ? (
              <button
                onClick={() => handleApplyProfileDirectly(selectedProfileConfig.id)}
                disabled={applyingProfile}
                style={{
                  background: 'linear-gradient(135deg, #0062FF 0%, #0095FF 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: applyingProfile ? 'wait' : 'pointer',
                  boxShadow: '0 4px 14px rgba(0, 98, 255, 0.35)',
                }}
              >
                <Check size={16} />
                <span>{applyingProfile ? 'Configuration en cours...' : `Activer ce profil (${selectedProfileConfig.name}) sur ma boutique`}</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399', fontSize: '0.84rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <CheckCircle2 size={16} />
                <span>Votre boutique utilise déjà cette configuration</span>
              </div>
            )}
          </div>

          {/* RÈGLE D'OR DE CE MÉTIER (BOÎTE AMBRE) */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Zap size={16} color="#FBBF24" />
              <strong style={{ color: '#FBBF24', fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                La Règle d'Or de Rentabilité pour ce Métier :
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#FEF3C7', fontWeight: 600, lineHeight: 1.5 }}>
              « {selectedDayScenario.goldenRule} »
            </p>
          </div>

          {/* TERMINOLOGIE ADAPTÉE : CE QUE L'APPLICATION AFFICHE POUR VOUS */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              🏷️ Vocabulaire & Terminologie adaptée à votre quotidien :
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.70rem', color: '#94A3B8' }}>Bouton & Menu Vente</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedProfileConfig.terminology.salesNav}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.70rem', color: '#94A3B8' }}>Articles / Produits</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedProfileConfig.terminology.itemsLabel}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.70rem', color: '#94A3B8' }}>Appellation Client</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                  {selectedProfileConfig.terminology.customerLabel}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.70rem', color: '#94A3B8' }}>Action Rapide d'Encaissement</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFA500', marginTop: '2px' }}>
                  {selectedProfileConfig.terminology.quickActionSale}
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE : LA JOURNÉE TYPE DU COMMERÇANT (DU MATIN AU SOIR) */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              ⏰ Le Film de votre Journée avec COMMERCIA (Du matin au soir) :
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDayScenario.dayTimeline.map((step, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #0062FF 0%, #0095FF 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.76rem',
                      fontWeight: 900,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Clock size={12} />
                    <span>{step.time}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.90rem', color: '#FFFFFF' }}>{step.action}</strong>
                      <span style={{ fontSize: '0.68rem', background: 'rgba(255, 122, 0, 0.2)', color: '#FFB066', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Module : {step.module}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 4px', fontSize: '0.84rem', color: '#CBD5E1', lineHeight: 1.45 }}>
                      {step.description}
                    </p>
                    <div style={{ fontSize: '0.76rem', color: '#FBBF24', fontStyle: 'italic' }}>
                      💡 Astuce terrain : {step.tip}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CONSEILS & PIÈGES MORTELS DU SECTEUR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', marginBottom: '8px' }}>
                ✅ 3 Clés pour maximiser votre marge :
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                {selectedDayScenario.sectorTips.map((tip, tIdx) => (
                  <li key={tIdx} style={{ marginBottom: '4px' }}>{tip}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#F87171', textTransform: 'uppercase', marginBottom: '8px' }}>
                ⚠️ 3 Pièges mortels qui causent la faillite :
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#FECACA', lineHeight: 1.5 }}>
                {selectedDayScenario.pitfallsToAvoid.map((pitfall, pIdx) => (
                  <li key={pIdx} style={{ marginBottom: '4px' }}>{pitfall}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: selectedCategory === cat.id ? '2px solid #0062FF' : '1px solid #E2E8F0',
              background: selectedCategory === cat.id ? '#EFF6FF' : '#FFFFFF',
              color: selectedCategory === cat.id ? '#0062FF' : '#475569',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* LIST OF GRANULAR TOOL GUIDES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {filtered.map(sec => {
          const IconComponent = sec.icon;
          return (
            <div
              key={sec.id}
              id={sec.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                scrollMarginTop: '90px',
              }}
            >
              {/* Header of Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#EFF6FF',
                      color: '#0062FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 800, color: '#0F172A' }}>
                        {sec.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          background: sec.badgeColor === '#10B981' ? '#ECFDF5' : '#F5F3FF',
                          color: sec.badgeColor === '#10B981' ? '#047857' : '#6D28D9',
                          border: `1px solid ${sec.badgeColor === '#10B981' ? '#A7F3D0' : '#DDD6FE'}`,
                          padding: '2px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        {sec.badge}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748B' }}>
                      {sec.summary}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(sec.route)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px', fontWeight: 700 }}
                >
                  <span>Ouvrir cet outil</span>
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* WHY CRUCIAL */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                  borderLeft: '4px solid #0062FF',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0062FF', marginBottom: '4px', textTransform: 'uppercase' }}>
                  🎯 Pourquoi cet outil est vital pour votre commerce :
                </div>
                <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
                  {sec.whyCrucial}
                </div>
              </div>

              {/* STEP BY STEP USAGE */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
                  📋 Comment l'utiliser étape par étape :
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sec.howToSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.45 }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#EFF6FF', color: '#0062FF', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.76rem' }}>
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DOMINO EFFECT : AUTOMATIC VS MANUAL */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px',
                  marginBottom: '18px',
                }}
              >
                {/* Automatisé */}
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 800, fontSize: '0.80rem', marginBottom: '8px' }}>
                    <Zap size={16} />
                    <span>L'EFFET DOMINO (100% AUTOMATISÉ)</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.80rem', color: '#166534', lineHeight: 1.5 }}>
                    {sec.autoDomino.map((a, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{a}</li>
                    ))}
                  </ul>
                </div>

                {/* Manuel */}
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', fontWeight: 800, fontSize: '0.80rem', marginBottom: '8px' }}>
                    <HandMetal size={16} />
                    <span>CE QUI RESTE MANUEL (VOTRE CONTRÔLE)</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.80rem', color: '#92400E', lineHeight: 1.5 }}>
                    {sec.manualRole.map((m, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CONCRETE REAL EXAMPLE */}
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <Lightbulb size={20} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.84rem', color: '#78350F', lineHeight: 1.45 }}>
                  <strong style={{ color: '#92400E' }}>Cas réel de terrain : </strong>
                  {sec.realExample}
                </div>
              </div>

              {/* PITFALLS */}
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontWeight: 800, fontSize: '0.78rem', marginBottom: '6px' }}>
                  <AlertTriangle size={15} />
                  <span>LES PIÈGES À ÉVITER ABSOLUMENT :</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.80rem', color: '#991B1B', lineHeight: 1.45 }}>
                  {sec.pitfallsToAvoid.map((p, idx) => (
                    <li key={idx} style={{ marginBottom: '3px' }}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
