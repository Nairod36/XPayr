
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// Placeholder logo (à remplacer par le logo XPayr réel)
const logo = require('@/assets/images/partial-react-logo.png');

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Solde multi-chain, aperçu global de vos comptes USDC.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Solde total</Text>
        <Text style={styles.cardAmount}>$12,500.00</Text>
        <Text style={styles.cardChain}>Across 4 blockchains</Text>
      </View>
      {/* TODO: Afficher les soldes détaillés, graphiques, etc. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181A20', justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { width: 80, height: 80, marginBottom: 16, borderRadius: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  card: {
    backgroundColor: '#23272F',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: 280,
  },
  cardTitle: { color: '#aaa', fontSize: 16, marginBottom: 4 },
  cardAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  cardChain: { color: '#3772FF', fontSize: 14 },
});
