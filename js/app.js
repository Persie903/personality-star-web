/* ============================================
   人格星盘 · 段位评级 — 核心逻辑
   配置优先级：localStorage > config.json > 内置默认
   ============================================ */

// ---------- 内置默认配置(兜底) ----------
const DEFAULT_CONFIG = {
  mbti: {
    INTJ: 2, INTP: 1, ENTJ: 3, ENTP: 2,
    INFJ: 1, INFP: 0, ENFJ: 2, ENFP: 1,
    ISTJ: 0, ISFJ:-1, ESTJ: 1, ESFJ: 0,
    ISTP: 0, ISFP:-1, ESTP: 1, ESFP:-1
  },
  zodiac: {
    '白羊座': 1, '金牛座': 0, '双子座': 2,
    '巨蟹座':-1, '狮子座': 2, '处女座': 0,
    '天秤座': 1, '天蝎座': 2, '射手座': 1,
    '摩羯座': 0, '水瓶座': 2, '双鱼座':-1
  },
  levels: [
    { level: '夯',     minScore: 3,  color: '#f0c040', icon: '👑', description: '星河为你流转，天命之人降临！你已经站在了人类金字塔的顶端，众生仰望吧。' },
    { level: '顶尖',   minScore: 2,  color: '#a855f7', icon: '💎', description: '紫微星下凡，才华与气运并存。你的存在本身，就是一种降维打击。' },
    { level: '人上人', minScore: 1,  color: '#3b82f6', icon: '🌟', description: '恭喜你从NPC群体中脱颖而出，获得了"有姓名"的待遇！前途一片光明。' },
    { level: 'npc',    minScore: 0,  color: '#9ca3af', icon: '🌐', description: '欢迎来到地球OL，你获得了标准玩家身份卡。平凡但不平庸，世界因你而完整。' },
    { level: '拉',     minScore: -1, color: '#f97316', icon: '😅', description: '检测到你的人生配置可能需要重启...不过没关系，大器晚成嘛！' },
    { level: '拉爆了', minScore: -99,color: '#ef4444', icon: '💀', description: '恭喜触发隐藏成就——"反向欧皇"！换个服务器试试？这个号建议删档重练。' }
  ],
  funTexts: {
    '夯':     ['你是天命之人，星河为你流转，全世界都在给你让路！','天选之子！你的出场自带BGM，路人都忍不住多看你两眼。','这个段位的人，出门记得戴墨镜，因为你的光芒太刺眼了。'],
    '顶尖':   ['紫微星下凡也不过如此了，你已经超越了99%的凡人。','强者从不抱怨环境，因为你走到哪，环境就变成什么样。','你的存在就是对其他人的降维打击。'],
    '人上人': ['你已经成功从NPC群中脱颖而出，恭喜解锁"有姓名"成就！','人生如戏，你已经从群演晋升为男二/女二了，继续冲！','别人还在刷初始，你已经穿上第一件装备了。'],
    'npc':    ['恭喜你获得了"地球OL"标准玩家身份，平凡但安全。','你好，编号 #9527，请在规定区域内活动，不要超出边界。','你就是世界的基石，没有你，主角们都不知道该跟谁对话。'],
    '拉':     ['咳咳…系统检测到你的人生配置可能需要重启一下。','俗话说"大器晚成"，你可能属于"大器还没开始成"那种。','别灰心，至少你在"拉"这个赛道上是顶尖的。'],
    '拉爆了': ['恭喜触发隐藏成就——"反向欧皇"！你的存在本身就是个奇迹。','别人逆天改命，你是逆命改天…不好意思方向反了。','系统建议：换个服务器试试？也许这个号需要删档重练。']
  }
};

// ---------- 运行时配置(异步加载) ----------
let CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

function deepMerge(target, source) {
  const out = JSON.parse(JSON.stringify(target));
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(out[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

async function loadConfig() {
  let loaded = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // 第1层：从 config.json 加载
  try {
    const resp = await fetch('config.json?' + Date.now());
    if (resp.ok) {
      const json = await resp.json();
      loaded = deepMerge(loaded, json);
    }
  } catch (e) {
    console.log('config.json 未加载，使用默认配置');
  }

  // 第2层：localStorage 开发者覆盖(最高优先级)
  try {
    const saved = localStorage.getItem('personality-star-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      loaded = deepMerge(loaded, parsed);
    }
  } catch (e) { /* ignore */ }

  CONFIG = loaded;
  return loaded;
}

// ---------- 星空背景 ----------
(function initStarfield() {
  const canvas = document.getElementById('starCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); initStars(); });

  function initStars() {
    const count = Math.floor((w * h) / 1200);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }
  initStars();

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const t = Date.now() * 0.001;
    for (const s of stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed * 60 + s.twinkleOffset));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- UI 数据(不参与评分配置) ----------
const MBTI_LIST = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP'
];

const ZODIAC_LIST = [
  { name: '白羊座', emoji: '🐏' }, { name: '金牛座', emoji: '🐂' },
  { name: '双子座', emoji: '👯' }, { name: '巨蟹座', emoji: '🦀' },
  { name: '狮子座', emoji: '🦁' }, { name: '处女座', emoji: '👩' },
  { name: '天秤座', emoji: '⚖️' }, { name: '天蝎座', emoji: '🦂' },
  { name: '射手座', emoji: '🏹' }, { name: '摩羯座', emoji: '🐐' },
  { name: '水瓶座', emoji: '🏺' }, { name: '双鱼座', emoji: '🐟' }
];

// ---------- 全局状态 ----------
let selectedMbti = null;
let selectedZodiac = null;

// ---------- 页面导航 ----------
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.add('active');
    target.style.animation = 'none';
    target.offsetHeight;
    target.style.animation = '';
  }

  if (page === 'select') initSelectPage();
  if (page === 'home') {
    selectedMbti = null;
    selectedZodiac = null;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- 选择页 ----------
function initSelectPage() {
  const mbtiGrid = document.getElementById('mbtiGrid');
  const zodiacGrid = document.getElementById('zodiacGrid');

  if (mbtiGrid.children.length === 0) {
    MBTI_LIST.forEach(type => {
      const card = document.createElement('div');
      card.className = 'select-card mbti-card';
      card.dataset.value = type;
      card.innerHTML = `<span class="card-text">${type}</span>`;
      card.addEventListener('click', () => selectMbti(type, card));
      mbtiGrid.appendChild(card);
    });
  }

  if (zodiacGrid.children.length === 0) {
    ZODIAC_LIST.forEach(z => {
      const card = document.createElement('div');
      card.className = 'select-card zodiac-card';
      card.dataset.value = z.name;
      card.innerHTML = `<span class="card-emoji">${z.emoji}</span><span class="card-text">${z.name}</span>`;
      card.addEventListener('click', () => selectZodiac(z.name, card));
      zodiacGrid.appendChild(card);
    });
  }

  updateSubmitBtn();
}

function selectMbti(value, el) {
  selectedMbti = value;
  document.querySelectorAll('.mbti-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  updateSubmitBtn();
}

function selectZodiac(value, el) {
  selectedZodiac = value;
  document.querySelectorAll('.zodiac-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  updateSubmitBtn();
}

function updateSubmitBtn() {
  const btn = document.getElementById('submitBtn');
  if (selectedMbti && selectedZodiac) {
    btn.classList.remove('disabled');
  } else {
    btn.classList.add('disabled');
  }
}

// ---------- 计算逻辑（基于 CONFIG）----------
function calculateResult(mbti, zodiac) {
  const mbtiScore = CONFIG.mbti[mbti] || 0;
  const zodiacScore = CONFIG.zodiac[zodiac] || 0;
  const totalScore = mbtiScore + zodiacScore;

  // 按 minScore 降序匹配
  const sortedLevels = [...CONFIG.levels].sort((a, b) => b.minScore - a.minScore);

  for (const lv of sortedLevels) {
    if (totalScore >= lv.minScore) {
      return {
        level: lv.level,
        score: totalScore,
        color: lv.color,
        icon: lv.icon,
        desc: lv.description
      };
    }
  }

  // fallback
  const last = sortedLevels[sortedLevels.length - 1];
  return {
    level: last.level,
    score: totalScore,
    color: last.color,
    icon: last.icon,
    desc: last.description
  };
}

// ---------- 提交处理 ----------
function handleSubmit() {
  if (!selectedMbti) { showToast('请先选择 MBTI 人格'); return; }
  if (!selectedZodiac) { showToast('请先选择你的星座'); return; }

  const result = calculateResult(selectedMbti, selectedZodiac);
  showResult(result);
}

// ---------- 结果展示 ----------
function showResult(result) {
  navigateTo('result');

  setTimeout(() => {
    const card = document.getElementById('resultCard');
    const glow = card.querySelector('.result-glow');

    document.getElementById('tierIcon').textContent = result.icon;
    document.getElementById('tierName').textContent = result.level;
    document.getElementById('tierName').style.color = result.color;
    document.getElementById('tierName').style.textShadow = `0 0 40px ${result.color}44`;
    document.getElementById('tierDesc').textContent = result.desc;

    document.getElementById('tagMbti').textContent = selectedMbti;
    document.getElementById('tagZodiac').textContent = selectedZodiac;
    document.getElementById('tagScore').textContent = result.score;

    const texts = (CONFIG.funTexts && CONFIG.funTexts[result.level]) || ['结果已生成，快去分享吧！'];
    const funText = texts[Math.floor(Math.random() * texts.length)];
    document.getElementById('funQuote').innerHTML = `<p>${funText}</p>`;

    card.style.borderColor = result.color;
    card.style.boxShadow = `0 0 60px ${result.color}22`;
    glow.style.background = result.color;

    const icon = document.getElementById('tierIcon');
    const name = document.getElementById('tierName');
    icon.style.animation = 'none'; icon.offsetHeight;
    icon.style.animation = 'tier-bounce 0.6s ease-out';
    name.style.animation = 'none'; name.offsetHeight;
    name.style.animation = 'tier-reveal 0.8s ease-out';
  }, 100);
}

// ---------- 分享 ----------
function handleShare() {
  const level = document.getElementById('tierName').textContent;
  const shareText = `🔮 我在「人格星盘 · 段位评级」中测出：【${level}】\n\n🧬 MBTI：${selectedMbti}\n♈ 星座：${selectedZodiac}\n\n快来测测你是什么段位？👉 ${window.location.href}`;

  document.getElementById('shareText').textContent = shareText;
  document.getElementById('shareModal').classList.add('active');
}

function closeModal() {
  document.getElementById('shareModal').classList.remove('active');
}

function copyShareText() {
  const text = document.getElementById('shareText').textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ 已复制分享文案');
    closeModal();
  }).catch(() => {
    showToast('复制失败，请手动选择文字');
  });
}

document.getElementById('shareModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ---------- Toast ----------
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ---------- 启动 ----------
(async function init() {
  await loadConfig();
})();
