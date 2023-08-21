import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { FlowType } from "../../../data/data_entry_flow";
import { subscribePreviewGroupSensor } from "../../../data/group";
import { HomeAssistant } from "../../../types";
import "./entity-preview-row";

@customElement("flow-preview-group_sensor")
class FlowPreviewGroupSensor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public flowType!: FlowType;

  public handler!: string;

  public stepId!: string;

  @property() public flowId!: string;

  @property() public stepData!: Record<string, any>;

  @state() private _preview?: HassEntity;

  private _unsub?: Promise<UnsubscribeFunc>;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub.then((unsub) => unsub());
      this._unsub = undefined;
    }
  }

  willUpdate(changedProps) {
    if (changedProps.has("stepData")) {
      this._subscribePreview();
    }
  }

  protected render() {
    return html`<entity-preview-row
      .hass=${this.hass}
      .stateObj=${this._preview}
    ></entity-preview-row>`;
  }

  private _setPreview = (preview) => {
    const now = new Date().toISOString();
    this._preview = {
      entity_id: "sensor.flow_preview",
      last_changed: now,
      last_updated: now,
      context: { id: "", parent_id: null, user_id: null },
      ...preview,
    };
  };

  private async _subscribePreview() {
    if (this._unsub) {
      (await this._unsub)();
      this._unsub = undefined;
    }
    if (this.flowType === "repair_flow") {
      return;
    }
    if (!this.stepData.type) {
      this._preview = undefined;
      return;
    }
    try {
      this._unsub = subscribePreviewGroupSensor(
        this.hass,
        this.flowId,
        this.flowType,
        this.stepData,
        this._setPreview
      );
    } catch (err) {
      this._preview = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "flow-preview-group_sensor": FlowPreviewGroupSensor;
  }
}
