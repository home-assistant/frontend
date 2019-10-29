import {
  customElement,
  LitElement,
  property,
  CSSResultArray,
  css,
  TemplateResult,
  html,
} from "lit-element";
import "../../components/dialog/ha-paper-dialog";
import { HomeAssistant } from "../../types";
import { HaDomainTogglerDialogParams } from "./show-dialog-domain-toggler";
import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";

@customElement("dialog-domain-toggler")
class DomainTogglerDialog extends LitElement {
  public hass!: HomeAssistant;
  @property() private _params?: HaDomainTogglerDialogParams;

  public async showDialog(params: HaDomainTogglerDialogParams): Promise<void> {
    this._params = params;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    const domains = this._params.domains
      .map((domain) => [this.hass.localize(`domain.${domain}`), domain])
      .sort();

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed=${this._openedChanged}
      >
        <h2>
          ${this.hass.localize("ui.dialogs.domain_toggler.title")}
        </h2>
        <div>
          ${domains.map(
            (domain) =>
              html`
                <div>${domain[0]}</div>
                <mwc-button .domain=${domain[1]} @click=${this._handleOff}>
                  ${this.hass.localize("state.default.off")}
                </mwc-button>
                <mwc-button .domain=${domain[1]} @click=${this._handleOn}>
                  ${this.hass.localize("state.default.on")}
                </mwc-button>
              `
          )}
        </div>
      </ha-paper-dialog>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    // Closed dialog by clicking on the overlay
    if (!ev.detail.value) {
      this._params = undefined;
    }
  }

  private _handleOff(ev) {
    this._params!.toggleDomain(ev.currentTarget.domain, false);
    ev.currentTarget.blur();
  }

  private _handleOn(ev) {
    this._params!.toggleDomain(ev.currentTarget.domain, true);
    ev.currentTarget.blur();
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          max-width: 500px;
        }
        div {
          display: grid;
          grid-template-columns: auto auto auto;
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
