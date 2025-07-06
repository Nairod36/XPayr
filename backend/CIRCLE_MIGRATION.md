# Migration vers Circle Developer Controlled Wallets

## 🔄 Pourquoi migrer ?

Votre configuration actuelle utilise des clés privées manuelles, ce qui présente plusieurs limitations :
- **Sécurité** : Clés privées stockées en local
- **Gestion complexe** : Une clé par chaîne à gérer
- **Évolutivité limitée** : Difficile d'ajouter de nouvelles chaînes

Les **Circle Developer Controlled Wallets** offrent :
- ✅ **Sécurité renforcée** : Clés chiffrées côté Circle
- ✅ **Gestion centralisée** : Un seul wallet set pour toutes les chaînes
- ✅ **API native** : Intégration directe avec Circle CCTP
- ✅ **Monitoring avancé** : Interface web et webhooks

## 📋 Étapes de migration

### 1. Créer un compte Circle Developer
1. Allez sur https://console.circle.com/
2. Créez un compte ou connectez-vous
3. Naviguez vers "Developer Controlled Wallets"

### 2. Obtenir vos clés API
Dans la console Circle :
1. Allez dans **"APIs"**
2. Créez une **nouvelle API Key** pour "Developer Controlled Wallets"
3. Notez votre **API Key** et **Entity Secret**

### 3. Configurer votre .env
Ajoutez ces variables à votre `.env` :

```bash
# Circle Developer Controlled Wallets
CIRCLE_ENTITY_SECRET=your_entity_secret_here
CIRCLE_BASE_URL=https://api-sandbox.circle.com  # ou https://api.circle.com pour mainnet
CIRCLE_WALLET_SET_ID=will_be_generated
```

### 4. Configurer automatiquement vos wallets
```bash
npm run setup:circle-wallets
```

Ce script va :
- ✅ Créer un Wallet Set
- ✅ Créer des wallets pour chaque chaîne (ETH, BASE, ARB, POLYGON)
- ✅ Afficher les adresses de vos nouveaux wallets
- ✅ Vérifier les balances

### 5. Financer vos wallets
Une fois vos wallets créés, financez-les avec des tokens testnet :
- **USDC testnet** : https://faucet.circle.com/
- **ETH Sepolia** : https://sepoliafaucet.com/
- **Base Sepolia** : https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

### 6. Tester votre nouvelle configuration
```bash
npm run test:circle-wallets
```

## 🔄 Comparaison : Avant vs Après

### Avant (clés privées manuelles)
```typescript
// Configuration complexe
const wallet = new ethers.Wallet(privateKey, provider);
const transaction = await wallet.sendTransaction({...});

// Gestion manuelle des clés
ETHEREUM_PRIVATE_KEY=0x...
BASE_PRIVATE_KEY=0x...
ARBITRUM_PRIVATE_KEY=0x...
POLYGON_PRIVATE_KEY=0x...
```

### Après (Circle Wallets)
```typescript
// Configuration simple
const wallet = await circleWallet.getWalletForBlockchain('ETH-SEPOLIA');
const transaction = await circleWallet.createTransfer({...});

// Configuration centralisée
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_secret
CIRCLE_WALLET_SET_ID=your_wallet_set_id
```

## 🚀 Avantages de la migration

### Sécurité
- 🔒 Clés privées chiffrées côté Circle
- 🔐 Authentification API robuste
- 🛡️ Pas de clés stockées localement

### Simplicité
- 🎯 Une seule configuration pour toutes les chaînes
- 🔄 Gestion automatique des wallets
- 📊 Interface de monitoring intégrée

### Évolutivité
- ➕ Ajout facile de nouvelles chaînes
- 🔗 Intégration native avec CCTP
- 🎮 APIs avancées (batch, webhooks, etc.)

## 📚 Ressources

- **Console Circle** : https://console.circle.com/
- **Documentation** : https://developers.circle.com/w3s/docs
- **Quickstart** : https://developers.circle.com/interactive-quickstarts/dev-controlled-wallets
- **Support** : https://developers.circle.com/developer/support

## ⚠️ Notes importantes

1. **Testnet d'abord** : Commencez toujours par configurer en mode testnet
2. **Sauvegarde** : Gardez vos anciennes clés privées comme backup
3. **Migration progressive** : Vous pouvez utiliser les deux systèmes en parallèle
4. **Production** : Changez les URLs et clés API pour passer en mainnet
