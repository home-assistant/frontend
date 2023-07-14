import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
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
  @property({ attribute: false }) protected hass!: HomeAssistant;

  @state() private _params?: CreateHeaderFooterDialogParams;

  public async showDialog(
    params: CreateHeaderFooterDialogParams
  ): Promise<void> {
    this._params = params;
  }

  public closeDialog(): boolean {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        .heading=${createCloseHeading(
          this.hass,
          this.hass!.localize(
            `ui.panel.lovelace.editor.header-footer.choose_header_footer`,
            "type",
            this.hass!.localize(
              `ui.panel.lovelace.editor.header-footer.${this._params.type}`
            )
          )
        )}
        @keydown=${this._ignoreKeydown}
        @closed=${this._cancel}
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
                dialogInitialFocus
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
        <div slot="primaryAction">
          <mwc-button @click=${this._cancel}>
            ${this.hass!.localize("ui.common.cancel")}
          </mwc-button>
        </div>
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
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            --mdc-dialog-max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 850px) {
          ha-dialog {
            --mdc-dialog-min-width: 550px;
          }
        }

        ha-dialog {
          --mdc-dialog-max-width: 550px;
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
          font-size: 16px;
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
