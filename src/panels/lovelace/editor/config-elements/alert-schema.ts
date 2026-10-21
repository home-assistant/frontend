import { mdiAlertOutline, mdiTextShort } from "@mdi/js";
import { DEFAULT_ALERT_COLOR } from "../../../../common/entity/alert_active";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import { contentLayoutSchema, displayedElementsSchema } from "./content-schema";

export const alertSchema = () =>
  ({
    name: "alert",
    type: "expandable",
    flatten: true,
    iconPath: mdiAlertOutline,
    schema: [
      {
        name: "",
        type: "grid",
        schema: [
          {
            name: "clear_color",
            selector: {
              ui_color: { include_none: true, default_color: "none" },
            },
          },
          {
            name: "alert_color",
            selector: {
              ui_color: {
                include_none: true,
                default_color: DEFAULT_ALERT_COLOR,
              },
            },
          },
        ],
      },
      { name: "pulse", selector: { boolean: {} } },
    ],
  }) as const satisfies HaFormSchema;

const nameSchema = {
  name: "name",
  selector: { entity_name: {} },
  context: { entity: "entity" },
} as const satisfies HaFormSchema;

const iconSchema = {
  name: "icon",
  selector: { icon: {} },
  context: { icon_entity: "entity" },
} as const satisfies HaFormSchema;

export const alertCardContentSchema = (localize: LocalizeFunc) =>
  ({
    name: "content",
    type: "expandable",
    flatten: true,
    iconPath: mdiTextShort,
    schema: [
      nameSchema,
      {
        name: "",
        type: "grid",
        schema: [iconSchema, { name: "hide_state", selector: { boolean: {} } }],
      },
      contentLayoutSchema(localize),
    ],
  }) as const satisfies HaFormSchema;

export const alertBadgeContentSchema = (localize: LocalizeFunc) =>
  ({
    name: "content",
    type: "expandable",
    flatten: true,
    iconPath: mdiTextShort,
    schema: [nameSchema, iconSchema, displayedElementsSchema(localize)],
  }) as const satisfies HaFormSchema;
