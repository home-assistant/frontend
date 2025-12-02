import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-button";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import type { HomeAssistant, MFAModule } from "../../types";
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
              <ha-button
                size="small"
                appearance="plain"
                .module=${module}
                @click=${module.enabled ? this._disable : this._enable}
                >${this.hass.localize(
                  `ui.panel.profile.mfa.${module.enabled ? "disable" : "enable"}`
                )}</ha-button
              >
            </ha-settings-row>`
        )}
      </ha-card>
    `;
  }

  static styles = css`
    ha-button {
      margin-right: -0.57em;
      margin-inline-end: -0.57em;
      margin-inline-start: initial;
    }
  `;

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
        text: this.hass.localize("ui.panel.profile.mfa.confirm_disable", {
          name: mfamodule.name,
        }),
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
