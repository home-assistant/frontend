import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-toggle-button/paper-toggle-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/buttons/ha-call-api-button";
import "../../../src/components/ha-markdown";
import "../../../src/resources/ha-style";
import EventsMixin from "../../../src/mixins/events-mixin";

import "../components/hassio-card-content";

class HassioAddonInfo extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style">
      :host {
        display: block;
      }
      paper-card {
        display: block;
        margin-bottom: 16px;
      }
      .addon-header {
        @apply --paper-font-headline;
      }
      .light-color {
        color: var(--secondary-text-color);
      }
      .addon-version {
        float: right;
        font-size: 15px;
        vertical-align: middle;
      }
      .description {
        margin-bottom: 16px;
      }
      .logo img {
        max-height: 60px;
        margin: 16px 0;
        display: block;
      }
      .state div{
        width: 150px;
        display: inline-block;
      }
      paper-toggle-button {
        display: inline;
      }
      iron-icon.running {
        color: var(--paper-green-400);
      }
      iron-icon.stopped {
        color: var(--google-red-300);
      }
      ha-call-api-button {
        font-weight: 500;
        color: var(--primary-color);
      }
      .right {
        float: right;
      }
      ha-markdown img {
        max-width: 100%;
      }
    </style>
    <template is="dom-if" if="[[computeUpdateAvailable(addon)]]">
      <paper-card heading="Update available! 🎉">
        <div class="card-content">
          <hassio-card-content hass="[[hass]]" title="[[addon.name]] [[addon.last_version]] is available" description="You are currently running version [[addon.version]]" icon="hassio:arrow-up-bold-circle" icon-class="update"></hassio-card-content>
        </div>
        <div class="card-actions">
          <ha-call-api-button hass="[[hass]]" path="hassio/addons/[[addonSlug]]/update">Update</ha-call-api-button>
          <template is="dom-if" if="[[addon.changelog]]">
            <paper-button on-click="openChangelog">Changelog</paper-button>
          </template>
        </div>
      </paper-card>
    </template>

    <paper-card>
      <div class="card-content">
        <div class="addon-header">[[addon.name]]
          <div class="addon-version light-color">
            <template is="dom-if" if="[[addon.version]]">
              [[addon.version]]
              <template is="dom-if" if="[[isRunning]]">
                <iron-icon title="Add-on is running" class="running" icon="hassio:circle"></iron-icon>
              </template>
              <template is="dom-if" if="[[!isRunning]]">
                <iron-icon title="Add-on is stopped" class="stopped" icon="hassio:circle"></iron-icon>
              </template>
            </template>
            <template is="dom-if" if="[[!addon.version]]">
              [[addon.last_version]]
            </template>
          </div>
        </div>
        <div class="description light-color">
          [[addon.description]].<br>
          Visit <a href="[[addon.url]]" target="_blank">[[addon.name]] page</a> for details.
        </div>
        <template is="dom-if" if="[[addon.logo]]">
          <a href="[[addon.url]]" target="_blank" class="logo">
            <img src="/api/hassio/addons/[[addonSlug]]/logo">
          </a>
        </template>
        <template is="dom-if" if="[[addon.version]]">
          <div class="state">
            <div>Start on boot</div>
            <paper-toggle-button on-change="startOnBootToggled" checked="[[computeStartOnBoot(addon.boot)]]"></paper-toggle-button>
          </div>
          <div class="state">
            <div>Auto update</div>
            <paper-toggle-button on-change="autoUpdateToggled" checked="[[addon.auto_update]]"></paper-toggle-button>
          </div>
        </template>
      </div>
      <div class="card-actions">
        <template is="dom-if" if="[[addon.version]]">
          <paper-button class="warning" on-click="_unistallClicked">Uninstall</paper-button>
          <template is="dom-if" if="[[addon.build]]">
            <ha-call-api-button class="warning" hass="[[hass]]" path="hassio/addons/[[addonSlug]]/rebuild">Rebuild</ha-call-api-button>
          </template>
          <template is="dom-if" if="[[isRunning]]">
            <ha-call-api-button class="warning" hass="[[hass]]" path="hassio/addons/[[addonSlug]]/restart">Restart</ha-call-api-button>
            <ha-call-api-button class="warning" hass="[[hass]]" path="hassio/addons/[[addonSlug]]/stop">Stop</ha-call-api-button>
          </template>
          <template is="dom-if" if="[[!isRunning]]">
            <ha-call-api-button hass="[[hass]]" path="hassio/addons/[[addonSlug]]/start">Start</ha-call-api-button>
          </template>
          <template is="dom-if" if="[[computeShowWebUI(addon.webui, isRunning)]]">
            <a href="[[pathWebui(addon.webui)]]" tabindex="-1" target="_blank" class="right"><paper-button>Open web UI</paper-button></a>
          </template>
        </template>
        <template is="dom-if" if="[[!addon.version]]">
          <ha-call-api-button hass="[[hass]]" path="hassio/addons/[[addonSlug]]/install">Install</ha-call-api-button>
        </template>
      </div>
    </paper-card>
    <template is="dom-if" if="[[addon.long_description]]">
      <paper-card>
        <div class="card-content">
          <ha-markdown content="[[addon.long_description]]"></ha-markdown>
        </div>
      </paper-card>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      addon: Object,
      addonSlug: String,
      isRunning: {
        type: Boolean,
        computed: "computeIsRunning(addon)",
      },
    };
  }

  computeIsRunning(addon) {
    return addon && addon.state === "started";
  }

  computeUpdateAvailable(addon) {
    return (
      addon &&
      !addon.detached &&
      addon.version &&
      addon.version !== addon.last_version
    );
  }

  pathWebui(webui) {
    return webui && webui.replace("[HOST]", document.location.hostname);
  }

  computeShowWebUI(webui, isRunning) {
    return webui && isRunning;
  }

  computeStartOnBoot(state) {
    return state === "auto";
  }

  startOnBootToggled() {
    const data = { boot: this.addon.boot === "auto" ? "manual" : "auto" };
    this.hass.callApi("POST", `hassio/addons/${this.addonSlug}/options`, data);
  }

  autoUpdateToggled() {
    const data = { auto_update: !this.addon.auto_update };
    this.hass.callApi("POST", `hassio/addons/${this.addonSlug}/options`, data);
  }

  openChangelog() {
    this.hass
      .callApi("get", `hassio/addons/${this.addonSlug}/changelog`)
      .then((resp) => resp, () => "Error getting changelog")
      .then((content) => {
        this.fire("hassio-markdown-dialog", {
          title: "Changelog",
          content: content,
        });
      });
  }

  _unistallClicked() {
    if (!confirm("Are you sure you want to uninstall this add-on?")) {
      return;
    }
    const path = `hassio/addons/${this.addonSlug}/uninstall`;
    const eventData = {
      path: path,
    };
    this.hass
      .callApi("post", path)
      .then(
        (resp) => {
          eventData.success = true;
          eventData.response = resp;
        },
        (resp) => {
          eventData.success = false;
          eventData.response = resp;
        }
      )
      .then(() => {
        this.fire("hass-api-called", eventData);
      });
  }
}
customElements.define("hassio-addon-info", HassioAddonInfo);
