import "@material/mwc-icon-button/mwc-icon-button";
import {
  mdiClose,
  mdiPageLayoutFooter,
  mdiPageLayoutHeader,
  mdiPencil,
} from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-paper-dropdown-menu";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import { LovelaceHeaderFooterConfig } from "../../header-footer/types";

@customElement("hui-header-footer-editor")
export class HuiHeaderFooterEditor extends LitElement {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceHeaderFooterConfig;

  @property() public configValue!: string;

  protected render(): TemplateResult {
    return html`
      <div>
        <ha-svg-icon
          class="header-footer-icon"
          .path=${this.configValue === "header"
            ? mdiPageLayoutHeader
            : mdiPageLayoutFooter}
        ></ha-svg-icon>
        <span>
          ${this.hass.localize(
            `ui.panel.lovelace.editor.header-footer.${this.configValue}`
          )}:
          ${this.hass!.localize(
            `ui.panel.lovelace.editor.header-footer.${this.config?.type}.name`
          ) || "None"}
        </span>
      </div>
      <div>
        <mwc-icon-button
          aria-label=${this.hass!.localize(
            "ui.components.entity.entity-picker.clear"
          )}
          class="remove-icon"
          @click=${this._delete}
        >
          <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-icon-button
          aria-label=${this.hass!.localize(
            "ui.components.entity.entity-picker.edit"
          )}
          class="edit-icon"
          @click=${this._edit}
        >
          <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
        </mwc-icon-button>
      </div>
    `;
  }

  private _edit(): void {
    fireEvent(this, "edit-detail-element", {
      config: this.config,
      elementType: this.configValue,
    });
  }

  private _delete(): void {
    fireEvent(this, "value-changed", { value: "" });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        font-size: 16px;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
      }

      :host > div {
        display: flex;
        align-items: center;
      }

      mwc-icon-button,
      .header-footer-icon {
        --mdc-icon-button-size: 36px;
        color: var(--secondary-text-color);
      }

      .header-footer-icon {
        padding-right: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-header-footer-editor": HuiHeaderFooterEditor;
  }
}
