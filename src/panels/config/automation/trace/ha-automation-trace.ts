import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import { AutomationEntity } from "../../../../data/automation";
import {
  AutomationTraceExtended,
  loadAutomationTrace,
} from "../../../../data/automation_debug";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../types";
import { configSections } from "../../ha-panel-config";

const omit = (obj, keys) => {
  const res = {};
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) {
      res[key] = obj[key];
    }
  }
  return res;
};

export class HaAutomationTracer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId!: string;

  @property() public automations!: AutomationEntity[];

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @internalProperty() private _entityId?: string;

  @internalProperty() private _trace?: AutomationTraceExtended;

  protected render(): TemplateResult {
    const stateObj = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .backCallback=${() => this._backTapped()}
        .tabs=${configSections.automation}
      >
        <h1>Hello ${stateObj?.attributes.friendly_name}!</h1>
        <button @click=${this._loadTrace}>Reload Trace</button>
        ${this._trace
          ? html`
              <h1>Info</h1>
              <div>
                ${formatDateTimeWithSeconds(
                  new Date(this._trace.timestamp.start),
                  this.hass.language
                )}
                –
                ${this._trace.timestamp.finish
                  ? formatDateTimeWithSeconds(
                      new Date(this._trace.timestamp.finish),
                      this.hass.language
                    )
                  : "Still running"}
              </div>

              <h1>Triggered by ${this._trace.trigger.description}</h1>
              <pre>${JSON.stringify(this._trace.trigger, undefined, 2)}</pre>

              <h1>Condition</h1>
              <pre>
${JSON.stringify(this._trace.condition_trace, undefined, 2)}</pre
              >

              <h1>Action</h1>
              <pre>
${JSON.stringify(this._trace.action_trace, undefined, 2)}</pre
              >

              <h1>Rest</h1>
              <pre>
${JSON.stringify(
                  omit(this._trace, [
                    "trigger",
                    "condition_trace",
                    "action_trace",
                    "timestamp",
                  ]),
                  undefined,
                  2
                )}</pre
              >
            `
          : ""}
      </hass-tabs-subpage>
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);

    if (changedProps.has("automationId")) {
      this._entityId = undefined;
      this._trace = undefined;
      this._loadTrace();
    }

    if (
      changedProps.has("automations") &&
      this.automationId &&
      !this._entityId
    ) {
      this._setEntityId();
    }
  }

  private async _loadTrace() {
    const traces = await loadAutomationTrace(this.hass, this.automationId);
    this._trace = traces[traces.length - 1];
  }

  private _setEntityId() {
    const automation = this.automations.find(
      (entity: AutomationEntity) => entity.attributes.id === this.automationId
    );
    this._entityId = automation?.entity_id;
  }

  private _backTapped(): void {
    history.back();
  }

  static get styles(): CSSResult[] {
    return [haStyle, css``];
  }
}

customElements.define("ha-automation-trace", HaAutomationTracer);

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace": HaAutomationTracer;
  }
}
