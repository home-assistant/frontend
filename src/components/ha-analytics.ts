import "./ha-help-tooltip";
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
import { haStyle } from "../resources/styles";
import type { HaCheckbox } from "./ha-checkbox";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { Analytics, AnalyticsPrefrence } from "../data/analytics";
import { fireEvent } from "../common/dom/fire_event";
import { documentationUrl } from "../util/documentation-url";

const ADDITIONAL_PREFERENCES: AnalyticsPrefrence[] = ["usage", "statistics"];

declare global {
  interface HASSDomEvents {
    "analytics-preferences-changed": { preferences: Analytics["preferences"] };
  }
}

@customElement("ha-analytics")
export class HaAnalytics extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public analytics!: Analytics;

  protected render(): TemplateResult {
    if (!this.analytics.huuid) {
      return html``;
    }

    const enabled = this.analytics.preferences.includes("base");

    return html`
      <p>
        ${this.hass.localize(
          "ui.panel.config.core.section.core.analytics.instance_id",
          "huuid",
          this.analytics.huuid
        )}
      </p>
      <ha-settings-row>
        <span slot="prefix">
          <ha-checkbox
            @change=${this._handleRowCheckboxClick}
            .checked=${enabled}
            .preference=${"base"}
          >
          </ha-checkbox>
        </span>
        <span slot="heading">
          ${this.hass.localize(
            `ui.panel.config.core.section.core.analytics.preference.base.title`
          )}
        </span>
        <span slot="description">
          ${this.hass.localize(
            `ui.panel.config.core.section.core.analytics.preference.base.description`
          )}
        </span>
      </ha-settings-row>
      ${ADDITIONAL_PREFERENCES.map(
        (preference) =>
          html`<ha-settings-row>
            <span slot="prefix">
              <ha-checkbox
                @change=${this._handleRowCheckboxClick}
                .checked=${this.analytics.preferences.includes(preference)}
                .preference=${preference}
                .disabled=${!enabled}
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
              ${!enabled
                ? html`<ha-help-tooltip
                    .title=${this.hass.localize(
                      "ui.panel.config.core.section.core.analytics.needs_base"
                    )}
                  ></ha-help-tooltip>`
                : ""}
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
      )}
      <ha-settings-row>
        <span slot="prefix">
          <ha-checkbox
            @change=${this._handleRowCheckboxClick}
            .checked=${this.analytics.preferences.includes("diagnostics")}
            .preference=${"diagnostics"}
          >
          </ha-checkbox>
        </span>
        <span slot="heading">
          ${this.hass.localize(
            `ui.panel.config.core.section.core.analytics.preference.diagnostics.title`
          )}
        </span>
        <span slot="description">
          ${this.hass.localize(
            `ui.panel.config.core.section.core.analytics.preference.diagnostics.description`
          )}
        </span>
      </ha-settings-row>
      <p>
        ${this.hass.localize(
          "ui.panel.config.core.section.core.analytics.documentation",
          "link",
          html`<a
            .href=${documentationUrl(this.hass, "/integrations/analytics/")}
          >
            ${documentationUrl(this.hass, "/integrations/analytics/")}
          </a>`
        )}
      </p>
    `;
  }

  private _handleRowCheckboxClick(ev: Event) {
    const checkbox = ev.currentTarget as HaCheckbox;
    const preference = (checkbox as any).preference;
    let preferences = [...(this.analytics.preferences || [])];

    if (checkbox.checked) {
      if (preferences.includes(preference)) {
        return;
      }
      preferences.push(preference);
    } else {
      preferences = preferences.filter((entry) => entry !== preference);
    }

    fireEvent(this, "analytics-preferences-changed", { preferences });
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
