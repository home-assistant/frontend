import { mdiGestureTap } from "@mdi/js";
import { assert, assign, boolean, object, optional, string } from "superstruct";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import type { LovelaceConfigForm } from "../../types";
import { actionConfigStruct } from "../structs/action-struct";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entityNameStruct } from "../structs/entity-name-struct";
import {
  type UiAction,
  ACTION_RELATED_CONTEXT,
  supportedActions,
} from "../../components/hui-action-editor";

const TAP_ACTIONS: UiAction[] = [
  "more-info",
  "navigate",
  "url",
  "perform-action",
  "assist",
  "none",
];

const struct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    name: optional(entityNameStruct),
    icon: optional(string()),
    attribute: optional(string()),
    unit: optional(string()),
    theme: optional(string()),
    state_color: optional(boolean()),
    tap_action: optional(supportedActions(actionConfigStruct, TAP_ACTIONS)),
    hold_action: optional(supportedActions(actionConfigStruct, TAP_ACTIONS)),
    double_tap_action: optional(
      supportedActions(actionConfigStruct, TAP_ACTIONS)
    ),
    footer: optional(headerFooterConfigStructs),
  })
);

const SCHEMA = [
  { name: "entity", required: true, selector: { entity: {} } },
  {
    name: "name",
    selector: {
      entity_name: {},
    },
    context: { entity: "entity" },
  },
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
  {
    name: "interactions",
    type: "expandable",
    flatten: true,
    iconPath: mdiGestureTap,
    schema: [
      {
        name: "tap_action",
        selector: {
          ui_action: {
            actions: TAP_ACTIONS,
            default_action: "more-info",
          },
        },
        context: ACTION_RELATED_CONTEXT,
      },
      {
        name: "",
        type: "optional_actions",
        flatten: true,
        schema: (["hold_action", "double_tap_action"] as const).map(
          (action) => ({
            name: action,
            selector: {
              ui_action: {
                actions: TAP_ACTIONS,
                default_action: "none" as const,
              },
            },
            context: ACTION_RELATED_CONTEXT,
          })
        ),
      },
    ],
  },
] as HaFormSchema[];

const entityCardConfigForm: LovelaceConfigForm = {
  schema: SCHEMA,
  assertConfig: (config) => assert(config, struct),
  computeLabel: (schema: HaFormSchema, localize: LocalizeFunc) => {
    switch (schema.name) {
      case "theme":
        return `${localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${localize("ui.panel.lovelace.editor.card.config.optional")})`;
      case "interactions":
        return localize("ui.panel.lovelace.editor.card.generic.interactions");
      case "tap_action":
      case "hold_action":
      case "double_tap_action":
        return `${localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        )} (${localize("ui.panel.lovelace.editor.card.config.optional")})`;
      default:
        return localize(`ui.panel.lovelace.editor.card.generic.${schema.name}`);
    }
  },
};

export default entityCardConfigForm;
