import { customElement, property } from "lit/decorators";
import { css, html, LitElement } from "lit";
import memoizeOne from "memoize-one";
import type { HomeAssistant } from "../../../../../types";
import type { BlueprintInput } from "../../../../../data/blueprint";
import "../../../../../components/ha-textarea";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-select";
import "@material/mwc-list/mwc-list-item";
import "../../../../../components/ha-selector/ha-selector";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../../components/ha-form/types";
import type { Selector } from "../../../../../data/selector";
import { fireEvent } from "../../../../../common/dom/fire_event";

@customElement("ha-blueprint-input-input")
export class HaBlueprintInputInput extends LitElement {
  public static get defaultConfig(): BlueprintInput {
    return {
      name: "",
      description: "",
      selector: { text: { type: "text" } },
      default: "",
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) input!: BlueprintInput;

  @property({ type: Boolean }) public disabled = false;

  private _schema = memoizeOne(
    (localize: LocalizeFunc, defaultSelector: Selector) =>
      [
        {
          name: "name",
          type: "string",
        },
        {
          name: "description",
          type: "string",
        },
        {
          name: "selector",
          type: "select",
          options: [
            [
              "action",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.action"
              ),
            ],
            [
              "addon",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.addon"
              ),
            ],
            [
              "area",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.area"
              ),
            ],
            [
              "assist_pipeline",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.assist_pipeline"
              ),
            ],
            [
              "attribute",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.attribute"
              ),
            ],
            [
              "backup_location",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.backup_location"
              ),
            ],
            [
              "boolean",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.boolean"
              ),
            ],
            [
              "color_rgb",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.color_rgb"
              ),
            ],
            [
              "color_temp",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.color_temp"
              ),
            ],
            [
              "condition",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.condition"
              ),
            ],
            [
              "config_entry",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.config_entry"
              ),
            ],
            [
              "constant",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.constant"
              ),
            ],
            [
              "country",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.country"
              ),
            ],
            [
              "conversation_agent",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.conversation_agent"
              ),
            ],
            [
              "date",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.date"
              ),
            ],
            [
              "datetime",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.datetime"
              ),
            ],
            [
              "device",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.device"
              ),
            ],
            [
              "duration",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.duration"
              ),
            ],
            [
              "entity",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.entity"
              ),
            ],
            [
              "file",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.file"
              ),
            ],
            [
              "floor",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.floor"
              ),
            ],
            [
              "icon",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.icon"
              ),
            ],
            [
              "label",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.label"
              ),
            ],
            [
              "language",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.language"
              ),
            ],
            [
              "location",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.location"
              ),
            ],
            [
              "media",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.media"
              ),
            ],
            [
              "number",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.number"
              ),
            ],
            [
              "object",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.object"
              ),
            ],
            [
              "qr_code",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.qr_code"
              ),
            ],
            [
              "select",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.select"
              ),
            ],
            [
              "state",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.state"
              ),
            ],
            [
              "target",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.target"
              ),
            ],
            [
              "template",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.template"
              ),
            ],
            [
              "text",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.text"
              ),
            ],
            [
              "time",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.time"
              ),
            ],
            [
              "theme",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.theme"
              ),
            ],
            [
              "trigger",
              localize(
                "ui.panel.config.blueprint.editor.inputs.type.single.trigger"
              ),
            ],
          ],
        },
        {
          name: "default",
          selector: defaultSelector,
        },
      ] as const
  );

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.blueprint.editor.inputs.type.single.${schema.name}`
    );

  private _valueChanged(e: CustomEvent) {
    e.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...e.detail.value,
        selector: { [e.detail.value.selector]: {} },
      },
    });
  }

  protected render() {
    const selector = this.input.selector ?? { text: {} };
    const schema = this._schema(this.hass.localize, selector);
    const data = {
      ...this.input,
      selector: Object.keys(this.input.selector ?? selector)[0],
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
      <!-- TODO: Sub-selector settings -->
    `;
  }

  static styles = css`
    ha-textfield,
    ha-textarea,
    ha-select,
    ha-selector {
      display: block;
      margin-bottom: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-input-input": HaBlueprintInputInput;
  }
}
