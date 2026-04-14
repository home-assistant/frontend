import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../components/ha-form/types";

export const getViewHeaderBadgesWrapFormSchema = (
  localize: LocalizeFunc,
  narrow: boolean
) =>
  ({
    name: "badges_wrap",
    selector: {
      select: {
        mode: "box",
        box_max_columns: narrow ? 1 : 2,
        options: ["wrap", "scroll"].map((value) => ({
          value,
          label: localize(
            `ui.panel.lovelace.editor.edit_view_header.settings.badges_wrap_options.${value}`
          ),
          ...(value === "scroll" && {
            description: localize(
              `ui.panel.lovelace.editor.edit_view_header.settings.badges_wrap_options.${value}_description`
            ),
          }),
          image: {
            src: `/static/images/form/view_header_badges_wrap_${value}.svg`,
            src_dark: `/static/images/form/view_header_badges_wrap_${value}_dark.svg`,
            flip_rtl: true,
          },
        })),
      },
    },
  }) as const satisfies HaFormSchema;
