import computeDomain from "../../../common/entity/compute_domain.js";

export default function computeNotifications(states) {
  return Object.keys(states)
    .filter((entityId) => computeDomain(entityId) === "configurator")
    .map((entityId) => states[entityId]);
}
