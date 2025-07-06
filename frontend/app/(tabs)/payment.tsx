
import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const logo = require('@/assets/images/partial-react-logo.png');

const exampleInvoices = [
  {
    id: 1,
    address: '0x1234...abcd',
    amount: '50 USDC',
  },
  {
    id: 2,
    address: '0x5678...ef90',
    amount: '120 USDC',
  },
  {
    id: 3,
    address: '0x9abc...def0',
    amount: '300 USDC',
  },
];

export default function PaymentScreen() {
  const handlePay = (invoiceId: number) => {
    // TODO: Implement USDC transfer logic
    console.log('Pay clicked for invoice', invoiceId);
  };
  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>Factures à payer</Text>
      <Text style={styles.subtitle}>Voici vos factures en attente de paiement :</Text>
      <View style={{ width: '100%', maxWidth: 360, gap: 18 }}>
        {exampleInvoices.map((invoice) => (
          <View key={invoice.id} style={styles.card}>
            <Text style={styles.cardAddress}>{invoice.address}</Text>
            <Text style={styles.cardAmount}>{invoice.amount}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handlePay(invoice.id)}
            >
              <Text style={styles.buttonText}>Payer</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181A20', justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { width: 60, height: 60, marginBottom: 16, borderRadius: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  form: { width: '100%', maxWidth: 320, gap: 12 },
  input: {
    backgroundColor: '#23272F',
    color: '#fff',
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#3772FF',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  card: {
    backgroundColor: '#23272F',
    borderRadius: 18,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  cardAddress: {
    color: '#8be9fd',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardAmount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
