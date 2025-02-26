import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import PopBubble from "../components/PopBubble";
import { useGameContext } from "../contexts/GameContext";
import { COLORS } from "../utils/colors";
import { loadSound } from "../utils/sounds";

import { useSound } from "@/hooks/useSound";

// Grid configuration
const GRID_SIZE = 4; // 4x4 grid
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;
const GAME_DURATION = 30; // 30 seconds

export default function SpeedGame() {
  const { incrementPops, updateHighScore } = useGameContext();
  const { play } = useSound();

  const [bubbleStates, setBubbleStates] = useState<boolean[]>([]);
  const [bubbleColors, setBubbleColors] = useState<
    [string, string, ...string[]][]
  >([]);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [gameActive, setGameActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [poppedCount, setPoppedCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressWidth = useSharedValue(100);

  // Initialize bubble states and colors
  const initializeBubbles = useCallback(() => {
    setBubbleStates(Array(TOTAL_BUBBLES).fill(false));
    setPoppedCount(0);

    // Generate new colors for all bubbles
    const newColors = Array.from({ length: TOTAL_BUBBLES }).map((_, index) =>
      getBubbleColors(index),
    );
    setBubbleColors(newColors);
  }, []);

  // Generate random colors for each bubble
  const getBubbleColors = useCallback(
    (index: number): [string, string, ...string[]] => {
      const colorKeys = Object.keys(COLORS.bubbles);
      const randomIndex = Math.floor(Math.random() * colorKeys.length);
      const colorKey = colorKeys[randomIndex] as keyof typeof COLORS.bubbles;

      const colors = COLORS.bubbles[colorKey];
      if (colors.length >= 2) {
        return colors as [string, string, ...string[]];
      }
      return [colors[0], colors[0]] as [string, string, ...string[]];
    },
    [],
  );

  // Reset all bubbles when all are popped
  const resetBubblesIfAllPopped = useCallback(() => {
    if (poppedCount >= TOTAL_BUBBLES) {
      // Play a special sound for clearing all bubbles
      play("celebration");

      // Add bonus points for clearing the grid
      const bonusPoints = 5;
      setScore((prev) => prev + bonusPoints);

      // Reset all bubbles with new colors
      setTimeout(() => {
        initializeBubbles();
      }, 300);
    }
  }, [poppedCount, initializeBubbles]);

  // Start the game
  const startGame = useCallback(() => {
    // Reset state
    setScore(0);
    setTimeRemaining(GAME_DURATION);
    setShowResults(false);
    setGameActive(true);
    progressWidth.value = 100;

    // Initialize bubbles
    initializeBubbles();

    // Start timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Game over
          clearInterval(timerRef.current!);
          endGame();
          return 0;
        }
        return prev - 1;
      });

      progressWidth.value = withTiming(
        (timeRemaining - 1) * (100 / GAME_DURATION),
      );
    }, 1000);
  }, [timeRemaining, initializeBubbles]);

  // End the game
  const endGame = useCallback(() => {
    setGameActive(false);
    setShowResults(true);

    // Update high score if needed
    if (score > highScore) {
      setHighScore(score);
      updateHighScore(score);
    }

    // Play celebration sound
    play("celebration");
  }, [score, highScore, updateHighScore]);

  // Handle bubble pop
  const handlePop = useCallback(
    (index: number) => {
      if (!gameActive || bubbleStates[index]) return;

      // Play haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Play pop sound
      play("pop");

      // Mark bubble as popped
      setBubbleStates((prev) => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });

      // Increment popped count
      setPoppedCount((prev) => prev + 1);

      // Increment score
      setScore((prev) => prev + 1);
      incrementPops();
    },
    [gameActive, bubbleStates, incrementPops],
  );

  // Check if all bubbles are popped
  useEffect(() => {
    if (gameActive) {
      resetBubblesIfAllPopped();
    }
  }, [poppedCount, gameActive, resetBubblesIfAllPopped]);

  // Initialize on first render
  useEffect(() => {
    loadSound("pop");
    loadSound("celebration");
    loadSound("countdown");

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer progress bar animated style
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  return (
    <AnimatedBackground colors={COLORS.speed.background}>
      <GameHeader
        title="Speed Pop"
        subtitle="Pop them all!"
        colors={[COLORS.speed.primary, COLORS.speed.secondary]}
      />

      {/* Animal decoration */}
      <FloatingAnimal
        type="lion"
        position={{ top: 100, right: 20 }}
        size={80}
        color="rgba(255, 152, 88, 0.6)"
      />

      <View style={styles.container}>
        {gameActive ? (
          <>
            {/* Timer display */}
            <View style={styles.timerContainer}>
              <Animated.View style={[styles.timerBar, progressStyle]} />
              <Text style={styles.timerText}>{timeRemaining}s</Text>
            </View>

            {/* Score display */}
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreText}>Score: {score}</Text>
            </View>

            {/* Bubble grid */}
            <View style={styles.gridContainer}>
              <View style={[styles.grid, { width: GRID_SIZE * 85 }]}>
                {bubbleStates.map((isPopped, index) => (
                  <PopBubble
                    key={`speed-${index}`}
                    id={`${index}`}
                    isPopped={isPopped}
                    onPop={() => handlePop(index)}
                    colors={bubbleColors[index] || getBubbleColors(index)}
                    size={65}
                    disabled={isPopped}
                  />
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Game start or results screen */}
            <View style={styles.startContainer}>
              {showResults ? (
                <>
                  <Text style={styles.resultTitle}>Time's Up!</Text>
                  <Text style={styles.resultScore}>Your Score: {score}</Text>
                  <Text style={styles.highScoreText}>
                    Best Score: {highScore}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.startTitle}>Speed Pop</Text>
                  <Text style={styles.startDescription}>
                    Pop all bubbles to clear the grid! Clear multiple grids to
                    get higher scores!
                  </Text>
                </>
              )}

              <Pressable style={styles.startButton} onPress={startGame}>
                <LinearGradient
                  colors={[COLORS.speed.primary, COLORS.speed.secondary]}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>
                    {showResults ? "Play Again" : "Start Game"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </>
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
  timerContainer: {
    width: "90%",
    maxWidth: 500,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 10,
    position: "relative",
  },
  timerBar: {
    height: "100%",
    backgroundColor: COLORS.speed.primary,
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
  scoreDisplay: {
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 15,
  },
  scoreText: {
    fontFamily: "BubbleGum",
    fontSize: 24,
    color: COLORS.speed.primary,
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
  startContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  startTitle: {
    fontFamily: "BubbleGum",
    fontSize: 48,
    color: COLORS.speed.primary,
    marginBottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  startDescription: {
    fontFamily: "ComicNeue",
    fontSize: 20,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginBottom: 40,
    maxWidth: 300,
  },
  resultTitle: {
    fontFamily: "BubbleGum",
    fontSize: 42,
    color: COLORS.speed.primary,
    marginBottom: 20,
  },
  resultScore: {
    fontFamily: "ComicNeue",
    fontSize: 32,
    color: COLORS.text.primary,
    marginBottom: 10,
  },
  highScoreText: {
    fontFamily: "ComicNeue",
    fontSize: 24,
    color: COLORS.text.secondary,
    marginBottom: 40,
  },
  startButton: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
  },
  startButtonText: {
    fontFamily: "BubbleGum",
    fontSize: 24,
    color: "white",
  },
});
