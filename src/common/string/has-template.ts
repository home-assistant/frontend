const hasTemplateRegex = new RegExp("{%|{{|{#");
export const hasTemplate = (value: string): boolean =>
  hasTemplateRegex.test(value);
