import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import LocalizeMixin from "../../../mixins/localize-mixin";

class MoreInfoUpdater extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        .link {
          color: #03a9f4;
        }
      </style>

      <div>
        <a
          class="link"
          href="https://www.home-assistant.io/docs/installation/updating/"
          target="_blank"
          >[[localize('ui.dialogs.more_info_control.updater.title')]]</a
        >
      </div>
    `;
  }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }

  computeReleaseNotes(stateObj) {
    return (
      stateObj.attributes.release_notes ||
      "https://www.home-assistant.io/docs/installation/updating/"
    );
  }
}

customElements.define("more-info-updater", MoreInfoUpdater);
