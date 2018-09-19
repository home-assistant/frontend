import fecha from 'fecha';

// Check for support of native locale string options
function toLocaleStringSupportsOptions() {
  try {
    new Date().toLocaleString('i');
  } catch (e) {
    return e.name === 'RangeError';
  }
  return false;
}

export default (toLocaleStringSupportsOptions()
  ? function (dateObj, locales) {
    return dateObj.toLocaleString(locales, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } : function (dateObj, locales) { // eslint-disable-line no-unused-vars
    return fecha.format(dateObj, 'haDateTime');
  });
