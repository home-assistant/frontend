import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-switch";
import type { HomeAssistant } from "../../../src/types";
import "../ha-demo-options";
import "./demo-more-info";

@customElement("demo-more-infos")
class DemoMoreInfos extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array }) public entities!: string[];

  @state() private _showConfig = false;

  render() {
    return html`
      <ha-demo-options>
        <ha-formfield label="Show config">
          <ha-switch @change=${this._showConfigToggled}> </ha-switch>
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
      margin: var(--ha-space-4) var(--ha-space-4) var(--ha-space-8);
    }
    ha-formfield {
      margin-right: var(--ha-space-4);
    }
  `;

  private _showConfigToggled(ev) {
    this._showConfig = ev.target.checked;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-infos": DemoMoreInfos;
  }
}
