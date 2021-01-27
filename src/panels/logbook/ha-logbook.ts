import {
  css,
  CSSResultArray,
  customElement,
  eventOptions,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { scroll } from "lit-virtualizer";
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
import { haStyle, haStyleScrollbar } from "../../resources/styles";
import { HomeAssistant } from "../../types";

@customElement("ha-logbook")
class HaLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public userIdToName = {};

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

  protected shouldUpdate(changedProps: PropertyValues) {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const languageChanged =
      oldHass === undefined || oldHass.language !== this.hass.language;

    return changedProps.has("entries") || languageChanged;
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
          ? scroll({
              items: this.entries,
              renderItem: (item: LogbookEntry, index?: number) =>
                this._renderLogbookItem(item, index),
            })
          : this.entries.map((item, index) =>
              this._renderLogbookItem(item, index)
            )}
      </div>
    `;
  }

  private _renderLogbookItem(
    item: LogbookEntry,
    index?: number
  ): TemplateResult {
    if (index === undefined) {
      return html``;
    }

    const previous = this.entries[index - 1];
    const stateObj = item.entity_id
      ? this.hass.states[item.entity_id]
      : undefined;
    const item_username =
      item.context_user_id && this.userIdToName[item.context_user_id];
    const domain = item.entity_id ? computeDomain(item.entity_id) : item.domain;

    return html`
      <div class="entry-container">
        ${index === 0 ||
        (item?.when &&
          previous?.when &&
          new Date(item.when).toDateString() !==
            new Date(previous.when).toDateString())
          ? html`
              <h4 class="date">
                ${formatDate(new Date(item.when), this.hass.language)}
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
                    .overrideIcon=${item.icon ??
                    domainIcon(domain, stateObj, item.state)}
                    .overrideImage=${DOMAINS_WITH_DYNAMIC_PICTURE.has(domain)
                      ? ""
                      : stateObj?.attributes.entity_picture_local ||
                        stateObj?.attributes.entity_picture}
                  ></state-badge>
                `
              : ""}
            <div class="message-relative_time">
              <div class="message">
                ${!this.noName
                  ? html`<a
                      href="#"
                      @click=${this._entityClicked}
                      .entityId=${item.entity_id}
                      ><span class="name">${item.name}</span></a
                    >`
                  : ""}
                ${item.message}
                ${item_username
                  ? ` ${this.hass.localize(
                      "ui.components.logbook.by"
                    )} ${item_username}`
                  : !item.context_event_type
                  ? ""
                  : item.context_event_type === "call_service"
                  ? // Service Call
                    ` ${this.hass.localize("ui.components.logbook.by_service")}
                  ${item.context_domain}.${item.context_service}`
                  : item.context_entity_id === item.entity_id
                  ? // HomeKit or something that self references
                    ` ${this.hass.localize("ui.components.logbook.by")}
                  ${
                    item.context_name
                      ? item.context_name
                      : item.context_event_type
                  }`
                  : // Another entity such as an automation or script
                    html` ${this.hass.localize("ui.components.logbook.by")}
                      <a
                        href="#"
                        @click=${this._entityClicked}
                        .entityId=${item.context_entity_id}
                        class="name"
                        >${item.context_entity_id_name}</a
                      >`}
              </div>
              <div class="secondary">
                <span
                  >${formatTimeWithSeconds(
                    new Date(item.when),
                    this.hass.language
                  )}</span
                >
                -
                <ha-relative-time
                  .hass=${this.hass}
                  .datetime=${item.when}
                ></ha-relative-time>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  @eventOptions({ passive: true })
  private _saveScrollPos(e: Event) {
    this._savedScrollPos = (e.target as HTMLDivElement).scrollTop;
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

  static get styles(): CSSResultArray {
    return [
      haStyle,
      haStyleScrollbar,
      css`
        :host {
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

        .uni-virtualizer-host {
          display: block;
          position: relative;
          contain: strict;
          height: 100%;
          overflow: auto;
        }

        .uni-virtualizer-host > * {
          box-sizing: border-box;
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
    "ha-logbook": HaLogbook;
  }
}
