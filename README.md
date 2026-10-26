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

## Photos

Les photos des véhicules proviennent de Wikimedia Commons ; leurs arrière-plans ont été retirés.
Les crédits sont affichés en pied de page (voir `photo` dans `CARS`, `js/app.js`).

| Fichier | Auteur | Licence | Source |
| --- | --- | --- | --- |
| `images/hilux-dc.webp` | Chanokchon | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:2021_Toyota_Hilux_Revo_Prerunner_Double-Cab_2.4_Mid.jpg) |
| `images/hilux-gr.webp` | LuvsMG481 | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:2024_Toyota_HiLux_GR_Sport_front.jpg) |
| `images/lc300.webp` | TTTNIS | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:2021_Toyota_Land_Cruieser_300_ZX.jpg) |
| `images/lc70.webp` | TuRbO_J | CC BY 2.0 | [Commons](https://commons.wikimedia.org/wiki/File:2015_Toyota_Land_Cruiser_(VDJ76R)_GXL_5-door_wagon_(19039611238).jpg) |
| `images/prado.webp` | Ethan Llamas | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:2024_Toyota_Land_Cruiser_Prado_2.4_Turbo_in_Avant_Garde_Bronze,_front_left.jpg) |
| `images/fortuner.webp` | オーバードライブ83 | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:2021_Toyota_Fortuner_2.4_VRZ_4x2_GUN165R_(20220215).jpg) |
| `images/rav4.webp` | Alexander Migl | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:2019_Toyota_RAV4_Hybrid_01.jpg) |

Pour utiliser vos propres photos, remplacez ces fichiers (fond transparent conseillé) en gardant les mêmes noms.
