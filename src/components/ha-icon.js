import '@polymer/iron-icon/iron-icon.js';

const IronIconClass = customElements.get('iron-icon');

let loaded = false;

class HaIcon extends IronIconClass {
  listen(...args) {
    super.listen(...args);

    if (!loaded && this._iconsetName === 'mdi') {
      loaded = true;
      import('../resources/mdi-icons.js');
    }
  }
}

customElements.define('ha-icon', HaIcon);
