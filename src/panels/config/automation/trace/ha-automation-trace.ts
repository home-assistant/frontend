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
  loadAutomationTraces,
} from "../../../../data/automation_debug";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../types";
import { configSections } from "../../ha-panel-config";
import "./ha-timeline";

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
              <div class="trace">
                <ha-timeline>
                  Triggered at
                  ${formatDateTimeWithSeconds(
                    new Date(this._trace.timestamp.start),
                    this.hass.language
                  )}
                </ha-timeline>

                ${!this._trace.condition_trace
                  ? ""
                  : Object.entries(this._trace.condition_trace).map(
                      ([path, value]) => html`
                        <ha-timeline ?lastItem=${!value[0].result.result}>
                          ${path}
                          ${value[0].result.result ? "passed" : "failed"}
                        </ha-timeline>
                      `
                    )}
                ${!this._trace.action_trace
                  ? ""
                  : Object.entries(this._trace.action_trace).map(
                      ([path, value]) => html`
                        <ha-timeline>
                          ${path} @
                          ${formatDateTimeWithSeconds(
                            new Date(value[0].timestamp),
                            this.hass.language
                          )}
                        </ha-timeline>
                      `
                    )}
                ${this._trace.last_action === null
                  ? ""
                  : html`
                      <ha-timeline lastItem>
                        ${this._trace.timestamp.finish
                          ? html`Finished at
                            ${formatDateTimeWithSeconds(
                              new Date(this._trace.timestamp.finish),
                              this.hass.language
                            )}
                            (${Math.round(
                              // @ts-expect-error
                              (new Date(this._trace.timestamp.finish!) -
                                // @ts-expect-error
                                new Date(this._trace.timestamp.start)) /
                                1000,
                              1
                            )}
                            seconds)`
                          : "Still running"}
                      </ha-timeline>
                    `}
              </div>
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
    const traces = await loadAutomationTraces(this.hass);
    const automationTraces = traces[this.automationId];

    if (!automationTraces || automationTraces.length === 0) {
      // TODO no trace found.
    }

    this._trace = await loadAutomationTrace(
      this.hass,
      this.automationId,
      automationTraces[automationTraces.length - 1].run_id
    );
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
    return [
      haStyle,
      css`
        .trace {
          max-width: 800px;
          margin: 0 auto;
        }

        ha-timeline:first-child {
          --timeline-ball-color: var(--primary-color);
        }

        ha-timeline[lastItem] {
          --timeline-ball-color: var(--error-color);
        }
      `,
    ];
  }
}

customElements.define("ha-automation-trace", HaAutomationTracer);

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace": HaAutomationTracer;
  }
}
