import mongoose from 'mongoose';

const WalletRuleSchema = new mongoose.Schema({
  chain: { type: String, required: false },
  address: { type: String, required: true },
  token: { type: String, required: false },
  maxAmount: { type: Number, required: true }, // seuil max de token dans ce wallet
  fallbackAddress: { type: String, required: true }, // wallet de redirection si max atteint
});

module.exports = mongoose.model('WalletRule', WalletRuleSchema);
