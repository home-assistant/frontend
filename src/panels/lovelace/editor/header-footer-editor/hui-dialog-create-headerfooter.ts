import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { until } from "lit-html/directives/until";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { LovelaceHeaderFooterConfig } from "../../header-footer/types";
import { headerFooterElements } from "../lovelace-headerfooters";
import { HeaderFooter } from "../types";
import { getHeaderFooterStubConfig } from "./get-headerfooter-stub-config";
import { CreateHeaderFooterDialogParams } from "./show-create-headerfooter-dialog";

@customElement("hui-dialog-create-headerfooter")
export class HuiCreateDialogHeaderFooter extends LitElement
  implements HassDialog<CreateHeaderFooterDialogParams> {
  @property({ attribute: false }) protected hass!: HomeAssistant;

  @internalProperty() private _params?: CreateHeaderFooterDialogParams;

  private _unusedEntities?: string[];

  private _usedEntities?: string[];

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

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        .heading=${createCloseHeading(this.hass, "Pick Header or Footer")}
        @keydown=${this._ignoreKeydown}
        @closed=${this._cancel}
      >
        <div class="elements">
          ${headerFooterElements.map((headerFooter) =>
            until(
              this._renderHeaderFooterElement(headerFooter),
              html`
                <div class="spinner">
                  <ha-circular-progress
                    active
                    alt="Loading"
                  ></ha-circular-progress>
                </div>
              `
            )
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

  private async _renderHeaderFooterElement(
    headerFooter: HeaderFooter
  ): Promise<TemplateResult> {
    const { type, icon } = headerFooter;
    let config: LovelaceHeaderFooterConfig = { type };

    if (this.hass) {
      config = await getHeaderFooterStubConfig(
        this.hass,
        type,
        this._params?.entities || [],
        []
      );
    }

    return html`
      <ha-card
        outlined
        .config=${config}
        @click=${this._handleHeaderFooterPicked}
      >
        <ha-svg-icon .path=${icon}></ha-svg-icon>
        <div>
          ${this.hass!.localize(
            `ui.panel.lovelace.editor.header-footer.types.${type}.name`
          )}
        </div>
      </ha-card>
    `;
  }

  private _handleHeaderFooterPicked(ev: CustomEvent) {
    this._params!.pickHeaderFooter((ev.currentTarget as any).config);
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

  static get styles(): CSSResultArray {
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
          --dialog-z-index: 5;
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
