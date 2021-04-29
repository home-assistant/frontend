import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../components/ha-card";
import "../../components/ha-paper-dropdown-menu";
import { HomeAssistant } from "../../types";
import "../../components/ha-settings-row";
import { TimeFormat } from "../../data/translation";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-pick-time-format-row")
class TimeFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.time_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.time_format.description")}
        </span>
        <ha-paper-dropdown-menu
          label=${this.hass.localize(
            "ui.panel.profile.time_format.dropdown_label"
          )}
          dynamic-align
          .disabled=${this.hass.locale === undefined}
        >
          <paper-listbox
            slot="dropdown-content"
            .selected=${this.hass.locale.time_format}
            @iron-select=${this._handleFormatSelection}
            attr-for-selected="format"
          >
            ${Object.values(TimeFormat).map((format) => {
              return html` <paper-item .format=${format}>
                <paper-item-body>
                  <div>
                    ${this.hass.localize(
                      `ui.panel.profile.time_format.formats.${format}`
                    )}
                  </div>
                </paper-item-body>
              </paper-item>`;
            })}
          </paper-listbox>
        </ha-paper-dropdown-menu>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev: CustomEvent) {
    fireEvent(this, "hass-time-format-select", ev.detail.item.format);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-time-format-row": TimeFormatRow;
  }
}
