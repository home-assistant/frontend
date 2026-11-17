// Handle 16x9, 16:9, 1.78x1, 1.78:1, 1.78 and 23%
// Return null for everything else
const NUMBER = String.raw`(\d+(?:\.\d*)?|\.\d+)`;
const RATIO_REGEX = new RegExp(
  String.raw`^\s*${NUMBER}\s*(?:[x:]\s*${NUMBER}\s*)?$`
);
const PERCENTAGE_REGEX = new RegExp(String.raw`^\s*${NUMBER}\s*%\s*$`);

export default function parseAspectRatio(input: string) {
  if (!input) {
    return null;
  }

  const percentage = PERCENTAGE_REGEX.exec(input);
  if (percentage) {
    return { w: 100, h: parseFloat(percentage[1]) };
  }

  const ratio = RATIO_REGEX.exec(input);
  if (ratio) {
    return {
      w: parseFloat(ratio[1]),
      h: ratio[2] === undefined ? 1 : parseFloat(ratio[2]),
    };
  }

  return null;
}
