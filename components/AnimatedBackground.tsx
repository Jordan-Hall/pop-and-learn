import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

type CloudShape = {
  top: number;
  left: number;
  size: number;
  opacity: number;
  animValueIndex: number; // Index to reference animation value
};

const AnimatedBackground = ({
  children,
  colors = ["#f0f8ff", "#e6f0ff"],
  cloudCount = 6,
}: {
  children: React.ReactNode;
  colors?: [string, string, ...string[]];
  cloudCount?: number;
}) => {
  const { width, height } = useWindowDimensions();
  const [clouds, setClouds] = useState<CloudShape[]>([]);

  // Create animation values at the top level - following Hooks rules
  const animValues = Array.from({ length: cloudCount }).map(() =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSharedValue(0),
  );

  // Create cloud shapes
  useEffect(() => {
    const newClouds = Array.from({ length: cloudCount }).map((_, index) => ({
      top: Math.random() * height * 0.8,
      left: Math.random() * width * 0.8,
      size: 80 + Math.random() * 120,
      opacity: 0.1 + Math.random() * 0.15,
      animValueIndex: index,
    }));

    setClouds(newClouds);
  }, [width, height, cloudCount]);

  // Start animations
  useEffect(() => {
    if (clouds.length === 0) return;

    clouds.forEach((_, index) => {
      const delay = index * 400;
      animValues[index].value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 8000 + Math.random() * 4000 }),
            withTiming(0, { duration: 8000 + Math.random() * 4000 }),
          ),
          -1,
          true,
        ),
      );
    });
  }, [clouds]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors} style={styles.gradient}>
        {/* Render animated cloud shapes */}
        {clouds.map((cloud, index) => (
          <CloudBubble
            key={index}
            cloud={cloud}
            animValue={animValues[cloud.animValueIndex]}
          />
        ))}

        {/* Main content */}
        <View style={styles.content}>{children}</View>
      </LinearGradient>
    </View>
  );
};

const CloudBubble = ({
  cloud,
  animValue,
}: {
  cloud: CloudShape;
  animValue: Animated.SharedValue<number>;
}) => {
  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: 20 * animValue.value },
        { translateY: 10 * animValue.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.cloud,
        {
          top: cloud.top,
          left: cloud.left,
          width: cloud.size,
          height: cloud.size * 0.6,
          opacity: cloud.opacity,
          borderRadius: cloud.size / 2,
        },
        animStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    position: "relative",
  },
  cloud: {
    position: "absolute",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});

export default AnimatedBackground;
