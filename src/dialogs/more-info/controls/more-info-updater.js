import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class MoreInfoUpdater extends PolymerElement {
  static get template() {
    return html`
    <style>
      .link {
        color: #03A9F4;
      }
    </style>

    <div>
      <a class="link" href="https://www.home-assistant.io/docs/installation/updating/" target="_blank">Update Instructions</a>
    </div>
`;
  }

  static get is() { return 'more-info-updater'; }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }

  computeReleaseNotes(stateObj) {
    return (stateObj.attributes.release_notes ||
            'https://www.home-assistant.io/docs/installation/updating/');
  }
}

customElements.define(MoreInfoUpdater.is, MoreInfoUpdater);
