import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { useGameContext } from "../contexts/GameContext";

type PopBubbleProps = {
  id: string;
  size?: number;
  isPopped?: boolean;
  onPop?: (id: string) => void;
  colors?: [string, string, ...string[]];
  poppedColors?: [string, string, ...string[]];
  content?: React.ReactNode;
  poppedContent?: React.ReactNode;
  disabled?: boolean;
  sound?: Audio.Sound;
  shapeStyle?: ViewStyle;
};

const PopBubble = ({
  id,
  size = 70,
  isPopped = false,
  onPop,
  colors = ["#FF9A9E", "#FAD0C4"] as [string, string, ...string[]],
  poppedColors = ["#D3D3D3", "#BEBEBE"] as [string, string, ...string[]],
  content,
  poppedContent,
  disabled = false,
  sound,
  shapeStyle,
}: PopBubbleProps) => {
  const { incrementPops } = useGameContext();

  // Animation values
  const scale = useSharedValue(isPopped ? 0.85 : 1);
  const elevation = useSharedValue(isPopped ? 1 : 8);
  const topPosition = useSharedValue(isPopped ? 4 : 0);
  const shadowOpacity = useSharedValue(isPopped ? 0.1 : 0.25);
  const concavity = useSharedValue(isPopped ? -5 : 5);

  // Update animation values when isPopped changes externally
  useEffect(() => {
    if (isPopped) {
      scale.value = withTiming(0.85, { duration: 300 });
      elevation.value = withTiming(1, { duration: 300 });
      topPosition.value = withTiming(4, { duration: 300 });
      shadowOpacity.value = withTiming(0.1, { duration: 300 });
      concavity.value = withTiming(-5, { duration: 300 });
    } else {
      scale.value = withTiming(1, { duration: 300 });
      elevation.value = withTiming(8, { duration: 300 });
      topPosition.value = withTiming(0, { duration: 300 });
      shadowOpacity.value = withTiming(0.25, { duration: 300 });
      concavity.value = withTiming(5, { duration: 300 });
    }
  }, [isPopped]);

  const playSound = async () => {
    try {
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  };

  const handlePress = useCallback(() => {
    if (isPopped || disabled) return;

    // Play pop sound
    runOnJS(playSound)();

    // Increment total pops
    runOnJS(incrementPops)(1);

    // Animate the pop - first compress down, then stay compressed
    scale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 300 }),
      withTiming(0.85, { duration: 150 }),
    );

    // Decrease elevation and move top position to simulate pressed state
    elevation.value = withTiming(1, { duration: 150 });
    topPosition.value = withTiming(4, { duration: 150 });
    shadowOpacity.value = withTiming(0.1, { duration: 150 });

    // Change from convex to concave shape
    concavity.value = withTiming(-5, { duration: 300 });

    // Notify parent component
    if (onPop) {
      runOnJS(onPop)(id);
    }
  }, [
    id,
    isPopped,
    disabled,
    onPop,
    scale,
    elevation,
    topPosition,
    shadowOpacity,
    concavity,
  ]);

  // Apply shape style if provided, otherwise use default circular style
  const defaultBorderRadius = size / 2;

  // Extract border radius from shape style or use default
  const shapeBorderRadius =
    shapeStyle && "borderRadius" in shapeStyle
      ? shapeStyle.borderRadius
      : defaultBorderRadius;

  // Extract width and height from shape style or use default
  const shapeWidth =
    shapeStyle && "width" in shapeStyle ? shapeStyle.width : size;

  const shapeHeight =
    shapeStyle && "height" in shapeStyle ? shapeStyle.height : size;

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    elevation: elevation.value,
    shadowOpacity: shadowOpacity.value,
    top: topPosition.value,
  }));

  const innerBubbleStyle = useAnimatedStyle(() => ({
    borderRadius: shapeBorderRadius,
    // Create a more pronounced concave/convex effect
    transform: [
      { perspective: 500 },
      { rotateX: "45deg" },
      { translateY: concavity.value },
      { rotateX: "-45deg" },
    ],
  }));

  return (
    <Pressable onPress={handlePress} disabled={disabled || isPopped}>
      <Animated.View
        style={[
          styles.container,
          bubbleStyle,
          {
            width: shapeWidth,
            height: shapeHeight,
            borderRadius: shapeBorderRadius,
          },
        ]}
      >
        <View style={styles.bubbleWrapper}>
          <LinearGradient
            colors={isPopped ? poppedColors : colors}
            style={[
              styles.bubble,
              {
                width: "100%",
                height: "100%",
                borderRadius: shapeBorderRadius,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View style={[styles.innerBubble, innerBubbleStyle]}>
              {isPopped ? poppedContent : content}
            </Animated.View>
          </LinearGradient>

          {/* Optional - add subtle indicators for popped state */}
          {isPopped && (
            <View
              style={[
                styles.poppedIndicator,
                {
                  borderRadius:
                    typeof shapeBorderRadius === "number"
                      ? shapeBorderRadius / 2
                      : defaultBorderRadius / 2,
                },
              ]}
            />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 8,
  },
  bubbleWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  bubble: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    overflow: "hidden",
  },
  innerBubble: {
    width: "90%",
    height: "90%",
    justifyContent: "center",
    alignItems: "center",
  },
  poppedIndicator: {
    position: "absolute",
    top: "30%",
    left: "30%",
    width: "40%",
    height: "40%",
    backgroundColor: "rgba(0,0,0,0.1)",
    zIndex: 1,
  },
});

export default PopBubble;
