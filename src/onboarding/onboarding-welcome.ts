import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistant } from "../types";
import { onBoardingStyles } from "./styles";
import { fireEvent } from "../common/dom/fire_event";
import "../components/ha-button";
import "../components/ha-divider";
import "../components/ha-md-list";
import "../components/ha-md-list-item";
import "../components/ha-icon-button-next";

@customElement("onboarding-welcome")
class OnboardingWelcome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  protected render(): TemplateResult {
    return html`
      <h1>${this.localize("ui.panel.page-onboarding.welcome.header")}</h1>
      <p>${this.localize("ui.panel.page-onboarding.intro")}</p>

      <ha-button @click=${this._start} class="start">
        ${this.localize("ui.panel.page-onboarding.welcome.start")}
      </ha-button>

      <ha-divider
        .label=${this.localize("ui.panel.page-onboarding.welcome.or_restore")}
      ></ha-divider>

      <ha-md-list>
        <ha-md-list-item type="button" @click=${this._restoreBackupUpload}>
          <div slot="headline">
            ${this.localize("ui.panel.page-onboarding.restore.upload_backup")}
          </div>
          <div slot="supporting-text">
            ${this.localize(
              "ui.panel.page-onboarding.restore.options.upload_description"
            )}
          </div>
          <ha-icon-button-next slot="end"></ha-icon-button-next>
        </ha-md-list-item>
        <ha-md-list-item type="button" @click=${this._restoreBackupCloud}>
          <div slot="headline">Home Assistant Cloud</div>
          <div slot="supporting-text">
            ${this.localize(
              "ui.panel.page-onboarding.restore.ha-cloud.description"
            )}
          </div>
          <ha-icon-button-next slot="end"></ha-icon-button-next>
        </ha-md-list-item>
      </ha-md-list>
    `;
  }

  private _start(): void {
    fireEvent(this, "onboarding-step", {
      type: "init",
    });
  }

  private _restoreBackupUpload(): void {
    fireEvent(this, "onboarding-step", {
      type: "init",
      result: { restore: "upload" },
    });
  }

  private _restoreBackupCloud(): void {
    fireEvent(this, "onboarding-step", {
      type: "init",
      result: { restore: "cloud" },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: -16px;
        }
        h1 {
          margin-top: 16px;
          margin-bottom: 8px;
        }
        p {
          margin: 0;
        }
        .start {
          margin: 32px 0;
          width: 100%;
        }
        ha-divider {
          --ha-divider-width: calc(100% + 64px);
          margin-left: -32px;
          margin-right: -32px;
        }
        ha-md-list {
          width: 100%;
          padding-bottom: 0;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-welcome": OnboardingWelcome;
  }
}
