import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const logo = require('@/assets/images/partial-react-logo.png');

export default function CreateInvoiceScreen() {
  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>Créer une facture USDC</Text>
      <Text style={styles.subtitle}>
        Entrez l adresse du portefeuille du client et le montant à facturer.
      </Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Adresse du portefeuille"
          placeholderTextColor="#666"
        />
        <TextInput
          style={styles.input}
          placeholder="Montant en USDC"
          placeholderTextColor="#666"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Créer la facture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 16,
    borderRadius: 16,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
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
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});