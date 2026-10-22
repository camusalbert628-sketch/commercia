// COMMERCIA Deep AI Knowledge Engine
// Complete expert brain on African retail, bookkeeping, financial rules, and the entire COMMERCIA SaaS application.

export interface LiveStoreContext {
  userName: string;
  businessName: string;
  sector: string;
  planName: string;
  isCashOpen: boolean;
  theoreticalCash: number;
  initialCash: number;
  totalCashIn: number;
  totalCashOut: number;
  totalMomoIn: number;
  todaySalesCount: number;
  todaySalesTotal: number;
  todayExpensesTotal: number;
  totalDebtsOwed: number;
  debtorsCount: number;
  topDebtors: Array<{ name: string; amount: number; phone?: string }>;
  lowStockCount: number;
  lowStockProducts: Array<{ name: string; quantity: number }>;
}

export function getLiveStoreContext(): LiveStoreContext {
  try {
    const rawUser = localStorage.getItem('commercia_user');
    const user = rawUser ? JSON.parse(rawUser) : null;
    const activeBiz = user?.businesses?.[0];
    const bizId = localStorage.getItem('activeBusinessId') || activeBiz?.id || 'default';

    // Cash session
    const cashRaw = localStorage.getItem('commercia_active_cash_session');
    const cashSession = cashRaw ? JSON.parse(cashRaw) : null;
    const isCashOpen = Boolean(cashSession && cashSession.status === 'open');

    // Sales
    const salesRaw = localStorage.getItem(`commercia_sales_${bizId}`) || localStorage.getItem('commercia_sales');
    const sales = salesRaw ? JSON.parse(salesRaw) : [];
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s: any) => (s.saleDate || s.createdAt || '').startsWith(today));
    const todaySalesTotal = todaySales.reduce((acc: number, s: any) => acc + (Number(s.paidAmount !== undefined ? s.paidAmount : s.totalAmount) || 0), 0);

    // Expenses
    const expRaw = localStorage.getItem(`commercia_expenses_${bizId}`) || localStorage.getItem('commercia_expenses');
    const expenses = expRaw ? JSON.parse(expRaw) : [];
    const todayExpenses = expenses.filter((e: any) => (e.expenseDate || e.createdAt || '').startsWith(today));
    const todayExpensesTotal = todayExpenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

    // Customers & Debts
    const custRaw = localStorage.getItem(`commercia_customers_${bizId}`) || localStorage.getItem('commercia_customers');
    const customers = custRaw ? JSON.parse(custRaw) : [];
    const debtors = customers.filter((c: any) => Number(c.totalOwed || 0) > 0);
    const totalDebtsOwed = debtors.reduce((acc: number, c: any) => acc + Number(c.totalOwed || 0), 0);
    const topDebtors = debtors
      .sort((a: any, b: any) => Number(b.totalOwed || 0) - Number(a.totalOwed || 0))
      .slice(0, 3)
      .map((c: any) => ({ name: c.name, amount: Number(c.totalOwed || 0), phone: c.phone }));

    // Products & Stock
    const prodRaw = localStorage.getItem(`commercia_products_${bizId}`) || localStorage.getItem('commercia_products');
    const products = prodRaw ? JSON.parse(prodRaw) : [];
    const lowStock = products.filter((p: any) => Number(p.quantity || 0) <= Number(p.lowStockAlert || 5));

    return {
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Commerçant',
      businessName: activeBiz?.name || 'Mon Activité COMMERCIA',
      sector: activeBiz?.sector || 'Commerce Général',
      planName: user?.subscription?.planDisplayName || 'Plan Pro',
      isCashOpen,
      theoreticalCash: cashSession ? Number(cashSession.theoreticalCash || 0) : 0,
      initialCash: cashSession ? Number(cashSession.initialCash || 0) : 0,
      totalCashIn: cashSession ? Number(cashSession.totalCashIn || 0) : 0,
      totalCashOut: cashSession ? Number(cashSession.totalCashOut || 0) : 0,
      totalMomoIn: cashSession ? Number(cashSession.totalMomoIn || 0) : 0,
      todaySalesCount: todaySales.length,
      todaySalesTotal,
      todayExpensesTotal,
      totalDebtsOwed,
      debtorsCount: debtors.length,
      topDebtors,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock.slice(0, 3).map((p: any) => ({ name: p.name, quantity: Number(p.quantity || 0) })),
    };
  } catch (e) {
    return {
      userName: 'Commerçant',
      businessName: 'Mon Activité COMMERCIA',
      sector: 'Commerce Général',
      planName: 'Plan Pro',
      isCashOpen: false,
      theoreticalCash: 0,
      initialCash: 0,
      totalCashIn: 0,
      totalCashOut: 0,
      totalMomoIn: 0,
      todaySalesCount: 0,
      todaySalesTotal: 0,
      todayExpensesTotal: 0,
      totalDebtsOwed: 38500,
      debtorsCount: 3,
      topDebtors: [
        { name: 'Maman Chantal', amount: 15000 },
        { name: 'Papa Pierre', amount: 13500 },
        { name: 'Tantie Rose', amount: 10000 },
      ],
      lowStockCount: 1,
      lowStockProducts: [{ name: 'Huile Mayor 1L', quantity: 3 }],
    };
  }
}

export function generateAIAnswer(query: string): string {
  const q = query.trim().toLowerCase();
  const ctx = getLiveStoreContext();

  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR') + ' FCFA';

  // 1. GREETING & GENERAL PRESENTATION
  if (
    q === 'bonjour' ||
    q === 'salut' ||
    q === 'hello' ||
    q === 'qui es-tu' ||
    q === 'qui es tu' ||
    q.includes('présente-toi') ||
    q.includes('que sais-tu faire')
  ) {
    return `👋 **Bonjour ${ctx.userName || 'partenaire'} !** 

Je suis le **Copilote IA COMMERCIA**, l'intelligence artificielle intégrée à votre plateforme de gestion commerciale.

Je connais **absolument tout** de votre boutique et de l'application COMMERCIA :
- 💼 **Votre Caisse Journalière** : État actuel (${ctx.isCashOpen ? '🟢 Ouverte, solde : ' + fmt(ctx.theoreticalCash) : '🔴 Actuellement fermée'}), entrées, sorties et réconciliation du soir.
- 🛍️ **Vos Ventes & Encaissements** : Espèces, Orange Money, MTN MoMo, Wave et ardoises à crédit.
- 👥 **Vos Clients & Créances** : Suivi des dettes en cours (${fmt(ctx.totalDebtsOwed)} sur ${ctx.debtorsCount} clients) et relances WhatsApp 1-clic.
- 📦 **Vos Stocks & Alertes** : Rentabilité, marges et réapprovisionnements (${ctx.lowStockCount} article(s) à surveiller).
- 💡 **Gestion Financière PME Africaine** : La règle d'or des 3 poches, la séparation des caisses et l'anticipation de la trésorerie.

Posez-moi n'importe quelle question sur vos chiffres ou sur l'utilisation d'une page ! 🚀`;
  }

  // 2. CASH PAGE / CAISSE JOURNALIÈRE
  if (
    q.includes('caisse') ||
    q.includes('tiroir') ||
    q.includes('clôture') ||
    q.includes('cloture') ||
    q.includes('fond de caisse') ||
    q.includes('écart') ||
    q.includes('ecart')
  ) {
    if (q.includes('comment') || q.includes('fonctionne') || q.includes('étape') || q.includes('etape') || q.includes('erreur')) {
      return `💼 **Guide Complet du Journal de Caisse COMMERCIA :**

La page **Caisse Journalière** est le cœur du contrôle financier de votre boutique pour éviter toute fuite d'argent :

1. **Le Matin (Ouverture de Caisse)** :
   - Cliquez sur **"Ouvrir la Caisse du Jour"**.
   - Saisissez votre **Fond initial** (la monnaie physique présente dans le tiroir au réveil, ex: 10 000 ou 15 000 FCFA).
   - Validez : le système commence à tracer chaque franc.

2. **Pendant la Journée (Flux Automatiques & Manuels)** :
   - Toute vente en espèces ou dépense enregistrée sur la Navbar est **automatiquement synchronisée** dans la caisse.
   - Pour un apport exceptionnel de monnaie : cliquez sur **"+ Entrée de fonds"**.
   - Pour un prélèvement personnel ou ration maison du patron : cliquez sur **"− Sortie de fonds"** (indiquez impérativement le motif).

3. **Le Soir (Clôture & Réconciliation)** :
   - Cliquez sur **"Clôturer la Caisse"**.
   - **Comptez physiquement** vos billets et pièces dans le tiroir et tapez le montant.
   - L'IA compare instantanément avec le **Solde Théorique** :
     - 🟢 **Équilibrée** (0 FCFA d'écart) : tout est parfait.
     - 🔴 **Manquant** : de l'argent s'est volatilisé (monnaie mal rendue, oubli d'enregistrement). **Une justification est obligatoire**.
     - 🔵 **Excédent** : trop d'argent compté.
   - Validez pour sceller la journée et générer le **Bilan imprimable**.

📊 *État actuel de votre caisse : ${ctx.isCashOpen ? '🟢 Ouverte avec ' + fmt(ctx.theoreticalCash) + ' d\'espèces théoriques.' : '🔴 Fermée. Rendez-vous sur la page Caisse pour l\'ouvrir !'}*`;
    }

    // Direct cash status query
    return `💼 **Point en Direct sur votre Caisse :**

${ctx.isCashOpen ? `• **Statut** : 🟢 **Caisse Ouverte**
• **Fond initial de départ** : ${fmt(ctx.initialCash)}
• **Entrées du jour (ventes liquide)** : +${fmt(ctx.totalCashIn)}
• **Sorties déclarées (dépenses / retraits)** : -${fmt(ctx.totalCashOut)}
• **Mobile Money encaissé** : 📱 ${fmt(ctx.totalMomoIn)}
• **Espèces à avoir obligatoirement dans votre tiroir** : **${fmt(ctx.theoreticalCash)}**

👉 *À la fermeture, comptez vos billets et vérifiez que vous avez bien ${fmt(ctx.theoreticalCash)}.*` : `• **Statut** : 🔴 **Caisse Actuellement Clôturée / Fermée**

Votre tiroir est verrouillé. Pour démarrer les enregistrements du jour et assurer la traçabilité de votre monnaie, cliquez sur le bouton bleu **"Ouvrir la Caisse du Jour"** dans le menu **Caisse Journalière**.`}`;
  }

  // 3. SALES / VENTES / ENCAISSEMENT / TICKET
  if (
    q.includes('vente') ||
    q.includes('encaiss') ||
    q.includes('ticket') ||
    q.includes('reçu') ||
    q.includes('recu') ||
    q.includes('panier')
  ) {
    return `🛍️ **Gestion des Ventes & Encaissements COMMERCIA :**

• **Aujourd'hui dans votre boutique (${ctx.businessName})** :
  - Nombre de ventes : **${ctx.todaySalesCount}**
  - Chiffre d'affaires encaissé : **${fmt(ctx.todaySalesTotal)}**

• **Comment faire une vente rapide ?**
  1. Cliquez sur le bouton bleu **"+ Vente"** (en haut à droite de votre écran ou dans le menu Ventes).
  2. Sélectionnez vos articles en stock ou tapez une désignation libre avec son prix unitaire.
  3. Choisissez le moyen de paiement :
     - 💵 **Espèces** : alimente immédiatement la caisse du jour.
     - 📱 **Mobile Money (OM, MTN, Wave)** : sécurisé avec vérification du SMS.
     - 🤝 **Crédit (Ardoise)** : sélectionnez le client, le montant s'ajoute à sa dette dans le carnet.
  4. Validez : le stock se décompte automatiquement, le reçu est prêt à être **imprimé** ou **envoyé directement sur WhatsApp** au client avec le message officiel COMMERCIA !`;
  }

  // 4. DEBTS / DETTES / CRÉDITS / RELANCES WHATSAPP
  if (
    q.includes('dette') ||
    q.includes('crédit') ||
    q.includes('credit') ||
    q.includes('ardoise') ||
    q.includes('doit') ||
    q.includes('rembours') ||
    q.includes('relance') ||
    q.includes('whatsapp')
  ) {
    let debtorsTxt = '';
    if (ctx.topDebtors.length > 0) {
      debtorsTxt = ctx.topDebtors.map(d => `  - **${d.name}** : ${fmt(d.amount)}${d.phone ? ' (' + d.phone + ')' : ''}`).join('\n');
    } else {
      debtorsTxt = '  - Aucun client débiteur actuellement. Vos comptes sont impeccables !';
    }

    return `🤝 **Suivi des Crédits & Dettes Clients :**

• **Total des créances à recouvrer** : **${fmt(ctx.totalDebtsOwed)}** (${ctx.debtorsCount} client(s) débiteur(s))
• **Principaux clients à relancer** :
${debtorsTxt}

💡 **Conseils d'expert COMMERCIA pour votre trésorerie :**
1. **La règle des 15%** : Vos dettes clients (${fmt(ctx.totalDebtsOwed)}) ne doivent jamais dépasser 15 à 20% de votre chiffre d'affaires mensuel, sinon votre boutique manquera de liquidités pour racheter du stock.
2. **Relances WhatsApp en 1 clic** : Allez dans le menu **"Clients & Crédits"**, ouvrez la fiche du client et cliquez sur l'icône WhatsApp. COMMERCIA génère un message cordial et professionnel avec le solde exact à régler.
3. **Remboursement partiel** : Quand un client verse une avance, cliquez sur **"Encaisser un versement"** pour que le solde restant s'actualise automatiquement.`;
  }

  // 5. EXPENSES / DÉPENSES / CHARGES / RATION
  if (
    q.includes('dépense') ||
    q.includes('depense') ||
    q.includes('charge') ||
    q.includes('loyer') ||
    q.includes('facture') ||
    q.includes('électricité') ||
    q.includes('electricite')
  ) {
    return `💸 **Gestion des Dépenses & Sorties d'Argent :**

• **Dépenses déclarées aujourd'hui** : **${fmt(ctx.todayExpensesTotal)}**

• **Comment enregistrer une dépense dans COMMERCIA ?**
  1. Cliquez sur le bouton gris **"- Dépense"** dans la barre du haut.
  2. Renseignez le montant et sélectionnez la catégorie :
     - 📦 **Marchandise / Réapprovisionnement**
     - 🏢 **Loyer de la boutique**
     - ⚡ **Électricité (Eneo, etc.) & Eau**
     - 🛵 **Transport & Livraison de stock**
     - 💼 **Salaires / Aides boutique**
     - 🍽️ **Ration personnelle / Prélèvement gérant**
  3. Validez : le montant est déduit de votre bénéfice net et enregistré dans le rapport de trésorerie !`;
  }

  // 6. RÈGLE DES 3 POCHES (AFRICAN FINANCIAL SECRET)
  if (
    q.includes('3 poche') ||
    q.includes('trois poche') ||
    q.includes('poche') ||
    q.includes('ration') ||
    q.includes('maison') ||
    q.includes('famille') ||
    q.includes('secret') ||
    q.includes('tontine')
  ) {
    return `🎯 **La Règle d'Or des 3 Poches (Gestion Financière TPE/PME Africaine) :**

C'est la règle **la plus fondamentale** enseignée par COMMERCIA pour transformer une petite boutique de quartier en une entreprise pérenne et prospère :

1. 🟡 **Poche 1 : La Caisse de la Boutique (Intouchable !)**
   - Elle sert **exclusivement** à racheter les marchandises vendues et à payer les charges directes (loyer du local, électricité, transport).
   - **Interdit absolu** d'y puiser pour payer les ordonnances familiales, l'école des enfants ou la ration du soir !

2. 🟢 **Poche 2 : La Poche de Croissance & Sécurité (L'Épargne/Tontine)**
   - 10% à 20% du bénéfice net dégagé chaque mois est sanctuarisé sur un compte bloqué ou une tontine professionnelle.
   - Elle finance l'ouverture d'un deuxième point de vente ou vous protège en cas de coup dur.

3. 🔵 **Poche 3 : Le Salaire du Commerçant (La Ration Maison)**
   - Vous devez vous fixer un **salaire mensuel ou hebdomadaire fixe**.
   - Si vous avez besoin de 5 000 FCFA pour la popote familiale en cours de journée, **enregistrez-le dans COMMERCIA** comme une "Sortie de caisse > Prélèvement patron" afin que votre caisse du soir reste 100% équilibrée !`;
  }

  // 7. STOCK & PRODUCTS
  if (
    q.includes('stock') ||
    q.includes('produit') ||
    q.includes('rupture') ||
    q.includes('marge') ||
    q.includes('prix') ||
    q.includes('article')
  ) {
    let lowTxt = '';
    if (ctx.lowStockProducts.length > 0) {
      lowTxt = ctx.lowStockProducts.map(p => `  - **${p.name}** : reste seulement ${p.quantity} unité(s)`).join('\n');
    } else {
      lowTxt = '  - Tous vos produits sont actuellement en quantité suffisante au-dessus du seuil d\'alerte.';
    }

    return `📦 **Suivi des Stocks & Rentabilité des Produits :**

• **Articles en alerte stock faible** : **${ctx.lowStockCount} article(s)**
${lowTxt}

• **Comment optimiser votre stock sur COMMERCIA ?**
  - **Taux de marge automatique** : Lors de l'ajout d'un produit (Prix d'achat vs Prix de vente), COMMERCIA calcule votre marge nette en temps réel.
  - **Décompte instantané** : Chaque vente effectuée réduit immédiatement le stock physique.
  - **Seuil de réapprovisionnement** : Dès qu'un article passe sous son seuil d'alerte, un badge orange apparaît pour vous éviter la rupture devant un client !`;
  }

  // 8. MODULE PREMIUM A : CROISSANCE CLIENTS & CAC
  if (
    q.includes('cac') ||
    q.includes('croissance') ||
    q.includes('acquisition') ||
    q.includes('canal') ||
    q.includes('campagne') ||
    q.includes('roas')
  ) {
    return `🎯 **Module Premium A : Croissance Clients & CAC :**

Ce module vous indique **quels canaux vous rapportent des clients rentables** et lesquels vous coûtent de l'argent :

• **Indicateurs clés :**
  - **CAC (Coût d'Acquisition Client)** = \`Budget investi / Clients convertis\`.
  - **Seuil CAC maximal acceptable** = recalculé automatiquement à **30% de votre marge brute moyenne** (ou forcé manuellement par vos soins).
  - **ROAS (Retour sur pub)** = \`Chiffre d'affaires généré / Budget dépensé\`.
  - **Valeur Client (LTV)** = Marge brute moyenne générée par un client sur 12 mois.

• **Règle anti-illusion des données (< 5 clients) :**
  Si un canal compte moins de 5 clients convertis sur la période, COMMERCIA affiche le badge « ⚠️ Données insuffisantes » pour éviter de tirer des conclusions hâtives.

• **Fonctionnalités avancées :**
  - **Traçabilité dès la création du client** : Sélectionnez simplement *« Comment nous a-t-il connus ? »* (WhatsApp, Facebook Ads, TikTok, Bouche-à-oreille...).
  - **Campagnes sponsorisées illimitées** avec import direct des fichiers CSV Meta Ads Manager.
  - **Ligne TOTAL recalculée** sur les sommes brutes (sans fausse moyenne de moyennes).`;
  }

  // 9. MODULE PREMIUM B : TRÉSORERIE AVANCÉE & SCÉNARIOS
  if (
    q.includes('trésorerie') ||
    q.includes('tresorerie') ||
    q.includes('autonomie') ||
    q.includes('scénario') ||
    q.includes('scenario') ||
    q.includes('échéancier') ||
    q.includes('echeancier') ||
    q.includes('virement')
  ) {
    return `💳 **Module Premium B : Trésorerie Avancée & Scénarios :**

Ce module vous évite d'être pris de court par les manques de liquidités :

• **Multi-Comptes Financiers :**
  Consolidation en temps réel de votre Caisse physique, Banque Pro et comptes Mobile Money (Orange Money, MTN MoMo, Wave).

• **Autonomie en Jours :**
  \`Autonomie = Trésorerie disponible / Dépenses moyennes par jour (sur 90 jours)\`.
  *Elle vous dit combien de jours votre boutique peut tenir sans aucune rentrée d'argent !*

• **Règles d'or absolues (B.5 & B.10) :**
  1. **Le capital de départ et les apports ne sont JAMAIS du chiffre d'affaires.**
  2. **Les prélèvements personnels du gérant ne sont JAMAIS des charges d'exploitation** (suivis dans leur propre colonne pour ne pas fausser votre marge réelle).
  3. **Un virement interne** entre la banque et la caisse ne modifie pas votre trésorerie totale, seulement sa répartition.

• **Échéancier & Prévisions à 30 jours :**
  Visualisation jour par jour de votre solde futur pour détecter à l'avance tout risque de solde négatif.`;
  }

  // 10. PLANS & PRICING / ABONNEMENTS (CAHIER DES CHARGES ABONNEMENTS)
  if (
    q.includes('plan') ||
    q.includes('abonnement') ||
    q.includes('tarif') ||
    q.includes('prix') ||
    q.includes('combien coute') ||
    q.includes('pro') ||
    q.includes('business') ||
    q.includes('gratuit') ||
    q.includes('essai') ||
    q.includes('grâce') ||
    q.includes('grace') ||
    q.includes('résili')
  ) {
    return `👑 **Gestion des Abonnements COMMERCIA (Cycle de Vie & Tarifs) :**

• **Tarification transparente :**
  - ⚪ **Plan Gratuit** : 0 FCFA/mois (découverte, 50 ventes max/mois).
  - 🟠 **Plan Pro (Croissance)** : **4 500 FCFA / mois** *(ou 45 000 FCFA / an avec 2 mois offerts)*.
  - 🔵 **Plan Business (Réseau)** : **12 000 FCFA / mois** *(ou 120 000 FCFA / an)*.

• **Cycle de vie & Sécurité des données :**
  - **Essai gratuit de 14 jours** : accès immédiat sans carte bancaire ni engagement.
  - **Paiements prépayés Mobile Money** : Orange Money, MTN MoMo, Wave (pas de prélèvement automatique forcé).
  - **Période de Grâce (7 jours)** : en cas de retard de paiement, vos modules restent 100% actifs avec un bandeau de rappel.
  - **Expiration & Lecture seule (90 jours)** : si non renouvelé, vous conservez la consultation et l'export de toutes vos données sans aucune suppression.
  - **Reçus numérotés uniques** : téléchargeables en PDF pour chaque règlement.
  - **Codes Promo acceptés** : saisissez \`COMMERCIA20\` pour obtenir -20% de remise !`;
  }

  // 9. MOBILE MONEY BEST PRACTICES
  if (
    q.includes('orange money') ||
    q.includes('mtn') ||
    q.includes('momo') ||
    q.includes('wave') ||
    q.includes('mobile money')
  ) {
    return `📱 **Guide de Sécurité Mobile Money (Orange Money / MTN MoMo / Wave) :**

Dans COMMERCIA, vous pouvez encaisser en toute sérénité :
1. **La règle anti-arnaque** : Ne donnez JAMAIS la marchandise sur présentation d'une simple capture d'écran du client ! Attendez de recevoir le SMS officiel sur votre propre téléphone professionnel ou tapez le code USSD pour vérifier le solde.
2. **Pointage dans le Journal de Caisse** :
   - Votre caisse actuelle enregistre **${fmt(ctx.totalMomoIn)}** d'encaissements Mobile Money.
   - Le soir, lors de la clôture de caisse, saisissez le solde réel de votre compte marchand pour vérifier la concordance exacte avec vos ventes.`;
  }

  // 10. REAL PROFIT / BÉNÉFICE RÉEL
  if (
    q.includes('bénéfice') ||
    q.includes('benefice') ||
    q.includes('profit') ||
    q.includes('gain') ||
    q.includes('marge') ||
    q.includes('rentab')
  ) {
    const netEst = Math.max(0, ctx.todaySalesTotal - ctx.todayExpensesTotal);
    return `📈 **Estimation de votre Rentabilité Aujourd'hui :**

• **Chiffre d'affaires encaissé** : **${fmt(ctx.todaySalesTotal)}** (${ctx.todaySalesCount} vente(s))
• **Dépenses opérationnelles** : **${fmt(ctx.todayExpensesTotal)}**
• **Bénéfice d'exploitation estimé** : **${fmt(netEst)}**

${ctx.todayExpensesTotal > ctx.todaySalesTotal ? '⚠️ *Attention : vos dépenses du jour dépassent vos recettes. Si vous avez acheté du stock, ce coût sera rentabilisé lors des ventes prochaines.*' : '✅ *Votre activité est positive et génère du cash ! N\'oubliez pas d\'épargner votre part de réserve (Poche 2).*'}`;
  }

  // 11. GENERAL SAAS WALKTHROUGH & HOW TO NAVIGATE
  return `🤖 **Copilote COMMERCIA à votre service !**

Voici comment naviguer rapidement dans votre application :
- 📊 **Tableau de Bord** : Vue d'ensemble de vos revenus, dépenses et bénéfices du jour.
- 🛍️ **Ventes** : Historique de vos tickets, encaissements et paniers d'achat.
- 💼 **Caisse Journalière** : Ouvrir la caisse, vérifier le tiroir physique et clôturer le soir.
- 💸 **Dépenses** : Enregistrer vos charges de loyer, transport, électricité ou stock.
- 👥 **Clients & Crédits** : Gérer les impayés et envoyer des rappels WhatsApp.
- 📦 **Stock & Produits** : Contrôler les quantités disponibles et marges unitaires.
- 📈 **Statistiques & Rapport** : Vos graphiques de performance et top produits.
- 👑 **Abonnements** : Gérer votre forfait Pro ou Business.

Vous pouvez aussi me poser des questions précises comme :
- *"Combien j'ai en caisse en ce moment ?"*
- *"Qui me doit de l'argent ?"*
- *"Explique-moi la règle des 3 poches"*
- *"Comment faire si ma caisse a un manquant ce soir ?"*`;
}
