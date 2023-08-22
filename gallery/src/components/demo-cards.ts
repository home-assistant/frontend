import { html, css, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-switch";
import { HomeAssistant } from "../../../src/types";
import "./demo-card";
import type { DemoCardConfig } from "./demo-card";
import "../ha-demo-options";

@customElement("demo-cards")
class DemoCards extends LitElement {
  @property() public configs!: DemoCardConfig[];

  @property() public hass!: HomeAssistant;

  @state() private _showConfig = false;

  @query("#container") private _container!: HTMLElement;

  render() {
    return html`
      <ha-demo-options>
        <ha-formfield label="Show config">
          <ha-switch @change=${this._showConfigToggled}> </ha-switch>
        </ha-formfield>
        <ha-formfield label="Dark theme">
          <ha-switch @change=${this._darkThemeToggled}> </ha-switch>
        </ha-formfield>
      </ha-demo-options>
      <div id="container">
        <div class="cards">
          ${this.configs.map(
            (config) => html`
              <demo-card
                .config=${config}
                .showConfig=${this._showConfig}
                .hass=${this.hass}
              ></demo-card>
            `
          )}
        </div>
      </div>
    `;
  }

  _showConfigToggled(ev) {
    this._showConfig = ev.target.checked;
  }

  _darkThemeToggled(ev) {
    applyThemesOnElement(this._container, { themes: {} } as any, "default", {
      dark: ev.target.checked,
    });
  }

  static styles = css`
    .cards {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }
    demo-card {
      margin: 16px 16px 32px;
    }
    ha-formfield {
      margin-right: 16px;
    }
    #container {
      background-color: var(--primary-background-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-cards": DemoCards;
  }
}
