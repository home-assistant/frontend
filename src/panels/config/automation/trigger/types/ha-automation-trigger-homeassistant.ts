import "../../../../../components/ha-form/ha-form";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HassTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../../components/ha-form/types";

export const computeLabel = (
  fieldName: string,
  localize: LocalizeFunc
): string =>
  localize(
    `ui.panel.config.automation.editor.triggers.type.homeassistant.${fieldName}` as any
  );

export const YAML_SCHEMA = [
  {
    name: "event",
    type: "select" as const,
    required: true,
    options: [["start", "start"] as const, ["shutdown", "shutdown"] as const],
  },
] as const;

@customElement("ha-automation-trigger-homeassistant")
export class HaHassTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: HassTrigger;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc) =>
      [
        {
          name: "event",
          type: "select",
          required: true,
          options: [
            [
              "start",
              localize(
                "ui.panel.config.automation.editor.triggers.type.homeassistant.start"
              ),
            ],
            [
              "shutdown",
              localize(
                "ui.panel.config.automation.editor.triggers.type.homeassistant.shutdown"
              ),
            ],
          ],
        },
      ] as const
  );

  public static get defaultConfig(): HassTrigger {
    return {
      trigger: "homeassistant",
      event: "start" as HassTrigger["event"],
    };
  }

  protected render() {
    return html`
      <ha-form
        .schema=${this._schema(this.hass.localize)}
        .data=${this.trigger}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
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
  ): string => computeLabel(schema.name, this.hass.localize);

  static styles = css`
    label {
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-homeassistant": HaHassTrigger;
  }
}
