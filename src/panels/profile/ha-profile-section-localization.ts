import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../layouts/hass-subpage";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "./ha-pick-date-format-row";
import "./ha-pick-first-weekday-row";
import "./ha-pick-number-format-row";
import "./ha-pick-time-format-row";
import "./ha-pick-time-zone-row";

@customElement("ha-profile-section-localization")
class HaProfileSectionLocalization extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/profile"
        .header=${this.hass.localize("ui.panel.profile.localization_header")}
      >
        <div class="content">
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.profile.localization_header"
            )}
          >
            <div class="card-content">
              ${this.hass.localize("ui.panel.profile.localization_detail")}
            </div>
            <ha-pick-time-zone-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-time-zone-row>
            <ha-pick-number-format-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-number-format-row>
            <ha-pick-time-format-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-time-format-row>
            <ha-pick-date-format-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-date-format-row>
            <ha-pick-first-weekday-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-first-weekday-row>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: var(--safe-area-inset-bottom);
        }

        .content > * {
          display: block;
          margin: 24px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-profile-section-localization": HaProfileSectionLocalization;
  }
}
