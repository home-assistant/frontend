import { mdiFlask, mdiHelpCircle, mdiOpenInNew } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { extractSearchParam } from "../../../common/url/search-params";
import { domainToName } from "../../../data/integration";
import {
  labsUpdatePreviewFeature,
  subscribeLabFeatures,
} from "../../../data/labs";
import type { LabPreviewFeature } from "../../../data/labs";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { brandsUrl } from "../../../util/brands-url";
import { showToast } from "../../../util/toast";
import { documentationUrl } from "../../../util/documentation-url";
import { haStyle } from "../../../resources/styles";
import { showLabsPreviewFeatureEnableDialog } from "./show-dialog-labs-preview-feature-enable";
import {
  showLabsProgressDialog,
  closeLabsProgressDialog,
} from "./show-dialog-labs-progress";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import "../../../components/ha-switch";
import "../../../layouts/hass-subpage";

@customElement("ha-config-labs")
class HaConfigLabs extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _preview_features: LabPreviewFeature[] = [];

  @state() private _highlightedPreviewFeature?: string;

  private _sortedPreviewFeatures = memoizeOne(
    (localize: LocalizeFunc, features: LabPreviewFeature[]) =>
      // Sort by localized integration name alphabetically
      [...features].sort((a, b) =>
        domainToName(localize, a.domain).localeCompare(
          domainToName(localize, b.domain)
        )
      )
  );

  public hassSubscribe() {
    return [
      subscribeLabFeatures(this.hass.connection, (features) => {
        // Load title translations for integrations with preview features
        const domains = [...new Set(features.map((f) => f.domain))];
        this.hass.loadBackendTranslation("title", domains);

        this._preview_features = features;
      }),
    ];
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    // Load preview_features translations
    this.hass.loadBackendTranslation("preview_features");
    this._handleUrlParams();
  }

  private _handleUrlParams(): void {
    // Check for feature parameters in URL
    const domain = extractSearchParam("domain");
    const previewFeature = extractSearchParam("preview_feature");
    if (domain && previewFeature) {
      const previewFeatureId = `${domain}.${previewFeature}`;
      this._highlightedPreviewFeature = previewFeatureId;
      // Wait for next render to ensure cards are in DOM
      this.updateComplete.then(() => {
        this._scrollToPreviewFeature(previewFeatureId);
      });
    }
  }

  protected render() {
    const sortedFeatures = this._sortedPreviewFeatures(
      this.hass.localize,
      this._preview_features
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/system"
        .header=${this.hass.localize("ui.panel.config.labs.caption")}
      >
        ${sortedFeatures.length
          ? html`
              <a
                slot="toolbar-icon"
                href=${documentationUrl(this.hass, "/integrations/labs/")}
                target="_blank"
                rel="noopener noreferrer"
                .title=${this.hass.localize("ui.common.help")}
              >
                <ha-icon-button
                  .label=${this.hass.localize("ui.common.help")}
                  .path=${mdiHelpCircle}
                ></ha-icon-button>
              </a>
            `
          : nothing}
        <div class="content">
          ${!sortedFeatures.length
            ? html`
                <div class="empty">
                  <ha-svg-icon .path=${mdiFlask}></ha-svg-icon>
                  <h1>
                    ${this.hass.localize("ui.panel.config.labs.empty.title")}
                  </h1>
                  ${this.hass.localize(
                    "ui.panel.config.labs.empty.description"
                  )}
                  <a
                    href=${documentationUrl(this.hass, "/integrations/labs/")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${this.hass.localize("ui.panel.config.labs.learn_more")}
                    <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
                  </a>
                </div>
              `
            : html`
                <ha-card outlined>
                  <div class="card-content intro-card">
                    <h1>
                      ${this.hass.localize("ui.panel.config.labs.intro_title")}
                    </h1>
                    <p class="intro-text">
                      ${this.hass.localize(
                        "ui.panel.config.labs.intro_description"
                      )}
                    </p>
                    <ha-alert alert-type="warning">
                      ${this.hass.localize(
                        "ui.panel.config.labs.intro_warning"
                      )}
                    </ha-alert>
                  </div>
                </ha-card>

                ${sortedFeatures.map((preview_feature) =>
                  this._renderPreviewFeature(preview_feature)
                )}
              `}
        </div>
      </hass-subpage>
    `;
  }

  private _renderPreviewFeature(
    preview_feature: LabPreviewFeature
  ): TemplateResult {
    const featureName = this.hass.localize(
      `component.${preview_feature.domain}.preview_features.${preview_feature.preview_feature}.name`
    );

    const description = this.hass.localize(
      `component.${preview_feature.domain}.preview_features.${preview_feature.preview_feature}.description`
    );

    const integrationName = domainToName(
      this.hass.localize,
      preview_feature.domain
    );

    const integrationNameWithCustomLabel = !preview_feature.is_built_in
      ? `${integrationName} • ${this.hass.localize("ui.panel.config.labs.custom_integration")}`
      : integrationName;

    const previewFeatureId = `${preview_feature.domain}.${preview_feature.preview_feature}`;
    const isHighlighted = this._highlightedPreviewFeature === previewFeatureId;

    // Build description with learn more link if available
    const descriptionWithLink = preview_feature.learn_more_url
      ? `${description}\n\n[${this.hass.localize("ui.panel.config.labs.learn_more")}](${preview_feature.learn_more_url})`
      : description;

    return html`
      <ha-card
        outlined
        data-feature-id=${previewFeatureId}
        class=${isHighlighted ? "highlighted" : ""}
      >
        <div class="card-content">
          <div class="card-header">
            <img
              alt=""
              src=${brandsUrl({
                domain: preview_feature.domain,
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              })}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
            />
            <div class="feature-title">
              <span class="integration-name"
                >${integrationNameWithCustomLabel}</span
              >
              <h2>${featureName}</h2>
            </div>
          </div>
          <ha-markdown .content=${descriptionWithLink} breaks></ha-markdown>
        </div>
        <div class="card-actions">
          <div>
            ${preview_feature.feedback_url
              ? html`
                  <ha-button
                    appearance="plain"
                    href=${preview_feature.feedback_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.labs.provide_feedback"
                    )}
                  </ha-button>
                `
              : nothing}
            ${preview_feature.report_issue_url
              ? html`
                  <ha-button
                    appearance="plain"
                    href=${preview_feature.report_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${this.hass.localize("ui.panel.config.labs.report_issue")}
                  </ha-button>
                `
              : nothing}
          </div>
          <ha-button
            appearance="filled"
            .variant=${preview_feature.enabled ? "danger" : "brand"}
            @click=${this._handleToggle}
            .preview_feature=${preview_feature}
          >
            ${this.hass.localize(
              preview_feature.enabled
                ? "ui.panel.config.labs.disable"
                : "ui.panel.config.labs.enable"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _scrollToPreviewFeature(previewFeatureId: string): void {
    const card = this.shadowRoot?.querySelector(
      `[data-feature-id="${previewFeatureId}"]`
    ) as HTMLElement;
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      // Clear highlight after animation
      setTimeout(() => {
        this._highlightedPreviewFeature = undefined;
      }, 3000);
    }
  }

  private async _handleToggle(ev: Event): Promise<void> {
    const buttonEl = ev.currentTarget as HTMLElement & {
      preview_feature: LabPreviewFeature;
    };
    const preview_feature = buttonEl.preview_feature;
    const enabled = !preview_feature.enabled;
    const previewFeatureId = `${preview_feature.domain}.${preview_feature.preview_feature}`;

    if (enabled) {
      // Show custom enable dialog with backup option
      showLabsPreviewFeatureEnableDialog(this, {
        preview_feature,
        previewFeatureId,
        onConfirm: async (shouldCreateBackup) => {
          await this._performToggle(
            previewFeatureId,
            enabled,
            shouldCreateBackup
          );
        },
      });
      return;
    }

    // Show simple confirmation dialog for disable
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.labs.disable_title"),
      text:
        this.hass.localize(
          `component.${preview_feature.domain}.preview_features.${preview_feature.preview_feature}.disable_confirmation`
        ) || this.hass.localize("ui.panel.config.labs.disable_confirmation"),
      confirmText: this.hass.localize("ui.panel.config.labs.disable"),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    await this._performToggle(previewFeatureId, enabled, false);
  }

  private async _performToggle(
    previewFeatureId: string,
    enabled: boolean,
    createBackup: boolean
  ): Promise<void> {
    if (createBackup) {
      showLabsProgressDialog(this, { enabled });
    }

    const parts = previewFeatureId.split(".", 2);
    if (parts.length !== 2) {
      showToast(this, {
        message: this.hass.localize("ui.common.unknown_error"),
      });
      return;
    }
    const [domain, preview_feature] = parts;

    try {
      await labsUpdatePreviewFeature(
        this.hass,
        domain,
        preview_feature,
        enabled,
        createBackup
      );
    } catch (err: any) {
      if (createBackup) {
        closeLabsProgressDialog();
      }
      const errorMessage =
        err?.message || this.hass.localize("ui.common.unknown_error");
      showToast(this, {
        message: this.hass.localize(
          enabled
            ? "ui.panel.config.labs.enable_failed"
            : "ui.panel.config.labs.disable_failed",
          { error: errorMessage }
        ),
      });
      return;
    }

    // Close dialog before showing success toast
    if (createBackup) {
      closeLabsProgressDialog();
    }

    // Show success toast - collection will auto-update via labs_updated event
    showToast(this, {
      message: this.hass.localize(
        enabled
          ? "ui.panel.config.labs.enabled_success"
          : "ui.panel.config.labs.disabled_success"
      ),
    });
  }

  static styles = [
    haStyle,
    css`
      :host {
        display: block;
      }

      a[slot="toolbar-icon"] {
        color: var(--sidebar-icon-color);
      }

      .content {
        max-width: 800px;
        margin: 0 auto;
        padding: var(--ha-space-4);
        min-height: calc(100vh - 64px);
        display: flex;
        flex-direction: column;
      }

      .content:has(.empty) {
        justify-content: center;
      }

      ha-card {
        margin-bottom: var(--ha-space-4);
        position: relative;
        transition: box-shadow 0.3s ease;
      }

      ha-card.highlighted {
        animation: highlight-fade 2.5s ease-out forwards;
      }

      @keyframes highlight-fade {
        0% {
          box-shadow:
            0 0 0 var(--ha-border-width-md) var(--primary-color),
            0 0 var(--ha-shadow-blur-lg) rgba(var(--rgb-primary-color), 0.4);
        }
        100% {
          box-shadow:
            0 0 0 var(--ha-border-width-md) transparent,
            0 0 0 transparent;
        }
      }

      /* Intro card */
      .intro-card {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-4);
      }

      .intro-card h1 {
        margin: 0;
      }

      .intro-text {
        margin: 0 0 var(--ha-space-3);
      }

      /* Feature cards */
      .card-content {
        padding: var(--ha-space-4);
      }

      .card-header {
        display: flex;
        gap: var(--ha-space-3);
        margin-bottom: var(--ha-space-4);
        align-items: flex-start;
      }

      .card-header img {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .feature-title {
        flex: 1;
        min-width: 0;
      }

      .feature-title h2 {
        margin: 0;
        line-height: 1.3;
      }

      .integration-name {
        display: block;
        margin-bottom: 2px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }

      /* Empty state */
      .empty {
        max-width: 500px;
        margin: 0 auto;
        padding: var(--ha-space-12) var(--ha-space-4);
        text-align: center;
      }

      .empty ha-svg-icon {
        width: 120px;
        height: 120px;
        color: var(--secondary-text-color);
        opacity: 0.3;
      }

      .empty h1 {
        margin: var(--ha-space-6) 0 var(--ha-space-4);
      }

      .empty p {
        margin: 0 0 var(--ha-space-6);
        font-size: 16px;
        line-height: 24px;
        color: var(--secondary-text-color);
      }

      .empty a {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-1);
        color: var(--primary-color);
        text-decoration: none;
        font-weight: 500;
      }

      .empty a:hover {
        text-decoration: underline;
      }

      .empty a:focus-visible {
        outline: var(--ha-border-width-md) solid var(--primary-color);
        outline-offset: 2px;
        border-radius: var(--ha-border-radius-sm);
      }

      .empty a ha-svg-icon {
        width: 16px;
        height: 16px;
        opacity: 1;
      }

      /* Card actions */
      .card-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
        padding: var(--ha-space-2);
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }

      .card-actions > div {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-labs": HaConfigLabs;
  }
}
