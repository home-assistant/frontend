import computeDomain from "./compute_domain.js";

export function generateFilter(
  includeDomains = [],
  includeEntities = [],
  excludeDomains = [],
  excludeEntities = []
) {
  includeDomains = new Set(includeDomains);
  includeEntities = new Set(includeEntities);
  excludeDomains = new Set(excludeDomains);
  excludeEntities = new Set(excludeEntities);

  const haveInclude = includeDomains.size | (includeEntities.size !== 0);
  const haveExclude = excludeDomains.size | (excludeEntities.size !== 0);

  // Case 1 - no includes or excludes - pass all entities
  if (!haveInclude && !haveExclude) {
    return () => true;
  }

  // Case 2 - includes, no excludes - only include specified entities
  if (haveInclude && !haveExclude) {
    return (entityId) =>
      includeEntities.has(entityId) ||
      includeDomains.has(computeDomain(entityId));
  }

  // Case 3 - excludes, no includes - only exclude specified entities
  if (!haveInclude && haveExclude) {
    return (entityId) =>
      !excludeEntities.has(entityId) &&
      !excludeDomains.has(computeDomain(entityId));
  }

  // Case 4 - both includes and excludes specified
  // Case 4a - include domain specified
  //  - if domain is included, and entity not excluded, pass
  //  - if domain is not included, and entity not included, fail
  // note: if both include and exclude domains specified,
  //   the exclude domains are ignored
  if (includeDomains.size) {
    return (entityId) =>
      includeDomains.has(computeDomain(entityId))
        ? !excludeEntities.has(entityId)
        : includeEntities.has(entityId);
  }

  // Case 4b - exclude domain specified
  //  - if domain is excluded, and entity not included, fail
  //  - if domain is not excluded, and entity not excluded, pass
  if (excludeDomains.size) {
    return (entityId) =>
      excludeDomains.has(computeDomain(entityId))
        ? includeEntities.has(entityId)
        : !excludeEntities.has(entityId);
  }

  // Case 4c - neither include or exclude domain specified
  //  - Only pass if entity is included.  Ignore entity excludes.
  return (entityId) => includeEntities.has(entityId);
}
