import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiPencil, mdiPlus } from "@mdi/js";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import type { LovelaceConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceHeaderFooterConfig } from "../../header-footer/types";
import { showCreateHeaderFooterDialog } from "./show-create-headerfooter-dialog";

@customElement("hui-header-footer-editor")
export class HuiHeaderFooterEditor extends LitElement {
  public hass!: HomeAssistant;

  public lovelaceConfig!: LovelaceConfig;

  @property({ attribute: false }) public config?: LovelaceHeaderFooterConfig;

  @property() public configValue!: "header" | "footer";

  protected render(): TemplateResult {
    return html`
      <div>
        <span>
          ${this.hass.localize(
            `ui.panel.lovelace.editor.header-footer.${this.configValue}`
          )}:
          ${!this.config?.type
            ? this.hass!.localize("ui.panel.lovelace.editor.common.none")
            : this.hass!.localize(
                `ui.panel.lovelace.editor.header-footer.types.${this.config?.type}.name`
              )}
        </span>
      </div>
      <div>
        ${!this.config?.type
          ? html`
              <mwc-icon-button
                aria-label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.common.add"
                )}
                class="add-icon"
                @click=${this._add}
              >
                <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              </mwc-icon-button>
            `
          : html`
              <mwc-icon-button
                aria-label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.common.clear"
                )}
                class="remove-icon"
                @click=${this._delete}
              >
                <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-icon-button
                aria-label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.common.edit"
                )}
                class="edit-icon"
                @click=${this._edit}
              >
                <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
              </mwc-icon-button>
            `}
      </div>
    `;
  }

  private _edit(): void {
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        elementConfig: this.config,
        type: this.configValue,
      },
    });
  }

  private _add(): void {
    showCreateHeaderFooterDialog(this, {
      pickHeaderFooter: (config) => this._elementPicked(config),
      type: this.configValue,
    });
  }

  private _elementPicked(config: LovelaceHeaderFooterConfig): void {
    fireEvent(this, "value-changed", { value: config });
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        elementConfig: config,
        type: this.configValue,
      },
    });
  }

  private _delete(): void {
    fireEvent(this, "value-changed", { value: "" });
  }

  static get styles(): CSSResultGroup {
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
