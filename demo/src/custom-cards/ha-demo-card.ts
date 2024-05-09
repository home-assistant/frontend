import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import "../../../src/components/ha-card";
import "../../../src/components/ha-circular-progress";
import { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { Lovelace, LovelaceCard } from "../../../src/panels/lovelace/types";
import {
  demoConfigs,
  selectedDemoConfig,
  selectedDemoConfigIndex,
  setDemoConfig,
} from "../configs/demo-configs";

@customElement("ha-demo-card")
export class HADemoCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @state() private _switching = false;

  private _hidden = localStorage.hide_demo_card;

  public getCardSize() {
    return this._hidden ? 0 : 2;
  }

  public setConfig(_config: LovelaceCardConfig) {}

  protected render() {
    if (this._hidden) {
      return nothing;
    }
    return html`
      <ha-card>
        <div class="picker">
          <div class="label">
            ${this._switching
              ? html`
                  <ha-circular-progress indeterminate></ha-circular-progress>
                `
              : until(
                  selectedDemoConfig.then(
                    (conf) => html`
                      ${conf.name}
                      <small>
                        ${this.hass.localize(
                          "ui.panel.page-demo.cards.demo.demo_by",
                          {
                            name: html`
                              <a target="_blank" href=${conf.authorUrl}>
                                ${conf.authorName}
                              </a>
                            `,
                          }
                        )}
                      </small>
                    `
                  ),
                  ""
                )}
          </div>

          <mwc-button @click=${this._nextConfig} .disabled=${this._switching}>
            ${this.hass.localize("ui.panel.page-demo.cards.demo.next_demo")}
          </mwc-button>
        </div>
        <div class="content">
          <p class="small-hidden">
            ${this.hass.localize("ui.panel.page-demo.cards.demo.introduction")}
          </p>
          ${until(
            selectedDemoConfig.then((conf) => {
              if (typeof conf.description === "function") {
                return conf.description(this.hass.localize);
              }
              if (conf.description) {
                return html`<p>${conf.description}</p>`;
              }
              return nothing;
            }),
            nothing
          )}
        </div>
        <div class="actions small-hidden">
          <a href="https://www.home-assistant.io" target="_blank">
            <mwc-button>
              ${this.hass.localize("ui.panel.page-demo.cards.demo.learn_more")}
            </mwc-button>
          </a>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    if (this._hidden) {
      this.style.display = "none";
    }
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
      await setDemoConfig(this.hass, this.lovelace!, index);
    } catch (err: any) {
      alert("Failed to switch config :-(");
    } finally {
      this._switching = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        a {
          color: var(--primary-color);
          display: inline-block;
        }

        .actions a {
          text-decoration: none;
        }

        .content {
          padding: 0 16px;
        }

        .content p {
          margin: 16px 0;
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
          padding: 0px 8px 4px 8px;
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
