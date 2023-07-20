import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { HomeAssistant, MFAModule } from "../../types";
import { showMfaModuleSetupFlowDialog } from "./show-ha-mfa-module-setup-flow-dialog";

@customElement("ha-mfa-modules-card")
class HaMfaModulesCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public mfaModules!: MFAModule[];

  protected render(): TemplateResult {
    return html`
      <ha-card .header=${this.hass.localize("ui.panel.profile.mfa.header")}>
        ${this.mfaModules.map(
          (module) =>
            html`<ha-settings-row two-line>
              <span slot="heading">${module.name}</span>
              <span slot="description">${module.id}</span>
              ${module.enabled
                ? html`<mwc-button .module=${module} @click=${this._disable}
                    >${this.hass.localize(
                      "ui.panel.profile.mfa.disable"
                    )}</mwc-button
                  >`
                : html`<mwc-button .module=${module} @click=${this._enable}
                    >${this.hass.localize(
                      "ui.panel.profile.mfa.enable"
                    )}</mwc-button
                  >`}
            </ha-settings-row>`
        )}
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-button {
        margin-right: -0.57em;
      }
      ha-list-item {
        --mdc-list-item-meta-size: auto;
      }
    `;
  }

  private _enable(ev) {
    showMfaModuleSetupFlowDialog(this, {
      mfaModuleId: ev.currentTarget.module.id,
      dialogClosedCallback: () => this._refreshCurrentUser(),
    });
  }

  private async _disable(ev) {
    const mfamodule = ev.currentTarget.module;
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.profile.mfa.confirm_disable",
          "name",
          mfamodule.name
        ),
      }))
    ) {
      return;
    }

    const mfaModuleId = mfamodule.id;

    this.hass
      .callWS({
        type: "auth/depose_mfa",
        mfa_module_id: mfaModuleId,
      })
      .then(() => {
        this._refreshCurrentUser();
      });
  }

  private _refreshCurrentUser() {
    fireEvent(this, "hass-refresh-current-user");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-mfa-modules-card": HaMfaModulesCard;
  }
}
