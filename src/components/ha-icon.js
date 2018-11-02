import "@polymer/iron-icon/iron-icon";

const IronIconClass = customElements.get("iron-icon");

let loaded = false;

class HaIcon extends IronIconClass {
  listen(...args) {
    super.listen(...args);

    if (!loaded && this._iconsetName === "mdi") {
      loaded = true;
      import(/* webpackChunkName: "mdi-icons" */ "../resources/mdi-icons.js");
    }
  }
}

customElements.define("ha-icon", HaIcon);
