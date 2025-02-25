import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech"; // Import Speech module
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import PopBubble from "../components/PopBubble";
import { useGameContext } from "../contexts/GameContext";
import { LEARNING_COLORS, COLORS } from "../utils/colors";
import { loadSound, playSound } from "../utils/sounds";

// Grid configuration
const GRID_SIZE = 4; // 4x4 grid
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;
const GAME_DURATION = 30; // 30 seconds per round

export default function ColorsGame() {
  const { incrementPops, incrementColorsLearned } = useGameContext();
  const [targetColor, setTargetColor] = useState(LEARNING_COLORS[0]);
  const [bubbleColors, setBubbleColors] = useState<
    ((typeof LEARNING_COLORS)[0] & { popped?: boolean })[]
  >([]);
  const [score, setScore] = useState(0);
  const [remainingBubbles, setRemainingBubbles] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [showResults, setShowResults] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressWidth = useSharedValue(100);

  // Function to speak text using TTS
  const speakText = useCallback((text: string) => {
    // Stop any ongoing speech
    Speech.stop();

    // Speak the new text
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.2, // Slightly higher pitch for child-friendly voice
      rate: 0.9, // Slightly slower rate for clarity
    });
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    // Reset state
    setScore(0);
    setTimeRemaining(GAME_DURATION);
    setShowResults(false);
    progressWidth.value = 100;

    // Choose random target color
    const randomIndex = Math.floor(Math.random() * LEARNING_COLORS.length);
    const target = LEARNING_COLORS[randomIndex];
    setTargetColor(target);

    // Generate bubbles with multiple colors
    const colors = [];
    const targetColorCount = 8; // Number of target color bubbles

    // Add target color bubbles
    for (let i = 0; i < targetColorCount; i++) {
      colors.push(target);
    }

    // Fill remaining spots with other colors
    const remainingSpots = TOTAL_BUBBLES - targetColorCount;
    const otherColors = LEARNING_COLORS.filter((c) => c.name !== target.name);

    for (let i = 0; i < remainingSpots; i++) {
      const randomOtherIndex = Math.floor(Math.random() * otherColors.length);
      colors.push(otherColors[randomOtherIndex]);
    }

    // Shuffle colors
    const shuffled = colors.sort(() => Math.random() - 0.5);
    setBubbleColors(shuffled);
    setRemainingBubbles(targetColorCount);

    // Start game
    setGameActive(true);

    // Announce the new target color
    speakText(`Find the color ${target.name}. You have 30 seconds.`);

    // Start timer
    startTimer();
  }, [speakText]);

  // Start the countdown timer
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        // Announce time running out
        if (prev === 10) {
          speakText("10 seconds left!");
        } else if (prev === 5) {
          speakText("Hurry! 5 seconds left!");
        }

        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameActive(false);
          setShowResults(true);

          // Announce game over
          speakText(`Time's up! Your score is ${score} points.`);

          return 0;
        }
        return prev - 1;
      });

      progressWidth.value = withTiming(
        (timeRemaining - 1) * (100 / GAME_DURATION),
      );
    }, 1000);
  }, [timeRemaining, score, speakText]);

  // Clean up timer on unmount
  useEffect(() => {
    loadSound("pop");
    loadSound("correct");
    loadSound("incorrect");
    loadSound("celebration");

    // Initialize Speech module
    Speech.getAvailableVoicesAsync().then(() => {
      console.log("Speech module initialized");
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Clean up speech when component unmounts
      Speech.stop();
    };
  }, []);

  // Handle bubble pop
  const handlePop = useCallback(
    (index: number, color: (typeof LEARNING_COLORS)[0]) => {
      if (!gameActive) return;

      // Play haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Check if correct color
      if (color.name === targetColor.name) {
        // Correct color!
        playSound("correct");
        setScore((prev) => prev + 10);
        setRemainingBubbles((prev) => prev - 1);
        incrementPops();

        // Check if all target bubbles popped
        if (remainingBubbles <= 1) {
          // Level completed!
          playSound("celebration");
          incrementColorsLearned();

          // Announce success
          speakText(
            `Great job! You found all the ${targetColor.name} bubbles!`,
          );

          // Reset the game after a short delay
          setTimeout(() => {
            initializeGame();
          }, 1500);
        } else if (remainingBubbles <= 3) {
          // Announce when few bubbles remain
          speakText(
            `Good! ${remainingBubbles - 1} ${targetColor.name} bubbles left.`,
          );
        }
      } else {
        // Wrong color
        playSound("incorrect");
        setScore((prev) => Math.max(0, prev - 5));

        // Announce wrong color
        speakText(`That's ${color.name}, not ${targetColor.name}.`);
      }

      // Remove popped bubble
      setBubbleColors((prev) => {
        const newColors = [...prev];
        newColors[index] = { ...newColors[index], popped: true };
        return newColors;
      });
    },
    [
      gameActive,
      targetColor,
      remainingBubbles,
      incrementPops,
      incrementColorsLearned,
      initializeGame,
      speakText,
    ],
  );

  // Start game on first render
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Timer progress bar animated style
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  return (
    <AnimatedBackground colors={COLORS.colors.background}>
      <GameHeader
        title="Colors"
        subtitle="Find the matching colors!"
        colors={targetColor.value}
      />

      {/* Animal decorations */}
      <FloatingAnimal
        type="elephant"
        position={{ top: 100, left: 20 }}
        size={80}
        color="rgba(75, 213, 179, 0.6)"
      />

      <View style={styles.container}>
        {/* Target color and timer */}
        <LinearGradient
          colors={targetColor.value}
          style={styles.targetContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.targetInfoContainer}>
            <Text style={styles.findText}>Find</Text>
            <Text style={styles.targetText}>{targetColor.name}</Text>
          </View>

          <View style={styles.remainingContainer}>
            <Text style={styles.remainingText}>{remainingBubbles} left</Text>
          </View>
        </LinearGradient>

        {/* Timer progress bar */}
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.timerBar, progressStyle]} />
          <Text style={styles.timerText}>{timeRemaining}s</Text>
        </View>

        {/* Bubble grid */}
        <View style={styles.gridContainer}>
          <View style={[styles.grid, { width: GRID_SIZE * 85 }]}>
            {bubbleColors.map((color, index) => (
              <PopBubble
                key={`color-${index}`}
                id={`${index}`}
                isPopped={color.popped}
                onPop={() => handlePop(index, color)}
                colors={color.value}
                size={65}
                disabled={color.popped || !gameActive}
              />
            ))}
          </View>
        </View>

        {/* Score display */}
        <View style={styles.scoreContainer}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.5)"]}
            style={styles.scoreCard}
          >
            <Text style={styles.scoreTitle}>Score</Text>
            <Text style={styles.scoreText}>{score}</Text>
          </LinearGradient>
        </View>

        {/* Results overlay */}
        {showResults && (
          <Animated.View entering={FadeIn} style={styles.resultsOverlay}>
            <Text style={styles.resultsTitle}>Time's Up!</Text>
            <Text style={styles.resultsScore}>Score: {score}</Text>

            <Pressable
              style={styles.playAgainButton}
              onPress={() => {
                speakText("Let's play again!");
                initializeGame();
              }}
            >
              <LinearGradient
                colors={
                  COLORS.colors.primary
                    ? [COLORS.colors.primary, COLORS.colors.secondary]
                    : ["#4BD5B3", "#A2F0D5"]
                }
                style={styles.playAgainGradient}
              >
                <Text style={styles.playAgainText}>Play Again</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  targetContainer: {
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
  targetInfoContainer: {
    flexDirection: "column",
  },
  findText: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: "white",
    opacity: 0.9,
  },
  targetText: {
    fontFamily: "BubbleGum",
    fontSize: 32,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  remainingContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  remainingText: {
    fontFamily: "ComicNeue",
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  timerContainer: {
    width: "90%",
    maxWidth: 500,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    position: "relative",
  },
  timerBar: {
    height: "100%",
    backgroundColor: COLORS.colors.primary,
    borderRadius: 15,
  },
  timerText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    lineHeight: 30,
    fontFamily: "ComicNeue",
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  gridContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  scoreContainer: {
    width: "90%",
    maxWidth: 500,
    marginVertical: 20,
  },
  scoreCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  scoreTitle: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: COLORS.text.primary,
  },
  scoreText: {
    fontFamily: "BubbleGum",
    fontSize: 36,
    color: COLORS.colors.primary,
  },
  resultsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  resultsTitle: {
    fontFamily: "BubbleGum",
    fontSize: 42,
    color: COLORS.colors.primary,
    marginBottom: 20,
  },
  resultsScore: {
    fontFamily: "ComicNeue",
    fontSize: 32,
    color: COLORS.text.primary,
    marginBottom: 40,
  },
  playAgainButton: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  playAgainGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
  },
  playAgainText: {
    fontFamily: "BubbleGum",
    fontSize: 24,
    color: "white",
  },
});
