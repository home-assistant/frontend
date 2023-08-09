import { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { FlowType } from "../../../data/data_entry_flow";
import { previewGroupSensor } from "../../../data/group";
import { HomeAssistant } from "../../../types";
import "./entity-preview-row";

@customElement("flow-preview-sensor_group_preview")
class FlowPreviewSensorGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public flowType!: FlowType;

  public handler!: string;

  public stepId!: string;

  @property() public flowId!: string;

  @property() public stepData!: Record<string, any>;

  @state() private _preview?: HassEntity;

  willUpdate(changedProps) {
    if (changedProps.has("stepData")) {
      this._updatePreview();
    }
  }

  protected render() {
    return html`<entity-preview-row
      .hass=${this.hass}
      .stateObj=${this._preview}
    ></entity-preview-row>`;
  }

  private async _updatePreview() {
    if (this.flowType !== "config_flow" && this.flowType !== "options_flow") {
      return;
    }
    if (!this.stepData.type) {
      this._preview = undefined;
      return;
    }
    try {
      const preview = await previewGroupSensor(
        this.hass,
        this.flowId,
        this.flowType,
        this.stepData
      );
      const now = new Date().toISOString();
      this._preview = {
        entity_id: "sensor.flow_preview",
        last_changed: now,
        last_updated: now,
        context: { id: "", parent_id: null, user_id: null },
        ...preview,
      };
    } catch (err) {
      this._preview = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "flow-preview-sensor_group_preview": FlowPreviewSensorGroup;
  }
}
