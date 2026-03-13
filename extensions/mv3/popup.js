let styleData = null;
const API_URL = "https://userstyles.world/api/style/25558";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadSettings();
  await fetchStyleData();
  renderCheckboxes();
  document.getElementById("updateBtn").addEventListener("click", updateStyle);
}

async function fetchStyleData() {
  try {
    document.getElementById("status").textContent = "Fetching style...";
    const response = await fetch(API_URL);
    const data = await response.json();
    styleData = data.data;

    const lines = styleData.code.split("\n");
    const titleMatch = lines
      .find((l) => l.includes("@name"))
      .match(/@name\s+(.+)/);
    const versionMatch = lines
      .find((l) => l.includes("@version"))
      .match(/@version\s+(.+)/);

    document.getElementById("title").textContent =
      `${titleMatch?.[1] || "LinkedIn Hider"} ${versionMatch?.[1] || ""}`;
  } catch (error) {
    console.error("Failed to fetch style:", error);
    document.getElementById("status").textContent = "Failed to load style data";
  }
}

function renderCheckboxes() {
  if (!styleData) return;

  const lines = styleData.code.split("\n");
  const sections = {};
  let currentSection = "General";

  // Parse sections and checkboxes
  lines.forEach((line) => {
    if (line.trim().startsWith("# Section")) {
      currentSection = line.replace("# Section", "").trim();
      sections[currentSection] = [];
    } else if (line.includes("@var checkbox")) {
      const match = line.match(/@var\s+checkbox\s+(\w+)\s+"([^"]+)"\s+(\d+)/);
      if (match) {
        const [_, id, name, defaultValue] = match;
        sections[currentSection].push({
          id,
          name,
          defaultValue: parseInt(defaultValue),
        });
      }
    }
  });

  const sectionsDiv = document.getElementById("sections");
  Object.entries(sections).forEach(([sectionName, checkboxes]) => {
    if (checkboxes.length === 0) return;

    const article = document.createElement("article");
    article.innerHTML = `<h2>${sectionName}</h2>`;

    checkboxes.forEach(({ id, name, defaultValue }) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = id;

      const settings = JSON.parse(localStorage.getItem("settings") || "{}");
      checkbox.checked = settings[id] !== false;

      checkbox.addEventListener("change", () => saveSettings());
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(name));
      article.appendChild(label);
    });

    sectionsDiv.appendChild(article);
  });
}

async function saveSettings() {
  const settings = {};
  document.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    settings[cb.id] = cb.checked;
  });
  localStorage.setItem("settings", JSON.stringify(settings));

  // Update content scripts on all LinkedIn tabs
  const tabs = await chrome.tabs.query({ url: "*://*.linkedin.com/*" });
  tabs.forEach((tab) =>
    chrome.tabs.sendMessage(tab.id, { action: "updateSettings", settings }),
  );
}

async function updateStyle() {
  const btn = document.getElementById("updateBtn");
  btn.disabled = true;
  btn.textContent = "Updating...";

  try {
    await fetchStyleData();
    renderCheckboxes();
    document.getElementById("status").textContent =
      "Style updated successfully";
  } catch (error) {
    document.getElementById("status").textContent = "Update failed";
  } finally {
    btn.disabled = false;
    btn.textContent = "Update Style";
    setTimeout(
      () => (document.getElementById("status").textContent = ""),
      3000,
    );
  }
}

async function loadSettings() {
  // Ensure settings are loaded
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  localStorage.setItem("settings", JSON.stringify(settings));
}
