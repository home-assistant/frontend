import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/hass-subpage";
import LocalizeMixin from "../../../mixins/localize-mixin";
import NavigateMixin from "../../../mixins/navigate-mixin";
import EventsMixin from "../../../mixins/events-mixin";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 * @appliesMixin EventsMixin
 */
class HaUserEditor extends EventsMixin(
  NavigateMixin(LocalizeMixin(PolymerElement))
) {
  static get template() {
    return html`
      <style include="ha-style">
        paper-card {
          display: block;
          max-width: 600px;
          margin: 0 auto 16px;
        }
        paper-card:first-child {
          margin-top: 16px;
        }
        paper-card:last-child {
          margin-bottom: 16px;
        }
        hass-subpage paper-card:first-of-type {
          direction: ltr;
        }
      </style>

      <hass-subpage header="View user">
        <paper-card heading="[[_computeName(user)]]">
          <table class="card-content">
            <tr>
              <td>ID</td>
              <td>[[user.id]]</td>
            </tr>
            <tr>
              <td>Owner</td>
              <td>[[user.is_owner]]</td>
            </tr>
            <tr>
              <td>Active</td>
              <td>[[user.is_active]]</td>
            </tr>
            <tr>
              <td>System generated</td>
              <td>[[user.system_generated]]</td>
            </tr>
          </table>
        </paper-card>
        <paper-card>
          <div class="card-actions">
            <mwc-button
              class="warning"
              on-click="_deleteUser"
              disabled="[[user.system_generated]]"
            >
              [[localize('ui.panel.config.users.editor.delete_user')]]
            </mwc-button>
            <template is="dom-if" if="[[user.system_generated]]">
              Unable to remove system generated users.
            </template>
          </div>
        </paper-card>
      </hass-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      user: Object,
    };
  }

  _computeName(user) {
    return user && (user.name || "Unnamed user");
  }

  async _deleteUser(ev) {
    if (
      !confirm(
        `Are you sure you want to delete ${this._computeName(this.user)}`
      )
    ) {
      ev.target.blur();
      return;
    }
    try {
      await this.hass.callWS({
        type: "config/auth/delete",
        user_id: this.user.id,
      });
    } catch (err) {
      alert(err.code);
      return;
    }
    this.fire("reload-users");
    this.navigate("/config/users");
  }
}

customElements.define("ha-user-editor", HaUserEditor);
