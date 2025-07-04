// Modèle utilisateur
// username: string, address: string (wallet principal du marchand)
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  address: { type: String, required: true, unique: true },
  wallets: [{
    chain: String, // ex: 'ethereum', 'arbitrum', etc.
    address: String
  }],
  splitParams: [{
    chain: String,
    percent: Number // % à router sur ce wallet
  }]
});

module.exports = mongoose.model('User', UserSchema);
