import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  array,
  assert,
  assign,
  literal,
  nullable,
  number,
  object,
  optional,
  string,
  union,
} from "superstruct";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { ANY_STATE_VALUE } from "../../../../../components/entity/const";
import "../../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../../components/ha-form/types";
import type { StateTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { baseTriggerStruct, forDictStruct } from "../../structs";
import type { TriggerElement } from "../ha-automation-trigger-row";

type MatchChoice = "is" | "is_not";

interface MatchValue {
  active_choice: MatchChoice;
  is?: string[];
  is_not?: string[];
}

const stateTriggerStruct = assign(
  baseTriggerStruct,
  object({
    alias: optional(string()),
    trigger: literal("state"),
    entity_id: optional(union([string(), array(string())])),
    attribute: optional(string()),
    from: optional(union([nullable(string()), array(string())])),
    to: optional(union([nullable(string()), array(string())])),
    not_from: optional(union([string(), array(string())])),
    not_to: optional(union([string(), array(string())])),
    for: optional(union([number(), string(), forDictStruct])),
  })
);

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: StateTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): StateTrigger {
    return { trigger: "state", entity_id: [] };
  }

  public static checkUiSupport(
    localize: LocalizeFunc,
    trigger: StateTrigger
  ): Error | undefined {
    // Check for templates in trigger. If found, revert to YAML mode.
    // Exclude "for" since the UI now supports templates there via choose.
    const { for: forValue, ...triggerWithoutFor } = trigger;
    if (hasTemplate(triggerWithoutFor)) {
      return Error(localize("ui.errors.config.no_template_editor_support"));
    }
    try {
      // The editor drops `milliseconds: 0` before rendering, so accept it here.
      if (
        forValue &&
        typeof forValue === "object" &&
        forValue.milliseconds === 0
      ) {
        const { milliseconds: _milliseconds, ...forWithoutMs } = forValue;
        assert({ ...trigger, for: forWithoutMs }, stateTriggerStruct);
      } else {
        assert(trigger, stateTriggerStruct);
      }
    } catch (err: any) {
      return err;
    }
    return undefined;
  }

  private _schema = memoizeOne(
    (
      localize: LocalizeFunc,
      attribute: string | undefined,
      hideInFrom: string[],
      hideInTo: string[]
    ) =>
      [
        {
          name: "entity_id",
          required: true,
          selector: { entity: { multiple: true } },
        },
        {
          name: "attribute",
          context: {
            filter_entity: "entity_id",
          },
          selector: {
            attribute: {
              hide_attributes: [
                "access_token",
                "available_modes",
                "code_arm_required",
                "code_format",
                "device_class",
                "editable",
                "effect_list",
                "entity_id",
                "entity_picture",
                "event_types",
                "fan_modes",
                "fan_speed_list",
                "friendly_name",
                "frontend_stream_type",
                "has_date",
                "has_time",
                "hvac_modes",
                "icon",
                "id",
                "max_color_temp_kelvin",
                "max_mireds",
                "max_temp",
                "max",
                "min_color_temp_kelvin",
                "min_mireds",
                "min_temp",
                "min",
                "mode",
                "operation_list",
                "options",
                "percentage_step",
                "precipitation_unit",
                "preset_modes",
                "pressure_unit",
                "sound_mode_list",
                "source_list",
                "state_class",
                "step",
                "supported_color_modes",
                "supported_features",
                "swing_modes",
                "target_temp_step",
                "temperature_unit",
                "token",
                "unit_of_measurement",
                "visibility_unit",
                "wind_speed_unit",
              ],
            },
          },
        },
        {
          name: "from",
          context: {
            filter_entity: "entity_id",
          },
          selector: this._matchSelector(localize, attribute, hideInFrom),
        },
        {
          name: "to",
          context: {
            filter_entity: "entity_id",
          },
          selector: this._matchSelector(localize, attribute, hideInTo),
        },
        {
          name: "for",
          selector: {
            choose: {
              translation_key:
                "ui.panel.config.automation.editor.triggers.type.state.for_type",
              choices: {
                duration: { selector: { duration: {} } },
                template: { selector: { template: {} } },
              },
            },
          },
        },
      ] as const satisfies HaFormSchema[]
  );

  private _matchSelector(
    localize: LocalizeFunc,
    attribute: string | undefined,
    hideStates: string[]
  ) {
    return {
      choose: {
        translation_key:
          "ui.panel.config.automation.editor.triggers.type.state.match_type",
        choices: {
          is: {
            selector: {
              state: {
                multiple: true,
                extra_options: (attribute
                  ? []
                  : [
                      {
                        label: localize(
                          "ui.panel.config.automation.editor.triggers.type.state.any_state_ignore_attributes"
                        ),
                        value: ANY_STATE_VALUE,
                      },
                    ]) as any,
                attribute: attribute,
                hide_states: hideStates,
              },
            },
          },
          is_not: {
            selector: {
              state: {
                multiple: true,
                attribute: attribute,
              },
            },
          },
        },
      },
    } as const;
  }

  public shouldUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("trigger")) {
      return true;
    }
    if (
      this.trigger.for &&
      typeof this.trigger.for === "object" &&
      this.trigger.for.milliseconds === 0
    ) {
      delete this.trigger.for.milliseconds;
    }
    const err = HaStateTrigger.checkUiSupport(this.hass.localize, this.trigger);
    if (err) {
      fireEvent(this, "ui-mode-not-available", err);
      return false;
    }
    return true;
  }

  private _unwrapForValue(
    forValue: Record<string, unknown> | undefined
  ): StateTrigger["for"] {
    if (!forValue || !forValue.active_choice) {
      return forValue as StateTrigger["for"];
    }
    if (forValue.active_choice === "template") {
      return forValue.template as string;
    }
    return forValue.duration as StateTrigger["for"];
  }

  protected render() {
    const { not_from: _notFrom, not_to: _notTo, ...trigger } = this.trigger;
    const from = this._toMatchValue(
      this.trigger.from,
      this.trigger.not_from,
      this.trigger.attribute
    );
    const to = this._toMatchValue(
      this.trigger.to,
      this.trigger.not_to,
      this.trigger.attribute
    );

    const data = {
      ...trigger,
      entity_id: ensureArray(this.trigger.entity_id),
      from,
      to,
    };

    // Only hide states from the other field when both match positively,
    // "not from A to A" is a valid combination.
    const bothPositive =
      from?.active_choice !== "is_not" && to?.active_choice !== "is_not";
    const schema = this._schema(
      this.hass.localize,
      this.trigger.attribute,
      bothPositive ? (to?.is ?? []) : [],
      bothPositive ? (from?.is ?? []) : []
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .localizeValue=${this.hass.localize}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .disabled=${this.disabled}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;

    newTrigger.for = this._unwrapForValue(newTrigger.for);

    this._applyMatchValue(newTrigger, "from", "not_from");
    this._applyMatchValue(newTrigger, "to", "not_to");

    Object.keys(newTrigger).forEach((key) => {
      const val = newTrigger[key];
      if (val === undefined || val === "") {
        delete newTrigger[key];
      }
    });

    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _toMatchValue(
    value: string | string[] | null | undefined,
    notValue: string | string[] | undefined,
    attribute?: string
  ): MatchValue | undefined {
    // Leave the value empty when nothing is set, so the choose selector keeps
    // the choice the user made until a state is picked.
    if (notValue !== undefined) {
      return { active_choice: "is_not", is_not: ensureArray(notValue) };
    }
    if (value !== undefined) {
      return {
        active_choice: "is",
        is: this._normalizeStates(value, attribute),
      };
    }
    return undefined;
  }

  private _applyMatchValue(
    trigger: Record<string, any>,
    key: "from" | "to",
    notKey: "not_from" | "not_to"
  ): void {
    const match: Partial<MatchValue> | undefined = trigger[key];
    delete trigger[key];
    delete trigger[notKey];
    if (!match?.active_choice) {
      return;
    }

    if (match.active_choice === "is_not") {
      // Keep the selected states when switching from "is" to "is not".
      const states = (match.is_not ?? match.is ?? []).filter(
        (state) => state !== ANY_STATE_VALUE
      );
      if (states.length) {
        trigger[notKey] = states;
      }
      return;
    }

    const states = this._applyAnyStateExclusive(
      match.is ?? match.is_not,
      trigger.attribute
    );
    if (!Array.isArray(states) || states.length) {
      trigger[key] = states;
    }
  }

  private _applyAnyStateExclusive(
    val: string | string[] | null | undefined,
    attribute?: string
  ): string | string[] | null | undefined {
    const anyStateSelected = Array.isArray(val)
      ? val.includes(ANY_STATE_VALUE)
      : val === ANY_STATE_VALUE;
    if (anyStateSelected) {
      // Any state is exclusive: null if no attribute, undefined if attribute
      return attribute ? undefined : null;
    }
    return val;
  }

  private _normalizeStates(
    value: string | string[] | null | undefined,
    attribute?: string
  ): string[] {
    // If no attribute is selected and backend value is null,
    // expose it as the special ANY state option in the UI.
    if (!attribute && value === null) {
      return [ANY_STATE_VALUE];
    }
    if (value === undefined || value === null) {
      return [];
    }
    return ensureArray(value);
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      schema.name === "entity_id"
        ? "ui.components.entity.entity-picker.entity"
        : `ui.panel.config.automation.editor.triggers.type.state.${schema.name}`
    );

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--ha-space-3);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
