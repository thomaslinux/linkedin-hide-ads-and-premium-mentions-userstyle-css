document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("vars");
  const { userstyleVars } = await chrome.storage.local.get("userstyleVars");

  if (!userstyleVars || Object.keys(userstyleVars).length === 0) {
    container.textContent = "No options found (style not fetched yet).";
    return;
  }

// Group by simple # SectionName parsing
const sections = {};
Object.entries(userstyleVars).forEach(([id]) => {
  // Extract section from nearest preceding # comment
  const cssLines = (await chrome.storage.local.get("userstyleCSS")).userstyleCSS.split('\n');
  let currentSection = "Other";
  
  for (let i = 0; i < cssLines.length; i++) {
    if (cssLines[i].trim().startsWith('#')) {
      currentSection = cssLines[i].trim().slice(1).trim();
    }
    if (cssLines[i].includes(`@var checkbox ${id}`)) {
      sections[id] = currentSection;
      break;
    }
  }
});

// Group vars and render
const grouped = {};
Object.entries(userstyleVars).forEach(([id, info]) => {
  const section = sections[id] || "Other";
  grouped[section] = grouped[section] || [];
  grouped[section].push({id, ...info});
});

Object.entries(grouped).forEach(([sectionName, vars]) => {
  // Section header
  const sectionDiv = document.createElement("div");
  sectionDiv.style.marginBottom = "12px";
  sectionDiv.innerHTML = `<h3 style="margin: 0 0 8px 0; font-size: 14px;">${sectionName}</h3>`;
  container.appendChild(sectionDiv);

  // Your existing checkbox code here (unchanged)
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
