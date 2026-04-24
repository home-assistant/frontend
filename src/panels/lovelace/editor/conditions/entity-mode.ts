import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HomeAssistant } from "../../../../types";
import type { ConditionsEntityContext } from "./context";

export type EntityMode = "current" | "specific";

export const resolveEntityMode = (
  ctx: ConditionsEntityContext | undefined,
  storedMode: EntityMode | undefined,
  conditionEntity: string | undefined
) => {
  const currentEntityId = ctx?.mode === "current" ? ctx.entityId : undefined;
  const entityMode: EntityMode | undefined = currentEntityId
    ? (storedMode ?? (conditionEntity ? "specific" : "current"))
    : undefined;
  return { currentEntityId, entityMode };
};

export const getCurrentEntityLabel = (
  hass: HomeAssistant,
  currentEntityId: string | undefined
) => {
  if (!currentEntityId) return undefined;
  const stateObj = hass.states[currentEntityId];
  return hass.localize(
    "ui.panel.lovelace.editor.condition-editor.condition.state.current_entity",
    { name: stateObj ? computeStateName(stateObj) : currentEntityId }
  );
};

export const entityModeSchemaField = (
  localize: LocalizeFunc,
  currentEntityLabel: string
) =>
  ({
    name: "entity_mode",
    required: true,
    selector: {
      select: {
        mode: "dropdown" as const,
        options: [
          { value: "current", label: currentEntityLabel },
          {
            value: "specific",
            label: localize(
              "ui.panel.lovelace.editor.condition-editor.condition.state.specific_entity"
            ),
          },
        ],
      },
    },
  }) as const;
