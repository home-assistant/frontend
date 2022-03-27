import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-select";
import { HomeAssistant } from "../../../types";

@customElement("hui-theme-select-editor")
export class HuiThemeSelectEditor extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: false }) public hass?: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-select
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
              html`<mwc-list-item .value=${theme}>${theme}</mwc-list-item>`
          )}
      </ha-select>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    if (!this.hass || ev.target.value === "") {
      return;
    }
    this.value = ev.target.value === "remove" ? undefined : ev.target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-theme-select-editor": HuiThemeSelectEditor;
  }
}
