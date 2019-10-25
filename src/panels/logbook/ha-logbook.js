import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/iron-icon/iron-icon";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import formatTime from "../../common/datetime/format_time";
import formatDate from "../../common/datetime/format_date";
import { EventsMixin } from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";
import { domainIcon } from "../../common/entity/domain_icon";
import { computeRTL } from "../../common/util/compute_rtl";

/*
 * @appliesMixin EventsMixin
 */
class HaLogbook extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="iron-flex"></style>
      <style>
        :host {
          display: block;
        }

        :host([rtl]) {
          direction: ltr;
        }

        .entry {
          @apply --paper-font-body1;
          line-height: 2em;
        }

        .time {
          width: 55px;
          font-size: 0.8em;
          color: var(--secondary-text-color);
        }

        :host([rtl]) .date {
          direction: rtl;
        }

        iron-icon {
          margin: 0 8px 0 16px;
          color: var(--primary-text-color);
        }

        .message {
          color: var(--primary-text-color);
        }

        a {
          color: var(--primary-color);
        }
      </style>

      <template is="dom-if" if="true">
        [[localize('ui.panel.logbook.entries_not_found')]]
      </template>

      <template is="dom-repeat" items="[[entries]]">
        <template is="dom-if" if="{{_needHeader(entries.*, index)}}">
          <h4 class="date">[[_formatDate(item.when)]]</h4>
        </template>

        <div class="horizontal layout entry">
          <div class="time">[[_formatTime(item.when)]]</div>
          <iron-icon icon="[[_computeIcon(item.domain)]]"></iron-icon>
          <div class="message" flex="">
            <template is="dom-if" if="[[!item.entity_id]]">
              <span class="name">[[item.name]]</span>
            </template>
            <template is="dom-if" if="[[item.entity_id]]">
              <a href="#" on-click="entityClicked" class="name"
                >[[item.name]]</a
              >
            </template>
            <span> </span> <span>[[item.message]]</span>
          </div>
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      entries: {
        type: Array,
        value: [],
      },
      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  _formatTime(date) {
    return formatTime(new Date(date), this.hass.language);
  }

  _formatDate(date) {
    return formatDate(new Date(date), this.hass.language);
  }

  _needHeader(change, index) {
    if (!index) return true;
    const current = this.get("when", change.base[index]);
    const previous = this.get("when", change.base[index - 1]);
    return (
      current &&
      previous &&
      new Date(current).toDateString() !== new Date(previous).toDateString()
    );
  }

  _computeIcon(domain) {
    return domainIcon(domain);
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }

  entityClicked(ev) {
    ev.preventDefault();
    this.fire("hass-more-info", { entityId: ev.model.item.entity_id });
  }
}

customElements.define("ha-logbook", HaLogbook);
