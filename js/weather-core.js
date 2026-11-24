// hazcast core: pure helpers with no page access, shared by the app and the tests
(function (root) {
  // weather codes from open-meteo
  // glyph names match the svg symbols in index.html, level is how heavy it is (1 to 3)
  const weatherCodes = {
    0: { name: "Clear sky", day: "g-sun", night: "g-moon", type: "clear" },
    1: { name: "Mainly clear", day: "g-sun", night: "g-moon", type: "clear" },
    2: { name: "Partly cloudy", day: "g-cloud-sun", night: "g-cloud-moon", type: "clear", partial: true },
    3: { name: "Overcast", day: "g-cloud", night: "g-cloud", type: "cloudy" },
    45: { name: "Fog", day: "g-fog", night: "g-fog", type: "fog" },
    48: { name: "Freezing fog", day: "g-fog", night: "g-fog", type: "fog" },
    51: { name: "Light drizzle", day: "g-drizzle", night: "g-drizzle", type: "rain", level: 1 },
    53: { name: "Drizzle", day: "g-drizzle", night: "g-drizzle", type: "rain", level: 1 },
    55: { name: "Heavy drizzle", day: "g-drizzle", night: "g-drizzle", type: "rain", level: 2 },
    56: { name: "Freezing drizzle", day: "g-sleet", night: "g-sleet", type: "rain", level: 1 },
    57: { name: "Heavy freezing drizzle", day: "g-sleet", night: "g-sleet", type: "rain", level: 2 },
    61: { name: "Light rain", day: "g-rain", night: "g-rain", type: "rain", level: 1 },
    63: { name: "Rain", day: "g-rain", night: "g-rain", type: "rain", level: 2 },
    65: { name: "Heavy rain", day: "g-heavy-rain", night: "g-heavy-rain", type: "rain", level: 3 },
    66: { name: "Freezing rain", day: "g-sleet", night: "g-sleet", type: "rain", level: 2 },
    67: { name: "Heavy freezing rain", day: "g-sleet", night: "g-sleet", type: "rain", level: 3 },
    71: { name: "Light snow", day: "g-snow", night: "g-snow", type: "snow", level: 1 },
    73: { name: "Snow", day: "g-snow", night: "g-snow", type: "snow", level: 2 },
    75: { name: "Heavy snow", day: "g-snow", night: "g-snow", type: "snow", level: 3 },
    77: { name: "Snow grains", day: "g-snow", night: "g-snow", type: "snow", level: 1 },
    80: { name: "Light rain showers", day: "g-showers", night: "g-rain", type: "rain", level: 1 },
    81: { name: "Rain showers", day: "g-showers", night: "g-rain", type: "rain", level: 2 },
    82: { name: "Violent rain showers", day: "g-heavy-rain", night: "g-heavy-rain", type: "rain", level: 3 },
    85: { name: "Light snow showers", day: "g-snow", night: "g-snow", type: "snow", level: 1 },
    86: { name: "Heavy snow showers", day: "g-snow", night: "g-snow", type: "snow", level: 3 },
    95: { name: "Thunderstorm", day: "g-storm", night: "g-storm", type: "storm", level: 2 },
    96: { name: "Thunderstorm with hail", day: "g-storm", night: "g-storm", type: "storm", level: 3 },
    99: { name: "Severe thunderstorm with hail", day: "g-storm", night: "g-storm", type: "storm", level: 3 }
  };

  // used when a weather code is not in the list
  const unknownWeather = { name: "Unknown", day: "g-cloud", night: "g-cloud", type: "cloudy" };

  // turn a weather code into a name, glyph and type
  function getWeatherInfo(code, isDay) {
    const info = weatherCodes[code] || unknownWeather;

    return {
      name: info.name,
      glyph: isDay ? info.day : info.night,
      type: info.type,
      level: info.level || 0,
      partial: Boolean(info.partial)
    };
  }

  // use a real minus sign for temperatures below zero
  function signed(number) {
    return number < 0 ? `−${Math.abs(number)}` : `${number}`;
  }

  // split a value and its unit so the unit can be styled smaller
  function splitUnit(text) {
    const index = text.lastIndexOf(" ");
    return { value: text.slice(0, index), unit: text.slice(index + 1) };
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

  // describe visibility in words
  function getVisibilityLevel(meters) {
    if (meters < 1000) return "Very poor";
    if (meters < 4000) return "Poor, misty";
    if (meters < 10000) return "Moderate";
    return "Good";
  }

  // open-meteo gives local times without a zone.
  // reading them as utc lets us compare them with the city's own clock
  function localToMs(timeText) {
    return Date.parse(`${timeText}Z`);
  }

  // "3 min ago", "2 h ago"
  function formatAge(ms) {
    const minutes = Math.round(ms / 60000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours} h ago`;

    return `${Math.round(hours / 24)} days ago`;
  }

  // "12 h 4 min"
  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours} h ${minutes} min`;
  }

  // mix between two hex colors
  function mixColor(from, to, amount) {
    const a = from.match(/\w\w/g).map((part) => parseInt(part, 16));
    const b = to.match(/\w\w/g).map((part) => parseInt(part, 16));
    const mixed = a.map((value, index) => Math.round(value + (b[index] - value) * amount));
    return `rgb(${mixed.join(", ")})`;
  }

  // color for a temperature in celsius, from the ramp in the css
  const tempStops = [
    [-5, "6aa7c8"],
    [5, "79b6b1"],
    [14, "b8c37a"],
    [22, "e6b23c"],
    [30, "df7a3a"],
    [38, "c4462f"]
  ];

  function tempColor(celsius) {
    if (celsius <= tempStops[0][0]) return `#${tempStops[0][1]}`;

    for (let i = 1; i < tempStops.length; i++) {
      const [stopTemp, stopColor] = tempStops[i];

      if (celsius <= stopTemp) {
        const [lastTemp, lastColor] = tempStops[i - 1];
        return mixColor(lastColor, stopColor, (celsius - lastTemp) / (stopTemp - lastTemp));
      }
    }

    return `#${tempStops[tempStops.length - 1][1]}`;
  }

  // round coordinates to about 1 km so an exact position is never sent or saved
  function roundCoord(value) {
    return Math.round(value * 100) / 100;
  }

  // check that a saved city has everything the app needs
  function isValidCity(city) {
    return city
      && typeof city.name === "string"
      && typeof city.latitude === "number"
      && typeof city.longitude === "number";
  }

  // us aqi categories
  function getAqiLevel(aqi) {
    if (aqi <= 50) return { name: "Good", note: "Air quality is satisfactory." };
    if (aqi <= 100) return { name: "Moderate", note: "Unusually sensitive people may want to limit long outdoor effort." };
    if (aqi <= 150) return { name: "Unhealthy for sensitive groups", note: "Sensitive groups should reduce long outdoor effort." };
    if (aqi <= 200) return { name: "Unhealthy", note: "Everyone should reduce long outdoor effort." };
    if (aqi <= 300) return { name: "Very unhealthy", note: "Avoid long outdoor effort." };
    return { name: "Hazardous", note: "Avoid outdoor activity." };
  }

  // where an aqi value sits on the scale bar
  function getAqiPosition(aqi) {
    if (aqi <= 200) return (aqi / 200) * 66.6;
    if (aqi <= 300) return 66.6 + ((aqi - 200) / 100) * 16.7;
    return 83.3 + Math.min((aqi - 300) / 200, 1) * 16.7;
  }

  // pollen level in grains per cubic metre, rough bands
  function getPollenLevel(value) {
    if (value < 1) return "None";
    if (value < 20) return "Low";
    if (value < 80) return "Moderate";
    if (value < 200) return "High";
    return "Very high";
  }

  // convert celsius to the selected unit
  function convertTemp(celsius, unit) {
    if (unit === "F") return Math.round((celsius * 9) / 5 + 32);
    return Math.round(celsius);
  }

  // wind speed in km/h, or mph when using fahrenheit
  function formatWind(kmh, unit) {
    if (unit === "F") return `${Math.round(kmh * 0.621371)} mph`;
    return `${Math.round(kmh)} km/h`;
  }

  // visibility in km, or miles when using fahrenheit
  function formatDistance(meters, unit) {
    if (unit === "F") return `${(meters / 1609.34).toFixed(1)} mi`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  // rain amounts in mm, or inches when using fahrenheit
  function formatRain(mm, unit) {
    if (unit === "F") return `${(mm / 25.4).toFixed(2)} in`;
    return `${mm < 10 ? mm.toFixed(1) : Math.round(mm)} mm`;
  }

  // find the current hour in the hourly times, or 0 if it is missing
  function findHourIndex(currentTime, hourlyTimes) {
    const hourText = currentTime.slice(0, 13) + ":00";
    const index = hourlyTimes.findIndex((time) => time === hourText);
    return index === -1 ? 0 : index;
  }

  // read the next two hours of 15 minute rain data
  // each open-meteo value is the rain in the 15 minutes before its time,
  // so the slot we are in now is the first one that ends after now
  // returns null when the api sent nothing usable
  function getNowcast(minutely, nowMs) {
    if (!minutely || !Array.isArray(minutely.time) || !Array.isArray(minutely.precipitation)) {
      return null;
    }

    const start = minutely.time.findIndex((time) => localToMs(time) > nowMs);
    if (start === -1) return null;

    const slots = [];

    for (let i = start; i < minutely.time.length && slots.length < 8; i++) {
      const amount = minutely.precipitation[i];
      if (typeof amount !== "number") continue;

      const chance = minutely.precipitation_probability ? minutely.precipitation_probability[i] : null;
      const from = new Date(localToMs(minutely.time[i]) - 15 * 60000).toISOString().slice(0, 16);
      slots.push({ from, to: minutely.time[i], amount, chance: typeof chance === "number" ? chance : null });
    }

    if (slots.length < 4) return null;

    const wet = slots.map((slot) => slot.amount >= 0.1);
    const firstWet = wet.indexOf(true);
    const firstDry = wet.indexOf(false);

    let state = "dry";
    if (wet.every(Boolean)) state = "steady";
    else if (wet[0] && firstDry !== -1) state = "stopping";
    else if (firstWet !== -1) state = "starting";

    return {
      slots,
      state,
      total: slots.reduce((sum, slot) => sum + slot.amount, 0),
      peak: Math.max(...slots.map((slot) => slot.amount)),
      startsAt: state === "starting" ? slots[firstWet].from : null,
      stopsAt: state === "stopping" ? slots[firstDry].from : null
    };
  }

  // move one item in a list and return a new list
  function moveItem(list, from, to) {
    if (from === to || from < 0 || from >= list.length) return list.slice();

    const copy = list.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(Math.max(0, Math.min(to, copy.length)), 0, item);
    return copy;
  }

  // build the query part of a shareable link for a place
  function placeToQuery(city) {
    const params = new URLSearchParams();
    params.set("place", city.name);
    if (city.region) params.set("region", city.region);
    if (city.country) params.set("country", city.country);
    params.set("lat", String(roundCoord(city.latitude)));
    params.set("lon", String(roundCoord(city.longitude)));
    return `?${params.toString()}`;
  }

  // read a place from a shared link, or null if the link has none or it is broken
  function queryToPlace(search) {
    const params = new URLSearchParams(search);
    const name = (params.get("place") || "").trim().slice(0, 80);
    const latitude = Number(params.get("lat"));
    const longitude = Number(params.get("lon"));

    if (!name || !params.has("lat") || !params.has("lon")) return null;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

    return {
      name,
      region: (params.get("region") || "").slice(0, 80),
      country: (params.get("country") || "").slice(0, 80),
      latitude: roundCoord(latitude),
      longitude: roundCoord(longitude)
    };
  }

  // rough check for places the us weather service covers, used before asking it for alerts
  function isInUsCoverage(latitude, longitude, country) {
    if (country && /^(united states|usa$|us$|puerto rico|guam)/i.test(country.trim())) return true;
    if (country) return false;
    return latitude > 18 && latitude < 72 && longitude > -180 && longitude < -65;
  }

  const core = {
    weatherCodes,
    getWeatherInfo,
    signed,
    splitUnit,
    escapeHtml,
    getCityId,
    getWindDirection,
    getUvLevel,
    getVisibilityLevel,
    localToMs,
    formatAge,
    formatDuration,
    mixColor,
    tempColor,
    roundCoord,
    isValidCity,
    getAqiLevel,
    getAqiPosition,
    getPollenLevel,
    convertTemp,
    formatWind,
    formatDistance,
    formatRain,
    findHourIndex,
    getNowcast,
    moveItem,
    placeToQuery,
    queryToPlace,
    isInUsCoverage
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = core;
  } else {
    root.HazCore = core;
  }
})(this);
