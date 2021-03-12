import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { AutomationEntity } from "../../../../data/automation";
import {
  AutomationTraceExtended,
  loadAutomationTrace,
  loadAutomationTraces,
} from "../../../../data/automation_debug";
import "../../../../components/ha-card";
import "../../../../components/trace/hat-trace";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../types";
import { configSections } from "../../ha-panel-config";
import {
  getLogbookDataForContext,
  LogbookEntry,
} from "../../../../data/logbook";

@customElement("ha-automation-trace")
export class HaAutomationTrace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public automationId!: string;

  @property() public automations!: AutomationEntity[];

  @property() public isWide?: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @internalProperty() private _entityId?: string;

  @internalProperty() private _trace?: AutomationTraceExtended;

  @internalProperty() private _logbookEntries?: LogbookEntry[];

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
        <ha-card
          .header=${`Trace for ${
            stateObj?.attributes.friendly_name || this._entityId
          }`}
        >
          <button class="load-last" @click=${this._loadTrace}>
            Load last trace
          </button>
          ${this._trace
            ? html`
                <div class="card-content">
                  <hat-trace
                    .hass=${this.hass}
                    .trace=${this._trace}
                    .logbookEntries=${this._logbookEntries}
                  ></hat-trace>
                </div>
              `
            : ""}
        </ha-card>
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
      alert("NO traces found");
      return;
    }

    const trace = await loadAutomationTrace(
      this.hass,
      this.automationId,
      automationTraces[automationTraces.length - 1].run_id
    );
    this._logbookEntries = await getLogbookDataForContext(
      this.hass,
      trace.timestamp.start,
      trace.context.id
    );

    this._trace = trace;
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
        ha-card {
          max-width: 800px;
          margin: 24px auto;
        }

        .load-last {
          position: absolute;
          top: 8px;
          right: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trace": HaAutomationTrace;
  }
}
