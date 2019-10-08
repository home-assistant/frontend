const validEntityId = /^(\w+)\.(\w+)$/;

export const isValidEntityId = (entityId: string) =>
  validEntityId.test(entityId);

export const createValidEntityId = (input: string) =>
  input
    .toLowerCase()
    .replace(/\s|\'/g, "_") // replace spaces and quotes with underscore
    .replace(/\W/g, "") // remove not allowed chars
    .replace(/_{2,}/g, "_") // replace multiple underscores with 1
    .replace(/_$/, ""); // remove underscores at the end
