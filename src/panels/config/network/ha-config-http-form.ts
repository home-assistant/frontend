import { ERR_CONNECTION_LOST } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { mainWindow } from "../../../common/dom/get_main_window";
import {
  IP_ADDRESS_OR_NETWORK_PATTERN,
  IP_ADDRESS_PATTERN,
} from "../../../common/string/is_ip_address";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-form/ha-form";
import type { HaForm } from "../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../components/ha-form/types";
import {
  fetchHttpConfig,
  HTTP_CONFIG_FIELDS,
  saveHttpConfig,
} from "../../../data/http";
import type {
  ActiveConfigType,
  HttpConfig,
  HttpConfigWithMeta,
} from "../../../data/http";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

const SCHEMA = memoizeOne(
  (localize: LocalizeFunc) =>
    [
      {
        name: "server_port",
        required: true,
        selector: { number: { min: 1, max: 65535, mode: "box" } },
      },
      {
        name: "ssl",
        type: "expandable",
        flatten: true,
        title: localize("ui.panel.config.network.http.sections.ssl"),
        schema: [
          {
            name: "ssl_certificate",
            selector: { text: {} },
          },
          {
            name: "ssl_key",
            selector: { text: {} },
          },
          {
            name: "ssl_peer_certificate",
            selector: { text: {} },
          },
          {
            name: "ssl_profile",
            selector: {
              select: {
                options: [
                  {
                    value: "modern",
                    label: localize(
                      "ui.panel.config.network.http.ssl_profile_modern"
                    ),
                  },
                  {
                    value: "intermediate",
                    label: localize(
                      "ui.panel.config.network.http.ssl_profile_intermediate"
                    ),
                  },
                ],
              },
            },
          },
        ],
      },
      {
        name: "reverse_proxy",
        type: "expandable",
        flatten: true,
        title: localize("ui.panel.config.network.http.sections.reverse_proxy"),
        schema: [
          {
            name: "use_x_forwarded_for",
            selector: { boolean: {} },
          },
          {
            name: "trusted_proxies",
            selector: {
              text: {
                multiple: true,
                pattern: IP_ADDRESS_OR_NETWORK_PATTERN,
                validation_message: localize(
                  "ui.panel.config.network.http.invalid_network"
                ),
              },
            },
          },
        ],
      },
      {
        name: "ip_banning",
        type: "expandable",
        flatten: true,
        title: localize("ui.panel.config.network.http.sections.ip_banning"),
        schema: [
          {
            name: "ip_ban_enabled",
            selector: { boolean: {} },
          },
          {
            name: "login_attempts_threshold",
            required: true,
            selector: { number: { min: -1, max: 1000, mode: "box" } },
          },
        ],
      },
      {
        name: "advanced",
        type: "expandable",
        flatten: true,
        title: localize("ui.panel.config.network.http.sections.advanced"),
        schema: [
          {
            name: "server_host",
            selector: {
              text: {
                multiple: true,
                pattern: IP_ADDRESS_PATTERN,
                validation_message: localize(
                  "ui.panel.config.network.http.invalid_host"
                ),
              },
            },
          },
          {
            name: "cors_allowed_origins",
            selector: { text: { multiple: true } },
          },
          {
            name: "use_x_frame_options",
            selector: { boolean: {} },
          },
        ],
      },
    ] as const
);

@customElement("ha-config-http-form")
class HaConfigHttpForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _stable?: HttpConfig;

  @state() private _config?: HttpConfig;

  @state() private _error?: string;

  @state() private _fieldErrors: Record<string, string> = {};

  @state() private _saving = false;

  @state() private _showNoChanges = false;

  @state() private _activeConfigType?: ActiveConfigType;

  // The built-in default config as reported by core; used to show the default
  // port in the helper text instead of a hard-coded value.
  @state() private _default?: HttpConfigWithMeta;

  // A pending config that was reverted/failed and kept only for display.
  @state() private _revertedPending?: HttpConfigWithMeta;

  @query("ha-form") private _form?: HaForm;

  @query("ha-alert") private _firstAlert?: HTMLElement;

  private _onConfigResolved = () => this._fetchConfig();

  protected override firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._fetchConfig();
  }

  public override connectedCallback() {
    super.connectedCallback();
    window.addEventListener("http-config-resolved", this._onConfigResolved);
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("http-config-resolved", this._onConfigResolved);
  }

  protected render() {
    if (!this._stable && !this._error) {
      return nothing;
    }

    const schema = SCHEMA(this.hass.localize);

    const portChanged =
      !!this._stable && this._config?.server_port !== this._stable.server_port;

    const hasListenAddresses = !!this._config?.server_host?.some(Boolean);

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.network.http.caption")}
      >
        <div class="card-content">
          <p class="description">
            ${this.hass.localize("ui.panel.config.network.http.description")}
          </p>
          ${
            this._activeConfigType === "default"
              ? html`
                  <ha-alert alert-type="warning">
                    ${this.hass.localize(
                      "ui.panel.config.network.http.running_default"
                    )}
                  </ha-alert>
                `
              : nothing
          }
          ${
            this._revertedPending
              ? html`
                  <ha-alert alert-type="warning">
                    ${
                      this._revertedPending.error === "not_promoted"
                        ? this.hass.localize(
                            "ui.panel.config.network.http.reverted_not_confirmed"
                          )
                        : this.hass.localize(
                            "ui.panel.config.network.http.reverted_failed",
                            { error: this._revertedPending.error ?? "" }
                          )
                    }
                    <ha-button slot="action" @click=${this._reviewReverted}>
                      ${this.hass.localize(
                        "ui.panel.config.network.http.reverted_action"
                      )}
                    </ha-button>
                  </ha-alert>
                `
              : nothing
          }
          ${
            portChanged
              ? html`
                  <ha-alert alert-type="warning">
                    ${this.hass.localize(
                      "ui.panel.config.network.http.port_warning"
                    )}
                  </ha-alert>
                `
              : nothing
          }
          ${
            hasListenAddresses
              ? html`
                  <ha-alert alert-type="warning">
                    ${this.hass.localize(
                      "ui.panel.config.network.http.server_host_warning"
                    )}
                  </ha-alert>
                `
              : nothing
          }
          ${
            this._error
              ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
              : nothing
          }
          ${
            this._showNoChanges
              ? html`
                  <ha-alert alert-type="success">
                    ${this.hass.localize(
                      "ui.panel.config.network.http.save_no_changes"
                    )}
                  </ha-alert>
                `
              : nothing
          }
          ${
            this._config
              ? html`
                  <ha-form
                    .hass=${this.hass}
                    .data=${this._config}
                    .schema=${schema}
                    .error=${this._fieldErrors}
                    .disabled=${this._saving}
                    .computeLabel=${this._computeLabel}
                    .computeHelper=${this._computeHelper}
                    @value-changed=${this._valueChanged}
                  ></ha-form>
                `
              : nothing
          }
        </div>
        ${
          this._config
            ? html`
                <div class="card-actions">
                  <ha-button
                    @click=${this._save}
                    .disabled=${this._saving}
                    .loading=${this._saving}
                  >
                    ${this.hass.localize("ui.panel.config.network.http.save")}
                  </ha-button>
                </div>
              `
            : nothing
        }
      </ha-card>
    `;
  }

  private async _fetchConfig(): Promise<void> {
    try {
      const {
        stable,
        pending,
        active_config_type,
        default: defaultConfig,
      } = await fetchHttpConfig(this.hass);
      this._stable = stable;
      this._config = { ...stable };
      this._activeConfigType = active_config_type;
      this._default = defaultConfig;
      // An active trial pending (no error) is handled by the global
      // confirm/revert dialog. A pending carrying an error was reverted or
      // failed to apply and is kept only so we can surface it here.
      this._revertedPending = pending?.error ? pending : undefined;
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private _reviewReverted(): void {
    if (!this._revertedPending) {
      return;
    }
    // Load the reverted values into the form so the user can fix and re-save.
    this._config = { ...this._revertedPending };
    this._revertedPending = undefined;
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
  ): string => {
    if ("type" in schema && schema.type === "expandable") {
      // Expandable sections render their own title; never label them.
      return "";
    }
    return this.hass.localize(
      `ui.panel.config.network.http.fields.${schema.name}` as any
    );
  };

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
  ): string => {
    if ("type" in schema && schema.type === "expandable") {
      return "";
    }
    if (schema.name === "server_port") {
      return this.hass.localize(
        "ui.panel.config.network.http.helpers.server_port",
        { port: this._default?.server_port ?? 8123 }
      );
    }
    return (
      this.hass.localize(
        `ui.panel.config.network.http.helpers.${schema.name}` as any
      ) || ""
    );
  };

  private _valueChanged(ev: CustomEvent): void {
    this._config = ev.detail.value;
    this._error = undefined;
    this._fieldErrors = {};
    this._showNoChanges = false;
  }

  // Build a link to the new address for an address-changing restart, so the
  // user (still on the old address) can jump to it once Home Assistant is back.
  // Best-effort: skip Home Assistant Cloud remote UI (Nabu Casa), and skip when
  // the current page is not on the old port — that usually means a reverse
  // proxy, where swapping the port would point at the wrong place. Even when
  // shown, the new address may not be reachable (e.g. a firewall).
  private _newAddressUrl(): string | undefined {
    if (!this._stable || !this._config) {
      return undefined;
    }
    const loc = mainWindow.location;
    if (loc.hostname.endsWith("nabu.casa")) {
      return undefined;
    }
    const oldHttps = !!this._stable.ssl_certificate;
    const newHttps = !!this._config.ssl_certificate;
    const oldPort = this._stable.server_port ?? (oldHttps ? 443 : 80);
    const newPort = this._config.server_port ?? (newHttps ? 443 : 80);
    // The reachable address only changes when the scheme or the port changes.
    if (oldHttps === newHttps && oldPort === newPort) {
      return undefined;
    }
    const currentPort = loc.port
      ? Number(loc.port)
      : loc.protocol === "https:"
        ? 443
        : 80;
    if (currentPort !== oldPort) {
      return undefined;
    }
    const url = new URL(loc.origin);
    url.protocol = newHttps ? "https:" : "http:";
    url.port = String(newPort);
    return url.toString();
  }

  private _showNewAddress(url: string): void {
    showAlertDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.network.http.restart_address.title"
      ),
      text: html`
        <p>
          ${this.hass.localize(
            "ui.panel.config.network.http.restart_address.text"
          )}
        </p>
        <a href=${url} rel="noreferrer noopener">${url}</a>
        <p class="dialog-note">
          ${this.hass.localize(
            "ui.panel.config.network.http.restart_address.note"
          )}
        </p>
      `,
    });
  }

  private async _save(): Promise<void> {
    if (!this._config || !this._stable) {
      return;
    }
    if (this._form && !this._form.reportValidity()) {
      return;
    }

    if (JSON.stringify(this._stable) === JSON.stringify(this._config)) {
      this._showNoChanges = true;
      return;
    }

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.network.http.save_confirm.title"
      ),
      text: this.hass.localize(
        "ui.panel.config.network.http.save_confirm.text"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.network.http.save_confirm.confirm"
      ),
    });
    if (!confirmed) {
      return;
    }

    // Capture the new address before the restart drops the connection.
    const newAddressUrl = this._newAddressUrl();

    this._saving = true;
    this._error = undefined;
    this._fieldErrors = {};
    this._showNoChanges = false;
    // Drop empty entries from multi-value fields, and omit the field entirely
    // once it is empty so the backend applies its default. Otherwise a cleared
    // "IP address to bind to" would submit [""] / [], which binds to nothing.
    const config = Object.fromEntries(
      Object.entries(this._config).map(([key, value]) => {
        if (Array.isArray(value)) {
          const filtered = value.filter(Boolean);
          return [key, filtered.length ? filtered : undefined];
        }
        return [key, value];
      })
    ) as HttpConfig;
    try {
      const result = await saveHttpConfig(this.hass, config);
      if (!result.restart) {
        this._showNoChanges = true;
      } else if (newAddressUrl) {
        // restart === true: a restart is in flight. The reply usually races
        // with the connection drop; if we do reach this branch, offer the new
        // address so the user can follow along.
        this._showNewAddress(newAddressUrl);
      }
    } catch (err: any) {
      // The restart kills the WS connection before the ack — that's expected.
      if (
        err?.error?.code === ERR_CONNECTION_LOST ||
        err === ERR_CONNECTION_LOST
      ) {
        if (newAddressUrl) {
          this._showNewAddress(newAddressUrl);
        }
        return;
      }
      this._handleSaveError(err);
    } finally {
      this._saving = false;
    }
    await this.updateComplete;
    await this._form?.updateComplete;
    // Inline field errors render inside ha-form's shadow root, so fall back to
    // it when no top-level alert is present.
    const target =
      this._firstAlert ??
      this._form?.shadowRoot?.querySelector<HTMLElement>("ha-alert");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  private _handleSaveError(err: any): void {
    const rawMessage =
      (typeof err === "string" ? err : err?.message) ||
      this.hass.localize("ui.panel.config.network.http.save_error");
    // Voluptuous formats validation errors as
    //   "<reason> @ data['config']['<field>'][<index>]. Got '<value>'"
    // Strip the internal data path for display and pick the deepest known
    // field name so it can also be flagged inline.
    const message =
      rawMessage.replace(/\s*@\s*data(\['[^']*'\]|\[\d+\])+/g, "").trim() ||
      rawMessage;
    const field = [...rawMessage.matchAll(/\['([^']+)'\]/g)]
      .map((match) => match[1])
      .reverse()
      .find((name) => HTTP_CONFIG_FIELDS.includes(name as keyof HttpConfig)) as
      keyof HttpConfig | undefined;

    if (field) {
      // Show a card-level alert too — the field may sit in a collapsed section.
      this._error = `${this.hass.localize(
        `ui.panel.config.network.http.fields.${field}` as any
      )}: ${message}`;
      this._fieldErrors = { [field]: message };
    } else {
      this._error = message;
    }
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
        .card-actions {
          display: flex;
          gap: var(--ha-space-2);
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-http-form": HaConfigHttpForm;
  }
}
