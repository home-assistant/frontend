/**
 * Recursively clears all entity references in a Lovelace config object.
 * Sets `entity` fields to "" and `entities` arrays to [].
 */
export function clearEntityReferences<T>(config: T): T {
  if (!config || typeof config !== "object") {
    return config;
  }
  if (Array.isArray(config)) {
    return config.map(clearEntityReferences) as unknown as T;
  }
  const result = { ...(config as Record<string, unknown>) };
  for (const key of Object.keys(result)) {
    if (key === "entity") {
      result[key] = "";
    } else if (key === "entities") {
      result[key] = [];
    } else {
      result[key] = clearEntityReferences(result[key]);
    }
  }
  return result as unknown as T;
}
