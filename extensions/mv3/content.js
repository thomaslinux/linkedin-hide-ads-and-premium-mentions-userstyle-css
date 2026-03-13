let currentStyle = null;
let styleElement = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateSettings") {
    updateCSS(message.settings);
  }
});

async function init() {
  const settings = JSON.parse(localStorage.getItem("settings") || "{}");
  await updateCSS(settings);

  // Watch for storage changes
  window.addEventListener("storage", (e) => {
    if (e.key === "settings") {
      const newSettings = JSON.parse(e.newValue || "{}");
      updateCSS(newSettings);
    }
  });
}

async function updateCSS(settings) {
  if (styleElement) {
    styleElement.remove();
  }

  // Fetch latest style code
  try {
    const response = await fetch("https://userstyles.world/api/style/25558");
    const data = await response.json();
    const code = data.data.code;

    // Parse and build CSS based on settings
    const css = parseAndBuildCSS(code, settings);

    styleElement = document.createElement("style");
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  } catch (error) {
    console.error("Failed to update LinkedIn Hider CSS:", error);
  }
}

function parseAndBuildCSS(code, settings) {
  const lines = code.split("\n");
  let css = "";
  let inCssBlock = false;

  lines.forEach((line) => {
    // Skip header
    if (line.includes("==/UserStyle==")) {
      return;
    }

    // Start of CSS block
    if (line.includes('@-moz-document domain("linkedin.com")')) {
      inCssBlock = true;
      css += line + "\n";
      return;
    }

    if (inCssBlock) {
      // Check for if statements
      const ifMatch = line.match(/^if\s+(\w+)\s*{/);
      if (ifMatch) {
        const varName = ifMatch[1];
        if (settings[varName]) {
          css += line.replace("if", "// if") + "\n{";
        }
        return;
      }

      // Include CSS rules if parent if-condition was true
      css += line + "\n";
    }
  });

  return css;
}

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
