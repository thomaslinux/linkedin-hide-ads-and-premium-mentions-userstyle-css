document.addEventListener("DOMContentLoaded", async () => {
  const titleEl = document.getElementById("title");
  const checkboxesEl = document.getElementById("checkboxes");
  const updateBtn = document.getElementById("updateBtn");

  let styleData = await chrome.storage.local.get(["styleData"]);

  const fetchStyle = async () => {
    try {
      updateBtn.disabled = true;
      updateBtn.textContent = "Updating...";
      const res = await fetch("https://userstyles.world/api/style/25558");
      styleData = await res.json();
      await chrome.storage.local.set({ styleData, lastUpdate: Date.now() });
      render();
    } catch (e) {
      console.error(e);
    } finally {
      updateBtn.disabled = false;
      updateBtn.textContent = "Update Style";
    }
  };

  const render = () => {
    if (!styleData?.data) return;

    const data = styleData.data;
    const code = data.code;

    // Extract @name, @version
    const nameMatch = code.match(/@name\s+([^\n]+)/);
    const versionMatch = code.match(/@version\s+([^\n]+)/);
    titleEl.textContent = `${nameMatch?.[1] || data.name} ${versionMatch?.[1] || ""}`;

    // Parse checkboxes and sections
    const vars = [];
    const sections = [];
    let currentSection = "General";

    code.split("\n").forEach((line) => {
      if (line.trim().startsWith("# Section")) {
        currentSection = line.trim().slice(11).trim();
      } else if (line.includes("@var checkbox")) {
        const match = line.match(/@var\s+checkbox\s+([^\s]+)\s+"([^"]+)"/);
        if (match) {
          vars.push({ id: match[1], label: match[2], section: currentSection });
        }
      }
    });

    // Group by section
    const grouped = vars.reduce((acc, v) => {
      acc[v.section] = acc[v.section] || [];
      acc[v.section].push(v);
      return acc;
    }, {});

    checkboxesEl.innerHTML = Object.entries(grouped)
      .map(
        ([section, items]) => `
      <article>
        <h3>${section}</h3>
        ${items
          .map(
            (v) => `
          <label>
            <input type="checkbox" id="${v.id}" ${data.settings?.[v.id] ? "checked" : ""}>
            ${v.label}
          </label>
        `,
          )
          .join("")}
      </article>
    `,
      )
      .join("");

    // Bind events
    vars.forEach((v) => {
      const el = document.getElementById(v.id);
      if (el) {
        el.addEventListener("change", () => saveSettings());
      }
    });
  };

  const saveSettings = () => {
    const settings = {};
    vars.forEach((v) => {
      const el = document.getElementById(v.id);
      if (el) settings[v.id] = el.checked;
    });
    chrome.storage.local.set({ settings });
  };

  updateBtn.addEventListener("click", fetchStyle);

  // Load and render
  render();

  // Check daily update
  const lastUpdate = styleData.lastUpdate;
  if (!lastUpdate || Date.now() - lastUpdate > 24 * 60 * 60 * 1000) {
    fetchStyle();
  }
});
