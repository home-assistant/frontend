import { assign, boolean, object, optional, string } from "superstruct";
import { headerFooterConfigStructs } from "../../header-footer/structs";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

export const struct = assign(
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

export const schema = [
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
] as const;
