import React from "react";
import { StyleSheet, Image, DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

const ANIMAL_IMAGES = {
  bunny: { uri: "https://cdn-icons-png.flaticon.com/512/3069/3069172.png" },
  cat: { uri: "https://cdn-icons-png.flaticon.com/512/616/616430.png" },
  dog: { uri: "https://cdn-icons-png.flaticon.com/512/616/616408.png" },
  elephant: { uri: "https://cdn-icons-png.flaticon.com/512/616/616441.png" },
  giraffe: { uri: "https://cdn-icons-png.flaticon.com/512/616/616434.png" },
  lion: { uri: "https://cdn-icons-png.flaticon.com/512/616/616412.png" },
};

type AnimalType = keyof typeof ANIMAL_IMAGES;

type FloatingAnimalProps = {
  type: AnimalType;
  size?: number;
  position?: {
    top?: DimensionValue;
    left?: DimensionValue;
    right?: DimensionValue;
    bottom?: DimensionValue;
  };
  delay?: number;
  duration?: number;
  color?: string;
};

const FloatingAnimal = ({
  type,
  size = 80,
  position = { top: 20, left: 20 },
  delay = 0,
  duration = 3000,
  color,
}: FloatingAnimalProps) => {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  React.useEffect(() => {
    // Start floating animation
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-15, { duration }),
          withTiming(15, { duration }),
        ),
        -1,
        true,
      ),
    );

    // Subtle rotation animation
    rotate.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-0.05, { duration: duration * 1.2 }),
          withTiming(0.05, { duration: duration * 1.2 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotate.value}rad` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          ...position,
        },
        animatedStyle,
      ]}
    >
      <Image
        source={ANIMAL_IMAGES[type]}
        style={[styles.image, { tintColor: color }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 5,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

export default FloatingAnimal;
