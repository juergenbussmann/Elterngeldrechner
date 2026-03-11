export const toRgba = (color: string, alpha: number): string | null => {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    return null;
  }

  const normalized = color.trim();
  if (!normalized.startsWith('#')) {
    return null;
  }

  const hex = normalized.slice(1);
  if (hex.length !== 3 && hex.length !== 6) {
    return null;
  }

  const fullHex =
    hex.length === 3 ? hex.split('').map((segment) => segment + segment).join('') : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return null;
  }

  const red = parseInt(fullHex.slice(0, 2), 16);
  const green = parseInt(fullHex.slice(2, 4), 16);
  const blue = parseInt(fullHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
