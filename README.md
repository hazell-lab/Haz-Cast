# HazCast - Weather Dashboard

A modern, responsive weather dashboard built with **HTML, CSS and vanilla JavaScript**. HazCast fetches real weather data from the Open-Meteo API, so no API key is needed.

> Built by Hazim Aqil · [Portfolio](https://hazimaqil-portfolio.netlify.app) · [GitHub](https://github.com/hazell-lab/)

<!-- add a screenshot: save it as assets/images/screenshot.png, then remove the comment marks below -->
<!-- ![HazCast screenshot](assets/images/screenshot.png) -->

## Description

HazCast lets you search for any city in the world and see its current weather, the next 24 hours and a 7-day forecast. You can save favorite cities, revisit recent searches, use your current location, switch between °C and °F, and change between light and dark mode. The current weather card changes its background based on the weather and whether it is day or night at the selected location.

## Features

- Current weather (temperature, feels like, high/low, condition, local date and time)
- City search with autocomplete suggestions (use the arrow keys to move through them)
- Search by "city, country" or "city, state" (for example `Paris, France` or `Springfield, IL`)
- Hourly forecast for the next 24 hours (scrolls sideways on small screens)
- 7-day forecast with high/low temperatures and chance of rain
- Extra details: humidity, wind, visibility, pressure, precipitation chance, UV index, sunrise and sunset
- Use my location (browser geolocation)
- Favorite cities (up to 8) with their current temperature
- Recent searches (last 5, no duplicates)
- Switching between °C and °F (wind and visibility switch to mph and miles too)
- Light and dark mode
- Dynamic weather backgrounds with day and night detection
- Weather refreshes every 10 minutes and when you come back to the tab
- Friendly loading and error messages
- Fully responsive layout and basic accessibility support

## Technologies

- HTML5
- CSS3 (grid, flexbox, variables, media queries)
- JavaScript (vanilla)
- Open-Meteo weather and geocoding API
- localStorage
- Browser Geolocation API
- Font Awesome icons and Google Fonts (Inter)

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
weather-dashboard/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   ├── images/          (screenshot goes here)
│   └── icons/
│       └── favicon.svg
└── README.md
```

## Setup

1. Download or clone this project.
2. Open the `weather-dashboard` folder in VS Code.
3. Install the **Live Server** extension if you do not have it.
4. Right-click `index.html` and choose **Open with Live Server**.
5. The app opens in your browser at an address like `http://127.0.0.1:5500`.

Geolocation only works on `localhost`, `127.0.0.1` or `https`, so use Live Server instead of double-clicking the file.

## API Setup

No API key is required.

- Weather and city search: [Open-Meteo](https://open-meteo.com/) (free for non-commercial use)
- Place name for "use my location": BigDataCloud free client-side reverse geocoding (no key needed). If it fails, the app shows "Your location" instead.

## Future Improvements

- Interactive weather map
- Weather alerts
- Radar data
- Air quality data
- More detailed forecasts
- Charts for temperature and rain
- Multiple saved locations with drag-to-reorder
- Backend with user accounts
- React version of the app