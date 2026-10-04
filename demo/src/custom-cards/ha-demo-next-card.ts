import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-card";
import "../../../src/components/ha-control-button";
import "../../../src/components/ha-control-button-group";
import "../../../src/components/tile/ha-tile-container";
import "../../../src/components/tile/ha-tile-icon";
import "../../../src/components/tile/ha-tile-info";
import type { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { tileCardStyle } from "../../../src/panels/lovelace/cards/tile/tile-card-style";
import type {
  LovelaceCard,
  LovelaceGridOptions,
} from "../../../src/panels/lovelace/types";
import {
  demos,
  selectedDemo,
  selectedDemoConfig,
} from "../configs/demo-configs";

@customElement("ha-demo-next-card")
export class HADemoNextCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: MockHomeAssistant;

  @state() private _switching = false;

  public getCardSize() {
    return 2;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 6,
      rows: 2,
      min_columns: 6,
      min_rows: 2,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public setConfig(_config: LovelaceCardConfig) {}

  protected render() {
    return html`
      <ha-card>
        <ha-tile-container>
          <ha-tile-icon slot="icon" icon="mdi:home-assistant"></ha-tile-icon>
          <ha-tile-info slot="info">
            <span slot="primary">
              ${until(
                selectedDemoConfig.then((conf) => conf.name),
                nothing
              )}
            </span>
            <span slot="secondary">
              ${this.hass.localize(
                "ui.panel.page-demo.cards.demo.interactive_demo"
              )}
            </span>
          </ha-tile-info>
          <ha-control-button-group slot="features">
            <ha-control-button
              .disabled=${this._switching}
              @click=${this._nextConfig}
            >
              ${this.hass.localize("ui.panel.page-demo.cards.demo.next_demo")}
            </ha-control-button>
          </ha-control-button-group>
        </ha-tile-container>
      </ha-card>
    `;
  }

  private _nextConfig() {
    this._switching = true;
    fireEvent(this, "set-demo-config" as any, {
      demo: demos[(demos.indexOf(selectedDemo) + 1) % demos.length],
    });
  }

  static styles = [
    tileCardStyle,
    css`
      :host {
        --tile-color: var(--primary-color);
      }
      ha-control-button-group {
        --control-button-group-spacing: 0;
        --control-button-group-thickness: var(--feature-height, 42px);
        padding: 0 var(--ha-space-3) var(--ha-space-3);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-demo-next-card": HADemoNextCard;
  }
}
