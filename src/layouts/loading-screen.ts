import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  TemplateResult,
} from "lit-element";
import "../components/ha-spinner";

@customElement("loading-screen")
class LoadingScreen extends LitElement {
  protected render(): TemplateResult {
    return html` <ha-spinner active></ha-spinner> `;
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
