/** Map Zinatex rug color names to dot swatch colors (reel indicators). */
export function zinatexColorNameToCss(colorName: string | null | undefined): string {
  if (!colorName) return "#ffffff";
  const key = colorName.trim();
  const map: Record<string, string> = {
    Gold: "#D4AF37",
    Beige: "#F5F5DC",
    Grey: "#808080",
    Gray: "#808080",
    Black: "#222",
    Navy: "#001F5B",
    Red: "#CC0000",
    Brown: "#6B3A2A",
    Cream: "#FFFDD0",
    Yellow: "#FFD700",
    Sand: "#C2B280",
    Turquoise: "#40E0D0",
    Burgundy: "#800020",
    Smoke: "#708090",
    Terracotta: "#E2725B",
    Ocean: "#006994",
  };
  return map[key] ?? "#ffffff";
}
