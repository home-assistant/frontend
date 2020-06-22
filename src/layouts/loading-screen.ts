import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  TemplateResult,
} from "lit-element";
import "../components/ha-circular-progress";

@customElement("loading-screen")
class LoadingScreen extends LitElement {
  protected render(): TemplateResult {
    return html` <ha-circular-progress active></ha-circular-progress> `;
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
