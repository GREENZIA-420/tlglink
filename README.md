# Plateforme de Gestion de Bots Telegram

Une application web complète pour créer, gérer et administrer des bots Telegram avec une interface intuitive.

## 🚀 Fonctionnalités

- **Gestion Multi-Bots** : Créez et gérez plusieurs bots Telegram depuis une seule interface
- **Authentification Sécurisée** : Système d'authentification avec rôles (Admin, Super Admin)
- **Configuration des Bots** : Personnalisez les messages de bienvenue, boutons et paramètres
- **Gestion des Utilisateurs** : Visualisez et gérez les utilisateurs Telegram qui interagissent avec vos bots
- **Système de Bannissement** : Bannissez des utilisateurs et désactivez leurs bots
- **Diffusion de Messages** : Envoyez des messages programmés à vos utilisateurs
- **Récupération de Compte** : Système de clés de récupération pour réinitialiser les mots de passe

## 🛠️ Technologies Utilisées

- **Frontend** : React 18, TypeScript, Vite
- **UI/UX** : Tailwind CSS, shadcn/ui, Lucide React
- **Backend** : Lovable Cloud (Supabase)
- **Base de données** : PostgreSQL (via Supabase)
- **Fonctions Serverless** : Edge Functions
- **Authentification** : Système personnalisé avec JWT
- **Gestion d'état** : TanStack Query

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- Node.js (version 18 ou supérieure) - [Installer avec nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm ou bun
- Un compte Lovable (pour le déploiement)
- Un bot Telegram (créé via [@BotFather](https://t.me/botfather))

## 🔧 Installation Locale

### 1. Cloner le projet

```bash
# Clonez le dépôt
git clone <VOTRE_URL_GIT>

# Accédez au répertoire
cd <NOM_DU_PROJET>
```

### 2. Installer les dépendances

```bash
npm install
# ou
bun install
```

### 3. Configuration de l'environnement

Le fichier `.env` est automatiquement généré par Lovable Cloud. Il contient :

```env
VITE_SUPABASE_PROJECT_ID="votre_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="votre_anon_key"
VITE_SUPABASE_URL="https://votre-projet.supabase.co"
```

**Important** : Ne modifiez jamais ce fichier manuellement.

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:8080`

## 🗄️ Configuration de la Base de Données

### Structure de la Base de Données

Le projet utilise plusieurs tables principales :

- **users** : Comptes administrateurs
- **bot_configs** : Configuration des bots Telegram
- **bot_settings** : Paramètres personnalisables des bots
- **bot_buttons** : Boutons de navigation des bots
- **telegram_users** : Utilisateurs Telegram qui interagissent avec les bots
- **broadcast_drafts** : Brouillons de messages de diffusion
- **scheduled_broadcasts** : Messages programmés
- **recovery_keys** : Clés de récupération de compte
- **captcha_codes** : Codes de vérification

### Migrations

Les migrations sont gérées automatiquement par Lovable Cloud. Elles se trouvent dans :

```
supabase/migrations/
```

**Ne modifiez pas ces fichiers manuellement**. Utilisez l'interface Lovable pour les changements de schéma.

### Secrets Supabase

Le projet utilise les secrets suivants (configurés automatiquement) :

- `ENCRYPTION_SALT` : Pour le chiffrement des tokens
- `SUPABASE_URL` : URL du projet Supabase
- `SUPABASE_ANON_KEY` : Clé anonyme publique
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service (privée)
- `SUPABASE_DB_URL` : URL de connexion à la base de données

## 🚀 Déploiement

### Option 1 : Remix sur Lovable (Le plus Simple) ⚡

**Démarrez en 1 clic avec votre propre copie du projet :**

🔗 **[Cliquez ici pour remixer ce projet sur Lovable](https://lovable.dev/projects/b21b7408-a903-4b62-9dc2-f44385cbd306)**

Une fois sur la page du projet, cliquez sur le bouton **"Remix"** pour créer votre propre copie.

En remixant ce projet, vous obtiendrez :
- ✅ Une copie complète du code source
- ✅ Votre propre base de données Lovable Cloud (vierge)
- ✅ Tous les secrets automatiquement configurés
- ✅ Un environnement prêt à l'emploi en quelques secondes

**Important** : Le remix crée un projet totalement indépendant. Vous aurez votre propre base de données vide, vos propres secrets, et aucune connexion avec le projet d'origine.

### Option 2 : Déploiement sur Lovable (Si vous avez cloné le code)

1. **Créez un compte Lovable** : [https://lovable.dev](https://lovable.dev)

2. **Créez un nouveau projet** :
   - Importez votre code source cloné
   - Lovable Cloud se configurera automatiquement

3. **Publiez votre application** :
   - Cliquez sur le bouton **"Publish"** en haut à droite
   - Votre application frontend sera déployée automatiquement
   - Les Edge Functions sont déployées automatiquement à chaque modification

4. **Configuration du domaine** (optionnel) :
   - Allez dans `Project → Settings → Domains`
   - Cliquez sur "Connect Domain"
   - Suivez les instructions pour votre domaine personnalisé
   - Note : Un plan payant est requis pour les domaines personnalisés

### Différence Frontend/Backend

- **Changements Frontend** : Nécessitent de cliquer sur "Update" dans le dialogue de publication
- **Changements Backend** : Se déploient automatiquement et immédiatement (Edge Functions, migrations)

### Option 3 : Auto-hébergement

Si vous souhaitez héberger l'application ailleurs :

1. **Build de production** :

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`

2. **Déployez** sur votre plateforme préférée :
   - Vercel
   - Netlify
   - Cloudflare Pages
   - Votre propre serveur

3. **Variables d'environnement** :
   - Copiez les variables depuis `.env`
   - Configurez-les dans votre plateforme d'hébergement

## 🤖 Configuration d'un Bot Telegram

### 1. Créer un bot avec BotFather

1. Ouvrez Telegram et recherchez [@BotFather](https://t.me/botfather)
2. Envoyez `/newbot`
3. Suivez les instructions pour nommer votre bot
4. Copiez le **token** fourni (format : `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configurer le Webhook

1. Connectez-vous à votre application
2. Allez dans **Admin → Configuration Bot**
3. Ajoutez votre token de bot
4. Le webhook sera automatiquement configuré vers :
   ```
   https://mnvwjgpideueuwvtohjo.supabase.co/functions/v1/telegram-webhook?botId=VOTRE_BOT_ID
   ```

### 3. Personnaliser votre bot

- **Message de bienvenue** : Avec texte et image
- **Boutons** : Ajoutez des liens, invitations de groupe, ou mini-apps
- **Paramètres** : Configurez les options spécifiques

## 👥 Utilisation

### Première Connexion

1. Accédez à `/login`
2. Si aucun compte n'existe, vous serez redirigé vers la création du premier Super Admin
3. Créez votre compte avec :
   - Email
   - Mot de passe
   - Nom complet

### Gestion des Utilisateurs

- **Page Utilisateurs** : `/admin/users`
  - Voir tous les utilisateurs Telegram
  - Bannir/débannir des utilisateurs
  - Statistiques d'interaction

### Gestion des Bots

- **Page Configuration** : `/admin/bot-config`
  - Créer/modifier le bot
  - Gérer les boutons
  - Personnaliser les messages
  - Upload d'images de bienvenue

### Super Admin

- **Page Super Admin** : `/admin/super-admin`
  - Voir tous les comptes administrateurs
  - Gérer les rôles
  - Bannir des comptes admin
  - Générer des clés de récupération

## 🔐 Sécurité

### Tokens Chiffrés

Tous les tokens de bot Telegram sont chiffrés dans la base de données avec un salt unique.

### Authentification

- Mots de passe hashés avec algorithme sécurisé
- Sessions JWT avec expiration
- Option "Se souvenir de moi" pour la connexion

### Récupération de Compte

Si vous perdez votre mot de passe :

1. Un Super Admin peut générer une clé de récupération
2. Accédez à `/recover-account`
3. Utilisez la clé de récupération pour réinitialiser votre mot de passe

## 📁 Structure du Projet

```
.
├── src/
│   ├── components/       # Composants React réutilisables
│   │   ├── ui/          # Composants UI (shadcn)
│   │   └── NavLink.tsx
│   ├── pages/           # Pages de l'application
│   │   ├── Index.tsx    # Page d'accueil
│   │   ├── Login.tsx    # Authentification
│   │   ├── Admin.tsx    # Dashboard admin
│   │   ├── Users.tsx    # Gestion utilisateurs
│   │   ├── BotConfig.tsx    # Configuration bot
│   │   ├── SuperAdmin.tsx   # Panneau super admin
│   │   └── RecoverAccount.tsx
│   ├── integrations/
│   │   └── supabase/    # Client et types Supabase
│   ├── lib/             # Utilitaires
│   └── hooks/           # Hooks React personnalisés
├── supabase/
│   ├── functions/       # Edge Functions
│   │   ├── telegram-webhook/
│   │   ├── auth-login/
│   │   ├── broadcast-message/
│   │   └── ...
│   └── config.toml      # Configuration Supabase
└── public/              # Fichiers statiques
```

## 🔧 Edge Functions

Les Edge Functions principales :

- **telegram-webhook** : Gère les messages entrants des bots
- **auth-login** / **auth-register** : Authentification
- **broadcast-message** : Diffusion de messages
- **manage-bot-config** : Configuration des bots
- **get-telegram-users** : Récupération des utilisateurs
- **generate-recovery-key** : Génération de clés de récupération

## 📱 Responsive Design

L'interface est entièrement responsive et optimisée pour :

- Desktop (1920px+)
- Laptop (1024px - 1920px)
- Tablet (768px - 1024px)
- Mobile (320px - 768px)

## 🎨 Personnalisation du Thème

Le système de design utilise des tokens CSS dans `src/index.css` :

```css
:root {
  --background: ...
  --foreground: ...
  --primary: ...
  --secondary: ...
  /* etc. */
}
```

Modifiez ces variables pour personnaliser les couleurs de l'application.

## 🐛 Débogage

### Logs des Edge Functions

Accédez aux logs via :
- Lovable : Cliquez sur "Cloud" → "Functions" → Sélectionnez une fonction → "Logs"

### Erreurs communes

**"Bot token invalide"**
- Vérifiez que le token est correct
- Assurez-vous qu'il n'y a pas d'espaces

**"Webhook non configuré"**
- Le webhook se configure automatiquement
- Vérifiez les logs de la fonction `telegram-webhook`

**"Utilisateur non autorisé"**
- Vérifiez que le compte est actif (`is_active = true`)
- Vérifiez le rôle dans la table `users`

## 📄 Licence

Ce projet est propriétaire. Tous droits réservés.

## 🆘 Support

Pour toute question ou problème :

1. Consultez la [documentation Lovable](https://docs.lovable.dev/)
2. Rejoignez le [Discord Lovable](https://discord.com/channels/1119885301872070706/1280461670979993613)
3. Créez une issue sur le dépôt GitHub

## 🙏 Remerciements

- [Lovable](https://lovable.dev) - Plateforme de développement
- [Supabase](https://supabase.com) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com) - Composants UI
- [Telegram](https://telegram.org) - API Bot

---

**Fait avec ❤️ sur Lovable**
