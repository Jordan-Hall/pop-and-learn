import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Brain,
  Palette,
  WholeWord,
  Calculator,
  Zap,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import { useGameContext } from "../contexts/GameContext";

// Game modes with their details
const GAME_MODES = [
  {
    title: "Free Pop",
    icon: Brain,
    color: "#FF6B95",
    route: "/free-pop",
    animal: "bunny" as const,
  },
  {
    title: "Colors",
    icon: Palette,
    color: "#4BD5B3",
    route: "/colors",
    animal: "elephant" as const,
  },
  {
    title: "ABC & 123",
    icon: WholeWord,
    color: "#5B9AE6",
    route: "/abc",
    animal: "giraffe" as const,
  },
  {
    title: "Math Fun",
    icon: Calculator,
    color: "#9D7FE6",
    route: "/math",
    animal: "cat" as const,
  },
  {
    title: "Speed Pop",
    icon: Zap,
    color: "#FF9858",
    route: "/speed",
    animal: "lion" as const,
  },
];

export default function MainMenu() {
  const router = useRouter();
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const { totalPops, shapesCompleted } = useGameContext();

  // Load button press sound
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/button-press.mp3"),
        );
        setSound(sound);
      } catch (error) {
        console.log("Error loading sound:", error);
      }
    };

    loadSound();

    return () => {
      sound?.unloadAsync();
    };
  }, []);

  const handleGameSelect = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sound?.replayAsync();
    router.push(route);
  };

  return (
    <AnimatedBackground>
      {/* Floating animals */}
      <FloatingAnimal
        type="bunny"
        position={{ top: "10%", left: "5%" }}
        color="rgba(255, 107, 149, 0.5)"
        size={100}
        duration={4000}
      />
      <FloatingAnimal
        type="elephant"
        position={{ top: "5%", right: "8%" }}
        color="rgba(75, 213, 179, 0.5)"
        size={90}
        delay={500}
        duration={3500}
      />
      <FloatingAnimal
        type="lion"
        position={{ bottom: "15%", right: "10%" }}
        color="rgba(255, 152, 88, 0.5)"
        size={110}
        delay={1000}
        duration={4500}
      />

      {/* Title */}
      <Animated.View
        entering={FadeIn.delay(300).springify()}
        style={styles.titleContainer}
      >
        <Text style={styles.title}>Pop & Learn</Text>
        <Text style={styles.subtitle}>Fun learning for little fingers!</Text>
      </Animated.View>

      {/* Game Mode Buttons */}
      <View style={styles.buttonsContainer}>
        {GAME_MODES.map((mode, index) => (
          <Animated.View
            key={mode.title}
            entering={FadeInDown.delay(500 + index * 200).springify()}
            style={styles.buttonWrapper}
          >
            <Pressable
              onPress={() => handleGameSelect(mode.route)}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={[mode.color, mode.color + "99"]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconContainer}>
                  <mode.icon size={28} color="white" />
                </View>
                <Text style={styles.buttonText}>{mode.title}</Text>
                <FloatingAnimal
                  type={mode.animal}
                  size={40}
                  position={{ right: 15 }}
                  delay={800 + index * 200}
                  color="rgba(255, 255, 255, 0.7)"
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* Stats Display */}
      <Animated.View
        entering={FadeIn.delay(1800).springify()}
        style={styles.statsContainer}
      >
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.7)", "rgba(255, 255, 255, 0.4)"]}
          style={styles.statsGradient}
        >
          <Text style={styles.statsTitle}>Your Progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalPops}</Text>
              <Text style={styles.statLabel}>Total Pops</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{shapesCompleted}</Text>
              <Text style={styles.statLabel}>Shapes Done</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontFamily: "BubbleGum",
    fontSize: 52,
    color: "#FF6B95",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: "#666",
    marginTop: 8,
  },
  buttonsContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  buttonWrapper: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 14,
  },
  button: {
    borderRadius: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    transform: [{ scale: 1 }],
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  buttonText: {
    fontFamily: "ComicNeue",
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
    flex: 1,
  },
  statsContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  statsGradient: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 16,
  },
  statsTitle: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: "#555",
    marginBottom: 12,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: "BubbleGum",
    fontSize: 32,
    color: "#FF6B95",
  },
  statLabel: {
    fontFamily: "ComicNeue",
    fontSize: 14,
    color: "#666",
  },
});
