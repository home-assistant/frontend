import { consume } from "@lit/context";
import { html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { transform } from "../../common/decorators/transform";
import type { TimeSelector } from "../../data/selector";
import { internationalizationContext } from "../../data/context";
import type { FrontendLocaleData } from "../../data/translation";
import type { HomeAssistantInternationalization } from "../../types";
import "../ha-time-input";
import type { HaTimeInput } from "../ha-time-input";

@customElement("ha-selector-time")
export class HaTimeSelector extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale!: FrontendLocaleData;

  @property({ attribute: false }) public selector!: TimeSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-time-input") private _input?: HaTimeInput;

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  protected render() {
    return html`
      <ha-time-input
        .value=${typeof this.value === "string" ? this.value : undefined}
        .locale=${this._locale}
        .disabled=${this.disabled}
        .required=${this.required}
        clearable
        .helper=${this.helper}
        .label=${this.label}
        .enableSecond=${!this.selector.time?.no_second}
      ></ha-time-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-time": HaTimeSelector;
  }
}
