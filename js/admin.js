/* ============================================
   管理后台 — 评分配置编辑器 + 密码保护
   ============================================ */

// ---------- 密码认证 (SHA-256) ----------
const DEFAULT_PASSWORD_HASH = 'aaffebecec560fec66e75f24062224ffa4e07696d2ae9a1fee3707c3f8fd9373';
const AUTH_TOKEN_KEY = 'ps_admin_auth';
const LOGIN_ATTEMPTS_KEY = 'ps_admin_attempts';
const PWD_HASH_KEY = 'ps_admin_pwdhash';
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

let lockoutUntil = 0;

function getPasswordHash() {
  return localStorage.getItem(PWD_HASH_KEY) || DEFAULT_PASSWORD_HASH;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkAuth() {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token === getPasswordHash()) {
    document.getElementById('authOverlay').classList.add('hidden');
    return true;
  }
  return false;
}

async function handleLogin() {
  const passwordInput = document.getElementById('authPassword');
  const errorEl = document.getElementById('authError');
  const hintEl = document.getElementById('authHint');
  const btn = document.getElementById('authBtn');

  if (Date.now() < lockoutUntil) {
    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
    errorEl.textContent = `已锁定，请 ${remaining} 秒后重试`;
    return;
  }

  const password = passwordInput.value.trim();
  if (!password) {
    errorEl.textContent = '请输入密码';
    passwordInput.classList.add('error');
    setTimeout(() => passwordInput.classList.remove('error'), 400);
    return;
  }

  btn.disabled = true;
  btn.textContent = '...';

  const hash = await sha256(password);
  const currentHash = getPasswordHash();

  if (hash === currentHash) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, hash);
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    document.getElementById('authOverlay').classList.add('hidden');
    passwordInput.value = '';
    errorEl.textContent = '';
    hintEl.textContent = '';
  } else {
    const attempts = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{"count":0,"time":0}');
    attempts.count++;
    attempts.time = Date.now();
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));

    const remaining = MAX_ATTEMPTS - attempts.count;
    if (remaining <= 0) {
      lockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;
      errorEl.textContent = `密码错误次数过多，请等待 ${LOCKOUT_SECONDS} 秒`;
      hintEl.textContent = '';
    } else {
      errorEl.textContent = `密码错误`;
      hintEl.textContent = `还剩 ${remaining} 次尝试机会`;
    }
    passwordInput.classList.add('error');
    passwordInput.value = '';
    passwordInput.focus();
    setTimeout(() => passwordInput.classList.remove('error'), 400);
  }

  btn.disabled = false;
  btn.textContent = '→';
}

// 修改密码
async function changePassword() {
  const oldPwd = prompt('请输入当前密码：');
  if (!oldPwd) return;
  const oldHash = await sha256(oldPwd);
  if (oldHash !== getPasswordHash()) {
    alert('当前密码错误');
    return;
  }
  const newPwd = prompt('请输入新密码（至少4位）：');
  if (!newPwd || newPwd.length < 4) {
    alert('新密码至少4位');
    return;
  }
  const confirmPwd = prompt('再次输入新密码确认：');
  if (newPwd !== confirmPwd) {
    alert('两次密码不一致');
    return;
  }
  const newHash = await sha256(newPwd);
  localStorage.setItem(PWD_HASH_KEY, newHash);
  sessionStorage.setItem(AUTH_TOKEN_KEY, newHash);
  alert('✅ 密码已更新！\n\n如需在其他设备上也生效，请在 config.json 中添加 "passwordHash" 字段，然后重新部署。');
}

// 页面加载时检查
(function initAuth() {
  const hash = getPasswordHash();
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token === hash) {
    document.getElementById('authOverlay').classList.add('hidden');
  }

  document.getElementById('authPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleLogin();
  });

  document.getElementById('authPassword').focus();
})();

const MBTI_ORDER = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP'
];

const ZODIAC_ORDER = [
  '白羊座','金牛座','双子座','巨蟹座',
  '狮子座','处女座','天秤座','天蝎座',
  '射手座','摩羯座','水瓶座','双鱼座'
];

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

// ---------- 当前编辑中的配置 ----------
let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

// ---------- 加载配置 ----------
function loadConfig() {
  const saved = localStorage.getItem('personality-star-config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      config = deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), parsed);
    } catch (e) { /* use default */ }
  }

  // 同时尝试从 config.json 加载（如果存在）
  fetch('config.json?' + Date.now())
    .then(r => r.json())
    .then(json => {
      config = deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), json);
      renderAll();
    })
    .catch(() => {
      renderAll();
    });
}

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

// ---------- 渲染 ----------
function renderAll() {
  renderMbtiTable();
  renderZodiacTable();
  renderLevelsTable();
  renderFunTexts();
}

function renderMbtiTable() {
  const tbody = document.getElementById('mbtiTable');
  const types = MBTI_ORDER;
  let html = '';
  for (let i = 0; i < types.length; i += 4) {
    html += '<tr>';
    for (let j = 0; j < 4; j++) {
      const type = types[i + j];
      html += `<td><strong>${type}</strong></td>`;
      html += `<td><input type="number" class="score-input" data-mbti="${type}" value="${config.mbti[type] ?? 0}" min="-5" max="5" onchange="updateMbti('${type}', this.value)"></td>`;
    }
    html += '</tr>';
  }
  tbody.innerHTML = html;
}

function renderZodiacTable() {
  const tbody = document.getElementById('zodiacTable');
  const types = ZODIAC_ORDER;
  let html = '';
  for (let i = 0; i < types.length; i += 4) {
    html += '<tr>';
    for (let j = 0; j < 4; j++) {
      const type = types[i + j];
      html += `<td><strong>${type}</strong></td>`;
      html += `<td><input type="number" class="score-input" data-zodiac="${type}" value="${config.zodiac[type] ?? 0}" min="-5" max="5" onchange="updateZodiac('${type}', this.value)"></td>`;
    }
    html += '</tr>';
  }
  tbody.innerHTML = html;
}

function renderLevelsTable() {
  const tbody = document.getElementById('levelsTable');
  const sorted = [...config.levels].sort((a, b) => b.minScore - a.minScore);
  let html = '';
  sorted.forEach((lv, i) => {
    html += `<tr>
      <td><input type="text" value="${escapeHtml(lv.level)}" data-level-idx="${i}" data-field="level" onchange="updateLevel(${i}, 'level', this.value)" style="width:100px;"></td>
      <td><input type="number" value="${lv.minScore}" data-level-idx="${i}" data-field="minScore" onchange="updateLevel(${i}, 'minScore', parseInt(this.value))" style="width:80px;"></td>
      <td><span class="color-dot" style="background:${lv.color};"></span><input type="color" value="${lv.color}" data-level-idx="${i}" data-field="color" onchange="updateLevel(${i}, 'color', this.value)"></td>
      <td><input type="text" value="${lv.icon}" data-level-idx="${i}" data-field="icon" onchange="updateLevel(${i}, 'icon', this.value)" style="width:60px;text-align:center;font-size:20px;"></td>
      <td><input type="text" value="${escapeHtml(lv.description)}" data-level-idx="${i}" data-field="description" onchange="updateLevel(${i}, 'description', this.value)"></td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function renderFunTexts() {
  const container = document.getElementById('funTextsContainer');
  // 保留 section-header
  const header = container.querySelector('.section-header');
  let html = header ? header.outerHTML : '';

  const sorted = [...config.levels].sort((a, b) => b.minScore - a.minScore);
  sorted.forEach(lv => {
    const texts = config.funTexts[lv.level] || [''];
    const textValue = texts.join('\n');
    html += `<div class="section" style="margin-top:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:24px;">${lv.icon}</span>
        <strong style="font-size:16px;color:${lv.color};">${escapeHtml(lv.level)}</strong>
        <span style="font-size:12px;color:var(--text3);">3条文案，用换行分隔</span>
      </div>
      <textarea data-fun-level="${escapeHtml(lv.level)}" onchange="updateFunTexts('${escapeHtml(lv.level)}', this.value)" rows="3" style="width:100%;">${escapeHtml(textValue)}</textarea>
    </div>`;
  });
  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------- 更新函数 ----------
function updateMbti(type, value) {
  config.mbti[type] = parseInt(value) || 0;
}

function updateZodiac(type, value) {
  config.zodiac[type] = parseInt(value) || 0;
}

function updateLevel(idx, field, value) {
  // 找到正确的 level（考虑排序）
  const sorted = [...config.levels].sort((a, b) => b.minScore - a.minScore);
  const targetLevel = sorted[idx].level;
  const realIdx = config.levels.findIndex(l => l.level === targetLevel);
  if (realIdx >= 0) {
    const oldLevel = config.levels[realIdx].level;
    config.levels[realIdx][field] = value;
    // 如果改了 level 名，同步更新 funTexts
    if (field === 'level' && oldLevel !== value) {
      if (config.funTexts[oldLevel]) {
        config.funTexts[value] = config.funTexts[oldLevel];
        delete config.funTexts[oldLevel];
      }
    }
  }
}

function updateFunTexts(level, value) {
  config.funTexts[level] = value.split('\n').filter(s => s.trim());
}

// ---------- 保存 ----------
function saveAndApply() {
  localStorage.setItem('personality-star-config', JSON.stringify(config));
  showToast('✅ 配置已保存！主站将使用新评分标准');
}

// ---------- 导出 ----------
function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 config.json 已下载，替换项目根目录同名文件即可');
}

// ---------- 导入 ----------
function importConfig() {
  document.getElementById('importFile').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const json = JSON.parse(e.target.result);
      config = deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), json);
      renderAll();
      showToast('✅ 配置已导入，请预览后点击"保存并应用"');
    } catch (err) {
      showToast('❌ JSON 格式错误，请检查文件', true);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ---------- 重置 ----------
function resetToDefault() {
  if (confirm('确定恢复默认配置吗？当前修改将丢失。')) {
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    localStorage.removeItem('personality-star-config');
    renderAll();
    showToast('🔄 已恢复默认配置');
  }
}

// ---------- Tab 切换 ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(this.dataset.tab).classList.add('active');
  });
});

// ---------- Toast ----------
function showToast(msg, isError) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ---------- 键盘快捷键 ----------
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveAndApply();
  }
});

// ---------- 启动 ----------
loadConfig();
