export const expandHex = (hex: string): string => {
  hex = hex.replace("#", "");
  if (hex.length === 6) return hex;
  let result = "";
  for (const val of hex) {
    result += val + val;
  }
  return result;
};

// Blend 2 hex colors: c1 is placed over c2, blend is c1's opacity.
export const hexBlend = (c1: string, c2: string, blend = 50): string => {
  let color = "";
  c1 = expandHex(c1);
  c2 = expandHex(c2);
  for (let i = 0; i <= 5; i += 2) {
    const h1 = parseInt(c1.substr(i, 2), 16);
    const h2 = parseInt(c2.substr(i, 2), 16);
    let hex = Math.floor(h2 + (h1 - h2) * (blend / 100)).toString(16);
    while (hex.length < 2) hex = "0" + hex;
    color += hex;
  }
  return `#${color}`;
};
