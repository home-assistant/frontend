import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-yaml-editor";
import "../../../../components/input/ha-input";
import type { HaInput } from "../../../../components/input/ha-input";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import "./event-subscribe-card";
import "./events-list";

@customElement("developer-tools-event")
class HaPanelDevEvent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _eventType = "";

  @state() private _eventData: object = {};

  @state() private _isValid = true;

  @state() private _selectedEventType = "";

  protected render(): TemplateResult {
    return html`
      <div
        class=${this.narrow
          ? "content layout vertical"
          : "content layout horizontal"}
      >
        <div class="flex">
          <ha-card>
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.developer-tools.tabs.events.description"
                )}
                <a
                  href=${documentationUrl(
                    this.hass,
                    "/docs/configuration/events/"
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.hass.localize(
                    "ui.panel.config.developer-tools.tabs.events.documentation"
                  )}
                </a>
              </p>
              <div class="inputs">
                <ha-input
                  .label=${this.hass.localize(
                    "ui.panel.config.developer-tools.tabs.events.type"
                  )}
                  autofocus
                  required
                  .value=${this._eventType}
                  @change=${this._eventTypeChanged}
                ></ha-input>
                <p>
                  ${this.hass.localize(
                    "ui.panel.config.developer-tools.tabs.events.data"
                  )}
                </p>
              </div>
              <div class="code-editor">
                <ha-yaml-editor
                  .hass=${this.hass}
                  .value=${this._eventData}
                  .error=${!this._isValid}
                  @value-changed=${this._yamlChanged}
                ></ha-yaml-editor>
              </div>
            </div>
            <div class="card-actions">
              <ha-button
                @click=${this._fireEvent}
                appearance="filled"
                .disabled=${!this._isValid}
                >${this.hass.localize(
                  "ui.panel.config.developer-tools.tabs.events.fire_event"
                )}</ha-button
              >
            </div>
          </ha-card>

          <event-subscribe-card
            .hass=${this.hass}
            .narrow=${this.narrow}
            .selectedEventType=${this._selectedEventType}
          ></event-subscribe-card>
        </div>

        <div>
          <h2>
            ${this.hass.localize(
              "ui.panel.config.developer-tools.tabs.events.active_listeners"
            )}
          </h2>
          <events-list
            @event-selected=${this._eventSelected}
            .hass=${this.hass}
          ></events-list>
        </div>
      </div>
    `;
  }

  private _eventSelected(ev) {
    this._eventType = ev.detail.eventType;
    this._selectedEventType = ev.detail.eventType;
  }

  private _eventTypeChanged(ev: InputEvent) {
    this._eventType = (ev.target as HaInput).value ?? "";
  }

  private _yamlChanged(ev) {
    this._eventData = ev.detail.value;
    this._isValid = ev.detail.isValid;
  }

  private async _fireEvent() {
    if (!this._eventType) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.developer-tools.tabs.events.alert_event_type"
        ),
      });
      return;
    }
    await this.hass.callApi(
      "POST",
      `events/${this._eventType}`,
      this._eventData
    );
    fireEvent(this, "hass-notification", {
      message: this.hass.localize(
        "ui.panel.config.developer-tools.tabs.events.notification_event_fired",
        { type: this._eventType }
      ),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          gap: var(--ha-space-4);
          padding: var(--ha-space-4);
          max-width: 1200px;
          margin: auto;
          height: 100%;
          box-sizing: border-box;
        }

        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
          display: block;
          height: 100%;
        }

        :host([narrow]) {
          height: auto;
        }

        :host([narrow]) .content {
          height: auto;
        }

        .flex {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        :host([narrow]) .flex {
          min-height: auto;
        }

        .inputs {
          max-width: 400px;
        }

        ha-button {
          margin-top: var(--ha-space-2);
        }

        event-subscribe-card {
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
          margin-top: var(--ha-space-4);
          direction: var(--direction);
        }

        :host([narrow]) event-subscribe-card {
          flex: none;
          min-height: auto;
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
