import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import PopBubble from "../components/PopBubble";
import { useGameContext } from "../contexts/GameContext";
import { COLORS } from "../utils/colors";
import { loadSound } from "../utils/sounds";

import { useSound } from "@/hooks/useSound";
import { useSpeech } from "@/hooks/useSpeech";

// Grid configuration: 4x4 grid
const GRID_SIZE = 4;
const TOTAL_BUBBLES = GRID_SIZE * GRID_SIZE;

// Difficulty levels
enum Difficulty {
  EASY = "easy",
  HARD = "hard",
}

// Problem types
enum ProblemType {
  ADDITION = "addition",
  SUBTRACTION = "subtraction",
}

type MathProblem = {
  num1: number;
  num2: number;
  type: ProblemType;
  answer: number;
};

export default function MathGame() {
  const { incrementPops, incrementMathProblems } = useGameContext();
  const { play } = useSound();
  const { speakText } = useSpeech();

  const [difficulty, setDifficulty] = useState(Difficulty.EASY);
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(
    null,
  );
  const [bubbleAnswers, setBubbleAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  // --- Elapsed time state ---
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTime = useRef(Date.now());
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);
  // --- End elapsed time state ---

  // Collapsible metrics display state
  const [metricsExpanded, setMetricsExpanded] = useState(true);

  // --- NEW: Pop state array for the bubbles ---
  const [popStates, setPopStates] = useState<boolean[]>(
    new Array(TOTAL_BUBBLES).fill(false),
  );

  // Refs for timers and speech
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextProblemTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Function to speak the math problem.
  const speakMathProblem = useCallback(
    async (problem: MathProblem, isGameStart = false) => {
      if (isSpeakingRef.current) {
        await Speech.stop();
      }
      const symbol = problem.type === ProblemType.ADDITION ? "plus" : "minus";
      const prefix = isGameStart ? "Game started. Target " : "Quick now. Pop ";
      const speech = `${prefix}${problem.num1} ${symbol} ${problem.num2}`;
      isSpeakingRef.current = true;
      speakText(speech, {
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
    [],
  );

  // Function to speak the answer.
  const speakAnswer = useCallback(
    async (problem: MathProblem, wasCorrect = false) => {
      if (isSpeakingRef.current) {
        await Speech.stop();
      }
      const symbol = problem.type === ProblemType.ADDITION ? "plus" : "minus";
      const speech = wasCorrect
        ? `That's correct! The answer was ${problem.answer}.`
        : `The answer is ${problem.num1} ${symbol} ${problem.num2} equals ${problem.answer}`;
      isSpeakingRef.current = true;
      speakText(speech, {
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
    [],
  );

  // Generate a new math problem.
  const generateProblem = useCallback(() => {
    const maxNum = difficulty === Difficulty.EASY ? 5 : 10;
    const problemType =
      Math.random() > 0.5 ? ProblemType.ADDITION : ProblemType.SUBTRACTION;
    let num1: number, num2: number, answer: number;
    if (problemType === ProblemType.ADDITION) {
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
      answer = num1 + num2;
    } else {
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
    }
    const problem: MathProblem = { num1, num2, type: problemType, answer };
    setCurrentProblem(problem);
    return problem;
  }, [difficulty]);

  // Generate bubble answers: correct answer plus distractors.
  const generateBubbleAnswers = useCallback(
    (problem: MathProblem) => {
      const answers = [problem.answer];
      const maxNum = difficulty === Difficulty.EASY ? 10 : 20;
      // Generate unique distractor answers.
      while (answers.length < TOTAL_BUBBLES) {
        const distractor = Math.floor(Math.random() * maxNum) + 1;
        if (!answers.includes(distractor)) {
          answers.push(distractor);
        }
      }
      const shuffled = answers.sort(() => Math.random() - 0.5);
      setBubbleAnswers(shuffled);
    },
    [difficulty],
  );

  // Clean up timers and speech.
  const cleanUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (nextProblemTimerRef.current) {
      clearTimeout(nextProblemTimerRef.current);
      nextProblemTimerRef.current = null;
    }
    Speech.stop();
    isSpeakingRef.current = false;
  }, []);

  // Initialize the game: generate problem, answers, reset popStates.
  const initializeGame = useCallback(() => {
    cleanUp();
    // Reset popStates for the new problem.
    setPopStates(new Array(TOTAL_BUBBLES).fill(false));
    const problem = generateProblem();
    generateBubbleAnswers(problem);
    setShowResult(false);
    const isFirstProblem = score === 0;
    setTimeout(() => {
      speakMathProblem(problem, isFirstProblem);
    }, 300);
    // After 20 seconds, speak the answer if no correct selection is made.
    timerRef.current = setTimeout(() => {
      if (!showResult) {
        speakAnswer(problem);
      }
    }, 20000);
  }, [
    cleanUp,
    generateProblem,
    generateBubbleAnswers,
    score,
    showResult,
    speakMathProblem,
    speakAnswer,
  ]);

  // Initial mount: load sounds and initialize game.
  useEffect(() => {
    loadSound("pop");
    loadSound("correct");
    loadSound("incorrect");
    initializeGame();
    return () => {
      cleanUp();
    };
  }, [initializeGame, cleanUp]);

  // Handle answer selection.
  // For a wrong answer, we briefly mark a bubble as pressed and then reset that
  // bubble's state. For the correct answer, we show a result overlay, reset all bubbles,
  // and load a new problem.
  const handleAnswerSelect = useCallback(
    (index: number, answer: number) => {
      if (!currentProblem || showResult) return;
      // If this bubble is already pressed, do nothing.
      if (popStates[index]) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Mark the tapped bubble as pressed.
      setPopStates((prev) => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });

      if (answer === currentProblem.answer) {
        play("correct");
        setScore((prev) => prev + 10);
        incrementMathProblems();
        setTimeout(() => {
          speakAnswer(currentProblem, true);
        }, 500);
        setIsCorrect(true);
        setShowResult(true);
        nextProblemTimerRef.current = setTimeout(() => {
          // Reset all bubbles state before starting the next round.
          setPopStates(new Array(TOTAL_BUBBLES).fill(false));
          initializeGame();
        }, 3000);
      } else {
        play("incorrect");
        setScore((prev) => Math.max(0, prev - 5));
        speakAnswer(currentProblem, false);
        // For a wrong answer, reset only the pressed bubble after a short delay.
        setTimeout(() => {
          setPopStates((prev) => {
            const newStates = [...prev];
            newStates[index] = false;
            return newStates;
          });
        }, 300);
      }
      incrementPops();
    },
    [
      currentProblem,
      showResult,
      popStates,
      incrementPops,
      incrementMathProblems,
      initializeGame,
      speakAnswer,
    ],
  );

  // Toggle difficulty (reset round with new difficulty).
  const toggleDifficulty = useCallback(() => {
    const newDifficulty =
      difficulty === Difficulty.EASY ? Difficulty.HARD : Difficulty.EASY;
    setDifficulty(newDifficulty);
    cleanUp();
    setTimeout(() => {
      initializeGame();
    }, 100);
  }, [difficulty, initializeGame, cleanUp]);

  // Format problem text for display.
  const getProblemText = useCallback(() => {
    if (!currentProblem) return "";
    const symbol = currentProblem.type === ProblemType.ADDITION ? "+" : "-";
    return `${currentProblem.num1} ${symbol} ${currentProblem.num2} = ?`;
  }, [currentProblem]);

  return (
    <AnimatedBackground colors={COLORS.math.background}>
      <GameHeader
        title="Math Fun"
        subtitle="Solve fun math problems!"
        colors={[COLORS.math.primary, COLORS.math.secondary]}
      />

      <FloatingAnimal
        type="cat"
        position={{ top: 100, left: 20 }}
        size={70}
        color="rgba(157, 127, 230, 0.6)"
      />

      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.math.primary, COLORS.math.secondary]}
          style={styles.problemContainer}
        >
          <Text style={styles.problemText}>{getProblemText()}</Text>
          <Pressable onPress={toggleDifficulty} style={styles.difficultyButton}>
            <Text style={styles.difficultyButtonText}>
              {difficulty === Difficulty.EASY ? "Easy" : "Hard"}
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Responsive Bubble Grid */}
        <View style={styles.gridContainer}>
          <View style={[styles.grid, { width: GRID_SIZE * 85 }]}>
            {bubbleAnswers.map((answer, index) => (
              <PopBubble
                key={`answer-${index}`}
                id={`${index}`}
                isPopped={popStates[index]}
                onPop={() => handleAnswerSelect(index, answer)}
                colors={[COLORS.math.primary, COLORS.math.secondary]}
                size={65}
                content={<Text style={styles.answerText}>{answer}</Text>}
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
              <Text style={styles.metricTitle}>Time</Text>
              <Text style={styles.metricValue}>
                {Math.floor(elapsedTime / 60)}:
                {("0" + (elapsedTime % 60)).slice(-2)}
              </Text>
            </View>
          </View>
        )}

        {/* Correct answer overlay (static, no flashing) */}
        {showResult && isCorrect && (
          <View
            style={[
              styles.resultOverlay,
              { backgroundColor: "rgba(144, 238, 144, 0.8)" },
            ]}
          >
            <Text style={styles.resultText}>Correct!</Text>
          </View>
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
  problemContainer: {
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
  problemText: {
    fontFamily: "BubbleGum",
    fontSize: 36,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  difficultyButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  difficultyButtonText: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
  },
  gridContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  answerText: {
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
    color: COLORS.math.primary,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  resultText: {
    fontFamily: "BubbleGum",
    fontSize: 48,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
});
