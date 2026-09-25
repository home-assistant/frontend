// Check if given obj is a JS object and optionally contains all required keys
export default function isValidObject(obj, requiredKeys = []) {
  return (
    obj &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    requiredKeys.every((k) => k in obj)
  );
}
