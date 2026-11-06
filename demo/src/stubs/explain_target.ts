import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../../src/common/array/ensure-array";
import type {
  TargetExplanation,
  HassServiceTargetWithExclude,
  TargetItem,
  TargetType,
} from "../../../src/data/target";

const TYPES: TargetType[] = ["entity", "device", "area", "floor", "label"];

const items = (target?: HassServiceTarget): TargetItem[] =>
  TYPES.flatMap((type) => {
    const ids = target?.[`${type}_id`];
    return ids ? ensureArray(ids).map((id) => ({ type, id: String(id) })) : [];
  });

/** What one target item resolves to, and the areas and devices it reaches. */
export interface ResolvedTargetItem {
  areas: string[];
  devices: string[];
  entities: string[];
}

/**
 * Like core's explain_target: resolves each item of the target and of its
 * `exclude` on its own with `resolve`, and tells what each exclude takes out
 * of each included item. Like core, `entity_id: all` is every entity in
 * `entityIds`, and excludes resolve every entity, not only the primary ones.
 */
export const explainTarget = (
  target: HassServiceTargetWithExclude,
  resolve: (
    target: HassServiceTarget,
    primaryEntitiesOnly: boolean
  ) => ResolvedTargetItem,
  entityIds: string[],
  primaryEntitiesOnly = true
): TargetExplanation => {
  const single = ({ type, id }: TargetItem): HassServiceTarget => ({
    [`${type}_id`]: [id],
  });
  const includes = items(target).map((item) => {
    if (item.type === "entity" && item.id === "all") {
      return {
        ...item,
        entities: entityIds,
        referenced_areas: [],
        referenced_devices: [],
      };
    }
    const { areas, devices, entities } = resolve(
      single(item),
      primaryEntitiesOnly
    );
    return {
      ...item,
      entities,
      referenced_areas: areas,
      referenced_devices: devices,
    };
  });
  return {
    includes,
    excludes: items(target.exclude).map((item) => {
      const excluded = new Set(resolve(single(item), false).entities);
      return {
        ...item,
        removed: includes
          .map(({ type, id, entities }) => ({
            type,
            id,
            entities: entities.filter((entityId) => excluded.has(entityId)),
          }))
          .filter((include) => include.entities.length > 0),
      };
    }),
  };
};
