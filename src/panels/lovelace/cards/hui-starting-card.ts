import type { HassConfig } from "home-assistant-js-websocket";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/animation/ha-fade-in";
import "../../../components/ha-card";
import "../../../components/ha-spinner";
import { configContext } from "../../../data/context";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistantConfig } from "../../../types";
import type { LovelaceCard } from "../types";

@customElement("hui-starting-card")
export class HuiStartingCard extends LitElement implements LovelaceCard {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig?: HassConfig;

  public getCardSize(): number {
    return 2;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public setConfig(_config: LovelaceCardConfig): void {}

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!changedProperties.has("_hassConfig") || !this._hassConfig) {
      return;
    }

    if (this._hassConfig.state !== STATE_NOT_RUNNING) {
      fireEvent(this, "config-refresh");
    }
  }

  protected render() {
    return html`
      <div class="content">
        <ha-fade-in .delay=${500}>
          <ha-spinner></ha-spinner>
        </ha-fade-in>
        ${this._localize("ui.panel.lovelace.cards.starting.description")}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: calc(100vh - var(--header-height));
    }
    ha-spinner {
      margin-bottom: 20px;
    }
    .content {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-starting-card": HuiStartingCard;
  }
}
