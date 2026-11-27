import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { currentPath } from "../../../common/url/current-path";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-relative-time";
import "../../../components/ha-spinner";
import "../../../components/ha-tooltip";
import "../../../components/item/ha-list-item-base";
import "../../../components/list/ha-list-base";
import type { HttpConfig, HttpConfigState } from "../../../data/http";
import { fetchHttpConfig } from "../../../data/http";
import { fetchIpBans, removeIpBan } from "../../../data/http_ip_bans";
import type { IpBan } from "../../../data/http_ip_bans";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { FOCUS_TARGET } from "../../../dialogs/make-dialog-manager";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";

// The config the running HTTP server was started with; after a change that is
// the pending one until it is confirmed.
const runningHttpConfig = ({
  active_config_type: activeType,
  stable,
  pending,
  default: defaultConfig,
}: HttpConfigState): HttpConfig => {
  switch (activeType) {
    case "pending":
      return pending ?? stable;
    case "default":
    case "default_legacy_port":
      return defaultConfig ?? stable;
    default:
      return stable;
  }
};

@customElement("ha-config-ip-bans")
class HaConfigIpBans extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _bans?: IpBan[];

  @state() private _error?: string;

  @state() private _banningDisabled = false;

  @state() private _removing?: string;

  // The dialog manager falls back to focusing this card when the Unban button
  // that opened the confirmation is gone; see focus().
  public readonly [FOCUS_TARGET] = true;

  private _unbannedIndex?: number;

  private _onConfigResolved = () => this._fetchBanningEnabled();

  private _path?: string;

  // There is no subscription for bans, so reload whenever this page is
  // navigated to again, e.g. from the link in the ban notification.
  private _locationChanged = () => {
    if (currentPath() === this._path) {
      this._load();
    }
  };

  public override connectedCallback() {
    super.connectedCallback();
    this._path = currentPath();
    window.addEventListener("http-config-resolved", this._onConfigResolved);
    window.addEventListener("location-changed", this._locationChanged);
    if (this.hasUpdated) {
      this._load();
    }
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("http-config-resolved", this._onConfigResolved);
    window.removeEventListener("location-changed", this._locationChanged);
  }

  protected override firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._load();
  }

  protected render() {
    return html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.network.ip_bans.caption")}
      >
        <div class="card-content">
          <p class="description">
            ${this.hass.localize("ui.panel.config.network.ip_bans.description")}
          </p>
          ${
            this._banningDisabled
              ? html`
                  <ha-alert alert-type="info">
                    ${this.hass.localize(
                      "ui.panel.config.network.ip_bans.banning_disabled"
                    )}
                  </ha-alert>
                `
              : nothing
          }
          ${
            this._error
              ? html`
                  <ha-alert alert-type="error">
                    ${this._error}
                    <ha-button slot="action" @click=${this._load}>
                      ${this.hass.localize("ui.common.retry")}
                    </ha-button>
                  </ha-alert>
                `
              : nothing
          }
          ${this._renderBans()}
        </div>
      </ha-card>
    `;
  }

  private _renderBans() {
    if (!this._bans) {
      return this._error
        ? nothing
        : html`<div class="loading">
            <ha-spinner size="small"></ha-spinner>
          </div>`;
    }
    if (!this._bans.length) {
      return html`
        <p class="empty" tabindex="-1">
          ${this.hass.localize("ui.panel.config.network.ip_bans.empty")}
        </p>
      `;
    }
    return html`
      <ha-list-base
        aria-label=${this.hass.localize(
          "ui.panel.config.network.ip_bans.caption"
        )}
      >
        ${this._bans.map(
          (ban, index) => html`
            <ha-list-item-base wrap-headline>
              <span slot="headline" class="address">${ban.ip_address}</span>
              <span slot="supporting-text">
                ${
                  ban.banned_at
                    ? html`
                        <span id="banned-at-${index}">
                          ${this.hass.localize(
                            "ui.panel.config.network.ip_bans.banned_at",
                            {
                              time: html`<ha-relative-time
                                .datetime=${ban.banned_at}
                              ></ha-relative-time>`,
                            }
                          )}
                        </span>
                        <ha-tooltip for="banned-at-${index}">
                          ${formatDateTime(
                            new Date(ban.banned_at),
                            this.hass.locale,
                            this.hass.config
                          )}
                        </ha-tooltip>
                      `
                    : this.hass.localize(
                        "ui.panel.config.network.ip_bans.banned_at_unknown"
                      )
                }
              </span>
              <ha-button
                slot="end"
                appearance="plain"
                size="s"
                data-address=${ban.ip_address}
                .disabled=${
                  this._removing !== undefined &&
                  this._removing !== ban.ip_address
                }
                .loading=${this._removing === ban.ip_address}
                @click=${this._unban}
              >
                ${this.hass.localize("ui.panel.config.network.ip_bans.unban")}
              </ha-button>
            </ha-list-item-base>
          `
        )}
      </ha-list-base>
    `;
  }

  private _load = async (): Promise<void> => {
    this._fetchBanningEnabled();
    this._error = undefined;
    try {
      this._bans = (await fetchIpBans(this.hass)).ip_bans;
    } catch (err: any) {
      this._bans = undefined;
      this._error =
        err?.message ||
        this.hass.localize("ui.panel.config.network.ip_bans.load_error");
    }
  };

  private async _fetchBanningEnabled(): Promise<void> {
    try {
      this._banningDisabled =
        runningHttpConfig(await fetchHttpConfig(this.hass)).ip_ban_enabled ===
        false;
    } catch (_err: unknown) {
      // The HTTP form card shows this error; the list works without it.
    }
  }

  private async _unban(ev: Event): Promise<void> {
    const address = (ev.currentTarget as HTMLElement).dataset.address!;
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.network.ip_bans.confirm_title"
      ),
      text: this.hass.localize("ui.panel.config.network.ip_bans.confirm_text", {
        address,
      }),
      confirmText: this.hass.localize("ui.panel.config.network.ip_bans.unban"),
      destructive: false,
    });
    if (!confirmed) {
      return;
    }
    this._unbannedIndex = this._bans!.findIndex(
      (ban) => ban.ip_address === address
    );
    this._removing = address;
    this._error = undefined;
    try {
      await removeIpBan(this.hass, address);
    } catch (err: any) {
      // Someone else unbanned it in the meantime; the result is the same.
      if (err?.code !== "not_found") {
        this._error =
          err?.message ||
          this.hass.localize("ui.panel.config.network.ip_bans.unban_error");
        this._removing = undefined;
        this._unbannedIndex = undefined;
        return;
      }
    }
    this._removing = undefined;
    showToast(this, {
      message: this.hass.localize("ui.panel.config.network.ip_bans.unbanned", {
        address,
      }),
    });
    await this._load();
    await this.updateComplete;
    // The dialog may already have put focus back on the removed button.
    this.focus();
  }

  // Keep focus in the list after an unban: on the row that took the removed
  // one's place, else the one before it, else the empty state.
  public override focus(options?: FocusOptions): void {
    if (this._unbannedIndex === undefined) {
      super.focus(options);
      return;
    }
    const buttons = this.shadowRoot!.querySelectorAll<HTMLElement>(
      "ha-button[data-address]"
    );
    const target =
      buttons[Math.min(this._unbannedIndex, buttons.length - 1)] ??
      this.shadowRoot!.querySelector<HTMLElement>(".empty");
    target?.focus(options);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .description {
          margin-top: 0;
          color: var(--secondary-text-color);
        }
        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-4);
        }
        ha-list-item-base {
          --ha-row-item-padding-inline: 0;
        }
        .address {
          font-family: var(--ha-font-family-code);
          overflow-wrap: anywhere;
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: var(--ha-space-4);
        }
        .empty {
          margin: 0;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-ip-bans": HaConfigIpBans;
  }
}
