import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SessionProvider } from '@/state/SessionContext';
import { colors, fontFamily } from '@/theme';

const fonts = [{
  fontFamily,
  fontDefinitions: [
    { path: require('../../assets/fonts/BeVietnamPro-Regular.ttf'), weight: 400 },
    { path: require('../../assets/fonts/BeVietnamPro-SemiBold.ttf'), weight: 600 },
    { path: require('../../assets/fonts/BeVietnamPro-Bold.ttf'), weight: 700 },
    { path: require('../../assets/fonts/BeVietnamPro-ExtraBold.ttf'), weight: 800 },
  ],
}];

export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);

  if (!loaded && !error) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.text} /></View>;
  }

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
