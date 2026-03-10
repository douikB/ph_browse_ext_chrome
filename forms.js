function safeFormUrl(input, base) {
  try {
    return new URL(input, base);
  } catch {
    return null;
  }
}

function analyzeForms(html, pageUrl) {
  const findings = [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const forms = [...doc.querySelectorAll("form")];

  const page = safeFormUrl(pageUrl);
  if (!page) return findings;

  for (const form of forms) {
    const method = (form.getAttribute("method") || "GET").toUpperCase();
    const rawAction = form.getAttribute("action") || "";

    if (!rawAction) continue;

    const target = safeFormUrl(rawAction, pageUrl);
    if (!target) continue;

    if (!(target.protocol === "http:" || target.protocol === "https:")) {
      continue;
    }

    const isExternal = target.hostname !== page.hostname;
    const isPhp = /\.php(?:[?#]|$)/i.test(target.pathname);

    if (method === "POST" && isExternal && isPhp) {
      findings.push({
        severity: "HIGH",
        type: "external POST to PHP",
        target: target.href
      });
    }
  }

  return findings;
}