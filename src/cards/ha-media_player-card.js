import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-progress/paper-progress";
import "@polymer/paper-styles/element-styles/paper-material-styles";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import HassMediaPlayerEntity from "../util/hass-media-player-model";
import { fetchMediaPlayerThumbnailWithCache } from "../data/media-player";

import { computeStateName } from "../common/entity/compute_state_name";
import { EventsMixin } from "../mixins/events-mixin";
import LocalizeMixin from "../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaMediaPlayerCard extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style
        include="paper-material-styles iron-flex iron-flex-alignment iron-positioning"
      >
        :host {
          @apply --paper-material-elevation-1;
          display: block;
          position: relative;
          font-size: 0px;
          border-radius: 2px;
        }

        .banner {
          position: relative;
          background-color: white;
          border-top-left-radius: 2px;
          border-top-right-radius: 2px;
        }

        .banner:before {
          display: block;
          content: "";
          width: 100%;
          /* removed .25% from 16:9 ratio to fix YT black bars */
          padding-top: 56%;
          transition: padding-top 0.8s;
        }

        .banner.no-cover {
          background-position: center center;
          background-image: url(/static/images/card_media_player_bg.png);
          background-repeat: no-repeat;
          background-color: var(--primary-color);
        }

        .banner.content-type-music:before {
          padding-top: 100%;
        }

        .banner.content-type-game:before {
          padding-top: 100%;
        }

        .banner.no-cover:before {
          padding-top: 88px;
        }

        .banner > .cover {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;

          border-top-left-radius: 2px;
          border-top-right-radius: 2px;

          background-position: center center;
          background-size: cover;
          transition: opacity 0.8s;
          opacity: 1;
        }

        .banner.is-off > .cover {
          opacity: 0;
        }

        .banner > .caption {
          @apply --paper-font-caption;

          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;

          background-color: rgba(0, 0, 0, var(--dark-secondary-opacity));

          padding: 8px 16px;

          font-size: 14px;
          font-weight: 500;
          color: white;

          transition: background-color 0.5s;
        }

        .banner.is-off > .caption {
          background-color: initial;
        }

        .banner > .caption .title {
          @apply --paper-font-common-nowrap;
          font-size: 1.2em;
          margin: 8px 0 4px;
        }

        .progress {
          width: 100%;
          height: var(--paper-progress-height, 4px);
          margin-top: calc(-1 * var(--paper-progress-height, 4px));
          --paper-progress-active-color: var(--accent-color);
          --paper-progress-container-color: rgba(200, 200, 200, 0.5);
        }

        .controls {
          position: relative;
          @apply --paper-font-body1;
          padding: 8px;
          border-bottom-left-radius: 2px;
          border-bottom-right-radius: 2px;
          background-color: var(--paper-card-background-color, white);
        }

        .controls paper-icon-button {
          width: 44px;
          height: 44px;
        }

        .playback-controls {
          direction: ltr;
        }

        paper-icon-button {
          opacity: var(--dark-primary-opacity);
        }

        paper-icon-button[disabled] {
          opacity: var(--dark-disabled-opacity);
        }

        paper-icon-button.primary {
          width: 56px !important;
          height: 56px !important;
          background-color: var(--primary-color);
          color: white;
          border-radius: 50%;
          padding: 8px;
          transition: background-color 0.5s;
        }

        paper-icon-button.primary[disabled] {
          background-color: rgba(0, 0, 0, var(--dark-disabled-opacity));
        }

        [hidden] {
          display: none;
        }
        [invisible] {
          visibility: hidden !important;
        }
      </style>

      <div
        class$="[[computeBannerClasses(playerObj, _coverShowing, _coverLoadError)]]"
      >
        <div class="cover" id="cover"></div>

        <div class="caption">
          [[_computeStateName(stateObj)]]
          <div class="title">[[computePrimaryText(localize, playerObj)]]</div>
          [[playerObj.secondaryTitle]]<br />
        </div>
      </div>

      <paper-progress
        max="[[stateObj.attributes.media_duration]]"
        value="[[playbackPosition]]"
        hidden$="[[computeHideProgress(playerObj)]]"
        class="progress"
      ></paper-progress>

      <div class="controls layout horizontal justified">
        <paper-icon-button
          aria-label="Turn off"
          icon="hass:power"
          on-click="handleTogglePower"
          invisible$="[[computeHidePowerButton(playerObj)]]"
          class="self-center secondary"
        ></paper-icon-button>

        <div class="playback-controls">
          <paper-icon-button
            aria-label="Previous track"
            icon="hass:skip-previous"
            invisible$="[[!playerObj.supportsPreviousTrack]]"
            disabled="[[playerObj.isOff]]"
            on-click="handlePrevious"
          ></paper-icon-button>
          <paper-icon-button
            aria-label="Play or Pause"
            class="primary"
            icon="[[computePlaybackControlIcon(playerObj)]]"
            invisible$="[[!computePlaybackControlIcon(playerObj)]]"
            disabled="[[playerObj.isOff]]"
            on-click="handlePlaybackControl"
          ></paper-icon-button>
          <paper-icon-button
            aria-label="Stop"
            icon="hass:stop"
            hidden$="[[computeHideStopButton(playerObj)]]"
            disabled="[[playerObj.isOff]]"
            on-click="handleStopControl"
          ></paper-icon-button>
          <paper-icon-button
            aria-label="Next track"
            icon="hass:skip-next"
            invisible$="[[!playerObj.supportsNextTrack]]"
            disabled="[[playerObj.isOff]]"
            on-click="handleNext"
          ></paper-icon-button>
        </div>

        <paper-icon-button
          aria-label="More information."
          icon="hass:dots-vertical"
          on-click="handleOpenMoreInfo"
          class="self-center secondary"
        ></paper-icon-button>
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
      playbackControlIcon: {
        type: String,
        computed: "computePlaybackControlIcon(playerObj)",
      },
      playbackPosition: Number,
      _coverShowing: {
        type: Boolean,
        value: false,
      },
      _coverLoadError: {
        type: Boolean,
        value: false,
      },
    };
  }

  async playerObjChanged(playerObj, oldPlayerObj) {
    if (playerObj.isPlaying && playerObj.showProgress) {
      if (!this._positionTracking) {
        this._positionTracking = setInterval(
          () => this.updatePlaybackPosition(),
          1000
        );
      }
    } else if (this._positionTracking) {
      clearInterval(this._positionTracking);
      this._positionTracking = null;
    }
    if (playerObj.showProgress) {
      this.updatePlaybackPosition();
    }

    const picture = playerObj.stateObj.attributes.entity_picture;
    const oldPicture =
      oldPlayerObj && oldPlayerObj.stateObj.attributes.entity_picture;

    if (picture !== oldPicture && !picture) {
      this.$.cover.style.backgroundImage = "";
      return;
    }
    if (picture === oldPicture) {
      return;
    }

    // We have a new picture url
    // If entity picture is non-relative, we use that url directly.
    if (picture.substr(0, 1) !== "/") {
      this._coverShowing = true;
      this._coverLoadError = false;
      this.$.cover.style.backgroundImage = `url(${picture})`;
      return;
    }

    try {
      const {
        content_type: contentType,
        content,
      } = await fetchMediaPlayerThumbnailWithCache(
        this.hass,
        playerObj.stateObj.entity_id
      );
      this._coverShowing = true;
      this._coverLoadError = false;
      this.$.cover.style.backgroundImage = `url(data:${contentType};base64,${content})`;
    } catch (err) {
      this._coverShowing = false;
      this._coverLoadError = true;
      this.$.cover.style.backgroundImage = "";
    }
  }

  updatePlaybackPosition() {
    this.playbackPosition = this.playerObj.currentProgress;
  }

  computeBannerClasses(playerObj, coverShowing, coverLoadError) {
    var cls = "banner";

    if (!playerObj) {
      return cls;
    }

    if (playerObj.isOff || playerObj.isIdle) {
      cls += " is-off no-cover";
    } else if (
      !playerObj.stateObj.attributes.entity_picture ||
      coverLoadError ||
      !coverShowing
    ) {
      cls += " no-cover";
    } else if (playerObj.stateObj.attributes.media_content_type === "music") {
      cls += " content-type-music";
    } else if (playerObj.stateObj.attributes.media_content_type === "game") {
      cls += " content-type-game";
    }
    return cls;
  }

  computeHideProgress(playerObj) {
    return !playerObj.showProgress;
  }

  computeHidePowerButton(playerObj) {
    return playerObj.isOff
      ? !playerObj.supportsTurnOn
      : !playerObj.supportsTurnOff;
  }

  computePlayerObj(hass, stateObj) {
    return new HassMediaPlayerEntity(hass, stateObj);
  }

  computePrimaryText(localize, playerObj) {
    return (
      playerObj.primaryTitle ||
      localize(`state.media_player.${playerObj.stateObj.state}`) ||
      localize(`state.default.${playerObj.stateObj.state}`) ||
      playerObj.stateObj.state
    );
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

  computeHideStopButton(playerObj) {
    return !playerObj.supportsStop ||
      (!playerObj.isPlaying && !playerObj.isPaused)
      ? "true"
      : null;
  }

  _computeStateName(stateObj) {
    return computeStateName(stateObj);
  }

  handleNext(ev) {
    ev.stopPropagation();
    this.playerObj.nextTrack();
  }

  handleOpenMoreInfo(ev) {
    ev.stopPropagation();
    this.fire("hass-more-info", { entityId: this.stateObj.entity_id });
  }

  handlePlaybackControl(ev) {
    ev.stopPropagation();
    this.playerObj.mediaPlayPause();
  }

  handleStopControl(ev) {
    ev.stopPropagation();
    this.playerObj.mediaStop();
  }

  handlePrevious(ev) {
    ev.stopPropagation();
    this.playerObj.previousTrack();
  }

  handleTogglePower(ev) {
    ev.stopPropagation();
    this.playerObj.togglePower();
  }
}
customElements.define("ha-media_player-card", HaMediaPlayerCard);
