import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ensureArray } from "../../../../../common/array/ensure-array";
import type { TriggerList } from "../../../../../data/automation";
import type { HomeAssistant, ItemPath } from "../../../../../types";
import "../ha-automation-trigger";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-list")
export class HaTriggerList extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TriggerList;

  @property({ attribute: false }) public path?: ItemPath;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): TriggerList {
    return {
      triggers: [],
    };
  }

  protected render() {
    const triggers = ensureArray(this.trigger.triggers);

    return html`
      <ha-automation-trigger
        .path=${[...(this.path ?? []), "triggers"]}
        .triggers=${triggers}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .name=${"triggers"}
        @value-changed=${this._valueChanged}
      ></ha-automation-trigger>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  static styles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-list": HaTriggerList;
  }
}
