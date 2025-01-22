import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "./restore-backup/onboarding-restore-backup-upload";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-ansi-to-html";
import "../components/ha-card";
import "../components/ha-alert";
import "../components/ha-button";
import "../components/ha-icon-button-arrow-prev";
import type { HomeAssistant } from "../types";
import "./onboarding-loading";
import { removeSearchParam } from "../common/url/search-params";
import { navigate } from "../common/navigate";
import { onBoardingStyles } from "./styles";

@customElement("onboarding-restore-backup")
class OnboardingRestoreBackup extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property() public language!: string;

  @property({ type: Boolean }) public supervisor = false;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button-arrow-prev
        .label=${this.localize("ui.panel.page-onboarding.restore.no_backup_found")}
        @click=${this._back}
      ></ha-icon-button-arrow-prev>
      </ha-icon-button>
      <h1>${this.localize("ui.panel.page-onboarding.restore.header")}</h1>
      <onboarding-restore-backup-upload
        .hass=${this.hass}
        ?supervisor=${this.supervisor}
        .localize=${this.localize}
      ></onboarding-restore-backup-upload>
    `;
  }

  private _back(): void {
    // TODO Disable when restore is in progress!
    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  static styles = [
    onBoardingStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        position: relative;
      }
      ha-icon-button-arrow-prev {
        position: absolute;
        top: 12px;
      }
      ha-card {
        width: 100%;
      }
      hassio-upload-backup {
        width: 100%;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup": OnboardingRestoreBackup;
  }
}
