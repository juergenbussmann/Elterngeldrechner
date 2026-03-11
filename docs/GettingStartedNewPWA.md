# Getting started with a new PWA (Skeleton v2)

> LET OP: Voor Skeleton V3 gebruik je bij voorkeur `docs/GettingStartedNewPWA_V3.md`.

Deze gids laat zien hoe je van dit skelet naar je eigen PWA gaat.

## 1. Vereisten

- Node.js (huidige LTS-versie)
- npm (of een andere package manager)
- Git voor versiebeheer

## 2. Repo voorbereiden

1. Clone deze repo of kopieer de code naar een nieuwe repository.
2. Pas de Git-remote aan zodat je naar je eigen project verwijst.
3. Voer `npm install` uit.

## 3. Basisconfiguratie en branding

1. Open `src/config/appConfig.ts`.
2. Vul `APP_BRAND` in met de naam, korte naam, beschrijving, primaire kleur en logo-path van jouw PWA.
3. Controleer of de PWA-iconen in `public/icons/` passen bij je nieuwe branding.

## 4. Eerste module toevoegen

1. Lees `MODULE_AUTHOR_GUIDE.md` voor het module-concept.
2. Kies een module-id, bijvoorbeeld `tasks` of `dreams`.
3. Maak een map `src/modules/<id>/` en implementeer je module-component.
4. Voeg de module toe aan `moduleRegistry` in `src/config/moduleRegistry.ts`.
5. (Optioneel) Koppel een home-widget via `src/config/homeWidgets.ts`.
6. (Optioneel) Voeg module-specifieke settings toe via `ModuleSettingsScreen`.

## 5. Lokaal draaien en testen

1. Start de dev-server met `npm run dev`.
2. Open de app in je browser (meestal `http://localhost:5173`).
3. Draai de tests met `npm run test`.
4. Lint de code met `npm run lint`.

## 6. Build en deploy

1. Voer `npm run build` uit voor een production build.
2. Deploy de inhoud van de `dist/` map naar je hosting-provider of PWA-platform.

Voor meer details over modules, routing, thema en architectuur:

- zie `SKELETON_V2_SCOPE.md`, `Skeleton_V2_Bouwpad.md` en `MODULE_AUTHOR_GUIDE.md`.

