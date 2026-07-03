import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { computeTooltip } from "../common/compute-tooltip";
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
  StateLabelElementConfig,
} from "./types";

@customElement("hui-state-label-element")
class HuiStateLabelElement extends LitElement implements LovelaceElement {
  public static async getConfigElement(): Promise<LovelacePictureElementEditor> {
    await import("../editor/config-elements/elements/hui-state-label-element-editor");
    return document.createElement("hui-state-label-element-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): StateLabelElementConfig {
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

    return { type: "state-label", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  // Pointer gestures are delegated to the picture-elements card's routing;
  // this element keeps keyboard activation (see LovelaceElement).
  public delegatedActions = false;

  @state() private _config?: StateLabelElementConfig;

  @query("div") private _content?: HTMLDivElement;

  public constructor() {
    super();
    // Listen on the host so both the own (keyboard) gesture path and an
    // action delegated by the picture-elements card land here.
    this.addEventListener("action", (ev) =>
      this._handleAction(ev as ActionHandlerEvent)
    );
  }

  public setConfig(config: StateLabelElementConfig): void {
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

    if (
      this._config.attribute &&
      !(this._config.attribute in stateObj.attributes)
    ) {
      return html`
        <hui-warning-element
          label=${this.hass.localize(
            "ui.panel.lovelace.warning.attribute_not_found",
            { attribute: this._config.attribute, entity: this._config.entity }
          )}
        ></hui-warning-element>
      `;
    }

    return html`
      <div
        .title=${computeTooltip(this.hass, this._config)}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
          keyboardOnly: this.delegatedActions || undefined,
        })}
        tabindex=${ifDefined(
          hasAction(this._config.tap_action) ? "0" : undefined
        )}
      >
        ${this._config.prefix}${!this._config.attribute
          ? this.hass.formatEntityState(stateObj)
          : stateObj.attributes[this._config.attribute]}${this._config.suffix}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  // The visible text's bounds (excluding the padded host box), so routing
  // only claims the text the label shows; null while a warning is rendered.
  public getHitInfo(): LovelaceElementHitInfo | null {
    if (!this._config || !this.hass || !this._content) {
      return null;
    }
    const stateObj = this.hass.states[this._config.entity!];
    if (
      !stateObj ||
      (this._config.attribute &&
        !(this._config.attribute in stateObj.attributes))
    ) {
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
    const range = document.createRange();
    range.selectNodeContents(this._content);
    return { rect: range.getBoundingClientRect(), isText: true, options };
  }

  static styles = css`
    :host {
      cursor: pointer;
    }
    div {
      padding: 8px;
      white-space: nowrap;
    }
    div:focus {
      outline: none;
      background: var(--divider-color);
      border-radius: var(--ha-border-radius-pill);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-element": HuiStateLabelElement;
  }
}
