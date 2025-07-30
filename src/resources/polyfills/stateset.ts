// A small polyfill for CSSStateSet
export class StateSet extends Set<string> {
  private _el: Element;

  private _existing: null | Set<string> = null;

  constructor(el: Element, existing: Set<string> | null = null) {
    super();
    this._el = el;
    this._existing = existing;
  }

  add(state: string) {
    super.add(state);
    const existing = this._existing;
    if (existing) {
      try {
        existing.add(state);
      } catch {
        existing.add(`--${state}`);
      }
    } else {
      this._el.setAttribute(`state-${state}`, "");
    }
    return this;
  }

  delete(state: string) {
    super.delete(state);
    const existing = this._existing;
    if (existing) {
      existing.delete(state);
      existing.delete(`--${state}`);
    } else {
      this._el.removeAttribute(`state-${state}`);
    }
    return true;
  }

  has(state: string) {
    return super.has(state);
  }

  clear() {
    for (const state of this) this.delete(state);
  }
}
const replaceSync = CSSStyleSheet.prototype.replaceSync;
Object.defineProperty(CSSStyleSheet.prototype, "replaceSync", {
  value: function (text) {
    text = text.replace(
      /:state\(([^)]+)\)/g,
      ":where(:state($1), :--$1, [state-$1])"
    );
    replaceSync.call(this, text);
  },
});
