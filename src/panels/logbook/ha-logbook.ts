import "../../components/ha-icon";
import { formatTimeWithSeconds } from "../../common/datetime/format_time";
import { formatDate } from "../../common/datetime/format_date";
import { domainIcon } from "../../common/entity/domain_icon";
import { stateIcon } from "../../common/entity/state_icon";
import { computeRTL } from "../../common/util/compute_rtl";
import {
  LitElement,
  html,
  property,
  TemplateResult,
  CSSResult,
  css,
  PropertyValues,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import "lit-virtualizer";
import { LogbookEntry } from "../../data/logbook";

class HaLogbook extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public entries: LogbookEntry[] = [];
  @property({ attribute: "rtl", type: Boolean, reflect: true })
  // @ts-ignore
  private _rtl = false;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass && oldHass.language !== this.hass.language) {
      this._rtl = computeRTL(this.hass);
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._rtl = computeRTL(this.hass);
  }

  protected render(): TemplateResult {
    if (!this.entries?.length) {
      return html`
        ${this.hass.localize("ui.panel.logbook.entries_not_found")}
      `;
    }

    return html`
      <lit-virtualizer
        .items=${this.entries}
        .renderItem=${(item: LogbookEntry, index: number) =>
          this._renderLogbookItem(item, index)}
        style="height: 100%;"
      ></lit-virtualizer>
    `;
  }

  private _renderLogbookItem(
    item: LogbookEntry,
    index: number
  ): TemplateResult {
    const previous = this.entries[index - 1];
    const state = item.entity_id ? this.hass.states[item.entity_id] : undefined;
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
              ? html`
                  <span class="name">${item.name}</span>
                `
              : html`
                  <a
                    href="#"
                    @click=${this._entityClicked}
                    .entityId=${item.entity_id}
                    class="name"
                  >
                    ${item.name}
                  </a>
                `}
            <span>${item.message}</span>
          </div>
        </div>
      </div>
    `;
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
    `;
  }
}

customElements.define("ha-logbook", HaLogbook);
