/* eslint-disable lit/no-template-arrow */
import { LitElement, TemplateResult, html, css } from "lit";
import { customElement, state } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import type { ConditionWithShorthand } from "../../../../src/data/automation";
import "../../../../src/panels/config/automation/condition/ha-automation-condition";
import { HaDeviceCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-device";
import { HaLogicalCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-logical";
import HaNumericStateCondition from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-numeric_state";
import { HaStateCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-state";
import { HaSunCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-sun";
import { HaTemplateCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-template";
import { HaTimeCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-time";
import { HaTriggerCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-trigger";
import { HaZoneCondition } from "../../../../src/panels/config/automation/condition/types/ha-automation-condition-zone";

const SCHEMAS: { name: string; conditions: ConditionWithShorthand[] }[] = [
  {
    name: "State",
    conditions: [{ condition: "state", ...HaStateCondition.defaultConfig }],
  },
  {
    name: "Numeric State",
    conditions: [
      { condition: "numeric_state", ...HaNumericStateCondition.defaultConfig },
    ],
  },
  {
    name: "Sun",
    conditions: [{ condition: "sun", ...HaSunCondition.defaultConfig }],
  },
  {
    name: "Zone",
    conditions: [{ condition: "zone", ...HaZoneCondition.defaultConfig }],
  },
  {
    name: "Time",
    conditions: [{ condition: "time", ...HaTimeCondition.defaultConfig }],
  },
  {
    name: "Template",
    conditions: [
      { condition: "template", ...HaTemplateCondition.defaultConfig },
    ],
  },
  {
    name: "Device",
    conditions: [{ condition: "device", ...HaDeviceCondition.defaultConfig }],
  },
  {
    name: "And",
    conditions: [{ condition: "and", ...HaLogicalCondition.defaultConfig }],
  },
  {
    name: "Or",
    conditions: [{ condition: "or", ...HaLogicalCondition.defaultConfig }],
  },
  {
    name: "Not",
    conditions: [{ condition: "not", ...HaLogicalCondition.defaultConfig }],
  },
  {
    name: "Trigger",
    conditions: [{ condition: "trigger", ...HaTriggerCondition.defaultConfig }],
  },
  {
    name: "Shorthand",
    conditions: [
      { and: HaLogicalCondition.defaultConfig.conditions },
      { or: HaLogicalCondition.defaultConfig.conditions },
      { not: HaLogicalCondition.defaultConfig.conditions },
    ],
  },
];

@customElement("demo-automation-editor-condition")
class DemoHaAutomationEditorCondition extends LitElement {
  @state() private hass!: HomeAssistant;

  @state() private _disabled = false;

  private data: any = SCHEMAS.map((info) => info.conditions);

  constructor() {
    super();
    const hass = provideHass(this);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("config", "en");
    mockEntityRegistry(hass);
    mockDeviceRegistry(hass);
    mockAreaRegistry(hass);
    mockHassioSupervisor(hass);
  }

  protected render(): TemplateResult {
    const valueChanged = (ev) => {
      const sampleIdx = ev.target.sampleIdx;
      this.data[sampleIdx] = ev.detail.value;
      this.requestUpdate();
    };
    return html`
      <div class="options">
        <ha-formfield label="Disabled">
          <ha-switch
            .name=${"disabled"}
            .checked=${this._disabled}
            @change=${this._handleOptionChange}
          ></ha-switch>
        </ha-formfield>
      </div>
      ${SCHEMAS.map(
        (info, sampleIdx) => html`
          <demo-black-white-row
            .title=${info.name}
            .value=${this.data[sampleIdx]}
          >
            ${["light", "dark"].map(
              (slot) => html`
                <ha-automation-condition
                  slot=${slot}
                  .hass=${this.hass}
                  .conditions=${this.data[sampleIdx]}
                  .sampleIdx=${sampleIdx}
                  .disabled=${this._disabled}
                  @value-changed=${valueChanged}
                ></ha-automation-condition>
              `
            )}
          </demo-black-white-row>
        `
      )}
    `;
  }

  private _handleOptionChange(ev) {
    this[`_${ev.target.name}`] = ev.target.checked;
  }

  static styles = css`
    .options {
      max-width: 800px;
      margin: 16px auto;
    }
    .options ha-formfield {
      margin-right: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-automation-editor-condition": DemoHaAutomationEditorCondition;
  }
}
