export default function parseAspectRatio(input) {
  // Handle 16x9, 16:9, 1.78x1, 1.78:1, 1.78
  // Ignore everything else
  function parseOrThrow(number) {
    const parsed = parseFloat(number);
    if (isNaN(parsed)) throw new Error(`${number} is not a number`);
    return parsed;
  }
  try {
    if (input) {
      const arr = input.replace(":", "x").split("x");
      if (arr.length === 0) {
        return null;
      }

      return arr.length === 1
        ? { w: parseOrThrow(arr[0]), h: 1 }
        : { w: parseOrThrow(arr[0]), h: parseOrThrow(arr[1]) };
    }
  } catch (err) {
    // Ignore the error
  }
  return null;
}
