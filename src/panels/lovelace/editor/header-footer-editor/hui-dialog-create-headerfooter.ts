import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceHeaderFooterConfig } from "../../header-footer/types";
import { headerFooterElements } from "../lovelace-headerfooters";
import { getHeaderFooterStubConfig } from "./get-headerfooter-stub-config";
import type { CreateHeaderFooterDialogParams } from "./show-create-headerfooter-dialog";

@customElement("hui-dialog-create-headerfooter")
export class HuiCreateDialogHeaderFooter
  extends LitElement
  implements HassDialog<CreateHeaderFooterDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CreateHeaderFooterDialogParams;

  @state() private _open = false;

  public async showDialog(
    params: CreateHeaderFooterDialogParams
  ): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass!.localize(
          `ui.panel.lovelace.editor.header-footer.choose_header_footer`,
          {
            type: this.hass!.localize(
              `ui.panel.lovelace.editor.header-footer.${this._params.type}`
            ),
          }
        )}
        width="medium"
        @keydown=${this._ignoreKeydown}
        @closed=${this._dialogClosed}
      >
        <div class="elements">
          ${headerFooterElements.map(
            (headerFooter, index) => html`
              <ha-card
                role="button"
                tabindex="0"
                aria-labelledby=${"card-name-" + index}
                outlined
                .type=${headerFooter.type}
                @click=${this._handleHeaderFooterPicked}
                @keyDown=${this._handleHeaderFooterPicked}
                ?autofocus=${index === 0}
              >
                <ha-svg-icon .path=${headerFooter.icon}></ha-svg-icon>
                <div .id=${"card-name-" + index} role="none presentation">
                  ${this.hass!.localize(
                    `ui.panel.lovelace.editor.header-footer.types.${headerFooter.type}.name`
                  )}
                </div>
              </ha-card>
            `
          )}
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this.hass!.localize("ui.common.cancel")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _handleHeaderFooterPicked(ev: CustomEvent): Promise<void> {
    if (
      ev instanceof KeyboardEvent &&
      ev.key !== "Enter" &&
      ev.key !== " " &&
      ev.key !== "Spacebar"
    ) {
      return;
    }

    const type = (ev.currentTarget as any).type;
    let config: LovelaceHeaderFooterConfig = { type };

    if (this.hass) {
      config = await getHeaderFooterStubConfig(
        this.hass,
        type,
        this._params?.entities || [],
        []
      );
    }

    this._params!.pickHeaderFooter(config);
    this.closeDialog();
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }

  private _cancel(ev?: Event) {
    if (ev) {
      ev.stopPropagation();
    }
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 2px 24px 20px 24px;
          --dialog-z-index: 6;
        }

        .elements {
          display: flex;
          flex-wrap: wrap;
        }

        .spinner,
        ha-card {
          width: calc(50% - 8px);
          text-align: center;
          margin: 4px;
        }

        ha-card {
          box-sizing: border-box;
          padding: 8px;
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-l);
          cursor: pointer;
        }

        ha-svg-icon {
          padding-bottom: 4px;
          --mdc-icon-size: 38px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-create-headerfooter": HuiCreateDialogHeaderFooter;
  }
}
