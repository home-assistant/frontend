import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  eventOptions,
} from "lit-element";
import { scroll } from "lit-virtualizer";
import { formatDate } from "../../common/datetime/format_date";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { fireEvent } from "../../common/dom/fire_event";
import { domainIcon } from "../../common/entity/domain_icon";
import { stateIcon } from "../../common/entity/state_icon";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/ha-icon";
import { LogbookEntry } from "../../data/logbook";
import { HomeAssistant } from "../../types";
import { restoreScroll } from "../../common/decorators/restore-scroll";
import { classMap } from "lit-html/directives/class-map";

class HaLogbook extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public userIdToName = {};

  @property() public entries: LogbookEntry[] = [];

  @property({ attribute: "rtl", type: Boolean, reflect: true })
  // @ts-ignore
  private _rtl = false;

  // @ts-ignore
  @restoreScroll(".container") private _savedScrollPos?: number;

  protected shouldUpdate(changedProps: PropertyValues) {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const languageChanged =
      oldHass === undefined || oldHass.language !== this.hass.language;
    return changedProps.has("entries") || languageChanged;
  }

  protected updated(_changedProps: PropertyValues) {
    this._rtl = computeRTL(this.hass);
  }

  protected render(): TemplateResult {
    if (!this.entries?.length) {
      return html`
        <div class="container ${classMap({ rtl: this._rtl })}">
          ${this.hass.localize("ui.panel.logbook.entries_not_found")}
        </div>
      `;
    }

    return html`
      <div class="container" @scroll=${this._saveScrollPos}>
        ${scroll({
          items: this.entries,
          renderItem: (item: LogbookEntry, index?: number) =>
            this._renderLogbookItem(item, index),
        })}
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
    const state = item.entity_id ? this.hass.states[item.entity_id] : undefined;
    const item_username =
      item.context_user_id && this.userIdToName[item.context_user_id];
    return html`
      <div>
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

        <div class="entry">
          <div class="time">
            ${formatTimeWithSeconds(new Date(item.when), this.hass.language)}
          </div>
          <ha-icon
            .icon=${state ? stateIcon(state) : domainIcon(item.domain)}
          ></ha-icon>
          <div class="message">
            ${!item.entity_id
              ? html` <span class="name">${item.name}</span> `
              : html`
                  <a
                    href="#"
                    @click=${this._entityClicked}
                    .entityId=${item.entity_id}
                    class="name"
                    >${item.name}</a
                  >
                `}
            <span
              >${item.message}${item_username
                ? ` (${item_username})`
                : ``}</span
            >
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
    ev.preventDefault();
    fireEvent(this, "hass-more-info", {
      entityId: (ev.target as any).entityId,
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 100%;
      }

      :host([rtl]) {
        direction: ltr;
      }

      .entry {
        display: flex;
        line-height: 2em;
      }

      .time {
        width: 65px;
        flex-shrink: 0;
        font-size: 0.8em;
        color: var(--secondary-text-color);
      }

      :host([rtl]) .date {
        direction: rtl;
      }

      ha-icon {
        margin: 0 8px 0 16px;
        flex-shrink: 0;
        color: var(--primary-text-color);
      }

      .message {
        color: var(--primary-text-color);
      }

      a {
        color: var(--primary-color);
      }

      .container {
        padding: 0 16px;
      }
      .container.rtl {
        direction: rtl;
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
    `;
  }
}

customElements.define("ha-logbook", HaLogbook);
