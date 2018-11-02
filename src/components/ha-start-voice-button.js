import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import EventsMixin from "../mixins/events-mixin";

import isComponentLoaded from "../common/config/is_component_loaded";

/*
 * @appliesMixin EventsMixin
 */
class HaStartVoiceButton extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <paper-icon-button icon="hass:microphone" hidden$="[[!canListen]]" on-click="handleListenClick"></paper-icon-button>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        value: null,
      },

      canListen: {
        type: Boolean,
        computed: "computeCanListen(hass)",
        notify: true,
      },
    };
  }

  computeCanListen(hass) {
    return (
      "webkitSpeechRecognition" in window &&
      isComponentLoaded(hass, "conversation")
    );
  }

  handleListenClick() {
    this.fire("hass-start-voice");
  }
}

customElements.define("ha-start-voice-button", HaStartVoiceButton);
