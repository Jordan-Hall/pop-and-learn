import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, AppState } from "react-native";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import PopBubble from "../components/PopBubble";
import { useGameContext } from "../contexts/GameContext";
import { COLORS } from "../utils/colors";

import { useSound } from "@/hooks/useSound";
import { useSpeech } from "@/hooks/useSpeech";
import { loadSound } from "@/utils/sounds";

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
  const [isLoading, setIsLoading] = useState(true);

  // --- Elapsed time state ---
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTime = useRef(Date.now());

  // Collapsible metrics display state
  const [metricsExpanded, setMetricsExpanded] = useState(true);

  // --- Pop state array for the bubbles ---
  const [popStates, setPopStates] = useState<boolean[]>(
    new Array(TOTAL_BUBBLES).fill(false),
  );

  // Refs for timers and speech
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const appState = useRef(AppState.currentState);
  const isComponentMounted = useRef(true);

  // App state monitoring
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        cleanUp();
      } else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        if (isComponentMounted.current) {
          // Adjust startTime based on elapsedTime when resuming
          startTime.current = Date.now() - elapsedTime * 1000;
          initializeGame();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [elapsedTime]);

  // Elapsed time tracking
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, []);

  // Component lifecycle
  useEffect(() => {
    isComponentMounted.current = true;

    return () => {
      isComponentMounted.current = false;
      cleanUp();
    };
  }, []);

  // Function to speak the math problem
  const speakMathProblem = useCallback(
    async (problem: MathProblem, isGameStart = false) => {
      if (!isComponentMounted.current) return;

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
    [speakText],
  );

  // Function to speak only when correct answer is found.
  // Now accepts an optional onComplete callback to run after speech finishes.
  const speakCorrectAnswer = useCallback(
    async (problem: MathProblem, onComplete?: () => void) => {
      if (!isComponentMounted.current) return;

      if (isSpeakingRef.current) {
        await Speech.stop();
      }

      const speech = `That's correct! The answer was ${problem.answer}.`;

      isSpeakingRef.current = true;
      speakText(speech, {
        rate: 0.9,
        pitch: 1.0,
        onDone: () => {
          isSpeakingRef.current = false;
          if (onComplete) {
            onComplete();
          }
        },
        onStopped: () => {
          isSpeakingRef.current = false;
        },
      });
    },
    [speakText],
  );

  // Function to speak hint for wrong answers
  const speakHint = useCallback(() => {
    if (!isComponentMounted.current || !currentProblem) return;

    const hint = "Try again!";

    speakText(hint, {
      rate: 0.9,
      pitch: 1.0,
    });
  }, [speakText, currentProblem]);

  // Generate a new math problem
  const generateProblem = useCallback(() => {
    if (!isComponentMounted.current) return null;

    try {
      const maxNum = difficulty === Difficulty.EASY ? 5 : 10;
      const problemType =
        Math.random() > 0.5 ? ProblemType.ADDITION : ProblemType.SUBTRACTION;

      let num1, num2, answer;

      if (problemType === ProblemType.ADDITION) {
        num1 = Math.floor(Math.random() * maxNum) + 1;
        num2 = Math.floor(Math.random() * maxNum) + 1;
        answer = num1 + num2;
      } else {
        num1 = Math.floor(Math.random() * maxNum) + 1;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
      }

      const problem = { num1, num2, type: problemType, answer };
      setCurrentProblem(problem);
      return problem;
    } catch (error) {
      console.error("Error generating problem:", error);
      return null;
    }
  }, [difficulty]);

  // Generate bubble answers
  const generateBubbleAnswers = useCallback(
    (problem: MathProblem) => {
      if (!problem || !isComponentMounted.current) return;

      try {
        const answers = [problem.answer];
        const maxNum = difficulty === Difficulty.EASY ? 10 : 20;

        // Use a Set to ensure unique values
        const answerSet = new Set(answers);

        // Avoid infinite loop with a safety counter
        let safetyCounter = 0;
        const maxAttempts = 100;

        while (answerSet.size < TOTAL_BUBBLES && safetyCounter < maxAttempts) {
          const distractor = Math.floor(Math.random() * maxNum) + 1;
          answerSet.add(distractor);
          safetyCounter++;
        }

        // Convert Set back to array and shuffle
        const shuffled = Array.from(answerSet)
          .slice(0, TOTAL_BUBBLES)
          .sort(() => Math.random() - 0.5);

        setBubbleAnswers(shuffled);
      } catch (error) {
        console.error("Error generating bubble answers:", error);
        setBubbleAnswers(Array(TOTAL_BUBBLES).fill(0));
      }
    },
    [difficulty],
  );

  // Clean up timers and speech
  const cleanUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      Speech.stop();
    } catch (error) {
      console.error("Error stopping speech during cleanup:", error);
    }

    isSpeakingRef.current = false;
  }, []);

  // Format problem text for display
  const getProblemText = useCallback(() => {
    if (!currentProblem) return "";
    const symbol = currentProblem.type === ProblemType.ADDITION ? "+" : "-";
    return `${currentProblem.num1} ${symbol} ${currentProblem.num2} = ?`;
  }, [currentProblem]);

  // Initialize the game
  const initializeGame = useCallback(() => {
    if (!isComponentMounted.current) return;

    cleanUp();
    setPopStates(new Array(TOTAL_BUBBLES).fill(false));

    try {
      const problem = generateProblem();
      if (problem) {
        generateBubbleAnswers(problem);

        setTimeout(() => {
          if (isComponentMounted.current) {
            const isFirstProblem = score === 0;
            speakMathProblem(problem, isFirstProblem);

            // Set a timeout to provide a hint if no correct selection is made
            timerRef.current = setTimeout(() => {
              if (isComponentMounted.current) {
                speakText(
                  "Remember, we're trying to solve " + getProblemText(),
                );
              }
            }, 20000);
          }
        }, 300);
      }
    } catch (error) {
      console.error("Error initializing game:", error);
    }
  }, [
    cleanUp,
    generateProblem,
    generateBubbleAnswers,
    score,
    speakMathProblem,
    speakText,
    getProblemText,
  ]);

  useEffect(() => {
    const loadResources = async () => {
      try {
        await Promise.all([
          loadSound("pop"),
          loadSound("correct"),
          loadSound("incorrect"),
        ]);
        setIsLoading(false);
        // Use setTimeout to ensure state is fully updated before initializing
        setTimeout(() => {
          if (isComponentMounted.current) {
            initializeGame();
          }
        }, 100);
      } catch (error) {
        console.error("Error loading resources:", error);
        setIsLoading(false);
      }
    };

    loadResources();

    return () => {
      cleanUp();
    };
  }, []);

  // Handle answer selection
  const handleAnswerSelect = useCallback(
    (index: number, answer: number) => {
      if (!currentProblem || !isComponentMounted.current) return;

      // If this bubble is already pressed, do nothing
      if (popStates[index]) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Mark the tapped bubble as pressed
      setPopStates((prev) => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });

      if (answer === currentProblem.answer) {
        // Correct answer: update score and increment counters
        play("correct");
        setScore((prev) => prev + 10);
        incrementMathProblems();

        // Speak correct feedback and only move on when speech finishes
        speakCorrectAnswer(currentProblem, () => {
          if (isComponentMounted.current) {
            initializeGame();
          }
        });
      } else {
        // Wrong answer: play incorrect sound and give a hint
        play("incorrect");
        setScore((prev) => Math.max(0, prev - 5));
        speakHint();
      }

      incrementPops();
    },
    [
      currentProblem,
      popStates,
      play,
      incrementPops,
      incrementMathProblems,
      speakCorrectAnswer,
      initializeGame,
      speakHint,
    ],
  );

  // Toggle difficulty
  const toggleDifficulty = useCallback(() => {
    const newDifficulty =
      difficulty === Difficulty.EASY ? Difficulty.HARD : Difficulty.EASY;
    setDifficulty(newDifficulty);
    cleanUp();

    setTimeout(() => {
      if (isComponentMounted.current) {
        initializeGame();
      }
    }, 100);
  }, [difficulty, initializeGame, cleanUp]);

  if (isLoading) {
    return (
      <AnimatedBackground colors={COLORS.math.background}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </AnimatedBackground>
    );
  }

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "ComicNeue",
    fontSize: 24,
    color: COLORS.text.primary,
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
    padding: 8,
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
});
