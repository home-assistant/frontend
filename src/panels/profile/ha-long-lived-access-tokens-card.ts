import { mdiDelete } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "@home-assistant/components/card";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../common/datetime/relative_time";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-icon-button";
import type { HaIconButton } from "../../components/ha-icon-button";
import "../../components/ha-settings-row";
import type { RefreshToken } from "../../data/refresh_token";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showLongLivedAccessTokenDialog } from "./show-long-lived-access-token-dialog";

@customElement("ha-long-lived-access-tokens-card")
class HaLongLivedTokens extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public refreshTokens?: RefreshToken[];

  private _accessTokens = memoizeOne(
    (refreshTokens?: RefreshToken[]): RefreshToken[] =>
      (refreshTokens ?? [])
        .filter((token) => token.type === "long_lived_access_token")
        .reverse()
  );

  protected render(): TemplateResult {
    const accessTokens = this._accessTokens(this.refreshTokens);

    return html`
      <hac-card>
        <h2 slot="header" class="header">
          ${this.hass.localize(
            "ui.panel.profile.long_lived_access_tokens.header"
          )}
        </h2>
        ${this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.description"
        )}

        <a
          href="https://contributors.home-assistant.io/core/internals/auth-api/#make-authenticated-requests"
          target="_blank"
          rel="noreferrer"
        >
          ${this.hass.localize(
            "ui.panel.profile.long_lived_access_tokens.learn_auth_requests"
          )}
        </a>
        ${
          !accessTokens.length
            ? html`<p>
                ${this.hass.localize(
                  "ui.panel.profile.long_lived_access_tokens.empty_state"
                )}
              </p>`
            : accessTokens.map(
                (token) =>
                  html`<ha-settings-row two-line>
                    <span slot="heading">${token.client_name}</span>
                    <div slot="description">
                      ${this.hass.localize(
                        "ui.panel.profile.long_lived_access_tokens.created",
                        {
                          date: relativeTime(
                            new Date(token.created_at),
                            this.hass.locale
                          ),
                        }
                      )}
                    </div>
                    <ha-icon-button
                      .token=${token}
                      .disabled=${token.is_current}
                      .label=${this.hass.localize("ui.common.delete")}
                      .path=${mdiDelete}
                      @click=${this._deleteToken}
                    ></ha-icon-button>
                  </ha-settings-row>`
              )
        }
        <ha-button slot="footer" @click=${this._createToken}>
          ${this.hass.localize(
            "ui.panel.profile.long_lived_access_tokens.create"
          )}
        </ha-button>
      </hac-card>
    `;
  }

  private _createToken(): void {
    const accessTokens = this._accessTokens(this.refreshTokens);

    showLongLivedAccessTokenDialog(this, {
      createdCallback: () => fireEvent(this, "hass-refresh-tokens"),
      existingNames: accessTokens
        .map((token) => token.client_name)
        .filter((name): name is string => Boolean(name)),
    });
  }

  private async _deleteToken(
    ev: HASSDomCurrentTargetEvent<HaIconButton & { token: RefreshToken }>
  ): Promise<void> {
    const token = ev.currentTarget.token;
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.confirm_delete_title"
        ),
        text: this.hass.localize(
          "ui.panel.profile.long_lived_access_tokens.confirm_delete_text",
          { name: token.client_name }
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
          "ui.panel.profile.long_lived_access_tokens.delete_failed"
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
        }
        a {
          color: var(--primary-color);
        }
        ha-icon-button {
          color: var(--primary-text-color);
        }
        .header {
          margin: 0;
          padding: var(--ha-space-5) var(--ha-space-4) var(--ha-space-4);
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: -0.012em;
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
