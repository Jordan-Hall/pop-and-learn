import { Volume, VolumeX, MicOff, EarOff } from "lucide-react-native";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  StatusBar,
} from "react-native";
import { useGameContext, AudioSetting } from "../contexts/GameContext";

type Option = {
  label: string;
  value: AudioSetting;
  icon: JSX.Element;
};

const OPTIONS: Option[] = [
  {
    label: "Full",
    value: "full",
    icon: <Volume size={20} color="#4A5568" />,
  },
  {
    label: "No Speech",
    value: "noSpeech",
    icon: <MicOff size={20} color="#4A5568" />,
  },
  {
    label: "No Sound",
    value: "noSound",
    icon: <EarOff size={20} color="#4A5568" />,
  },
  {
    label: "Mute",
    value: "mute",
    icon: <VolumeX size={20} color="#4A5568" />,
  },
];

const AudioSettingDropdown = () => {
  const { audioSetting, setAudioSetting } = useGameContext();
  const [open, setOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });
  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const buttonRef = useRef<View>(null);
  
  const currentOption =
    OPTIONS.find((o) => o.value === audioSetting) || OPTIONS[0];

  useEffect(() => {
    Animated.timing(dropdownAnimation, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open]);

  const measureButton = () => {
    if (buttonRef.current) {
      buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setButtonPosition({ width, height, x: pageX, y: pageY });
      });
    }
  };

  const handleSelect = (option: Option) => {
    setAudioSetting(option.value);
    setOpen(false);
  };

  const toggleDropdown = () => {
    if (!open) {
      measureButton();
    }
    setOpen((prev) => !prev);
  };

  // Calculate if dropdown should open upward (if near bottom of screen)
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;
  const shouldOpenUpward = buttonPosition.y > screenHeight - 200;
  
  // Calculate if dropdown would go off-screen horizontally
  const dropdownWidth = 150; // width from styles
  const rightEdgePosition = buttonPosition.x + dropdownWidth;
  const shouldAlignLeft = rightEdgePosition > screenWidth;

  const getDropdownPosition = () => {
    const statusBarHeight = StatusBar.currentHeight || 0;
    
    return {
      // Position horizontally based on button position
      ...(shouldAlignLeft
        ? { right: screenWidth - buttonPosition.x - buttonPosition.width }
        : { left: buttonPosition.x }),
        
      // Position vertically based on available space
      ...(shouldOpenUpward
        ? { bottom: screenHeight - buttonPosition.y - statusBarHeight }
        : { top: buttonPosition.y + buttonPosition.height + statusBarHeight }),
    };
  };

  return (
    <View style={styles.container}>
      <View ref={buttonRef} onLayout={measureButton}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={toggleDropdown}
          accessibilityRole="button"
          accessibilityLabel="Audio settings"
        >
          <View style={styles.buttonContent}>
            {React.cloneElement(currentOption.icon, { color: "#FFFFFF" })}
            <Text style={styles.buttonText}>Audio</Text>
          </View>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.dropdown,
                  getDropdownPosition(),
                  {
                    opacity: dropdownAnimation,
                    transform: [
                      {
                        translateY: dropdownAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [shouldOpenUpward ? 10 : -10, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.option,
                      option.value === audioSetting && styles.selectedOption,
                      pressed && styles.optionPressed,
                    ]}
                    onPress={() => handleSelect(option)}
                  >
                    <View style={styles.optionIconContainer}>
                      {React.cloneElement(option.icon, {
                        color:
                          option.value === audioSetting
                            ? "#3182CE"
                            : "#4A5568",
                      })}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        option.value === audioSetting &&
                          styles.selectedOptionText,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default AudioSettingDropdown;

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(49, 130, 206, 0.9)",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonPressed: {
    backgroundColor: "rgba(44, 122, 197, 1)",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  dropdown: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: 150,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  optionPressed: {
    backgroundColor: "rgba(237, 242, 247, 0.8)",
  },
  selectedOption: {
    backgroundColor: "rgba(235, 244, 255, 0.8)",
  },
  optionIconContainer: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#4A5568",
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: "600",
    color: "#3182CE",
  },
});
