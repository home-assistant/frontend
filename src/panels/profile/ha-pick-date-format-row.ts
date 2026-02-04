import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateNumeric } from "../../common/datetime/format_date";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { DateFormat } from "../../data/translation";
import type { HomeAssistant } from "../../types";

@customElement("ha-pick-date-format-row")
class DateFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    const date = new Date();
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.date_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.date_format.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.date_format.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.date_format}
          @selected=${this._handleFormatSelection}
          .options=${Object.values(DateFormat).map((format) => ({
            value: format.toString(),
            label: this.hass.localize(
              `ui.panel.profile.date_format.formats.${format}`
            ),
            secondary: formatDateNumeric(
              date,
              {
                ...this.hass.locale,
                date_format: format,
              },
              this.hass.config
            ),
          }))}
        >
        </ha-select>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev: CustomEvent<{ value: string }>) {
    fireEvent(this, "hass-date-format-select", ev.detail.value as DateFormat);
  }

  static styles = css`
    ha-select {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-date-format-row": DateFormatRow;
  }
}
