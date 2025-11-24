# 🤖 Plateforme de Gestion de Bots Telegram

Une application web complète pour créer, gérer et administrer vos bots Telegram avec une interface intuitive.

## ✨ Fonctionnalités Principales

- 🤖 **Gestion Multi-Bots** - Créez et gérez plusieurs bots depuis une interface unique
- 🔐 **Authentification Sécurisée** - Système de rôles (Admin, Super Admin)
- ⚙️ **Configuration Complète** - Messages de bienvenue, boutons personnalisés, paramètres
- 👥 **Gestion Utilisateurs** - Visualisez et gérez vos utilisateurs Telegram
- 🚫 **Contrôle d'Accès** - Bannissement d'utilisateurs et désactivation de bots
- 📢 **Diffusion Messages** - Envoi de messages programmés à vos abonnés
- 🔑 **Récupération Compte** - Système de clés de récupération sécurisé

## 🚀 Déploiement Rapide

### Option 1️⃣ : Remix Lovable (⚡ En 30 secondes)

**La méthode la plus rapide pour démarrer :**

1. 🔗 **[Cliquez ici pour voir le projet](https://lovable.dev/projects/b21b7408-a903-4b62-9dc2-f44385cbd306)**
2. Cliquez sur le bouton **"Remix"**
3. Votre copie se crée automatiquement avec :
   - ✅ Base de données vierge
   - ✅ Secrets configurés
   - ✅ Prêt à utiliser immédiatement

> **Note** : Le remix crée un environnement totalement isolé. Vos données restent privées.

---

### Option 2️⃣ : Clone Git + Lovable (🔧 ~5 minutes)

**Pour les développeurs qui veulent modifier le code localement :**

```bash
# 1. Cloner le projet
git clone <VOTRE_URL_GIT>
cd <NOM_DU_PROJET>

# 2. Installer les dépendances
npm install

# 3. Lancer en développement local
npm run dev
```

**Puis pour déployer :**
1. Créez un compte sur [Lovable](https://lovable.dev)
2. Créez un nouveau projet et importez votre code
3. Cliquez sur **"Publish"** → Déployé ! 🎉

**Configuration domaine personnalisé :**
- Allez dans `Project → Settings → Domains`
- Cliquez sur "Connect Domain"
- _(Nécessite un plan payant)_

---

### Option 3️⃣ : Auto-hébergement (⚙️ Avancé)

**Pour héberger sur votre propre infrastructure :**

```bash
# Build de production
npm run build
```

Le dossier `dist/` contient votre application prête à déployer sur :
- Vercel
- Netlify  
- Cloudflare Pages
- Votre serveur

**⚠️ Configuration requise :**
1. Copiez les variables d'environnement depuis `.env`
2. Configurez-les dans votre plateforme d'hébergement
3. Assurez-vous que votre backend Supabase est accessible

---

## 📋 Prérequis

- Node.js 18+ - [Installer avec nvm](https://github.com/nvm-sh/nvm)
- Un bot Telegram - [Créer via @BotFather](https://t.me/botfather)
- (Optionnel) Compte Lovable pour le déploiement cloud

## 🛠️ Technologies

| Frontend | Backend | UI/UX |
|----------|---------|-------|
| React 18 | Lovable Cloud (Supabase) | Tailwind CSS |
| TypeScript | Edge Functions | shadcn/ui |
| Vite | PostgreSQL | Lucide Icons |
| TanStack Query | JWT Auth | Framer Motion |

## 🤖 Configurer Votre Bot Telegram

### 1. Créer le bot

1. Ouvrez Telegram → [@BotFather](https://t.me/botfather)
2. Envoyez `/newbot`
3. Suivez les instructions
4. **Copiez le token** (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Connecter à l'application

1. Connectez-vous à votre application
2. Allez dans **Admin → Configuration Bot**
3. Collez votre token de bot
4. Le webhook se configure automatiquement ✅

### 3. Personnaliser

- ✏️ Message de bienvenue (texte + image)
- 🔘 Boutons personnalisés (liens, groupes, mini-apps)
- ⚙️ Paramètres avancés

## 👥 Utilisation

### Première Connexion

1. Accédez à `/login`
2. Si aucun compte existe → Création du Super Admin
3. Remplissez : Email, Mot de passe, Nom complet

### Pages Principales

| Page | Route | Description |
|------|-------|-------------|
| 🏠 Accueil | `/` | Page d'accueil publique |
| 🔑 Connexion | `/login` | Authentification |
| 📊 Dashboard | `/admin` | Tableau de bord admin |
| 👥 Utilisateurs | `/admin/users` | Gestion utilisateurs Telegram |
| 🤖 Configuration Bot | `/admin/bot-config` | Configuration du bot |
| 👑 Super Admin | `/admin/super-admin` | Gestion des admins |
| 🔓 Récupération | `/recover-account` | Réinitialisation mot de passe |

## 🔐 Sécurité

### Protection des Données

✅ **Ce qui est sécurisé :**
- Tokens de bot chiffrés dans la base de données
- Mots de passe hashés
- Secrets Supabase stockés séparément
- Politiques RLS sur toutes les tables
- Sessions JWT avec expiration

✅ **Sans danger pour GitHub public :**
- Code source
- Variables `VITE_*` (publiques par design)
- Structure de la base de données

❌ **Jamais exposé :**
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_SALT`
- Tokens de bot non chiffrés
- Mots de passe

### Récupération de Compte

Si vous perdez votre mot de passe :
1. Un Super Admin génère une clé de récupération
2. Allez sur `/recover-account`
3. Utilisez la clé pour créer un nouveau mot de passe

## 📁 Structure du Projet

```
.
├── src/
│   ├── components/          # Composants réutilisables
│   │   └── ui/             # Composants shadcn/ui
│   ├── pages/              # Pages de l'application
│   │   ├── Index.tsx       # Accueil
│   │   ├── Login.tsx       # Authentification
│   │   ├── Admin.tsx       # Dashboard
│   │   ├── Users.tsx       # Gestion utilisateurs
│   │   ├── BotConfig.tsx   # Configuration bot
│   │   └── SuperAdmin.tsx  # Panneau super admin
│   ├── integrations/       # Client Supabase (auto-généré)
│   ├── lib/                # Utilitaires
│   └── hooks/              # Hooks personnalisés
│
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── telegram-webhook/      # Gestion messages bot
│   │   ├── auth-login/            # Authentification
│   │   ├── broadcast-message/     # Diffusion
│   │   └── manage-bot-config/     # Configuration
│   └── config.toml         # Configuration Supabase
│
└── public/                 # Fichiers statiques
```

## 🗄️ Base de Données

### Tables Principales

| Table | Description |
|-------|-------------|
| `users` | Comptes administrateurs |
| `bot_configs` | Configuration des bots |
| `bot_settings` | Paramètres personnalisables |
| `bot_buttons` | Boutons de navigation |
| `telegram_users` | Utilisateurs Telegram |
| `broadcast_drafts` | Brouillons de messages |
| `scheduled_broadcasts` | Messages programmés |
| `recovery_keys` | Clés de récupération |

### Gestion des Migrations

⚠️ **Important** : Les migrations sont gérées automatiquement par Lovable Cloud.
- Ne modifiez pas manuellement les fichiers dans `supabase/migrations/`
- Utilisez l'interface Lovable pour les changements de schéma

## 🎨 Personnalisation du Design

Modifiez les tokens CSS dans `src/index.css` :

```css
:root {
  --background: ...     /* Couleur de fond */
  --foreground: ...     /* Couleur de texte */
  --primary: ...        /* Couleur principale */
  --secondary: ...      /* Couleur secondaire */
  /* Toutes les couleurs en HSL */
}
```

Le système de design utilise des tokens sémantiques pour une personnalisation facile.

## 🐛 Débogage

### Problèmes Courants

**"Bot token invalide"**
- ✓ Vérifiez le token (pas d'espaces)
- ✓ Testez avec @BotFather

**"Webhook non configuré"**
- ✓ Vérifiez les logs dans Cloud → Functions → telegram-webhook

**"Utilisateur non autorisé"**
- ✓ Compte actif (`is_active = true`)
- ✓ Vérifiez le rôle dans la table `users`

**"Bot ne répond plus après bannissement"**
- ✓ C'est normal ! Vérifiez que `is_active = false` dans `bot_configs`

### Accès aux Logs

- **Lovable Cloud** : Cloud → Functions → [Nom fonction] → Logs
- **Local** : Console du navigateur (`F12`)

## 📱 Responsive Design

Interface optimisée pour :
- 🖥️ Desktop (1920px+)
- 💻 Laptop (1024px - 1920px)
- 📱 Tablet (768px - 1024px)
- 📱 Mobile (320px - 768px)

## ❓ FAQ

**Q : Puis-je rendre mon projet public sur GitHub ?**  
✅ Oui ! Vos secrets et données restent privés.

**Q : Que se passe-t-il si quelqu'un remix mon projet ?**  
✅ Il obtient uniquement le code. Base de données et secrets restent isolés.

**Q : Comment inviter des collaborateurs ?**  
Cliquez sur "Share" → Entrez leur email → Choisissez le rôle.

**Q : Les changements backend se déploient automatiquement ?**  
✅ Oui ! Seuls les changements frontend nécessitent de cliquer "Update".

## 📚 Ressources

- 📖 [Documentation Lovable](https://docs.lovable.dev/)
- 💬 [Discord Communauté](https://discord.com/channels/1119885301872070706/1280461670979993613)
- 🎥 [Tutoriels YouTube](https://www.youtube.com/watch?v=9KHLTZaJcR8&list=PLbVHz4urQBZkJiAWdG8HWoJTdgEysigIO)
- 🤖 [API Telegram Bot](https://core.telegram.org/bots/api)

## 📄 Licence

Ce projet est sous licence propriétaire. Tous droits réservés.

## 🆘 Support

Besoin d'aide ? 
1. Consultez la [documentation](https://docs.lovable.dev/)
2. Rejoignez le [Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
3. Créez une issue sur GitHub

---

**💜 Développé avec Lovable** - [lovable.dev](https://lovable.dev)
