import { ERR_CONNECTION_LOST } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-form/ha-form";
import type { HaForm } from "../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../components/ha-form/types";
import { fetchHttpConfig, saveHttpConfig } from "../../../data/http";
import type { HttpConfig } from "../../../data/http";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
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
        name: "server_host",
        selector: { text: { multiple: true } },
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
            selector: { text: { multiple: true } },
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
      // Pending is exclusively handled by the global confirm/revert dialog, so
      // the form only ever displays stable.
      const { stable } = await fetchHttpConfig(this.hass);
      this._stable = stable;
      this._config = { ...stable };
    } catch (err: any) {
      this._error = err.message;
    }
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

    this._saving = true;
    this._error = undefined;
    this._fieldErrors = {};
    this._showNoChanges = false;
    try {
      const result = await saveHttpConfig(this.hass, this._config);
      if (!result.restart) {
        this._showNoChanges = true;
      }
      // restart === true: a restart is in flight. The reply usually races with
      // the connection drop; if we do reach this branch, the disconnected
      // overlay will appear in moments. Leave the form as is.
    } catch (err: any) {
      // The restart kills the WS connection before the ack — that's expected.
      if (
        err?.error?.code === ERR_CONNECTION_LOST ||
        err === ERR_CONNECTION_LOST
      ) {
        return;
      }
      // voluptuous formats errors as "<message> @ data['<field>']".
      // If a field is identified, mark it inline; otherwise show a card-level
      // alert.
      const fieldMatch = err.message?.match(/\bdata\['([^']+)'\]/);
      if (fieldMatch) {
        this._fieldErrors = { [fieldMatch[1]]: err.message };
      } else {
        this._error = err.message;
      }
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
