import { mdiFolder, mdiPuzzle } from "@mdi/js";
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

type BackupAddon = {
  slug: string;
  name: string;
  version?: string;
  icon?: string;
};

const SELF_CREATED_ADDONS_FOLDER = "addons/local";

@customElement("ha-backup-addons-picker")
export class HaBackupAddonsPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addons!: BackupAddon[];

  @property({ attribute: false }) public value?: string[];

  protected render() {
    return html`
      <div class="items">
        ${this.addons.map(
          (item) => html`
            <ha-formfield
              .label=${html`
                <ha-backup-formfield-label
                  .label=${item.name}
                  .version=${item.version}
                  .iconPath=${mdiPuzzle}
                  .imageUrl=${this.addons?.find((a) => a.slug === item.slug)
                    ?.icon
                    ? `/api/hassio/addons/${item.slug}/icon`
                    : undefined}
                >
                </ha-backup-formfield-label>
              `}
            >
              <ha-checkbox
                .id=${item.slug}
                .checked=${this.value?.includes(item.slug)}
                @change=${this._checkboxChanged}
              ></ha-checkbox>
            </ha-formfield>
          `
        )}
        <ha-formfield
          .label=${html`
            <ha-backup-formfield-label
              .label=${"Self created add-ons"}
              .iconPath=${mdiFolder}
            >
            </ha-backup-formfield-label>
          `}
        >
          <ha-checkbox
            .id=${SELF_CREATED_ADDONS_FOLDER}
            .checked=${this.value?.includes(SELF_CREATED_ADDONS_FOLDER)}
            @change=${this._checkboxChanged}
          ></ha-checkbox>
        </ha-formfield>
      </div>
    `;
  }

  private _checkboxChanged(ev: Event) {
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
