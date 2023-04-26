import { mdiClose } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-date-time-input";

// tslint:disable:no-console

@customElement("ha-date-time-multiple-input")
export class HaDateTimeMultipleInput extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public locale!: HomeAssistant["locale"];

  @property() public label?: string;

  @property() public value?: string[];

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @property({ type: Boolean, attribute: "enable-date" }) public enableDate =
    false;

  @property({ type: Boolean, attribute: "enable-time" }) public enableTime =
    false;

  @property({ type: Boolean, attribute: "enable-second" }) public enableSecond =
    false;

  protected render() {
    const itemTemplates: TemplateResult[] = [];
    const currentValues = this._currentValues.sort();
    for (const datetime of currentValues) {
      itemTemplates.push(
        html`
          <div class="input">
            <ha-date-time-input
              .hass=${this.hass}
              .locale=${this.locale}
              .value=${datetime}
              .curValue=${datetime}
              .label=${this.label}
              .disabled=${this.disabled}
              .required=${this.required}
              .enableDate=${this.enableDate}
              .enableTime=${this.enableTime}
              .enableSecond=${this.enableSecond}
              @value-changed=${this._memberChanged}
            ></ha-date-time-input>
            <ha-svg-icon
              role="button"
              tabindex="-1"
              aria-label=${ifDefined(this.hass?.localize("ui.common.clear"))}
              class="clear-button"
              .path=${mdiClose}
              slot=${datetime}
              @click=${this._clearMember}
            ></ha-svg-icon>
          </div>
        `
      );
    }
    itemTemplates.push(
      html`
        <div class="input">
          <ha-date-time-input
            .hass=${this.hass}
            .locale=${this.locale}
            .value="null"
            .label=${this.label}
            .disabled=${this.disabled}
            .required=${this.required}
            .enableDate=${this.enableDate}
            .enableTime=${this.enableTime}
            .enableSecond=${this.enableSecond}
            @value-changed=${this._addMember}
          ></ha-date-time-input>
        </div>
      `
    );
    if (this.helper) {
      itemTemplates.push(
        html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
      );
    }
    return html` ${itemTemplates} `;
  }

  private get _currentValues(): string[] {
    return this.value || [];
  }

  private async _updateDateTimes(datetimes) {
    this.value = datetimes.sort();
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _memberChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const curValue = (ev.currentTarget as any).curValue;
    const newValue = ev.detail.value;
    if (newValue === curValue) {
      return;
    }
    const currentValues = this._currentValues;
    if (!newValue || currentValues.includes(newValue)) {
      this._updateDateTimes(currentValues.filter((ent) => ent !== curValue));
      return;
    }
    this._updateDateTimes(
      currentValues.map((ent) => (ent === curValue ? newValue : ent))
    );
  }

  private _addMember(ev: CustomEvent<{ value: string }>) {
    ev.stopImmediatePropagation();

    const toAdd = ev.detail.value;
    if (!toAdd) {
      return;
    }
    (ev.currentTarget as any).value = "";
    const currentValues = this._currentValues;
    if (currentValues.includes(toAdd)) {
      return;
    }
    this._updateDateTimes([...currentValues, toAdd]);
  }

  private _clearMember(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as any;
    const currentValues = this._currentValues;
    this._updateDateTimes(currentValues.filter((ent) => ent !== target.slot));
  }

  static override styles = css`
    div {
      margin-top: 8px;
    }
    .input {
      display: flex;
      align-items: center;
      flex-direction: row;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-time-multiple-input": HaDateTimeMultipleInput;
  }
}
