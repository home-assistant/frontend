import type { ValuePart } from "../../types";

// Joins every part except the unit, keeping native order so the sign and
// grouping stay with the value (e.g. "-2,548.14").
export const valueFromParts = (parts: ValuePart[]): string =>
  parts
    .filter((part) => part.type !== "unit")
    .map((part) => part.value)
    .join("")
    .trim();

export const unitFromParts = (parts: ValuePart[]): string =>
  parts.find((part) => part.type === "unit")?.value ?? "";

export type UnitPosition = "before" | "after";

// Whether the unit sits before or after the value in the locale's native order
// (e.g. "$5" / "€ 5" → "before", "5 €" / "5 %" → "after").
export const unitPosition = (parts: ValuePart[]): UnitPosition => {
  const unitIndex = parts.findIndex((part) => part.type === "unit");
  if (unitIndex === -1) {
    return "after";
  }
  const lastValueIndex = parts.reduceRight(
    (acc, part, i) => (acc === -1 && part.type === "value" ? i : acc),
    -1
  );
  return unitIndex < lastValueIndex ? "before" : "after";
};
