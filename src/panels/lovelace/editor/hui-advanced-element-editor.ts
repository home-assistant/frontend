import {
  customElement,
  LitElement,
  TemplateResult,
  html,
  internalProperty,
} from "lit-element";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { HomeAssistant } from "../../../types";

@customElement("hui-advanced-element-editor")
export class HuiAdvancedElementEditor extends LitElement {
  public hass!: HomeAssistant;

  @internalProperty() private _currTabIndex = 0;

  protected render(): TemplateResult {
    return html`
      <mwc-tab-bar
        .activeIndex=${this._currTabIndex}
        @MDCTabBar:activated=${(ev: CustomEvent) => this._handleTabChanged(ev)}
      >
        <mwc-tab
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_card.editor"
          )}
        ></mwc-tab>
        <mwc-tab
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_card.advanced"
          )}
        ></mwc-tab>
      </mwc-tab-bar>
      ${this._currTabIndex === 0
        ? html`<slot name="editor"></slot>`
        : html`<slot name="advanced"></slot>`}
    `;
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newTab = ev.detail.index;
    if (newTab === this._currTabIndex) {
      return;
    }

    this._currTabIndex = ev.detail.index;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-advanced-element-editor": HuiAdvancedElementEditor;
  }
}
