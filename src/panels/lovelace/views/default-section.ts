import { LocalizeFunc } from "../../../common/translations/localize";

export const generateDefaultSection = (localize: LocalizeFunc) => ({
  type: "grid",
  cards: [
    {
      type: "heading",
      heading: localize(
        "ui.panel.lovelace.editor.section.default_section_title"
      ),
    },
  ],
});
