import "@polymer/paper-fab/paper-fab";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/hass-subpage";

import LocalizeMixin from "../../../mixins/localize-mixin";
import NavigateMixin from "../../../mixins/navigate-mixin";
import EventsMixin from "../../../mixins/events-mixin";

import { computeRTL } from "../../../common/util/compute_rtl";

let registeredDialog = false;

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 * @appliesMixin EventsMixin
 */
class HaUserPicker extends EventsMixin(
  NavigateMixin(LocalizeMixin(PolymerElement))
) {
  static get template() {
    return html`
      <style>
        paper-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }
        paper-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        paper-fab[rtl] {
          right: auto;
          left: 16px;
        }
        paper-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }

        paper-card {
          display: block;
          max-width: 600px;
          margin: 16px auto;
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
      </style>

      <hass-subpage header="[[localize('ui.panel.config.users.picker.title')]]">
        <paper-card>
          <template is="dom-repeat" items="[[users]]" as="user">
            <a href="[[_computeUrl(user)]]">
              <paper-item>
                <paper-item-body two-line>
                  <div>[[_withDefault(user.name, 'Unnamed User')]]</div>
                  <div secondary="">
                    [[user.id]]
                    <template is="dom-if" if="[[user.system_generated]]">
                      - System Generated
                    </template>
                  </div>
                </paper-item-body>
                <iron-icon icon="hass:chevron-right"></iron-icon>
              </paper-item>
            </a>
          </template>
        </paper-card>

        <paper-fab
          is-wide$="[[isWide]]"
          icon="hass:plus"
          title="[[localize('ui.panel.config.users.picker.add_user')]]"
          on-click="_addUser"
          rtl$="[[rtl]]"
        ></paper-fab>
      </hass-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      users: Array,

      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();

    if (!registeredDialog) {
      registeredDialog = true;
      this.fire("register-dialog", {
        dialogShowEvent: "show-add-user",
        dialogTag: "ha-dialog-add-user",
        dialogImport: () =>
          import(/* webpackChunkName: "ha-dialog-add-user" */ "./ha-dialog-add-user"),
      });
    }
  }

  _withDefault(value, defaultValue) {
    return value || defaultValue;
  }

  _computeUrl(user) {
    return `/config/users/${user.id}`;
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }

  _addUser() {
    this.fire("show-add-user", {
      hass: this.hass,
      dialogClosedCallback: async ({ userId }) => {
        this.fire("reload-users");
        if (userId) this.navigate(`/config/users/${userId}`);
      },
    });
  }
}

customElements.define("ha-config-user-picker", HaUserPicker);
