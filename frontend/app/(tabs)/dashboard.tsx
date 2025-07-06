import React from 'react';
import { Image, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useWallet } from '../../constants/walletContext';

// Placeholder logo (à remplacer par le logo XPayr réel)
const logo = require('@/assets/images/partial-react-logo.png');

export default function DashboardScreen() {
  const { isConnected, address, connect, isConnecting, disconnect } = useWallet();

  const formattedAddress = address
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : '';

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
      {!isConnected ? (
        <TouchableOpacity style={styles.button} onPress={connect} disabled={isConnecting}>
          {isConnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect Wallet</Text>
          )}
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.walletAddress}>Connected: {formattedAddress}</Text>
          <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={disconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </>
      )}
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
  walletAddress: { color: '#fff', fontSize: 14, marginTop: 16, marginBottom: 8 },
  button: {
    backgroundColor: '#3772FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  disconnectButton: {
    backgroundColor: '#FF4D4D',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
