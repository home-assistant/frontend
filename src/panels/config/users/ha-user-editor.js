import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-card/paper-card.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../layouts/hass-subpage.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";
import NavigateMixin from "../../../mixins/navigate-mixin.js";
import EventsMixin from "../../../mixins/events-mixin.js";

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
  <style>
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
  </style>

  <hass-subpage header="View user">
    <paper-card heading="[[_computeName(user)]]">
      <table class='card-content'>
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
      <div class='card-actions'>
        <paper-button on-click='_deleteUser' disabled='[[user.system_generated]]'>
          [[localize('ui.panel.config.users.editor.delete_user')]]
        </paper-button>
        <template is='dom-if' if='[[user.system_generated]]'>
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
