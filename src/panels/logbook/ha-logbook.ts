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

  @property() public entityIds?: string[];

  @property() public deviceIds?: string[];

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

  private _throttleGetLogbookEntries = throttle(
    () => this._getLogBookData(),
    10000
  );

  protected render(): TemplateResult {
    if (!isComponentLoaded(this.hass, "logbook")) {
      return html``;
    }

    if (this._error) {
      return html`<div class="no-entries">
        ${`${this.hass.localize("ui.components.logbook.retrieval_error")}: ${
          this._error
        }`}
      </div>`;
    }

    if (this._logbookEntries === undefined) {
      return html`
        <div class="progress-wrapper">
          <ha-circular-progress
            active
            alt=${this.hass.localize("ui.common.loading")}
          ></ha-circular-progress>
        </div>
      `;
    }

    if (this._logbookEntries.length === 0) {
      return html`<div class="no-entries">
        ${this.hass.localize("ui.components.logbook.entries_not_found")}
      </div>`;
    }

    return html`
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
    `;
  }

  public async refresh(force = false) {
    if (!force && this._logbookEntries === undefined) {
      return;
    }

    this._throttleGetLogbookEntries.cancel();
    this._updateTraceContexts.cancel();
    this._updateUsers.cancel();

    if ("range" in this.time) {
      clearLogbookCache(
        this.time.range[0].toISOString(),
        this.time.range[1].toISOString()
      );
    }

    this._lastLogbookDate = undefined;
    this._logbookEntries = undefined;
    this._throttleGetLogbookEntries();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    let changed = changedProps.has("time");

    for (const key of ["entityIds", "deviceIds"]) {
      if (!changedProps.has(key)) {
        continue;
      }

      const oldValue = changedProps.get(key) as string[] | undefined;
      const curValue = this[key] as string[] | undefined;

      if (
        !oldValue ||
        !curValue ||
        oldValue.length !== curValue.length ||
        !oldValue.every((val) => curValue.includes(val))
      ) {
        changed = true;
        break;
      }
    }

    if (changed) {
      this.refresh(true);
      return;
    }

    if (this._filterAlwaysEmptyResults) {
      return;
    }

    // We only need to fetch again if we track recent entries for an entity
    if (
      !("recent" in this.time) ||
      !changedProps.has("hass") ||
      !this.entityIds
    ) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    // Refresh data if we know the entity has changed.
    if (
      !oldHass ||
      ensureArray(this.entityIds).some(
        (entityId) => this.hass.states[entityId] !== oldHass?.states[entityId]
      )
    ) {
      // wait for commit of data (we only account for the default setting of 1 sec)
      setTimeout(this._throttleGetLogbookEntries, 1000);
    }
  }

  private get _filterAlwaysEmptyResults(): boolean {
    const entityIds = ensureArray(this.entityIds);
    const deviceIds = ensureArray(this.deviceIds);

    // If all specified filters are empty lists, we can return an empty list.
    return (
      (entityIds || deviceIds) &&
      (!entityIds || entityIds.length === 0) &&
      (!deviceIds || deviceIds.length === 0)
    );
  }

  private async _getLogBookData() {
    this._renderId += 1;
    const renderId = this._renderId;
    this._error = undefined;

    if (this._filterAlwaysEmptyResults) {
      this._logbookEntries = [];
      this._lastLogbookDate = undefined;
      return;
    }

    this._updateUsers();
    if (this.hass.user?.is_admin) {
      this._updateTraceContexts();
    }

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

    let newEntries: LogbookEntry[];

    try {
      newEntries = await getLogbookData(
        this.hass,
        startTime.toISOString(),
        endTime.toISOString(),
        ensureArray(this.entityIds),
        ensureArray(this.deviceIds)
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

    // Put newest ones on top. Reverse works in-place so
    // make a copy first.
    newEntries = [...newEntries].reverse();

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
        :host {
          display: block;
        }

        :host([virtualize]) {
          height: 100%;
        }

        .no-entries {
          text-align: center;
          padding: 16px;
          color: var(--secondary-text-color);
        }

        .progress-wrapper {
          display: flex;
          justify-content: center;
          height: 100%;
          align-items: center;
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
