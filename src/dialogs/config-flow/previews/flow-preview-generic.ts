import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, html } from "lit";
import type { nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { FlowType } from "../../../data/data_entry_flow";
import type { GenericPreview } from "../../../data/preview";
import { subscribePreviewGeneric } from "../../../data/preview";
import type { HomeAssistant } from "../../../types";
import "./entity-preview-row";
import { debounce } from "../../../common/util/debounce";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";

@customElement("flow-preview-generic")
export class FlowPreviewGeneric extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public flowType!: FlowType;

  public handler!: string;

  @property() public domain!: string;

  @property({ attribute: false }) public stepId!: string;

  @property({ attribute: false }) public flowId!: string;

  @property({ attribute: false }) public stepData!: Record<string, any>;

  @state() protected _preview?: HassEntity;

  @state() protected _error?: string;

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

  protected render(): TemplateResult | typeof nothing {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    return html`<entity-preview-row
      .hass=${this.hass}
      .stateObj=${this._preview}
    ></entity-preview-row>`;
  }

  private _setPreview = (preview: GenericPreview) => {
    if (preview.error) {
      this._error = preview.error;
      this._preview = undefined;
      return;
    }
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
    if (
      this.flowType !== "config_flow" &&
      this.flowType !== "options_flow" &&
      this.flowType !== "config_subentries_flow"
    ) {
      return;
    }
    this._error = undefined;
    try {
      this._unsub = subscribePreviewGeneric(
        this.hass,
        this.domain,
        this.flowId,
        this.flowType,
        this.stepData,
        this._setPreview
      );
      await this._unsub;
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
