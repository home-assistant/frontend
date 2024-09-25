import { HassEntity } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeCssColor } from "../../../../common/color/compute-color";
import {
  hsv2rgb,
  rgb2hex,
  rgb2hsv,
} from "../../../../common/color/convert-color";
import { MediaQueriesListener } from "../../../../common/dom/media_query";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { stateActive } from "../../../../common/entity/state_active";
import { stateColorCss } from "../../../../common/entity/state_color";
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
import {
  attachConditionMediaQueriesListeners,
  checkConditionsMet,
} from "../../common/validate-condition";
import { DEFAULT_CONFIG } from "../../editor/heading-entity/hui-heading-entity-editor";
import type { HeadingEntityConfig } from "../types";

@customElement("hui-heading-entity")
export class HuiHeadingEntity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: HeadingEntityConfig | string;

  @property({ type: Boolean }) public preview = false;

  private _listeners: MediaQueriesListener[] = [];

  private _handleAction(ev: ActionHandlerEvent) {
    const config: HeadingEntityConfig = {
      tap_action: {
        action: "none",
      },
      ...this._config(this.config),
    };
    handleAction(this, this.hass!, config, ev.detail.action!);
  }

  private _config = memoizeOne(
    (configOrString: HeadingEntityConfig | string): HeadingEntityConfig => {
      const config =
        typeof configOrString === "string"
          ? { entity: configOrString }
          : configOrString;

      return {
        ...DEFAULT_CONFIG,
        tap_action: {
          action: "none",
        },
        ...config,
      };
    }
  );

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._clearMediaQueries();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._listenMediaQueries();
    this._updateVisibility();
  }

  protected update(changedProps: PropertyValues<typeof this>): void {
    super.update(changedProps);
    if (changedProps.has("hass") || changedProps.has("preview")) {
      this._updateVisibility();
    }
  }

  private _updateVisibility(forceVisible?: boolean) {
    const config = this._config(this.config);
    const visible =
      forceVisible ||
      this.preview ||
      !config.visibility ||
      checkConditionsMet(config.visibility, this.hass);
    this.toggleAttribute("hidden", !visible);
  }

  private _clearMediaQueries() {
    this._listeners.forEach((unsub) => unsub());
    this._listeners = [];
  }

  private _listenMediaQueries() {
    const config = this._config(this.config);
    if (!config?.visibility) {
      return;
    }
    const conditions = config.visibility;
    const hasOnlyMediaQuery =
      conditions.length === 1 &&
      conditions[0].condition === "screen" &&
      !!conditions[0].media_query;

    this._listeners = attachConditionMediaQueriesListeners(
      config.visibility,
      (matches) => {
        this._updateVisibility(hasOnlyMediaQuery && matches);
      }
    );
  }

  private _computeStateColor = memoizeOne(
    (entity: HassEntity, color?: string) => {
      if (!color || color === "none") {
        return undefined;
      }

      if (color === "state") {
        // Use light color if the light support rgb
        if (
          computeDomain(entity.entity_id) === "light" &&
          entity.attributes.rgb_color
        ) {
          const hsvColor = rgb2hsv(entity.attributes.rgb_color);

          // Modify the real rgb color for better contrast
          if (hsvColor[1] < 0.4) {
            // Special case for very light color (e.g: white)
            if (hsvColor[1] < 0.1) {
              hsvColor[2] = 225;
            } else {
              hsvColor[1] = 0.4;
            }
          }
          return rgb2hex(hsv2rgb(hsvColor));
        }
        // Fallback to state color
        return stateColorCss(entity);
      }

      if (color) {
        // Use custom color if active
        return stateActive(entity) ? computeCssColor(color) : undefined;
      }
      return color;
    }
  );

  protected render() {
    const config = this._config(this.config);

    const stateObj = this.hass!.states[config.entity];

    if (!stateObj) {
      return nothing;
    }

    const color = this._computeStateColor(stateObj, config.color);

    const actionable = hasAction(config.tap_action);

    const style = {
      "--color": color,
    };

    return html`
      <div
        class="entity"
        @action=${this._handleAction}
        .actionHandler=${actionHandler()}
        role=${ifDefined(actionable ? "button" : undefined)}
        tabindex=${ifDefined(actionable ? "0" : undefined)}
        style=${styleMap(style)}
      >
        ${config.show_icon
          ? html`
              <ha-state-icon
                .hass=${this.hass}
                .icon=${config.icon}
                .stateObj=${stateObj}
              ></ha-state-icon>
            `
          : nothing}
        ${config.show_state
          ? html`
              <state-display
                .hass=${this.hass}
                .stateObj=${stateObj}
                .content=${config.state_content}
              ></state-display>
            `
          : nothing}
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
        --state-inactive-color: initial;
      }
      .entity ha-state-icon {
        --ha-icon-display: block;
        color: var(--color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-entity": HuiHeadingEntity;
  }
}
