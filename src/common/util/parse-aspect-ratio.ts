// Handle 16x9, 16:9, 1.78x1, 1.78:1, 1.78
// Ignore everything else
const parseOrThrow = (num) => {
  const parsed = parseFloat(num);
  if (isNaN(parsed)) {
    throw new Error(`${num} is not a number`);
  }
  return parsed;
};

export default function parseAspectRatio(input: string) {
  if (!input) {
    return null;
  }
  try {
    if (input.endsWith("%")) {
      return { w: 100, h: parseOrThrow(input.substr(0, input.length - 1)) };
    }

    const arr = input.replace(":", "x").split("x");
    if (arr.length === 0) {
      return null;
    }

    return arr.length === 1
      ? { w: parseOrThrow(arr[0]), h: 1 }
      : { w: parseOrThrow(arr[0]), h: parseOrThrow(arr[1]) };
  } catch (err: any) {
    // Ignore the error
  }
  return null;
}
