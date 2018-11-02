import { PolymerElement } from "@polymer/polymer/polymer-element";

class HassioData extends PolymerElement {
  static get properties() {
    return {
      hass: Object,

      supervisor: {
        type: Object,
        notify: true,
      },

      host: {
        type: Object,
        notify: true,
      },

      homeassistant: {
        type: Object,
        notify: true,
      },
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.refresh();
  }

  refresh() {
    return Promise.all([
      this.fetchSupervisorInfo(),
      this.fetchHostInfo(),
      this.fetchHassInfo(),
    ]);
  }

  fetchSupervisorInfo() {
    return this.hass.callApi("get", "hassio/supervisor/info").then((info) => {
      this.supervisor = info.data;
    });
  }

  fetchHostInfo() {
    return this.hass.callApi("get", "hassio/host/info").then((info) => {
      this.host = info.data;
    });
  }

  fetchHassInfo() {
    return this.hass
      .callApi("get", "hassio/homeassistant/info")
      .then((info) => {
        this.homeassistant = info.data;
      });
  }
}

customElements.define("hassio-data", HassioData);
