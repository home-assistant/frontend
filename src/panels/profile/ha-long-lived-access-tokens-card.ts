import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiDelete } from "@mdi/js";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import relativeTime from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-settings-row";
import "../../components/ha-svg-icon";
import { RefreshToken } from "../../data/refresh_token";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import "../../styles/polymer-ha-style";
import { HomeAssistant } from "../../types";

@customElement("ha-long-lived-access-tokens-card")
class HaLongLivedTokens extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public refreshTokens?: RefreshToken[];

  private _accessTokens = memoizeOne(
    (refreshTokens: RefreshToken[]): RefreshToken[] =>
      refreshTokens
        ?.filter((token) => token.type === "long_lived_access_token")
        .reverse()
  );

  protected render(): TemplateResult {
    const accessTokens = this._accessTokens(this.refreshTokens!);

    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.header"
        )}
      >
        <div class="card-content">
          ${this.hass.localize(
            "ui.panel.profile.long_lived_access_tokens.description"
          )}

          <a
            href="https://developers.home-assistant.io/docs/en/auth_api.html#making-authenticated-requests"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.profile.long_lived_access_tokens.learn_auth_requests"
            )}
          </a>
          ${!accessTokens?.length
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.profile.long_lived_access_tokens.empty_state"
                )}
              </p>`
            : accessTokens!.map(
                (token) => html`<ha-settings-row two-line>
                  <span slot="heading">${token.client_name}</span>
                  <div slot="description">
                    ${this.hass.localize(
                      "ui.panel.profile.long_lived_access_tokens.created",
                      "date",
                      relativeTime(
                        new Date(token.created_at),
                        this.hass.localize
                      )
                    )}
                  </div>
                  <mwc-icon-button
                    .token=${token}
                    .disabled=${token.is_current}
                    .title=${this.hass.localize(`ui.common.delete`)}
                    @click=${this._deleteToken}
                  >
                    <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                  </mwc-icon-button>
                </ha-settings-row>`
              )}
        </div>

        <div class="card-actions">
          <mwc-button @click=${this._createToken}>
            ${this.hass.localize(
              "ui.panel.profile.long_lived_access_tokens.create"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private async _createToken(): Promise<void> {
    const name = await showPromptDialog(this, {
      text: this.hass.localize(
        "ui.panel.profile.long_lived_access_tokens.prompt_name"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.profile.long_lived_access_tokens.name"
      ),
    });

    if (!name) {
      return;
    }

    try {
      const token = await this.hass.callWS<string>({
        type: "auth/long_lived_access_token",
        lifespan: 3650,
        client_name: name,
      });

      showPromptDialog(this, {
        title: name,
        text: this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.prompt_copy_token"
        ),
        defaultValue: token,
      });

      fireEvent(this, "hass-refresh-tokens");
    } catch (err) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.create_failed"
        ),
        text: err.message,
      });
    }
  }

  private async _deleteToken(ev: Event): Promise<void> {
    const token = (ev.currentTarget as any).token;
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.confirm_delete",
          "name",
          token.client_name
        ),
      }))
    ) {
      return;
    }
    try {
      await this.hass.callWS({
        type: "auth/delete_refresh_token",
        refresh_token_id: token.id,
      });
      fireEvent(this, "hass-refresh-tokens");
    } catch (err) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.delete_failed"
        ),
        text: err.message,
      });
    }
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        ha-settings-row {
          padding: 0;
        }
        a {
          color: var(--primary-color);
        }
        mwc-button {
          --mdc-theme-primary: var(--primary-color);
        }
        mwc-icon-button {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-long-lived-access-tokens-card": HaLongLivedTokens;
  }
}
