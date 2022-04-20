import { mdiClose, mdiPencil, mdiPlus } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
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
              <ha-icon-button
                .label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.common.add"
                )}
                .path=${mdiPlus}
                class="add-icon"
                @click=${this._add}
              ></ha-icon-button>
            `
          : html`
              <ha-icon-button
                .label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.common.clear"
                )}
                .path=${mdiClose}
                class="remove-icon"
                @click=${this._delete}
              ></ha-icon-button>
              <ha-icon-button
                .label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.common.edit"
                )}
                .path=${mdiPencil}
                class="edit-icon"
                @click=${this._edit}
              ></ha-icon-button>
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

      ha-icon-button,
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
