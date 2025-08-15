import { mdiPuzzle, mdiCheckboxMultipleMarked } from "@mdi/js";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import type { HomeAssistant } from "../../../../types";
import "./ha-backup-formfield-label";

export interface BackupAddonItem {
  slug: string;
  name: string;
  version?: string;
  icon?: boolean;
  iconPath?: string;
}

@customElement("ha-backup-addons-picker")
export class HaBackupAddonsPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public addons!: BackupAddonItem[];

  @property({ attribute: false }) public value?: string[];

  @property({ attribute: "hide-version", type: Boolean })
  public hideVersion = false;

  @property({ type: Boolean }) public disabled = false;

  private _addons = memoizeOne((addons: BackupAddonItem[]) =>
    addons.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass?.locale?.language)
    )
  );

  protected render() {
    const allSelected =
      this.addons?.length > 0 && this.value?.length === this.addons.length;
    return html`
      <div class="items">
        <ha-formfield>
          <ha-backup-formfield-label
            slot="label"
            .label=${this.hass?.localize?.(
              "ui.components.subpage-data-table.select_all"
            ) ?? ""}
            .iconPath=${mdiCheckboxMultipleMarked}
          ></ha-backup-formfield-label>
          <ha-checkbox
            id="select-all"
            .checked=${allSelected}
            @change=${this._selectAllChanged}
            .disabled=${this.disabled}
          ></ha-checkbox>
        </ha-formfield>
        ${this._addons(this.addons).map(
          (item) => html`
            <ha-formfield>
              <ha-backup-formfield-label
                slot="label"
                .label=${item.name}
                .version=${this.hideVersion ? undefined : item.version}
                .iconPath=${item.iconPath || mdiPuzzle}
                .imageUrl=${this.addons?.find((a) => a.slug === item.slug)?.icon
                  ? `/api/hassio/addons/${item.slug}/icon`
                  : undefined}
              >
              </ha-backup-formfield-label>
              <ha-checkbox
                .id=${item.slug}
                .checked=${this.value?.includes(item.slug) || false}
                @change=${this._checkboxChanged}
                .disabled=${this.disabled}
              ></ha-checkbox>
            </ha-formfield>
          `
        )}
      </div>
    `;
  }

  private _checkboxChanged(ev: Event) {
    ev.stopPropagation();
    let value = this.value ?? [];
    const checkbox = ev.currentTarget as HaCheckbox;
    if (checkbox.checked) {
      if (!value.includes(checkbox.id)) {
        value = [...value, checkbox.id];
      }
    } else {
      value = value.filter((id) => id !== checkbox.id);
    }
    fireEvent(this, "value-changed", { value });
  }

  private _selectAllChanged(ev: Event) {
    ev.stopPropagation();
    const checkbox = ev.currentTarget as HaCheckbox;
    let value: string[];
    if (checkbox.checked) {
      value = this.addons.map((addon) => addon.slug);
    } else {
      value = [];
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    .items {
      display: flex;
      flex-direction: column;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-addons-picker": HaBackupAddonsPicker;
  }
}
