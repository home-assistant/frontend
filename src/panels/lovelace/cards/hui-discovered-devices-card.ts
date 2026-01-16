import { mdiDevices } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-card";
import "../../../components/ha-ripple";
import "../../../components/ha-svg-icon";
import "../../../components/tile/ha-tile-icon";
import "../../../components/tile/ha-tile-info";
import {
  DISCOVERY_SOURCES,
  subscribeConfigFlowInProgress,
  type ConfigFlowInProgressMessage,
} from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { DiscoveredDevicesCardConfig } from "./types";

const ICON = mdiDevices;

@customElement("hui-discovered-devices-card")
export class HuiDiscoveredDevicesCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: DiscoveredDevicesCardConfig;

  @state() private _discoveredFlows: DataEntryFlowProgress[] = [];

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeConfigFlowInProgress(
        this.hass!,
        (messages: ConfigFlowInProgressMessage[]) => {
          if (messages.length === 0) {
            this._discoveredFlows = [];
            return;
          }

          let fullUpdate = false;
          const newFlows: DataEntryFlowProgress[] = [];

          messages.forEach((message) => {
            if (message.type === "removed") {
              this._discoveredFlows = this._discoveredFlows.filter(
                (flow) => flow.flow_id !== message.flow_id
              );
              return;
            }

            if (message.type === null || message.type === "added") {
              if (message.type === null) {
                fullUpdate = true;
              }
              // Only include flows from discovery sources
              if (DISCOVERY_SOURCES.includes(message.flow.context.source)) {
                newFlows.push(message.flow);
              }
            }
          });

          if (!newFlows.length && !fullUpdate) {
            return;
          }

          const existingFlows = fullUpdate ? [] : this._discoveredFlows;
          this._discoveredFlows = [...existingFlows, ...newFlows];
        }
      ),
    ];
  }

  public setConfig(config: DiscoveredDevicesCardConfig): void {
    this._config = {
      tap_action: {
        action: "navigate",
        navigation_path: "/config/integrations/dashboard",
      },
      ...config,
    };
  }

  public getCardSize(): number {
    return this._config?.vertical ? 2 : 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    const columns = 6;
    let min_columns = 6;
    let rows = 1;

    if (this._config?.vertical) {
      rows++;
      min_columns = 3;
    }
    return {
      columns,
      rows,
      min_columns,
      min_rows: rows,
    };
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  private get _hasCardAction() {
    return (
      hasAction(this._config?.tap_action) ||
      hasAction(this._config?.hold_action) ||
      hasAction(this._config?.double_tap_action)
    );
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this._config || !this.hass) {
      return;
    }

    // Update visibility based on admin status and discovered devices count
    const shouldBeHidden =
      !this.hass.user?.is_admin ||
      (this._config.hide_empty && this._discoveredFlows.length === 0);

    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass || this.hidden) {
      return nothing;
    }

    const count = this._discoveredFlows.length;

    const label = this.hass.localize("ui.card.discovered-devices.title");
    const secondary =
      count > 0
        ? this.hass.localize("ui.card.discovered-devices.count_devices", {
            count,
          })
        : this.hass.localize("ui.card.discovered-devices.no_devices");

    const contentClasses = { vertical: Boolean(this._config.vertical) };

    return html`
      <ha-card>
        <div
          class="background"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          })}
          role=${ifDefined(this._hasCardAction ? "button" : undefined)}
          tabindex=${ifDefined(this._hasCardAction ? "0" : undefined)}
          aria-labelledby="info"
        >
          <ha-ripple .disabled=${!this._hasCardAction}></ha-ripple>
        </div>
        <div class="container">
          <div class="content ${classMap(contentClasses)}">
            <ha-tile-icon>
              <ha-svg-icon slot="icon" .path=${ICON}></ha-svg-icon>
            </ha-tile-icon>
            <ha-tile-info
              id="info"
              .primary=${label}
              .secondary=${secondary}
            ></ha-tile-info>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --tile-color: var(--primary-color);
      -webkit-tap-highlight-color: transparent;
    }
    ha-card:has(.background:focus-visible) {
      --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
      --shadow-focus: 0 0 0 1px var(--tile-color);
      border-color: var(--tile-color);
      box-shadow: var(--shadow-default), var(--shadow-focus);
    }
    ha-card {
      --ha-ripple-color: var(--tile-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
      height: 100%;
      transition:
        box-shadow 180ms ease-in-out,
        border-color 180ms ease-in-out;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    [role="button"] {
      cursor: pointer;
      pointer-events: auto;
    }
    [role="button"]:focus {
      outline: none;
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      overflow: hidden;
    }
    .container {
      margin: calc(-1 * var(--ha-card-border-width, 1px));
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .content {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 10px;
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      pointer-events: none;
      gap: 10px;
    }

    .vertical {
      flex-direction: column;
      text-align: center;
      justify-content: center;
    }
    .vertical ha-tile-info {
      width: 100%;
      flex: none;
    }

    ha-tile-icon {
      --tile-icon-color: var(--tile-color);
      position: relative;
      padding: 6px;
      margin: -6px;
    }
    ha-tile-info {
      position: relative;
      min-width: 0;
      transition: background-color 180ms ease-in-out;
      box-sizing: border-box;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-discovered-devices-card": HuiDiscoveredDevicesCard;
  }
}
