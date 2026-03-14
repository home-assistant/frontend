import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import "../../../../../components/ha-select";
import {
  flattenTriggers,
  type AutomationConfig,
  type Trigger,
  type TriggerCondition,
} from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";

const getTriggersIds = (triggers: Trigger[]): string[] => {
  const triggerIds = flattenTriggers(triggers)
    .map((t) => ("id" in t ? t.id : undefined))
    .filter(Boolean) as string[];
  return Array.from(new Set(triggerIds));
};

@customElement("ha-automation-condition-trigger")
export class HaTriggerCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TriggerCondition;

  @property({ type: Boolean }) public disabled = false;

  @state() private _triggerIds: string[] = [];

  private _unsub?: UnsubscribeFunc;

  public static get defaultConfig(): TriggerCondition {
    return {
      condition: "trigger",
      id: "",
    };
  }

  private _schema = memoizeOne(
    (triggerIds: string[]) =>
      [
        {
          name: "id",
          selector: {
            select: {
              multiple: true,
              options: triggerIds,
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
    if (!this._triggerIds.length) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.conditions.type.trigger.no_triggers"
      );
    }

    const schema = this._schema(this._triggerIds);

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
    this._triggerIds = config?.triggers
      ? getTriggersIds(ensureArray(config.triggers))
      : [];
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (typeof newValue.id === "string") {
      if (!this._triggerIds.some((id) => id === newValue.id)) {
        newValue.id = "";
      }
    } else if (Array.isArray(newValue.id)) {
      newValue.id = newValue.id.filter((_id) =>
        this._triggerIds.some((id) => id === _id)
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
