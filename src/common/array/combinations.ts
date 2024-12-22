export function getAllCombinations<T>(arr: T[]) {
  return arr.reduce<T[][]>(
    (combinations, element) =>
      combinations.concat(
        combinations.map((combination) => [...combination, element])
      ),
    [[]]
  );
}
