import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-dialog/paper-dialog.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-form.js';
import '../../../components/ha-markdown.js';
import '../../../resources/ha-style.js';

import EventsMixin from '../../../mixins/events-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

class HaConfigFlow extends
  LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="ha-style-dialog">
      .error {
        color: red;
      }
      paper-dialog {
        max-width: 500px;
      }
      ha-markdown img:first-child:last-child {
        display: block;
        margin: 0 auto;
      }
    </style>
    <paper-dialog id="dialog" with-backdrop="" opened="[[step]]" on-opened-changed="_openedChanged">
      <h2>
        <template is="dom-if" if="[[_equals(step.type, &quot;abort&quot;)]]">
          Aborted
        </template>
        <template is="dom-if" if="[[_equals(step.type, &quot;create_entry&quot;)]]">
          Success!
        </template>
        <template is="dom-if" if="[[_equals(step.type, &quot;form&quot;)]]">
          [[_computeStepTitle(localize, step)]]
        </template>
      </h2>
      <paper-dialog-scrollable>
        <template is="dom-if" if="[[!step]]">
          Loading flow.
        </template>
        <template is="dom-if" if="[[step]]">
          <template is="dom-if" if="[[_equals(step.type, &quot;abort&quot;)]]">
            <p>[[_computeStepAbortedReason(localize, step)]]</p>
          </template>

          <template is="dom-if" if="[[_equals(step.type, &quot;create_entry&quot;)]]">
            <p>Created config for [[step.title]]</p>
          </template>

          <template is="dom-if" if="[[_equals(step.type, &quot;form&quot;)]]">
            <template is="dom-if" if="[[_computeStepDescription(localize, step)]]">
              <ha-markdown content="[[_computeStepDescription(localize, step)]]"></ha-markdown>
            </template>

            <ha-form data="{{stepData}}" schema="[[step.data_schema]]" error="[[step.errors]]" compute-label="[[_computeLabelCallback(localize, step)]]" compute-error="[[_computeErrorCallback(localize, step)]]"></ha-form>
          </template>
        </template>
      </paper-dialog-scrollable>
      <div class="buttons">
        <template is="dom-if" if="[[_equals(step.type, &quot;abort&quot;)]]">
          <paper-button on-click="_flowDone">Close</paper-button>
        </template>
        <template is="dom-if" if="[[_equals(step.type, &quot;create_entry&quot;)]]">
          <paper-button on-click="_flowDone">Close</paper-button>
        </template>
        <template is="dom-if" if="[[_equals(step.type, &quot;form&quot;)]]">
          <paper-button on-click="_submitStep">Submit</paper-button>
        </template>
      </div>
    </paper-dialog>
`;
  }

  static get properties() {
    return {
      hass: Object,
      step: {
        type: Object,
        notify: true,
      },
      flowId: {
        type: String,
        observer: '_flowIdChanged'
      },
      /*
       * Store user entered data.
       */
      stepData: Object,
    };
  }

  ready() {
    super.ready();
    this.addEventListener('keypress', (ev) => {
      if (ev.keyCode === 13) {
        this._submitStep();
      }
    });
    // Fix for overlay showing on top of dialog.
    this.$.dialog.addEventListener('iron-overlay-opened', (ev) => {
      if (ev.target.withBackdrop) {
        ev.target.parentNode.insertBefore(ev.target.backdropElement, ev.target);
      }
    });
  }

  _flowIdChanged(flowId) {
    if (!flowId) {
      this.setProperties({
        step: null,
        stepData: {},
      });
      return;

    // Check if parent passed in step data to use.
    } else if (this.step) {
      this._processStep(this.step);
      return;
    }

    this.hass.callApi('get', `config/config_entries/flow/${flowId}`)
      .then((step) => {
        this._processStep(step);
        // When the flow changes, center the dialog.
        // Don't do it on each step or else the dialog keeps bouncing.
        setTimeout(() => this.$.dialog.center(), 0);
      });
  }

  _submitStep() {
    this.hass.callApi('post', `config/config_entries/flow/${this.flowId}`, this.stepData)
      .then(step => this._processStep(step));
  }

  _processStep(step) {
    if (!step.errors) step.errors = {};
    this.step = step;
    // We got a new form if there are no errors.
    if (Object.keys(step.errors).length === 0) {
      this.stepData = {};
    }
  }

  _flowDone() {
    this.fire('flow-closed', {
      flowFinished: true
    });
  }

  _equals(a, b) {
    return a === b;
  }

  _openedChanged(ev) {
    // Closed dialog by clicking on the overlay
    if (this.step && !ev.detail.value) {
      this.fire('flow-closed', {
        flowFinished: ['success', 'abort'].includes(this.step.type)
      });
    }
  }

  _computeStepAbortedReason(localize, step) {
    return localize(`component.${step.handler}.config.abort.${step.reason}`);
  }

  _computeStepTitle(localize, step) {
    return localize(`component.${step.handler}.config.step.${step.step_id}.title`);
  }

  _computeStepDescription(localize, step) {
    return localize(`component.${step.handler}.config.step.${step.step_id}.description`);
  }

  _computeLabelCallback(localize, step) {
    // Returns a callback for ha-form to calculate labels per schema object
    return schema => localize(`component.${step.handler}.config.step.${step.step_id}.data.${schema.name}`);
  }

  _computeErrorCallback(localize, step) {
    // Returns a callback for ha-form to calculate error messages
    return error => localize(`component.${step.handler}.config.error.${error}`);
  }
}

customElements.define('ha-config-flow', HaConfigFlow);
