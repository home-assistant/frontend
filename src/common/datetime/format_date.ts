import fecha from "fecha";

// Check for support of native locale string options
function toLocaleDateStringSupportsOptions() {
  try {
    new Date().toLocaleDateString("i");
  } catch (e) {
    return e.name === "RangeError";
  }
  return false;
}

export default (toLocaleDateStringSupportsOptions()
  ? (dateObj, locales) =>
      dateObj.toLocaleDateString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  : // eslint-disable-next-line no-unused-vars
    (dateObj, locales) => fecha.format(dateObj, "mediumDate"));
