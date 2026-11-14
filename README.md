# HazCast - Weather Dashboard

A modern, responsive weather dashboard built with **HTML, CSS and vanilla JavaScript**. HazCast fetches real weather data from the Open-Meteo API, so no API key is needed.

**[🔗 Live Demo](https://hazcast-weatherdashboard.netlify.app/)** · [Source code](https://github.com/hazell-lab/Haz-Cast) · [Portfolio](https://hazimaqil-portfolio.netlify.app)

![HazCast weather dashboard](docs/screenshot.png)

## Description

HazCast lets you search for any city in the world and see its weather as an atmosphere, not a grid of cards. The top of the page is a sky that changes with the real conditions and the time of day at that place (clear, cloudy, rain, storm, fog, snow, dawn, dusk and night), with a horizon line that shows where the sun is between sunrise and sunset. Under it are the instrument readings, a 24-hour temperature curve, a 7-day range chart, air quality and daylight.

You can save places, revisit recent searches, use your current location, switch between °C and °F, and change between light and dark mode.

## Features

- Live sky: background, motion (rain, snow, drifting fog and cloud) and ink color follow the current weather and time of day
- Horizon line with the sun's real position, sunrise and sunset
- Current weather: temperature, condition, feels like, high/low, local date and time, and a short summary made from the forecast
- Readings: humidity and dew point, wind with direction needle and gusts, pressure with 3-hour trend, visibility, UV now and today's peak, rain today
- Next 24 hours: temperature curve with rain chance bars and wind, readable by hover, tap or arrow keys
- Seven days: highs and lows on one shared scale, colored by temperature, with rain chance and amount
- Air quality (US AQI, PM2.5, PM10, ozone, nitrogen dioxide) and pollen where available
- Daylight: the local day as a band, day length and tomorrow's change
- Forecast notes (storms, heavy rain, strong gusts, high UV, unhealthy air), clearly marked as coming from the forecast, not official warnings
- City search with autocomplete (arrow keys work), "city, country" or "city, state" matching, and recent searches when the box is empty
- Use my location (rounded to about 1 km before it is sent or saved)
- Saved places (up to 8) with live temperature and condition, and recent searches (last 5)
- °C and °F (wind, visibility and rain switch to mph, miles and inches too)
- Light and dark mode, refined separately; the sky is the same in both because it is the weather
- Last data for each place is kept, shown straight away and used when offline or rate limited, with a clear "saved" or "live" label
- Weather refreshes every 10 minutes, when you come back to the tab, and when the connection returns
- Respects reduced-motion settings; the sky animation pauses when it is off screen or the tab is hidden
- Responsive layouts for desktop, tablet and mobile, keyboard support and visible focus

## Technologies

- HTML5
- CSS3 (grid, flexbox, custom properties, `color-mix`, media queries)
- JavaScript (vanilla) with inline SVG for icons and charts, and a small canvas layer for rain and snow
- Open-Meteo forecast, geocoding and air quality APIs
- localStorage
- Browser Geolocation API
- Google Fonts (Archivo, using its width axis)

## JavaScript Concepts Demonstrated

- `fetch` and the Fetch API
- `async` / `await`
- `try` / `catch` / `finally` and `response.ok` for error handling
- API integration and working with JSON
- DOM manipulation with template literals
- Event handling (click, submit, input, keydown) and event delegation
- `localStorage` for favorites, recent searches, unit and theme
- Arrays and objects, with `map`, `filter`, `find`-style methods (`some`, `findIndex`) and `slice`
- `Promise.all` to load several requests at once
- Geolocation API with success and error callbacks
- `Intl`-style date formatting with `toLocaleDateString` and `toLocaleTimeString`
- Escaping text before using `innerHTML`, so city names from the API cannot inject HTML
- Ignoring out-of-date responses when the user switches cities quickly

## Folder Structure

```
Haz-Cast/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   └── icons/
│       └── favicon.svg
├── docs/
│   ├── design-audit.md
│   ├── screenshot.png
│   └── screenshots/
└── README.md
```

## Setup

1. Clone this repository (or download it as a ZIP):
   ```bash
   git clone https://github.com/hazell-lab/Haz-Cast.git
   ```
2. Open the `Haz-Cast` folder in VS Code.
3. Install the **Live Server** extension if you do not have it.
4. Right-click `index.html` and choose **Open with Live Server**.
5. The app opens in your browser at an address like `http://127.0.0.1:5500`.

Geolocation only works on `localhost`, `127.0.0.1` or `https`, so use Live Server instead of double-clicking the file.

## API Setup

No API key is required.

- Weather, city search and air quality: [Open-Meteo](https://open-meteo.com/) (free for non-commercial use)
- Place name for "use my location": BigDataCloud free client-side reverse geocoding (no key needed). If it fails, the app shows "Your location" instead.

## Data limits

- Open-Meteo does not publish official weather warnings, so HazCast does not show any. The forecast notes are worked out from the forecast and say so.
- There is no radar or weather map. Open-Meteo has no radar tiles, and HazCast does not show simulated radar.
- Air quality is modelled (CAMS), not measured by a local sensor. Pollen is only available for Europe.

## Future Improvements

- Interactive radar map from a provider that offers real radar tiles
- Official weather alerts from a national weather service
- Multiple saved locations with drag-to-reorder
- Backend with user accounts
- React version of the app

## Author

Built by **Hazim Aqil**, Software Engineering student at the German-Malaysian Institute (GMI).

- Portfolio: [hazimaqil-portfolio.netlify.app](https://hazimaqil-portfolio.netlify.app)
- GitHub: [@hazell-lab](https://github.com/hazell-lab)
- LinkedIn: [mdhazimaqil](https://www.linkedin.com/in/mdhazimaqil/)
