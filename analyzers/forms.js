function analyzeForms(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const forms = [...doc.querySelectorAll("form")];

  const results = forms.map((form, index) => {
    const inputs = [...form.querySelectorAll("input")];
    const passwordFields = inputs.filter(i => (i.type || "").toLowerCase() === "password");
    const emailFields = inputs.filter(i => (i.type || "").toLowerCase() === "email");
    const hiddenFields = inputs.filter(i => (i.type || "").toLowerCase() === "hidden");

    return {
      index,
      action: form.getAttribute("action") || "",
      method: (form.getAttribute("method") || "GET").toUpperCase(),
      inputCount: inputs.length,
      passwordCount: passwordFields.length,
      emailCount: emailFields.length,
      hiddenCount: hiddenFields.length
    };
  });

  return {
    formCount: forms.length,
    forms: results
  };
}