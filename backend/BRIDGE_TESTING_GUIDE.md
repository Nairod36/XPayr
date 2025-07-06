# Guide de Test du Bridge Circle CCTP

Ce guide explique comment tester le bridge CCTP avec les wallets Circle Developer Controlled.

## 🧪 Mode Demo (Sécurisé)

Teste la structure et la logique sans exécuter de vraies transactions :

```bash
npm run test:circle-bridge
```

## 🚨 Mode Réel (Attention!)

**⚠️ ATTENTION : Ceci exécute de vraies transactions sur testnet !**

### Prérequis

1. **Wallets financés** : Vos wallets doivent avoir du USDC testnet
2. **Configuration Circle** : Variables d'environnement configurées
3. **Réseau testnet** : Assurez-vous d'être sur les réseaux testnet

### Étapes pour financer vos wallets

1. Exécutez d'abord le script de consultation des wallets :
   ```bash
   npm run setup:circle-wallets
   ```

2. Copiez l'adresse du wallet source (ex: ETH-SEPOLIA)

3. Allez sur le faucet Circle : https://faucet.circle.com/

4. Demandez du USDC testnet pour votre adresse

5. Attendez la confirmation de financement

### Exécution du test réel

Une fois vos wallets financés, vous pouvez exécuter le bridge réel :

```bash
# Option 1: Via script npm
npm run test:circle-bridge-real

# Option 2: Via flag
npm run test:circle-bridge -- --real

# Option 3: Via variable d'environnement
EXECUTE_REAL_BRIDGE=true npm run test:circle-bridge
```

## 🔍 Vérification des résultats

Le script affichera :
- ✅ Vérification des balances avant bridge
- 🔄 Progression de chaque étape du bridge
- 📋 IDs des transactions
- 💰 Balances après bridge

## 🛡️ Sécurités en place

- **Vérification de balance** : Le script vérifie que vous avez assez d'USDC
- **Confirmation avant exécution** : Délai de 5 secondes pour annuler
- **Mode testnet uniquement** : Configuration forcée sur testnet
- **Logging détaillé** : Suivi complet de toutes les opérations

## 📊 Suivi des transactions

Après l'exécution, vous pouvez suivre vos transactions :

1. **Circle Console** : https://console.circle.com/
2. **Block Explorers** :
   - Sepolia Etherscan : https://sepolia.etherscan.io/
   - Base Sepolia : https://sepolia.basescan.org/
   - Polygon Amoy : https://amoy.polygonscan.com/

## 🚨 Dépannage

### "Insufficient balance"
- Vérifiez que vos wallets sont financés
- Utilisez le faucet Circle pour obtenir du USDC testnet

### "Transaction failed"
- Vérifiez la configuration réseau
- Attendez quelques minutes et réessayez
- Consultez les logs pour plus de détails

### "Attestation timeout"
- Les attestations peuvent prendre jusqu'à 10 minutes
- Le script attend automatiquement
- Vérifiez l'état sur Circle Iris API

## 📝 Logs et debugging

Tous les logs sont détaillés avec :
- 🔍 Étapes de vérification
- ⏳ Attentes et timeouts
- ✅ Succès des opérations
- ❌ Erreurs avec descriptions

Pour plus de debugging, vous pouvez modifier les variables d'environnement dans `.env`.
