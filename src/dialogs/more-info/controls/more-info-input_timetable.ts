import "../../../components/ha-icon-button";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { mdiPlus } from "@mdi/js";
import "./more-info-input_timetable_entry";
import { HassEntity } from "home-assistant-js-websocket";
import { BINARY_STATE_ON } from "../../../common/const";
import { HomeAssistant } from "../../../types";

export declare type EventData = {
  time: string | null;
  state: string;
};

@customElement("more-info-input_timetable")
export class MoreInfoInputTimetable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  private _timetable: Array<EventData> = [];

  private _disable_reconfig = false;

  constructor() {
    super();
    this._reconfig = this._reconfig.bind(this);
    this._deleteEntry = this._deleteEntry.bind(this);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }
    this._disable_reconfig = true;

    return html`
      ${this._timetable.map(
        (entry: EventData) =>
          html`<more-info-input_timetable_entry
            .hass=${this.hass}
            .data=${entry}
            .icon=${this._entryIcon(entry)}
            .reconfig=${this._reconfig}
            .deleteEntry=${this._deleteEntry}
          ></more-info-input_timetable_entry>`
      )}
      <div class="add">
        <ha-icon-button
          .label=${this.hass!.localize(
            "ui.dialogs.more_info_control.input_timetable.add"
          )}
          .path=${mdiPlus}
          @click=${this._addEntry}
        ></ha-icon-button>
        <p>
          ${this.hass!.localize(
            "ui.dialogs.more_info_control.input_timetable.add"
          )}
        </p>
      </div>
    `;
  }

  updated() {
    this._disable_reconfig = false;
  }

  protected update(changedProps: PropertyValues) {
    if (
      changedProps.has("stateObj") &&
      this.stateObj &&
      this.stateObj!.attributes &&
      this.stateObj!.attributes.timetable
    ) {
      const new_timetable = this.stateObj!.attributes.timetable;
      const old_timetable = [...this._timetable];
      old_timetable.sort((x, y) => (String(x.time) < String(y.time) ? -1 : 1));
      if (JSON.stringify(old_timetable) !== JSON.stringify(new_timetable)) {
        this._timetable = [...new_timetable];
      }
    }
    super.update(changedProps);
  }

  private _entryIcon(entry: EventData): string {
    const suffix1 = this._validateEntry(entry) ? "-check" : "-alert";
    const is_on = entry.state === BINARY_STATE_ON;
    const darkMode = this.hass.themes.darkMode;
    // The icon's fill should be white for on and black for off.
    const suffix2 =
      (is_on && !darkMode) || (!is_on && darkMode) ? "-outline" : "";
    return "hass:clock" + suffix1 + suffix2;
  }

  private _validateEntry(entry: EventData): boolean {
    if (
      entry.time === null ||
      !/^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:00)$/.test(entry.time)
    ) {
      return false;
    }

    for (const item of this._timetable) {
      if (Object.is(entry, item)) {
        continue;
      }
      if (entry.time === item.time) {
        return false;
      }
    }

    return true;
  }

  private _validateTimetable() {
    for (const entry of this._timetable) {
      if (!this._validateEntry(entry)) {
        return false;
      }
    }
    return true;
  }

  private _reconfig() {
    if (this._disable_reconfig) {
      return;
    }
    this.requestUpdate();
    if (this._validateTimetable()) {
      this.hass!.callService("input_timetable", "reconfig", {
        entity_id: this.stateObj!.entity_id,
        timetable: this._timetable,
      });
    }
  }

  private _deleteEntry(to_delete: EventData) {
    this._timetable = this._timetable.filter(
      (entry) => !Object.is(entry, to_delete)
    );
    this._reconfig();
  }

  private _addEntry() {
    this._timetable.push({
      time: null,
      state: BINARY_STATE_ON,
    });
    this.requestUpdate();
  }

  static get styles(): CSSResultGroup {
    return css`
      .add {
        display: flex;
        justify-content: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-input_timetable": MoreInfoInputTimetable;
  }
}
