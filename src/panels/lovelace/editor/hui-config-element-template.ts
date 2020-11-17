import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-expansion-panel";

@customElement("hui-config-element-template")
export class HuiConfigElementTemplate extends LitElement {
  @property({ type: Boolean }) public isAdvanced? = false;

  protected render(): TemplateResult {
    return html`
      <slot></slot>
      ${this.isAdvanced
        ? html`
            <ha-expansion-panel>
              <span class="advanced-title" slot="title">Advanced options</span>
              <slot name="advanced"></slot>
            </ha-expansion-panel>
          `
        : ""}
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-expansion-panel {
        padding-top: 8px;
      }
      .advanced-title {
        font-size: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-config-element-template": HuiConfigElementTemplate;
  }
}
