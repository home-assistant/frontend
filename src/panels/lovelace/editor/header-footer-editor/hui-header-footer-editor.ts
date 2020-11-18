import "@material/mwc-icon-button/mwc-icon-button";
import { mdiChevronRight } from "@mdi/js";
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
      <div @click=${this._click}>
        <span>
          ${this.hass.localize(
            `ui.panel.lovelace.editor.header-footer.${this.configValue}.manage`
          )}
        </span>
        <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
      </div>
    `;
  }

  private _click(): void {
    if (!this.config?.type) {
      showCreateHeaderFooterDialog(this, {
        pickHeaderFooter: (config) => this._elementPicked(config),
        type: this.configValue,
      });
      return;
    }

    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        elementConfig: this.config,
        type: this.configValue,
      },
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

  static get styles(): CSSResult {
    return css`
      :host > div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        min-height: 48px;
        cursor: pointer;
      }

      ha-svg-icon {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-header-footer-editor": HuiHeaderFooterEditor;
  }
}
