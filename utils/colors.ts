// Color palette for the app
export const COLORS = {
  // Primary colors for each game mode
  freePop: {
    primary: "#FF6B95",
    secondary: "#FECFEF",
    background: ["#ffffff", "#fff5f8"] as [string, string],
  },
  colors: {
    primary: "#4BD5B3",
    secondary: "#A2F0D5",
    background: ["#ffffff", "#f0fffa"] as [string, string],
  },
  abc: {
    primary: "#5B9AE6",
    secondary: "#C0D6FF",
    background: ["#ffffff", "#f0f8ff"] as [string, string],
  },
  math: {
    primary: "#9D7FE6",
    secondary: "#D4C7FF",
    background: ["#ffffff", "#f8f0ff"] as [string, string],
  },
  speed: {
    primary: "#FF9858",
    secondary: "#FFD0A9",
    background: ["#FF5733", "#FFBD33"] as [string, string],
  },

  // Color sets for bubbles
  bubbles: {
    red: ["#FF6B6B", "#FF8E8E"] as [string, string],
    pink: ["#FF6B95", "#FF9EBD"] as [string, string],
    purple: ["#9D7FE6", "#BEA9FF"] as [string, string],
    blue: ["#5B9AE6", "#8CB5FF"] as [string, string],
    lightBlue: ["#5BC9E6", "#8EDFFF"] as [string, string],
    teal: ["#4BD5B3", "#7FF4D9"] as [string, string],
    green: ["#6BD86B", "#9AFF9A"] as [string, string],
    yellow: ["#FFD86B", "#FFEA9A"] as [string, string],
    orange: ["#FF9858", "#FFBD8E"] as [string, string],
  },

  // Text colors
  text: {
    primary: "#333333",
    secondary: "#666666",
    light: "#ffffff",
    muted: "#999999",
  },
};

// Shape themes with color gradients
export const SHAPE_THEMES = {
  circle: {
    colors: COLORS.bubbles.pink,
    name: "Circle",
    icon: "⭕",
  },
  square: {
    colors: COLORS.bubbles.purple,
    name: "Square",
    icon: "🔲",
  },
  hexagon: {
    colors: COLORS.bubbles.teal,
    name: "Hexagon",
    icon: "⬢",
  },
  heart: {
    colors: COLORS.bubbles.red,
    name: "Heart",
    icon: "❤️",
  },
  star: {
    colors: COLORS.bubbles.yellow,
    name: "Star",
    icon: "⭐",
  },
  animal: {
    colors: COLORS.bubbles.green,
    name: "Animal",
    icon: "🐶",
  },
};

// Learning color set with names
export const LEARNING_COLORS = [
  { name: "Red", value: COLORS.bubbles.red },
  { name: "Pink", value: COLORS.bubbles.pink },
  { name: "Purple", value: COLORS.bubbles.purple },
  { name: "Blue", value: COLORS.bubbles.blue },
  { name: "Light Blue", value: COLORS.bubbles.lightBlue },
  { name: "Teal", value: COLORS.bubbles.teal },
  { name: "Green", value: COLORS.bubbles.green },
  { name: "Yellow", value: COLORS.bubbles.yellow },
  { name: "Orange", value: COLORS.bubbles.orange },
];
