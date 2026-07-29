import type { EntityIdPart } from "../../data/entity_id_format";
import { slugify } from "../string/slugify";

export const computeEntityIdFormatExample = (
  format: EntityIdPart[],
  examples: Record<EntityIdPart, string>
): string => {
  const parts = format
    .map((item) => examples[item])
    .filter(Boolean)
    .map((part) => slugify(part, "_"))
    .filter(Boolean);

  return parts.join("_") || "unknown";
};
