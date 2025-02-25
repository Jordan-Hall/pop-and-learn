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
import { loadSound, playSound } from "../utils/sounds";

// Grid configuration
const GRID_SIZE = 4; // 4x4 grid
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;

// Alphabet and number ranges
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

// Game modes
enum GameMode {
  ALPHABET = "alphabet",
  NUMBERS = "numbers",
}

export default function AbcGame() {
  const { incrementPops, incrementLettersLearned } = useGameContext();
  const [mode, setMode] = useState<GameMode>(GameMode.ALPHABET);
  const [currentTarget, setCurrentTarget] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bubbleContents, setBubbleContents] = useState<string[]>([]);
  const [popStates, setPopStates] = useState<boolean[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

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

  // Initialize the game
  const initializeGame = useCallback(
    (newMode?: GameMode) => {
      const gameMode = newMode || mode;
      const items = gameMode === GameMode.ALPHABET ? ALPHABET : NUMBERS;

      // Reset state
      setPopStates(Array(TOTAL_BUBBLES).fill(false));
      setShowCelebration(false);

      // Set target based on current index
      const targetIndex = currentIndex % items.length;
      const target = items[targetIndex];
      setCurrentTarget(target);

      // Generate bubble contents with multiple instances of the target
      const contents = [];
      const targetCount = 5; // Number of target bubbles

      // Add target bubbles
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

      // Shuffle contents
      const shuffled = contents.sort(() => Math.random() - 0.5);
      setBubbleContents(shuffled);

      // Announce the new target with TTS
      const isFirstTarget = currentIndex === 0 && !newMode;
      if (isFirstTarget) {
        // First time starting the game
        speakText(`Game started! Find the letter ${target}`);
      } else {
        // For subsequent targets
        const typeText = gameMode === GameMode.ALPHABET ? "letter" : "number";
        speakText(`Quick! Find the ${typeText} ${target}`);
      }
    },
    [mode, currentIndex, speakText],
  );

  // Initialize on first render
  useEffect(() => {
    loadSound("pop");
    loadSound("correct");
    loadSound("incorrect");
    loadSound("celebration");

    // Initialize Speech module
    Speech.getAvailableVoicesAsync().then(() => {
      console.log("Speech module initialized");
    });

    initializeGame();

    // Clean up speech when component unmounts
    return () => {
      Speech.stop();
    };
  }, [initializeGame]);

  // Switch mode
  const switchMode = useCallback(() => {
    const newMode =
      mode === GameMode.ALPHABET ? GameMode.NUMBERS : GameMode.ALPHABET;
    setMode(newMode);
    setCurrentIndex(0);

    // Announce mode change
    speakText(
      `Switching to ${newMode === GameMode.ALPHABET ? "alphabet" : "numbers"} mode`,
    );

    initializeGame(newMode);
  }, [mode, initializeGame, speakText]);

  // Handle bubble pop
  const handlePop = useCallback(
    (index: number, content: string) => {
      if (popStates[index]) return;

      // Play haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Update pop state
      setPopStates((prev) => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });

      // Check if correct content
      if (content === currentTarget) {
        // Correct!
        playSound("correct");
        incrementPops();

        // Check if all targets are found
        const newPopStates = [...popStates];
        newPopStates[index] = true;

        const remainingTargets = bubbleContents.filter(
          (item, idx) => item === currentTarget && !newPopStates[idx],
        );

        if (remainingTargets.length === 0) {
          // All targets found, advance to next letter/number
          playSound("celebration");
          setShowCelebration(true);
          incrementLettersLearned();
          setCompletedCount((prev) => prev + 1);

          // Announce success with TTS
          speakText(`Great job! You found all the ${currentTarget}s!`);

          // Move to next letter/number after celebration
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            initializeGame();
          }, 2000);
        } else {
          // Found a correct bubble but more remain
          const remaining = remainingTargets.length;
          if (remaining <= 3) {
            // Only announce remaining count for 3 or fewer remaining
            speakText(`Good! Find ${remaining} more`);
          }
        }
      } else {
        // Incorrect
        playSound("incorrect");

        // Optional: Provide TTS feedback for incorrect selection
        speakText(`That's ${content}, not ${currentTarget}. Try again!`);
      }
    },
    [
      popStates,
      currentTarget,
      bubbleContents,
      incrementPops,
      incrementLettersLearned,
      initializeGame,
      speakText,
    ],
  );

  return (
    <AnimatedBackground colors={[COLORS.abc.primary, COLORS.abc.secondary]}>
      <GameHeader
        title="ABC & 123"
        subtitle={
          mode === GameMode.ALPHABET
            ? "Learn your ABCs!"
            : "Count with numbers!"
        }
        colors={[COLORS.abc.primary, COLORS.abc.secondary]}
      />

      {/* Animal decoration */}
      <FloatingAnimal
        type="giraffe"
        position={{ top: 100, right: 20 }}
        size={90}
        color="rgba(91, 154, 230, 0.6)"
      />

      <View style={styles.container}>
        {/* Target display */}
        <LinearGradient
          colors={[COLORS.abc.primary, COLORS.abc.secondary]}
          style={styles.targetContainer}
        >
          <View style={styles.targetTextContainer}>
            <Text style={styles.findText}>Find</Text>
            <Text style={styles.targetText}>{currentTarget}</Text>
          </View>

          {/* Mode switch button */}
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

        {/* Progress display */}
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.5)"]}
            style={styles.progressCard}
          >
            <Text style={styles.progressTitle}>
              {mode === GameMode.ALPHABET ? "Letters" : "Numbers"} Learned
            </Text>
            <Text style={styles.progressText}>{completedCount}</Text>
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
  progressContainer: {
    width: "90%",
    maxWidth: 500,
    marginVertical: 20,
  },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  progressTitle: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: COLORS.text.primary,
  },
  progressText: {
    fontFamily: "BubbleGum",
    fontSize: 36,
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
