import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../../common/util/debounce";
import { FlowType } from "../../../data/data_entry_flow";
import {
  TemplateListeners,
  TemplatePreview,
  subscribePreviewTemplate,
} from "../../../data/ws-templates";
import { HomeAssistant } from "../../../types";
import "./entity-preview-row";
import { fireEvent } from "../../../common/dom/fire_event";

@customElement("flow-preview-template")
class FlowPreviewTemplate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public flowType!: FlowType;

  public handler!: string;

  @property() public stepId!: string;

  @property() public flowId!: string;

  @property() public stepData!: Record<string, any>;

  @state() private _preview?: HassEntity;

  @state() private _listeners?: TemplateListeners;

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
      ></entity-preview-row>
      ${this._listeners?.time
        ? html`
            <p>
              ${this.hass.localize("ui.dialogs.helper_settings.template.time")}
            </p>
          `
        : nothing}
      ${!this._listeners
        ? nothing
        : this._listeners.all
        ? html`
            <p class="all_listeners">
              ${this.hass.localize(
                "ui.dialogs.helper_settings.template.all_listeners"
              )}
            </p>
          `
        : this._listeners.domains.length || this._listeners.entities.length
        ? html`
            <p>
              ${this.hass.localize(
                "ui.dialogs.helper_settings.template.listeners"
              )}
            </p>
            <ul>
              ${this._listeners.domains
                .sort()
                .map(
                  (domain) => html`
                    <li>
                      <b
                        >${this.hass.localize(
                          "ui.dialogs.helper_settings.template.domain"
                        )}</b
                      >: ${domain}
                    </li>
                  `
                )}
              ${this._listeners.entities
                .sort()
                .map(
                  (entity_id) => html`
                    <li>
                      <b
                        >${this.hass.localize(
                          "ui.dialogs.helper_settings.template.entity"
                        )}</b
                      >: ${entity_id}
                    </li>
                  `
                )}
            </ul>
          `
        : !this._listeners.time
        ? html`<p class="all_listeners">
            ${this.hass.localize(
              "ui.dialogs.helper_settings.template.no_listeners"
            )}
          </p>`
        : nothing} `;
  }

  private _setPreview = (preview: TemplatePreview) => {
    if ("error" in preview) {
      this._error = preview.error;
      this._preview = undefined;
      return;
    }
    this._error = undefined;
    this._listeners = preview.listeners;
    const now = new Date().toISOString();
    this._preview = {
      entity_id: `${this.stepId}.___flow_preview___`,
      last_changed: now,
      last_updated: now,
      context: { id: "", parent_id: null, user_id: null },
      attributes: preview.attributes,
      state: preview.state,
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
      this._unsub = subscribePreviewTemplate(
        this.hass,
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
    "flow-preview-template": FlowPreviewTemplate;
  }
}
