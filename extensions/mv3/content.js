(async () => {
  const processCSS = (code, settings) => {
    let css = code;

    // Replace if conditions with enabled/disabled rules
    Object.entries(settings || {}).forEach(([key, enabled]) => {
      if (!enabled) {
        const pattern = new RegExp(`if ${key} \\{([\\s\\S]*?)\\}`, "g");
        css = css.replace(
          pattern,
          (match, rules) =>
            `/* ${key} disabled */ ${rules.replace(/^\s+/gm, "")}`,
        );
      }
    });

    // Clean up remaining if blocks for enabled vars
    css = css.replace(/if [a-zA-Z0-9_]+ \{([\s\S]*?)\}/g, "$1");

    return css;
  };

  const data = await chrome.storage.local.get(["styleData", "settings"]);
  if (
    data.styleData?.data &&
    window.location.hostname.includes("linkedin.com")
  ) {
    const css = processCSS(data.styleData.data.code, data.settings);

    const style = document.createElement("style");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }
})();
