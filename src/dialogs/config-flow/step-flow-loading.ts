import "@polymer/paper-spinner/paper-spinner-lite";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

@customElement("step-flow-loading")
class StepFlowLoading extends LitElement {
  @property() public label?: string;

  protected render(): TemplateResult {
    return html`
      <div class="init-spinner">
        ${this.label ? html` <div>${this.label}</div> ` : ""}
        <paper-spinner-lite active></paper-spinner-lite>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .init-spinner {
        padding: 50px 100px;
        text-align: center;
      }
      paper-spinner-lite {
        margin-top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-loading": StepFlowLoading;
  }
}
