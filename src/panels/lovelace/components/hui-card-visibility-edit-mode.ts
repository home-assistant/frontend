import { mdiEye, mdiEyeOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-svg-icon";
import { formattersContext } from "../../../data/context";
import type { HomeAssistantFormatters } from "../../../types";

@customElement("hui-card-visibility-edit-mode")
export class HuiCardVisibilityEditMode extends LitElement {
  @property() public entity!: string;

  @property({ type: Boolean, reflect: true, attribute: "entity-hidden" })
  public entityHidden = false;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consumeEntityState({ entityIdPath: ["entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  protected render() {
    const name = this._stateObj
      ? this._formatters.formatEntityName(this._stateObj)
      : this.entity;
    return html`
      <div class="card-wrapper" inert><slot></slot></div>
      <button
        class="control"
        aria-label=${this._localize(
          `ui.components.items-display-editor.${this.entityHidden ? "show" : "hide"}`,
          { label: name }
        )}
        @click=${this._toggle}
      >
        <ha-svg-icon
          .path=${this.entityHidden ? mdiEyeOff : mdiEye}
        ></ha-svg-icon>
      </button>
    `;
  }

  private _toggle(): void {
    fireEvent(this, "entity-visibility-changed", {
      entity: this.entity,
      hidden: !this.entityHidden,
    });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: block;
      position: relative;
      height: 100%;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    .card-wrapper {
      height: 100%;
    }
    :host([entity-hidden]) .card-wrapper {
      opacity: 0.8;
    }
    :host([entity-hidden])::after {
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
    "hui-card-visibility-edit-mode": HuiCardVisibilityEditMode;
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
