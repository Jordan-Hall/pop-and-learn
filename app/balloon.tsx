import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AppState,
  Dimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import AnimatedBackground from "../components/AnimatedBackground";
import FloatingAnimal from "../components/FloatingAnimal";
import GameHeader from "../components/GameHeader";
import { useGameContext } from "../contexts/GameContext";

import { useSound } from "@/hooks/useSound";
import { useSpeech } from "@/hooks/useSpeech";
import { loadSound } from "@/utils/sounds";

// Shape types
enum ShapeType {
  CIRCLE = "circle",
  SQUARE = "square",
  TRIANGLE = "triangle",
  STAR = "star",
}

// Shape object structure
type BalloonShape = {
  id: string;
  type: ShapeType;
  color: string;
  x: number;
  size: number;
  speed: number;
  popped: boolean;
  yStart: number;
  floatDelay: number;
};

// Game difficulty settings
enum Difficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

const isOverlapping = (
  candidateX: number,
  candidateSize: number,
  balloons: BalloonShape[],
): boolean => {
  const candidateCenter = candidateX + candidateSize / 2;
  return balloons.some((b) => {
    const bCenter = b.x + b.size / 2;
    // Calculate the minimum distance between centers to avoid overlap.
    const minDistance = (candidateSize + b.size) / 2 + 10;
    return Math.abs(candidateCenter - bCenter) < minDistance;
  });
};

// Screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Render balloon shape based on type
const renderBalloonShape = (type: ShapeType, color: string, size: number) => {
  const baseSize = size * 0.8;

  switch (type) {
    case ShapeType.CIRCLE:
      return (
        <View
          style={[
            styles.balloon,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        >
          <View style={styles.balloonHighlight} />
          <View style={styles.balloonString} />
        </View>
      );
    case ShapeType.SQUARE:
      return (
        <View
          style={[
            styles.balloon,
            {
              width: baseSize,
              height: baseSize,
              borderRadius: baseSize / 10,
              backgroundColor: color,
            },
          ]}
        >
          <View
            style={[styles.balloonHighlight, { borderRadius: baseSize / 10 }]}
          />
          <View style={styles.balloonString} />
        </View>
      );
    case ShapeType.TRIANGLE:
      return (
        <View style={{ width: baseSize, height: baseSize }}>
          <View
            style={[
              styles.triangleBalloon,
              {
                borderBottomColor: color,
                borderLeftWidth: baseSize / 2,
                borderRightWidth: baseSize / 2,
                borderBottomWidth: baseSize,
              },
            ]}
          >
            <View style={styles.balloonHighlight} />
          </View>
          <View style={[styles.balloonString, { marginTop: -5 }]} />
        </View>
      );
    case ShapeType.STAR:
      return (
        <View
          style={{ width: baseSize, height: baseSize, alignItems: "center" }}
        >
          <View
            style={[
              styles.starContainer,
              { width: baseSize, height: baseSize },
            ]}
          >
            <View
              style={[
                styles.starPoint,
                {
                  borderBottomColor: color,
                  borderLeftWidth: baseSize / 2,
                  borderRightWidth: baseSize / 2,
                  borderBottomWidth: baseSize / 2,
                },
              ]}
            />
            <View
              style={[
                styles.starPoint,
                {
                  borderBottomColor: color,
                  borderLeftWidth: baseSize / 2,
                  borderRightWidth: baseSize / 2,
                  borderBottomWidth: baseSize / 2,
                  transform: [{ rotate: "72deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.starPoint,
                {
                  borderBottomColor: color,
                  borderLeftWidth: baseSize / 2,
                  borderRightWidth: baseSize / 2,
                  borderBottomWidth: baseSize / 2,
                  transform: [{ rotate: "144deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.starPoint,
                {
                  borderBottomColor: color,
                  borderLeftWidth: baseSize / 2,
                  borderRightWidth: baseSize / 2,
                  borderBottomWidth: baseSize / 2,
                  transform: [{ rotate: "216deg" }],
                },
              ]}
            />
            <View
              style={[
                styles.starPoint,
                {
                  borderBottomColor: color,
                  borderLeftWidth: baseSize / 2,
                  borderRightWidth: baseSize / 2,
                  borderBottomWidth: baseSize / 2,
                  transform: [{ rotate: "288deg" }],
                },
              ]}
            />
          </View>
          <View style={styles.balloonString} />
        </View>
      );
    default:
      return (
        <View
          style={[
            styles.balloon,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        >
          <View style={styles.balloonHighlight} />
          <View style={styles.balloonString} />
        </View>
      );
  }
};

// Balloon Item Component
const BalloonItem = React.memo(
  ({
    id,
    type,
    color,
    x,
    size,
    speed,
    popped,
    yStart,
    floatDelay,
    onPress,
    onOffScreen,
  }: {
    id: string;
    type: ShapeType;
    color: string;
    x: number;
    size: number;
    speed: number;
    popped: boolean;
    yStart: number;
    floatDelay: number;
    onPress: () => void;
    onOffScreen: (id: string) => void;
  }) => {
    const yPosition = useSharedValue(yStart);

    useEffect(() => {
      if (popped) return;

      // Reset initial position
      yPosition.value = yStart;

      const timer = setTimeout(() => {
        // Set the target Y far above the screen so the balloon fully floats off
        const targetY = -size * 3;
        const distance = yStart - targetY;
        const duration = (distance / speed) * 1000;

        yPosition.value = withTiming(targetY, {
          duration,
          easing: Easing.linear,
        });
      }, floatDelay);

      return () => clearTimeout(timer);
    }, [yStart, size, speed, floatDelay, popped]);

    useEffect(() => {
      const checkOffScreen = () => {
        // Only trigger when the balloon has floated well above the screen
        if (yPosition.value <= -size * 3 && !popped) {
          onOffScreen(id);
        }
      };

      const interval = setInterval(checkOffScreen, 500);
      return () => clearInterval(interval);
    }, [id, size, popped, onOffScreen]);

    // (Optional: If you want horizontal movement add additional animated transform.)
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: yPosition.value }],
        opacity: popped ? 0 : 1,
      };
    });

    return (
      <Animated.View
        style={[
          styles.balloonContainer,
          {
            left: x,
            width: size,
            height: size * 1.2,
          },
          animatedStyle,
        ]}
      >
        <Pressable onPress={onPress} style={styles.balloonTouchable}>
          {renderBalloonShape(type, color, size)}
        </Pressable>
      </Animated.View>
    );
  },
);

export default function BalloonShapesGame() {
  const gameContext = useGameContext();
  const incrementPops = gameContext?.incrementPops;
  const incrementShapesLearned = gameContext?.incrementShapesCompleted;

  const { play } = useSound();
  const { speakText } = useSpeech();

  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [balloons, setBalloons] = useState<BalloonShape[]>([]);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentTargetShape, setCurrentTargetShape] =
    useState<ShapeType | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const appState = useRef(AppState.currentState);
  const isComponentMounted = useRef(true);
  const isSpeakingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef(Date.now());
  const offScreenBalloons = useRef<Set<string>>(new Set());

  // Number of active balloons based on difficulty
  const getActiveBalloonCount = useCallback(() => {
    switch (difficulty) {
      case Difficulty.EASY:
        return 6;
      case Difficulty.MEDIUM:
        return 10;
      case Difficulty.HARD:
        return 14;
      default:
        return 6;
    }
  }, [difficulty]);

  // Color palette for balloons
  const balloonColors = [
    "#FF6B95", // Pink
    "#4BD5B3", // Teal
    "#5B9AE6", // Blue
    "#9D7FE6", // Purple
    "#FF9858", // Orange
    "#8BC34A", // Green
  ];

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
          startTime.current = Date.now() - elapsedTime * 1000;
          if (gameStarted) {
            resumeGame();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [elapsedTime, gameStarted]);

  // Elapsed time tracking
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      if (gameStarted) {
        setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000));
      }
    }, 1000);

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }
    };
  }, [gameStarted]);

  // Component lifecycle
  useEffect(() => {
    isComponentMounted.current = true;

    return () => {
      isComponentMounted.current = false;
      cleanUp();
    };
  }, []);

  // Clean up function
  const cleanUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (gameTimerRef.current) {
      clearTimeout(gameTimerRef.current);
      gameTimerRef.current = null;
    }

    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }

    try {
      Speech.stop();
    } catch (error) {
      console.error("Error stopping speech during cleanup:", error);
    }

    isSpeakingRef.current = false;
  }, []);

  // Handle off-screen balloons
  const handleOffScreenBalloon = useCallback((id: string) => {
    offScreenBalloons.current.add(id);
  }, []);

  // Check and replace off-screen balloons
  useEffect(() => {
    if (!gameStarted) return;

    const animationInterval = setInterval(() => {
      if (isComponentMounted.current && offScreenBalloons.current.size > 0) {
        // Get IDs of balloons that are off screen
        const offScreenIds = Array.from(offScreenBalloons.current);

        setBalloons((prevBalloons) => {
          const updatedBalloons = [...prevBalloons];
          let needsUpdate = false;

          for (let i = 0; i < updatedBalloons.length; i++) {
            const balloon = updatedBalloons[i];
            if (offScreenIds.includes(balloon.id) && !balloon.popped) {
              updatedBalloons[i] = {
                ...createBalloon(`balloon-${Date.now()}-${i}`),
                floatDelay: 0,
              };
              needsUpdate = true;
            }
          }

          // Make sure at least one balloon has the target shape
          if (needsUpdate) {
            const hasTarget = updatedBalloons.some(
              (b) => !b.popped && b.type === currentTargetShape,
            );

            if (!hasTarget && updatedBalloons.length > 0) {
              const availableBalloons = updatedBalloons.filter(
                (b) => !b.popped,
              );
              if (availableBalloons.length > 0) {
                const randomIndex = Math.floor(
                  Math.random() * availableBalloons.length,
                );
                const balloonIndex = updatedBalloons.findIndex(
                  (b) => b.id === availableBalloons[randomIndex].id,
                );
                if (balloonIndex !== -1) {
                  updatedBalloons[balloonIndex].type =
                    currentTargetShape as ShapeType;
                }
              }
            }
          }

          // Clear the off-screen set after processing
          offScreenBalloons.current.clear();

          return needsUpdate ? updatedBalloons : prevBalloons;
        });
      }
    }, 1000);

    // Store this interval for cleanup
    gameTimerRef.current = animationInterval as unknown as NodeJS.Timeout;

    return () => {
      clearInterval(animationInterval);
    };
  }, [gameStarted, currentTargetShape]);

  // Speak shape name
  const speakShapeName = useCallback(
    (shapeName: string) => {
      if (!isComponentMounted.current) return;

      if (isSpeakingRef.current) {
        Speech.stop();
      }

      isSpeakingRef.current = true;
      speakText(shapeName, {
        rate: 0.8,
        pitch: 1.2,
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

  // Speak the target shape instruction
  const speakTargetInstruction = useCallback(
    (shapeName: string) => {
      if (!isComponentMounted.current) return;

      if (isSpeakingRef.current) {
        Speech.stop();
      }

      const speech = `Find the ${shapeName}!`;

      isSpeakingRef.current = true;
      speakText(speech, {
        rate: 0.8,
        pitch: 1.1,
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

  // Create a new balloon
  const createBalloon = useCallback(
    (id: string): BalloonShape => {
      const randomShape =
        Object.values(ShapeType)[
          Math.floor(Math.random() * Object.values(ShapeType).length)
        ];

      const randomColor =
        balloonColors[Math.floor(Math.random() * balloonColors.length)];

      const size = Math.random() * 30 + 70; // Size between 70-100
      // Choose an x value randomly from 0 to SCREEN_WIDTH - size.
      const maxX = SCREEN_WIDTH - size;
      const randomX = Math.random() * maxX;

      let speedMultiplier = 1;
      if (difficulty === Difficulty.MEDIUM) speedMultiplier = 1.5;
      if (difficulty === Difficulty.HARD) speedMultiplier = 2;

      const speed = (Math.random() * 3 + 5) * speedMultiplier * 7;

      // Y position is set near the bottom edge.
      const yStart = SCREEN_HEIGHT - 20;
      // A short delay so they start moving within about 0.5 seconds.
      const floatDelay = Math.random() * 500;

      return {
        id,
        type: randomShape,
        color: randomColor,
        x: randomX,
        size,
        speed,
        popped: false,
        yStart,
        floatDelay,
      };
    },
    [balloonColors, difficulty],
  );

  // Initialize balloons
  const initializeBalloons = useCallback(() => {
    if (!isComponentMounted.current) return;

    const count = getActiveBalloonCount();
    const newBalloons: BalloonShape[] = [];

    for (let i = 0; i < count; i++) {
      let balloon: BalloonShape;
      let attempts = 0;
      // Retry generating a candidate until it doesn't overlap with existing ones.
      do {
        balloon = createBalloon(`balloon-${i}-${attempts}`);
        attempts++;
        // In case it fails after many tries, accept the candidate.
        if (attempts > 10) break;
      } while (isOverlapping(balloon.x, balloon.size, newBalloons));

      newBalloons.push(balloon);
    }

    // Set a random target shape
    const shapes = Object.values(ShapeType);
    const randomTargetShape = shapes[Math.floor(Math.random() * shapes.length)];
    setCurrentTargetShape(randomTargetShape);

    // Ensure at least one balloon is the target shape.
    const hasTarget = newBalloons.some((b) => b.type === randomTargetShape);
    if (!hasTarget && newBalloons.length > 0) {
      const randomIndex = Math.floor(Math.random() * newBalloons.length);
      newBalloons[randomIndex].type = randomTargetShape;
    }

    setBalloons(newBalloons);

    // Speak the target instruction after a short delay.
    setTimeout(() => {
      if (isComponentMounted.current) {
        speakTargetInstruction(randomTargetShape);
      }
    }, 500);
  }, [createBalloon, getActiveBalloonCount, speakTargetInstruction]);

  // Load resources and init game
  useEffect(() => {
    const loadResources = async () => {
      try {
        await Promise.all([
          loadSound("pop"),
          loadSound("correct"),
          loadSound("incorrect"),
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading resources:", error);
        setIsLoading(false);
      }
    };

    loadResources();

    return () => {
      cleanUp();
    };
  }, [cleanUp]);

  // Handle balloon pop
  const handleBalloonPop = useCallback(
    (balloon: BalloonShape) => {
      if (balloon.popped || !isComponentMounted.current) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Mark balloon as popped
      setBalloons((prevBalloons) =>
        prevBalloons.map((b) =>
          b.id === balloon.id ? { ...b, popped: true } : b,
        ),
      );

      // Play pop sound
      play("pop");

      // Speak the shape name
      speakShapeName(balloon.type);

      // Check if this is the target shape
      if (balloon.type === currentTargetShape) {
        play("correct");
        setScore((prev) => prev + 10);

        const shapes = Object.values(ShapeType);
        const randomTargetShape =
          shapes[Math.floor(Math.random() * shapes.length)];
        setCurrentTargetShape(randomTargetShape);

        // Immediately replace the popped balloon with no extra delay.
        setBalloons((prevBalloons) => {
          const updatedBalloons = [...prevBalloons];
          const poppedIndex = updatedBalloons.findIndex(
            (b) => b.id === balloon.id,
          );
          if (poppedIndex !== -1) {
            // Here we set floatDelay to 0 so it starts moving right away.
            updatedBalloons[poppedIndex] = {
              ...createBalloon(`balloon-${Date.now()}`),
              floatDelay: 0,
            };
          }

          // OPTIONAL: ensure at least one balloon has the new target shape.
          const hasTarget = updatedBalloons.some(
            (b) => b.type === randomTargetShape,
          );
          if (!hasTarget && updatedBalloons.length > 0) {
            const randomIndex = Math.floor(
              Math.random() * updatedBalloons.length,
            );
            updatedBalloons[randomIndex].type = randomTargetShape;
          }

          return updatedBalloons;
        });

        // Speak the new target instruction immediately.
        speakTargetInstruction(randomTargetShape);
        incrementShapesLearned?.();
      } else {
        // Wrong shape popped – replace immediately as well.
        play("incorrect");
        setBalloons((prevBalloons) => {
          const updatedBalloons = [...prevBalloons];
          const poppedIndex = updatedBalloons.findIndex(
            (b) => b.id === balloon.id,
          );
          if (poppedIndex !== -1) {
            updatedBalloons[poppedIndex] = {
              ...createBalloon(`balloon-${Date.now()}`),
              floatDelay: 0,
            };
            // With some probability, force the new balloon to be the target shape.
            if (Math.random() > 0.7) {
              updatedBalloons[poppedIndex].type =
                currentTargetShape as ShapeType;
            }
          }
          return updatedBalloons;
        });

        speakTargetInstruction(currentTargetShape as ShapeType);
      }
      incrementPops?.();
    },
    [
      currentTargetShape,
      play,
      speakShapeName,
      speakTargetInstruction,
      incrementPops,
      incrementShapesLearned,
      createBalloon,
    ],
  );

  // Start the game
  const startGame = useCallback(() => {
    if (isComponentMounted.current) {
      startTime.current = Date.now();
      setElapsedTime(0);
      setScore(0);
      initializeBalloons();
      setGameStarted(true);
    }
  }, [initializeBalloons]);

  // Resume the game after pause
  const resumeGame = useCallback(() => {
    if (isComponentMounted.current) {
      // Remind of current target
      if (currentTargetShape) {
        speakTargetInstruction(currentTargetShape);
      }
    }
  }, [speakTargetInstruction, currentTargetShape]);

  // Toggle difficulty
  const toggleDifficulty = useCallback(() => {
    if (difficulty === Difficulty.EASY) {
      setDifficulty(Difficulty.MEDIUM);
    } else if (difficulty === Difficulty.MEDIUM) {
      setDifficulty(Difficulty.HARD);
    } else {
      setDifficulty(Difficulty.EASY);
    }

    // Restart with new difficulty
    cleanUp();
    setTimeout(() => {
      if (isComponentMounted.current) {
        startGame();
      }
    }, 100);
  }, [difficulty, cleanUp, startGame]);

  // Loading screen
  if (isLoading) {
    return (
      <AnimatedBackground colors={["#FFD1DC", "#FFF0F5"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </AnimatedBackground>
    );
  }

  // Render start screen if game hasn't started
  if (!gameStarted) {
    return (
      <AnimatedBackground colors={["#FFD1DC", "#FFF0F5"]}>
        <GameHeader
          title="Balloon Shapes"
          subtitle="Pop the balloons and learn shapes!"
          colors={["#FF6B95", "#FF9858"]}
        />

        <View style={styles.startContainer}>
          <FloatingAnimal
            type="bunny"
            position={{ top: "15%", left: "10%" }}
            color="rgba(255, 107, 149, 0.6)"
            size={100}
          />

          <LinearGradient
            colors={["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.6)"]}
            style={styles.startCard}
          >
            <Text style={styles.startTitle}>Balloon Shapes</Text>
            <Text style={styles.startDescription}>
              Pop the balloons that match the shape shown!
            </Text>

            <Pressable
              style={styles.difficultyToggle}
              onPress={toggleDifficulty}
            >
              <Text style={styles.difficultyText}>
                Difficulty: {difficulty}
              </Text>
            </Pressable>

            <Pressable style={styles.startButton} onPress={startGame}>
              <LinearGradient
                colors={["#FF6B95", "#FF9858"]}
                style={styles.startButtonGradient}
              >
                <Text style={styles.startButtonText}>Start Game</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground colors={["#FFD1DC", "#FFF0F5"]}>
      <GameHeader
        title="Balloon Shapes"
        subtitle="Pop the balloons and learn shapes!"
        colors={["#FF6B95", "#FF9858"]}
      />

      {/* Target Shape Indicator */}
      <LinearGradient
        colors={["#FF6B95", "#FF9858"]}
        style={styles.targetContainer}
      >
        <Text style={styles.targetText}>Find the {currentTargetShape}!</Text>
      </LinearGradient>

      {/* Floating animal decoration */}
      <FloatingAnimal
        type="bunny"
        position={{ top: 120, right: 20 }}
        size={70}
        color="rgba(255, 107, 149, 0.6)"
      />

      {/* Game container with balloons */}
      <View style={styles.gameContainer}>
        {balloons.map((balloon) => (
          <BalloonItem
            key={balloon.id}
            id={balloon.id}
            type={balloon.type}
            color={balloon.color}
            x={balloon.x}
            size={balloon.size}
            speed={balloon.speed}
            popped={balloon.popped}
            yStart={balloon.yStart}
            floatDelay={balloon.floatDelay}
            onPress={() => handleBalloonPop(balloon)}
            onOffScreen={handleOffScreenBalloon}
          />
        ))}
      </View>

      {/* Game stats */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.7)", "rgba(255, 255, 255, 0.4)"]}
          style={styles.statsGradient}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>
                {Math.floor(elapsedTime / 60)}:
                {("0" + (elapsedTime % 60)).slice(-2)}
              </Text>
            </View>
            <Pressable
              style={styles.difficultyButton}
              onPress={toggleDifficulty}
            >
              <Text style={styles.difficultyButtonText}>{difficulty}</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "ComicNeue",
    fontSize: 24,
    color: "#FF6B95",
  },
  startContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  startCard: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startTitle: {
    fontFamily: "BubbleGum",
    fontSize: 36,
    color: "#FF6B95",
    marginBottom: 16,
    textAlign: "center",
  },
  startDescription: {
    fontFamily: "ComicNeue",
    fontSize: 18,
    color: "#444",
    textAlign: "center",
    marginBottom: 24,
  },
  difficultyToggle: {
    backgroundColor: "rgba(255, 107, 149, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  difficultyText: {
    fontFamily: "ComicNeue",
    fontSize: 16,
    color: "#FF6B95",
    fontWeight: "bold",
  },
  startButton: {
    width: "80%",
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  startButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    fontFamily: "BubbleGum",
    fontSize: 24,
    color: "white",
  },
  targetContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 10,
    alignSelf: "center",
  },
  targetText: {
    fontFamily: "BubbleGum",
    fontSize: 28,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameContainer: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  balloonContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  balloonTouchable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  balloon: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  triangleBalloon: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    position: "relative",
    alignSelf: "center",
  },
  starContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  starPoint: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    top: "25%",
  },
  balloonHighlight: {
    position: "absolute",
    top: "15%",
    left: "15%",
    width: "30%",
    height: "30%",
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  balloonString: {
    position: "absolute",
    bottom: -20,
    width: 2,
    height: 30,
    backgroundColor: "#888",
    alignSelf: "center",
  },
  statsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  statsGradient: {
    borderRadius: 15,
    padding: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontFamily: "ComicNeue",
    fontSize: 14,
    color: "#666",
  },
  statValue: {
    fontFamily: "BubbleGum",
    fontSize: 22,
    color: "#FF6B95",
  },
  difficultyButton: {
    backgroundColor: "rgba(255, 107, 149, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 15,
  },
  difficultyButtonText: {
    fontFamily: "ComicNeue",
    fontSize: 14,
    color: "#FF6B95",
    fontWeight: "bold",
  },
});
