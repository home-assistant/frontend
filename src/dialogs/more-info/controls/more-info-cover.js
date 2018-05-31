import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-cover-tilt-controls.js';
import '../../../components/ha-labeled-slider.js';
import CoverEntity from '../../../util/cover-model.js';

import attributeClassNames from '../../../common/entity/attribute_class_names';
import featureClassNames from '../../../common/entity/feature_class_names';

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
        max-height: 208px;
      }

      [invisible] {
        visibility: hidden !important;
      }
    </style>
    <div class\$="[[computeClassNames(stateObj)]]">

      <div class="current_position">
        <ha-labeled-slider caption="Position" value="{{coverPositionSliderValue}}" pin="" disabled="[[!entityObj.supportsSetPosition]]" on-change="coverPositionSliderChanged"></ha-labeled-slider>
      </div>

      <div class="tilt">
        <ha-labeled-slider caption="Tilt position" value="{{coverTiltPositionSliderValue}}", pin="", extra="" disabled="[[!entityObj.supportsSetTiltPosition]]", on-change="coverTiltPositionSliderChanged">
          <ha-cover-tilt-controls hidden\$="[[entityObj.isTiltOnly]]" hass="[[hass]]" state-obj="[[stateObj]]">
          </ha-cover-tilt-controls>
        </ha-labeled-slider>
      </div>

    </div>
`;
    }

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
      return new CoverEntity(hass, stateObj);
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
        attributeClassNames(stateObj, ['current_position', 'current_tilt_position']),
        featureClassNames(stateObj, FEATURE_CLASS_NAMES),
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

  customElements.define('more-info-cover', MoreInfoCover);
}
