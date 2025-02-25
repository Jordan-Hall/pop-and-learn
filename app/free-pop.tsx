import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech"; // Add this import
import React, { useState, useEffect, useCallback, useRef } from "react"; // Add useRef
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import PopBubble from "../components/PopBubble";
import { useGameContext } from "../contexts/GameContext";
import { SHAPE_THEMES, COLORS } from "../utils/colors";
import { loadSound, playSound } from "../utils/sounds";

// Grid configuration
const GRID_SIZE = 5; // 5x5 grid
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;

type ShapeTheme = keyof typeof SHAPE_THEMES;

// Define shape styles for each theme
const SHAPE_STYLES: Record<ShapeTheme, { borderRadius: number }> = {
  circle: { borderRadius: 50 }, // Full circle (default)
  square: { borderRadius: 5 }, // Almost square with slightly rounded corners
  star: { borderRadius: 15 }, // We'll use a rounded shape as approximation
  heart: { borderRadius: 20 }, // Rounded shape as approximation,
  hexagon: { borderRadius: 10 }, // Rounded shape as approximation,
  animal: { borderRadius: 20 }, // Rounded shape as approximation,
};

export default function FreePop() {
  const { incrementPops, incrementShapesCompleted } = useGameContext();
  const [currentTheme, setCurrentTheme] = useState<ShapeTheme>("circle");
  const [bubbleStates, setBubbleStates] = useState<boolean[]>([]);
  const [poppedCount, setPoppedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPopTimeRef = useRef<number>(Date.now());

  // Speak the current theme
  const announceCurrentTheme = useCallback(
    (isFirstTime = false) => {
      const prefix = isFirstTime ? "Game started. " : "New shape! ";
      const message = `${prefix}Pop all the ${SHAPE_THEMES[currentTheme].name} bubbles!`;

      Speech.speak(message, {
        rate: 0.9,
        pitch: 1.0,
      });
    },
    [currentTheme],
  );

  // Give a hint if user is inactive
  const giveHint = useCallback(() => {
    const remainingCount = TOTAL_BUBBLES - poppedCount;
    const message = `Keep going! ${remainingCount} ${SHAPE_THEMES[currentTheme].name} bubbles left to pop.`;

    Speech.speak(message, {
      rate: 0.9,
      pitch: 1.0,
    });
  }, [currentTheme, poppedCount]);

  // Initialize bubble states
  useEffect(() => {
    setBubbleStates(Array(TOTAL_BUBBLES).fill(false));
    setPoppedCount(0);

    // Announce the new theme
    Speech.stop();
    announceCurrentTheme(completedCount === 0);

    // Set up inactivity timer
    resetInactivityTimer();

    // Set a hint timer for halfway through
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }

    hintTimerRef.current = setTimeout(() => {
      if (poppedCount < TOTAL_BUBBLES / 2) {
        giveHint();
      }
    }, 15000); // Give a hint after 15 seconds if less than half completed
  }, [
    currentTheme,
    announceCurrentTheme,
    giveHint,
    completedCount,
    poppedCount,
  ]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      const now = Date.now();
      // If no bubble was popped in the last 10 seconds and game is not complete
      if (now - lastPopTimeRef.current > 10000 && poppedCount < TOTAL_BUBBLES) {
        giveHint();
        // Reset the timer again
        resetInactivityTimer();
      }
    }, 10000); // Check for inactivity every 10 seconds
  }, [giveHint, poppedCount]);

  // Load pop sound
  useEffect(() => {
    loadSound("pop");
    loadSound("celebration");

    // Cleanup function
    return () => {
      // Stop any ongoing speech
      Speech.stop();

      // Clear timers
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const handlePop = useCallback(
    (index: number) => {
      if (bubbleStates[index]) return;

      // Update last pop time
      lastPopTimeRef.current = Date.now();

      // Reset inactivity timer
      resetInactivityTimer();

      // Play haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Play pop sound
      playSound("pop");

      // Update bubble states
      setBubbleStates((prev) => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });

      // Increment pop counters
      setPoppedCount((prev) => prev + 1);
      incrementPops();

      // Check if all bubbles are popped
      if (poppedCount + 1 >= TOTAL_BUBBLES) {
        // Stop any ongoing speech
        Speech.stop();

        // Clear timers
        if (hintTimerRef.current) {
          clearTimeout(hintTimerRef.current);
          hintTimerRef.current = null;
        }

        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }

        // Show celebration and advance to next shape
        setShowCelebration(true);
        incrementShapesCompleted();
        playSound("celebration");

        // Celebration speech
        Speech.speak(
          `Great job! You popped all the ${SHAPE_THEMES[currentTheme].name} bubbles!`,
          {
            rate: 0.9,
            pitch: 1.0,
          },
        );

        // Reset and move to next shape after a delay
        setTimeout(() => {
          const themes = Object.keys(SHAPE_THEMES) as ShapeTheme[];
          const nextThemeIndex =
            (themes.indexOf(currentTheme) + 1) % themes.length;
          setCurrentTheme(themes[nextThemeIndex]);
          setCompletedCount((prev) => prev + 1);
          setShowCelebration(false);
        }, 2000);
      }
    },
    [
      bubbleStates,
      poppedCount,
      currentTheme,
      incrementPops,
      incrementShapesCompleted,
      resetInactivityTimer,
    ],
  );

  // Get the appropriate shape style based on current theme
  const getShapeStyle = useCallback(() => {
    return SHAPE_STYLES[currentTheme] || SHAPE_STYLES.circle;
  }, [currentTheme]);

  return (
    <AnimatedBackground colors={COLORS.freePop.background}>
      <GameHeader
        title="Free Pop"
        subtitle="Pop all the bubbles!"
        colors={SHAPE_THEMES[currentTheme].colors}
      />

      {/* Animal decorations */}
      <FloatingAnimal
        type="bunny"
        position={{ top: 100, right: 20 }}
        size={70}
        color="rgba(255, 107, 149, 0.6)"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Current theme display */}
          <LinearGradient
            colors={SHAPE_THEMES[currentTheme].colors}
            style={styles.themeContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.themeName}>
              {SHAPE_THEMES[currentTheme].icon}{" "}
              {SHAPE_THEMES[currentTheme].name}
            </Text>

            {/* Progress indicator */}
            <Text style={styles.progress}>
              {poppedCount} / {TOTAL_BUBBLES}
            </Text>
          </LinearGradient>

          {/* Bubble grid */}
          <View style={styles.gridContainer}>
            <View
              style={[
                styles.grid,
                { width: GRID_SIZE * 90 }, // Adjust based on bubble size + margin
              ]}
            >
              {Array.from({ length: TOTAL_BUBBLES }).map((_, index) => (
                <PopBubble
                  key={`${currentTheme}-${index}`}
                  id={`${index}`}
                  isPopped={bubbleStates[index]}
                  onPop={() => handlePop(index)}
                  colors={SHAPE_THEMES[currentTheme].colors}
                  size={70}
                  // Pass custom shape style based on current theme
                  shapeStyle={getShapeStyle()}
                />
              ))}
            </View>
          </View>

          {/* Stats display */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.5)"]}
              style={styles.statsCard}
            >
              <Text style={styles.statsTitle}>Your Progress</Text>
              <Text style={styles.statsText}>
                Shapes Completed: {completedCount}
              </Text>
            </LinearGradient>
          </View>

          {/* Celebration overlay */}
          {showCelebration && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.celebrationOverlay}
            >
              <Text style={styles.celebrationText}>Great Job!</Text>
              <Text style={styles.celebrationEmoji}>
                {SHAPE_THEMES[currentTheme].icon} 🎉{" "}
                {SHAPE_THEMES[currentTheme].icon}
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  themeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    marginVertical: 16,
  },
  themeName: {
    fontFamily: "BubbleGum",
    fontSize: 28,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progress: {
    fontFamily: "ComicNeue",
    fontSize: 20,
    color: "white",
    fontWeight: "bold",
  },
  gridContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statsContainer: {
    width: "90%",
    maxWidth: 500,
    marginVertical: 20,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statsTitle: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  statsText: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: COLORS.text.secondary,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  celebrationText: {
    fontFamily: "BubbleGum",
    fontSize: 48,
    color: COLORS.freePop.primary,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  celebrationEmoji: {
    fontSize: 60,
    marginTop: 20,
  },
});
