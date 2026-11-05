// Install the Intl.PluralRules polyfill together with its locale data.
// FormatJS replaces Intl.PluralRules as soon as polyfill-force runs, and a
// data-less polyfill throws from select(). Keeping both imports in one module
// closes that gap for every caller, including the should-polyfill probes
// that other entry bundles run.
import "@formatjs/intl-pluralrules/polyfill-force";
// Locale data for plural rules breaks current JSON conversions as it includes functions,
// so only import English to avoid huge bundles
// TODO: Setup JS imports instead of JSON fetches
import "@formatjs/intl-pluralrules/locale-data/en";
