import LocalizeMixin from "../../mixins/localize-mixin";

export default (superClass) =>
  class extends LocalizeMixin(superClass) {
    hassConnected() {
      super.hassConnected();
      // Need to load in advance because when disconnected, can't dynamically load code.
      import(/* webpackChunkName: "ha-toast" */ "../../components/ha-toast");
    }

    hassReconnected() {
      super.hassReconnected();
      this.__discToast.opened = false;
    }

    hassDisconnected() {
      super.hassDisconnected();
      if (!this.__discToast) {
        const el = document.createElement("ha-toast");
        el.duration = 0;
        el.text = this.localize("ui.notification_toast.connection_lost");
        this.__discToast = el;
        this.shadowRoot.appendChild(el);
      }
      this.__discToast.opened = true;
    }
  };
