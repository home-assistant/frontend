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
        without-header
        aria-labelledby="title"
        aria-describedby="intro"
      >
        <div class="heading">
          <span class="badge">
            <ha-svg-icon .path=${mdiAlertOutline}></ha-svg-icon>
          </span>
          <h2 id="title">
            ${this._i18n.localize("ui.panel.marketplace.warning.title")}
          </h2>
          <p id="intro">
            ${this._i18n.localize("ui.panel.marketplace.warning.intro")}
          </p>
        </div>
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <section class="box risks">
          <h3>
            ${this._i18n.localize("ui.panel.marketplace.warning.risks_title")}
          </h3>
          <ul role="list">
            ${RISKS.map(
              ({ risk, icon }) => html`
                <li>
                  <ha-svg-icon .path=${icon}></ha-svg-icon>
                  ${this._i18n.localize(
                    `ui.panel.marketplace.warning.risks.${risk}`
                  )}
                </li>
              `
            )}
          </ul>
        </section>
        <section class="box mindful">
          <h3>
            ${this._i18n.localize("ui.panel.marketplace.warning.mindful_title")}
          </h3>
          <ol>
            ${MINDFUL.map(
              (step) => html`
                <li>
                  ${this._i18n.localize(
                    `ui.panel.marketplace.warning.mindful.${step}`
                  )}
                </li>
              `
            )}
          </ol>
        </section>
        <div class="agree">
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
      --ha-dialog-border-radius: var(--ha-border-radius-3xl);
    }

    .heading {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
      padding-bottom: var(--ha-space-4);
    }

    .badge {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: var(--ha-space-2);
      border-radius: var(--ha-border-radius-circle);
      background-color: rgba(var(--rgb-warning-color), 0.16);
      color: var(--warning-color);
    }

    h2 {
      margin: 0;
      font-size: var(--ha-font-size-2xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: 1.3;
    }

    #intro {
      margin: 0;
      font-size: var(--ha-font-size-l);
      line-height: var(--ha-line-height-normal);
      color: var(--secondary-text-color);
    }

    ha-alert {
      display: block;
      margin-bottom: var(--ha-space-3);
    }

    .box {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
      padding: var(--ha-space-4);
      border-radius: var(--ha-border-radius-lg);
    }

    .box + .box {
      margin-top: var(--ha-space-3);
    }

    h3 {
      margin: 0;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }

    ul,
    ol {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      gap: var(--ha-space-3);
      list-style: none;
      font-size: var(--ha-font-size-m);
      line-height: 1.45;
    }

    .risks {
      background-color: rgba(var(--rgb-warning-color), 0.12);
    }

    .risks li {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
    }

    .risks ha-svg-icon {
      flex: none;
      --mdc-icon-size: 20px;
      color: var(--warning-color);
    }

    .mindful {
      border: 1px solid var(--divider-color);
    }

    .mindful ol {
      counter-reset: step;
    }

    .mindful li {
      display: flex;
      gap: var(--ha-space-3);
      counter-increment: step;
    }

    .mindful li::before {
      content: counter(step);
      display: grid;
      place-items: center;
      flex: none;
      width: 22px;
      height: 22px;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--secondary-background-color);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      line-height: 1;
    }

    .agree {
      margin: var(--ha-space-4) calc(-1 * var(--ha-space-2)) 0;
      padding: var(--ha-space-1) var(--ha-space-2);
      border-radius: var(--ha-border-radius-lg);
      background-color: rgba(var(--rgb-warning-color), 0.08);
      transition: background-color var(--ha-animation-duration-fast) ease-in-out;
    }

    .agree:hover {
      background-color: rgba(var(--rgb-warning-color), 0.14);
    }

    ha-checkbox {
      display: flex;
      align-items: center;
      min-height: 40px;
      font-size: var(--ha-font-size-m);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-warning": HaMarketplaceWarning;
  }
}
