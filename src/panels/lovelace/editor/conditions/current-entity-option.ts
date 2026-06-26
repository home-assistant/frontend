import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { EntitySelectorExtraOption } from "../../../../data/selector";

export const CURRENT_ENTITY_ID = "__current_entity__";

export const currentEntityOption = (
  localize: LocalizeFunc,
  currentEntityId: string,
  currentEntityName: string | undefined
): EntitySelectorExtraOption => ({
  id: CURRENT_ENTITY_ID,
  primary: localize(
    "ui.panel.lovelace.editor.condition-editor.condition.state.current_entity"
  ),
  secondary: currentEntityName ?? currentEntityId,
  entity_id: currentEntityId,
  hide_clear: true,
});
