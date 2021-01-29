import "@polymer/iron-image/iron-image";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { EventsMixin } from "../../mixins/events-mixin";

/*
 * @appliesMixin EventsMixin
 */
class HaEntityMarker extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-positioning"></style>
      <style>
        .marker {
          position: relative;
          display: block;
          margin: 0 auto;
          width: 2.5em;
          text-align: center;
          height: 2.5em;
          line-height: 2.5em;
          font-size: 1.5em;
          border-radius: 50%;
          border: 0.1em solid var(--ha-marker-color, var(--primary-color));
          color: var(--primary-text-color);
          background-color: var(--card-background-color);
        }
        iron-image {
          border-radius: 50%;
        }
      </style>

      <div class="marker" style$="border-color:{{entityColor}}">
        <template is="dom-if" if="[[entityName]]">[[entityName]]</template>
        <template is="dom-if" if="[[entityPicture]]">
          <iron-image
            sizing="cover"
            class="fit"
            src="[[entityPicture]]"
          ></iron-image>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      entityId: {
        type: String,
        value: "",
      },

      entityName: {
        type: String,
        value: null,
      },

      entityPicture: {
        type: String,
        value: null,
      },

      entityColor: {
        type: String,
        value: null,
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener("click", (ev) => this.badgeTap(ev));
  }

  badgeTap(ev) {
    ev.stopPropagation();
    if (this.entityId) {
      this.fire("hass-more-info", { entityId: this.entityId });
    }
  }
}

customElements.define("ha-entity-marker", HaEntityMarker);
