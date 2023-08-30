import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../src/components/ha-card";
import "../../../src/dialogs/more-info/more-info-content";
import "../../../src/state-summary/state-card-content";
import "../ha-demo-options";
import { HomeAssistant } from "../../../src/types";

@customElement("demo-more-info")
class DemoMoreInfo extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public showConfig!: boolean;

  render() {
    const state = this._getState(this.entityId, this.hass.states);
    return html`
      <div class="root">
        <div id="card">
          <ha-card>
            <state-card-content
              .stateObj=${state}
              .hass=${this.hass}
              in-dialog
            ></state-card-content>

            <more-info-content
              .hass=${this.hass}
              .stateObj=${state}
            ></more-info-content>
          </ha-card>
        </div>
        ${this.showConfig ? html`<pre>${this._jsonEntity(state)}</pre>` : ""}
      </div>
    `;
  }

  private _getState(entityId, states) {
    return states[entityId];
  }

  private _jsonEntity(stateObj) {
    // We are caching some things on stateObj
    // (it sucks, we will remove in the future)
    const tmp = {};
    Object.keys(stateObj).forEach((key) => {
      if (key[0] !== "_") {
        tmp[key] = stateObj[key];
      }
    });
    return JSON.stringify(tmp, null, 2);
  }

  static styles = css`
    .root {
      display: flex;
    }
    #card {
      max-width: 400px;
      width: 100vw;
    }
    ha-card {
      width: 352px;
      padding: 20px 24px;
    }
    state-card-content {
      display: block;
      margin-bottom: 16px;
    }
    pre {
      width: 400px;
      margin: 0 16px;
      overflow: auto;
      color: var(--primary-text-color);
    }
    @media only screen and (max-width: 800px) {
      .root {
        flex-direction: column;
      }
      pre {
        margin: 16px 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-more-info": DemoMoreInfo;
  }
}
