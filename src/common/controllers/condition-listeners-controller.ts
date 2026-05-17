import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type {
  Condition,
  ConditionContext,
} from "../../panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../types";
import { setupConditionListeners } from "../condition/listeners";

/**
 * Reactive controller that manages the media-query and time-based listeners
 * needed to keep a set of lovelace visibility conditions evaluated live.
 *
 * The host is responsible for the actual evaluation (e.g. computing visible /
 * hidden / invalid state); the controller only triggers it via the supplied
 * `onUpdate` callback when something the conditions depend on changes. Call
 * `setup()` whenever the conditions change; the controller clears previous
 * listeners and re-subscribes. Listeners are automatically released when the
 * host disconnects.
 */
export class ConditionListenersController implements ReactiveController {
  private _unsubs: (() => void)[] = [];

  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  public hostDisconnected(): void {
    this.clear();
  }

  public setup(
    conditions: Condition[],
    hass: HomeAssistant,
    onUpdate: () => void,
    getContext?: () => ConditionContext
  ): void {
    this.clear();
    if (!conditions.length) {
      return;
    }
    setupConditionListeners(
      conditions,
      hass,
      (unsub) => this._unsubs.push(unsub),
      () => onUpdate(),
      getContext
    );
  }

  public clear(): void {
    for (const unsub of this._unsubs) {
      unsub();
    }
    this._unsubs = [];
  }
}
