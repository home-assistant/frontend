import { assert, assign, boolean, object, optional, string } from "superstruct";
import { LocalizeFunc } from "../../../../common/translations/localize";
import { HaFormSchema } from "../../../../components/ha-form/types";
import { EntityCardConfig } from "../../cards/types";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import { LovelaceConfigForm } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const struct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(string()),
    icon: optional(string()),
    attribute: optional(string()),
    unit: optional(string()),
    theme: optional(string()),
    state_color: optional(boolean()),
    footer: optional(headerFooterConfigStructs),
  })
);

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  {
    type: "grid",
    name: "",
    schema: [
      { name: "name", selector: { text: {} } },
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
        name: "attribute",
        selector: {
          attribute: {},
        },
        context: {
          filter_entity: "entity",
        },
      },
      { name: "unit", selector: { text: {} } },
      { name: "theme", selector: { theme: {} } },
      { name: "state_color", selector: { boolean: {} } },
    ],
  },
] as HaFormSchema[];

const entityCardConfigForm: LovelaceConfigForm = {
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

export default entityCardConfigForm;
