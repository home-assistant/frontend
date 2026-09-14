/**
 * The parts of the UI a kiosk client can hide.
 *
 * A client names them over the external bus (`kiosk_mode/set`) as either
 * `excluded_elements` (hide exactly these) or `included_elements` (hide
 * everything except these), so the same set can be described from either side.
 */
export const KIOSK_ELEMENTS = [
  /** The sidebar itself: never docked, only reachable as an overlay. */
  "sidebar",
  /** The hamburger button that opens the sidebar, in every panel's toolbar. */
  "sidebar_button",
  /** The dashboard view tabs. The current view's title is shown instead. */
  "dashboard_tabs",
  /** The "+" menu that adds a device, automation, area or person. */
  "dashboard_add_button",
  /** The search button that opens the quick bar. */
  "dashboard_search_button",
  /** The Assist button. */
  "dashboard_assist_button",
  /** The pencil that switches the dashboard into edit mode. */
  "dashboard_edit_button",
  /** The header the app panel draws above an ingress add-on iframe. */
  "app_panel_header",
] as const;

export type KioskElement = (typeof KIOSK_ELEMENTS)[number];

const KIOSK_ELEMENTS_SET: ReadonlySet<string> = new Set(KIOSK_ELEMENTS);

/**
 * Nothing hidden. Shared instance so context consumers that compare by
 * reference don't see a change every time kiosk mode is switched off.
 */
export const NO_KIOSK_ELEMENTS_HIDDEN: ReadonlySet<KioskElement> = new Set();

/**
 * What a client gets when it enables kiosk mode without naming any elements.
 * This is the set kiosk mode hid back when it was a single boolean, so a client
 * that only sends `enable` keeps the behavior it has today.
 */
export const DEFAULT_KIOSK_ELEMENTS_HIDDEN: ReadonlySet<KioskElement> = new Set(
  [
    "sidebar",
    "sidebar_button",
    "dashboard_add_button",
    "dashboard_search_button",
    "dashboard_edit_button",
    "app_panel_header",
  ]
);

/**
 * Who asked for kiosk mode. Each source's request is kept on its own and the
 * hidden elements are their union, so one source switching kiosk mode off
 * doesn't undo what another still asks for.
 *
 * - `external_app`: the companion app, over `kiosk_mode/set`.
 * - `app_panel`: an ingress add-on, via `home-assistant/subscribe-properties`.
 */
export type KioskModeSource = "external_app" | "app_panel";

export interface KioskModeParams {
  enable: boolean;
  /** Defaults to `external_app`. */
  source?: KioskModeSource;
  /** Hide exactly these. Mutually exclusive with `includedElements`. */
  excludedElements?: readonly string[];
  /** Hide everything except these. Mutually exclusive with `excludedElements`. */
  includedElements?: readonly string[];
}

const isKioskElement = (value: string): value is KioskElement =>
  KIOSK_ELEMENTS_SET.has(value);

/**
 * Resolve a kiosk request into the elements to hide.
 *
 * Element names this frontend doesn't know are ignored rather than rejected, so
 * a newer client naming an element an older frontend has never heard of still
 * gets the rest of its request honored.
 */
export const resolveKioskElementsHidden = ({
  enable,
  excludedElements,
  includedElements,
}: KioskModeParams): ReadonlySet<KioskElement> => {
  if (!enable) {
    return NO_KIOSK_ELEMENTS_HIDDEN;
  }
  if (excludedElements) {
    return new Set(excludedElements.filter(isKioskElement));
  }
  if (includedElements) {
    const shown = new Set(includedElements);
    return new Set(KIOSK_ELEMENTS.filter((element) => !shown.has(element)));
  }
  return DEFAULT_KIOSK_ELEMENTS_HIDDEN;
};

/**
 * Combine the elements each kiosk source hides into the set the UI hides.
 *
 * Returns a source's set unchanged when it is the only one hiding anything, and
 * the shared empty set when none is, so context consumers comparing by
 * reference only see a change when the combined result actually changes shape.
 */
export const combineKioskElementsHidden = (
  requests: Iterable<ReadonlySet<KioskElement>>
): ReadonlySet<KioskElement> => {
  const nonEmpty = [...requests].filter((request) => request.size > 0);
  if (nonEmpty.length === 0) {
    return NO_KIOSK_ELEMENTS_HIDDEN;
  }
  if (nonEmpty.length === 1) {
    return nonEmpty[0];
  }
  return new Set(nonEmpty.flatMap((request) => [...request]));
};
