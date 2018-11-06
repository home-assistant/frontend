const validEntityId = /^(\w+)\.(\w+)$/;
export default (entityId: string) => validEntityId.test(entityId);
