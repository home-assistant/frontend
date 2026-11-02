import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../../src/common/array/ensure-array";
import type {
  ExplainTargetExcludeResult,
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

/**
 * Like core's explain_target_exclude: resolves each item of the target and of
 * its `exclude` on its own with `resolve`, and tells what each exclude takes
 * out of each included item. Like core, excludes resolve every entity, not
 * only the primary ones.
 */
export const explainTargetExclude = (
  target: HassServiceTargetWithExclude,
  resolve: (
    target: HassServiceTarget,
    primaryEntitiesOnly: boolean
  ) => string[],
  primaryEntitiesOnly = true
): ExplainTargetExcludeResult => {
  const single = ({ type, id }: TargetItem): HassServiceTarget => ({
    [`${type}_id`]: [id],
  });
  const includes = items(target).map((item) => ({
    ...item,
    entities: resolve(single(item), primaryEntitiesOnly),
  }));
  return {
    includes,
    excludes: items(target.exclude).map((item) => {
      const excluded = new Set(resolve(single(item), false));
      return {
        ...item,
        removed: includes
          .map((include) => ({
            ...include,
            entities: include.entities.filter((entityId) =>
              excluded.has(entityId)
            ),
          }))
          .filter((include) => include.entities.length > 0),
      };
    }),
  };
};
