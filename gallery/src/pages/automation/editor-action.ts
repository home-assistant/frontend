/* eslint-disable lit/no-template-arrow */
import { LitElement, TemplateResult, html } from "lit";
import { customElement, state } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/demo-black-white-row";
import { mockEntityRegistry } from "../../../../demo/src/stubs/entity_registry";
import { mockDeviceRegistry } from "../../../../demo/src/stubs/device_registry";
import { mockAreaRegistry } from "../../../../demo/src/stubs/area_registry";
import { mockHassioSupervisor } from "../../../../demo/src/stubs/hassio_supervisor";
import "../../../../src/panels/config/automation/action/ha-automation-action";
import { HaChooseAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-choose";
import { HaDelayAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-delay";
import { HaDeviceAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-device_id";
import { HaEventAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-event";
import { HaRepeatAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-repeat";
import { HaSceneAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-activate_scene";
import { HaServiceAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-service";
import { HaWaitForTriggerAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-wait_for_trigger";
import { HaWaitAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-wait_template";
import { Action } from "../../../../src/data/script";
import { HaConditionAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-condition";
import { HaParallelAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-parallel";
import { HaIfAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-if";
import { HaStopAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-stop";
import { HaPlayMediaAction } from "../../../../src/panels/config/automation/action/types/ha-automation-action-play_media";

const SCHEMAS: { name: string; actions: Action[] }[] = [
  { name: "Event", actions: [HaEventAction.defaultConfig] },
  { name: "Device", actions: [HaDeviceAction.defaultConfig] },
  { name: "Service", actions: [HaServiceAction.defaultConfig] },
  { name: "Condition", actions: [HaConditionAction.defaultConfig] },
  { name: "Delay", actions: [HaDelayAction.defaultConfig] },
  { name: "Scene", actions: [HaSceneAction.defaultConfig] },
  { name: "Play media", actions: [HaPlayMediaAction.defaultConfig] },
  { name: "Wait", actions: [HaWaitAction.defaultConfig] },
  { name: "WaitForTrigger", actions: [HaWaitForTriggerAction.defaultConfig] },
  { name: "Repeat", actions: [HaRepeatAction.defaultConfig] },
  { name: "If-Then", actions: [HaIfAction.defaultConfig] },
  { name: "Choose", actions: [HaChooseAction.defaultConfig] },
  { name: "Variables", actions: [{ variables: { hello: "1" } }] },
  { name: "Parallel", actions: [HaParallelAction.defaultConfig] },
  { name: "Stop", actions: [HaStopAction.defaultConfig] },
];

@customElement("demo-automation-editor-action")
class DemoHaAutomationEditorAction extends LitElement {
  @state() private hass!: HomeAssistant;

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
    const valueChanged = (ev) => {
      const sampleIdx = ev.target.sampleIdx;
      this.data[sampleIdx] = ev.detail.value;
      this.requestUpdate();
    };
    return html`
      ${SCHEMAS.map(
        (info, sampleIdx) => html`
          <demo-black-white-row
            .title=${info.name}
            .value=${this.data[sampleIdx]}
          >
            ${["light", "dark"].map(
              (slot) =>
                html`
                  <ha-automation-action
                    slot=${slot}
                    .hass=${this.hass}
                    .actions=${this.data[sampleIdx]}
                    .sampleIdx=${sampleIdx}
                    @value-changed=${valueChanged}
                  ></ha-automation-action>
                `
            )}
          </demo-black-white-row>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-editor-action": DemoHaAutomationEditorAction;
  }
}
