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
    (defaultSelector: Selector) =>
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
          selector: { selector: {} },
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
      value: { ...e.detail.value },
    });
  }

  protected render() {
    const selector = this.input.selector ?? { text: {} };
    const schema = this._schema(selector);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.input}
        .schema=${schema}
        .disabled=${this.disabled}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
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
