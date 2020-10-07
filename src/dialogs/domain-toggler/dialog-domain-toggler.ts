import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-formfield";
import "../../components/ha-switch";
import { domainToName } from "../../data/integration";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { HassDialog } from "../make-dialog-manager";
import { HaDomainTogglerDialogParams } from "./show-dialog-domain-toggler";

@customElement("dialog-domain-toggler")
class DomainTogglerDialog extends LitElement
  implements HassDialog<HaDomainTogglerDialogParams> {
  public hass!: HomeAssistant;

  @internalProperty() private _params?: HaDomainTogglerDialogParams;

  public showDialog(params: HaDomainTogglerDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    const domains = this._params.domains
      .map((domain) => [domainToName(this.hass.localize, domain), domain])
      .sort();

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.dialogs.domain_toggler.title")
        )}
      >
        <div>
          ${domains.map(
            (domain) =>
              html`
                <ha-formfield .label=${domain[0]}>
                  <ha-switch
                    .domain=${domain[1]}
                    .checked=${!this._params!.exposedDomains ||
                    this._params!.exposedDomains.includes(domain[1])}
                    @change=${this._handleSwitch}
                  >
                  </ha-switch>
                </ha-formfield>
                <mwc-button .domain=${domain[1]} @click=${this._handleReset}>
                  ${this.hass.localize(
                    "ui.dialogs.domain_toggler.reset_entities"
                  )}
                </mwc-button>
              `
          )}
        </div>
      </ha-dialog>
    `;
  }

  private _handleSwitch(ev) {
    this._params!.toggleDomain(ev.currentTarget.domain, ev.target.checked);
    ev.currentTarget.blur();
  }

  private _handleReset(ev) {
    this._params!.resetDomain(ev.currentTarget.domain);
    ev.currentTarget.blur();
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
        }
        div {
          display: grid;
          grid-template-columns: auto auto;
          grid-row-gap: 8px;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-domain-toggler": DomainTogglerDialog;
  }
}
