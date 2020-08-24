import "@material/mwc-button/mwc-button";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-circular-progress";
import "../../../components/ha-code-editor";
import { subscribeRenderTemplate } from "../../../data/ws-templates";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";

const DEMO_TEMPLATE = `{## Imitate available variables: ##}
{% set my_test_json = {
  "temperature": 25,
  "unit": "°C"
} %}

The temperature is {{ my_test_json.temperature }} {{ my_test_json.unit }}.

{% if is_state("sun.sun", "above_horizon") -%}
  The sun rose {{ relative_time(states.sun.sun.last_changed) }} ago.
{%- else -%}
  The sun will rise at {{ as_timestamp(strptime(state_attr("sun.sun", "next_rising"), "")) | timestamp_local }}.
{%- endif %}

For loop example getting 3 entity values:

{% for states in states | slice(3) -%}
  {% set state = states | first %}
  {%- if loop.first %}The {% elif loop.last %} and the {% else %}, the {% endif -%}
  {{ state.name | lower }} is {{state.state_with_unit}}
{%- endfor %}.`;

@customElement("developer-tools-template")
class HaPanelDevTemplate extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @internalProperty() private _error = false;

  @internalProperty() private _rendering = false;

  @internalProperty() private _processed = "";

  @internalProperty() private _unsubRenderTemplate?: Promise<UnsubscribeFunc>;

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
                href="http://jinja.pocoo.org/docs/dev/templates/"
                target="_blank"
                rel="noreferrer"
                >${this.hass.localize(
                  "ui.panel.developer-tools.tabs.templates.jinja_documentation"
                )}
              </a>
            </li>
            <li>
              <a
                href="https://home-assistant.io/docs/configuration/templating/"
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
            .value=${this._template}
            .error=${this._error}
            autofocus
            @value-changed=${this._templateChanged}
          ></ha-code-editor>
          <mwc-button @click=${this._restoreDemo}>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.templates.reset"
            )}
          </mwc-button>
        </div>

        <div class="render-pane">
          <ha-circular-progress
            class="render-spinner"
            .active=${this._rendering}
            size="small"
          ></ha-circular-progress>
          <pre class="rendered ${classMap({ error: this._error })}">
${this._processed}</pre
          >
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultArray {
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
          direction: ltr;
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
        }

        .rendered.error {
          color: var(--error-color);
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
      this._error = false;
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
          this._processed = result;
        },
        {
          template: this._template,
        }
      );
      await this._unsubRenderTemplate;
    } catch (err) {
      this._error = true;
      if (err.message) {
        this._processed = err.message;
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
    } catch (e) {
      if (e.code === "not_found") {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw e;
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
