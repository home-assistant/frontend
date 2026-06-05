import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";
import "./ha-icon-button";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";

@customElement("ha-icon-button-arrow-next")
export class HaIconButtonArrowNext extends LitElement {
  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _icon =
    mainWindow.document.dir === "rtl" ? mdiArrowLeft : mdiArrowRight;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button
        .disabled=${this.disabled}
        .label=${this.label || this._localize("ui.common.next") || "Next"}
        .path=${this._icon}
      ></ha-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-arrow-next": HaIconButtonArrowNext;
  }
}
