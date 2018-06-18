// Allows registering dialogs and makes sure they are appended to the root element.
export default (root) => {
  root.addEventListener('register-dialog', (regEv) => {
    let loaded = null;

    const {
      dialogShowEvent,
      dialogTag,
      dialogImport,
    } = regEv.detail;

    root.addEventListener(dialogShowEvent, (showEv) => {
      if (!loaded) {
        loaded = dialogImport().then(() => {
          const dialogEl = document.createElement(dialogTag);
          root.shadowRoot.appendChild(dialogEl);
          return dialogEl;
        });
      }
      loaded.then(dialogEl => dialogEl.showDialog(showEv.detail));
    });
  });
};
