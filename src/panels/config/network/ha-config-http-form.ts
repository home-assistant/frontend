import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../components/ha-form/types";
import { fetchHttpConfig, saveHttpConfig } from "../../../data/http";
import type { HttpConfig } from "../../../data/http";
import { showRestartDialog } from "../../../dialogs/restart/show-dialog-restart";
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
      {
        name: "cors_allowed_origins",
        selector: { text: { multiple: true } },
      },
      {
        name: "use_x_forwarded_for",
        selector: { boolean: {} },
      },
      {
        name: "trusted_proxies",
        selector: { text: { multiple: true } },
      },
      {
        name: "use_x_frame_options",
        selector: { boolean: {} },
      },
      {
        name: "ip_ban_enabled",
        selector: { boolean: {} },
      },
      {
        name: "login_attempts_threshold",
        required: true,
        selector: { number: { min: -1, max: 1000, mode: "box" } },
      },
    ] as const
);

@customElement("ha-config-http-form")
class HaConfigHttpForm extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: HttpConfig;

  @state() private _error?: string;

  @state() private _fieldErrors: Record<string, string> = {};

  @state() private _saving = false;

  @state() private _saved = false;

  protected override firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._fetchConfig();
  }

  protected render() {
    if (!this._config && !this._error) {
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

          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
          ${this._saved
            ? html`
                <ha-alert
                  alert-type="info"
                  .title=${this.hass.localize(
                    "ui.panel.config.network.http.restart_required_title"
                  )}
                >
                  ${this.hass.localize(
                    "ui.panel.config.network.http.restart_required_description"
                  )}
                  <ha-button slot="action" @click=${this._restart}>
                    ${this.hass.localize(
                      "ui.panel.config.network.http.restart"
                    )}
                  </ha-button>
                </ha-alert>
              `
            : nothing}
          ${this._config
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
            : nothing}
        </div>
        ${this._config
          ? html`
              <div class="card-actions">
                <ha-button @click=${this._save} .disabled=${this._saving}>
                  ${this.hass.localize("ui.panel.config.network.http.save")}
                </ha-button>
              </div>
            `
          : nothing}
      </ha-card>
    `;
  }

  private async _fetchConfig(): Promise<void> {
    try {
      const result = await fetchHttpConfig(this.hass);
      this._config = result.config;
    } catch (err: any) {
      this._error = err.message;
    }
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
  ): string =>
    this.hass.localize(`ui.panel.config.network.http.fields.${schema.name}`);

  private _computeHelper = (
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
  ): string =>
    this.hass.localize(`ui.panel.config.network.http.helpers.${schema.name}`) ||
    "";

  private _valueChanged(ev: CustomEvent): void {
    this._config = ev.detail.value;
    this._saved = false;
    this._error = undefined;
    this._fieldErrors = {};
  }

  private async _save(): Promise<void> {
    if (!this._config) {
      return;
    }
    const form = this.renderRoot.querySelector("ha-form");
    if (form && !form.reportValidity()) {
      return;
    }
    this._saving = true;
    this._error = undefined;
    this._fieldErrors = {};
    try {
      const result = await saveHttpConfig(this.hass, this._config);
      this._config = result.config;
      this._saved = true;
    } catch (err: any) {
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
    const haForm = this.renderRoot.querySelector("ha-form");
    await haForm?.updateComplete;
    // Inline field errors render inside ha-form's shadow root, so fall back to
    // it when no top-level alert is present.
    const target =
      this.renderRoot.querySelector<HTMLElement>("ha-alert") ??
      haForm?.shadowRoot?.querySelector<HTMLElement>("ha-alert");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  private _restart(): void {
    showRestartDialog(this);
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
