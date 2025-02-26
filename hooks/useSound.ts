import { useCallback } from "react";

import { useGameContext } from "../contexts/GameContext";
import { playSound } from "../utils/sounds";

export const useSound = () => {
  const { audioSetting } = useGameContext();

  const play = useCallback(
    (name: string, options?: any) => {
      if (audioSetting === "mute" || audioSetting === "noSound") return;
      playSound(name, options);
    },
    [audioSetting],
  );

  return { play };
};
