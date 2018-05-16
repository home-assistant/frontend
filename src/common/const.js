/** Constants to be used in the frontend. */

// Constants should be alphabetically sorted by name.
// Arrays with values should be alphabetically sorted if order doesn't matter.
// Each constant should have a description what it is supposed to be used for.

/** Icon to use when no icon specified for domain. */
export const DEFAULT_DOMAIN_ICON = 'mdi:bookmark';

/** Domains that have a state card. */
export const DOMAINS_WITH_CARD = [
  'climate',
  'cover',
  'configurator',
  'input_select',
  'input_number',
  'input_text',
  'media_player',
  'scene',
  'script',
  'timer',
  'weblink',
];

/** Domains that should have the history hidden in the more info dialog. */
export const DOMAINS_MORE_INFO_NO_HISTORY = [
  'camera',
  'configurator',
  'history_graph',
  'scene',
];

/** States that we consider "off". */
export const STATES_OFF = [
  'closed',
  'off',
  'unlocked',
];

/** Temperature units. */
export const UNIT_C = '°C';
export const UNIT_F = '°F';
