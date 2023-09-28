import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@material/mwc-button";
import { load } from "js-yaml";
import "../../../components/ha-code-editor";
import "../../../components/ha-textfield";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { documentationUrl } from "../../../util/documentation-url";
import "./event-subscribe-card";
import "./events-list";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";

const ERROR_SENTINEL = {};

@customElement("developer-tools-event")
class HaPanelDevEvent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @state() private _eventType: string = "";

  @state() private _eventData: string = "";

  protected render(): TemplateResult {
    const validJSON = this._validJSON();

    return html`
      <div class=${this.narrow ? "content" : "content layout horizontal"}>
        <div class="flex">
          <p>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.events.description"
            )}
            <a
              href=${documentationUrl(this.hass, "/docs/configuration/events/")}
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize(
                "ui.panel.developer-tools.tabs.events.documentation"
              )}
            </a>
          </p>
          <div class="inputs">
            <ha-textfield
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.events.type"
              )}
              autofocus
              required
              .value=${this._eventType}
              @change=${this._eventTypeChanged}
            ></ha-textfield>
            <p>
              ${this.hass.localize("ui.panel.developer-tools.tabs.events.data")}
            </p>
          </div>
          <div class="code-editor">
            <ha-code-editor
              mode="yaml"
              .value=${this._eventData}
              .error=${!validJSON}
              @value-changed=${this._yamlChanged}
              dir="ltr"
            ></ha-code-editor>
          </div>
          <mwc-button @click=${this._fireEvent} raised .disabled=${!validJSON}
            >${this.hass.localize(
              "ui.panel.developer-tools.tabs.events.fire_event"
            )}</mwc-button
          >
          <event-subscribe-card .hass=${this.hass}></event-subscribe-card>
        </div>

        <div>
          <div class="header">
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.events.active_listeners"
            )}
          </div>
          <events-list
            @event-selected=${this._eventSelected}
            .hass=${this.hass}
          ></events-list>
        </div>
      </div>
    `;
  }

  private _parsedJSON() {
    try {
      return this._eventData.trim() ? (load(this._eventData) as any) : {};
    } catch (err) {
      return ERROR_SENTINEL;
    }
  }

  private _validJSON() {
    return this._parsedJSON() !== ERROR_SENTINEL;
  }

  private _eventSelected(ev) {
    this._eventType = ev.detail.eventType;
  }

  private _eventTypeChanged(ev) {
    this._eventType = ev.target.value;
  }

  private _yamlChanged(ev) {
    this._eventData = ev.detail.value;
  }

  private async _fireEvent() {
    if (!this._eventType) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.events.alert_event_type"
        ),
      });
      return;
    }
    await this.hass.callApi(
      "POST",
      "events/" + this._eventType,
      this._parsedJSON()
    );
    fireEvent(this, "hass-notification", {
      message: this.hass.localize(
        "ui.panel.developer-tools.tabs.events.notification_event_fired",
        { type: this._eventType }
      ),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 16px;
          padding: max(16px, env(safe-area-inset-top))
            max(16px, env(safe-area-inset-right))
            max(16px, env(safe-area-inset-bottom))
            max(16px, env(safe-area-inset-left));
          max-width: 1200px;
          margin: auto;
        }

        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          @apply --paper-font-body1;
          display: block;
        }

        .inputs {
          max-width: 400px;
        }

        mwc-button {
          margin-top: 8px;
        }

        ha-textfield {
          display: block;
        }

        .code-editor {
          margin-right: 16px;
          margin-inline-start: initial;
          margin-inline-end: 16px;
          direction: var(--direction);
        }

        .header {
          @apply --paper-font-title;
        }

        event-subscribe-card {
          display: block;
          margin: 16px 16px 0 0;
          margin-inline-start: initial;
          margin-inline-end: 16px;
          direction: var(--direction);
        }

        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-event": HaPanelDevEvent;
  }
}
