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
import { formatNumber } from "../../common/string/format_number";
import { NumberFormat } from "../../data/translation";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-pick-number-format-row")
class NumberFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.number_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.number_format.description")}
        </span>
        <ha-paper-dropdown-menu
          label=${this.hass.localize(
            "ui.panel.profile.number_format.dropdown_label"
          )}
          dynamic-align
          .disabled=${this.hass.locale === undefined}
        >
          <paper-listbox
            slot="dropdown-content"
            .selected=${this.hass.locale.number_format}
            @iron-select=${this._handleFormatSelection}
            attr-for-selected="format"
          >
            ${Object.values(NumberFormat).map((format) => {
              const formattedNumber = formatNumber(1234567.89, {
                language: this.hass.locale.language,
                number_format: format,
              });
              const value = this.hass.localize(
                `ui.panel.profile.number_format.formats.${format}`
              );
              const twoLine = value.slice(value.length - 2) !== "89"; // Display explicit number formats on one line
              return html`
                <paper-item .format=${format}>
                  <paper-item-body ?two-line=${twoLine}>
                    <div>${value}</div>
                    ${twoLine
                      ? html`<div secondary>${formattedNumber}</div>`
                      : ""}
                  </paper-item-body>
                </paper-item>
              `;
            })}
          </paper-listbox>
        </ha-paper-dropdown-menu>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev: CustomEvent) {
    fireEvent(this, "hass-number-format-select", {
      locale: {
        ...this.hass.locale,
        number_format: ev.detail.item.format,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-number-format-row": NumberFormatRow;
  }
}
