import { html, nothing } from "lit";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../types";
import {
  getAutomaticEntityIds,
  updateEntityRegistryEntry,
} from "./entity_registry";
import "../components/ha-expansion-panel";

export const regenerateEntityIds = async (
  element: HTMLElement,
  hass: HomeAssistant,
  entities: string[]
): Promise<void> => {
  const entityIdsMapping = await getAutomaticEntityIds(hass, entities);

  const entityIdsEntries = Object.entries(entityIdsMapping);

  const dialogRename = entityIdsEntries
    .filter(([oldId, newId]) => newId && oldId !== newId)
    .map(
      ([oldId, newId]) =>
        html`<tr>
          <td>${oldId}</td>
          <td>${newId}</td>
        </tr>`
    );
  const dialogCantRename = entityIdsEntries
    .filter(([_oldId, newId]) => newId === null)
    .map(([oldId]) => html`<li>${oldId}</li>`);
  const dialogNoRename = entityIdsEntries
    .filter(([oldId, newId]) => oldId === newId)
    .map(([oldId]) => html`<li>${oldId}</li>`);
  if (dialogRename.length) {
    showConfirmationDialog(element, {
      title: hass.localize(
        "ui.dialogs.recreate_entity_ids.confirm_rename_title"
      ),
      text: html`${hass.localize(
          "ui.dialogs.recreate_entity_ids.confirm_rename_warning"
        )} <br /><br />
        <ha-expansion-panel outlined>
          <span slot="header"
            >${hass.localize("ui.dialogs.recreate_entity_ids.will_rename", {
              count: dialogRename.length,
            })}</span
          >
          <div style="overflow: auto;">
            <table style="width: 100%; text-align: var(--float-start);">
              <tr>
                <th>${hass.localize("ui.dialogs.recreate_entity_ids.old")}</th>
                <th>${hass.localize("ui.dialogs.recreate_entity_ids.new")}</th>
              </tr>
              ${dialogRename}
            </table>
          </div>
        </ha-expansion-panel>
        ${dialogCantRename.length
          ? html`<ha-expansion-panel outlined style="margin-top: 8px;">
              <span slot="header"
                >${hass.localize("ui.dialogs.recreate_entity_ids.cant_rename", {
                  count: dialogCantRename.length,
                })}</span
              >
              ${dialogCantRename}
            </ha-expansion-panel>`
          : nothing}
        ${dialogNoRename.length
          ? html`<ha-expansion-panel outlined style="margin-top: 8px;">
              <span slot="header"
                >${hass.localize("ui.dialogs.recreate_entity_ids.wont_change", {
                  count: dialogNoRename.length,
                })}</span
              >
              ${dialogNoRename}
            </ha-expansion-panel>`
          : nothing}`,
      confirmText: hass.localize("ui.common.update"),
      dismissText: hass.localize("ui.common.cancel"),
      destructive: true,
      confirm: () => {
        entityIdsEntries
          .filter(([oldId, newId]) => newId && oldId !== newId)
          .forEach(([oldEntityId, newEntityId]) =>
            updateEntityRegistryEntry(hass, oldEntityId, {
              new_entity_id: newEntityId,
            }).catch((err: any) => {
              showAlertDialog(element, {
                title: hass.localize(
                  "ui.dialogs.recreate_entity_ids.update_entity_error",
                  { entityId: oldEntityId }
                ),
                text: err.message,
              });
            })
          );
      },
    });
  } else {
    showAlertDialog(element, {
      title: hass.localize(
        "ui.dialogs.recreate_entity_ids.confirm_no_renamable_entity_ids"
      ),
      text: html`${dialogCantRename.length
        ? html`<ha-expansion-panel outlined style="margin-top: 8px;">
            <span slot="header"
              >${hass.localize("ui.dialogs.recreate_entity_ids.cant_rename", {
                count: dialogCantRename.length,
              })}</span
            >
            ${dialogCantRename}
          </ha-expansion-panel>`
        : nothing}
      ${dialogNoRename.length
        ? html`<ha-expansion-panel outlined style="margin-top: 8px;">
            <span slot="header"
              >${hass.localize("ui.dialogs.recreate_entity_ids.wont_change", {
                count: dialogNoRename.length,
              })}</span
            >
            ${dialogNoRename}
          </ha-expansion-panel>`
        : nothing}`,
    });
  }
};
