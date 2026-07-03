/**
 * Get all possible combinations of an array
 * @param arr - The array to get combinations of
 * @returns A multidimensional array of all possible combinations
 */
export function getAllCombinations<T>(arr: readonly T[]): T[][] {
  return arr.reduce<T[][]>(
    (combinations, element) =>
      combinations.concat(
        combinations.map((combination) => [...combination, element])
      ),
    [[]]
  );
}
