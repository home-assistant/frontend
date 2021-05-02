const regexp = /^\d{4}-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])$/;

export const isDate = (input: string): boolean => regexp.test(input);
