import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import type { HomeAssistant } from "../../../types";
import "../ha-config-section";
import "./ha-config-core-form";
import "./ha-config-name-form";
import "./ha-config-url-form";

@customElement("ha-config-section-core")
export class HaConfigSectionCore extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean, attribute: "narrow", reflect: true })
  public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-config-section .isWide=${this.isWide}>
        <div slot="header">
          ${this.hass.localize("ui.panel.config.core.section.core.header")}
        </div>
        <div slot="introduction">
          ${this.hass.localize(
            "ui.panel.config.core.section.core.introduction"
          )}
        </div>
        <div class="content">
          <ha-config-name-form .hass=${this.hass}></ha-config-name-form>
          <ha-config-url-form .hass=${this.hass}></ha-config-url-form>
          <ha-config-core-form .hass=${this.hass}></ha-config-core-form>
        </div>
      </ha-config-section>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .content {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
      }

      ha-config-name-form,
      ha-config-url-form {
        width: calc(50% - 12px);
      }

      :host([narrow]) ha-config-url-form,
      ha-config-core-form {
        margin-top: 24px;
        width: 100%;
      }

      :host([narrow]) ha-config-name-form {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-core": HaConfigSectionCore;
  }
}
