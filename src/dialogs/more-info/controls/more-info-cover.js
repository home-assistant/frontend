import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '../../../components/ha-paper-slider.js';
import '../../../util/cover-model.js';
import '../../../components/ha-cover-tilt-controls.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

{
  const FEATURE_CLASS_NAMES = {
    128: 'has-set_tilt_position',
  };
  class MoreInfoCover extends PolymerElement {
    static get template() {
      return html`
    <style is="custom-style" include="iron-flex"></style>
    <style>
      .current_position, .tilt {
        max-height: 0px;
        overflow: hidden;
      }
      .has-current_position .current_position,
      .has-set_tilt_position .tilt,
      .has-current_tilt_position .tilt
      {
        max-height: 90px;
      }

      [invisible] {
        visibility: hidden !important;
      }
    </style>
    <div class\$="[[computeClassNames(stateObj)]]">

      <div class="current_position">
        <div>Position</div>
        <ha-paper-slider min="0" max="100" value="{{coverPositionSliderValue}}" step="1" pin="" disabled="[[!entityObj.supportsSetPosition]]" on-change="coverPositionSliderChanged" ignore-bar-touch=""></ha-paper-slider>
      </div>

      <div class="tilt">
        <div>Tilt position</div>
        <div>
          <ha-cover-tilt-controls hidden\$="[[entityObj.isTiltOnly]]" hass="[[hass]]" state-obj="[[stateObj]]">
          </ha-cover-tilt-controls>
        </div>
        <ha-paper-slider min="0" max="100" value="{{coverTiltPositionSliderValue}}" step="1" pin="" disabled="[[!entityObj.supportsSetTiltPosition]]" on-change="coverTiltPositionSliderChanged" ignore-bar-touch=""></ha-paper-slider>
      </div>

    </div>
`;
    }

    static get is() { return 'more-info-cover'; }

    static get properties() {
      return {
        hass: {
          type: Object,
        },

        stateObj: {
          type: Object,
          observer: 'stateObjChanged',
        },

        entityObj: {
          type: Object,
          computed: 'computeEntityObj(hass, stateObj)',
        },

        coverPositionSliderValue: {
          type: Number,
        },

        coverTiltPositionSliderValue: {
          type: Number,
        },

      };
    }

    computeEntityObj(hass, stateObj) {
      return new window.CoverEntity(hass, stateObj);
    }

    stateObjChanged(newVal) {
      if (newVal) {
        this.setProperties({
          coverPositionSliderValue: newVal.attributes.current_position,
          coverTiltPositionSliderValue: newVal.attributes.current_tilt_position,
        });
      }
    }

    computeClassNames(stateObj) {
      var classes = [
        window.hassUtil.attributeClassNames(stateObj, ['current_position', 'current_tilt_position']),
        window.hassUtil.featureClassNames(stateObj, FEATURE_CLASS_NAMES),
      ];
      return classes.join(' ');
    }

    coverPositionSliderChanged(ev) {
      this.entityObj.setCoverPosition(ev.target.value);
    }

    coverTiltPositionSliderChanged(ev) {
      this.entityObj.setCoverTiltPosition(ev.target.value);
    }
  }

  customElements.define(MoreInfoCover.is, MoreInfoCover);
}
