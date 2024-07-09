import { assert, assign, object, optional, string } from "superstruct";
import { LocalizeFunc } from "../../../../common/translations/localize";
import { HaFormSchema } from "../../../../components/ha-form/types";
import { EntityCardConfig } from "../../cards/types";
import { LovelaceConfigForm } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const struct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    icon: optional(string()),
    color: optional(string()),
    tap_action: optional(actionConfigStruct),
  })
);

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      {
        name: "icon",
        selector: {
          icon: {},
        },
        context: {
          icon_entity: "entity",
        },
      },
      {
        name: "color",
        selector: {
          ui_color: {
            default_color: true,
          },
        },
      },
    ],
  },
  { name: "tap_action", selector: { ui_action: {} } },
] as HaFormSchema[];

const entityBadgeConfigForm: LovelaceConfigForm = {
  schema: SCHEMA,
  assertConfig: (config: EntityCardConfig) => assert(config, struct),
  computeLabel: (schema: HaFormSchema, localize: LocalizeFunc) => {
    if (schema.name === "theme") {
      return `${localize(
        "ui.panel.lovelace.editor.card.generic.theme"
      )} (${localize("ui.panel.lovelace.editor.card.config.optional")})`;
    }
    return localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
  },
};

export default entityBadgeConfigForm;
