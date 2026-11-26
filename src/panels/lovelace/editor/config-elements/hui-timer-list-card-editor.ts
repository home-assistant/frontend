import { assert, assign, boolean, object, optional, string } from "superstruct";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import type { LovelaceConfigForm } from "../../types";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";

const struct = assign(
  baseLovelaceCardConfig,
  object({
    entity: optional(string()),
    title: optional(string()),
    theme: optional(string()),
    hide_create: optional(boolean()),
  })
);

const SCHEMA: HaFormSchema[] = [
  {
    name: "entity",
    required: true,
    selector: { entity: { domain: "timer_list" } },
  },
  { name: "title", selector: { text: {} } },
  { name: "theme", selector: { theme: {} } },
  { name: "hide_create", selector: { boolean: {} } },
];

const timerListCardConfigForm: LovelaceConfigForm = {
  schema: SCHEMA,
  assertConfig: (config) => assert(config, struct),
  computeLabel: (schema: HaFormSchema, localize: LocalizeFunc) =>
    schema.name === "hide_create"
      ? localize("ui.panel.lovelace.editor.card.timer-list.hide_create")
      : undefined,
};

export default timerListCardConfigForm;
