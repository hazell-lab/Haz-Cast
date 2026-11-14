# HazCast design audit

Audit of the original HazCast (commit `eee3914`) before the redesign. Screenshots of the original are in `docs/screenshots/before-*.png`.

## What the project is

- Static site: `index.html`, `css/style.css`, `js/script.js`. No framework, no build step, no backend.
- Data: Open-Meteo forecast API and geocoding API (no key). BigDataCloud client-side reverse geocoding for "use my location".
- No API keys, secrets or environment variables exist anywhere in the project.
- External assets: Google Fonts (Inter), Font Awesome 6.5 from cdnjs (about 100 KB of CSS plus a webfont, used only for icons).
- State: `localStorage` for favorites (max 8), recent searches (max 5), unit (°C/°F) and theme. There is a migration from the old `skycast-*` keys.
- Updates: refresh every 10 minutes and when the tab becomes visible after 10 minutes. Stale responses are ignored when switching cities quickly.
- No caching of weather data. If the network fails on load, the page is empty except for an error.
- No maps, radar, alerts, air quality or pollen. The README lists these as future work.

## Preserve

- Open-Meteo as the only weather provider, and the keyless setup.
- All behavior in `script.js`: search with "city, country" matching, debounced suggestions with arrow-key navigation, geolocation with clear error messages, favorites, recent searches, °C/°F with km/h↔mph and km↔mi, light/dark theme with the early no-flash script, 10-minute refresh, out-of-date response guard, HTML escaping of API text, `localStorage` try/catch, `skycast-*` key migration.
- The rule that detail cards with missing data are hidden rather than faked.
- Skip link, visually hidden headings, focus-visible outlines.
- Condition-driven backgrounds with day/night detection (the best idea in the original; it is only applied to one card).

## Problems

### Identity
- It looks like a generic SaaS template: Inter, blue primary buttons, white rounded cards with soft shadows, icon + title on every panel. Nothing says "weather" except the icons.
- It shares Inter and the navy dark ground (`#0b1220`) with the HazFocus productivity app, so the two read as siblings.
- The night background is a purple/indigo gradient, one of the most generic choices.
- Font Awesome icons are recognisably stock and change style between filled and outlined.

### Hierarchy
- The current temperature competes with eight equally weighted detail tiles of the same size next to it.
- Location, date and local time are all the same size and weight.
- Every section has the same chrome (white card, blue icon, bold title), so nothing leads.
- The sidebar (favorites, recent) takes a full column on desktop while mostly empty, and drops to the very bottom on mobile, under the 7-day list.

### Data presentation
- Hourly forecast is 24 identical tiles; you can't see the temperature trend without reading each number.
- The 7-day list shows highs/lows as text only, with no shared scale, so a warm day and a cool day look the same.
- Daily icons always use the day variant, and the hourly "Now" tile can show a different condition from the hero (hourly vs. current code). Fine, but it needs labelling.
- Precipitation is only a probability; the amount (mm) is never requested even though the API has it.
- Sunrise and sunset are plain text tiles, with no sense of where the day is now.
- "Precipitation 100% — chance today" reads as if it is raining right now.

### Resilience
- No cached data: a failed request on start-up leaves a blank page.
- No visible "last updated" time, so users can't tell if data is fresh.
- HTTP 429 (rate limit) is reported as a generic error.
- Exact geolocation coordinates are sent to the reverse-geocoder and saved to `localStorage` at full precision.

### Responsive
- Mobile is the desktop layout stacked. The sidebar ends up below everything.
- The hero card on mobile keeps a large decorative circle that overlaps the date text.

### Performance
- Font Awesome CSS and font are render-blocking for a handful of icons.

## Redesign decisions

| Area | Decision |
| --- | --- |
| Hero | Full-width sky that changes with condition and time of day (dawn, day, dusk, night), with a restrained weather layer (rain, snow, fog, cloud drift, stars). Temperature is the largest thing on the page. |
| Signature | A "horizon line" along the bottom of the sky: sunrise on the left, sunset on the right, and the sun's actual position between them. |
| Readings | Replace the tile grid with one ruled instrument strip: humidity + dew point, wind + gusts + direction needle, pressure + 3-hour trend, visibility, UV with a scale, cloud cover. |
| Hourly | A temperature curve over 24 columns, with rain-chance bars and wind under it. Hover, tap or arrow keys to read any hour. |
| Weekly | Seven temperature-range columns on one shared scale (rows on mobile), coloured by a temperature ramp, with rain chance and amount. |
| Air | Add Open-Meteo's own air-quality API (same provider, no key): US AQI, PM2.5, PM10, ozone, and pollen where Open-Meteo has it (Europe only). |
| Alerts | Open-Meteo has no warning feed, so there is no alert system. Show forecast-derived notes ("rain likely around 4 PM") labelled as such, and say plainly that official warnings come from the national weather service. |
| Places | Saved places become a station switcher under the sky with live temperatures. Recent searches show in the search box when it is empty. |
| Maps | Not added. The provider has no radar tiles, and adding another provider plus a map library is out of scope for a redesign. Left as future work. |
| Caching | Keep the last response per place in `localStorage`. Show it straight away marked "saved", then replace with live data. If offline or rate-limited, keep showing it with its age. |
| Icons | Replace Font Awesome with a small inline SVG set drawn for HazCast. |
| Privacy | Round geolocation to 2 decimals (about 1 km) before sending or saving it. |

## Visual identity, kept apart from the other projects

| | Portfolio | HazFocus | HazCast (new) |
| --- | --- | --- | --- |
| Type | Instrument Serif, Schibsted Grotesk, JetBrains Mono | Inter | Archivo variable, using its width axis: condensed thin numerals for temperature, wide caps for labels |
| Ground | warm off-black / cream | navy `#0b1220` | changes with the sky; light ground is a cool mineral grey, dark ground is wet-slate graphite |
| Accent | red-orange | teal | met-office yellow, used only for the sun, "now" markers and focus |
| Layout | editorial name hero, numbered nav | sidebar + cards | full-bleed sky, horizon line, ruled instrument rows, no card grid |
