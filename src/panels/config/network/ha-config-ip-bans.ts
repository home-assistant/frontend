import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-relative-time";
import "../../../components/ha-spinner";
import "../../../components/ha-tooltip";
import "../../../components/item/ha-list-item-base";
import "../../../components/list/ha-list-base";
import { fetchHttpConfig } from "../../../data/http";
import { fetchIpBans, removeIpBan } from "../../../data/http_ip_bans";
import type { IpBan } from "../../../data/http_ip_bans";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";

@customElement("ha-config-ip-bans")
class HaConfigIpBans extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _bans?: IpBan[];

  @state() private _error?: string;

  @state() private _banningDisabled = false;

  @state() private _removing?: string;

  private _onConfigResolved = () => this._fetchBanningEnabled();

  public override connectedCallback() {
    super.connectedCallback();
    window.addEventListener("http-config-resolved", this._onConfigResolved);
    if (this.hasUpdated) {
      this._load();
    }
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("http-config-resolved", this._onConfigResolved);
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
        <p class="empty">
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
                .disabled=${this._removing !== undefined}
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
      const { stable } = await fetchHttpConfig(this.hass);
      this._banningDisabled = stable.ip_ban_enabled === false;
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
