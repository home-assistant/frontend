import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "@material/mwc-button";
import { formatDateTime } from "../../common/datetime/format_date_time";
import "../../components/ha-card";
import "../../components/ha-menu-button";
import "../../components/ha-tabs";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-tabs/paper-tab";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { haStyle } from "../../resources/styles";
import "../../components/ha-top-app-bar-fixed";
import { formatDuration } from "../../common/datetime/format_duration";

let registeredDialog = false;

interface MailboxMessage {
  info: {
    origtime: number;
    callerid: string;
    duration: string;
  };
  text: string;
  sha: string;
}

@customElement("ha-panel-mailbox")
class HaPanelMailbox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public narrow!: boolean;

  @property({ attribute: false }) public platforms?: any[];

  @state() private _messages?: any[];

  @state() private _currentPlatform: number = 0;

  private _unsubEvents?;

  protected render(): TemplateResult {
    return html`
      <ha-top-app-bar-fixed>
        <ha-menu-button
          slot="navigationIcon"
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div slot="title">${this.hass.localize("panel.mailbox")}</div>
        ${!this._areTabsHidden(this.platforms)
          ? html`<div sticky>
              <ha-tabs
                scrollable
                .selected=${this._currentPlatform}
                @iron-activate=${this._handlePlatformSelected}
              >
                ${this.platforms?.map(
                  (platform) =>
                    html` <paper-tab data-entity=${platform}>
                      ${this._getPlatformName(platform)}
                    </paper-tab>`
                )}
              </ha-tabs>
            </div>`
          : ""}
      </ha-top-app-bar-fixed>
      <div class="content">
        <ha-card>
          ${!this._messages?.length
            ? html`<div class="card-content empty">
                ${this.hass.localize("ui.panel.mailbox.empty")}
              </div>`
            : nothing}
          ${this._messages?.map(
            (message) =>
              html` <paper-item
                .message=${message}
                @click=${this._openMP3Dialog}
              >
                <paper-item-body style="width:100%" two-line>
                  <div class="row">
                    <div>${message.caller}</div>
                    <div class="tip">
                      ${formatDuration(this.hass.locale, {
                        seconds: message.duration,
                      })}
                    </div>
                  </div>
                  <div secondary>
                    <span class="date">${message.timestamp}</span> -
                    ${message.message}
                  </div>
                </paper-item-body>
              </paper-item>`
          )}
        </ha-card>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!registeredDialog) {
      registeredDialog = true;
      fireEvent(this, "register-dialog", {
        dialogShowEvent: "show-audio-message-dialog",
        dialogTag: "ha-dialog-show-audio-message",
        dialogImport: () => import("./ha-dialog-show-audio-message"),
      });
    }
    this.hassChanged = this.hassChanged.bind(this);
    this.hass.connection
      .subscribeEvents(this.hassChanged, "mailbox_updated")
      .then((unsub) => {
        this._unsubEvents = unsub;
      });
    this._computePlatforms().then((platforms) => {
      this.platforms = platforms;
      this.hassChanged();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) this._unsubEvents();
  }

  hassChanged() {
    if (!this._messages) {
      this._messages = [];
    }
    this._getMessages().then((items) => {
      this._messages = items;
    });
  }

  private _openMP3Dialog(ev) {
    const message: any = (ev.currentTarget! as any).message;
    fireEvent(this, "show-audio-message-dialog", {
      hass: this.hass,
      message: message,
    });
  }

  private _getMessages() {
    const platform = this.platforms![this._currentPlatform];
    return this.hass
      .callApi<MailboxMessage[]>("GET", `mailbox/messages/${platform.name}`)
      .then((values) => {
        const platformItems: any[] = [];
        const arrayLength = values.length;
        for (let i = 0; i < arrayLength; i++) {
          const datetime = formatDateTime(
            new Date(values[i].info.origtime * 1000),
            this.hass.locale,
            this.hass.config
          );
          platformItems.push({
            timestamp: datetime,
            caller: values[i].info.callerid,
            message: values[i].text,
            sha: values[i].sha,
            duration: values[i].info.duration,
            platform: platform,
          });
        }
        return platformItems.sort((a, b) => b.timestamp - a.timestamp);
      });
  }

  private _computePlatforms(): Promise<any[]> {
    return this.hass.callApi<any[]>("GET", "mailbox/platforms");
  }

  private _handlePlatformSelected(ev) {
    const newPlatform = ev.detail.selected;
    if (newPlatform !== this._currentPlatform) {
      this._currentPlatform = newPlatform;
      this.hassChanged();
    }
  }

  private _areTabsHidden(platforms) {
    return !platforms || platforms.length < 2;
  }

  private _getPlatformName(item) {
    const entity = `mailbox.${item.name}`;
    const stateObj = this.hass.states[entity.toLowerCase()];
    return stateObj.attributes.friendly_name;
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
          max-width: 600px;
          margin: 0 auto;
        }

        ha-card {
          overflow: hidden;
        }

        paper-item {
          cursor: pointer;
        }

        ha-tabs {
          margin-left: max(env(safe-area-inset-left), 24px);
          margin-right: max(env(safe-area-inset-right), 24px);
          --paper-tabs-selection-bar-color: #fff;
          text-transform: uppercase;
        }

        .empty {
          text-align: center;
          color: var(--secondary-text-color);
        }

        .header {
          @apply --paper-font-title;
        }

        .row {
          display: flex;
          justify-content: space-between;
        }

        @media all and (max-width: 450px) {
          .content {
            width: auto;
            padding: 0;
          }
        }

        .tip {
          color: var(--secondary-text-color);
          font-size: 14px;
        }
        .date {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-mailbox": HaPanelMailbox;
  }
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "show-audio-message-dialog": {
      hass: HomeAssistant;
      message: string;
    };
  }
}
