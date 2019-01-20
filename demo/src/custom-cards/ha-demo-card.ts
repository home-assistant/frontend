import { LitElement, html, CSSResult, css } from "lit-element";
import { until } from "lit-html/directives/until";
import "@polymer/paper-icon-button";
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
      <ha-card header="Home Assistant Demo Switcher">
        <div class="picker">
          <paper-icon-button
            @click=${this._prevConfig}
            icon="hass:chevron-right"
            style="transform: rotate(180deg)"
          ></paper-icon-button>
          <div>
            ${
              until(
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
              )
            }
          </div>
          <paper-icon-button
            @click=${this._nextConfig}
            icon="hass:chevron-right"
          ></paper-icon-button>
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

  private _updateConfig(index: number) {
    setDemoConfig(this.hass!, this.lovelace!, index);
  }

  static get styles(): CSSResult[] {
    return [
      css`
        .content {
          padding: 0 16px;
        }

        ul {
          margin-top: 0;
          margin-bottom: 0;
          padding: 16px 16px 16px 38px;
        }

        li {
          padding: 8px 0;
        }

        li:first-child {
          margin-top: -8px;
        }

        li:last-child {
          margin-bottom: -8px;
        }

        a {
          color: var(--primary-color);
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
