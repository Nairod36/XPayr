
import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

const logo = require('@/assets/images/partial-react-logo.png');

const MOCK_TRANSACTIONS = [
  { id: '1', type: 'Envoi', amount: '-120 USDC', date: '2025-07-01', chain: 'Ethereum' },
  { id: '2', type: 'Bridge', amount: '-500 USDC', date: '2025-06-28', chain: 'Polygon' },
  { id: '3', type: 'Réception', amount: '+250 USDC', date: '2025-06-25', chain: 'Arbitrum' },
];

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>Historique</Text>
      <Text style={styles.subtitle}>Consultez l’historique de vos transactions USDC.</Text>
      <FlatList
        data={MOCK_TRANSACTIONS}
        keyExtractor={item => item.id}
        style={{ width: '100%', marginTop: 16 }}
        contentContainerStyle={{ alignItems: 'center' }}
        renderItem={({ item }) => (
          <View style={styles.txItem}>
            <Text style={[styles.txType, { color: item.amount.startsWith('-') ? '#FF4B4B' : '#4BFF7B' }]}>{item.type}</Text>
            <Text style={styles.txAmount}>{item.amount}</Text>
            <Text style={styles.txMeta}>{item.date} • {item.chain}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181A20', alignItems: 'center', padding: 24 },
  logo: { width: 60, height: 60, marginBottom: 16, borderRadius: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  txItem: {
    backgroundColor: '#23272F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    width: 280,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  txType: { fontSize: 16, fontWeight: 'bold' },
  txAmount: { fontSize: 20, fontWeight: 'bold', marginVertical: 2, color: '#fff' },
  txMeta: { color: '#aaa', fontSize: 13 },
});
