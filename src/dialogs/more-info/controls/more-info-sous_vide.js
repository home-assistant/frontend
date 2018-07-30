import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-climate-control.js';

import attributeClassNames from '../../../common/entity/attribute_class_names.js';
import featureClassNames from '../../../common/entity/feature_class_names';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

/*
 * @appliesMixin EventsMixin
 * @appliesMixin LocalizeMixin
 */
class MoreInfoSousVide extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="iron-flex"></style>
    <style>
      :host {
        color: var(--primary-text-color);
      }

      .container-temperature {
        width: 100%;
      }

      ha-climate-control.range-control-left,
      ha-climate-control.range-control-right {
        float: left;
        width: 46%;
      }
      ha-climate-control.range-control-left {
        margin-right: 4%;
      }
      ha-climate-control.range-control-right {
        margin-left: 4%;
      }

      .single-row {
        padding: 8px 0;
      }
    </style>


    <div>
      <div class="container-temperature">
        <div class$="[[stateObj.attributes.operation_mode]]">
            <ha-climate-control value="[[stateObj.attributes.temperature]]" units="[[stateObj.attributes.unit_of_measurement]]" step="[[computeTemperatureStepSize(stateObj)]]" min="[[stateObj.attributes.min_temp]]" max="[[stateObj.attributes.max_temp]]" on-change="targetTemperatureChanged">
            </ha-climate-control>
        </div>
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
    };
  }

  computeTemperatureStepSize(stateObj) {
    /*if (stateObj.attributes.target_temp_step) {
      return stateObj.attributes.target_temp_step;
    } else if (stateObj.attributes.unit_of_measurement.indexOf('F') !== -1) {
      return 1;
    }*/
    return 0.1;
  }

  targetTemperatureChanged(ev) {
    const temperature = ev.target.value;
    if (temperature === this.stateObj.attributes.temperature) return;
    this.callServiceHelper('set_temperature', { temperature: temperature });
  }

  callServiceHelper(service, data) {
    // We call stateChanged after a successful call to re-sync the inputs
    // with the state. It will be out of sync if our service call did not
    // result in the entity to be turned on. Since the state is not changing,
    // the resync is not called automatic.
    /* eslint-disable no-param-reassign */
    data.entity_id = this.stateObj.entity_id;
    /* eslint-enable no-param-reassign */
    this.hass.callService('sous_vide', service, data)
  }

  _localizeOperationMode(localize, mode) {
    return localize(`state.climate.${mode}`) || mode;
  }
}

customElements.define('more-info-sous_vide', MoreInfoSousVide);
