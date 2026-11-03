import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-schedule-timeline";
import type { Schedule } from "../../../../src/data/schedule";
import { getScheduleWeek } from "../../../../src/data/schedule";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../../../src/panels/config/helpers/forms/ha-schedule-form";
import type { ValueChangedEvent } from "../../../../src/types";

const WORKDAY = [
  { from: "06:00", to: "08:30", data: { temperature: 21 } },
  { from: "17:00", to: "22:30" },
];

const WEEKEND = [{ from: "08:00", to: "23:00" }];

const SCHEDULE: Schedule = {
  id: "heating",
  name: "Heating",
  icon: "mdi:radiator",
  monday: WORKDAY,
  tuesday: WORKDAY,
  wednesday: [
    { from: "06:00", to: "08:30" },
    { from: "12:00", to: "13:00" },
    { from: "17:00", to: "22:30" },
  ],
  thursday: WORKDAY,
  friday: [
    { from: "06:00", to: "08:30" },
    { from: "16:00", to: "24:00" },
  ],
  saturday: WEEKEND,
  sunday: WEEKEND,
};

@customElement("demo-components-ha-schedule-timeline")
export class DemoHaScheduleTimeline extends LitElement {
  @property({ attribute: false }) public hass?: MockHomeAssistant;

  @state() private _schedule: Schedule = SCHEDULE;

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
  }

  protected render(): TemplateResult {
    return html`
      <ha-card header="Schedule helper editor">
        <div class="card-content">
          <ha-schedule-form
            .hass=${this.hass}
            .item=${this._schedule}
            @value-changed=${this._valueChanged}
          ></ha-schedule-form>
        </div>
      </ha-card>
      <ha-card header="Read-only">
        <div class="card-content">
          <ha-schedule-timeline
            readonly
            .value=${getScheduleWeek(SCHEDULE)}
          ></ha-schedule-timeline>
        </div>
      </ha-card>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<Schedule>) {
    this._schedule = ev.detail.value;
  }

  static styles = css`
    ha-card {
      display: block;
      max-width: 560px;
      margin: 24px auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-schedule-timeline": DemoHaScheduleTimeline;
  }
}
