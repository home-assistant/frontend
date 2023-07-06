import "@material/mwc-list/mwc-list-item";
import memoizeOne from "memoize-one";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { ensureArray } from "../../../../../common/array/ensure-array";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-select";
import type {
  AutomationConfig,
  Trigger,
  TriggerCondition,
} from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-automation-condition-trigger")
export class HaTriggerCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TriggerCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _triggers: Trigger[] = [];

  private _unsub?: UnsubscribeFunc;

  public static get defaultConfig() {
    return {
      id: "",
    };
  }

  private _schema = memoizeOne(
    (triggers: Trigger[]) =>
      [
        {
          name: "id",
          selector: {
            select: {
              multiple: true,
              options: triggers.map((trigger) => trigger.id!),
            },
          },
          required: true,
        },
      ] as const
  );

  connectedCallback() {
    super.connectedCallback();
    const details = { callback: (config) => this._automationUpdated(config) };
    fireEvent(this, "subscribe-automation-config", details);
    this._unsub = (details as any).unsub;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
    }
  }

  protected render() {
    if (!this._triggers.length) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.no_triggers"
      );
    }

    const schema = this._schema(this._triggers);

    return html`
      <ha-form
        .schema=${schema}
        .data=${this.condition}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.conditions.type.trigger.${schema.name}`
    );

  private _automationUpdated(config?: AutomationConfig) {
    const seenIds = new Set();
    this._triggers = config?.trigger
      ? ensureArray(config.trigger).filter(
          (t) => t.id && (seenIds.has(t.id) ? false : seenIds.add(t.id))
        )
      : [];
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (typeof newValue.id === "string") {
      if (!this._triggers.some((trigger) => trigger.id === newValue.id)) {
        newValue.id = "";
      }
    } else if (Array.isArray(newValue.id)) {
      newValue.id = newValue.id.filter((id) =>
        this._triggers.some((trigger) => trigger.id === id)
      );
      if (!newValue.id.length) {
        newValue.id = "";
      }
    }

    fireEvent(this, "value-changed", { value: newValue });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-trigger": HaTriggerCondition;
  }
}
