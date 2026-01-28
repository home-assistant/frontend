import type { LocalizeFunc } from "../../../common/translations/localize";

export const generateDefaultSection = (
  localize: LocalizeFunc,
  includeHeading?: boolean
) => ({
  type: "grid",
  cards: includeHeading
    ? [
        {
          type: "heading",
          heading: localize(
            "ui.panel.lovelace.editor.section.default_section_title"
          ),
        },
      ]
    : [],
});
