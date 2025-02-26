import * as Speech from "expo-speech";
import { useEffect } from "react";

import { useGameContext } from "../contexts/GameContext";

export function useSpeech() {
  const { audioSetting } = useGameContext();
  useEffect(() => {
    if (audioSetting === "mute" || audioSetting === "noSpeech") {
      stopSpeaking();
    }
  }, [audioSetting]);

  const speakText = (text: string, options: Speech.SpeechOptions = {}) => {
    if (audioSetting === "noSpeech" || audioSetting === "mute") return;
    if (!options.language) {
      options.language = "en-GB";
    }
    stopSpeaking();
    Speech.speak(text, options);
  };

  const stopSpeaking = () => {
    Speech.stop();
  };

  return { speakText, stopSpeaking };
}
