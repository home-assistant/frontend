import "./ha-checkbox";
import "./ha-settings-row";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../types";
import "./ha-icon-button";
import { haStyle } from "../resources/styles";
import type { HaCheckbox } from "./ha-checkbox";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { Analytics } from "../data/analytics";

const preferences = ["base", "diagnostics", "usage", "statistics"];

@customElement("ha-analytics")
export class HaAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public analytics!: Analytics;

  protected render(): TemplateResult {
    if (!this.analytics.huuid) {
      return html``;
    }
    return html`
      <p>
        ${this.hass.localize(
          "ui.panel.config.core.section.core.analytics.instance_id",
          "huuid",
          this.analytics.huuid
        )}
      </p>
      ${preferences.map((preference) =>
        preference === "base" || this.analytics.preferences.includes("base")
          ? html`<ha-settings-row>
              <span slot="prefix">
                <ha-checkbox
                  @change=${this._handleRowCheckboxClick}
                  .checked=${this.analytics.preferences.includes(preference)}
                  .preference=${preference}
                >
                </ha-checkbox>
              </span>
              <span slot="heading">
                ${preference === "usage"
                  ? isComponentLoaded(this.hass, "hassio")
                    ? this.hass.localize(
                        `ui.panel.config.core.section.core.analytics.preference.usage_supervisor.title`
                      )
                    : this.hass.localize(
                        `ui.panel.config.core.section.core.analytics.preference.usage.title`
                      )
                  : this.hass.localize(
                      `ui.panel.config.core.section.core.analytics.preference.${preference}.title`
                    )}
              </span>
              <span slot="description">
                ${preference === "usage"
                  ? isComponentLoaded(this.hass, "hassio")
                    ? this.hass.localize(
                        `ui.panel.config.core.section.core.analytics.preference.usage_supervisor.description`
                      )
                    : this.hass.localize(
                        `ui.panel.config.core.section.core.analytics.preference.usage.description`
                      )
                  : this.hass.localize(
                      `ui.panel.config.core.section.core.analytics.preference.${preference}.description`
                    )}
              </span>
            </ha-settings-row>`
          : ""
      )}
      <p>
        ${this.hass.localize(
          "ui.panel.config.core.section.core.analytics.documentation",
          "link",
          html`<a href="#"
            >https://www.home-assistant.io/integrations/analytics</a
          >`
        )}
      </p>
    `;
  }

  private _handleRowCheckboxClick(ev: Event) {
    const checkbox = ev.currentTarget as HaCheckbox;
    const preference = (checkbox as any).preference;

    if (checkbox.checked) {
      if (this.analytics.preferences.includes(preference)) {
        return;
      }
      this.analytics.preferences = [...this.analytics.preferences, preference];
    } else {
      this.analytics.preferences = this.analytics.preferences.filter(
        (entry) => entry !== preference
      );
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .error {
          color: var(--error-color);
        }

        ha-settings-row {
          padding: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-analytics": HaAnalytics;
  }
}
