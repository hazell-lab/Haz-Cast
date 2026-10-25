// hazcast weather dashboard

// api addresses
const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";
const weatherUrl = "https://api.open-meteo.com/v1/forecast";
const reverseGeocodeUrl = "https://api.bigdatacloud.net/data/reverse-geocode-client";

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
  "wind_direction_10m"
];

const hourlyFields = [
  "temperature_2m",
  "precipitation_probability",
  "weather_code",
  "is_day",
  "visibility"
];

const dailyFields = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "sunrise",
  "sunset",
  "uv_index_max",
  "precipitation_probability_max"
];

// local storage keys
const favoritesKey = "hazcast-favorites";
const recentKey = "hazcast-recent";
const unitKey = "hazcast-unit";
const themeKey = "hazcast-theme";

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

// weather codes from open-meteo
const weatherCodes = {
  0: { name: "Clear sky", dayIcon: "fa-sun", nightIcon: "fa-moon", type: "clear" },
  1: { name: "Mainly clear", dayIcon: "fa-sun", nightIcon: "fa-moon", type: "clear" },
  2: { name: "Partly cloudy", dayIcon: "fa-cloud-sun", nightIcon: "fa-cloud-moon", type: "cloudy" },
  3: { name: "Overcast", dayIcon: "fa-cloud", nightIcon: "fa-cloud", type: "cloudy" },
  45: { name: "Fog", dayIcon: "fa-smog", nightIcon: "fa-smog", type: "fog" },
  48: { name: "Freezing fog", dayIcon: "fa-smog", nightIcon: "fa-smog", type: "fog" },
  51: { name: "Light drizzle", dayIcon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain", type: "rain" },
  53: { name: "Drizzle", dayIcon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain", type: "rain" },
  55: { name: "Heavy drizzle", dayIcon: "fa-cloud-rain", nightIcon: "fa-cloud-rain", type: "rain" },
  56: { name: "Freezing drizzle", dayIcon: "fa-cloud-rain", nightIcon: "fa-cloud-rain", type: "rain" },
  57: { name: "Heavy freezing drizzle", dayIcon: "fa-cloud-rain", nightIcon: "fa-cloud-rain", type: "rain" },
  61: { name: "Light rain", dayIcon: "fa-cloud-rain", nightIcon: "fa-cloud-rain", type: "rain" },
  63: { name: "Rain", dayIcon: "fa-cloud-rain", nightIcon: "fa-cloud-rain", type: "rain" },
  65: { name: "Heavy rain", dayIcon: "fa-cloud-showers-heavy", nightIcon: "fa-cloud-showers-heavy", type: "rain" },
  66: { name: "Freezing rain", dayIcon: "fa-cloud-rain", nightIcon: "fa-cloud-rain", type: "rain" },
  67: { name: "Heavy freezing rain", dayIcon: "fa-cloud-showers-heavy", nightIcon: "fa-cloud-showers-heavy", type: "rain" },
  71: { name: "Light snow", dayIcon: "fa-snowflake", nightIcon: "fa-snowflake", type: "snow" },
  73: { name: "Snow", dayIcon: "fa-snowflake", nightIcon: "fa-snowflake", type: "snow" },
  75: { name: "Heavy snow", dayIcon: "fa-snowflake", nightIcon: "fa-snowflake", type: "snow" },
  77: { name: "Snow grains", dayIcon: "fa-snowflake", nightIcon: "fa-snowflake", type: "snow" },
  80: { name: "Light rain showers", dayIcon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain", type: "rain" },
  81: { name: "Rain showers", dayIcon: "fa-cloud-sun-rain", nightIcon: "fa-cloud-moon-rain", type: "rain" },
  82: { name: "Violent rain showers", dayIcon: "fa-cloud-showers-heavy", nightIcon: "fa-cloud-showers-heavy", type: "rain" },
  85: { name: "Light snow showers", dayIcon: "fa-snowflake", nightIcon: "fa-snowflake", type: "snow" },
  86: { name: "Heavy snow showers", dayIcon: "fa-snowflake", nightIcon: "fa-snowflake", type: "snow" },
  95: { name: "Thunderstorm", dayIcon: "fa-cloud-bolt", nightIcon: "fa-cloud-bolt", type: "storm" },
  96: { name: "Thunderstorm with hail", dayIcon: "fa-cloud-bolt", nightIcon: "fa-cloud-bolt", type: "storm" },
  99: { name: "Severe thunderstorm with hail", dayIcon: "fa-cloud-bolt", nightIcon: "fa-cloud-bolt", type: "storm" }
};

// used when a weather code is not in the list
const unknownWeather = { name: "Unknown", dayIcon: "fa-cloud", nightIcon: "fa-cloud", type: "cloudy" };

// page elements
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const suggestionsList = document.getElementById("suggestions");
const locationBtn = document.getElementById("location-btn");
const unitCBtn = document.getElementById("unit-c");
const unitFBtn = document.getElementById("unit-f");
const themeBtn = document.getElementById("theme-btn");

const messageBox = document.getElementById("message");
const loadingBox = document.getElementById("loading");
const weatherContent = document.getElementById("weather-content");

const currentCard = document.getElementById("current-card");
const cityName = document.getElementById("city-name");
const currentDate = document.getElementById("current-date");
const currentTime = document.getElementById("current-time");
const currentIcon = document.getElementById("current-icon");
const currentTemp = document.getElementById("current-temp");
const currentCondition = document.getElementById("current-condition");
const feelsLike = document.getElementById("feels-like");
const highLow = document.getElementById("high-low");
const favoriteBtn = document.getElementById("favorite-btn");

const detailsGrid = document.getElementById("details-grid");
const hourlyList = document.getElementById("hourly-list");
const dailyList = document.getElementById("daily-list");
const favoritesList = document.getElementById("favorites-list");
const recentList = document.getElementById("recent-list");

// app data
let unit = "C";
let theme = "light";
let currentCity = null;
let weatherData = null;
let favorites = [];
let recentSearches = [];
let favoriteTemps = {};
let suggestionResults = [];
let searchTimer;
let messageTimer;
let latestRequest = 0;
let lastLoaded = 0;

//  api 

// fetch json from an address
async function fetchJson(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("network error");
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
async function getWeather(city) {
  const url = `${weatherUrl}?latitude=${city.latitude}&longitude=${city.longitude}`
    + `&current=${currentFields.join(",")}`
    + `&hourly=${hourlyFields.join(",")}`
    + `&daily=${dailyFields.join(",")}`
    + "&timezone=auto&forecast_days=7";

  return await fetchJson(url);
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

// turn a weather code into a name, icon and type
function getWeatherInfo(code, isDay) {
  const info = weatherCodes[code] || unknownWeather;

  return {
    name: info.name,
    icon: isDay ? info.dayIcon : info.nightIcon,
    type: info.type
  };
}

// pick a background class for the current weather card
function getBackgroundClass(type, isDay) {
  if (!isDay) {
    return "bg-night";
  }

  return `bg-${type}`;
}

// pick a color class for small icons
function getIconClass(type, isDay) {
  if (!isDay && type === "clear") {
    return "icon-night";
  }

  return `icon-${type}`;
}

//  helpers 

// convert celsius to the selected unit
function convertTemp(celsius) {
  if (unit === "F") {
    return Math.round((celsius * 9) / 5 + 32);
  }

  return Math.round(celsius);
}

// show a temperature with its unit
function formatTemp(celsius) {
  return `${convertTemp(celsius)}°${unit}`;
}

// show wind speed in km/h, or mph when using fahrenheit
function formatWind(kmh) {
  if (unit === "F") {
    return `${Math.round(kmh * 0.621371)} mph`;
  }

  return `${Math.round(kmh)} km/h`;
}

// show visibility in km, or miles when using fahrenheit
function formatDistance(meters) {
  if (unit === "F") {
    return `${(meters / 1609.34).toFixed(1)} mi`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

// make text safe to put inside innerHTML
// city names come from the api and local storage, so never trust them as html
function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// get a unique id for a city
// the region is included so two cities with the same name in one country stay separate
function getCityId(city) {
  return `${city.name}-${city.region || ""}-${city.country}`.toLowerCase();
}

// get wind direction from degrees
function getWindDirection(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

// get uv level text
function getUvLevel(uv) {
  const level = Math.round(uv);

  if (level < 3) return "Low";
  if (level < 6) return "Moderate";
  if (level < 8) return "High";
  if (level < 11) return "Very high";
  return "Extreme";
}

// find the current hour in the hourly data
function getCurrentHourIndex() {
  const hourText = weatherData.current.time.slice(0, 13) + ":00";
  const index = weatherData.hourly.time.findIndex((time) => time === hourText);
  return index === -1 ? 0 : index;
}

// format dates and times
function getLocalDate(timezone) {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long", timeZone: timezone });
  const rest = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: timezone });
  return `${weekday}, ${rest}`;
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
function showLoading(isLoading) {
  loadingBox.hidden = !isLoading;
  searchBtn.disabled = isLoading;
  locationBtn.disabled = isLoading;
  weatherContent.classList.toggle("is-loading", isLoading);
}

// turn an error into a friendly message
function getErrorMessage(error) {
  if (error.message === "city not found") {
    return "City not found. Try another location.";
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

// check that a saved city has everything the app needs
function isValidCity(city) {
  return city
    && typeof city.name === "string"
    && typeof city.latitude === "number"
    && typeof city.longitude === "number";
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
  } catch (error) {
    console.log("could not save", key);
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

  try {
    const data = await getWeather(city);

    if (requestId !== latestRequest) return;

    weatherData = data;
    currentCity = city;
    lastLoaded = Date.now();
    weatherContent.hidden = false;
    renderWeather();

    if (saveToRecent) {
      addRecentSearch(city);
    }

    searchInput.value = "";
  } catch (error) {
    console.error(error);

    if (requestId === latestRequest) {
      showError(getErrorMessage(error));
    }
  } finally {
    if (requestId === latestRequest) {
      showLoading(false);
    }
  }
}

// quietly load new data for the city on screen
async function refreshWeather() {
  if (!currentCity || document.hidden) return;

  const city = currentCity;

  try {
    const data = await getWeather(city);

    // skip it if the user opened another city while this was loading
    if (city !== currentCity) return;

    weatherData = data;
    lastLoaded = Date.now();
    renderWeather();
  } catch (error) {
    console.log("could not refresh weather");
  }
}

// wait a little after typing, then look for suggestions
function handleSearchInput() {
  clearTimeout(searchTimer);

  const query = searchInput.value.trim();

  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  searchTimer = setTimeout(() => showSuggestions(query), 300);
}

// show city suggestions
async function showSuggestions(query) {
  try {
    const results = await getCityResults(query, 5);

    // ignore old results if the user kept typing
    if (searchInput.value.trim() !== query) {
      return;
    }

    suggestionResults = results.map((result) => makeCity(result));

    if (suggestionResults.length === 0) {
      hideSuggestions();
      return;
    }

    suggestionsList.innerHTML = suggestionResults.map((city, index) => {
      const place = city.country ? `${city.name}, ${city.country}` : city.name;

      return `
        <li>
          <button class="suggestion-btn" type="button" data-index="${index}">
            <span class="suggestion-name">${escapeHtml(place)}</span>
            <span class="suggestion-region">${escapeHtml(city.region)}</span>
          </button>
        </li>
      `;
    }).join("");

    suggestionsList.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  } catch (error) {
    hideSuggestions();
  }
}

function hideSuggestions() {
  suggestionsList.hidden = true;
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
    showError("Your browser does not support geolocation.");
    return;
  }

  hideMessage();
  showLoading(true);

  navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
    timeout: 10000
  });
}

async function handleLocationSuccess(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
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
    showError("Location permission was denied.");
  } else if (error.code === 2) {
    showError("Location is unavailable. Try searching for a city instead.");
  } else if (error.code === 3) {
    showError("Location request timed out. Please try again.");
  } else {
    showError("Could not get your location.");
  }
}

//  show weather 

// show all weather sections
function renderWeather() {
  favoriteTemps[getCityId(currentCity)] = weatherData.current.temperature_2m;

  renderCurrentWeather();
  renderDetails();
  renderHourlyForecast();
  renderDailyForecast();
  renderFavorites();
}

// show current weather
function renderCurrentWeather() {
  const current = weatherData.current;
  const daily = weatherData.daily;
  const isDay = current.is_day === 1;
  const info = getWeatherInfo(current.weather_code, isDay);

  currentCard.className = `current-card ${getBackgroundClass(info.type, isDay)}`;
  cityName.textContent = currentCity.country ? `${currentCity.name}, ${currentCity.country}` : currentCity.name;
  currentIcon.className = `fa-solid ${info.icon} current-icon`;
  currentTemp.textContent = formatTemp(current.temperature_2m);
  currentCondition.textContent = info.name;
  feelsLike.textContent = `Feels like ${formatTemp(current.apparent_temperature)}`;
  highLow.textContent = `H: ${formatTemp(daily.temperature_2m_max[0])} · L: ${formatTemp(daily.temperature_2m_min[0])}`;

  updateClock();
  updateFavoriteButton();
}

// update date and time for the selected city
function updateClock() {
  if (!weatherData) return;

  const timezone = weatherData.timezone;
  currentDate.textContent = getLocalDate(timezone);
  currentTime.textContent = `Local time: ${getLocalTime(timezone)}`;
}

// show weather details
function renderDetails() {
  const current = weatherData.current;
  const daily = weatherData.daily;
  const hourly = weatherData.hourly;

  const visibility = hourly.visibility[getCurrentHourIndex()];
  const rainChance = daily.precipitation_probability_max[0];
  const uv = daily.uv_index_max[0];

  const items = [
    {
      icon: "fa-solid fa-droplet",
      label: "Humidity",
      value: current.relative_humidity_2m != null ? `${current.relative_humidity_2m}%` : null,
      note: ""
    },
    {
      icon: "fa-solid fa-wind",
      label: "Wind",
      value: current.wind_speed_10m != null ? formatWind(current.wind_speed_10m) : null,
      note: current.wind_direction_10m != null ? `From ${getWindDirection(current.wind_direction_10m)}` : ""
    },
    {
      icon: "fa-solid fa-eye",
      label: "Visibility",
      value: visibility != null ? formatDistance(visibility) : null,
      note: ""
    },
    {
      icon: "fa-solid fa-gauge-high",
      label: "Pressure",
      value: current.pressure_msl != null ? `${Math.round(current.pressure_msl)} hPa` : null,
      note: ""
    },
    {
      icon: "fa-solid fa-umbrella",
      label: "Precipitation",
      value: rainChance != null ? `${rainChance}%` : null,
      note: "Chance today"
    },
    {
      icon: "fa-solid fa-sun",
      label: "UV index",
      value: uv != null ? `${Math.round(uv)}` : null,
      note: uv != null ? getUvLevel(uv) : ""
    },
    {
      icon: "fa-regular fa-sun",
      label: "Sunrise",
      value: daily.sunrise[0] ? formatClock(daily.sunrise[0]) : null,
      note: ""
    },
    {
      icon: "fa-regular fa-moon",
      label: "Sunset",
      value: daily.sunset[0] ? formatClock(daily.sunset[0]) : null,
      note: ""
    }
  ];

  // remove cards that have no data
  const availableItems = items.filter((item) => item.value !== null);

  detailsGrid.innerHTML = availableItems.map((item) => `
    <div class="detail-card">
      <span class="detail-label"><i class="${item.icon}" aria-hidden="true"></i> ${item.label}</span>
      <span class="detail-value">${item.value}</span>
      <span class="detail-note">${item.note}</span>
    </div>
  `).join("");
}

// show hourly forecast
function renderHourlyForecast() {
  const hourly = weatherData.hourly;
  const start = getCurrentHourIndex();
  const hours = hourly.time.slice(start, start + 24);

  hourlyList.innerHTML = hours.map((time, position) => {
    const index = start + position;
    const isDay = hourly.is_day[index] === 1;
    const info = getWeatherInfo(hourly.weather_code[index], isDay);
    const label = position === 0 ? "Now" : formatHour(time);
    const chance = hourly.precipitation_probability[index];
    const chanceText = chance != null ? `${chance}%` : "--";

    return `
      <div class="hourly-item${position === 0 ? " now" : ""}">
        <span class="hourly-time">${label}</span>
        <i class="fa-solid ${info.icon} ${getIconClass(info.type, isDay)}" aria-hidden="true"></i>
        <span class="visually-hidden">${info.name}</span>
        <span class="hourly-temp">${formatTemp(hourly.temperature_2m[index])}</span>
        <span class="rain-chance"><i class="fa-solid fa-droplet" aria-hidden="true"></i> ${chanceText}</span>
      </div>
    `;
  }).join("");
}

// show 7-day forecast
function renderDailyForecast() {
  const daily = weatherData.daily;

  dailyList.innerHTML = daily.time.map((date, index) => {
    const info = getWeatherInfo(daily.weather_code[index], true);
    const dayName = index === 0 ? "Today" : formatDayName(date);
    const chance = daily.precipitation_probability_max[index];
    const chanceText = chance != null ? `${chance}%` : "--";

    return `
      <li class="daily-item">
        <div class="daily-day">
          <span class="day-name">${dayName}</span>
          <span class="day-date">${formatDayDate(date)}</span>
        </div>
        <i class="fa-solid ${info.icon} ${getIconClass(info.type, true)} daily-icon" aria-hidden="true"></i>
        <span class="daily-condition">${info.name}</span>
        <span class="rain-chance daily-rain"><i class="fa-solid fa-droplet" aria-hidden="true"></i> ${chanceText}</span>
        <span class="daily-temps">
          <span class="temp-high">${convertTemp(daily.temperature_2m_max[index])}°</span>
          <span class="temp-low">/ ${convertTemp(daily.temperature_2m_min[index])}°</span>
        </span>
      </li>
    `;
  }).join("");
}

//  temperature unit 

// change between celsius and fahrenheit
function changeUnit(newUnit) {
  unit = newUnit;
  saveValue(unitKey, unit);
  updateUnitButtons();

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
    themeBtn.innerHTML = '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
    themeBtn.setAttribute("aria-label", "switch to light mode");
  } else {
    themeBtn.innerHTML = '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
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
    showError(`You can save up to ${maxFavorites} favorite cities.`);
    return;
  }

  favorites.push(city);
  saveFavorites();
  renderFavorites();
  updateFavoriteButton();
}

function removeFavorite(city) {
  favorites = favorites.filter((item) => getCityId(item) !== getCityId(city));
  saveFavorites();
  renderFavorites();
  updateFavoriteButton();
}

// update the heart button
function updateFavoriteButton() {
  if (!currentCity) return;

  const saved = isFavorite(currentCity);

  favoriteBtn.classList.toggle("saved", saved);
  favoriteBtn.setAttribute("aria-pressed", saved);

  if (saved) {
    favoriteBtn.innerHTML = '<i class="fa-solid fa-heart" aria-hidden="true"></i> Saved';
  } else {
    favoriteBtn.innerHTML = '<i class="fa-regular fa-heart" aria-hidden="true"></i> Add to favorites';
  }
}

// show favorite cities
function renderFavorites() {
  if (favorites.length === 0) {
    favoritesList.innerHTML = '<li class="empty-text">No favorite cities yet. Search for a city and tap the heart.</li>';
    return;
  }

  favoritesList.innerHTML = favorites.map((city, index) => {
    const temp = favoriteTemps[getCityId(city)];
    const tempText = temp !== undefined ? formatTemp(temp) : "--";
    const name = escapeHtml(city.name);

    return `
      <li class="city-item">
        <button class="city-btn" type="button" data-action="load" data-index="${index}">
          <span class="city-name">${name}</span>
          <span class="city-country">${escapeHtml(city.country)}</span>
        </button>
        <span class="city-temp">${tempText}</span>
        <button class="city-remove" type="button" data-action="remove" data-index="${index}" aria-label="remove ${name} from favorites">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </li>
    `;
  }).join("");
}

// get the current temperature for every favorite city
async function loadFavoriteTemps() {
  const requests = favorites.map(async (city) => {
    try {
      const url = `${weatherUrl}?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m`;
      const data = await fetchJson(url);
      favoriteTemps[getCityId(city)] = data.current.temperature_2m;
    } catch (error) {
      console.log("could not load temperature for", city.name);
    }
  });

  await Promise.all(requests);
  renderFavorites();
}

// handle clicks inside the favorites list
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

// show recent searches
function renderRecentSearches() {
  if (recentSearches.length === 0) {
    recentList.innerHTML = '<li class="empty-text">Your recent searches will show up here.</li>';
    return;
  }

  recentList.innerHTML = recentSearches.map((city, index) => `
    <li class="city-item">
      <button class="city-btn" type="button" data-index="${index}">
        <span class="city-name">${escapeHtml(city.name)}</span>
        <span class="city-country">${escapeHtml(city.country)}</span>
      </button>
    </li>
  `).join("");
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

// add event listeners
function setupEventListeners() {
  searchForm.addEventListener("submit", searchCity);
  searchInput.addEventListener("input", handleSearchInput);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideSuggestions();
    } else if (event.key === "ArrowDown" && !suggestionsList.hidden) {
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

  locationBtn.addEventListener("click", getCurrentLocation);
  unitCBtn.addEventListener("click", () => changeUnit("C"));
  unitFBtn.addEventListener("click", () => changeUnit("F"));
  themeBtn.addEventListener("click", toggleTheme);
  favoriteBtn.addEventListener("click", toggleFavorite);
  favoritesList.addEventListener("click", handleFavoritesClick);
  recentList.addEventListener("click", handleRecentClick);

  // when the user comes back to the tab, update the clock
  // and get fresh weather if the data is old
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;

    updateClock();

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

  renderFavorites();
  renderRecentSearches();
  setupEventListeners();

  // open the last searched city, or the default city
  const startCity = recentSearches.length > 0 ? recentSearches[0] : defaultCity;
  showCityWeather(startCity, false);
  loadFavoriteTemps();

  // keep the clock and the weather updated
  setInterval(updateClock, 30000);
  setInterval(refreshWeather, refreshTime);
}

init();