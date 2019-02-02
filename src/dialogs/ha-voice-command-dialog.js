import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-dialog-behavior/paper-dialog-shared-styles";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import DialogMixin from "../mixins/dialog-mixin";

/*
 * @appliesMixin DialogMixin
 */
class HaVoiceCommandDialog extends DialogMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="paper-dialog-shared-styles">
        iron-icon {
          margin-right: 8px;
        }

        .content {
          width: 450px;
          min-height: 80px;
          font-size: 18px;
          padding: 16px;
        }

        .messages {
          max-height: 50vh;
          overflow: auto;
        }

        .messages::after {
          content: "";
          clear: both;
          display: block;
        }

        .message {
          clear: both;
          margin: 8px 0;
          padding: 8px;
          border-radius: 15px;
        }

        .message.user {
          margin-left: 24px;
          float: right;
          text-align: right;
          border-bottom-right-radius: 0px;
          background-color: var(--light-primary-color);
          color: var(--primary-text-color);
        }

        .message.hass {
          margin-right: 24px;
          float: left;
          border-bottom-left-radius: 0px;
          background-color: var(--primary-color);
          color: var(--text-primary-color);
        }

        .message.error {
          background-color: var(--google-red-500);
          color: var(--text-primary-color);
        }

        .icon {
          text-align: center;
        }

        .icon paper-icon-button {
          height: 52px;
          width: 52px;
        }

        .interimTranscript {
          color: darkgrey;
        }

        [hidden] {
          display: none;
        }

        :host {
          border-radius: 2px;
        }

        @media all and (max-width: 450px) {
          :host {
            margin: 0;
            width: 100%;
            max-height: calc(100% - 64px);

            position: fixed !important;
            bottom: 0px;
            left: 0px;
            right: 0px;
            overflow: scroll;
            border-bottom-left-radius: 0px;
            border-bottom-right-radius: 0px;
          }

          .content {
            width: auto;
          }

          .messages {
            max-height: 68vh;
          }
        }
      </style>

      <div class="content">
        <div class="messages" id="messages">
          <template is="dom-repeat" items="[[_conversation]]" as="message">
            <div class$="[[_computeMessageClasses(message)]]">
              [[message.text]]
            </div>
          </template>
        </div>
        <template is="dom-if" if="[[results]]">
          <div class="messages">
            <div class="message user">
              <span>{{results.final}}</span>
              <span class="interimTranscript">[[results.interim]]</span> …
            </div>
          </div>
        </template>
        <div class="icon" hidden$="[[results]]">
          <paper-icon-button
            icon="hass:text-to-speech"
            on-click="startListening"
          ></paper-icon-button>
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      results: {
        type: Object,
        value: null,
        observer: "_scrollMessagesBottom",
      },

      _conversation: {
        type: Array,
        value: function() {
          return [{ who: "hass", text: "How can I help?" }];
        },
        observer: "_scrollMessagesBottom",
      },
    };
  }

  static get observers() {
    return ["dialogOpenChanged(opened)"];
  }

  showDialog() {
    this.opened = true;
  }

  initRecognition() {
    /* eslint-disable new-cap */
    this.recognition = new webkitSpeechRecognition();
    /* eslint-enable new-cap */

    this.recognition.onstart = function() {
      this.results = {
        final: "",
        interim: "",
      };
    }.bind(this);
    this.recognition.onerror = function() {
      this.recognition.abort();
      var text = this.results.final || this.results.interim;
      this.results = null;
      if (text === "") {
        text = "<Home Assistant did not hear anything>";
      }
      this.push("_conversation", { who: "user", text: text, error: true });
    }.bind(this);
    this.recognition.onend = function() {
      // Already handled by onerror
      if (this.results == null) {
        return;
      }
      var text = this.results.final || this.results.interim;
      this.results = null;
      this.push("_conversation", { who: "user", text: text });

      this.hass.callApi("post", "conversation/process", { text: text }).then(
        function(response) {
          this.push("_conversation", {
            who: "hass",
            text: response.speech.plain.speech,
          });
        }.bind(this),
        function() {
          this.set(
            ["_conversation", this._conversation.length - 1, "error"],
            true
          );
        }.bind(this)
      );
    }.bind(this);

    this.recognition.onresult = function(event) {
      var oldResults = this.results;
      var finalTranscript = "";
      var interimTranscript = "";

      for (var ind = event.resultIndex; ind < event.results.length; ind++) {
        if (event.results[ind].isFinal) {
          finalTranscript += event.results[ind][0].transcript;
        } else {
          interimTranscript += event.results[ind][0].transcript;
        }
      }

      this.results = {
        interim: interimTranscript,
        final: oldResults.final + finalTranscript,
      };
    }.bind(this);
  }

  startListening() {
    if (!this.recognition) {
      this.initRecognition();
    }

    this.results = {
      interim: "",
      final: "",
    };
    this.recognition.start();
  }

  _scrollMessagesBottom() {
    setTimeout(() => {
      this.$.messages.scrollTop = this.$.messages.scrollHeight;

      if (this.$.messages.scrollTop !== 0) {
        this.$.dialog.fire("iron-resize");
      }
    }, 10);
  }

  dialogOpenChanged(newVal) {
    if (newVal) {
      this.startListening();
    } else if (!newVal && this.results) {
      this.recognition.abort();
    }
  }

  _computeMessageClasses(message) {
    return "message " + message.who + (message.error ? " error" : "");
  }
}

customElements.define("ha-voice-command-dialog", HaVoiceCommandDialog);
