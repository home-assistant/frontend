import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { formatTime } from "../../common/datetime/format_time";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { TimeFormat } from "../../data/translation";
import type { HomeAssistant } from "../../types";

@customElement("ha-pick-time-format-row")
class TimeFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    const date = new Date();
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.time_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.time_format.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.time_format.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.time_format}
          @selected=${this._handleFormatSelection}
          .options=${Object.values(TimeFormat).map((format) => ({
            value: format.toString(),
            label: this.hass.localize(
              `ui.panel.profile.time_format.formats.${format}`
            ),
            secondary: formatTime(
              date,
              {
                ...this.hass.locale,
                time_format: format,
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
    fireEvent(this, "hass-time-format-select", ev.detail.value as TimeFormat);
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
    "ha-pick-time-format-row": TimeFormatRow;
  }
}
