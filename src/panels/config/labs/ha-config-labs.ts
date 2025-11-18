import {
  mdiBug,
  mdiCommentTextOutline,
  mdiFlask,
  mdiHelpCircle,
  mdiOpenInNew,
} from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fetchLabFeatures, labsUpdateFeature } from "../../../data/labs";
import type { LabFeature } from "../../../data/labs";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-markdown";
import "../../../components/ha-switch";
import "../../../layouts/hass-subpage";

@customElement("ha-config-labs")
class HaConfigLabs extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _features: LabFeature[] = [];

  private _unsubscribe?: () => void;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  protected async firstUpdated(changedProps: PropertyValues): Promise<void> {
    super.firstUpdated(changedProps);
    await this._loadFeatures();
    this._subscribeToLabsUpdates();
  }

  private async _loadFeatures(): Promise<void> {
    this._features = await fetchLabFeatures(this.hass);
    // Sort by integration domain alphabetically
    this._features.sort((a, b) => a.domain.localeCompare(b.domain));
    await this.hass.loadBackendTranslation("labs_features");
  }

  private async _subscribeToLabsUpdates(): Promise<void> {
    this._unsubscribe = await this.hass.connection.subscribeEvents(
      () => this._loadFeatures(),
      "labs_updated"
    );
  }

  protected render() {
    if (!this._features.length) {
      return html`
        <hass-subpage
          .hass=${this.hass}
          .narrow=${this.narrow}
          back-path="/config"
          .header=${this.hass.localize("ui.panel.config.labs.caption")}
        >
          <div class="content">
            <div class="empty">
              <ha-svg-icon .path=${mdiFlask}></ha-svg-icon>
              <h1>${this.hass.localize("ui.panel.config.labs.empty.title")}</h1>
              <p>
                ${this.hass.localize("ui.panel.config.labs.empty.description")}
              </p>
              <a
                href="https://www.home-assistant.io/integrations/labs/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${this.hass.localize("ui.panel.config.labs.learn_more")}
                <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
              </a>
            </div>
          </div>
        </hass-subpage>
      `;
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .header=${this.hass.localize("ui.panel.config.labs.caption")}
      >
        <a
          slot="toolbar-icon"
          href="https://www.home-assistant.io/integrations/labs/"
          target="_blank"
          rel="noopener noreferrer"
          .title=${this.hass.localize("ui.common.help")}
        >
          <ha-icon-button
            .label=${this.hass.localize("ui.common.help")}
            .path=${mdiHelpCircle}
          ></ha-icon-button>
        </a>
        <div class="content">
          <ha-card outlined>
            <div class="card-content intro-card">
              <div class="intro-header">
                <div class="intro-icon">
                  <ha-svg-icon .path=${mdiFlask}></ha-svg-icon>
                </div>
                <div class="intro-title">
                  <h1>
                    ${this.hass.localize("ui.panel.config.labs.intro_title")}
                  </h1>
                  <p class="intro-subtitle">
                    ${this.hass.localize("ui.panel.config.labs.intro_subtitle")}
                  </p>
                </div>
              </div>
              <ha-markdown
                class="intro-text"
                .content=${this.hass.localize(
                  "ui.panel.config.labs.intro_message"
                )}
                breaks
              ></ha-markdown>
            </div>
          </ha-card>

          ${this._features.map((feature) => this._renderFeature(feature))}
        </div>
      </hass-subpage>
    `;
  }

  private _renderFeature(feature: LabFeature): TemplateResult {
    const featureName = this.hass.localize(
      `component.${feature.domain}.labs_features.${feature.feature}.name`
    );

    const description = this.hass.localize(
      `component.${feature.domain}.labs_features.${feature.feature}.description`
    );

    const integrationName = this.hass.localize(
      `component.${feature.domain}.title`
    );

    return html`
      <ha-card outlined>
        <ha-switch
          class="toggle"
          .checked=${feature.enabled}
          @change=${this._handleToggle}
          .feature=${feature}
        ></ha-switch>
        <div class="card-content">
          <div class="feature-header">
            <img
              alt=""
              src=${brandsUrl({
                domain: feature.domain,
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              })}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
            />
            <div class="feature-title">
              <h2>${featureName}</h2>
              <span class="integration-name">${integrationName}</span>
            </div>
          </div>
          <ha-markdown .content=${description} breaks></ha-markdown>
        </div>
        ${feature.feedback_url ||
        feature.report_issue_url ||
        feature.learn_more_url
          ? html`
              <div class="card-actions">
                <div>
                  ${feature.feedback_url
                    ? html`
                        <ha-button
                          appearance="plain"
                          href=${feature.feedback_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ha-svg-icon
                            slot="start"
                            .path=${mdiCommentTextOutline}
                          ></ha-svg-icon>
                          ${this.hass.localize(
                            "ui.panel.config.labs.provide_feedback"
                          )}
                        </ha-button>
                      `
                    : nothing}
                  ${feature.report_issue_url
                    ? html`
                        <ha-button
                          appearance="plain"
                          href=${feature.report_issue_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ha-svg-icon
                            slot="start"
                            .path=${mdiBug}
                          ></ha-svg-icon>
                          ${this.hass.localize(
                            "ui.panel.config.labs.report_issue"
                          )}
                        </ha-button>
                      `
                    : nothing}
                </div>
                ${feature.learn_more_url
                  ? html`
                      <ha-button
                        appearance="plain"
                        href=${feature.learn_more_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ha-svg-icon
                          slot="start"
                          .path=${mdiOpenInNew}
                        ></ha-svg-icon>
                        ${this.hass.localize("ui.panel.config.labs.learn_more")}
                      </ha-button>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  private async _handleToggle(ev: Event): Promise<void> {
    const switchEl = ev.target as HTMLElement & {
      feature: LabFeature;
      checked: boolean;
    };
    const feature = switchEl.feature;
    const enabled = switchEl.checked;
    const featureId = `${feature.domain}.${feature.feature}`;

    // Show confirmation dialog
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.labs.confirm_title"),
      text: this.hass.localize(
        enabled
          ? "ui.panel.config.labs.confirm_enable"
          : "ui.panel.config.labs.confirm_disable",
        {
          feature: this.hass.localize(
            `component.${feature.domain}.labs_features.${feature.feature}.name`
          ),
        }
      ),
      confirmText: this.hass.localize("ui.common.yes"),
      dismissText: this.hass.localize("ui.common.no"),
    });

    if (!confirmed) {
      switchEl.checked = !enabled;
      return;
    }

    try {
      await labsUpdateFeature(this.hass, featureId, enabled);
    } catch (err) {
      switchEl.checked = !enabled;
      await this._loadFeatures();
      throw err;
    }
  }

  static styles = css`
    :host {
      display: block;
    }

    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px;
      min-height: calc(100vh - 64px);
      display: flex;
      flex-direction: column;
    }

    .content:has(.empty) {
      justify-content: center;
    }

    ha-card {
      margin-bottom: 16px;
      position: relative;
    }

    .card-content {
      padding: 16px;
      padding-right: 60px;
      padding-inline-end: 60px;
      padding-inline-start: 16px;
    }

    /* Intro card */
    .intro-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .intro-header {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .intro-icon {
      flex-shrink: 0;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      position: relative;
      overflow: visible;
    }

    .intro-icon ha-svg-icon {
      width: 32px;
      height: 32px;
      color: #fff;
      animation: float 3s ease-in-out infinite;
    }

    /* Bubbles animation */
    .intro-icon::before,
    .intro-icon::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      animation: bubble-rise 3s ease-in-out infinite;
    }

    .intro-icon::before {
      width: 8px;
      height: 8px;
      bottom: 20px;
      left: 18px;
      animation-delay: 0s;
    }

    .intro-icon::after {
      width: 6px;
      height: 6px;
      bottom: 22px;
      right: 20px;
      animation-delay: 1.5s;
    }

    @keyframes float {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-3px);
      }
    }

    @keyframes bubble-rise {
      0% {
        transform: translateY(0) scale(1);
        opacity: 0;
      }
      10% {
        opacity: 0.6;
      }
      50% {
        opacity: 0.8;
      }
      100% {
        transform: translateY(-25px) scale(0.5);
        opacity: 0;
      }
    }

    .intro-title {
      flex: 1;
      min-width: 0;
    }

    .intro-title h1 {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 500;
      line-height: 32px;
    }

    .intro-subtitle {
      margin: 0;
      font-size: 16px;
      color: var(--secondary-text-color);
    }

    .intro-text {
      margin: 0;
    }

    .intro-text p {
      margin: 0;
      color: var(--secondary-text-color);
      line-height: 20px;
    }

    /* Feature cards */
    .toggle {
      position: absolute;
      top: 16px;
      right: 16px;
      inset-inline-end: 16px;
      inset-inline-start: initial;
    }

    .feature-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .feature-header img {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
    }

    .feature-title {
      flex: 1;
      min-width: 0;
    }

    .feature-title h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 400;
      line-height: 1.4;
    }

    .integration-name {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      color: var(--secondary-text-color);
    }

    /* Empty state */
    .empty {
      max-width: 500px;
      margin: 0 auto;
      padding: 48px 16px;
      text-align: center;
    }

    .empty ha-svg-icon {
      width: 120px;
      height: 120px;
      color: var(--secondary-text-color);
      opacity: 0.3;
    }

    .empty h1 {
      margin: 24px 0 16px;
      font-size: 24px;
      font-weight: 500;
      line-height: 32px;
    }

    .empty p {
      margin: 0 0 24px;
      font-size: 16px;
      line-height: 24px;
      color: var(--secondary-text-color);
    }

    .empty a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
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
      flex-wrap: wrap;
      gap: 8px;
    }

    .card-actions > div {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .card-actions ha-svg-icon {
      width: 18px;
      height: 18px;
      opacity: 0.7;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-labs": HaConfigLabs;
  }
}
