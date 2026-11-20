const imageInput = document.getElementById("image");
const preview = document.getElementById("preview");
const analyzeButton = document.getElementById("analyzeButton");
const result = document.getElementById("result");

// Use the local FastAPI server during development and the same deployed
// origin when the app is opened from Render.
const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://127.0.0.1:8000"
  : window.location.origin;

const form = document.querySelector("form");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) {
    preview.hidden = true;
    return;
  }

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

analyzeButton.addEventListener("click", async (event) => {
  event.preventDefault();
  const image = imageInput.files[0];
  const crop = document.getElementById("crop").value;

  if (!image) {
    alert("Please select a tomato leaf image first.");
    return;
  }

  const formData = new FormData();
  formData.append("crop", crop);
  formData.append("image", image);

  analyzeButton.textContent = "Analyzing...";
  analyzeButton.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Prediction request failed.");
    }

    const organicItems = data.treatment.organic
      .map((item) => `<li>${item}</li>`)
      .join("");

    const chemicalItems = data.treatment.chemical
      .map((item) => `<li>${item}</li>`)
      .join("");

    result.innerHTML = `
      <h2>Screening Result</h2>
      <p><strong>Possible condition:</strong> ${data.prediction}</p>
      <p><strong>Confidence:</strong> ${data.confidence}%</p>
      <p><strong>Prototype severity:</strong> ${data.severity}</p>
      <p><strong>Advice:</strong> ${data.advisory}</p>
      <h3>Organic Management</h3>
      <ul class="treatment-list">${organicItems}</ul>
      <h3>Chemical Treatment for India / Uttar Pradesh</h3>
      <ul class="treatment-list">${chemicalItems}</ul>
      <p class="notice">
        This is a screening tool, not a guaranteed diagnosis. Chemical active ingredients are examples only. Confirm the current product label, dose, protective equipment, and harvest interval with a Uttar Pradesh KVK or agriculture officer before use.
      </p>
    `;

    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (error) {
    result.innerHTML = `
      <h2>Could not analyze the image</h2>
      <p>${error.message}</p>
    `;
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } finally {
    analyzeButton.textContent = "Analyze Image";
    analyzeButton.disabled = false;
  }
});
const historyButton = document.getElementById("historyButton");
const history = document.getElementById("history");
const historyContent = document.getElementById("historyContent");

historyButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/reports");
    const reports = await response.json();

    if (reports.length === 0) {
      historyContent.innerHTML = "<p>No reports have been saved yet.</p>";
    } else {
      historyContent.innerHTML = reports.map((report) => `
        <article class="report-item">
          <p><strong>${report.prediction}</strong> - ${report.confidence}% confidence</p>
          <p>Crop: ${report.crop} | Severity: ${report.severity}</p>
          <p>${report.advisory}</p>
          <small>${new Date(report.created_at).toLocaleString()}</small>
        </article>
      `).join("");
    }

    history.hidden = false;
    history.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    historyContent.innerHTML = "<p>Could not load report history.</p>";
    history.hidden = false;
  }
});

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

function addChatMessage(text, type) {
  const message = document.createElement("div");
  message.className = `chat-message ${type}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function askChatbot(question) {
  const trimmed = question.trim();
  if (!trimmed) return;

  addChatMessage(trimmed, "user");
  chatInput.value = "";
  addChatMessage("Soch raha hoon...", "bot typing");
  const typingMessage = chatMessages.lastElementChild;

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: trimmed,
        crop: document.getElementById("crop").value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Chat request failed.");
    typingMessage.remove();
    addChatMessage(data.reply, "bot");
    if (data.safety) addChatMessage(`Safety: ${data.safety}`, "bot safety");
  } catch (error) {
    typingMessage.remove();
    addChatMessage(`Chat unavailable: ${error.message}`, "bot error");
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askChatbot(chatInput.value);
});

document.querySelectorAll(".quick-question").forEach((button) => {
  button.addEventListener("click", () => askChatbot(button.textContent));
});

const menuButton = document.getElementById("menuButton");
const sidebar = document.querySelector(".sidebar");
if (menuButton) {
  menuButton.addEventListener("click", () => sidebar.classList.toggle("open"));
  document.querySelectorAll(".side-nav a").forEach((link) => {
    link.addEventListener("click", () => sidebar.classList.remove("open"));
  });
}

function weatherDescription(code) {
  if (code === 0) return ["Clear sky", "☀️"];
  if ([1, 2, 3].includes(code)) return ["Partly cloudy", "🌤️"];
  if ([45, 48].includes(code)) return ["Foggy", "🌫️"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["Drizzle", "🌦️"];
  if ([61, 63, 65, 80, 81, 82].includes(code)) return ["Rain", "🌧️"];
  if ([95, 96, 99].includes(code)) return ["Thunderstorm", "⛈️"];
  return ["Mixed weather", "🌤️"];
}

async function updateWeather() {
  const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=27.24&longitude=79.02&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FKolkata&forecast_days=4";
  try {
    const response = await fetch(weatherUrl);
    if (!response.ok) throw new Error("Weather service unavailable");
    const data = await response.json();
    const current = weatherDescription(data.current.weather_code);
    document.getElementById("weatherTemp").innerHTML = `${Math.round(data.current.temperature_2m)}°<sup>C</sup>`;
    document.getElementById("weatherSummary").textContent = `${current[0]} · Mainpuri, UP`;
    document.getElementById("weatherIcon").textContent = current[1];
    document.getElementById("weatherLargeTemp").textContent = `${Math.round(data.current.temperature_2m)}°`;
    document.getElementById("weatherLargeSummary").textContent = `${current[0]} · updated now`;
    document.getElementById("weatherLargeIcon").textContent = current[1];
    document.getElementById("forecastDays").innerHTML = data.daily.time.map((date, index) => {
      const day = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const dayWeather = weatherDescription(data.daily.weather_code[index]);
      return `<span><b>${day}</b><strong>${Math.round(data.daily.temperature_2m_max[index])}°</strong><small>${dayWeather[0]}</small></span>`;
    }).join("");
  } catch (error) {
    document.getElementById("weatherSummary").textContent = "Weather unavailable · Mainpuri, UP";
    document.getElementById("weatherLargeSummary").textContent = "Connect to internet to update";
  }
}

updateWeather();
setInterval(updateWeather, 30 * 60 * 1000);
