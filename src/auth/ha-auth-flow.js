import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '../components/ha-form.js';
import EventsMixin from '../mixins/events-mixin.js';

/*
 * @appliesMixin EventsMixin
 */
class HaAuthFlow extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <template is="dom-if" if="[[_equals(_state, &quot;loading&quot;)]]">
      Please wait
    </template>
    <template is="dom-if" if="[[_equals(_state, &quot;error&quot;)]]">
      Something went wrong
    </template>
    <template is="dom-if" if="[[_equals(_state, &quot;step&quot;)]]">
      <template is="dom-if" if="[[_equals(_step.type, &quot;abort&quot;)]]">
        Aborted
      </template>
      <template is="dom-if" if="[[_equals(_step.type, &quot;create_entry&quot;)]]">
        Success!
      </template>
      <template is="dom-if" if="[[_equals(_step.type, &quot;form&quot;)]]">
        <ha-form data="{{_stepData}}" schema="[[_step.data_schema]]" error="[[_step.errors]]"></ha-form>
      </template>
      <paper-button on-click="_handleSubmit">[[_computeSubmitCaption(_step.type)]]</paper-button>
    </template>
`;
  }

  static get properties() {
    return {
      authProvider: Object,
      clientId: String,
      redirectUri: String,
      oauth2State: String,
      _state: {
        type: String,
        value: 'loading'
      },
      _stepData: {
        type: Object,
        value: () => ({}),
      },
      _step: Object,
    };
  }
  connectedCallback() {
    super.connectedCallback();

    fetch('/auth/login_flow', {
      method: 'POST',
      body: JSON.stringify({
        client_id: this.clientId,
        handler: [this.authProvider.type, this.authProvider.id],
        redirect_uri: this.redirectUri,
      })
    }).then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then(step => this.setProperties({
      _step: step,
      _state: 'step',
    })).catch((err) => {
      // eslint-disable-next-line
      console.error('Error starting auth flow', err);
      this._state = 'error';
    });
  }

  _equals(a, b) {
    return a === b;
  }

  _computeSubmitCaption(stepType) {
    return stepType === 'form' ? 'Submit' : 'Start over';
  }

  _handleSubmit() {
    if (this._step.type !== 'form') {
      this.fire('reset');
      return;
    }
    this._state = 'loading';

    const postData = Object.assign({}, this._stepData, {
      client_id: this.clientId,
    });

    fetch(`/auth/login_flow/${this._step.flow_id}`, {
      method: 'POST',
      body: JSON.stringify(postData)
    }).then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then((newStep) => {
      if (newStep.type === 'create_entry') {
        // OAuth 2: 3.1.2 we need to retain query component of a redirect URI
        let url = this.redirectUri;
        if (!url.includes('?')) {
          url += '?';
        } else if (!url.endsWith('&')) {
          url += '&';
        }

        url += `code=${encodeURIComponent(newStep.result)}`;

        if (this.oauth2State) {
          url += `&state=${encodeURIComponent(this.oauth2State)}`;
        }

        document.location = url;
        return;
      }

      const props = {
        _step: newStep,
        _state: 'step',
      };
      if (newStep.step_id !== this._step.step_id) {
        props._stepData = {};
      }
      this.setProperties(props);
    }).catch((err) => {
      // eslint-disable-next-line
      console.error('Error loading auth providers', err);
      this._state = 'error-loading';
    });
  }
}
customElements.define('ha-auth-flow', HaAuthFlow);
