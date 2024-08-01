import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { FlowType } from "../../../data/data_entry_flow";
import { GenericPreview, subscribePreviewGeneric } from "../../../data/preview";
import { HomeAssistant } from "../../../types";
import "./entity-preview-row";
import { debounce } from "../../../common/util/debounce";
import { fireEvent } from "../../../common/dom/fire_event";

@customElement("flow-preview-generic")
class FlowPreviewGeneric extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public flowType!: FlowType;

  public handler!: string;

  @property() public domain!: string;

  @property() public stepId!: string;

  @property() public flowId!: string;

  @property() public stepData!: Record<string, any>;

  @state() private _preview?: HassEntity;

  @state() private _error?: string;

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
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    return html`<entity-preview-row
      .hass=${this.hass}
      .stateObj=${this._preview}
    ></entity-preview-row>`;
  }

  private _setPreview = (preview: GenericPreview) => {
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
      this._unsub = subscribePreviewGeneric(
        this.hass,
        this.domain,
        this.flowId,
        this.flowType,
        this.stepData,
        this._setPreview
      );
      fireEvent(this, "set-flow-errors", { errors: {} });
    } catch (err: any) {
      if (typeof err.message === "string") {
        this._error = err.message;
      } else {
        this._error = undefined;
        fireEvent(this, "set-flow-errors", err.message);
      }
      this._unsub = undefined;
      this._preview = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "flow-preview-generic": FlowPreviewGeneric;
  }
}
