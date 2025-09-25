import { mdiStop, mdiValveClosed, mdiValveOpen } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { supportsFeature } from "../../common/entity/supports-feature";
import "../../components/ha-control-button";
import "../../components/ha-control-button-group";
import "../../components/ha-control-slider";
import "../../components/ha-svg-icon";
import type { ValveEntity } from "../../data/valve";
import {
  ValveEntityFeature,
  canClose,
  canOpen,
  canStop,
} from "../../data/valve";
import type { HomeAssistant } from "../../types";

type ValveButton = "open" | "close" | "stop" | "none";

export const getValveButtons = memoizeOne(
  (stateObj: ValveEntity): ValveButton[] => {
    const supportsOpen = supportsFeature(stateObj, ValveEntityFeature.OPEN);
    const supportsClose = supportsFeature(stateObj, ValveEntityFeature.CLOSE);
    const supportsStop = supportsFeature(stateObj, ValveEntityFeature.STOP);

    const buttons: ValveButton[] = [];
    if (supportsOpen) buttons.push("open");
    if (supportsStop) buttons.push("stop");
    if (supportsClose) buttons.push("close");
    return buttons;
  }
);

@customElement("ha-state-control-valve-buttons")
export class HaStateControlValveButtons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ValveEntity;

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("valve", "open_valve", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("valve", "close_valve", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("valve", "stop_valve", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected renderButton(button: ValveButton | undefined) {
    if (button === "open") {
      return html`
        <ha-control-button
          .label=${this.hass.localize("ui.card.valve.open_valve")}
          @click=${this._onOpenTap}
          .disabled=${!canOpen(this.stateObj)}
          data-button="open"
        >
          <ha-svg-icon .path=${mdiValveOpen}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    if (button === "close") {
      return html`
        <ha-control-button
          .label=${this.hass.localize("ui.card.valve.close_valve")}
          @click=${this._onCloseTap}
          .disabled=${!canClose(this.stateObj)}
          data-button="close"
        >
          <ha-svg-icon .path=${mdiValveClosed}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    if (button === "stop") {
      return html`
        <ha-control-button
          .label=${this.hass.localize("ui.card.valve.stop_valve")}
          @click=${this._onStopTap}
          .disabled=${!canStop(this.stateObj)}
          data-button="stop"
        >
          <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
        </ha-control-button>
      `;
    }
    return nothing;
  }

  protected render(): TemplateResult {
    const buttons = getValveButtons(this.stateObj);

    return html`
      <ha-control-button-group vertical>
        ${repeat(
          buttons,
          (button) => button,
          (button) => this.renderButton(button)
        )}
      </ha-control-button-group>
    `;
  }

  static styles = css`
    ha-control-button-group {
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      --control-button-group-spacing: 10px;
      --control-button-group-thickness: 100px;
    }
    ha-control-button {
      --control-button-border-radius: var(--ha-border-radius-6xl);
      --mdc-icon-size: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-valve-buttons": HaStateControlValveButtons;
  }
}
