import "@polymer/iron-icon/iron-icon";
import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-tooltip/paper-tooltip";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/ha-label-badge";
import "../../../src/components/ha-markdown";
import "../../../src/components/buttons/ha-call-api-button";
import "../../../src/components/ha-switch";
import "../../../src/resources/ha-style";
import "../components/hassio-card-content";

import { EventsMixin } from "../../../src/mixins/events-mixin";
import { navigate } from "../../../src/common/navigate";
import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";

const PERMIS_DESC = {
  rating: {
    title: "Add-on Security Rating",
    description:
      "Hass.io provides a security rating to each of the add-ons, which indicates the risks involved when using this add-on. The more access an add-on requires on your system, the lower the score, thus raising the possible security risks.\n\nA score is on a scale from 1 to 6. Where 1 is the lowest score (considered the most insecure and highest risk) and a score of 6 is the highest score (considered the most secure and lowest risk).",
  },
  host_network: {
    title: "Host Network",
    description:
      "Add-ons usually run in their own isolated network layer, which prevents them from accessing the network of the host operating system. In some cases, this network isolation can limit add-ons in providing their services and therefore, the isolation can be lifted by the add-on author, giving the add-on full access to the network capabilities of the host machine. This gives the add-on more networking capabilities but lowers the security, hence, the security rating of the add-on will be lowered when this option is used by the add-on.",
  },
  homeassistant_api: {
    title: "Home Assistant API Access",
    description:
      "This add-on is allowed to access your running Home Assistant instance directly via the Home Assistant API. This mode handles authentication for the add-on as well, which enables an add-on to interact with Home Assistant without the need for additional authentication tokens.",
  },
  full_access: {
    title: "Full Hardware Access",
    description:
      "This add-on is given full access to the hardware of your system, by request of the add-on author. Access is comparable to the privileged mode in Docker. Since this opens up possible security risks, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
  },
  hassio_api: {
    title: "Hass.io API Access",
    description:
      "The add-on was given access to the Hass.io API, by request of the add-on author. By default, the add-on can access general version information of your system. When the add-on requests 'manager' or 'admin' level access to the API, it will gain access to control multiple parts of your Hass.io system. This permission is indicated by this badge and will impact the security score of the addon negatively.",
  },
  docker_api: {
    title: "Full Docker Access",
    description:
      "The add-on author has requested the add-on to have management access to the Docker instance running on your system. This mode gives the add-on full access and control to your entire Hass.io system, which adds security risks, and could damage your system when misused. Therefore, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
  },
  host_pid: {
    title: "Host Processes Namespace",
    description:
      "Usually, the processes the add-on runs, are isolated from all other system processes. The add-on author has requested the add-on to have access to the system processes running on the host system instance, and allow the add-on to spawn processes on the host system as well. This mode gives the add-on full access and control to your entire Hass.io system, which adds security risks, and could damage your system when misused. Therefore, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
  },
  apparmor: {
    title: "AppArmor",
    description:
      "AppArmor ('Application Armor') is a Linux kernel security module that restricts add-ons capabilities like network access, raw socket access, and permission to read, write, or execute specific files.\n\nAdd-on authors can provide their security profiles, optimized for the add-on, or request it to be disabled. If AppArmor is disabled, it will raise security risks and therefore, has a negative impact on the security score of the add-on.",
  },
  auth_api: {
    title: "Home Assistant Authentication",
    description:
      "An add-on can authenticate users against Home Assistant, allowing add-ons to give users the possibility to log into applications running inside add-ons, using their Home Assistant username/password. This badge indicates if the add-on author requests this capability.",
  },
  ingress: {
    title: "Ingress",
    description:
      "This add-on is using Ingress to embed its interface securely into Home Assistant.",
  },
};

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
        paper-card.warning {
          background-color: var(--google-red-500);
          color: white;
          --paper-card-header-color: white;
        }
        paper-card.warning mwc-button {
          color: white !important;
        }
        .warning {
          color: var(--google-red-500);
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
        .state {
          display: flex;
          margin: 8px 0;
        }
        .state div {
          width: 180px;
          display: inline-block;
        }
        .state iron-icon {
          width: 16px;
          color: var(--secondary-text-color);
        }
        ha-switch {
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
        .red {
          --ha-label-badge-color: var(--label-badge-red, #df4c1e);
        }
        .blue {
          --ha-label-badge-color: var(--label-badge-blue, #039be5);
        }
        .green {
          --ha-label-badge-color: var(--label-badge-green, #0da035);
        }
        .yellow {
          --ha-label-badge-color: var(--label-badge-yellow, #f4b400);
        }
        .security {
          margin-bottom: 16px;
        }
        .security h3 {
          margin-bottom: 8px;
          font-weight: normal;
        }
        .security ha-label-badge {
          cursor: pointer;
          margin-right: 4px;
          --iron-icon-height: 45px;
        }
        .protection-enable mwc-button {
          --mdc-theme-primary: white;
        }
        .description a, ha-markdown a {
          color: var(--primary-color);
        }
      </style>

      <template is="dom-if" if="[[computeUpdateAvailable(addon)]]">
        <paper-card heading="Update available! 🎉">
          <div class="card-content">
            <hassio-card-content
              hass="[[hass]]"
              title="[[addon.name]] [[addon.last_version]] is available"
              description="You are currently running version [[addon.version]]"
              icon="hassio:arrow-up-bold-circle"
              icon-class="update"
            ></hassio-card-content>
            <template is="dom-if" if="[[!addon.available]]">
              <p>This update is no longer compatible with your system.</p>
            </template>
          </div>
          <div class="card-actions">
            <ha-call-api-button
              hass="[[hass]]"
              path="hassio/addons/[[addonSlug]]/update"
              disabled="[[!addon.available]]"
              >
              Update
              </ha-call-api-button
            >
            <template is="dom-if" if="[[addon.changelog]]">
              <mwc-button on-click="openChangelog">Changelog</mwc-button>
            </template>
          </div>
        </paper-card>
      </template>

      <template is="dom-if" if="[[!addon.protected]]">
        <paper-card heading="Warning: Protection mode is disabled!" class="warning">
          <div class="card-content">
            Protection mode on this add-on is disabled! This gives the add-on full access to the entire system, which adds security risks, and could damage your system when used incorrectly. Only disable the protection mode if you know, need AND trust the source of this add-on.
          </div>
          <div class="card-actions protection-enable">
              <mwc-button on-click="protectionToggled">Enable Protection mode</mwc-button>
            </div>
          </div>
        </paper-card>
      </template>

      <paper-card>
        <div class="card-content">
          <div class="addon-header">
            [[addon.name]]
            <div class="addon-version light-color">
              <template is="dom-if" if="[[addon.version]]">
                [[addon.version]]
                <template is="dom-if" if="[[isRunning]]">
                  <iron-icon
                    title="Add-on is running"
                    class="running"
                    icon="hassio:circle"
                  ></iron-icon>
                </template>
                <template is="dom-if" if="[[!isRunning]]">
                  <iron-icon
                    title="Add-on is stopped"
                    class="stopped"
                    icon="hassio:circle"
                  ></iron-icon>
                </template>
              </template>
              <template is="dom-if" if="[[!addon.version]]">
                [[addon.last_version]]
              </template>
            </div>
          </div>
          <div class="description light-color">
            [[addon.description]].<br />
            Visit
            <a href="[[addon.url]]" target="_blank">[[addon.name]] page</a> for
            details.
          </div>
          <template is="dom-if" if="[[addon.logo]]">
            <a href="[[addon.url]]" target="_blank" class="logo">
              <img src="/api/hassio/addons/[[addonSlug]]/logo" />
            </a>
          </template>
          <div class="security">
              <ha-label-badge
                class$="[[computeSecurityClassName(addon.rating)]]"
                on-click="showMoreInfo"
                id="rating"
                value="[[addon.rating]]"
                label="rating"
                description=""
              ></ha-label-badge>
              <template is="dom-if" if="[[addon.host_network]]">
                <ha-label-badge
                on-click="showMoreInfo"
                id="host_network"
                icon="hassio:network"
                label="host"
                description=""
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[addon.full_access]]">
                <ha-label-badge
                on-click="showMoreInfo"
                id="full_access"
                icon="hassio:chip"
                label="hardware"
                description=""
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[addon.homeassistant_api]]">
                <ha-label-badge
                  on-click="showMoreInfo"
                  id="homeassistant_api"
                  icon="hassio:home-assistant"
                  label="hass"
                  description=""
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[computeHassioApi(addon)]]">
                <ha-label-badge
                  on-click="showMoreInfo"
                  id="hassio_api"
                  icon="hassio:home-assistant"
                  label="hassio"
                  description="[[addon.hassio_role]]"
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[addon.docker_api]]">
                <ha-label-badge
                  on-click="showMoreInfo"
                  id="docker_api"
                  icon="hassio:docker"
                  label="docker"
                  description=""
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[addon.host_pid]]">
                <ha-label-badge
                  on-click="showMoreInfo"
                  id="host_pid"
                  icon="hassio:pound"
                  label="host pid"
                  description=""
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[addon.apparmor]]">
                <ha-label-badge
                  on-click="showMoreInfo"
                  class$="[[computeApparmorClassName(addon.apparmor)]]"
                  id="apparmor"
                  icon="hassio:shield"
                  label="apparmor"
                  description=""
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[addon.auth_api]]">
                <ha-label-badge
                  on-click="showMoreInfo"
                  id="auth_api"
                  icon="hassio:key"
                  label="auth"
                  description=""
                ></ha-label-badge>
              </template>
              <template is="dom-if" if="[[addon.ingress]]">
                <ha-label-badge
                  on-click="showMoreInfo"
                  id="ingress"
                  icon="hassio:cursor-default-click-outline"
                  label="ingress"
                  description=""
                ></ha-label-badge>
              </template>
          </div>
          <template is="dom-if" if="[[addon.version]]">
            <div class="state">
              <div>Start on boot</div>
              <ha-switch
                on-change="startOnBootToggled"
                checked="[[computeStartOnBoot(addon.boot)]]"
              ></ha-switch>
            </div>
            <div class="state">
              <div>Auto update</div>
              <ha-switch
                on-change="autoUpdateToggled"
                checked="[[addon.auto_update]]"
              ></ha-switch>
            </div>
            <template is="dom-if" if="[[addon.ingress]]">
              <div class="state">
                <div>Show in sidebar</div>
                <ha-switch
                  on-change="panelToggled"
                  checked="[[addon.ingress_panel]]"
                  disabled="[[_computeCannotIngressSidebar(hass, addon)]]"
                ></ha-switch>
                <template is="dom-if" if="[[_computeCannotIngressSidebar(hass, addon)]]">
                  <span>This option requires Home Assistant 0.92 or later.</span>
                </template>
              </div>
            </template>
            <template is="dom-if" if="[[_computeUsesProtectedOptions(addon)]]">
              <div class="state">
                <div>
                  Protection mode
                  <span>
                    <iron-icon icon="hassio:information"></iron-icon>
                    <paper-tooltip>Grant the add-on elevated system access.</paper-tooltip>
                  </span>
                </div>
                <ha-switch
                  on-change="protectionToggled"
                  checked="[[addon.protected]]"
                ></ha-switch>
              </div>
            </template>
          </template>
        </div>
        <div class="card-actions">
          <template is="dom-if" if="[[addon.version]]">
            <mwc-button class="warning" on-click="_unistallClicked"
              >Uninstall</mwc-button
            >
            <template is="dom-if" if="[[addon.build]]">
              <ha-call-api-button
                class="warning"
                hass="[[hass]]"
                path="hassio/addons/[[addonSlug]]/rebuild"
                >Rebuild</ha-call-api-button
              >
            </template>
            <template is="dom-if" if="[[isRunning]]">
              <ha-call-api-button
                class="warning"
                hass="[[hass]]"
                path="hassio/addons/[[addonSlug]]/restart"
                >Restart</ha-call-api-button
              >
              <ha-call-api-button
                class="warning"
                hass="[[hass]]"
                path="hassio/addons/[[addonSlug]]/stop"
                >Stop</ha-call-api-button
              >
            </template>
            <template is="dom-if" if="[[!isRunning]]">
              <ha-call-api-button
                hass="[[hass]]"
                path="hassio/addons/[[addonSlug]]/start"
                >Start</ha-call-api-button
              >
            </template>
            <template
              is="dom-if"
              if="[[computeShowWebUI(addon.ingress, addon.webui, isRunning)]]"
            >
              <a
                href="[[pathWebui(addon.webui)]]"
                tabindex="-1"
                target="_blank"
                class="right"
                ><mwc-button>Open web UI</mwc-button></a
              >
            </template>
            <template
              is="dom-if"
              if="[[computeShowIngressUI(addon.ingress, isRunning)]]"
            >
              <mwc-button
                tabindex="-1"
                class="right"
                on-click="openIngress"
              >Open web UI</mwc-button>
            </template>
          </template>
          <template is="dom-if" if="[[!addon.version]]">
            <template is="dom-if" if="[[!addon.available]]">
              <p class="warning">This add-on is not available on your system.</p>
            </template>
            <ha-call-api-button
              disabled="[[!addon.available]]"
              hass="[[hass]]"
              path="hassio/addons/[[addonSlug]]/install"
              >Install</ha-call-api-button
            >
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
      isRunning: { type: Boolean, computed: "computeIsRunning(addon)" },
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

  computeHassioApi(addon) {
    return (
      addon.hassio_api &&
      (addon.hassio_role === "manager" || addon.hassio_role === "admin")
    );
  }

  computeApparmorClassName(apparmor) {
    if (apparmor === "profile") {
      return "green";
    }
    if (apparmor === "disable") {
      return "red";
    }
    return "";
  }

  pathWebui(webui) {
    return webui && webui.replace("[HOST]", document.location.hostname);
  }

  computeShowWebUI(ingress, webui, isRunning) {
    return !ingress && webui && isRunning;
  }

  openIngress() {
    navigate(this, `/hassio/ingress/${this.addon.slug}`);
  }

  computeShowIngressUI(ingress, isRunning) {
    return ingress && isRunning;
  }

  computeStartOnBoot(state) {
    return state === "auto";
  }

  computeSecurityClassName(rating) {
    if (rating > 4) {
      return "green";
    }
    if (rating > 2) {
      return "yellow";
    }
    return "red";
  }

  startOnBootToggled() {
    const data = { boot: this.addon.boot === "auto" ? "manual" : "auto" };
    this.hass.callApi("POST", `hassio/addons/${this.addonSlug}/options`, data);
  }

  autoUpdateToggled() {
    const data = { auto_update: !this.addon.auto_update };
    this.hass.callApi("POST", `hassio/addons/${this.addonSlug}/options`, data);
  }

  protectionToggled() {
    const data = { protected: !this.addon.protected };
    this.hass.callApi("POST", `hassio/addons/${this.addonSlug}/security`, data);
    this.set("addon.protected", !this.addon.protected);
  }

  panelToggled() {
    const data = { ingress_panel: !this.addon.ingress_panel };
    this.hass.callApi("POST", `hassio/addons/${this.addonSlug}/options`, data);
  }

  showMoreInfo(e) {
    const id = e.target.getAttribute("id");
    showHassioMarkdownDialog(this, {
      title: PERMIS_DESC[id].title,
      content: PERMIS_DESC[id].description,
    });
  }

  openChangelog() {
    this.hass
      .callApi("get", `hassio/addons/${this.addonSlug}/changelog`)
      .then(
        (resp) => resp,
        () => "Error getting changelog"
      )
      .then((content) => {
        showHassioMarkdownDialog(this, {
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

  _computeCannotIngressSidebar(hass, addon) {
    return !addon.ingress || !this._computeHA92plus(hass);
  }

  _computeUsesProtectedOptions(addon) {
    return addon.docker_api || addon.full_access || addon.host_pid;
  }

  _computeHA92plus(hass) {
    const [major, minor] = hass.config.version.split(".", 2);
    return Number(major) > 0 || (major === "0" && Number(minor) >= 92);
  }
}
customElements.define("hassio-addon-info", HassioAddonInfo);
