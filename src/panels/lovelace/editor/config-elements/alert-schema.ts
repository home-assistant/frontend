import { mdiAlertOutline } from "@mdi/js";
import { DEFAULT_ALERT_COLOR } from "../../../../common/entity/alert_active";
import type { HaFormSchema } from "../../../../components/ha-form/types";

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
