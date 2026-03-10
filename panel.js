const scanBtn = document.getElementById("scanBtn");
const output = document.getElementById("output");

function evalInPage(expression) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      expression,
      { useContentScriptContext: false },
      (result, exceptionInfo) => {
        if (exceptionInfo) {
          reject(new Error(JSON.stringify(exceptionInfo)));
          return;
        }
        resolve(result);
      }
    );
  });
}

async function getCurrentHtml() {
  return await evalInPage("document.documentElement.outerHTML");
}

async function getCurrentUrl() {
  return await evalInPage("location.href");
}

async function getScriptsFromDom() {
  return await evalInPage(`
    (function () {
      const scripts = [];
      document.querySelectorAll("script").forEach((s, index) => {
        scripts.push({
          index: index,
          src: s.src || "",
          inlineContent: s.src ? "" : (s.textContent || s.innerText || "")
        });
      });
      return scripts;
    })()
  `);
}

async function getAllResources() {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.getResources((resources) => {
      resolve(resources || []);
    });
  });
}

async function getResourceContent(resource) {
  return new Promise((resolve) => {
    resource.getContent((content) => {
      resolve({
        url: resource.url,
        content: content || ""
      });
    });
  });
}

async function buildScriptsWithContent(domScripts) {
  const resources = await getAllResources();
  const scriptResources = resources.filter((r) => r.type === "script");

  const resourceContentList = await Promise.all(
    scriptResources.map((r) => getResourceContent(r))
  );

  const contentByUrl = new Map();
  for (const item of resourceContentList) {
    if (!item.url) continue;
    contentByUrl.set(normalizeUrl(item.url), item.content || "");
  }

  const scriptsWithContent = [];

  for (const script of domScripts) {
    if (!script.src) {
      scriptsWithContent.push({
        index: script.index,
        src: "",
        content: script.inlineContent || ""
      });
      continue;
    }

    if (!isUsefulExternalUrl(script.src)) {
      continue;
    }

    const normalized = normalizeUrl(script.src);
    const externalContent = contentByUrl.get(normalized) || "";

    scriptsWithContent.push({
      index: script.index,
      src: normalized,
      content: externalContent
    });
  }

  return scriptsWithContent;
}

function renderFindings(jsFindings, formFindings) {
  const lines = [];

  if (jsFindings.length === 0 && formFindings.length === 0) {
    return "No findings.";
  }

  if (jsFindings.length > 0) {
    lines.push("[JS Findings]");
    lines.push("");

    jsFindings.forEach((item, idx) => {
      lines.push(`${idx + 1}. [${item.severity}]`);
      lines.push(`   source : ${item.source}`);
      lines.push(`   matched: ${item.matched.join(", ")}`);
      lines.push(`   snippet: ${item.snippet}`);
      lines.push("");
    });
  }

  if (formFindings.length > 0) {
    lines.push("[Form Findings]");
    lines.push("");

    formFindings.forEach((item, idx) => {
      lines.push(`${idx + 1}. [${item.severity}] ${item.type}`);
      lines.push(`   target : ${item.target}`);
      lines.push("");
    });
  }

  lines.push(`Total issues: ${jsFindings.length + formFindings.length}`);
  return lines.join("\n");
}

async function runScan() {
  output.textContent = "Scanning...";

  try {
    const [html, url, domScripts] = await Promise.all([
      getCurrentHtml(),
      getCurrentUrl(),
      getScriptsFromDom()
    ]);

    const scriptsWithContent = await buildScriptsWithContent(domScripts);

    const jsFindings = analyzeScripts(scriptsWithContent);
    const formFindings = analyzeForms(html, url);

    output.textContent = renderFindings(jsFindings, formFindings);
  } catch (err) {
    output.textContent = `Error:\n${err.message || String(err)}`;
  }
}

scanBtn.addEventListener("click", runScan);