import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-button";
import "../../components/ha-card";
import "../../components/ha-md-list";
import "../../components/ha-md-list-item";
import type { CoreFrontendUserData } from "../../data/frontend";
import { subscribeFrontendUserData } from "../../data/frontend";
import { showEditSidebarDialog } from "../../dialogs/sidebar/show-dialog-edit-sidebar";
import "../../layouts/hass-subpage";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, Route } from "../../types";
import "./ha-advanced-mode-row";
import "./ha-entity-id-picker-row";
import "./ha-pick-dashboard-row";
import "./ha-pick-language-row";
import "./ha-pick-theme-row";

@customElement("ha-profile-section-preferences")
class HaProfileSectionPreferences extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _coreUserData?: CoreFrontendUserData | null;

  private _unsubCoreData?: Promise<UnsubscribeFunc>;

  private _getCoreData() {
    this._unsubCoreData = subscribeFrontendUserData(
      this.hass.connection,
      "core",
      ({ value }) => {
        this._coreUserData = value;
      }
    );
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hass) {
      this._getCoreData();
    }
  }

  public firstUpdated() {
    if (!this._unsubCoreData) {
      this._getCoreData();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubCoreData) {
      this._unsubCoreData.then((unsub) => unsub());
      this._unsubCoreData = undefined;
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/profile"
        .header=${this.hass.localize(
          "ui.panel.profile.user_preferences_header"
        )}
      >
        <div class="content">
          <ha-card
            .header=${this.hass.localize(
              "ui.panel.profile.user_preferences_header"
            )}
          >
            <div class="card-content">
              ${this.hass.localize("ui.panel.profile.user_preferences_detail")}
            </div>
            <ha-pick-language-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-language-row>
            <ha-pick-theme-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-theme-row>
            <ha-pick-dashboard-row
              .narrow=${this.narrow}
              .hass=${this.hass}
            ></ha-pick-dashboard-row>
            <ha-md-list>
              <ha-md-list-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.profile.customize_sidebar.header"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.profile.customize_sidebar.description"
                  )}</span
                >
                <ha-button
                  slot="end"
                  appearance="plain"
                  size="small"
                  @click=${this._customizeSidebar}
                >
                  ${this.hass.localize(
                    "ui.panel.profile.customize_sidebar.button"
                  )}
                </ha-button>
              </ha-md-list-item>
              ${this.hass.user!.is_admin
                ? html`
                    <ha-advanced-mode-row
                      .hass=${this.hass}
                      .coreUserData=${this._coreUserData}
                    ></ha-advanced-mode-row>
                  `
                : ""}
              ${this.hass.user!.is_admin
                ? html`
                    <ha-entity-id-picker-row
                      .hass=${this.hass}
                      .coreUserData=${this._coreUserData}
                    ></ha-entity-id-picker-row>
                  `
                : ""}
            </ha-md-list>
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  private _customizeSidebar() {
    showEditSidebarDialog(this);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .content {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: var(--safe-area-inset-bottom);
        }

        .content > * {
          display: block;
          margin: 24px 0;
        }

        ha-md-list {
          background: none;
          padding-top: 0;
          padding-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-profile-section-preferences": HaProfileSectionPreferences;
  }
}
