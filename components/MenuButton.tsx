import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Text, StyleSheet, Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import FloatingAnimal from "./FloatingAnimal";

import { useSound } from "@/hooks/useSound";

type MenuButtonProps = {
  title: string;
  route: string;
  colors: [string, string, ...string[]];
  delay?: number;
  icon: React.ReactNode;
  animal: "bunny" | "cat" | "dog" | "elephant" | "giraffe" | "lion";
};

const MenuButton = ({
  title,
  route,
  colors,
  delay = 0,
  icon,
  animal,
}: MenuButtonProps) => {
  const router = useRouter();
  const { play } = useSound();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    play("buttonPress");
    router.push(route as any);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.container}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <LinearGradient
          colors={colors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>{icon}</View>
          <Text style={styles.text}>{title}</Text>
          <FloatingAnimal
            type={animal}
            size={40}
            position={{ right: 15 }}
            delay={delay + 300}
            color="rgba(255, 255, 255, 0.7)"
          />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 400,
    marginBottom: 14,
  },
  button: {
    borderRadius: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    transform: [{ scale: 1 }],
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  text: {
    fontFamily: "ComicNeue",
    fontSize: 22,
    color: "white",
    fontWeight: "bold",
    flex: 1,
  },
});

export default MenuButton;
