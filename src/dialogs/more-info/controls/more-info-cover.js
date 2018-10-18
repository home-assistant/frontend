import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-cover-tilt-controls.js";
import "../../../components/ha-labeled-slider.js";
import CoverEntity from "../../../util/cover-model.js";

import attributeClassNames from "../../../common/entity/attribute_class_names";
import featureClassNames from "../../../common/entity/feature_class_names";

import LocalizeMixin from "../../../mixins/localize-mixin.js";

const FEATURE_CLASS_NAMES = {
  128: "has-set_tilt_position",
};
class MoreInfoCover extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
  <style include="iron-flex"></style>
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
  <div class$="[[computeClassNames(stateObj)]]">

    <div class="current_position">
      <ha-labeled-slider
        caption="[[localize('ui.card.cover.position')]]" pin=""
        value="{{coverPositionSliderValue}}"
        disabled="[[!entityObj.supportsSetPosition]]"
        on-change="coverPositionSliderChanged"
      ></ha-labeled-slider>
    </div>

    <div class="tilt">
      <ha-labeled-slider
        caption="[[localize('ui.card.cover.tilt_position')]]" pin="" extra=""
        value="{{coverTiltPositionSliderValue}}"
        disabled="[[!entityObj.supportsSetTiltPosition]]"
        on-change="coverTiltPositionSliderChanged">

        <ha-cover-tilt-controls
          slot="extra" hidden$="[[entityObj.isTiltOnly]]"
          hass="[[hass]]" state-obj="[[stateObj]]"
        ></ha-cover-tilt-controls>

      </ha-labeled-slider>
    </div>

  </div>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        observer: "stateObjChanged",
      },
      entityObj: {
        type: Object,
        computed: "computeEntityObj(hass, stateObj)",
      },
      coverPositionSliderValue: Number,
      coverTiltPositionSliderValue: Number,
    };
  }

  computeEntityObj(hass, stateObj) {
    return new CoverEntity(hass, stateObj);
  }

  stateObjChanged(newVal) {
    if (newVal) {
      switch (this.entityObj.deviceClass) {
        case "curtain":
          this.setProperties({
            coverPositionSliderValue: Math.abs(
              newVal.attributes.current_position - 100
            ),
            coverTiltPositionSliderValue:
              newVal.attributes.current_tilt_position,
          });
          break;
        default:
          this.setProperties({
            coverPositionSliderValue: newVal.attributes.current_position,
            coverTiltPositionSliderValue:
              newVal.attributes.current_tilt_position,
          });
          break;
      }
    }
  }

  computeClassNames(stateObj) {
    var classes = [
      attributeClassNames(stateObj, [
        "current_position",
        "current_tilt_position",
      ]),
      featureClassNames(stateObj, FEATURE_CLASS_NAMES),
    ];
    return classes.join(" ");
  }

  coverPositionSliderChanged(ev) {
    switch (this.entityObj.deviceClass) {
      case "curtain":
        this.entityObj.setCoverPosition(Math.abs(ev.target.value - 100));
        break;
      default:
        this.entityObj.setCoverPosition(ev.target.value);
        break;
    }
  }

  coverTiltPositionSliderChanged(ev) {
    this.entityObj.setCoverTiltPosition(ev.target.value);
  }
}

customElements.define("more-info-cover", MoreInfoCover);
