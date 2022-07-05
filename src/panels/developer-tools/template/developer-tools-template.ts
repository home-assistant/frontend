import "@material/mwc-button/mwc-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-circular-progress";
import "../../../components/ha-code-editor";
import {
  RenderTemplateResult,
  subscribeRenderTemplate,
} from "../../../data/ws-templates";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
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
  @property() public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @state() private _error?: string;

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
      <div
        class="content ${classMap({
          layout: !this.narrow,
          horizontal: !this.narrow,
        })}"
      >
        <div class="edit-pane">
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
          <p>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.templates.editor"
            )}
          </p>
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
          <mwc-button @click=${this._restoreDemo}>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.templates.reset"
            )}
          </mwc-button>
        </div>

        <div class="render-pane">
          ${this._rendering
            ? html`<ha-circular-progress
                class="render-spinner"
                active
                size="small"
              ></ha-circular-progress>`
            : ""}
          ${this._templateResult
            ? html`${this.hass.localize(
                "ui.panel.developer-tools.tabs.templates.result_type"
              )}:
              ${resultType}`
            : ""}
          <!-- prettier-ignore -->
          <pre
            class="rendered ${classMap({
            error: Boolean(this._error),
            [resultType]: resultType,
          })}"
          >${this._error}${type === "object"
            ? JSON.stringify(this._templateResult!.result, null, 2)
            : this._templateResult?.result}</pre>
          ${this._templateResult?.listeners.time
            ? html`
                <p>
                  ${this.hass.localize(
                    "ui.panel.developer-tools.tabs.templates.time"
                  )}
                </p>
              `
            : ""}
          ${!this._templateResult?.listeners
            ? ""
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
                      (domain) =>
                        html`
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
                      (entity_id) =>
                        html`
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
            : !this._templateResult?.listeners.time
            ? html` <span class="all_listeners">
                ${this.hass.localize(
                  "ui.panel.developer-tools.tabs.templates.no_listeners"
                )}
              </span>`
            : html``}
        </div>
      </div>
    `;
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
          padding: 16px;
        }

        .edit-pane {
          margin-right: 16px;
        }

        .edit-pane a {
          color: var(--primary-color);
        }

        .horizontal .edit-pane {
          max-width: 50%;
        }

        .render-pane {
          position: relative;
          max-width: 50%;
        }

        .render-spinner {
          position: absolute;
          top: 8px;
          right: 8px;
        }

        .rendered {
          @apply --paper-font-code1;
          clear: both;
          white-space: pre-wrap;
          background-color: var(--secondary-background-color);
          padding: 8px;
          direction: ltr;
        }

        .all_listeners {
          color: var(--warning-color);
        }

        .rendered.error {
          color: var(--error-color);
        }

        @media all and (max-width: 870px) {
          .render-pane {
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
    }
    this._debounceRender();
  }

  private async _subscribeTemplate() {
    this._rendering = true;
    await this._unsubscribeTemplate();
    try {
      this._unsubRenderTemplate = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResult = result;
          this._error = undefined;
        },
        {
          template: this._template,
          timeout: 3,
          strict: true,
        }
      );
      await this._unsubRenderTemplate;
    } catch (err: any) {
      this._error = "Unknown error";
      if (err.message) {
        this._error = err.message;
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

  private _restoreDemo() {
    this._template = DEMO_TEMPLATE;
    this._subscribeTemplate();
    delete localStorage["panel-dev-template-template"];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-template": HaPanelDevTemplate;
  }
}
