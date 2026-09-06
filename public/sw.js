self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Les données opérationnelles ne sont pas mises en cache hors connexion.
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Le Cercle · Hors connexion</title><body style="font:18px sans-serif;padding:40px"><h1>Connexion nécessaire</h1><p>Reconnectez-vous pour retrouver le planning à jour.</p><button onclick="location.reload()">Réessayer</button></body></html>',{headers:{'Content-Type':'text/html;charset=utf-8'}})))});
