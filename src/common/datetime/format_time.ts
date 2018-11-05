import * as fecha from "fecha";

// Check for support of native locale string options
function toLocaleTimeStringSupportsOptions() {
  try {
    new Date().toLocaleTimeString("i");
  } catch (e) {
    return e.name === "RangeError";
  }
  return false;
}

export default (toLocaleTimeStringSupportsOptions()
  ? (dateObj, locales) =>
      dateObj.toLocaleTimeString(locales, {
        hour: "numeric",
        minute: "2-digit",
      })
  : (dateObj) => fecha.format(dateObj, "shortTime"));
