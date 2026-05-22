const form = document.querySelector("#brandForm");
const defaultForm = document.querySelector("#defaultForm");
const canvas = document.querySelector("#designCanvas");
const ctx = canvas.getContext("2d");
const promptOutput = document.querySelector("#promptOutput");
const previewTitle = document.querySelector("#previewTitle");
const galleryGrid = document.querySelector("#galleryGrid");
const copyStatus = document.querySelector("#copyStatus");
const appealOutput = document.querySelector("#appealOutput");
const navItems = document.querySelectorAll("[data-page-target]");
const pagePanels = document.querySelectorAll("[data-page]");
const authScreen = document.querySelector("#authScreen");
const appShell = document.querySelector("#appShell");
const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const registerButton = document.querySelector("#registerButton");
const logoutButton = document.querySelector("#logoutButton");
const userNameLabel = document.querySelector("#userNameLabel");
const generateImageButton = document.querySelector("#generateImageButton");
const saveDesignButton = document.querySelector("#saveDesignButton");
const generateResumeButton = document.querySelector("#generateResumeButton");
const printResumeButton = document.querySelector("#printResumeButton");
const generatedImageBox = document.querySelector("#generatedImageBox");
const generatedImagePreview = document.querySelector("#generatedImagePreview");
const resumeBox = document.querySelector("#resumeBox");
const resumePreview = document.querySelector("#resumePreview");
const savedDesigns = document.querySelector("#savedDesigns");
const DEFAULT_STORAGE_KEY = "lessonDesignGenerator.defaults";
const TABLE_IMAGE_STORAGE_KEY = "lessonDesignGenerator.tableImage";
const LOCAL_DESIGNS_KEY = "lessonDesignGenerator.localDesigns";
const tableImageInput = document.querySelector("#tableImageInput");
const tableImageDropzone = document.querySelector("#tableImageDropzone");
const tableImagePreview = document.querySelector("#tableImagePreview");
const tableImageEmpty = document.querySelector("#tableImageEmpty");
const removeTableImageButton = document.querySelector("#removeTableImageButton");

let variationCount = 0;
let currentUser = null;
let generatedImageData = "";
let currentResumeHtml = "";

const isFileMode = location.protocol === "file:";

const apiFetch = async (url, options = {}) => {
  if (isFileMode) throw new Error("デモモードではサーバーAPIは使えません。");

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "通信に失敗しました。");
  return data;
};

const getCheckedValue = (name) =>
  new FormData(form).get(name) || document.querySelector(`[name="${name}"]`)?.value || "";

const loadDefaultSettings = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(DEFAULT_STORAGE_KEY) || "{}");

    Object.entries(stored).forEach(([name, value]) => {
      if (defaultForm.elements[name]) {
        defaultForm.elements[name].value = value;
      }
    });
  } catch {
    localStorage.removeItem(DEFAULT_STORAGE_KEY);
  }
};

const saveDefaultSettings = () => {
  const data = new FormData(defaultForm);
  const settings = Object.fromEntries(data.entries());
  localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(settings));
};

const showApp = (user = null) => {
  currentUser = user;
  authScreen.hidden = true;
  appShell.hidden = false;
  userNameLabel.textContent = user ? `${user.name}さま` : "デモモード";
  loadSavedDesigns();
};

const showAuth = () => {
  authScreen.hidden = false;
  appShell.hidden = true;
};

const bootstrapAuth = async () => {
  if (isFileMode) {
    showApp(null);
    return;
  }

  try {
    const data = await apiFetch("/api/auth/me");
    if (data.user) {
      showApp(data.user);
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
};

const updateTableImagePreview = (dataUrl) => {
  const hasImage = Boolean(dataUrl);
  tableImagePreview.hidden = !hasImage;
  tableImageEmpty.hidden = hasImage;

  if (hasImage) {
    tableImagePreview.src = dataUrl;
  } else {
    tableImagePreview.removeAttribute("src");
  }
};

const loadTableImage = () => {
  updateTableImagePreview(localStorage.getItem(TABLE_IMAGE_STORAGE_KEY));
};

const saveTableImageFile = (file) => {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    localStorage.setItem(TABLE_IMAGE_STORAGE_KEY, reader.result);
    updateTableImagePreview(reader.result);
    drawCanvas();
  });
  reader.readAsDataURL(file);
};

const removeTableImage = () => {
  localStorage.removeItem(TABLE_IMAGE_STORAGE_KEY);
  tableImageInput.value = "";
  updateTableImagePreview("");
  drawCanvas();
};

const normalizeHex = (value, fallback) => {
  const trimmed = String(value || "").trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : fallback;
};

const getBrandColors = (data) => [
  normalizeHex(data.get("color1"), "#e8edf5"),
  normalizeHex(data.get("color2"), "#fffefe"),
  normalizeHex(data.get("color3"), "#d9b8b1"),
  normalizeHex(data.get("color4"), "#8a7668"),
  normalizeHex(data.get("color5"), "#c9a989"),
];

const getClassroomBrandColors = (data) => [
  normalizeHex(data.get("brandColor1"), "#e8edf5"),
  normalizeHex(data.get("brandColor2"), "#d9b8b1"),
  normalizeHex(data.get("brandColor3"), "#8a7668"),
];

const getValues = () => {
  const data = new FormData(form);
  const defaultData = new FormData(defaultForm);
  const colors = getBrandColors(data);
  const classroomBrandColors = getClassroomBrandColors(defaultData);
  const lessonConcept = data.get("lessonConcept").trim();

  return {
    businessName: defaultData.get("businessName").trim(),
    offer: lessonConcept,
    valuesWorksheet: defaultData.get("valuesWorksheet").trim(),
    persona: defaultData.get("persona").trim(),
    classroomConcept: defaultData.get("classroomConcept").trim(),
    brandMotifs: defaultData.get("brandMotifs").trim(),
    classroomBrandColors,
    hasTableCoordinateImage: Boolean(localStorage.getItem(TABLE_IMAGE_STORAGE_KEY)),
    lessonConcept,
    techniques: data.get("techniques").trim(),
    materials: data.get("materials").trim(),
    format: data.get("format"),
    ratio: data.get("ratio"),
    tone: getCheckedValue("tone"),
    visual: getCheckedValue("visual"),
    colors,
    motifs: data.get("motifs").trim(),
    palette: {
      accent: colors[2],
      dark: colors[3],
      light: colors[0],
      warm: colors[4],
      paper: colors[1],
    },
  };
};

const buildPrompt = (values) => {
  const lines = [
    ["お教室名", values.businessName],
    ["価値観発掘ワークシート", values.valuesWorksheet],
    ["ペルソナ設定", values.persona],
    ["お教室コンセプト", values.classroomConcept],
    ["お教室ブランドカラー HTMLコード3色", values.classroomBrandColors.join(" / ")],
    ["ブランドモチーフ", values.brandMotifs],
    ["基本のテーブルコーディネート画像", values.hasTableCoordinateImage ? "参照画像あり" : "未設定"],
    ["レッスンコンセプト", values.lessonConcept],
    ["使用技術", values.techniques],
    ["使用材料", values.materials],
  ];

  return [
    `${values.format}用の画像として使える、${values.visual}案。`,
    ...lines.map(([label, value]) => `${label}: ${value}`),
    `トーン: ${values.tone}、繊細、上質、思わず申し込みたくなる世界観。`,
    `お菓子デザイン: ${values.visual}、使いたいモチーフ: ${values.motifs}。`,
    `画像では完成作品の形、配色、装飾、並べ方、使用技術と使用材料が自然に伝わるようにする。`,
    `ブランドカラー HTMLコード5色: ${values.colors.join(" / ")}。`,
    `画像内テキスト候補:「${values.lessonConcept}」。`,
    `比率: ${values.ratio}。`,
    "避ける要素: 食べ物に見えない質感、過度な装飾、読みにくい文字、安っぽい素材感、強すぎる彩度、余白不足。",
  ].join("\n");
};

const buildAppealIdeas = (values) => [
  {
    title: "Instagram投稿用",
    text: `1枚目は${values.visual}の完成作品を大きく見せ、「${values.lessonConcept || "今回のレッスン"}」の世界観が一瞬で伝わるビジュアルにする。2枚目以降で${values.motifs || "モチーフ"}の細部、${values.techniques || "作れるようになる技術"}、レッスン後に飾る・贈るシーンを見せる。最後は日程、残席、申し込み導線を短く置く。`,
  },
  {
    title: "Threads投稿用",
    text: `冒頭は「こんな繊細な作品、自分にも作れるかな？」のようにペルソナの不安や憧れに寄り添う一文から始める。続けて、「${values.lessonConcept || "今回のレッスン"}」で学べる${values.techniques || "技術"}、使う材料、完成した時の嬉しさ、募集案内を会話調で自然に伝える。`,
  },
  {
    title: "ブログ投稿用",
    text: `タイトルは「${values.lessonConcept || "季節のお菓子レッスン"}」のように検索と憧れの両方を意識する。本文は、作品の魅力、デザインに込めた想い、使用技術、使用材料、初心者でも学べる内容、持ち帰り後の楽しみ、申し込み詳細の順で構成する。`,
  },
];

const renderAppealIdeas = (values) => {
  appealOutput.innerHTML = "";

  buildAppealIdeas(values).forEach((idea) => {
    const item = document.createElement("article");
    item.className = "appeal-item";

    const title = document.createElement("strong");
    title.textContent = idea.title;

    const text = document.createElement("p");
    text.textContent = idea.text;

    item.append(title, text);
    appealOutput.append(item);
  });
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const createMetadata = () => {
  const values = getValues();
  return {
    businessName: values.businessName,
    valuesWorksheet: values.valuesWorksheet,
    persona: values.persona,
    classroomConcept: values.classroomConcept,
    classroomBrandColors: values.classroomBrandColors,
    brandMotifs: values.brandMotifs,
    hasTableCoordinateImage: values.hasTableCoordinateImage,
    lessonConcept: values.lessonConcept,
    techniques: values.techniques,
    materials: values.materials,
    format: values.format,
    ratio: values.ratio,
    tone: values.tone,
    visual: values.visual,
    colors: values.colors,
    motifs: values.motifs,
  };
};

const localResumeHtml = (metadata) => {
  const list = (value) =>
    String(value || "")
      .split(/[、,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${escapeHtml(metadata.lessonConcept)}</title><style>body{color:#76685d;font-family:"Hiragino Mincho ProN","Yu Mincho",serif;line-height:1.8;margin:48px}h1{color:#847365;font-size:30px}h2{border-bottom:1px solid #d9d1ca;color:#847365;font-size:18px;margin-top:32px;padding-bottom:8px}.note{background:#fbf7f6;padding:16px}.colors{display:flex;gap:8px}.swatch{width:54px;height:54px;border:1px solid #d9d1ca}</style></head><body><p>${escapeHtml(metadata.businessName)}</p><h1>${escapeHtml(metadata.lessonConcept)}</h1><h2>レッスンコンセプト</h2><p class="note">${escapeHtml(metadata.lessonConcept)}</p><h2>使用技術</h2><ul>${list(metadata.techniques)}</ul><h2>使用材料</h2><ul>${list(metadata.materials)}</ul><h2>モチーフ</h2><ul>${list(metadata.motifs)}</ul><h2>カラー</h2><div class="colors">${(metadata.colors || []).map((color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`).join("")}</div><h2>募集時の訴求メモ</h2><p>完成作品の美しさ、学べる技術、贈るシーン、初心者でも安心できる導線を伝える。</p></body></html>`;
};

const renderResume = (html) => {
  currentResumeHtml = html;
  resumePreview.srcdoc = html;
  resumeBox.hidden = false;
};

const saveLocalDesign = (design) => {
  const designs = JSON.parse(localStorage.getItem(LOCAL_DESIGNS_KEY) || "[]");
  const saved = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    ...design,
  };
  designs.unshift(saved);
  localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(designs.slice(0, 100)));
  renderSavedDesigns(designs.slice(0, 100));
  return saved;
};

const renderSavedDesigns = (designs = []) => {
  savedDesigns.innerHTML = "";

  if (!designs.length) {
    const empty = document.createElement("p");
    empty.textContent = "まだ保存されたデザインはありません。";
    savedDesigns.append(empty);
    return;
  }

  designs.forEach((design) => {
    const card = document.createElement("article");
    card.className = "saved-card";

    const image = document.createElement("img");
    image.alt = design.title || "保存デザイン";
    image.src = design.imageData || "./assets/blooming-sugar-hero.png";

    const body = document.createElement("div");
    body.className = "saved-card__body";

    const title = document.createElement("strong");
    title.textContent = design.title || "レッスンデザイン";

    const date = document.createElement("small");
    date.textContent = new Date(design.createdAt).toLocaleString("ja-JP");

    const resumeButton = document.createElement("button");
    resumeButton.className = "ghost-button compact-button";
    resumeButton.type = "button";
    resumeButton.textContent = "レジュメを見る";
    resumeButton.disabled = !design.resumeHtml;
    resumeButton.addEventListener("click", () => {
      renderResume(design.resumeHtml);
      document.querySelector('[data-page-target="board"]').click();
    });

    body.append(title, date, resumeButton);
    card.append(image, body);
    savedDesigns.append(card);
  });
};

const loadSavedDesigns = async () => {
  if (isFileMode || !currentUser) {
    renderSavedDesigns(JSON.parse(localStorage.getItem(LOCAL_DESIGNS_KEY) || "[]"));
    return;
  }

  try {
    const data = await apiFetch("/api/designs");
    renderSavedDesigns(data.designs);
  } catch (error) {
    renderSavedDesigns([]);
  }
};

const syncColorInputs = () => {
  const data = new FormData(form);
  getBrandColors(data).forEach((color, index) => {
    const input = form.elements[`color${index + 1}`];
    const hasValue = String(input.value || "").trim();
    input.style.setProperty("--color-preview", hasValue ? color : "#d9d1ca");
  });

  const defaultData = new FormData(defaultForm);
  getClassroomBrandColors(defaultData).forEach((color, index) => {
    const input = defaultForm.elements[`brandColor${index + 1}`];
    const hasValue = String(input.value || "").trim();
    input.style.setProperty("--color-preview", hasValue ? color : "#d9d1ca");
  });
};

const wrapText = (text, maxWidth, font, maxLines = 3) => {
  ctx.font = font;
  const chars = Array.from(text);
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  });

  if (line) lines.push(line);
  return lines.slice(0, maxLines);
};

const drawCookie = (x, y, radius, fill, icing, accent, motif) => {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = icing;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.74, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * radius * 0.34, y + Math.sin(angle) * radius * 0.12, radius * 0.14, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  ctx.font = "700 20px serif";
  ctx.fillText(motif, x - radius * 0.42, y + radius * 0.08);
};

const drawCookieSet = (p, values, seed) => {
  ctx.fillStyle = p.light;
  ctx.fillRect(84, 92, 350, 460);

  const motifs = values.motifs.split(/[、,]/).map((item) => item.trim()).filter(Boolean);
  drawCookie(192, 210, 74 + seed * 2, p.warm, p.paper, p.accent, motifs[0] || "花");
  drawCookie(332, 290, 86, p.accent, p.paper, p.dark, motifs[1] || "リボン");
  drawCookie(220, 420, 82, p.dark, p.paper, p.warm, motifs[2] || "レース");

  ctx.fillStyle = p.warm;
  ctx.fillRect(112, 548, 240, 18);
  ctx.fillStyle = p.dark;
  ctx.font = "700 24px serif";
  ctx.fillText(values.visual.includes("クッキー") ? "Cookie Set" : "Sweets Design", 134, 170);
};

const drawBakedSweets = (p, seed) => {
  ctx.fillStyle = p.light;
  ctx.fillRect(80, 100, 420, 430);
  for (let i = 0; i < 3; i += 1) {
    const x = 160 + i * 105;
    ctx.fillStyle = p.warm;
    ctx.fillRect(x, 320, 74, 104);
    ctx.fillStyle = p.paper;
    ctx.beginPath();
    ctx.arc(x + 37, 292 - seed * 2, 58, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = i % 2 ? p.accent : p.dark;
    ctx.beginPath();
    ctx.arc(x + 36, 254, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = p.accent;
  ctx.fillRect(114, 470, 318, 28);
};

const drawSculpturalSweets = (p, seed) => {
  ctx.fillStyle = p.light;
  ctx.fillRect(76, 102, 416, 420);
  ctx.fillStyle = p.accent;
  ctx.fillRect(160, 408, 240, 42);
  ctx.fillStyle = p.warm;
  ctx.beginPath();
  ctx.arc(280, 348, 108 + seed * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.paper;
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(220 + i * 28, 316 - i * 8, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = p.dark;
  ctx.fillRect(196, 452, 170, 18);
};

const drawCanvas = () => {
  const values = getValues();
  const p = values.palette;
  const seed = variationCount % 4;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = p.dark;
  ctx.fillRect(580, 0, 380, 960);
  ctx.fillStyle = p.light;
  ctx.fillRect(44, 52, 872, 856);

  if (values.visual.includes("焼き菓子")) {
    drawBakedSweets(p, seed);
  } else if (values.visual.includes("立体菓子")) {
    drawSculpturalSweets(p, seed);
  } else {
    drawCookieSet(p, values, seed);
  }

  ctx.fillStyle = p.paper;
  ctx.fillRect(530, 130, 332, 560);
  ctx.strokeStyle = p.warm;
  ctx.lineWidth = 3;
  ctx.strokeRect(550, 150, 292, 520);

  ctx.fillStyle = p.dark;
  ctx.font = "700 28px serif";
  ctx.fillText(values.businessName || "Brand Name", 584, 220);

  ctx.fillStyle = p.accent;
  ctx.fillRect(584, 252, 112, 8);

  ctx.fillStyle = p.dark;
  const messageLines = wrapText(values.lessonConcept || "レッスンコンセプト", 230, "700 48px serif", 4);
  ctx.font = "700 48px serif";
  messageLines.forEach((line, index) => {
    ctx.fillText(line, 584, 340 + index * 62);
  });

  ctx.fillStyle = p.dark;
  ctx.font = "600 22px serif";
  wrapText(values.classroomConcept || "Class Concept", 238, "600 22px serif", 2).forEach((line, index) => {
    ctx.fillText(line, 584, 604 + index * 34);
  });

  ctx.fillStyle = p.accent;
  ctx.fillRect(92, 738, 470, 70);
  ctx.fillStyle = p.paper;
  ctx.font = "700 24px serif";
  ctx.fillText(`${values.format} / ${values.ratio}`, 124, 783);

  values.colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(124 + index * 54, 824, 42, 42);
  });

  promptOutput.value = buildPrompt(values);
  renderAppealIdeas(values);
  previewTitle.textContent = values.businessName || "Brand Image";
};

const addVariation = () => {
  variationCount += 1;
  drawCanvas();

  const card = document.createElement("article");
  card.className = "variation-card";

  const image = document.createElement("img");
  image.alt = `候補 ${variationCount}`;
  image.src = canvas.toDataURL("image/png");

  const body = document.createElement("div");
  body.className = "variation-card__body";

  const label = document.createElement("span");
  label.textContent = `候補 ${variationCount}`;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "反映";
  button.addEventListener("click", () => {
    const temp = new Image();
    temp.onload = () => ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
    temp.src = image.src;
  });

  body.append(label, button);
  card.append(image, body);
  galleryGrid.prepend(card);
};

form.addEventListener("input", drawCanvas);
form.addEventListener("change", drawCanvas);
form.addEventListener("input", syncColorInputs);
form.addEventListener("change", syncColorInputs);
defaultForm.addEventListener("input", drawCanvas);
defaultForm.addEventListener("change", drawCanvas);
defaultForm.addEventListener("input", saveDefaultSettings);
defaultForm.addEventListener("change", saveDefaultSettings);
defaultForm.addEventListener("input", syncColorInputs);
defaultForm.addEventListener("change", syncColorInputs);

tableImageInput.addEventListener("change", () => {
  saveTableImageFile(tableImageInput.files[0]);
});

tableImageDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  tableImageDropzone.classList.add("is-dragover");
});

tableImageDropzone.addEventListener("dragleave", () => {
  tableImageDropzone.classList.remove("is-dragover");
});

tableImageDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  tableImageDropzone.classList.remove("is-dragover");
  saveTableImageFile(event.dataTransfer.files[0]);
});

tableImageDropzone.addEventListener("paste", (event) => {
  const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
  if (imageItem) {
    saveTableImageFile(imageItem.getAsFile());
  }
});

tableImageDropzone.addEventListener("click", () => {
  tableImageInput.click();
});

tableImageDropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    tableImageInput.click();
  }
});

removeTableImageButton.addEventListener("click", removeTableImage);

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.pageTarget;

    navItems.forEach((navItem) => {
      navItem.classList.toggle("active", navItem === item);
    });

    pagePanels.forEach((panel) => {
      panel.hidden = panel.dataset.page !== target;
    });
  });
});

document.querySelector("#generateButton").addEventListener("click", addVariation);

generateImageButton.addEventListener("click", async () => {
  const prompt = promptOutput.value;
  generateImageButton.disabled = true;
  generateImageButton.textContent = "生成中...";

  try {
    if (isFileMode) {
      generatedImageData = canvas.toDataURL("image/png");
    } else {
      const data = await apiFetch("/api/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt, ratio: getValues().ratio }),
      });
      generatedImageData = data.imageData;
    }

    generatedImagePreview.src = generatedImageData;
    generatedImageBox.hidden = false;
  } catch (error) {
    alert(error.message);
  } finally {
    generateImageButton.disabled = false;
    generateImageButton.textContent = "AI画像を生成";
  }
});

generateResumeButton.addEventListener("click", async () => {
  const metadata = createMetadata();

  try {
    if (isFileMode) {
      renderResume(localResumeHtml(metadata));
    } else {
      const data = await apiFetch("/api/resume", {
        method: "POST",
        body: JSON.stringify({ metadata }),
      });
      renderResume(data.resumeHtml);
    }
  } catch (error) {
    alert(error.message);
  }
});

printResumeButton.addEventListener("click", () => {
  resumePreview.contentWindow?.print();
});

saveDesignButton.addEventListener("click", async () => {
  const metadata = createMetadata();
  const design = {
    title: metadata.lessonConcept || "レッスンデザイン",
    prompt: promptOutput.value,
    imageData: generatedImageData || canvas.toDataURL("image/png"),
    resumeHtml: currentResumeHtml || localResumeHtml(metadata),
    metadata,
  };

  try {
    if (isFileMode || !currentUser) {
      saveLocalDesign(design);
    } else {
      const data = await apiFetch("/api/designs", {
        method: "POST",
        body: JSON.stringify(design),
      });
      const current = JSON.parse(localStorage.getItem(LOCAL_DESIGNS_KEY) || "[]");
      renderSavedDesigns([data.design, ...current]);
      await loadSavedDesigns();
    }

    alert("デザインを保存しました。");
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#copyPromptButton").addEventListener("click", async () => {
  await navigator.clipboard.writeText(promptOutput.value);
  copyStatus.textContent = "コピーしました";
  setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "";

  const data = Object.fromEntries(new FormData(authForm).entries());

  try {
    const result = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    showApp(result.user);
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

registerButton.addEventListener("click", async () => {
  authMessage.textContent = "";
  const data = Object.fromEntries(new FormData(authForm).entries());

  try {
    const result = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    showApp(result.user);
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  if (!isFileMode && currentUser) {
    await apiFetch("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
    showAuth();
  } else {
    alert("デモモードではログアウトは不要です。");
  }
});

document.querySelector("#resetButton").addEventListener("click", () => {
  form.reset();
  galleryGrid.innerHTML = "";
  variationCount = 0;
  drawCanvas();
});

loadDefaultSettings();
loadTableImage();
drawCanvas();
syncColorInputs();
addVariation();
bootstrapAuth();
