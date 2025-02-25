import { Audio } from "expo-av";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { GameProvider } from "../contexts/GameContext";
import { unloadAllSounds } from "../utils/sounds";

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BubbleGum: require("../assets/fonts/BubblegumSans-Regular.ttf"),
    ComicNeue: require("../assets/fonts/ComicNeue-Bold.ttf"),
  });

  // Set up global audio settings
  useEffect(() => {
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    };

    setupAudio();

    // Cleanup when the app is closed
    return () => {
      unloadAllSounds();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      // Hide splash screen once fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GameProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="free-pop" />
          <Stack.Screen name="colors" />
          <Stack.Screen name="abc" />
          <Stack.Screen name="math" />
          <Stack.Screen name="speed" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    </GameProvider>
  );
}
