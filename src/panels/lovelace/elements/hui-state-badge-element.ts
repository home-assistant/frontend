import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/ha-state-label-badge";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-warning-element";
import type { LovelacePictureElementEditor } from "../types";
import type {
  LovelaceElement,
  LovelaceElementHitInfo,
  StateBadgeElementConfig,
} from "./types";

@customElement("hui-state-badge-element")
export class HuiStateBadgeElement
  extends LitElement
  implements LovelaceElement
{
  public static async getConfigElement(): Promise<LovelacePictureElementEditor> {
    await import("../editor/config-elements/elements/hui-state-badge-element-editor");
    return document.createElement("hui-state-badge-element-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): StateBadgeElementConfig {
    const includeDomains = ["light", "switch", "sensor"];
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean =>
      stateObj.state !== UNAVAILABLE && stateObj.state !== UNKNOWN;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return { type: "state-badge", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  // Pointer gestures are delegated to the picture-elements card's routing;
  // this element keeps keyboard activation (see LovelaceElement).
  public delegatedActions = false;

  @state() private _config?: StateBadgeElementConfig;

  public constructor() {
    super();
    // Listen on the host so both the own (keyboard) gesture path and an
    // action delegated by the picture-elements card land here.
    this.addEventListener("action", (ev) =>
      this._handleAction(ev as ActionHandlerEvent)
    );
  }

  public getHitInfo(): LovelaceElementHitInfo | null {
    if (!this._config || !this.hass?.states[this._config.entity!]) {
      return null;
    }
    const options = {
      hasTap: hasAction(this._config.tap_action),
      hasHold: hasAction(this._config.hold_action),
      hasDoubleClick: hasAction(this._config.double_tap_action),
    };
    if (!options.hasTap && !options.hasHold && !options.hasDoubleClick) {
      return null;
    }
    return { rect: this.getBoundingClientRect(), options };
  }

  public setConfig(config: StateBadgeElementConfig): void {
    if (!config.entity) {
      throw Error("Entity required");
    }

    this._config = {
      tap_action: { action: "more-info" },
      hold_action: { action: "more-info" },
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity!];

    if (!stateObj) {
      return html`
        <hui-warning-element
          .label=${createEntityNotFoundWarning(this.hass, this._config.entity!)}
        ></hui-warning-element>
      `;
    }

    return html`
      <ha-state-label-badge
        .state=${stateObj}
        .name=${this._config.name === undefined
          ? computeStateName(stateObj)
          : this._config.name === null
            ? ""
            : this._config.name}
        .title=${this._config.title === undefined
          ? computeStateName(stateObj)
          : this._config.title === null
            ? ""
            : this._config.title}
        show-name
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
          keyboardOnly: this.delegatedActions || undefined,
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      ></ha-state-label-badge>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-badge-element": HuiStateBadgeElement;
  }
}
