import type { ContextType } from "@lit/context";
import { mdiContentCopy } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { copyToClipboard } from "../../../common/util/copy-clipboard";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-code-editor";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-button";
import "../../../components/ha-spinner";
import type { AnalyticsPreview } from "../../../data/analytics";
import { fetchAnalyticsPreview } from "../../../data/analytics";
import { apiContext, internationalizationContext } from "../../../data/context";
import { DialogMixin } from "../../../dialogs/dialog-mixin";
import { showToast } from "../../../util/toast";

const SECTIONS = ["analytics", "snapshot"] as const;

@customElement("dialog-analytics-preview")
export class DialogAnalyticsPreview extends DialogMixin(LitElement) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _preview?: AnalyticsPreview;

  @state() private _error?: string;

  connectedCallback() {
    super.connectedCallback();
    this._load();
  }

  private async _load(): Promise<void> {
    try {
      this._preview = await fetchAnalyticsPreview(this._api.callWS);
    } catch (err: any) {
      this._error =
        err?.message ||
        this._i18n.localize("ui.panel.config.analytics.preview.load_failed");
    }
  }

  protected render() {
    if (!this._i18n) {
      return nothing;
    }
    const localize = this._i18n.localize;
    const sections = this._preview
      ? SECTIONS.filter((section) => this._preview![section] !== null)
      : [];

    return html`
      <ha-dialog
        open
        .headerTitle=${localize("ui.panel.config.analytics.preview.title")}
      >
        ${
          sections.length
            ? html`
                <ha-icon-button
                  slot="headerActionItems"
                  .label=${localize(
                    "ui.components.yaml-editor.copy_to_clipboard"
                  )}
                  .path=${mdiContentCopy}
                  @click=${this._copy}
                ></ha-icon-button>
              `
            : nothing
        }
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : !this._preview
              ? html`<ha-spinner></ha-spinner>`
              : !sections.length
                ? html`
                    <p class="empty">
                      ${localize("ui.panel.config.analytics.preview.empty")}
                    </p>
                  `
                : html`
                    <p>
                      ${localize("ui.panel.config.analytics.preview.intro")}
                    </p>
                    ${sections.map(
                      (section) => html`
                        <h3>
                          ${localize(
                            `ui.panel.config.analytics.preview.${section}`
                          )}
                        </h3>
                        <ha-code-editor
                          mode="yaml"
                          read-only
                          in-dialog
                          dir="ltr"
                          .hasToolbar=${false}
                          .value=${JSON.stringify(
                            this._preview![section],
                            null,
                            2
                          )}
                        ></ha-code-editor>
                      `
                    )}
                  `
        }
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _copy() {
    await copyToClipboard(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(this._preview!).filter(([, value]) => value !== null)
        ),
        null,
        2
      )
    );
    showToast(this, {
      message: this._i18n.localize("ui.common.copied_clipboard"),
    });
  }

  static styles = css`
    p {
      margin: 0 0 var(--ha-space-4);
    }

    p.empty {
      margin: 0;
      color: var(--secondary-text-color);
      text-align: center;
    }

    h3 {
      margin: var(--ha-space-4) 0 var(--ha-space-2);
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }

    ha-spinner {
      display: block;
      margin: var(--ha-space-4) auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-analytics-preview": DialogAnalyticsPreview;
  }
}
