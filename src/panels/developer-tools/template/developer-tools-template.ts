import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-code-editor";
import "../../../components/ha-spinner";
import type { RenderTemplateResult } from "../../../data/ws-templates";
import { subscribeRenderTemplate } from "../../../data/ws-templates";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

const DEMO_TEMPLATE = `{## Imitate available variables: ##}
{% set my_test_json = {
  "temperature": 25,
  "unit": "°C"
} %}

The temperature is {{ my_test_json.temperature }} {{ my_test_json.unit }}.

{% if is_state("sun.sun", "above_horizon") -%}
  The sun rose {{ relative_time(states.sun.sun.last_changed) }} ago.
{%- else -%}
  The sun will rise at {{ as_timestamp(state_attr("sun.sun", "next_rising")) | timestamp_local }}.
{%- endif %}

For loop example getting entity values in the weather domain:

{% for state in states.weather -%}
  {%- if loop.first %}The {% elif loop.last %} and the {% else %}, the {% endif -%}
  {{ state.name | lower }} is {{state.state_with_unit}}
{%- endfor %}.`;

@customElement("developer-tools-template")
class HaPanelDevTemplate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _error?: string;

  @state() private _errorLevel?: "ERROR" | "WARNING";

  @state() private _rendering = false;

  @state() private _templateResult?: RenderTemplateResult;

  @state() private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

  private _template = "";

  private _inited = false;

  public connectedCallback() {
    super.connectedCallback();
    if (this._template && !this._unsubRenderTemplate) {
      this._subscribeTemplate();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeTemplate();
  }

  protected firstUpdated() {
    if (localStorage && localStorage["panel-dev-template-template"]) {
      this._template = localStorage["panel-dev-template-template"];
    } else {
      this._template = DEMO_TEMPLATE;
    }
    this._subscribeTemplate();
    this._inited = true;
  }

  protected render() {
    const type = typeof this._templateResult?.result;
    const resultType =
      type === "object"
        ? Array.isArray(this._templateResult?.result)
          ? "list"
          : "dict"
        : type;
    return html`
      <div class="content">
        <div class="description">
          <p>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.templates.description"
            )}
          </p>
          <ul>
            <li>
              <a
                href="https://jinja.palletsprojects.com/en/latest/templates/"
                target="_blank"
                rel="noreferrer"
                >${this.hass.localize(
                  "ui.panel.developer-tools.tabs.templates.jinja_documentation"
                )}
              </a>
            </li>
            <li>
              <a
                href=${documentationUrl(
                  this.hass,
                  "/docs/configuration/templating/"
                )}
                target="_blank"
                rel="noreferrer"
              >
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.templates.template_extensions"
                )}</a
              >
            </li>
          </ul>
        </div>
      </div>
      <div
        class="content ${classMap({
          layout: !this.narrow,
          horizontal: !this.narrow,
        })}"
      >
        <ha-card
          class="edit-pane"
          header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.templates.editor"
          )}
        >
          <div class="card-content">
            <ha-code-editor
              mode="jinja2"
              .hass=${this.hass}
              .value=${this._template}
              .error=${this._error}
              autofocus
              autocomplete-entities
              autocomplete-icons
              @value-changed=${this._templateChanged}
              dir="ltr"
            ></ha-code-editor>
          </div>
          <div class="card-actions">
            <ha-button appearance="plain" @click=${this._restoreDemo}>
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.templates.reset"
              )}
            </ha-button>
            <ha-button appearance="plain" @click=${this._clear}>
              ${this.hass.localize("ui.common.clear")}
            </ha-button>
          </div>
        </ha-card>

        <ha-card
          class="render-pane"
          header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.templates.result"
          )}
        >
          <div class="card-content">
            ${this._rendering
              ? html`<ha-spinner
                  class="render-spinner"
                  size="small"
                ></ha-spinner>`
              : ""}
            ${this._error
              ? html`<ha-alert
                  alert-type=${this._errorLevel?.toLowerCase() || "error"}
                  >${this._error}</ha-alert
                >`
              : nothing}
            ${this._templateResult
              ? html`<pre
                    class="rendered ${classMap({
                      [resultType]: resultType,
                    })}"
                  >
${type === "object"
                      ? JSON.stringify(this._templateResult.result, null, 2)
                      : this._templateResult.result}</pre
                  >
                  <p>
                    ${this.hass.localize(
                      "ui.panel.developer-tools.tabs.templates.result_type"
                    )}:
                    ${resultType}
                  </p>
                  ${this._templateResult.listeners.time
                    ? html`
                        <p>
                          ${this.hass.localize(
                            "ui.panel.developer-tools.tabs.templates.time"
                          )}
                        </p>
                      `
                    : ""}
                  ${!this._templateResult.listeners
                    ? nothing
                    : this._templateResult.listeners.all
                      ? html`
                          <p class="all_listeners">
                            ${this.hass.localize(
                              "ui.panel.developer-tools.tabs.templates.all_listeners"
                            )}
                          </p>
                        `
                      : this._templateResult.listeners.domains.length ||
                          this._templateResult.listeners.entities.length
                        ? html`
                            <p>
                              ${this.hass.localize(
                                "ui.panel.developer-tools.tabs.templates.listeners"
                              )}
                            </p>
                            <ul>
                              ${this._templateResult.listeners.domains
                                .sort()
                                .map(
                                  (domain) => html`
                                    <li>
                                      <b
                                        >${this.hass.localize(
                                          "ui.panel.developer-tools.tabs.templates.domain"
                                        )}</b
                                      >: ${domain}
                                    </li>
                                  `
                                )}
                              ${this._templateResult.listeners.entities
                                .sort()
                                .map(
                                  (entity_id) => html`
                                    <li>
                                      <b
                                        >${this.hass.localize(
                                          "ui.panel.developer-tools.tabs.templates.entity"
                                        )}</b
                                      >: ${entity_id}
                                    </li>
                                  `
                                )}
                            </ul>
                          `
                        : !this._templateResult.listeners.time
                          ? html`<span class="all_listeners">
                              ${this.hass.localize(
                                "ui.panel.developer-tools.tabs.templates.no_listeners"
                              )}
                            </span>`
                          : nothing}`
              : nothing}
          </div>
        </ha-card>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          user-select: none;
        }

        .content {
          gap: 16px;
          padding: 16px;
        }

        .content.horizontal {
          --code-mirror-max-height: calc(
            100vh - var(--header-height) - (var(--ha-line-height-normal) * 3) -
              (1em * 2) - (max(16px, var(--safe-area-inset-top)) * 2) -
              (max(16px, var(--safe-area-inset-bottom)) * 2) -
              (var(--ha-card-border-width, 1px) * 2) - 179px
          );
        }

        ha-card {
          margin-bottom: 16px;
        }

        .edit-pane {
          direction: var(--direction);
        }

        .edit-pane a {
          color: var(--primary-color);
        }

        .content.horizontal > * {
          width: 50%;
          margin-bottom: 0px;
        }

        .render-spinner {
          position: absolute;
          top: 8px;
          right: 8px;
          inset-inline-end: 8px;
          inset-inline-start: initial;
        }

        ha-alert {
          margin-bottom: 8px;
          display: block;
        }

        .rendered {
          font-family: var(--ha-font-family-code);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          clear: both;
          white-space: pre-wrap;
          background-color: var(--secondary-background-color);
          padding: 8px;
          margin-top: 0;
          margin-bottom: 0;
          direction: ltr;
        }

        p,
        ul {
          margin-block-end: 0;
        }

        .render-pane .card-content {
          user-select: text;
        }

        .content.horizontal .render-pane .card-content {
          overflow: auto;
          max-height: calc(
            var(--code-mirror-max-height) +
              47px - var(--ha-card-border-radius, var(--ha-border-radius-lg))
          );
        }

        .content.horizontal .render-pane {
          overflow: hidden;
          padding-bottom: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
        }

        .all_listeners {
          color: var(--warning-color);
        }

        @media all and (max-width: 870px) {
          .content ha-card {
            max-width: 100%;
          }
        }
      `,
    ];
  }

  private _debounceRender = debounce(
    () => {
      this._subscribeTemplate();
      this._storeTemplate();
    },
    500,
    false
  );

  private _templateChanged(ev) {
    this._template = ev.detail.value;
    if (this._error) {
      this._error = undefined;
      this._errorLevel = undefined;
    }
    this._debounceRender();
  }

  private async _subscribeTemplate() {
    this._rendering = true;
    await this._unsubscribeTemplate();
    this._error = undefined;
    this._errorLevel = undefined;
    this._templateResult = undefined;
    try {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          if ("error" in result) {
            // We show the latest error, or a warning if there are no errors
            if (result.level === "ERROR" || this._errorLevel !== "ERROR") {
              this._error = result.error;
              this._errorLevel = result.level;
            }
          } else {
            this._templateResult = result;
          }
        },
        {
          template: this._template,
          timeout: 3,
          report_errors: true,
        }
      );
      await this._unsubRenderTemplate;
    } catch (err: any) {
      this._error = "Unknown error";
      this._errorLevel = undefined;
      if (err.message) {
        this._error = err.message;
        this._errorLevel = undefined;
        this._templateResult = undefined;
      }
      this._unsubRenderTemplate = undefined;
    } finally {
      this._rendering = false;
    }
  }

  private async _unsubscribeTemplate(): Promise<void> {
    if (!this._unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await this._unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplate = undefined;
    } catch (err: any) {
      if (err.code === "not_found") {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  private _storeTemplate() {
    if (!this._inited) {
      return;
    }
    localStorage["panel-dev-template-template"] = this._template;
  }

  private async _restoreDemo() {
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.templates.confirm_reset"
        ),
        warning: true,
      }))
    ) {
      return;
    }
    this._template = DEMO_TEMPLATE;
    this._subscribeTemplate();
    delete localStorage["panel-dev-template-template"];
  }

  private async _clear() {
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.templates.confirm_clear"
        ),
        warning: true,
      }))
    ) {
      return;
    }
    this._unsubscribeTemplate();
    this._template = "";
    // Reset to empty result. Setting to 'undefined' results in a different visual
    // behaviour compared to manually emptying the template input box.
    this._templateResult = {
      result: "",
      listeners: { all: false, entities: [], domains: [], time: false },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-template": HaPanelDevTemplate;
  }
}
