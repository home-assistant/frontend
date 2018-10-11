import fecha from "fecha";

// Check for support of native locale string options
function toLocaleStringSupportsOptions() {
  try {
    new Date().toLocaleString("i");
  } catch (e) {
    return e.name === "RangeError";
  }
  return false;
}

export default (toLocaleStringSupportsOptions()
  ? (dateObj, locales) =>
      dateObj.toLocaleString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
  : // eslint-disable-next-line no-unused-vars
    (dateObj, locales) => fecha.format(dateObj, "haDateTime"));
