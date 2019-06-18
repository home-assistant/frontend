import {
  LitElement,
  html,
  CSSResult,
  css,
  PropertyDeclarations,
} from "lit-element";
import { until } from "lit-html/directives/until";
import "@material/mwc-button";
import "@polymer/paper-spinner/paper-spinner-lite";
import "../../../src/components/ha-card";
import { LovelaceCard, Lovelace } from "../../../src/panels/lovelace/types";
import { LovelaceCardConfig } from "../../../src/data/lovelace";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import {
  demoConfigs,
  selectedDemoConfig,
  setDemoConfig,
  selectedDemoConfigIndex,
} from "../configs/demo-configs";

export class HADemoCard extends LitElement implements LovelaceCard {
  public lovelace?: Lovelace;
  public hass?: MockHomeAssistant;
  private _switching?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      lovelace: {},
      hass: {},
      _switching: {},
    };
  }

  public getCardSize() {
    return 2;
  }

  public setConfig(
    // @ts-ignore
    config: LovelaceCardConfig
    // tslint:disable-next-line:no-empty
  ) {}

  protected render() {
    return html`
      <ha-card>
        <div class="picker">
          <div class="label">
            ${this._switching
              ? html`
                  <paper-spinner-lite active></paper-spinner-lite>
                `
              : until(
                  selectedDemoConfig.then(
                    (conf) => html`
                      ${conf.name}
                      <small>
                        by
                        <a target="_blank" href="${conf.authorUrl}">
                          ${conf.authorName}
                        </a>
                      </small>
                    `
                  ),
                  ""
                )}
          </div>
          <mwc-button @click=${this._nextConfig} .disabled=${this._switching}>
            Next demo
          </mwc-button>
        </div>
        <div class="content small-hidden">
          Welcome home! You've reached the Home Assistant demo where we showcase
          the best UIs created by our community.
        </div>
        <div class="actions small-hidden">
          <a href="https://www.home-assistant.io" target="_blank">
            <mwc-button>Learn more about Home Assistant</mwc-button>
          </a>
        </div>
      </ha-card>
    `;
  }

  private _nextConfig() {
    this._updateConfig(
      selectedDemoConfigIndex < demoConfigs.length - 1
        ? selectedDemoConfigIndex + 1
        : 0
    );
  }

  private async _updateConfig(index: number) {
    this._switching = true;
    try {
      await setDemoConfig(this.hass!, this.lovelace!, index);
    } catch (err) {
      alert("Failed to switch config :-(");
    } finally {
      this._switching = false;
    }
  }

  static get styles(): CSSResult[] {
    return [
      css`
        a {
          color: var(--primary-color);
        }

        .actions a {
          text-decoration: none;
        }

        .content {
          padding: 16px;
        }

        .picker {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 60px;
        }

        .picker mwc-button {
          margin-right: 8px;
        }

        .label {
          padding-left: 16px;
        }

        .label small {
          display: block;
        }

        .actions {
          padding-left: 8px;
        }

        @media only screen and (max-width: 500px) {
          .small-hidden {
            display: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-demo-card": HADemoCard;
  }
}

customElements.define("ha-demo-card", HADemoCard);
