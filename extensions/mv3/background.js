const STYLE_URL = "https://userstyles.world/api/style/25558";
const FETCH_INTERVAL_HOURS = 24;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("fetchUserstyle", {
    periodInMinutes: FETCH_INTERVAL_HOURS * 60,
  });
  fetchAndStoreUserstyle();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchUserstyle") {
    fetchAndStoreUserstyle();
  }
});

async function fetchAndStoreUserstyle() {
  try {
    const res = await fetch(STYLE_URL);
    const json = await res.json();
    const code = json.data?.code || "";

    // Extract @var checkbox lines
    const varRegex = /@var\s+checkbox\s+([^\s]+)\s+"([^"]*)"\s+([01])/g;
    const vars = {};
    let m;
    while ((m = varRegex.exec(code)) !== null) {
      const id = m[1];
      const label = m[2];
      const defaultVal = m[3] === "1";
      vars[id] = { label, default: defaultVal };
    }

    // Initialize settings if not set
    const stored = await chrome.storage.local.get([
      "userstyleCSS",
      "userstyleVars",
    ]);
    const existingVars = stored.userstyleVars || {};
    const newVarsState = {};

    for (const [id, info] of Object.entries(vars)) {
      if (id in existingVars) {
        newVarsState[id] = { ...info, enabled: existingVars[id].enabled };
      } else {
        newVarsState[id] = { ...info, enabled: info.default };
      }
    }

    await chrome.storage.local.set({
      userstyleCSS: code,
      userstyleVars: newVarsState,
    });
  } catch (e) {
    console.error("Failed to fetch userstyle:", e);
  }
}
