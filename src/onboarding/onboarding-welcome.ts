import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import "../components/ha-button";
import "../components/ha-icon-next";
import "../components/item/ha-list-item-button";
import "../components/list/ha-list-base";
import { translationsReadyContext } from "../mixins/lit-localize-lite-mixin";
import { renderSkeleton, skeletonStyles } from "./render-skeleton";
import { onBoardingStyles } from "./styles";

@customElement("onboarding-welcome")
class OnboardingWelcome extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: translationsReadyContext, subscribe: true })
  private _translationsReady!: boolean;

  protected render(): TemplateResult {
    const ready = this._translationsReady;
    return html`
      <h1>
        ${
          ready
            ? this._localize("ui.panel.page-onboarding.welcome.header")
            : renderSkeleton("title")
        }
      </h1>
      <p>
        ${
          ready
            ? this._localize("ui.panel.page-onboarding.intro")
            : renderSkeleton("line")
        }
      </p>

      <ha-button @click=${this._start} class="start" .disabled=${!ready}>
        ${
          ready
            ? this._localize("ui.panel.page-onboarding.welcome.start")
            : renderSkeleton("button")
        }
      </ha-button>

      <div class="divider">
        <wa-divider></wa-divider>
        <div>
          <span>
            ${
              ready
                ? this._localize("ui.panel.page-onboarding.welcome.or_restore")
                : renderSkeleton("chip")
            }
          </span>
        </div>
      </div>

      <ha-list-base>
        <ha-list-item-button
          @click=${this._restoreBackupUpload}
          .disabled=${!ready}
        >
          <div slot="headline">
            ${
              ready
                ? this._localize(
                    "ui.panel.page-onboarding.restore.upload_backup"
                  )
                : renderSkeleton("headline")
            }
          </div>
          <div slot="supporting-text">
            ${
              ready
                ? this._localize(
                    "ui.panel.page-onboarding.restore.options.upload_description"
                  )
                : renderSkeleton("line")
            }
          </div>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
        <ha-list-item-button
          @click=${this._restoreBackupCloud}
          .disabled=${!ready}
        >
          <div slot="headline">
            ${ready ? "Home Assistant Cloud" : renderSkeleton("headline")}
          </div>
          <div slot="supporting-text">
            ${
              ready
                ? this._localize(
                    "ui.panel.page-onboarding.restore.ha-cloud.description"
                  )
                : renderSkeleton("line")
            }
          </div>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
      </ha-list-base>
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
          width: 100%;
          margin-top: var(--ha-space-4);
          margin-bottom: var(--ha-space-2);
        }
        p {
          width: 100%;
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

        ha-list-base {
          width: 100%;
          padding-bottom: 0;
          --ha-row-item-padding-inline: 0;
        }
      `,
      skeletonStyles,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-welcome": OnboardingWelcome;
  }
}
