import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-paper-slider";
import HassMediaPlayerEntity from "../../../util/hass-media-player-model";

import attributeClassNames from "../../../common/entity/attribute_class_names";
import isComponentLoaded from "../../../common/config/is_component_loaded";
import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class MoreInfoMediaPlayer extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
  <style include="iron-flex iron-flex-alignment"></style>
  <style>
    .media-state {
      text-transform: capitalize;
    }

    paper-icon-button[highlight] {
      color: var(--accent-color);
    }

    .volume {
      margin-bottom: 8px;

      max-height: 0px;
      overflow: hidden;
      transition: max-height .5s ease-in;
    }

    .has-volume_level .volume {
      max-height: 40px;
    }

    iron-icon.source-input {
      padding: 7px;
      margin-top: 15px;
    }

    paper-dropdown-menu.source-input {
      margin-left: 10px;
    }

    [hidden] {
      display: none !important;
    }

    paper-item {
      cursor: pointer;
    }
  </style>

  <div class$="[[computeClassNames(stateObj)]]">
    <div class="layout horizontal">
      <div class="flex">
        <paper-icon-button icon="hass:power" highlight$="[[playerObj.isOff]]" on-click="handleTogglePower" hidden$="[[computeHidePowerButton(playerObj)]]"></paper-icon-button>
      </div>
      <div>
        <template is="dom-if" if="[[computeShowPlaybackControls(playerObj)]]">
          <paper-icon-button icon="hass:skip-previous" on-click="handlePrevious" hidden$="[[!playerObj.supportsPreviousTrack]]"></paper-icon-button>
          <paper-icon-button icon="[[computePlaybackControlIcon(playerObj)]]" on-click="handlePlaybackControl" hidden$="[[!computePlaybackControlIcon(playerObj)]]" highlight=""></paper-icon-button>
          <paper-icon-button icon="hass:skip-next" on-click="handleNext" hidden$="[[!playerObj.supportsNextTrack]]"></paper-icon-button>
        </template>
      </div>
    </div>
    <!-- VOLUME -->
    <div class="volume_buttons center horizontal layout" hidden$="[[computeHideVolumeButtons(playerObj)]]">
      <paper-icon-button on-click="handleVolumeTap" icon="hass:volume-off"></paper-icon-button>
      <paper-icon-button id="volumeDown" disabled$="[[playerObj.isMuted]]" on-mousedown="handleVolumeDown" on-touchstart="handleVolumeDown" icon="hass:volume-medium"></paper-icon-button>
      <paper-icon-button id="volumeUp" disabled$="[[playerObj.isMuted]]" on-mousedown="handleVolumeUp" on-touchstart="handleVolumeUp" icon="hass:volume-high"></paper-icon-button>
    </div>
    <div class="volume center horizontal layout" hidden$="[[!playerObj.supportsVolumeSet]]">
      <paper-icon-button on-click="handleVolumeTap" hidden$="[[playerObj.supportsVolumeButtons]]" icon="[[computeMuteVolumeIcon(playerObj)]]"></paper-icon-button>
      <ha-paper-slider disabled$="[[playerObj.isMuted]]" min="0" max="100" value="[[playerObj.volumeSliderValue]]" on-change="volumeSliderChanged" class="flex" ignore-bar-touch="">
      </ha-paper-slider>
    </div>
    <!-- SOURCE PICKER -->
    <div class="controls layout horizontal justified" hidden$="[[computeHideSelectSource(playerObj)]]">
      <iron-icon class="source-input" icon="hass:login-variant"></iron-icon>
      <paper-dropdown-menu class="flex source-input" dynamic-align="" label-float="" label="[[localize('ui.card.media_player.source')]]">
        <paper-listbox slot="dropdown-content" selected="{{sourceIndex}}">
          <template is="dom-repeat" items="[[playerObj.sourceList]]">
            <paper-item>[[item]]</paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>
    </div>
    <!-- SOUND MODE PICKER -->
    <template is='dom-if' if='[[!computeHideSelectSoundMode(playerObj)]]'>
      <div class="controls layout horizontal justified">
        <iron-icon class="source-input" icon="hass:music-note"></iron-icon>
        <paper-dropdown-menu class="flex source-input" dynamic-align label-float label="[[localize('ui.card.media_player.sound_mode')]]">
          <paper-listbox slot="dropdown-content" attr-for-selected="item-name" selected="{{SoundModeInput}}">
            <template is='dom-repeat' items='[[playerObj.soundModeList]]'>
              <paper-item item-name$="[[item]]">[[item]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
    </template>
    <!-- TTS -->
    <div hidden$="[[computeHideTTS(ttsLoaded, playerObj)]]" class="layout horizontal end">
      <paper-input id="ttsInput" label="[[localize('ui.card.media_player.text_to_speak')]]" class="flex" value="{{ttsMessage}}" on-keydown="ttsCheckForEnter"></paper-input>
      <paper-icon-button icon="hass:send" on-click="sendTTS"></paper-icon-button>
    </div>
  </div>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      playerObj: {
        type: Object,
        computed: "computePlayerObj(hass, stateObj)",
        observer: "playerObjChanged",
      },

      sourceIndex: {
        type: Number,
        value: 0,
        observer: "handleSourceChanged",
      },

      SoundModeInput: {
        type: String,
        value: "",
        observer: "handleSoundModeChanged",
      },

      ttsLoaded: {
        type: Boolean,
        computed: "computeTTSLoaded(hass)",
      },

      ttsMessage: {
        type: String,
        value: "",
      },
    };
  }

  computePlayerObj(hass, stateObj) {
    return new HassMediaPlayerEntity(hass, stateObj);
  }

  playerObjChanged(newVal, oldVal) {
    if (newVal && newVal.sourceList !== undefined) {
      this.sourceIndex = newVal.sourceList.indexOf(newVal.source);
    }

    if (newVal && newVal.soundModeList !== undefined) {
      this.SoundModeInput = newVal.soundMode;
    }

    if (oldVal) {
      setTimeout(() => {
        this.fire("iron-resize");
      }, 500);
    }
  }

  computeClassNames(stateObj) {
    return attributeClassNames(stateObj, ["volume_level"]);
  }

  computeMuteVolumeIcon(playerObj) {
    return playerObj.isMuted ? "hass:volume-off" : "hass:volume-high";
  }

  computeHideVolumeButtons(playerObj) {
    return !playerObj.supportsVolumeButtons || playerObj.isOff;
  }

  computeShowPlaybackControls(playerObj) {
    return !playerObj.isOff && playerObj.hasMediaControl;
  }

  computePlaybackControlIcon(playerObj) {
    if (playerObj.isPlaying) {
      return playerObj.supportsPause ? "hass:pause" : "hass:stop";
    }
    if (playerObj.hasMediaControl || playerObj.isOff || playerObj.isIdle) {
      if (
        playerObj.hasMediaControl &&
        playerObj.supportsPause &&
        !playerObj.isPaused
      ) {
        return "hass:play-pause";
      }
      return playerObj.supportsPlay ? "hass:play" : null;
    }
    return "";
  }

  computeHidePowerButton(playerObj) {
    return playerObj.isOff
      ? !playerObj.supportsTurnOn
      : !playerObj.supportsTurnOff;
  }

  computeHideSelectSource(playerObj) {
    return (
      playerObj.isOff ||
      !playerObj.supportsSelectSource ||
      !playerObj.sourceList
    );
  }

  computeHideSelectSoundMode(playerObj) {
    return (
      playerObj.isOff ||
      !playerObj.supportsSelectSoundMode ||
      !playerObj.soundModeList
    );
  }

  computeHideTTS(ttsLoaded, playerObj) {
    return !ttsLoaded || !playerObj.supportsPlayMedia;
  }

  computeTTSLoaded(hass) {
    return isComponentLoaded(hass, "tts");
  }

  handleTogglePower() {
    this.playerObj.togglePower();
  }

  handlePrevious() {
    this.playerObj.previousTrack();
  }

  handlePlaybackControl() {
    this.playerObj.mediaPlayPause();
  }

  handleNext() {
    this.playerObj.nextTrack();
  }

  handleSourceChanged(sourceIndex, sourceIndexOld) {
    // Selected Option will transition to '' before transitioning to new value
    if (
      !this.playerObj ||
      !this.playerObj.supportsSelectSource ||
      this.playerObj.sourceList === undefined ||
      sourceIndex < 0 ||
      sourceIndex >= this.playerObj.sourceList ||
      sourceIndexOld === undefined
    ) {
      return;
    }

    const sourceInput = this.playerObj.sourceList[sourceIndex];

    if (sourceInput === this.playerObj.source) {
      return;
    }

    this.playerObj.selectSource(sourceInput);
  }

  handleSoundModeChanged(newVal, oldVal) {
    if (
      oldVal &&
      newVal !== this.playerObj.soundMode &&
      this.playerObj.supportsSelectSoundMode
    ) {
      this.playerObj.selectSoundMode(newVal);
    }
  }

  handleVolumeTap() {
    if (!this.playerObj.supportsVolumeMute) {
      return;
    }
    this.playerObj.volumeMute(!this.playerObj.isMuted);
  }

  handleVolumeUp() {
    const obj = this.$.volumeUp;
    this.handleVolumeWorker("volume_up", obj, true);
  }

  handleVolumeDown() {
    const obj = this.$.volumeDown;
    this.handleVolumeWorker("volume_down", obj, true);
  }

  handleVolumeWorker(service, obj, force) {
    if (force || (obj !== undefined && obj.pointerDown)) {
      this.playerObj.callService(service);
      setTimeout(() => this.handleVolumeWorker(service, obj, false), 500);
    }
  }

  volumeSliderChanged(ev) {
    const volPercentage = parseFloat(ev.target.value);
    const volume = volPercentage > 0 ? volPercentage / 100 : 0;
    this.playerObj.setVolume(volume);
  }

  ttsCheckForEnter(ev) {
    if (ev.keyCode === 13) this.sendTTS();
  }

  sendTTS() {
    const services = this.hass.services.tts;
    const serviceKeys = Object.keys(services).sort();
    let service;
    let i;

    for (i = 0; i < serviceKeys.length; i++) {
      if (serviceKeys[i].indexOf("_say") !== -1) {
        service = serviceKeys[i];
        break;
      }
    }

    if (!service) {
      return;
    }

    this.hass.callService("tts", service, {
      entity_id: this.stateObj.entity_id,
      message: this.ttsMessage,
    });
    this.ttsMessage = "";
    this.$.ttsInput.focus();
  }
}

customElements.define("more-info-media_player", MoreInfoMediaPlayer);
