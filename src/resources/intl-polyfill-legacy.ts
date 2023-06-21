// This module is a simpler version of `intl-polyfill` without top level await, and replaces it for legacy builds.
// Babel cannot transform TLA, and Webpack uses an async function to support it,
// so builds with browser targets without async support will be broken.

import "@formatjs/intl-getcanonicallocales/polyfill";
import "@formatjs/intl-locale/polyfill";
import "@formatjs/intl-pluralrules/polyfill";
import "@formatjs/intl-pluralrules/locale-data/en";
import "@formatjs/intl-numberformat/polyfill";
import "@formatjs/intl-numberformat/locale-data/en";
import "@formatjs/intl-relativetimeformat/polyfill";
import "@formatjs/intl-relativetimeformat/locale-data/en";
import "@formatjs/intl-datetimeformat/polyfill";
import "@formatjs/intl-datetimeformat/locale-data/en";
import "@formatjs/intl-datetimeformat/add-all-tz";
import "@formatjs/intl-displaynames/polyfill";
import "@formatjs/intl-displaynames/locale-data/en";
import "@formatjs/intl-listformat/polyfill";
import "@formatjs/intl-listformat/locale-data/en";
