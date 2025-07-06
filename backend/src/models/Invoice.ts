// Modèle de facture
// invoiceAddress: string (adresse du contrat Invoice), description: string, merchant: ref User
const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceAddress: { type: String, required: true, unique: true },
  description: { type: String },
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: String, required: true },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  payer: { type: String },
  chain: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
