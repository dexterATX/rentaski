// Capture fbclid + UTM params for Meta attribution (first-party cookies).
(function () {
  try {
    var params = new URLSearchParams(location.search);
    var created = Math.floor(Date.now() / 1000);

    var fbclid = params.get('fbclid');
    if (fbclid) {
      document.cookie =
        '_fbc=fb.1.' + created + '.' + fbclid + ';path=/;max-age=7776000;SameSite=Lax';
    }

    var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var utm = {};
    utmKeys.forEach(function (key) {
      var val = params.get(key);
      if (val) utm[key] = val;
    });
    if (Object.keys(utm).length) {
      sessionStorage.setItem('rentaskii_utm', JSON.stringify(utm));
      document.cookie =
        'rentaskii_utm=' +
        encodeURIComponent(JSON.stringify(utm)) +
        ';path=/;max-age=7776000;SameSite=Lax';
    }
  } catch (_) {
    /* attribution is best-effort */
  }
})();