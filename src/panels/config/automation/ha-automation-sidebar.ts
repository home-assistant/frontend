import type { Action } from "@fullcalendar/core/internal";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-dialog-header";
import type { Trigger } from "../../../data/automation";
import type { HomeAssistant } from "../../../types";
import type { Condition } from "../../lovelace/common/validate-condition";
import "./trigger/ha-automation-trigger-content";

export interface OpenSidebarConfig {
  saveCallback: (config: Trigger | Condition | Action) => void;
  closeCallback: () => void;
  type: "trigger" | "condition" | "action";
  config: Trigger | Condition | Action;
}

@customElement("ha-automation-sidebar")
export default class HaAutomationSidebar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: OpenSidebarConfig;

  @property({ type: Boolean, attribute: "wide" }) public isWide = false;

  protected render() {
    if (!this.config) {
      return nothing;
    }

    const selectedElementType = Object.keys(this.config.config)[0];

    return html`
      <ha-card outlined class=${!this.isWide ? "mobile" : ""}>
        <ha-dialog-header>
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this._closeSidebar}
          ></ha-icon-button>
          <span slot="title">${`Edit ${selectedElementType}`}</span>
        </ha-dialog-header>

        <div class="card-content">
          ${this.config.type === "trigger"
            ? html`<ha-automation-trigger-content
                .hass=${this.hass}
                .trigger=${this.config.config}
                @value-changed=${this._valueChangedSidebar}
              ></ha-automation-trigger-content>`
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _valueChangedSidebar(ev: CustomEvent) {
    ev.stopPropagation();

    this.config?.saveCallback(ev.detail.value);

    if (this.config) {
      this.config.config = ev.detail.value;
    }
  }

  private _closeSidebar() {
    this.config?.closeCallback();
    this.config = undefined;
  }

  static styles = css`
    :host {
      height: 100%;
    }

    ha-card {
      height: 100%;
      width: 100%;
      outline: solid;
      outline-color: var(--primary-color);
      outline-offset: -2px;
      outline-width: 2px;
    }
    ha-card.mobile {
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0;
      outline: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-sidebar": HaAutomationSidebar;
  }
}
