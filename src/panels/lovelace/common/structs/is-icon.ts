export function isIcon(value: any): string | boolean {
  if (typeof value !== "string") {
    return "icon should be a string";
  }
  if (!value.includes(":")) {
    return "icon should be in the format 'mdi:icon'";
  }
  return true;
}
