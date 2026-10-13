import type { ContextType } from "@lit/context";
import {
  mdiAlertOctagonOutline,
  mdiAlertOutline,
  mdiDatabaseExportOutline,
  mdiWeb,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { goBack } from "../../../common/navigate";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../components/ha-checkbox";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-svg-icon";
import "../../../components/item/ha-list-item-base";
import "../../../components/list/ha-list-base";
import { apiContext, internationalizationContext } from "../../../data/context";
import {
  acceptMarketplaceWarning,
  marketplaceErrorMessage,
} from "../../../data/marketplace/websocket";

const RISKS = [
  { risk: "internet", icon: mdiWeb },
  { risk: "data", icon: mdiDatabaseExportOutline },
  { risk: "stability", icon: mdiAlertOctagonOutline },
] as const;

const MINDFUL = ["read", "monitor", "uninstall"] as const;

// Shown over the Marketplace until the user accepts it, the Marketplace stays
// visible behind it but can't be used before then
@customElement("ha-marketplace-warning")
export class HaMarketplaceWarning extends LitElement {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _understood = false;

  @state() private _accepting = false;

  @state() private _error?: string;

  // Going back twice would leave the page before the Marketplace as well
  private _leaving = false;

  protected render() {
    return html`
      <ha-dialog
        open
        prevent-scrim-close
        .headerTitle=${this._i18n.localize(
          "ui.panel.marketplace.warning.title"
        )}
      >
        <ha-svg-icon
          slot="headerNavigationIcon"
          class="badge"
          .path=${mdiAlertOutline}
        ></ha-svg-icon>
        <p class="intro">
          ${this._i18n.localize("ui.panel.marketplace.warning.intro")}
        </p>
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <section class="box risks">
          <h3>
            ${this._i18n.localize("ui.panel.marketplace.warning.risks_title")}
          </h3>
          <ha-list-base>
            ${RISKS.map(
              ({ risk, icon }) => html`
                <ha-list-item-base>
                  <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
                  <span slot="content">
                    ${this._i18n.localize(
                      `ui.panel.marketplace.warning.risks.${risk}`
                    )}
                  </span>
                </ha-list-item-base>
              `
            )}
          </ha-list-base>
        </section>
        <section class="box mindful">
          <h3>
            ${this._i18n.localize("ui.panel.marketplace.warning.mindful_title")}
          </h3>
          <ha-list-base>
            ${MINDFUL.map(
              (step, index) => html`
                <ha-list-item-base>
                  <span slot="start" class="step">${index + 1}</span>
                  <span slot="content">
                    ${this._i18n.localize(
                      `ui.panel.marketplace.warning.mindful.${step}`
                    )}
                  </span>
                </ha-list-item-base>
              `
            )}
          </ha-list-base>
        </section>
        <div class="box agree">
          <ha-checkbox
            autofocus
            .checked=${this._understood}
            .disabled=${this._accepting}
            @change=${this._understoodChanged}
          >
            ${this._i18n.localize("ui.panel.marketplace.warning.understand")}
          </ha-checkbox>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._goBack}
          >
            ${this._i18n.localize("ui.panel.marketplace.warning.go_back")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${!this._understood}
            .loading=${this._accepting}
            @click=${this._accept}
          >
            ${this._i18n.localize("ui.panel.marketplace.warning.continue")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _understoodChanged(ev: HASSDomTargetEvent<HaCheckbox>): void {
    this._understood = ev.target.checked;
  }

  // Neither Escape nor the scrim close the warning, leaving the Marketplace
  // takes a deliberate choice here, like accepting it does
  private _goBack(): void {
    if (this._leaving) {
      return;
    }
    this._leaving = true;
    goBack("/config");
  }

  private async _accept(): Promise<void> {
    if (!this._understood || this._accepting) {
      return;
    }

    this._accepting = true;
    this._error = undefined;

    try {
      // The panel removes the warning once it fetches the acceptance, until
      // then it stays usable
      await acceptMarketplaceWarning(this._api);
    } catch (err: unknown) {
      this._error = marketplaceErrorMessage(err, this._i18n.localize);
    } finally {
      this._accepting = false;
    }
  }

  static styles = css`
    ha-dialog {
      --ha-dialog-header-white-space: normal;
      --ha-dialog-header-title-height: auto;
    }

    .badge {
      flex: none;
      align-self: center;
      margin-inline-start: var(--ha-space-4);
      margin-inline-end: var(--ha-space-3);
      padding: var(--ha-space-2);
      border-radius: var(--ha-border-radius-circle);
      background-color: rgba(var(--rgb-warning-color), 0.16);
      color: var(--warning-color);
    }

    .intro {
      margin: 0 0 var(--ha-space-4);
      color: var(--secondary-text-color);
    }

    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-3);
    }

    .box {
      padding: var(--ha-space-4);
      border-radius: var(--ha-border-radius-lg);
    }

    .box + .box {
      margin-top: var(--ha-space-3);
    }

    .risks,
    .agree {
      background-color: rgba(var(--rgb-warning-color), 0.12);
    }

    .mindful {
      border: 1px solid var(--divider-color);
    }

    h3 {
      margin: 0 0 var(--ha-space-3);
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }

    ha-list-base {
      --ha-list-gap: var(--ha-space-3);
    }

    ha-list-item-base {
      --ha-row-item-gap: var(--ha-space-3);
      --ha-row-item-padding-block: 0;
      --ha-row-item-padding-inline: 0;
      --ha-row-item-min-height: 0;
    }

    .risks ha-svg-icon {
      --mdc-icon-size: 20px;
      color: var(--warning-color);
    }

    .step {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--secondary-background-color);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-warning": HaMarketplaceWarning;
  }
}
