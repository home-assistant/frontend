import memoizeOne from "memoize-one";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import type {
  HaFormElement,
  HaFormSelectData,
  HaFormSelectSchema,
} from "./types";
import type { SelectSelector } from "../../data/selector";
import "../ha-selector/ha-selector-select";

@customElement("ha-form-select")
export class HaFormSelect extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public schema!: HaFormSelectSchema;

  @property({ attribute: false }) public data!: HaFormSelectData;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  private _selectSchema = memoizeOne(
    (schema: HaFormSelectSchema): SelectSelector => ({
      select: {
        translation_key: schema.name,
        options: schema.options.map((option) => ({
          value: option[0],
          label: option[1],
        })),
      },
    })
  );

  protected render(): TemplateResult {
    return html`
      <ha-selector-select
        .hass=${this.hass}
        .value=${this.data}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.schema.required || false}
        .selector=${this._selectSchema(this.schema)}
        .localizeValue=${this.localizeValue}
        @value-changed=${this._valueChanged}
      ></ha-selector-select>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    let value: string | undefined = ev.detail.value;

    if (value === this.data) {
      return;
    }

    if (value === "") {
      value = undefined;
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-select": HaFormSelect;
  }
}
