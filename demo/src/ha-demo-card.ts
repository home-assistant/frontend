import {
  LitElement,
  html,
  CSSResult,
  css,
  PropertyDeclarations,
} from "lit-element";
import "@polymer/paper-icon-button";
import "../../src/components/ha-card";
import { LovelaceCard, Lovelace } from "../../src/panels/lovelace/types";
import { LovelaceCardConfig, LovelaceConfig } from "../../src/data/lovelace";
import { placeholder1Config } from "./lovelace_configs/placeholder1";
import { placeholder2Config } from "./lovelace_configs/placeholder2";
import { DemoLovelaceConfig } from "./lovelace_configs/types";

const configs: DemoLovelaceConfig[] = [placeholder1Config, placeholder2Config];

configs.forEach((conf, idx) => {
  conf.demoIndex = idx;
});

export class HADemoCard extends LitElement implements LovelaceCard {
  public lovelace?: Lovelace;

  private _selectedConfig: number;

  constructor() {
    super();
    this._selectedConfig = 0;
  }

  static get properties(): PropertyDeclarations {
    return {
      _selectedConfig: {},
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

  protected firstUpdated() {
    this._selectedConfig = (this.lovelace!
      .config as DemoLovelaceConfig).demoIndex!;
  }

  protected render() {
    const config = configs[this._selectedConfig];
    return html`
      <ha-card header="Welcome Home!">
        <div class="content">
          Welcome to the Home Assistant Demo. Explore how to configure the UI or
          try out one of our pre-made configurations.
        </div>
        <ul>
          <li>
            <a href="https://www.home-assistant.io/" target="_blank">
              About Home Assistant
            </a>
          </li>
          <li>
            <a
              href="https://www.home-assistant.io/getting-started/"
              target="_blank"
            >
              Installation instructions
            </a>
          </li>
        </ul>
        <div class="content">
          The community has prepared a couple of configurations for you to try
          out. Click the arrows to try them out.
        </div>
        <div class="picker">
          <paper-icon-button
            @click=${this._prevConfig}
            icon="hass:chevron-right"
            style="transform: rotate(180deg)"
          ></paper-icon-button>
          <div>
            ${config.demoConfigName}
            <small>
              by
              <a target="_blank" href="${config.demoAuthorUrl}">
                ${config.demoAuthorName}
              </a>
            </small>
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
    this._selectedConfig =
      this._selectedConfig > 0 ? this._selectedConfig - 1 : configs.length - 1;
    this.lovelace!.saveConfig(configs[this._selectedConfig]);
  }

  private _nextConfig() {
    this._selectedConfig =
      this._selectedConfig < configs.length - 1 ? this._selectedConfig + 1 : 0;
    this.lovelace!.saveConfig(configs[this._selectedConfig]);
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
