import type { TemplateResult } from "lit";
import { html } from "lit";
import { formatListWithAnds } from "../../../common/string/format-list";
import type { ExtEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { findRelated } from "../../../data/search";
import type { HomeAssistant } from "../../../types";

const RELATED_ENTITY_DOMAINS = ["automation", "script", "group", "scene"];

export const getDeleteConfirmationText = async (
  hass: HomeAssistant,
  entry: ExtEntityRegistryEntry,
  name: string | undefined
): Promise<string | TemplateResult> => {
  const mainText = hass.localize(
    "ui.dialogs.entity_registry.editor.confirm_delete",
    { entity_name: name }
  );

  try {
    const related = await findRelated(hass, "entity", entry.entity_id);

    const relatedItems = RELATED_ENTITY_DOMAINS.map((domain) => {
      const count = related[domain]?.length || 0;
      if (count === 0) {
        return undefined;
      }
      return hass.localize(
        `ui.dialogs.entity_registry.editor.confirm_delete_count.${domain}`,
        { count }
      );
    }).filter((item): item is string => Boolean(item));

    if (relatedItems.length === 0) {
      return mainText;
    }

    return html`${mainText} <br /><br />
      ${hass.localize(
        "ui.dialogs.entity_registry.editor.confirm_delete_related",
        {
          items: formatListWithAnds(hass.locale, relatedItems),
        }
      )}`;
  } catch (_err) {
    return mainText;
  }
};
