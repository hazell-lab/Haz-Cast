// hazcast weather dashboard

// pure helpers live in weather-core.js so they can be tested
const core = window.HazCore;
const {
  getWeatherInfo, signed, splitUnit, escapeHtml, getCityId, getWindDirection, getUvLevel,
  getVisibilityLevel, localToMs, formatAge, formatDuration, tempColor, roundCoord, isValidCity,
  getAqiLevel, getAqiPosition, getPollenLevel, findHourIndex, getNowcast, moveItem,
  placeToQuery, queryToPlace, isInUsCoverage
} = core;

// api addresses
const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";
const weatherUrl = "https://api.open-meteo.com/v1/forecast";
const airQualityUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";
const reverseGeocodeUrl = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const alertsUrl = "https://api.weather.gov/alerts/active";
const radarListUrl = "https://api.rainviewer.com/public/weather-maps.json";

// leaflet is only loaded when the radar is opened, pinned to one version with integrity hashes
const leafletFiles = {
  css: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  cssHash: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
  js: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  jsHash: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
};

// weather fields to request
const currentFields = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "dew_point_2m",
  "cloud_cover",
  "visibility",
  "uv_index"
];

const hourlyFields = [
  "temperature_2m",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "is_day",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "pressure_msl"
];

const dailyFields = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "sunrise",
  "sunset",
  "uv_index_max",
  "precipitation_probability_max",
  "precipitation_sum",
  "daylight_duration"
];

const airFields = [
  "us_aqi",
  "pm2_5",
  "pm10",
  "ozone",
  "nitrogen_dioxide",
  "alder_pollen",
  "birch_pollen",
  "grass_pollen",
  "ragweed_pollen"
];

// local storage keys
const favoritesKey = "hazcast-favorites";
const recentKey = "hazcast-recent";
const unitKey = "hazcast-unit";
const themeKey = "hazcast-theme";
const cacheKey = "hazcast-cache";

// the app used to be called skycast, so old saved data may use these keys
const oldKeys = {
  "skycast-favorites": favoritesKey,
  "skycast-recent": recentKey,
  "skycast-unit": unitKey,
  "skycast-theme": themeKey
};

// limits
const maxFavorites = 8;
const maxRecent = 5;
const maxCached = 8;

// refresh the weather every 10 minutes
const refreshTime = 10 * 60 * 1000;

// city used the first time the app opens
const defaultCity = {
  name: "Kuala Lumpur",
  country: "Malaysia",
  region: "Kuala Lumpur",
  latitude: 3.1412,
  longitude: 101.6865
};

// page elements
const masthead = document.getElementById("masthead");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const suggestionsPanel = document.getElementById("suggestions-panel");
const suggestionsLabel = document.getElementById("suggestions-label");
const suggestionsList = document.getElementById("suggestions");
const locationBtn = document.getElementById("location-btn");
const unitCBtn = document.getElementById("unit-c");
const unitFBtn = document.getElementById("unit-f");
const themeBtn = document.getElementById("theme-btn");

const messageBox = document.getElementById("message");
const loadingBox = document.getElementById("loading");
const skyContent = document.getElementById("sky-content");
const weatherContent = document.getElementById("weather-content");

const currentCard = document.getElementById("current-card");
const cityName = document.getElementById("city-name");
const currentDate = document.getElementById("current-date");
const currentTime = document.getElementById("current-time");
const currentIcon = document.getElementById("current-icon");
const currentTemp = document.getElementById("current-temp");
const currentUnit = document.getElementById("current-unit");
const currentCondition = document.getElementById("current-condition");
const skySummary = document.getElementById("sky-summary");
const feelsLike = document.getElementById("feels-like");
const highLow = document.getElementById("high-low");
const favoriteBtn = document.getElementById("favorite-btn");
const shareBtn = document.getElementById("share-btn");
const freshness = document.getElementById("freshness");
const noticesList = document.getElementById("notices");
const horizon = document.getElementById("horizon");
const horizonText = document.getElementById("horizon-text");

const alertsBody = document.getElementById("alerts-body");
const radarMapBox = document.getElementById("radar-map");
const radarStart = document.getElementById("radar-start");
const radarBtn = document.getElementById("radar-btn");
const radarControls = document.getElementById("radar-controls");
const radarPlay = document.getElementById("radar-play");
const radarRange = document.getElementById("radar-range");
const radarTime = document.getElementById("radar-time");
const observedNote = document.getElementById("observed");
const detailsGrid = document.getElementById("details-grid");
const nowcastBlock = document.getElementById("nowcast-block");
const nowcastNote = document.getElementById("nowcast-note");
const nowcastText = document.getElementById("nowcast-text");
const nowcastBars = document.getElementById("nowcast-bars");
const nowcastAxis = document.getElementById("nowcast-axis");
const hourlyList = document.getElementById("hourly-list");
const hourlyReadout = document.getElementById("hourly-readout");
const dailyList = document.getElementById("daily-list");
const dailyNote = document.getElementById("daily-note");
const airPanel = document.getElementById("air-panel");
const airNote = document.getElementById("air-note");
const daylightPanel = document.getElementById("daylight-panel");
const favoritesList = document.getElementById("favorites-list");
const recentList = document.getElementById("recent-list");
const placesHint = document.getElementById("places-hint");
const placesStatus = document.getElementById("places-status");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// app data
let unit = "C";
let theme = "light";
let currentCity = null;
let weatherData = null;
let airData = null;
let dataSource = "live";
let favorites = [];
let recentSearches = [];
let favoriteTemps = {};
let suggestionResults = [];
let searchTimer;
let messageTimer;
let latestRequest = 0;
let lastLoaded = 0;
let refreshFailed = false;
let activeHour = 0;
let shownTemp = null;
let dragIndex = -1;
let alerts = { status: "idle", items: [] };

//  api

// fetch json from an address
// requests give up after 12 seconds so a slow network falls back to saved data
async function fetchJson(url) {
  let response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    throw new Error("network error");
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    throw new Error("rate limit");
  }

  if (!response.ok) {
    throw new Error("api error");
  }

  return await response.json();
}

// find cities that match a name
async function getCityResults(name, count) {
  const url = `${geocodingUrl}?name=${encodeURIComponent(name)}&count=${count}&language=en&format=json`;
  const data = await fetchJson(url);
  return data.results || [];
}

// get coordinates for a city name
// supports "city" and "city, country" (for example "Paris, France")
async function getCoordinates(query) {
  const parts = query.split(",").map((part) => part.trim()).filter((part) => part !== "");
  const name = parts[0] || query;
  const place = (parts[1] || "").toLowerCase();

  const results = await getCityResults(name, place ? 10 : 1);

  if (results.length === 0) {
    throw new Error("city not found");
  }

  // if the user typed a country or state, pick the result that matches it
  if (place) {
    const match = results.find((result) => {
      const country = (result.country || "").toLowerCase();
      const region = (result.admin1 || "").toLowerCase();
      const code = (result.country_code || "").toLowerCase();
      return country.startsWith(place) || region.startsWith(place) || code === place;
    });

    if (match) {
      return match;
    }
  }

  return results[0];
}

// get weather data for a city
// past_hours gives three earlier hours, used for the pressure trend
async function getWeather(city) {
  const url = `${weatherUrl}?latitude=${city.latitude}&longitude=${city.longitude}`
    + `&current=${currentFields.join(",")}`
    + `&hourly=${hourlyFields.join(",")}`
    + `&daily=${dailyFields.join(",")}`
    + "&minutely_15=precipitation,precipitation_probability&forecast_minutely_15=12"
    + "&timezone=auto&forecast_days=7&past_hours=3";

  return await fetchJson(url);
}

// get air quality for a city. this never throws, the page works without it
async function getAirQuality(city) {
  try {
    const url = `${airQualityUrl}?latitude=${city.latitude}&longitude=${city.longitude}`
      + `&current=${airFields.join(",")}&timezone=auto`;
    const data = await fetchJson(url);
    return data.current || null;
  } catch (error) {
    return null;
  }
}

// get the place name for coordinates
async function getPlaceName(latitude, longitude) {
  try {
    const url = `${reverseGeocodeUrl}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const data = await fetchJson(url);

    return {
      name: data.city || data.locality || "Your location",
      country: data.countryName || ""
    };
  } catch (error) {
    return { name: "Your location", country: "" };
  }
}

// make a simple city object from an api result
function makeCity(result) {
  return {
    name: result.name,
    country: result.country || "",
    region: result.admin1 || "",
    latitude: result.latitude,
    longitude: result.longitude
  };
}

//  weather codes

// svg markup for a glyph
function glyph(name, className, label) {
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  return `<svg class="${className}" ${a11y}><use href="#${name}"/></svg>`;
}

//  helpers

// convert celsius to the selected unit
function convertTemp(celsius) {
  return core.convertTemp(celsius, unit);
}

// show a temperature with its unit
function formatTemp(celsius) {
  return `${signed(convertTemp(celsius))}°${unit}`;
}

// show a temperature with just the degree sign
function formatDeg(celsius) {
  return `${signed(convertTemp(celsius))}°`;
}

// show wind speed in km/h, or mph when using fahrenheit
function formatWind(kmh) {
  return core.formatWind(kmh, unit);
}

// show visibility in km, or miles when using fahrenheit
function formatDistance(meters) {
  return core.formatDistance(meters, unit);
}

// show rain amounts in mm, or inches when using fahrenheit
function formatRain(mm) {
  return core.formatRain(mm, unit);
}

// find the current hour in the hourly data
function getCurrentHourIndex() {
  return findHourIndex(weatherData.current.time, weatherData.hourly.time);
}

// the city's clock right now, on the same scale as localToMs
function cityNowMs() {
  return Date.now() + (weatherData.utc_offset_seconds || 0) * 1000;
}

// format dates and times
function getLocalDate(timezone) {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long", timeZone: timezone });
  const rest = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: timezone });
  return `${weekday} ${rest}`;
}

function getLocalTime(timezone) {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone });
}

function formatHour(timeText) {
  return new Date(timeText).toLocaleTimeString("en-US", { hour: "numeric" });
}

function formatClock(timeText) {
  return new Date(timeText).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDayName(dateText) {
  return new Date(`${dateText}T00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

function formatDayDate(dateText) {
  return new Date(`${dateText}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

//  messages and loading

// show a message
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageBox.hidden = false;

  clearTimeout(messageTimer);

  // only hide the message by itself when there is weather on the page,
  // otherwise the user would be left with an empty screen
  if (weatherData) {
    messageTimer = setTimeout(hideMessage, 7000);
  }
}

// show error message
function showError(text) {
  showMessage(text, "error");
}

function hideMessage() {
  messageBox.hidden = true;
}

// show or hide loading state
// the first load shows a loading line in the sky, later loads just dim the page
function showLoading(isLoading) {
  loadingBox.hidden = !isLoading || weatherData !== null;
  searchBtn.disabled = isLoading;
  locationBtn.disabled = isLoading;
  weatherContent.classList.toggle("is-loading", isLoading);
  skyContent.classList.toggle("is-loading", isLoading);
  currentCard.setAttribute("aria-busy", isLoading);
}

// turn an error into a friendly message
function getErrorMessage(error) {
  if (error.message === "city not found") {
    return "City not found. Try another location.";
  }

  if (error.message === "rate limit") {
    return "Open-Meteo is getting too many requests right now. Please try again in a minute.";
  }

  if (error.message === "network error" || !navigator.onLine) {
    return "Unable to connect. Check your internet connection.";
  }

  return "Weather data is currently unavailable. Please try again.";
}

//  local storage

// read a value from local storage
// some browsers block storage (for example private mode), so use try/catch
function readValue(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

// move saved data from the old skycast keys to the new hazcast keys
function moveOldData() {
  try {
    for (const [oldKey, newKey] of Object.entries(oldKeys)) {
      const oldValue = localStorage.getItem(oldKey);

      if (oldValue !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldValue);
      }

      localStorage.removeItem(oldKey);
    }
  } catch (error) {
    console.log("could not move old saved data");
  }
}

// read a list of cities from local storage
function readList(key) {
  try {
    const saved = readValue(key);
    const list = saved ? JSON.parse(saved) : [];
    return Array.isArray(list) ? list.filter(isValidCity) : [];
  } catch (error) {
    return [];
  }
}

// save a value in local storage
function saveValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.log("could not save", key);
    return false;
  }
}

function saveFavorites() {
  saveValue(favoritesKey, JSON.stringify(favorites));
}

function loadFavorites() {
  favorites = readList(favoritesKey);
}

function saveRecentSearches() {
  saveValue(recentKey, JSON.stringify(recentSearches));
}

function loadRecentSearches() {
  recentSearches = readList(recentKey);
}

function loadUnit() {
  const saved = readValue(unitKey);

  if (saved === "F") {
    unit = "F";
  }

  updateUnitButtons();
}

function loadTheme() {
  const saved = readValue(themeKey);

  if (saved === "dark" || saved === "light") {
    theme = saved;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    theme = "dark";
  }

  applyTheme();
}

//  weather cache
// the last response for each place is kept so the page can show something
// straight away, and still work when offline or rate limited

function readCache() {
  try {
    const saved = JSON.parse(readValue(cacheKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch (error) {
    return {};
  }
}

function getCached(city) {
  const entry = readCache()[getCityId(city)];
  return entry && entry.data && entry.data.current ? entry : null;
}

function saveToCache(city, data, air) {
  const cache = readCache();
  cache[getCityId(city)] = { data, air, savedAt: Date.now() };

  // keep only the newest few places
  const ids = Object.keys(cache).sort((a, b) => cache[b].savedAt - cache[a].savedAt);
  ids.slice(maxCached).forEach((id) => delete cache[id]);

  if (!saveValue(cacheKey, JSON.stringify(cache))) {
    // storage is full, start again with just this place
    saveValue(cacheKey, JSON.stringify({ [getCityId(city)]: cache[getCityId(city)] }));
  }
}

//  search

// search for a city
async function searchCity(event) {
  event.preventDefault();

  const query = searchInput.value.trim();

  if (query === "") {
    showError("Please type a city name.");
    return;
  }

  hideSuggestions();
  hideMessage();
  showLoading(true);

  // remember this request so an older one cannot finish after it
  const requestId = ++latestRequest;
  let city;

  try {
    const result = await getCoordinates(query);
    city = makeCity(result);
  } catch (error) {
    console.error(error);

    if (requestId === latestRequest) {
      showError(getErrorMessage(error));
      showLoading(false);
    }

    return;
  }

  if (requestId !== latestRequest) return;

  await showCityWeather(city);
}

// get weather for a city and show it
async function showCityWeather(city, saveToRecent = true) {
  hideMessage();
  showLoading(true);

  // if the user clicks another city before this one loads,
  // only the newest request is allowed to update the page
  const requestId = ++latestRequest;

  // show saved data for this place straight away, if there is any
  const cached = getCached(city);
  const switching = !currentCity || getCityId(city) !== getCityId(currentCity);

  if (cached && switching) {
    applyData(city, cached.data, cached.air, "saved", cached.savedAt);
  }

  // air quality loads alongside, but the forecast never waits for it
  const airRequest = getAirQuality(city);

  try {
    const data = await getWeather(city);

    if (requestId !== latestRequest) return;

    const keepAir = cached && !switching ? airData : cached ? cached.air : null;
    applyData(city, data, keepAir, "live", Date.now());
    saveToCache(city, data, keepAir);
    fillAir(city, airRequest, requestId);
    loadAlerts(city);

    if (saveToRecent) {
      addRecentSearch(city);
    }

    searchInput.value = "";
  } catch (error) {
    console.error(error);

    if (requestId !== latestRequest) return;

    if (cached) {
      showMessage(`${getErrorMessage(error)} Showing saved data from ${formatAge(Date.now() - cached.savedAt)}.`, "error");

      if (saveToRecent) {
        addRecentSearch(city);
      }
    } else if (!weatherData) {
      // nothing on screen yet, so offer a way to try again
      showError(getErrorMessage(error));
      messageBox.insertAdjacentHTML("beforeend", ' <button class="message-retry" type="button">Try again</button>');
      messageBox.querySelector(".message-retry").addEventListener("click", () => showCityWeather(city, saveToRecent));
    } else {
      showError(getErrorMessage(error));
    }
  } finally {
    if (requestId === latestRequest) {
      showLoading(false);
    }
  }
}

// show air quality once it arrives, if the same place is still on screen
async function fillAir(city, airRequest, requestId) {
  const air = await airRequest;

  if (requestId !== latestRequest || !air) return;

  airData = air;
  renderAir();
  renderNotices();
  saveToCache(city, weatherData, airData);
}

// put new data on the page
function applyData(city, data, air, source, loadedAt) {
  weatherData = data;
  airData = air;
  currentCity = city;
  dataSource = source;
  lastLoaded = loadedAt;
  refreshFailed = false;
  loadingBox.hidden = true;
  skyContent.hidden = false;
  weatherContent.hidden = false;
  updatePlaceLink(city);

  // alerts belong to one place, so clear them when the place changes
  if (alerts.cityId !== getCityId(city)) {
    alerts = { status: "idle", items: [], cityId: getCityId(city) };
  }

  renderWeather();
  moveRadar();
}

//  share links

// keep the address bar pointing at the place on screen, so it can be copied or bookmarked
function updatePlaceLink(city) {
  try {
    const query = placeToQuery(city);
    if (location.search !== query) {
      history.replaceState(null, "", `${location.pathname}${query}`);
    }
  } catch (error) {
    // some file:// pages do not allow this, the app still works without it
  }
}

// share the place with the system share sheet, or copy the link
async function sharePlace() {
  if (!currentCity) return;

  const link = `${location.origin}${location.pathname}${placeToQuery(currentCity)}`;
  const title = `${currentCity.name} weather on HazCast`;

  if (navigator.share) {
    try {
      await navigator.share({ title, url: link });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(link);
    showMessage("Link copied. Anyone who opens it sees this place.", "info");
  } catch (error) {
    showMessage(`Copy this link to share: ${link}`, "info");
  }
}

// quietly load new data for the city on screen
async function refreshWeather() {
  if (!currentCity || document.hidden) return;

  const city = currentCity;

  try {
    const [data, air] = await Promise.all([getWeather(city), getAirQuality(city)]);

    // skip it if the user opened another city while this was loading
    if (city !== currentCity) return;

    weatherData = data;
    airData = air || airData;
    dataSource = "live";
    lastLoaded = Date.now();
    refreshFailed = false;
    saveToCache(city, data, airData);
    renderWeather();
    loadAlerts(city);
    refreshRadar();
  } catch (error) {
    console.log("could not refresh weather");
    refreshFailed = true;
    renderFreshness();
  }
}

// wait a little after typing, then look for suggestions
function handleSearchInput() {
  clearTimeout(searchTimer);

  const query = searchInput.value.trim();

  if (query.length < 2) {
    if (query.length === 0) {
      showRecentInSearch();
    } else {
      hideSuggestions();
    }
    return;
  }

  searchTimer = setTimeout(() => showSuggestions(query), 300);
}

// fill the drop down with a list of cities
function fillSuggestions(cities, label, icon) {
  suggestionResults = cities;
  suggestionsLabel.textContent = label;

  suggestionsList.innerHTML = cities.map((city, index) => {
    const place = city.country ? `${city.name}, ${city.country}` : city.name;

    return `
      <li>
        <button class="suggestion-btn" type="button" data-index="${index}">
          <svg aria-hidden="true"><use href="#${icon}"/></svg>
          <span class="suggestion-name">${escapeHtml(place)}</span>
          <span class="suggestion-region">${escapeHtml(city.region)}</span>
        </button>
      </li>
    `;
  }).join("");

  suggestionsPanel.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
}

// show city suggestions
async function showSuggestions(query) {
  try {
    const results = await getCityResults(query, 5);

    // ignore old results if the user kept typing
    if (searchInput.value.trim() !== query) {
      return;
    }

    const cities = results.map((result) => makeCity(result));

    if (cities.length === 0) {
      hideSuggestions();
      return;
    }

    fillSuggestions(cities, "Suggestions", "i-pin");
  } catch (error) {
    hideSuggestions();
  }
}

// show recent searches when the search box is empty
function showRecentInSearch() {
  if (recentSearches.length === 0 || searchInput.value.trim() !== "") {
    hideSuggestions();
    return;
  }

  fillSuggestions(recentSearches, "Recent searches", "i-history");
}

function hideSuggestions() {
  suggestionsPanel.hidden = true;
  suggestionsList.innerHTML = "";
  searchInput.setAttribute("aria-expanded", "false");
}

// move between suggestions with the arrow keys
function handleSuggestionKeys(event) {
  const buttons = [...suggestionsList.querySelectorAll(".suggestion-btn")];

  if (buttons.length === 0) return;

  const index = buttons.indexOf(document.activeElement);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    buttons[(index + 1) % buttons.length].focus();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();

    if (index <= 0) {
      searchInput.focus();
    } else {
      buttons[index - 1].focus();
    }
  } else if (event.key === "Escape") {
    hideSuggestions();
    searchInput.focus();
  }
}

// choose a suggested city
function handleSuggestionClick(event) {
  const button = event.target.closest("button");

  if (!button) return;

  const city = suggestionResults[Number(button.dataset.index)];

  if (!city) return;

  hideSuggestions();
  showCityWeather(city);
}

//  current location

// use the browser location
function getCurrentLocation() {
  if (!navigator.geolocation) {
    showError("Your browser does not support geolocation. Search for a city instead.");
    searchInput.focus();
    return;
  }

  hideMessage();
  showLoading(true);

  navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
    timeout: 10000,
    maximumAge: 10 * 60 * 1000
  });
}

async function handleLocationSuccess(position) {
  const latitude = roundCoord(position.coords.latitude);
  const longitude = roundCoord(position.coords.longitude);
  const place = await getPlaceName(latitude, longitude);

  const city = {
    name: place.name,
    country: place.country,
    region: "",
    latitude: latitude,
    longitude: longitude
  };

  await showCityWeather(city);
}

function handleLocationError(error) {
  showLoading(false);

  if (error.code === 1) {
    showError("Location permission was denied. You can still search for any city.");
  } else if (error.code === 2) {
    showError("Location is unavailable. Try searching for a city instead.");
  } else if (error.code === 3) {
    showError("Location request timed out. Please try again, or search for a city.");
  } else {
    showError("Could not get your location. Search for a city instead.");
  }

  searchInput.focus();
}

//  show weather

// show all weather sections
function renderWeather() {
  favoriteTemps[getCityId(currentCity)] = {
    temp: weatherData.current.temperature_2m,
    code: weatherData.current.weather_code,
    isDay: weatherData.current.is_day === 1
  };

  renderSky();
  renderCurrentWeather();
  renderAlerts();
  renderFreshness();
  renderNotices();
  renderHorizon();
  renderDetails();
  renderNowcast();
  renderHourlyForecast();
  renderDailyForecast();
  renderAir();
  renderDaylight();
  renderFavorites();
  renderRecentSearches();
}

// work out dawn, day, dusk or night from the sun times
function getPhase() {
  const daily = weatherData.daily;
  const isDay = weatherData.current.is_day === 1;
  const now = cityNowMs();
  const rise = daily.sunrise && daily.sunrise[0] ? localToMs(daily.sunrise[0]) : NaN;
  const set = daily.sunset && daily.sunset[0] ? localToMs(daily.sunset[0]) : NaN;
  const margin = 50 * 60 * 1000;

  if (!Number.isNaN(rise) && Math.abs(now - rise) < margin) return "dawn";
  if (!Number.isNaN(set) && Math.abs(now - set) < margin) return "dusk";

  return isDay ? "day" : "night";
}

// paint the sky for the current weather
function renderSky() {
  const current = weatherData.current;
  const isDay = current.is_day === 1;
  const info = getWeatherInfo(current.weather_code, isDay);
  const phase = getPhase();
  const mood = `${info.type}-${isDay ? "day" : "night"}`;

  currentCard.dataset.sky = mood;
  currentCard.dataset.phase = phase;
  currentCard.dataset.cover = info.partial ? "partial" : "full";

  // dawn and dusk glow is strongest when the sky is clear
  const glow = { clear: 1, cloudy: 0.55, fog: 0.35, rain: 0.35, snow: 0.45, storm: 0.25 };
  currentCard.style.setProperty("--glow-strength", glow[info.type] ?? 0.5);

  // fade the new gradient in over the old one
  const styles = getComputedStyle(currentCard);
  const top = styles.getPropertyValue("--sky-a").trim();
  const middle = styles.getPropertyValue("--sky-b").trim();
  const bottom = styles.getPropertyValue("--sky-c").trim();
  const gradient = `linear-gradient(180deg, ${top} 0%, ${middle} 58%, ${bottom} 100%)`;
  const layers = currentCard.querySelectorAll(".sky-paint");
  const shown = currentCard.querySelector(".sky-paint.is-current");

  if (!shown || shown.dataset.gradient !== gradient) {
    const next = shown === layers[0] ? layers[1] : layers[0];
    next.style.background = gradient;
    next.dataset.gradient = gradient;
    next.classList.add("is-current");

    if (shown) {
      shown.classList.remove("is-current");
    }
  }

  document.querySelector('meta[name="theme-color"]').setAttribute("content", top);
  updateMasthead();
  skyMotion.set(info.type, info.level);
}

// show current weather
function renderCurrentWeather() {
  const current = weatherData.current;
  const daily = weatherData.daily;
  const isDay = current.is_day === 1;
  const info = getWeatherInfo(current.weather_code, isDay);

  cityName.textContent = currentCity.country ? `${currentCity.name}, ${currentCity.country}` : currentCity.name;
  currentIcon.innerHTML = `<use href="#${info.glyph}"/>`;
  currentIcon.setAttribute("aria-label", info.name);
  currentCondition.textContent = info.name;
  currentUnit.textContent = `°${unit}`;
  animateTemp(convertTemp(current.temperature_2m));

  feelsLike.innerHTML = `Feels like <strong>${formatDeg(current.apparent_temperature)}</strong>`;
  highLow.innerHTML = `High <strong>${formatDeg(daily.temperature_2m_max[0])}</strong> · Low <strong>${formatDeg(daily.temperature_2m_min[0])}</strong>`;
  skySummary.textContent = buildSummary();

  updateClock();
  updateFavoriteButton();
}

// count the big number up or down to its new value
function animateTemp(target) {
  const start = shownTemp;
  shownTemp = target;
  currentTemp.setAttribute("aria-label", `${target} degrees ${unit === "C" ? "Celsius" : "Fahrenheit"}`);

  if (start === null || start === target || reducedMotion.matches) {
    currentTemp.textContent = signed(target);
    return;
  }

  const begin = performance.now();
  const duration = 600;

  function step(now) {
    const progress = Math.min((now - begin) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    currentTemp.textContent = signed(Math.round(start + (target - start) * eased));

    if (progress < 1 && shownTemp === target) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// a short sentence about what is coming, made only from the forecast data
function buildSummary() {
  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const start = getCurrentHourIndex();
  const info = getWeatherInfo(current.weather_code, true);
  const parts = [];

  // feels like
  const difference = convertTemp(current.apparent_temperature) - convertTemp(current.temperature_2m);

  if (difference >= 3) {
    parts.push(`Humid air makes it feel ${difference}° warmer.`);
  } else if (difference <= -3) {
    parts.push(current.wind_speed_10m >= 15 ? `Wind makes it feel ${-difference}° colder.` : `It feels ${-difference}° colder.`);
  }

  // rain in the next 12 hours
  const next = [];

  for (let i = start + 1; i <= start + 12 && i < hourly.time.length; i++) {
    next.push({ time: hourly.time[i], chance: hourly.precipitation_probability[i] ?? 0 });
  }

  const wet = info.type === "rain" || info.type === "storm" || info.type === "snow";

  if (next.length > 0) {
    if (wet) {
      const dry = next.find((hour) => hour.chance < 30);
      parts.push(dry ? `Should ease around ${formatHour(dry.time)}.` : "Likely to continue for the next 12 hours.");
    } else {
      const rain = next.find((hour) => hour.chance >= 60);
      const highest = Math.max(...next.map((hour) => hour.chance));

      if (rain) {
        parts.push(`Rain likely from ${formatHour(rain.time)} (${rain.chance}%).`);
      } else if (highest < 20) {
        parts.push("Dry for the next 12 hours.");
      } else {
        parts.push(`Low chance of rain in the next 12 hours, up to ${highest}%.`);
      }
    }
  }

  return parts.join(" ");
}

// update date and time for the selected city
function updateClock() {
  if (!weatherData) return;

  const timezone = weatherData.timezone;
  currentDate.textContent = getLocalDate(timezone);
  currentTime.textContent = `${getLocalTime(timezone)} local time`;
}

// say whether the data is live or saved, and how old it is
function renderFreshness() {
  if (!weatherData) return;

  const age = formatAge(Date.now() - lastLoaded);
  const stale = Date.now() - lastLoaded > 30 * 60 * 1000;
  const saved = dataSource === "saved" || refreshFailed || stale;

  freshness.classList.toggle("is-saved", saved);

  if (dataSource === "saved") {
    freshness.innerHTML = `Saved data · ${age} <button class="retry-btn" type="button" data-action="retry"><svg aria-hidden="true"><use href="#i-retry"/></svg>Retry</button>`;
  } else if (refreshFailed || stale) {
    freshness.innerHTML = `Updated ${age} · couldn't refresh <button class="retry-btn" type="button" data-action="retry"><svg aria-hidden="true"><use href="#i-retry"/></svg>Retry</button>`;
  } else {
    freshness.textContent = `Live · updated ${age}`;
  }
}

// short notes worked out from the forecast. these are not official warnings
function renderNotices() {
  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const daily = weatherData.daily;
  const start = getCurrentHourIndex();
  const notes = [];
  const nowInfo = getWeatherInfo(current.weather_code, true);

  // official alerts come first and say where they are from
  alerts.items.slice(0, 2).forEach((alert) => {
    notes.push({ strong: true, text: alert.event, source: "National Weather Service" });
  });

  // rain starting or stopping in the next two hours
  const nowcast = getNowcast(weatherData.minutely_15, cityNowMs());

  if (nowcast && nowcast.state === "starting") {
    notes.push({ strong: false, text: `${getRainWord(nowcast.peak)} rain starting around ${formatClock(nowcast.startsAt)}` });
  } else if (nowcast && nowcast.state === "stopping") {
    notes.push({ strong: false, text: `Rain easing off around ${formatClock(nowcast.stopsAt)}` });
  }

  // thunderstorms in the next 12 hours
  if (nowInfo.type !== "storm") {
    for (let i = start + 1; i <= start + 12 && i < hourly.time.length; i++) {
      if (hourly.weather_code[i] >= 95) {
        notes.push({ strong: true, text: `Thunderstorms possible around ${formatHour(hourly.time[i])}` });
        break;
      }
    }
  }

  // heavy rain, 7.6 mm or more in an hour
  for (let i = start; i <= start + 12 && i < hourly.time.length; i++) {
    if ((hourly.precipitation[i] ?? 0) >= 7.6) {
      const when = i === start ? "this hour" : `around ${formatHour(hourly.time[i])}`;
      notes.push({ strong: true, text: `Heavy rain possible ${when}, ${formatRain(hourly.precipitation[i])} in an hour` });
      break;
    }
  }

  // strong gusts right now
  if ((current.wind_gusts_10m ?? 0) >= 50) {
    notes.push({ strong: true, text: `Strong gusts up to ${formatWind(current.wind_gusts_10m)}` });
  }

  // high uv while the sun is up
  if (current.is_day === 1 && (daily.uv_index_max[0] ?? 0) >= 8) {
    notes.push({ strong: false, text: `${getUvLevel(daily.uv_index_max[0])} UV today, peaking at ${Math.round(daily.uv_index_max[0])}` });
  }

  // unhealthy air
  if (airData && airData.us_aqi > 150) {
    notes.push({ strong: true, text: `Unhealthy air, AQI ${Math.round(airData.us_aqi)}` });
  }

  noticesList.innerHTML = notes.slice(0, 3).map((note) => `
    <li class="notice${note.strong ? " is-strong" : ""}">
      <svg aria-hidden="true"><use href="#i-alert"/></svg>
      <span>${escapeHtml(note.text)} <small>· ${note.source ? escapeHtml(note.source) : "from the forecast"}</small></span>
    </li>
  `).join("");
}

// the horizon: a line across the bottom of the sky for the whole local day,
// with the sun's path from sunrise to sunset and where it is now
function renderHorizon() {
  const daily = weatherData.daily;
  const width = horizon.clientWidth || currentCard.clientWidth;
  const height = horizon.clientHeight || 128;

  if (!daily.sunrise[0] || !daily.sunset[0] || width === 0) {
    horizon.innerHTML = "";
    horizonText.textContent = "";
    return;
  }

  const dayStart = localToMs(`${daily.time[0]}T00:00`);
  const dayLength = 24 * 60 * 60 * 1000;
  const rise = localToMs(daily.sunrise[0]);
  const set = localToMs(daily.sunset[0]);
  const now = cityNowMs();
  const pad = Math.max(16, (width - Math.min(width, 1280)) / 2 + 16);
  const usable = width - pad * 2;
  const base = height - 34;
  const peak = Math.min(84, height - 44);
  const xAt = (ms) => pad + ((ms - dayStart) / dayLength) * usable;
  const x1 = xAt(rise);
  const x2 = xAt(set);

  // the sun's path as a smooth arch
  const points = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    points.push([x1 + (x2 - x1) * t, base - Math.sin(Math.PI * t) * peak]);
  }

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(" ");
  const progress = (now - rise) / (set - rise);
  const nowX = Math.min(Math.max(xAt(now), pad), width - pad);
  let marker = "";
  let done = "";
  let spoken;

  if (progress >= 0 && progress <= 1) {
    const sunX = x1 + (x2 - x1) * progress;
    const sunY = base - Math.sin(Math.PI * progress) * peak;
    const donePoints = points.filter((point) => point[0] <= sunX);
    donePoints.push([sunX, sunY]);
    done = `<path class="h-path-done" d="${donePoints.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(" ")}"/>`;
    marker = `<circle class="h-sun-halo" cx="${sunX}" cy="${sunY}" r="14"/><circle class="h-sun" cx="${sunX}" cy="${sunY}" r="6"/>`;
    const hoursLeft = Math.max(0, (set - now) / 3600000);
    spoken = `The sun is up. About ${Math.round(hoursLeft)} hours of daylight left.`;
  } else {
    marker = `<circle class="h-moon" cx="${nowX}" cy="${base + 12}" r="4"/>`;
    spoken = now < rise ? "The sun has not risen yet." : "The sun has set.";
  }

  const riseText = formatClock(daily.sunrise[0]);
  const setText = formatClock(daily.sunset[0]);
  const narrow = width < 520;

  horizon.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <rect class="h-land" x="0" y="${base}" width="${width}" height="${height - base}"/>
      <line class="h-line" x1="0" y1="${base}" x2="${width}" y2="${base}"/>
      <path class="h-path" d="${path}"/>
      ${done}
      <line class="h-line" x1="${nowX}" y1="${base - 6}" x2="${nowX}" y2="${base + 6}"/>
      ${marker}
      <text x="${x1}" y="${base + 20}" text-anchor="middle"><tspan class="h-time">${riseText}</tspan>${narrow ? "" : " sunrise"}</text>
      <text x="${x2}" y="${base + 20}" text-anchor="middle"><tspan class="h-time">${setText}</tspan>${narrow ? "" : " sunset"}</text>
    </svg>
  `;

  horizonText.textContent = `Sunrise ${riseText}, sunset ${setText}. ${spoken}`;
}

// show the instrument readings
function renderDetails() {
  const current = weatherData.current;
  const daily = weatherData.daily;
  const hourly = weatherData.hourly;
  const index = getCurrentHourIndex();

  const visibility = current.visibility ?? hourly.visibility[index];
  const uvNow = current.uv_index;
  const uvMax = daily.uv_index_max[0];
  const rainSum = daily.precipitation_sum ? daily.precipitation_sum[0] : null;
  const rainChance = daily.precipitation_probability_max[0];

  // pressure trend over the last three hours
  let trend = "";
  const earlier = hourly.pressure_msl ? hourly.pressure_msl[index - 3] : null;

  if (current.pressure_msl != null && earlier != null) {
    const change = current.pressure_msl - earlier;

    if (change >= 1) {
      trend = `<span class="trend"><svg aria-hidden="true"><use href="#i-arrow"/></svg>Rising ${change.toFixed(1)} in 3 h</span>`;
    } else if (change <= -1) {
      trend = `<span class="trend"><svg aria-hidden="true" style="transform: rotate(180deg)"><use href="#i-arrow"/></svg>Falling ${(-change).toFixed(1)} in 3 h</span>`;
    } else {
      trend = "Steady over 3 h";
    }
  }

  const windFrom = current.wind_direction_10m;
  const windNote = [
    windFrom != null ? `From ${getWindDirection(windFrom)}` : "",
    current.wind_gusts_10m != null ? `gusts ${formatWind(current.wind_gusts_10m)}` : ""
  ].filter(Boolean).join(", ");

  const items = [
    {
      label: "Humidity",
      value: current.relative_humidity_2m != null ? `${current.relative_humidity_2m} %` : null,
      visual: `<span class="meter"><i style="--pos: ${current.relative_humidity_2m}%; --meter: var(--rain)"></i></span>`,
      note: current.dew_point_2m != null ? `Dew point ${formatDeg(current.dew_point_2m)}` : ""
    },
    {
      label: "Wind",
      value: current.wind_speed_10m != null ? formatWind(current.wind_speed_10m) : null,
      // the arrow points where the wind is blowing to
      visual: windFrom != null ? `<span class="needle" role="img" aria-label="wind from the ${getWindDirection(windFrom)}"><svg aria-hidden="true" style="--deg: ${windFrom + 180}deg"><use href="#i-arrow"/></svg></span>` : "",
      note: windNote
    },
    {
      label: "Pressure",
      value: current.pressure_msl != null ? `${Math.round(current.pressure_msl)} hPa` : null,
      visual: "",
      note: trend
    },
    {
      label: "Visibility",
      value: visibility != null ? formatDistance(visibility) : null,
      visual: visibility != null ? `<span class="meter"><i style="--pos: ${Math.min(visibility / 200, 100)}%"></i></span>` : "",
      note: visibility != null ? getVisibilityLevel(visibility) : ""
    },
    {
      label: "UV index",
      value: uvNow != null ? `${Math.round(uvNow)} ` : null,
      visual: uvNow != null ? `<span class="uv-scale"><i style="--pos: ${Math.min(uvNow / 12, 1) * 100}%"></i></span>` : "",
      note: uvNow != null ? `${getUvLevel(uvNow)} now${uvMax != null ? `, peak ${Math.round(uvMax)} today` : ""}` : ""
    },
    {
      label: "Rain today",
      value: rainSum != null ? formatRain(rainSum) : null,
      visual: rainChance != null ? `<span class="meter"><i style="--pos: ${rainChance}%; --meter: var(--rain)"></i></span>` : "",
      note: rainChance != null ? `Chance up to ${rainChance}% today` : ""
    }
  ];

  // remove readings that have no data
  const availableItems = items.filter((item) => item.value !== null);

  detailsGrid.innerHTML = availableItems.map((item) => {
    const parts = splitUnit(item.value);

    return `
      <div class="reading-cell">
        <span class="reading-label">${item.label}</span>
        <span class="reading-value">${parts.value}<small>${parts.unit}</small></span>
        <span class="reading-visual">${item.visual}</span>
        <span class="reading-note">${item.note}</span>
      </div>
    `;
  }).join("");

  observedNote.textContent = `Model data for ${formatClock(current.time)} local time`;
}

// how heavy 15 minutes of rain is, using hourly rate bands
function getRainWord(amount) {
  const rate = amount * 4;
  if (rate < 2.5) return "Light";
  if (rate < 7.6) return "Moderate";
  return "Heavy";
}

// rain in the next two hours, 15 minutes at a time
// hidden when the api has no 15 minute data, older saved data does not have it
function renderNowcast() {
  const nowcast = getNowcast(weatherData.minutely_15, cityNowMs());

  if (!nowcast) {
    nowcastBlock.hidden = true;
    return;
  }

  nowcastBlock.hidden = false;
  nowcastNote.textContent = "Model estimate in 15 minute steps, not radar";

  const last = nowcast.slots[nowcast.slots.length - 1];
  const amount = formatRain(nowcast.total);

  if (nowcast.state === "dry") {
    nowcastText.innerHTML = `<strong>No rain expected</strong> through ${formatClock(last.to)}`;
  } else if (nowcast.state === "starting") {
    nowcastText.innerHTML = `<strong>${getRainWord(nowcast.peak)} rain from around ${formatClock(nowcast.startsAt)}</strong> about ${amount} in total`;
  } else if (nowcast.state === "stopping") {
    nowcastText.innerHTML = `<strong>Rain easing off around ${formatClock(nowcast.stopsAt)}</strong> about ${amount} still to fall`;
  } else {
    nowcastText.innerHTML = `<strong>${getRainWord(nowcast.peak)} rain for the next two hours</strong> about ${amount} in total`;
  }

  // bars scale to 10 mm an hour, square root so light rain still shows
  nowcastBars.innerHTML = nowcast.slots.map((slot, index) => {
    const height = Math.min(1, Math.sqrt((slot.amount * 4) / 10));
    const wet = slot.amount >= 0.1;
    const label = `${index === 0 ? "Now" : formatClock(slot.from)} to ${formatClock(slot.to)}: ${wet ? formatRain(slot.amount) : "dry"}`;

    return `
      <li class="nowcast-slot${wet ? " is-wet" : ""}" style="--h: ${height.toFixed(3)}">
        <span class="nowcast-bar" aria-hidden="true"></span>
        <span class="visually-hidden">${label}</span>
      </li>
    `;
  }).join("");

  const middle = nowcast.slots[Math.floor(nowcast.slots.length / 2)];
  nowcastAxis.innerHTML = `<span>Now</span><span>${formatClock(middle.from)}</span><span>${formatClock(last.to)}</span>`;
}

// show the next 24 hours as a temperature curve with rain and wind under it
function renderHourlyForecast() {
  const hourly = weatherData.hourly;
  const start = getCurrentHourIndex();
  const hours = hourly.time.slice(start, start + 24);

  if (hours.length === 0) {
    hourlyList.innerHTML = '<p class="empty-text">Hourly forecast is not available.</p>';
    return;
  }

  const temps = hours.map((time, position) => hourly.temperature_2m[start + position]);
  const low = Math.min(...temps);
  const high = Math.max(...temps);
  const range = high - low || 1;

  // columns fill the width on large screens and scroll on small ones
  const column = Math.max(52, Math.floor((hourlyList.clientWidth || 1000) / hours.length));
  const zoneTop = 52;
  const zoneHeight = 128;
  const yFor = (temp) => 36 + (1 - (temp - low) / range) * 78;

  const items = hours.map((time, position) => {
    const index = start + position;
    const isDay = hourly.is_day[index] === 1;
    const info = getWeatherInfo(hourly.weather_code[index], isDay);
    const label = position === 0 ? "Now" : formatHour(time);
    const chance = hourly.precipitation_probability[index];
    const wind = hourly.wind_speed_10m ? hourly.wind_speed_10m[index] : null;
    const windDir = hourly.wind_direction_10m ? hourly.wind_direction_10m[index] : null;
    const windText = wind != null ? splitUnit(formatWind(wind)).value : "";

    const spoken = [
      label,
      info.name,
      formatTemp(temps[position]),
      chance != null ? `${chance}% chance of rain` : "",
      wind != null ? `wind ${formatWind(wind)}${windDir != null ? ` from ${getWindDirection(windDir)}` : ""}` : ""
    ].filter(Boolean).join(", ");

    return `
      <li class="hour${position === 0 ? " is-now" : ""}" data-position="${position}">
        <span class="visually-hidden">${spoken}</span>
        <span class="hour-time" aria-hidden="true">${label}</span>
        ${glyph(info.glyph, "hour-glyph")}
        <span class="hour-temp-zone" aria-hidden="true" style="--y: ${yFor(temps[position]).toFixed(1)}px">
          <span class="hour-temp">${formatDeg(temps[position])}</span>
          <span class="hour-dot"></span>
        </span>
        <span class="hour-rain" aria-hidden="true" style="--p: ${chance ?? 0}">
          <span>${chance != null ? `${chance}%` : "–"}</span>
          <i></i>
        </span>
        <span class="hour-wind" aria-hidden="true">
          ${windDir != null ? `<svg style="--deg: ${windDir + 180}deg"><use href="#i-arrow"/></svg>` : ""}${windText}
        </span>
      </li>
    `;
  });

  // the curve through every hour, drawn with smooth bezier segments
  const points = temps.map((temp, position) => [column * (position + 0.5), zoneTop + yFor(temp)]);
  let line = `M${points[0][0]} ${points[0][1].toFixed(1)}`;

  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mid = (x0 + x1) / 2;
    line += ` C${mid} ${y0.toFixed(1)} ${mid} ${y1.toFixed(1)} ${x1} ${y1.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  const area = `${line} L${last[0]} ${zoneTop + zoneHeight} L${points[0][0]} ${zoneTop + zoneHeight} Z`;
  const totalWidth = column * hours.length;
  const totalHeight = 22 + 30 + zoneHeight + 52 + 26;

  // mark where a new day starts
  const dayLines = hours.map((time, position) => {
    if (position === 0 || !time.endsWith("T00:00")) return "";
    const x = column * position;
    return `<line class="c-day" x1="${x}" y1="0" x2="${x}" y2="${totalHeight}"/><text class="c-day-label" x="${x + 6}" y="${zoneTop + 12}">${formatDayName(time.slice(0, 10))}</text>`;
  }).join("");

  hourlyList.innerHTML = `
    <ol class="hourly-track" style="--col: ${column}px">
      <svg class="hourly-curve" width="${totalWidth}" height="${totalHeight}" aria-hidden="true">
        ${dayLines}
        <path class="c-area" d="${area}"/>
        <path class="c-line" d="${line}"/>
      </svg>
      ${items.join("")}
    </ol>
  `;

  setActiveHour(Math.min(activeHour, hours.length - 1), false);
  updateHourlyFade();
}

// fade the edges of the hourly chart while there is more to scroll
function updateHourlyFade() {
  const more = hourlyList.scrollWidth - hourlyList.clientWidth;
  hourlyList.classList.toggle("fade-right", more > 4 && hourlyList.scrollLeft < more - 4);
  hourlyList.classList.toggle("fade-left", hourlyList.scrollLeft > 4);
}

// highlight one hour and describe it in the readout
function setActiveHour(position, scroll) {
  const items = hourlyList.querySelectorAll(".hour");

  if (items.length === 0) return;

  activeHour = Math.max(0, Math.min(position, items.length - 1));
  items.forEach((item, index) => item.classList.toggle("is-active", index === activeHour && activeHour !== 0));

  const hourly = weatherData.hourly;
  const index = getCurrentHourIndex() + activeHour;
  const info = getWeatherInfo(hourly.weather_code[index], hourly.is_day[index] === 1);
  const chance = hourly.precipitation_probability[index];
  const amount = hourly.precipitation[index];
  const wind = hourly.wind_speed_10m ? hourly.wind_speed_10m[index] : null;
  const windDir = hourly.wind_direction_10m ? hourly.wind_direction_10m[index] : null;
  const label = activeHour === 0 ? "This hour" : formatHour(hourly.time[index]);

  const parts = [
    `<strong>${label}</strong>`,
    escapeHtml(info.name),
    `<strong>${formatDeg(hourly.temperature_2m[index])}</strong>`,
    chance != null ? `rain ${chance}%${amount ? `, ${formatRain(amount)}` : ""}` : "",
    wind != null ? `wind ${formatWind(wind)}${windDir != null ? ` ${getWindDirection(windDir)}` : ""}` : ""
  ].filter(Boolean);

  hourlyReadout.innerHTML = parts.join(" · ");

  if (scroll) {
    items[activeHour].scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
  }
}

// keyboard and pointer support for the hourly chart
function handleHourlyKeys(event) {
  const keys = { ArrowRight: 1, ArrowLeft: -1, Home: -100, End: 100 };

  if (!(event.key in keys)) return;

  event.preventDefault();
  setActiveHour(activeHour + keys[event.key], true);
}

function handleHourlyPointer(event) {
  const item = event.target.closest(".hour");

  if (item) {
    setActiveHour(Number(item.dataset.position), false);
  }
}

// show the seven days as temperature ranges on one shared scale
function renderDailyForecast() {
  const daily = weatherData.daily;
  const lows = daily.temperature_2m_min;
  const highs = daily.temperature_2m_max;
  const weekLow = Math.min(...lows);
  const weekHigh = Math.max(...highs);
  const range = weekHigh - weekLow || 1;

  dailyList.innerHTML = daily.time.map((date, index) => {
    const info = getWeatherInfo(daily.weather_code[index], true);
    const dayName = index === 0 ? "Today" : formatDayName(date);
    const chance = daily.precipitation_probability_max[index];
    const amount = daily.precipitation_sum ? daily.precipitation_sum[index] : null;
    const lowN = (lows[index] - weekLow) / range;
    const highN = (highs[index] - weekLow) / range;

    // the column leaves room above and below for the labels
    const lowPct = 14 + lowN * 72;
    const highPct = 14 + highN * 72;
    const colorLow = tempColor(lows[index]);
    const colorHigh = tempColor(highs[index]);

    const spoken = `${index === 0 ? "Today" : new Date(`${date}T00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}: ${info.name}, high ${formatTemp(highs[index])}, low ${formatTemp(lows[index])}${chance != null ? `, ${chance}% chance of rain` : ""}${amount ? `, ${formatRain(amount)}` : ""}`;

    return `
      <li class="day${index === 0 ? " is-today" : ""}" style="--lo: ${lowPct}%; --hi: ${highPct}%; --lo-n: ${lowN}; --hi-n: ${highN}; --bar: linear-gradient(to top, ${colorLow}, ${colorHigh}); --bar-x: linear-gradient(to right, ${colorLow}, ${colorHigh})">
        <span class="visually-hidden">${spoken}</span>
        <span class="day-name" aria-hidden="true">${dayName}</span>
        <span class="day-date" aria-hidden="true">${formatDayDate(date)}</span>
        ${glyph(info.glyph, "day-glyph")}
        <span class="day-range" aria-hidden="true">
          <span class="day-bar"></span>
          <span class="day-hi">${formatDeg(highs[index])}</span>
          <span class="day-lo">${formatDeg(lows[index])}</span>
        </span>
        <span class="day-rain" aria-hidden="true">
          <strong>${chance != null ? `${chance}%` : "–"}</strong>
          ${amount ? formatRain(amount) : "dry"}
        </span>
        <span class="day-condition" aria-hidden="true">${info.name}</span>
      </li>
    `;
  }).join("");

  dailyNote.textContent = `Week range ${formatDeg(weekLow)} to ${formatDeg(weekHigh)} · rain chance and amount`;
}

// show air quality and pollen
function renderAir() {
  if (!airData || airData.us_aqi == null) {
    airNote.textContent = "";
    airPanel.innerHTML = '<p class="empty-text">Air quality data is not available for this place right now.</p>';
    return;
  }

  const aqi = Math.round(airData.us_aqi);
  const level = getAqiLevel(aqi);
  const rows = [
    ["PM2.5", airData.pm2_5],
    ["PM10", airData.pm10],
    ["Ozone", airData.ozone],
    ["Nitrogen dioxide", airData.nitrogen_dioxide]
  ].filter((row) => row[1] != null);

  const pollen = [
    ["Grass pollen", airData.grass_pollen],
    ["Birch pollen", airData.birch_pollen],
    ["Alder pollen", airData.alder_pollen],
    ["Ragweed pollen", airData.ragweed_pollen]
  ].filter((row) => row[1] != null);

  airNote.textContent = `US AQI · ${formatClock(airData.time)} local`;

  airPanel.innerHTML = `
    <div class="air-top">
      <span class="air-index">${aqi}</span>
      <span class="air-level">${level.name}<small>${level.note}</small></span>
    </div>
    <div class="aqi-scale" role="img" aria-label="air quality index ${aqi}, ${level.name}"><i style="--pos: ${getAqiPosition(aqi)}%"></i></div>
    <dl class="data-rows">
      ${rows.map((row) => `<div class="data-row"><dt>${row[0]}</dt><dd>${Math.round(row[1])} <small>µg/m³</small></dd></div>`).join("")}
      ${pollen.map((row) => `<div class="data-row"><dt>${row[0]}</dt><dd>${getPollenLevel(row[1])} <small>${Math.round(row[1])} grains/m³</small></dd></div>`).join("")}
    </dl>
    <p class="source-note">${pollen.length === 0 ? "Pollen counts are only available for Europe. " : ""}Modelled by CAMS through Open-Meteo, not a local sensor.</p>
  `;
}

// show sunrise, sunset and day length
function renderDaylight() {
  const daily = weatherData.daily;

  if (!daily.sunrise[0] || !daily.sunset[0]) {
    daylightPanel.innerHTML = '<p class="empty-text">Sunrise and sunset times are not available.</p>';
    return;
  }

  const rise = localToMs(daily.sunrise[0]);
  const set = localToMs(daily.sunset[0]);
  const now = cityNowMs();
  const progress = Math.min(Math.max((now - rise) / (set - rise), 0), 1);
  const length = daily.daylight_duration ? daily.daylight_duration[0] : (set - rise) / 1000;
  const tomorrow = daily.daylight_duration ? daily.daylight_duration[1] : null;

  let change = "";
  if (tomorrow != null) {
    const minutes = Math.round((tomorrow - length) / 60);
    change = minutes === 0 ? "About the same tomorrow" : `${Math.abs(minutes)} min ${minutes > 0 ? "longer" : "shorter"} tomorrow`;
  }

  // the whole local day as a band: night, daylight, night, with a marker for now
  const dayStart = localToMs(`${daily.time[0]}T00:00`);
  const dayMs = 24 * 60 * 60 * 1000;
  const risePct = Math.min(Math.max(((rise - dayStart) / dayMs) * 100, 0), 100);
  const setPct = Math.min(Math.max(((set - dayStart) / dayMs) * 100, 0), 100);
  const nowPct = Math.min(Math.max(((now - dayStart) / dayMs) * 100, 0), 100);
  const share = Math.round((length / 86400) * 100);
  const isUp = progress > 0 && progress < 1;

  daylightPanel.innerHTML = `
    <div class="light-band" role="img" aria-label="daylight is ${share}% of today, from ${formatClock(daily.sunrise[0])} to ${formatClock(daily.sunset[0])}" style="--rise: ${risePct}%; --set: ${setPct}%; --now: ${nowPct}%">
      <span class="light-day"></span>
      <span class="light-now${isUp ? " is-up" : ""}"></span>
    </div>
    <div class="light-scale" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
    <p class="light-share"><strong>${share}%</strong> of today is daylight</p>
    <dl class="data-rows">
      <div class="data-row"><dt>Sunrise</dt><dd>${formatClock(daily.sunrise[0])}</dd></div>
      <div class="data-row"><dt>Sunset</dt><dd>${formatClock(daily.sunset[0])}</dd></div>
      <div class="data-row"><dt>Daylight</dt><dd>${formatDuration(length)}${change ? ` <small>· ${change}</small>` : ""}</dd></div>
      ${daily.sunrise[1] ? `<div class="data-row"><dt>Sunrise tomorrow</dt><dd>${formatClock(daily.sunrise[1])}</dd></div>` : ""}
    </dl>
  `;
}

//  sky motion
// a light canvas layer for rain and snow. it runs at about 30 frames a second,
// pauses when the sky is off screen or the tab is hidden, and never runs with reduced motion

const skyMotion = (() => {
  const canvas = document.getElementById("sky-canvas");
  const flash = currentCard.querySelector(".sky-flash");
  const context = canvas.getContext("2d");
  let kind = null;
  let level = 0;
  let particles = [];
  let frame = null;
  let lastTime = 0;
  let onScreen = true;
  let flashTimer = null;
  let width = 0;
  let height = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    seed();
  }

  function seed() {
    const density = { 1: 0.05, 2: 0.1, 3: 0.17 }[level] || 0.08;
    const count = kind ? Math.round((width / 10) * density * 10) : 0;
    particles = Array.from({ length: Math.min(count, 260) }, () => makeParticle(true));
  }

  function makeParticle(anywhere) {
    const isSnow = kind === "snow";

    return {
      x: Math.random() * (width + 100) - 50,
      y: anywhere ? Math.random() * height : -20,
      speed: isSnow ? 20 + Math.random() * 30 : 520 + Math.random() * 380 + level * 120,
      length: isSnow ? 1 + Math.random() * 2 : 10 + Math.random() * 14,
      sway: Math.random() * Math.PI * 2,
      alpha: isSnow ? 0.45 + Math.random() * 0.45 : 0.14 + Math.random() * 0.22
    };
  }

  function draw(time) {
    frame = requestAnimationFrame(draw);

    // about 30 frames a second is plenty for rain
    if (time - lastTime < 32) return;

    const seconds = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    context.clearRect(0, 0, width, height);

    const ink = getComputedStyle(currentCard).getPropertyValue("--particle").trim() || "#ffffff";
    context.strokeStyle = ink;
    context.fillStyle = ink;
    context.lineCap = "round";

    for (const particle of particles) {
      particle.y += particle.speed * seconds;

      if (kind === "snow") {
        particle.sway += seconds;
        particle.x += Math.sin(particle.sway) * 12 * seconds;
        context.globalAlpha = particle.alpha;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.length, 0, Math.PI * 2);
        context.fill();
      } else {
        particle.x -= particle.speed * 0.12 * seconds;
        context.globalAlpha = particle.alpha;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x + particle.length * 0.12, particle.y - particle.length);
        context.stroke();
      }

      if (particle.y - particle.length > height) {
        Object.assign(particle, makeParticle(false));
      }
    }

    context.globalAlpha = 1;
  }

  function scheduleFlash() {
    clearTimeout(flashTimer);

    if (kind !== "storm" || reducedMotion.matches) return;

    flashTimer = setTimeout(() => {
      if (onScreen && !document.hidden) {
        flash.style.setProperty("--flash-x", `${20 + Math.random() * 60}%`);
        flash.classList.remove("is-on");
        void flash.offsetWidth;
        flash.classList.add("is-on");
      }

      scheduleFlash();
    }, 9000 + Math.random() * 9000);
  }

  function shouldRun() {
    return kind && !reducedMotion.matches && onScreen && !document.hidden;
  }

  function update() {
    if (shouldRun() && frame === null) {
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    } else if (!shouldRun() && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }

    if (!kind || reducedMotion.matches) {
      context.clearRect(0, 0, width, height);
    }
  }

  // rain, drizzle and storms get rain. snow gets snow. everything else stays still
  function set(type, newLevel) {
    const newKind = type === "rain" || type === "storm" ? (type === "storm" ? "storm" : "rain") : type === "snow" ? "snow" : null;
    const changed = newKind !== kind || newLevel !== level;
    kind = newKind;
    level = type === "storm" ? 3 : newLevel;

    if (changed) {
      if (width === 0) resize();
      else seed();
      scheduleFlash();
    }

    update();
  }

  new ResizeObserver(() => {
    resize();
  }).observe(canvas);

  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    update();
  }).observe(currentCard);

  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", update);

  return { set };
})();

//  official alerts

// get active alerts from the us national weather service
// only us places are asked, the service does not cover anywhere else
async function loadAlerts(city) {
  const cityId = getCityId(city);

  if (!isInUsCoverage(city.latitude, city.longitude, city.country)) {
    alerts = { status: "unsupported", items: [], cityId };
    renderAlerts();
    return;
  }

  if (alerts.cityId !== cityId || alerts.status !== "ok") {
    alerts = { status: "loading", items: [], cityId };
    renderAlerts();
  }

  try {
    const data = await fetchJson(`${alertsUrl}?point=${roundCoord(city.latitude)},${roundCoord(city.longitude)}`);
    if (!currentCity || getCityId(currentCity) !== cityId) return;

    const now = Date.now();
    const items = (data.features || [])
      .map((feature) => feature.properties || {})
      .filter((alert) => alert.event && Date.parse(alert.ends || alert.expires || 0) > now)
      .map((alert) => ({
        event: String(alert.event),
        severity: String(alert.severity || ""),
        headline: String(alert.headline || ""),
        area: String(alert.areaDesc || ""),
        description: String(alert.description || ""),
        instruction: String(alert.instruction || ""),
        ends: alert.ends || alert.expires,
        sender: String(alert.senderName || "National Weather Service")
      }));

    alerts = { status: "ok", items, cityId };
  } catch (error) {
    if (!currentCity || getCityId(currentCity) !== cityId) return;
    alerts = { status: "error", items: [], cityId };
  }

  renderAlerts();
  renderNotices();
}

// show alerts, or say plainly why there are none
function renderAlerts() {
  const place = currentCity ? escapeHtml(currentCity.country || currentCity.name) : "this place";
  const link = currentCity
    ? `https://forecast.weather.gov/MapClick.php?lat=${roundCoord(currentCity.latitude)}&lon=${roundCoord(currentCity.longitude)}`
    : "https://www.weather.gov/";

  if (alerts.status === "unsupported") {
    alertsBody.innerHTML = `<p class="alerts-line">Not available for ${place}. HazCast only reads official alerts from the US National Weather Service, so check your national weather service for warnings.</p>`;
    return;
  }

  if (alerts.status === "loading" || alerts.status === "idle") {
    alertsBody.innerHTML = '<p class="alerts-line">Checking the National Weather Service…</p>';
    return;
  }

  if (alerts.status === "error") {
    alertsBody.innerHTML = `<p class="alerts-line">Could not reach the National Weather Service. <a href="${link}" target="_blank" rel="noopener">Check weather.gov</a> for alerts.</p>`;
    return;
  }

  if (alerts.items.length === 0) {
    alertsBody.innerHTML = '<p class="alerts-line"><span class="alerts-clear" aria-hidden="true"></span>No active National Weather Service alerts for this point.</p>';
    return;
  }

  const timezone = weatherData ? weatherData.timezone : undefined;

  alertsBody.innerHTML = `<ul class="alerts-list">${alerts.items.map((alert) => {
    const until = alert.ends
      ? new Date(alert.ends).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: timezone })
      : "";

    return `
      <li class="alert-item${/extreme|severe/i.test(alert.severity) ? " is-severe" : ""}">
        <details>
          <summary>
            <svg aria-hidden="true"><use href="#i-alert"/></svg>
            <strong>${escapeHtml(alert.event)}</strong>
            ${until ? `<span>until ${escapeHtml(until)}</span>` : ""}
          </summary>
          <div class="alert-text">
            ${alert.headline ? `<p><strong>${escapeHtml(alert.headline)}</strong></p>` : ""}
            ${alert.area ? `<p class="alert-area">${escapeHtml(alert.area)}</p>` : ""}
            ${alert.description ? `<p class="alert-description">${escapeHtml(alert.description)}</p>` : ""}
            ${alert.instruction ? `<p class="alert-description">${escapeHtml(alert.instruction)}</p>` : ""}
            <p class="alert-source">Issued by ${escapeHtml(alert.sender)}. <a href="${link}" target="_blank" rel="noopener">Full details on weather.gov</a></p>
          </div>
        </details>
      </li>
    `;
  }).join("")}</ul>`;
}

//  radar

const radar = {
  map: null,
  base: null,
  marker: null,
  frames: [],
  layers: [],
  index: 0,
  timer: null,
  loadedAt: 0,
  opening: false
};

// add a pinned css or js file to the page once
function loadFile(type, url, hash) {
  return new Promise((resolve, reject) => {
    const element = document.createElement(type === "css" ? "link" : "script");

    if (type === "css") {
      element.rel = "stylesheet";
      element.href = url;
    } else {
      element.src = url;
    }

    element.integrity = hash;
    element.crossOrigin = "anonymous";
    element.onload = resolve;
    element.onerror = () => reject(new Error("network error"));
    document.head.appendChild(element);
  });
}

// openstreetmap base map, greyed in css so the radar colors stand out
function getBaseLayer() {
  return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 10,
    className: "radar-base",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
}

// open the radar the first time it is asked for
async function openRadar() {
  if (radar.opening || radar.map || !currentCity) return;

  radar.opening = true;
  radarBtn.disabled = true;
  radarBtn.textContent = "Loading radar…";

  try {
    if (!window.L) {
      await Promise.all([
        loadFile("css", leafletFiles.css, leafletFiles.cssHash),
        loadFile("js", leafletFiles.js, leafletFiles.jsHash)
      ]);
    }

    radar.map = L.map(radarMapBox, {
      center: [currentCity.latitude, currentCity.longitude],
      zoom: 7,
      minZoom: 3,
      maxZoom: 10,
      scrollWheelZoom: false
    });

    radar.base = getBaseLayer().addTo(radar.map);
    radar.marker = L.circleMarker([currentCity.latitude, currentCity.longitude], {
      radius: 6,
      weight: 2,
      color: "#132120",
      fillColor: "#f0c84b",
      fillOpacity: 1
    }).addTo(radar.map);

    radarStart.hidden = true;
    radarControls.hidden = false;
    await loadRadarFrames();
  } catch (error) {
    console.error(error);

    if (radar.map) {
      radar.map.remove();
      radar.map = null;
    }

    radarStart.hidden = false;
    radarControls.hidden = true;
    radarStart.querySelector("p").textContent = "Could not load the radar. Check your connection and try again.";
    radarBtn.disabled = false;
    radarBtn.textContent = "Try again";
  } finally {
    radar.opening = false;
  }
}

// get the list of past radar frames and make a layer for each
async function loadRadarFrames() {
  const data = await fetchJson(radarListUrl);
  const past = data && data.radar && Array.isArray(data.radar.past) ? data.radar.past : [];

  if (!data.host || past.length === 0) {
    radarTime.textContent = "No radar frames available right now.";
    return;
  }

  stopRadar();
  radar.layers.forEach((layer) => radar.map.removeLayer(layer));

  radar.frames = past;
  radar.layers = past.map((frame) => L.tileLayer(`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
    opacity: 0,
    maxNativeZoom: 7,
    maxZoom: 10,
    attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>'
  }));
  radar.loadedAt = Date.now();

  radarRange.max = String(past.length - 1);
  showRadarFrame(past.length - 1);
}

// show one frame, the others stay on the map but hidden so playback is smooth
function showRadarFrame(index) {
  const layer = radar.layers[index];
  if (!layer) return;

  if (!radar.map.hasLayer(layer)) layer.addTo(radar.map);

  radar.layers.forEach((other, otherIndex) => other.setOpacity(otherIndex === index ? 0.75 : 0));
  radar.index = index;
  radarRange.value = String(index);

  // load the next frame ahead of time
  const next = radar.layers[(index + 1) % radar.layers.length];
  if (next && !radar.map.hasLayer(next)) next.addTo(radar.map);

  const time = new Date(radar.frames[index].time * 1000);
  const clock = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: weatherData ? weatherData.timezone : undefined
  });
  const minutesAgo = Math.round((Date.now() - time.getTime()) / 60000);
  const label = `${clock} local time, ${minutesAgo < 1 ? "just now" : `${minutesAgo} min ago`}`;

  radarTime.textContent = label;
  radarRange.setAttribute("aria-valuetext", label);
}

function playRadar() {
  if (radar.timer || radar.layers.length < 2) return;

  radarPlay.textContent = "Pause";
  radarPlay.setAttribute("aria-pressed", "true");
  radar.timer = setInterval(() => {
    if (document.hidden) return;
    showRadarFrame((radar.index + 1) % radar.layers.length);
  }, 700);
}

function stopRadar() {
  clearInterval(radar.timer);
  radar.timer = null;
  radarPlay.textContent = "Play";
  radarPlay.setAttribute("aria-pressed", "false");
}

function toggleRadarPlay() {
  if (radar.timer) stopRadar();
  else playRadar();
}

function handleRadarRange() {
  stopRadar();
  showRadarFrame(Number(radarRange.value));
}

// follow the place on screen
function moveRadar() {
  if (!radar.map || !currentCity) return;

  const point = [currentCity.latitude, currentCity.longitude];
  radar.map.setView(point, radar.map.getZoom());
  radar.marker.setLatLng(point);
}

// new frames arrive every 10 minutes
async function refreshRadar() {
  if (!radar.map || Date.now() - radar.loadedAt < 10 * 60 * 1000) return;

  try {
    await loadRadarFrames();
  } catch (error) {
    console.log("could not refresh radar");
  }
}


//  masthead

// the masthead sits on the sky at the top, and turns solid once you scroll past it
// in between, it takes the sky's own top color so text never runs under it
function updateMasthead() {
  const solid = window.scrollY > currentCard.offsetHeight - masthead.offsetHeight - 8;
  masthead.classList.toggle("is-solid", solid);
  masthead.classList.toggle("is-scrolled", !solid && window.scrollY > 4);

  if (!solid) {
    const styles = getComputedStyle(currentCard);
    masthead.style.setProperty("--head-ink", styles.getPropertyValue("--sky-ink").trim() || "#ffffff");
    masthead.style.setProperty("--head-bg", styles.getPropertyValue("--sky-a").trim() || "#2c3c45");
  } else {
    masthead.style.removeProperty("--head-ink");
  }
}

// the sky slides under the masthead, so it needs to know how tall the masthead is
function trackMastheadHeight() {
  const setHeight = () => document.documentElement.style.setProperty("--masthead-h", `${masthead.offsetHeight}px`);
  new ResizeObserver(setHeight).observe(masthead);
  setHeight();
}

//  temperature unit

// change between celsius and fahrenheit
function changeUnit(newUnit) {
  unit = newUnit;
  saveValue(unitKey, unit);
  updateUnitButtons();
  shownTemp = null;

  if (weatherData) {
    renderWeather();
  } else {
    renderFavorites();
  }
}

function updateUnitButtons() {
  unitCBtn.classList.toggle("active", unit === "C");
  unitFBtn.classList.toggle("active", unit === "F");
  unitCBtn.setAttribute("aria-pressed", unit === "C");
  unitFBtn.setAttribute("aria-pressed", unit === "F");
}

//  theme

function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  saveValue(themeKey, theme);
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", theme);

  if (theme === "dark") {
    themeBtn.innerHTML = '<svg aria-hidden="true"><use href="#g-sun"/></svg>';
    themeBtn.setAttribute("aria-label", "switch to light mode");
  } else {
    themeBtn.innerHTML = '<svg aria-hidden="true"><use href="#g-moon"/></svg>';
    themeBtn.setAttribute("aria-label", "switch to dark mode");
  }
}

//  favorites

function isFavorite(city) {
  return favorites.some((item) => getCityId(item) === getCityId(city));
}

// add or remove the current city
function toggleFavorite() {
  if (!currentCity) return;

  if (isFavorite(currentCity)) {
    removeFavorite(currentCity);
  } else {
    addFavorite(currentCity);
  }
}

function addFavorite(city) {
  if (favorites.length >= maxFavorites) {
    showError(`You can save up to ${maxFavorites} places.`);
    return;
  }

  favorites.push(city);
  saveFavorites();
  renderFavorites();
  renderRecentSearches();
  updateFavoriteButton();
}

function removeFavorite(city) {
  favorites = favorites.filter((item) => getCityId(item) !== getCityId(city));
  saveFavorites();
  renderFavorites();
  renderRecentSearches();
  updateFavoriteButton();
}

// update the save button
function updateFavoriteButton() {
  if (!currentCity) return;

  const saved = isFavorite(currentCity);

  favoriteBtn.classList.toggle("saved", saved);
  favoriteBtn.setAttribute("aria-pressed", saved);
  favoriteBtn.innerHTML = `<svg aria-hidden="true"><use href="#i-pin"/></svg>${saved ? "Saved" : "Save place"}`;
}

// is this the place on screen
function isCurrent(city) {
  return currentCity !== null && getCityId(city) === getCityId(currentCity);
}

// show saved places
function renderFavorites() {
  if (favorites.length === 0) {
    favoritesList.innerHTML = '<li class="places-empty">Save a place to keep it here.</li>';
    return;
  }

  const canMove = favorites.length > 1;
  placesHint.hidden = !canMove;

  favoritesList.innerHTML = favorites.map((city, index) => {
    const saved = favoriteTemps[getCityId(city)];
    const tempText = saved ? formatDeg(saved.temp) : "";
    const info = saved && saved.code != null ? getWeatherInfo(saved.code, saved.isDay) : null;
    const name = escapeHtml(city.name);
    const current = isCurrent(city);

    return `
      <li class="place-item${current ? " is-current" : ""}" data-index="${index}"${canMove ? ' draggable="true"' : ""}>
        <button class="city-btn" type="button" data-action="load" data-index="${index}"${current ? ' aria-current="true"' : ""}${canMove ? ' aria-describedby="places-hint"' : ""}>
          ${info ? glyph(info.glyph, "", info.name) : ""}
          <span class="city-name">${name}</span>
          <span class="city-temp">${tempText}</span>
        </button>
        <button class="city-remove" type="button" data-action="remove" data-index="${index}" aria-label="remove ${name} from saved places">
          <svg aria-hidden="true"><use href="#i-close"/></svg>
        </button>
      </li>
    `;
  }).join("");
}

// get the current temperature for every saved place
async function loadFavoriteTemps() {
  const requests = favorites.map(async (city) => {
    try {
      const url = `${weatherUrl}?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,weather_code,is_day`;
      const data = await fetchJson(url);
      favoriteTemps[getCityId(city)] = {
        temp: data.current.temperature_2m,
        code: data.current.weather_code,
        isDay: data.current.is_day === 1
      };
    } catch (error) {
      console.log("could not load temperature for", city.name);
    }
  });

  await Promise.all(requests);
  renderFavorites();
}

// handle clicks inside the saved places list
function handleFavoritesClick(event) {
  const button = event.target.closest("button");

  if (!button) return;

  const city = favorites[Number(button.dataset.index)];

  if (!city) return;

  if (button.dataset.action === "load") {
    showCityWeather(city);
  } else if (button.dataset.action === "remove") {
    removeFavorite(city);
  }
}

// move a saved place to a new spot in the list
function moveFavorite(from, to) {
  if (to < 0 || to >= favorites.length || from === to) return false;

  favorites = moveItem(favorites, from, to);
  saveFavorites();
  renderFavorites();
  placesStatus.textContent = `${favorites[to].name} moved to position ${to + 1} of ${favorites.length}`;
  return true;
}

// alt + arrow keys move the focused saved place
function handleFavoritesKeys(event) {
  const button = event.target.closest(".city-btn");
  if (!button || !event.altKey) return;

  const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
  if (!step) return;

  event.preventDefault();
  const from = Number(button.dataset.index);

  if (moveFavorite(from, from + step)) {
    favoritesList.querySelector(`.city-btn[data-index="${from + step}"]`).focus();
  }
}

// drag and drop with a mouse, or a long press on phones that support it
function getDropPosition(event) {
  const item = event.target.closest(".place-item");
  if (!item) return -1;

  const box = item.getBoundingClientRect();
  const index = Number(item.dataset.index);
  return event.clientX > box.left + box.width / 2 ? index + 1 : index;
}

function clearDropMarks() {
  favoritesList.querySelectorAll(".drop-before, .drop-after").forEach((item) => {
    item.classList.remove("drop-before", "drop-after");
  });
}

function handleDragStart(event) {
  const item = event.target.closest(".place-item");
  if (!item || !item.draggable) return;

  dragIndex = Number(item.dataset.index);
  item.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(dragIndex));
}

function handleDragOver(event) {
  if (dragIndex === -1) return;

  const position = getDropPosition(event);
  if (position === -1) return;

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearDropMarks();

  const items = favoritesList.querySelectorAll(".place-item");
  if (position < items.length) items[position].classList.add("drop-before");
  else items[items.length - 1].classList.add("drop-after");
}

function handleDrop(event) {
  if (dragIndex === -1) return;

  event.preventDefault();
  const position = getDropPosition(event);
  const from = dragIndex;
  dragIndex = -1;
  clearDropMarks();

  if (position === -1) return;
  moveFavorite(from, position > from ? position - 1 : position);
}

function handleDragEnd() {
  dragIndex = -1;
  clearDropMarks();
  favoritesList.querySelectorAll(".is-dragging").forEach((item) => item.classList.remove("is-dragging"));
}

//  recent searches

// add a city to recent searches
function addRecentSearch(city) {
  recentSearches = recentSearches.filter((item) => getCityId(item) !== getCityId(city));
  recentSearches.unshift(city);

  if (recentSearches.length > maxRecent) {
    recentSearches = recentSearches.slice(0, maxRecent);
  }

  saveRecentSearches();
  renderRecentSearches();
}

// show recent searches that are not already saved
function renderRecentSearches() {
  const items = recentSearches
    .map((city, index) => ({ city, index }))
    .filter((item) => !isFavorite(item.city));

  recentList.innerHTML = items.map(({ city, index }) => {
    const current = isCurrent(city);

    return `
      <li class="place-item${current ? " is-current" : ""}">
        <button class="city-btn" type="button" data-index="${index}"${current ? ' aria-current="true"' : ""}>
          <svg aria-hidden="true"><use href="#i-history"/></svg>
          <span class="city-name">${escapeHtml(city.name)}</span>
          <span class="city-country">${escapeHtml(city.country)}</span>
        </button>
      </li>
    `;
  }).join("");
}

// handle clicks inside the recent searches list
function handleRecentClick(event) {
  const button = event.target.closest("button");

  if (!button) return;

  const city = recentSearches[Number(button.dataset.index)];

  if (city) {
    showCityWeather(city);
  }
}

//  start the app

// redraw the parts that depend on width, after resizing stops
let resizeTimer;
function handleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!weatherData) return;
    renderHorizon();
    renderHourlyForecast();
  }, 150);
}

// add event listeners
function setupEventListeners() {
  searchForm.addEventListener("submit", searchCity);
  searchInput.addEventListener("input", handleSearchInput);
  searchInput.addEventListener("focus", showRecentInSearch);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideSuggestions();
    } else if (event.key === "ArrowDown" && !suggestionsPanel.hidden) {
      handleSuggestionKeys(event);
    }
  });

  suggestionsList.addEventListener("click", handleSuggestionClick);
  suggestionsList.addEventListener("keydown", handleSuggestionKeys);

  // close suggestions when clicking outside the search form
  document.addEventListener("click", (event) => {
    if (!searchForm.contains(event.target)) {
      hideSuggestions();
    }
  });

  // close suggestions when focus leaves the search form
  searchForm.addEventListener("focusout", (event) => {
    if (event.relatedTarget && !searchForm.contains(event.relatedTarget)) {
      hideSuggestions();
    }
  });

  locationBtn.addEventListener("click", getCurrentLocation);
  unitCBtn.addEventListener("click", () => changeUnit("C"));
  unitFBtn.addEventListener("click", () => changeUnit("F"));
  themeBtn.addEventListener("click", toggleTheme);
  favoriteBtn.addEventListener("click", toggleFavorite);
  shareBtn.addEventListener("click", sharePlace);
  radarBtn.addEventListener("click", openRadar);
  radarPlay.addEventListener("click", toggleRadarPlay);
  radarRange.addEventListener("input", handleRadarRange);
  favoritesList.addEventListener("click", handleFavoritesClick);
  favoritesList.addEventListener("keydown", handleFavoritesKeys);
  favoritesList.addEventListener("dragstart", handleDragStart);
  favoritesList.addEventListener("dragover", handleDragOver);
  favoritesList.addEventListener("drop", handleDrop);
  favoritesList.addEventListener("dragend", handleDragEnd);
  recentList.addEventListener("click", handleRecentClick);

  freshness.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="retry"]') && currentCity) {
      showCityWeather(currentCity, false);
    }
  });

  hourlyList.addEventListener("keydown", handleHourlyKeys);
  hourlyList.addEventListener("pointermove", handleHourlyPointer);
  hourlyList.addEventListener("pointerdown", handleHourlyPointer);
  hourlyList.addEventListener("pointerleave", () => setActiveHour(0, false));
  hourlyList.addEventListener("scroll", updateHourlyFade, { passive: true });

  window.addEventListener("scroll", updateMasthead, { passive: true });
  window.addEventListener("resize", handleResize);

  // get fresh weather when the connection comes back
  window.addEventListener("online", refreshWeather);
  window.addEventListener("offline", () => {
    if (weatherData) {
      showMessage("You're offline. The weather shown is the last data loaded.", "info");
    }
  });

  // when the user comes back to the tab, update the clock
  // and get fresh weather if the data is old
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;

    updateClock();
    renderFreshness();

    if (Date.now() - lastLoaded > refreshTime) {
      refreshWeather();
    }
  });
}

// start the app
function init() {
  moveOldData();
  loadUnit();
  loadTheme();
  loadFavorites();
  loadRecentSearches();
  trackMastheadHeight();

  renderFavorites();
  renderRecentSearches();
  setupEventListeners();
  updateMasthead();

  // open a shared place, then the last searched city, then the default city
  const sharedCity = queryToPlace(location.search);
  const startCity = sharedCity || (recentSearches.length > 0 ? recentSearches[0] : defaultCity);
  showCityWeather(startCity, false);
  loadFavoriteTemps();

  // keep the clock, the sun and the weather updated
  setInterval(() => {
    updateClock();
    renderFreshness();
  }, 30000);

  setInterval(() => {
    if (weatherData && !document.hidden) {
      renderHorizon();
    }
  }, 5 * 60 * 1000);

  setInterval(refreshWeather, refreshTime);

  // keep the app itself available offline, only over http(s)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      console.log("could not set up offline support");
    });
  }
}

init();
