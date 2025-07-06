import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { Link } from 'expo-router';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#23272F', dark: '#181A20' }}
      headerImage={
        <ThemedView style={styles.logoHeader}>
          <Image
            source={require('@/theme/xpayr.png')}
            style={styles.reactLogo}
          />
        </ThemedView>
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Bienvenue sur XPayr</ThemedText>
      </ThemedView>
      <ThemedView style={styles.heroContainer}>
        <ThemedText type="subtitle" style={{ fontSize: 20, color: '#3772FF' }}>
          Paiements USDC cross-chain, simples et rapides
        </ThemedText>
        <ThemedText style={{ color: '#aaa', marginTop: 8, textAlign: 'center' }}>
          Gérez vos soldes, envoyez, recevez et bridez vos USDC sur plusieurs blockchains avec une expérience inspirée de PayPal/Binance.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.ctaContainer}>
        <Link href="/CreateInvoice" asChild>
          <ThemedText type="defaultSemiBold" style={styles.ctaButton}>
            ➕ Créer une facture
          </ThemedText>
        </Link>
      </ThemedView>
      <ThemedView style={styles.infoContainer}>
        <ThemedText style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>
          Sécurité, rapidité, multi-chain. XPayr simplifie vos paiements USDC.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  logoHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    paddingTop: 12,
    paddingBottom: 0,
    marginBottom: -12,
  },
  reactLogo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    borderRadius: 36,
    backgroundColor: '#23272F',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 0,
  },
  heroContainer: {
    marginVertical: 8,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 12,
    marginBottom: 0,
  },
  ctaButton: {
    backgroundColor: '#3772FF',
    color: '#fff',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginHorizontal: 2,
    fontSize: 18,
    overflow: 'hidden',
    minWidth: 150,
    textAlign: 'center',
    elevation: 2,
  },
  infoContainer: {
    marginTop: 18,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
});