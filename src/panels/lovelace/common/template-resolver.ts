import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import hash from "object-hash";
import { hasTemplate } from "../../../common/string/has-template";
import { isCustomType } from "../../../data/lovelace_custom_cards";
import type { RenderTemplateResult } from "../../../data/ws-templates";
import { subscribeRenderTemplate } from "../../../data/ws-templates";
import type { HomeAssistant } from "../../../types";
import { CacheManager } from "../../../util/cache-manager";
import type { CollectedTemplate } from "./resolve-config-templates";
import {
  applyConfigTemplates,
  collectConfigTemplates,
  pathKey,
} from "./resolve-config-templates";

export type TemplatableConfig = Record<string, any> & { type?: string };

// Remembers the last rendered value for a (config, template) pair so switching
// views or reconnecting shows the resolved value instantly instead of a flash
// of raw `{{ ... }}`.
const valueCache = new CacheManager<unknown>(5 * 60 * 1000);

// Safety net: if a template has produced no result within this delay (e.g. it
// errors in live mode and the backend never emits a value), build the card
// anyway with best-effort values so it never hangs waiting.
const BUILD_TIMEOUT = 2500;

interface TemplateSubscription {
  unsub?: Promise<UnsubscribeFunc>;
  generation: number;
}

/**
 * Reactive controller that transparently resolves Jinja templates found in the
 * config of a Lovelace wrapper element (`hui-card`, `hui-badge`,
 * `hui-heading-badge`, ...).
 *
 * The host feeds it `(config, hass, preview)` and reads back `resolvedConfig`
 * (the config with rendered values substituted) and `ready` (whether every
 * template has a value yet). The host owns building/updating the inner element;
 * this controller only owns the template lifecycle:
 *
 *  - subscribes once per *unique* template source (dedupe),
 *  - guards against stale async results (generation counter, mirroring the
 *    home-assistant/core dev-tool fix),
 *  - caches rendered values to avoid a flash on rebuild / reconnect,
 *  - never touches the raw config, so the editor can never lose a template.
 *
 * When there are no templates in the config it is a zero-cost pass-through:
 * `resolvedConfig === config`, `ready === true`, and no subscriptions are made.
 */
export class TemplateResolver implements ReactiveController {
  private _onChange: () => void;

  private _hass?: HomeAssistant;

  private _config?: TemplatableConfig;

  private _configHash?: string;

  private _preview = false;

  private _connected = false;

  // unique template source -> active subscription
  private _subscriptions = new Map<string, TemplateSubscription>();

  // unique template source -> latest rendered value
  private _values = new Map<string, unknown>();

  // collected (path, template) pairs for the current config
  private _templates: CollectedTemplate[] = [];

  private _generation = 0;

  private _timeout?: number;

  /** The config with every resolved template substituted. */
  public resolvedConfig?: TemplatableConfig;

  /** True when there is nothing to resolve, or every template has a value. */
  public ready = true;

  /**
   * True when the last change came from a rendered template value (a backend
   * tick) rather than a raw config edit. Lets the host avoid a full element
   * rebuild in the editor preview when only a resolved value changed.
   */
  public updatedFromValues = false;

  constructor(host: ReactiveControllerHost, onChange: () => void) {
    host.addController(this);
    this._onChange = onChange;
  }

  public hostConnected(): void {
    this._connected = true;
    this._subscribeAll();
  }

  public hostDisconnected(): void {
    this._connected = false;
    this._unsubscribeAll();
  }

  /** Feed the current inputs. Call from the host's `willUpdate`/`update`. */
  public setInput(
    config: TemplatableConfig | undefined,
    hass: HomeAssistant | undefined,
    preview: boolean
  ): void {
    this._hass = hass;
    const previewChanged = preview !== this._preview;
    this._preview = preview;

    let dirty = false;
    // `preview` flips `report_errors`, so a change means we must resubscribe.
    if (config !== this._config || previewChanged) {
      this._config = config;
      this._recollect();
      dirty = true;
    }
    if (this._connected) {
      this._subscribeAll();
    }
    // A pure `hass` change (a state tick) must NOT recompute — the backend
    // pushes new renders on its own; recomputing here would call `setConfig`
    // on every state change and defeat the whole performance story.
    if (dirty) {
      this._recompute();
    }
  }

  private _uniqueSources(): Set<string> {
    return new Set(this._templates.map((t) => t.template));
  }

  private _cacheKey(source: string): string {
    return `${this._configHash}:${source}`;
  }

  private _recollect(): void {
    this._unsubscribeAll();
    this._values = new Map();
    // Custom cards (`custom:`) are left untouched: many ship their own template
    // engine (e.g. Mushroom, button-card), so pre-resolving their strings would
    // change their meaning. They can opt in to templating on their own terms.
    const isCustom = !!this._config?.type && isCustomType(this._config.type);
    this._templates =
      this._config && !isCustom && hasTemplate(this._config)
        ? collectConfigTemplates(this._config)
        : [];
    this._configHash = this._templates.length ? hash(this._config) : undefined;

    // Seed from cache so a rebuild / reconnect shows resolved values instantly.
    for (const source of this._uniqueSources()) {
      const key = this._cacheKey(source);
      if (valueCache.has(key)) {
        this._values.set(source, valueCache.get(key));
      }
    }
  }

  private _subscribeAll(): void {
    if (!this._hass || !this._connected || this._templates.length === 0) {
      return;
    }
    const sources = this._uniqueSources();

    for (const [source, sub] of this._subscriptions) {
      if (!sources.has(source)) {
        sub.unsub?.then((u) => u()).catch(() => undefined);
        this._subscriptions.delete(source);
      }
    }
    for (const source of sources) {
      if (!this._subscriptions.has(source)) {
        this._subscribe(source);
      }
    }

    if (!this.ready && this._timeout === undefined) {
      this._timeout = window.setTimeout(() => {
        this._timeout = undefined;
        this._recompute(true);
      }, BUILD_TIMEOUT);
    }
  }

  private _subscribe(source: string): void {
    const sub: TemplateSubscription = { generation: this._generation };
    this._subscriptions.set(source, sub);
    try {
      sub.unsub = subscribeRenderTemplate(
        this._hass!.connection,
        (result) => {
          // Stale-result guard: ignore anything from a superseded generation.
          if (
            this._subscriptions.get(source) !== sub ||
            sub.generation !== this._generation
          ) {
            return;
          }
          if ("error" in result) {
            // Live mode keeps the last good value; errors are surfaced only in
            // the editor through `report_errors`.
            return;
          }
          const value = (result as RenderTemplateResult).result;
          const changed = this._values.get(source) !== value;
          this._values.set(source, value);
          valueCache.set(this._cacheKey(source), value);
          if (changed) {
            this._recompute(false, true);
          }
        },
        {
          template: source,
          variables: {
            config: this._config,
            user: this._hass!.user?.name,
          },
          report_errors: this._preview,
        }
      );
      sub.unsub.catch(() => {
        // Subscription failed to start (e.g. an invalid template): fall back to
        // the raw source so the card still builds instead of hanging.
        if (
          this._subscriptions.get(source) === sub &&
          !this._values.has(source)
        ) {
          this._values.set(source, source);
          this._recompute();
        }
      });
    } catch (_err) {
      if (!this._values.has(source)) {
        this._values.set(source, source);
      }
    }
  }

  private _unsubscribeAll(): void {
    // Bump the generation so any in-flight results are ignored.
    this._generation += 1;
    for (const sub of this._subscriptions.values()) {
      sub.unsub?.then((u) => u()).catch(() => undefined);
    }
    this._subscriptions.clear();
    if (this._timeout !== undefined) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  private _recompute(force = false, fromValues = false): void {
    this.updatedFromValues = fromValues;
    if (this._templates.length === 0 || !this._config) {
      this.ready = true;
      this.resolvedConfig = this._config;
      this._onChange();
      return;
    }

    const sources = this._uniqueSources();
    let allResolved = true;
    for (const source of sources) {
      if (!this._values.has(source)) {
        allResolved = false;
        break;
      }
    }
    this.ready = force || allResolved;

    const results = new Map<string, unknown>();
    for (const template of this._templates) {
      if (this._values.has(template.template)) {
        results.set(
          pathKey(template.path),
          this._values.get(template.template)
        );
      } else if (force) {
        // Best-effort on timeout: leave the raw template string in place.
        results.set(pathKey(template.path), template.template);
      }
    }
    this.resolvedConfig = applyConfigTemplates(this._config, results);

    if (this.ready && this._timeout !== undefined) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }

    this._onChange();
  }
}
