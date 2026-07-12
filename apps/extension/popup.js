const DEFAULTS = {
  auto: false,
  apiUrl: "http://localhost:3001",
  webUrl: "http://localhost:5173",
  apiKey: "",
};

const auto = document.getElementById("auto");
const apiUrl = document.getElementById("apiUrl");
const webUrl = document.getElementById("webUrl");
const apiKey = document.getElementById("apiKey");

chrome.storage.local.get(DEFAULTS, (s) => {
  auto.checked = s.auto;
  apiUrl.value = s.apiUrl;
  webUrl.value = s.webUrl;
  apiKey.value = s.apiKey;
});

auto.addEventListener("change", () =>
  chrome.storage.local.set({ auto: auto.checked }),
);
apiUrl.addEventListener("change", () =>
  chrome.storage.local.set({ apiUrl: apiUrl.value.trim() || DEFAULTS.apiUrl }),
);
webUrl.addEventListener("change", () =>
  chrome.storage.local.set({ webUrl: webUrl.value.trim() || DEFAULTS.webUrl }),
);
apiKey.addEventListener("change", () =>
  chrome.storage.local.set({ apiKey: apiKey.value.trim() }),
);
