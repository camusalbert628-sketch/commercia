# COMMERCIA — Copilote Financier & Gestion Commerciale pour TPE / PME Africaines

**COMMERCIA** est une application SaaS de gestion commerciale et copilote financier conçue spécifiquement pour les micro-entrepreneurs, commerçants et PME (marchés africains, zone CEMAC / FCFA - XAF).

## 🚀 Fonctionnalités Clés

- **Tableau de Bord Financier en Direct (FCFA)** : Recettes, dépenses, bénéfice net réel estimé de la journée, suivi en temps réel.
- **Gestion Complète des Ventes** : Vente rapide au comptoir, panier multi-articles, reçus instantanés, règlements en Espèces, Mobile Money (MTN MoMo, Orange Money) ou Crédit.
- **Suivi des Charges & Dépenses** : Catégorisation intelligente (Marchandise, Loyer, Transport, Électricité, Salaires, etc.).
- **Carnet de Crédits Clients & Recouvrement** : Historique des dettes, relances et enregistrement des remboursements partiels ou totaux.
- **Gestion de Stock & Alertes Ruptures** : Suivi des quantités, alertes stock critique (<= 5 unités), valorisation du stock.
- **Statistiques & Rapport d'Activité** : Graphiques d'évolution sur 7 et 14 jours, répartition des dépenses, top articles rentables, export imprimable.
- **Copilote Financier IA** : Assistant interactif guidant le commerçant sur son bénéfice, sa rentabilité et ses alertes de gestion.
- **Abonnements & Plans** : Modèle freemium (Plan Gratuit, Pro 4 500 FCFA/mois, Business 12 000 FCFA/mois).
- **Administration SaaS** : Métriques globales MRR, ARR, utilisateurs actifs, logs d'audit.

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Vite, Recharts, Lucide Icons, CSS moderne ultra-responsive.
- **Backend** : Node.js, Express, TypeScript, Prisma ORM, SQLite.
- **Sécurité** : JWT, Refresh Tokens sécurisés, Helmet, Rate Limiting, validation Zod, Error Boundary.

## 📦 Installation & Démarrage Local

```bash
# Backend
cd backend
npm install
npx prisma db push
npm run seed
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Application disponible sur `http://localhost:5173`.
Compte démo Commerçant : `moussa@boutique.cm` / `bizz1234`
Compte démo Admin : `admin@commercia.com` / `admin1234`
