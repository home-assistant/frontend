import Polyglot from 'node-polyglot';
import translationFingerprints from '../build-temp/translationFingerprints.js';
import fallbackTranslation from '../build-temp/fallbackTranslation.js';

function getActiveTranslation() {
  // Perform case-insenstive comparison since browser isn't required to
  // report languages with specific cases.
  var lookup = {};
  Object.keys(translationFingerprints).forEach(function(tr) {
    lookup[tr.toLowerCase()] = tr;
  });

  // Search for a matching translation from most specific to general
  function languageGetTranslation(language) {
    var subtags = language.toLowerCase().split('-');

    for (var i = subtags.length; i >= 1; i--) {
      var lang = subtags.slice(0, i).join('-');

      if (lookup[lang]) {
        return lookup[lang];
      };
    }
    return null;
  };

  var translation = null;
  if (window.localStorage.language) {
    translation = languageGetTranslation(window.localStorage.language);
    if (translation) {
      return translation;
    }
  } else if (navigator.languages) {
    for (var i = 0; i < navigator.languages.length; i++) {
      translation = languageGetTranslation(navigator.languages[i]);
      if (translation) {
        return translation;
      }
    }
  } else {
    translation = languageGetTranslation(navigator.language || navigator.userLanguage);
    if (translation) {
      return translation;
    }
  }

  // Final fallback
  return 'en';
}

// Store loaded translations in memory so translations are available immediately
// when DOM is created in Polymer. Even a cache lookup creates noticable latency.
var translations = {};

export default function getPolyglot() {
  var translation = getActiveTranslation();
  var translationHash = translation + '-' + translationFingerprints[translation];

  // If translation is available in memory, load it immediately
  if (translations[translationHash]) {
    return new Promise((resolve, reject) => {
      resolve(translations[translationHash]);
    });
  }

  // Otherwise fetch translation from server
  return new Promise((resolve, reject) => {
    if (___DEV___) {
      var translationUrl = '/static/translations/' + translation + '.json';
    } else {
      var translationUrl = '/static/translations/' + translationHash + '.json';
    }
    fetch(translationUrl, {
    }).then(result => {
      return result.json();
    }).then(json => {
      translations[translationHash] = new Polyglot({
        phrases: json,
        locale: translation,
      });
      resolve(translations[translationHash]);
    }).catch(error => {
      // In the event of an error, return the embedded fallback translation
      console.error('Unable to load translation ' + translation + '. Falling back to en.');
      resolve(new Polyglot({
        phrases: fallbackTranslation,
        locale: 'en',
      }));
    });
  });
}

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
getPolyglot();
