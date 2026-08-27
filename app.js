(function () {
  "use strict";

  const config = window.APP_CONFIG || { dataMode: "static", workerUrl: "" };
  const locations = window.CAMPUS_LOCATIONS || [];
  const STORAGE_KEY = "campus-rain-campus-id";

  const state = {
    selectedId: null,
    allData: null,
    weatherByCode: {},
    sourceLabel: "",
    loading: false
  };

  const els = {
    select: document.getElementById("campus-select"),
    refresh: document.getElementById("refresh-btn"),
    status: document.getElementById("status-line"),
    hero: document.getElementById("hero"),
    nowcast: document.getElementById("nowcast"),
    summary: document.getElementById("summary"),
    timeline: document.getElementById("timeline"),
    hourly: document.getElementById("hourly"),
    api: document.getElementById("api"),
    footerNote: document.getElementById("footer-note")
  };

  function selectedLocation() {
    return locations.find((l) => l.id === state.selectedId) || locations.find((l) => l.default) || locations[0];
  }

  function buildSelect() {
    const groups = new Map();
    for (const loc of locations) {
      if (!groups.has(loc.group)) groups.set(loc.group, []);
      groups.get(loc.group).push(loc);
    }
    const frag = document.createDocumentFragment();
    for (const [group, list] of groups) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group;
      for (const loc of list) {
        const opt = document.createElement("option");
        opt.value = loc.id;
        opt.textContent = `${loc.university} · ${loc.campus}（${loc.city}）`;
        optgroup.appendChild(opt);
      }
      frag.appendChild(optgroup);
    }
    els.select.appendChild(frag);
  }

  function setStatus(text, isError) {
    els.status.textContent = text || "";
    els.status.classList.toggle("error", Boolean(isError));
  }

  function fmtHour(iso) {
    if (!iso) return "--:--";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      const m = String(iso).match(/(\d{2}):00/);
      return m ? `${m[1]}:00` : String(iso);
    }
    const hh = String(d.getHours()).padStart(2, "0");
    return `${hh}:00`;
  }

  function fmtDayHour(iso) {
    if (!iso) return "--";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:00`;
  }

  function fmtUpdated(text) {
    if (!text) return "更新时间未知";
    return `更新 ${text}`;
  }

  function rainLevelLabel(level) {
    return {
      none: "无雨",
      light: "小雨",
      moderate: "中雨",
      heavy: "大雨",
      extreme: "暴雨"
    }[level] || "无雨";
  }

  function rainChip(level) {
    return `<span class="rain-chip ${level || "none"}">${rainLevelLabel(level)}</span>`;
  }

  function intensityLevel(v) {
    const x = Number(v) || 0;
    if (x < 0.02) return "none";
    if (x < 0.3) return "light";
    if (x < 1) return "moderate";
    if (x < 3) return "heavy";
    return "extreme";
  }

  function nowcastMinutes(n) {
    if (n?.precipitation2h) return n.precipitation2h;
    if (n?.precipitation15) {
      return n.precipitation15.flatMap((v) => Array(15).fill(v));
    }
    return [];
  }

  function nowcastBaseMs(n) {
    if (n.serverTime) return new Date(Number(n.serverTime) * 1000).getTime();
    if (n.fetchedAt) return new Date(Number(n.fetchedAt)).getTime();
    if (state.allData && state.allData.generatedAt) return new Date(state.allData.generatedAt).getTime();
    return Date.now();
  }

  function fmtClock(ms) {
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function renderNowcast(loc, entry) {
    const n = entry.nowcast;
    const allMinutes = n ? nowcastMinutes(n) : [];
    if (!n || !allMinutes.length) {
      const first = (entry.hourly || []).find((h) => h.rain);
      els.nowcast.innerHTML = `
        <div class="panel-head">
          <h2><span class="scope-chip point">本校区</span> 未来2小时降雨</h2>
          <span class="panel-meta">暂无雷达分钟级数据</span>
        </div>
        <div class="panel-body">
          <div class="empty-state">${first ? `逐小时预报显示约 ${fmtHour(first.time)} 有${first.weather}` : "当前数据源暂不提供分钟级临近预报"}</div>
        </div>
      `;
      return;
    }

    const baseMs = nowcastBaseMs(n);
    const elapsedMin = Math.max(0, Math.floor((Date.now() - baseMs) / 60000));
    const expired = elapsedMin >= allMinutes.length;
    const minutes = expired ? [] : allMinutes.slice(elapsedMin);
    const threshold = 0.02;
    const rainy = minutes.map((v) => Number(v) >= threshold);
    const firstRain = rainy.findIndex(Boolean);
    const rainNow = firstRain === 0;
    let rainStartsInMin = null;
    let rainEndsInMin = null;
    if (firstRain >= 0) {
      rainStartsInMin = firstRain;
      if (rainNow) {
        const endIdx = rainy.findIndex((v, i) => i > 0 && !v);
        rainEndsInMin = endIdx >= 0 ? endIdx : null;
      }
    }
    const avg = (arr) => {
      const xs = arr.map(Number).filter(Number.isFinite);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    };
    const a0 = avg(minutes.slice(0, 30));
    const a1 = avg(minutes.slice(30, 60));
    let trend = "none";
    if (a0 >= threshold || a1 >= threshold) {
      const diff = a1 - a0;
      trend = Math.abs(diff) < 0.02 ? "steady" : diff > 0 ? "up" : "down";
    }
    const rainyMinutes = rainy.filter(Boolean).length;
    const maxIntensity = minutes.reduce((m, v) => Math.max(m, Number(v) || 0), 0);
    const periodCount = Math.max(1, Math.ceil(minutes.length / 30));
    const probArr = Array.isArray(n.probability) ? n.probability.map(Number).slice(0, periodCount) : [];
    const probMax = probArr.length ? Math.max(...probArr) : Number(n.probability) || 0;

    let verdict = "未来2小时无雨";
    let verdictSub = "适合外出，暂不需要带伞";
    if (expired) {
      verdict = "临近预报已过期";
      verdictSub = "请点击右上角“刷新”获取最新数据";
    } else if (rainNow) {
      verdict = "正在下雨";
      verdictSub =
        rainEndsInMin != null
          ? `预计约 ${rainEndsInMin} 分钟后转晴`
          : "未来2小时内降雨持续";
    } else if (rainStartsInMin != null) {
      verdict = `约 ${rainStartsInMin} 分钟后开始下雨`;
      verdictSub = "出门前建议带上雨具";
    }
    const trendText = {
      up: "雨势在增强",
      down: "雨势在减弱",
      steady: "雨势基本平稳",
      none: "暂无临近趋势"
    }[trend] || "暂无临近趋势";

    const fullCount = 120;
    const nowIndex = Math.min(elapsedMin, fullCount);
    const futureCount = fullCount - nowIndex;
    const nowPct = (nowIndex / fullCount) * 100;
    const strip = allMinutes
      .slice(0, fullCount)
      .map((v, i) => {
        const lv = intensityLevel(v);
        const past = i < nowIndex;
        return `<span class="minute-cell level-${lv} ${past ? "past" : ""}" title="${past ? "已过" : lv === "none" ? "无雨" : "降雨"}"></span>`;
      })
      .join("");
    const labelItems = [{ pct: nowPct, text: nowIndex >= fullCount ? "现在 · 已过期" : "现在", now: true }];
    [30, 60, 90].forEach((m) => {
      const pct = ((nowIndex + m) / fullCount) * 100;
      if (pct <= 100) labelItems.push({ pct, text: `+${m}分` });
    });
    if (futureCount > 0) {
      labelItems.push({ pct: 100, text: `+${futureCount}分`, right: true });
    }
    labelItems.sort((a, b) => a.pct - b.pct);
    const labels = labelItems
      .map((l) => {
        const right = l.right || (l.now && l.pct >= 100);
        const style =
          `left:${l.pct}%` +
          (right
            ? "; transform:translateX(-100%); padding-left:0; padding-right:4px; border-left:none; border-right:1px solid var(--line-strong); text-align:right"
            : "");
        const cls = ["minute-label", l.now ? "now" : "", right ? "right" : ""].filter(Boolean).join(" ");
        return `<span class="${cls}" style="${style}">${l.text}</span>`;
      })
      .join("");
    const freshness = expired
      ? `数据更新于 ${fmtClock(baseMs)} · 已过期 ${elapsedMin} 分钟`
      : elapsedMin > 0
        ? `数据更新于 ${fmtClock(baseMs)} · 已过去 ${elapsedMin} 分钟，预报已按当前时间重排`
        : `数据更新于 ${fmtClock(baseMs)} · 实时`;
    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);
    const h2Start = hourStart.getTime();
    const h2End = h2Start + 120 * 60 * 1000;
    const soonHourly = (entry.hourly || []).filter((h) => {
      const t = new Date(h.time).getTime();
      return Number.isFinite(t) && t >= h2Start && t < h2End;
    });
    const hourlyRain = soonHourly.filter((h) => h.rain);
    const radarRain = !expired && (rainNow || rainStartsInMin != null);
    let conflictHtml = "";
    if (hourlyRain.length && !radarRain) {
      const times = hourlyRain.slice(0, 2).map((h) => `${fmtHour(h.time)} ${h.weather}`).join("、");
      conflictHtml = `<div class="nowcast-conflict">逐小时预报显示 ${times} 有雨，但雷达临近预报暂未检出雨带。2小时内以此栏目数据为准，仍建议留意预报调整。</div>`;
    } else if (!hourlyRain.length && radarRain) {
      conflictHtml = `<div class="nowcast-conflict">雷达临近预报显示未来可能有雨，但逐小时预报暂未标注降雨。2小时内以此栏目数据为准，仍建议留意短时阵雨。</div>`;
    }

    els.nowcast.innerHTML = `
      <div class="panel-head">
        <h2><span class="scope-chip point">本校区</span> 未来2小时降雨</h2>
        <span class="panel-meta">雷达临近预报 · 逐分钟 · 校区点位</span>
      </div>
      <div class="panel-body">
        <div class="nowcast-freshness ${expired ? "stale" : ""}">${freshness}</div>
        ${conflictHtml}
        <div class="nowcast-grid">
          <div class="nowcast-verdict ${rainNow || rainStartsInMin != null ? "rain" : ""}">
            <div class="nowcast-verdict-title">${verdict}</div>
            <div class="nowcast-verdict-sub">${verdictSub}</div>
          </div>
          <div class="nowcast-stats">
            <div class="stat-cell">
              <div class="label">临近趋势</div>
              <div class="value">${trendText}</div>
            </div>
            <div class="stat-cell">
              <div class="label">剩余时段降水概率</div>
              <div class="value">${Math.round(probMax * 100)}%</div>
            </div>
            <div class="stat-cell">
              <div class="label">剩余降雨分钟</div>
              <div class="value">${rainyMinutes} 分钟</div>
            </div>
            <div class="stat-cell">
              <div class="label">最近雨带（更新时）</div>
              <div class="value">${n.nearestRainKm > 0 ? `${n.nearestRainKm.toFixed(1)} km` : "附近无雨"}</div>
            </div>
          </div>
        </div>
        ${n.description ? `<div class="nowcast-desc">${n.description}</div>` : ""}
        <div class="nowcast-scroll">
          <div class="nowcast-track">
            <div class="minute-labels">${labels}</div>
            <div class="nowcast-strip" style="grid-template-columns:repeat(${fullCount}, minmax(0,1fr))">${strip}</div>
            <div class="nowcast-now-line" style="left:${nowPct}%"></div>
          </div>
        </div>
        <div class="legend">
          <span class="legend-item"><span class="legend-swatch none"></span>无雨</span>
          <span class="legend-item"><span class="legend-swatch light"></span>小雨</span>
          <span class="legend-item"><span class="legend-swatch moderate"></span>中雨</span>
          <span class="legend-item"><span class="legend-swatch heavy"></span>大雨</span>
          <span class="legend-item"><span class="legend-swatch extreme"></span>暴雨</span>
        </div>
      </div>
    `;
  }

  function parseHourly(entry) {
    const now = Date.now();
    const list = (entry.hourly || []).filter((h) => {
      const t = new Date(h.time).getTime();
      return Number.isFinite(t);
    });
    return { now, list };
  }

  function next24(list, now) {
    const start = now - 30 * 60 * 1000;
    const end = start + 24 * 60 * 60 * 1000;
    return list.filter((h) => {
      const t = new Date(h.time).getTime();
      return t >= start && t < end;
    });
  }

  function summarize(entry) {
    const { now, list } = parseHourly(entry);
    const hours = next24(list, now);
    const rainy = hours.filter((h) => h.rain);
    const levels = ["extreme", "heavy", "moderate", "light"];
    const maxLevel = levels.find((lv) => rainy.some((h) => h.rainLevel === lv)) || "none";
    const temps = hours.map((h) => h.temp).filter((t) => Number.isFinite(t));
    const high = temps.length ? Math.max(...temps) : null;
    const low = temps.length ? Math.min(...temps) : null;
    const nextRain = rainy.find((h) => new Date(h.time).getTime() > now - 30 * 60 * 1000);
    const nowHour = list.find((h) => {
      const t = new Date(h.time).getTime();
      const hourStart = new Date(now).setMinutes(0, 0, 0);
      return t >= hourStart - 60 * 60 * 1000 && t < hourStart + 60 * 60 * 1000;
    });
    const sorted = hours.slice().sort((a, b) => new Date(a.time) - new Date(b.time));
    const windows = [];
    let cur = null;
    for (const h of sorted) {
      if (!h.rain) continue;
      const t = new Date(h.time).getTime();
      if (cur && t - new Date(cur.end).getTime() <= 60 * 60 * 1000 + 10000) {
        cur.end = h.time;
        if (h.rainLevel !== "light" || cur.level === "light") cur.level = h.rainLevel;
      } else {
        cur = { start: h.time, end: h.time, level: h.rainLevel };
        windows.push(cur);
      }
    }
    return {
      total: hours.length,
      rainy: rainy.length,
      maxLevel,
      high,
      low,
      nextRain,
      windows,
      nowRainy: Boolean(nowHour && nowHour.rain)
    };
  }

  function renderHero(loc, entry) {
    const cur = entry.current || {};
    const isRainyNow = /雨|雷|冰雹|冻/.test(cur.weather || "");
    els.hero.innerHTML = `
      <div class="hero-grid">
        <div class="hero-location">
          <h2>${loc.university} ${loc.campus}</h2>
          <div class="hero-district">${loc.district} · ${loc.city} · 区县站实况</div>
          <div class="hero-current">
            <span class="temp">${cur.temp ?? "--"}</span>
            <span class="temp-unit">℃</span>
          </div>
          <div class="hero-district" style="margin-top:6px">${cur.weather || "暂无实况"}</div>
        </div>
        <div class="hero-conditions">
          <div class="condition-cell">
            <div class="label">当前降雨</div>
            <div class="value">${isRainyNow ? "有雨" : "无雨"}</div>
          </div>
          <div class="condition-cell">
            <div class="label">24小时雨量</div>
            <div class="value">${cur.rain24h ?? "--"} mm</div>
          </div>
          <div class="condition-cell">
            <div class="label">相对湿度</div>
            <div class="value">${cur.humidity || "--"}</div>
          </div>
          <div class="condition-cell">
            <div class="label">风向</div>
            <div class="value small">${cur.windDir || "--"}</div>
          </div>
          <div class="condition-cell">
            <div class="label">风力</div>
            <div class="value small">${cur.windScale || "--"}</div>
          </div>
          <div class="condition-cell">
            <div class="label">实况时间</div>
            <div class="value small">${fmtUpdated(cur.updatedAt)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSummary(loc, entry) {
    const s = summarize(entry);
    const nextText = s.nextRain
      ? `约 ${fmtHour(s.nextRain.time)} 开始`
      : s.rainy > 0
        ? "未来24小时内有雨"
        : "未来24小时无降雨";
    const windowText = s.windows.length
      ? s.windows
          .slice(0, 5)
          .map((w) => `${fmtHour(w.start)}-${fmtHour(w.end)} ${rainLevelLabel(w.level)}`)
          .join("；")
      : "暂无降雨";
    els.summary.innerHTML = `
      <div class="panel-head">
        <h2><span class="scope-chip district">区县</span> 24小时降雨趋势</h2>
        <span class="panel-meta">数值模式 · ${loc.city}</span>
      </div>
      <div class="panel-body">
        <div class="summary-grid">
          <div class="summary-cell">
            <div class="label">降雨小时</div>
            <div class="value">${s.rainy} / ${s.total} 小时</div>
            <div class="sub">${s.rainy > 0 ? "注意带伞" : "基本无雨"}</div>
          </div>
          <div class="summary-cell">
            <div class="label">最强雨级</div>
            <div class="value">${rainLevelLabel(s.maxLevel)}</div>
            <div class="sub">${s.nowRainy ? "当前时段有雨" : "当前时段无雨"}</div>
          </div>
          <div class="summary-cell">
            <div class="label">未来24小时最高温</div>
            <div class="value">${s.high ?? "--"} ℃</div>
            <div class="sub">最低 ${s.low ?? "--"} ℃</div>
          </div>
          <div class="summary-cell">
            <div class="label">下一场雨</div>
            <div class="value" style="font-size:16px">${nextText}</div>
          </div>
        </div>
        <div class="summary-windows">
          <span class="label">降雨时段</span>
          <span class="value">${windowText}</span>
        </div>
      </div>
    `;
  }

  function renderTimeline(loc, entry) {
    const { now, list } = parseHourly(entry);
    const hours = next24(list, now).slice(0, 24);
    const cells = hours.map((h) => {
      const cls = `hour-cell rain-${h.rainLevel || "none"}`;
      return `
        <div class="${cls}" title="${h.weather} ${h.temp}℃">
          <div class="hour-time">${fmtHour(h.time)}</div>
          <div class="hour-weather">${h.weather}</div>
          <div class="hour-rain"><span></span></div>
          <div class="hour-temp">${h.temp}℃</div>
        </div>
      `;
    });
    els.timeline.innerHTML = `
      <div class="panel-head">
        <h2><span class="scope-chip district">区县</span> 24小时降雨时间线</h2>
        <span class="panel-meta">数值模式 · 颜色越深雨越强</span>
      </div>
      <div class="panel-body">
        ${hours.length ? `<div class="timeline-scroll"><div class="timeline">${cells.join("")}</div></div>` : `<div class="empty-state">暂无逐小时预报数据</div>`}
        <div class="legend">
          <span class="legend-item"><span class="legend-swatch none"></span>无雨</span>
          <span class="legend-item"><span class="legend-swatch light"></span>小雨</span>
          <span class="legend-item"><span class="legend-swatch moderate"></span>中雨</span>
          <span class="legend-item"><span class="legend-swatch heavy"></span>大雨</span>
          <span class="legend-item"><span class="legend-swatch extreme"></span>暴雨</span>
        </div>
      </div>
    `;
  }

  function renderHourly(loc, entry) {
    const { now, list } = parseHourly(entry);
    const currentHourStart = new Date(now);
    currentHourStart.setMinutes(0, 0, 0);
    const foundIdx = list.findIndex((h) => new Date(h.time).getTime() >= currentHourStart.getTime());
    const startIdx = foundIdx < 0 || foundIdx >= list.length ? 0 : foundIdx;
    const rows = list.slice(startIdx, startIdx + config.showHours);
    const body = rows
      .map((h) => {
        const t = new Date(h.time).getTime();
        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);
        const hourStartMs = hourStart.getTime();
        const isNow = t >= hourStartMs && t < hourStartMs + 60 * 60 * 1000;
        return `
          <tr>
            <td>${fmtDayHour(h.time)}${isNow ? " <strong>现在</strong>" : ""}</td>
            <td>${h.weather}</td>
            <td class="num">${h.temp} ℃</td>
            <td class="num">${h.humidity} %</td>
            <td class="rain-cell">${rainChip(h.rainLevel)}</td>
          </tr>
        `;
      })
      .join("");
    els.hourly.innerHTML = `
      <div class="panel-head">
        <h2><span class="scope-chip district">区县</span> 逐小时预报</h2>
        <span class="panel-meta">数值模式 · ${entry.name} · 未来${config.showHours}小时</span>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>天气</th>
              <th class="num">温度</th>
              <th class="num">湿度</th>
              <th>降雨</th>
            </tr>
          </thead>
          <tbody>${body || '<tr><td colspan="5" class="empty-state">暂无数据</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  function render(loc, entry) {
    if (!entry || entry.error || !(entry.hourly || []).length) {
      els.nowcast.innerHTML = "";
      els.hero.innerHTML = `<div class="empty-state">${entry?.error ? `数据获取失败：${entry.error}` : "暂无该校区数据"}</div>`;
      els.summary.innerHTML = "";
      els.timeline.innerHTML = "";
      els.hourly.innerHTML = "";
      return;
    }
    renderNowcast(loc, entry);
    renderHero(loc, entry);
    renderSummary(loc, entry);
    renderTimeline(loc, entry);
    renderHourly(loc, entry);
  }

  async function loadSelected() {
    const loc = selectedLocation();
    if (!loc) {
      setStatus("未找到校区配置", true);
      return;
    }
    state.loading = true;
    els.refresh.disabled = true;
    setStatus(`正在加载 ${loc.university} ${loc.campus} 的天气…`);

    try {
      let entry = state.weatherByCode[loc.id];
      if (!entry) {
        if (config.dataMode === "worker" && config.workerUrl) {
          const coordParam =
            Number.isFinite(loc.lat) && Number.isFinite(loc.lng) ? `&lat=${loc.lat}&lng=${loc.lng}` : "";
          const res = await fetch(`${config.workerUrl.replace(/\/$/, "")}/api/weather?code=${loc.code}${coordParam}`);
          if (!res.ok) throw new Error(`接口返回 ${res.status}`);
          entry = await res.json();
          state.sourceLabel = "Cloudflare Worker 实时抓取";
        } else {
          if (!state.allData) {
            const res = await fetch(`data/weather.json?t=${Date.now()}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`无法读取 data/weather.json (${res.status})`);
            state.allData = await res.json();
          }
          entry = state.allData.locations[loc.id];
          state.sourceLabel = state.allData.source || "中国天气网";
        }
        state.weatherByCode[loc.id] = entry;
      }

      els.footerNote.textContent = `数据来源：${state.sourceLabel} · ${state.allData ? state.allData.generatedAt || "" : ""}`.trim();
      render(loc, entry);
      setStatus(`已更新 ${loc.university} ${loc.campus} · ${fmtUpdated(entry.updatedAt)}`);
    } catch (e) {
      setStatus(`加载失败：${e.message}`, true);
    } finally {
      state.loading = false;
      els.refresh.disabled = false;
    }
  }

  const API_FALLBACK = {
    name: "雨否 API",
    version: "1.0.0",
    deployNote: "GitHub Pages 静态构建仅提供 data/weather.json；/api/weather 需要另行部署 Cloudflare Worker 后才可用。",
    spatialScope: "nowcast 为本校区点位（雷达回波外推），hourly/current 为所在区县站（数值模式/实况站）",
    cache: "请求天气数据时建议追加 ?t=时间戳 防缓存；Worker 接口服务端缓存 5 分钟",
    endpoints: [
      {
        name: "实时校区天气（Cloudflare Worker）",
        method: "GET",
        url: "/api/weather?code=101280101&lat=23.096943&lng=113.297711",
        deploy: "cloudflare",
        desc: "返回 current / hourly / nowcast 等字段",
        params: [
          { name: "code", desc: "中国天气网区县代码（9 位数字）" },
          { name: "lat/lng", desc: "校区 GCJ-02 坐标，用于分钟级雷达临近预报" }
        ]
      },
      {
        name: "静态数据快照（GitHub Pages）",
        method: "GET",
        url: "/data/weather.json?t={timestamp}",
        deploy: "github-pages",
        desc: "按 campus id 索引的全量校区天气与分钟级临近预报",
        params: [{ name: "t", desc: "缓存破坏时间戳，建议每次请求追加" }]
      }
    ]
  };

  async function renderApi() {
    let spec = null;
    try {
      const res = await fetch(`api.json?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) spec = await res.json();
    } catch {}
    const s = spec || API_FALLBACK;
    const deployLabel = { cloudflare: "Cloudflare Worker", "github-pages": "GitHub Pages", both: "通用" };
    const endpoints = (s.endpoints || [])
      .map(
        (e) => `
          <div class="api-endpoint">
            <div class="api-row">
              <span class="api-method">${e.method || "GET"}</span>
              <span class="api-deploy deploy-${e.deploy || "both"}">${deployLabel[e.deploy] || "通用"}</span>
              <code class="api-url">${e.url}</code>
            </div>
            ${e.desc ? `<p class="api-desc">${e.desc}</p>` : ""}
            ${e.params && e.params.length
              ? `<div class="api-params">${e.params
                  .map((p) => `<span class="api-param"><code>${p.name}</code> ${p.desc}</span>`)
                  .join("")}</div>`
              : ""}
          </div>
        `
      )
      .join("");
    els.api.innerHTML = `
      <div class="panel-head">
        <h2>API 说明</h2>
        <span class="panel-meta">${s.name || "雨否 API"} · v${s.version || "1.0"}</span>
      </div>
      <div class="panel-body">
        ${s.deployNote ? `<div class="api-note api-deploy-note">${s.deployNote}</div>` : ""}
        ${s.spatialScope ? `<div class="api-note">${s.spatialScope}</div>` : ""}
        ${endpoints}
        ${s.cache ? `<div class="api-note">${s.cache}</div>` : ""}
      </div>
    `;
  }

  function init() {
    buildSelect();
    const saved = localStorage.getItem(STORAGE_KEY);
    state.selectedId = locations.some((l) => l.id === saved) ? saved : window.DEFAULT_CAMPUS_ID;
    els.select.value = state.selectedId;
    els.select.addEventListener("change", () => {
      state.selectedId = els.select.value;
      localStorage.setItem(STORAGE_KEY, state.selectedId);
      state.weatherByCode = {};
      loadSelected();
    });
    els.refresh.addEventListener("click", () => {
      state.weatherByCode = {};
      loadSelected();
    });
    loadSelected();
    renderApi();
    if (config.refreshMinutes > 0) {
      setInterval(() => {
        state.weatherByCode = {};
        loadSelected();
      }, config.refreshMinutes * 60 * 1000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
