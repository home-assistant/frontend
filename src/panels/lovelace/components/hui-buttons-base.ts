import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state, property } from "lit/decorators";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/state-badge";
import type { ActionHandlerEvent } from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import type { EntitiesCardEntityConfig } from "../cards/types";
import { computeTooltip } from "../common/compute-tooltip";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import "../../../components/ha-chip";
import { haStyleScrollbar } from "../../../resources/styles";

@customElement("hui-buttons-base")
export class HuiButtonsBase extends LitElement {
  @state() public hass!: HomeAssistant;

  @property() public configEntities?: EntitiesCardEntityConfig[];

  protected render(): TemplateResult {
    return html`
      <div class="ha-scrollbar">
        ${(this.configEntities || []).map((entityConf) => {
          const stateObj = this.hass.states[entityConf.entity];

          const name =
            (entityConf.show_name && stateObj) ||
            (entityConf.name && entityConf.show_name !== false)
              ? entityConf.name || computeStateName(stateObj)
              : "";

          return html`
            <ha-chip
              @action=${this._handleAction}
              .actionHandler=${actionHandler({
                hasHold: hasAction(entityConf.hold_action),
                hasDoubleClick: hasAction(entityConf.double_tap_action),
              })}
              .config=${entityConf}
              tabindex="0"
              .hasIcon=${entityConf.show_icon !== false}
              .noText=${!name}
            >
              ${entityConf.show_icon !== false
                ? html`
                    <state-badge
                      title=${computeTooltip(this.hass, entityConf)}
                      .hass=${this.hass}
                      .stateObj=${stateObj}
                      .overrideIcon=${entityConf.icon}
                      .overrideImage=${entityConf.image}
                      class=${name ? "" : "no-text"}
                      stateColor
                      slot="icon"
                    ></state-badge>
                  `
                : ""}
              ${name}
            </ha-chip>
          `;
        })}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    const config = (ev.currentTarget as any).config as EntitiesCardEntityConfig;
    handleAction(this, this.hass, config, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        .ha-scrollbar {
          padding: 8px;
          padding-top: var(--padding-top, 8px);
          padding-bottom: var(--padding-bottom, 8px);
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          box-sizing: border-box;
          display: flex;
          flex-wrap: wrap;
        }
        state-badge {
          display: inline-flex;
          line-height: inherit;
          color: var(--secondary-text-color);
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          margin-left: -4px;
          margin-top: -2px;
        }
        state-badge.no-text {
          width: 26px;
          height: 26px;
          margin-left: -3px;
          margin-top: -3px;
        }
        ha-chip {
          padding: 4px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          .ha-scrollbar {
            flex-wrap: nowrap;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-buttons-base": HuiButtonsBase;
  }
}
