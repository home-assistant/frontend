import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class HaStartVoiceButton extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <paper-icon-button icon="mdi:microphone" hidden\$="[[!canListen]]" on-click="handleListenClick"></paper-icon-button>
`;
  }

  static get is() { return 'ha-start-voice-button'; }

  static get properties() {
    return {
      hass: {
        type: Object,
        value: null,
      },

      canListen: {
        type: Boolean,
        computed: 'computeCanListen(hass)',
        notify: true,
      },
    };
  }

  computeCanListen(hass) {
    return ('webkitSpeechRecognition' in window &&
            window.hassUtil.isComponentLoaded(hass, 'conversation'));
  }

  handleListenClick() {
    this.fire('hass-start-voice');
  }
}

customElements.define(HaStartVoiceButton.is, HaStartVoiceButton);
