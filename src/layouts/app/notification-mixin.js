export default (superClass) =>
  class extends superClass {
    firstUpdated(changedProps) {
      super.firstUpdated(changedProps);
      this.registerDialog({
        dialogShowEvent: "hass-notification",
        dialogTag: "notification-manager",
        dialogImport: () =>
          import(/* webpackChunkName: "notification-manager" */ "../../managers/notification-manager"),
      });
    }
  };
