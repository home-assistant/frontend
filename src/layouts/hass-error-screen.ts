import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { getHistoryState, goBack } from "../common/navigate";
import "../components/ha-button";
import "../components/ha-top-app-bar-fixed";
import type { HomeAssistant } from "../types";
import { reloadForUpdate } from "../util/recover-stale-build";
import "../components/ha-alert";

@customElement("hass-error-screen")
class HassErrorScreen extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public toolbar = true;

  @property({ type: Boolean }) public rootnav = false;

  @property({ type: Boolean }) public narrow = false;

  @property() public error?: string;

  @property({ type: Boolean, attribute: "show-reload" }) public showReload =
    false;

  protected render(): TemplateResult {
    if (!this.toolbar) {
      return this._renderContent();
    }

    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${!(this.rootnav || getHistoryState()?.root)}
      >
        ${this._renderContent()}
      </ha-top-app-bar-fixed>
    `;
  }

  private _renderContent(): TemplateResult {
    return html`
      <div class="content">
        <ha-alert alert-type="error">${this.error}</ha-alert>
        <slot>
          ${
            this.showReload
              ? html`
                  <ha-button
                    appearance="filled"
                    size="s"
                    @click=${this._handleReload}
                  >
                    ${this.hass?.localize("ui.common.refresh")}
                  </ha-button>
                `
              : nothing
          }
          <ha-button appearance="plain" size="s" @click=${this._handleBack}>
            ${this.hass?.localize("ui.common.back")}
          </ha-button>
        </slot>
      </div>
    `;
  }

  private _handleBack(): void {
    goBack();
  }

  private _handleReload(): void {
    // Dirty-aware: reloads when clean, or defers with a toast when an editor
    // has unsaved changes.
    reloadForUpdate();
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
          height: 100%;
          background-color: var(--primary-background-color);
        }
        .content {
          color: var(--primary-text-color);
          height: 100%;
          display: flex;
          padding: 16px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          box-sizing: border-box;
        }
        a {
          color: var(--primary-color);
        }
        ha-alert {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-error-screen": HassErrorScreen;
  }
}
