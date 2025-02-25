import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useState, useEffect, useCallback, useRef } from "react";
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
const GRID_SIZE = 3; // 3x3 grid
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
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(
    null,
  );
  const [bubbleAnswers, setBubbleAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextProblemTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Function to speak the math problem
  const speakMathProblem = useCallback(
    async (problem: MathProblem, isGameStart = false) => {
      // Check if we're already speaking
      if (isSpeakingRef.current) {
        await Speech.stop();
      }

      const symbol = problem.type === ProblemType.ADDITION ? "plus" : "minus";
      const prefix = isGameStart ? "Game started. Target " : "Quick now. Pop ";
      const speech = `${prefix}${problem.num1} ${symbol} ${problem.num2}`;

      isSpeakingRef.current = true;

      Speech.speak(speech, {
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

  // Function to speak the answer
  const speakAnswer = useCallback(
    async (problem: MathProblem, wasCorrect = false) => {
      // Stop any ongoing speech
      if (isSpeakingRef.current) {
        await Speech.stop();
      }

      const symbol = problem.type === ProblemType.ADDITION ? "plus" : "minus";
      let speech;

      if (wasCorrect) {
        speech = `That's correct! The answer was ${problem.answer}.`;
      } else {
        speech = `The answer is ${problem.answer}. ${problem.num1} ${symbol} ${problem.num2} equals ${problem.answer}`;
      }

      isSpeakingRef.current = true;

      Speech.speak(speech, {
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

  // Generate a new math problem
  const generateProblem = useCallback(() => {
    const maxNum = difficulty === Difficulty.EASY ? 5 : 10;
    const problemType =
      Math.random() > 0.5 ? ProblemType.ADDITION : ProblemType.SUBTRACTION;

    let num1: number, num2: number, answer: number;

    if (problemType === ProblemType.ADDITION) {
      // Addition problem
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
      answer = num1 + num2;
    } else {
      // Subtraction problem: ensure num1 > num2 for positive answer
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      answer = num1 - num2;
    }

    const problem: MathProblem = {
      num1,
      num2,
      type: problemType,
      answer,
    };

    setCurrentProblem(problem);
    return problem;
  }, [difficulty]);

  // Generate bubble answers (correct + distractors)
  const generateBubbleAnswers = useCallback(
    (problem: MathProblem) => {
      const answers = [problem.answer];
      const maxNum = difficulty === Difficulty.EASY ? 10 : 20;

      // Generate unique distractor answers
      while (answers.length < TOTAL_BUBBLES) {
        const distractor = Math.floor(Math.random() * maxNum) + 1;
        if (!answers.includes(distractor)) {
          answers.push(distractor);
        }
      }

      // Shuffle answers
      const shuffled = answers.sort(() => Math.random() - 0.5);
      setBubbleAnswers(shuffled);
    },
    [difficulty],
  );

  // Clean up timers and speech
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

  // Initialize the game
  const initializeGame = useCallback(() => {
    // Clean up any existing timers and speech
    cleanUp();

    // Generate a new problem and answers
    const problem = generateProblem();
    generateBubbleAnswers(problem);
    setShowResult(false);

    // Speak the problem with "game started" for first problem, otherwise "quick now"
    const isFirstProblem = score === 0;

    // Small delay before speaking to avoid overlap
    setTimeout(() => {
      speakMathProblem(problem, isFirstProblem);
    }, 300);

    // Set timer to speak the answer after 20 seconds if not answered
    timerRef.current = setTimeout(() => {
      if (!showResult) {
        speakAnswer(problem);
      }
    }, 20000);
  }, [
    generateProblem,
    generateBubbleAnswers,
    speakMathProblem,
    speakAnswer,
    score,
    showResult,
    cleanUp,
  ]);

  // Initialize on first render
  useEffect(() => {
    loadSound("pop");
    loadSound("correct");
    loadSound("incorrect");

    initializeGame();

    // Cleanup function to stop speech and clear timers when component unmounts
    return () => {
      cleanUp();
    };
  }, [initializeGame, cleanUp]);

  // Handle bubble pop
  const handleAnswerSelect = useCallback(
    (answer: number) => {
      if (!currentProblem || showResult) return;

      // Clean up timers and speech
      cleanUp();

      // Play haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Check if answer is correct
      const correct = answer === currentProblem.answer;
      setIsCorrect(correct);

      if (correct) {
        // Correct answer
        playSound("correct");
        setScore((prev) => prev + 10);
        incrementMathProblems();

        // Speak confirmation for correct answer
        setTimeout(() => {
          speakAnswer(currentProblem, true);
        }, 500);
      } else {
        // Incorrect answer
        playSound("incorrect");
        setScore((prev) => Math.max(0, prev - 5));

        // Speak the correct answer when user gets it wrong
        setTimeout(() => {
          speakAnswer(currentProblem, false);
        }, 500);
      }

      incrementPops();
      setShowResult(true);

      // Move to next problem after delay - wait longer to allow speech to complete
      nextProblemTimerRef.current = setTimeout(() => {
        initializeGame();
      }, 3000);
    },
    [
      currentProblem,
      showResult,
      incrementPops,
      incrementMathProblems,
      initializeGame,
      speakAnswer,
      cleanUp,
    ],
  );

  // Toggle difficulty
  const toggleDifficulty = useCallback(() => {
    const newDifficulty =
      difficulty === Difficulty.EASY ? Difficulty.HARD : Difficulty.EASY;
    setDifficulty(newDifficulty);

    // Clean up before initializing new game
    cleanUp();

    setTimeout(() => {
      initializeGame();
    }, 100);
  }, [difficulty, initializeGame, cleanUp]);

  // Format problem as text
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

      {/* Animal decoration */}
      <FloatingAnimal
        type="cat"
        position={{ top: 100, left: 20 }}
        size={70}
        color="rgba(157, 127, 230, 0.6)"
      />

      <View style={styles.container}>
        {/* Problem display */}
        <LinearGradient
          colors={[COLORS.math.primary, COLORS.math.secondary]}
          style={styles.problemContainer}
        >
          <Text style={styles.problemText}>{getProblemText()}</Text>

          {/* Difficulty toggle */}
          <Pressable onPress={toggleDifficulty} style={styles.difficultyButton}>
            <Text style={styles.difficultyButtonText}>
              {difficulty === Difficulty.EASY ? "Easy" : "Hard"}
            </Text>
          </Pressable>
        </LinearGradient>

        {/* Answers grid */}
        <View style={styles.gridContainer}>
          <View style={[styles.grid, { width: GRID_SIZE * 90 }]}>
            {bubbleAnswers.map((answer, index) => (
              <PopBubble
                key={`answer-${index}`}
                id={`${index}`}
                isPopped={showResult && answer === currentProblem?.answer}
                onPop={() => handleAnswerSelect(answer)}
                colors={[COLORS.math.primary, COLORS.math.secondary]}
                size={75}
                content={<Text style={styles.answerText}>{answer}</Text>}
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

        {/* Result overlay */}
        {showResult && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[
              styles.resultOverlay,
              {
                backgroundColor: isCorrect
                  ? "rgba(144, 238, 144, 0.8)"
                  : "rgba(255, 192, 203, 0.8)",
              },
            ]}
          >
            <Text style={styles.resultText}>
              {isCorrect ? "Correct!" : "Try Again!"}
            </Text>
            {!isCorrect && currentProblem && (
              <Text style={styles.correctAnswerText}>
                The answer is {currentProblem.answer}
              </Text>
            )}
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
    justifyContent: "center",
    alignItems: "center",
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
  correctAnswerText: {
    fontFamily: "ComicNeue",
    fontSize: 28,
    color: "white",
    marginTop: 20,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});
