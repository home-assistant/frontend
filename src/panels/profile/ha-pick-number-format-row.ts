import "@material/mwc-list/mwc-list-item";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { formatNumber } from "../../common/number/format_number";
import "../../components/ha-card";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { NumberFormat } from "../../data/translation";
import { HomeAssistant } from "../../types";

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
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.number_format.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.number_format}
          @selected=${this._handleFormatSelection}
          naturalMenuWidth
        >
          ${Object.values(NumberFormat).map((format) => {
            const formattedNumber = formatNumber(1234567.89, {
              ...this.hass.locale,
              number_format: format,
            });
            const value = this.hass.localize(
              `ui.panel.profile.number_format.formats.${format}`
            );
            const twoLine = value.slice(value.length - 2) !== "89"; // Display explicit number formats on one line
            return html`
              <mwc-list-item .value=${format} .twoline=${twoLine}>
                <span>${value}</span>
                ${twoLine
                  ? html`<span slot="secondary">${formattedNumber}</span>`
                  : ""}
              </mwc-list-item>
            `;
          })}
        </ha-select>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev) {
    fireEvent(this, "hass-number-format-select", ev.target.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-number-format-row": NumberFormatRow;
  }
}
