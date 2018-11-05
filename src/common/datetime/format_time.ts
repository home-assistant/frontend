import fecha from "fecha";

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
  : // eslint-disable-next-line no-unused-vars
    (dateObj, locales) => fecha.format(dateObj, "shortTime"));
