import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { locations } = require("../locations.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const WEATHER_CODES = {
  "00": "晴",
  "01": "多云",
  "02": "阴",
  "03": "阵雨",
  "04": "雷阵雨",
  "05": "雷阵雨伴有冰雹",
  "06": "雨夹雪",
  "07": "小雨",
  "08": "中雨",
  "09": "大雨",
  "10": "暴雨",
  "11": "大暴雨",
  "12": "特大暴雨",
  "13": "阵雪",
  "14": "小雪",
  "15": "中雪",
  "16": "大雪",
  "17": "暴雪",
  "18": "雾",
  "19": "冻雨",
  "20": "沙尘暴",
  "21": "小到中雨",
  "22": "中到大雨",
  "23": "大到暴雨",
  "24": "暴雨到大暴雨",
  "25": "大暴雨到特大暴雨",
  "26": "小到中雪",
  "27": "中到大雪",
  "28": "大到暴雪",
  "29": "浮尘",
  "30": "扬沙",
  "31": "强沙尘暴",
  "32": "浓雾",
  "49": "强浓雾",
  "53": "霾",
  "99": "无"
};

const RAIN_LEVEL = {
  "03": "light",
  "04": "light",
  "05": "moderate",
  "06": "light",
  "07": "light",
  "08": "moderate",
  "09": "heavy",
  "10": "extreme",
  "11": "extreme",
  "12": "extreme",
  "19": "light",
  "21": "moderate",
  "22": "heavy",
  "23": "extreme",
  "24": "extreme",
  "25": "extreme"
};

function weatherName(code) {
  return WEATHER_CODES[String(code).padStart(2, "0")] || WEATHER_CODES[String(code)] || "未知";
}

function rainInfo(code) {
  const key = String(code).padStart(2, "0");
  const level = RAIN_LEVEL[key];
  return {
    rain: Boolean(level) || /雨|雪|雹/.test(weatherName(code)),
    rainLevel: level || "none"
  };
}

function isoFromHourString(s) {
  if (!/^\d{10}$/.test(s)) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:00:00+08:00`;
}

function decodePage(buf, encoding) {
  try {
    return new TextDecoder(encoding || "utf8").decode(buf);
  } catch {
    return buf.toString("utf8");
  }
}

async function fetchText(url, referer, encoding) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Referer: referer || "https://www.weather.com.cn/",
      Accept: "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9"
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return decodePage(buf, encoding);
}

function extractBlock(html, name) {
  const re = new RegExp(`var ${name}\\s*=\\s*(\\[.*?\\]|\\{.*?\\});`, "s");
  const m = html.match(re);
  return m ? JSON.parse(m[1]) : null;
}

function extractSimpleArray(html, name) {
  const re = new RegExp(`var ${name}\\s*=\\s*\\[([^\\]]*)\\];`);
  const m = html.match(re);
  return m ? m[1].split(",").map((x) => x.trim().replace(/^"|"$/g, "")) : [];
}

async function fetchHourly(code, pageText) {
  const hour3 = extractBlock(pageText, "hour3data");
  if (!hour3) throw new Error(`hour3data missing for ${code}`);
  const flat = hour3.flat();
  return flat.map((h) => {
    const ri = rainInfo(h.ja);
    return {
      time: isoFromHourString(h.jf),
      temp: Number(h.jb),
      humidity: Number(h.je),
      weatherCode: h.ja,
      weather: weatherName(h.ja),
      windDirCode: h.jd,
      ...ri
    };
  });
}

function parseObserved(observe) {
  const rows = observe?.od?.od2 || [];
  return rows.map((r) => ({
    time: isoFromHourString(r.od21),
    temp: Number(r.od22),
    humidity: Number(r.od27),
    rainMm: Number(r.od26),
    windDir: r.od24,
    windLevel: Number(r.od25)
  }));
}

function parseCurrentSk(text) {
  const m = text.match(/var dataSK=(\{.*\});?/s);
  if (!m) return null;
  const d = JSON.parse(m[1]);
  return {
    temp: Number(d.temp),
    weather: d.weather,
    weatherCode: d.weathercode,
    humidity: d.sd,
    windDir: d.WD,
    windScale: d.WS,
    rain24h: Number(d.rain24h),
    updatedAt: `${d.date} ${d.time}`
  };
}

function computeNowcast(minutely, realtime, serverTime) {
  if (!minutely || !Array.isArray(minutely.precipitation_2h)) return null;
  const values = minutely.precipitation_2h;
  const threshold = 0.02;
  const rainy = values.map((v) => Number(v) >= threshold);
  const firstRain = rainy.findIndex(Boolean);
  const rainNow = firstRain === 0;
  let rainStartsInMin = null;
  let rainEndsInMin = null;
  if (firstRain >= 0) {
    rainStartsInMin = firstRain;
    if (rainNow) {
      const endIdx = values.findIndex((v, i) => i > 0 && Number(v) < threshold);
      rainEndsInMin = endIdx >= 0 ? endIdx : null;
    }
  }
  const avg = (arr) => {
    const xs = arr.map(Number).filter(Number.isFinite);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  };
  const a0 = avg(values.slice(0, 30));
  const a1 = avg(values.slice(30, 60));
  let trend = "none";
  if (a0 >= threshold || a1 >= threshold) {
    const diff = a1 - a0;
    trend = Math.abs(diff) < 0.02 ? "steady" : diff > 0 ? "up" : "down";
  }
  const maxIntensity = values.reduce((m, v) => Math.max(m, Number(v) || 0), 0);
  return {
    source: "彩云天气 · 雷达临近预报",
    serverTime,
    datasource: minutely.datasource || null,
    description: minutely.description || null,
    probability: minutely.probability ?? null,
    precipitation2h: values,
    rainyMinutes2h: rainy.filter(Boolean).length,
    dryMinutes2h: rainy.filter((v) => !v).length,
    maxIntensity: Number(maxIntensity.toFixed(3)),
    rainNow,
    rainStartsInMin,
    rainEndsInMin,
    trend,
    nearestRainKm: realtime?.precipitation?.nearest?.distance ?? null,
    nearestRainIntensity: realtime?.precipitation?.nearest?.intensity ?? null,
    localIntensity: realtime?.precipitation?.local?.intensity ?? null
  };
}

async function fetchCaiyunNowcast(page, lat, lng) {
  const raw = await page.evaluate(async ({ lng, lat }) => {
    const res = await fetch("/api/", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: JSON.stringify({
        url:
          `https://api.caiyunapp.com/v2.5/<t2.5>/${lng},${lat}/weather` +
          `?dailysteps=16&hourlysteps=120&alert=false&begin=${Math.floor(Date.now() / 1000) - 86400}`
      })
    });
    if (!res.ok) return null;
    const j = await res.json();
    return {
      minutely: j?.result?.minutely || null,
      realtime: j?.result?.realtime || null,
      serverTime: j?.server_time ?? null
    };
  }, { lng, lat });
  return computeNowcast(raw?.minutely, raw?.realtime, raw?.serverTime);
}

async function scrapeOne(code, name, pageText, nowcast) {
  const hourly = await fetchHourly(code, pageText);
  const observe = extractBlock(pageText, "observe24h_data");
  const observed = parseObserved(observe);
  const uptimeMatch = pageText.match(/var uptime="([^"]+)";/);
  const currentSk = await fetchText(`https://d1.weather.com.cn/sk_2d/${code}.html?_=${Date.now()}`, undefined, "utf8");
  const current = parseCurrentSk(currentSk);
  const next24 = hourly.slice(0, 24);
  const highs = next24.map((h) => h.temp).filter((t) => Number.isFinite(t));
  return {
    code,
    name,
    updatedAt: uptimeMatch?.[1] || null,
    current,
    hourly,
    observed,
    nowcast,
    today: {
      high: highs.length ? Math.max(...highs) : null,
      low: highs.length ? Math.min(...highs) : null
    }
  };
}

async function launchBrowser() {
  const { chromium } = await import("playwright");
  try {
    if (process.platform === "win32") {
      return await chromium.launch({ channel: "msedge", headless: true });
    }
  } catch {}
  return await chromium.launch({ headless: true });
}

function writeIotPayload(payload, results, target) {
  const iotDir = path.join(PROJECT_ROOT, "data", "iot");
  fs.mkdirSync(iotDir, { recursive: true });
  const summary = [];
  for (const loc of target) {
    const e = results[loc.id];
    if (!e) continue;
    const n = e.nowcast || {};
    const c = e.current || {};
    const probArr = Array.isArray(n.probability) ? n.probability.map(Number) : [];
    const probMax = probArr.length ? Math.max(...probArr) : Number(n.probability) || 0;
    const item = {
      campus: loc.id,
      name: `${loc.university} ${loc.campus}`,
      city: loc.city,
      code: loc.code,
      lat: loc.lat,
      lng: loc.lng,
      updatedAt: payload.generatedAt,
      now: (() => {
        const serverMs = n.serverTime ? Number(n.serverTime) * 1000 : null;
        const nowMs = Date.now();
        const elapsedMin = serverMs ? Math.floor((nowMs - serverMs) / 60000) : 0;
        const radarValid = serverMs !== null && elapsedMin < 120;
        const startsMin = radarValid && n.rainStartsInMin != null
          ? Math.max(0, n.rainStartsInMin - elapsedMin)
          : null;
        const endsMin = radarValid && n.rainEndsInMin != null
          ? Math.max(0, n.rainEndsInMin - elapsedMin)
          : null;
        const p10 = Array.isArray(n.precipitation2h) && n.precipitation2h.length >= 120
          ? Array.from({ length: 12 }, (_, i) => {
              let mx = 0;
              for (let j = 0; j < 10; j++) {
                const v = Number(n.precipitation2h[i * 10 + j]) || 0;
                if (v > mx) mx = v;
              }
              return Math.round(mx * 100) / 100;
            })
          : null;
        let nextRainAt = null;
        let nextRainSource = null;
        if (radarValid && startsMin !== null) {
          nextRainAt = serverMs + Number(n.rainStartsInMin) * 60000;
          nextRainSource = "radar";
        } else {
          const rainyHour = (e.hourly || []).find(
            (h) => h.rain && h.time && new Date(h.time).getTime() >= nowMs - 3600000
          );
          if (rainyHour) {
            nextRainAt = new Date(rainyHour.time).getTime();
            nextRainSource = "hourly";
          }
        }
        return {
          temp: c.temp ?? null,
          weather: c.weather ?? null,
          humidity: c.humidity != null ? parseInt(c.humidity) : null,
          rainNow: Boolean(n.rainNow),
          rainStartsInMin: startsMin,
          rainEndsInMin: endsMin,
          trend: n.trend ?? "none",
          probPct: Math.round(probMax * 100),
          rainMinutes2h: n.rainyMinutes2h ?? 0,
          localIntensity: n.localIntensity ?? null,
          nearestKm: n.nearestRainKm ?? null,
          precipitation10: p10,
          nextRainAt,
          nextRainSource,
          expiresAt: n.serverTime ? (Number(n.serverTime) + 7200) * 1000 : null
        };
      })(),
      hourly24: (e.hourly || []).slice(0, 24).map((h) => ({
        h: h.time ? new Date(h.time).getHours() : null,
        t: h.temp,
        rain: h.rain,
        lv: h.rainLevel
      }))
    };
    fs.writeFileSync(path.join(iotDir, `${loc.id}.json`), JSON.stringify(item), "utf8");
    summary.push({
      campus: loc.id,
      name: item.name,
      city: loc.city,
      code: loc.code,
      lat: loc.lat,
      lng: loc.lng,
      rainNow: item.now.rainNow,
      startsIn: item.now.rainStartsInMin,
      endsIn: item.now.rainEndsInMin,
      trend: item.now.trend,
      probPct: item.now.probPct,
      temp: item.now.temp,
      weather: item.now.weather,
      updatedAt: payload.generatedAt
    });
  }
  fs.writeFileSync(
    path.join(iotDir, "summary.json"),
    JSON.stringify({ generatedAt: payload.generatedAt, campuses: summary }),
    "utf8"
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function fetchWeatherPage(code, browser) {
  const url = `https://www.weather.com.cn/weather1dn/${code}.shtml`;
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const text = await fetchText(url);
      if (!extractBlock(text, "hour3data")) throw new Error("hour3data missing");
      return text;
    } catch (e) {
      lastErr = e;
      await sleep(600 * (attempt + 1));
    }
  }
  if (browser) {
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForFunction(() => document.body.innerText.includes("逐小时预报"), { timeout: 15000 }).catch(() => {});
      return await page.content();
    } finally {
      await page.close();
    }
  }
  throw lastErr;
}

async function fetchCurrentSk(code) {
  const text = await fetchText(`https://d1.weather.com.cn/sk_2d/${code}.html?_=${Date.now()}`, undefined, "utf8");
  return parseCurrentSk(text);
}

async function fetchOpenMeteoNowcast(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&minutely_15=precipitation,precipitation_probability&timezone=Asia%2FShanghai&forecast_minutely_15=24`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const values = data.minutely_15?.precipitation || [];
  const probs = data.minutely_15?.precipitation_probability || [];
  if (!values.length) throw new Error("Open-Meteo 无数据");
  const threshold = 0.02;
  const rainy = values.map((v) => Number(v) >= threshold);
  const firstRain = rainy.findIndex(Boolean);
  const rainNow = firstRain === 0;
  let rainStartsInMin = null;
  let rainEndsInMin = null;
  if (firstRain >= 0) {
    rainStartsInMin = firstRain * 15;
    if (rainNow) {
      const endIdx = rainy.findIndex((v, i) => i > 0 && !v);
      rainEndsInMin = endIdx >= 0 ? endIdx * 15 : null;
    }
  }
  const avg = (arr) => {
    const xs = arr.map(Number).filter(Number.isFinite);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  };
  const a0 = avg(values.slice(0, 4));
  const a1 = avg(values.slice(4, 8));
  let trend = "none";
  if (a0 >= threshold || a1 >= threshold) {
    const diff = a1 - a0;
    trend = Math.abs(diff) < 0.02 ? "steady" : diff > 0 ? "up" : "down";
  }
  return {
    source: "Open-Meteo 15分钟临近预报（无Key）",
    serverTime: Math.floor(Date.now() / 1000),
    intervalMinutes: 15,
    precipitation15: values.map(Number),
    probability: probs.map(Number),
    rainyMinutes2h: rainy.filter(Boolean).length * 15,
    dryMinutes2h: rainy.filter((v) => !v).length * 15,
    maxIntensity: values.reduce((m, v) => Math.max(m, Number(v) || 0), 0),
    rainNow,
    rainStartsInMin,
    rainEndsInMin,
    trend,
    nearestRainKm: null,
    nearestRainIntensity: null,
    localIntensity: null
  };
}

async function fetchCaiyunBatch(page, items) {
  return Promise.race([
    page.evaluate(async (list) => {
      async function one({ id, lng, lat }) {
        const res = await fetch("/api/", {
          method: "POST",
          headers: { "Content-Type": "application/json;charset=utf-8" },
          body: JSON.stringify({
            url:
              `https://api.caiyunapp.com/v2.5/<t2.5>/${lng},${lat}/weather` +
              `?dailysteps=16&hourlysteps=120&alert=false&begin=${Math.floor(Date.now() / 1000) - 86400}`
          })
        });
        if (!res.ok) return { id, raw: null };
        const j = await res.json();
        return {
          id,
          raw: {
            minutely: j?.result?.minutely || null,
            realtime: j?.result?.realtime || null,
            serverTime: j?.server_time ?? null
          }
        };
      }
      return Promise.all(list.map(one));
    }, items),
    new Promise((_, reject) => setTimeout(() => reject(new Error("彩云批量请求超时")), 25000))
  ]);
}

async function run() {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "auto";
  const codesArg = args.find((a) => a.startsWith("--codes="))?.split("=")[1];
  const outArg = args.find((a) => a.startsWith("--out="))?.split("=")[1];
  const target = codesArg
    ? locations.filter((l) => codesArg.split(",").includes(l.code))
    : locations;
  const outFile = outArg ? path.resolve(PROJECT_ROOT, outArg) : path.join(PROJECT_ROOT, "data", "weather.json");

  const results = {};
  const useBrowser = modeArg === "browser";
  let browser = null;
  let caiyunPage = null;

  if (modeArg === "auto" || useBrowser) {
    try {
      browser = await launchBrowser();
    } catch (e) {
      if (useBrowser) throw new Error(`无法启动 Playwright: ${e.message}`);
    }
  }

  if (browser) {
    try {
      caiyunPage = await browser.newPage();
      await caiyunPage.goto("https://h5.caiyunapp.com/h5", { waitUntil: "networkidle", timeout: 60000 });
      await caiyunPage.waitForTimeout(3000);
    } catch (e) {
      console.error(`[warn] 彩云临近预报初始化失败: ${e.message}`);
      caiyunPage = null;
    }
  }

  const uniqueCodes = [...new Set(target.map((l) => l.code))];
  const pageTextByCode = new Map();
  const currentByCode = new Map();

  await mapLimit(uniqueCodes, 5, async (code) => {
    try {
      pageTextByCode.set(code, await fetchWeatherPage(code, browser));
    } catch (e) {
      console.error(`[warn] ${code} 页面抓取失败: ${e.message}`);
    }
  });
  await mapLimit(uniqueCodes, 6, async (code) => {
    try {
      currentByCode.set(code, await fetchCurrentSk(code));
    } catch (e) {
      console.error(`[warn] ${code} 实况抓取失败: ${e.message}`);
    }
  });

  const nowcastByLoc = new Map();
  if (caiyunPage) {
    const items = target
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .map((l) => ({ id: l.id, lng: l.lng, lat: l.lat }));
    for (let i = 0; i < items.length; i += 8) {
      const chunk = items.slice(i, i + 8);
      try {
        const batch = await fetchCaiyunBatch(caiyunPage, chunk);
        for (const b of batch) {
          if (b && b.raw) {
            nowcastByLoc.set(b.id, computeNowcast(b.raw.minutely, b.raw.realtime, b.raw.serverTime));
          }
        }
      } catch (e) {
        console.error(`[warn] 彩云批量抓取失败: ${e.message}`);
      }
    }
  }

  const missingNowcast = target.filter(
    (l) => !nowcastByLoc.has(l.id) && Number.isFinite(l.lat) && Number.isFinite(l.lng)
  );
  await mapLimit(missingNowcast, 6, async (loc) => {
    try {
      nowcastByLoc.set(loc.id, await fetchOpenMeteoNowcast(loc.lat, loc.lng));
    } catch (e) {
      console.error(`[warn] ${loc.id} Open-Meteo 兜底失败: ${e.message}`);
    }
  });

  for (const loc of target) {
    try {
      const pageText = pageTextByCode.get(loc.code);
      if (!pageText) throw new Error("页面数据缺失");
      const hourly = await fetchHourly(loc.code, pageText);
      const observe = extractBlock(pageText, "observe24h_data");
      const observed = parseObserved(observe);
      const uptimeMatch = pageText.match(/var uptime="([^"]+)";/);
      const current = currentByCode.get(loc.code) || null;
      const next24 = hourly.slice(0, 24);
      const highs = next24.map((h) => h.temp).filter((t) => Number.isFinite(t));
      results[loc.id] = {
        code: loc.code,
        id: loc.id,
        name: loc.city,
        updatedAt: uptimeMatch?.[1] || null,
        current,
        hourly,
        observed,
        nowcast: nowcastByLoc.get(loc.id) || null,
        today: {
          high: highs.length ? Math.max(...highs) : null,
          low: highs.length ? Math.min(...highs) : null
        }
      };
    } catch (e) {
      console.error(`[warn] ${loc.university} ${loc.campus} (${loc.code}): ${e.message}`);
      results[loc.id] = {
        code: loc.code,
        id: loc.id,
        name: loc.city,
        error: e.message,
        current: null,
        hourly: [],
        observed: [],
        nowcast: null
      };
    }
  }

  if (browser) await browser.close();

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "彩云天气雷达临近预报与中国天气网公开数据（第三方整理）",
    method: browser ? "playwright" : "fetch",
    locationCount: target.length,
    locations: results
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  writeIotPayload(payload, results, target);
  console.log(`OK ${outFile} (${target.length} locations)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
