import React from 'react';
import { useRouter } from 'expo-router';
import { DesiFarmingView } from '@/components/desi-farming-view';

export default function DesiFarmingScreen() {
  const router = useRouter();

  return (
    <DesiFarmingView
      onBack={() => router.back()}
      embeddedInTab={false}
    />
  );
}
