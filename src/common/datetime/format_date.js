import fecha from 'fecha';

// Check for support of native locale string options
function toLocaleDateStringSupportsOptions() {
  try {
    new Date().toLocaleDateString('i');
  } catch (e) {
    return e.name === 'RangeError';
  }
  return false;
}

export default (toLocaleDateStringSupportsOptions() ?
  function (dateObj, locales) {
    return dateObj.toLocaleDateString(
      locales,
      { year: 'numeric', month: 'long', day: 'numeric' },
    );
  } : function (dateObj, locales) { // eslint-disable-line no-unused-vars
    return fecha.format(dateObj, 'mediumDate');
  });
