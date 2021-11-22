import { startOfYesterday } from "date-fns";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { throttle } from "../../common/util/throttle";
import "../../components/ha-circular-progress";
import { getLogbookData, LogbookEntry } from "../../data/logbook";
import { loadTraceContexts, TraceContexts } from "../../data/trace";
import { fetchUsers } from "../../data/user";
import "../../panels/logbook/ha-logbook";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";

@customElement("ha-more-info-logbook")
export class MoreInfoLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @state() private _logbookEntries?: LogbookEntry[];

  @state() private _traceContexts?: TraceContexts;

  @state() private _userIdToName = {};

  private _lastLogbookDate?: Date;

  private _fetchUserPromise?: Promise<void>;

  private _error?: string;

  private _showMoreHref = "";

  private _throttleGetLogbookEntries = throttle(() => {
    this._getLogBookData();
  }, 10000);

  protected render(): TemplateResult {
    if (!this.entityId) {
      return html``;
    }
    const stateObj = this.hass.states[this.entityId];

    if (!stateObj) {
      return html``;
    }

    return html`
      ${isComponentLoaded(this.hass, "logbook")
        ? this._error
          ? html`<div class="no-entries">
              ${`${this.hass.localize(
                "ui.components.logbook.retrieval_error"
              )}: ${this._error}`}
            </div>`
          : !this._logbookEntries
          ? html`
              <ha-circular-progress
                active
                alt=${this.hass.localize("ui.common.loading")}
              ></ha-circular-progress>
            `
          : this._logbookEntries.length
          ? html`
              <div class="header">
                <div class="title">
                  ${this.hass.localize("ui.dialogs.more_info_control.logbook")}
                </div>
                <a href=${this._showMoreHref} @click=${this._close}
                  >${this.hass.localize(
                    "ui.dialogs.more_info_control.show_more"
                  )}</a
                >
              </div>
              <ha-logbook
                narrow
                no-icon
                no-name
                relative-time
                .hass=${this.hass}
                .entries=${this._logbookEntries}
                .traceContexts=${this._traceContexts}
                .userIdToName=${this._userIdToName}
              ></ha-logbook>
            `
          : html`<div class="no-entries">
              ${this.hass.localize("ui.components.logbook.entries_not_found")}
            </div>`
        : ""}
    `;
  }

  protected firstUpdated(): void {
    this._fetchUserPromise = this._fetchUserNames();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("entityId")) {
      this._lastLogbookDate = undefined;
      this._logbookEntries = undefined;

      if (!this.entityId) {
        return;
      }

      this._showMoreHref = `/logbook?entity_id=${
        this.entityId
      }&start_date=${startOfYesterday().toISOString()}`;

      this._throttleGetLogbookEntries();
      return;
    }

    if (!this.entityId || !changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      oldHass &&
      this.hass.states[this.entityId] !== oldHass?.states[this.entityId]
    ) {
      // wait for commit of data (we only account for the default setting of 1 sec)
      setTimeout(this._throttleGetLogbookEntries, 1000);
    }
  }

  private async _getLogBookData() {
    if (!isComponentLoaded(this.hass, "logbook")) {
      return;
    }
    const lastDate =
      this._lastLogbookDate ||
      new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    let newEntries;
    let traceContexts;

    try {
      [newEntries, traceContexts] = await Promise.all([
        getLogbookData(
          this.hass,
          lastDate.toISOString(),
          now.toISOString(),
          this.entityId,
          true
        ),
        this.hass.user?.is_admin ? loadTraceContexts(this.hass) : {},
        this._fetchUserPromise,
      ]);
    } catch (err: any) {
      this._error = err.message;
    }

    this._logbookEntries = this._logbookEntries
      ? [...newEntries, ...this._logbookEntries]
      : newEntries;
    this._lastLogbookDate = now;
    this._traceContexts = traceContexts;
  }

  private async _fetchUserNames() {
    const userIdToName = {};

    // Start loading users
    const userProm = this.hass.user?.is_admin && fetchUsers(this.hass);

    // Process persons
    Object.values(this.hass.states).forEach((entity) => {
      if (
        entity.attributes.user_id &&
        computeStateDomain(entity) === "person"
      ) {
        this._userIdToName[entity.attributes.user_id] =
          entity.attributes.friendly_name;
      }
    });

    // Process users
    if (userProm) {
      const users = await userProm;
      for (const user of users) {
        if (!(user.id in userIdToName)) {
          userIdToName[user.id] = user.name;
        }
      }
    }

    this._userIdToName = userIdToName;
  }

  private _close(): void {
    setTimeout(() => fireEvent(this, "closed"), 500);
  }

  static get styles() {
    return [
      haStyle,
      css`
        .no-entries {
          text-align: center;
          padding: 16px;
          color: var(--secondary-text-color);
        }
        ha-logbook {
          --logbook-max-height: 250px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-logbook {
            --logbook-max-height: unset;
          }
        }
        ha-circular-progress {
          display: flex;
          justify-content: center;
        }
        .header {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .header > a,
        a:visited {
          color: var(--primary-color);
        }
        .title {
          font-family: var(--paper-font-title_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-title_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-subhead_-_font-size);
          font-weight: var(--paper-font-title_-_font-weight);
          letter-spacing: var(--paper-font-title_-_letter-spacing);
          line-height: var(--paper-font-title_-_line-height);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-logbook": MoreInfoLogbook;
  }
}
