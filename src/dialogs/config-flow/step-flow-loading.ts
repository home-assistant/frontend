import {
  LitElement,
  TemplateResult,
  html,
  css,
  customElement,
  CSSResult,
  property,
} from "lit-element";
import "@polymer/paper-spinner/paper-spinner-lite";

@customElement("step-flow-loading")
class StepFlowLoading extends LitElement {
  @property() public label?: string;

  protected render(): TemplateResult {
    return html`
      <div class="init-spinner">
        <div>
          ${this.label || ""}
        </div>
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-loading": StepFlowLoading;
  }
}
