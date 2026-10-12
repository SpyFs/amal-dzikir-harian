"use strict";

const STORAGE_KEY = "amal-dzikir-harian-v1";
const DHIKR_TARGET = 33;
const DHIKR_NAMES = ["Subhanallah", "Alhamdulillah", "Allahu Akbar"];
const HABIT_COUNT = document.querySelectorAll("[data-habit]").length;

const defaultState = () => ({
  date: getLocalDate(),
  habits: Array(HABIT_COUNT).fill(false),
  dhikr: [0, 0, 0]
});

let state = loadState();
let toastTimer;

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return defaultState();

    const saved = JSON.parse(raw);

    // Tanggal berbeda: mulai catatan hari baru.
    if (saved.date !== getLocalDate()) {
      return defaultState();
    }

    // Periksa bentuk data supaya tidak merusak tampilan.
    if (
      !Array.isArray(saved.habits) ||
      saved.habits.length !== HABIT_COUNT ||
      !Array.isArray(saved.dhikr) ||
      saved.dhikr.length !== 3
    ) {
      return defaultState();
    }

    return {
      date: getLocalDate(),
      habits: saved.habits.map(value => value === true),
      dhikr: saved.dhikr.map(value => {
        const number = Number(value);

        return Number.isSafeInteger(number) && number >= 0
          ? number
          : 0;
      })
    };
  } catch (error) {
    console.error("Gagal membaca data:", error);
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data:", error);
    showToast("Data gagal disimpan. Periksa pengaturan browser.");
    return false;
  }
}

function syncDate() {
  if (state.date !== getLocalDate()) {
    state = defaultState();
    saveState();
    render();
    showToast("Hari berganti, catatan dimulai dari awal.");
  }
}

function formatToday() {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  document.getElementById("todayDate").textContent = formatted;
}

function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function renderHabits() {
  const checkboxes = document.querySelectorAll("[data-habit]");
  const completed = state.habits.filter(Boolean).length;

  checkboxes.forEach((checkbox, index) => {
    checkbox.checked = state.habits[index];
  });

  document.getElementById("completedCount").textContent = completed;
  document.getElementById("totalCount").textContent = HABIT_COUNT;
  document.getElementById("checklistBadge").textContent =
    `${completed}/${HABIT_COUNT}`;

  const percent = HABIT_COUNT > 0
    ? Math.round((completed / HABIT_COUNT) * 100)
    : 0;

  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressFill").style.width = `${percent}%`;
  document.getElementById("progressTrack")
    .setAttribute("aria-valuenow", String(percent));

  let message = "Belum ada amal yang dicentang.";

  if (completed > 0 && completed < HABIT_COUNT) {
    message = `${completed} dari ${HABIT_COUNT} amal sudah dilakukan.`;
  }

  if (completed === HABIT_COUNT && HABIT_COUNT > 0) {
    message = "Semua amal hari ini sudah dilakukan.";
  }

  document.getElementById("progressMessage").textContent = message;
}

function renderDhikr() {
  let total = 0;

  state.dhikr.forEach((count, index) => {
    total += count;

    document.getElementById(`count${index}`).textContent =
      count.toLocaleString("id-ID");

    const percent = Math.min((count / DHIKR_TARGET) * 100, 100);
    document.getElementById(`fill${index}`).style.width = `${percent}%`;
  });

  document.getElementById("totalDhikr").textContent =
    total.toLocaleString("id-ID");
}

function render() {
  formatToday();
  renderHabits();
  renderDhikr();
}

// Checklist amal.
document.querySelectorAll("[data-habit]").forEach(checkbox => {
  checkbox.addEventListener("change", () => {
    syncDate();

    const index = Number(checkbox.dataset.habit);

    state.habits[index] = checkbox.checked;
    saveState();
    renderHabits();
  });
});

// Tombol +1 dzikir.
document.querySelectorAll("[data-add]").forEach(button => {
  button.addEventListener("click", () => {
    syncDate();

    const index = Number(button.dataset.add);

    if (state.dhikr[index] >= Number.MAX_SAFE_INTEGER) {
      showToast("Batas hitungan sudah tercapai.");
      return;
    }

    state.dhikr[index] += 1;
    saveState();
    renderDhikr();
  });
});

// Reset satu hitungan dzikir.
document.querySelectorAll("[data-reset]").forEach(button => {
  button.addEventListener("click", () => {
    syncDate();

    const index = Number(button.dataset.reset);
    const name = DHIKR_NAMES[index];

    if (state.dhikr[index] === 0) {
      showToast("Hitungan sudah nol.");
      return;
    }

    if (!window.confirm(`Reset hitungan ${name} menjadi 0?`)) return;

    state.dhikr[index] = 0;
    saveState();
    renderDhikr();
    showToast(`Hitungan ${name} direset.`);
  });
});

// Reset seluruh catatan hari ini.
document.getElementById("resetDay").addEventListener("click", () => {
  syncDate();

  const confirmed = window.confirm(
    "Reset semua checklist amal dan hitungan dzikir hari ini?\n\n" +
    "Data hari ini akan dihapus."
  );

  if (!confirmed) return;

  const previousState = state;
  state = defaultState();

  if (!saveState()) {
    state = previousState;
    return;
  }

  render();
  showToast("Catatan hari ini direset.");
});

// Sinkronkan tanggal saat pengguna kembali ke tab.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncDate();
});

window.addEventListener("focus", syncDate);

// Tampilkan data tersimpan saat halaman dibuka.
render();