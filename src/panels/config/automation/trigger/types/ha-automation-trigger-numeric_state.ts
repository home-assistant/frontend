import "../../../../../components/ha-form/ha-form";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import type { NumericStateTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

@customElement("ha-automation-trigger-numeric_state")
export class HaNumericStateTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: NumericStateTrigger;

  private _schema = memoizeOne(
    (entityId) =>
      [
        { name: "entity_id", required: true, selector: { entity: {} } },
        {
          name: "attribute",
          selector: { attribute: { entity_id: entityId } },
        },
        {
          name: "above",
          selector: {
            number: {
              mode: "box",
              min: Number.MIN_SAFE_INTEGER,
              max: Number.MAX_SAFE_INTEGER,
              step: 0.01,
            },
          },
        },
        {
          name: "below",
          selector: {
            number: {
              mode: "box",
              min: Number.MIN_SAFE_INTEGER,
              max: Number.MAX_SAFE_INTEGER,
              step: 0.01,
            },
          },
        },
        {
          name: "value_template",
          selector: { text: { multiline: true } },
        },
        { name: "for", selector: { duration: {} } },
      ] as const
  );

  public willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return;
    }
    // Check for templates in trigger. If found, revert to YAML mode.
    if (this.trigger && hasTemplate(this.trigger)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
    }
  }

  public static get defaultConfig() {
    return {
      entity_id: "",
    };
  }

  public render() {
    const trgFor = createDurationData(this.trigger.for);

    const data = { ...this.trigger, for: trgFor };
    const schema = this._schema(this.trigger.entity_id);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newTrigger = ev.detail.value;
    fireEvent(this, "value-changed", { value: newTrigger });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      case "entity_id":
        return this.hass.localize("ui.components.entity.entity-picker.entity");
      case "attribute":
        return this.hass.localize(
          "ui.components.entity.entity-attribute-picker.attribute"
        );
      case "for":
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.state.for`
        );
      default:
        return this.hass.localize(
          `ui.panel.config.automation.editor.triggers.type.numeric_state.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-numeric_state": HaNumericStateTrigger;
  }
}
