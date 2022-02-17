import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import "@material/mwc-select/mwc-select";
import "@material/mwc-list/mwc-list-item";
import { stopPropagation } from "../../../common/dom/stop_propagation";

@customElement("hui-theme-select-editor")
export class HuiThemeSelectEditor extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: false }) public hass?: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <mwc-select
        .label=${this.label ||
        `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.theme"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.optional"
        )})`}
        .value=${this.value}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        <mwc-list-item value="remove"
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.no_theme"
          )}</mwc-list-item
        >
        ${Object.keys(this.hass!.themes.themes)
          .sort()
          .map(
            (theme) =>
              html` <mwc-list-item .value=${theme}>${theme}</mwc-list-item> `
          )}
      </mwc-select>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-select {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    if (!this.hass || ev.target.value === "") {
      return;
    }
    this.value = ev.target.value === "remove" ? "" : ev.target.selected;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-theme-select-editor": HuiThemeSelectEditor;
  }
}
