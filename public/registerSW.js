// PrecisionPOS - Clean up any service worker registrations and caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (var i = 0; i < registrations.length; i++) {
      registrations[i].unregister();
    }
  }).catch(function() {});
}
if (typeof window !== 'undefined' && window.caches) {
  caches.keys().then(function(names) {
    for (var j = 0; j < names.length; j++) {
      caches.delete(names[j]);
    }
  }).catch(function() {});
}
