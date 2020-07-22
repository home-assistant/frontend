const expandhex = (hex: string): string => {
  let result = "#";

  for (var i = 1; i < hex.length; i++) {
    var val = hex.charAt(i);
    result += val + val;
  }

  return result;
};

export const hex2rgb = (hex: string): [number, number, number] => {
  if (hex.length === 4) {
    hex = expandhex(hex);
  }

  const rgb: [number, number, number] = [
    parseInt(hex.substring(1, 3), 16),
    parseInt(hex.substring(3, 5), 16),
    parseInt(hex.substring(5, 7), 16),
  ];

  return rgb;
};

const clamp = (val: number, min: number, max: number): number => {
  return Math.min(Math.max(val, min), max);
};

const component2hex = (component: number): string => {
  const value = Math.round(clamp(component, 0, 255));
  const hex = value.toString(16);

  return hex.length === 1 ? `0${hex}` : hex;
};

export const rgb2hex = (rgb: [number, number, number]): string => {
  return `#${component2hex(rgb[0])}${component2hex(rgb[1])}${component2hex(
    rgb[2]
  )}`;
};

export const rgb2hsl = (
  rgb: [number, number, number]
): [number, number, number] => {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;

  if (max === min) {
    h = 0;
  } else if (r === max) {
    h = (g - b) / delta;
  } else if (g === max) {
    h = 2 + (b - r) / delta;
  } else if (b === max) {
    h = 4 + (r - g) / delta;
  }

  h = Math.min(h * 60, 360);

  if (h < 0) {
    h += 360;
  }

  const l = (min + max) / 2;

  if (max === min) {
    s = 0;
  } else if (l <= 0.5) {
    s = delta / (max + min);
  } else {
    s = delta / (2 - max - min);
  }

  return [h, s * 100, l * 100];
};

export const hsl2rgb = (
  hsl: [number, number, number]
): [number, number, number] => {
  const h = hsl[0] / 360;
  const s = hsl[1] / 100;
  const l = hsl[2] / 100;
  let t2: number;
  let t3: number;
  let val: number;

  if (s === 0) {
    val = l * 255;
    return [val, val, val];
  }

  if (l < 0.5) {
    t2 = l * (1 + s);
  } else {
    t2 = l + s - l * s;
  }
  const t1 = 2 * l - t2;

  const rgb: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    t3 = h + (1 / 3) * -(i - 1);
    if (t3 < 0) {
      t3++;
    }
    if (t3 > 1) {
      t3--;
    }

    if (6 * t3 < 1) {
      val = t1 + (t2 - t1) * 6 * t3;
    } else if (2 * t3 < 1) {
      val = t2;
    } else if (3 * t3 < 2) {
      val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
    } else {
      val = t1;
    }

    rgb[i] = val * 255;
  }

  return rgb;
};

export const hex2hsl = (hex: string): [number, number, number] => {
  const rgb = hex2rgb(hex);
  return rgb2hsl(rgb);
};

export const hsl2hex = (hsl: [number, number, number]): string => {
  const rgb = hsl2rgb(hsl);
  return rgb2hex(rgb);
};
