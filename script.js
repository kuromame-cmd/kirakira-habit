const STORAGE_KEY = "kirakiraHabitV1";

const stickers = [
  { emoji: "⭐️", name: "スター", type: "basic", unlock: 0 },
  { emoji: "💗", name: "ハート", type: "basic", unlock: 0 },
  { emoji: "🐱", name: "ねこ", type: "basic", unlock: 0 },
  { emoji: "🌙", name: "お月さま", type: "basic", unlock: 0 },
  { emoji: "🎀", name: "リボン", type: "basic", unlock: 0 },

  { emoji: "🌸", name: "さくら", type: "monthly", unlock: 3 },
  { emoji: "💎", name: "ダイヤ", type: "monthly", unlock: 7 },
  { emoji: "👑", name: "クラウン", type: "monthly", unlock: 15 },
  { emoji: "🌈", name: "レインボー", type: "monthly", unlock: 25 },

  {
    emoji: "🦄",
    name: "ユニコーン",
    type: "streak",
    unlock: 7,
    holo: true
  },
  {
    emoji: "🏆",
    name: "トロフィー",
    type: "streak",
    unlock: 14,
    holo: true
  },
  {
    emoji: "💫",
    name: "伝説のスター",
    type: "streak",
    unlock: 30,
    holo: true
  }
];

function defaultState() {
  return {
    version: 1,
    records: {},
    unlocked: stickers
      .filter(s => s.type === "basic")
      .map(s => s.emoji)
  };
}

let state = loadState();

let viewDate = new Date();
viewDate = new Date(
  viewDate.getFullYear(),
  viewDate.getMonth(),
  1
);

let selectedDateKey = null;
let selectedSticker = null;
let unlockQueue = [];

const $ = id => document.getElementById(id);


/* =========================
   STORAGE
========================= */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultState();
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.records ||
      !Array.isArray(parsed.unlocked)
    ) {
      return defaultState();
    }

    return {
      version: 1,
      records: parsed.records,
      unlocked: [
        ...new Set([
          ...parsed.unlocked,
          ...defaultState().unlocked
        ])
      ]
    };

  } catch {
    return defaultState();
  }
}


function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}


/* =========================
   DATE
========================= */

function pad(n) {
  return String(n).padStart(2, "0");
}


function dateKeyFromDate(d) {
  return `${d.getFullYear()}-${pad(
    d.getMonth() + 1
  )}-${pad(d.getDate())}`;
}


function makeDateKey(year, monthIndex, day) {
  return `${year}-${pad(
    monthIndex + 1
  )}-${pad(day)}`;
}


function parseDateKey(key) {
  const [y, m, d] = key
    .split("-")
    .map(Number);

  return new Date(y, m - 1, d);
}


function startOfToday() {
  const d = new Date();

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}


function isFutureDate(d) {
  return d > startOfToday();
}


function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}


function monthPrefix(year, monthIndex) {
  return `${year}-${pad(monthIndex + 1)}-`;
}


/* =========================
   RECORD DATA
========================= */

function getRecordKeys() {
  return Object.keys(state.records)
    .filter(
      key =>
        state.records[key] &&
        state.records[key].sticker
    )
    .sort();
}


function getMonthlyKeys(year, monthIndex) {
  const prefix = monthPrefix(
    year,
    monthIndex
  );

  return getRecordKeys().filter(
    key => key.startsWith(prefix)
  );
}


function getMonthlyCount(year, monthIndex) {
  return getMonthlyKeys(
    year,
    monthIndex
  ).length;
}


function getMonthlyStudyMinutes(
  year,
  monthIndex
) {
  return getMonthlyKeys(
    year,
    monthIndex
  ).reduce(
    (sum, key) =>
      sum +
      (
        Number(
          state.records[key].minutes
        ) || 0
      ),
    0
  );
}


function getTotalMinutes() {
  return getRecordKeys().reduce(
    (sum, key) =>
      sum +
      (
        Number(
          state.records[key].minutes
        ) || 0
      ),
    0
  );
}


function formatStudyTime(minutes) {
  minutes = Math.max(
    0,
    Number(minutes) || 0
  );

  if (minutes < 60) {
    return `${minutes}分`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const mins = minutes % 60;

  if (mins) {
    return `${hours}時間${mins}分`;
  }

  return `${hours}時間`;
}


/* =========================
   STREAK
========================= */

function dayDiff(a, b) {
  const A = Date.UTC(
    a.getFullYear(),
    a.getMonth(),
    a.getDate()
  );

  const B = Date.UTC(
    b.getFullYear(),
    b.getMonth(),
    b.getDate()
  );

  return Math.round(
    (A - B) / 86400000
  );
}


function getStreakCount() {

  const keys = new Set(
    getRecordKeys()
  );

  const today = startOfToday();

  const todayKey =
    dateKeyFromDate(today);

  const yesterday =
    new Date(today);

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  let cursor;

  if (keys.has(todayKey)) {

    cursor = today;

  } else if (
    keys.has(
      dateKeyFromDate(yesterday)
    )
  ) {

    cursor = yesterday;

  } else {

    return 0;
  }


  let count = 0;

  while (
    keys.has(
      dateKeyFromDate(cursor)
    )
  ) {

    count++;

    cursor =
      new Date(cursor);

    cursor.setDate(
      cursor.getDate() - 1
    );
  }

  return count;
}


function getLongestStreak() {

  const keys =
    getRecordKeys();

  if (!keys.length) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (
    let i = 1;
    i < keys.length;
    i++
  ) {

    const prev =
      parseDateKey(
        keys[i - 1]
      );

    const cur =
      parseDateKey(
        keys[i]
      );

    if (
      dayDiff(cur, prev) === 1
    ) {

      current++;

    } else {

      current = 1;
    }

    longest =
      Math.max(
        longest,
        current
      );
  }

  return longest;
}


/* =========================
   STICKER
========================= */

function isStickerUnlocked(
  sticker
) {
  return state.unlocked.includes(
    sticker.emoji
  );
}


function unlockLabel(sticker) {

  if (
    sticker.type === "monthly"
  ) {
    return `月${sticker.unlock}日`;
  }

  if (
    sticker.type === "streak"
  ) {
    return `${sticker.unlock}日連続`;
  }

  return sticker.name;
}


/* =========================
   CALENDAR
========================= */

function renderCalendar() {

  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();

  $("monthTitle").textContent =
    `${year}年${month + 1}月`;

  const grid =
    $("calendarGrid");

  grid.innerHTML = "";

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const lastDate =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    const blank =
      document.createElement(
        "div"
      );

    blank.className =
      "day blank";

    grid.appendChild(blank);
  }


  for (
    let day = 1;
    day <= lastDate;
    day++
  ) {

    const date =
      new Date(
        year,
        month,
        day
      );

    const key =
      makeDateKey(
        year,
        month,
        day
      );

    const record =
      state.records[key];

    const button =
      document.createElement(
        "button"
      );

    button.className = "day";


    if (
      sameDay(
        date,
        startOfToday()
      )
    ) {
      button.classList.add(
        "today"
      );
    }


    if (
      isFutureDate(date)
    ) {
      button.classList.add(
        "future"
      );
    }


    button.innerHTML = `
      <span class="day-number">
        ${day}
      </span>

      ${
        record?.sticker
          ? `
          <span class="day-sticker">
            ${record.sticker}
          </span>
          `
          : ""
      }
    `;


    if (
      !isFutureDate(date)
    ) {

      button.addEventListener(
        "click",
        () =>
          openRecordModal(key)
      );
    }


    grid.appendChild(button);
  }


  updateUI();
}


/* =========================
   COLLECTION
========================= */

function renderCollection() {

  $("collection").innerHTML =
    stickers
      .map(sticker => {

        const unlocked =
          isStickerUnlocked(
            sticker
          );

        return `
          <div
            class="
              sticker-item
              ${
                unlocked
                  ? ""
                  : "locked"
              }
              ${
                sticker.holo &&
                unlocked
                  ? "holo"
                  : ""
              }
            "
          >

            <span class="emoji">
              ${
                unlocked
                  ? sticker.emoji
                  : "🔒"
              }
            </span>

            <small>
              ${
                unlocked
                  ? sticker.name
                  : unlockLabel(
                      sticker
                    )
              }
            </small>

          </div>
        `;
      })
      .join("");
}


/* =========================
   STICKER CHOICE
========================= */

function renderStickerChoices() {

  $("stickerChoices").innerHTML =
    stickers
      .filter(
        isStickerUnlocked
      )
      .map(sticker => `
        <button
          class="
            sticker-choice
            ${
              sticker.holo
                ? "holo"
                : ""
            }
            ${
              selectedSticker ===
              sticker.emoji
                ? "selected"
                : ""
            }
          "
          data-sticker="${
            sticker.emoji
          }"
        >

          <span class="emoji">
            ${sticker.emoji}
          </span>

          <small>
            ${sticker.name}
          </small>

        </button>
      `)
      .join("");


  document
    .querySelectorAll(
      ".sticker-choice"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectedSticker =
            button.dataset.sticker;

          renderStickerChoices();
        }
      );
    });
}


/* =========================
   NEXT REWARD
========================= */

function rewardMarkup(type) {

  const candidates =
    stickers
      .filter(
        sticker =>
          sticker.type === type &&
          !isStickerUnlocked(
            sticker
          )
      )
      .sort(
        (a, b) =>
          a.unlock - b.unlock
      );


  const label =
    type === "monthly"
      ? "📅 月間ごほうび"
      : "🔥 連続ごほうび";


  if (!candidates.length) {

    return `
      <div class="reward-head">

        <span>${label}</span>

        <strong>
          ✨ COMPLETE!
        </strong>

      </div>
    `;
  }


  const target =
    candidates[0];


  const current =
    type === "monthly"
      ? getMonthlyCount(
          viewDate.getFullYear(),
          viewDate.getMonth()
        )
      : getStreakCount();


  const progress =
    Math.min(
      current,
      target.unlock
    );


  const remain =
    Math.max(
      0,
      target.unlock - current
    );


  const percent =
    Math.min(
      100,
      (
        progress /
        target.unlock
      ) * 100
    );


  return `
    <div class="reward-head">

      <span>
        ${label}
      </span>

      <span class="reward-name">
        ${target.emoji}
        ${target.name}
        あと${remain}日
      </span>

    </div>

    <div class="progress">

      <span
        style="
          width:${percent}%
        "
      ></span>

    </div>
  `;
}


function updateNextReward() {

  $("monthlyReward").innerHTML =
    rewardMarkup("monthly");

  $("streakReward").innerHTML =
    rewardMarkup("streak");
}


/* =========================
   UI UPDATE
========================= */

function updateUI() {

  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();


  $("monthlyDays").textContent =
    `${getMonthlyCount(
      year,
      month
    )}日`;


  $("monthlyTime").textContent =
    formatStudyTime(
      getMonthlyStudyMinutes(
        year,
        month
      )
    );


  $("currentStreak").textContent =
    `${getStreakCount()}日`;


  $("totalDays").textContent =
    `${getRecordKeys().length}日`;


  $("totalTime").textContent =
    formatStudyTime(
      getTotalMinutes()
    );


  $("longestStreak").textContent =
    `${getLongestStreak()}日`;


  renderCollection();

  updateNextReward();
}


/* =========================
   RECORD MODAL
========================= */

function openRecordModal(key) {

  selectedDateKey = key;

  const record =
    state.records[key] || {};

  selectedSticker =
    record.sticker || null;

  const date =
    parseDateKey(key);


  $("recordDateTitle").textContent =
    `${date.getMonth() + 1}月${date.getDate()}日`;


  $("memoInput").value =
    record.memo || "";


  $("minutesInput").value =
    record.minutes ?? "";


  $("saveRecordButton").textContent =
    record.sticker
      ? "✨ 更新する"
      : "✨ 記録する";


  $("deleteRecordButton")
    .classList
    .toggle(
      "hidden",
      !record.sticker
    );


  renderStickerChoices();

  openModal("recordModal");
}


/* =========================
   SAVE RECORD
========================= */

function saveRecord() {

  if (!selectedSticker) {

    alert(
      "ご褒美シールを1つ選んでください。"
    );

    return;
  }


  const minutesRaw =
    $("minutesInput")
      .value
      .trim();


  const minutes =
    minutesRaw === ""
      ? 0
      : Math.max(
          0,
          Math.min(
            1440,
            Number(minutesRaw) || 0
          )
        );


  state.records[
    selectedDateKey
  ] = {

    sticker:
      selectedSticker,

    memo:
      $("memoInput")
        .value
        .trim(),

    minutes
  };


  saveState();

  checkUnlocks();

  closeModal(
    "recordModal"
  );

  createSparkles(34);

  renderCalendar();

  showNextUnlock();
}


/* =========================
   DELETE RECORD
========================= */

function deleteRecord() {

  if (
    !selectedDateKey ||
    !state.records[
      selectedDateKey
    ]
  ) {
    return;
  }


  const ok =
    confirm(
      "この日の記録を削除しますか？\n" +
      "シール・メモ・勉強時間がすべて削除されます。"
    );


  if (!ok) {
    return;
  }


  delete state.records[
    selectedDateKey
  ];


  saveState();

  closeModal(
    "recordModal"
  );

  renderCalendar();
}


/* =========================
   UNLOCK
========================= */

function checkUnlocks() {

  const newlyUnlocked = [];

  const selectedDate =
    parseDateKey(
      selectedDateKey
    );


  const monthlyCount =
    getMonthlyCount(
      selectedDate.getFullYear(),
      selectedDate.getMonth()
    );


  const streak =
    getStreakCount();


  stickers.forEach(
    sticker => {

      if (
        isStickerUnlocked(
          sticker
        ) ||
        sticker.type ===
          "basic"
      ) {
        return;
      }


      let achieved = false;


      if (
        sticker.type ===
        "monthly"
      ) {

        achieved =
          monthlyCount >=
          sticker.unlock;

      }


      if (
        sticker.type ===
        "streak"
      ) {

        achieved =
          streak >=
          sticker.unlock;

      }


      if (achieved) {

        state.unlocked.push(
          sticker.emoji
        );

        newlyUnlocked.push(
          sticker
        );
      }
    }
  );


  if (
    newlyUnlocked.length
  ) {

    state.unlocked = [
      ...new Set(
        state.unlocked
      )
    ];

    saveState();

    unlockQueue.push(
      ...newlyUnlocked
    );
  }
}


function showNextUnlock() {

  if (
    !unlockQueue.length
  ) {
    return;
  }


  const sticker =
    unlockQueue.shift();


  $("unlockKicker").textContent =
    sticker.type === "streak"
      ? `🔥 ${sticker.unlock} DAYS STREAK!`
      : "✨ NEW STICKER! ✨";


  $("unlockEmoji").textContent =
    sticker.emoji;


  $("unlockTitle").textContent =
    `${sticker.name}をゲット！`;


  $("unlockMessage").textContent =
    sticker.type === "streak"
      ? `${sticker.unlock}日連続でがんばったごほうび！`
      : `${sticker.unlock}日がんばったごほうび！`;


  createSparkles(55);

  openModal(
    "unlockModal"
  );
}


/* =========================
   MONTHLY REPORT
========================= */

function openMonthlyReport() {

  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();


  const keys =
    getMonthlyKeys(
      year,
      month
    );


  const usedStickers = [
    ...new Set(
      keys.map(
        key =>
          state.records[key]
            .sticker
      )
    )
  ];


  const notes =
    keys
      .filter(
        key =>
          state.records[key]
            .memo
      )
      .map(
        key => ({
          key,
          memo:
            state.records[key]
              .memo
        })
      );


  $("reportContent").innerHTML = `

    <div class="report-hero">

      <div class="report-label">
        KIRAKIRA HABIT REPORT
      </div>

      <h2>
        ${year}年${month + 1}月の
        がんばりレポート
      </h2>

    </div>


    <div class="report-stats">

      <div class="report-stat">
        <strong>
          ${keys.length}日
        </strong>
        <span>
          📅 勉強した日
        </span>
      </div>


      <div class="report-stat">
        <strong>
          ${formatStudyTime(
            getMonthlyStudyMinutes(
              year,
              month
            )
          )}
        </strong>
        <span>
          ⏱ 勉強時間
        </span>
      </div>


      <div class="report-stat">
        <strong>
          ${getStreakCount()}日
        </strong>
        <span>
          🔥 連続記録
        </span>
      </div>


      <div class="report-stat">
        <strong>
          ${state.unlocked.length}/12
        </strong>
        <span>
          ⭐ シール解放数
        </span>
      </div>

    </div>


    <div class="report-section">

      <h3>
        MY STICKERS
      </h3>

      <div class="report-stickers">
        ${
          usedStickers.length
            ? usedStickers.join(
                " "
              )
            : "まだシールはありません"
        }
      </div>

    </div>


    <div class="report-section">

      <h3>
        📝 今月がんばったこと
      </h3>

      ${
        notes.length
          ? `
            <ul class="report-notes">

              ${
                notes
                  .map(note => {

                    const date =
                      parseDateKey(
                        note.key
                      );

                    return `
                      <li>
                        ${date.getMonth() + 1}/${date.getDate()}
                        ${escapeHtml(
                          note.memo
                        )}
                      </li>
                    `;
                  })
                  .join("")
              }

            </ul>
          `
          : `
            <p class="muted">
              メモはまだありません。
            </p>
          `
      }

    </div>


    <p
      class="muted"
      style="
        text-align:center;
        margin-top:20px;
      "
    >
      今月もよく頑張りました ✨
    </p>
  `;


  openModal(
    "reportModal"
  );
}


function escapeHtml(str) {

  return String(str).replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );
}


/* =========================
   REPORT IMAGE
========================= */

function saveReportImage() {

  const canvas =
    $("reportCanvas");

  const ctx =
    canvas.getContext("2d");


  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();


  const keys =
    getMonthlyKeys(
      year,
      month
    );


  const usedStickers = [
    ...new Set(
      keys.map(
        key =>
          state.records[key]
            .sticker
      )
    )
  ];


  const notes =
    keys
      .filter(
        key =>
          state.records[key]
            .memo
      )
      .slice(0, 3)
      .map(
        key =>
          state.records[key]
            .memo
      );


  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      1080,
      1080
    );


  gradient.addColorStop(
    0,
    "#fff1f8"
  );

  gradient.addColorStop(
    0.5,
    "#f3efff"
  );

  gradient.addColorStop(
    1,
    "#eaf9ff"
  );


  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    1080,
    1080
  );


  ctx.fillStyle =
    "rgba(255,255,255,.86)";

  roundRect(
    ctx,
    70,
    70,
    940,
    940,
    48
  );

  ctx.fill();


  ctx.textAlign =
    "center";


  ctx.fillStyle =
    "#d879aa";

  ctx.font =
    "bold 34px sans-serif";

  ctx.fillText(
    "KIRAKIRA HABIT REPORT ✨",
    540,
    150
  );


  ctx.fillStyle =
    "#514657";

  ctx.font =
    "bold 48px sans-serif";

  ctx.fillText(
    `${year} / ${pad(
      month + 1
    )}`,
    540,
    220
  );


  const stats = [

    [
      `${keys.length} DAYS`,
      "📅 STUDY DAYS"
    ],

    [
      formatStudyTime(
        getMonthlyStudyMinutes(
          year,
          month
        )
      ),
      "⏱ STUDY TIME"
    ],

    [
      `${getStreakCount()} DAYS`,
      "🔥 STREAK"
    ],

    [
      `${state.unlocked.length} / 12`,
      "⭐ STICKERS"
    ]

  ];


  stats.forEach(
    (stat, index) => {

      const col =
        index % 2;

      const row =
        Math.floor(
          index / 2
        );

      const x =
        145 +
        col * 405;

      const y =
        285 +
        row * 150;


      ctx.fillStyle =
        "rgba(255,255,255,.72)";

      roundRect(
        ctx,
        x,
        y,
        385,
        125,
        26
      );

      ctx.fill();


      ctx.fillStyle =
        "#514657";

      ctx.font =
        "bold 31px sans-serif";

      ctx.fillText(
        stat[0],
        x + 192,
        y + 52
      );


      ctx.fillStyle =
        "#8e8291";

      ctx.font =
        "20px sans-serif";

      ctx.fillText(
        stat[1],
        x + 192,
        y + 88
      );
    }
  );


  ctx.fillStyle =
    "#514657";

  ctx.font =
    "bold 24px sans-serif";

  ctx.fillText(
    "MY STICKERS",
    540,
    615
  );


  ctx.font =
    "48px sans-serif";

  ctx.fillText(
    usedStickers.length
      ? usedStickers.join("  ")
      : "✨",
    540,
    680
  );


  ctx.font =
    "bold 24px sans-serif";

  ctx.fillText(
    "THIS MONTH",
    540,
    755
  );


  ctx.font =
    "22px sans-serif";

  ctx.fillStyle =
    "#6f6472";


  if (notes.length) {

    notes.forEach(
      (note, index) => {

        ctx.fillText(
          trimCanvasText(
            ctx,
            note,
            720
          ),
          540,
          805 +
          index * 42
        );
      }
    );

  } else {

    ctx.fillText(
      "がんばった記録をシールで残そう ✨",
      540,
      815
    );
  }


  ctx.fillStyle =
    "#b47fa0";

  ctx.font =
    "bold 22px sans-serif";

  ctx.fillText(
    "キラキラ習慣帳 ✨",
    540,
    960
  );


  const link =
    document.createElement(
      "a"
    );


  link.download =
    `kirakira-habit-${year}-${pad(
      month + 1
    )}.png`;


  link.href =
    canvas.toDataURL(
      "image/png"
    );


  link.click();
}


function roundRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {

  ctx.beginPath();

  ctx.roundRect(
    x,
    y,
    width,
    height,
    radius
  );
}


function trimCanvasText(
  ctx,
  text,
  maxWidth
) {

  let value =
    String(text);


  if (
    ctx.measureText(value)
      .width <= maxWidth
  ) {

    return value;
  }


  while (
    value.length &&
    ctx.measureText(
      value + "…"
    ).width > maxWidth
  ) {

    value =
      value.slice(
        0,
        -1
      );
  }


  return value + "…";
}


/* =========================
   SPARKLE
========================= */

function createSparkles(
  count = 30
) {

  const layer =
    $("sparkleLayer");


  const chars = [
    "✨",
    "✦",
    "⋆",
    "💫",
    "✧"
  ];


  for (
    let i = 0;
    i < count;
    i++
  ) {

    const element =
      document.createElement(
        "span"
      );


    element.className =
      "sparkle";


    element.textContent =
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];


    const angle =
      Math.random() *
      Math.PI *
      2;


    const distance =
      80 +
      Math.random() *
      330;


    element.style.setProperty(
      "--x",
      `${
        Math.cos(angle) *
        distance
      }px`
    );


    element.style.setProperty(
      "--y",
      `${
        Math.sin(angle) *
        distance
      }px`
    );


    element.style.left =
      `${35 +
        Math.random() *
        30}%`;


    element.style.top =
      `${40 +
        Math.random() *
        20}%`;


    element.style.animationDelay =
      `${Math.random() *
        0.15}s`;


    layer.appendChild(
      element
    );


    setTimeout(
      () =>
        element.remove(),
      1200
    );
  }
}


/* =========================
   BACKUP
========================= */

function createSaveCode() {

  return JSON.stringify({
    app:
      "kirakira-habit",

    version: 1,

    exportedAt:
      new Date()
        .toISOString(),

    data: state
  });
}


function validateBackup(obj) {

  return (
    obj &&
    obj.app ===
      "kirakira-habit" &&
    obj.version === 1 &&
    obj.data &&
    typeof obj.data.records ===
      "object" &&
    Array.isArray(
      obj.data.unlocked
    )
  );
}


function restoreBackup() {

  const raw =
    $("backupText")
      .value
      .trim();


  if (!raw) {

    alert(
      "バックアップデータを貼り付けてください。"
    );

    return;
  }


  try {

    const obj =
      JSON.parse(raw);


    if (
      !validateBackup(obj)
    ) {

      throw new Error(
        "invalid"
      );
    }


    const ok =
      confirm(
        "現在のデータを上書きします。復元しますか？"
      );


    if (!ok) {
      return;
    }


    state = {

      version: 1,

      records:
        obj.data.records,

      unlocked: [
        ...new Set([
          ...obj.data.unlocked,
          ...defaultState()
            .unlocked
        ])
      ]
    };


    saveState();


    closeModal(
      "settingsModal"
    );


    renderCalendar();


    alert(
      "バックアップを復元しました。"
    );


  } catch {

    alert(
      "このバックアップデータは読み込めません。"
    );
  }
}


/* =========================
   MODAL
========================= */

function openModal(id) {
  $(id).classList.remove(
    "hidden"
  );
}


function closeModal(id) {
  $(id).classList.add(
    "hidden"
  );
}


/* =========================
   EVENT
========================= */

$("prevMonth")
  .addEventListener(
    "click",
    () => {

      viewDate =
        new Date(
          viewDate.getFullYear(),
          viewDate.getMonth() - 1,
          1
        );

      renderCalendar();
    }
  );


$("nextMonth")
  .addEventListener(
    "click",
    () => {

      viewDate =
        new Date(
          viewDate.getFullYear(),
          viewDate.getMonth() + 1,
          1
        );

      renderCalendar();
    }
  );


$("settingsButton")
  .addEventListener(
    "click",
    () => {

      $("backupText").value =
        "";

      openModal(
        "settingsModal"
      );
    }
  );


$("saveRecordButton")
  .addEventListener(
    "click",
    saveRecord
  );


$("deleteRecordButton")
  .addEventListener(
    "click",
    deleteRecord
  );


$("reportButton")
  .addEventListener(
    "click",
    openMonthlyReport
  );


$("saveReportImageButton")
  .addEventListener(
    "click",
    saveReportImage
  );


$("unlockCloseButton")
  .addEventListener(
    "click",
    () => {

      closeModal(
        "unlockModal"
      );

      showNextUnlock();
    }
  );


$("exportButton")
  .addEventListener(
    "click",
    () => {

      $("backupText").value =
        createSaveCode();


      $("backupText")
        .focus();


      $("backupText")
        .select();


      if (
        navigator.clipboard
          ?.writeText
      ) {

        navigator.clipboard
          .writeText(
            $("backupText")
              .value
          )
          .catch(
            () => {}
          );
      }
    }
  );


$("importButton")
  .addEventListener(
    "click",
    () => {

      $("backupText").value =
        "";

      $("backupText")
        .focus();
    }
  );


$("restoreButton")
  .addEventListener(
    "click",
    restoreBackup
  );


document
  .querySelectorAll(
    "[data-close]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () =>
        closeModal(
          button.dataset.close
        )
    );
  });


document
  .querySelectorAll(
    ".modal"
  )
  .forEach(modal => {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
            modal &&
          modal.id !==
            "unlockModal"
        ) {

          closeModal(
            modal.id
          );
        }
      }
    );
  });


/* =========================
   START
========================= */

renderCalendar();
