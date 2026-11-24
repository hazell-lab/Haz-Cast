// tests for the pure helpers in js/weather-core.js
// run with: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../js/weather-core.js");

test("weather codes map to names, glyphs and types", () => {
  assert.deepEqual(core.getWeatherInfo(0, true), { name: "Clear sky", glyph: "g-sun", type: "clear", level: 0, partial: false });
  assert.equal(core.getWeatherInfo(0, false).glyph, "g-moon");
  assert.equal(core.getWeatherInfo(2, true).partial, true);
  assert.equal(core.getWeatherInfo(65, true).level, 3);
  assert.equal(core.getWeatherInfo(1234, true).name, "Unknown");
});

test("temperatures convert and use a real minus sign", () => {
  assert.equal(core.convertTemp(0, "F"), 32);
  assert.equal(core.convertTemp(-40, "F"), -40);
  assert.equal(core.convertTemp(21.6, "C"), 22);
  assert.equal(core.signed(-3), "−3");
  assert.equal(core.signed(4), "4");
});

test("units follow the selected temperature unit", () => {
  assert.equal(core.formatWind(10, "C"), "10 km/h");
  assert.equal(core.formatWind(10, "F"), "6 mph");
  assert.equal(core.formatDistance(10000, "C"), "10.0 km");
  assert.equal(core.formatDistance(1609.34, "F"), "1.0 mi");
  assert.equal(core.formatRain(2.34, "C"), "2.3 mm");
  assert.equal(core.formatRain(12.6, "C"), "13 mm");
  assert.equal(core.formatRain(25.4, "F"), "1.00 in");
});

test("levels and directions", () => {
  assert.equal(core.getWindDirection(0), "N");
  assert.equal(core.getWindDirection(359), "N");
  assert.equal(core.getWindDirection(225), "SW");
  assert.equal(core.getUvLevel(2.4), "Low");
  assert.equal(core.getUvLevel(11), "Extreme");
  assert.equal(core.getVisibilityLevel(500), "Very poor");
  assert.equal(core.getVisibilityLevel(24000), "Good");
  assert.equal(core.getAqiLevel(42).name, "Good");
  assert.equal(core.getAqiLevel(160).name, "Unhealthy");
  assert.equal(core.getAqiPosition(0), 0);
  assert.ok(core.getAqiPosition(1000) <= 100);
  assert.equal(core.getPollenLevel(0.5), "None");
  assert.equal(core.getPollenLevel(250), "Very high");
});

test("text and ids", () => {
  assert.equal(core.escapeHtml(`<b a="1">'&'</b>`), "&lt;b a=&quot;1&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;");
  assert.equal(core.escapeHtml(null), "");
  assert.equal(core.getCityId({ name: "Paris", region: "Texas", country: "United States" }), "paris-texas-united states");
  assert.deepEqual(core.splitUnit("12 km/h"), { value: "12", unit: "km/h" });
  assert.equal(core.isValidCity({ name: "A", latitude: 1, longitude: 2 }), true);
  assert.ok(!core.isValidCity({ name: "A", latitude: "1", longitude: 2 }));
});

test("time helpers", () => {
  assert.equal(core.localToMs("2026-01-01T00:00"), Date.UTC(2026, 0, 1));
  assert.equal(core.formatAge(20000), "just now");
  assert.equal(core.formatAge(5 * 60000), "5 min ago");
  assert.equal(core.formatAge(3 * 3600000), "3 h ago");
  assert.equal(core.formatAge(72 * 3600000), "3 days ago");
  assert.equal(core.formatDuration(12 * 3600 + 4 * 60), "12 h 4 min");
  const hours = ["2026-01-01T09:00", "2026-01-01T10:00", "2026-01-01T11:00"];
  assert.equal(core.findHourIndex("2026-01-01T10:45", hours), 1);
  assert.equal(core.findHourIndex("2026-01-02T10:45", hours), 0);
});

test("temperature colors stay inside the ramp", () => {
  assert.equal(core.tempColor(-30), "#6aa7c8");
  assert.equal(core.tempColor(50), "#c4462f");
  assert.match(core.tempColor(10), /^rgb\(\d+, \d+, \d+\)$/);
});

test("coordinates are rounded to about 1 km", () => {
  assert.equal(core.roundCoord(51.507351), 51.51);
  assert.equal(core.roundCoord(-0.127758), -0.13);
});

// 15 minute slots, the first one ends at 10:15 city time
function minutely(amounts) {
  const time = amounts.map((_, i) => {
    const date = new Date(Date.UTC(2026, 0, 1, 10, (i + 1) * 15));
    return date.toISOString().slice(0, 16);
  });
  return { time, precipitation: amounts, precipitation_probability: amounts.map((a) => (a > 0 ? 80 : 5)) };
}

const tenFive = Date.UTC(2026, 0, 1, 10, 5);

test("nowcast: dry, starting, stopping and steady", () => {
  assert.equal(core.getNowcast(minutely([0, 0, 0, 0, 0, 0, 0, 0]), tenFive).state, "dry");

  const starting = core.getNowcast(minutely([0, 0, 0.4, 1, 1, 0.5, 0, 0]), tenFive);
  assert.equal(starting.state, "starting");
  assert.equal(starting.startsAt, "2026-01-01T10:30");
  assert.equal(starting.peak, 1);

  const stopping = core.getNowcast(minutely([1, 0.6, 0.2, 0, 0, 0, 0, 0]), tenFive);
  assert.equal(stopping.state, "stopping");
  assert.equal(stopping.stopsAt, "2026-01-01T10:45");

  assert.equal(core.getNowcast(minutely([0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3]), tenFive).state, "steady");
});

test("nowcast starts at the current slot and refuses thin data", () => {
  const later = core.getNowcast(minutely([5, 0, 0, 0, 0, 0, 0, 0, 0, 0]), Date.UTC(2026, 0, 1, 10, 20));
  assert.equal(later.slots[0].from, "2026-01-01T10:15");
  assert.equal(later.slots[0].to, "2026-01-01T10:30");
  assert.equal(later.state, "dry");
  assert.equal(core.getNowcast(null, tenFive), null);
  assert.equal(core.getNowcast(minutely([0, 0]), tenFive), null);
  assert.equal(core.getNowcast(minutely([0, 0, 0, 0]), Date.UTC(2026, 0, 2)), null);
});

test("moving saved places", () => {
  assert.deepEqual(core.moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.deepEqual(core.moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assert.deepEqual(core.moveItem(["a", "b", "c"], 1, 9), ["a", "c", "b"]);
  assert.deepEqual(core.moveItem(["a", "b"], 5, 0), ["a", "b"]);
});

test("shareable links round trip and reject bad input", () => {
  const city = { name: "São Paulo", region: "São Paulo", country: "Brazil", latitude: -23.5475, longitude: -46.63611 };
  const query = core.placeToQuery(city);
  assert.match(query, /^\?place=/);
  assert.deepEqual(core.queryToPlace(query), { name: "São Paulo", region: "São Paulo", country: "Brazil", latitude: -23.55, longitude: -46.64 });

  assert.equal(core.queryToPlace(""), null);
  assert.equal(core.queryToPlace("?place=X&lat=abc&lon=1"), null);
  assert.equal(core.queryToPlace("?place=X&lat=95&lon=1"), null);
  assert.equal(core.queryToPlace("?lat=1&lon=1"), null);
  assert.equal(core.queryToPlace("?place=<b>x</b>&lat=1&lon=2").name, "<b>x</b>");
});

test("us alert coverage check", () => {
  assert.equal(core.isInUsCoverage(40.7, -74, "United States"), true);
  assert.equal(core.isInUsCoverage(40.7, -74, "United States of America (the)"), true);
  assert.equal(core.isInUsCoverage(51.5, -0.1, "United Kingdom"), false);
  assert.equal(core.isInUsCoverage(43.6, -79.4, "Canada"), false);
  assert.equal(core.isInUsCoverage(40.7, -74, ""), true);
});
