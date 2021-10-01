import { mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@material/mwc-textfield";
import "@material/mwc-formfield";
import "@material/mwc-checkbox";
import type { Checkbox } from "@material/mwc-checkbox";
import {
  css,
  CSSResultGroup,
  html,
  svg,
  LitElement,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-button-menu";
import "../ha-icon";
import {
  HaFormElement,
  HaFormMultiSelectData,
  HaFormMultiSelectSchema,
} from "./ha-form";

function optionValue(item: string | string[]): string {
  return Array.isArray(item) ? item[0] : item;
}

function optionLabel(item: string | string[]): string {
  return Array.isArray(item) ? item[1] || item[0] : item;
}

const arrowDown = svg`
  <svg
      class="mdc-select__dropdown-icon-graphic"
      viewBox="7 10 10 5"
      focusable="false">
    <polygon
        class="mdc-select__dropdown-icon-inactive"
        stroke="none"
        fill-rule="evenodd"
        points="7 10 12 15 17 10">
    </polygon>
    <polygon
        class="mdc-select__dropdown-icon-active"
        stroke="none"
        fill-rule="evenodd"
        points="7 15 12 10 17 15">
    </polygon>
  </svg>
`;

@customElement("ha-form-multi_select")
export class HaFormMultiSelect extends LitElement implements HaFormElement {
  @property() public schema!: HaFormMultiSelectSchema;

  @property() public data!: HaFormMultiSelectData;

  @property() public label!: string;

  @property() public suffix!: string;

  @state() private _opened = false;

  @query("paper-menu-button", true) private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    const options = Array.isArray(this.schema.options)
      ? this.schema.options
      : Object.entries(this.schema.options!);

    const data = this.data || [];

    return html`
      <ha-button-menu
        fixed
        corner="BOTTOM_START"
        @opened=${this._handleOpen}
        @closed=${this._handleClose}
      >
        <mwc-textfield
          slot="trigger"
          .label=${this.label}
          .value=${data
            .map((value) => this.schema.options![value] || value)
            .join(", ")}
          .suffix=${arrowDown}
          tabindex="-1"
        ></mwc-textfield>
        <ha-svg-icon
          slot="trigger"
          .path=${this._opened ? mdiMenuUp : mdiMenuDown}
        ></ha-svg-icon>
        ${options.map((item: string | [string, string]) => {
          const value = optionValue(item);
          return html`
            <mwc-formfield .label=${optionLabel(item)}>
              <mwc-checkbox
                .checked=${data.includes(value)}
                .value=${value}
                @change=${this._valueChanged}
              ></mwc-checkbox>
            </mwc-formfield>
          `;
        })}
      </ha-button-menu>
    `;
  }

  protected firstUpdated() {
    this.updateComplete.then(() => {
      const { formElement, mdcRoot } =
        this.shadowRoot?.querySelector("mwc-textfield") || ({} as any);
      if (formElement) {
        formElement.style.textOverflow = "ellipsis";
        formElement.style.cursor = "pointer";
        formElement.setAttribute("readonly", "");
      }
      if (mdcRoot) {
        mdcRoot.style.cursor = "pointer";
      }
    });
  }

  private _valueChanged(ev: CustomEvent): void {
    const { value, checked } = ev.target as Checkbox;

    let newValue: string[];

    if (checked) {
      if (!this.data) {
        newValue = [value];
      } else if (this.data.includes(value)) {
        return;
      } else {
        newValue = [...this.data, value];
      }
    } else {
      if (!this.data.includes(value)) {
        return;
      }
      newValue = this.data.filter((v) => v !== value);
    }

    fireEvent(
      this,
      "value-changed",
      {
        value: newValue,
      },
      { bubbles: false }
    );
  }

  private _handleOpen(ev: Event): void {
    ev.stopPropagation();
    this._opened = true;
    this.toggleAttribute("opened", true);
  }

  private _handleClose(ev: Event): void {
    ev.stopPropagation();
    this._opened = false;
    this.toggleAttribute("opened", false);
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --mdc-theme-secondary: var(--primary-color);
      }
      ha-button-menu,
      mwc-textfield,
      mwc-formfield {
        display: block;
      }
      ha-svg-icon {
        color: var(--input-dropdown-icon-color);
        position: absolute;
        right: 1em;
        top: 1em;
        cursor: pointer;
      }
      :host([opened]) ha-svg-icon {
        color: var(--primary-color);
      }
      :host([opened]) ha-button-menu {
        --mdc-text-field-idle-line-color: var(--input-hover-line-color);
        --mdc-text-field-label-ink-color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-multi_select": HaFormMultiSelect;
  }
}
