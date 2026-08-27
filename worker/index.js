const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const WEATHER_CODES = {
  "00": "晴", "01": "多云", "02": "阴", "03": "阵雨", "04": "雷阵雨",
  "05": "雷阵雨伴有冰雹", "06": "雨夹雪", "07": "小雨", "08": "中雨", "09": "大雨",
  "10": "暴雨", "11": "大暴雨", "12": "特大暴雨", "13": "阵雪", "14": "小雪",
  "15": "中雪", "16": "大雪", "17": "暴雪", "18": "雾", "19": "冻雨",
  "20": "沙尘暴", "21": "小到中雨", "22": "中到大雨", "23": "大到暴雨",
  "24": "暴雨到大暴雨", "25": "大暴雨到特大暴雨", "26": "小到中雪",
  "27": "中到大雪", "28": "大到暴雪", "29": "浮尘", "30": "扬沙",
  "31": "强沙尘暴", "32": "浓雾", "49": "强浓雾", "53": "霾", "99": "无"
};

const RAIN_LEVEL = {
  "03": "light", "04": "light", "05": "moderate", "06": "light", "07": "light",
  "08": "moderate", "09": "heavy", "10": "extreme", "11": "extreme", "12": "extreme",
  "19": "light", "21": "moderate", "22": "heavy", "23": "extreme",
  "24": "extreme", "25": "extreme"
};

function weatherName(code) {
  return WEATHER_CODES[String(code).padStart(2, "0")] || WEATHER_CODES[String(code)] || "未知";
}

function rainInfo(code) {
  const key = String(code).padStart(2, "0");
  return {
    rain: Boolean(RAIN_LEVEL[key]) || /雨|雪|雹/.test(weatherName(code)),
    rainLevel: RAIN_LEVEL[key] || "none"
  };
}

function isoFromHourString(s) {
  if (!/^\d{10}$/.test(s)) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:00:00+08:00`;
}

function extractBlock(html, name) {
  const re = new RegExp(`var ${name}\\s*=\\s*(\\[.*?\\]|\\{.*?\\});`, "s");
  const m = html.match(re);
  return m ? JSON.parse(m[1]) : null;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Referer: "https://www.weather.com.cn/",
      Accept: "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9"
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchOpenMeteoNowcast(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&minutely_15=precipitation,precipitation_probability&timezone=Asia%2FShanghai&forecast_minutely_15=24`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const values = data.minutely_15?.precipitation || [];
  const probs = data.minutely_15?.precipitation_probability || [];
  if (!values.length) return null;
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
    trend
  };
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

async function scrapeOne(code, lat, lng) {
  const pageUrl = `https://www.weather.com.cn/weather1dn/${code}.shtml`;
  const skUrl = `https://d1.weather.com.cn/sk_2d/${code}.html?_=${Date.now()}`;
  const [html, skText] = await Promise.all([fetchText(pageUrl), fetchText(skUrl)]);
  const hour3 = extractBlock(html, "hour3data");
  if (!hour3) throw new Error(`hour3data missing for ${code}`);
  const hourly = hour3.flat().map((h) => ({
    time: isoFromHourString(h.jf),
    temp: Number(h.jb),
    humidity: Number(h.je),
    weatherCode: h.ja,
    weather: weatherName(h.ja),
    windDirCode: h.jd,
    ...rainInfo(h.ja)
  }));
  const observe = extractBlock(html, "observe24h_data");
  const observed = (observe?.od?.od2 || []).map((r) => ({
    time: isoFromHourString(r.od21),
    temp: Number(r.od22),
    humidity: Number(r.od27),
    rainMm: Number(r.od26),
    windDir: r.od24,
    windLevel: Number(r.od25)
  }));
  const uptimeMatch = html.match(/var uptime="([^"]+)";/);
  let nowcast = null;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      nowcast = await fetchOpenMeteoNowcast(lat, lng);
    } catch (e) {
      nowcast = null;
    }
  }
  const next24 = hourly.slice(0, 24);
  const temps = next24.map((h) => h.temp).filter(Number.isFinite);
  return {
    code,
    name: "实时抓取",
    source: "彩云天气雷达临近预报与中国天气网公开数据（第三方整理）",
    updatedAt: uptimeMatch?.[1] || null,
    current: parseCurrentSk(skText),
    hourly,
    observed,
    nowcast,
    today: {
      high: temps.length ? Math.max(...temps) : null,
      low: temps.length ? Math.min(...temps) : null
    }
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=300"
  };
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim();
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!/^\d{9}$/.test(code)) {
    return new Response(JSON.stringify({ error: "invalid code" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }
  const cacheKey = new Request(`${url.origin}/api/weather/${code}`, { method: "GET" });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  try {
    const data = await scrapeOne(code, lat, lng);
    const res = new Response(JSON.stringify(data), {
      headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" }
    });
    await cache.put(cacheKey, res.clone());
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Campus Rain API is running. Use /api/weather?code=101280101", {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};
