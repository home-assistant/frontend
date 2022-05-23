import { UnsubscribeFunc } from "home-assistant-js-websocket";
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
  subscribeLogbook,
} from "../../data/logbook";
import { loadTraceContexts, TraceContexts } from "../../data/trace";
import { fetchUsers } from "../../data/user";
import { HomeAssistant } from "../../types";
import "./ha-logbook-renderer";

interface LogbookTimePeriod {
  now: Date;
  startTime: Date;
  endTime: Date;
  purgeBeforePythonTime: number | undefined;
}

const findStartOfRecentTime = (now: Date, recentTime: number) =>
  new Date(now.getTime() - recentTime * 1000).getTime() / 1000;

const idsChanged = (oldIds?: string[], newIds?: string[]) => {
  if (oldIds === undefined && newIds === undefined) {
    return false;
  }
  return (
    !oldIds ||
    !newIds ||
    oldIds.length !== newIds.length ||
    !oldIds.every((val) => newIds.includes(val))
  );
};

@customElement("ha-logbook")
export class HaLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public time!:
    | { range: [Date, Date] }
    | {
        // Seconds
        recent: number;
      };

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

  @state() private _traceContexts: TraceContexts = {};

  @state() private _userIdToName = {};

  @state() private _error?: string;

  private _renderId = 1;

  private _subscribed?: Promise<UnsubscribeFunc>;

  private _throttleGetLogbookEntries = throttle(
    () => this._getLogBookData(),
    1000
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
    if (!force && (this._subscribed || this._logbookEntries === undefined)) {
      return;
    }

    this._unsubscribe();
    this._throttleGetLogbookEntries.cancel();
    this._updateTraceContexts.cancel();
    this._updateUsers.cancel();

    if ("range" in this.time) {
      clearLogbookCache(
        this.time.range[0].toISOString(),
        this.time.range[1].toISOString()
      );
    }

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

      // If they make the filter more specific we want
      // to change the subscription since it will reduce
      // the overhead on the backend as the event stream
      // can be a firehose for all state events.
      if (idsChanged(oldValue, curValue)) {
        changed = true;
        break;
      }
    }

    if (changed) {
      this.refresh(true);
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

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._subscribeLogbookPeriod(this._calculateLogbookPeriod());
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  private _unsubscribeAndEmptyEntries() {
    this._unsubscribe();
    this._logbookEntries = [];
  }

  private _calculateLogbookPeriod() {
    const now = new Date();
    if ("range" in this.time) {
      return <LogbookTimePeriod>{
        now: now,
        startTime: this.time.range[0],
        endTime: this.time.range[1],
        purgeBeforePythonTime: undefined,
      };
    }
    if ("recent" in this.time) {
      const purgeBeforePythonTime = findStartOfRecentTime(
        now,
        this.time.recent
      );
      return <LogbookTimePeriod>{
        now: now,
        startTime: new Date(purgeBeforePythonTime * 1000),
        endTime: now,
        purgeBeforePythonTime: findStartOfRecentTime(now, this.time.recent),
      };
    }
    throw new Error("Unexpected time specified");
  }

  private _subscribeLogbookPeriod(logbookPeriod: LogbookTimePeriod) {
    if (logbookPeriod.endTime < logbookPeriod.now) {
      return false;
    }
    if (this._subscribed) {
      return true;
    }
    this._subscribed = subscribeLogbook(
      this.hass,
      (newEntries?) => {
        if ("recent" in this.time) {
          // start time is a sliding window purge old ones
          this._processNewEntries(
            newEntries,
            findStartOfRecentTime(new Date(), this.time.recent)
          );
        } else if ("range" in this.time) {
          // start time is fixed, we can just append
          this._processNewEntries(newEntries, undefined);
        }
      },
      logbookPeriod.startTime.toISOString(),
      ensureArray(this.entityIds),
      ensureArray(this.deviceIds)
    );
    return true;
  }

  private async _getLogBookData() {
    this._renderId += 1;
    const renderId = this._renderId;
    this._error = undefined;

    if (this._filterAlwaysEmptyResults) {
      this._unsubscribeAndEmptyEntries();
      return;
    }

    const logbookPeriod = this._calculateLogbookPeriod();

    if (logbookPeriod.startTime > logbookPeriod.now) {
      // Time Travel not yet invented
      this._unsubscribeAndEmptyEntries();
      return;
    }

    this._updateUsers();
    if (this.hass.user?.is_admin) {
      this._updateTraceContexts();
    }

    if (this._subscribeLogbookPeriod(logbookPeriod)) {
      // We can go live
      return;
    }

    // We are only fetching in the past
    // with a time window that does not
    // extend into the future
    this._unsubscribe();

    let newEntries: LogbookEntry[];

    try {
      newEntries = await getLogbookData(
        this.hass,
        logbookPeriod.startTime.toISOString(),
        logbookPeriod.endTime.toISOString(),
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

    this._logbookEntries = [...newEntries].reverse();
  }

  private _nonExpiredRecords = (purgeBeforePythonTime: number | undefined) =>
    !this._logbookEntries
      ? []
      : purgeBeforePythonTime
      ? this._logbookEntries.filter(
          (entry) => entry.when > purgeBeforePythonTime!
        )
      : this._logbookEntries;

  private _processNewEntries = (
    newEntries: LogbookEntry[],
    purgeBeforePythonTime: number | undefined
  ) => {
    // Put newest ones on top. Reverse works in-place so
    // make a copy first.
    newEntries = [...newEntries].reverse();
    if (!this._logbookEntries) {
      this._logbookEntries = newEntries;
      return;
    }
    const nonExpiredRecords = this._nonExpiredRecords(purgeBeforePythonTime);
    this._logbookEntries =
      newEntries[0].when >= this._logbookEntries[0].when
        ? // The new records are newer than the old records
          // append the old records to the end of the new records
          newEntries.concat(nonExpiredRecords)
        : // The new records are older than the old records
          // append the new records to the end of the old records
          nonExpiredRecords.concat(newEntries);
  };

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
