import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/entity/state-badge.js';

import computeStateName from '../common/entity/compute_state_name.js';

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

    ${this.stateBadgeTemplate}
    <a href$="[[stateObj.state]]" target="_blank" class="name" id="link">[[_computeStateName(stateObj)]]</a>
`;
  }

  static get stateBadgeTemplate() {
    return html`
    <state-badge state-obj="[[stateObj]]"></state-badge>
`;
  }

  static get properties() {
    return {
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
      entityConfig: Object
    };
  }

  ready() {
    super.ready();
    this.addEventListener('click', ev => this.onTap(ev));
  }

  _computeStateName(stateObj) {
    return (this.entityConfig && this.entityConfig.title) || computeStateName(stateObj);
  }

  onTap(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    window.open(this.stateObj.state, '_blank');
  }
}
customElements.define('state-card-weblink', StateCardWeblink);
