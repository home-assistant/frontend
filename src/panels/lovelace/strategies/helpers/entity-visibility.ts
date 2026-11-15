import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { EntityVisibilityCardConfig } from "../../cards/types";

export type ComputeEntityCard = (entityId: string) => LovelaceCardConfig;

export const wrapEntityVisibility =
  (
    hiddenEntities: Set<string>,
    computeCard: ComputeEntityCard,
    computeExtras?: (
      entityId: string
    ) => Pick<EntityVisibilityCardConfig, "favorite" | "alert">
  ) =>
  (entityId: string): EntityVisibilityCardConfig => ({
    type: "entity-visibility",
    entity: entityId,
    hidden: hiddenEntities.has(entityId),
    ...computeExtras?.(entityId),
    card: computeCard(entityId),
  });
