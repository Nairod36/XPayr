
import React from 'react';
import { Image, StyleSheet, Switch, Text, View } from 'react-native';

const logo = require('@/assets/images/partial-react-logo.png');

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = React.useState(true);
  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>Paramètres</Text>
      <Text style={styles.subtitle}>Gérez vos préférences, sécurité et thème.</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Mode sombre</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} thumbColor={darkMode ? '#3772FF' : '#ccc'} />
      </View>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Notifications</Text>
        <Switch value={true} disabled thumbColor={'#3772FF'} />
      </View>
      {/* TODO: Plus d’options */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181A20', alignItems: 'center', padding: 24 },
  logo: { width: 60, height: 60, marginBottom: 16, borderRadius: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#23272F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: 280,
  },
  settingLabel: { color: '#fff', fontSize: 16 },
});
