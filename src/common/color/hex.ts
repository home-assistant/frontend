export const expandHex = (hex: string): string => {
  hex = hex.replace("#", "");
  if (hex.length === 6) return hex;
  let result = "";
  for (const val of hex) {
    result += val + val;
  }
  return result;
};

export const hexBlend = (
  color_1: string,
  color_2: string,
  blend = 50
): string => {
  let color = "";
  color_1 = expandHex(color_1);
  color_2 = expandHex(color_2);
  for (let i = 0; i <= 5; i += 2) {
    const c1 = parseInt(color_1.substr(i, 2), 16);
    const c2 = parseInt(color_2.substr(i, 2), 16);
    let hex = Math.floor(c2 + (c1 - c2) * (blend / 100)).toString(16);
    while (hex.length < 2) hex = "0" + hex;
    color += hex;
  }
  return `#${color}`;
};
