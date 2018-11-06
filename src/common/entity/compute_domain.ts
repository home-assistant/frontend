export default function computeDomain(entityId: string): string {
  return entityId.substr(0, entityId.indexOf("."));
}
