const scanBtn = document.getElementById("scanBtn");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const headersOutEl = document.getElementById("headersOut");
const formsOutEl = document.getElementById("formsOut");
const cfOutEl = document.getElementById("cfOut");
const debugOutEl = document.getElementById("debugOut");
const jsOutEl = document.getElementById("jsOut");

function setStatus(text) {
  statusEl.textContent = text;
}

function debugLog(...args) {
  const line = args
    .map(v => {
      try {
        return typeof v === "string" ? v : JSON.stringify(v, null, 2);
      } catch {
        return String(v);
      }
    })
    .join(" ");

  console.log("[Phish Inspector]", ...args);
  debugOutEl.textContent += `${line}\n`;
}

function renderSummary(items) {
  summaryEl.innerHTML = "";
  items.forEach(item => {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = item;
    summaryEl.appendChild(badge);
  });
}

function evalInInspectedWindow(expression) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      expression,
      { useContentScriptContext: false },
      (result, exceptionInfo) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (exceptionInfo) {
          reject(new Error(JSON.stringify(exceptionInfo)));
          return;
        }

        resolve(result);
      }
    );
  });
}

async function getCurrentPageHtml() {
  return await evalInInspectedWindow("document.documentElement.outerHTML");
}

async function getCurrentUrl() {
  return await evalInInspectedWindow("location.href");
}

scanBtn.addEventListener("click", async () => {
  debugOutEl.textContent = "";
  headersOutEl.textContent = "-";
  formsOutEl.textContent = "-";
  cfOutEl.textContent = "-";
  summaryEl.innerHTML = "";
  jsOutEl.textContent = "-";

  try {
    setStatus("Scanning...");
    debugLog("Scan button clicked");

    const url = await getCurrentUrl();
    debugLog("URL read ok:", url);

    const html = await getCurrentPageHtml();
    debugLog("HTML length:", html ? html.length : 0);

    if (!html || typeof html !== "string") {
      throw new Error("HTML을 가져오지 못했습니다.");
    }

    if (typeof analyzeHeadersFromHtml !== "function") {
      throw new Error("analyzeHeadersFromHtml is not loaded");
    }
    if (typeof analyzeForms !== "function") {
      throw new Error("analyzeForms is not loaded");
    }
    if (typeof analyzeCloudflareHints !== "function") {
      throw new Error("analyzeCloudflareHints is not loaded");
    }
    if (typeof buildSummary !== "function") {
      throw new Error("buildSummary is not loaded");
    }
    if (typeof analyzeInlineScripts !== "function") {
      throw new Error("analyzeInlineScripts is not loaded");
    }

    const headerInfo = analyzeHeadersFromHtml(html, url);
    const formInfo = analyzeForms(html);
    const cloudflareInfo = analyzeCloudflareHints(html);
    const jsInfo = analyzeInlineScripts(html);
    const summary = buildSummary({ headerInfo, formInfo, cloudflareInfo, jsInfo });

    headersOutEl.textContent = JSON.stringify(headerInfo, null, 2);
    formsOutEl.textContent = JSON.stringify(formInfo, null, 2);
    cfOutEl.textContent = JSON.stringify(cloudflareInfo, null, 2);
    jsOutEl.textContent = JSON.stringify(jsInfo, null, 2);
    renderSummary(summary);

    debugLog("Analysis complete");
    setStatus("Done");
  } catch (err) {
    console.error(err);
    debugLog("ERROR:", err.message);
    setStatus(`Error: ${err.message}`);
  }
});