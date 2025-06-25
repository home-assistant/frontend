const validServiceId = /^(\w+)\.(\w+)$/;

export const isValidServiceId = (actionId: string) =>
  validServiceId.test(actionId);
