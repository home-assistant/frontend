import { mdiPuzzle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import "./ha-backup-formfield-label";

export type BackupAddonItem = {
  slug: string;
  name: string;
  version?: string;
  icon?: boolean;
  iconPath?: string;
};

@customElement("ha-backup-addons-picker")
export class HaBackupAddonsPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addons!: BackupAddonItem[];

  @property({ attribute: false }) public value?: string[];

  protected render() {
    return html`
      <div class="items">
        ${this.addons.map(
          (item) => html`
            <ha-formfield>
              <ha-backup-formfield-label
                slot="label"
                .label=${item.name}
                .version=${item.version}
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
      value.push(checkbox.id);
    } else {
      value = value.filter((id) => id !== checkbox.id);
    }
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      .items {
        display: flex;
        flex-direction: column;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-addons-picker": HaBackupAddonsPicker;
  }
}
