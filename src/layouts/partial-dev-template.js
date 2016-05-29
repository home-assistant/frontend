import Polymer from '../polymer';

import './partial-base';

export default new Polymer({
  is: 'partial-dev-template',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    narrow: {
      type: Boolean,
      value: false,
    },

    showMenu: {
      type: Boolean,
      value: false,
    },

    error: {
      type: Boolean,
      value: false,
    },

    rendering: {
      type: Boolean,
      value: false,
    },

    template: {
      type: String,
      /* eslint-disable max-len */
      value: '{%- if is_state("device_tracker.paulus", "home") and \n' +
             '       is_state("device_tracker.anne_therese", "home") -%}\n' +
             '\n' +
             '  You are both home, you silly\n' +
             '\n' +
             '{%- else -%}\n' +
             '\n' +
             '  Anne Therese is at {{ states("device_tracker.anne_therese") }} and ' +
             'Paulus is at {{ states("device_tracker.paulus") }}\n' +
             '\n' +
             '{%- endif %}\n' +
             '\n' +
             'For loop example:\n' +
             '\n' +
             '{% for state in states.sensor -%}\n' +
             '  {%- if loop.first %}The {% elif loop.last %} and the {% else %}, the {% endif -%}\n' +
             '  {{ state.name | lower }} is {{state.state}} {{- state.attributes.unit_of_measurement}}\n' +
             '{%- endfor -%}.',
      /* eslint-enable max-len */
      observer: 'templateChanged',
    },

    processed: {
      type: String,
      value: '',
    },
  },

  computeFormClasses(narrow) {
    return `content fit ${narrow ? '' : 'layout horizontal'}`;
  },

  computeRenderedClasses(error) {
    return error ? 'error rendered' : 'rendered';
  },

  templateChanged() {
    if (this.error) {
      this.error = false;
    }
    this.debounce('render-template', this.renderTemplate, 500);
  },

  renderTemplate() {
    this.rendering = true;

    this.hass.templateActions.render(this.template).then(processed => {
      this.processed = processed;
      this.rendering = false;
    }, error => {
      this.processed = error.message;
      this.error = true;
      this.rendering = false;
    });
  },
});
