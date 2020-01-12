import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/hass-subpage";
import "../../../components/ha-icon-next";
import "../../../components/ha-card";
import "../../../components/ha-fab";

import LocalizeMixin from "../../../mixins/localize-mixin";
import NavigateMixin from "../../../mixins/navigate-mixin";
import { EventsMixin } from "../../../mixins/events-mixin";

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
        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }
        ha-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        ha-fab[rtl] {
          right: auto;
          left: 16px;
        }
        ha-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }

        ha-card {
          max-width: 600px;
          margin: 16px auto;
          overflow: hidden;
        }
        a {
          text-decoration: none;
          color: var(--primary-text-color);
        }
      </style>

      <hass-subpage
        header="[[localize('ui.panel.config.users.picker.title')]]"
        showBackButton="[[!isWide]]"
      >
        <ha-card>
          <template is="dom-repeat" items="[[users]]" as="user">
            <a href="[[_computeUrl(user)]]">
              <paper-item>
                <paper-item-body two-line>
                  <div>[[_withDefault(user.name, 'Unnamed User')]]</div>
                  <div secondary="">
                    [[_computeGroup(localize, user)]]
                    <template is="dom-if" if="[[user.system_generated]]">
                      -
                      [[localize('ui.panel.config.users.picker.system_generated')]]
                    </template>
                  </div>
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-item>
            </a>
          </template>
        </ha-card>

        <ha-fab
          is-wide$="[[isWide]]"
          icon="hass:plus"
          title="[[localize('ui.panel.config.users.picker.add_user')]]"
          on-click="_addUser"
          rtl$="[[rtl]]"
        ></ha-fab>
      </hass-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      users: Array,
      isWide: Boolean,
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
          import(
            /* webpackChunkName: "ha-dialog-add-user" */ "./ha-dialog-add-user"
          ),
      });
    }
  }

  _withDefault(value, defaultValue) {
    return value || defaultValue;
  }

  _computeUrl(user) {
    return `/config/users/${user.id}`;
  }

  _computeGroup(localize, user) {
    return localize(`groups.${user.group_ids[0]}`);
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
