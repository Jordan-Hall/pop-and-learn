import { Audio } from "expo-av";

// A cache to store loaded sounds
const soundCache: Record<string, Audio.Sound> = {};

type SoundOptions = {
  shouldPlay?: boolean;
  positionMillis?: number;
  rate?: number;
  shouldCorrectPitch?: boolean;
  volume?: number;
  isMuted?: boolean;
  isLooping?: boolean;
};

// Load sound with caching mechanism
export const loadSound = async (
  name: string,
  options?: SoundOptions,
): Promise<Audio.Sound | null> => {
  try {
    // Return cached sound if available
    if (soundCache[name]) {
      return soundCache[name];
    }

    // Map of sound file URLs - could be remote URLs or local requires
    // We'll use a mix of Expo stock sounds and remote URLs
    const soundMap: Record<string, any> = {
      pop: require("../assets/sounds/pop.wav"),
      correct: require("../assets/sounds/correct.wav"),
      incorrect: require("../assets/sounds/error.wav"),
      buttonPress: require("../assets/sounds/click.wav"),
      celebration: require("../assets/sounds/celebration.wav"),
      countdown: require("../assets/sounds/countdown.wav"),
    };

    let source;
    if (typeof soundMap[name] === "string") {
      // Remote URL
      source = { uri: soundMap[name] };
    } else {
      // Local require
      source = soundMap[name];
    }

    const { sound } = await Audio.Sound.createAsync(source, options);

    // Cache the loaded sound
    soundCache[name] = sound;

    return sound;
  } catch (error) {
    console.error("Error loading sound:", error);
    return null;
  }
};

// Play a sound by name
export const playSound = async (
  name: string,
  options?: SoundOptions,
): Promise<void> => {
  try {
    const sound = await loadSound(name, options);
    if (sound) {
      await sound.replayAsync();
    }
  } catch (error) {
    console.error("Error playing sound:", error);
  }
};

// Unload all cached sounds
export const unloadAllSounds = async (): Promise<void> => {
  const soundNames = Object.keys(soundCache);

  for (const name of soundNames) {
    try {
      await soundCache[name].unloadAsync();
      delete soundCache[name];
    } catch (error) {
      console.error(`Error unloading sound ${name}:`, error);
    }
  }
};
