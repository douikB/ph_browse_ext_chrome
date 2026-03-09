function analyzeCloudflareHints(html) {
  return {
    hasCloudflareBeacon: html.includes("static.cloudflareinsights.com/beacon.min.js"),
    hasCdnCgi: html.includes("/cdn-cgi/"),
    hasCloudflareChallengeHint:
      /cf_chl|cf_clearance|challenge-platform|__cf_bm/i.test(html)
  };
}