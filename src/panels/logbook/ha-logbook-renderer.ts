import "@lit-labs/virtualizer";
import { VisibilityChangedEvent } from "@lit-labs/virtualizer/Virtualizer";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { customElement, eventOptions, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { formatDate } from "../../common/datetime/format_date";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import "../../components/entity/state-badge";
import "../../components/ha-circular-progress";
import "../../components/ha-relative-time";
import {
  createHistoricState,
  localizeTriggerSource,
  localizeStateMessage,
  LogbookEntry,
} from "../../data/logbook";
import { TraceContexts } from "../../data/trace";
import {
  haStyle,
  haStyleScrollbar,
  buttonLinkStyle,
} from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { brandsUrl } from "../../util/brands-url";
import "../../components/ha-icon-next";
import { navigate } from "../../common/navigate";

declare global {
  interface HASSDomEvents {
    "hass-logbook-live": { enable: boolean };
  }
}

const triggerDomains = ["script", "automation"];

const hasContext = (item: LogbookEntry) =>
  item.context_event_type || item.context_state || item.context_message;
const stripEntityId = (message: string, entityId?: string) =>
  entityId ? message.replace(entityId, " ") : message;

@customElement("ha-logbook-renderer")
class HaLogbookRenderer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public userIdToName = {};

  @property({ attribute: false })
  public traceContexts: TraceContexts = {};

  @property({ attribute: false }) public entries: LogbookEntry[] = [];

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

  protected render(): TemplateResult {
    if (!this.entries?.length) {
      return html`
        <div class="container no-entries">
          ${this.hass.localize("ui.components.logbook.entries_not_found")}
        </div>
      `;
    }

    return html`
      <div
        class="container ha-scrollbar ${classMap({
          narrow: this.narrow,
          "no-name": this.noName,
          "no-icon": this.noIcon,
        })}"
        @scroll=${this._saveScrollPos}
      >
        ${this.virtualize
          ? html`<lit-virtualizer
              @visibilityChanged=${this._visibilityChanged}
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
    const previous = this.entries[index - 1];
    const seenEntityIds: string[] = [];
    const currentStateObj = item.entity_id
      ? this.hass.states[item.entity_id]
      : undefined;
    const historicStateObj = currentStateObj
      ? createHistoricState(currentStateObj, item.state!)
      : undefined;
    const domain = item.entity_id
      ? computeDomain(item.entity_id)
      : // Domain is there if there is no entity ID.
        item.domain!;
    const overrideImage =
      !historicStateObj &&
      !item.icon &&
      !item.state &&
      domain &&
      isComponentLoaded(this.hass, domain)
        ? brandsUrl({
            domain: domain!,
            type: "icon",
            useFallback: true,
            darkOptimized: this.hass.themes?.darkMode,
          })
        : undefined;

    const traceContext =
      triggerDomains.includes(item.domain!) &&
      item.context_id! in this.traceContexts
        ? this.traceContexts[item.context_id!]
        : undefined;

    const hasTrace = traceContext !== undefined;

    return html`
      <div
        class="entry-container ${classMap({ clickable: hasTrace })}"
        .traceLink=${traceContext
          ? `/config/${traceContext.domain}/trace/${
              traceContext.domain === "script"
                ? `script.${traceContext.item_id}`
                : traceContext.item_id
            }?run_id=${traceContext.run_id}`
          : undefined}
        @click=${this._handleClick}
      >
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
              ? html`
                  <state-badge
                    .hass=${this.hass}
                    .overrideIcon=${item.icon}
                    .overrideImage=${overrideImage}
                    .stateObj=${item.icon ? undefined : historicStateObj}
                    .stateColor=${false}
                  ></state-badge>
                `
              : ""}
            <div class="message-relative_time">
              <div class="message">
                ${!this.noName // Used for more-info panel (single entity case)
                  ? this._renderEntity(item.entity_id, item.name, hasTrace)
                  : ""}
                ${this._renderMessage(
                  item,
                  seenEntityIds,
                  domain,
                  historicStateObj,
                  hasTrace
                )}
                ${this._renderContextMessage(item, seenEntityIds, hasTrace)}
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
                ${item.context_user_id ? html`${this._renderUser(item)}` : ""}
                ${hasTrace
                  ? `- ${this.hass.localize(
                      "ui.components.logbook.show_trace"
                    )}`
                  : ""}
              </div>
            </div>
          </div>
          ${hasTrace ? html`<ha-icon-next></ha-icon-next>` : ""}
        </div>
      </div>
    `;
  };

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
  }

  @eventOptions({ passive: true })
  private _visibilityChanged(e: VisibilityChangedEvent) {
    fireEvent(this, "hass-logbook-live", {
      enable: e.first === 0,
    });
  }

  private _renderMessage(
    item: LogbookEntry,
    seenEntityIds: string[],
    domain?: string,
    historicStateObj?: HassEntity,
    noLink?: boolean
  ) {
    if (item.entity_id) {
      if (item.state) {
        return historicStateObj
          ? localizeStateMessage(
              this.hass,
              this.hass.localize,
              item.state,
              historicStateObj,
              domain!
            )
          : item.state;
      }
    }

    const itemHasContext = hasContext(item);
    let message = item.message;
    if (triggerDomains.includes(domain!) && item.source) {
      if (itemHasContext) {
        // These domains include the trigger source in the message
        // but if we have the context we want to display that instead
        // as otherwise we display duplicate triggers
        return "";
      }
      message = localizeTriggerSource(this.hass.localize, item.source);
    }
    return message
      ? this._formatMessageWithPossibleEntity(
          itemHasContext
            ? stripEntityId(message, item.context_entity_id)
            : message,
          seenEntityIds,
          undefined,
          noLink
        )
      : "";
  }

  private _renderUser(item: LogbookEntry) {
    const item_username =
      item.context_user_id && this.userIdToName[item.context_user_id];
    if (item_username) {
      return `- ${item_username}`;
    }
    return "";
  }

  private _renderUnseenContextSourceEntity(
    item: LogbookEntry,
    seenEntityIds: string[],
    noLink: boolean
  ) {
    if (
      !item.context_entity_id ||
      seenEntityIds.includes(item.context_entity_id!)
    ) {
      return "";
    }
    // We don't know what caused this entity
    // to be included since its an integration
    // described event.
    return html` (${this._renderEntity(
      item.context_entity_id,
      item.context_entity_id_name,
      noLink
    )})`;
  }

  private _renderContextMessage(
    item: LogbookEntry,
    seenEntityIds: string[],
    noLink: boolean
  ) {
    // State change
    if (item.context_state) {
      const historicStateObj =
        item.context_entity_id && item.context_entity_id in this.hass.states
          ? createHistoricState(
              this.hass.states[item.context_entity_id],
              item.context_state
            )
          : undefined;
      return html`${this.hass.localize(
        "ui.components.logbook.triggered_by_state_of"
      )}
      ${this._renderEntity(
        item.context_entity_id,
        item.context_entity_id_name,
        noLink
      )}
      ${historicStateObj
        ? localizeStateMessage(
            this.hass,
            this.hass.localize,
            item.context_state,
            historicStateObj,
            computeDomain(item.context_entity_id!)
          )
        : item.context_state}`;
    }
    // Service call
    if (item.context_event_type === "call_service") {
      return html`${this.hass.localize(
        "ui.components.logbook.triggered_by_service"
      )}
      ${item.context_domain}.${item.context_service}`;
    }
    if (
      !item.context_message ||
      seenEntityIds.includes(item.context_entity_id!)
    ) {
      return "";
    }
    // Automation or script
    if (
      item.context_event_type === "automation_triggered" ||
      item.context_event_type === "script_started"
    ) {
      // context_source is available in 2022.6 and later
      const triggerMsg = item.context_source
        ? item.context_source
        : item.context_message.replace("triggered by ", "");
      const contextTriggerSource = localizeTriggerSource(
        this.hass.localize,
        triggerMsg
      );
      return html`${this.hass.localize(
        item.context_event_type === "automation_triggered"
          ? "ui.components.logbook.triggered_by_automation"
          : "ui.components.logbook.triggered_by_script"
      )}
      ${this._renderEntity(
        item.context_entity_id,
        item.context_entity_id_name,
        noLink
      )}
      ${item.context_message
        ? this._formatMessageWithPossibleEntity(
            contextTriggerSource,
            seenEntityIds,
            undefined,
            noLink
          )
        : ""}`;
    }
    // Generic externally described logbook platform
    // These are not localizable
    return html` ${this.hass.localize("ui.components.logbook.triggered_by")}
    ${item.context_name}
    ${this._formatMessageWithPossibleEntity(
      item.context_message,
      seenEntityIds,
      item.context_entity_id,
      noLink
    )}
    ${this._renderUnseenContextSourceEntity(item, seenEntityIds, noLink)}`;
  }

  private _renderEntity(
    entityId: string | undefined,
    entityName: string | undefined,
    noLink?: boolean
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
    return noLink
      ? displayName
      : html`<button
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
    noLink?: boolean
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
          return html`${messageParts.join(" ")}
          ${this._renderEntity(
            entityId,
            this.hass.states[entityId].attributes.friendly_name,
            noLink
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
        return html`${message}
        ${this._renderEntity(possibleEntity, possibleEntityName, noLink)}`;
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

  _handleClick(ev) {
    if (!ev.currentTarget.traceLink) {
      return;
    }
    navigate(ev.currentTarget.traceLink);
    fireEvent(this, "closed");
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
          justify-content: space-between;
          align-items: center;
        }

        ha-icon-next {
          color: var(--secondary-text-color);
        }

        .clickable {
          cursor: pointer;
        }

        :not(.clickable) .entry.no-entity,
        :not(.clickable) .no-name .entry {
          cursor: default;
        }

        .entry:hover {
          background-color: rgba(var(--rgb-primary-text-color), 0.04);
        }

        .narrow:not(.no-icon) .time {
          margin-left: 32px;
          margin-inline-start: 32px;
          margin-inline-end: initial;
          direction: var(--direction);
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
          margin-inline-start: initial;
          flex-shrink: 0;
          color: var(--state-icon-color);
          margin-inline-end: 16px;
          direction: var(--direction);
        }

        .message {
          color: var(--primary-text-color);
        }

        .no-name .message:first-letter {
          text-transform: capitalize;
        }

        a {
          color: var(--primary-color);
          text-decoration: none;
        }

        button.link {
          color: var(--paper-item-icon-color);
          text-decoration: none;
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
        }

        .narrow .icon-message state-badge {
          margin-left: 0;
          margin-inline-start: 0;
          margin-inline-end: 8px;
          margin-right: 8px;
          direction: var(--direction);
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
