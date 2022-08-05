import memoizeOne from "memoize-one";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { TimeTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

@customElement("ha-automation-trigger-time")
export class HaTimeTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TimeTrigger;

  @state() private _inputMode?: boolean;

  public static get defaultConfig() {
    return { at: "" };
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, inputMode?: boolean) => {
      const atSelector = inputMode
        ? { entity: { domain: "input_datetime" } }
        : { time: {} };

      return [
        {
          name: "mode",
          type: "select",
          required: true,
          options: [
            [
              "value",
              localize(
                "ui.panel.config.automation.editor.triggers.type.time.type_value"
              ),
            ],
            [
              "input",
              localize(
                "ui.panel.config.automation.editor.triggers.type.time.type_input"
              ),
            ],
          ],
        },
        { name: "at", selector: atSelector },
      ] as const;
    }
  );

  public willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return;
    }
    // We dont support multiple times atm.
    if (this.trigger && Array.isArray(this.trigger.at)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.editor_not_supported"))
      );
    }
  }

  protected render() {
    const at = this.trigger.at;

    if (Array.isArray(at)) {
      return html``;
    }

    const inputMode =
      this._inputMode ??
      (at?.startsWith("input_datetime.") || at?.startsWith("sensor."));

    const schema = this._schema(this.hass.localize, inputMode);

    const data = {
      mode: inputMode ? "input" : "value",
      ...this.trigger,
    };

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
    const newValue = ev.detail.value;

    this._inputMode = newValue.mode === "input";
    delete newValue.mode;

    Object.keys(newValue).forEach((key) =>
      newValue[key] === undefined || newValue[key] === ""
        ? delete newValue[key]
        : {}
    );

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.automation.editor.triggers.type.time.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-time": HaTimeTrigger;
  }
}
