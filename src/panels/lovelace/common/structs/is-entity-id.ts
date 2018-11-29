export function isEntityId(value: any): string | boolean {
  if (typeof value !== "string") {
    return "entity id should be a string";
  }
  if (!value.includes(".")) {
    return "entity id should be in the format 'domain.entity'";
  }
  return true;
}
