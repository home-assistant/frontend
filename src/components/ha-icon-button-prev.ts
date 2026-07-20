import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mainWindow } from "../common/dom/get_main_window";
import "./ha-icon-button";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";

@customElement("ha-icon-button-prev")
export class HaIconButtonPrev extends LitElement {
  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @property() href?: string;

  @property() target?: "_blank" | "_parent" | "_self" | "_top";

  @property() rel?: string;

  @property() download?: string;

  @state() private _icon =
    mainWindow.document.dir === "rtl" ? mdiChevronRight : mdiChevronLeft;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button
        .disabled=${this.disabled}
        .label=${this.label || this._localize("ui.common.back") || "Back"}
        .path=${this._icon}
        .href=${this.href}
        .target=${this.target}
        .rel=${this.rel}
        .download=${this.download}
      ></ha-icon-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-button-prev": HaIconButtonPrev;
  }
}
