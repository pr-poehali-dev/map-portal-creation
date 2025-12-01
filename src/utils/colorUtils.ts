export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const blendColors = (colors: string[]): string => {
  if (colors.length === 0) return '#3b82f6';
  if (colors.length === 1) return colors[0];

  const rgbColors = colors.map(hexToRgb);
  
  const avgR = rgbColors.reduce((sum, [r]) => sum + r, 0) / rgbColors.length;
  const avgG = rgbColors.reduce((sum, [, g]) => sum + g, 0) / rgbColors.length;
  const avgB = rgbColors.reduce((sum, [, , b]) => sum + b, 0) / rgbColors.length;

  return rgbToHex(avgR, avgG, avgB);
};
