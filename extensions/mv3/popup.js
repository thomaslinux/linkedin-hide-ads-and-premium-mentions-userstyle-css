document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("vars");
  const { userstyleVars } = await chrome.storage.local.get("userstyleVars");

  if (!userstyleVars || Object.keys(userstyleVars).length === 0) {
    container.textContent = "No options found (style not fetched yet).";
    return;
  }

// Replace the entire Object.entries(userstyleVars).forEach loop with:
const { userstyleCSS } = await chrome.storage.local.get("userstyleCSS");
const lines = userstyleCSS.split('\n');
const sections = {};
let currentSection = "Other";

for (const line of lines) {
  if (line.includes('# Section')) {
    currentSection = line.trim().slice(10).trim();
  }
  const varMatch = line.match(/@var\s+checkbox\s+([^\s]+)/);
  if (varMatch) {
    sections[varMatch[1]] = currentSection;
  }
}

const groupedVars = {};
Object.entries(userstyleVars).forEach(([id, info]) => {
  const section = sections[id] || "Other";
  if (!groupedVars[section]) groupedVars[section] = [];
  groupedVars[section].push({ id, ...info });
});

Object.entries(groupedVars).forEach(([sectionName, vars]) => {
  // Section header
  const sectionDiv = document.createElement("div");
  sectionDiv.style.marginBottom = "12px";
  sectionDiv.innerHTML = `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">${sectionName}</h3>`;
  container.appendChild(sectionDiv);

  // Original checkbox code (unchanged)
  vars.forEach(({ id, label, enabled }) => {
    const wrapper = document.createElement("div");
    wrapper.className = "var-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.checked = enabled;

    const labelEl = document.createElement("label");
    labelEl.htmlFor = id;
    labelEl.textContent = label || id;

    checkbox.addEventListener("change", async () => {
      const stored = await chrome.storage.local.get("userstyleVars");
      const vars = stored.userstyleVars || {};
      if (!vars[id]) return;
      vars[id].enabled = checkbox.checked;
      await chrome.storage.local.set({ userstyleVars: vars });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.id) return;
        chrome.tabs.sendMessage(tab.id, { type: "rebuildCSS" });
      });
    });

    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelEl);
    sectionDiv.appendChild(wrapper);
  });
});

