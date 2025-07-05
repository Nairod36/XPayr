# Configuration des Developer Controlled Wallets (Circle)

## 🏗️ Étapes de configuration

### 1. Créer un compte développeur Circle
1. Allez sur https://console.circle.com/
2. Créez un compte ou connectez-vous
3. Naviguez vers "Developer Controlled Wallets"

### 2. Obtenir les clés API
1. Dans la console Circle, allez dans "APIs"
2. Créez une nouvelle API Key pour les "Developer Controlled Wallets"
3. Notez votre :
   - **API Key** : Pour authentifier vos requêtes
   - **Entity Secret** : Pour chiffrer/déchiffrer les clés privées

### 3. Configurer votre environnement
Ajoutez ces variables à votre `.env` :

```bash
# Circle Developer Controlled Wallets
CIRCLE_API_KEY=live_api_key_... # ou sandbox_api_key_... pour les tests
CIRCLE_ENTITY_SECRET=your_entity_secret_here
CIRCLE_BASE_URL=https://api.circle.com # ou https://api-sandbox.circle.com pour les tests

# Configuration des wallets
CIRCLE_WALLET_SET_ID=your_wallet_set_id
```

### 4. Créer un Wallet Set
Un Wallet Set est un conteneur pour vos wallets sur différentes chaînes.

```typescript
// Exemple de création d'un Wallet Set
const walletSetResponse = await circleApi.createWalletSet({
  name: "XPayr Production Wallets",
  // ou "XPayr Test Wallets" pour les tests
});

// Notez le walletSetId pour votre .env
const walletSetId = walletSetResponse.data.walletSet.id;
```

### 5. Créer des wallets pour chaque chaîne
```typescript
// Créer un wallet pour Ethereum
const ethWallet = await circleApi.createWallet({
  walletSetId: walletSetId,
  blockchains: ['ETH-SEPOLIA'], // ou 'ETH' pour mainnet
});

// Créer un wallet pour Base
const baseWallet = await circleApi.createWallet({
  walletSetId: walletSetId,
  blockchains: ['BASE-SEPOLIA'], // ou 'BASE' pour mainnet
});
```

## 🔧 Avantages des Developer Controlled Wallets

### ✅ Sécurité renforcée
- Clés privées chiffrées côté Circle
- Pas besoin de gérer les clés privées en local
- Authentification multi-facteurs

### ✅ Multi-chaînes natif
- Support automatique de toutes les chaînes Circle
- Pas besoin de gérer différentes clés par chaîne
- Synchronisation automatique des balances

### ✅ APIs avancées
- Gestion des transactions programmables
- Monitoring des balances en temps réel
- Historique des transactions

### ✅ Gestion centralisée
- Interface web pour monitoring
- Webhooks pour les notifications
- Rapports et analytics

## 🚀 Intégration avec XPayr

### Structure recommandée
```
src/
├── services/
│   ├── circle-wallet.ts       # Service pour Developer Controlled Wallets
│   ├── circle-cctp.ts         # Service CCTP existant (gardé pour compatibilité)
│   └── integrated-service.ts  # Service intégré mis à jour
├── types/
│   └── circle-wallet.ts       # Types pour les wallets
└── config/
    └── circle-wallet.ts       # Configuration des wallets
```

## 📋 Prochaines étapes

1. **Créer le compte Circle** : https://console.circle.com/
2. **Obtenir les clés API et Entity Secret**
3. **Mettre à jour le .env** avec les nouvelles variables
4. **Créer le service CircleWalletService**
5. **Adapter IntegratedXPayrService** pour utiliser les wallets contrôlés
6. **Tester sur sandbox** avant la production

## 🔗 Ressources utiles

- **Documentation** : https://developers.circle.com/w3s/docs
- **Quickstart interactif** : https://developers.circle.com/interactive-quickstarts/dev-controlled-wallets
- **Console Circle** : https://console.circle.com/
- **API Reference** : https://developers.circle.com/w3s/reference
