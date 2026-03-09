function analyzeHeadersFromHtml(html, url) {
  const lower = html.toLowerCase();

  return {
    url,
    hasTitleTag: lower.includes("<title"),
    hasMetaRefresh: /<meta[^>]+http-equiv=["']?refresh/i.test(html),
    hasPasswordKeyword: /password|passwd|otp|verify|security/i.test(html),
    hasNaverKeyword: /naver/i.test(html),
    hasGoogleKeyword: /google/i.test(html),
    hasMicrosoftKeyword: /microsoft|outlook|office/i.test(html)
  };
}