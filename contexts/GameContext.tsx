import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect } from "react";

type GameContextType = {
  totalPops: number;
  shapesCompleted: number;
  colorsLearned: number;
  lettersLearned: number;
  mathProblemsCompleted: number;
  highScore: number;
  incrementPops: (count?: number) => void;
  incrementShapesCompleted: () => void;
  incrementColorsLearned: () => void;
  incrementLettersLearned: () => void;
  incrementMathProblems: () => void;
  updateHighScore: (score: number) => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalPops, setTotalPops] = useState(0);
  const [shapesCompleted, setShapesCompleted] = useState(0);
  const [colorsLearned, setColorsLearned] = useState(0);
  const [lettersLearned, setLettersLearned] = useState(0);
  const [mathProblemsCompleted, setMathProblemsCompleted] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Load saved data when the app starts
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem("gameStats");
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setTotalPops(parsedData.totalPops || 0);
          setShapesCompleted(parsedData.shapesCompleted || 0);
          setColorsLearned(parsedData.colorsLearned || 0);
          setLettersLearned(parsedData.lettersLearned || 0);
          setMathProblemsCompleted(parsedData.mathProblemsCompleted || 0);
          setHighScore(parsedData.highScore || 0);
        }
      } catch (error) {
        console.error("Failed to load game stats:", error);
      }
    };

    loadSavedData();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        const dataToSave = {
          totalPops,
          shapesCompleted,
          colorsLearned,
          lettersLearned,
          mathProblemsCompleted,
          highScore,
        };
        await AsyncStorage.setItem("gameStats", JSON.stringify(dataToSave));
      } catch (error) {
        console.error("Failed to save game stats:", error);
      }
    };

    saveData();
  }, [
    totalPops,
    shapesCompleted,
    colorsLearned,
    lettersLearned,
    mathProblemsCompleted,
    highScore,
  ]);

  const incrementPops = (count = 1) => {
    setTotalPops((prev) => prev + count);
  };

  const incrementShapesCompleted = () => {
    setShapesCompleted((prev) => prev + 1);
  };

  const incrementColorsLearned = () => {
    setColorsLearned((prev) => prev + 1);
  };

  const incrementLettersLearned = () => {
    setLettersLearned((prev) => prev + 1);
  };

  const incrementMathProblems = () => {
    setMathProblemsCompleted((prev) => prev + 1);
  };

  const updateHighScore = (score: number) => {
    if (score > highScore) {
      setHighScore(score);
    }
  };

  return (
    <GameContext.Provider
      value={{
        totalPops,
        shapesCompleted,
        colorsLearned,
        lettersLearned,
        mathProblemsCompleted,
        highScore,
        incrementPops,
        incrementShapesCompleted,
        incrementColorsLearned,
        incrementLettersLearned,
        incrementMathProblems,
        updateHighScore,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};
