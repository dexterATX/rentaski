// Capture fbclid + UTM params for Meta attribution (first-party cookies).
// Also sets a stable anonymous visitor ID (rentaskii_vid) used as external_id
// for CAPI match quality when _fbp isn't available yet.
(function () {
  try {
    var params = new URLSearchParams(location.search);
    var created = Math.floor(Date.now() / 1000);

    var fbclid = params.get('fbclid');
    if (fbclid) {
      document.cookie =
        '_fbc=fb.1.' + created + '.' + fbclid + ';path=/;max-age=7776000;SameSite=Lax';
    }

    // Stable first-party visitor ID — persists for 90 days, used as external_id
    // for CAPI so Meta can match events across visits even before _fbp is set.
    var vid = '';
    var vidMatch = document.cookie.match(/(?:^|;\s*)rentaskii_vid=([^;]+)/);
    if (vidMatch) {
      vid = decodeURIComponent(vidMatch[1]);
    } else {
      vid = 'rv-' + created + '-' + Math.random().toString(36).slice(2, 10) +
            Math.random().toString(36).slice(2, 10);
      document.cookie = 'rentaskii_vid=' + encodeURIComponent(vid) +
        ';path=/;max-age=7776000;SameSite=Lax';
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