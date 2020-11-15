import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-time-input";
import "../../../components/ha-switch";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiDelete } from "@mdi/js";
import { EventData } from "./more-info-input_timetable";
import type { HaSwitch } from "../../../components/ha-switch";
import { BINARY_STATE_ON, BINARY_STATE_OFF } from "../../../common/const";
import { HomeAssistant } from "../../../types";

@customElement("more-info-input_timetable_entry")
class MoreInfoInputTimetableEntry extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: EventData;

  @property({ attribute: false }) public icon!: string;

  @property() public reconfig!: () => void;

  @property() public deleteEntry!: (data: EventData) => void;

  public render(): TemplateResult {
    return html` <div class="row">
      <ha-icon icon=${this.icon} class="status"></ha-icon>
      <ha-time-input
        .value=${this.data.time !== null ? this.data.time! : undefined}
        .locale=${this.hass.locale}
        hide-label
        @value-changed=${this._updateEventTime}
      ></ha-time-input>
      <ha-switch
        .checked=${this.data.state === BINARY_STATE_ON}
        @change=${this._updateEventState}
      ></ha-switch>
      <ha-icon-button
        .label=${this.hass!.localize(
          "ui.dialogs.more_info_control.input_timetable.delete"
        )}
        .path=${mdiDelete}
        class="delete"
        @click=${this._deleteEntry}
      ></ha-icon-button>
    </div>`;
  }

  private _updateEventTime(ev: { detail: { value: any } }) {
    if (this.data.time === ev.detail.value) {
      return;
    }
    this.data.time = ev.detail.value;
    this.reconfig();
  }

  private _updateEventState(ev: { target: any }) {
    this.data.state = (ev.target as HaSwitch).checked
      ? BINARY_STATE_ON
      : BINARY_STATE_OFF;
    this.reconfig();
  }

  private _deleteEntry() {
    this.deleteEntry(this.data);
  }

  static get styles(): CSSResultGroup {
    return css`
      .row {
        display: flex;
        justify-content: space-around;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-input_timetable_entry": MoreInfoInputTimetableEntry;
  }
}
