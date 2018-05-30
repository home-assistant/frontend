import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';

const PaperDialogScrollable = customElements.get('paper-dialog-scrollable');

class HaPaperDialogScrollable extends PaperDialogScrollable {
  static get template() {
    const tpl = document.createElement('template');
    tpl.innerHTML = PaperDialogScrollable.template.innerHTML;
    const styleEl = tpl.content.querySelector('style');
    styleEl.setAttribute('include', 'paper-dialog-scrollable');
    styleEl.innerHTML += `
      .scrollable {
        overflow: visible;
      }
    `;
    return tpl;
  }
}
customElements.define('ha-paper-dialog-scrollable', HaPaperDialogScrollable);
