import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { COLORS } from "../utils/colors";

type ScoreDisplayProps = {
  title: string;
  value: number;
  colors?: [string, string, ...string[]];
  size?: "small" | "medium" | "large";
};

const ScoreDisplay = ({
  title,
  value,
  colors = ["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.5)"],
  size = "medium",
}: ScoreDisplayProps) => {
  // Determine styles based on size
  const getTextStyles = () => {
    switch (size) {
      case "small":
        return {
          title: { fontSize: 14 },
          value: { fontSize: 24 },
        };
      case "large":
        return {
          title: { fontSize: 22 },
          value: { fontSize: 48 },
        };
      default:
        return {
          title: { fontSize: 18 },
          value: { fontSize: 36 },
        };
    }
  };

  const textStyles = getTextStyles();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <LinearGradient colors={colors} style={styles.gradient}>
        <Text style={[styles.title, textStyles.title]}>{title}</Text>
        <Text style={[styles.value, textStyles.value]}>{value}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 10,
  },
  gradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontFamily: "ComicNeue",
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  value: {
    fontFamily: "BubbleGum",
    color: COLORS.freePop.primary,
  },
});

export default ScoreDisplay;
