import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import '../components/ha-form.js';

class HaAuthFlow extends PolymerElement {
  static get template() {
    return html`
    <style>
      .action {
        margin: 24px 0 8px;
        text-align: center;
      }
    </style>
    <form>
      <template is="dom-if" if="[[_equals(_state, &quot;loading&quot;)]]">
        Please wait
      </template>
      <template is="dom-if" if="[[_equals(_state, &quot;error&quot;)]]">
        Something went wrong
      </template>
      <template is="dom-if" if="[[_equals(_state, &quot;step&quot;)]]">
        <template is="dom-if" if="[[_equals(_step.type, &quot;abort&quot;)]]">
          Aborted: [[_step.reason]]
        </template>
        <template is="dom-if" if="[[_equals(_step.type, &quot;create_entry&quot;)]]">
          Success!
        </template>
        <template is="dom-if" if="[[_equals(_step.type, &quot;form&quot;)]]">
          <ha-form
            data="{{_stepData}}"
            schema="[[_step.data_schema]]"
            error="[[_step.errors]]"
          ></ha-form>
        </template>
        <div class='action'>
          <paper-button
            raised
            on-click='_handleSubmit'
          >[[_computeSubmitCaption(_step.type)]]</paper-button>
        </div>
      </template>
    </form>
`;
  }

  static get properties() {
    return {
      authProvider: {
        type: Object,
        observer: '_providerChanged',
      },
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
      _step: {
        type: Object,
        notify: true,
      }
    };
  }

  ready() {
    super.ready();

    this.addEventListener('keypress', (ev) => {
      if (ev.keyCode === 13) {
        this._handleSubmit();
      }
    });
  }

  async _providerChanged(newProvider, oldProvider) {
    if (oldProvider && this._step && this._step.type !== 'form') {
      fetch(`/auth/login_flow/${this._step.flow_id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        }).catch(() => {});
    }

    try {
      const response = await fetch('/auth/login_flow', {
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({
          client_id: this.clientId,
          handler: [newProvider.type, newProvider.id],
          redirect_uri: this.redirectUri,
        })
      });

      const step = await response.json();
      this._updateStep(step);
    } catch(err) {
      // eslint-disable-next-line
      console.error('Error starting auth flow', err);
      this._state = 'error';
    };
  }

  _updateStep(step) {
    const props = {
      _step: step,
      _state: 'step',
    };

    if (this._step && step.step_id !== this._step.step_id) {
      props._stepData = {};
    }

    this.setProperties(props);
  }

  _equals(a, b) {
    return a === b;
  }

  _computeSubmitCaption(stepType) {
    return stepType === 'form' ? 'Next' : 'Start over';
  }

  async _handleSubmit() {
    if (this._step.type !== 'form') {
      this._providerChanged(this.authProvider, null);
      return;
    }
    this._state = 'loading';

    const postData = Object.assign({}, this._stepData, {
      client_id: this.clientId,
    });

    try {
      const response = await fetch(`/auth/login_flow/${this._step.flow_id}`, {
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify(postData)
      });

      const newStep = await response.json();

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
      this._updateStep(newStep);
    } catch(err) {
      // eslint-disable-next-line
      console.error('Error submitting step', err);
      this._state = 'error-loading';
    };
  }
}
customElements.define('ha-auth-flow', HaAuthFlow);
