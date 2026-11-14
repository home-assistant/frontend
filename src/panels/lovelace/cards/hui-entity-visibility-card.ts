import { mdiEye, mdiEyeOff } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import "./hui-card";
import type { HuiCard } from "./hui-card";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { EntityVisibilityCardConfig } from "./types";

@customElement("hui-entity-visibility-card")
export class HuiEntityVisibilityCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: EntityVisibilityCardConfig;

  private _card?: HuiCard;

  public setConfig(config: EntityVisibilityCardConfig): void {
    if (!config.entity) {
      throw new Error("No entity configured");
    }
    if (!config.card) {
      throw new Error("No card configured");
    }
    this._config = config;
    this._card = document.createElement("hui-card");
    this._card.hass = this.hass;
    this._card.preview = this.preview;
    this._card.config = config.card;
    this._card.inert = true;
    this._card.load();
  }

  public getCardSize(): number | Promise<number> {
    return this._card?.getCardSize() ?? 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return this._card?.getGridOptions() ?? {};
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(
      "entity-visibility-changed",
      this._entityVisibilityChanged
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(
      "entity-visibility-changed",
      this._entityVisibilityChanged
    );
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!this._card) {
      return;
    }
    if (changedProps.has("hass")) {
      this._card.hass = this.hass;
    }
    if (changedProps.has("preview")) {
      this._card.preview = this.preview;
    }
  }

  protected render() {
    if (!this._config || !this.hass || !this._card) {
      return nothing;
    }
    const hidden = Boolean(this._config.hidden);
    const stateObj = this.hass.states[this._config.entity];
    const name = stateObj
      ? this.hass.formatEntityName(stateObj)
      : this._config.entity;
    return html`
      <div class="wrapper" ?hidden-entity=${hidden}>
        ${this._card}
        <button
          class="control"
          aria-label=${this.hass.localize(
            `ui.components.items-display-editor.${hidden ? "show" : "hide"}`,
            { label: name }
          )}
          @click=${this._toggle}
        >
          <ha-svg-icon .path=${hidden ? mdiEyeOff : mdiEye}></ha-svg-icon>
        </button>
      </div>
    `;
  }

  private _entityVisibilityChanged = (
    ev: HASSDomEvent<HASSDomEvents["entity-visibility-changed"]>
  ) => {
    if (
      this._config?.hidden === undefined ||
      ev.detail.entity !== this._config.entity ||
      ev.detail.hidden === this._config.hidden
    ) {
      return;
    }
    this._config = { ...this._config, hidden: ev.detail.hidden };
  };

  private _toggle(): void {
    if (!this._config) {
      return;
    }
    const hidden = !this._config.hidden;
    this._config = { ...this._config, hidden };
    fireEvent(this, "entity-visibility-changed", {
      entity: this._config.entity,
      hidden,
    });
  }

  static styles: CSSResultGroup = css`
    .wrapper {
      position: relative;
      height: 100%;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    hui-card {
      display: block;
      height: 100%;
    }
    .wrapper[hidden-entity] hui-card {
      opacity: 0.8;
    }
    .wrapper[hidden-entity]::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dotted var(--secondary-text-color);
      border-radius: inherit;
      pointer-events: none;
    }
    .control {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      margin: 0;
      padding: var(--ha-space-2);
      border: none;
      background: none;
      border-radius: inherit;
      cursor: pointer;
      color: var(--primary-text-color);
    }
    .control:focus-visible {
      outline: 2px solid var(--primary-color);
    }
    .control ha-svg-icon {
      display: flex;
      padding: var(--ha-space-1);
      border-radius: var(--ha-border-radius-circle);
      background: var(--secondary-background-color);
      box-shadow: var(--ha-box-shadow-s);
      --mdc-icon-size: 20px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-visibility-card": HuiEntityVisibilityCard;
  }
  interface GlobalEventHandlersEventMap {
    "entity-visibility-changed": HASSDomEvent<
      HASSDomEvents["entity-visibility-changed"]
    >;
  }
  interface HASSDomEvents {
    "entity-visibility-changed": { entity: string; hidden: boolean };
  }
}
