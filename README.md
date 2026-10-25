# RC Rent — location de véhicules Toyota

Site vitrine et de réservation (Hilux, Land Cruiser 300 / 70 / Prado, Fortuner, RAV4).
100 % statique : HTML, CSS et JavaScript, sans dépendance ni étape de build.

## Lancer

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```sh
python3 -m http.server 8000
```

## Structure

- `index.html` : pages et formulaire de réservation
- `css/styles.css` : styles
- `js/app.js` : catalogue (`CARS`), tarifs, options, disponibilités et réservation

## Personnaliser

Dans `js/app.js` :

- `CONFIG.currency` : devise (USD par défaut)
- `CARS` : modèles, prix par jour, nombre d'unités, réservations existantes
- `OPTIONS` et `LOCATION_FEES` : options et frais de livraison

Les réservations sont enregistrées dans le `localStorage` du navigateur. Pour les recevoir
réellement, il faut brancher le formulaire sur un back-end (Supabase, Formspree, e-mail…).
