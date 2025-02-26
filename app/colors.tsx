import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
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

  // Cumulative totals (across rounds)
  const [totalTimePlayed, setTotalTimePlayed] = useState(0);
  const [totalColorsSolved, setTotalColorsSolved] = useState(0);

  // Toggle to collapse/expand the metrics display
  const [metricsExpanded, setMetricsExpanded] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressWidth = useSharedValue(100);

  // Helper function to format time (MM:SS)
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }, []);

  // Function to speak text using TTS
  const speakText = useCallback((text: string) => {
    Speech.stop();
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.2,
      rate: 0.9,
    });
  }, []);

  // Initialize a game round (do not reset score or cumulative totals)
  const initializeGame = useCallback(() => {
    // Reset only round-specific state
    setTimeRemaining(GAME_DURATION);
    setShowResults(false);
    progressWidth.value = 100;

    // Choose a random target color
    const randomIndex = Math.floor(Math.random() * LEARNING_COLORS.length);
    const target = LEARNING_COLORS[randomIndex];
    setTargetColor(target);

    // Generate bubbles using the target color and other colors
    const colors = [];
    const targetColorCount = 8; // Number of target color bubbles

    for (let i = 0; i < targetColorCount; i++) {
      colors.push(target);
    }

    const remainingSpots = TOTAL_BUBBLES - targetColorCount;
    const otherColors = LEARNING_COLORS.filter((c) => c.name !== target.name);
    for (let i = 0; i < remainingSpots; i++) {
      const randomOtherIndex = Math.floor(Math.random() * otherColors.length);
      colors.push(otherColors[randomOtherIndex]);
    }

    const shuffled = colors.sort(() => Math.random() - 0.5);
    setBubbleColors(shuffled);
    setRemainingBubbles(targetColorCount);

    // Start the round
    setGameActive(true);
    speakText(`Find the color ${target.name}. You have 30 seconds.`);
    startTimer();
  }, [speakText, progressWidth]);

  // Countdown timer for current round
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === 10) {
          speakText("10 seconds left!");
        } else if (prev === 5) {
          speakText("Hurry! 5 seconds left!");
        }
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameActive(false);
          setShowResults(true);
          speakText(`Time's up! Your score is ${score} points.`);
          return 0;
        }
        return prev - 1;
      });
      // Update progress bar width
      progressWidth.value = withTiming(
        ((timeRemaining - 1) * 100) / GAME_DURATION,
      );
    }, 1000);
  }, [timeRemaining, score, speakText, progressWidth]);

  // Update total time played while a round is active
  useEffect(() => {
    let totalTimeInterval: NodeJS.Timeout;
    if (gameActive) {
      totalTimeInterval = setInterval(() => {
        setTotalTimePlayed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (totalTimeInterval) clearInterval(totalTimeInterval);
    };
  }, [gameActive]);

  // Initial setup: load sounds and initialize speech
  useEffect(() => {
    loadSound("pop");
    loadSound("correct");
    loadSound("incorrect");
    loadSound("celebration");

    Speech.getAvailableVoicesAsync().then(() => {
      console.log("Speech module initialized");
    });
    // Start game round on mount
    initializeGame();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      Speech.stop();
    };
  }, [initializeGame]);

  // Handle bubble pop events
  const handlePop = useCallback(
    (index: number, color: (typeof LEARNING_COLORS)[0]) => {
      if (!gameActive) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (color.name === targetColor.name) {
        playSound("correct");
        setScore((prev) => prev + 10);
        setRemainingBubbles((prev) => prev - 1);
        incrementPops();

        if (remainingBubbles <= 1) {
          playSound("celebration");
          incrementColorsLearned();
          setTotalColorsSolved((prev) => prev + 1);
          speakText(
            `Great job! You found all the ${targetColor.name} bubbles!`,
          );
          setTimeout(() => {
            initializeGame();
          }, 1500);
        } else if (remainingBubbles <= 3) {
          speakText(
            `Good! ${remainingBubbles - 1} ${targetColor.name} bubbles left.`,
          );
        }
      } else {
        playSound("incorrect");
        setScore((prev) => Math.max(0, prev - 5));
        speakText(`That's ${color.name}, not ${targetColor.name}.`);
      }

      // Mark the bubble as popped
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

  // Start round on mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Animated style for timer progress bar
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

      {/* Animal decoration */}
      <FloatingAnimal
        type="elephant"
        position={{ top: 100, left: 20 }}
        size={80}
        color="rgba(75, 213, 179, 0.6)"
      />

      <View style={styles.container}>
        {/* Target color info & round timer */}
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

        {/* Collapsible metrics display */}
        <Pressable
          onPress={() => setMetricsExpanded((prev) => !prev)}
          style={styles.metricsToggle}
        >
          <Text style={styles.metricsToggleText}>
            {metricsExpanded ? "Hide Metrics ▲" : "Show Metrics ▼"}
          </Text>
        </Pressable>
        {metricsExpanded && (
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Text style={styles.metricTitle}>Score</Text>
              <Text style={styles.metricValue}>{score}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricTitle}>Time Played</Text>
              <Text style={styles.metricValue}>
                {formatTime(totalTimePlayed)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricTitle}>Colors Solved</Text>
              <Text style={styles.metricValue}>{totalColorsSolved}</Text>
            </View>
          </View>
        )}

        {/* Results overlay */}
        {showResults && (
          <Animated.View entering={FadeIn} style={styles.resultsOverlay}>
            <Text style={styles.resultsTitle}>Time's Up!</Text>
            <Text style={styles.resultsScore}>Score: {score}</Text>
            <Text style={styles.resultsScore}>
              Colors Solved: {totalColorsSolved}
            </Text>
            <Text style={styles.resultsScore}>
              Time Played: {formatTime(totalTimePlayed)}
            </Text>
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
  metricsToggle: {
    marginVertical: 10,
  },
  metricsToggleText: {
    fontFamily: "ComicNeue",
    fontSize: 16,
    color: COLORS.text.primary,
    textDecorationLine: "underline",
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  metricItem: {
    flex: 1,
    minWidth: 100,
    alignItems: "center",
    marginHorizontal: 5,
    marginVertical: 5,
  },
  metricTitle: {
    fontFamily: "ComicNeue",
    fontSize: 16,
    color: COLORS.text.primary,
  },
  metricValue: {
    fontFamily: "BubbleGum",
    fontSize: 24,
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
    marginBottom: 10,
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
