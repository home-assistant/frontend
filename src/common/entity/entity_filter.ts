import computeDomain from "./compute_domain.js";

export type FilterFunc = (entityId: string) => boolean;

export const generateFilter = (
  includeDomains: string[],
  includeEntities: string[],
  excludeDomains: string[],
  excludeEntities: string[]
): FilterFunc => {
  const includeDomainsSet = new Set(includeDomains);
  const includeEntitiesSet = new Set(includeEntities);
  const excludeDomainsSet = new Set(excludeDomains);
  const excludeEntitiesSet = new Set(excludeEntities);

  const haveInclude = includeDomainsSet.size > 0 || includeEntitiesSet.size > 0;
  const haveExclude = excludeDomainsSet.size > 0 || excludeEntitiesSet.size > 0;

  // Case 1 - no includes or excludes - pass all entities
  if (!haveInclude && !haveExclude) {
    return () => true;
  }

  // Case 2 - includes, no excludes - only include specified entities
  if (haveInclude && !haveExclude) {
    return (entityId) =>
      includeEntitiesSet.has(entityId) ||
      includeDomainsSet.has(computeDomain(entityId));
  }

  // Case 3 - excludes, no includes - only exclude specified entities
  if (!haveInclude && haveExclude) {
    return (entityId) =>
      !excludeEntitiesSet.has(entityId) &&
      !excludeDomainsSet.has(computeDomain(entityId));
  }

  // Case 4 - both includes and excludes specified
  // Case 4a - include domain specified
  //  - if domain is included, and entity not excluded, pass
  //  - if domain is not included, and entity not included, fail
  // note: if both include and exclude domains specified,
  //   the exclude domains are ignored
  if (includeDomainsSet.size) {
    return (entityId) =>
      includeDomainsSet.has(computeDomain(entityId))
        ? !excludeEntitiesSet.has(entityId)
        : includeEntitiesSet.has(entityId);
  }

  // Case 4b - exclude domain specified
  //  - if domain is excluded, and entity not included, fail
  //  - if domain is not excluded, and entity not excluded, pass
  if (excludeDomainsSet.size) {
    return (entityId) =>
      excludeDomainsSet.has(computeDomain(entityId))
        ? includeEntitiesSet.has(entityId)
        : !excludeEntitiesSet.has(entityId);
  }

  // Case 4c - neither include or exclude domain specified
  //  - Only pass if entity is included.  Ignore entity excludes.
  return (entityId) => includeEntitiesSet.has(entityId);
};
