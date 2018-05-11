import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '../components/entity/state-badge.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class StateCardWeblink extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        display: block;
      }
      .name {
        @apply --paper-font-common-nowrap;
        @apply --paper-font-body1;
        color: var(--primary-color);

        text-transform: capitalize;
        line-height: 40px;
        margin-left: 16px;
      }
    </style>

    <state-badge state-obj="[[stateObj]]"></state-badge>
    <a href\$="[[stateObj.state]]" target="_blank" class="name" id="link">[[computeStateName(stateObj)]]</a>
`;
  }

  static get is() { return 'state-card-weblink'; }

  static get properties() {
    return {
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
    };
  }

  ready() {
    super.ready();
    this.addEventListener('click', ev => this.onTap(ev));
  }

  computeStateName(stateObj) {
    return window.hassUtil.computeStateName(stateObj);
  }

  onTap(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    window.open(this.stateObj.state, '_blank');
  }
}
customElements.define(StateCardWeblink.is, StateCardWeblink);
