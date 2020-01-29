import "@polymer/paper-spinner/paper-spinner-lite";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  customElement,
  CSSResult,
} from "lit-element";

@customElement("loading-screen")
class LoadingScreen extends LitElement {
  protected render(): TemplateResult {
    return html`
      <paper-spinner-lite active></paper-spinner-lite>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "loading-screen": LoadingScreen;
  }
}
