const validEntityId = /^(\w+)\.(\w+)$/;

export const isValidEntityId = (entityId: string) =>
  validEntityId.test(entityId);

export const createValidEntityId = (input: string) =>
  input
    .toLowerCase()
    .replace(/\s/g, "_") // replace spaces with underscore
    .replace(/\W/g, "") // remove not allowed chars
    .replace(/_+$/g, "") // remove underscores at the end
    .replace(/_{2,}/g, "_"); // replace multiple underscores with 1
