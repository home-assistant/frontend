export default superClass =>
  class extends superClass {
    ready() {
      this.__notifEl = null;
      this.__notifInitLoad = false;
      this.__notifProm = new Promise((resolve) => {
        this.__loadingDone = resolve;
      });
      this.addEventListener('hass-notification', e =>
        this._showNotification(e.detail.message));
      super.ready();
    }

    async _showNotification(message) {
      if (!this.__notifInitLoad) {
        this.__notifInitLoad = true;

        // Load and add notification manager to DOM
        await import(/* webpackChunkName: "notification-manager" */ '../../managers/notification-manager.js');
        const el = document.createElement('notification-manager');
        el.hass = this.hass;
        this.shadowRoot.appendChild(el);
        this.__notifEl = el;

        // Resolve pending calls.
        this.__notifProm = null;
        this.__loadingDone();
      }
      if (this.__notifProm) {
        await this.__notifProm;
      }
      this.__notifEl.showNotification(message);
    }

    hassChanged(hass, oldHass) {
      super.hassChanged(hass, oldHass);
      if (this.__notifEl) {
        this.__notifEl.hass = hass;
      }
    }
  };
