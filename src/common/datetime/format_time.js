import fecha from 'fecha';

// Check for support of native locale string options
function toLocaleTimeStringSupportsOptions() {
  try {
    new Date().toLocaleTimeString('i');
  } catch (e) {
    return e.name === 'RangeError';
  }
  return false;
}

export default (toLocaleTimeStringSupportsOptions()
  ? function (dateObj, locales) {
    return dateObj.toLocaleTimeString(
      locales,
      { hour: 'numeric', minute: '2-digit' }
    );
  } : function (dateObj, locales) { // eslint-disable-line no-unused-vars
    return fecha.format(dateObj, 'shortTime');
  });
