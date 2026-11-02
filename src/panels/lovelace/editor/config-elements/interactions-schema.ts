import { mdiGestureTap } from "@mdi/js";
import type { HaFormSchema } from "../../../../components/ha-form/types";
import { getEntityDefaultTileIconAction } from "../../cards/tile/tile-card-helpers";
import { ACTION_RELATED_CONTEXT } from "../../components/hui-action-editor";

export const tileInteractionsSchema = (entityId: string | undefined) =>
  ({
    name: "interactions",
    type: "expandable",
    flatten: true,
    iconPath: mdiGestureTap,
    schema: [
      {
        name: "tap_action",
        selector: {
          ui_action: {
            default_action: "more-info",
          },
        },
        context: ACTION_RELATED_CONTEXT,
      },
      {
        name: "",
        type: "divider",
      },
      {
        name: "icon_tap_action",
        selector: {
          ui_action: {
            default_action: entityId
              ? getEntityDefaultTileIconAction(entityId)
              : "more-info",
          },
        },
        context: ACTION_RELATED_CONTEXT,
      },
      {
        name: "",
        type: "optional_actions",
        flatten: true,
        schema: (
          [
            "hold_action",
            "icon_hold_action",
            "double_tap_action",
            "icon_double_tap_action",
          ] as const
        ).map((action) => ({
          name: action,
          selector: {
            ui_action: {
              default_action: "none" as const,
            },
          },
          context: ACTION_RELATED_CONTEXT,
        })),
      },
    ],
  }) as const satisfies HaFormSchema;

export const entityInteractionsSchema = () =>
  ({
    name: "interactions",
    type: "expandable",
    flatten: true,
    iconPath: mdiGestureTap,
    schema: [
      {
        name: "tap_action",
        selector: {
          ui_action: {
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
                default_action: "none" as const,
              },
            },
            context: ACTION_RELATED_CONTEXT,
          })
        ),
      },
    ],
  }) as const satisfies HaFormSchema;
