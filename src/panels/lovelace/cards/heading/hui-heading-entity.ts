import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-state-icon";
import { ActionHandlerEvent } from "../../../../data/lovelace/action_handler";
import "../../../../state-display/state-display";
import { HomeAssistant } from "../../../../types";
import { actionHandler } from "../../common/directives/action-handler-directive";
import { handleAction } from "../../common/handle-action";
import { hasAction } from "../../common/has-action";
import type { HeadingEntityConfig } from "../types";

@customElement("hui-heading-entity")
export class HuiHeadingEntity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: HeadingEntityConfig | string;

  private _handleAction(ev: ActionHandlerEvent) {
    const config = this._config(this.config);
    handleAction(this, this.hass!, config, ev.detail.action!);
  }

  private _config = memoizeOne(
    (config: HeadingEntityConfig | string): HeadingEntityConfig => {
      if (typeof config === "string") {
        return { entity: config };
      }
      return config;
    }
  );

  protected render() {
    const config = this._config(this.config);

    const stateObj = this.hass!.states[config.entity];

    if (!stateObj) {
      return nothing;
    }

    const actionable = hasAction(config.tap_action || { action: "none" });

    return html`
      <div
        class="entity"
        @action=${this._handleAction}
        .actionHandler=${actionHandler()}
        role=${ifDefined(actionable ? "button" : undefined)}
        tabindex=${ifDefined(actionable ? "0" : undefined)}
      >
        <ha-state-icon
          .hass=${this.hass}
          .icon=${config.icon}
          .stateObj=${stateObj}
        ></ha-state-icon>
        <state-display
          .hass=${this.hass}
          .stateObj=${stateObj}
          .content=${config.content || "state"}
        ></state-display>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      [role="button"] {
        cursor: pointer;
      }
      .entity {
        display: flex;
        flex-direction: row;
        white-space: nowrap;
        align-items: center;
        gap: 3px;
        color: var(--secondary-text-color);
        font-family: Roboto;
        font-size: 14px;
        font-style: normal;
        font-weight: 500;
        line-height: 20px; /* 142.857% */
        letter-spacing: 0.1px;
        --mdc-icon-size: 14px;
      }
      .entity ha-state-icon {
        --ha-icon-display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-entity": HuiHeadingEntity;
  }
}
