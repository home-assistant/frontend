import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import type { ActionDetail } from "@material/mwc-list";
import {
  mdiAndroid,
  mdiApple,
  mdiClockCheckOutline,
  mdiClockRemoveOutline,
  mdiDelete,
  mdiDotsVertical,
  mdiWeb,
} from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button-menu";
import "../../components/ha-card";
import "../../components/ha-icon-button";
import "../../components/ha-label";
import "../../components/ha-settings-row";
import { deleteAllRefreshTokens } from "../../data/auth";
import { RefreshToken } from "../../data/refresh_token";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";

// Client ID used by iOS app
const iOSclientId = "https://home-assistant.io/iOS";
// Client ID used by Android app
const androidClientId = "https://home-assistant.io/android";

const compareTokenLastUsedAt = (tokenA: RefreshToken, tokenB: RefreshToken) => {
  const timeA = tokenA.last_used_at ? new Date(tokenA.last_used_at) : 0;
  const timeB = tokenB.last_used_at ? new Date(tokenB.last_used_at) : 0;
  if (timeA < timeB) {
    return 1;
  }
  if (timeA > timeB) {
    return -1;
  }
  return 0;
};

@customElement("ha-refresh-tokens-card")
class HaRefreshTokens extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public refreshTokens?: RefreshToken[];

  private _refreshTokens = memoizeOne(
    (refreshTokens: RefreshToken[]): RefreshToken[] =>
      refreshTokens
        .filter((token) => token.type === "normal")
        .sort(compareTokenLastUsedAt)
  );

  private _formatTokenName = (token: RefreshToken): string => {
    if (token.client_id === iOSclientId) {
      return this.hass.localize("ui.panel.profile.refresh_tokens.ios_app");
    }
    if (token.client_id === androidClientId) {
      return this.hass.localize("ui.panel.profile.refresh_tokens.android_app");
    }
    return token.client_name || token.client_id;
  };

  protected render(): TemplateResult {
    const refreshTokens = this.refreshTokens
      ? this._refreshTokens(this.refreshTokens)
      : [];
    return html`
      <ha-card
        .header=${this.hass.localize("ui.panel.profile.refresh_tokens.header")}
      >
        <div class="card-content">
          ${this.hass.localize("ui.panel.profile.refresh_tokens.description")}
          ${refreshTokens.length
            ? refreshTokens.map(
                (token) => html`
                  <ha-settings-row three-line>
                    <ha-svg-icon
                      slot="prefix"
                      .path=${token.client_id === iOSclientId
                        ? mdiApple
                        : token.client_id === androidClientId
                          ? mdiAndroid
                          : mdiWeb}
                    ></ha-svg-icon>
                    <span slot="heading" class="primary">
                      ${this._formatTokenName(token)}
                    </span>
                    <div slot="description">
                      ${this.hass.localize(
                        "ui.panel.profile.refresh_tokens.created_at",
                        {
                          date: relativeTime(
                            new Date(token.created_at),
                            this.hass.locale
                          ),
                        }
                      )}
                    </div>
                    <div slot="description">
                      ${token.is_current
                        ? html`
                            <span class="current-session">
                              <span class="dot"></span> ${this.hass.localize(
                                "ui.panel.profile.refresh_tokens.current_session"
                              )}
                            </span>
                          `
                        : token.last_used_at
                          ? this.hass.localize(
                              "ui.panel.profile.refresh_tokens.last_used",
                              {
                                date: relativeTime(
                                  new Date(token.last_used_at),
                                  this.hass.locale
                                ),
                                location: token.last_used_ip,
                              }
                            )
                          : this.hass.localize(
                              "ui.panel.profile.refresh_tokens.not_used"
                            )}
                    </div>
                    <div slot="description">
                      ${token.expire_at
                        ? this.hass.localize(
                            "ui.panel.profile.refresh_tokens.expires_in",
                            {
                              date: relativeTime(
                                new Date(token.expire_at),
                                this.hass.locale
                              ),
                            }
                          )
                        : this.hass.localize(
                            "ui.panel.profile.refresh_tokens.never_expires"
                          )}
                    </div>
                    <div>
                      <ha-button-menu
                        corner="BOTTOM_END"
                        menuCorner="END"
                        @action=${this._handleAction}
                        .token=${token}
                      >
                        <ha-icon-button
                          slot="trigger"
                          .label=${this.hass.localize("ui.common.menu")}
                          .path=${mdiDotsVertical}
                        ></ha-icon-button>
                        <ha-list-item graphic="icon">
                          <ha-svg-icon
                            slot="graphic"
                            .path=${token.expire_at
                              ? mdiClockRemoveOutline
                              : mdiClockCheckOutline}
                          ></ha-svg-icon>
                          ${token.expire_at
                            ? this.hass.localize(
                                "ui.panel.profile.refresh_tokens.disable_token_expiration"
                              )
                            : this.hass.localize(
                                "ui.panel.profile.refresh_tokens.enable_token_expiration"
                              )}
                        </ha-list-item>
                        <ha-list-item
                          graphic="icon"
                          class="warning"
                          .disabled=${token.is_current}
                        >
                          <ha-svg-icon
                            class="warning"
                            slot="graphic"
                            .path=${mdiDelete}
                          ></ha-svg-icon>
                          ${this.hass.localize("ui.common.delete")}
                        </ha-list-item>
                      </ha-button-menu>
                    </div>
                  </ha-settings-row>
                `
              )
            : nothing}
        </div>
        <div class="card-actions">
          <mwc-button class="warning" @click=${this._deleteAllTokens}>
            ${this.hass.localize(
              "ui.panel.profile.refresh_tokens.delete_all_tokens"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    const token = (ev.currentTarget as any).token;
    switch (ev.detail.index) {
      case 0:
        this._toggleTokenExpiration(token);
        break;
      case 1:
        this._deleteToken(token);
        break;
    }
  }

  private async _toggleTokenExpiration(token: RefreshToken): Promise<void> {
    const enable = !token.expire_at;
    if (!enable) {
      if (
        !(await showConfirmationDialog(this, {
          title: this.hass.localize(
            "ui.panel.profile.refresh_tokens.confirm_disable_token_expiration_title"
          ),
          text: this.hass.localize(
            "ui.panel.profile.refresh_tokens.confirm_disable_token_expiration_text",
            { name: this._formatTokenName(token) }
          ),
          confirmText: this.hass.localize("ui.common.disable"),
          destructive: true,
        }))
      ) {
        return;
      }
    }

    try {
      await this.hass.callWS({
        type: "auth/refresh_token_set_expiry",
        refresh_token_id: token.id,
        enable_expiry: enable,
      });
      fireEvent(this, "hass-refresh-tokens");
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? (err.message as string)
          : String(err);
      await showAlertDialog(this, {
        title: this.hass.localize(
          `ui.panel.profile.refresh_tokens.${enable ? "enable" : "disable"}_expiration_failed`
        ),
        text: message,
      });
    }
  }

  private async _deleteToken(token: RefreshToken): Promise<void> {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.refresh_tokens.confirm_delete_title"
        ),
        text: this.hass.localize(
          "ui.panel.profile.refresh_tokens.confirm_delete_text",
          { name: this._formatTokenName(token) }
        ),
        confirmText: this.hass.localize("ui.common.delete"),
        destructive: true,
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
    } catch (err: any) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.refresh_tokens.delete_failed"
        ),
        text: err.message,
      });
    }
  }

  private async _deleteAllTokens(): Promise<void> {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.refresh_tokens.confirm_delete_all_title"
        ),
        text: this.hass.localize(
          "ui.panel.profile.refresh_tokens.confirm_delete_all"
        ),
        confirmText: this.hass.localize("ui.common.delete_all"),
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await deleteAllRefreshTokens(this.hass, "normal", false);
      fireEvent(this, "hass-refresh-tokens");
    } catch (err: any) {
      await showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.refresh_tokens.delete_failed"
        ),
        text: err.message,
      });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-settings-row {
          padding: 0;
          --settings-row-prefix-display: contents;
          --settings-row-content-display: contents;
        }
        ha-icon-button {
          color: var(--primary-text-color);
        }
        ha-list-item[disabled],
        ha-list-item[disabled] ha-svg-icon {
          color: var(--disabled-text-color) !important;
        }
        ha-settings-row .current-session {
          display: inline-flex;
          align-items: center;
        }
        ha-settings-row .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: var(--success-color);
          border-radius: 50%;
          margin-right: 6px;
        }
        ha-settings-row > ha-svg-icon {
          margin-right: 12px;
          margin-inline-start: initial;
          margin-inline-end: 12px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-refresh-tokens-card": HaRefreshTokens;
  }
}
