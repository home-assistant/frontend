import "@polymer/iron-iconset-svg/iron-iconset-svg";

const IronIconsetClass = customElements.get("iron-iconset-svg");

class HaIconset extends IronIconsetClass {
  /**
   * Fire 'iron-iconset-added' event at next microtask.
   */
  _fireIronIconsetAdded() {
    this.async(() => this.fire("iron-iconset-added", this, { node: window }));
  }

  /**
   *
   * When name is changed, register iconset metadata
   *
   */
  _nameChanged() {
    this._meta.value = null;
    this._meta.key = this.name;
    this._meta.value = this;
    if (this.ownerDocument && this.ownerDocument.readyState === "loading") {
      // Document still loading. It could be that not all icons in the iconset are parsed yet.
      this.ownerDocument.addEventListener("DOMContentLoaded", () => {
        this._fireIronIconsetAdded();
      });
    } else {
      this._fireIronIconsetAdded();
    }
  }
}

customElements.define("ha-iconset-svg", HaIconset);
