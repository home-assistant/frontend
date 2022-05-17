import "@lit-labs/virtualizer";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, eventOptions, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { DOMAINS_WITH_DYNAMIC_PICTURE } from "../../common/const";
import { formatDate } from "../../common/datetime/format_date";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { domainIcon } from "../../common/entity/domain_icon";
import { computeRTL, emitRTLDirection } from "../../common/util/compute_rtl";
import "../../components/entity/state-badge";
import "../../components/ha-circular-progress";
import "../../components/ha-relative-time";
import { LogbookEntry } from "../../data/logbook";
import { TraceContexts } from "../../data/trace";
import {
  haStyle,
  haStyleScrollbar,
  buttonLinkStyle,
} from "../../resources/styles";
import { HomeAssistant } from "../../types";

const EVENT_LOCALIZE_MAP = {
  script_started: "from_script",
};

@customElement("ha-logbook-renderer")
class HaLogbookRenderer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public userIdToName = {};

  @property({ attribute: false })
  public traceContexts: TraceContexts = {};

  @property({ attribute: false }) public entries: LogbookEntry[] = [];

  @property({ type: Boolean, attribute: "narrow" })
  public narrow = false;

  @property({ attribute: "rtl", type: Boolean })
  private _rtl = false;

  @property({ type: Boolean, attribute: "virtualize", reflect: true })
  public virtualize = false;

  @property({ type: Boolean, attribute: "no-icon" })
  public noIcon = false;

  @property({ type: Boolean, attribute: "no-name" })
  public noName = false;

  @property({ type: Boolean, attribute: "relative-time" })
  public relativeTime = false;

  // @ts-ignore
  @restoreScroll(".container") private _savedScrollPos?: number;

  protected shouldUpdate(changedProps: PropertyValues<this>) {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const languageChanged =
      oldHass === undefined || oldHass.locale !== this.hass.locale;

    return (
      changedProps.has("entries") ||
      changedProps.has("traceContexts") ||
      languageChanged
    );
  }

  protected updated(_changedProps: PropertyValues) {
    const oldHass = _changedProps.get("hass") as HomeAssistant | undefined;

    if (oldHass === undefined || oldHass.language !== this.hass.language) {
      this._rtl = computeRTL(this.hass);
    }
  }

  protected render(): TemplateResult {
    if (!this.entries?.length) {
      return html`
        <div class="container no-entries" .dir=${emitRTLDirection(this._rtl)}>
          ${this.hass.localize("ui.components.logbook.entries_not_found")}
        </div>
      `;
    }

    return html`
      <div
        class="container ha-scrollbar ${classMap({
          narrow: this.narrow,
          rtl: this._rtl,
          "no-name": this.noName,
          "no-icon": this.noIcon,
        })}"
        @scroll=${this._saveScrollPos}
      >
        ${this.virtualize
          ? html`<lit-virtualizer
              scroller
              class="ha-scrollbar"
              .items=${this.entries}
              .renderItem=${this._renderLogbookItem}
            >
            </lit-virtualizer>`
          : this.entries.map((item, index) =>
              this._renderLogbookItem(item, index)
            )}
      </div>
    `;
  }

  private _renderLogbookItem = (
    item: LogbookEntry,
    index: number
  ): TemplateResult => {
    if (!item || index === undefined) {
      return html``;
    }

    const seenEntityIds: string[] = [];
    const previous = this.entries[index - 1];
    const stateObj = item.entity_id
      ? this.hass.states[item.entity_id]
      : undefined;
    const item_username =
      item.context_user_id && this.userIdToName[item.context_user_id];
    const domain = item.entity_id
      ? computeDomain(item.entity_id)
      : // Domain is there if there is no entity ID.
        item.domain!;

    return html`
      <div class="entry-container">
        ${index === 0 ||
        (item?.when &&
          previous?.when &&
          new Date(item.when * 1000).toDateString() !==
            new Date(previous.when * 1000).toDateString())
          ? html`
              <h4 class="date">
                ${formatDate(new Date(item.when * 1000), this.hass.locale)}
              </h4>
            `
          : html``}

        <div class="entry ${classMap({ "no-entity": !item.entity_id })}">
          <div class="icon-message">
            ${!this.noIcon
              ? // We do not want to use dynamic entity pictures (e.g., from media player) for the log book rendering,
                // as they would present a false state in the log (played media right now vs actual historic data).
                html`
                  <state-badge
                    .hass=${this.hass}
                    .overrideIcon=${item.icon ||
                    (item.domain && !stateObj
                      ? domainIcon(item.domain!)
                      : undefined)}
                    .overrideImage=${DOMAINS_WITH_DYNAMIC_PICTURE.has(domain)
                      ? ""
                      : stateObj?.attributes.entity_picture_local ||
                        stateObj?.attributes.entity_picture}
                    .stateObj=${stateObj}
                    .stateColor=${false}
                  ></state-badge>
                `
              : ""}
            <div class="message-relative_time">
              <div class="message">
                ${!this.noName // Used for more-info panel (single entity case)
                  ? this._renderEntity(item.entity_id, item.name)
                  : ""}
                ${item.message
                  ? html`${this._formatMessageWithPossibleEntity(
                      item.message,
                      seenEntityIds,
                      item.entity_id
                    )}`
                  : item.source
                  ? html` ${this._formatMessageWithPossibleEntity(
                      item.source,
                      seenEntityIds,
                      undefined,
                      "ui.components.logbook.by"
                    )}`
                  : ""}
                ${item_username
                  ? ` ${this.hass.localize(
                      "ui.components.logbook.by_user"
                    )} ${item_username}`
                  : ``}
                ${item.context_event_type
                  ? this._formatEventBy(item, seenEntityIds)
                  : ""}
                ${item.context_message
                  ? html` ${this._formatMessageWithPossibleEntity(
                      item.context_message,
                      seenEntityIds,
                      item.context_entity_id,
                      "ui.components.logbook.for"
                    )}`
                  : ""}
                ${item.context_entity_id &&
                !seenEntityIds.includes(item.context_entity_id)
                  ? // Another entity such as an automation or script
                    html` ${this.hass.localize("ui.components.logbook.for")}
                    ${this._renderEntity(
                      item.context_entity_id,
                      item.context_entity_id_name
                    )}`
                  : ""}
              </div>
              <div class="secondary">
                <span
                  >${formatTimeWithSeconds(
                    new Date(item.when * 1000),
                    this.hass.locale
                  )}</span
                >
                -
                <ha-relative-time
                  .hass=${this.hass}
                  .datetime=${item.when * 1000}
                  capitalize
                ></ha-relative-time>
                ${["script", "automation"].includes(item.domain!) &&
                item.context_id! in this.traceContexts
                  ? html`
                      -
                      <a
                        href=${`/config/${
                          this.traceContexts[item.context_id!].domain
                        }/trace/${
                          this.traceContexts[item.context_id!].domain ===
                          "script"
                            ? `script.${
                                this.traceContexts[item.context_id!].item_id
                              }`
                            : this.traceContexts[item.context_id!].item_id
                        }?run_id=${
                          this.traceContexts[item.context_id!].run_id
                        }`}
                        @click=${this._close}
                        >${this.hass.localize(
                          "ui.components.logbook.show_trace"
                        )}</a
                      >
                    `
                  : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  private _formatEventBy(item: LogbookEntry, seenEntities: string[]) {
    if (item.context_event_type === "call_service") {
      return `${this.hass.localize("ui.components.logbook.from_service")} ${
        item.context_domain
      }.${item.context_service}`;
    }
    if (item.context_event_type === "automation_triggered") {
      if (seenEntities.includes(item.context_entity_id!)) {
        return "";
      }
      seenEntities.push(item.context_entity_id!);
      return html`${this.hass.localize("ui.components.logbook.from_automation")}
      ${this._renderEntity(item.context_entity_id, item.context_name)}`;
    }
    if (item.context_name) {
      return `${this.hass.localize("ui.components.logbook.from")} ${
        item.context_name
      }`;
    }
    if (item.context_event_type === "state_changed") {
      return "";
    }
    if (item.context_event_type! in EVENT_LOCALIZE_MAP) {
      return `${this.hass.localize(
        `ui.components.logbook.${EVENT_LOCALIZE_MAP[item.context_event_type!]}`
      )}`;
    }
    return `${this.hass.localize(
      "ui.components.logbook.from"
    )} ${this.hass.localize("ui.components.logbook.event")} ${
      item.context_event_type
    }`;
  }

  private _renderEntity(
    entityId: string | undefined,
    entityName: string | undefined
  ) {
    const hasState = entityId && entityId in this.hass.states;
    const displayName =
      entityName ||
      (hasState
        ? this.hass.states[entityId].attributes.friendly_name || entityId
        : entityId);
    if (!hasState) {
      return displayName;
    }
    return html`<button
      class="link"
      @click=${this._entityClicked}
      .entityId=${entityId}
    >
      ${displayName}
    </button>`;
  }

  private _formatMessageWithPossibleEntity(
    message: string,
    seenEntities: string[],
    possibleEntity?: string,
    localizePrefix?: string
  ) {
    //
    // As we are looking at a log(book), we are doing entity_id
    // "highlighting"/"colorizing". The goal is to make it easy for
    // the user to access the entity that caused the event.
    //
    // If there is an entity_id in the message that is also in the
    // state machine, we search the message for the entity_id and
    // replace it with _renderEntity
    //
    if (message.indexOf(".") !== -1) {
      const messageParts = message.split(" ");
      for (let i = 0, size = messageParts.length; i < size; i++) {
        if (messageParts[i] in this.hass.states) {
          const entityId = messageParts[i];
          if (seenEntities.includes(entityId)) {
            return "";
          }
          seenEntities.push(entityId);
          const messageEnd = messageParts.splice(i);
          messageEnd.shift(); // remove the entity
          return html` ${messageParts.join(" ")}
          ${this._renderEntity(
            entityId,
            this.hass.states[entityId].attributes.friendly_name
          )}
          ${messageEnd.join(" ")}`;
        }
      }
    }
    //
    // When we have a message has a specific entity_id attached to
    // it, and the entity_id is not in the message, we look
    // for the friendly name of the entity and replace that with
    // _renderEntity if its there so the user can quickly get to
    // that entity.
    //
    if (possibleEntity && possibleEntity in this.hass.states) {
      const possibleEntityName =
        this.hass.states[possibleEntity].attributes.friendly_name;
      if (possibleEntityName && message.endsWith(possibleEntityName)) {
        if (seenEntities.includes(possibleEntity)) {
          return "";
        }
        seenEntities.push(possibleEntity);
        message = message.substring(
          0,
          message.length - possibleEntityName.length
        );
        return html` ${localizePrefix ? this.hass.localize(localizePrefix) : ""}
        ${message} ${this._renderEntity(possibleEntity, possibleEntityName)}`;
      }
    }
    return message;
  }

  private _entityClicked(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    if (!entityId) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();
    fireEvent(this, "hass-more-info", {
      entityId: entityId,
    });
  }

  private _close(): void {
    setTimeout(() => fireEvent(this, "closed"), 500);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleScrollbar,
      buttonLinkStyle,
      css`
        :host([virtualize]) {
          display: block;
          height: 100%;
        }

        .rtl {
          direction: ltr;
        }

        .entry-container {
          width: 100%;
        }

        .entry {
          display: flex;
          width: 100%;
          line-height: 2em;
          padding: 8px 16px;
          box-sizing: border-box;
          border-top: 1px solid var(--divider-color);
        }

        .entry.no-entity,
        .no-name .entry {
          cursor: default;
        }

        .entry:hover {
          background-color: rgba(var(--rgb-primary-text-color), 0.04);
        }

        .narrow:not(.no-icon) .time {
          margin-left: 32px;
        }

        .message-relative_time {
          display: flex;
          flex-direction: column;
        }

        .secondary {
          font-size: 12px;
          line-height: 1.7;
        }

        .secondary a {
          color: var(--secondary-text-color);
        }

        .date {
          margin: 8px 0;
          padding: 0 16px;
        }

        .narrow .date {
          padding: 0 8px;
        }

        .rtl .date {
          direction: rtl;
        }

        .icon-message {
          display: flex;
          align-items: center;
        }

        .no-entries {
          text-align: center;
          color: var(--secondary-text-color);
        }

        state-badge {
          margin-right: 16px;
          flex-shrink: 0;
          color: var(--state-icon-color);
        }

        .message {
          color: var(--primary-text-color);
        }

        .no-name .message:first-letter {
          text-transform: capitalize;
        }

        a {
          color: var(--primary-color);
        }

        .container {
          max-height: var(--logbook-max-height);
        }

        .container,
        lit-virtualizer {
          height: 100%;
        }

        lit-virtualizer {
          contain: size layout !important;
        }

        .narrow .entry {
          line-height: 1.5;
          padding: 8px;
        }

        .narrow .icon-message state-badge {
          margin-left: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-logbook-renderer": HaLogbookRenderer;
  }
}
