export const hasRejectedItems = <T = any>(results: PromiseSettledResult<T>[]) =>
  results.some((result) => result.status === "rejected");

export const rejectedItems = <T = any>(
  results: PromiseSettledResult<T>[]
): PromiseRejectedResult[] =>
  results.filter(
    (result) => result.status === "rejected"
  ) as PromiseRejectedResult[];
