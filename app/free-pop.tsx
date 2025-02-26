import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import PopBubble from "../components/PopBubble";
import { useGameContext } from "../contexts/GameContext";
import { SHAPE_THEMES, COLORS } from "../utils/colors";
import { loadSound } from "../utils/sounds";

import { useSound } from "@/hooks/useSound";
import { useSpeech } from "@/hooks/useSpeech";

// Grid configuration
const GRID_SIZE = 5; // 5x5 grid
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;

type ShapeTheme = keyof typeof SHAPE_THEMES;

// Define realistic shapes we can actually create
const SHAPES = {
  CIRCLE: "circle",
  SQUARE: "square",
  ROUNDED_SQUARE: "roundedSquare",
  PILL: "pill",
};

// Define shape styles with appropriate properties for each shape
const SHAPE_STYLES = {
  [SHAPES.CIRCLE]: {
    borderRadius: 50,
    aspectRatio: 1,
    transform: [],
  },
  [SHAPES.SQUARE]: {
    borderRadius: 5,
    aspectRatio: 1,
    transform: [],
  },
  [SHAPES.ROUNDED_SQUARE]: {
    borderRadius: 15,
    aspectRatio: 1,
    transform: [],
  },
  [SHAPES.PILL]: {
    borderRadius: 50,
    width: 80,
    height: 60,
    transform: [],
  },
};

// Define progression of shapes for the game
const SHAPE_PROGRESSION = [
  SHAPES.CIRCLE,
  SHAPES.SQUARE,
  SHAPES.ROUNDED_SQUARE,
  SHAPES.PILL,
];

export default function FreePop() {
  const { incrementPops, incrementShapesCompleted } = useGameContext();
  const { play } = useSound();
  const { speakText } = useSpeech();

  const [currentTheme, setCurrentTheme] = useState<ShapeTheme>("circle");
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [bubbleStates, setBubbleStates] = useState<boolean[]>([]);
  const [poppedCount, setPoppedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPopTimeRef = useRef<number>(Date.now());
  const isSpeakingRef = useRef<boolean>(false);

  // Get current shape from progression
  const currentShape = SHAPE_PROGRESSION[currentShapeIndex];

  // Clean up function for timers and speech
  const cleanUp = useCallback(() => {
    // Stop any ongoing speech
    if (isSpeakingRef.current) {
      Speech.stop();
      isSpeakingRef.current = false;
    }

    // Clear timers
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // Speak the current shape
  const announceCurrentShape = useCallback(
    async (isFirstTime = false) => {
      if (isSpeakingRef.current) {
        await Speech.stop();
      }

      const shapeName =
        currentShape === SHAPES.ROUNDED_SQUARE
          ? "rounded square"
          : currentShape;

      const prefix = isFirstTime ? "Game started. " : "New shape! ";
      const message = `${prefix}Pop all the ${shapeName} bubbles!`;

      isSpeakingRef.current = true;

      speakText(message, {
        rate: 0.9,
        pitch: 1.0,
        onDone: () => {
          isSpeakingRef.current = false;
        },
        onStopped: () => {
          isSpeakingRef.current = false;
        },
      });
    },
    [currentShape],
  );

  // Give a hint if user is inactive
  const giveHint = useCallback(async () => {
    if (isSpeakingRef.current) {
      await Speech.stop();
    }

    const remainingCount = TOTAL_BUBBLES - poppedCount;
    const shapeName =
      currentShape === SHAPES.ROUNDED_SQUARE ? "rounded square" : currentShape;
    const message = `Keep going! ${remainingCount} ${shapeName} bubbles left to pop.`;

    isSpeakingRef.current = true;

    speakText(message, {
      rate: 0.9,
      pitch: 1.0,
      onDone: () => {
        isSpeakingRef.current = false;
      },
      onStopped: () => {
        isSpeakingRef.current = false;
      },
    });
  }, [currentShape, poppedCount]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      const now = Date.now();
      // If no bubble was popped in the last 20 seconds and game is not complete
      if (now - lastPopTimeRef.current > 20000 && poppedCount < TOTAL_BUBBLES) {
        giveHint();
      }
    }, 20000);
  }, [giveHint, poppedCount]);

  // Initialize bubble states only when the current shape changes.
  // Notice that we removed `giveHint` and `completedCount` from the dependencies
  // to prevent resetting the game when a bubble is popped.
  useEffect(() => {
    setBubbleStates(Array(TOTAL_BUBBLES).fill(false));
    setPoppedCount(0);

    // Announce the new shape
    cleanUp();
    setTimeout(() => {
      announceCurrentShape(completedCount === 0);
    }, 300);

    // Set up inactivity timer
    resetInactivityTimer();

    // Set a hint timer for halfway through
    hintTimerRef.current = setTimeout(() => {
      if (poppedCount < TOTAL_BUBBLES / 2) {
        giveHint();
      }
    }, 30000);
  }, [currentShape, cleanUp, resetInactivityTimer, announceCurrentShape]);

  // Load pop and celebration sounds
  useEffect(() => {
    loadSound("pop");
    loadSound("celebration");

    // Cleanup function when component unmounts
    return cleanUp;
  }, [cleanUp]);

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
      play("pop");

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
        // Clean up timers and speech
        cleanUp();

        // Show celebration and advance to next shape
        setShowCelebration(true);
        incrementShapesCompleted();
        play("celebration");

        // Celebration speech
        const shapeName =
          currentShape === SHAPES.ROUNDED_SQUARE
            ? "rounded square"
            : currentShape;

        speakText(`Great job! You popped all the ${shapeName} bubbles!`, {
          rate: 0.9,
          pitch: 1.0,
        });

        // Reset and move to next shape after a delay
        setTimeout(() => {
          // Move to the next shape in the progression
          const nextShapeIndex =
            (currentShapeIndex + 1) % SHAPE_PROGRESSION.length;
          setCurrentShapeIndex(nextShapeIndex);

          // Update the theme color
          setCurrentTheme(
            Object.keys(SHAPE_THEMES)[
              nextShapeIndex % Object.keys(SHAPE_THEMES).length
            ] as ShapeTheme,
          );

          setCompletedCount((prev) => prev + 1);
          setShowCelebration(false);
        }, 2500);
      }
    },
    [
      bubbleStates,
      poppedCount,
      currentShape,
      currentShapeIndex,
      incrementPops,
      incrementShapesCompleted,
      resetInactivityTimer,
      cleanUp,
    ],
  );

  // Get the appropriate shape style based on current shape
  const getShapeStyle = useCallback(() => {
    return SHAPE_STYLES[currentShape] || SHAPE_STYLES[SHAPES.CIRCLE];
  }, [currentShape]);

  // Get the shape name for display
  const getShapeName = useCallback(() => {
    switch (currentShape) {
      case SHAPES.CIRCLE:
        return "Circle";
      case SHAPES.SQUARE:
        return "Square";
      case SHAPES.ROUNDED_SQUARE:
        return "Rounded Square";
      case SHAPES.PILL:
        return "Pill";
      default:
        return "Circle";
    }
  }, [currentShape]);

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
          {/* Current shape display */}
          <LinearGradient
            colors={SHAPE_THEMES[currentTheme].colors}
            style={styles.themeContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.themeName}>
              {SHAPE_THEMES[currentTheme].icon} {getShapeName()}
            </Text>

            {/* Progress indicator */}
            <Text style={styles.progress}>
              {poppedCount} / {TOTAL_BUBBLES}
            </Text>
          </LinearGradient>

          {/* Bubble grid */}
          <View style={styles.gridContainer}>
            <View style={[styles.grid, { width: GRID_SIZE * 90 }]}>
              {Array.from({ length: TOTAL_BUBBLES }).map((_, index) => (
                <PopBubble
                  key={`${currentShape}-${index}`}
                  id={`${index}`}
                  isPopped={bubbleStates[index]}
                  onPop={() => handlePop(index)}
                  colors={SHAPE_THEMES[currentTheme].colors}
                  size={70}
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
