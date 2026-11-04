# Documentation de Sécurité — Configuration Vercel & Resend (Super Admin COMMERCIA)

Ce document décrit la configuration serveur obligatoire pour l'authentification à deux facteurs (Google OpenID Connect + OTP 8 chiffres par e-mail transactionnel Resend) de la console Super Admin de **COMMERCIA**.

---

## 1. Variables d'environnement obligatoires sur Vercel (Backend)

Aucune clé API, aucun mot de passe d'application Gmail et aucun secret cryptographique ne doivent jamais être saisis dans l'interface utilisateur ni exposés au frontend (`VITE_*`). Toutes les variables ci-dessous sont lues exclusivement côté serveur Node.js.

Dans le tableau de bord Vercel du projet backend (`Settings` → `Environment Variables`), configurez les variables suivantes pour les environnements **Production** et **Preview** :

| Variable | Obligatoire | Rôle technique | Exemple de valeur |
| :--- | :---: | :--- | :--- |
| `RESEND_API_KEY` | **OUI** | Clé API secrète du service transactionnel Resend (`https://api.resend.com/emails`) permettant d'envoyer les codes OTP à 8 chiffres vers l'adresse Gmail autorisée du Super Admin. | `re_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `ADMIN_OTP_FROM_EMAIL` | **OUI** | Adresse d'expédition officielle appartenant au domaine vérifié dans Resend. | `COMMERCIA Security <security@votredomaine-verifie.com>` |
| `ADMIN_OTP_HASH_SECRET` | **OUI** | Secret serveur haute entropie (minimum 32 octets / 64 caractères hexadécimaux) utilisé pour calculer le hash `HMAC-SHA-256` des codes OTP en base de données. | Généré via `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | **OUI** | Identifiant client Google OAuth 2.0 / OpenID Connect utilisé par le backend pour vérifier les claims `aud` et `azp` du jeton signé par Google. | `210731042943-aaap4r2isg8upmn22qapoifnd15703tn.apps.googleusercontent.com` |
| `ADMIN_AUTHORIZED_GOOGLE_EMAIL` | Optionnel | Adresse Gmail officielle du Super Admin (par défaut synchronisée avec la configuration de sécurité en base de données). | `camusalbert628@gmail.com` |
| `JWT_SECRET` | **OUI** | Secret de signature des jetons d'accès JWT. | Chaîne aléatoire ≥ 64 caractères |
| `JWT_REFRESH_SECRET` | **OUI** | Secret de signature des jetons de rafraîchissement JWT. | Chaîne aléatoire ≥ 64 caractères |

> **Politique FAIL-CLOSED** : Tant que `RESEND_API_KEY` ou `ADMIN_OTP_FROM_EMAIL` n'est pas défini dans Vercel, le backend refuse toute génération de session privilégiée et retourne l'état `EMAIL_SERVICE_NOT_CONFIGURED` (*« Le service de vérification e-mail n'est pas configuré. L'accès administrateur est temporairement indisponible. »*).

---

## 2. Configuration du domaine d'envoi dans Resend (SPF, DKIM, DMARC)

Pour garantir la délivrabilité immédiate des codes OTP vers la boîte Gmail du Super Admin sans rejet ni classement en courrier indésirable :

1. Connectez-vous à votre compte [Resend](https://resend.com/domains) et cliquez sur **Add Domain**.
2. Ajoutez votre domaine d'expédition officiel (ex. `commercia.africa` ou `auth.commercia.africa`).
3. Configurez les enregistrements DNS fournis par Resend chez votre hébergeur DNS :
   - **DKIM (`TXT`)** : `resend._domainkey.<votre-domaine>` → Clé publique RSA fournie par Resend (garantit l'authenticité cryptographique des e-mails).
   - **SPF (`TXT` et `MX` sur le sous-domaine d'envoi `send`)** : Autorise les serveurs d'expédition Resend/Amazon SES à émettre des e-mails au nom de votre domaine.
   - **DMARC (`TXT` sur `_dmarc.<votre-domaine>`)** :
     ```txt
     v=DMARC1; p=quarantine; rua=mailto:security@votredomaine.com; pct=100; adkim=s; aspf=s
     ```
4. Cliquez sur **Verify DNS Records** dans Resend jusqu'à obtenir le statut **Verified**.
5. Créez une clé API dans **API Keys** → **Create API Key** (permission `Sending access` limitée à ce domaine) et copiez-la dans la variable `RESEND_API_KEY` sur Vercel.

---

## 3. Procédure de vérification du bon fonctionnement

Une fois les variables `RESEND_API_KEY`, `ADMIN_OTP_FROM_EMAIL` et `ADMIN_OTP_HASH_SECRET` ajoutées sur Vercel et le backend redéployé (`npx vercel --prod`) :

1. **Vérification de l'état du service** :
   - Connectez-vous avec le compte Google officiel du Super Admin sur `https://mycommercia.vercel.app/auth`.
   - Cliquez sur le bouton vert **« Administration SaaS »**.
   - La fenêtre **Vérification de Sécurité Administrateur** s'ouvre avec l'adresse masquée `c*************@gmail.com` et le bouton **« Envoyer le code de sécurité »** actif.
2. **Test d'envoi et de réception** :
   - Cliquez sur **« Envoyer le code de sécurité »**.
   - L'interface affiche : *« Votre code de sécurité a été envoyé à votre adresse e-mail administrateur autorisée. »* et lance le délai de renvoi de 60 secondes.
   - Vérifiez la réception de l'e-mail intitulé `COMMERCIA — Votre code de vérification administrateur` contenant le code à 8 chiffres.
3. **Validation et création de session privilégiée** :
   - Saisissez les 8 chiffres et cliquez sur **« Valider et accéder à la console »**.
   - Le serveur vérifie le `HMAC-SHA-256` en temps constant, consomme atomiquement le challenge et émet le cookie `HttpOnly; Secure; SameSite` (`__Host-commercia_admin_session`).

---

## 4. Procédure de rotation des secrets en cas d'incident

En cas de suspicion de compromission d'une clé ou d'accès non autorisé :

1. **Rotation de `RESEND_API_KEY`** :
   - Révoquez immédiatement la clé API dans le tableau de bord Resend.
   - Générez une nouvelle clé API, mettez à jour `RESEND_API_KEY` dans Vercel et redéployez le backend.
2. **Rotation de `ADMIN_OTP_HASH_SECRET`** :
   - Générez un nouveau secret 256 bits (`openssl rand -hex 32`).
   - Mettez à jour `ADMIN_OTP_HASH_SECRET` dans Vercel. Tous les challenges OTP en cours deviendront immédiatement invalides.
3. **Révocation d'urgence des sessions administratives** :
   - Depuis l'onglet **Sécurité & Auth** de la console Super Admin, cliquez sur **Révoquer** sur les sessions actives, ou exécutez en base de données :
     ```sql
     UPDATE "AdminSession" SET "isActive" = false, "revokedReason" = 'EMERGENCY_ROTATION' WHERE "isActive" = true;
     ```

