import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-switch";
import "./demo-more-info";
import "../ha-demo-options";
import { HomeAssistant } from "../../../src/types";

@customElement("demo-more-infos")
class DemoMoreInfos extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public entities!: [];

  @property({ attribute: false }) _showConfig: boolean = false;

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
          ${this.entities.map(
            (item) =>
              html`<demo-more-info
                .entityId=${item}
                .showConfig=${this._showConfig}
                .hass=${this.hass}
              ></demo-more-info>`
          )}
        </div>
      </div>
    `;
  }

  static styles = css`
    #container {
      min-height: calc(100vh - 128px);
      background: var(--primary-background-color);
    }
    .cards {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
    }
    demo-more-info {
      margin: 16px 16px 32px;
    }
    ha-formfield {
      margin-right: 16px;
    }
  `;

  _showConfigToggled(ev) {
    this._showConfig = ev.target.checked;
  }

  _darkThemeToggled(ev) {
    applyThemesOnElement(
      this.shadowRoot!.querySelector("#container"),
      {
        default_theme: "default",
        default_dark_theme: "default",
        themes: {},
        darkMode: false,
        theme: "default",
      },
      "default",
      {
        dark: ev.target.checked,
      }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-infos": DemoMoreInfos;
  }
}
