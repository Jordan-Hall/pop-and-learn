import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import PopBubble from "../components/PopBubble";
import { useGameContext } from "../contexts/GameContext";
import { COLORS } from "../utils/colors";
import { loadSound } from "../utils/sounds";

import { useSound } from "@/hooks/useSound";
import { useSpeech } from "@/hooks/useSpeech";

// Grid configuration
const GRID_SIZE = 4; // 4x4 grid
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

enum GameMode {
  ALPHABET = "alphabet",
  NUMBERS = "numbers",
}

export default function AbcGame() {
  const { incrementPops, incrementLettersLearned } = useGameContext();
  const { speakText } = useSpeech();
  const [mode, setMode] = useState<GameMode>(GameMode.ALPHABET);
  const [currentTarget, setCurrentTarget] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bubbleContents, setBubbleContents] = useState<string[]>([]);
  const [popStates, setPopStates] = useState<boolean[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  // State to track total time played (in seconds)
  const [totalTimePlayed, setTotalTimePlayed] = useState(0);
  // State for collapsing/expanding the metrics display
  const [metricsExpanded, setMetricsExpanded] = useState(true);

  const { play } = useSound();

  // Helper function to format seconds as MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Increase total time played every second after component mounts.
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalTimePlayed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Function to speak text using TTS
  const speakTextCB = useCallback((text: string) => {
    speakText(text, {
      language: "en-US",
      pitch: 1.2,
      rate: 0.9,
    });
  }, []);

  // Initialize the game round
  const initializeGame = useCallback(
    (newMode?: GameMode) => {
      const gameMode = newMode || mode;
      const items = gameMode === GameMode.ALPHABET ? ALPHABET : NUMBERS;

      // Reset state for the current round
      setPopStates(Array(TOTAL_BUBBLES).fill(false));
      setShowCelebration(false);

      // Set target based on the current index
      const targetIndex = currentIndex % items.length;
      const target = items[targetIndex];
      setCurrentTarget(target);

      // Generate bubble contents with several instances of the target
      const contents: string[] = [];
      const targetCount = 5; // Number of target bubbles

      for (let i = 0; i < targetCount; i++) {
        contents.push(target);
      }

      // Fill remaining spots with other letters/numbers
      const remainingSpots = TOTAL_BUBBLES - targetCount;
      const otherItems = items.filter((item) => item !== target);
      for (let i = 0; i < remainingSpots; i++) {
        const randomIndex = Math.floor(Math.random() * otherItems.length);
        contents.push(otherItems[randomIndex]);
      }

      // Shuffle the contents
      const shuffled = contents.sort(() => Math.random() - 0.5);
      setBubbleContents(shuffled);

      // Announce the new target using TTS
      const isFirstTarget = currentIndex === 0 && !newMode;
      if (isFirstTarget) {
        speakTextCB(`Game started! Find the letter ${target}`);
      } else {
        const typeText = gameMode === GameMode.ALPHABET ? "letter" : "number";
        speakTextCB(`Quick! Find the ${typeText} ${target}`);
      }
    },
    [mode, currentIndex, speakTextCB],
  );

  // Initial setup: load sounds and initialize speech
  useEffect(() => {
    loadSound("pop");
    loadSound("correct");
    loadSound("incorrect");
    loadSound("celebration");

    Speech.getAvailableVoicesAsync().then(() => {
      console.log("Speech module initialized");
    });

    initializeGame();
    return () => {
      Speech.stop();
    };
  }, [initializeGame]);

  // Switch game mode
  const switchMode = useCallback(() => {
    const newMode =
      mode === GameMode.ALPHABET ? GameMode.NUMBERS : GameMode.ALPHABET;
    setMode(newMode);
    setCurrentIndex(0);
    speakTextCB(
      `Switching to ${newMode === GameMode.ALPHABET ? "alphabet" : "numbers"} mode`,
    );
    initializeGame(newMode);
  }, [mode, initializeGame, speakTextCB]);

  // Handle bubble pop event
  const handlePop = useCallback(
    (index: number, content: string) => {
      if (popStates[index]) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Mark the bubble as popped
      setPopStates((prev) => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });

      // Check if the popped bubble is the target letter/number
      if (content === currentTarget) {
        play("correct");
        incrementPops();

        const newPopStates = [...popStates];
        newPopStates[index] = true;

        const remainingTargets = bubbleContents.filter(
          (item, idx) => item === currentTarget && !newPopStates[idx],
        );

        if (remainingTargets.length === 0) {
          play("celebration");
          setShowCelebration(true);
          incrementLettersLearned();
          setCompletedCount((prev) => prev + 1);
          speakTextCB(`Great job! You found all the ${currentTarget}s!`);

          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            initializeGame();
          }, 2000);
        } else {
          const remaining = remainingTargets.length;
          if (remaining <= 3) {
            speakTextCB(`Good! Find ${remaining} more`);
          }
        }
      } else {
        play("incorrect");
        speakTextCB(`That's ${content}, not ${currentTarget}. Try again!`);
      }
    },
    [
      popStates,
      currentTarget,
      bubbleContents,
      incrementPops,
      incrementLettersLearned,
      initializeGame,
      speakTextCB,
    ],
  );

  return (
    <AnimatedBackground colors={[COLORS.abc.primary, COLORS.abc.secondary]}>
      {/* Wrap the header in a View to push it down */}
      <GameHeader
        title="ABC & 123"
        subtitle={
          mode === GameMode.ALPHABET
            ? "Learn your ABCs!"
            : "Count with numbers!"
        }
        colors={[COLORS.abc.primary, COLORS.abc.secondary]}
      />

      <FloatingAnimal
        type="giraffe"
        position={{ top: 100, right: 20 }}
        size={90}
        color="rgba(91, 154, 230, 0.6)"
      />

      <View style={styles.container}>
        {/* Target display and mode toggle */}
        <LinearGradient
          colors={[COLORS.abc.primary, COLORS.abc.secondary]}
          style={styles.targetContainer}
        >
          <View style={styles.targetTextContainer}>
            <Text style={styles.findText}>Find</Text>
            <Text style={styles.targetText}>{currentTarget}</Text>
          </View>
          <Pressable onPress={switchMode} style={styles.modeButton}>
            <Text style={styles.modeButtonText}>
              {mode === GameMode.ALPHABET ? "123" : "ABC"}
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Bubble grid */}
        <View style={styles.gridContainer}>
          <View style={[styles.grid, { width: GRID_SIZE * 85 }]}>
            {bubbleContents.map((content, index) => (
              <PopBubble
                key={`${mode}-${currentIndex}-${index}`}
                id={`${index}`}
                isPopped={popStates[index]}
                onPop={() => handlePop(index, content)}
                colors={[COLORS.abc.primary, COLORS.abc.secondary]}
                size={65}
                content={<Text style={styles.bubbleContent}>{content}</Text>}
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
              <Text style={styles.metricTitle}>
                {mode === GameMode.ALPHABET ? "Letters" : "Numbers"} Learned
              </Text>
              <Text style={styles.metricValue}>{completedCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricTitle}>Time Played</Text>
              <Text style={styles.metricValue}>
                {formatTime(totalTimePlayed)}
              </Text>
            </View>
          </View>
        )}

        {/* Celebration overlay */}
        {showCelebration && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.celebrationOverlay}
          >
            <Text style={styles.celebrationText}>Great Job!</Text>
            <Text style={styles.celebrationLetter}>{currentTarget}</Text>
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
  targetTextContainer: {
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
    fontSize: 42,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modeButtonText: {
    fontFamily: "ComicNeue",
    fontSize: 18,
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
  bubbleContent: {
    fontFamily: "BubbleGum",
    fontSize: 28,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
    minWidth: 150,
    alignItems: "center",
    marginHorizontal: 10,
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
    color: COLORS.abc.primary,
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
    fontSize: 42,
    color: COLORS.abc.primary,
    marginBottom: 20,
  },
  celebrationLetter: {
    fontFamily: "BubbleGum",
    fontSize: 80,
    color: COLORS.abc.primary,
  },
});
