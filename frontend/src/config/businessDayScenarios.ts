// =========================================================================
// COMMERCIA — SCÉNARIOS DE JOURNÉES TYPES & RÈGLES D'OR PAR MÉTIER (20 SECTEURS)
// Permet à chaque utilisateur de vivre l'application comme conçue EXCLUSIVEMENT pour son métier
// =========================================================================

export interface BusinessDayStep {
  time: string;
  action: string;
  module: string;
  description: string;
  tip: string;
}

export interface BusinessTradeScenario {
  profileId: string;
  name: string;
  emoji: string;
  goldenRule: string;
  recommendedPlan: 'Pro' | 'Business' | 'Gratuit' | 'Gratuit ou Pro' | 'Pro ou Business' | string;
  planReason: string;
  dayTimeline: BusinessDayStep[];
  sectorTips: string[];
  pitfallsToAvoid: string[];
}

export const BUSINESS_DAY_SCENARIOS: Record<string, BusinessTradeScenario> = {
  // 1. FRIPERIE & VÊTEMENTS
  friperie_vetements: {
    profileId: 'friperie_vetements',
    name: 'Friperie & Prêt-à-porter',
    emoji: '👗',
    goldenRule: 'Ne jamais baisser le prix du 1er choix tant que le Point Mort du ballot n\'est pas franchi.',
    recommendedPlan: 'Pro',
    planReason: 'Débloque le module Lots & Déballages, le calcul du Point Mort et les relances WhatsApp.',
    dayTimeline: [
      {
        time: '07h30',
        action: 'Réception & Enregistrement du Ballot',
        module: 'Lots & Déballages',
        description: 'Saisie du Landed Cost (Prix d\'achat du ballot + transport + bagagistes). L\'application calcule le coût moyen par pièce.',
        tip: 'Intégrez immédiatement le transport et le blanchissage dans le coût global.',
      },
      {
        time: '09h00',
        action: 'Triage & Calibrage des Prix',
        module: 'Lots & Déballages',
        description: 'Séparation en 3 catégories : 1er Choix Crème (sur cintre à 5 000 F), 2e Choix (table à 2 500 F) et Déstockage (1 000 F).',
        tip: 'COMMERCIA affiche en direct le nombre exact de pièces nécessaires pour atteindre le point mort.',
      },
      {
        time: '11h00',
        action: 'Shooting & Annonces WhatsApp / TikTok',
        module: 'Croissance & Canaux',
        description: 'Publication des pièces 1er choix sur les statuts WhatsApp. Attribution des ventes au canal digital.',
        tip: 'Les clients fidèles achètent le 1er choix dans les 2 premières heures.',
      },
      {
        time: '15h00',
        action: 'Encaissement Rapide & Ventes Croisées',
        module: 'Ventes & Déballages',
        description: 'Vente au comptoir : enregistrement des paiements (Cash, Wave, Orange Money). La jauge de rentabilité du ballot progresse.',
        tip: 'Dès que la jauge dépasse 100%, chaque vêtement vendu est 100% du bénéfice net.',
      },
      {
        time: '19h00',
        action: 'Clôture Caisse & Règle des 3 Poches',
        module: 'Caisse Journalière',
        description: 'Comptage physique des billets. Séparation : 60% pour racheter le prochain ballot, 15% pour le loyer/pressing, 25% bénéfice net.',
        tip: 'Consultez le Copilote IA pour savoir si vous pouvez déjà commander le prochain arrivage.',
      },
    ],
    sectorTips: [
      'Le tri rapide le matin du déballage conditionne 70% de la rentabilité.',
      'Ne mélangez jamais les recettes d\'un nouveau ballot avec celles d\'un ancien arrivage.',
      'Les invendus après 15 jours doivent être bradés en lot pour libérer la trésorerie.',
    ],
    pitfallsToAvoid: [
      'Piocher dans la caisse pour les dépenses du foyer avant d\'avoir sécurisé la Poche Réassort.',
      'Accorder du crédit informel sans créer la fiche client dans COMMERCIA.',
      'Vendre au rabais dès le premier jour par peur de ne pas écouler.',
    ],
  },

  // 2. RESTAURATION, FAST-FOOD & STREET-FOOD (MAMAN CHANTAL BHB)
  restauration_repas: {
    profileId: 'restauration_repas',
    name: 'Restauration & Street-Food (BHB / Fast-Food)',
    emoji: '🍲',
    goldenRule: 'Vendre en combo et sceller les marmites le soir : toute portion invendue ou brûlée doit être enregistrée.',
    recommendedPlan: 'Pro',
    planReason: 'Module Cuisine & Recettes, fiches techniques de portions et Touches Rapides 1 Clic indispensables pendant le rush.',
    dayTimeline: [
      {
        time: '04h30',
        action: 'Achats au Marché & Fiches Ingrédients',
        module: 'Recettes & Plats du jour',
        description: 'Achat de farine, huile, haricots, maïs, viande. Enregistrement des coûts réels pour calculer le prix de revient de chaque portion.',
        tip: 'Mesurez vos ingrédients au kilo ou au sac pour verrouiller votre coût matière.',
      },
      {
        time: '06h00',
        action: 'Ouverture de Caisse avec Monnaie',
        module: 'Caisse Journalière',
        description: 'Saisie du fond de caisse (ex: 5 000 FCFA de pièces et petits billets). La session est prête.',
        tip: 'Sans monnaie le matin, vous perdez les clients pressés.',
      },
      {
        time: '06h30 - 10h00',
        action: 'Rush du Matin : Touches Rapides 1 Clic',
        module: 'Recettes & Vente Express',
        description: 'Encaissements ultra-rapides : Combos 300 F, Combos Chauffeur 400 F, Grands Plats 500 F. Gestion instantanée Cash / Wave / Crédits ardoises.',
        tip: 'Proposez systématiquement les haricots avec les beignets : les haricots dégagent 70% de marge nette !',
      },
      {
        time: '10h30',
        action: 'Enregistrement des Pertes & Portions Offertes',
        module: 'Pertes & Dons',
        description: 'Comptage des beignets brûlés (pertes avaries) et des bonus offerts aux clients fidèles (dégustations).',
        tip: 'Tracer les portions offertes protège votre cohérence d\'inventaire.',
      },
      {
        time: '11h00',
        action: 'Clôture Caisse & Règle des 3 Poches',
        module: 'Caisse & Trésorerie',
        description: 'Comptage des espèces, validation à 0 écart. Répartition : 60% Poche Marché demain, 15% Tontine/Gaz, 25% Bénéfice net Maman.',
        tip: 'L\'argent de la Poche Marché doit rester intouchable jusqu\'au réveil à 04h30.',
      },
    ],
    sectorTips: [
      'Pesez régulièrement vos rations pour éviter que les employés ne servent des portions trop généreuses.',
      'Orientez vos clients vers les boissons fraîches ou accompagnements à très forte marge.',
      'Ne laissez jamais un crédit ouvert à un client sans avoir son numéro de téléphone.',
    ],
    pitfallsToAvoid: [
      'Manger ou offrir les plats sans les enregistrer en sorties de stock ou dégustations.',
      'Confondre la recette brute totale de la marmite avec le bénéfice de la cuisinière.',
      'Oublier de compter le bois de chauffe ou la recharge de gaz dans les charges journalières.',
    ],
  },

  // 3. ÉPICERIE & ALIMENTATION GÉNÉRALE
  epicerie_alimentation: {
    profileId: 'epicerie_alimentation',
    name: 'Épicerie & Alimentation générale',
    emoji: '🛒',
    goldenRule: 'Zéro rupture sur les produits d\'appel (sucre, huile, riz) et tolérance zéro sur les crédits sans relance.',
    recommendedPlan: 'Gratuit ou Pro',
    planReason: 'Parfait en gratuit pour débuter ; Pro indispensable dès que le catalogue dépasse 100 articles ou pour WhatsApp auto.',
    dayTimeline: [
      {
        time: '07h00',
        action: 'Ouverture Magasin & Fond de Caisse',
        module: 'Caisse Journalière',
        description: 'Vérification des pièces de monnaie et consultation du Tableau de Bord pour repérer les stocks sous le seuil d\'alerte.',
        tip: 'Repérez immédiatement les produits en alerte orange pour commander au grossiste avant midi.',
      },
      {
        time: '09h00',
        action: 'Vente Comptoir Express & Calcul Monnaie',
        module: 'Ventes Comptoir',
        description: 'Scan ou sélection rapide des produits vendus. Calcul automatique de la monnaie à rendre pour éviter les erreurs de caisse.',
        tip: 'Utilisez la recherche instantanée par nom ou code court.',
      },
      {
        time: '12h00',
        action: 'Gestion des Ardoises & Crédits Voisins',
        module: 'Clients & Dettes',
        description: 'Inscription nominative des crédits accordés aux habitués du quartier. Fixation d\'une date limite stricte.',
        tip: 'Ne dépassez jamais 20% de votre chiffre d\'affaires mensuel en crédits dehors.',
      },
      {
        time: '16h00',
        action: 'Réception du Réassort Grossiste',
        module: 'Catalogue & Stocks',
        description: 'Saisie de l\'entrée de stock dès la livraison des cartons. Mise à jour automatique des coûts moyens pondérés.',
        tip: 'Vérifiez les dates de péremption dès la réception des cartons.',
      },
      {
        time: '21h00',
        action: 'Clôture Caisse & Relances WhatsApp Débiteurs',
        module: 'Caisse & Clients',
        description: 'Vérification du tiroir-caisse et envoi en 1 clic des rappels de dette polis pré-rédigés sur WhatsApp.',
        tip: 'Un rappel courtois envoyé la veille de la paie garantit 80% de recouvrement.',
      },
    ],
    sectorTips: [
      'Placez les produits d\'impulsion (bonbons, piles, chewing-gums) juste à côté du comptoir de caisse.',
      'Faites un inventaire physique tournant d\'un rayon différent chaque mardi.',
      'Réglez vos grossistes comptant pour négocier des remises de 3% à 5%.',
    ],
    pitfallsToAvoid: [
      'Laisser les employés consommer des boissons ou biscuits du magasin sans les scanner.',
      'Accorder un nouveau crédit à un client qui n\'a pas soldé son ardoise du mois passé.',
      'Vendre sans enregistrer en pensant « je noterai ce soir ».',
    ],
  },

  // 4. ATELIER DE COUTURE & STYLISME
  atelier_couture: {
    profileId: 'atelier_couture',
    name: 'Atelier de Couture & Stylisme',
    emoji: '🪡',
    goldenRule: '40% d\'acompte obligatoire au dépôt du tissu, zéro tissu découpé sans fiche de mesure scellée.',
    recommendedPlan: 'Pro',
    planReason: 'Module Commandes & Devis, fiches de mesure client et bons de retrait WhatsApp.',
    dayTimeline: [
      {
        time: '08h30',
        action: 'Pointage de l\'Atelier & Planning',
        module: 'Commandes & Devis',
        description: 'Vérification des commandes prévues pour essayage ou livraison aujourd\'hui dans le kanban d\'atelier.',
        tip: 'Priorisez les modèles des clients qui ont rendez-vous en soirée.',
      },
      {
        time: '10h30',
        action: 'Dépôt Tissu & Prise de Mesures',
        module: 'Commandes & Devis',
        description: 'Création de la commande : modèle convenu, mensurations complètes, date de livraison et photo du tissu.',
        tip: 'Prenez en photo le tissu sur le comptoir pour éviter toute contestation de métrage ou de motif.',
      },
      {
        time: '11h00',
        action: 'Encaissement de l\'Acompte & Reçu WhatsApp',
        module: 'Caisse & Commandes',
        description: 'Perception de l\'acompte (40% minimum). Envoi immédiat du bon de dépôt officiel numéroté sur WhatsApp.',
        tip: 'L\'acompte sécurise l\'achat des doublures, fermetures et fils.',
      },
      {
        time: '15h00',
        action: 'Suivi de Production & Changement de Statut',
        module: 'Commandes & Devis',
        description: 'Passage des fiches : En coupe ➔ En confection ➔ Prêt pour essayage. Notification automatique envoyée.',
        tip: 'Prévenir le client 24h avant l\'essayage réduit les rendez-vous manqués.',
      },
      {
        time: '18h30',
        action: 'Livraison Finale & Encaissement du Solde',
        module: 'Commandes & Caisse',
        description: 'Essayage réussi. Encaissement des 60% restants avant remise du vêtement. Clôture de la commande.',
        tip: 'Ne remettez jamais le vêtement sans avoir touché l\'intégralité du solde.',
      },
    ],
    sectorTips: [
      'Gardez toujours un stock tampon de fermetures éclair de qualité pour ne pas bloquer l\'atelier.',
      'Identifiez chaque tissu avec une étiquette portant le numéro de commande généré par COMMERCIA.',
      'Archivez les fiches de mesures des clientes : elles adoreront commander à distance sans se redéplacer.',
    ],
    pitfallsToAvoid: [
      'Commencer à coudre un tissu sans avoir touché l\'acompte d\'engagement.',
      'Accepter des délais impossibles sans facturer un supplément express.',
      'Perdre le contrôle des chutes de tissus de valeur.',
    ],
  },

  // 5. KIOSQUE & AGENCE MOBILE MONEY (WAVE, ORANGE, MTN)
  agence_mobile_money: {
    profileId: 'agence_mobile_money',
    name: 'Agence & Kiosque Mobile Money',
    emoji: '📱',
    goldenRule: 'La monnaie physique et les UV (monnaie électronique) sont un miroir : seule la commission est votre gain.',
    recommendedPlan: 'Pro',
    planReason: 'Module Opérations Mobile Money, calcul automatique des commissions et suivi séparé Cash / UV.',
    dayTimeline: [
      {
        time: '07h30',
        action: 'Pointage Initial Cash & Float (UV)',
        module: 'Opérations Mobile Money',
        description: 'Comptage physique des espèces dans le coffre + relevé des soldes électroniques sur les téléphones opérateurs.',
        tip: 'Le total (Cash + UV) doit être rigoureusement identique au capital d\'agence de la veille.',
      },
      {
        time: '09h00',
        action: 'Gestion des Dépôts de Fonds Clients',
        module: 'Opérations Mobile Money',
        description: 'Le client remet des espèces, vous envoyez des UV. La caisse liquide monte, votre solde électronique diminue.',
        tip: 'Recomptez les billets avant de valider le transfert sur le téléphone.',
      },
      {
        time: '12h00',
        action: 'Gestion des Retraits d\'Argent',
        module: 'Opérations Mobile Money',
        description: 'Le client transfère des UV sur votre compte agent, vous lui tendez les espèces. La commission opérateur est créditée.',
        tip: 'Attendez TOUJOURS le SMS officiel du serveur opérateur avant de donner le moindre billet.',
      },
      {
        time: '16h00',
        action: 'Rééquilibrage Caisse / Banque (Liquidation)',
        module: 'Trésorerie & Virements',
        description: 'Si vous avez trop de cash physique ou trop peu d\'UV, virement ou dépôt bancaire pour recharger le float.',
        tip: 'Évitez de garder des sommes astronomiques de cash liquide dans un kiosque de rue.',
      },
      {
        time: '20h00',
        action: 'Clôture & Constat des Commissions Nettes',
        module: 'Caisse & Mobile Money',
        description: 'Comptage final. COMMERCIA isole vos commissions nettes acquises (votre vrai CA) du simple flux financier.',
        tip: 'Consultez votre bénéfice net réel par opérateur (Wave vs Orange vs MTN).',
      },
    ],
    sectorTips: [
      'Méfiez-vous des faux SMS de confirmation : vérifiez toujours le solde sur votre propre application agent.',
      'Prévoyez des coupures de 1 000 F et 500 F pour ne jamais refuser un retrait pour manque de monnaie.',
      'La vitesse d\'exécution au guichet fidélise les clients professionnels qui déposent gros.',
    ],
    pitfallsToAvoid: [
      'Penser que le cash déposé par les clients est de l\'argent disponible pour la boutique.',
      'Valider un retrait sur un appel téléphonique prétendant venir de l\'opérateur (« test technique »).',
      'Mélanger les commissions d\'agence avec le fond de roulement de roulement principal.',
    ],
  },

  // 6. QUINCAILLERIE & MATÉRIAUX DE CONSTRUCTION
  quincaillerie: {
    profileId: 'quincaillerie',
    name: 'Quincaillerie & Matériaux de Construction',
    emoji: '🔨',
    goldenRule: 'Vérifier les bons de livraison chauffeur et sécuriser les acomptes sur les commandes lourdes.',
    recommendedPlan: 'Pro ou Business',
    planReason: 'Gestion des stocks lourds, devis pro-forma, bons de livraison et multi-dépôts.',
    dayTimeline: [
      {
        time: '07h30',
        action: 'Ouverture Dépôt & Contrôle Matériaux',
        module: 'Catalogue & Stocks',
        description: 'Vérification des niveaux de stock de ciment, fer à béton, peinture et tuyaux PVC.',
        tip: 'Le ciment craint l\'humidité : surveillez les arrivages anciens.',
      },
      {
        time: '09h00',
        action: 'Édition de Devis Pro-forma & Chantiers',
        module: 'Commandes & Devis',
        description: 'Chiffrage rapide pour chefs de chantier et maçons. Impression ou envoi WhatsApp du devis complet.',
        tip: 'Indiquez une durée de validité courte (ex: 7 jours) à cause de la volatilité des cours du fer.',
      },
      {
        time: '11h30',
        action: 'Validation Commande & Bon de Livraison',
        module: 'Livraisons & Expéditions',
        description: 'Encaissement de l\'acompte ou du montant total. Génération du bon de chargement pour le chauffeur.',
        tip: 'Faites signer le bordereau de livraison à la décharge sur le chantier.',
      },
      {
        time: '15h00',
        action: 'Vente au Détail au Comptoir',
        module: 'Ventes Comptoir',
        description: 'Vente de visserie, outillage, robinetterie et petits consommables avec calcul immédiat de marge.',
        tip: 'Les petits accessoires (pinceaux, rubans adhésifs) dégagent les marges les plus fortes (+60%).',
      },
      {
        time: '18h30',
        action: 'Clôture Caisse & Rapprochement Bancaire',
        module: 'Caisse & Trésorerie',
        description: 'Comptage des chèques, virements bancaires et espèces reçus des entrepreneurs BTP.',
        tip: 'Identifiez les clients en compte pour lancer les factures récapitulatives de fin de mois.',
      },
    ],
    sectorTips: [
      'Négociez des remises sur volume directement auprès des usines de ciment.',
      'Surveillez le vol de petits outils et pièces de cuivre en restreignant l\'accès au stock.',
      'Facturez le transport de livraison ou intégrez-le de façon transparente dans le prix livré.',
    ],
    pitfallsToAvoid: [
      'Livrer sur un chantier sans bon signé par le chef de chantier désigné.',
      'Accorder des crédits illimités aux sous-traitants sans caution.',
      'Oublier de compter les sacs de ciment percés ou durcis en pertes d\'exploitation.',
    ],
  },

  // 7. SALON DE COIFFURE, BARBIER & TRESSES
  salon_coiffure_barbier: {
    profileId: 'salon_coiffure_barbier',
    name: 'Salon de Coiffure, Barbier & Tresses',
    emoji: '✂️',
    goldenRule: 'Combiner prestation de coiffure et vente de soins capillaires pour doubler le ticket moyen.',
    recommendedPlan: 'Pro',
    planReason: 'Gestion combinée des prestations de service et des ventes de produits, commissions employés.',
    dayTimeline: [
      {
        time: '08h30',
        action: 'Préparation du Salon & Stock Produits',
        module: 'Catalogue & Soins',
        description: 'Vérification des shampoings, mèches, crèmes de défrisage et huiles de barbe.',
        tip: 'Affichez clairement la carte des forfaits à l\'entrée pour éviter les hésitations.',
      },
      {
        time: '10h00',
        action: 'Accueil & Enregistrement des Prestations',
        module: 'Ventes & Prestations',
        description: 'Saisie de la prestation (Coiffure VIP, Tresses sénégalaises, Rasage à l\'ancienne) avec attribution au coiffeur.',
        tip: 'Attribuer le client au collaborateur permet le calcul automatique de sa commission le soir.',
      },
      {
        time: '13h30',
        action: 'Vente Additionnelle de Produits',
        module: 'Ventes & Soins',
        description: 'Proposition d\'un sérum d\'entretien ou d\'une huile protectrice au moment de l\'encaissement.',
        tip: 'Un client satisfait du résultat achète volontiers le produit pour prolonger la beauté chez lui.',
      },
      {
        time: '17h00',
        action: 'Encaissements Mixtes (Cash & Wave)',
        module: 'Caisse Journalière',
        description: 'Encaissement rapide sans faire attendre les autres clients. Pourboires enregistrés.',
        tip: 'Affichez votre QR Code Wave ou Orange Money bien en vue sur le miroir.',
      },
      {
        time: '20h30',
        action: 'Clôture Caisse & Rémunération des Coiffeurs',
        module: 'Caisse & Équipe',
        description: 'Comptage de la caisse. Calcul transparent des commissions de chaque coiffeur selon les prestations de la journée.',
        tip: 'La transparence des chiffres garantit la fidélité de votre équipe.',
      },
    ],
    sectorTips: [
      'Désinfectez le matériel entre chaque client : l\'hygiène est le premier facteur de recommandation.',
      'Offrez un café ou un thé aux clients VIP pendant les poses longues.',
      'Relancez les clientes 3 semaines après leur coiffure pour leur prochain rendez-vous d\'entretien.',
    ],
    pitfallsToAvoid: [
      'Laisser les employés encaisser l\'argent directement dans leurs poches sans passer par COMMERCIA.',
      'Ne pas suivre la consommation des crèmes et shampoings (gaspillage au bac).',
      'Oublier de payer les charges de salon (électricité des séchoirs, eau) avec la Poche 2.',
    ],
  },

  // 8. RÉPARATION TÉLÉPHONES, SAV & INFORMATIQUE
  reparation_telephones_info: {
    profileId: 'reparation_telephones_info',
    name: 'Réparation Téléphones, SAV & Informatique',
    emoji: '🔧',
    goldenRule: 'Fiche de prise en charge obligatoire avec test d\'allumage initial et photo de l\'état de l\'appareil.',
    recommendedPlan: 'Pro',
    planReason: 'Module Commandes & SAV, fiches de dépôt avec numéro IMEI, traçabilité des pièces détachées.',
    dayTimeline: [
      {
        time: '08h30',
        action: 'Ouverture Atelier & Inventaire Pièces',
        module: 'Catalogue & Pièces',
        description: 'Vérification du stock d\'écrans d\'origine, batteries, nappes de charge et connecteurs.',
        tip: 'Ayez toujours les 5 écrans les plus demandés en stock d\'avance.',
      },
      {
        time: '10h00',
        action: 'Prise en Charge Appareil & Diagnostic',
        module: 'Commandes & SAV',
        description: 'Création de la fiche SAV : Marque, modèle, numéro IMEI, panne signalée, schéma de déverrouillage et rayures préexistantes.',
        tip: 'Testez l\'appareil devant le client (micro, caméra, tactile) avant de l\'enregistrer.',
      },
      {
        time: '11h00',
        action: 'Acompte & Reçu WhatsApp Officiel',
        module: 'Caisse & SAV',
        description: 'Encaissement de l\'acompte pièce (50%). Envoi immédiat du ticket de prise en charge sur WhatsApp.',
        tip: 'Le ticket WhatsApp comporte la clause légale de non-responsabilité pour les pannes logicielles cachées.',
      },
      {
        time: '15h00',
        action: 'Réparation Terminée & Notification Client',
        module: 'Commandes & SAV',
        description: 'Passage du statut à « Réparé & Testé ». Envoi automatique du message invitant le client à venir récupérer.',
        tip: 'Un client prévenu rapidement libère votre atelier et apporte son solde sans tarder.',
      },
      {
        time: '18h30',
        action: 'Restitution, Encaissement Solde & Garantie',
        module: 'Caisse & SAV',
        description: 'Test final devant le client. Encaissement du solde restant et remise du bon de garantie pièce (ex: 30 jours).',
        tip: 'Faites signer la décharge de restitution avant de tendre l\'appareil.',
      },
    ],
    sectorTips: [
      'Étiquetez chaque téléphone démonté dans une boîte fermée portant le code COMMERCIA.',
      'Ne conservez jamais les appareils abandonnés plus de 90 jours sans clause d\'aliénation.',
      'Proposez systématiquement la pose d\'un film hydrogel ou verre trempé après chaque changement d\'écran.',
    ],
    pitfallsToAvoid: [
      'Accepter un téléphone bloqué sans vérifier la pièce d\'identité du client (risque de recel).',
      'Rendre un appareil réparé sans avoir touché l\'intégralité du solde.',
      'Oublier de déduire la pièce détachée remplacée de votre stock.',
    ],
  },

  // 9. DÉPÔT DE BOISSONS & GROSSISTE
  depot_boissons_distribution: {
    profileId: 'depot_boissons_distribution',
    name: 'Dépôt de Boissons & Distribution',
    emoji: '🚚',
    goldenRule: 'Surveillance absolue des casiers vides consignés : un casier perdu est une marge détruite.',
    recommendedPlan: 'Business',
    planReason: 'Gestion des tournées, gros volumes de vente par palettes/casiers et consignations.',
    dayTimeline: [
      {
        time: '06h30',
        action: 'Départ des Tournées de Livraison',
        module: 'Livraisons & Distribution',
        description: 'Chargement des camions ou triporteurs. Édition des feuilles de route pour les maquis, bars et boutiques clientes.',
        tip: 'Vérifiez le pointage des casiers pleins sortants par rapport au bon de chargement.',
      },
      {
        time: '09h00',
        action: 'Vente Directe au Dépôt (Semi-Gros)',
        module: 'Ventes Comptoir',
        description: 'Encaissement des revendeurs de quartier venant s\'approvisionner par 10 ou 20 casiers.',
        tip: 'Appliquez le tarif dégressif selon le volume sans fausser vos marges.',
      },
      {
        time: '14h00',
        action: 'Retour Tournée & Réconciliation Consignes',
        module: 'Livraisons & Stocks',
        description: 'Comptage des casiers vides retournés (consignation) et des invendus. Encaissement des fonds collectés.',
        tip: 'Tout casier vide manquant doit être facturé au livreur ou au client.',
      },
      {
        time: '16h30',
        action: 'Réception Camion Brasserie (Approvisionnement)',
        module: 'Catalogue & Stocks',
        description: 'Réception des palettes de bières, sodas et eaux minérales. Saisie immédiate de l\'entrée de stock.',
        tip: 'Vérifiez la casse éventuelle pendant le déchargement pour la déclarer au transporteur.',
      },
      {
        time: '19h30',
        action: 'Clôture Caisse & Rapprochement Bancaire',
        module: 'Caisse & Trésorerie',
        description: 'Comptage des importants flux d\'espèces et sécurisation immédiate par dépôt bancaire ou virement Wave.',
        tip: 'Consultez votre trésorerie nette pour planifier la commande brasserie du lendemain.',
      },
    ],
    sectorTips: [
      'Établissez des partenariats exclusifs avec les bars et restaurants réguliers de votre zone.',
      'Gardez une réserve tampon de packs d\'eau minérale pour les week-ends et jours fériés.',
      'Automatisez la relance des maquisards qui dépassent leur délai de paiement de 48 heures.',
    ],
    pitfallsToAvoid: [
      'Laisser sortir des casiers en verre sans consigne payée ou échangée.',
      'Garder des dizaines de millions d\'espèces au dépôt la nuit.',
      'Ignorer la rotation First-In First-Out (FIFO) sur les boissons périssables.',
    ],
  },
};

// Fonction helper pour récupérer le scénario ou créer un scénario adapté par défaut
export function getBusinessDayScenario(profileId?: string | null): BusinessTradeScenario {
  if (profileId && BUSINESS_DAY_SCENARIOS[profileId]) {
    return BUSINESS_DAY_SCENARIOS[profileId];
  }

  // Scénario par défaut universel
  return {
    profileId: profileId || 'epicerie_alimentation',
    name: 'Commerce & Activité Commerciale',
    emoji: '🏪',
    goldenRule: 'Appliquer la Règle des 3 Poches : 60% pour le stock de demain, 15% pour les charges, 25% pour votre bénéfice net.',
    recommendedPlan: 'Pro',
    planReason: 'Permet d\'adapter l\'intégralité des modules à vos besoins réels et de suivre vos finances sans failles.',
    dayTimeline: [
      {
        time: '08h00',
        action: 'Ouverture de Caisse & Consultation KPIs',
        module: 'Caisse Journalière',
        description: 'Saisie de la monnaie de départ et vérification du tableau de bord pour repérer les priorités du jour.',
        tip: 'Ne commencez jamais la journée sans avoir ouvert votre session de caisse.',
      },
      {
        time: '10h00',
        action: 'Ventes & Encaissements au Comptoir',
        module: 'Ventes',
        description: 'Enregistrement immédiat de chaque paiement reçu (Cash, Wave, Orange Money, Crédits).',
        tip: 'Imprimez le ticket ou partagez le reçu officiel au client sur WhatsApp.',
      },
      {
        time: '14h00',
        action: 'Gestion des Dépenses & Sorties de Caisse',
        module: 'Dépenses',
        description: 'Déclaration instantanée de chaque billet qui sort du tiroir pour préserver le calcul du bénéfice net.',
        tip: 'Exigez systématiquement un reçu ou une facturette.',
      },
      {
        time: '17h00',
        action: 'Suivi des Dettes & Relances Clients',
        module: 'Clients & Dettes',
        description: 'Consultation des ardoises en retard et envoi des messages de relance courtois sur WhatsApp en 1 clic.',
        tip: 'L\'argent dehors doit rentrer pour alimenter le réassort.',
      },
      {
        time: '19h30',
        action: 'Clôture de Caisse & Règle des 3 Poches',
        module: 'Caisse & Trésorerie',
        description: 'Comptage physique des espèces, justification de tout écart et répartition saine des bénéfices.',
        tip: 'Consultez le Copilote IA pour faire le point sur la journée écoulée.',
      },
    ],
    sectorTips: [
      'Enregistrez chaque transaction au moment où elle a lieu sans attendre le soir.',
      'Séparez rigoureusement vos dépenses personnelles de l\'argent de l\'entreprise.',
      'Utilisez le Copilote IA dès que vous avez un doute financier ou stratégique.',
    ],
    pitfallsToAvoid: [
      'Garder du liquide non compté sans clôture journalière.',
      'Accorder du crédit informel à des inconnus.',
      'Mélanger votre compte personnel avec les fonds du commerce.',
    ],
  };
}
