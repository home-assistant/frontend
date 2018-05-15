import IntlMessageFormatModule from 'intl-messageformat/dist/intl-messageformat.min.js';
import { AppLocalizeBehavior } from '@polymer/app-localize-behavior/app-localize-behavior.js';

import { PaperDialogBehavior } from '@polymer/paper-dialog-behavior/paper-dialog-behavior.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import '@polymer/polymer/lib/mixins/element-mixin.js';

// Make available to app-localize-behavior
window.IntlMessageFormat = IntlMessageFormatModule.IntlMessageFormat;

// Polymer legacy event helpers used courtesy of the Polymer project.
//
// Copyright (c) 2017 The Polymer Authors. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//    * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//    * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

window.hassMixins = window.hassMixins || {};

/* @polymerMixin */
window.hassMixins.EventsMixin = dedupingMixin(superClass => class extends superClass {
  /**
     * Dispatches a custom event with an optional detail value.
     *
     * @param {string} type Name of event type.
     * @param {*=} detail Detail value containing event-specific
     *   payload.
     * @param {{ bubbles: (boolean|undefined),
                 cancelable: (boolean|undefined),
                 composed: (boolean|undefined) }=}
     *  options Object specifying options.  These may include:
     *  `bubbles` (boolean, defaults to `true`),
     *  `cancelable` (boolean, defaults to false), and
     *  `node` on which to fire the event (HTMLElement, defaults to `this`).
     * @return {Event} The new event that was fired.
     */
  fire(type, detail, options) {
    options = options || {};
    detail = (detail === null || detail === undefined) ? {} : detail;
    const event = new Event(type, {
      bubbles: options.bubbles === undefined ? true : options.bubbles,
      cancelable: Boolean(options.cancelable),
      composed: options.composed === undefined ? true : options.composed
    });
    event.detail = detail;
    const node = options.node || this;
    node.dispatchEvent(event);
    return event;
  }
});

/* @polymerMixin */
window.hassMixins.NavigateMixin = dedupingMixin(superClass =>
  class extends window.hassMixins.EventsMixin(superClass) {
    navigate(path, replace = false) {
      if (replace) {
        history.replaceState(null, null, path);
      } else {
        history.pushState(null, null, path);
      }
      this.fire('location-changed');
    }
  });

/**
 * @polymerMixin
 * @appliesMixin AppLocalizeBehavior
 */
window.hassMixins.LocalizeMixin = dedupingMixin(superClass =>
  class extends mixinBehaviors([AppLocalizeBehavior], superClass) {
    static get properties() {
      return {
        hass: Object,
        language: {
          type: String,
          computed: 'computeLanguage(hass)',
        },
        resources: {
          type: Object,
          computed: 'computeResources(hass)',
        },
      };
    }

    computeLanguage(hass) {
      return hass && hass.language;
    }

    computeResources(hass) {
      return hass && hass.resources;
    }
  });

/**
 * @polymerMixin
 * @appliesMixin window.hassMixins.EventsMixin
 * @appliesMixin PaperDialogBehavior
 */
window.hassMixins.DialogMixin = dedupingMixin(superClass =>
  class extends mixinBehaviors([window.hassMixins.EventsMixin,
    PaperDialogBehavior], superClass) {
    static get properties() {
      return {
        withBackdrop: {
          type: Boolean,
          value: true,
        },
      };
    }
  });
