import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-card";
import type { EntityRegistryEntry } from "../../../../src/data/entity/entity_registry";
import type { Schedule } from "../../../../src/data/schedule";
import type { MockHomeAssistant } from "../../../../src/fake_data/provide_hass";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { ProvideHassElement } from "../../../../src/mixins/provide-hass-lit-mixin";
import type { ShowDialogParams } from "../../../../src/dialogs/make-dialog-manager";
import { showDialog } from "../../../../src/dialogs/make-dialog-manager";
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

const YAML_ENTRY = {
  entity_id: "schedule.office_lights",
} as EntityRegistryEntry;

// `schedule.get_schedule` answers with Core's time format, where the end of
// the day is `time.max`.
const YAML_RESPONSE = {
  [YAML_ENTRY.entity_id]: Object.fromEntries(
    ["monday", "tuesday", "wednesday", "thursday", "friday"].map((day) => [
      day,
      [
        { from: "07:30:00", to: "12:00:00" },
        { from: "13:00:00", to: "18:00:00", data: { brightness: 80 } },
      ],
    ])
  ),
};
YAML_RESPONSE[YAML_ENTRY.entity_id].friday = [
  { from: "07:30:00", to: "12:00:00" },
  { from: "20:00:00", to: "23:59:59.999999" },
];

@customElement("demo-components-ha-schedule-timeline")
export class DemoHaScheduleTimeline
  extends LitElement
  implements ProvideHassElement
{
  @property({ attribute: false }) public hass?: MockHomeAssistant;

  @state() private _schedule: Schedule = SCHEDULE;

  public provideHass(el) {
    el.hass = this.hass;
  }

  public connectedCallback() {
    super.connectedCallback();
    // Shows the confirmation before discarding a time block draft.
    this.addEventListener("show-dialog", this._dialogManager);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("show-dialog", this._dialogManager);
  }

  private _dialogManager = (e: HASSDomEvent<ShowDialogParams<unknown>>) => {
    const { dialogTag, dialogImport, dialogParams, addHistory, parentElement } =
      e.detail;
    showDialog(
      this,
      dialogTag,
      dialogParams,
      dialogImport,
      parentElement,
      addHistory
    );
  };

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.mockService("schedule", "get_schedule", () => YAML_RESPONSE);
  }

  protected render(): TemplateResult {
    return html`
      <ha-card class="editor" header="Schedule helper editor">
        <div class="card-content">
          <ha-schedule-form
            .item=${this._schedule}
            @value-changed=${this._valueChanged}
          ></ha-schedule-form>
        </div>
      </ha-card>
      <ha-card header="Schedule set up in YAML">
        <div class="card-content">
          <ha-schedule-form .entry=${YAML_ENTRY} disabled></ha-schedule-form>
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

    /* As wide as the dialog the editor opens in, which shows the time block
       panel beside the week. */
    ha-card.editor {
      max-width: 1024px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-schedule-timeline": DemoHaScheduleTimeline;
  }
}
