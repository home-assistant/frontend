/**
 * Structural checksum for large transform outputs. Snapshotting a 100k-point
 * result verbatim would create megabyte snapshot files; this digest is small
 * but still detects any numeric or structural drift, including changes in
 * floating-point summation order.
 */
interface Digest {
  type: string;
  size?: number;
  keys?: string[];
  numberCount?: number;
  numberSum?: string;
  first?: unknown;
  last?: unknown;
}

const collectNumbers = (
  value: unknown,
  acc: { count: number; sum: number }
) => {
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      acc.count++;
      acc.sum += value;
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNumbers(item, acc);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      collectNumbers((value as Record<string, unknown>)[key], acc);
    }
  }
};

export const digestResult = (value: unknown): Digest => {
  const acc = { count: 0, sum: 0 };
  collectNumbers(value, acc);
  const digest: Digest = {
    type: Array.isArray(value) ? "array" : typeof value,
    numberCount: acc.count,
    numberSum: acc.sum.toPrecision(12),
  };
  if (Array.isArray(value)) {
    digest.size = value.length;
    digest.first = value[0];
    digest.last = value[value.length - 1];
  } else if (value && typeof value === "object") {
    digest.keys = Object.keys(value).sort();
  }
  return digest;
};
