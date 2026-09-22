import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { HomeAssistant } from "../types";
import type { ExternalMessaging } from "./external_messaging";

/*
Apps that draw their own toolbar tell us so with `hasNativeBackButton`. We then
hide our own back arrow and instead report whether the current top bar offers a
back action, so the app can show or hide its native button. Tapping that button
sends `back_button/pressed` back to us, so the navigation stays ours.
*/

interface Registration {
  bus: ExternalMessaging;
  back: () => void;
}

// Top bars that currently offer a back action. The last one to register owns
// the app's back button, so a page mounted on top of another one wins.
const registrations: Registration[] = [];

// The bus we last told to show the button, so we only report changes.
let shownOn: ExternalMessaging | undefined;

const sync = (): void => {
  const active = registrations[registrations.length - 1];

  if (active) {
    if (shownOn !== active.bus) {
      active.bus.fireMessage({ type: "back_button/show" });
      shownOn = active.bus;
    }
    return;
  }

  if (shownOn) {
    shownOn.fireMessage({ type: "back_button/hide" });
    shownOn = undefined;
  }
};

/**
 * Run the back action of the top bar that currently owns the app's back
 * button. Returns false when no top bar claims one, so the app can be told
 * that its button was out of date.
 */
export const handleNativeBackButtonPressed = (): boolean => {
  const active = registrations[registrations.length - 1];

  if (!active) {
    return false;
  }

  active.back();
  return true;
};

interface NativeBackButtonHost extends ReactiveControllerHost {
  hass?: HomeAssistant;
}

interface NativeBackButtonOptions {
  /** Whether the top bar wants to offer a back action right now. */
  visible: () => boolean;
  /** Navigates back. Called for both our own arrow and the app's button. */
  back: () => void;
}

/**
 * Hands the back button of a top bar over to the external app when it renders
 * one itself. Hosts must not render their own arrow while `native` is true.
 */
export class NativeBackButtonController implements ReactiveController {
  private _registration?: Registration;

  constructor(
    private _host: NativeBackButtonHost,
    private _options: NativeBackButtonOptions
  ) {
    _host.addController(this);
  }

  /** True while the app renders the back button instead of us. */
  public get native(): boolean {
    return this._bus !== undefined;
  }

  private get _bus(): ExternalMessaging | undefined {
    // Demo and gallery hosts get by with a partial hass, so tread carefully.
    const external = this._host.hass?.auth?.external;
    return external?.config.hasNativeBackButton ? external : undefined;
  }

  public hostConnected(): void {
    this._sync();
  }

  public hostUpdated(): void {
    this._sync();
  }

  public hostDisconnected(): void {
    this._unregister();
  }

  private _sync(): void {
    const bus = this._bus;

    if (!bus || !this._options.visible()) {
      this._unregister();
      return;
    }

    if (this._registration) {
      this._registration.bus = bus;
      this._registration.back = this._options.back;
    } else {
      this._registration = { bus, back: this._options.back };
      registrations.push(this._registration);
    }

    sync();
  }

  private _unregister(): void {
    if (!this._registration) {
      return;
    }

    const index = registrations.indexOf(this._registration);
    if (index !== -1) {
      registrations.splice(index, 1);
    }
    this._registration = undefined;

    sync();
  }
}
