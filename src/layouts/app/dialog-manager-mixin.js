export default superClass =>
  class extends superClass {
    ready() {
      super.ready();
      this.addEventListener('register-dialog', e => this.registerDialog(e.detail));
    }

    registerDialog({ dialogShowEvent, dialogTag, dialogImport }) {
      let loaded = null;

      this.addEventListener(dialogShowEvent, (showEv) => {
        if (!loaded) {
          loaded = dialogImport().then(() => {
            const dialogEl = document.createElement(dialogTag);
            this.shadowRoot.appendChild(dialogEl);
            this.provideHass(dialogEl);
            return dialogEl;
          });
        }
        loaded.then(dialogEl => dialogEl.showDialog(showEv.detail));
      });
    }
  };
