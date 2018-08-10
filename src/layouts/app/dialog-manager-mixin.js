export default superClass =>
  class extends superClass {
    ready() {
      super.ready();
      this.addEventListener("register-dialog", regEv => {
        let loaded = null;

        const { dialogShowEvent, dialogTag, dialogImport } = regEv.detail;

        this.addEventListener(dialogShowEvent, showEv => {
          if (!loaded) {
            loaded = dialogImport().then(() => {
              const dialogEl = document.createElement(dialogTag);
              this.shadowRoot.appendChild(dialogEl);
              return dialogEl;
            });
          }
          loaded.then(dialogEl => dialogEl.showDialog(showEv.detail));
        });
      });
    }
  };
