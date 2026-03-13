/**
 * ES5-compatible implementation of the keyed directive.
 * Based on lit-html's keyed directive but written to avoid ES5 minification issues.
 *
 * This implementation avoids parameter destructuring in the update() method,
 * which causes Terser with ecma: 5 to generate invalid references like `_k`.
 *
 * Used only for ES5 builds (legacy browsers). Modern builds use the original
 * lit-html keyed directive.
 *
 * @see https://github.com/home-assistant/frontend/issues/28732
 */
// eslint-disable-next-line import/extensions
import { directive, Directive } from "lit-html/directive.js";
// eslint-disable-next-line import/extensions
import { setCommittedValue } from "lit-html/directive-helpers.js";
// eslint-disable-next-line lit/no-legacy-imports
import { nothing } from "lit-html";
// eslint-disable-next-line import/extensions
import type { Part } from "lit-html/directive.js";

class KeyedES5 extends Directive {
  private _key: unknown = nothing;

  render(k: unknown, v: unknown) {
    this._key = k;
    return v;
  }

  update(part: unknown, args: [unknown, unknown]) {
    const k = args[0];
    const v = args[1];
    if (k !== this._key) {
      // Clear the part before returning a value. The one-arg form of
      // setCommittedValue sets the value to a sentinel which forces a
      // commit the next render.
      setCommittedValue(part as Part);
      this._key = k;
    }
    return v;
  }
}

/**
 * Associates a renderable value with a unique key. When the key changes, the
 * previous DOM is removed and disposed before rendering the next value, even
 * if the value - such as a template - is the same.
 *
 * This is useful for forcing re-renders of stateful components, or working
 * with code that expects new data to generate new HTML elements, such as some
 * animation techniques.
 */
export const keyed = directive(KeyedES5);
