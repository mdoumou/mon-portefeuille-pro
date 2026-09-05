// Service Worker - Mon Portefeuille Pro
// Strategie : "stale-while-revalidate" -> reponse immediate depuis le cache (rapide + hors ligne),
// mise a jour silencieuse en arriere-plan des que le reseau est disponible.
const CACHE_NAME = 'mpp-cache-v72';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(APP_SHELL.map(function(url){
        return cache.add(url).catch(function(){ /* une ressource indisponible ne doit pas bloquer l'installation */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  var url = event.request.url;
  // Exclusion volontairement precise (www.googleapis.com = API Drive, PAS fonts.googleapis.com qui doit au contraire etre mis en cache pour fonctionner hors ligne) :
  if(url.indexOf('www.googleapis.com') !== -1 || url.indexOf('accounts.google.com') !== -1) return; // jetons OAuth et fraicheur de synchro Drive doivent toujours venir du reseau
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var fetchAndUpdate = fetch(event.request).then(function(response){
        if(response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || fetchAndUpdate;
    })
  );
});
