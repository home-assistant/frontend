import "@home-assistant/webawesome/dist/components/divider/divider";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-icon-button-next";
import "../components/ha-md-list";
import "../components/ha-md-list-item";
import type { HomeAssistant } from "../types";
import { onBoardingStyles } from "./styles";

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

      <div class="divider">
        <wa-divider></wa-divider>
        <div>
          <span
            >${this.localize(
              "ui.panel.page-onboarding.welcome.or_restore"
            )}</span
          >
        </div>
      </div>

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
          margin-bottom: calc(var(--ha-space-4) * -1);
        }
        h1 {
          margin-top: var(--ha-space-4);
          margin-bottom: var(--ha-space-2);
        }
        p {
          margin: 0;
        }
        .start {
          margin: var(--ha-space-8) 0;
          width: 100%;
        }
        .divider {
          width: calc(100% + var(--ha-space-16));
          position: relative;
          margin-left: calc(var(--ha-space-8) * -1);
          margin-right: calc(var(--ha-space-8) * -1);
        }
        .divider div {
          position: absolute;
          display: flex;
          justify-content: center;
          align-items: center;
          top: 0;
          bottom: 0;
          width: 100%;
        }
        .divider div span {
          background-color: var(--card-background-color);
          padding: 0 var(--ha-space-4);
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
