# Guide pour obtenir des fonds testnet

## 🚰 Faucets pour les tests

### Ethereum Sepolia ETH
- **Alchemy Faucet**: https://sepoliafaucet.com/
- **Chainlink Faucet**: https://faucets.chain.link/sepolia
- **Infura Faucet**: https://www.infura.io/faucet/sepolia

### Base Sepolia ETH
- **Coinbase Faucet**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **Bridge from Sepolia**: https://bridge.base.org/ (bridge depuis Ethereum Sepolia)

### USDC Testnet
- **Circle Faucet**: https://faucet.circle.com/
  - Disponible pour : Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, Polygon Mumbai

### Arbitrum Sepolia ETH
- **Alchemy Faucet**: https://sepoliafaucet.com/ (puis bridge vers Arbitrum)
- **Bridge**: https://bridge.arbitrum.io/ 

### Polygon Mumbai MATIC
- **Alchemy Faucet**: https://mumbaifaucet.com/
- **Polygon Faucet**: https://faucet.polygon.technology/

## 📋 Étapes pour tester

### 1. Préparer les fonds
```bash
# Vérifiez vos adresses dans le .env
ETHEREUM_ADDRESS=0x...
BASE_ADDRESS=0x...
```

### 2. Obtenir des fonds testnet
1. **ETH Sepolia** : Obtenez de l'ETH pour les frais de gas
2. **USDC Sepolia** : Obtenez de l'USDC pour les transferts
3. **ETH Base Sepolia** : Obtenez de l'ETH sur Base pour les frais de destination

### 3. Exécuter le test
```bash
# Test de préparation (sans transaction réelle)
npm run test:real-cctp

# Pour activer les vraies transactions :
# 1. Editez src/scripts/test-real-cctp.ts
# 2. Décommentez la section "REAL transaction"
# 3. Relancez le test
```

### 4. Vérifier les transactions
- **Ethereum Sepolia**: https://sepolia.etherscan.io/
- **Base Sepolia**: https://sepolia.basescan.org/
- **Circle Explorer**: https://testnet.cctp.money/

## ⚠️ Important

- Utilisez de petits montants pour les tests (0.1 USDC par exemple)
- Gardez suffisamment d'ETH pour les frais de gas
- Les transactions CCTP prennent 3-15 minutes
- Vérifiez toujours les adresses avant d'exécuter

## 🔍 Monitoring

Après exécution d'une transaction réelle :
1. Notez le `Transaction Hash` et `Message ID`
2. Suivez le statut sur Circle's testnet explorer
3. Vérifiez l'arrivée des fonds sur la chaîne de destination

## 🆘 En cas de problème

1. **Transaction échoue** : Vérifiez les fonds et les allowances USDC
2. **RPC timeout** : Utilisez des RPC plus fiables (Alchemy, Infura)
3. **Attestation lente** : C'est normal, attendez jusqu'à 15 minutes
4. **Fonds non reçus** : Vérifiez le Circle explorer avec le Message ID
