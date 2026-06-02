import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { transform } from "../../common/decorators/transform";
import type { DateSelector } from "../../data/selector";
import { internationalizationContext } from "../../data/context";
import type { FrontendLocaleData } from "../../data/translation";
import type { HomeAssistantInternationalization } from "../../types";
import "../ha-date-input";
import type { HaDateInput } from "../ha-date-input";

@customElement("ha-selector-date")
export class HaDateSelector extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale!: FrontendLocaleData;

  @property({ attribute: false }) public selector!: DateSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @query("ha-date-input", true) private _input?: HaDateInput;

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  protected render() {
    return html`
      <ha-date-input
        .label=${this.label}
        .locale=${this._locale}
        .disabled=${this.disabled}
        .value=${typeof this.value === "string" ? this.value : undefined}
        .required=${this.required}
        .helper=${this.helper}
      >
      </ha-date-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-date": HaDateSelector;
  }
}
