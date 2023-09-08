import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
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

  @property() public eventType?: string = "";

  @property() public eventData?: string = "";

  protected render(): TemplateResult {
    return html`
      <div class=${this.narrow ? "content" : "content layout horizontal"}>
        <div class="flex">
          <p>
            ${this.hass.localize(
              "ui.panel.developer-tools.tabs.events.description"
            )}
            <a
              href=${this._computeDocumentationUrl(this.hass)}
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
              label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.events.type"
              )}
              autofocus
              required
              .value=${this.eventType}
              @change=${this._eventTypeChanged}
            ></ha-textfield>
            <p>
              ${this.hass.localize("ui.panel.developer-tools.tabs.events.data")}
            </p>
          </div>
          <div class="code-editor">
            <ha-code-editor
              mode="yaml"
              .value=${this.eventData}
              .error=${!this._validJSON}
              @value-changed=${this._yamlChanged}
              dir="ltr"
            ></ha-code-editor>
          </div>
          <mwc-button
            @click=${this._fireEvent}
            raised
            .disabled=${!this._validJSON}
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
    return this._computeParsedEventData(this.eventData);
  }

  private _validJSON() {
    return this._computeValidJSON(this._parsedJSON());
  }

  private _eventSelected(ev) {
    this.eventType = ev.detail.eventType;
  }

  private _eventTypeChanged(ev) {
    this.eventType = ev.target.value;
  }

  private _computeParsedEventData(eventData) {
    try {
      return eventData.trim() ? load(eventData) : {};
    } catch (err) {
      return ERROR_SENTINEL;
    }
  }

  private _computeDocumentationUrl(hass) {
    return documentationUrl(hass, "/docs/configuration/events/");
  }

  private _computeValidJSON(parsedJSON) {
    return parsedJSON !== ERROR_SENTINEL;
  }

  private _yamlChanged(ev) {
    this.eventData = ev.detail.value;
  }

  private async _fireEvent() {
    if (!this.eventType) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.developer-tools.tabs.events.alert_event_type"
        ),
      });
      return;
    }
    await this.hass.callApi(
      "POST",
      "events/" + this.eventType,
      this._parsedJSON
    );
    fireEvent(this, "hass-notification", {
      message: this.hass.localize(
        "ui.panel.developer-tools.tabs.events.notification_event_fired",
        "type",
        this.eventType
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
