const isTemplateRegex = /{%|{{/;

export const isTemplate = (value: string): boolean =>
  isTemplateRegex.test(value);

export const hasTemplate = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (typeof value === "string") {
    return isTemplate(value);
  }
  if (typeof value === "object") {
    const values = Array.isArray(value) ? value : Object.values(value!);
    return values.some((val) => val && hasTemplate(val));
  }
  return false;
};
