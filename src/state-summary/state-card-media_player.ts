import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../common/decorators/consume";
import { transform } from "../common/decorators/transform";
import "../components/entity/state-info";
import { apiContext, formattersContext } from "../data/context";
import HassMediaPlayerEntity from "../util/hass-media-player-model";
import type { HomeAssistantApi, HomeAssistantFormatters } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-media_player")
class StateCardMediaPlayer extends LitElement {
  @state()
  @consume({ context: formattersContext, subscribe: true })
  @transform<
    HomeAssistantFormatters,
    HomeAssistantFormatters["formatEntityState"] | undefined
  >({
    transformer: (formatters) => formatters?.formatEntityState,
  })
  private _formatEntityState?: HomeAssistantFormatters["formatEntityState"];

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    const playerObj = new HassMediaPlayerEntity(
      this._api.callService,
      this.stateObj
    );
    return html`
      <div class="horizontal justified layout">
        <state-info
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="state">
          <div class="main-text" take-height=${!playerObj.secondaryTitle}>
            ${this._computePrimaryText(playerObj)}
          </div>
          <div class="secondary-text">${playerObj.secondaryTitle}</div>
        </div>
      </div>
    `;
  }

  private _computePrimaryText(playerObj: HassMediaPlayerEntity) {
    return (
      playerObj.primaryTitle || this._formatEntityState?.(playerObj.stateObj)
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          line-height: var(--ha-line-height-normal);
        }

        .state {
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
          text-align: var(--float-end);
        }

        .main-text {
          color: var(--primary-text-color);
        }

        .main-text[take-height] {
          line-height: 40px;
        }

        .secondary-text {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-media_player": StateCardMediaPlayer;
  }
}
