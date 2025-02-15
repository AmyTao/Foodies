import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Lora: require("@/assets/fonts/Lora-Regular.ttf"),
    LoraI: require("@/assets/fonts/Lora-Italic.ttf"),
    LoraB: require("@/assets/fonts/Lora-Bold.ttf"),
    LoraBI: require("@/assets/fonts/Lora-BoldItalic.ttf"),
    SpaceMono: require("@/assets/fonts/SpaceMono-Regular.ttf"),
    SpaceMonoI: require("@/assets/fonts/SpaceMono-Italic.ttf"),
    SpaceMonoB: require("@/assets/fonts/SpaceMono-Bold.ttf"),
    SpaceMonoBI: require("@/assets/fonts/SpaceMono-BoldItalic.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
