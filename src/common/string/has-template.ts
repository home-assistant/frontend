const hasTemplateRegex = new RegExp("{%|{{|{#");
const hasTemplate = (value: string): boolean => hasTemplateRegex.test(value);
