import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { FlowType } from "../../../data/data_entry_flow";
import { GroupPreview, subscribePreviewGroup } from "../../../data/group";
import { HomeAssistant } from "../../../types";
import "./entity-preview-row";
import { debounce } from "../../../common/util/debounce";

@customElement("flow-preview-group")
class FlowPreviewGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public flowType!: FlowType;

  public handler!: string;

  @property() public stepId!: string;

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
      this._debouncedSubscribePreview();
    }
  }

  protected render() {
    return html`<entity-preview-row
      .hass=${this.hass}
      .stateObj=${this._preview}
    ></entity-preview-row>`;
  }

  private _setPreview = (preview: GroupPreview) => {
    const now = new Date().toISOString();
    this._preview = {
      entity_id: `${this.stepId}.___flow_preview___`,
      last_changed: now,
      last_updated: now,
      context: { id: "", parent_id: null, user_id: null },
      ...preview,
    };
  };

  private _debouncedSubscribePreview = debounce(() => {
    this._subscribePreview();
  }, 250);

  private async _subscribePreview() {
    if (this._unsub) {
      (await this._unsub)();
      this._unsub = undefined;
    }
    if (this.flowType === "repair_flow") {
      return;
    }
    try {
      this._unsub = subscribePreviewGroup(
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
    "flow-preview-group": FlowPreviewGroup;
  }
}
