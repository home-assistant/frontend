import type { LineChartUnit } from "../../data/history";

/** A line chart unit that should be rendered together with a secondary unit sharing one chart. */
export interface MergedLineChartUnit extends LineChartUnit {
  secondary?: LineChartUnit;
}

/**
 * Groups `line` units for one history-graph card into chart-renderable items,
 * merging a single primary unit with a single secondary unit into one
 * dual-axis chart when the card config asks for it.
 *
 * Only the case of exactly one primary and one secondary unit is merged;
 * any other combination (e.g. more than one unit flagged for the secondary
 * axis) falls back to today's behavior of one stacked chart per unit, since
 * there is no unambiguous way to share a single secondary axis among
 * multiple unrelated units.
 */
export const mergeSecondaryYAxisUnits = (
  units: LineChartUnit[],
  secondaryYAxisEntities?: Set<string>
): MergedLineChartUnit[] => {
  if (!secondaryYAxisEntities || secondaryYAxisEntities.size === 0) {
    return units;
  }

  const primaryUnits: LineChartUnit[] = [];
  const secondaryUnits: LineChartUnit[] = [];
  for (const unit of units) {
    const isSecondary = unit.data.some((entity) =>
      secondaryYAxisEntities.has(entity.entity_id)
    );
    (isSecondary ? secondaryUnits : primaryUnits).push(unit);
  }

  if (primaryUnits.length !== 1 || secondaryUnits.length !== 1) {
    return units;
  }

  return [{ ...primaryUnits[0], secondary: secondaryUnits[0] }];
};
