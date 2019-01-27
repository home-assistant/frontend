import {
  LitElement,
  html,
  CSSResult,
  css,
  PropertyDeclarations,
} from "lit-element";
import { until } from "lit-html/directives/until";
import "@polymer/paper-icon-button";
import "@polymer/paper-button";
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
          <paper-icon-button
            @click=${this._prevConfig}
            icon="hass:chevron-right"
            style="transform: rotate(180deg)"
            .disabled=${this._switching}
          ></paper-icon-button>
          <div>
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
          <paper-icon-button
            @click=${this._nextConfig}
            icon="hass:chevron-right"
            .disabled=${this._switching}
          ></paper-icon-button>
        </div>
        <div class="content">
          Welcome home! You've reached the Home Assistant demo where we showcase
          the best UIs created by our community.
        </div>
        <div class="actions">
          <a href="https://www.home-assistant.io" target="_blank">
            <paper-button>Learn more about Home Assistant</paper-button>
          </a>
        </div>
      </ha-card>
    `;
  }

  private _prevConfig() {
    this._updateConfig(
      selectedDemoConfigIndex > 0
        ? selectedDemoConfigIndex - 1
        : demoConfigs.length - 1
    );
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

        .content {
          padding: 16px;
        }

        .picker {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 60px;
        }

        .picker div {
          text-align: center;
        }

        .picker small {
          display: block;
        }

        .actions {
          padding-left: 5px;
        }

        .actions paper-button {
          color: var(--primary-color);
          font-weight: 500;
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
