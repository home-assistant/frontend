import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { ensureArray } from "../../common/ensure-array";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { throttle } from "../../common/util/throttle";
import "../../components/ha-circular-progress";
import {
  clearLogbookCache,
  getLogbookData,
  LogbookEntry,
} from "../../data/logbook";
import { loadTraceContexts, TraceContexts } from "../../data/trace";
import { fetchUsers } from "../../data/user";
import { HomeAssistant } from "../../types";
import "./ha-logbook-renderer";

@customElement("ha-logbook")
export class HaLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public time!: { range: [Date, Date] } | { recent: number };

  @property() public entityId?: string | string[];

  @property({ type: Boolean, attribute: "narrow" })
  public narrow = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = false;

  @property({ type: Boolean, attribute: "no-icon" })
  public noIcon = false;

  @property({ type: Boolean, attribute: "no-name" })
  public noName = false;

  @property({ type: Boolean, attribute: "relative-time" })
  public relativeTime = false;

  @property({ type: Boolean }) public showMoreLink = true;

  @state() private _logbookEntries?: LogbookEntry[];

  @state() private _traceContexts?: TraceContexts;

  @state() private _userIdToName = {};

  @state() private _error?: string;

  private _lastLogbookDate?: Date;

  private _renderId = 1;

  private _throttleGetLogbookEntries = throttle(() => {
    this._getLogBookData();
  }, 10000);

  protected render(): TemplateResult {
    if (!isComponentLoaded(this.hass, "logbook")) {
      return html``;
    }

    return html`
      ${this._error
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
            <ha-logbook-renderer
              .hass=${this.hass}
              .narrow=${this.narrow}
              .virtualize=${this.virtualize}
              .noIcon=${this.noIcon}
              .noName=${this.noName}
              .relativeTime=${this.relativeTime}
              .entries=${this._logbookEntries}
              .traceContexts=${this._traceContexts}
              .userIdToName=${this._userIdToName}
            ></ha-logbook-renderer>
          `
        : html`<div class="no-entries">
            ${this.hass.localize("ui.components.logbook.entries_not_found")}
          </div>`}
    `;
  }

  public refresh() {
    this._throttleGetLogbookEntries.cancel();
    this._updateTraceContexts.cancel();
    this._updateUsers.cancel();

    if ("range" in this.time) {
      clearLogbookCache(
        this.time.range[0].toISOString(),
        this.time.range[1].toISOString()
      );
    }

    this._error = undefined;
    this._throttleGetLogbookEntries();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has("time") || changedProps.has("entityId")) {
      this._lastLogbookDate = undefined;
      this._logbookEntries = undefined;
      this.refresh();
      return;
    }

    // We only need to fetch again if we track recent entries for an entity
    if (
      !("recent" in this.time) ||
      !changedProps.has("hass") ||
      !this.entityId
    ) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    // Refresh data if we know the entity has changed.
    if (
      !oldHass ||
      ensureArray(this.entityId).some(
        (entityId) => this.hass.states[entityId] !== oldHass?.states[entityId]
      )
    ) {
      // wait for commit of data (we only account for the default setting of 1 sec)
      setTimeout(this._throttleGetLogbookEntries, 1000);
    }
  }

  private async _getLogBookData() {
    this._renderId += 1;
    const renderId = this._renderId;
    let startTime: Date;
    let endTime: Date;
    let appendData = false;

    if ("range" in this.time) {
      [startTime, endTime] = this.time.range;
    } else {
      // Recent data
      appendData = true;
      startTime =
        this._lastLogbookDate ||
        new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
      endTime = new Date();
    }

    this._updateUsers();
    if (this.hass.user?.is_admin) {
      this._updateTraceContexts();
    }

    let newEntries: LogbookEntry[];

    try {
      newEntries = await getLogbookData(
        this.hass,
        startTime.toISOString(),
        endTime.toISOString(),
        this.entityId ? ensureArray(this.entityId).toString() : undefined
      );
    } catch (err: any) {
      if (renderId === this._renderId) {
        this._error = err.message;
      }
      return;
    }

    // New render happening.
    if (renderId !== this._renderId) {
      return;
    }

    this._logbookEntries =
      appendData && this._logbookEntries
        ? newEntries.concat(...this._logbookEntries)
        : newEntries;
    this._lastLogbookDate = endTime;
  }

  private _updateTraceContexts = throttle(async () => {
    this._traceContexts = await loadTraceContexts(this.hass);
  }, 60000);

  private _updateUsers = throttle(async () => {
    const userIdToName = {};

    // Start loading users
    const userProm = this.hass.user?.is_admin && fetchUsers(this.hass);

    // Process persons
    for (const entity of Object.values(this.hass.states)) {
      if (
        entity.attributes.user_id &&
        computeStateDomain(entity) === "person"
      ) {
        userIdToName[entity.attributes.user_id] =
          entity.attributes.friendly_name;
      }
    }

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
  }, 60000);

  static get styles() {
    return [
      css`
        :host([virtualize]) {
          display: block;
          height: 100%;
        }

        .no-entries {
          text-align: center;
          padding: 16px;
          color: var(--secondary-text-color);
        }
        ha-circular-progress {
          display: flex;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-logbook": HaLogbook;
  }
}
