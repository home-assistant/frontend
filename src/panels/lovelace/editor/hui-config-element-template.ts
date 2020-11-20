import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-expansion-panel";
import { HomeAssistant } from "../../../types";
import { configElementStyle } from "./config-elements/config-elements-style";

@customElement("hui-config-element-template")
export class HuiConfigElementTemplate extends LitElement {
  public hass!: HomeAssistant;

  @property({ type: Boolean }) public isAdvanced? = false;

  protected render(): TemplateResult {
    return html`
      <slot></slot>
      ${this.isAdvanced
        ? html`
            <ha-expansion-panel>
              <span class="title" slot="title">
                ${this.hass.localize(
                  `ui.panel.lovelace.editor.common.advanced_options`
                )}
              </span>
              <slot name="advanced"></slot>
            </ha-expansion-panel>
          `
        : ""}
    `;
  }

  static get styles(): CSSResult {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-config-element-template": HuiConfigElementTemplate;
  }
}
