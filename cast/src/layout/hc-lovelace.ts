import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  CSSResult,
  css,
  property,
} from "lit-element";
import { LovelaceConfig } from "../../../src/data/lovelace";
import "../../../src/panels/lovelace/hui-view";
import { HomeAssistant } from "../../../src/types";
import { Lovelace } from "../../../src/panels/lovelace/types";

@customElement("hc-lovelace")
class HcLovelace extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public lovelaceConfig!: LovelaceConfig;
  @property() public viewPath?: string;

  protected render(): TemplateResult | void {
    const index = this.lovelaceConfig.views.findIndex(
      (view) => view.path === this.viewPath
    );
    if (index === -1) {
      return html`
        <h1>Error: Unable to find a view with path ${this.viewPath}</h1>
      `;
    }
    const lovelace: Lovelace = {
      config: this.lovelaceConfig,
      editMode: false,
      enableFullEditMode: () => undefined,
      mode: "storage",
      language: "en",
      saveConfig: async () => undefined,
      setEditMode: () => undefined,
    };
    return html`
      <hui-view
        .hass=${this.hass}
        .lovelace=${lovelace}
        .index=${index}
        columns="2"
      ></hui-view>
    `;
  }

  static get styles(): CSSResult {
    // We're applying a 10% transform so it all shows a little bigger.
    return css`
      :host {
        background-color: #e5e5e5;
      }
      hui-view {
        width: 90vw;
        margin: 0 auto;
        height: 90vh;
        transform: scale(1.1);
        margin-top: 5vh;
        padding: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-lovelace": HcLovelace;
  }
}
