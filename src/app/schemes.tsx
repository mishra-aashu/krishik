import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { GovSchemesView } from '@/components/gov-schemes-view';

export default function SchemesScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <GovSchemesView onBack={() => router.back()} embeddedInTab={false} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});
