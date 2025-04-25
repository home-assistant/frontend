import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-formfield";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import type { Action } from "../../../../src/data/script";
import "../../../../src/panels/config/automation/action/ha-automation-action";
import { HaChooseAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-choose";
import { HaConditionAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-condition";
import { HaDelayAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-delay";
import { HaDeviceAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-device_id";
import { HaEventAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-event";
import { HaIfAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-if";
import { HaParallelAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-parallel";
import { HaPlayMediaAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-play_media";
import { HaRepeatAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-repeat";
import { HaSequenceAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-sequence";
import { HaServiceAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-service";
import { HaStopAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-stop";
import { HaWaitForTriggerAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-wait_for_trigger";
import { HaWaitAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-wait_template";

const SCHEMAS: { name: string; actions: Action[] }[] = [
  { name: "Event", actions: [HaEventAction.defaultConfig] },
  { name: "Device", actions: [HaDeviceAction.defaultConfig] },
  { name: "Service", actions: [HaServiceAction.defaultConfig] },
  { name: "Condition", actions: [HaConditionAction.defaultConfig] },
  { name: "Delay", actions: [HaDelayAction.defaultConfig] },
  { name: "Play media", actions: [HaPlayMediaAction.defaultConfig] },
  { name: "Wait", actions: [HaWaitAction.defaultConfig] },
  { name: "WaitForTrigger", actions: [HaWaitForTriggerAction.defaultConfig] },
  { name: "Repeat", actions: [HaRepeatAction.defaultConfig] },
  { name: "If-Then", actions: [HaIfAction.defaultConfig] },
  { name: "Choose", actions: [HaChooseAction.defaultConfig] },
  { name: "Variables", actions: [{ variables: { hello: "1" } }] },
  { name: "Sequence", actions: [HaSequenceAction.defaultConfig] },
  { name: "Parallel", actions: [HaParallelAction.defaultConfig] },
  { name: "Stop", actions: [HaStopAction.defaultConfig] },
];

@customElement("demo-automation-editor-action")
class DemoHaAutomationEditorAction extends LitElement {
  @state() private hass!: HomeAssistant;

  @state() private _disabled = false;

  private data: any = SCHEMAS.map((info) => info.actions);

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
                <ha-automation-action
                  slot=${slot}
                  .hass=${this.hass}
                  .actions=${this.data[sampleIdx]}
                  .sampleIdx=${sampleIdx}
                  .disabled=${this._disabled}
                  @value-changed=${this._handleValueChange}
                ></ha-automation-action>
              `
            )}
          </demo-black-white-row>
        `
      )}
    `;
  }

  private _handleValueChange(ev) {
    const sampleIdx = ev.target.sampleIdx;
    this.data[sampleIdx] = ev.detail.value;
    this.requestUpdate();
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
    "demo-automation-editor-action": DemoHaAutomationEditorAction;
  }
}
