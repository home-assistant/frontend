export default (superClass) =>
  class extends superClass {
    ready() {
      super.ready();
      this.registerDialog({
        dialogShowEvent: "hass-notification",
        dialogTag: "notification-manager",
        dialogImport: () =>
          import(/* webpackChunkName: "notification-manager" */ "../../managers/notification-manager"),
      });
    }
  };
