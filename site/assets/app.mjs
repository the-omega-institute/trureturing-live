const $ = selector => document.querySelector(selector);
const i18n = () => (typeof window !== 'undefined' ? window.TrureI18n : null);
const curLang = () => i18n()?.getLang?.() || 'zh';
const isEn = () => curLang() === 'en';
const L = (zh, en) => (isEn() ? en : zh);
const tr = (key, fallback, vars = null) => {
  const api = i18n();
  if (api) return api.t(key, vars, fallback);
  if (!vars) return fallback;
  return String(fallback).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
};
const langDeptLabel = (dOrId, fallback = '') => {
  const id = typeof dOrId === 'string' ? dOrId : dOrId?.id;
  const deptObj = typeof dOrId === 'object' && dOrId ? dOrId : (id ? department(id) : null);
  const fb = deptObj?.label || fallback || (id ? methodByDepartment[id]?.[0] : '') || id || '';
  return i18n() && id ? i18n().deptLabel(id, fb) : fb;
};
const langDeptRole = (id, fallback = '') => (i18n() ? i18n().deptRole(id, { n: outreachScholarCount() }, fallback) : fallback);
const langDeptResp = (dOrId, fallback = '') => {
  const id = typeof dOrId === 'string' ? dOrId : dOrId?.id;
  const deptObj = typeof dOrId === 'object' && dOrId ? dOrId : (id ? department(id) : null);
  const fb = deptObj?.responsibility || fallback || '';
  return i18n() && id ? i18n().deptResp(id, fb) : fb;
};
const langGalaxyName = cl => (i18n() ? i18n().galaxyName(cl) : (cl?.zh || cl?.name || ''));
const langExecLabel = exec => (isEn() ? tr(`exec_${exec}`, execution[exec] || 'Research') : (execution[exec] || '共同研究'));
const ns = 'http://www.w3.org/2000/svg';
const liveURL = 'https://trureturing-live-reader.vercel.app/api/live';
const cacheKey = 'trureturing-live.hive.content.v7';
const streamCacheKey = 'trureturing-live.stream.v1';
const themeKey = 'trureturing-live.theme.v2';
const logModeKey = 'trureturing-live.log-mode.v2';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  snapshot: null,
  stream: null,
  selected: 'research',
  focused: null,
  hovered: null,
  hoveredSeat: null,
  mode: 'organization',
  layer: 'mix',
  follow: true,
  quiet: reduced,
  filter: 'all',
  feedFilter: 'all',
  verdictFilter: 'all',
  conjectures: [],
  conjecturesBusy: false,
  outreachStats: {
    collaborating_scholars: 223,
    replied_scholars: 485,
    contacted_scholars: 1049,
    joint_papers: 32,
    active_collaborations: 191,
    positive_scholars: 316,
    short_notes: 212
  },
  limit: 9,
  topic: null,
  cells: new Map(),
  seen: new Set(),
  animated: new Set(),
  arrivals: [],
  snapshotBusy: false,
  liveBusy: false,
  tickerTarget: null
};

// 3-Tier Company Architecture inside a 1000x740 blueprint:
// Tier 1 (Top): Human in the Loop steering (direction)
// Tier 2 (Center Bay): 24/7 AI Autonomous Research Loop (research <-> review -> verification)
// Tier 3 (Bottom): Knowledge Delivery & Platform (outreach <- publication <- books <- studio)
const positions = {
  direction: [500, 114],
  research: [205, 364],
  review: [500, 364],
  verification: [795, 364],
  outreach: [155, 632],
  publication: [385, 632],
  books: [615, 632],
  studio: [845, 632]
};

const bgHexLattice = [
  [120, 114], [310, 114], [690, 114], [880, 114],
  [55, 364], [352, 364], [648, 364], [945, 364],
  [270, 632], [500, 632], [730, 632]
];

const deptCodes = {
  direction: '01',
  research: '02',
  review: '03',
  verification: '04',
  books: '05',
  publication: '06',
  outreach: '07',
  studio: '08'
};

const deptRoles = {
  direction: '全局监控',
  research: '猜想攻关',
  review: '评审支路',
  verification: 'Lean 核枢',
  books: '书籍理论',
  publication: 'Mathesis',
  outreach: '223 合作学者',
  studio: '工具支路'
};

const hubMeta = {
  direction: { tag: 'THE ARCHITECT · HUMAN', title: '全局监控与方向策源', titleEn: 'Direction & Oversight' },
  research: { tag: 'SEC.01 · CONJECTURE ENGINE', title: '解决猜想 · 数学攻关', titleEn: 'Conjecture Engine · Math Research' },
  books: { tag: 'SEC.01 · LIVING BOOKS', title: '书籍理论推进', titleEn: 'Living Bilingual Monographs' },
  verification: { tag: 'CORE 00 · LEAN BRIDGE', title: '形式化验证中枢', titleEn: 'Lean 4 Formal Verification Core' },
  publication: { tag: 'SEC.02 · PAPER FACTORY & MATHESIS', title: '自动论文 · Mathesis 审稿平台', titleEn: 'Auto-Paper Factory · Mathesis' },
  outreach: { tag: 'SEC.02 · 223 COLLABORATING SCHOLARS', title: '对外合作 · 223 位学者联机', titleEn: 'Scholar Outreach · 223 Collaborating' },
  review: { tag: 'BRANCH A · ON-DEMAND RED-TEAM', title: '独立评审 · 红队支路', titleEn: 'Independent Review · Red-Team Rail' },
  studio: { tag: 'BRANCH B · ON-DEMAND FOUNDRY', title: '工具与表达 · 基建支路', titleEn: 'Tools & Studio · Foundry Rail' }
};

const deptColors = {
  direction: 'var(--c-direction)',
  research: 'var(--c-research)',
  review: 'var(--c-review)',
  verification: 'var(--c-verification)',
  books: 'var(--c-books)',
  publication: 'var(--c-publication)',
  outreach: 'var(--c-outreach)',
  studio: 'var(--c-studio)'
};

const execution = {
  human: '人的方向与判断',
  sessions: '独立研究会话',
  actions: 'Actions 自动引擎',
  mixed: '会话与自动化协作'
};

const methodByDepartment = {
  direction: ['人的方向', '提出意图、约束与把关', '指引 24/7 研究与验证枢纽'],
  research: ['数学攻坚', '课题与账本回流障碍', '新论证 ▸ 形式验证枢纽'],
  review: ['独立评审', '跨模型复核与边界检查', '修订意见与可验证声明'],
  verification: ['形式验证枢纽', '承接理论 / 写书 / 论文 / 合作请求', '冻结 Lean 定理并回流全院'],
  books: ['理论书写', '冻结定理与章节草稿', '双语书稿 + 新验证请求'],
  publication: ['论文与知识', '已验证结果与外部投稿', '短文 / DOI + Lean 目标'],
  outreach: ['学术交流与合作', '研究短文与学者往来', '合作回复 + 新验证请求 / 新方向'],
  studio: ['工具与表达', '研究基础设施需求', '出版模板、可视化与观测']
};

const methodByDepartmentEn = {
  direction: ['Direction', 'Research intent, bounds & review', 'Steer 24/7 research & Lean core'],
  research: ['Math Research', 'Open problems & returned obstructions', 'New proofs ▸ Lean Verification Core'],
  review: ['Indep. Review', 'Cross-model audit & boundary checks', 'Revision notes & verifiable claims'],
  verification: ['Verification Core', 'Proof requests from research, books & papers', 'Frozen Lean theorems back to all decks'],
  books: ['Monographs', 'Frozen theorems & chapter drafts', 'Bilingual books + new Lean requests'],
  publication: ['Papers & Wiki', 'Verified results & open submissions', 'Short notes / DOI + Mathesis archive'],
  outreach: ['Scholar Outreach', 'Verified notes & scholar dialogue', 'Replies + new requests & open questions'],
  studio: ['Tools & Studio', 'Research infrastructure & UI needs', 'Build pipelines, books & live observatory']
};

const SOURCE_LABEL_EN = {
  '检验研究提交': 'Verify Research PR',
  '检查与构建书稿': 'Build & Check Monograph',
  '出版在线书库': 'Publish Online Books',
  '更新公开研究页面': 'Update Research Site',
  '发布研究知识': 'Publish Research Knowledge',
  '协调学术交流与传播': 'Coordinate Scholar Outreach',
  '准备研究传播材料': 'Prepare Outreach Materials',
  '形式化研究': 'Formalized Research',
  '公开数学研究': 'Open Math Research',
  '理论书写': 'Monograph Writing',
  '独立评审': 'Independent Review',
  '论文与知识': 'Papers & Knowledge',
  '学术交流与合作': 'Scholar Outreach',
  '工具与表达': 'Tools & Studio',
  '研究有了新的进展': 'New research update'
};

const AREA_ZH_TO_EN = {
  '量子信息': 'Quantum Info',
  '分析与结构': 'Analysis',
  '数论': 'Number Theory',
  '代数与结构': 'Algebra',
  '组合数学': 'Combinatorics',
  '组合与几何': 'Combinatorics',
  '理论书写': 'Monographs',
  '数学研究': 'Math Research'
};

const EVIDENCE_ZH_TO_EN = {
  'Lean 归档': 'Lean Archive',
  '书稿 PR': 'Monograph PR',
  '已发表': 'Published',
  '已结案课题': 'Closed Thread',
  'Lean 已合入': 'Lean Merged'
};

const REPO_META_EN = {
  'trureturing': { label: 'Formalized Research', desc: 'Open math problems, Lean 4 proofs & review' },
  'trureturing-books': { label: 'Monograph Writing', desc: 'From verified theorems to living bilingual chapters' },
  'mathesis': { label: 'Papers & Notes', desc: 'An open mathematical research platform for papers, conjectures, deep review, and independently verified Lean contributions.' },
  'trureturing-books-template': { label: 'Book Templates', desc: 'Publication templates, workflows & build pipelines' },
  'trureturing-experiments': { label: 'Experiments', desc: 'Computational experiments, datasets & reports' },
  'trureturing-film': { label: 'Research Film', desc: 'Visual research essays, animations & media workflows' },
  'trureturing-intuition': { label: 'Intuition & Problems', desc: 'Heuristic sketches, problem framing & exploration' },
  'trureturing-lean-eval': { label: 'Lean Eval', desc: 'Attributed LeanEval formalizations and immutable submission sources' },
  'trureturing-live': { label: 'Live Observatory', desc: 'Live public research observatory: cross-repository GitHub Actions, questions and deliveries for trureturing.' },
  'trureturing-live-template': { label: 'Live Template', desc: 'Reusable Rust event harness for live AI organizations. GitHub CI and explicit runtime adapters; no UI.' },
  'trureturing-mdbook': { label: 'Blueprint Reader', desc: 'mdBook site for the trureturing Blueprint projected at build time from trureturing.' },
  'trureturing-outreach-engine': { label: 'Outreach Engine', desc: 'Public scholar outreach coordinator and workflows' },
  'trureturing-pages': { label: 'Knowledge Atlas', desc: 'Published mathematical knowledge Atlas & Truth DAG' },
  'trureturing-requests': { label: 'Problem Intake', desc: 'Public mathematical problems & formalization requests' },
  'trureturing-source-theories': { label: 'Source Theories', desc: 'Reference theories and research source material' },
  'trureturing-tools': { label: 'Verification Tools', desc: 'Checkers, linters & verification tooling releases' },
  'trureturing-visualize': { label: 'Visual Explainers', desc: 'Interactive mathematical explainers & diagrams' }
};

function translateSourceLabel(raw) {
  const s = String(raw || '').trim();
  if (!isEn()) return s || '研究有了新的进展';
  if (!s) return 'New research update';
  if (SOURCE_LABEL_EN[s]) return SOURCE_LABEL_EN[s];
  if (/[\u4e00-\u9fff]/.test(s)) {
    if (/书稿|书库/.test(s)) return 'Monograph Pipeline';
    if (/检验|验证|核验/.test(s)) return 'Lean Verification';
    if (/评审|复核/.test(s)) return 'Independent Review';
    if (/论文|知识|页面|发布/.test(s)) return 'Knowledge Publishing';
    if (/交流|传播|学者/.test(s)) return 'Scholar Outreach';
    if (/工具|模板|可视化/.test(s)) return 'Tools & Infrastructure';
    return 'Research Update';
  }
  return s;
}

const glyphPaths = {
  direction: ['M12 3v18M3 12h18', 'm7 7 5-4 5 4M7 17l5 4 5-4'],
  research: ['M17 4H6l7 8-7 8h11'],
  review: ['M3 8h17m-4-4 4 4-4 4M21 16H4m4-4-4 4 4 4'],
  verification: ['m5 12 4 4L19 6', 'M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9'],
  books: ['M12 6C8 3 4 4 3 5v14c3-2 6-1 9 1 3-2 6-3 9-1V5c-3-2-6-1-9 1Z', 'M12 6v14'],
  publication: ['M6 3h9l4 4v14H6Z', 'M14 3v5h5M9 12h7M9 16h5'],
  outreach: ['M4 5h16v12H9l-5 4V5Z', 'M8 9h8M8 13h5'],
  studio: ['M5 4v16M12 4v16M19 4v16', 'M2 8h6M9 16h6M16 10h6']
};

const timestamp = value => Date.parse(value);
const relative = value => {
  const n = Math.max(0, (Date.now() - timestamp(value)) / 1000);
  if (!Number.isFinite(n)) return L('近期', 'recent');
  if (n < 60) return L('刚刚', 'just now');
  if (n < 3600) return isEn() ? `${Math.floor(n / 60)}m ago` : `${Math.floor(n / 60)} 分钟前`;
  if (n < 86400) return isEn() ? `${Math.floor(n / 3600)}h ago` : `${Math.floor(n / 3600)} 小时前`;
  return isEn() ? `${Math.floor(n / 86400)}d ago` : `${Math.floor(n / 86400)} 天前`;
};

const element = (tag, text = '', className = '') => {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  return el;
};

const safeURL = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '#';
  } catch {
    return '#';
  }
};

function external(label, url, className = '') {
  const el = element('a', label, className);
  el.href = safeURL(url);
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  return el;
}

const view = () => state.stream?.organization;
const departments = () => view()?.departments || [];
const department = id => departments().find(d => d.id === id);
const activities = () => departments().flatMap(d => d.activities);
const key = ref => ref ? `${ref.repository}#${ref.number}` : '';
const shortRepo = repo => String(repo || '').split('/').at(-1) || '';
const editorialKey = ref => ref ? `${shortRepo(ref.repository)}#${ref.number}` : '';
const eventKey = a => `${a.id}/${a.status}/${a.at}`;
const isStale = () => !view() || Date.now() - timestamp(view().observed_at) > 180000;
const fresh = a => Boolean(a.fresh && !isStale());
const active = a => fresh(a) && ['working', 'waiting'].includes(a.status) && ['automation', 'session'].includes(a.kind);
const sourceLabel = a => translateSourceLabel(view()?.sources.find(s => s.id === a.source)?.label);

const technical = /\b(?:audit|reg audit|registration audit|cache|runner|workflow|roster|stratalint|lint|heartbeat|registration|worktree|bootstrap|toolchain|CI|template|oracle broker|Codex CLI|memory envelope)\b|Skills\*\*|four-slot|compilation|protected judge|trusted judge|judge reuse|current dev|tools preview|Adopt tested tools|编译判官|禁止流水账|流水线|缓存|工具接入|审计|登记|加载器|合并规则/i;

const noisyLogPattern = /\b(?:Draft PR \d+|Native watcher|Unknown constant|FILEMAP job|source head|exits nonzero|context-isolated|canonical report|merged delivery|Mathlib\/|\.lean:\d+|Threshold-\d+|frozen suppliers)\b|\[代码见原记录\]|https?:\/\//i;

const cleanTitle = text => String(text || '')
  .replace(/^[-*•\s]+/, '')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/^(?:research|math|docs|feat|fix|chore|refactor)(?:\([^)]*\))?\s*[:：]\s*/i, '')
  .replace(/^(?:Research (?:unit|line)(?:\s*\([^)]*\))?|Open problem\s*\(preregistration\)|Preregister)\s*[:—-]?\s*/i, '')
  .replace(/\b[a-f0-9]{7,64}\b/gi, '')
  .replace(/[\r\n]+/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

function humanTitle(value) {
  const text = cleanTitle(value);
  if (isEn()) {
    if (!text) return 'Advancing proof from open problem';
    if (SOURCE_LABEL_EN[text]) return SOURCE_LABEL_EN[text];
    if (/用蓝色标记无公理的 Lean 定理/.test(text)) return 'Book template: highlight axiom-free Lean theorems in blue';
    return text;
  }
  const patterns = [
    [/qubit-qutrit product-anchor|arbitrary MUB pairs/i, '任意 MUB 对上的量子比特–三态乘积锚点凸性'],
    [/cyclic band.*positive Fej[eé]r|Fej[eé]r weights/i, '正 Fejér 权重下的循环带上界证明'],
    [/phase cancellation.*serial four-port|four-port matching chains/i, '串行四端口匹配链中的相位抵消证明'],
    [/high-density sci-fi strategic war map/i, '实时大屏：科幻指挥室高密度战略沙盘'],
    [/Bargmann-Gram spherical trig|quaternion Fractran/i, 'Bargmann–Gram 球面三角与四元数 Fractran'],
    [/triple-contact fibres|Huang energy/i, '由 Huang 能量界定三重接触纤维'],
    [/prime primitive-root character sieve|exact threshold.*primitive-root/i, '素数原根特征筛的精确阈值证明'],
    [/zero-axiom quadratic extensions|Lagrange-Schur positivity/i, '零公理二次扩张与 Lagrange–Schur 正定性'],
    [/weighted near-collisions|missing-window starts/i, '加权近碰撞与有界缺口起点估计'],
    [/bound the disjoint character coefficients/i, '量子几何：不相交特征系数上界'],
    [/return supports and simultaneous switch counts/i, 'Steiner 章节：回返支撑与同时切换计数'],
    [/explain the mixed phase term in disjoint triples/i, '量子几何：不相交三重和混合相位项'],
    [/derive cyclic occupation/i, '书稿推导：按公共度数的循环占据质量'],
    [/Clarify trusted collection|single material producer/i, 'Mathesis：可信收录与单源产物机制'],
    [/two fixed CMA roles|memory budgets/i, 'Mathesis：固定 CMA 席位角色与内存预算'],
    [/Connect papers to open questions/i, 'Mathesis：论文关联开放问题与共享贡献'],
    [/Unify formalization participation/i, 'Mathesis：统一形式化参与与共享请求'],
    [/formal verification as central hub/i, '实时大屏：形式验证中心枢纽 3D 架构'],
    [/3-tier 3D architectural decks/i, '实时大屏：三层玻璃甲板与闭环总轨'],
    [/8 biomimetic 3D holographic entities/i, '实时大屏：8 部门拟生态实体与战报墙'],
    [/full-bleed 60fps 3D holographic/i, '实时大屏：全屏 3D 全息引擎与 HUD'],
    [/Chrono-Metaverse Holo Arena/i, '实时大屏：全息场 / 蓝图 / 白模三风格'],
    [/用蓝色标记无公理的 Lean 定理/i, '书稿模板：蓝标无公理 Lean 定理'],
    [/rotated BKM energy|qubit Petz pencil/i, '物理量子比特 Petz 族的旋转 BKM 能量证明'],
    [/retain phase cancellation|disjoint coefficient bound/i, '不相交系数上界中的相位抵消保持'],
    [/isolate the mixed phase|disjoint triple sums/i, '不相交三重和中的混合相位项分离'],
    [/two-colour Rado|Rado last exception/i, '双色 Rado 猜想的最后例外刻画'],
    [/heat separation.*vanishing-mass|vanishing-mass triangle/i, '零质量三角形上的热分离证明'],
    [/preserve zeta residues|triangular Mangoldt/i, '三角 Mangoldt 平滑与 ζ 留数保持'],
    [/three-state Potts|unsatisfied bonds/i, '三态 Potts 反铁磁条带的递推计数'],
    [/cyclic occupation mass|common degree/i, '按公共度数的循环占据质量投影'],
    [/Narayan Conjecture/i, 'Narayan 猜想 18.2 的构造性证明'],
    [/disjoint occupation.*cyclic band|project disjoint occupation/i, '循环带上的不相交占据系数投影'],
    [/quarter-grid.*prime triangle|characterize RH/i, '四分网格素数三角形与黎曼猜想刻画'],
    [/weighted mass of disjoint|bound the weighted mass|disjoint residual occupation mass/i, '不相交剩余占据的质量精确上界'],
    [/Farey chord gaps|Cayley composition|Taylor barrier/i, 'Farey 弦间隙、Cayley 复合与 Taylor 势垒'],
    [/degree-two residual|directed gaps/i, '二次剩余与有向间隙的结构关联'],
    [/controlled-qubit.*recovery|arbitrary finite fragments/i, '有限片段上的受控量子比特重构'],
    [/multinomial mass.*residual|matchable residual/i, '可匹配剩余占据的多项式质量上界'],
    [/weighted near-pairs|near-pairs of ζ/i, 'ζ 函数加权近对的精确上界'],
    [/king two-defect|two-defect col/i, '双缺陷着色结构的存在性证明'],
    [/switch counts/i, 'Steiner 切换计数的结构解释'],
    [/weighted.*occupation.*diagonal|occupation.*diagonal.*coordinate/i, '加权占据对角线的坐标乘积上界'],
    [/ζ.*tail.*occupation|zeta.*tail.*occupation/i, 'ζ 函数尾部的占据对角线估计'],
    [/fixed-pair.*rigidity|noncommuting.*qubit/i, '非对易量子态的固定对刚性与张量重构'],
    [/ordered-coefficient.*decision|fixed-marginal.*feature|randomized reconstruction/i, '有限决策质量与边缘特征的精确重构'],
    [/Dietz.*Flowers.*Lockard|least odd exponent/i, 'Dietz–Flowers–Lockard 最小奇指数猜想'],
    [/Hardin array|six-row transfer/i, 'Hardin 阵列归一化与六行转移证明'],
    [/zero-axiom|frozen declaration/i, '零公理证明依赖与知识图谱固化'],
    [/Steiner.*switch|point-deleted Steiner/i, 'Steiner 切换结构的极大分支计数'],
    [/first harmonic.*vanishing even|sharp first harmonic/i, '偶谐波消失时的第一谐波尖锐界'],
    [/first harmonic.*second and fourth/i, '由二、四次谐波给出的第一谐波尖锐界'],
    [/variable-trace.*root disk|prime power/i, '素数幂上的变迹根圆盘定理'],
    [/Rossi.*10\.3|Cohen-Macaulayness|Raz independence/i, 'Raz 独立复形的 Cohen–Macaulay 性质'],
    [/rank loss.*projected parit|empty fibres/i, '空纤维投影奇偶性中的秩损失'],
    [/diffuse.*(?:uniform|sinc).*Euclidean/i, '分散扰动下的欧氏尺度误差界'],
    [/exact.*(?:marginal.*rank|rank.*marginal)|marginal.rank.*overlap/i, '相邻态重叠与边缘态精确秩'],
    [/closed.window.*(?:Gaussian|mass)|Gaussian.*closed.window/i, '带相位高斯核的闭区间质量约束'],
    [/Fibonacci.*(?:divergence|qubit)|qubit.*Fibonacci/i, '斐波那契量子态的散度间隙'],
    [/primitive.?root|素数原根/i, '寻找更小的素数原根'],
    [/legal.growth|compactness|紧致/i, '无限生长过程的紧致性结构'],
    [/countably|countable.*(?:interval|test)|可数.*检验/i, '可数多检验的共同频谱扰动'],
    [/spectral.*(?:order|count)|preserve.*count|频谱.*计数/i, '微调频率下的计数规律保持'],
    [/near.collision|weighted.*collision|近碰撞/i, '怎样控制频谱中的近碰撞？'],
    [/spectr|fourier|频谱|傅里叶/i, '彼此相容的频谱与误差估计'],
    [/ternary|Steiner|Latin|internal.extension|三元.*扩展/i, '三元结构扩展的可达规模'],
    [/stretch|gain.reconstruction|拉伸|增益重构/i, '图结构决定的重构误差界'],
    [/recognition.depth|识别深度/i, '识别深度的稳定门槛'],
    [/theta|Bilgici|θ.*分解/i, 'θ 函数分解中的新结构'],
    [/Kraus|entang|quantum|量子|纠缠/i, '量子态、纠缠与误差之间的联系'],
    [/entropy|deletion|insertion|delete|删除|窗口/i, '删除与重构中的信息熵问题'],
    [/Möbius|Moebius|mobius|multicolor/i, '有限结构的 Möbius 多项式计算'],
    [/matroid|graph|cube|sphere|图论|立方|球面/i, '图与几何中的组合结构问题'],
    [/cubic|Frobenius|polynomial|BMV|多项式/i, '多项式与代数结构中的新线索']
  ];
  return patterns.find(([test]) => test.test(text))?.[1] || text || '从一个问题，继续推进论证';
}

function copyFor(a) {
  if (!isEn()) {
    const copies = state.snapshot?.editorial?.questions || {};
    const direct = copies[editorialKey(a.task)];
    if (direct) return { ...direct, canonical: key(a.task), hasEditorial: true };
    const refs = (a.references || []).filter(ref => ref.repository === a.task?.repository);
    const match = refs.find(ref => copies[editorialKey(ref)]);
    if (match) return { ...copies[editorialKey(match)], canonical: key(match), hasEditorial: true };
  }
  const book = a.department === 'books';
  const title = humanTitle(a.label);
  const text = String(a.label || '');
  const area = book
    ? L('理论书写', 'Monographs')
    : /prime|arith|原根|素数|exponent/i.test(text) ? L('数论', 'Number Theory')
    : /quantum|Kraus|qubit|量子|纠缠/i.test(text) ? L('量子信息', 'Quantum Info')
    : /graph|matroid|ternary|Steiner|Latin|Hardin|图|三元|cube/i.test(text) ? L('组合与几何', 'Combinatorics')
    : /spectr|fourier|compact|harmonic|occupation|频谱|紧致/i.test(text) ? L('分析与结构', 'Analysis')
    : L('数学研究', 'Math Research');
  return {
    title,
    area,
    question: book
      ? L('将验证通过的新论证沉淀为可读的双语章节。', 'Distilling verified proofs into structured bilingual monograph chapters.')
      : L('围绕这个问题探索新的构造、证明与可检验边界。', 'Exploring new constructions, formal proofs, and verifiable boundaries.'),
    canonical: key(a.task),
    hasEditorial: false
  };
}

function findLinkedTaskActivity(ref) {
  if (!ref) return null;
  const targetKey = key(ref);
  return activities().find(item => ['task', 'contribution'].includes(item.kind) && key(item.task) === targetKey) || null;
}

function phase(a) {
  if (a.kind === 'automation') {
    if (isEn()) {
      return ({
        working: fresh(a) ? 'Running' : 'Recently ran',
        waiting: fresh(a) ? 'Queued' : 'Recently queued',
        succeeded: 'Passed',
        failed: 'Needs fix',
        cancelled: 'Ended',
        closed: 'Ended',
        unknown: 'Awaiting update'
      })[a.status] || 'Recent CI run';
    }
    return ({
      working: fresh(a) ? '正在执行' : '稍早正在执行',
      waiting: fresh(a) ? '等待执行' : '稍早等待执行',
      succeeded: '本轮执行完成',
      failed: '继续处理这一轮',
      cancelled: '本轮已结束',
      closed: '本轮已结束',
      unknown: '等待新的进展'
    })[a.status] || '最近的执行进展';
  }
  if (a.kind === 'session') {
    if (isEn()) {
      return ({
        working: fresh(a) ? 'In progress' : 'Awaiting update',
        waiting: 'Queued next',
        succeeded: 'Round complete',
        failed: 'Retrying',
        cancelled: 'Session ended',
        ready: 'Ready',
        unknown: 'Awaiting update'
      })[a.status] || 'Research session';
    }
    return ({
      working: fresh(a) ? '正在推进' : '等待新的进展',
      waiting: '等待下一步',
      succeeded: '这一轮已完成',
      failed: '继续处理',
      cancelled: '这一轮已结束',
      ready: '准备继续',
      unknown: '等待新的进展'
    })[a.status] || '研究会话';
  }
  if (a.status === 'merged') return a.department === 'books' ? L('已汇入书稿', 'Merged to book') : L('新论证已汇入', 'Proof merged');
  if (a.status === 'closed') return L('这一段探索已结束', 'Thread concluded');
  if (a.status === 'claimed') return L('已接下这项工作', 'Claimed');
  if (a.kind === 'review') return L('继续复核论证', 'Under review');
  if (a.kind === 'discussion') return L('交换思路', 'Discussion');
  if (a.kind === 'task') return L('问题已经提出', 'Problem opened');
  return a.department === 'books' ? L('正在完善书稿', 'Refining chapter') : L('正在推进论证', 'Advancing proof');
}

function messageFor(a) {
  if (!a.task) return null;
  return (state.stream?.messages || []).find(m => m.url === a.url) || null;
}

function progress(a) {
  if (a.kind === 'automation') {
    return {
      title: sourceLabel(a),
      summary: a.department === 'outreach'
        ? L('协调交流工作，让研究走向更广的讨论。', 'Coordinating scholar dialogue and syncing verified notes.')
        : a.department === 'books'
          ? L('把书稿中的新内容，接到持续构建与出版的流程。', 'Building and checking updated monograph chapters continuously.')
          : a.department === 'publication'
            ? L('让已有的研究，出现在可以阅读与继续探索的地方。', 'Publishing verified findings to the public knowledge archive.')
            : L('研究提交正在经过项目已有的共同检验。', 'Running formal verification checks against the shared Lean codebase.')
    };
  }
  const message = messageFor(a);
  const text = message?.text || '';
  if (a.kind === 'review' || message?.kind === 'review_comment') {
    return {
      title: L('提出了论证的复核意见', 'Submitted review feedback'),
      summary: L('回到问题、条件与结论之间，检查还有哪些细节需要补充。', 'Auditing hypotheses, intermediate lemmas, and boundary cases.')
    };
  }
  if (/^(?:本轮)?认领|^I(?: am|'m) taking|^Claimed\b/i.test(text)) {
    return {
      title: L('接下了这条研究线索', 'Claimed research thread'),
      summary: L('沿着已有问题，开始推进下一部分论证。', 'Taking ownership of the next proof step along this problem line.')
    };
  }
  if (/sharp.*(?:relative|bound)|Refine.*(?:count|discrepancy)|更紧|锐.*估计/i.test(text)) {
    return {
      title: L('提议把估计再推进一步', 'Proposed sharper bound'),
      summary: L('从已有结论出发，尝试更精确的控制与更清楚的边界。', 'Tightening estimates and sharpening boundary constants from existing results.')
    };
  }
  if (/counterexample|反例|boundary|边界/i.test(text)) {
    return {
      title: L('继续考察边界与反例', 'Checking boundaries & counterexamples'),
      summary: L('从具体情形出发，寻找需要补充的条件。', 'Testing concrete edge cases to pinpoint necessary conditions or obstructions.')
    };
  }
  if (/independent.*review|review.*passes|独立.*评审|评审.*意见/i.test(text)) {
    return {
      title: L('更新了独立复核的讨论', 'Updated independent review notes'),
      summary: L('围绕已有论证，继续交换检查与修订的意见。', 'Exchanging cross-model verification notes and revision feedback.')
    };
  }
  if (a.kind === 'discussion') {
    return {
      title: a.department === 'books' ? L('继续讨论这一部分书稿', 'Discussing monograph chapter') : L('补充了新的研究进展', 'Added research update'),
      summary: copyFor(a).title
    };
  }
  return { title: copyFor(a).title, summary: copyFor(a).question };
}

function cleanHumanExcerpt(raw, fallback) {
  const text = String(raw || '')
    .replace(/\[代码见原记录\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\b[a-f0-9]{7,64}\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || noisyLogPattern.test(raw || '')) return fallback;
  return text.length > 96 ? `${text.slice(0, 96)}…` : text;
}

function humanTaskSubtitle(a) {
  const timeText = relative(a.at);
  if (a.kind === 'automation') {
    const linked = findLinkedTaskActivity(a.task);
    if (linked) return `${copyFor(linked).title} · ${timeText}`;
    return `${progress(a).summary}`;
  }
  const copy = copyFor(a);
  if (copy.hasEditorial) return copy.question;
  return `${copy.area} · ${timeText}`;
}

function actorLabel(actor) {
  return actor?.kind === 'agent' && actor.tool
    ? `${actor.tool} · ${actor.label || actor.id}`
    : actor?.label || actor?.id || L('公开账号', 'Public Account');
}

function seatMonogram(actor) {
  const raw = String(actor?.label || actor?.id || '?').replace(/\[bot\]$/i, '');
  const m = raw.match(/macstudio-(\d+)/i);
  if (m) return `M${m[1]}`;
  const words = raw.split(/[-_.\s]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

function person(actor) {
  const label = actorLabel(actor);
  const el = element('span', '', 'person' + (actor.kind === 'agent' ? ' agent' : ''));
  const mark = element('span', seatMonogram(actor), 'person-mark');
  mark.setAttribute('aria-hidden', 'true');
  el.append(mark, element('span', label, 'person-name'));
  return el;
}

function peopleFor(items) {
  const people = new Map();
  for (const a of items) if (a.actor) people.set(`${a.actor.kind}:${a.actor.id}`, a.actor);
  return [...people.values()];
}

function actorTasks(d, actor) {
  return d.activities
    .filter(a => a.actor?.id === actor.id && a.actor?.kind === actor.kind)
    .sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));
}

function departmentRoster(d) {
  const actors = new Map((d.participants || []).map(actor => [`${actor.kind}:${actor.id}`, actor]));
  for (const a of d.activities) if (a.actor) actors.set(`${a.actor.kind}:${a.actor.id}`, a.actor);
  return [...actors.values()].sort((a, b) => {
    const at = actorTasks(d, a);
    const bt = actorTasks(d, b);
    return Number(bt.some(active)) - Number(at.some(active))
      || timestamp(bt[0]?.at) - timestamp(at[0]?.at)
      || actorLabel(a).localeCompare(actorLabel(b));
  });
}

function publicSeatCount(d) {
  return departmentRoster(d).length;
}

function actorTaskTitle(a, d) {
  if (a.kind === 'automation') {
    const linked = findLinkedTaskActivity(a.task);
    return linked ? `${sourceLabel(a)} · ${copyFor(linked).title}` : sourceLabel(a);
  }
  if (a.task && ['discussion', 'review'].includes(a.kind)) {
    const linked = findLinkedTaskActivity(a.task);
    if (linked) return copyFor(linked).title;
  }
  if (a.task && ['research', 'books'].includes(d.id)) return copyFor(a).title;
  if (a.task) {
    const translated = humanTitle(a.label);
    return translated && translated !== sourceLabel(a) ? translated : sourceLabel(a);
  }
  return progress(a).title;
}

function icon(id) {
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of glyphPaths[id] || glyphPaths.research) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

function hexShellSVG() {
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 200 198');
  svg.setAttribute('class', 'cell-hex-shell');
  svg.setAttribute('aria-hidden', 'true');
  const ptsOuter = '50,3 150,3 197,86.6 150,170.2 50,170.2 3,86.6';
  const ptsInner = '54,10 146,10 189,86.6 146,163.2 54,163.2 11,86.6';
  const ptsShadow = '50,25 150,25 197,108.6 150,192.2 50,192.2 3,108.6';
  const ptsSheen = '54,10 146,10 189,86.6 11,86.6';
  const wallLeft = '3,86.6 50,170.2 50,188.2 3,104.6';
  const wallFront = '50,170.2 150,170.2 150,188.2 50,188.2';
  const wallRight = '150,170.2 197,86.6 197,104.6 150,188.2';
  const slice1 = 'M 3 92.6 L 50 176.2 L 150 176.2 L 197 92.6';
  const slice2 = 'M 3 98.6 L 50 182.2 L 150 182.2 L 197 98.6';

  const make = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };

  svg.append(
    make('polygon', { points: ptsShadow, class: 'cell-hex-shadow' }),
    make('polygon', { points: wallLeft, class: 'cell-hex-wall is-left' }),
    make('polygon', { points: wallFront, class: 'cell-hex-wall is-front' }),
    make('polygon', { points: wallRight, class: 'cell-hex-wall is-right' }),
    make('path', { d: slice1, class: 'cell-hex-slice' }),
    make('path', { d: slice2, class: 'cell-hex-slice' }),
    make('polygon', { points: ptsOuter, class: 'cell-hex-pulse' }),
    make('polygon', { points: ptsOuter, class: 'cell-hex-outer' }),
    make('polygon', { points: ptsSheen, class: 'cell-hex-sheen' }),
    make('polygon', { points: ptsInner, class: 'cell-hex-inner' })
  );
  return svg;
}

function flatHexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i);
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function countRunning(d) {
  return isStale() ? null : (d.running_automations || 0) + (d.running_sessions || 0);
}

function queueStats(d) {
  const waiting = d.activities.filter(a =>
    ['waiting', 'queued', 'requested'].includes(a.status)
    || (a.kind === 'task' && ['open', 'claimed'].includes(a.status))
  ).length;
  const running = Math.max(
    d.activities.filter(active).length || 0,
    (d.running_automations || 0) + (d.running_sessions || 0)
  );
  const recent = d.activities.filter(a => timestamp(a.at) > Date.now() - 86400000).length;
  return {
    waiting,
    running,
    recent,
    sampled: d.activities.length >= 100,
    label: waiting ? `${waiting}${d.activities.length >= 100 ? '+' : ''}` : '0'
  };
}

function departmentState(d) {
  if (d.execution === 'human') return L('问题从这里出发', 'Problems start here');
  const count = countRunning(d);
  if (count === null) return L('等待新的进展', 'Awaiting updates');
  const queue = queueStats(d);
  if (count && queue.waiting) return isEn() ? `${count} active · ${queue.label} queued` : `${count} 项执行 · ${queue.label} 待接力`;
  if (count) return isEn() ? `${count} active` : `${count} 项工作正在执行`;
  if (queue.waiting) return isEn() ? `${queue.label} queued` : `${queue.label} 项待接力`;
  const waiting = d.activities.filter(a => active(a) && a.status === 'waiting').length;
  if (waiting) return isEn() ? `${waiting} awaiting relay` : `${waiting} 项工作等待接力`;
  return d.activities.length ? L('新的想法持续汇入', 'New ideas flowing in') : L('等待下一段探索', 'Awaiting next thread');
}

function handoffSummary() {
  const map = new Map();
  for (const h of view()?.handoffs || []) {
    if (h.kind !== 'reference') continue;
    const k = `${h.from}->${h.to}`;
    const prev = map.get(k) || { from: h.from, to: h.to, count: 0, items: [] };
    prev.count += 1;
    if (prev.items.length < 12) prev.items.push(h);
    map.set(k, prev);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function renderHealth() {
  const current = view();
  const dagEl = $('#log-ops-dag');
  if (dagEl && truthNebula?.counts?.truth_nodes) {
    dagEl.textContent = truthNebula.counts.truth_nodes.toLocaleString();
  }
  if (typeof syncInstituteRealm === 'function') syncInstituteRealm();
  if (!current) return;
  const late = isStale();
  const connection = $('#connection');
  connection.classList.toggle('delayed', late);
  const en = isEn();
  connection.lastElementChild.textContent = late
    ? (en ? tr('connecting', 'Connecting') : '等待新的现场更新')
    : (en ? `Updated ${relative(current.observed_at)}` : `${relative(current.observed_at)}更新`);
  $('#connection-note').hidden = !late;
  $('#connection-note').textContent = L(
    '更新稍慢。你仍然可以浏览已有架构、历史进展与公开讨论。',
    'Live updates are slightly delayed. You can still explore the 3D observatory, archives, and discussions.'
  );

  const growthEl = $('#log-ops-growth');
  if (growthEl) {
    const n = truthGrowth.totalRecent || 0;
    growthEl.textContent = n > 0
      ? (en ? `+${n} mods` : `+${n} 模块`)
      : (en ? 'Standby' : '静默监测');
    growthEl.classList.toggle('is-ok', n > 0);
    growthEl.classList.toggle('is-warn', false);
  }
  const ciEl = $('#log-ops-ci');
  if (ciEl) {
    const runningAuto = (current.departments || []).reduce((sum, d) => sum + (late ? 0 : (d.running_automations || 0)), 0);
    ciEl.textContent = late ? '—' : (en ? `${runningAuto} live` : `${runningAuto} 活跃`);
  }
}

function isGenericAutomationTitle(title) {
  return /^(?:检验研究提交|检查与构建书稿|出版在线书库|更新公开研究页面|发布研究知识|协调学术交流与传播|准备研究传播材料|Verify Research PR|Build & Check Monograph|Publish Online Books|Update Research Site|Publish Research Knowledge|Coordinate Scholar Outreach|Prepare Outreach Materials)$/.test(String(title || '').trim());
}

function cleanWorkTitle(a, d) {
  if (a.kind === 'automation') {
    const linked = findLinkedTaskActivity(a.task);
    if (linked) return copyFor(linked).title;
    return sourceLabel(a);
  }
  if (a.task && ['discussion', 'review'].includes(a.kind)) {
    const linked = findLinkedTaskActivity(a.task);
    if (linked) return copyFor(linked).title;
  }
  const translated = humanTitle(a.label);
  if (translated && translated !== sourceLabel(a) && !isGenericAutomationTitle(translated)) return translated;
  if (a.task && ['research', 'books'].includes(d?.id)) return copyFor(a).title;
  return sourceLabel(a);
}

function departmentMissions(d) {
  if (!d) return [];
  const missions = [];
  const seen = new Set();
  const push = text => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    missions.push(clean);
  };

  if (d.execution === 'human') {
    const rDept = department('research');
    if (rDept) {
      for (const a of rDept.activities) {
        if (['task', 'contribution'].includes(a.kind) && !technical.test(a.label)) {
          push(L(`牵引：${copyFor(a).title}`, `Guide: ${copyFor(a).title}`));
          if (missions.length >= 3) break;
        }
      }
    }
    if (!missions.length) push(L('提出前沿问题 · 设定约束与方向把关', 'Set open problems · frame constraints & guide direction'));
    return missions;
  }

  if (d.id === 'verification') {
    const sorted = [...d.activities].sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));
    for (const a of sorted) {
      if (a.kind === 'task' && !technical.test(a.label)) {
        push(L(`请求：${copyFor(a).title}`, `Request: ${copyFor(a).title}`));
      } else if (a.kind === 'automation' && a.task) {
        const linked = findLinkedTaskActivity(a.task);
        if (linked && !technical.test(linked.label)) push(L(`核验：${copyFor(linked).title}`, `Verify: ${copyFor(linked).title}`));
      }
      if (missions.length >= 4) break;
    }
    if (!missions.length) push(L('Lean 4 内核核验与定理账本固化', 'Lean 4 kernel verification & theorem ledger freeze'));
    return missions;
  }

  if (d.id === 'review') {
    for (const a of d.activities) {
      const t = cleanWorkTitle(a, d);
      if (!isGenericAutomationTitle(t)) push(L(`复核：${t}`, `Review: ${t}`));
      if (missions.length >= 3) break;
    }
    if (!missions.length) {
      const rDept = department('research');
      const latest = rDept?.activities.find(a => a.kind === 'contribution' && !technical.test(a.label));
      push(latest
        ? L(`待审边界：${copyFor(latest).title}`, `Audit boundary: ${copyFor(latest).title}`)
        : L('独立跨模型边界复核就绪', 'Independent cross-model audit ready'));
    }
    return missions;
  }

  if (d.id === 'books') {
    const sorted = [...d.activities]
      .filter(a => ['contribution', 'task'].includes(a.kind) && !technical.test(a.label))
      .sort((a, b) => timestamp(b.at) - timestamp(a.at));
    for (const a of sorted) {
      push(copyFor(a).title);
      if (missions.length >= 4) break;
    }
    if (!missions.length) push(L('双语理论章节整理与书面证明回流', 'Bilingual monograph chapters & formal proof distillation'));
    return missions;
  }

  if (d.id === 'publication') {
    const sorted = [...d.activities]
      .filter(a => ['contribution', 'task'].includes(a.kind))
      .sort((a, b) => timestamp(b.at) - timestamp(a.at));
    for (const a of sorted) {
      const t = cleanWorkTitle(a, d);
      if (!isGenericAutomationTitle(t)) push(t);
      if (missions.length >= 3) break;
    }
    for (const p of (state.snapshot?.publications || []).slice(0, 2)) {
      const copy = isEn() ? null : state.snapshot?.editorial?.papers?.[p.id];
      push(L(`预印本：${copy?.title || humanTitle(p.title)}`, `Preprint: ${p.title || humanTitle(p.title)}`));
      if (missions.length >= 4) break;
    }
    if (!missions.length) push(L('短文 DOI 发布与 Mathesis 公开目录', 'Short notes, DOIs & Mathesis public catalog'));
    return missions;
  }

  if (d.id === 'outreach') {
    for (const p of (state.snapshot?.publications || []).slice(0, 2)) {
      const copy = isEn() ? null : state.snapshot?.editorial?.papers?.[p.id];
      push(L(`学者协作：${copy?.title || humanTitle(p.title)}`, `Collab: ${p.title || humanTitle(p.title)}`));
    }
    push(L('向题源作者同步已验证定理并回收请求', 'Sync verified theorems with authors & intake new requests'));
    return missions.slice(0, 3);
  }

  if (d.id === 'studio') {
    const sorted = [...d.activities]
      .filter(a => ['contribution', 'task'].includes(a.kind))
      .sort((a, b) => timestamp(b.at) - timestamp(a.at));
    for (const a of sorted) {
      const t = cleanWorkTitle(a, d);
      if (!isGenericAutomationTitle(t)) push(t);
      if (missions.length >= 4) break;
    }
    if (!missions.length) push(L('出版模板、交互可视化与大屏观测', 'Book templates, visual explainers & live observatory'));
    return missions;
  }

  // research & fallback
  const sorted = [...d.activities]
    .filter(a => ['contribution', 'task'].includes(a.kind) && !technical.test(a.label))
    .sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));
  for (const a of sorted) {
    push(copyFor(a).title);
    if (missions.length >= 4) break;
  }
  if (!missions.length) push(L('持续探索新证明、反例与边界构造', 'Exploring proofs, counterexamples & sharp bounds'));
  return missions;
}

function renderTicker() {
  const recent = view()?.recent || [];
  // Prefer concrete theorem/chapter/linked signals over bare unlinked CI boilerplate
  const richActive = recent.find(a => active(a) && (a.kind !== 'automation' || findLinkedTaskActivity(a.task)));
  const item = richActive || recent.find(a => active(a)) || recent[0];
  if (!item) return;
  const d = department(item.department);
  const title = cleanWorkTitle(item, d || { id: item.department });
  state.tickerTarget = item;
  const dName = langDeptLabel(d || item.department, L('研究院', 'Institute'));
  $('#ticker-text').textContent = isEn() ? `${dName} · ${phase(item)}: ${title}` : `${dName} · ${phase(item)}：${title}`;
  $('#ticker-time').textContent = `${relative(item.at)} · ${L('查看 →', 'View →')}`;
}

function renderMetrics() {
  const list = departments();
  if (!list.length) return;
  const running = list.reduce((n, d) => n + (d.running_automations || 0), 0);
  const sessions = list.reduce((n, d) => n + (d.running_sessions || 0), 0);
  const handoffsCount = (view()?.handoffs || []).length;
  const items = [];
  const metric = (n, label, className = '') => {
    const el = element('span', '', className);
    el.append(element('strong', String(n)), document.createTextNode(label));
    return el;
  };
  const en = isEn();
  items.push(metric(list.length, en ? ' depts' : '个部门，持续相连'));
  items.push(metric(isStale() ? '—' : running, en ? ' CI live' : '项自动化正在运转', 'metric-active'));
  if (sessions) items.push(metric(isStale() ? '—' : sessions, en ? ' sessions' : '个研究会话正在推进', 'metric-active'));
  if (handoffsCount) items.push(metric(handoffsCount, en ? ' relays' : '条跨部门引用接力'));
  items.push(element('span', en ? '24/7 Human + AI Loop' : '24/7 AI 自治闭环与人的方向指引', 'metric-end'));
  $('#institute-metrics').replaceChildren(...items);
  const n = state.snapshot?.repositories?.length;
  $('#institute-scope').textContent = n ? `${n} REPOS · LIVE STREAM` : '';
  const clockEl = $('#board-clock');
  if (clockEl) {
    const dagN = truthNebula.counts?.truth_nodes;
    const dagTag = dagN ? `TRUTH DAG NEBULA ${dagN.toLocaleString()} NODES // ` : '24·7 LOOP // ';
    clockEl.textContent = isStale()
      ? 'SIGNAL STANDBY · AWAITING PULSE'
      : running
        ? `${dagTag}${running} CI ACTIVE · ${handoffsCount} RELAYS`
        : `${dagTag}${list.length} SECTORS ONLINE`;
  }

  for (const btn of document.querySelectorAll('[data-branch-department]')) {
    const id = btn.dataset.branchDepartment;
    btn.setAttribute('aria-pressed', String(state.focused === id || (!state.focused && state.selected === id)));
  }

  for (const btn of document.querySelectorAll('[data-method-department]')) {
    const id = btn.dataset.methodDepartment;
    const d = department(id);
    const badge = btn.querySelector('[data-step-badge]');
    btn.setAttribute('aria-pressed', String(state.focused === id || (!state.focused && state.selected === id)));
    if (!d || !badge) continue;
    if (d.execution === 'human') {
      badge.textContent = tr('rail_01_badge', '指引');
      badge.classList.remove('is-hot');
      continue;
    }
    const run = countRunning(d);
    const q = queueStats(d);
    if (run) {
      badge.textContent = en ? `${run} live` : `${run} 运行中`;
      badge.classList.add('is-hot');
    } else if (q.waiting) {
      badge.textContent = en ? `${q.label} queue` : `${q.label} 待接力`;
      badge.classList.remove('is-hot');
    } else if (d.activities.length) {
      badge.textContent = en ? `${d.activities.length}` : `${d.activities.length} 动态`;
      badge.classList.remove('is-hot');
    } else {
      badge.textContent = en ? 'ready' : '就绪';
      badge.classList.remove('is-hot');
    }
  }
}

// A new arrival extends an active notice. A brief pointer handoff cannot shorten it.
function showStationLabel(cell, duration) {
  if (!cell) return;
  const until = performance.now() + duration;
  if (cell.noticeUntil >= until) return;
  clearTimeout(cell.noticeTimer);
  cell.noticeUntil = until;
  cell.button.classList.add('is-label-notice');
  cell.noticeTimer = setTimeout(() => {
    cell.button.classList.remove('is-label-notice');
    cell.noticeUntil = 0;
  }, duration);
}

function createCell(d, index) {
  const pos = positions[d.id] || [200 + (index % 3) * 260, 180 + Math.floor(index / 3) * 200];
  const button = element('button', '', 'hive-cell');
  button.type = 'button';
  button.dataset.department = d.id;
  button.dataset.execution = d.execution;
  button.dataset.focusKey = `department:${d.id}`;
  button.style.setProperty('--x', `${(pos[0] / 10).toFixed(2)}%`);
  button.style.setProperty('--y', `${(pos[1] / 7.4).toFixed(2)}%`);

  const pin = element('span', '', 'cell-pin');
  pin.setAttribute('aria-hidden', 'true');
  pin.append(element('i', '', 'cell-pin-node'), element('i', '', 'cell-pin-stem'));

  let leader;
  if (holoWorld[d.id]?.x) {
    button.classList.add('is-wing-label');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'cell-leader');
    svg.setAttribute('aria-hidden', 'true');
    leader = document.createElementNS(ns, 'path');
    svg.append(leader);
    button.append(svg);
  }

  const card = element('span', '', 'cell-card');
  const head = element('span', '', 'cell-head');
  const liveDot = element('i', '', 'cell-live-dot');
  const glyph = element('span', '', 'cell-icon');
  glyph.append(icon(d.id));
  const title = element('strong', d.label, 'cell-title');
  const roleTag = element('span', deptRoles[d.id] || '', 'cell-role-tag');
  const landmark = element('span', '', 'cell-landmark');
  const landmarkCap = element('span', '', 'cell-landmark-cap');
  landmark.append(landmarkCap);
  head.append(liveDot, glyph, title, roleTag, landmark);

  const meta = element('span', '', 'cell-meta-row');
  const missionDot = element('span', '▸', 'cell-mission-dot');
  missionDot.setAttribute('aria-hidden', 'true');
  const status = element('span', '', 'cell-status');
  const mode = element('span', d.execution === 'human' ? 'HUMAN LOOP' : execution[d.execution], 'cell-mode');
  meta.append(missionDot, status, mode);

  const seats = element('span', '', 'cell-seats');
  card.append(head, meta, seats);

  button.append(pin, card);

  button.addEventListener('click', () => selectDepartment(d.id, true, true));
  button.addEventListener('pointerenter', () => previewDepartment(d.id));
  button.addEventListener('keydown', event => {
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const ordered = departments();
      const i = ordered.findIndex(x => x.id === d.id);
      const delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
      const next = ordered[(i + delta + ordered.length) % ordered.length];
      selectDepartment(next.id, true, false);
      state.cells.get(next.id)?.button.focus();
    }
  });
  return { button, status, title, mode, seats, landmark, landmarkCap, leader };
}

function previewDepartment(id) {
  if (!department(id) || state.focused) return;
  state.hovered = id;
  if (state.selected === id) {
    highlightRoutes(id);
    updateHoverHint(id);
    return;
  }
  state.selected = id;
  for (const [deptId, cell] of state.cells) {
    cell.button.setAttribute('aria-pressed', String(deptId === id));
  }
  for (const btn of document.querySelectorAll('[data-method-department]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.methodDepartment === id));
  }
  for (const btn of document.querySelectorAll('[data-branch-department]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.branchDepartment === id));
  }
  highlightRoutes(id);
  updateHoverHint(id);
  renderDepartment();
  if (typeof spawnHoloPulse === 'function') spawnHoloPulse(id, 1.0);
  const panel = $('#department-panel');
  if (panel && !state.quiet && !reduced) {
    panel.classList.remove('is-flash');
    void panel.offsetWidth;
    panel.classList.add('is-flash');
  }
}

function updateHoverHint(id) {
  const hint = $('#hive-hover-hint');
  if (!hint) return;
  const d = department(id);
  if (!d) {
    hint.textContent = L('点击任意部门六边形，放大进入该部门内部工作图', 'Click any department deck to zoom into its internal workflow');
    return;
  }
  const routes = view()?.routes || [];
  const out = routes.filter(r => r.from === id).map(r => langDeptLabel(department(r.to))).filter(Boolean);
  const inc = routes.filter(r => r.to === id).map(r => langDeptLabel(department(r.from))).filter(Boolean);
  const parts = [];
  if (inc.length) parts.push(isEn() ? `From: ${inc.join(' / ')}` : `承接：${inc.join(' / ')}`);
  if (out.length) parts.push(isEn() ? `To: ${out.join(' / ')}` : `交棒：${out.join(' / ')}`);
  const dLabel = langDeptLabel(d);
  hint.textContent = parts.length
    ? (isEn()
        ? `${dLabel} · ${parts.join(' → ')} (Click to enter deck · Click outer galaxy to inspect)`
        : `${dLabel} · ${parts.join(' → ')}（点击进部门舱 · 点击外围星系看特写）`)
    : (isEn()
        ? `${dLabel} · Click to enter deck · Click outer galaxy to inspect`
        : `${dLabel} · 点击进部门舱 · 点击外围星系看特写`);
}

function renderCellSeats(d, container) {
  container.replaceChildren();
  if (d.execution === 'human') {
    const bar = element('span', '', 'cell-pulse-bars');
    bar.append(element('i', '', 'pulse-bar is-human'), element('i', '', 'pulse-bar is-human'), element('i', '', 'pulse-bar is-human'));
    container.append(bar);
    return;
  }
  const run = countRunning(d) || 0;
  const q = queueStats(d);
  const activeCount = Math.min(5, run ? Math.max(2, Math.min(5, run)) : (q.waiting ? 2 : (d.activities.length ? 1 : 0)));
  const bar = element('span', '', 'cell-pulse-bars');
  for (let i = 0; i < 5; i++) {
    bar.append(element('i', '', 'pulse-bar' + (i < activeCount ? (run ? ' is-live' : ' is-warm') : '')));
  }
  container.append(bar);
}

function renderHive() {
  const list = departments();
  const container = $('#hive-cells');
  if (!list.length || !container) return;
  if (!state.cells.size) container.replaceChildren();
  list.forEach((d, i) => {
    if (!state.cells.has(d.id)) {
      const cell = createCell(d, i);
      state.cells.set(d.id, cell);
      container.append(cell.button);
      showStationLabel(cell, 4000);
    }
    const cell = state.cells.get(d.id);
    const missions = departmentMissions(d);
    cell.missions = missions;
    const mIdx = (cell.missionIdx || 0) % Math.max(1, missions.length);
    cell.title.textContent = langDeptLabel(d);
    const roleTagEl = cell.button.querySelector('.cell-role-tag');
    if (roleTagEl) roleTagEl.textContent = langDeptRole(d.id, deptRoles[d.id] || '');
    if (cell.mode) cell.mode.textContent = d.execution === 'human' ? 'HUMAN LOOP' : langExecLabel(d.execution);
    cell.status.textContent = missions[mIdx] || departmentState(d);
    renderCellSeats(d, cell.seats);
    cell.button.setAttribute('aria-pressed', String(d.id === state.selected));
    cell.button.setAttribute('aria-label', `${langDeptLabel(d)}. ${langDeptResp(d)}. ${missions[0] || departmentState(d)}`);
    const running = countRunning(d);
    const q = queueStats(d);
    cell.button.classList.toggle('is-running', Boolean(running));
    if (cell.landmark && cell.landmarkCap) {
      if (d.execution === 'human') {
        cell.landmark.classList.remove('is-visible', 'is-live', 'is-human');
      } else if (d.id === 'verification' && running) {
        cell.landmarkCap.textContent = isEn() ? `${running} CI` : `${running} 核验`;
        cell.landmark.classList.add('is-visible', 'is-live');
        cell.landmark.classList.remove('is-human');
      } else if (running) {
        cell.landmarkCap.textContent = `${running}`;
        cell.landmark.classList.add('is-visible', 'is-live');
        cell.landmark.classList.remove('is-human');
      } else if (q.waiting) {
        cell.landmarkCap.textContent = `${q.label}`;
        cell.landmark.classList.add('is-visible');
        cell.landmark.classList.remove('is-live', 'is-human');
      } else {
        cell.landmark.classList.remove('is-visible', 'is-live', 'is-human');
      }
    }
    cell.button.classList.toggle('has-arrival', state.arrivals.some(a => a.department === d.id));
    cell.button.classList.toggle('is-focused', Boolean(state.focused && d.id === state.focused));
    cell.button.classList.toggle('is-dimmed', Boolean(state.focused && d.id !== state.focused));
  });
  renderRoutes();
  updateHoverHint(state.hovered || state.selected);
}

function quadPoint(p, c, q, t) {
  const u = 1 - t;
  return [
    u * u * p[0] + 2 * u * t * c[0] + t * t * q[0],
    u * u * p[1] + 2 * u * t * c[1] + t * t * q[1]
  ];
}

function quadTangent(p, c, q, t) {
  const dx = 2 * (1 - t) * (c[0] - p[0]) + 2 * t * (q[0] - c[0]);
  const dy = 2 * (1 - t) * (c[1] - p[1]) + 2 * t * (q[1] - c[1]);
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

function curveBetween(from, to, bend = 0) {
  const p = positions[from];
  const q = positions[to];
  if (!p || !q) return null;
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const c = [mx + nx * bend, my + ny * bend];
  return {
    d: `M ${p[0].toFixed(1)} ${p[1].toFixed(1)} Q ${c[0].toFixed(1)} ${c[1].toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`,
    mid: quadPoint(p, c, q, 0.5),
    angle: quadTangent(p, c, q, 0.5)
  };
}

function customRouteCurve(from, to) {
  const p = positions[from];
  const q = positions[to];
  if (!p || !q) return null;
  if (from === 'outreach' && to === 'direction') {
    // Clean orthogonal architectural return bus along the left edge
    const d = 'M 155 632 L 72 632 Q 52 632 52 612 L 52 134 Q 52 114 72 114 L 500 114';
    return { d, mid: [52, 364], angle: -90 };
  }
  if (from === 'direction' && to === 'research') {
    const d = 'M 500 114 L 225 114 Q 205 114 205 134 L 205 364';
    return { d, mid: [205, 198], angle: 90 };
  }
  if (from === 'research' && to === 'verification') {
    // Clean rounded lower channel inside the 24/7 loop bay
    const d = 'M 205 364 L 205 446 Q 205 462 225 462 L 775 462 Q 795 462 795 446 L 795 364';
    return { d, mid: [500, 462], angle: 0, isLoop: true };
  }
  if (from === 'research' && to === 'review') {
    // Single crisp horizontal conduit (bidirectional chevrons added cleanly)
    return { d: 'M 205 364 L 500 364', mid: [352, 364], angle: 0, isLoop: true, bidirectional: true };
  }
  if (from === 'review' && to === 'research') {
    // Handled as single clean bidirectional conduit with research -> review
    return null;
  }
  if (from === 'verification' && to === 'books') {
    // Clean horizontal distribution bus at y = 492 between Tier 2 & Tier 3
    const d = 'M 795 364 L 795 478 Q 795 492 779 492 L 631 492 Q 615 492 615 508 L 615 632';
    return { d, mid: [615, 532], angle: 90 };
  }
  if (from === 'verification' && to === 'publication') {
    // Shares the exact clean horizontal distribution bus at y = 492 -> drops straight into publication!
    const d = 'M 795 364 L 795 478 Q 795 492 779 492 L 401 492 Q 385 492 385 508 L 385 632';
    return { d, mid: [385, 532], angle: 90 };
  }
  if (from === 'publication' && to === 'outreach') {
    return { d: 'M 385 632 L 155 632', mid: [270, 632], angle: 180 };
  }
  if (from === 'studio' && to === 'books') {
    return { d: 'M 845 632 L 615 632', mid: [730, 632], angle: 180 };
  }
  return curveBetween(from, to, 0);
}

function svgText(x, y, text, className) {
  const el = document.createElementNS(ns, 'text');
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  el.setAttribute('class', className);
  el.textContent = text;
  return el;
}

function renderRoutes() {
  const svg = $('#hive-routes');
  const badges = $('#hive-badges');
  if (!svg) return;
  svg.replaceChildren();
  badges?.replaceChildren();

  // 0. Holographic SVG glow filter + radial reactor auras
  const defs = document.createElementNS(ns, 'defs');
  const glow = document.createElementNS(ns, 'filter');
  glow.setAttribute('id', 'holo-glow');
  glow.setAttribute('x', '-40%');
  glow.setAttribute('y', '-40%');
  glow.setAttribute('width', '180%');
  glow.setAttribute('height', '180%');
  const blur = document.createElementNS(ns, 'feGaussianBlur');
  blur.setAttribute('stdDeviation', '3.5');
  blur.setAttribute('result', 'blur');
  const merge = document.createElementNS(ns, 'feMerge');
  const m1 = document.createElementNS(ns, 'feMergeNode');
  m1.setAttribute('in', 'blur');
  const m2 = document.createElementNS(ns, 'feMergeNode');
  m2.setAttribute('in', 'SourceGraphic');
  merge.append(m1, m2);
  glow.append(blur, merge);
  defs.append(glow);

  for (const d of departments()) {
    const grad = document.createElementNS(ns, 'radialGradient');
    grad.setAttribute('id', `halo-${d.id}`);
    const s1 = document.createElementNS(ns, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', deptColors[d.id] || 'var(--accent)');
    s1.setAttribute('stop-opacity', countRunning(d) ? '0.32' : '0.14');
    const s2 = document.createElementNS(ns, 'stop');
    s2.setAttribute('offset', '58%');
    s2.setAttribute('stop-color', deptColors[d.id] || 'var(--accent)');
    s2.setAttribute('stop-opacity', countRunning(d) ? '0.09' : '0.03');
    const s3 = document.createElementNS(ns, 'stop');
    s3.setAttribute('offset', '100%');
    s3.setAttribute('stop-color', deptColors[d.id] || 'var(--accent)');
    s3.setAttribute('stop-opacity', '0');
    grad.append(s1, s2, s3);
    defs.append(grad);
  }
  svg.append(defs);

  // 1. Subtle architectural honeycomb lattice + holographic radar rings behind Tier 2
  const ghostGroup = document.createElementNS(ns, 'g');
  for (const [gx, gy] of bgHexLattice) {
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', flatHexPoints(gx, gy, 84));
    poly.setAttribute('class', 'ghost-hex');
    ghostGroup.append(poly);
  }
  for (const [rad, cls] of [[150, 'radar-ring'], [245, 'radar-ring is-dashed'], [345, 'radar-ring is-outer']]) {
    const ring = document.createElementNS(ns, 'circle');
    ring.setAttribute('cx', '500');
    ring.setAttribute('cy', '364');
    ring.setAttribute('r', String(rad));
    ring.setAttribute('class', cls);
    ghostGroup.append(ring);
  }
  svg.append(ghostGroup);

  // Helper to draw sci-fi HUD corner reticles on architectural tiers
  const drawTierCorners = (parent, x, y, w, h, cls = 'arch-corner') => {
    const len = 14;
    const paths = [
      `M ${x} ${y + len} L ${x} ${y} L ${x + len} ${y}`,
      `M ${x + w - len} ${y} L ${x + w} ${y} L ${x + w} ${y + len}`,
      `M ${x} ${y + h - len} L ${x} ${y + h} L ${x + len} ${y + h}`,
      `M ${x + w - len} ${y + h} L ${x + w} ${y + h} L ${x + w} ${y + h - len}`
    ];
    for (const d of paths) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      parent.append(p);
    }
  };

  // 2. Three Architectural Company Tiers (Human in the Loop / 24-7 AI Engine Loop / Delivery & Platform)
  const archGroup = document.createElementNS(ns, 'g');

  // Tier 1: Human Steering Band (y: 12..194)
  const tier1 = document.createElementNS(ns, 'rect');
  tier1.setAttribute('x', '22');
  tier1.setAttribute('y', '12');
  tier1.setAttribute('width', '956');
  tier1.setAttribute('height', '182');
  tier1.setAttribute('rx', '12');
  tier1.setAttribute('class', 'arch-tier-box is-human');
  archGroup.append(
    tier1,
    svgText(42, 36, 'TIER 01 // HUMAN IN THE LOOP', 'arch-tier-tag is-human'),
    svgText(958, 36, L('问题策源 · 方向把关', 'Problem Framing · Direction'), 'arch-tier-sub')
  );
  archGroup.lastChild.setAttribute('text-anchor', 'end');
  drawTierCorners(archGroup, 22, 12, 956, 182, 'arch-corner is-human');

  // Tier 2: Highlighted 24/7 AI Autonomous Loop Bay (y: 210..484)
  const tier2 = document.createElementNS(ns, 'rect');
  tier2.setAttribute('x', '22');
  tier2.setAttribute('y', '210');
  tier2.setAttribute('width', '956');
  tier2.setAttribute('height', '274');
  tier2.setAttribute('rx', '14');
  tier2.setAttribute('class', 'arch-loop-bay');
  const loopDot = document.createElementNS(ns, 'circle');
  loopDot.setAttribute('cx', '44');
  loopDot.setAttribute('cy', '234');
  loopDot.setAttribute('r', '4.2');
  loopDot.setAttribute('class', 'arch-loop-dot');
  archGroup.append(
    tier2,
    loopDot,
    svgText(56, 238, 'TIER 02 // 24·7 AI AUTONOMOUS CORE', 'arch-loop-tag'),
    svgText(958, 238, L('AI 全天候自动攻关 ⇄ 独立复核 ▸ Lean CI 闭环', '24/7 Proof Search ⇄ Indep. Review ▸ Lean CI Loop'), 'arch-tier-sub')
  );
  archGroup.lastChild.setAttribute('text-anchor', 'end');
  drawTierCorners(archGroup, 22, 210, 956, 274, 'arch-corner is-loop');

  // Continuous 24/7 AI Loop Orbital Return Track well below header and above hexes!
  const loopOrbitD = 'M 795 284 C 710 250, 290 250, 205 284';
  const loopOrbit = document.createElementNS(ns, 'path');
  loopOrbit.setAttribute('d', loopOrbitD);
  loopOrbit.setAttribute('class', 'arch-loop-orbit');
  archGroup.append(loopOrbit);

  if (!state.quiet && !reduced && !isStale()) {
    for (const beginOffset of ['0s', '3s']) {
      const flowDot = document.createElementNS(ns, 'circle');
      flowDot.setAttribute('r', '3.8');
      flowDot.setAttribute('class', 'arch-flow-dot');
      flowDot.setAttribute('filter', 'url(#holo-glow)');
      const motion = document.createElementNS(ns, 'animateMotion');
      motion.setAttribute('dur', '6s');
      motion.setAttribute('begin', beginOffset);
      motion.setAttribute('path', loopOrbitD);
      motion.setAttribute('repeatCount', 'indefinite');
      flowDot.append(motion);
      archGroup.append(flowDot);
    }
  }

  // Tier 3: Knowledge Delivery & Platform Band (y: 500..726)
  const tier3 = document.createElementNS(ns, 'rect');
  tier3.setAttribute('x', '22');
  tier3.setAttribute('y', '500');
  tier3.setAttribute('width', '956');
  tier3.setAttribute('height', '226');
  tier3.setAttribute('rx', '12');
  tier3.setAttribute('class', 'arch-tier-box');
  archGroup.append(
    tier3,
    svgText(42, 526, 'TIER 03 // KNOWLEDGE DELIVERY & PLATFORM', 'arch-tier-tag'),
    svgText(958, 526, L('书稿出版 · 论文与知识地图 · 学术交流 · 工程底座', 'Monographs · Papers & Atlas · Scholar Outreach · Infra'), 'arch-tier-sub')
  );
  archGroup.lastChild.setAttribute('text-anchor', 'end');
  drawTierCorners(archGroup, 22, 500, 956, 226, 'arch-corner');

  svg.append(archGroup);

  // 3. Soft feathered territory halos under active departments
  const haloGroup = document.createElementNS(ns, 'g');
  for (const d of departments()) {
    const pos = positions[d.id];
    if (!pos) continue;
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', String(pos[0]));
    circle.setAttribute('cy', String(pos[1]));
    circle.setAttribute('r', countRunning(d) ? '126' : '106');
    circle.setAttribute('fill', `url(#halo-${d.id})`);
    circle.setAttribute('class', 'dept-halo' + (countRunning(d) ? ' is-active' : ''));
    haloGroup.append(circle);
  }
  svg.append(haloGroup);

  // 4. Configured responsibility relay routes with directional chevrons
  for (const route of view()?.routes || []) {
    const curve = customRouteCurve(route.from, route.to);
    if (!curve) continue;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', curve.d);
    path.setAttribute('class', 'responsibility-route' + (curve.isLoop ? ' is-loop' : ''));
    path.dataset.from = route.from;
    path.dataset.to = route.to;
    svg.append(path);

    if (badges) {
      if (curve.bidirectional) {
        const right = document.createElementNS(ns, 'path');
        right.setAttribute('d', 'M 2 -3.4 L 8.5 0 L 2 3.4');
        right.setAttribute('class', 'route-chevron');
        right.setAttribute('transform', `translate(${curve.mid[0].toFixed(1)} ${curve.mid[1].toFixed(1)})`);
        right.dataset.from = route.from;
        right.dataset.to = route.to;
        const left = document.createElementNS(ns, 'path');
        left.setAttribute('d', 'M -2 -3.4 L -8.5 0 L -2 3.4');
        left.setAttribute('class', 'route-chevron');
        left.setAttribute('transform', `translate(${curve.mid[0].toFixed(1)} ${curve.mid[1].toFixed(1)})`);
        left.dataset.from = route.from;
        left.dataset.to = route.to;
        badges.append(left, right);
      } else {
        const chevron = document.createElementNS(ns, 'path');
        chevron.setAttribute('d', 'M -4.2 -3.4 L 3.8 0 L -4.2 3.4');
        chevron.setAttribute('class', 'route-chevron');
        chevron.setAttribute('transform', `translate(${curve.mid[0].toFixed(1)} ${curve.mid[1].toFixed(1)}) rotate(${curve.angle.toFixed(1)})`);
        chevron.dataset.from = route.from;
        chevron.dataset.to = route.to;
        badges.append(chevron);
      }
    }
  }

  // 5. Observed public cross-department reference connections (with count pills & one-shot arrival particles)
  const grouped = new Map();
  for (const relation of view()?.handoffs || []) {
    if (relation.kind !== 'reference') continue;
    const identity = [relation.from, relation.to].sort().join('|');
    const existing = grouped.get(identity);
    if (!existing) {
      grouped.set(identity, { relation, count: 1, activities: new Set([relation.activity]) });
    } else {
      existing.count += 1;
      existing.activities.add(relation.activity);
    }
  }

  const badgeSlot = pair => {
    const slots = {
      'research|verification': [500, 462],
      'books|verification': [696, 492],
      'books|research': [316, 492],
      'books|studio': [730, 632],
      'studio|verification': [845, 492],
      'research|studio': [500, 492],
      'publication|research': [295, 492],
      'publication|verification': [500, 492]
    };
    return slots[pair] || null;
  };

  const orthogonalBusPath = (from, to) => {
    const p = positions[from];
    const q = positions[to];
    if (!p || !q) return null;
    const [x1, y1] = p;
    const [x2, y2] = q;
    // Same horizontal tier -> crisp direct or low-channel orthogonal bus
    if (Math.abs(y1 - y2) < 10) {
      if (Math.abs(x1 - x2) > 350 && y1 === 364) {
        return `M ${x1} ${y1} L ${x1} 446 Q ${x1} 462 ${x1 < x2 ? x1 + 16 : x1 - 16} 462 L ${x1 < x2 ? x2 - 16 : x2 + 16} 462 Q ${x2} 462 ${x2} 446 L ${x2} ${y2}`;
      }
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    // Cross-tier -> always route cleanly via the architectural horizontal bus (y = 202 or y = 492)
    const busY = (y1 < 250 || y2 < 250) ? 202 : 492;
    const dirY1 = busY > y1 ? 1 : -1;
    const dirY2 = y2 > busY ? 1 : -1;
    const dirX = x2 >= x1 ? 1 : -1;
    const r = Math.min(16, Math.abs(x2 - x1) / 2);
    if (Math.abs(x2 - x1) < 8) return `M ${x1} ${y1} L ${x2} ${y2}`;
    return `M ${x1} ${y1} L ${x1} ${busY - dirY1 * r} Q ${x1} ${busY} ${x1 + dirX * r} ${busY} L ${x2 - dirX * r} ${busY} Q ${x2} ${busY} ${x2} ${busY + dirY2 * r} L ${x2} ${y2}`;
  };

  for (const [identity, entry] of grouped) {
    const { relation, count, activities: relActs } = entry;
    // Route EVERY cross-department reference cleanly on the orthogonal architectural bus (zero diagonals!)
    const dPath = orthogonalBusPath(relation.from, relation.to);
    if (!dPath) continue;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', dPath);
    path.setAttribute('class', 'research-connection');
    path.dataset.from = relation.from;
    path.dataset.to = relation.to;
    svg.append(path);

    const slot = badgeSlot(identity);
    if (badges && slot && count >= 5) {
      const badge = document.createElementNS(ns, 'g');
      badge.dataset.from = relation.from;
      badge.dataset.to = relation.to;
      badge.setAttribute('class', 'route-badge');
      const rect = document.createElementNS(ns, 'rect');
      const label = String(count);
      const w = Math.max(28, label.length * 7 + 12);
      rect.setAttribute('x', (slot[0] - w / 2).toFixed(1));
      rect.setAttribute('y', (slot[1] - 9).toFixed(1));
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', '18');
      rect.setAttribute('rx', '9');
      rect.setAttribute('class', 'route-badge-bg');
      const txt = document.createElementNS(ns, 'text');
      txt.setAttribute('x', slot[0].toFixed(1));
      txt.setAttribute('y', slot[1].toFixed(1));
      txt.setAttribute('class', 'route-badge-text');
      txt.textContent = label;
      badge.append(rect, txt);
      badges.append(badge);
    }

    const arrival = state.arrivals.find(a => relActs.has(a.id));
    const animationKey = arrival && `${identity}/${eventKey(arrival)}`;
    if (!state.quiet && !reduced && arrival && !state.animated.has(animationKey)) {
      state.animated.add(animationKey);
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', '5');
      dot.setAttribute('class', 'arrival-particle');
      const motion = document.createElementNS(ns, 'animateMotion');
      motion.setAttribute('dur', '1.5s');
      motion.setAttribute('path', dPath);
      motion.setAttribute('repeatCount', '1');
      dot.append(motion);
      svg.append(dot);
    }
  }

  highlightRoutes(state.hovered || state.selected);
}

function highlightRoutes(id) {
  for (const path of document.querySelectorAll('#hive-routes path.responsibility-route, #hive-routes path.research-connection, #hive-badges .route-chevron')) {
    path.classList.toggle('selected', path.dataset.from === id || path.dataset.to === id);
  }
  for (const badge of document.querySelectorAll('#hive-badges .route-badge')) {
    const match = badge.dataset.from === id || badge.dataset.to === id;
    badge.classList.toggle('selected', match);
  }
}

function renderAgentRoster(d) {
  const container = $('#department-agents');
  if (!container) return;
  const roster = departmentRoster(d);
  $('#department-agent-count').textContent = roster.length ? (isEn() ? `${roster.length} public seats` : `${roster.length} 个公开席位`) : '';
  container.replaceChildren();
  if (!roster.length) {
    container.append(element('p', L('这个部门暂时没有可公开归属的工作席位。', 'No publicly attributed seats in this department yet.'), 'loading'));
    return;
  }
  for (const actor of roster) {
    const tasks = actorTasks(d, actor);
    const running = tasks.filter(active);
    const card = element('article', '', 'agent-card');
    card.dataset.focusKey = `agent:${d.id}:${actor.kind}:${actor.id}`;
    const head = element('div', '', 'agent-card-head');
    const identity = element('div', '', 'agent-identity');
    identity.append(
      person(actor),
      element('span', actor.kind === 'agent' ? L('明确标注的 agent', 'Attributed Agent') : L('公开账号', 'Public Account'), 'agent-kind')
    );
    head.append(
      identity,
      element('span', running.length ? (isEn() ? `${running.length} active` : `${running.length} 项正在执行`) : tasks.length ? L('最近参与', 'Recent') : L('已登记', 'Registered'), 'agent-state' + (running.length ? ' is-running' : ''))
    );
    card.append(head);

    const taskList = element('div', '', 'agent-task-list');
    const latest = tasks[0];
    if (latest) {
      const row = latest.task ? element('button', '', 'agent-task') : external('', latest.url, 'agent-task');
      if (latest.task) row.type = 'button';
      row.dataset.focusKey = `agent-task:${latest.id}`;
      row.append(
        element('span', phase(latest), 'agent-task-state' + (active(latest) ? ' is-running' : '')),
        element('strong', actorTaskTitle(latest, d))
      );
      if (latest.task) row.addEventListener('click', () => selectTopic(latest));
      taskList.append(row);
    } else {
      taskList.append(element('p', L('待命 · 等待新信号', 'Standby · Awaiting signal'), 'agent-empty'));
    }
    card.append(taskList);
    container.append(card);
  }
}

function primaryWork(d) {
  const items = [...d.activities];
  if (d.execution === 'human') return [];
  const dedup = list => {
    const out = [];
    const seen = new Set();
    for (const a of list) {
      const t = cleanWorkTitle(a, d);
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(a);
    }
    return out;
  };
  if (d.id === 'research' || d.id === 'books') {
    const work = dedup(
      items
        .filter(a => (a.kind === 'session' && active(a)) || (['task', 'contribution'].includes(a.kind) && !technical.test(a.label)))
        .sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at))
    ).slice(0, 6);
    // Keep at most 1 active book build check after concrete chapters (preserves contract while elevating book content!)
    const building = d.id === 'books' && items.find(a => a.kind === 'automation' && active(a));
    if (building && !work.some(w => cleanWorkTitle(w, d) === cleanWorkTitle(building, d))) {
      return [...work.slice(0, 5), building];
    }
    return work;
  }
  if (d.id === 'verification') {
    // Elevate concrete linked theorems & formalization requests; suppress repetitive bare "检验研究提交" runs!
    const sorted = items.sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));
    const substantive = dedup(
      sorted.filter(a => (a.kind === 'task' && !technical.test(a.label)) || (a.kind === 'automation' && findLinkedTaskActivity(a.task)))
    ).slice(0, 6);
    if (substantive.length) return substantive;
    return dedup(sorted).slice(0, 3);
  }
  if (d.id === 'publication' || d.id === 'studio') {
    const sorted = items.sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));
    const substantive = dedup(sorted.filter(a => ['contribution', 'task'].includes(a.kind))).slice(0, 6);
    if (substantive.length) return substantive;
    return dedup(sorted).slice(0, 3);
  }
  return dedup(items.sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at))).slice(0, 4);
}

function renderDepartment() {
  const d = department(state.selected) || departments().find(x => x.id === 'research') || departments()[0];
  if (!d) return;
  state.selected = d.id;
  $('#department-mode').textContent = langExecLabel(d.execution);
  $('#department-mode').dataset.execution = d.execution;
  $('#department-title').textContent = langDeptLabel(d);
  $('#department-responsibility').textContent = langDeptResp(d);
  $('#department-state').textContent = isStale()
    ? L('稍早的研究现场', 'Earlier Snapshot')
    : d.running_automations ? (isEn() ? `${d.running_automations} CI running` : `${d.running_automations} 项自动引擎运行中`)
    : d.running_sessions ? (isEn() ? `${d.running_sessions} sessions` : `${d.running_sessions} 个研究会话推进中`)
    : '24/7';

  const people = d.participants || [];
  $('#department-people').replaceChildren(
    element('span', people.length ? (isEn() ? `${people.length} public seats` : `${people.length} 个公开参与席位`) : L('人类指引与把关', 'Human Direction'), 'people-label'),
    element('span', d.activities.length ? (isEn() ? `${d.observed_activities || d.activities.length} recent events` : `${d.observed_activities || d.activities.length} 条近期记录`) : L('等待公开动态', 'Awaiting public updates'), 'people-summary')
  );

  renderAgentRoster(d);

  const work = primaryWork(d);
  const container = $('#department-work');
  container.replaceChildren();
  $('#department-work-count').textContent = countRunning(d) ? (isEn() ? `${countRunning(d)} active` : `${countRunning(d)} 项执行中`) : '';
  $('#department-work-title').textContent = d.execution === 'human' ? L('研究如何继续', 'How Research Continues') : L('这里正在发生', 'Happening Now');

  if (d.execution === 'human') {
    container.append(element(
      'p',
      L(
        '人提出值得研究的问题，判断哪些方向值得继续；AI 会话与 Lean CI 在下方闭环中 24/7 持续推进。',
        'Humans pose open mathematical questions and steer direction; autonomous AI sessions and Lean CI carry proofs forward 24/7 below.'
      ),
      'loading'
    ));
    const button = element('button', L('放大进入数学攻坚部门图 →', 'Zoom into Math Research Deck →'), 'text-button');
    button.type = 'button';
    button.addEventListener('click', () => selectDepartment('research', true, true));
    container.append(button);
  }

  for (const a of work) {
    const task = a.task;
    const card = task ? element('button', '', 'work-item') : external('', a.url, 'work-item');
    if (task) card.type = 'button';
    card.dataset.focusKey = `work:${a.id}`;
    if (task) card.dataset.source = safeURL(a.url);
    card.classList.toggle('is-active', active(a));
    const meta = element('div', '', 'work-meta');
    const timeEl = element('time', relative(a.at));
    timeEl.dateTime = a.at;
    meta.append(element('span', phase(a), 'work-state'), timeEl);
    const title = cleanWorkTitle(a, d);
    card.append(meta, element('strong', title));
    const bottom = element('div', '', 'work-bottom');
    const linked = a.kind === 'automation' ? findLinkedTaskActivity(a.task) : null;
    const areaTag = linked
      ? `${copyFor(linked).area} · ${L('形式核验', 'Formal Verification')}`
      : a.kind === 'automation'
        ? (d.id === 'books' ? L('书稿构建', 'Monograph Build') : d.id === 'outreach' ? L('学术协作', 'Scholar Collab') : d.id === 'publication' ? L('知识发布', 'Knowledge Publish') : L('形式核验', 'Formal Verification'))
        : d.id === 'publication'
          ? L('Mathesis / 知识', 'Mathesis / Papers')
          : d.id === 'studio'
            ? L('工具与表达', 'Tools & Studio')
            : copyFor(a).area;
    bottom.append(
      element('span', areaTag),
      element('span', task ? L('追踪接力 ↗', 'Trace Relay ↗') : L('查看 ↗', 'View ↗'), 'work-arrow')
    );
    card.append(bottom);
    if (task) card.addEventListener('click', () => selectTopic(a));
    container.append(card);
  }

  if (!work.length && d.execution !== 'human') {
    container.append(element(
      'p',
      d.id === 'review'
        ? L('新的复核意见会在这里汇入。也可以沿着课题，继续阅读公开讨论。', 'New review notes flow in here. You can also trace open discussions via active threads.')
        : L('新的进展会在这里汇入。先沿着已有的研究线索继续探索。', 'Fresh updates flow in here. Explore existing research threads below.'),
      'loading'
    ));
  }

  const related = new Set(
    (view()?.routes || [])
      .filter(r => r.from === d.id || r.to === d.id)
      .map(r => r.from === d.id ? r.to : r.from)
  );
  const links = $('#department-connections');
  links.replaceChildren();
  if (related.size) {
    links.append(element('span', tr('panel_relay_links', '接力的上下游部门'), 'people-label'));
    for (const id of related) {
      const target = department(id);
      if (!target) continue;
      const button = element('button', `${langDeptLabel(target)} ↗`, 'connection-chip');
      button.type = 'button';
      button.dataset.focusKey = `connection:${id}`;
      button.addEventListener('click', () => selectDepartment(id, true, false));
      links.append(button);
    }
  }
}

// ============================================================================
// ZOOMED-IN VISUAL DEPARTMENT MAP (放大之后的部门图)
// ============================================================================
function seatSlotsFor(count) {
  const layouts = {
    1: [[320, 290]],
    2: [[318, 198], [318, 386]],
    3: [[318, 144], [288, 294], [318, 446]],
    4: [[322, 120], [282, 236], [282, 352], [322, 470]],
    5: [[325, 118], [278, 234], [278, 354], [325, 472], [590, 108]],
    6: [[320, 114], [276, 234], [276, 354], [320, 474], [590, 106], [590, 488]]
  };
  return layouts[Math.min(6, Math.max(1, count))] || layouts[6];
}

function verticalSlots(count, x, top = 126, bottom = 454) {
  if (count <= 0) return [];
  if (count === 1) return [[x, 290]];
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, i) => [x, Math.round(top + i * step)]);
}

function departmentTopicNodes(d) {
  // Pick up to 4 clean visual research/work nodes flowing out of this department
  if (d.execution === 'human') {
    return questionTopics().slice(0, 3).map(t => ({
      id: t.id,
      title: t.copy.title,
      tag: t.copy.area,
      status: phase(t.activity),
      running: active(t.activity),
      activity: t.activity,
      actors: t.activity.actor ? [t.activity.actor.id] : []
    }));
  }
  const map = new Map();
  const sorted = [...d.activities].sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));
  for (const a of sorted) {
    if (['research', 'books'].includes(d.id) && technical.test(a.label)) continue;
    const title = actorTaskTitle(a, d);
    const topicKey = a.task ? key(a.task) : `${a.source}:${title}`;
    const existing = map.get(topicKey);
    if (!existing) {
      map.set(topicKey, {
        id: topicKey,
        title,
        tag: a.kind === 'automation' ? sourceLabel(a) : copyFor(a).area,
        status: phase(a),
        running: active(a),
        activity: a,
        actors: a.actor ? [a.actor.id] : []
      });
    } else {
      if (active(a)) existing.running = true;
      if (a.actor && !existing.actors.includes(a.actor.id)) existing.actors.push(a.actor.id);
    }
    if (map.size >= 4) break;
  }
  return [...map.values()];
}

function updateLensSpotlight(d, actor, idx = 1) {
  const spot = $('#lens-spotlight');
  if (!spot) return;
  spot.replaceChildren();
  if (!actor) {
    spot.append(element('span', L(
      '悬浮通道高亮研究光束 · 点击右侧线索追踪全院接力 · 点击左右门户直达上下游',
      'Hover a channel to highlight energy beams · Click a thread to trace relays · Click portals to jump decks'
    )));
    return;
  }
  const tasks = actorTasks(d, actor);
  spot.append(element('strong', isEn() ? `Channel ${String(idx).padStart(2, '0')}: ` : `通道 ${String(idx).padStart(2, '0')}：`));
  if (!tasks.length) {
    spot.append(element('span', L('当前待命中，等待新的研究任务。', 'Standing by for the next research task.')));
    return;
  }
  for (const a of tasks.slice(0, 3)) {
    const chip = a.task ? element('button', `${phase(a)} · ${actorTaskTitle(a, d)}`, 'spotlight-chip') : external(`${phase(a)} · ${actorTaskTitle(a, d)} ↗`, a.url, 'spotlight-chip');
    if (a.task) {
      chip.type = 'button';
      chip.addEventListener('click', () => selectTopic(a));
    }
    spot.append(chip);
  }
}

function highlightZoomSeat(seatId) {
  const svg = $('#lens-map-svg');
  if (!svg) return;
  for (const beam of svg.querySelectorAll('.zoom-beam')) {
    if (!seatId) {
      beam.classList.remove('is-highlighted', 'is-dimmed');
      continue;
    }
    const actors = (beam.dataset.actors || '').split('|').filter(Boolean);
    const match = beam.dataset.seat === seatId || actors.includes(seatId);
    beam.classList.toggle('is-highlighted', match);
    beam.classList.toggle('is-dimmed', !match && beam.dataset.role !== 'portal');
  }
  for (const card of document.querySelectorAll('#lens-agents .lens-agent')) {
    card.classList.toggle('is-selected', card.dataset.seatId === seatId);
  }
}

function renderDepartmentLens(d) {
  const lens = $('#department-lens');
  const room = $('#research-room');
  if (!lens || !room) return;
  if (!d || state.mode !== 'organization' || !state.focused) {
    lens.hidden = true;
    room.classList.remove('is-department-focused');
    return;
  }
  const switchedDept = lens.hidden || lens.dataset.department !== d.id;
  lens.hidden = false;
  lens.dataset.department = d.id;
  room.classList.add('is-department-focused');
  if (switchedDept) lens.scrollTop = 0;

  // 1. Top 8-department quick switcher
  const switcher = $('#lens-switcher');
  if (switcher) {
    switcher.replaceChildren();
    let activePill = null;
    for (const dept of departments()) {
      const pill = element('button', '', 'lens-switch-pill' + (countRunning(dept) ? ' has-running' : ''));
      pill.type = 'button';
      pill.setAttribute('role', 'tab');
      const isSelected = dept.id === d.id;
      pill.setAttribute('aria-selected', String(isSelected));
      pill.append(element('i', '', 'lens-switch-dot'), document.createTextNode(langDeptLabel(dept)));
      pill.addEventListener('click', () => selectDepartment(dept.id, true, true));
      switcher.append(pill);
      if (isSelected) activePill = pill;
    }
    if (switchedDept && activePill && typeof activePill.scrollIntoView === 'function') {
      try { activePill.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch {}
    }
  }

  // 2. Compact header strip + inline KPIs
  $('#lens-title').textContent = langDeptLabel(d);
  $('#lens-responsibility').textContent = langDeptResp(d);
  const execPill = $('#lens-exec-pill');
  if (execPill) {
    execPill.textContent = langExecLabel(d.execution);
    execPill.dataset.execution = d.execution;
  }
  $('#lens-freshness').textContent = view()?.observed_at
    ? (isEn() ? `Updated ${relative(view().observed_at)}` : `${relative(view().observed_at)}更新`)
    : '';

  const method = (isEn() ? methodByDepartmentEn[d.id] : methodByDepartment[d.id]) || [langDeptLabel(d), L('公开工作', 'Open research'), L('交给下一个部门', 'Hand off downstream')];
  $('#lens-input').textContent = method[1];
  $('#lens-output').textContent = method[2];

  const stats = queueStats(d);
  const metric = (value, label, className = '') => {
    const item = element('div', '', 'lens-metric' + (className ? ' ' + className : ''));
    item.append(element('strong', String(value)), element('span', label));
    return item;
  };
  $('#lens-metrics').replaceChildren(
    metric(isStale() ? '—' : stats.running, L('正在执行', 'Running'), !isStale() && stats.running ? 'is-running' : ''),
    metric(stats.label, L('可见待接力', 'Queued'), stats.waiting ? 'is-queued' : ''),
    metric(d.observed_activities || stats.recent, L('近期推进', 'Recent'))
  );

  // 3. Central Department Medallion Hub (#lens-hub)
  const hubEl = $('#lens-hub');
  const meta = hubMeta[d.id] || { tag: 'DEPARTMENT', title: langDeptLabel(d), titleEn: langDeptLabel(d) };
  const runCount = countRunning(d);
  if (hubEl) {
    hubEl.classList.toggle('is-running', Boolean(runCount));
    hubEl.replaceChildren(
      element('span', meta.tag, 'map-hub-code'),
      element('strong', isEn() ? (meta.titleEn || langDeptLabel(d)) : meta.title, 'map-hub-title'),
      element(
        'span',
        runCount ? (isEn() ? `${runCount} active` : `${runCount} 项运行中`)
          : d.execution === 'human' ? L('方向起点', 'Origin')
          : stats.waiting ? (isEn() ? `${stats.label} queued` : `${stats.label} 待接力`)
          : L('24/7 待命', '24/7 Ready'),
        'map-hub-stat'
      )
    );
  }

  // 4. Prepare spatial nodes: Upstream Portals, Seat Workstations, Topic Orbs, Downstream Portals
  const routes = view()?.routes || [];
  const handoffs = view()?.handoffs || [];
  const upIds = [...new Set(routes.filter(r => r.to === d.id).map(r => r.from))];
  let downIds = [...new Set(routes.filter(r => r.from === d.id).map(r => r.to))];
  if (!downIds.length) {
    // Fall back to observed outgoing cross-department reference targets (e.g., books -> research/publication)
    const observedOut = [...new Set(handoffs.filter(h => h.from === d.id && h.to !== d.id).map(h => h.to))];
    downIds = observedOut.length ? observedOut.slice(0, 2) : (d.id === 'books' ? ['publication'] : []);
  }
  const roster = departmentRoster(d);
  const primarySeats = roster.slice(0, 6);
  const extraSeats = roster.slice(6);
  const topics = departmentTopicNodes(d);

  const hubXY = [590, 290];
  const upSlots = verticalSlots(upIds.length, 76, 175, 405);
  const downSlots = verticalSlots(downIds.length, 1122, 175, 405);
  const seatSlots = seatSlotsFor(primarySeats.length);
  const topicSlots = verticalSlots(topics.length, 872, 128, 452);

  // 5. Render SVG Floorplan Blueprint & Live Connection Beams (#lens-map-svg)
  const svg = $('#lens-map-svg');
  if (svg) {
    svg.replaceChildren();
    // Magnified hexagonal holographic chamber + tactical radar rings
    const outerHex = document.createElementNS(ns, 'polygon');
    outerHex.setAttribute('points', flatHexPoints(590, 290, 292));
    outerHex.setAttribute('class', 'zoom-hex-wall-outer');
    const wallHex = document.createElementNS(ns, 'polygon');
    wallHex.setAttribute('points', flatHexPoints(590, 290, 266));
    wallHex.setAttribute('class', 'zoom-hex-wall');
    svg.append(outerHex, wallHex);

    for (const [rad, cls] of [[104, 'zoom-radar-ring is-inner'], [182, 'zoom-radar-ring is-outer']]) {
      const ring = document.createElementNS(ns, 'circle');
      ring.setAttribute('cx', '590');
      ring.setAttribute('cy', '290');
      ring.setAttribute('r', String(rad));
      ring.setAttribute('class', cls);
      svg.append(ring);
    }
    const axisH = document.createElementNS(ns, 'line');
    axisH.setAttribute('x1', '334');
    axisH.setAttribute('y1', '290');
    axisH.setAttribute('x2', '846');
    axisH.setAttribute('y2', '290');
    axisH.setAttribute('class', 'zoom-axis');
    const axisV = document.createElementNS(ns, 'line');
    axisV.setAttribute('x1', '590');
    axisV.setAttribute('y1', '38');
    axisV.setAttribute('x2', '590');
    axisV.setAttribute('y2', '542');
    axisV.setAttribute('class', 'zoom-axis');
    svg.append(axisH, axisV);

    // Subtle spatial column headers
    svg.append(
      svgText(76, 24, L('IN // 上游输入', 'IN // UPSTREAM'), 'zoom-zone-label'),
      svgText(310, 24, L('STREAMS // 并行通道', 'STREAMS // CHANNELS'), 'zoom-zone-label'),
      svgText(590, 24, L('CORE // 部门枢纽', 'CORE // DECK HUB'), 'zoom-zone-label'),
      svgText(872, 24, L('ACTIVE // 流转线索', 'ACTIVE // THREADS'), 'zoom-zone-label'),
      svgText(1122, 24, L('OUT // 下游交棒', 'OUT // DOWNSTREAM'), 'zoom-zone-label')
    );

    const drawBeam = (x1, y1, x2, y2, cls, extra = {}) => {
      const mx = (x1 + x2) / 2;
      const dPath = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', dPath);
      path.setAttribute('class', `zoom-beam ${cls}`);
      if (extra.seat) path.dataset.seat = extra.seat;
      if (extra.actors) path.dataset.actors = extra.actors;
      if (extra.role) path.dataset.role = extra.role;
      svg.append(path);
      if (extra.pulse && !state.quiet && !reduced && !isStale()) {
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('r', '3.5');
        dot.setAttribute('class', 'zoom-pulse-dot');
        const motion = document.createElementNS(ns, 'animateMotion');
        motion.setAttribute('dur', extra.dur || '3.2s');
        motion.setAttribute('path', dPath);
        motion.setAttribute('repeatCount', 'indefinite');
        dot.append(motion);
        svg.append(dot);
      }
    };

    // Upstream Portals -> Hub
    upSlots.forEach(([px, py]) => {
      drawBeam(px + 54, py, hubXY[0] - 65, hubXY[1], 'is-portal', { role: 'portal' });
    });

    // Seat Workstations -> Hub
    primarySeats.forEach((actor, idx) => {
      const [sx, sy] = seatSlots[idx];
      const running = !isStale() && actorTasks(d, actor).some(active);
      const startX = sx < hubXY[0] - 80 ? sx + 96 : sx;
      const startY = sx < hubXY[0] - 80 ? sy : (sy < hubXY[1] ? sy + 40 : sy - 40);
      const endX = sx < hubXY[0] - 80 ? hubXY[0] - 64 : hubXY[0];
      const endY = sx < hubXY[0] - 80 ? hubXY[1] : (sy < hubXY[1] ? hubXY[1] - 64 : hubXY[1] + 64);
      drawBeam(startX, startY, endX, endY, running ? 'is-live' : '', {
        seat: actor.id,
        pulse: running,
        dur: '2.6s'
      });
    });

    // Hub -> Topic Orbs -> Downstream Portals
    topicSlots.forEach(([tx, ty], idx) => {
      const topic = topics[idx];
      drawBeam(hubXY[0] + 64, hubXY[1], tx - 104, ty, topic.running ? 'is-live' : 'is-topic', {
        actors: topic.actors.join('|'),
        pulse: topic.running,
        dur: '3.1s'
      });
      downSlots.forEach(([dx, dy]) => {
        drawBeam(tx + 104, ty, dx - 54, dy, 'is-portal', {
          actors: topic.actors.join('|'),
          role: 'portal'
        });
      });
    });

    if (!topics.length) {
      downSlots.forEach(([dx, dy]) => {
        drawBeam(hubXY[0] + 64, hubXY[1], dx - 54, dy, 'is-portal', { role: 'portal' });
      });
    }
  }

  // 6. Render Left & Right Portal Nodes (#lens-upstream & #lens-downstream)
  const renderPortals = (container, ids, slots, dir) => {
    if (!container) return;
    container.replaceChildren();
    ids.forEach((targetId, idx) => {
      const target = department(targetId);
      if (!target) return;
      const [px, py] = slots[idx];
      const count = handoffs.filter(h =>
        dir === 'in'
          ? (h.from === targetId && h.to === d.id)
          : (h.from === d.id && h.to === targetId)
      ).length;
      const btn = element('button', '', 'map-portal-node');
      btn.type = 'button';
      btn.style.setProperty('--px', `${(px / 12).toFixed(2)}%`);
      btn.style.setProperty('--py', `${(py / 5.8).toFixed(2)}%`);
      btn.append(
        element('span', dir === 'in' ? L('← 上游', '← Upstream') : L('下游 →', 'Downstream →'), 'map-portal-dir'),
        element('strong', langDeptLabel(target)),
        element('span', count ? (isEn() ? `${count} relays` : `${count} 接力`) : L('点击直达', 'Jump to deck'), 'map-portal-count')
      );
      btn.addEventListener('click', () => selectDepartment(targetId, true, true));
      container.append(btn);
    });
  };
  renderPortals($('#lens-upstream'), upIds, upSlots, 'in');
  renderPortals($('#lens-downstream'), downIds, downSlots, 'out');

  // 7. Render Spatial Workstream Nodes (#lens-agents — task-centric, no account clutter)
  const buildSeatCard = (actor, pos, idx) => {
    const tasks = actorTasks(d, actor);
    const running = !isStale() ? tasks.filter(active) : [];
    const card = element('article', '', 'lens-agent' + (running.length ? ' is-busy' : ''));
    card.dataset.focusKey = `lens-agent:${d.id}:${actor.kind}:${actor.id}`;
    card.dataset.seatId = actor.id;
    if (pos) {
      card.style.setProperty('--sx', `${(pos[0] / 12).toFixed(2)}%`);
      card.style.setProperty('--sy', `${(pos[1] / 5.8).toFixed(2)}%`);
    }

    const head = element('div', '', 'lens-agent-head');
    const code = String(idx + 1).padStart(2, '0');
    const chLabel = element('span', isEn() ? `Channel ${code}` : `通道 ${code}`, 'lens-channel-label');
    const stEl = element('span', '', 'lens-agent-status' + (running.length ? ' is-running' : ''));
    stEl.append(
      element('i'),
      document.createTextNode(
        running.length ? (isEn() ? `${running.length} running` : `${running.length} 项执行中`)
          : tasks.length ? (isEn() ? `Active ${relative(tasks[0].at)}` : `${relative(tasks[0].at)}活跃`)
          : L('待命中', 'Standby')
      )
    );
    const hiddenId = element('span', actorLabel(actor), 'visually-hidden');
    head.append(chLabel, stEl, hiddenId);
    card.append(head);

    const lane = element('div', '', 'lens-task-lane');
    if (tasks.length) {
      const ranked = [...tasks].sort((a, b) =>
        Number(active(b)) - Number(active(a))
        || Number(technical.test(a.label)) - Number(technical.test(b.label))
        || timestamp(b.at) - timestamp(a.at)
      );
      const dedup = [];
      const seenTitles = new Set();
      for (const a of ranked) {
        const title = actorTaskTitle(a, d);
        if (seenTitles.has(title)) continue;
        seenTitles.add(title);
        dedup.push({ a, title });
        if (dedup.length >= 2) break;
      }
      for (const { a, title } of dedup) {
        const row = a.task ? element('button', '', 'lens-task') : external('', a.url, 'lens-task');
        if (a.task) row.type = 'button';
        row.dataset.focusKey = `lens-task:${a.id}`;
        row.append(
          element('i', '', 'lens-task-dot' + (active(a) ? ' is-running' : '')),
          element('strong', title)
        );
        if (a.task) row.addEventListener('click', e => { e.stopPropagation(); selectTopic(a); });
        lane.append(row);
      }
    } else {
      lane.append(element('p', L('通道就绪 · 等待新任务', 'Channel ready · awaiting tasks'), 'lens-empty-seat'));
    }
    card.append(lane);

    card.addEventListener('pointerenter', () => {
      highlightZoomSeat(actor.id);
      updateLensSpotlight(d, actor, idx + 1);
    });
    card.addEventListener('pointerleave', () => {
      highlightZoomSeat(state.hoveredSeat);
    });
    card.addEventListener('click', () => {
      state.hoveredSeat = state.hoveredSeat === actor.id ? null : actor.id;
      highlightZoomSeat(state.hoveredSeat);
      updateLensSpotlight(d, state.hoveredSeat ? actor : null, idx + 1);
    });
    return card;
  };

  const seatContainer = $('#lens-agents');
  const extraContainer = $('#lens-extra-seats');
  seatContainer.replaceChildren();
  if (extraContainer) {
    extraContainer.replaceChildren();
    extraContainer.hidden = extraSeats.length === 0;
  }

  if (!primarySeats.length) {
    seatContainer.append(element(
      'div',
      d.execution === 'human'
        ? L('人类研究指引区：提出新的数学问题与战略方向，驱动下方 AI 部门 24/7 自治接力。', 'Human Direction Deck: frames open problems and constraints guiding the 24/7 autonomous AI loop below.')
        : L('当前采样窗口内暂无活跃推进，新的研究任务出现后会实时点亮这里。', 'No active sessions in the current window; new tasks light up this deck live as they arrive.'),
      'lens-empty-map'
    ));
  } else {
    primarySeats.forEach((actor, idx) => {
      seatContainer.append(buildSeatCard(actor, seatSlots[idx], idx));
    });
    if (extraContainer && extraSeats.length) {
      extraSeats.forEach((actor, i) => extraContainer.append(buildSeatCard(actor, null, primarySeats.length + i)));
    }
  }

  // 8. Render Right Floating Research / Work Orbs (#lens-topics)
  const topicLayer = $('#lens-topics');
  if (topicLayer) {
    topicLayer.replaceChildren();
    topics.forEach((t, idx) => {
      const [tx, ty] = topicSlots[idx];
      const hasTask = Boolean(t.activity?.task);
      const node = hasTask ? element('button', '', 'map-topic-node') : external('', t.activity?.url || '#', 'map-topic-node');
      if (hasTask) node.type = 'button';
      node.style.setProperty('--tx', `${(tx / 12).toFixed(2)}%`);
      node.style.setProperty('--ty', `${(ty / 5.8).toFixed(2)}%`);
      const top = element('div', '', 'map-topic-top');
      top.append(element('span', t.tag), element('span', t.status));
      const foot = element('div', '', 'map-topic-foot');
      foot.append(
        element('span', t.running ? L('正在运转', 'Running') : L('持续流转', 'Flowing')),
        element('span', hasTask ? L('跟随接力 →', 'Trace Relay →') : L('查看动态 ↗', 'View Event ↗'))
      );
      node.append(top, element('strong', t.title), foot);
      if (hasTask) node.addEventListener('click', () => selectTopic(t.activity));
      topicLayer.append(node);
    });
  }

  state.hoveredSeat = null;
  updateLensSpotlight(d, null);
}

function preserveFocus(render) {
  const selected = document.activeElement?.dataset.focusKey;
  render();
  if (selected) {
    const target = [...document.querySelectorAll('[data-focus-key]')].find(el => el.dataset.focusKey === selected);
    target?.focus({ preventScroll: true });
  }
}

function selectDepartment(id, manual = true, openLens = true) {
  if (!department(id)) return;
  state.selected = id;
  if (manual) {
    state.follow = false;
    if (typeof sciFiAudio !== 'undefined') sciFiAudio.playDept(id);
  }
  if (manual && openLens && state.mode === 'organization') {
    const changed = state.focused !== id;
    state.focused = id;
    if (changed && typeof triggerScanSweep === 'function') triggerScanSweep();
  } else if (!openLens) {
    state.focused = null;
  }
  updateControls();
  renderMetrics();
  renderHive();
  preserveFocus(renderDepartment);
  renderDepartmentLens(department(state.focused));
}

function closeDepartmentLens() {
  state.focused = null;
  state.hoveredSeat = null;
  $('#research-room')?.classList.remove('is-department-focused');
  if ($('#department-lens')) $('#department-lens').hidden = true;
  renderMetrics();
  renderHive();
  renderDepartment();
}

function questionTopics() {
  const topics = new Map();
  const rows = activities()
    .filter(a => ['research', 'books'].includes(a.department) && ['task', 'contribution'].includes(a.kind) && a.task && !technical.test(a.label))
    .sort((a, b) => timestamp(b.at) - timestamp(a.at));
  for (const a of rows) {
    const copy = copyFor(a);
    const id = copy.canonical || key(a.task);
    if (!topics.has(id)) topics.set(id, { id, copy, activity: a, book: a.department === 'books' });
  }
  return [...topics.values()];
}

function relatedTo(topic) {
  const keys = new Set([key(topic.task), copyFor(topic).canonical, ...(topic.references || []).map(key)].filter(Boolean));
  const rows = activities();
  for (let i = 0; i < 2; i++) {
    const next = new Set(keys);
    for (const a of rows) {
      const references = [key(a.task), ...(a.references || []).map(key)].filter(Boolean);
      if (references.some(ref => keys.has(ref))) {
        for (const ref of references) if (next.size < 60) next.add(ref);
      }
    }
    if (next.size === keys.size) break;
    for (const ref of next) keys.add(ref);
  }
  return rows
    .filter(a => keys.has(key(a.task)) || (a.references || []).some(ref => keys.has(key(ref))))
    .sort((a, b) => timestamp(b.at) - timestamp(a.at));
}

function selectTopic(a) {
  const work = activities().find(item => ['task', 'contribution'].includes(item.kind) && key(item.task) === key(a.task));
  a = work || a;
  state.topic = { task: a.task, reference: key(a.task), activity: a };
  state.follow = false;
  setMode('journey');
  if (matchMedia('(max-width: 640px)').matches) {
    $('#institute').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
  }
}

function renderJourney() {
  let topic = state.topic?.activity;
  if (topic) topic = activities().find(a => a.id === topic.id) || topic;
  if (!topic) {
    topic = questionTopics()[0]?.activity;
    if (topic) state.topic = { task: topic.task, reference: key(topic.task), activity: topic };
  }
  const stages = $('#journey-stages');
  const events = $('#journey-events');
  const people = $('#journey-people');
  const links = $('#journey-links');
  stages.replaceChildren();
  events.replaceChildren();
  people.replaceChildren();
  links.replaceChildren();
  if (!topic) return;

  const copy = copyFor(topic);
  const related = relatedTo(topic);
  $('#journey-title').textContent = copy.title;
  $('#journey-description').textContent = copy.question;

  const order = ['research', 'review', 'verification', 'books', 'publication', 'outreach'];
  const touched = order
    .map(id => ({ d: department(id), items: related.filter(a => a.department === id) }))
    .filter(x => x.d && x.items.length);

  touched.forEach(({ d, items }, i) => {
    const button = element('button', '', 'journey-stage');
    button.type = 'button';
    button.classList.toggle('is-active', items.some(active));
    button.dataset.focusKey = `stage:${d.id}`;
    const running = items.filter(active).length;
    button.append(
      element('span', String(i + 1).padStart(2, '0')),
      element('strong', langDeptLabel(d)),
      element('p', running ? (isEn() ? `${running} related runs active` : `${running} 项相关工作正在执行`) : phase(items[0]))
    );
    button.addEventListener('click', () => {
      setMode('organization');
      selectDepartment(d.id, true, false);
    });
    stages.append(button);
  });

  const messages = (state.stream?.messages || []).filter(m =>
    related.some(a => a.task?.repository === m.repository && a.task?.number === m.number)
  );
  const contributors = peopleFor(related);
  for (const message of messages) {
    if (!contributors.some(actor => actor.id === message.actor)) {
      contributors.push({ id: message.actor, label: message.actor, kind: 'account' });
    }
  }
  people.append(...contributors.slice(0, 8).map(person));

  const newest = messages.sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at));
  const chosen = [];
  for (const message of newest) if (chosen.length < 3 && !chosen.some(item => item.actor === message.actor)) chosen.push(message);
  for (const message of newest) if (chosen.length < 3 && !chosen.includes(message)) chosen.push(message);

  const story = [];
  for (const message of chosen.sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at))) {
    const context = related.find(a =>
      a.task?.repository === message.repository
      && a.task?.number === message.number
      && ['task', 'contribution'].includes(a.kind)
    ) || topic;
    story.push({
      ...context,
      kind: message.kind === 'review_comment' ? 'review' : 'discussion',
      at: message.updated_at,
      actor: { id: message.actor, label: message.actor, kind: 'account' },
      task: { repository: message.repository, number: message.number },
      url: message.url
    });
  }
  for (const a of related.filter(a => ['contribution', 'automation', 'review', 'session'].includes(a.kind)).slice(0, 3)) {
    if (story.length < 3 && !story.some(item => item.url === a.url)) story.push(a);
  }

  for (const a of story) {
    const item = element('article', '', 'journey-event');
    const update = progress(a);
    const time = element('time', relative(a.at));
    time.dateTime = a.at;
    const mentions = messageFor(a)?.mentions || [];
    const byline = a.actor?.label
      ? `${a.actor.label}${mentions.length ? ' → ' + mentions.slice(0, 2).map(name => '@' + name).join(isEn() ? ', ' : '、') : ''}`
      : '';
    item.append(
      time,
      element('strong', a.kind === 'automation' ? phase(a) : update.title),
      element('p', byline, 'journey-byline'),
      element('p', a.kind === 'automation' ? update.title : update.summary),
      external(L('阅读这一段进展 ↗', 'Read update ↗'), a.url)
    );
    events.append(item);
  }
  if (!story.length) events.append(element('p', L('问题已经提出，下一段探索会在这里继续。', 'Problem opened; the next exploration step will appear here.'), 'loading'));

  links.append(external(L('阅读公开研究原线索 ↗', 'Open source thread ↗'), topic.url, 'text-link'));
  if (related.some(a => a.department === 'books')) {
    links.append(external(L('走进相关的理论书库 ↗', 'Open monograph library ↗'), 'https://books.trureturing.org/', 'text-link'));
  }
}

function renderActivity() {
  const items = (view()?.recent || []).filter(a =>
    !['task'].includes(a.kind)
    && (!['research', 'books'].includes(a.department) || !['contribution'].includes(a.kind) || !technical.test(a.label))
  );
  const unique = [];
  const seen = new Set();
  for (const a of items) {
    const identity = `${a.source}:${a.id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    unique.push(a);
    if (unique.length === 4) break;
  }
  const container = $('#activity-strip');
  container.replaceChildren();
  for (const a of unique) {
    const d = department(a.department);
    const card = element('button', '', 'activity-card');
    card.type = 'button';
    card.dataset.focusKey = `activity:${a.id}`;
    const arrivalKey = `card/${eventKey(a)}`;
    const arrived = state.arrivals.some(item => eventKey(item) === eventKey(a)) && !state.animated.has(arrivalKey);
    card.classList.toggle('has-arrival', arrived);
    if (arrived) state.animated.add(arrivalKey);

    const top = element('div', '', 'activity-card-top');
    const timeEl = element('time', relative(a.at));
    timeEl.dateTime = a.at;
    top.append(element('span', langDeptLabel(d || a.department, L('研究现场', 'Live Deck')), 'activity-role'), timeEl);
    const update = progress(a);
    const headline = a.kind === 'automation'
      ? (findLinkedTaskActivity(a.task) ? `${phase(a)} · ${copyFor(findLinkedTaskActivity(a.task)).title}` : `${phase(a)} · ${update.title}`)
      : update.title;
    card.append(
      top,
      element('strong', headline)
    );
    card.addEventListener('click', () => {
      if (a.task) selectTopic(a);
      else {
        setMode('organization');
        selectDepartment(a.department, true, true);
      }
    });
    container.append(card);
  }
  if (!unique.length) container.append(element('p', L('下一段探索，正在继续。', 'Next exploration step underway.'), 'loading'));
  $('#activity-note').textContent = state.arrivals.length
    ? (isEn() ? `${state.arrivals.length} new updates` : `${state.arrivals.length} 段新进展汇入`)
    : L('真实发生的下一步', 'Live research signals');
}

function renderLiveOps() {
  renderLiveFeed();
  renderCheckerRuns();
  renderRelayBridges();
}

function inferDepartmentForMessage(m) {
  const repo = shortRepo(m.repository);
  if (m.kind === 'review_comment') return 'review';
  if (repo === 'trureturing-books') return 'books';
  if (repo === 'trureturing') return 'research';
  if (repo === 'mathesis' || repo === 'trureturing-pages') return 'publication';
  return 'studio';
}

function renderLiveFeed() {
  const container = $('#live-feed');
  const meta = $('#live-feed-meta');
  if (!container) return;

  const entries = [];
  for (const m of (state.stream?.messages || []).slice(0, 24)) {
    const deptId = inferDepartmentForMessage(m);
    const taskRef = { repository: m.repository, number: m.number };
    const linked = findLinkedTaskActivity(taskRef);
    const title = linked
      ? copyFor(linked).title
      : (deptId === 'books' ? L('理论书稿章节讨论', 'Monograph chapter discussion') : L('研究论证推进讨论', 'Mathematical proof discussion'));
    const fallback = deptId === 'books'
      ? L('围绕书稿推导与章节结构交换修订意见。', 'Exchanging chapter derivations and structural edits.')
      : L('围绕当前课题补充新的构造、边界检验与证明思路。', 'Contributing new constructions, boundary checks, and proof steps.');
    entries.push({
      category: 'discussion',
      at: m.updated_at,
      actor: m.actor,
      mentions: m.mentions || [],
      deptId,
      title,
      excerpt: cleanHumanExcerpt(m.text, fallback),
      url: m.url,
      linkedActivity: linked
    });
  }

  for (const a of (view()?.recent || []).slice(0, 36)) {
    if (a.kind === 'discussion') continue;
    if (['research', 'books'].includes(a.department) && technical.test(a.label)) continue;
    const cat = a.kind === 'automation' ? 'automation' : 'work';
    entries.push({
      category: cat,
      at: a.at,
      actor: a.actor?.label || langExecLabel(department(a.department)?.execution) || 'Actions',
      mentions: [],
      deptId: a.department,
      title: `${phase(a)} · ${actorTaskTitle(a, department(a.department) || { id: a.department })}`,
      excerpt: humanTaskSubtitle(a),
      url: a.url,
      linkedActivity: a.task ? a : null
    });
  }

  entries.sort((a, b) => timestamp(b.at) - timestamp(a.at));
  const filtered = entries.filter(e => {
    if (state.feedFilter === 'all') return e.category !== 'automation';
    return e.category === state.feedFilter;
  });
  if (meta) meta.textContent = isEn() ? `${filtered.length} events` : `${filtered.length} 条动态`;
  container.replaceChildren();

  if (!filtered.length) {
    container.append(element('p', L('当前筛选下暂无新的公开动态。', 'No public updates match the current filter.'), 'loading'));
    return;
  }

  for (const entry of filtered.slice(0, 6)) {
    const d = department(entry.deptId);
    const row = element('article', '', 'feed-entry');
    const head = element('div', '', 'feed-entry-head');
    const who = element('div', '', 'feed-who');
    const dot = element('i', '', 'feed-dept-dot');
    dot.style.background = deptColors[entry.deptId] || 'var(--accent)';
    who.append(dot, element('span', langDeptLabel(d || entry.deptId), 'feed-dept-tag'));
    head.append(who, element('time', relative(entry.at), 'feed-time'));

    row.append(head, element('div', entry.title, 'feed-title'));
    if (entry.excerpt) row.append(element('p', entry.excerpt, 'feed-excerpt'));

    const foot = element('div', '', 'feed-footer');
    const actions = element('div', '', 'feed-actions');
    if (entry.linkedActivity) {
      const followBtn = element('button', L('跟随接力 →', 'Trace Relay →'));
      followBtn.type = 'button';
      followBtn.addEventListener('click', () => {
        selectTopic(entry.linkedActivity);
        $('#institute').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
      });
      actions.append(followBtn);
    }
    if (entry.url) actions.append(external(L('查看来源 ↗', 'Source ↗'), entry.url));
    foot.append(element('span', ''), actions);
    row.append(foot);
    container.append(row);
  }
}

function renderCheckerRuns() {
  const container = $('#checker-runs');
  const lights = $('#checker-lights');
  const summary = $('#checker-summary');
  if (!container) return;

  const runs = activities()
    .filter(a => a.kind === 'automation')
    .sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));

  const workingCount = isStale() ? 0 : departments().reduce((n, d) => n + (d.running_automations || 0), 0);
  const waitingCount = isStale() ? 0 : runs.filter(a => fresh(a) && a.status === 'waiting').length;
  const passedCount = runs.filter(a => a.status === 'succeeded').length;
  if (summary) {
    summary.textContent = isStale()
      ? L('等待刷新', 'Awaiting refresh')
      : isEn()
        ? `${workingCount} live${waitingCount ? ` · ${waitingCount} queued` : ''} · ${passedCount} passed`
        : `${workingCount} 运行中${waitingCount ? ` · ${waitingCount} 排队` : ''} · ${passedCount} 通过`;
  }

  // Visual checker light matrix (48 compact status cells)
  if (lights) {
    lights.replaceChildren();
    for (const a of runs.slice(0, 48)) {
      const st = fresh(a) ? a.status : (a.status === 'working' || a.status === 'waiting' ? 'unknown' : a.status);
      const cell = external('', a.url || '#', `checker-light is-${st}`);
      const d = department(a.department);
      cell.title = `${langDeptLabel(d || a.department)} · ${sourceLabel(a)} · ${phase(a)} (${relative(a.at)})`;
      lights.append(cell);
    }
  }

  container.replaceChildren();
  if (!runs.length) {
    container.append(element('p', L('暂无观察到的自动检验记录。', 'No automated verification runs observed yet.'), 'loading'));
    return;
  }

  const badgeLabel = a => {
    if (a.status === 'working') return fresh(a) ? L('运行中', 'Live') : L('稍早运行', 'Recent');
    if (a.status === 'waiting') return fresh(a) ? L('排队中', 'Queued') : L('稍早等待', 'Queued');
    if (a.status === 'succeeded') return L('通过', 'Pass');
    if (a.status === 'failed') return L('待修', 'Fix');
    if (a.status === 'cancelled') return L('已取消', 'Cancel');
    return L('已结束', 'Done');
  };

  for (const a of runs.slice(0, 5)) {
    const d = department(a.department);
    const linked = findLinkedTaskActivity(a.task);
    const row = external('', a.url || '#', 'checker-row');
    const st = fresh(a) ? a.status : (a.status === 'working' || a.status === 'waiting' ? 'unknown' : a.status);
    const badge = element('span', badgeLabel(a), `checker-badge is-${st}`);
    const main = element('span', '', 'checker-main');
    main.append(
      element('strong', `${langDeptLabel(d || a.department)} · ${sourceLabel(a)}`),
      element('small', linked ? copyFor(linked).title : L('全天候自动检验与构建', '24/7 automated Lean check & build'))
    );
    row.append(
      badge,
      main,
      element('span', a.actor?.label || 'Actions', 'checker-actor'),
      element('span', relative(a.at), 'checker-time')
    );
    container.append(row);
  }
}

function renderRelayBridges() {
  const container = $('#relay-bridges');
  const summary = $('#relay-summary');
  if (!container) return;

  const bridges = handoffSummary();
  const total = bridges.reduce((n, b) => n + b.count, 0);
  if (summary) summary.textContent = total ? (isEn() ? `${total} cross-dept relays` : `共 ${total} 条跨部门接力`) : L('部门间流转', 'Cross-deck flow');
  container.replaceChildren();

  if (!bridges.length) {
    container.append(element('p', L('当不同部门的任务互相衔接时，接力流量会在这里展示。', 'Cross-department citation handoffs will appear here.'), 'loading'));
    return;
  }

  const maxCount = bridges[0].count || 1;
  for (const b of bridges.slice(0, 5)) {
    const fromLabel = langDeptLabel(department(b.from) || b.from);
    const toLabel = langDeptLabel(department(b.to) || b.to);
    const row = element('button', '', 'bridge-row');
    row.type = 'button';
    const top = element('div', '', 'bridge-top');
    const lbl = element('span', '', 'bridge-label');
    lbl.append(document.createTextNode(fromLabel), element('em', '→'), document.createTextNode(toLabel));
    top.append(lbl, element('span', isEn() ? `${b.count}` : `${b.count} 条`, 'bridge-count'));
    const track = element('div', '', 'bridge-bar-track');
    const fill = element('div', '', 'bridge-bar-fill');
    fill.style.width = `${Math.max(8, Math.round((b.count / maxCount) * 100))}%`;
    track.append(fill);
    row.append(top, track);
    row.addEventListener('click', () => {
      setMode('organization');
      selectDepartment(b.from, true, true);
      $('#institute').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
    });
    container.append(row);
  }
}

function renderQuestions() {
  const topics = questionTopics().filter(t => state.filter === 'all' || (state.filter === 'books' ? t.book : !t.book));
  const container = $('#question-cards');
  container.replaceChildren();
  for (const topic of topics.slice(0, state.limit)) {
    const a = topic.activity;
    const card = element('article', '', 'question-card');
    card.dataset.source = safeURL(a.url);
    const top = element('div', '', 'question-card-top');
    top.append(element('span', topic.book ? L('理论书写', 'Monographs') : topic.copy.area), element('span', phase(a), 'phase'));
    const title = element('button', topic.copy.title, 'question-title');
    title.type = 'button';
    title.title = cleanTitle(a.label);
    title.dataset.focusKey = `question:${topic.id}`;
    title.addEventListener('click', () => {
      selectTopic(a);
      $('#institute').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
    });
    card.append(top, title);
    if (topic.copy.hasEditorial) card.append(element('p', topic.copy.question));
    const bottom = element('div', '', 'question-card-bottom');
    bottom.append(
      element('span', isEn() ? `Updated ${relative(a.at)}` : `${relative(a.at)}有新进展`),
      element('span', L('跟随接力 ↗', 'Trace Relay ↗'))
    );
    card.append(bottom);
    container.append(card);
  }
  if (!topics.length) container.append(element('p', L('新的研究线索正在汇入。', 'New research threads are arriving.'), 'loading'));
  $('#more-questions').hidden = topics.length <= state.limit;
}

function renderBooks() {
  const container = $('#book-updates');
  container.replaceChildren();
  for (const t of questionTopics().filter(t => t.book).slice(0, 3)) {
    const row = element('div', '', 'book-update');
    const button = element('button', t.copy.title, 'text-button');
    button.type = 'button';
    button.addEventListener('click', () => {
      selectTopic(t.activity);
      $('#institute').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
    });
    row.append(element('span', phase(t.activity)), button);
    container.append(row);
  }
}

function renderPapers() {
  const publications = state.snapshot?.publications || [];
  const copies = isEn() ? {} : (state.snapshot?.editorial?.papers || {});
  const container = $('#paper-cards');
  container.replaceChildren();
  for (const paper of publications.slice(0, 6)) {
    const copy = copies[paper.id];
    const card = element('article', '', 'paper-card');
    if (paper.image) {
      const img = document.createElement('img');
      try {
        img.src = safeURL(new URL(paper.image, 'https://www.trureturing.org/').href);
      } catch {
        img.src = '';
      }
      img.alt = '';
      img.loading = 'lazy';
      card.append(img);
    }
    const content = element('div', '', 'paper-content');
    const title = external(copy?.title || paper.title, paper.url, 'paper-title');
    title.title = paper.title;
    content.append(
      element('span', /preprint/i.test(paper.status || '') ? L('预印本', 'Preprint') : L('研究论文', 'Research Paper'), 'paper-type'),
      title,
      element('p', copy?.summary || paper.summary || '', 'paper-summary'),
      element('div', paper.authors || '', 'paper-authors')
    );
    card.append(content);
    container.append(card);
  }
  if (!publications.length) {
    const empty = element('div', '', 'paper-empty');
    empty.append(
      element('p', L('研究正在长成可以阅读、讨论与继续推进的论文。', 'Verified theorems are being compiled into readable preprints and papers.')),
      external(L('阅读公开研究 ↗', 'Browse Public Research ↗'), 'https://www.trureturing.org/research', 'text-link')
    );
    container.append(empty);
  }
}

function renderRepos() {
  const container = $('#repo-matrix');
  const countEl = $('#repo-matrix-count');
  if (!container) return;
  const repos = state.snapshot?.repositories || [];
  if (countEl) countEl.textContent = repos.length ? (isEn() ? `${repos.length} public repositories` : `${repos.length} 个公开研究空间`) : '';
  container.replaceChildren();
  if (!repos.length) {
    container.append(element('p', L('正在同步公开研究仓库列表…', 'Syncing public repository index…'), 'loading'));
    return;
  }
  const owner = state.snapshot?.owner || 'the-omega-institute';
  for (const repo of repos) {
    const enMeta = isEn() ? REPO_META_EN[repo.name] : null;
    const tile = external('', `https://github.com/${owner}/${repo.name}`, 'repo-tile');
    const head = element('div', '', 'repo-tile-head');
    head.append(element('strong', enMeta?.label || (isEn() ? repo.name : (repo.label || repo.name))));
    if (repo.short) head.append(element('span', repo.short, 'repo-short'));
    tile.append(head, element('span', enMeta?.desc || (isEn() && /[\u4e00-\u9fff]/.test(repo.description || '') ? repo.name : (repo.description || repo.name)), 'repo-name-mono'));
    container.append(tile);
  }
}

function updateControls() {
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
  }
  $('#follow-live').setAttribute('aria-pressed', String(state.follow));
  $('#follow-live span').textContent = state.follow ? tr('follow_live', '跟随最新') : tr('follow_fixed', '已固定视角');
  $('#research-room').dataset.mode = state.mode;
  $('#journey-panel').hidden = state.mode !== 'journey';
}

function setMode(mode) {
  state.mode = mode;
  if (mode !== 'organization') {
    state.focused = null;
    $('#research-room')?.classList.remove('is-department-focused');
    if ($('#department-lens')) $('#department-lens').hidden = true;
  }
  updateControls();
  if (mode === 'journey') {
    renderJourney();
  } else {
    renderHive();
    renderDepartment();
    renderDepartmentLens(department(state.focused));
  }
}

function classifyConjectureVerdict(text) {
  return /counterexample|disprov|refut|falsif|obstruct|impossib|diverg|witness|distinguish|反例|反驳|证伪|障碍/i.test(String(text || ''))
    ? 'refuted'
    : 'proved';
}

function isSettledMathRecord(a) {
  const settled = (a.kind === 'contribution' && a.status === 'merged') || (a.kind === 'task' && a.status === 'closed');
  if (!settled) return false;
  if (!['research', 'verification', 'books', 'publication'].includes(a.department)) return false;
  const text = `${a.label || ''} ${a.summary || ''}`;
  if (/^ci[:(]|^chore[:(]|^test\(omega\)|^build[:(]|^fix\(ci|【已废弃】|缓存|分片|钉版|workflow|action|read formalization requests/i.test(text)) return false;
  return /prove|proof|formaliz|certif|characteriz|classif|obstruct|counterexample|disprov|refut|falsif|witness|construct|bound|sharp|constant|compact|descend|exact|conjecture|theorem|margin|diverge|entropy|fidelity|entanglement|证明|猜想|反例|反驳|证伪|定理|形式化|构造|边界/i.test(text);
}

function conjectureRecords() {
  const byUrl = new Map();
  const list = [];

  // 1. Curated permanent ledger entries from site/data/conjectures.json
  for (const item of state.conjectures || []) {
    if (!item || !item.title) continue;
    const normUrl = String(item.proof_url || item.id || '').trim();
    if (normUrl && byUrl.has(normUrl)) continue;
    const verdict = item.verdict === 'refuted' || item.verdict === 'obstruction' ? 'refuted' : 'proved';
    const areaRaw = item.area || '数学研究';
    const evRaw = item.evidence_kind || 'Lean 归档';
    const rec = {
      id: item.id || normUrl || item.title,
      verdict,
      title: isEn() ? (item.title || item.zh_title) : (item.zh_title || item.title),
      enTitle: item.title,
      area: isEn() ? (AREA_ZH_TO_EN[areaRaw] || areaRaw) : areaRaw,
      summary: isEn()
        ? (item.en_summary || (verdict === 'refuted' ? 'Formally verified refutation / obstruction archived in Lean 4.' : 'Formally certified theorem archived in Lean 4.'))
        : (item.summary || ''),
      url: item.proof_url || '',
      evidenceKind: isEn() ? (EVIDENCE_ZH_TO_EN[evRaw] || evRaw) : evRaw,
      settledAt: item.settled_at || '',
      live: false
    };
    if (normUrl) byUrl.set(normUrl, rec);
    list.push(rec);
  }

  // 2. Automatically append newly observed live settled Lean proofs & refutations
  const liveAll = [...(view()?.recent || []), ...departments().flatMap(d => d.activities || [])];
  const seenIds = new Set();
  for (const a of liveAll) {
    if (!a || seenIds.has(a.id)) continue;
    seenIds.add(a.id);
    if (!isSettledMathRecord(a)) continue;
    const normUrl = String(a.url || '').trim();
    if (normUrl && byUrl.has(normUrl)) continue;
    const copy = copyFor(a);
    const verdict = classifyConjectureVerdict(`${a.label || ''} ${a.summary || ''}`);
    const rec = {
      id: a.id,
      verdict,
      title: cleanWorkTitle(a, department(a.department) || { id: a.department }),
      enTitle: a.label || '',
      area: copy?.area || L('数学研究', 'Math Research'),
      summary: a.kind === 'task'
        ? L('已结案的公开研究单元，结论与验证路径已归档。', 'Closed public research unit with archived verdict and verification trail.')
        : L('已通过 Lean 自动化检验并合入主分支的公开数学提交。', 'Public mathematical proof verified by Lean CI and merged to the main branch.'),
      url: normUrl,
      evidenceKind: a.kind === 'task' ? L('已结案课题', 'Closed Thread') : L('Lean 已合入', 'Lean Merged'),
      settledAt: a.at || '',
      live: true
    };
    if (normUrl) byUrl.set(normUrl, rec);
    list.push(rec);
  }

  list.sort((a, b) => Number(b.live) - Number(a.live) || timestamp(b.settledAt) - timestamp(a.settledAt));
  return list;
}

function renderConjectures() {
  const container = $('#conjecture-cards');
  const countBadge = $('#conjectures-tab-count');
  const summaryEl = $('#conjecture-summary');
  const all = conjectureRecords();
  state.settledConjectures = all;
  const byCid = new Map();
  for (const rec of all) {
    const cid = matchGalaxyCidForText(`${rec.area || ''} ${rec.title || ''} ${rec.enTitle || ''}`);
    byCid.set(cid, (byCid.get(cid) || 0) + 1);
  }
  state.conjecturesByCid = byCid;
  const provedCount = all.filter(r => r.verdict === 'proved').length;
  const refutedCount = all.filter(r => r.verdict === 'refuted').length;
  if (countBadge) countBadge.textContent = all.length ? String(all.length) : '';
  if (summaryEl) {
    summaryEl.textContent = isEn()
      ? `Proved ${provedCount} · Refuted / Obstruction ${refutedCount} · Curated archive + live merged Lean proofs`
      : `已证明 ${provedCount} · 反驳/障碍 ${refutedCount} · 永久归档 site/data/conjectures.json + 实时合入`;
  }
  if (!container) return;
  const filtered = state.verdictFilter === 'all'
    ? all
    : all.filter(r => r.verdict === state.verdictFilter);
  container.replaceChildren();
  if (!filtered.length) {
    container.append(element('p', L('当前筛选条件下暂无已归档结论，自动化证明与反驳合入后会自动追加于此。', 'No archived verdicts match this filter; newly merged proofs and refutations append here automatically.'), 'loading'));
    return;
  }
  for (const rec of filtered.slice(0, 36)) {
    const card = rec.url ? external('', rec.url, 'conjecture-card' + (rec.verdict === 'refuted' ? ' is-refuted' : '')) : element('article', '', 'conjecture-card' + (rec.verdict === 'refuted' ? ' is-refuted' : ''));
    const head = element('div', '', 'conjecture-card-head');
    head.append(
      element('span', rec.verdict === 'refuted' ? tr('c_refuted', '✕ 反驳 / 障碍') : tr('c_proved', '✓ 已证明'), 'verdict-badge ' + (rec.verdict === 'refuted' ? 'is-refuted' : 'is-proved')),
      element('span', `${rec.area} · ${rec.evidenceKind}`, 'mono-meta')
    );
    const titleEl = element('strong', rec.title, 'conjecture-card-title');
    if (rec.enTitle && rec.enTitle !== rec.title) titleEl.title = rec.enTitle;
    const sub = element('p', rec.summary || rec.enTitle || '', 'conjecture-card-sub');
    const foot = element('div', '', 'conjecture-card-foot');
    const dt = rec.settledAt && Number.isFinite(timestamp(rec.settledAt)) ? (rec.live ? relative(rec.settledAt) : rec.settledAt.slice(0, 10)) : L('已归档', 'Archived');
    foot.append(
      element('span', rec.live ? (isEn() ? `LIVE MERGED · ${dt}` : `LIVE 实时合入 · ${dt}`) : (isEn() ? `ARCHIVED · ${dt}` : `永久档案 · ${dt}`)),
      element('span', rec.url ? L('查看证明 ↗', 'View Proof ↗') : L('已记录', 'Recorded'), 'work-arrow')
    );
    card.append(head, titleEl, sub, foot);
    container.append(card);
  }
}

async function refreshConjectures() {
  if (state.conjecturesBusy) return;
  state.conjecturesBusy = true;
  try {
    const response = await fetch(new URL('data/conjectures.json', document.baseURI), {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.schema === 'trureturing.conjectures.v1' && Array.isArray(data.entries)) {
      state.conjectures = data.entries;
      renderConjectures();
    }
  } catch {
  } finally {
    state.conjecturesBusy = false;
  }
}

function outreachScholarCount() {
  return Number(state.outreachStats?.collaborating_scholars) || 223;
}

async function refreshOutreachStats() {
  try {
    const response = await fetch(new URL('data/outreach-stats.json', document.baseURI), {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.schema === 'trureturing.outreach-stats.v1' && Number(data.collaborating_scholars) > 0) {
      state.outreachStats = { ...state.outreachStats, ...data };
      deptRoles.outreach = `${data.collaborating_scholars} 合作学者`;
      hubMeta.outreach = {
        tag: `SEC.02 · ${data.collaborating_scholars} COLLABORATING SCHOLARS`,
        title: `对外合作 · ${data.collaborating_scholars} 位学者联机（${data.replied_scholars || 485} 回信）`,
        titleEn: `Scholar Outreach · ${data.collaborating_scholars} Collaborating (${data.replied_scholars || 485} Replied)`
      };
      if (view()) renderHive();
    }
  } catch {}
}

function renderLive() {
  preserveFocus(() => {
    renderHealth();
    renderTicker();
    renderMetrics();
    renderHive();
    renderDepartment();
    renderDepartmentLens(department(state.focused));
    renderQuestions();
    renderConjectures();
    renderActivity();
    renderLiveOps();
    renderBooks();
    if (state.mode === 'journey') renderJourney();
    renderLatestSciFiLog();
    updateControls();
  });
}

function validSnapshot(data) {
  return data?.schema === 'trureturing-live.v1'
    && Number.isFinite(timestamp(data.collected_at))
    && Array.isArray(data.repositories);
}

function validStream(data) {
  const org = data?.organization;
  return data?.schema === 'trureturing-live-stream.v1'
    && Number.isFinite(timestamp(data.observed_at))
    && Array.isArray(data.messages)
    && org?.schema === 'ai-org.live.v1'
    && org.organization?.id === 'trureturing'
    && Number.isFinite(timestamp(org.observed_at))
    && Array.isArray(org.departments)
    && org.departments.every(d => typeof d.id === 'string' && Array.isArray(d.activities) && Array.isArray(d.participants))
    && Array.isArray(org.sources)
    && Array.isArray(org.recent);
}

async function refreshSnapshot() {
  if (state.snapshotBusy) return;
  state.snapshotBusy = true;
  try {
    const response = await fetch(new URL('data/snapshot.json', document.baseURI), {
      cache: 'no-store',
      signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (!validSnapshot(data) || (state.snapshot && timestamp(data.collected_at) < timestamp(state.snapshot.collected_at))) return;
    const changed = state.snapshot?.collected_at !== data.collected_at;
    state.snapshot = data;
    if (changed) {
      renderLive();
      renderPapers();
      renderRepos();
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {}
    }
  } catch {
    if (!state.snapshot) {
      renderPapers();
      renderRepos();
    }
  } finally {
    state.snapshotBusy = false;
  }
}

async function refreshLive() {
  if (state.liveBusy) return;
  state.liveBusy = true;
  state.lastLiveFetchAt = Date.now();
  try {
    const response = await fetch(liveURL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (!validStream(data) || (state.stream && timestamp(data.organization.observed_at) < timestamp(view().observed_at))) return;
    const changed = state.stream?.organization.observed_at !== data.organization.observed_at;
    const growthChanged = data.truth_growth?.head && data.truth_growth.head !== state.stream?.truth_growth?.head
      && timestamp(data.observed_at) >= timestamp(state.stream?.observed_at);
    if (!changed && !growthChanged) {
      renderHealth();
      return;
    }
    const first = !state.stream;
    const watermarks = new Map();
    for (const a of view()?.recent || []) {
      watermarks.set(a.source, Math.max(watermarks.get(a.source) || 0, timestamp(a.at) || 0));
    }
    const arrivals = [];
    for (const a of data.organization.recent) {
      const id = eventKey(a);
      if (!first && !state.seen.has(id) && timestamp(a.at) >= (watermarks.get(a.source) || 0)
          && Date.now() - timestamp(a.at) < 900000) arrivals.push(a);
      state.seen.add(id);
    }
    state.stream = data;
    try {
      localStorage.setItem(streamCacheKey, JSON.stringify(data));
    } catch {}
    observeTruthGrowth(data.truth_growth);
    state.arrivals = arrivals.slice(0, 8);
    if (arrivals.length) guideEvents?.collect(arrivals.map(guideActivity));
    if (state.seen.size > 1600) state.seen = new Set([...state.seen].slice(-1000));
    if (state.animated.size > 800) state.animated = new Set([...state.animated].slice(-400));
    if (state.follow && state.mode === 'organization' && arrivals.length) {
      state.selected = arrivals[0].department;
    }
    renderLive();
    if (arrivals.length) {
      for (const id of new Set(arrivals.map(a => a.department))) showStationLabel(state.cells.get(id), 5000);
      const dLabel = langDeptLabel(department(arrivals[0].department) || arrivals[0].department, L('研究院', 'Institute'));
      $('#live-announcement').textContent = isEn() ? `New update in ${dLabel}.` : `${dLabel}有新的进展。`;
    }
  } catch {
    renderHealth();
    if (!state.stream) {
      $('#connection-note').hidden = false;
      $('#connection-note').textContent = L(
        '研究现场连接稍慢，稍后会自动恢复。你可以先阅读已有的研究。',
        'Live stream connection is slow and will retry automatically. You can browse archived research meanwhile.'
      );
    }
  } finally {
    state.liveBusy = false;
  }
}

// ============================================================================
// REAL-TIME 60FPS 3D MATRIX ARCHITECTURAL CAMPUS (#holo-3d)
// Independent supervisory Akasha Eye (The Architect) poised above 4 spacious
// sovereign department sectors connected through the central Lean Formal Bridge!
// ============================================================================
// Strictly causally co-located 3D Space Station Floorplan:
// - Zenith: Akasha Eye (direction) perched high above all galaxies
// - Center Core: Formal Verification Reactor (verification)
// - Left Wing (SEC.01 理论生产翼): Conjecture Engine (research) + Living Books (books) adjacent!
// - Right Wing (SEC.02 出版与合作翼): Paper Factory & Mathesis (publication) <-> 200+ Scholars Outreach (outreach)!
// - South On-Demand Rheostat Dock: Red-Team Review (review) + Foundry Studio (studio) with sliding wiper & roaming workers!
const holoWorld = {
  direction:    { x:  0.0,  y: 6.95, z: -3.50, r: 0.86, baseH: 0.90, apex: true,  eye: true,  order: 0, hex: [229, 192, 123] },
  verification: { x:  0.0,  y: 0.22, z: -0.45, r: 0.84, baseH: 1.44, apex: false, eye: false, order: 1, hex: [116, 224, 244] },
  research:     { x: -5.45, y: 0.0,  z: -2.75, r: 0.72, baseH: 1.28, apex: false, eye: false, order: 2, hex: [94, 224, 206]  },
  books:        { x: -5.85, y: 0.0,  z:  1.90, r: 0.68, baseH: 1.20, apex: false, eye: false, order: 3, hex: [174, 184, 238] },
  publication:  { x:  5.45, y: 0.0,  z: -2.75, r: 0.72, baseH: 1.26, apex: false, eye: false, order: 4, hex: [125, 208, 245] },
  outreach:     { x:  5.85, y: 0.0,  z:  1.90, r: 0.68, baseH: 1.20, apex: false, eye: false, order: 5, hex: [232, 188, 124] },
  review:       { x: -4.25, y: 0.0,  z:  5.20, r: 0.64, baseH: 1.12, apex: false, eye: false, order: 6, hex: [164, 178, 236], onDemand: true, branch: 'A' },
  studio:       { x:  4.25, y: 0.0,  z:  5.20, r: 0.64, baseH: 1.12, apex: false, eye: false, order: 7, hex: [134, 210, 246], onDemand: true, branch: 'B' }
};

const LAYER_PRESETS = {
  mix:     { pitch:  0.23, dist: 26.2, lookY: 2.55, lookZ: -0.35, stationAlpha: 1.00, galaxyAlpha: 1.00, minPitch: -0.02, maxPitch: 0.78, tag: 'MIX · 天地星阵', tagEn: 'MIX · 3-STRATA PANORAMA' },
  station: { pitch:  0.29, dist: 22.0, lookY: 1.95, lookZ: -0.45, stationAlpha: 1.00, galaxyAlpha: 0.18, minPitch:  0.14, maxPitch: 0.78, tag: 'STATION · 阿卡西之眼与 24/7 活态环路', tagEn: 'STATION · AKASHA EYE & 24/7 ACTIVE LOOP' },
  galaxy:  { pitch:  0.34, dist: 27.4, lookY: 2.50, lookZ: -0.55, stationAlpha: 0.00, galaxyAlpha: 1.15, minPitch: -0.24, maxPitch: 0.78, tag: 'GALAXY · 环绕真值星系', tagEn: 'COSMOS · ORBITAL TRUTH GALAXIES' }
};

const holoCam = {
  yaw: 0.0,
  pitch: 0.23,
  dist: 26.2,
  targetYaw: 0.0,
  targetPitch: 0.23,
  targetDist: 26.2,
  lookX: 0.0,
  lookY: 2.55,
  lookZ: -0.35,
  ndcShiftX: 0.0,
  stationAlpha: 1.0,
  galaxyAlpha: 1.0,
  galaxyBoost: 0.0,
  fullAtlasAlpha: 0.0,
  stationFocus: 0.0,
  galaxyZoomScale: 1.0,
  galaxyZoomCooldown: 0,
  sonarStart: -99999,
  themeFadeStart: -99999,
  rheostatRevX: -2.4,
  rheostatRevTargetId: 'research',
  rheostatStuX: 2.4,
  rheostatStuTargetId: 'publication',
  workers: [],
  mouseNormX: 0.0,
  mouseNormY: 0.0,
  gazeX: -5.30,
  gazeZ: -2.95,
  dragging: false,
  dragMoved: false,
  lastX: 0,
  lastY: 0,
  time: 0,
  bootAge: 0,
  raf: 0,
  gl: null,
  glFailed: false,
  stars: [],
  sparks: [],
  matrixCols: [],
  pulses: [],
  flares: [],
  nebulaRipples: [],
  projectedTowers: new Map(),
  projectedGalaxies: new Map(),
  projectedLanterns: [],
  hoveredGalaxy: null,
  hoveredLantern: null,
  harpTrail: [],
  lastHarpKey: null
};

// ============================================================================
// OPENING CINEMA (Zenith Dive + Blueprint Scan Morph + Real Layered DAG Burst),
// GENESIS TIME-SCRUB MACHINE & AUTO-DIRECTOR CINEMA CRUISE
// ============================================================================
const INTRO_DURATION_MS = 2850;
const introCinema = {
  active: !reduced && !/jsdom/i.test(navigator.userAgent || ''),
  startMs: 0,
  progress: reduced || /jsdom/i.test(navigator.userAgent || '') ? 1.0 : 0.0
};

function startIntroCinema(now = performance.now()) {
  if (state.quiet || reduced || /jsdom/i.test(navigator.userAgent || '')) {
    skipIntroCinema();
    return;
  }
  stopCinemaDirector();
  exitGalaxyMainView(now);
  introCinema.active = true;
  introCinema.startMs = now;
  introCinema.progress = 0.0;
  holoCam.yaw = -0.34;
  holoCam.pitch = 0.50;
  holoCam.dist = 16.0;
  holoCam.lookX = 0.0;
  holoCam.lookY = 5.3;
  holoCam.lookZ = -1.6;
  const pill = $('#intro-cinema-pill');
  if (pill) pill.hidden = false;
  sciFiAudio.playGenesisIntro();
}

function skipIntroCinema() {
  if (!introCinema.active && introCinema.progress >= 1.0) return;
  introCinema.active = false;
  introCinema.progress = 1.0;
  const pill = $('#intro-cinema-pill');
  if (pill) pill.hidden = true;
}

const genesisScrub = {
  open: false,
  playing: false,
  value: 1.0 // 0..1 normalized DAG evolution timeline
};

function updateGenesisScrubUI() {
  const bar = $('#genesis-scrub-bar');
  const btn = $('#genesis-scrub-btn');
  const playBtn = $('#genesis-play-btn');
  const slider = $('#genesis-slider');
  const meta = $('#genesis-meta');
  if (bar) bar.hidden = !genesisScrub.open || Boolean(state.focused);
  if (btn) btn.setAttribute('aria-pressed', String(genesisScrub.open));
  if (playBtn) {
    playBtn.textContent = genesisScrub.playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-pressed', String(genesisScrub.playing));
  }
  const pct = Math.round(genesisScrub.value * 100);
  if (slider && Math.abs(Number(slider.value) - pct) >= 0.5) slider.value = String(pct);
  if (meta) {
    const totalTh = truthNebula.clusters.reduce((sum, c) => sum + (c.count || 0), 0) || 18367;
    const estTh = Math.round(totalTh * Math.pow(genesisScrub.value, 1.15));
    const settledAll = state.settledConjectures || [];
    const activeConjs = genesisScrub.value >= 0.99
      ? settledAll.length
      : Math.round(settledAll.length * Math.max(0, (genesisScrub.value - 0.30) / 0.70));
    meta.textContent = tr('genesis_meta', `DAG 演化 · ${pct}% · ~${estTh.toLocaleString()} 定理 · ✦ ${activeConjs} 猜想`, {
      pct,
      th: estTh.toLocaleString(),
      conj: activeConjs
    });
  }
}

const CINEMA_SHOTS = [
  { name: '天顶俯瞰', yaw: -0.22, pitch: 0.34, dist: 24.5, lookX:  0.0, lookY: 3.10, lookZ: -0.45, stationAlpha: 1.0, galaxyAlpha: 1.08 },
  { name: '左翼理论生产', yaw:  0.34, pitch: 0.38, dist: 16.8, lookX: -3.2, lookY: 0.85, lookZ: -0.40, stationAlpha: 1.0, galaxyAlpha: 0.55 },
  { name: 'Lean 核枢低机位', yaw: -0.10, pitch: 0.14, dist: 15.2, lookX:  0.0, lookY: 1.45, lookZ: -0.45, stationAlpha: 1.0, galaxyAlpha: 1.12 },
  { name: 'Mathesis 与 223 学者信标', yaw: -0.36, pitch: 0.34, dist: 17.6, lookX:  3.5, lookY: 1.05, lookZ:  0.10, stationAlpha: 1.0, galaxyAlpha: 0.72 },
  { name: '周天星海全景滑翔', yaw:  0.20, pitch: 0.12, dist: 27.2, lookX:  0.0, lookY: 3.45, lookZ: -0.35, stationAlpha: 0.55, galaxyAlpha: 1.24 }
];

const cinemaDirector = {
  active: false,
  startMs: 0
};

function startCinemaDirector(now = performance.now()) {
  if (state.quiet || reduced) return;
  skipIntroCinema();
  cinemaDirector.active = true;
  cinemaDirector.startMs = now;
  $('#cinema-director-btn')?.setAttribute('aria-pressed', 'true');
  const hint = $('#hive-hover-hint');
  if (hint) hint.textContent = tr('hint_cinema', '◎ 导演自动巡航中 · 拖拽、滚轮或点击任意处立即归还控制权');
}

function stopCinemaDirector() {
  if (!cinemaDirector.active) return;
  cinemaDirector.active = false;
  $('#cinema-director-btn')?.setAttribute('aria-pressed', 'false');
  updateHoverHint(state.hovered || state.selected);
}

// ============================================================================
// REAL EXPANDING 3D TRUTH DAG COSMIC NEBULA (sourced from trureturing-pages!)
// Renders 1,450 real certified Lean truth nodes & 770 real truth-dependency
// DAG filaments as a living, perpetually expanding deep-space nebula behind
// the concrete foreground 3D institutional architecture.
// ============================================================================
const truthNebula = {
  loaded: false,
  loading: false,
  counts: null,
  clusters: [],
  clusterLinks: [],
  stars: [],
  edges: [],
  frontier: [],
  projX: null,
  projY: null,
  projZ: null,
  projLit: null
};

function initTruthNebulaData(data) {
  if (!data || !Array.isArray(data.stars) || !data.stars.length) return;
  truthNebula.releaseModuleCount = data.counts?.truth_nodes;
  truthNebula.counts = data.counts || null;
  truthNebula.clusters = Array.isArray(data.clusters) ? data.clusters : [];
  truthNebula.clusterLinks = Array.isArray(data.cluster_links) ? data.cluster_links : [];
  truthNebula.stars = data.stars;
  truthNebula.edges = Array.isArray(data.edges) ? data.edges : [];
  const n = data.stars.length;
  truthNebula.release = data.truth_release_digest || '';
  truthNebula.baseCount = n;
  truthNebula.projX = new Float32Array(n);
  truthNebula.projY = new Float32Array(n);
  truthNebula.projZ = new Float32Array(n);
  truthNebula.projLit = new Float32Array(n);

  // Precompute real innermost anchor stars per galaxy so subterranean foundation root trunks graft directly into each DAG cluster!
  const byCluster = new Map();
  for (let i = 0; i < n; i++) {
    const cid = data.stars[i][3];
    if (!byCluster.has(cid)) byCluster.set(cid, []);
    byCluster.get(cid).push(i);
  }
  truthNebula.innerAnchors = new Map();
  for (const cl of truthNebula.clusters) {
    if (cl.name === 'Other') continue;
    const list = (byCluster.get(cl.id) || []).slice().sort((ia, ib) => {
      const sa = data.stars[ia], sb = data.stars[ib];
      return Math.hypot(sa[0], sa[1]) - Math.hypot(sb[0], sb[1]);
    });
    // Pick 3 well-separated inner-facing stars from the closest 28%
    const innerCount = Math.max(3, Math.floor(list.length * 0.28));
    const picked = [];
    if (list.length >= 3) {
      picked.push(list[0], list[Math.floor(innerCount * 0.45)], list[Math.min(list.length - 1, Math.floor(innerCount * 0.9))]);
    } else {
      picked.push(...list);
    }
    truthNebula.innerAnchors.set(cl.id, picked);
  }
  const otherId = truthNebula.clusters.find(c => c.name === 'Other')?.id ?? 7;
  truthNebula.foundationWeight = new Map();
  for (const [u, v, count] of truthNebula.clusterLinks) {
    if (u === otherId && v !== otherId) {
      truthNebula.foundationWeight.set(v, (truthNebula.foundationWeight.get(v) || 0) + (count || 0));
    } else if (v === otherId && u !== otherId) {
      truthNebula.foundationWeight.set(u, (truthNebula.foundationWeight.get(u) || 0) + (count || 0));
    }
  }
  truthNebula.frontier = [];
  truthNebula.loaded = true;
  rebuildRecentTruthGrowth();
  if (view()) renderHealth();
}

const truthAtlasFull = {
  loaded: false,
  loading: false,
  data: null
};

async function loadFullTruthAtlas() {
  if (truthAtlasFull.loaded || truthAtlasFull.loading || /jsdom/i.test(navigator.userAgent || '')) return;
  truthAtlasFull.loading = true;
  try {
    const resp = await fetch('data/truth-atlas-full.v1.json', { cache: 'force-cache' });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data?.schema_version === 'trureturing-truth-atlas-full.v1' && Array.isArray(data.nodes)) {
      truthAtlasFull.data = data;
      truthAtlasFull.loaded = true;
    }
  } catch {
    // Graceful fallback: 3,600-star ring nebula still renders cleanly
  } finally {
    truthAtlasFull.loading = false;
  }
}

function loadTruthNebula() {
  if (truthNebula.loaded || /jsdom/i.test(navigator.userAgent || '')) return;
  return truthNebula.loading ||= fetchTruthNebula();
}

async function fetchTruthNebula() {
  try {
    const resp = await fetch('data/truth-nebula.v1.json', { cache: 'no-cache' });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data?.schema_version === 'trureturing-truth-nebula.v1') {
      initTruthNebulaData(data);
    }
  } catch {
    // Graceful fallback: ambient cosmic dust still renders cleanly
  } finally {
    truthNebula.loading = false;
  }
}

// ============================================================================
// LIVE TRUTH DAG GROWTH
// Newly frozen D5 modules observed on the truth repository grow as new stars in
// their galaxy. A side window follows the new branches while the source lights
// the panorama.
// ============================================================================
const GROWTH_IN_MS = 460;
const GROWTH_SPAWN_START_MS = 850;
const GROWTH_EDGE_MS = 1500;
const GROWTH_TAIL_MS = 2650;
const GROWTH_VISIBLE_STARS = 8;
const GROWTH_LENS = 2.4;
const MAX_GROWTH_INSETS = 2;
const truthGrowth = {
  seen: null,
  queue: [],
  active: [],
  manualFocus: null,
  lastCid: null,
  grown: [],
  members: null,
  recentRaw: [],
  recentByCluster: new Map(),
  recentSprouts: [],
  totalRecent: 0
};

const growthEase = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

function growthClusterId(domain, clusters) {
  if (!clusters.length) return -1;
  const named = clusters.find(c => c.name === domain);
  if (named) return named.id;
  return clusters.find(c => c.name === 'Other')?.id ?? -1;
}

// The first reading is the baseline; afterwards only modules not seen before are growth.
function freshTruthGrowth(seen, events) {
  const next = new Set(seen || []);
  const fresh = [];
  for (const event of events || []) {
    if (!event?.module || next.has(event.module)) continue;
    next.add(event.module);
    if (seen) fresh.push(event);
  }
  return { seen: next, fresh };
}

function enqueueGrowth(queue, records, clusters, now) {
  const next = queue.map(item => ({ ...item, modules: item.modules.slice() }));
  for (const record of records) {
    const cid = growthClusterId(record.domain, clusters);
    const item = next.find(entry => entry.cid === cid
      && Boolean(entry.modules[0].preview) === Boolean(record.preview)
      && (cid >= 0 || entry.modules[0].domain === record.domain));
    if (item) item.modules.push(record);
    else next.push({ cid, modules: [record], queuedAt: now });
  }
  return next;
}

function nextGrowthFocus(queue, lastCid, active = []) {
  const available = item => !active.some(event => event.cid === item.cid);
  const elsewhere = queue.findIndex(item => item.cid !== lastCid && available(item));
  return elsewhere >= 0 ? elsewhere : queue.findIndex(available);
}

function growthTiming(count) {
  const visible = Math.min(count, GROWTH_VISIBLE_STARS);
  const gap = Math.min(720, 2500 / Math.max(1, visible - 1));
  const pulse = GROWTH_SPAWN_START_MS + (visible - 1) * gap + GROWTH_EDGE_MS + 100;
  return { visible, gap, pulse, end: pulse + GROWTH_TAIL_MS };
}

function growthFocusAmount(elapsed, timing) {
  return growthEase(elapsed / GROWTH_IN_MS)
    * (1 - growthEase((elapsed - timing.pulse - 280) / (GROWTH_TAIL_MS - 280)));
}

// Fisheye magnifier: points within radius R of (cx, cy) spread outward, most at the
// centre; the lens edge and everything outside it stay exactly where they were.
function growthLensWarp(x, y, cx, cy, R, D) {
  if (D <= 0 || R <= 0) return [x, y, 1];
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= R) return [x, y, 1];
  const m = (D + 1) / (D * (d / R) + 1);
  return [cx + dx * m, cy + dy * m, m];
}

// The lens over a growing galaxy: glass sheen, glowing rim, an orbiting dashed ring
// and two attention pings that spread from the galaxy when the close-up opens.
function drawGrowthLens(ctx, x, y, R, k, now, start, col) {
  if (k <= 0 || R <= 0) return;
  ctx.save();
  const sheen = ctx.createRadialGradient(x, y, R * 0.08, x, y, R);
  sheen.addColorStop(0, rgba(col, 0.11 * k));
  sheen.addColorStop(0.72, rgba(col, 0.04 * k));
  sheen.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(col, 0.16 * k);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rgba(col, 0.85 * k);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([4, 9]);
  ctx.lineDashOffset = -now / 40;
  ctx.strokeStyle = rgba(col, 0.55 * k);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, R + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = rgba(col, 0.9 * k);
  for (let i = 0; i < 8; i++) {
    const a = now / 1600 + (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * (R + 9), y + Math.sin(a) * (R + 9), 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const delay of [0, 450]) {
    const age = now - start - delay;
    if (age < 0 || age >= 1100) continue;
    const e = age / 1100;
    ctx.strokeStyle = rgba(col, 0.8 * (1 - e));
    ctx.lineWidth = 2.4 * (1 - e) + 0.4;
    ctx.beginPath();
    ctx.arc(x, y, R * (0.3 + 1.6 * e), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// End point of a caption leader on the lens rim, on the side facing (tx, ty).
function growthLensRim(x, y, R, tx, ty) {
  const a = Math.atan2(ty - y, tx - x);
  return [x + Math.cos(a) * R, y + Math.sin(a) * R];
}

// Deterministic placement: every viewer sees a module grow at the same spot.
function growthOffset(module) {
  let h = 2166136261;
  for (let i = 0; i < module.length; i++) {
    h ^= module.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const next = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
  return [next(), next(), next(), next()];
}

function shortModuleName(mod) {
  const parts = String(mod || '').split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function rebuildRecentTruthGrowth() {
  const raw = truthGrowth.recentRaw || [];
  truthGrowth.totalRecent = raw.length;
  truthGrowth.recentByCluster = new Map();
  truthGrowth.recentSprouts = [];
  if (!truthNebula.loaded || !truthNebula.clusters.length || !raw.length) return;

  if (!truthGrowth.members) {
    truthGrowth.members = new Map();
    truthNebula.stars.forEach((s, i) => {
      if (!truthGrowth.members.has(s[3])) truthGrowth.members.set(s[3], []);
      truthGrowth.members.get(s[3]).push(i);
    });
  }

  for (const ev of raw) {
    const cid = growthClusterId(ev.domain, truthNebula.clusters);
    if (cid < 0) continue;
    let bucket = truthGrowth.recentByCluster.get(cid);
    if (!bucket) {
      bucket = { count: 0, events: [] };
      truthGrowth.recentByCluster.set(cid, bucket);
    }
    bucket.count += 1;
    bucket.events.push(ev);
  }

  // Sort each cluster's events newest-first and build deterministic outward-expanding organic sprouts
  for (const [cid, bucket] of truthGrowth.recentByCluster) {
    bucket.events.sort((a, b) => (timestamp(b.at) || 0) - (timestamp(a.at) || 0));
    bucket.latest = bucket.events[0] || null;
    const cluster = truthNebula.clusters.find(c => c.id === cid);
    const members = truthGrowth.members.get(cid);
    if (!cluster || !members?.length) continue;
    const ctr = cluster.center;
    // Prefer outer-rim stars of this galaxy so new proof branches visibly expand OUTWARD!
    const sortedOuter = members
      .slice()
      .sort((ia, ib) => {
        const sa = truthNebula.stars[ia], sb = truthNebula.stars[ib];
        const da = Math.hypot(sa[0], sa[1]);
        const db = Math.hypot(sb[0], sb[1]);
        return db - da;
      });
    const rimPool = sortedOuter.slice(0, Math.max(8, Math.floor(sortedOuter.length * 0.45)));
    const cap = Math.min(18, bucket.events.length);
    for (let idx = 0; idx < cap; idx++) {
      const ev = bucket.events[idx];
      const [a, b, c, d] = growthOffset(ev.module || '');
      const parentIdx = rimPool[Math.floor(a * rimPool.length)];
      const p = truthNebula.stars[parentIdx];
      // Blend outward from galaxy centroid + outward from universe origin (using star position so ring clusters like Other always expand outward!)
      const gdx = p[0] - ctr[0], gdy = p[1] - ctr[1], gdz = p[2] - ctr[2];
      const glen = Math.hypot(gdx, gdy, gdz) || 1;
      const prLen = Math.hypot(p[0], p[1]) || 1;
      const isRingCluster = cluster.name === 'Other';
      const wGal = isRingCluster ? 0.18 : 0.48;
      const wUni = 1.0 - wGal;
      const ox = (gdx / glen) * wGal + (p[0] / prLen) * wUni;
      const oy = (gdy / glen) * wGal + (p[1] / prLen) * wUni;
      const oz = (gdz / glen) * 0.45;
      const olen = Math.hypot(ox, oy, oz) || 1;
      const ux = ox / olen, uy = oy / olen, uz = oz / olen;
      const step = 64 + b * 68;
      const tx = p[0] + ux * step + (c - 0.5) * 32;
      const ty = p[1] + uy * step + (d - 0.5) * 32;
      const tz = p[2] + uz * step * 0.52;
      // Gentle perpendicular curve offset so each growing filament arcs organically like a botanical/neural root
      const perpX = -uy * (c - 0.5) * 36;
      const perpY =  ux * (c - 0.5) * 36;
      // Secondary micro-fork branching outward from 56% along the main filament (living tree / coral gestation!)
      const forkSign = d >= 0.5 ? 1 : -1;
      const forkAng = Math.atan2(uy, ux) + forkSign * (0.42 + a * 0.24);
      const forkLen = step * (0.38 + c * 0.18);
      const bx = (p[0] + tx) * 0.5 + perpX * 0.55;
      const by = (p[1] + ty) * 0.5 + perpY * 0.55;
      const bz = (p[2] + tz) * 0.5;
      truthGrowth.recentSprouts.push({
        cid,
        parentIdx,
        module: ev.module,
        at: ev.at,
        commit: ev.commit,
        x: tx,
        y: ty,
        z: tz,
        mx: (p[0] + tx) * 0.5 + perpX,
        my: (p[1] + ty) * 0.5 + perpY,
        mz: (p[2] + tz) * 0.5,
        fx: bx + Math.cos(forkAng) * forkLen,
        fy: by + Math.sin(forkAng) * forkLen,
        fz: bz + uz * forkLen * 0.45,
        hasFork: idx < 10,
        phase: (idx / Math.max(1, cap) + a * 0.25) % 1,
        period: 8.8 + b * 4.4
      });
    }
  }
}

function observeTruthGrowth(feed) {
  if (!feed || !Array.isArray(feed.events)) return 0;
  truthGrowth.recentRaw = feed.events.slice();
  rebuildRecentTruthGrowth();
  const { seen, fresh } = freshTruthGrowth(truthGrowth.seen, feed.events);
  truthGrowth.seen = seen;
  if (fresh.length) {
    truthGrowth.queue = enqueueGrowth(truthGrowth.queue, fresh, truthNebula.clusters, performance.now());
    if (guideEvents) {
      const freezes = fresh.filter(ev => !ev.preview && Date.now() - timestamp(ev.at) < 900000 && galaxyNodeSourceUrl(ev.module, ev.commit));
      guideEvents.collect(freezes.map(ev => ({category: 'frozen', at: ev.at, module: ev.module,
        domain: ev.domain, source: galaxyNodeSourceUrl(ev.module, ev.commit)})));
    }
  }
  return fresh.length;
}

function commitGrowth(record, cid, born, visible, plannedBranch) {
  const cluster = truthNebula.clusters.find(c => c.id === cid);
  if (!cluster) return;
  if (!record.preview) {
    cluster.count = (cluster.count || 0) + 1;
    if (truthNebula.counts) truthNebula.counts.truth_nodes = (truthNebula.counts.truth_nodes || 0) + 1;
  }
  if (!visible) return;
  const branch = plannedBranch ?? growthBranch(record, cluster);
  if (!branch) return;
  truthGrowth.grown.push({ ...branch, module: record.module, at: record.at, commit: record.commit,
    preview: Boolean(record.preview), cid, born });
  if (truthGrowth.grown.length > 240) truthGrowth.grown.shift();
}

function growthBranch(record, cluster) {
  const cid = cluster.id;
  if (!truthGrowth.members) {
    truthGrowth.members = new Map();
    truthNebula.stars.forEach((s, i) => {
      if (!truthGrowth.members.has(s[3])) truthGrowth.members.set(s[3], []);
      truthGrowth.members.get(s[3]).push(i);
    });
  }
  const members = truthGrowth.members.get(cid);
  if (!members?.length) return;
  const [a, b, c, d] = growthOffset(record.module);
  const recent = truthGrowth.recentSprouts.find(sp => sp.module === record.module);
  const parentIdx = recent ? recent.parentIdx : members[Math.floor(a * members.length)];
  const p = truthNebula.stars[parentIdx];
  const ctr = cluster.center;
  const dx = p[0] - ctr[0], dy = p[1] - ctr[1], dz = p[2] - ctr[2];
  const len = Math.hypot(dx, dy, dz) || 1;
  const step = 34 + b * 40;
  return {
    parentIdx,
    x: recent ? recent.x : p[0] + (dx / len) * step + (c - 0.5) * 30,
    y: recent ? recent.y : p[1] + (dy / len) * step + (d - 0.5) * 30,
    z: recent ? recent.z : p[2] + (dz / len) * step * 0.6
  };
}

// ---- Galaxy main view -------------------------------------------------------
// Opening a galaxy flies the 3D camera to it from the station
// side so the galaxy becomes the main view; the station and the other galaxies
// fall back out of frame and return when the view closes.
const GALAXY_VIEW_FILL = 0.62;
// The opened galaxy is seen from above so its depth spreads over the screen.
const GALAXY_VIEW_PITCH = 0.92;

function galaxyCameraPose(center, radius, fovY, fill = GALAXY_VIEW_FILL) {
  const [x, y, z] = center;
  const dist = Math.max(3.2, Math.min(15, radius / (fill * Math.tan(fovY / 2))));
  return { yaw: Math.atan2(-x, -z), pitch: GALAXY_VIEW_PITCH, dist, lookX: x, lookY: y, lookZ: z };
}

// Screen-right and screen-up world directions of a camera with this yaw and pitch.
function galaxyViewBasis(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return { right: [cy, 0, -sy], up: [-sy * sp, cp, -cy * sp] };
}

// ---- Gathering related galaxies ---------------------------------------------
// An opened galaxy is joined by the galaxies its theorems depend on (the real
// inter-galaxy dependency bundles, strongest first). A sparsely linked galaxy is
// topped up with its nearest galaxies. They are shown smaller on a ring around it,
// spaced evenly in the order they already lie around it; unrelated galaxies dim in place.
const GATHER_MAX = 4;
const GATHER_MIN = 3;
const GATHER_SCALE = 0.5;
const GATHER_DIM = 0.26;

function galaxyLinkStrengths(cid, links) {
  const strength = new Map();
  for (const [u, v, forward = 0, reverse = 0] of links || []) {
    const other = u === cid ? v : v === cid ? u : null;
    if (other != null && other !== cid && forward + reverse > 0) {
      strength.set(other, (strength.get(other) || 0) + forward + reverse);
    }
  }
  return strength;
}

function galaxyGatherNeighbors(focusCid, clusters, links, frames) {
  const named = (clusters || []).filter(c => c.name !== 'Other' && c.id !== focusCid && frames.has(c.id));
  const strength = galaxyLinkStrengths(focusCid, links);
  const out = named
    .filter(c => strength.has(c.id))
    .sort((a, b) => strength.get(b.id) - strength.get(a.id))
    .slice(0, GATHER_MAX)
    .map(c => ({ cid: c.id, strength: strength.get(c.id), linked: true }));
  const fc = frames.get(focusCid)?.center;
  if (fc) {
    const gap = c => Math.hypot(...frames.get(c.id).center.map((v, i) => v - fc[i]));
    const near = named.filter(c => !strength.has(c.id)).sort((a, b) => gap(a) - gap(b));
    while (out.length < GATHER_MIN && near.length) out.push({ cid: near.shift().id, strength: 0, linked: false });
  }
  return out;
}

// Evenly spaced angles for the given directions, keeping their cyclic order and turned
// to stay as close as possible to where each one already lies.
function gatherSlots(angles) {
  const n = angles.length;
  if (!n) return [];
  const order = angles.map((a, i) => [a, i]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  const gap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  let best = null;
  for (let step = 0; step < 72; step++) {
    const phase = (step / 72) * 2 * Math.PI;
    const slots = new Array(n);
    let cost = 0;
    order.forEach((idx, k) => {
      slots[idx] = phase + (k * 2 * Math.PI) / n;
      cost += gap(slots[idx], angles[idx]);
    });
    if (!best || cost < best.cost) best = { cost, slots };
  }
  return best.slots;
}

function galaxyGatherPlan(focusCid, clusters, links, frames, basis, aspect) {
  const focus = frames.get(focusCid);
  if (!focus) return null;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const stretch = Math.sqrt(Math.max(0.5, Math.min(2.2, aspect || 1)));
  const ellX = stretch, ellY = 1 / stretch;
  let extentX = focus.radius, extentY = focus.radius;
  const neighbors = [];
  const chosen = galaxyGatherNeighbors(focusCid, clusters, links, frames);
  const slots = gatherSlots(chosen.map(n => {
    const d = frames.get(n.cid).center.map((v, i) => v - focus.center[i]);
    return Math.atan2(dot(d, basis.up), dot(d, basis.right));
  }));
  chosen.forEach((n, k) => {
    const frame = frames.get(n.cid);
    const slot = slots[k];
    const radius = frame.radius * GATHER_SCALE;
    const ring = focus.radius * 1.3 + radius + 0.3;
    const sx = Math.cos(slot) * ring * ellX, sy = Math.sin(slot) * ring * ellY;
    const target = focus.center.map((v, i) => v + basis.right[i] * sx + basis.up[i] * sy);
    extentX = Math.max(extentX, Math.abs(sx) + radius);
    extentY = Math.max(extentY, Math.abs(sy) + radius);
    neighbors.push({ ...n, slot, pivot: frame.center, scale: GATHER_SCALE, radius, target, offset: target.map((v, i) => v - frame.center[i]) });
  });
  return { focusCid, neighbors, extentX, extentY };
}

// Manual exploration gathers related galaxies and dims the rest of the sky.
function galaxyGatherTargets(plan, clusters) {
  const targets = new Map();
  for (const c of clusters || []) {
    const n = plan?.neighbors.find(x => x.cid === c.id);
    const active = Boolean(plan);
    targets.set(c.id, n
      ? { pivot: n.pivot, offset: n.offset, scale: n.scale, stretch: [1, 1, 1], alpha: 1 }
      : { pivot: [0, 0, 0], offset: [0, 0, 0], scale: 1, stretch: [1, 1, 1], alpha: !active || c.id === plan.focusCid ? 1 : GATHER_DIM });
  }
  return targets;
}

function galaxyGatherPlanFor(cid, frame, fovY, aspect) {
  if (!holoCam.gatherPlans) holoCam.gatherPlans = new Map();
  const key = `${cid}:${aspect >= 1 ? 'w' : 't'}`;
  if (holoCam.gatherPlans.has(key)) return holoCam.gatherPlans.get(key);
  const frames = new Map();
  for (const c of truthNebula.clusters) {
    const f = galaxyWorldFrame(c.id);
    if (f) frames.set(c.id, f);
  }
  const pose = galaxyCameraPose(frame.center, frame.radius, fovY);
  const plan = galaxyGatherPlan(cid, truthNebula.clusters, truthNebula.clusterLinks, frames, galaxyViewBasis(pose.yaw, pose.pitch), aspect);
  holoCam.gatherPlans.set(key, plan);
  return plan;
}

// In dedicated Cosmos (星系) mode, gently expand the 7 inclined 3D spiral galaxies along their wide orbital ring
// around & beneath the Akasha Eye — every galaxy cleanly framed inside the viewport, zero clipping, zero clutter!
const COSMOS_UNFURL = {
  6: { offset: [ 0.00, -0.05, -0.55], scale: 1.18, stretch: [1.14, 1.14, 1.14] }, // Observer: rear center below Akasha Eye
  0: { offset: [-0.25,  0.10, -0.20], scale: 1.24, stretch: [1.18, 1.16, 1.18] }, // Combinatorics: upper-left spiral galaxy
  2: { offset: [ 0.25,  0.10, -0.20], scale: 1.24, stretch: [1.18, 1.16, 1.18] }, // Arith: upper-right spiral galaxy
  3: { offset: [-0.30, -0.20,  0.30], scale: 1.20, stretch: [1.16, 1.14, 1.16] }, // ConceptDynamics: mid-left spiral wing
  5: { offset: [ 0.30, -0.20,  0.30], scale: 1.20, stretch: [1.16, 1.14, 1.16] }, // Weil: mid-right spiral wing
  1: { offset: [ 0.25, -0.65,  1.15], scale: 1.24, stretch: [1.18, 1.16, 1.18] }, // Quantum: lower-left foreground spiral galaxy
  4: { offset: [-0.25, -0.65,  1.15], scale: 1.22, stretch: [1.16, 1.16, 1.16] }  // Analytic: lower-right foreground spiral galaxy
};

// Eases every galaxy's gather transform toward the plan (or expanded galaxy observatory / rest) and hands it to the GPU.
function stepGalaxyGather(plan, k, expandGalaxies) {
  const gl = holoCam.gl;
  if (!gl || !truthNebula.loaded) return;
  if (!holoCam.gather) holoCam.gather = new Map();
  const entries = [];
  for (const [cid, baseTarget] of galaxyGatherTargets(plan, truthNebula.clusters)) {
    let t = baseTarget;
    if (expandGalaxies && !plan) {
      const cl = truthNebula.clusters.find(c => c.id === cid);
      const frame = cl && cl.name !== 'Other' ? galaxyWorldFrame(cid) : null;
      if (frame) {
        const u = COSMOS_UNFURL[cid];
        t = u
          ? { pivot: frame.center, offset: u.offset, scale: u.scale, stretch: u.stretch, alpha: 1.0 }
          : { pivot: frame.center, offset: [0, 0, 0], scale: 1.95, stretch: [1.48, 2.50, 1.45], alpha: 1.0 };
      } else if (cl && cl.name === 'Other') {
        t = { pivot: [0, 2.0, -0.55], offset: [0, -0.45, 0], scale: 1.18, stretch: [1.14, 1.78, 1.14], alpha: 0.96 };
      }
    }
    let cur = holoCam.gather.get(cid);
    if (!cur) {
      cur = { pivot: t.pivot.slice(), offset: [0, 0, 0], scale: 1, stretch: [1, 1, 1], alpha: 1 };
      holoCam.gather.set(cid, cur);
    }
    if (t.scale !== 1 || t.stretch.some(v => v !== 1)) cur.pivot = t.pivot.slice();
    cur.offset = cur.offset.map((v, i) => v + (t.offset[i] - v) * k);
    cur.scale += (t.scale - cur.scale) * k;
    cur.stretch = cur.stretch.map((v, i) => v + (t.stretch[i] - v) * k);
    cur.alpha += (t.alpha - cur.alpha) * k;
    entries.push({ cid, pivot: cur.pivot, offset: cur.offset, scale: cur.scale, stretch: cur.stretch, alpha: cur.alpha });
  }
  gl.setGather(entries);
  holoCam.gatherPlan = plan;
}

function nebulaAdjacency() {
  if (truthNebula.adjacency && truthNebula.adjacencyFor === truthNebula.edges) return truthNebula.adjacency;
  const adj = new Map();
  for (const [u, v] of truthNebula.edges || []) {
    if (!adj.has(u)) adj.set(u, []);
    if (!adj.has(v)) adj.set(v, []);
    adj.get(u).push(v);
    adj.get(v).push(u);
  }
  truthNebula.adjacency = adj;
  truthNebula.adjacencyFor = truthNebula.edges;
  return adj;
}

// Prerequisite and dependent stars of a star: from the full dependency graph when the
// details carry it, otherwise the undirected sampled edges.
function nodeConnections(idx, details) {
  const row = details?.stars?.[idx];
  if (row && Array.isArray(row[8])) return { prereqs: row[8], dependents: Array.isArray(row[9]) ? row[9] : [], other: [] };
  return { prereqs: [], dependents: [], other: nebulaAdjacency().get(idx) || [] };
}

function nodeLinks(idx) {
  const list = nebulaAdjacency().get(idx) || [];
  const cid = truthNebula.stars[idx]?.[3];
  return { total: list.length, cross: list.filter(j => truthNebula.stars[j]?.[3] !== cid).length };
}

// World position of the selected node and of its connections where they will be drawn.
function selectedNodeView(cid, plan) {
  const sel = galaxyDetail.selectedNode;
  const gl = holoCam.gl;
  if (!sel || sel.cid !== cid || !gl) return null;
  const world = gl.mapSkyPointBase(sel.nx, sel.ny, sel.nz, sel.cid);
  const neighbors = [];
  if (sel.kind === 'star') {
    const c = nodeConnections(sel.idx, galaxyDetail.data);
    for (const j of [...c.prereqs, ...c.dependents, ...c.other]) {
      const st = truthNebula.stars[j];
      const n = plan?.neighbors.find(x => x.cid === st[3]);
      if (st[3] !== cid && !n) continue;
      const p = gl.mapSkyPointBase(st[0] / 1000, st[1] / 1000, st[2] / 1000, st[3]);
      neighbors.push(n ? p.map((v, i) => n.pivot[i] + (v - n.pivot[i]) * n.scale + n.offset[i]) : p);
    }
  }
  return { world, neighbors };
}

// A clicked node becomes the centre of view, zoomed in past the galaxy view but wide
// enough to keep its connections in frame.
function nodeCameraPose(node, neighbors, fovY, aspect, yaw, pitch) {
  const [x, y, z] = node;
  let reach = 0;
  for (const p of neighbors || []) reach = Math.max(reach, Math.hypot(p[0] - x, p[1] - y, p[2] - z));
  const tan = Math.tan(fovY / 2) * Math.min(1, aspect || 1);
  const dist = Math.max(3, Math.min(6.5, reach / (0.78 * tan)));
  return { yaw, pitch, dist, lookX: x, lookY: y, lookZ: z };
}

// Only direct navigation takes control of the camera.
function galaxyCameraAllowed(kind, view) {
  return kind === 'manual' && view.mode === 'organization' && !view.focusedDepartment;
}

function galaxyCameraFocus() {
  const manual = truthGrowth.manualFocus && !truthGrowth.manualFocus.closing ? truthGrowth.manualFocus : null;
  const view = { mode: state.mode, layer: state.layer, focusedDepartment: state.focused, manual: Boolean(manual) };
  return manual && manual.cluster?.name !== 'Other' && galaxyCameraAllowed('manual', view) ? { cid: manual.cid, kind: 'manual' } : null;
}

function growthInsetAllowed(view) {
  return view.mode === 'organization' && !view.focusedDepartment && view.layer !== 'station' && !view.manual;
}

// Trackpad pinch / scroll zoom while inside Galaxy Main View or a focused DAG node:
// smoothly scales camera distance and steps back one level (node -> galaxy -> panorama)
// once pulled past GALAXY_ZOOM_EXIT, with a brief inertia cooldown so one flick never skips two levels!
const GALAXY_ZOOM_MIN = 0.58;
const GALAXY_ZOOM_EXIT = 1.32;
const GALAXY_ZOOM_COOLDOWN_MS = 560;

function stepGalaxyZoom(zoom, deltaY, ctrlKey, now) {
  const scale = Number.isFinite(zoom?.scale) ? zoom.scale : 1.0;
  const cooldownUntil = Number.isFinite(zoom?.cooldownUntil) ? zoom.cooldownUntil : 0;
  if (!Number.isFinite(deltaY) || deltaY === 0) return { scale, cooldownUntil, action: 'none' };
  if (deltaY > 0 && now < cooldownUntil) return { scale, cooldownUntil, action: 'cooldown' };
  const raw = ctrlKey ? deltaY * 0.016 : deltaY * 0.0024;
  const step = Math.max(-0.18, Math.min(0.18, raw));
  const next = Math.max(GALAXY_ZOOM_MIN, scale + step);
  if (deltaY > 0 && next >= GALAXY_ZOOM_EXIT) {
    return { scale: 1.0, cooldownUntil: now + GALAXY_ZOOM_COOLDOWN_MS, action: 'step-out' };
  }
  return { scale: Math.min(GALAXY_ZOOM_EXIT, next), cooldownUntil, action: 'zoom' };
}

function updateGalaxyBackBar() {
  const bar = document.querySelector('#galaxy-back-bar');
  const backBtn = document.querySelector('#galaxy-back-btn');
  const homeBtn = document.querySelector('#galaxy-home-btn');
  if (!bar || !backBtn) return;
  const inGalaxy = Boolean(truthGrowth.manualFocus && !truthGrowth.manualFocus.closing);
  bar.hidden = !inGalaxy;
  if (!inGalaxy) return;
  const inNode = Boolean(galaxyDetail.selectedKey || galaxyDetail.selectedNode);
  backBtn.textContent = inNode ? tr('back_galaxy', '← 返回星系') : tr('back_panorama', '← 返回全景');
  if (homeBtn) {
    homeBtn.textContent = tr('home_panorama', '返回全景');
    homeBtn.hidden = !inNode;
  }
}

function exitGalaxyMainView(now = performance.now()) {
  closeGalaxyNodeCard();
  holoCam.galaxyZoomScale = 1.0;
  if (truthGrowth.manualFocus && !truthGrowth.manualFocus.closing) {
    truthGrowth.manualFocus.closing = true;
    truthGrowth.manualFocus.closeStart = now;
  }
  const lp = LAYER_PRESETS[state.layer] || LAYER_PRESETS.mix;
  holoCam.targetDist = lp.dist;
  updateGalaxyBackBar();
  updateHoverHint(state.hovered || state.selected);
}

// World-space centre and framing radius (85th percentile of its stars) of a galaxy.
function syncGalaxyMainView(active) {
  const room = document.querySelector('#research-room');
  updateGalaxyBackBar();
  if (!room || room.classList.contains('is-galaxy-main') === Boolean(active)) return;
  room.classList.toggle('is-galaxy-main', Boolean(active));
  if (active) {
    loadGalaxyDetails();
  } else {
    galaxyDetail.picks = [];
    galaxyDetail.hoverKey = null;
    holoCam.galaxyZoomScale = 1.0;
    closeGalaxyNodeCard();
  }
  updateGalaxyBackBar();
}

// ---- Galaxy nodes -------------------------------------------------------------
// In the galaxy main view every node can be hovered and opened. Sampled stars are named
// from truth-nebula-details.v1.json, fetched when a galaxy first opens and used only when
// it matches the nebula release star by star; newly frozen modules come from the live
// growth feed and are marked 新加入.
const GALAXY_NODE_PICK_PX = 16;
const TRUTH_SOURCE_BLOB = 'https://github.com/the-omega-institute/trureturing/blob';
const NODE_ROLE_ZH = { hub: '枢纽定理', interface: '接口定理', bridge: '桥接定理', foundation: '基础定理', internal: '内部定理', 'specialized-leaf': '专门叶定理' };
const NODE_ROLE_EN = { hub: 'Hub Theorem', interface: 'Interface', bridge: 'Bridge', foundation: 'Foundation', internal: 'Internal Theorem', 'specialized-leaf': 'Specialized Leaf' };
const galaxyDetail = { status: 'idle', data: null, picks: [], hoverKey: null, selectedKey: null, selectedNode: null, bounds: null, tracePath: null };

// Pure BFS Proof Path Tracer on real Truth DAG edges + details prereqs:
// - endIdx == null: traces backward from startIdx to lowest-layer foundation/axiom roots (up to maxHops)
// - endIdx != null: shortest path between theorem A (startIdx) and theorem B (endIdx)
function traceDagPath(startIdx, endIdx, edges, details) {
  if (!Number.isInteger(startIdx) || startIdx < 0) return null;
  const prereqAdj = new Map();
  const undirAdj = new Map();
  const addPrereq = (u, v) => {
    if (!Number.isInteger(u) || !Number.isInteger(v) || u === v) return;
    if (!prereqAdj.has(v)) prereqAdj.set(v, new Set());
    prereqAdj.get(v).add(u);
    if (!undirAdj.has(u)) undirAdj.set(u, new Set());
    if (!undirAdj.has(v)) undirAdj.set(v, new Set());
    undirAdj.get(u).add(v);
    undirAdj.get(v).add(u);
  };
  for (const e of edges || []) {
    if (e && Number.isInteger(e[0]) && Number.isInteger(e[1])) addPrereq(e[0], e[1]);
  }
  const starRows = details?.stars || [];
  for (let i = 0; i < starRows.length; i++) {
    const row = starRows[i];
    if (Array.isArray(row?.[8])) {
      for (const u of row[8]) addPrereq(u, i);
    }
    if (Array.isArray(row?.[9])) {
      for (const v of row[9]) addPrereq(i, v);
    }
  }

  if (Number.isInteger(endIdx) && endIdx >= 0 && endIdx !== startIdx) {
    // Shortest path between two theorems (A <-> B)
    const q = [startIdx];
    const prev = new Map([[startIdx, null]]);
    while (q.length) {
      const cur = q.shift();
      if (cur === endIdx) break;
      for (const nb of undirAdj.get(cur) || []) {
        if (!prev.has(nb)) {
          prev.set(nb, cur);
          q.push(nb);
        }
      }
    }
    if (!prev.has(endIdx)) return { mode: 'pair', startIdx, endIdx, nodes: [startIdx, endIdx], edges: [] };
    const nodes = [];
    for (let cur = endIdx; cur != null; cur = prev.get(cur)) nodes.push(cur);
    nodes.reverse();
    const pathEdges = [];
    for (let i = 0; i < nodes.length - 1; i++) pathEdges.push([nodes[i], nodes[i + 1]]);
    return { mode: 'pair', startIdx, endIdx, nodes, edges: pathEdges };
  }

  // Backward trace to earliest foundation / axiom roots (bounded BFS collecting clean proof tree)
  const visited = new Set([startIdx]);
  const pathEdges = [];
  let frontier = [startIdx];
  for (let depth = 0; depth < 6 && frontier.length && pathEdges.length < 18; depth++) {
    const next = [];
    for (const v of frontier) {
      const pre = [...(prereqAdj.get(v) || [])];
      // Prefer lower-layer prerequisites first so chain descends cleanly toward Layer 0 axioms!
      pre.sort((a, b) => (starRows[a]?.[4] ?? 99) - (starRows[b]?.[4] ?? 99));
      for (const u of pre.slice(0, 3)) {
        pathEdges.push([u, v]);
        if (!visited.has(u)) {
          visited.add(u);
          next.push(u);
        }
        if (pathEdges.length >= 18) break;
      }
      if (pathEdges.length >= 18) break;
    }
    frontier = next;
  }
  return { mode: 'axioms', startIdx, endIdx: null, nodes: [...visited], edges: pathEdges };
}

function galaxyNodeKey(pick) {
  return pick.kind === 'star' ? `s${pick.idx}` : `n${pick.module}`;
}

function pickGalaxyNode(picks, x, y, radius = GALAXY_NODE_PICK_PX) {
  let best = null;
  let bestD = radius;
  for (const p of picks || []) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

function galaxyDetailsUsable(details, release, count) {
  return Boolean(details && details.schema_version === 'trureturing-truth-nebula-details.v1'
    && release && details.truth_release_digest === release
    && Array.isArray(details.stars) && details.stars.length === count);
}

function galaxyNodeSourceUrl(module, commit) {
  if (!module || !/^[0-9a-f]{40}$/.test(String(commit || ''))) return null;
  return `${TRUTH_SOURCE_BLOB}/${commit}/${module}.lean`;
}

function galaxyNodeInfo(pick, details, clusters, links = null) {
  const cluster = (clusters || []).find(c => c.id === pick.cid);
  const gName = cluster ? langGalaxyName(cluster) : '';
  const galaxy = cluster
    ? (isEn() ? `${gName} Galaxy` : `${cluster.zh || cluster.name}星系`)
    : L('真值星系', 'Truth Galaxy');
  if (pick.kind === 'new') {
    const stratum = String(pick.module || '').split('/')[1] || '';
    return {
      isNew: true,
      badge: pick.preview ? L('新加入（预览）', 'New (Preview)') : L('新加入', 'Newly Frozen'),
      title: shortModuleName(pick.module),
      module: pick.module,
      summary: pick.preview
        ? L('预览演示节点，不计入真值图谱。', 'Preview demo node; not counted in the live Truth DAG.')
        : L('dev 分支上新增冻结状态的 D5 模块。', 'Newly frozen D5 theorem module committed to the dev branch.'),
      meta: [isEn() ? `Frozen ${relative(pick.at)}` : `${relative(pick.at)}冻结`, galaxy, stratum].filter(Boolean),
      href: pick.preview ? null : galaxyNodeSourceUrl(pick.module, pick.commit)
    };
  }
  const row = details?.stars?.[pick.idx];
  if (!row) {
    return {
      isNew: false,
      badge: L('定理节点', 'Theorem Node'),
      title: `${galaxy} · ${L('定理节点', 'Theorem Node')}`,
      module: '',
      summary: L('节点名称暂不可用。', 'Module details unavailable.'),
      meta: [galaxy],
      href: null
    };
  }
  const [module, title, summary, role, layer, theorems, prereqCount, dependentCount] = row;
  const depMeta = Number.isInteger(prereqCount)
    ? [isEn() ? `Deps: ${prereqCount} · Used by: ${dependentCount || 0}` : `依赖 ${prereqCount} 个模块 · 被 ${dependentCount || 0} 个模块依赖`]
    : links?.total
      ? [isEn()
          ? `${links.total} connected nodes${links.cross ? ` (${links.cross} cross-galaxy)` : ''}`
          : `图中相连 ${links.total} 个节点${links.cross ? `（${links.cross} 个跨星系）` : ''}`]
      : [];
  return {
    isNew: false,
    badge: isEn() ? (NODE_ROLE_EN[role] || 'Theorem Node') : (NODE_ROLE_ZH[role] || '定理节点'),
    title: title || shortModuleName(module),
    module,
    summary: summary || '',
    meta: [
      galaxy,
      isEn() ? `DAG Layer ${layer}` : `DAG 第 ${layer} 层`,
      isEn() ? `${theorems} theorems` : `${theorems} 条定理`,
      ...depMeta
    ],
    href: galaxyNodeSourceUrl(module, details.source_commit)
  };
}

// Greedy label placement: candidates in priority order, each tried at four corners of
// its node, kept only when it overlaps no placed label or blocked area and stays on the stage.
function planGalaxyLabels(cands, max, bounds, blocked = []) {
  const placed = [];
  const clear = (r, o) => r.lx + r.w <= o.lx || o.lx + o.w <= r.lx || r.ly + r.h <= o.ly || o.ly + o.h <= r.ly;
  const fits = r => r.lx >= bounds.left && r.ly >= bounds.top && r.lx + r.w <= bounds.right && r.ly + r.h <= bounds.bottom
    && placed.every(o => clear(r, o)) && blocked.every(o => clear(r, o));
  for (const c of cands) {
    if (placed.length >= max) break;
    const h = c.h ?? 15;
    const tries = [[c.x + 9, c.y - h - 3], [c.x - 9 - c.w, c.y - h - 3], [c.x + 9, c.y + 4], [c.x - 9 - c.w, c.y + 4]];
    if (c.keepInside) {
      const x = Math.max(bounds.left, Math.min(c.x - c.w / 2, bounds.right - c.w));
      tries.push([x, c.y - h - 10], [x, c.y + 10]);
    }
    for (const [lx, ly] of tries) {
      const r = { ...c, lx, ly, h };
      if (fits(r)) {
        placed.push(r);
        break;
      }
    }
  }
  return placed;
}

function renderGalaxyNodeCard(info, x, y, bounds) {
  const card = document.querySelector('#galaxy-node-card');
  if (!card) return;
  const close = element('button', '×', 'gnc-close');
  close.type = 'button';
  close.setAttribute('aria-label', L('关闭节点详情', 'Close node details'));
  close.addEventListener('click', () => closeGalaxyNodeCard());
  const parts = [close, element('span', info.badge, `gnc-badge${info.isNew ? ' is-new' : ''}`), element('h3', info.title, 'gnc-title')];
  if (info.module) parts.push(element('p', info.module, 'gnc-module'));
  if (info.summary) parts.push(element('p', info.summary, 'gnc-summary'));
  if (info.meta?.length) parts.push(element('p', info.meta.join(' · '), 'gnc-meta'));
  const actions = element('div', '', 'gnc-actions');
  if (info.href) {
    const link = element('a', info.linkLabel || tr('lean_source_btn', '查看 Lean 源码 ↗'), 'gnc-link');
    link.href = info.href;
    link.target = '_blank';
    link.rel = 'noopener';
    actions.append(link);
  }
  if (info.canTrace && Number.isInteger(info.starIdx)) {
    const previewTrace = traceDagPath(info.starIdx, null, truthNebula.edges, galaxyDetail.data);
    const hopCount = previewTrace?.edges?.length || 0;
    if (hopCount > 0) {
      const activeCount = galaxyDetail.tracePath?.edges?.length || hopCount;
      const traceBtn = element('button', galaxyDetail.tracePath ? tr('trace_btn_close', `✕ 收起公理光脉 (${activeCount})`, { n: activeCount }) : tr('trace_btn_open', `⟡ 追溯公理根 (${hopCount} 条)`, { n: hopCount }), 'gnc-trace-btn');
      traceBtn.type = 'button';
      traceBtn.setAttribute('aria-pressed', String(Boolean(galaxyDetail.tracePath)));
      traceBtn.addEventListener('click', () => {
        if (galaxyDetail.tracePath) {
          galaxyDetail.tracePath = null;
        } else {
          galaxyDetail.tracePath = traceDagPath(info.starIdx, null, truthNebula.edges, galaxyDetail.data);
          sciFiAudio.playNodeChord(4, 2, 2);
        }
        const curN = galaxyDetail.tracePath?.edges?.length || hopCount;
        traceBtn.textContent = galaxyDetail.tracePath
          ? tr('trace_btn_close', `✕ 收起公理光脉 (${curN})`, { n: curN })
          : tr('trace_btn_open', `⟡ 追溯公理根 (${hopCount} 条)`, { n: hopCount });
        traceBtn.setAttribute('aria-pressed', String(Boolean(galaxyDetail.tracePath)));
      });
      actions.append(traceBtn);
    }
  }
  if (actions.childNodes.length) parts.push(actions);
  card.replaceChildren(...parts);
  card.hidden = false;
  if (x != null && y != null) {
    galaxyDetail.cardAnchor = { x, y };
    galaxyDetail.cardPlacedAt = performance.now();
    galaxyDetail.cardSettled = false;
    placeGalaxyNodeCard(galaxyDetail.cardAnchor, bounds, popupObstacles());
  }
}

function openLanternConjectureCard(lantern) {
  const rec = lantern?.rec;
  if (!rec) return;
  const isRef = rec.verdict === 'refuted';
  const bounds = galaxyDetail.bounds || { left: 16, top: 116, right: window.innerWidth - 310, bottom: window.innerHeight - 80 };
  const info = {
    badge: isRef ? tr('lantern_badge_refuted', '✦ 猜想提灯 · 反驳 / 障碍') : tr('lantern_badge_proved', '✦ 猜想提灯 · 已证明'),
    isNew: !isRef,
    title: isEn() ? (rec.enTitle || rec.title || 'Settled Conjecture') : (rec.title || rec.enTitle || '已归档猜想成果'),
    module: isEn() ? '' : (rec.enTitle && rec.enTitle !== rec.title ? rec.enTitle : ''),
    summary: rec.summary || L('已通过 Lean 形式验证或反例证伪的永久归档成果。', 'Archived conjecture formally verified or refuted in Lean 4.'),
    meta: [rec.area || L('数学研究', 'Math Research'), rec.evidenceKind || L('Lean 归档', 'Lean Archive'), rec.settledAt ? relative(rec.settledAt) : ''].filter(Boolean),
    href: rec.url || '',
    linkLabel: tr('lantern_read_btn', '在内置浏览器阅读证明 ↗'),
    canTrace: false
  };
  renderGalaxyNodeCard(info, lantern.x, lantern.y, bounds);
  sciFiAudio.playGalaxy();
  if (!state.quiet && !reduced) {
    xpFx.bursts.push({ kind: 'ring', x: lantern.x, y: lantern.y, rgb: isRef ? [246, 182, 118] : [248, 224, 158], start: performance.now(), dur: 820, maxR: 44, width: 2.0 });
  }
}

// The card docks at the top left of the stage so the focused node, which the camera
// brings to the centre, and its connections stay in view.
// A clicked popup opens beside the pointer, at the nearest of eight positions around it
// that hides the least: the pointer and what it clicked are never covered; the clicked
// node outweighs its connections, which outweigh new and hub nodes, galaxy centres and
// lanterns, which outweigh plain stars; nearness to the pointer breaks ties.
function placePopupNear(anchor, size, bounds, obstacles = [], gap = 18) {
  const { w, h } = size;
  const { x, y } = anchor;
  const raw = [
    [x + gap, y - h * 0.35], [x - gap - w, y - h * 0.35],
    [x - w / 2, y + gap], [x - w / 2, y - gap - h],
    [x + gap, y + gap], [x + gap, y - gap - h],
    [x - gap - w, y + gap], [x - gap - w, y - gap - h],
    [x + gap, y - h / 2], [x - gap - w, y - h / 2]
  ];
  const clampX = v => Math.max(bounds.left, Math.min(bounds.right - w, v));
  const clampY = v => Math.max(bounds.top, Math.min(bounds.bottom - h, v));
  const covers = (left, top, px, py, r) => px >= left - r && px <= left + w + r && py >= top - r && py <= top + h + r;
  let best = null;
  for (const [cx, cy] of raw) {
    const left = clampX(cx), top = clampY(cy);
    if (covers(left, top, x, y, 8)) continue;
    let cost = 0;
    for (const o of obstacles) if (covers(left, top, o.x, o.y, o.r || 0)) cost += o.weight ?? 1;
    cost += Math.hypot(Math.max(left - x, 0, x - (left + w)), Math.max(top - y, 0, y - (top + h))) / 40;
    if (!best || cost < best.cost) best = { left, top, cost };
  }
  return best ? { left: best.left, top: best.top } : { left: clampX(x + gap), top: clampY(y + gap) };
}

// What a popup should not hide, weighted by importance.
function popupObstacles() {
  const obs = [];
  const linked = new Set();
  const sel = galaxyDetail.selectedNode;
  if (sel?.kind === 'star') {
    const c = nodeConnections(sel.idx, galaxyDetail.data);
    for (const j of [...c.prereqs, ...c.dependents, ...c.other]) linked.add(`s${j}`);
  }
  for (const p of galaxyDetail.picks || []) {
    const key = galaxyNodeKey(p);
    if (key === galaxyDetail.selectedKey) obs.push({ x: p.x, y: p.y, r: 18, weight: 100 });
    else if (linked.has(key)) obs.push({ x: p.x, y: p.y, r: 10, weight: 8 });
    else if (p.kind === 'new') obs.push({ x: p.x, y: p.y, r: 8, weight: 3 });
    else obs.push({ x: p.x, y: p.y, r: 4, weight: (p.weight || 0) >= 7 ? 1.5 : 0.3 });
  }
  for (const g of holoCam.projectedGalaxies?.values() || []) obs.push({ x: g.x, y: g.y, r: 36, weight: 2 });
  for (const l of holoCam.projectedLanterns || []) obs.push({ x: l.x, y: l.y, r: 8, weight: 1 });
  return obs;
}

function galaxyNodeCardRect() {
  const card = document.querySelector('#galaxy-node-card');
  if (!card || card.hidden) return null;
  const lx = parseFloat(card.style.left) || 0, ly = parseFloat(card.style.top) || 0;
  return { lx, ly, w: card.offsetWidth || parseFloat(card.style.width) || 300, h: Math.max(150, card.offsetHeight || 0) };
}

function placeGalaxyNodeCard(anchor, bounds, obstacles) {
  const card = document.querySelector('#galaxy-node-card');
  if (!card || card.hidden || !bounds || !anchor) return null;
  const width = Math.min(320, Math.max(200, bounds.right - bounds.left - 24));
  if (card.style.width !== `${width}px`) card.style.width = `${width}px`;
  const height = Math.max(150, card.offsetHeight || 190);
  const spot = placePopupNear(anchor, { w: width, h: height }, bounds, obstacles);
  card.style.left = `${Math.round(spot.left)}px`;
  card.style.top = `${Math.round(spot.top)}px`;
  return { lx: spot.left, ly: spot.top, w: width, h: height };
}

// While the camera brings a clicked node to the centre the card stays by the pointer;
// it moves only if it would hide the node, and once more when the camera has settled.
function keepGalaxyNodeCardClear(selPick, bounds, now) {
  let rect = galaxyNodeCardRect();
  if (!rect) return null;
  const hidesNode = selPick && selPick.x >= rect.lx - 16 && selPick.x <= rect.lx + rect.w + 16 && selPick.y >= rect.ly - 16 && selPick.y <= rect.ly + rect.h + 16;
  const settle = !galaxyDetail.cardSettled && galaxyDetail.cardPlacedAt && now - galaxyDetail.cardPlacedAt > 1300;
  if (hidesNode || settle) {
    if (settle) galaxyDetail.cardSettled = true;
    const anchor = holoCam.pointerLocal || galaxyDetail.cardAnchor || selPick;
    rect = placeGalaxyNodeCard(anchor, bounds, popupObstacles()) || rect;
  }
  return rect;
}

// Marks new nodes and hub theorems of the main-view galaxy, labels them and records the
// projected nodes that the pointer can pick.
function drawGalaxyNodeLayer(ctx, cid, project, palette, isLight, w, h, rightGutter, now) {
  const alpha = Math.max(0, Math.min(1, (0.62 - holoCam.stationAlpha) / 0.4));
  const right = w - rightGutter - 14;
  galaxyDetail.bounds = { left: 16, top: 116, right, bottom: h - 70 };
  if (alpha < 0.05) {
    galaxyDetail.picks = [];
    return;
  }
  const onStage = (x, y) => x > 18 && x < right && y > 70 && y < h - 60;
  const plan = holoCam.gatherPlan?.focusCid === cid ? holoCam.gatherPlan : null;
  const group = new Set([cid, ...(plan?.neighbors || []).map(n => n.cid)]);
  const picks = [];
  const stars = truthNebula.stars;
  for (let i = 0; i < (truthNebula.baseCount || 0); i++) {
    if (!group.has(stars[i][3])) continue;
    const x = truthNebula.projX[i], y = truthNebula.projY[i];
    if (onStage(x, y)) picks.push({ kind: 'star', idx: i, cid: stars[i][3], x, y, weight: stars[i][5] || 0, nx: stars[i][0] / 1000, ny: stars[i][1] / 1000, nz: stars[i][2] / 1000 });
  }
  const freshByModule = new Map();
  for (const sp of truthGrowth.recentSprouts) {
    if (!group.has(sp.cid) || !sp.module) continue;
    const [x, y] = project(sp.x / 1000, sp.y / 1000, sp.z / 1000, sp.cid);
    if (onStage(x, y)) freshByModule.set(sp.module, { kind: 'new', cid: sp.cid, module: sp.module, at: sp.at, commit: sp.commit, x, y, nx: sp.x / 1000, ny: sp.y / 1000, nz: sp.z / 1000 });
  }
  for (const g of truthGrowth.grown) {
    if (!group.has(g.cid) || !g.module || now - g.born < GROWTH_EDGE_MS) continue;
    const [x, y] = project(g.x / 1000, g.y / 1000, g.z / 1000, g.cid);
    if (onStage(x, y)) freshByModule.set(g.module, { kind: 'new', cid: g.cid, module: g.module, at: g.at, commit: g.commit, preview: g.preview, born: g.born, reveal: growthEase((now - g.born - GROWTH_EDGE_MS) / 360), x, y, nx: g.x / 1000, ny: g.y / 1000, nz: g.z / 1000 });
  }
  const fresh = [...freshByModule.values()].sort((a, b) => (timestamp(b.at) || 0) - (timestamp(a.at) || 0));
  picks.push(...fresh);
  galaxyDetail.picks = alpha > 0.5 ? picks : [];

  const details = galaxyDetail.data;
  const col = palette[cid % palette.length];
  const gold = isLight ? [160, 104, 16] : [255, 214, 128];
  const hubs = details ? picks.filter(p => p.kind === 'star' && p.cid === cid).sort((a, b) => b.weight - a.weight).slice(0, 6) : [];
  const sel = galaxyDetail.selectedNode;
  const conn = sel?.kind === 'star' ? nodeConnections(sel.idx, details) : { prereqs: [], dependents: [], other: [] };
  const linked = [...conn.prereqs, ...conn.dependents, ...conn.other];
  const otherId = truthNebula.clusters.find(c => c.name === 'Other')?.id;
  for (const j of linked) {
    if (picks.some(p => p.kind === 'star' && p.idx === j) || stars[j]?.[3] === otherId) continue;
    const x = truthNebula.projX[j], y = truthNebula.projY[j];
    if (onStage(x, y)) picks.push({ kind: 'star', idx: j, cid: stars[j][3], x, y, weight: stars[j][5] || 0, nx: stars[j][0] / 1000, ny: stars[j][1] / 1000, nz: stars[j][2] / 1000 });
  }
  if (alpha > 0.5) galaxyDetail.picks = picks;
  const selPick = sel ? picks.find(p => galaxyNodeKey(p) === galaxyDetail.selectedKey) : null;
  const linkedPicks = linked.map(j => picks.find(p => p.kind === 'star' && p.idx === j)).filter(Boolean);

  ctx.save();
  ctx.globalAlpha = alpha;
  // Dependency bundles between the opened galaxy and the galaxies gathered around it.
  const focusCl = truthNebula.clusters.find(c => c.id === cid);
  if (plan && focusCl) {
    const [fx, fy] = project(focusCl.center[0] / 1000, focusCl.center[1] / 1000, focusCl.center[2] / 1000, cid);
    ctx.font = '600 10px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of plan.neighbors) {
      const cl = truthNebula.clusters.find(c => c.id === n.cid);
      if (!cl) continue;
      const [nx, ny] = project(cl.center[0] / 1000, cl.center[1] / 1000, cl.center[2] / 1000, n.cid);
      const ncol = palette[n.cid % palette.length];
      const strength = n.linked ? Math.min(1, Math.log1p(n.strength) / Math.log1p(600)) : 0;
      const mx = (fx + nx) / 2 + (fy - ny) * 0.12, my = (fy + ny) / 2 - (fx - nx) * 0.12;
      const grad = ctx.createLinearGradient(fx, fy, nx, ny);
      grad.addColorStop(0, rgba(col, n.linked ? 0.5 : 0.2));
      grad.addColorStop(1, rgba(ncol, n.linked ? 0.62 : 0.24));
      ctx.strokeStyle = grad;
      ctx.lineWidth = n.linked ? 1.2 + strength * 3.2 : 1;
      ctx.setLineDash(n.linked ? [] : [4, 6]);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(mx, my, nx, ny);
      ctx.stroke();
      ctx.setLineDash([]);
      const lx = 0.25 * fx + 0.5 * mx + 0.25 * nx, ly = 0.25 * fy + 0.5 * my + 0.25 * ny;
      const text = n.linked ? (isEn() ? `${n.strength} deps` : `${n.strength} 条依赖`) : L('邻近', 'Nearby');
      ctx.lineWidth = 3;
      ctx.strokeStyle = isLight ? 'rgba(247, 244, 236, 0.94)' : 'rgba(4, 7, 12, 0.92)';
      ctx.strokeText(text, lx, ly);
      ctx.fillStyle = rgba(ncol, n.linked ? 0.95 : 0.7);
      ctx.fillText(text, lx, ly);
    }
    // Sampled theorem-level dependencies crossing between the gathered galaxies.
    ctx.lineWidth = 0.8;
    for (const [u, v, kind] of truthNebula.edges) {
      if (kind !== 1) continue;
      const cu = stars[u]?.[3], cv = stars[v]?.[3];
      if (!(cu === cid && group.has(cv)) && !(cv === cid && group.has(cu))) continue;
      ctx.strokeStyle = rgba(palette[(cu === cid ? cv : cu) % palette.length], 0.42);
      ctx.beginPath();
      ctx.moveTo(truthNebula.projX[u], truthNebula.projY[u]);
      ctx.lineTo(truthNebula.projX[v], truthNebula.projY[v]);
      ctx.stroke();
    }
  }
  // The selected node's connections: solid to what it depends on, dashed to what depends on it.
  if (selPick && sel.kind === 'star') {
    const ink = isLight ? [20, 40, 44] : [236, 252, 248];
    const kinds = [[conn.prereqs, ink, []], [conn.dependents, gold, [5, 5]], [conn.other, ink, [2, 4]]];
    for (const [list, tone, dash] of kinds) {
      for (const j of list) {
        const x = truthNebula.projX[j], y = truthNebula.projY[j];
        ctx.strokeStyle = rgba(tone, 0.82);
        ctx.lineWidth = 1.4;
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(selPick.x, selPick.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = rgba(tone, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Flowing golden Proof Path Tracer light-vein overlay (追溯公理根 / 两星寻路)!
  if (galaxyDetail.tracePath && galaxyDetail.tracePath.edges?.length) {
    const tFlow = (now / 1000) * 0.72;
    const goldVein = isLight ? [168, 108, 18] : [252, 214, 116];
    for (let idx = 0; idx < galaxyDetail.tracePath.edges.length; idx++) {
      const [u, v] = galaxyDetail.tracePath.edges[idx];
      const ux = truthNebula.projX[u], uy = truthNebula.projY[u];
      const vx = truthNebula.projX[v], vy = truthNebula.projY[v];
      if (!Number.isFinite(ux) || !Number.isFinite(vx)) continue;
      ctx.strokeStyle = rgba(goldVein, isLight ? 0.22 : 0.28);
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.lineTo(vx, vy);
      ctx.stroke();
      ctx.strokeStyle = rgba(goldVein, 0.92);
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.lineTo(vx, vy);
      ctx.stroke();
      // Travelling golden proof photon along each hop (axiom -> target!)
      const f = (tFlow + idx * 0.19) % 1;
      const px = ux + (vx - ux) * f;
      const py = uy + (vy - uy) * f;
      ctx.fillStyle = rgba([255, 250, 224], 0.96);
      ctx.beginPath();
      ctx.arc(px, py, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(goldVein, 0.92);
      ctx.beginPath();
      ctx.arc(ux, uy, 3.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const cardRect = galaxyDetail.selectedKey ? keepGalaxyNodeCardClear(selPick, galaxyDetail.bounds, now) : galaxyNodeCardRect();
  ctx.restore();
  const byKey = new Map(picks.map(p => [galaxyNodeKey(p), p]));
  const clip = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
  const textFor = p => (p.kind === 'new' ? `${L('新', 'New')} · ${shortModuleName(p.module)}` : clip(details?.stars?.[p.idx]?.[1] || L('定理节点', 'Theorem Node'), 34));
  const cands = [];
  const add = (p, kind) => {
    if (!p || cands.some(c => c.key === galaxyNodeKey(p))) return;
    cands.push({ key: galaxyNodeKey(p), reveal: p.reveal, x: p.x, y: p.y, text: textFor(p), kind: p.kind === 'new' ? 'new' : kind });
  };
  add(byKey.get(galaxyDetail.selectedKey), 'focus');
  add(byKey.get(galaxyDetail.hoverKey), 'focus');
  linkedPicks.slice(0, 6).forEach(p => add(p, 'focus'));
  fresh.filter(p => p.cid === cid).slice(0, 6).forEach(p => add(p, 'new'));
  hubs.forEach(p => add(p, 'hub'));

  ctx.save();
  ctx.globalAlpha = alpha;
  for (const p of fresh) {
    ctx.globalAlpha = alpha * (p.reveal ?? 1);
    const pulse = 0.5 + 0.5 * Math.sin(now / 520 + (p.x + p.y) * 0.01);
    const r = 5 + 2.2 * pulse;
    ctx.strokeStyle = rgba(gold, 0.55 + 0.4 * pulse);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r);
    ctx.lineTo(p.x + r, p.y);
    ctx.lineTo(p.x, p.y + r);
    ctx.lineTo(p.x - r, p.y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = rgba(gold, 0.95);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  for (const p of hubs) {
    ctx.strokeStyle = rgba(col, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const key of [galaxyDetail.hoverKey, galaxyDetail.selectedKey]) {
    const p = byKey.get(key);
    if (!p) continue;
    ctx.strokeStyle = isLight ? 'rgba(20, 40, 44, 0.9)' : 'rgba(240, 255, 252, 0.95)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.font = '600 10.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
  for (const c of cands) c.w = ctx.measureText(c.text).width + 4;
  const placed = planGalaxyLabels(cands, selPick ? 13 : 11, galaxyDetail.bounds, cardRect ? [cardRect] : []);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const halo = isLight ? 'rgba(247, 244, 236, 0.94)' : 'rgba(4, 7, 12, 0.92)';
  for (const c of placed) {
    ctx.globalAlpha = alpha * (c.reveal ?? 1);
    const tone = c.kind === 'new' ? gold : c.kind === 'focus' ? (isLight ? [20, 40, 44] : [240, 255, 252]) : col;
    const ax = c.lx < c.x ? c.lx + c.w : c.lx;
    const ay = c.ly < c.y ? c.ly + c.h : c.ly;
    ctx.strokeStyle = rgba(tone, 0.5);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = halo;
    ctx.strokeText(c.text, c.lx + 2, c.ly + c.h / 2);
    ctx.fillStyle = rgba(tone, 0.98);
    ctx.fillText(c.text, c.lx + 2, c.ly + c.h / 2);
  }
  ctx.textAlign = 'center';
  ctx.font = '600 10px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
  const freshHere = fresh.filter(p => p.cid === cid).length;
  const legend = selPick
    ? (() => {
      const row = details?.stars?.[sel.idx];
      const counts = sel.kind === 'star' && Number.isInteger(row?.[6])
        ? (isEn()
            ? `── Deps ${row[6]} · ┄ Used by ${row[7] || 0} (${conn.prereqs.length + conn.dependents.length} shown)`
            : `── 依赖 ${row[6]} · ┄ 被依赖 ${row[7] || 0}（图中 ${conn.prereqs.length + conn.dependents.length} 条）`)
        : sel.kind === 'star'
          ? (isEn() ? `${conn.other.length} linked in view` : `图中相连 ${conn.other.length}`)
          : L('新加入节点', 'Newly frozen node');
      return isEn()
        ? `◎ Focused Node · ${counts} · Pinch/scroll out, click empty space or Esc to return`
        : `◎ 已聚焦节点 · ${counts} · 双指捏合/滚轮缩小、点空白或 Esc 退回星系`;
    })()
    : (isEn()
        ? `◆ New ${freshHere}${details ? ' · ○ Hub Theorem' : ''}${plan?.neighbors.length ? ` · ${plan.neighbors.length} related galaxies` : ''} · Click node to inspect · Pinch/scroll out for panorama`
        : `◆ 新加入 ${freshHere}${details ? ' · ○ 枢纽定理' : ''}${plan?.neighbors.length ? ` · 聚集 ${plan.neighbors.length} 个相关星系` : ''} · 点击节点聚焦 · 捏合/滚轮缩回全景`);
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = halo;
  ctx.strokeText(legend, w * 0.5, 98);
  ctx.fillStyle = rgba(freshHere && !selPick ? gold : col, 0.92);
  ctx.fillText(legend, w * 0.5, 98);
  ctx.restore();
}

function closeGalaxyNodeCard() {
  galaxyDetail.selectedKey = null;
  galaxyDetail.selectedNode = null;
  galaxyDetail.tracePath = null;
  holoCam.galaxyZoomScale = 1.0;
  const card = document.querySelector('#galaxy-node-card');
  if (card) card.hidden = true;
  updateGalaxyBackBar();
}

function loadGalaxyDetails(retry = false) {
  if (!truthNebula.release || galaxyDetail.data || /jsdom/i.test(navigator.userAgent || '')) return;
  if (galaxyDetail.status === 'loading') return galaxyDetail.request;
  if (galaxyDetail.status === 'failed' && !retry) return;
  galaxyDetail.status = 'loading';
  return galaxyDetail.request = fetchGalaxyDetails();
}

async function fetchGalaxyDetails() {
  try {
    const release = truthNebula.release || '';
    const resp = await fetch(`data/truth-nebula-details.v1.json?r=${encodeURIComponent(release.slice(-16))}`);
    const data = resp.ok ? await resp.json() : null;
    galaxyDetail.data = galaxyDetailsUsable(data, release, truthNebula.baseCount) ? data : null;
    galaxyDetail.status = galaxyDetail.data ? 'ready' : 'failed';
  } catch {
    galaxyDetail.status = 'failed';
  }
}

// ---- Clicking galaxies ---------------------------------------------------------
// Screen footprint of each named galaxy: the bounds of the middle 84% of its stars and up
// to 80 of their positions. The foundations belt circles the whole sky and has none.
function galaxyFootprints(stars, projX, projY, clusters, w, h) {
  const named = new Map((clusters || []).filter(c => c.name !== 'Other').map(c => [c.id, []]));
  for (let i = 0; i < stars.length; i++) {
    const list = named.get(stars[i][3]);
    const x = projX[i], y = projY[i];
    if (list && x > -40 && x < w + 40 && y > -40 && y < h + 40) list.push([x, y]);
  }
  const out = new Map();
  for (const [cid, pts] of named) {
    if (pts.length < 3) continue;
    const xs = pts.map(p => p[0]).sort((a, b) => a - b);
    const ys = pts.map(p => p[1]).sort((a, b) => a - b);
    const q = (arr, f) => arr[Math.min(arr.length - 1, Math.floor(arr.length * f))];
    const step = Math.max(1, Math.ceil(pts.length / 80));
    out.set(cid, { x0: q(xs, 0.08), x1: q(xs, 0.92), y0: q(ys, 0.08), y1: q(ys, 0.92), pts: pts.filter((_, k) => k % step === 0) });
  }
  return out;
}

// The galaxy under a point: within 48 px of its centre or name, or on its band within
// 26 px of one of its stars; the nearest wins.
function galaxyHitAt(x, y, projected, footprints) {
  let best = null;
  let bestD = Infinity;
  for (const [cid, info] of projected || []) {
    let d = Math.min(Math.hypot(x - info.x, y - info.y), Math.hypot(x - info.lx, y - info.ly));
    if (d >= 48) d = Infinity;
    const fp = footprints?.get(cid);
    if (fp && x >= fp.x0 - 14 && x <= fp.x1 + 14 && y >= fp.y0 - 14 && y <= fp.y1 + 14) {
      for (const [px, py] of fp.pts) {
        const ds = Math.hypot(x - px, y - py);
        if (ds < 26 && ds < d) d = ds;
      }
    }
    if (d < bestD) {
      bestD = d;
      best = info;
    }
  }
  return best;
}

// The galaxy the hover hint named, while the pointer stays where it was (4 px) for up to
// two seconds: labels and the sky sway a little between frames, and a click should do what
// the hint just said.
function hoveredGalaxyAt(record, x, y, now) {
  if (!record || now - record.t > 2000 || Math.hypot(x - record.x, y - record.y) > 4) return null;
  return record.cid;
}

// In the panorama a click on a galaxy, or on a conjecture lantern inside it, opens the
// galaxy; once a galaxy is open its lanterns are spread out and can be read.
function skyClickTarget(inGalaxyView, galaxyHit, lanternHit) {
  if (inGalaxyView && lanternHit) return 'lantern';
  if (galaxyHit || lanternHit) return 'galaxy';
  return null;
}

// Opening a node during a growth close-up pins that galaxy so the card stays readable.
function openGalaxyNode(node, shiftKey = false) {
  const now = performance.now();
  const prevStarIdx = galaxyDetail.selectedNode?.kind === 'star' ? galaxyDetail.selectedNode.idx : null;
  const manual = truthGrowth.manualFocus;
  if (!manual || manual.closing || manual.cid !== node.cid) {
    const cluster = truthNebula.clusters.find(c => c.id === node.cid);
    if (cluster) truthGrowth.manualFocus = { cid: node.cid, cluster, start: now - 1000, closing: false };
  }
  if (shiftKey && prevStarIdx != null && node.kind === 'star' && node.idx !== prevStarIdx) {
    // Shift+Click second star -> trace shortest proof path between Theorem A and Theorem B!
    galaxyDetail.tracePath = traceDagPath(prevStarIdx, node.idx, truthNebula.edges, galaxyDetail.data);
  } else {
    galaxyDetail.tracePath = null;
  }
  galaxyDetail.selectedKey = galaxyNodeKey(node);
  galaxyDetail.selectedNode = { kind: node.kind, idx: node.idx, module: node.module, cid: node.cid, nx: node.nx, ny: node.ny, nz: node.nz };
  holoCam.galaxyZoomScale = 1.0;
  const bounds = galaxyDetail.bounds || { left: 12, top: 116, right: window.innerWidth - 12, bottom: window.innerHeight - 80 };
  const links = node.kind === 'star' ? nodeLinks(node.idx) : null;  // used only when the details lack full counts
  const info = galaxyNodeInfo(node, galaxyDetail.data, truthNebula.clusters, links);
  info.canTrace = node.kind === 'star';
  info.starIdx = node.idx;
  renderGalaxyNodeCard(info, node.x, node.y, bounds);
  const row = node.kind === 'star' ? galaxyDetail.data?.stars?.[node.idx] : null;
  sciFiAudio.playNodeChord(row?.[6] ?? 1, row?.[7] ?? 1, row?.[4] ?? 4);
  updateGalaxyBackBar();
}
function galaxyWorldFrame(cid) {
  const gl = holoCam.gl;
  const cluster = truthNebula.clusters.find(c => c.id === cid);
  if (!gl || !cluster) return null;
  if (!holoCam.galaxyFrames) holoCam.galaxyFrames = new Map();
  const key = `${cid}:${truthNebula.stars.length}`;
  if (holoCam.galaxyFrames.has(key)) return holoCam.galaxyFrames.get(key);
  const c = gl.mapSkyPointBase(cluster.center[0] / 1000, cluster.center[1] / 1000, cluster.center[2] / 1000, cid);
  const spread = [];
  for (const s of truthNebula.stars) {
    if (s[3] !== cid) continue;
    const p = gl.mapSkyPointBase(s[0] / 1000, s[1] / 1000, s[2] / 1000, cid);
    spread.push(Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
  }
  spread.sort((a, b) => a - b);
  const frame = { center: c, radius: Math.max(0.6, spread.length ? spread[Math.floor(spread.length * 0.85)] : 1.2) };
  holoCam.galaxyFrames.set(key, frame);
  return frame;
}

// ?preview=growth[&galaxy=Quantum,Arith] plays marked preview growth so the close-up
// can be seen without waiting for a real freeze; preview growth never changes counts.
function previewGrowthRecords(domains) {
  const at = new Date().toISOString();
  return domains.flatMap((domain, i) => {
    const count = i === 0 ? 3 : 1;
    const recent = truthGrowth.recentRaw.filter(record => record.domain === domain && record.module);
    if (recent.length) return recent.slice(0, count).map(record => ({ ...record, preview: true }));
    const catalog = galaxyDetail.data?.stars.filter(row => row[0].split('/')[2] === domain).slice(0, count);
    if (catalog?.length) return catalog.map(([module]) => ({ module, domain, at, commit: 'preview', preview: true }));
    return Array.from({ length: count }, (_, k) => ({
      module: `D5/预览/${domain}/示例模块${k + 1}`, domain, stratum: '预览', at, commit: 'preview', preview: true
    }));
  });
}

function startGrowthPreview() {
  let domains = null;
  try {
    const query = new URLSearchParams(location.search);
    if (query.get('preview') === 'growth') domains = (query.get('galaxy') || 'Combinatorics,Quantum,Arith').split(',').map(s => s.trim()).filter(Boolean);
  } catch {}
  if (!domains?.length || /jsdom/i.test(navigator.userAgent || '')) return;
  const timer = setInterval(async () => {
    if (!truthNebula.loaded) return;
    clearInterval(timer);
    await loadGalaxyDetails();
    const play = () => {
      const g = truthGrowth;
      g.active = g.active.filter(event => !event.modules[0].preview);
      g.grown = g.grown.filter(star => !star.preview);
      g.queue = enqueueGrowth(g.queue.filter(item => !item.modules[0].preview),
        previewGrowthRecords(domains), truthNebula.clusters, performance.now());
      g.lastCid = null;
    };
    const replay = $('#growth-preview-replay');
    replay.hidden = false;
    replay.addEventListener('click', play);
    play();
  }, 500);
}

function stepTruthGrowth(now) {
  const g = truthGrowth;
  if (!truthNebula.loaded || (!g.queue.length && !g.active.length)) return g.active;
  const quiet = state.quiet || reduced;
  if (!g.active.length && introCinema.active && holoCam.gl && !quiet) return g.active;
  for (const event of g.active) {
    const { visible, gap } = event.timing;
    while (event.spawned < event.modules.length) {
      const due = GROWTH_SPAWN_START_MS + Math.min(event.spawned, visible - 1) * gap;
      if (!quiet && now - event.start < due) break;
      const born = quiet ? now - GROWTH_EDGE_MS : event.start + due;
      commitGrowth(event.modules[event.spawned], event.cid, born, event.spawned < visible, event.branches[event.spawned]);
      event.spawned++;
    }
  }
  g.active = g.active.filter(event => !quiet && now - event.start < event.timing.end);
  if (quiet) {
    for (const item of g.queue) {
      item.modules.forEach((record, i) => commitGrowth(record, growthClusterId(record.domain, truthNebula.clusters), now - GROWTH_EDGE_MS, i < GROWTH_VISIBLE_STARS));
    }
    g.queue = [];
    return g.active;
  }
  while (g.active.length < MAX_GROWTH_INSETS && g.queue.length) {
    for (const item of g.queue) {
      if (item.cid < 0) item.cid = growthClusterId(item.modules[0].domain, truthNebula.clusters);
    }
    const idx = nextGrowthFocus(g.queue, g.lastCid, g.active);
    if (idx < 0) break;
    const item = g.queue.splice(idx, 1)[0];
    const cluster = truthNebula.clusters.find(c => c.id === item.cid);
    if (!cluster) continue;
    const slot = g.active.some(event => event.slot === 0) ? 1 : 0;
    g.active.push({ cid: cluster.id, cluster, modules: item.modules, start: now, spawned: 0,
      timing: growthTiming(item.modules.length),
      branches: item.modules.slice(0, GROWTH_VISIBLE_STARS).map(record => growthBranch(record, cluster)), slot });
    g.lastCid = cluster.id;
  }
  return g.active;
}

function drawTruthGrowthStars(ctx, project, now, palette, isLight, coreClear, projX, projY, dim, sizeScale = 1) {
  for (const star of truthGrowth.grown) {
    const age = now - star.born;
    if (age < 0) continue;
    const [px, py] = project(star.x / 1000, star.y / 1000, star.z / 1000, star.cid);
    const mask = Math.max(0.25, coreClear(px, py));
    const col = palette[star.cid % palette.length];
    const d = dim(star.cid);
    const fresh = Math.max(0, 1 - age / 120000);
    const reach = growthEase(age / GROWTH_EDGE_MS);
    const sx = projX[star.parentIdx], sy = projY[star.parentIdx];
    ctx.strokeStyle = rgba(col, (0.38 + 0.5 * fresh) * mask * d);
    ctx.lineWidth = (0.9 + 0.9 * fresh) / sizeScale;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (px - sx) * reach, sy + (py - sy) * reach);
    ctx.stroke();
    const ignition = growthEase((age - GROWTH_EDGE_MS * 0.73) / (GROWTH_EDGE_MS * 0.48));
    if (ignition < 1) {
      const tx = sx + (px - sx) * reach, ty = sy + (py - sy) * reach;
      ctx.save();
      ctx.globalAlpha *= growthEase(age / 240) * (1 - ignition);
      ctx.shadowColor = rgba(col, 1);
      ctx.shadowBlur = 9;
      ctx.fillStyle = isLight ? rgba(col, 1) : '#fff4cd';
      ctx.beginPath();
      ctx.arc(tx, ty, 2.8 / sizeScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (ignition <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= ignition;
    const halo = (6 + 7 * fresh) / (sizeScale * sizeScale);
    const glow = ctx.createRadialGradient(px, py, 0, px, py, halo);
    glow.addColorStop(0, rgba(col, (0.35 + 0.45 * fresh) * mask * d));
    glow.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, halo, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isLight ? rgba(col, Math.min(1, (0.75 + 0.25 * fresh) * d)) : rgba([240, 255, 248], Math.min(1, (0.7 + 0.3 * fresh) * mask * d));
    ctx.beginPath();
    ctx.arc(px, py, (1.5 + 0.9 * fresh) / sizeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Reserve the two upper corners of the usable canvas. Keep an existing window
// in its corner when its neighbour finishes or another galaxy enters.
function growthInsetLayout(points, w, h, headroom = 0, launcher = null) {
  const compact = w < 550;
  const margin = compact ? 8 : 18;
  const y = compact || h > w ? 8 - headroom : Math.min(62, h * 0.12);
  const width = Math.round(Math.min(419, (w - 3 * margin) / 2, w * (compact ? 0.49 : 0.42)));
  const height = Math.round(Math.min(width * (compact ? 1.22 : 0.74), h * (compact ? 0.61 : 0.40)));
  const corners = [margin, w - margin - width].map((x, placement) => {
    // A high galaxy can pass behind a corner during an orbit. Leave room for
    // its arrow by trimming the window or docking just below the high source.
    const gap = compact ? 14 : 22;
    const column = points.filter(p => p.x > x - gap && p.x < x + width + gap)
      .sort((a, b) => a.y - b.y);
    let top = y, available = height;
    if (launcher && launcher.left < x + width && launcher.right > x &&
        launcher.top < top + height && launcher.bottom > top) {
      const above = launcher.top - 8 - top;
      if (above >= Math.min(height, compact ? 95 : 110)) available = above;
      else top = launcher.bottom + 8;
    }
    for (const point of column) {
      if (point.y < top - gap || point.y > top + available + gap) continue;
      const above = point.y - gap - top;
      if (above >= Math.min(height, compact ? 95 : 110)) {
        available = above;
        break;
      }
      top = point.y + gap;
    }
    return { x, y: top, width, height: available, placement };
  });
  if (!points.length) return [];
  const [first, second] = points;
  const nearest = first.x < w / 2 ? 0 : 1;
  if (!second) return [corners[first.placement ?? nearest]];
  const side = first.placement ?? (second.placement !== undefined ? 1 - second.placement : Number(first.x > second.x));
  return [corners[side], corners[1 - side]];
}

// Clip the leader to the usable scene when an orbit carries its source off screen.
function growthPointer(box, point, w, h) {
  const x = Math.max(box.x, Math.min(box.x + box.width, point.x));
  const y = Math.max(box.y, Math.min(box.y + box.height, point.y));
  const dx = point.x - x, dy = point.y - y;
  const tx = dx > 0 ? (w - 4 - x) / dx : dx < 0 ? (4 - x) / dx : Infinity;
  const ty = dy > 0 ? (h - 4 - y) / dy : dy < 0 ? (4 - y) / dy : Infinity;
  return { x, y, angle: Math.atan2(dy, dx), length: Math.max(0, Math.hypot(dx, dy) * Math.min(1, tx, ty) - 2) };
}

// Wrap identifiers at word boundaries when possible. A long unbroken word can
// still use the full width of a phone lens.
function growthNameLines(ctx, name, width) {
  if (ctx.measureText(name).width <= width) return [name];
  const words = name.split(/(?<=[a-z0-9])(?=[A-Z])/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && ctx.measureText(line + word).width > width) {
      lines.push(line);
      line = '';
    }
    if (ctx.measureText(word).width <= width) {
      line += word;
      continue;
    }
    for (const ch of word) {
      if (line && ctx.measureText(line + ch).width > width) {
        lines.push(line);
        line = '';
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawGrowthMarks(ctx, branches, bounds, isLight, detail) {
  const visible = branches.filter(b => b.progress > 0);
  if (!visible.length) return;
  const gold = isLight ? '#835209' : '#ffcf72';
  const halo = isLight ? '#f8f2e7' : '#0c1623';
  ctx.save();
  ctx.beginPath();
  ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.font = detail ? '600 12px system-ui, sans-serif' : '600 10px ui-monospace, sans-serif';
  const labels = [];
  for (const b of visible) {
    const x = b.sx + (b.ex - b.sx) * b.progress, y = b.sy + (b.ey - b.sy) * b.progress;
    ctx.globalAlpha = b.opacity;
    ctx.beginPath();
    ctx.moveTo(b.sx, b.sy); ctx.lineTo(x, y);
    ctx.strokeStyle = halo; ctx.lineWidth = detail ? 3.6 : 2.8; ctx.stroke();
    ctx.strokeStyle = gold; ctx.lineWidth = detail ? 1.8 : 1.3; ctx.stroke();
    const r = detail ? 4.3 : 3;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
    ctx.fillStyle = halo; ctx.fill(); ctx.stroke();
    const full = shortModuleName(b.module);
    const lines = detail ? growthNameLines(ctx, full, Math.min(220, bounds.right - bounds.left - 16))
      : [L('新 · ', 'New · ') + (full.length > 16 ? full.slice(0, 15) + '…' : full)];
    if (!lines.length) continue;
    labels.unshift({ x, y, lines, opacity: b.opacity, keepInside: detail,
      w: Math.max(...lines.map(s => ctx.measureText(s).width)) + 5, h: 15 * lines.length });
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const tips = detail ? labels.map(({ x, y }) => ({ lx: x - 4, ly: y - 4, w: 8, h: 8 })) : [];
  for (const label of planGalaxyLabels(labels, detail ? 3 : 1, bounds, tips)) {
    ctx.globalAlpha = label.opacity;
    const tx = label.lx + 2;
    ctx.beginPath(); ctx.moveTo(label.x, label.y);
    ctx.lineTo(Math.max(label.lx, Math.min(label.x, label.lx + label.w)),
      Math.max(label.ly, Math.min(label.y, label.ly + label.h)));
    ctx.strokeStyle = gold; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.strokeStyle = halo; ctx.lineWidth = 3; ctx.fillStyle = gold;
    label.lines.forEach((line, i) => {
      const ty = label.ly + 15 * (i + 0.5);
      ctx.strokeText(line, tx, ty);
      ctx.fillText(line, tx, ty);
    });
  }
  ctx.restore();
}

// Take only the broad sky colours from the main frame. All identifiable stars,
// filaments, growing branches and light rays are drawn from geometry in each lens.
let growthSkyWash;
function sampleGrowthSky(layers, w, h) {
  growthSkyWash ??= document.createElement('canvas');
  const width = Math.max(1, Math.ceil(w / 16)), height = Math.max(1, Math.ceil(h / 16));
  if (growthSkyWash.width !== width || growthSkyWash.height !== height) {
    growthSkyWash.width = width;
    growthSkyWash.height = height;
  }
  const ctx = growthSkyWash.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  for (const layer of layers) ctx.drawImage(layer, 0, 0, width, height);
  return growthSkyWash;
}

function drawMagnifiedStars(ctx, scene, x, y, width, height, zoom, isLight) {
  const { stars, edges, projX, projY, projZ } = scene.nebula;
  const right = x + width, bottom = y + height;
  const scale = Math.sqrt(zoom);
  ctx.lineWidth = 0.55 / scale;
  for (const [u, v, bridge] of edges) {
    if (bridge || projZ[u] === 999 || projZ[v] === 999 || stars[u][3] !== stars[v][3]) continue;
    const ax = projX[u], ay = projY[u], bx = projX[v], by = projY[v];
    if (Math.max(ax, bx) < x || Math.min(ax, bx) > right || Math.max(ay, by) < y || Math.min(ay, by) > bottom) continue;
    ctx.strokeStyle = rgba(scene.palette[stars[u][3] % scene.palette.length], 0.17);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  for (let i = 0; i < stars.length; i++) {
    const px = projX[i], py = projY[i];
    if (projZ[i] === 999 || px < x - 4 || px > right + 4 || py < y - 4 || py > bottom + 4) continue;
    const [, , , cid, generation, degree] = stars[i];
    const col = scene.palette[cid % scene.palette.length];
    const r = (degree >= 7 ? 0.95 : degree >= 3 ? 0.68 : 0.47) / scale;
    ctx.fillStyle = rgba(col, 0.07);
    ctx.beginPath(); ctx.arc(px, py, r * 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(!isLight && degree >= 7 ? [206, 218, 232] : col, 0.48 + 0.22 * generation / 100);
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawGrowthDetail(canvas, box, point, footprint, scene, emissions, branches = [], isLight = false) {
  const { width, height } = box;
  const dpr = window.devicePixelRatio || 1;
  const pw = Math.round(width * dpr), ph = Math.round(height * dpr);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(pw / width, 0, 0, ph / height, 0, 0);
  ctx.fillStyle = isLight ? '#eff2ee' : '#081321';
  ctx.fillRect(0, 0, width, height);
  const span = footprint ? Math.hypot(footprint.x1 - footprint.x0, footprint.y1 - footprint.y0) : 50;
  let cx = point.x, cy = point.y;
  let zoom = Math.max(1.8, Math.min(width < 200 ? 2.2 : 2.8, width / Math.max(36, span * 1.4)));
  if (branches.length) {
    const xs = branches.flatMap(b => [b.sx, b.ex]), ys = branches.flatMap(b => [b.sy, b.ey]);
    const left = Math.min(...xs), right = Math.max(...xs), topEdge = Math.min(...ys), low = Math.max(...ys);
    cx = (left + right) / 2;
    cy = (topEdge + low) / 2;
    zoom = Math.min(5, (width - 26) / Math.max(1, right - left), Math.max(14, height - 28) / Math.max(1, low - topEdge));
  }
  const sw = width / zoom, sh = height / zoom;
  const sx = cx - sw / 2, sy = cy - sh / 2;
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-sx, -sy);
  ctx.globalAlpha = isLight ? 0.34 : 0.52;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scene.skyWash, 0, 0, scene.width, scene.height);
  ctx.globalAlpha = 1;
  drawMagnifiedStars(ctx, scene, sx, sy, sw, sh, zoom, isLight);
  scene.paintGrowth(ctx, zoom);
  for (const light of emissions) {
    if (light.p.x + light.size / 2 < sx || light.p.x - light.size / 2 > sx + sw ||
        light.p.y + light.size / 2 < sy || light.p.y - light.size / 2 > sy + sh) continue;
    paintGrowthLight(ctx, light, isLight, zoom);
  }
  ctx.restore();
  const inLens = branches.map(b => ({ ...b,
    sx: (b.sx - sx) * zoom, sy: (b.sy - sy) * zoom,
    ex: (b.ex - sx) * zoom, ey: (b.ey - sy) * zoom }));
  drawGrowthMarks(ctx, inLens, { left: 0, right: width, top: 0, bottom: height }, isLight, true);
}

// The glow uses the projected star band as its aperture, including its tilt when
// the observer orbits. Keep a small core for sparse or edge-on galaxies.
function drawGrowthLight(canvas, p, footprint, age, timing, w, isLight) {
  const size = w < 550 ? 204 : 336;
  const x = p.x - size / 2, y = p.y - size / 2;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pixels = Math.round(size * dpr);
  if (canvas.width !== pixels || canvas.height !== pixels) { canvas.width = pixels; canvas.height = pixels; }
  Object.assign(canvas.style, { width: size + 'px', height: size + 'px', left: x + 'px', top: y + 'px' });
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, -x * dpr, -y * dpr);
  ctx.clearRect(x, y, size, size);
  const light = { p, footprint, age, timing, size };
  paintGrowthLight(ctx, light, isLight);
  return light;
}

function paintGrowthLight(ctx, { p, footprint, age, timing, size }, isLight, zoom = 1) {
  const crest = growthEase((age - timing.pulse + 1200) / 850)
    * (1 - growthEase((age - timing.pulse - 650) / 1200));
  const strength = growthFocusAmount(age, timing) * (0.76 + 0.24 * crest);
  if (strength < 0.002) return;
  const stars = footprint?.pts || [];
  let xx = 0, yy = 0, xy = 0, count = 0;
  for (const [x, y] of stars) {
    if (x < footprint.x0 || x > footprint.x1 || y < footprint.y0 || y > footprint.y1) continue;
    const dx = x - p.x, dy = y - p.y;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
    count++;
  }
  const tilt = 0.5 * Math.atan2(2 * xy, xx - yy);
  const spread = Math.hypot(xx - yy, 2 * xy);
  const major = Math.min(116, 27 + 2.9 * Math.sqrt((xx + yy + spread) / (2 * (count || 1))));
  const minor = Math.min(42, 14 + 2.9 * Math.sqrt(Math.max(0, xx + yy - spread) / (2 * (count || 1))));

  ctx.save();
  ctx.globalCompositeOperation = isLight ? 'source-over' : 'screen';
  ctx.translate(p.x, p.y);
  ctx.rotate(tilt);
  const hot = isLight ? rgba(p.col, 1) : rgba(p.col.map((c, i) => Math.round(c * 0.68 + [216, 210, 205][i] * 0.32)), 1);
  const beam = Math.min(size * 0.46, Math.max(major * 1.5, size * 0.30)) * (0.77 + 0.23 * crest);

  ctx.save();
  ctx.scale(major, minor * 0.68);
  const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  // Preserve the gaps between star cores even over the sky's existing bloom.
  const backdrop = isLight ? [245, 247, 244] : [5, 15, 25];
  haze.addColorStop(0, rgba(backdrop, 0.29));
  haze.addColorStop(0.45, rgba(backdrop, 0.18));
  haze.addColorStop(1, rgba(backdrop, 0));
  ctx.globalAlpha = strength;
  ctx.fillStyle = haze;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  // Keep the ray transparent through the crowded core. The bright tips travel
  // along its wings where they can signal growth without covering the nodes.
  const travel = growthEase((age - GROWTH_SPAWN_START_MS) / Math.max(1, timing.pulse - GROWTH_SPAWN_START_MS));
  const tip = 0.18 + 0.20 * travel;
  const ray = ctx.createLinearGradient(-beam, 0, beam, 0);
  ray.addColorStop(0, rgba(p.col, 0));
  ray.addColorStop(0.46 - tip, rgba(p.col, 0.12));
  ray.addColorStop(0.5 - tip, hot);
  ray.addColorStop(0.57 - tip, rgba(p.col, 0.38));
  ray.addColorStop(0.5, rgba(p.col, 0.18));
  ray.addColorStop(0.43 + tip, rgba(p.col, 0.38));
  ray.addColorStop(0.5 + tip, hot);
  ray.addColorStop(0.54 + tip, rgba(p.col, 0.12));
  ray.addColorStop(1, rgba(p.col, 0));
  ctx.strokeStyle = ray;
  ctx.globalAlpha = strength * 0.62;
  ctx.lineWidth = (0.9 + 0.35 * crest) / Math.sqrt(zoom);
  ctx.beginPath();
  ctx.moveTo(-beam, 0);
  ctx.lineTo(beam, 0);
  ctx.stroke();
  ctx.restore();

  // Each star catches the light once, with a delay set by its distance from the core.
  ctx.save();
  ctx.globalCompositeOperation = isLight ? 'source-over' : 'screen';
  ctx.fillStyle = hot;
  for (const [x, y] of stars) {
    const distance = Math.hypot(x - p.x, y - p.y) / major;
    if (distance > 1.1) continue;
    const delay = timing.pulse - 520 + 900 * distance;
    const flash = Math.exp(-Math.pow((age - delay) / 350, 2));
    const light = strength * (0.25 + 0.34 * flash) * (1 - distance / 1.2);
    if (light < 0.03) continue;
    ctx.globalAlpha = light;
    ctx.beginPath();
    ctx.arc(x, y, (0.65 + 0.45 * flash) / Math.sqrt(zoom), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function growthInsetOpacity(age, timing) {
  return growthEase(age / 520) * (1 - growthEase((age - timing.end + 650) / 650));
}

function drawGrowthObservations(events, projected, w, h, now, isLight, scene) {
  const layer = $('#growth-observations');
  const visible = events.filter(event => {
    const point = projected.get(event.cid);
    return point && point.z !== 999;
  });
  layer.hidden = !visible.length;
  if (layer.hidden) return;
  if (!layer.children.length) {
    const template = $('#growth-observation-template');
    for (let i = 0; i < MAX_GROWTH_INSETS; i++) layer.append(template.content.cloneNode(true));
  }
  const sources = visible.map(event => ({ ...projected.get(event.cid), placement: event.placement }));
  const headroom = w < 550 ? parseFloat(getComputedStyle(layer.parentElement).marginTop) || 0 : 0;
  const board = layer.parentElement.getBoundingClientRect();
  const pill = $('#nyx-assistant').getBoundingClientRect();
  const boxes = growthInsetLayout(sources, w, h, headroom, {
    left: pill.left - board.left, right: pill.right - board.left,
    top: pill.top - board.top, bottom: pill.bottom - board.top
  });
  for (let i = 0; i < layer.children.length; i++) {
    layer.children[i].hidden = !visible.some(event => event.slot === i);
  }
  const emissions = visible.map((event, i) => drawGrowthLight(
    layer.children[event.slot].querySelector('.growth-emission'), sources[i], holoCam.galaxyFootprints.get(event.cid),
    now - event.start, event.timing, w, isLight));
  const mapMarks = [];
  visible.forEach((event, i) => {
    const point = sources[i], box = boxes[i];
    const age = now - event.start;
    event.placement = box.placement;
    const opacity = growthInsetOpacity(age, event.timing);
    const view = layer.children[event.slot];
    const panel = view.querySelector('.growth-inset');
    Object.assign(panel.style, { width: box.width + 'px', height: box.height + 'px',
      left: box.x + 'px', top: box.y + 'px', opacity: opacity.toFixed(3) });
    const arrow = growthPointer(box, point, w, h);
    const pointer = view.querySelector('.growth-pointer');
    Object.assign(pointer.style, { left: arrow.x + 'px', top: (arrow.y - 0.75) + 'px',
      width: arrow.length + 'px', transform: 'rotate(' + arrow.angle + 'rad)', opacity: opacity.toFixed(3) });
    const title = event.cluster.name === 'Other' ? event.modules[0].domain : langGalaxyName(event.cluster);
    const latest = event.modules[event.spawned - 1];
    const description = event.modules[0].preview ? L('增长预览', 'Growth preview') : L('星系增长', 'Galaxy growth');
    panel.setAttribute('aria-label', [title, description, latest && shortModuleName(latest.module)].filter(Boolean).join(' · '));
    const branches = [];
    event.branches.forEach((b, k) => {
      if (!b) return;
      const [ex, ey] = scene.project(b.x / 1000, b.y / 1000, b.z / 1000, event.cid);
      const elapsed = age - GROWTH_SPAWN_START_MS - k * event.timing.gap;
      branches.push({ sx: truthNebula.projX[b.parentIdx], sy: truthNebula.projY[b.parentIdx], ex, ey,
        progress: growthEase(elapsed / GROWTH_EDGE_MS), opacity: opacity * growthEase(elapsed / 200), module: event.modules[k].module });
    });
    drawGrowthDetail(panel, box, point, holoCam.galaxyFootprints.get(event.cid), scene, emissions, branches, isLight);
    mapMarks.push(branches);
  });
  for (const branches of mapMarks) drawGrowthMarks(scene.ctx, branches,
    { left: 1, right: w, top: 4, bottom: h - 40 }, isLight, false);
}

function drawTruthDagNebula(ctx, w, h, t, isLight, isBlueprint, growthEvents, nowMs) {
  if (!truthNebula.loaded || !truthNebula.stars.length) return;
  const useGLSky = Boolean(holoCam.gl);
  const skyVis = useGLSky ? Math.max(0, Math.min(1.15, holoCam.galaxyAlpha)) : 1.0;
  if (useGLSky && skyVis < 0.06) {
    $('#growth-observations').hidden = true;
    holoCam.projectedGalaxies.clear();
    return;
  }
  const stars = truthNebula.stars;
  const edges = truthNebula.edges;
  const clusters = truthNebula.clusters;
  const clusterLinks = truthNebula.clusterLinks;
  const n = stars.length;
  const projX = truthNebula.projX;
  const projY = truthNebula.projY;
  const projZ = truthNebula.projZ;
  const projLit = truthNebula.projLit;

  const nebPalette = isBlueprint
    ? [
        [34, 255, 122], [74, 255, 158], [148, 255, 114], [26, 224, 128],
        [92, 255, 174], [48, 242, 136], [168, 255, 124], [34, 192, 108]
      ]
    : isLight
      ? [
          [8, 96, 92], [10, 82, 138], [142, 74, 12], [66, 48, 146],
          [12, 102, 82], [24, 72, 148], [134, 78, 16], [36, 78, 94]
        ]
      : [
          [142, 182, 224], // 0 Combinatorics: cool blue-white
          [154, 190, 232], // 1 Quantum: pale sapphire
          [202, 188, 154], // 2 Arith: muted warm starlight
          [174, 164, 218], // 3 ConceptDynamics: soft violet
          [146, 198, 186], // 4 Analytic: pale mint
          [160, 184, 224], // 5 Weil: quiet periwinkle
          [208, 178, 164], // 6 Observer: dusty rose-white
          [158, 184, 216]  // 7 Foundations Belt: silver-blue
        ];

  const quiet = state.quiet || reduced;
  const tEff = quiet ? 4.2 : t;
  const isZenHud = $('#research-room')?.classList.contains('is-hud-zen');
  const rightGutter = (w >= 1120 && !isZenHud) ? (w <= 1320 ? 274 : 298) : 0;
  // Calm astronomical parallax (used only in legacy 2D fallback)
  const nebYaw = holoCam.yaw * 0.22;
  const nebPitch = 0.05 + (holoCam.pitch - 0.66) * 0.14;
  const cY = Math.cos(nebYaw), sY = Math.sin(nebYaw);
  const cP = Math.cos(nebPitch), sP = Math.sin(nebPitch);

  const cx = (w - rightGutter) * 0.5;
  const cy = useGLSky ? h * 0.24 : h * 0.50;
  const scaleX = w * 0.412;
  const scaleY = h * 0.440;
  const camZ = 2.65;

  const projectBase = useGLSky
    ? (nx, ny, nz, cid = null) => {
        const [wx, wy, wz] = holoCam.gl.mapSkyPoint(nx, ny, nz, cid);
        const p = holoCam.gl.project(wx, wy, wz);
        if (!p) return [-9999, -9999, 999, 0];
        return [p.x, p.y, p.z, Math.min(1.65, 22.0 / Math.max(8, p.z))];
      }
    : (nx, ny, nz) => {
        const x1 = nx * cY - nz * sY;
        const z1 = nx * sY + nz * cY;
        const y2 = ny * cP - z1 * sP;
        const z2 = ny * sP + z1 * cP + camZ;
        const inv = 1.85 / Math.max(0.65, z2);
        return [cx + x1 * scaleX * inv, cy - y2 * scaleY * inv, z2, inv];
      };

  const growthNow = nowMs;
  const manual = truthGrowth.manualFocus;
  const growthFocus = manual;
  const focusK = !manual ? 0 : manual.closing ? 1 - growthEase((growthNow - manual.closeStart) / 480)
    : growthEase((growthNow - manual.start) / 650);
  if (manual?.closing && focusK <= 0.001) {
    truthGrowth.manualFocus = null;
  }
  let focusTx = 0, focusTy = 0, lensR = 0;
  // Only manual exploration in the software renderer needs a magnifying lens.
  const lensD = useGLSky ? 0 : GROWTH_LENS * focusK;
  if (focusK > 0) {
    const c = growthFocus.cluster.center;
    const rim = (growthFocus.cluster.radius || 200) / 1000;
    [focusTx, focusTy] = projectBase(c[0] / 1000, c[1] / 1000, c[2] / 1000, growthFocus.cid);
    const [edgeX, edgeY] = projectBase(c[0] / 1000 + rim, c[1] / 1000, c[2] / 1000, growthFocus.cid);
    lensR = Math.max(105, Math.min(Math.min(w, h) * 0.25, Math.hypot(edgeX - focusTx, edgeY - focusTy) * 1.75));
  }
  const projectNeb = lensD > 0
    ? (nx, ny, nz, cid = null) => {
        const p = projectBase(nx, ny, nz, cid);
        const [x, y, m] = growthLensWarp(p[0], p[1], focusTx, focusTy, lensR, lensD);
        return [x, y, p[2], p[3] * Math.min(1.8, m)];
      }
    : projectBase;
  const lensScale = (px, py) => {
    if (focusK <= 0) return 1;
    const d = Math.hypot(px - focusTx, py - focusTy);
    return d < lensR ? 1 + 0.9 * focusK * (1 - d / lensR) : 1;
  };
  const growthDim = cid => (focusK <= 0 ? 1 : cid === growthFocus.cid ? 1 + 0.45 * focusK : 1);

  // PURE BACKGROUND SEPARATION MASK: in 3D WebGL mode the galaxies live natively in Stratum 3 (overhead sky vault),
  // so no artificial center cutout is needed! In 2D fallback mode, keep the center clear around the diagram.
  const coreClear = useGLSky
    ? () => 1.0
    : (px, py) => {
        const dx = (px - w * 0.5) / (w * 0.245);
        const dy = (py - h * 0.50) / (h * 0.265);
        const d = Math.hypot(dx, dy);
        if (d <= 0.72) return 0.06;
        if (d >= 1.18) return 1.0;
        const u = (d - 0.72) / 0.46;
        return 0.06 + 0.94 * (u * u * (3 - 2 * u));
      };
  const maskFor = (cid, px, py) => (focusK > 0 && cid === growthFocus.cid ? Math.max(coreClear(px, py), 0.78 * focusK) : coreClear(px, py));

  // Pre-project all mathematical galaxy centroids (use REAL atlas-branched-dag-v5 3D centroids in full Cosmos DAG mode!)
  const inFullAtlas = Boolean(
    useGLSky && truthAtlasFull.loaded && holoCam.fullAtlasAlpha > 0.35 && holoCam.galaxyMainCid == null && focusK < 0.05
  );
  const atlasCenters = truthAtlasFull.data?.centers || null;
  const clProj = new Map();
  for (const cl of clusters) {
    let px, py, pz, inv;
    const ac = inFullAtlas && atlasCenters ? atlasCenters[String(cl.id)] : null;
    if (ac && holoCam.gl.mapAtlasPoint) {
      const [wx, wy, wz] = holoCam.gl.mapAtlasPoint(ac[0] / 1000, ac[1] / 1000, ac[2] / 1000);
      const p = holoCam.gl.project(wx, wy, wz);
      if (p) {
        px = p.x; py = p.y; pz = p.z; inv = Math.min(1.65, 22.0 / Math.max(8, p.z));
      } else {
        px = -9999; py = -9999; pz = 999; inv = 0;
      }
    } else {
      [px, py, pz, inv] = projectNeb(cl.center[0] / 1000, cl.center[1] / 1000, cl.center[2] / 1000, cl.id);
    }
    clProj.set(cl.id, { cl, x: px, y: py, z: pz, inv, col: nebPalette[cl.id % nebPalette.length] });
  }

  const focusCid = focusK > 0.05 ? growthFocus?.cid : holoCam.hoveredGalaxy;
  const webCid = useGLSky && holoCam.galaxyMainCid != null ? null : focusCid;
  const recentBucket = cid => truthGrowth.recentByCluster.get(cid);
  const clusterEmphasis = cid => {
    if (focusK > 0.05 && cid === growthFocus?.cid) return 1.50;
    if (holoCam.hoveredGalaxy != null) return cid === holoCam.hoveredGalaxy ? 1.40 : 0.46;
    return recentBucket(cid)?.count ? 1.18 : 0.68;
  };

  // PASS 0: Project ring Truth DAG stars (skipped when Full 18,986-Node GPU Real Atlas DAG owns the stage!)
  if (inFullAtlas) {
    holoCam.galaxyFootprints = new Map();
  } else {
    for (let i = 0; i < n; i++) {
      const s = stars[i];
      const hasGrowth = Boolean(recentBucket(s[3])?.count);
      let nx = s[0] / 1000, ny = s[1] / 1000, nz = s[2] / 1000;
      if (hasGrowth && !quiet) {
        const cl = clProj.get(s[3])?.cl;
        if (cl && cl.name !== 'Other') {
          const gen = s[4] / 100;
          const swell = 1.0 + gen * 0.045 * (0.5 + 0.5 * Math.sin(tEff * 0.42 + s[3] * 1.1));
          const cx3 = cl.center[0] / 1000, cy3 = cl.center[1] / 1000, cz3 = cl.center[2] / 1000;
          nx = cx3 + (nx - cx3) * swell;
          ny = cy3 + (ny - cy3) * swell;
          nz = cz3 + (nz - cz3) * swell;
        }
      }
      const [px, py, pz] = projectNeb(nx, ny, nz, s[3]);
      projX[i] = px;
      projY[i] = py;
      projZ[i] = pz;
      projLit[i] = 0;
    }
    // Where each named galaxy's stars lie on screen, so a click anywhere on its band opens it.
    holoCam.galaxyFootprints = galaxyFootprints(stars, projX, projY, clusters, w, h);
  }

  ctx.save();
  if (useGLSky) ctx.globalAlpha = Math.min(1.0, skyVis);

  // PASS 1: Subtle Deep-Space Nebula Dust Clouds (2D fallback only) + Whisper-Thin Outward Frontier Arcs on Growing Galaxies
  for (const { cl, x: px, y: py, inv, col } of clProj.values()) {
    if (cl.name === 'Other') continue;
    const delta = recentBucket(cl.id)?.count || 0;
    const hasGrowth = delta > 0;
    if (!useGLSky) {
      const weight = Math.min(1.38, 0.78 + Math.sqrt((cl.count || 500) / 1600) * 0.45);
      const swell = (hasGrowth && !quiet) ? (1.0 + 0.055 * Math.sin(tEff * 0.45 + cl.id * 1.3)) : 1.0;
      const rad = Math.min(w, h) * (hasGrowth ? 0.21 : 0.15) * weight * inv * swell;
      const g = ctx.createRadialGradient(px, py, 6, px, py, rad);
      const event = growthEvents.find(item => item.cid === cl.id);
      const cloudOpacity = event ? 1 - 0.945 * growthInsetOpacity(growthNow - event.start, event.timing) : 1;
      const baseA = cloudOpacity * (isLight ? (hasGrowth ? 0.048 : 0.018) : (hasGrowth ? 0.072 : 0.028)) * maskFor(cl.id, px, py) * Math.min(1.25, clusterEmphasis(cl.id));
      g.addColorStop(0, rgba(col, baseA));
      g.addColorStop(0.50, rgba(col, baseA * 0.42));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Single whisper-thin outward-facing horizon ripple ONLY on fast-growing galaxies
    if (delta >= 8 && !quiet && focusK < 0.4 && px > -40 && px < w + 40 && py > -40 && py < h + 40) {
      const outAng = Math.atan2(py - cy, px - cx);
      const u = (tEff * 0.072 + cl.id * 0.31) % 1;
      const rRing = (22 + u * Math.min(w, h) * 0.095) * inv;
      const env = Math.sin(u * Math.PI);
      const alphaRing = env * env * (isLight ? 0.18 : 0.24) * maskFor(cl.id, px, py);
      if (alphaRing > 0.008) {
        const halfSpan = 1.15;
        const arcSegs = 10;
        for (let s = 0; s < arcSegs; s++) {
          const f0 = s / arcSegs, f1 = (s + 1) / arcSegs;
          const taper = Math.sin(((f0 + f1) * 0.5) * Math.PI);
          const segA = alphaRing * taper * taper;
          if (segA < 0.005) continue;
          ctx.strokeStyle = rgba(col, segA);
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.arc(px, py, rRing, outAng - halfSpan + f0 * halfSpan * 2, outAng - halfSpan + f1 * halfSpan * 2);
          ctx.stroke();
        }
      }
    }
  }

  // PASS 2: Single Ultra-Faint Deep-Space Outer Expansion Horizon (2D fallback only)
  const waveColor = isBlueprint ? [150, 215, 255] : isLight ? [24, 110, 120] : [132, 194, 224];
  if (!quiet && !useGLSky) {
    const uOuter = (tEff * 0.042) % 1;
    const radScale = 0.88 + uOuter * 0.28;
    const env = Math.sin(uOuter * Math.PI);
    const outerA = env * env * (isLight ? 0.08 : 0.085);
    if (outerA > 0.005) {
      ctx.strokeStyle = rgba(waveColor, outerA);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.435 * radScale, h * 0.435 * radScale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // PASS 3: INTER-GALAXY PERIMETER ARCS — illuminate on hover/close-up in ring mode (omitted in full 18,986-node DAG where real edges shine!)
  const bridgeLabels = [];
  const isPureGalaxyView = state.layer === 'galaxy' && holoCam.galaxyMainCid == null && focusK < 0.05;
  if (!inFullAtlas && (webCid != null || isPureGalaxyView)) {
    const ringRx = w * 0.35;
    const ringRy = h * 0.39;
    const namedLinks = clusterLinks.filter(([u, v, count]) => {
      const cu = clProj.get(u)?.cl, cv = clProj.get(v)?.cl;
      if (!cu || !cv || cu.name === 'Other' || cv.name === 'Other') return false;
      if (webCid != null) return u === webCid || v === webCid;
      return (count || 0) >= 12;
    });
    for (let i = 0; i < namedLinks.length; i++) {
      const [fromId, toId, count] = namedLinks[i];
      const a = clProj.get(fromId), b = clProj.get(toId);
      if (!a || !b) continue;
      const angA = Math.atan2((a.y - cy) / ringRy, (a.x - cx) / ringRx);
      const angB = Math.atan2((b.y - cy) / ringRy, (b.x - cx) / ringRx);
      let diff = angB - angA;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > 2.65) continue;
      const segs = 20;
      const pts = [];
      const rBoost = 1.0 + Math.min(0.14, Math.abs(diff) * 0.06);
      for (let s = 0; s <= segs; s++) {
        const u = s / segs;
        const ang = angA + diff * u;
        const arch = Math.sin(u * Math.PI);
        pts.push([
          (a.x * (1 - u) + b.x * u) * (1 - arch * 0.62) + (cx + Math.cos(ang) * ringRx * rBoost) * (arch * 0.62),
          (a.y * (1 - u) + b.y * u) * (1 - arch * 0.62) + (cy + Math.sin(ang) * ringRy * rBoost) * (arch * 0.62)
        ]);
      }
      const strength = Math.min(1.0, Math.log1p(count) / Math.log1p(140));
      const baseA = webCid != null ? (isLight ? 0.36 : 0.28) : (isLight ? 0.14 : 0.09);
      const alpha = baseA + strength * (webCid != null ? 0.15 : 0.05);
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, rgba(a.col, alpha));
      grad.addColorStop(1, rgba(b.col, alpha));
      ctx.strokeStyle = grad;
      ctx.lineWidth = (webCid != null ? 1.0 : 0.65) + strength * (webCid != null ? 0.65 : 0.25);
      ctx.beginPath();
      pts.forEach(([px, py], idx) => idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
      ctx.stroke();
      // Gentle traveling dependency light-mote along each real inter-galaxy arc in 星系 mode
      if (!quiet && pts.length > 2) {
        const f = (tEff * (0.14 + (i % 3) * 0.03) + i * 0.23) % 1;
        const idxF = Math.min(pts.length - 1, Math.floor(f * (pts.length - 1)));
        const mp = pts[idxF];
        ctx.fillStyle = isLight ? rgba(a.col, 0.85) : rgba([238, 248, 255], Math.min(0.48, alpha * 1.8));
        ctx.beginPath();
        ctx.arc(mp[0], mp[1], 1.4 + strength * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      // Show numeric dependency weight pill ONLY when hovering a galaxy so open cosmic space stays uncluttered!
      if (webCid != null && i < 6 && pts.length > 10 && count >= 34) {
        const midPt = pts[Math.floor(pts.length / 2)];
        if (midPt[0] > 40 && midPt[0] < w - rightGutter - 40 && midPt[1] > 80 && midPt[1] < h - 90) {
          bridgeLabels.push({ midPt, count, col: a.col });
        }
      }
    }
  }

  // Skip extra 2D hub circles in Cosmos since Tier 4 345+ hubs already render larger with 4-point star glint natively in WebGL2!
  if (false) {
    const hubsPerCid = new Map();
    for (let i = 0; i < (truthNebula.baseCount || n); i++) {
      const cid = stars[i][3];
      if (cid === 7) continue;
      const deg = stars[i][5] || 0;
      if (deg < 5) continue;
      let arr = hubsPerCid.get(cid);
      if (!arr) { arr = []; hubsPerCid.set(cid, arr); }
      arr.push({ i, deg });
    }
    const boostVis = Math.min(1, (holoCam.galaxyBoost - 0.35) / 0.65);
    for (const [cid, arr] of hubsPerCid) {
      arr.sort((a, b) => b.deg - a.deg);
      const col = nebPalette[cid % nebPalette.length];
      for (const hItem of arr.slice(0, 6)) {
        const hx = projX[hItem.i], hy = projY[hItem.i];
        if (!Number.isFinite(hx) || hx < 18 || hx > w - rightGutter - 16 || hy < 58 || hy > h - 68) continue;
        ctx.strokeStyle = rgba(col, (isLight ? 0.48 : 0.62) * boostVis);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(hx, hy, 4.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // PASS 5 & 6: In WebGL2 mode the GPU renders all 1,160 stars + 3D constellation edges natively in Stratum 3!
  // We render crisp 2D stars/edges here ONLY in 2D fallback mode OR inside the active local magnifying lens!
  if (!useGLSky || focusK > 0.05) {
    // PASS 5: DELICATE INTRA-GALAXY CONSTELLATION TREES
    for (let cid = 0; cid < clusters.length; cid++) {
      const clId = clusters[cid]?.id ?? cid;
      if (useGLSky && clId !== growthFocus?.cid) continue;
      const col = nebPalette[cid % nebPalette.length];
      const isSpot = focusCid != null && clId === focusCid;
      const hasGrowth = Boolean(recentBucket(clId)?.count);
      const branchDim = clusterEmphasis(clId);
      const alpha = isSpot
        ? (isLight ? 0.28 : 0.24)
        : hasGrowth
          ? (isLight ? 0.13 : 0.09)
          : (isLight ? 0.065 : 0.05);
      ctx.strokeStyle = rgba(col, alpha * Math.min(1.15, branchDim));
      ctx.lineWidth = isSpot ? 0.80 : 0.45;
      ctx.beginPath();
      let countNormal = 0;
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (e[2] === 1) continue;
        const u = e[0], v = e[1];
        if (stars[u][3] !== cid) continue;
        if (maskFor(cid, (projX[u] + projX[v]) * 0.5, (projY[u] + projY[v]) * 0.5) < 0.45) continue;
        ctx.moveTo(projX[u], projY[u]);
        ctx.lineTo(projX[v], projY[v]);
        countNormal++;
      }
      if (countNormal) ctx.stroke();
    }

    // PASS 6: Crisp Astronomical Starfield (1,160 real frozen Lean theorem stars)
    for (let i = 0; i < n; i++) {
      const s = stars[i];
      if (useGLSky && s[3] !== growthFocus?.cid) continue;
      const px = projX[i], py = projY[i];
      if (px < -12 || px > w + 12 || py < -12 || py > h + 12) continue;
      const mask = maskFor(s[3], px, py);
      const isSpot = focusCid != null && s[3] === focusCid;
      const hasGrowth = Boolean(recentBucket(s[3])?.count);
      const grow = lensScale(px, py);
      if (mask < 0.16) continue;
      const col = nebPalette[s[3] % nebPalette.length];
      const degW = s[5];
      const baseA = isSpot ? 0.58 : hasGrowth ? 0.30 : 0.18;
      const aCore = (baseA + (degW >= 7 ? 0.12 : 0)) * mask * Math.min(1.15, clusterEmphasis(s[3]));
      const sz = (degW >= 7 ? 1.5 : 1.0) * grow;
      ctx.fillStyle = rgba(degW >= 8 && !isLight ? [194, 208, 224] : col, Math.min(0.56, aCore));
      ctx.fillRect(px - sz * 0.5, py - sz * 0.5, sz, sz);
    }
  }

  function paintGrowth(ctx, zoom = 1) {
    const sizeScale = Math.sqrt(zoom);
    drawTruthGrowthStars(ctx, projectNeb, growthNow, nebPalette, isLight, coreClear, projX, projY, growthDim, sizeScale);
    if (zoom === 1 && focusK > 0 && manual && !useGLSky) {
      drawGrowthLens(ctx, focusTx, focusTy, lensR, focusK, growthNow, growthFocus.start, nebPalette[growthFocus.cid % nebPalette.length]);
    }

    // Recent growth follows the same projected paths in the panorama and its close-ups.
    for (let k = 0; !inFullAtlas && k < truthGrowth.recentSprouts.length; k++) {
      const sp = truthGrowth.recentSprouts[k];
      const [pxEnd, pyEnd] = projectNeb(sp.x / 1000, sp.y / 1000, sp.z / 1000, sp.cid);
      const [mx, my] = projectNeb(sp.mx / 1000, sp.my / 1000, sp.mz / 1000, sp.cid);
      if (pxEnd < -24 || pxEnd > w + 24 || pyEnd < -24 || pyEnd > h + 24) continue;
      const mask = maskFor(sp.cid, pxEnd, pyEnd);
      if (mask < 0.22) continue;
      const col = nebPalette[sp.cid % nebPalette.length];
      const isSpot = focusCid != null && sp.cid === focusCid;
      const dim = focusK > 0.05 ? growthDim(sp.cid) : (holoCam.hoveredGalaxy != null && !isSpot ? 0.38 : 1.0);
      const parentX = projX[sp.parentIdx], parentY = projY[sp.parentIdx];

      // Whisper-thin permanent outer crown filament
      ctx.strokeStyle = rgba(col, (isLight ? 0.24 : 0.24) * mask * Math.min(1.15, dim));
      ctx.lineWidth = (isSpot ? 0.85 : 0.60) / sizeScale;
      ctx.beginPath();
      ctx.moveTo(parentX, parentY);
      ctx.quadraticCurveTo(mx, my, pxEnd, pyEnd);
      ctx.stroke();

      ctx.fillStyle = rgba(isLight ? col : [220, 242, 255], (isLight ? 0.58 : 0.52) * mask * Math.min(1.15, dim));
      ctx.beginPath();
      ctx.arc(pxEnd, pyEnd, (isSpot ? 1.5 : 1.1) / sizeScale, 0, Math.PI * 2);
      ctx.fill();

      // Calm slow-motion outer crystallization cycle (9–13s, staggered, zero flashiness)
      if (!quiet) {
        const cyc = (tEff / (sp.period || 10.5) + (sp.phase || 0)) % 1;
        if (cyc < 0.22) {
          const u = cyc / 0.22;
          const bud = Math.sin(u * Math.PI);
          ctx.fillStyle = rgba(isLight ? col : [225, 244, 255], bud * 0.55 * mask * dim);
          ctx.beginPath();
          ctx.arc(parentX, parentY, (1.4 + bud * 2.2) / sizeScale, 0, Math.PI * 2);
          ctx.fill();
        } else if (cyc < 0.68) {
          const u = growthEase((cyc - 0.22) / 0.46);
          const steps = 10;
          ctx.strokeStyle = rgba(isLight ? col : [210, 238, 252], (isLight ? 0.62 : 0.66) * mask * Math.min(1.15, dim));
          ctx.lineWidth = (isSpot ? 1.15 : 0.85) / sizeScale;
          ctx.beginPath();
          let tipX = parentX, tipY = parentY;
          for (let s = 0; s <= steps; s++) {
            const f = (s / steps) * u;
            const invF = 1 - f;
            const qx = invF * invF * parentX + 2 * invF * f * mx + f * f * pxEnd;
            const qy = invF * invF * parentY + 2 * invF * f * my + f * f * pyEnd;
            if (s === 0) ctx.moveTo(qx, qy);
            else ctx.lineTo(qx, qy);
            tipX = qx;
            tipY = qy;
          }
          ctx.stroke();

          ctx.fillStyle = rgba(isLight ? col : [240, 250, 255], 0.85 * mask * dim);
          ctx.beginPath();
          ctx.arc(tipX, tipY, 1.7 / sizeScale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const u = (cyc - 0.68) / 0.32;
          const fade = Math.sin(u * Math.PI);
          ctx.strokeStyle = rgba(col, fade * (isLight ? 0.42 : 0.48) * mask * dim);
          ctx.lineWidth = 0.70 / sizeScale;
          ctx.beginPath();
          ctx.arc(pxEnd, pyEnd, (2.2 + u * 6.8) / sizeScale, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }
  paintGrowth(ctx);

  ctx.restore();

  if (useGLSky && holoCam.galaxyMainCid != null) {
    drawGalaxyNodeLayer(ctx, holoCam.galaxyMainCid, projectNeb, nebPalette, isLight, w, h, rightGutter, growthNow);
  } else if (galaxyDetail.picks.length) {
    galaxyDetail.picks = [];
  }

  // PASS 8: MINIMALIST AEROSPACE STAR-TRACKER COORDINATE LABELS (NO chunky game boxes!)
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const strokeHalo = isLight ? 'rgba(247, 244, 236, 0.94)' : 'rgba(4, 7, 12, 0.92)';

  if (growthEvents.length) {
    const layers = useGLSky ? [$('#holo-gl'), ctx.canvas] : [ctx.canvas];
    drawGrowthObservations(growthEvents, clProj, w - rightGutter, h, nowMs, isLight, {
      ctx, skyWash: sampleGrowthSky(layers, w, h), width: w, height: h, nebula: truthNebula,
      project: projectNeb, palette: nebPalette, paintGrowth
    });
  }

  for (const { midPt, count, col } of bridgeLabels) {
    ctx.save();
    ctx.font = '600 8px "Geist Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = isLight ? 'rgba(242, 239, 232, 0.94)' : 'rgba(2, 6, 12, 0.92)';
    const tag = `${count}`;
    ctx.strokeText(tag, midPt[0], midPt[1]);
    ctx.fillStyle = isLight ? rgba(col, 0.92) : rgba([208, 234, 248], 0.78);
    ctx.fillText(tag, midPt[0], midPt[1]);
    ctx.restore();
  }

  // Grand cosmic DAG banner + proportional-size dependency-tier legend in dedicated 星系 Observatory mode
  if (useGLSky && isPureGalaxyView && holoCam.galaxyBoost > 0.35) {
    const dagTotal = truthNebula.counts?.truth_nodes || 19022;
    const isCompactHud = w <= 700;
    const bVis = Math.min(1, (holoCam.galaxyBoost - 0.35) / 0.65);
    ctx.save();
    if (!isCompactHud) {
      const banner = tr('hud_dag_banner', `TRUTH DAG COSMOS // L0 公理底座 → L84 前沿定理 · ${dagTotal.toLocaleString()} 冻结节点`, {
        n: dagTotal.toLocaleString()
      });
      ctx.globalAlpha = bVis * 0.88;
      ctx.font = '600 9.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = isLight ? 'rgba(240, 237, 230, 0.95)' : 'rgba(2, 6, 12, 0.90)';
      const bx = (w - rightGutter) * 0.5;
      ctx.strokeText(banner, bx, 78);
      ctx.fillStyle = isLight ? 'rgba(15, 31, 46, 0.88)' : (isBlueprint ? 'rgba(86, 255, 160, 0.92)' : 'rgba(166, 218, 244, 0.90)');
      ctx.fillText(banner, bx, 78);
    }

    // Compact scientific reuse-tier size+color legend cleanly positioned above #human-console!
    const items = isLight
      ? [
          { col: [188, 112, 16], r: isCompactHud ? 4.2 : 5.2, label: isCompactHud ? '345+' : L('345+ 核心枢纽', '345+ Hubs') },
          { col: [8, 115, 95],   r: isCompactHud ? 3.4 : 4.1, label: '64–344' },
          { col: [15, 138, 124], r: isCompactHud ? 2.7 : 3.2, label: '6–63' },
          { col: [40, 118, 158], r: isCompactHud ? 2.1 : 2.4, label: '1–5' },
          { col: [86, 114, 148], r: isCompactHud ? 1.5 : 1.7, label: isCompactHud ? '0' : L('0 叶节点', '0 Leaves') }
        ]
      : isBlueprint
        ? [
            { col: [232, 255, 234], r: isCompactHud ? 4.2 : 5.2, label: isCompactHud ? '345+' : L('345+ 核心枢纽', '345+ Hubs') },
            { col: [61, 255, 122],  r: isCompactHud ? 3.4 : 4.1, label: '64–344' },
            { col: [0, 217, 68],    r: isCompactHud ? 2.7 : 3.2, label: '6–63' },
            { col: [15, 143, 56],   r: isCompactHud ? 2.1 : 2.4, label: '1–5' },
            { col: [10, 76, 32],    r: isCompactHud ? 1.5 : 1.7, label: isCompactHud ? '0' : L('0 叶节点', '0 Leaves') }
          ]
        : [
            { col: [248, 200, 96],  r: isCompactHud ? 4.2 : 5.2, label: isCompactHud ? '345+' : L('345+ 核心枢纽', '345+ Hubs') },
            { col: [52, 232, 196],  r: isCompactHud ? 3.4 : 4.1, label: '64–344' },
            { col: [76, 214, 189],  r: isCompactHud ? 2.7 : 3.2, label: '6–63' },
            { col: [122, 188, 224], r: isCompactHud ? 2.1 : 2.4, label: '1–5' },
            { col: [92, 138, 191],  r: isCompactHud ? 1.5 : 1.7, label: isCompactHud ? '0' : L('0 叶节点', '0 Leaves') }
          ];
    ctx.font = isCompactHud
      ? '500 8.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif'
      : '500 9px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = bVis * 0.86;
    const prefix = isCompactHud ? L('依赖度:', 'Deps:') : L('按被依赖度分大小：', 'Sized by dependents: ');
    const gapAfterDot = isCompactHud ? 3.5 : 5;
    const gapBetween = isCompactHud ? 8 : 13;
    const totalLegendW = ctx.measureText(prefix).width + 6 + items.reduce((acc, it) => acc + it.r * 2 + gapAfterDot + ctx.measureText(it.label).width + gapBetween, -gapBetween);
    const ly = isCompactHud ? (h - 52) : (h - 118);
    let lx = isCompactHud ? Math.max(10, (w - totalLegendW) * 0.5) : 26;
    if (w > 760 || isCompactHud) {
      ctx.fillStyle = isLight ? 'rgba(24, 42, 58, 0.72)' : 'rgba(156, 188, 212, 0.76)';
      ctx.fillText(prefix, lx, ly);
      lx += ctx.measureText(prefix).width + 6;
      for (const it of items) {
        ctx.fillStyle = rgba(it.col, 0.96);
        ctx.beginPath();
        ctx.arc(lx + it.r, ly, it.r, 0, Math.PI * 2);
        ctx.fill();
        lx += it.r * 2 + gapAfterDot;
        ctx.fillStyle = isLight ? 'rgba(20, 36, 52, 0.84)' : 'rgba(206, 228, 244, 0.88)';
        ctx.fillText(it.label, lx, ly);
        lx += ctx.measureText(it.label).width + gapBetween;
      }
    }
    ctx.restore();
  }

  const topGrowingIds = new Set(
    [...truthGrowth.recentByCluster.entries()]
      .filter(([cid]) => clusters.find(c => c.id === cid && c.name !== 'Other'))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2)
      .map(([cid]) => cid)
  );

  holoCam.projectedGalaxies.clear();
  const isCompactMobile = w <= 700;
  const minLabelX = isCompactMobile ? 42 : 82;
  const maxLabelX = w - rightGutter - (isCompactMobile ? 42 : 82);
  for (const { cl, x: px, y: py, col } of clProj.values()) {
    if (cl.name === 'Other') continue;
    if (useGLSky && (px < -60 || px > w - rightGutter + 40 || py < (isCompactMobile ? 22 : 36) || py > h - (isCompactMobile ? 54 : 70))) continue;
    const isBottom = cl.center[1] < 0;
    const isMidUpper = !isBottom && cl.center[1] < 760;
    const bucket = recentBucket(cl.id);
    const delta = bucket?.count || 0;
    const isFeatured = !isCompactMobile && delta > 0 && topGrowingIds.has(cl.id) && focusK < 0.2;
    const isUpperCrown = cl.id === 0 || cl.id === 2 || (!isCompactMobile && cl.id === 6);
    const lx = useGLSky
      ? Math.max(minLabelX, Math.min(maxLabelX, px))
      : Math.max(isFeatured ? 380 : 336, Math.min(w - (isFeatured ? 380 : 336), px));
    const ly = useGLSky
      ? Math.max(isCompactMobile ? 34 : 76, Math.min(h - (isCompactMobile ? 64 : 92), py + (isUpperCrown ? (isCompactMobile ? -16 : -22) : (isCompactMobile ? 17 : 22))))
      : (isBottom ? Math.min(h - 114, py + 26) : Math.max(82, py - (isMidUpper ? 36 : 24)));
    if (!useGLSky && (lx < 292 || lx > w - 292)) continue;

    holoCam.projectedGalaxies.set(cl.id, { x: px, y: py, lx, ly, cl, col });
    const isHovered = holoCam.hoveredGalaxy === cl.id && focusK < 0.2;
    // On narrow mobile phones, suppress outer galaxy text labels in Mix & Station so Space Station tags never overlap!
    if (isCompactMobile && state.layer !== 'galaxy' && holoCam.galaxyMainCid == null && !isHovered) continue;

    if (isHovered) {
      ctx.save();
      ctx.strokeStyle = rgba(col, (isLight ? 0.75 : 0.78) * Math.min(1, skyVis));
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(px, py, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const conjCount = state.conjecturesByCid?.get(cl.id) || 0;
    const baseLabelA = focusK > 0.05
      ? Math.min(1, growthDim(cl.id))
      : (isHovered ? 1.0 : (delta > 0 || conjCount > 0) ? 0.90 : (state.layer === 'galaxy' ? 0.76 : 0.56));
    ctx.globalAlpha = baseLabelA * Math.min(1, skyVis);
    const starMark = conjCount > 0 ? ' ✦' : '';
    const gTitle = langGalaxyName(cl);
    const mainLabel = isCompactMobile
      ? gTitle
      : (delta > 0
          ? `${gTitle} · ${(cl.count || 0).toLocaleString()}  +${delta}${starMark}`
          : `${gTitle} · ${(cl.count || 0).toLocaleString()}${starMark}`);
    let subText = '';
    if (!isCompactMobile && (isHovered || isFeatured)) {
      const evList = bucket?.events || [];
      const rotIdx = (!isHovered && !quiet && evList.length > 1) ? Math.floor(tEff / 6.5) % Math.min(6, evList.length) : 0;
      const featured = evList[rotIdx] || bucket?.latest;
      const latestShort = featured ? shortModuleName(featured.module) : '';
      subText = isHovered
        ? (conjCount > 0
            ? (isEn()
                ? `✦ ${conjCount} conjectures settled · ${latestShort ? latestShort : 'Click to inspect'}`
                : `✦ ${conjCount} 项猜想已解/反驳 · ${latestShort ? latestShort : '点击查看星系'}`)
            : (latestShort
                ? `↗ ${latestShort} · ${L('点击查看星系', 'Click to inspect')}`
                : `${cl.en || cl.name.toUpperCase()} · ${L('点击查看星系', 'Click to inspect')}`))
        : (latestShort ? `↗ ${latestShort.slice(0, 24)}${latestShort.length > 24 ? '…' : ''}` : '');
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${(isHovered || delta > 0) ? '600 9px' : '500 8.5px'} "Geist Mono", -apple-system, "PingFang SC", sans-serif`;
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = strokeHalo;
    ctx.strokeText(mainLabel, lx, ly);
    ctx.fillStyle = isLight
      ? rgba(col, (isHovered || delta > 0) ? 0.95 : 0.70)
      : (delta > 0 ? rgba([218, 234, 248], 0.92) : rgba([152, 176, 202], isHovered ? 0.96 : 0.68));
    ctx.fillText(mainLabel, lx, ly);

    if (subText) {
      ctx.font = '500 7.8px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
      ctx.strokeText(subText, lx, ly + (isBottom ? 12 : -12));
      ctx.fillStyle = isLight ? rgba(col, 0.86) : rgba(col, 0.84);
      ctx.fillText(subText, lx, ly + (isBottom ? 12 : -12));
    }
    ctx.globalAlpha = 1;
  }
  if (manual && focusK > 0) {
    const col = nebPalette[manual.cid % nebPalette.length];
    const name = langGalaxyName(manual.cluster);
    const bucket = recentBucket(manual.cid);
    const delta = bucket?.count || 0;
    const recentNames = (bucket?.events || []).slice(0, 2).map(ev => isEn()
      ? `${shortModuleName(ev.module)} (${relative(ev.at)})`
      : `${shortModuleName(ev.module)}（${relative(ev.at)}）`);
    const cxTop = w * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = focusK;
    ctx.strokeStyle = rgba(col, 0.58);
    ctx.lineWidth = 1.1;
    ctx.setLineDash([5, 7]);
    const [rimX, rimY] = growthLensRim(focusTx, focusTy, lensR, cxTop, 92);
    ctx.beginPath();
    ctx.moveTo(cxTop, 92);
    ctx.quadraticCurveTo(cxTop + (rimX - cxTop) * 0.2, rimY * 0.45 + 50, rimX, rimY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = strokeHalo;
    ctx.font = '800 14px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
    const ttl = delta > 0
      ? (isEn()
          ? `⟡ Truth Galaxy Growth · ${name} (${(manual.cluster.count || 0).toLocaleString()} modules · +${delta} recent)`
          : `⟡ 真值星系生长 · ${name}（${(manual.cluster.count || 0).toLocaleString()} 模块 · 近期 +${delta}）`)
      : (isEn()
          ? `⟡ Truth Galaxy · ${name} (${(manual.cluster.count || 0).toLocaleString()} verified theorems)`
          : `⟡ 真值星系 · ${name}（${(manual.cluster.count || 0).toLocaleString()} 冻结定理）`);
    ctx.strokeText(ttl, cxTop, 60);
    ctx.fillStyle = rgba(col, 1);
    ctx.fillText(ttl, cxTop, 60);
    ctx.font = '700 10.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
    const sub = recentNames.length
      ? (isEn()
          ? `Recently frozen: ${recentNames.join(' · ')} (Click empty space or Esc for panorama)`
          : `最新冻结：${recentNames.join(' · ')}  （点击或 Esc 返回全景）`)
      : (isEn()
          ? `${manual.cluster.en || manual.cluster.name.toUpperCase()} · Click empty space or Esc for panorama`
          : `${manual.cluster.en || manual.cluster.name.toUpperCase()} · 暂无新冻结模块 · 点击或 Esc 返回全景`);
    ctx.strokeText(sub, cxTop, 80);
    ctx.fillStyle = isLight ? rgba(col, 0.90) : rgba([220, 255, 240], 0.88);
    ctx.fillText(sub, cxTop, 80);
    ctx.restore();
  }
  ctx.restore();
}

function spawnHoloPulse(deptId, strength = 0.85) {
  if (!holoWorld[deptId] || state.quiet || reduced) return;
  holoCam.pulses.push({ id: deptId, age: 0, strength });
  if (holoCam.pulses.length > 18) holoCam.pulses.shift();
  if (deptId === 'verification' && holoCam.nebulaRipples.length < 3) {
    holoCam.nebulaRipples.push({ age: 0 });
  }
}

function spawnSpokeFlare(fromId, toId = 'verification') {
  if (!holoWorld[fromId] || !holoWorld[toId] || fromId === toId || state.quiet || reduced) return;
  const col = holoWorld[fromId].hex || [94, 237, 236];
  holoCam.flares.push({ fromId, toId, age: 0, rgb: col });
  if (holoCam.flares.length > 14) holoCam.flares.shift();
}

function triggerScanSweep() {
  if (state.quiet || reduced || /jsdom/i.test(navigator.userAgent || '')) return;
  const el = $('#fui-scan-sweep');
  if (!el) return;
  el.classList.remove('is-sweeping');
  void el.offsetWidth;
  el.classList.add('is-sweeping');
}

function initHoloParticles() {
  if (holoCam.stars.length) return;
  let seed = 4242;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 220; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = (rand() - 0.15) * Math.PI * 0.62;
    const rad = 28 + rand() * 18;
    holoCam.stars.push({
      x: Math.cos(theta) * Math.cos(phi) * rad,
      y: Math.sin(phi) * rad + 4,
      z: Math.sin(theta) * Math.cos(phi) * rad,
      r: rand() > 0.85 ? 1.45 : 0.75,
      a: 0.22 + rand() * 0.62,
      cyan: i % 5 === 0
    });
  }
  for (let i = 0; i < 55; i++) {
    holoCam.sparks.push({
      x: (rand() - 0.5) * 14.5,
      y: rand() * 4.2,
      z: (rand() - 0.5) * 10.5,
      vy: 0.25 + rand() * 0.45,
      r: 0.9 + rand() * 1.1,
      hue: i % 3
    });
  }
  // Matrix mathematical & formal-proof vertical code rain columns (far atmospheric layer)
  const colCount = 46;
  for (let i = 0; i < colCount; i++) {
    holoCam.matrixCols.push({
      u: (i + 0.35 + (rand() - 0.5) * 0.4) / colCount,
      speed: 2.2 + rand() * 3.8,
      phase: rand() * 40,
      len: 8 + Math.floor(rand() * 10),
      size: rand() > 0.72 ? 12 : 10,
      seed: Math.floor(rand() * 997),
      depth: 0.45 + rand() * 0.55
    });
  }
}

function towerHeight(id) {
  const cfg = holoWorld[id];
  if (!cfg) return 1.2;
  const d = department(id);
  if (!d || cfg.floating) return cfg.baseH;
  const run = countRunning(d) || 0;
  const q = queueStats(d);
  const boost = Math.min(0.42, run * 0.042) + Math.min(0.16, q.waiting * 0.006);
  return cfg.baseH + boost;
}

function rgba(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

function renderHoloSky() {
  drawHolo3DFrame(0);
}

// ============================================================================
// MATRIX XP FLIGHTS
// Each new real matrix entry launches a comet from its log line to its
// department building. Arrival effects are ranked by importance, and launches
// are paced so bursts read as a steady stream of gains rather than noise.
// ============================================================================
const XP_QUEUE_CAP = 12;
const XP_MAX_ACTIVE = 4;
const XP_GLOBAL_GAP = 380;
const XP_DEPT_GAP = 2400;
const XP_TIER_GAP = { 3: 2600, 2: 1100, 1: 450, '-1': 900 };
const XP_TTL = { 3: 60000, 2: 25000, 1: 15000, '-1': 15000 };
const XP_FLIGHT_MS = { 3: 1500, 2: 1150, 1: 900, '-1': 800 };
const XP_GOLD = [244, 197, 83];
const XP_ICE = [138, 224, 250];
const XP_AMBER = [246, 182, 92];
const XP_RED = [251, 113, 133];
const xpFlowTarget = {
  direction: 'research',
  research: 'verification',
  books: 'verification',
  verification: 'publication',
  publication: 'outreach',
  outreach: 'research',
  review: 'verification',
  studio: 'verification'
};
const xpFx = { queue: [], flights: [], bursts: [], mem: { lastLaunch: null, lastByTier: {}, lastByDept: {} }, painted: false };

function matchGalaxyCidForText(text) {
  const t = String(text || '');
  if (/量子|quantum|bloch|fibonacci|entangl|fidelity|unistochastic|qubit/i.test(t)) return 1;
  if (/数论|robin|prime|zeckendorf|berstel|arith|integer/i.test(t)) return 2;
  if (/组合|graph|petersen|clique|combinator|quorum|deletion|insertion/i.test(t)) return 0;
  if (/分析|fourier|birkhoff|ergodic|limsup|diverg|heat|spectral|collision|analytic/i.test(t)) return 4;
  if (/weil|代数|bmv|gram|algebra/i.test(t)) return 5;
  if (/观察|observer|compact|locus/i.test(t)) return 6;
  return 3;
}

// Importance of a public event: preserves Loning's exact tier contract (3 | 2 | 1 | 0 | -1)
// while tagging 5 rich real-automation visual FX modes (rocket | paper | outreach | routine | fail)!
function xpPlanFor(a) {
  const text = `${a.label || ''} ${a.summary || ''}`;
  if (a.kind === 'contribution' && a.status === 'merged') {
    if (a.department === 'publication') return { tier: 3, fx: 'paper', label: L('论文跃迁', 'Paper Shipped') };
    if (a.department === 'outreach') return { tier: 3, fx: 'outreach', label: isEn() ? `${outreachScholarCount()} Scholars Sync` : `${outreachScholarCount()} 位学者同步` };
    if (isSettledMathRecord(a)) {
      const refuted = classifyConjectureVerdict(text) === 'refuted';
      return { tier: 3, fx: 'rocket', label: refuted ? L('猜想反驳', 'Conjecture Refuted') : L('猜想证明', 'Conjecture Proved'), galaxyCid: matchGalaxyCidForText(text) };
    }
    return { tier: 3, fx: 'routine', label: L('成果合入', 'PR Merged') };
  }
  if (a.kind === 'task' && a.status === 'closed' && isSettledMathRecord(a)) {
    const refuted = classifyConjectureVerdict(text) === 'refuted';
    return { tier: 3, fx: 'rocket', label: refuted ? L('猜想反驳', 'Conjecture Refuted') : L('猜想解决', 'Conjecture Settled'), galaxyCid: matchGalaxyCidForText(text) };
  }
  if (a.kind === 'automation') {
    if (a.status === 'failed') return { tier: -1, fx: 'fail', label: L('检验未通过', 'Check Failed') };
    if (a.status === 'cancelled') return { tier: 0, fx: 'none', label: '' };
    if (a.department === 'outreach') return { tier: 1, fx: 'outreach', label: L('学者联机', 'Scholar Sync') };
    return { tier: 1, fx: 'routine', label: a.status === 'succeeded' ? L('核验通过', 'Verified') : L('核验', 'Verify') };
  }
  if (a.kind === 'task') return { tier: 2, fx: a.department === 'outreach' ? 'outreach' : 'routine', label: L('新课题', 'New Thread') };
  if (a.kind === 'contribution') return { tier: 2, fx: a.department === 'publication' ? 'paper' : 'routine', label: L('新提交', 'New PR') };
  if (a.kind === 'discussion') return { tier: 1, fx: a.department === 'outreach' ? 'outreach' : 'routine', label: L('讨论', 'Note') };
  return { tier: 1, fx: 'routine', label: L('动态', 'Event') };
}

const xpRank = q => (q.tier === 3 ? 3 : q.tier === 2 ? 2 : q.tier === 1 ? 1 : 0.5);

function enqueueXp(queue, item, now) {
  if (!item.tier) return queue;
  const next = queue.map(q => ({ ...q }));
  if (Math.abs(item.tier) === 1) {
    const same = next.find(q => q.deptId === item.deptId && q.tier === item.tier);
    if (same) {
      same.count += 1;
      same.key = item.key;
      return next;
    }
  }
  next.push({ ...item, count: 1, queuedAt: now });
  while (next.length > XP_QUEUE_CAP) {
    let drop = 0;
    next.forEach((q, i) => { if (xpRank(q) < xpRank(next[drop])) drop = i; });
    next.splice(drop, 1);
  }
  return next;
}

function nextXpLaunch(queue, now, mem, active) {
  // A missing time means never launched, which places no gap constraint.
  if (active >= XP_MAX_ACTIVE || now - (mem.lastLaunch ?? -Infinity) < XP_GLOBAL_GAP) return -1;
  let best = -1;
  queue.forEach((q, i) => {
    if (now - q.queuedAt > XP_TTL[q.tier]) return;
    if (now - (mem.lastByTier[q.tier] ?? -Infinity) < XP_TIER_GAP[q.tier]) return;
    if (Math.abs(q.tier) === 1 && now - (mem.lastByDept[q.deptId] ?? -Infinity) < XP_DEPT_GAP) return;
    if (best < 0 || xpRank(q) > xpRank(queue[best])) best = i;
  });
  return best;
}

function queueXpFlight(entry, now = performance.now()) {
  if (reduced || state.quiet || document.hidden || !entry.deptId) return;
  xpFx.queue = enqueueXp(xpFx.queue, {
    key: entry.key,
    deptId: entry.deptId,
    tier: entry.tier,
    fx: entry.xpFx || 'routine',
    galaxyCid: entry.galaxyCid ?? null,
    label: entry.xpLabel
  }, now);
}

const xpColor = item => (
  item.fx === 'paper' ? XP_ICE
  : item.fx === 'outreach' ? XP_AMBER
  : item.tier === 3 ? XP_GOLD
  : item.tier === -1 ? XP_RED
  : holoWorld[item.deptId]?.hex || [94, 237, 236]
);
const xpOnScreen = r => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;

function xpSourcePoint(key) {
  const stream = $('#scifi-log-stream');
  const area = stream?.getBoundingClientRect();
  if (!stream || !area || !xpOnScreen(area)) {
    const metrics = $('#institute-metrics')?.getBoundingClientRect();
    return metrics && xpOnScreen(metrics) ? { x: metrics.left + metrics.width / 2, y: metrics.bottom } : null;
  }
  const row = [...stream.querySelectorAll('[data-log-key]')].find(r => r.dataset.logKey === key);
  const box = row?.getBoundingClientRect();
  if (row && box.bottom > area.top && box.top < area.bottom) {
    row.classList.remove('is-xp-launch');
    void row.offsetWidth;
    row.classList.add('is-xp-launch');
    const tag = row.querySelector('.log-tag')?.getBoundingClientRect() || box;
    return { x: tag.left + tag.width / 2, y: tag.top + tag.height / 2 };
  }
  return { x: area.left + area.width / 2, y: area.bottom - 14 };
}

function xpTargetPoint(deptId) {
  if (state.mode !== 'organization' || state.focused) return null;
  const canvas = $('#holo-3d');
  const tower = holoCam.projectedTowers.get(deptId);
  if (canvas && tower) {
    const c = canvas.getBoundingClientRect();
    const p = { x: c.left + tower.x, y: c.top + tower.y, r: tower.r };
    if (p.x > c.left && p.x < c.right && p.y > c.top && p.y < c.bottom && p.y > 0 && p.y < innerHeight) return p;
  }
  const cell = state.cells.get(deptId)?.button?.getBoundingClientRect();
  return cell && xpOnScreen(cell) ? { x: cell.left + cell.width / 2, y: cell.top + cell.height / 2, r: 30 } : null;
}

function xpBezier(from, to, e) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const lift = Math.min(220, len * 0.32);
  const cx = (from.x + to.x) / 2 + nx * lift;
  const cy = (from.y + to.y) / 2 + ny * lift;
  const k = 1 - e;
  return { x: k * k * from.x + 2 * k * e * cx + e * e * to.x, y: k * k * from.y + 2 * k * e * cy + e * e * to.y };
}

function xpParticles(n, speed, lift) {
  return Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.65);
    return { vx: Math.cos(a) * v, vy: Math.sin(a) * v - lift * Math.random() };
  });
}

function flashXpCell(deptId, cls, ms) {
  const button = state.cells.get(deptId)?.button;
  if (!button) return;
  button.classList.remove(cls);
  void button.offsetWidth;
  button.classList.add(cls);
  setTimeout(() => button.classList.remove(cls), ms);
}

// Texts arriving at a department that still shows one stack upward instead of overlapping.
function xpTextTop(deptId, base, now, bursts = xpFx.bursts) {
  let shift = 0;
  for (const b of bursts) {
    if (b.kind === 'text' && b.deptId === deptId && now - b.start < b.dur) shift += b.pop ? 56 : 24;
  }
  return base - shift;
}

// Tier S (🚀 Rocket Launch -> Gentle Star-Cluster Ignition -> Auto-Paper Factory Handoff!)
function launchConjectureRocket(item, originPt, now) {
  const cid = item.galaxyCid != null ? item.galaxyCid : 0;
  const gInfo = holoCam.projectedGalaxies.get(cid) || [...holoCam.projectedGalaxies.values()][0];
  const skyTarget = gInfo
    ? { x: gInfo.x, y: gInfo.y, r: 34 }
    : { x: innerWidth * 0.36, y: innerHeight * 0.28, r: 34 };
  const gCol = gInfo?.col || [142, 226, 236];
  const warmGold = [248, 224, 158];

  // 1. Silken ascending rocket stream from Formal Verification Core / Conjecture Engine straight into the unified Truth DAG galaxy!
  xpFx.flights.push({
    item: { deptId: item.deptId, tier: 3, fx: 'rocket', label: item.label },
    from: originPt,
    target: skyTarget,
    fixedTarget: true,
    start: now,
    dur: 1180,
    trail: [],
    sparks: [],
    onArrive: (pt, tArr) => {
      // 2. Gentle warm supernova aurora blooming & lighting up a cluster of 14 soft starlets in that galaxy!
      for (let k = 0; k < 3; k++) {
        xpFx.bursts.push({ kind: 'ring', x: pt.x, y: pt.y, rgb: k === 0 ? warmGold : gCol, start: tArr + k * 150, dur: 1250, maxR: 54 + k * 34, width: 2.2 - k * 0.5 });
      }
      xpFx.bursts.push({ kind: 'sparks', x: pt.x, y: pt.y, rgb: warmGold, start: tArr, dur: 1650, parts: xpParticles(24, 135, 65) });
      // Soft awakening constellation starlets gently glowing across that patch of sky
      for (let s = 0; s < 12; s++) {
        const a = s * 2.39996;
        const r = 14 + Math.sqrt(s + 1) * 14;
        xpFx.bursts.push({ kind: 'starlet', x: pt.x + Math.cos(a) * r, y: pt.y + Math.sin(a) * r * 0.65, rgb: s % 3 === 0 ? warmGold : gCol, start: tArr + s * 45, dur: 2200, maxR: 5.5 + (s % 3) * 1.5 });
      }
      const gName = gInfo?.cl ? langGalaxyName(gInfo.cl) : L('周天星域', 'Truth Cosmos');
      xpFx.bursts.push({
        kind: 'text',
        deptId: '__rocket__',
        x: pt.x,
        y: Math.max(96, pt.y - 26),
        rgb: warmGold,
        start: tArr,
        dur: 2500,
        text: `LEVEL UP · ${item.label || L('猜想突破', 'Breakthrough')}`,
        sub: isEn() ? `Ignited ${gName} → Auto-Paper Factory` : `点亮 ${gName} 星域 → 推入自动论文工厂`,
        size: 21,
        rise: 38,
        pop: true
      });
      if (typeof sciFiAudio !== 'undefined') sciFiAudio.playLevelUp();

      // 3. Natural handoff stream drifting rightward from Formal Core into Auto-Paper Factory / Mathesis!
      const corePt = xpTargetPoint('verification') || originPt;
      const paperPt = xpTargetPoint('publication');
      if (paperPt) {
        xpFx.flights.push({
          item: { deptId: 'publication', tier: 2, fx: 'paper', label: L('推入论文工厂', 'To Paper Factory') },
          from: corePt,
          target: paperPt,
          start: tArr + 220,
          dur: 880,
          trail: [],
          sparks: [],
          onArrive: (pp, tP) => {
            spawnHoloPulse('publication', 1.1);
            spawnSpokeFlare('verification', 'publication');
            flashXpCell('publication', 'is-xp-hit', 900);
            xpFx.bursts.push({ kind: 'prism', x: pp.x, y: pp.y, rgb: XP_ICE, start: tP, dur: 900, maxR: 48, width: 2.0 });
            const pTop = xpTextTop('publication', pp.y - 34, tP);
            xpFx.bursts.push({ kind: 'text', deptId: 'publication', x: pp.x, y: pTop, rgb: XP_ICE, start: tP, dur: 1500, text: L('→ 自动论文 · Mathesis', '→ Auto-Paper · Mathesis'), size: 13.5, rise: 28 });
          }
        });
      }
    }
  });
}

function xpArrive(item, target, now) {
  const rgb = xpColor(item);
  const { x, y } = target;
  const top = xpTextTop(item.deptId, y - (target.r || 30) * 0.9, now);
  if (item.tier === 3) {
    if (item.fx === 'rocket') {
      // Tier S: Gentle Rocket Launch straight into the unified Truth DAG galaxy + Paper Factory handoff!
      xpFx.bursts.push({ kind: 'ring', x, y, rgb: XP_GOLD, start: now, dur: 820, maxR: 52, width: 2.4 });
      flashXpCell(item.deptId, 'is-level-up', 1800);
      spawnHoloPulse(item.deptId, 1.3);
      spawnHoloPulse('verification', 1.2);
      const launchFrom = xpTargetPoint('verification') || target;
      launchConjectureRocket(item, launchFrom, now);
      return;
    }
    if (item.fx === 'paper') {
      // Tier A: Ice-blue / silver prism shuttle into Mathesis Review & Preprint Platform!
      for (let k = 0; k < 2; k++) xpFx.bursts.push({ kind: 'prism', x, y, rgb: XP_ICE, start: now + k * 140, dur: 980, maxR: 56 + k * 30, width: 2.4 - k * 0.6 });
      xpFx.bursts.push({ kind: 'sparks', x, y, rgb: XP_ICE, start: now, dur: 1150, parts: xpParticles(26, 175, 110) });
      xpFx.bursts.push({ kind: 'text', deptId: item.deptId, x, y: top, rgb: XP_ICE, start: now, dur: 2100, text: L('LEVEL UP · 论文跃迁', 'LEVEL UP · PAPER SHIPPED'), sub: L('自动论文工厂 → Mathesis 审稿平台', 'Auto-Paper Factory → Mathesis Review'), size: 22, rise: 42, pop: true });
      flashXpCell(item.deptId, 'is-level-up', 1600);
      spawnHoloPulse(item.deptId, 1.2);
      spawnSpokeFlare('publication', 'outreach');
      if (typeof sciFiAudio !== 'undefined') sciFiAudio.playLevelUp();
      return;
    }
    if (item.fx === 'outreach') {
      // Tier B: Warm amber long-range collaboration sync with verified external scholars!
      for (let k = 0; k < 2; k++) xpFx.bursts.push({ kind: 'ring', x, y, rgb: XP_AMBER, start: now + k * 150, dur: 940, maxR: 58 + k * 34, width: 2.4 - k * 0.6 });
      xpFx.bursts.push({ kind: 'text', deptId: item.deptId, x, y: top, rgb: XP_AMBER, start: now, dur: 1950, text: 'OUTREACH SYNC', sub: isEn() ? `Mathesis ⇄ ${outreachScholarCount()} Collaborating Scholars` : `Mathesis ⇄ ${outreachScholarCount()} 位合作学者双向同步`, size: 20, rise: 40, pop: true });
      flashXpCell(item.deptId, 'is-level-up', 1400);
      spawnHoloPulse(item.deptId, 1.15);
      spawnSpokeFlare('outreach', 'research');
      if (typeof sciFiAudio !== 'undefined') sciFiAudio.playGalaxy();
      return;
    }
    for (let k = 0; k < 3; k++) xpFx.bursts.push({ kind: 'ring', x, y, rgb, start: now + k * 140, dur: 950, maxR: 64 + k * 38, width: 3.2 - k * 0.7 });
    xpFx.bursts.push({ kind: 'sparks', x, y, rgb, start: now, dur: 1300, parts: xpParticles(36, 230, 160) });
    xpFx.bursts.push({ kind: 'text', deptId: item.deptId, x, y: top, rgb, start: now, dur: 2100, text: 'LEVEL UP', sub: `${langDeptLabel(department(item.deptId) || item.deptId, '')} · ${item.label} +1`, size: 26, rise: 48, pop: true });
    flashXpCell(item.deptId, 'is-level-up', 1700);
    spawnHoloPulse(item.deptId, 1.25);
    if (xpFlowTarget[item.deptId]) spawnSpokeFlare(item.deptId, xpFlowTarget[item.deptId]);
    if (typeof sciFiAudio !== 'undefined') sciFiAudio.playLevelUp();
  } else if (item.tier === 2) {
    xpFx.bursts.push({ kind: item.fx === 'paper' ? 'prism' : 'ring', x, y, rgb, start: now, dur: 700, maxR: 40, width: 2.4 });
    xpFx.bursts.push({ kind: 'ring', x, y, rgb, start: now + 110, dur: 760, maxR: 62, width: 1.6 });
    xpFx.bursts.push({ kind: 'sparks', x, y, rgb, start: now, dur: 900, parts: xpParticles(16, 130, 60) });
    xpFx.bursts.push({ kind: 'text', deptId: item.deptId, x, y: top, rgb, start: now, dur: 1400, text: `+1 ${item.label}`, size: 15, rise: 36 });
    flashXpCell(item.deptId, 'is-xp-hit', 900);
    spawnHoloPulse(item.deptId, 0.95);
  } else if (item.tier === -1) {
    xpFx.bursts.push({ kind: 'ring', x, y, rgb, start: now, dur: 620, maxR: 26, width: 2 });
    xpFx.bursts.push({ kind: 'text', deptId: item.deptId, x, y: top, rgb, start: now, dur: 1200, text: `✕ ${item.label}`, size: 12, rise: 22 });
  } else {
    xpFx.bursts.push({ kind: 'ring', x, y, rgb, start: now, dur: 540, maxR: 26, width: 1.8 });
    xpFx.bursts.push({ kind: 'text', deptId: item.deptId, x, y: top, rgb, start: now, dur: 1050, text: `+${item.count} ${item.label}`, size: 13, rise: 26 });
    spawnHoloPulse(item.deptId, 0.6);
  }
}

function launchXpFlight(item, now) {
  xpFx.mem.lastLaunch = now;
  xpFx.mem.lastByTier[item.tier] = now;
  xpFx.mem.lastByDept[item.deptId] = now;
  const target = xpTargetPoint(item.deptId);
  if (!target) return;
  const from = xpSourcePoint(item.key);
  if (!from) {
    xpArrive(item, target, now);
    return;
  }
  xpFx.flights.push({ item, from, target, start: now, dur: XP_FLIGHT_MS[item.tier], trail: [], sparks: [] });
}

function drawXpComet(ctx, f, pos, now) {
  const rgb = xpColor(f.item);
  const size = f.item.tier === 3 ? 7 : f.item.tier === 2 ? 5 : 3.4;
  ctx.lineCap = 'round';
  for (let i = 1; i < f.trail.length; i++) {
    const a = i / f.trail.length;
    ctx.strokeStyle = rgba(rgb, 0.55 * a);
    ctx.lineWidth = size * 1.6 * a;
    ctx.beginPath();
    ctx.moveTo(f.trail[i - 1].x, f.trail[i - 1].y);
    ctx.lineTo(f.trail[i].x, f.trail[i].y);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 4.2);
  glow.addColorStop(0, rgba([255, 255, 255], 0.95));
  glow.addColorStop(0.25, rgba(rgb, 0.9));
  glow.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size * 4.2, 0, Math.PI * 2);
  ctx.fill();
  if (f.item.tier >= 2 && Math.random() < (f.item.tier === 3 ? 0.9 : 0.45)) {
    f.sparks.push({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, born: now });
  }
  f.sparks = f.sparks.filter(s => {
    const age = (now - s.born) / 1000;
    if (age > 0.55) return false;
    const k = 1 - age / 0.55;
    ctx.fillStyle = rgba(rgb, 0.8 * k);
    ctx.beginPath();
    ctx.arc(s.x + s.vx * age, s.y + s.vy * age, 1.6 * k + 0.4, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });
}

function drawXpBurst(ctx, b, now, light) {
  const age = now - b.start;
  if (age < 0) return true;
  const p = age / b.dur;
  if (p >= 1) return false;
  if (b.kind === 'ring') {
    ctx.strokeStyle = rgba(b.rgb, 0.85 * (1 - p));
    ctx.lineWidth = b.width * (1 - p) + 0.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.maxR * (1 - Math.pow(1 - p, 3)), 0, Math.PI * 2);
    ctx.stroke();
  } else if (b.kind === 'prism') {
    const rad = b.maxR * (1 - Math.pow(1 - p, 3));
    ctx.strokeStyle = rgba(b.rgb, 0.88 * (1 - p));
    ctx.lineWidth = b.width * (1 - p) + 0.6;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - rad);
    ctx.lineTo(b.x + rad * 1.15, b.y);
    ctx.lineTo(b.x, b.y + rad);
    ctx.lineTo(b.x - rad * 1.15, b.y);
    ctx.closePath();
    ctx.stroke();
  } else if (b.kind === 'starlet') {
    // Gentle 4-point awakening starlight blooming softly in the nebula after a rocket ignition!
    const env = Math.sin(Math.min(1, p) * Math.PI);
    const rad = b.maxR * (0.45 + 0.65 * Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5));
    ctx.strokeStyle = rgba(b.rgb, 0.78 * env);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(b.x - rad * 1.6, b.y); ctx.lineTo(b.x + rad * 1.6, b.y);
    ctx.moveTo(b.x, b.y - rad * 1.6); ctx.lineTo(b.x, b.y + rad * 1.6);
    ctx.stroke();
    ctx.fillStyle = rgba([255, 252, 240], 0.92 * env);
    ctx.beginPath();
    ctx.arc(b.x, b.y, rad * 0.36, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.kind === 'sparks') {
    const t = age / 1000;
    ctx.fillStyle = rgba(b.rgb, 0.9 * (1 - p));
    for (const s of b.parts) {
      ctx.beginPath();
      ctx.arc(b.x + s.vx * t, b.y + s.vy * t + 110 * t * t, 2.2 * (1 - p) + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const alpha = Math.min(1, p / 0.12) * (p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1);
    const y = b.y - b.rise * (1 - Math.pow(1 - p, 2));
    const scale = b.pop ? 1 + 0.45 * Math.max(0, 1 - p / 0.16) : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = b.pop ? 5 : 3;
    ctx.strokeStyle = light ? `rgba(255, 255, 255, ${0.85 * alpha})` : `rgba(1, 6, 3, ${0.8 * alpha})`;
    ctx.fillStyle = rgba(b.rgb, alpha);
    ctx.font = `800 ${(b.size * scale).toFixed(1)}px "Geist Mono", ui-monospace, Menlo, "PingFang SC", monospace`;
    ctx.strokeText(b.text, b.x, y);
    ctx.fillText(b.text, b.x, y);
    if (b.sub) {
      ctx.font = '700 12px "Geist Mono", ui-monospace, Menlo, "PingFang SC", monospace';
      ctx.lineWidth = 3;
      ctx.strokeText(b.sub, b.x, y + 17);
      ctx.fillText(b.sub, b.x, y + 17);
    }
    ctx.restore();
  }
  return true;
}

function xpLayer() {
  const canvas = $('#xp-layer');
  if (!canvas) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(innerWidth * dpr);
  const h = Math.round(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function stepXpFlights(now) {
  if (!xpFx.queue.length && !xpFx.flights.length && !xpFx.bursts.length && !xpFx.painted) return;
  const ctx = xpLayer();
  if (!ctx) return;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (state.quiet || reduced) {
    xpFx.queue = [];
    xpFx.flights = [];
    xpFx.bursts = [];
    xpFx.painted = false;
    return;
  }
  xpFx.queue = xpFx.queue.filter(q => now - q.queuedAt <= XP_TTL[q.tier]);
  const next = nextXpLaunch(xpFx.queue, now, xpFx.mem, xpFx.flights.length);
  if (next >= 0) launchXpFlight(xpFx.queue.splice(next, 1)[0], now);
  const light = document.documentElement.dataset.theme === 'light';
  ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
  const prevFlights = xpFx.flights;
  xpFx.flights = [];
  for (const f of prevFlights) {
    if (now < f.start) {
      xpFx.flights.push(f);
      continue;
    }
    if (!f.fixedTarget) f.target = xpTargetPoint(f.item.deptId) || f.target;
    const p = Math.min(1, (now - f.start) / f.dur);
    const pos = xpBezier(f.from, f.target, p * p * (3 - 2 * p));
    f.trail.push(pos);
    if (f.trail.length > 22) f.trail.shift();
    drawXpComet(ctx, f, pos, now);
    if (p < 1) {
      xpFx.flights.push(f);
    } else if (typeof f.onArrive === 'function') {
      f.onArrive(f.target, now);
    } else {
      xpArrive(f.item, f.target, now);
    }
  }
  xpFx.bursts = xpFx.bursts.filter(b => drawXpBurst(ctx, b, now, light));
  ctx.globalCompositeOperation = 'source-over';
  xpFx.painted = xpFx.flights.length > 0 || xpFx.bursts.length > 0;
}

// ============================================================================
// AUTHENTIC AUTOMATED CULTIVATION REALM ENGINE + TACTILE SONAR & CELESTIAL HARP
// Real LEVEL UP / realm ascension is driven EXCLUSIVELY by real automated Lean
// theorem freezes & merged contributions — NEVER by human click-farming!
// Human interactivity provides musical crystal chimes, celestial star-ring strums,
// 3D floor sonar sweeps, and live war-room tracking comets.
// ============================================================================
const HUMAN_SOUND_KEY = 'trureturing-live.sound.v1';
const INSTITUTE_REALMS = [
  { idx: 1, roman: 'I',   min: 0,     max: 5000,  name: '初凝' },
  { idx: 2, roman: 'II',  min: 5000,  max: 10000, name: '筑基' },
  { idx: 3, roman: 'III', min: 10000, max: 15000, name: '结丹' },
  { idx: 4, roman: 'IV',  min: 15000, max: 20000, name: '化神' },
  { idx: 5, roman: 'V',   min: 20000, max: 30000, name: '渡劫' },
  { idx: 6, roman: 'VI',  min: 30000, max: null,  name: '大乘' }
];
const DEPT_NOTES = {
  direction: 587.33,
  research: 523.25,
  review: 466.16,
  verification: 622.25,
  books: 392.00,
  publication: 698.46,
  outreach: 783.99,
  studio: 349.23
};

const sciFiAudio = {
  ctx: null,
  enabled: true,
  unlocked: false,
  ensure() {
    if (!this.enabled || state.quiet || reduced || /jsdom/i.test(navigator.userAgent || '')) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try { this.ctx = new AC(); } catch { return null; }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },
  tone(freq, dur = 0.16, vol = 0.045, type = 'sine', delay = 0) {
    const ac = this.ensure();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.012, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },
  playDept(deptId) {
    this.unlocked = true;
    const f = DEPT_NOTES[deptId] || 523.25;
    this.tone(f, 0.22, 0.045, 'triangle', 0);
    this.tone(f * 1.5, 0.18, 0.022, 'sine', 0.03);
  },
  playSonar() {
    this.unlocked = true;
    // Serene crystalline Xianxia pentatonic harmonic swell
    [293.66, 440.0, 587.33, 659.25, 880.0].forEach((f, i) => {
      this.tone(f, 0.38, 0.028, i % 2 === 0 ? 'sine' : 'triangle', i * 0.055);
    });
  },
  playStarHarp(normX = 0.5) {
    this.unlocked = true;
    const harp = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const idx = Math.max(0, Math.min(harp.length - 1, Math.floor(normX * harp.length)));
    const f = harp[idx];
    this.tone(f, 0.34, 0.036, 'sine', 0);
    this.tone(f * 1.5, 0.28, 0.018, 'triangle', 0.04);
  },
  playLayer(layer) {
    this.unlocked = true;
    const notes = layer === 'galaxy' ? [440, 587.33, 880] : layer === 'station' ? [523.25, 392, 311.13] : [392, 523.25, 622.25];
    notes.forEach((f, i) => this.tone(f, 0.22, 0.032, 'sine', i * 0.055));
  },
  playGalaxy() {
    this.unlocked = true;
    this.tone(659.25, 0.28, 0.036, 'sine', 0);
    this.tone(987.77, 0.32, 0.022, 'triangle', 0.045);
  },
  playNodeChord(prereqs = 1, dependents = 1, layer = 4) {
    this.unlocked = true;
    const scale = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
    const mid = scale[Math.max(1, Math.min(scale.length - 2, (layer || 3) % (scale.length - 2) + 1))];
    if (prereqs > 0) this.tone(mid * 0.75, 0.34, 0.024, 'sine', 0);
    this.tone(mid, 0.30, 0.034, 'triangle', 0.05);
    if (dependents > 0) this.tone(mid * 1.5, 0.36, 0.022, 'sine', 0.11);
    if (prereqs + dependents >= 6) this.tone(mid * 2.0, 0.40, 0.014, 'sine', 0.17);
  },
  playGenesisIntro() {
    if (!this.unlocked) return;
    [293.66, 392.0, 440.0, 587.33, 783.99].forEach((f, i) => {
      this.tone(f, 0.55, 0.022, i % 2 === 0 ? 'sine' : 'triangle', i * 0.14);
    });
  },
  playLevelUp() {
    if (!this.unlocked) return;
    [523.25, 622.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(f, i === 3 ? 0.42 : 0.18, i === 3 ? 0.060 : 0.046, 'triangle', i * 0.085);
      if (i === 3) this.tone(f * 1.5, 0.44, 0.024, 'sine', i * 0.085 + 0.02);
    });
  }
};

try {
  const savedSound = localStorage.getItem(HUMAN_SOUND_KEY);
  if (savedSound === 'off') sciFiAudio.enabled = false;
} catch {}

function realmForTheorems(count) {
  let cur = INSTITUTE_REALMS[0];
  for (const r of INSTITUTE_REALMS) {
    if (count >= r.min) cur = r;
  }
  return cur;
}

const instituteRealm = {
  lastCount: null,
  lastIdx: null
};

function renderSoundToggle() {
  const soundBtn = $('#human-sound-btn');
  const soundIcon = $('#human-sound-icon');
  if (soundBtn) soundBtn.setAttribute('aria-pressed', String(sciFiAudio.enabled));
  if (soundIcon) soundIcon.textContent = sciFiAudio.enabled ? '♪' : '✕';
}

// Updates ONLY from real automated Truth DAG theorem count & real live observations!
function syncInstituteRealm(overrideTotal = null) {
  renderSoundToggle();
  const baseNodes = Number(truthNebula?.counts?.truth_nodes) || 0;
  const total = overrideTotal != null ? overrideTotal : baseNodes;
  if (total <= 0) return;
  const r = realmForTheorems(total);
  const stageEl = $('#realm-stage');
  const nameEl = $('#realm-name');
  const fillEl = $('#realm-xp-fill');
  const metaEl = $('#realm-xp-meta');
  const pill = $('#realm-pill');
  if (stageEl) stageEl.textContent = `${tr('stage_prefix', '境·')}${r.roman}`;
  if (nameEl) nameEl.textContent = i18n()?.realmName ? i18n().realmName(r.idx, r.name) : r.name;
  const pct = r.max
    ? Math.max(4, Math.min(100, ((total - r.min) / Math.max(1, r.max - r.min)) * 100))
    : 100;
  if (fillEl) fillEl.style.width = `${pct.toFixed(1)}%`;
  const growthTag = (truthGrowth.totalRecent || 0) > 0 ? ` · +${truthGrowth.totalRecent}` : '';
  if (metaEl) metaEl.textContent = r.max ? `${total.toLocaleString()}/${r.max.toLocaleString()}${growthTag}` : `${total.toLocaleString()} ${L('定理', 'theorems')}`;

  // Authentic automated breakthrough: fires LEVEL UP ONLY when real observed count genuinely crosses a realm!
  const crossedRealm = instituteRealm.lastIdx != null && r.idx > instituteRealm.lastIdx;
  instituteRealm.lastCount = total;
  instituteRealm.lastIdx = r.idx;
  if (crossedRealm) {
    if (pill) {
      pill.classList.remove('is-level-flash');
      void pill.offsetWidth;
      pill.classList.add('is-level-flash');
      setTimeout(() => pill.classList.remove('is-level-flash'), 1800);
    }
    if (!state.quiet && !reduced) {
      const now = performance.now();
      const center = xpTargetPoint('verification') || { x: innerWidth * 0.42, y: innerHeight * 0.48 };
      for (let k = 0; k < 3; k++) {
        xpFx.bursts.push({ kind: 'ring', x: center.x, y: center.y, rgb: XP_GOLD, start: now + k * 140, dur: 1050, maxR: 84 + k * 46, width: 3.2 - k * 0.7 });
      }
      xpFx.bursts.push({ kind: 'sparks', x: center.x, y: center.y, rgb: XP_GOLD, start: now, dur: 1500, parts: xpParticles(42, 240, 160) });
      const realmLabel = i18n()?.realmName ? i18n().realmName(r.idx, r.name) : r.name;
      xpFx.bursts.push({
        kind: 'text',
        deptId: '__realm__',
        x: center.x,
        y: center.y - 40,
        rgb: XP_GOLD,
        start: now,
        dur: 2500,
        text: `LEVEL UP · ${tr('stage_prefix', '境·')}${r.roman} ${realmLabel}`,
        sub: isEn() ? `Verified theorems crossed ${r.min.toLocaleString()}` : `自动验证突破 ${r.min.toLocaleString()} 定理`,
        size: 25,
        rise: 52,
        pop: true
      });
      sciFiAudio.playLevelUp();
    }
  }
}

// Purely tactile & musical 3D Sonar Sweep (✦ 灵识扫频 — ZERO fake XP, ZERO fake LEVEL UP!)
function triggerSonarSweep() {
  const now = performance.now();
  holoCam.sonarStart = now;
  sciFiAudio.playSonar();

  const btn = $('#sonar-pulse-btn');
  if (btn) {
    btn.classList.remove('is-firing');
    void btn.offsetWidth;
    btn.classList.add('is-firing');
    setTimeout(() => btn.classList.remove('is-firing'), 240);
  }

  // Cascade a calm golden-cyan inspection ripple across genuinely active departments & Akasha Eye
  const list = departments();
  const activeDepts = list.filter(d => countRunning(d) > 0 || d.id === 'verification' || d.id === 'direction');
  activeDepts.forEach((d, idx) => {
    setTimeout(() => {
      spawnHoloPulse(d.id, 1.05);
      if (xpFlowTarget[d.id] && countRunning(d) > 0) spawnSpokeFlare(d.id, xpFlowTarget[d.id]);
      const pt = xpTargetPoint(d.id);
      if (pt && !state.quiet && !reduced) {
        const tHit = performance.now();
        const col = holoWorld[d.id]?.hex || XP_GOLD;
        xpFx.bursts.push({ kind: 'ring', x: pt.x, y: pt.y, rgb: col, start: tHit, dur: 760, maxR: 44, width: 2.0 });
      }
    }, idx * 95);
  });
}

// Celestial Star-Harp Strum (clicking open space in the swirling DAG ring — purely musical & serene!)
function triggerSkyStrum(x, y) {
  const now = performance.now();
  sciFiAudio.playStarHarp(x / Math.max(1, innerWidth));
  if (!state.quiet && !reduced) {
    const col = [148, 224, 248];
    xpFx.bursts.push({ kind: 'ring', x, y, rgb: col, start: now, dur: 920, maxR: 52, width: 1.6 });
    xpFx.bursts.push({ kind: 'ring', x, y, rgb: XP_GOLD, start: now + 90, dur: 980, maxR: 78, width: 1.0 });
    xpFx.bursts.push({ kind: 'sparks', x, y, rgb: col, start: now, dur: 860, parts: xpParticles(10, 95, 35) });
    xpFx.flights.push({
      item: { deptId: 'direction', tier: 1, label: '' },
      from: { x: x - 130 + (Math.random() - 0.5) * 60, y: Math.max(40, y - 105) },
      target: { x: x + 64, y: y + 32, r: 16 },
      fixedTarget: true,
      start: now,
      dur: 540,
      trail: [],
      sparks: [],
      onArrive: () => {}
    });
  }
}

// Clicking any real war-room log row fires a tracking comet to its 3D department (NO fake XP!)
function launchLogClickComet(rowEl, entry) {
  if (!entry?.deptId) return;
  sciFiAudio.playDept(entry.deptId);
  const now = performance.now();
  const box = rowEl.getBoundingClientRect();
  const from = { x: box.left + 24, y: box.top + box.height * 0.5 };
  const target = xpTargetPoint(entry.deptId);
  if (target && !state.quiet && !reduced) {
    const col = holoWorld[entry.deptId]?.hex || [112, 224, 242];
    xpFx.flights.push({
      item: { deptId: entry.deptId, tier: 2, label: L('信号定位', 'Signal Lock') },
      from,
      target,
      start: now,
      dur: 720,
      trail: [],
      sparks: [],
      onArrive: (pt, tArr) => {
        spawnHoloPulse(entry.deptId, 0.95);
        flashXpCell(entry.deptId, 'is-xp-hit', 700);
        xpFx.bursts.push({ kind: 'ring', x: pt.x, y: pt.y, rgb: col, start: tArr, dur: 640, maxR: 42, width: 2.0 });
        const top = xpTextTop(entry.deptId, pt.y - (pt.r || 30) * 0.85, tArr);
        xpFx.bursts.push({ kind: 'text', deptId: entry.deptId, x: pt.x, y: top, rgb: col, start: tArr, dur: 1100, text: `⌖ ${entry.tag || 'LIVE'}`, size: 12.5, rise: 24 });
      }
    });
  }
}

renderSoundToggle();

// ============================================================================
// HIGH-DENSITY SCI-FI WAR-ROOM INTEL STREAM (#scifi-log-stream)
// Purges repetitive CI/Actions boilerplate; broadcasts concrete theorems,
// verifications, book chapters, Mathesis papers & engineering intel while
// cycling each 3D department's live mission readout & firing 3D spoke flares!
// ============================================================================
const scifiLog = {
  acc: 0,
  missionAcc: 0,
  nextGap: 0.34,
  cursor: 0,
  pktCount: 0,
  hoverPaused: false,
  seeded: false,
  mode: 'cycle',
  history: new Map(),
  primed: false,
  holdUntil: 0,
  painted: false,
  stick: true,
  unseen: 0
};
const LOG_SCROLLBACK = 1000;

function fmtClockMs(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

// One readable log entry for a real public activity; null for CI boilerplate.
function activityLogEntry(a) {
  if (['research', 'books'].includes(a.department) && technical.test(a.label)) return null;
  const d = department(a.department);
  const title = cleanWorkTitle(a, d || { id: a.department });
  if (isGenericAutomationTitle(title)) return null;
  if (a.kind === 'automation') {
    return {
      tag: 'VERIFY', tone: 'cyan', deptId: a.department, targetId: 'research',
      text: isEn() ? `${langDeptLabel('verification')} ▸ Verify: ${title}` : `形式验证 ▸ 核验：${title}`
    };
  }
  if (a.department === 'books') {
    return { tag: 'CODEX', tone: 'violet', deptId: 'books', targetId: 'verification', text: `${langDeptLabel('books')} ▸ ${title}` };
  }
  if (a.department === 'publication') {
    return { tag: 'PAPER', tone: 'live', deptId: 'publication', targetId: 'verification', text: `${langDeptLabel('publication')} ▸ ${title}` };
  }
  if (a.department === 'studio') {
    return { tag: 'FORGE', tone: 'cyan', deptId: 'studio', targetId: 'books', text: `${langDeptLabel('studio')} ▸ ${title}` };
  }
  return { tag: 'PROOF', tone: 'live', deptId: a.department, targetId: 'verification', text: `${langDeptLabel(d || a.department, langDeptLabel('research'))} ▸ ${title}` };
}

function buildSciFiLogPool() {
  const pool = [];
  const seenText = new Set();
  const add = item => {
    const k = `${item.deptId}:${item.text}`;
    if (seenText.has(k)) return;
    seenText.add(k);
    pool.push(item);
  };

  const depts = departments();
  const totalHandoffs = (view()?.handoffs || []).length;

  // 1. High-density live missions across ALL 8 departments (true multi-department & Outreach Engine routing!)
  const deptMeta = {
    research:     { tag: 'PROOF',  tone: 'live',   target: 'review' },
    review:       { tag: 'AUDIT',  tone: 'violet', target: 'verification' },
    verification: { tag: 'BRIDGE', tone: 'cyan',   target: 'publication' },
    publication:  { tag: 'PAPER',  tone: 'live',   target: 'outreach' },
    outreach:     { tag: 'COLLAB', tone: 'gold',   target: 'verification' },
    books:        { tag: 'CODEX',  tone: 'violet', target: 'verification' },
    studio:       { tag: 'FORGE',  tone: 'cyan',   target: 'books' },
    direction:    { tag: 'ARCH',   tone: 'gold',   target: 'research' }
  };

  const perDept = depts.map(d => ({ d, missions: departmentMissions(d) }));
  for (let round = 0; round < 4; round++) {
    for (const { d, missions } of perDept) {
      const m = missions[round];
      if (!m) continue;
      const meta = deptMeta[d.id] || { tag: 'INTEL', tone: 'cyan', target: 'verification' };
      add({
        tag: meta.tag,
        tone: meta.tone,
        deptId: d.id,
        targetId: meta.target,
        text: `${langDeptLabel(d)} ▸ ${m}`
      });
    }
  }

  // 2. Concrete deduplicated recent non-boilerplate activities (NEVER bare CI noise!)
  for (const a of (view()?.recent || []).slice(0, 40)) {
    const entry = activityLogEntry(a);
    if (entry) add(entry);
  }

  // 3. Cross-department real citation relays
  for (const b of handoffSummary().slice(0, 5)) {
    const f = langDeptLabel(department(b.from) || b.from);
    const to = langDeptLabel(department(b.to) || b.to);
    add({
      tag: 'RELAY', tone: 'gold', deptId: b.from, targetId: b.to,
      text: isEn() ? `${f} ══▸ ${to} // ${b.count} relays` : `${f} ══▸ ${to} // ${b.count} 条引用接力`
    });
  }

  // 4. Hub summary pulse
  if (totalHandoffs) {
    add({
      tag: 'HUB', tone: 'cyan', deptId: 'verification', targetId: 'research',
      text: isEn()
        ? `Verification Core ▸ 4-way hub · ${totalHandoffs} cross-dept relays`
        : `形式验证枢纽 ▸ 四路汇聚 · ${totalHandoffs} 条跨部门接力`
    });
  }

  return pool.length ? pool : [{ tag: 'BOOT', tone: 'cyan', deptId: 'verification', text: L('正在接入全院实时研究战报流…', 'Connecting to live institute dispatch stream…') }];
}

function sciFiLogRow(entry, fresh, clock) {
  const row = element('button', '', `scifi-log-line is-${entry.tone || 'cyan'}${fresh ? ' is-fresh' : ''}`);
  row.type = 'button';
  row.append(
    element('span', clock, 'log-ts'),
    element('span', entry.tag, 'log-tag'),
    element('span', entry.text, 'log-msg')
  );
  if (entry.deptId) {
    row.addEventListener('click', () => {
      if (state.focused) selectDepartment(entry.deptId, true, true);
      else previewDepartment(entry.deptId);
      if (typeof launchLogClickComet === 'function') launchLogClickComet(row, entry);
    });
  }
  return row;
}

function pushSciFiLogLine(entry, animate = true, offsetMs = 0) {
  const container = $('#scifi-log-stream');
  if (!container) return;
  scifiLog.pktCount += 1;
  const pktEl = $('#log-pkt-count');
  if (pktEl) pktEl.textContent = `PKT #${String(scifiLog.pktCount).padStart(4, '0')}`;
  container.append(sciFiLogRow(entry, animate, fmtClockMs(offsetMs)));
  while (container.children.length > 30) container.firstElementChild?.remove();

  // Only pulse/flare 3D architecture on genuine real-time arrivals, never on synthetic cycle ticks!
  if (animate && entry.real && entry.deptId) {
    spawnHoloPulse(entry.deptId, 0.72);
    if (entry.targetId && entry.targetId !== entry.deptId) {
      spawnSpokeFlare(entry.deptId, entry.targetId);
    }
  }
}

// Latest mode: real public events in time order, newest last; rows change only on a new observation.
function eventClock(value) {
  const t = timestamp(value);
  if (!Number.isFinite(t)) return '--:--:--';
  const d = new Date(t);
  const pad = n => String(n).padStart(2, '0');
  return Date.now() - t < 86400000
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    : `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Latest mode is a terminal: every real event is one line in time order, newest last.
// Lines accumulate across observations (up to LOG_SCROLLBACK) and the view follows
// the bottom unless the reader has scrolled up.
const byLogTime = (a, b) => a.t - b.t || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

function collectSciFiLogHistory() {
  const added = new Set();
  for (const a of view()?.recent || []) {
    const t = timestamp(a.at);
    if (!Number.isFinite(t)) continue;
    const key = eventKey(a);
    if (scifiLog.history.has(key)) continue;
    const entry = activityLogEntry(a);
    if (!entry) continue;
    const plan = xpPlanFor(a);
    scifiLog.history.set(key, { ...entry, key, at: a.at, t, tier: plan.tier, xpFx: plan.fx || 'routine', galaxyCid: plan.galaxyCid ?? null, xpLabel: plan.label });
    added.add(key);
  }
  if (scifiLog.history.size > LOG_SCROLLBACK) {
    const keep = [...scifiLog.history.values()].sort(byLogTime).slice(-LOG_SCROLLBACK);
    scifiLog.history = new Map(keep.map(e => [e.key, e]));
  }
  return added;
}

const logAtBottom = container => container.scrollHeight - container.scrollTop - container.clientHeight < 12;

function updateLogJump() {
  const btn = $('#log-jump-latest');
  if (!btn) return;
  btn.hidden = scifiLog.mode !== 'latest' || scifiLog.stick;
  btn.textContent = scifiLog.unseen
    ? (isEn() ? `↓ ${scifiLog.unseen} new events` : `↓ ${scifiLog.unseen} 条新事件`)
    : tr('log_jump_latest', '↓ 回到最新');
}

function followLatestLog() {
  const container = $('#scifi-log-stream');
  if (container) container.scrollTop = container.scrollHeight;
  scifiLog.stick = true;
  scifiLog.unseen = 0;
  updateLogJump();
}

function renderLatestSciFiLog() {
  const container = $('#scifi-log-stream');
  if (!container || !view()) return;
  // The scrollback records every observation, including those seen while rolling.
  const added = collectSciFiLogHistory();
  const announce = scifiLog.primed;
  scifiLog.primed = true;
  if (announce && added.size) announceMatrixArrivals(added);
  if (scifiLog.mode !== 'latest') return;
  if (scifiLog.painted && !added.size) return;
  const firstPaint = !scifiLog.painted;
  const entries = [...scifiLog.history.values()].sort(byLogTime);
  const prevTop = container.scrollTop;
  container.replaceChildren(...entries.map(e => {
    const row = sciFiLogRow(e, !firstPaint && added.has(e.key), eventClock(e.at));
    row.dataset.logKey = e.key;
    row.dataset.xpTier = String(e.tier ?? 0);
    return row;
  }));
  if (!entries.length) container.append(sciFiLogRow({ tag: 'IDLE', tone: 'muted', text: L('暂无新的公开事件', 'No new public events yet') }, false, '--:--:--'));
  scifiLog.painted = true;
  if (scifiLog.stick) {
    container.scrollTop = container.scrollHeight;
  } else {
    container.scrollTop = prevTop;
    if (!firstPaint) scifiLog.unseen += added.size;
  }
  updateLogJump();
  const pktEl = $('#log-pkt-count');
  if (pktEl) pktEl.textContent = isEn() ? `${entries.length} events` : `${entries.length} 条`;
}

// A real entry joins the rolling stream at once; rolling holds briefly so the
// line stays in view while its comet launches.
function appendRealCycleLine(entry) {
  const container = $('#scifi-log-stream');
  if (!container) return;
  const row = sciFiLogRow(entry, true, eventClock(entry.at));
  row.classList.add('is-real');
  row.dataset.logKey = entry.key;
  row.dataset.xpTier = String(entry.tier ?? 0);
  container.append(row);
  while (container.children.length > 30) container.firstElementChild?.remove();
  scifiLog.holdUntil = performance.now() + 1800;
}

function announceMatrixArrivals(added) {
  const now = Date.now();
  const entries = [...added]
    .map(key => scifiLog.history.get(key))
    .filter(e => e && now - e.t < 900000)
    .sort(byLogTime);
  for (const entry of entries) {
    if (scifiLog.mode === 'cycle') appendRealCycleLine(entry);
    queueXpFlight(entry);
  }
}

function updateLogBadge() {
  const badge = $('#log-rate-badge');
  if (!badge) return;
  let text = L('LATEST · 最新在下', 'LIVE · NEWEST AT BOTTOM');
  if (scifiLog.mode === 'cycle') {
    text = reduced ? L('轮播 · 系统已减少动态', 'CYCLE · REDUCED MOTION')
      : state.quiet ? L('轮播 · 静看中暂停', 'CYCLE · CALM PAUSED')
        : scifiLog.hoverPaused ? L('轮播 · 悬停暂停', 'CYCLE · HOVER PAUSED')
          : L('HIGH-DENSITY INTEL · 轮播', 'HIGH-DENSITY INTEL · CYCLE');
  }
  if (badge.textContent !== text) badge.textContent = text;
}

function setLogMode(mode) {
  scifiLog.mode = mode === 'cycle' ? 'cycle' : 'latest';
  for (const btn of document.querySelectorAll('[data-log-mode]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.logMode === scifiLog.mode));
  }
  const container = $('#scifi-log-stream');
  if (container) {
    container.classList.toggle('is-terminal', scifiLog.mode === 'latest');
    container.replaceChildren();
  }
  scifiLog.seeded = false;
  scifiLog.acc = 0;
  scifiLog.cursor = 0;
  scifiLog.painted = false;
  scifiLog.stick = true;
  scifiLog.unseen = 0;
  updateLogBadge();
  renderLatestSciFiLog();
  updateLogJump();
}

function stepSciFiLog(dt) {
  const container = $('#scifi-log-stream');
  if (!container || /jsdom/i.test(navigator.userAgent || '')) return;

  const motion = !state.quiet && !reduced;
  const rolling = scifiLog.mode === 'cycle' && motion && !scifiLog.hoverPaused && performance.now() >= scifiLog.holdUntil;
  const spec = $('#log-spectrum');
  if (spec) spec.classList.toggle('is-paused', !rolling);
  updateLogBadge();
  if (!view()) return;

  // Cycle mode seeds an initial burst of 30 staggered high-density lines on its first frame.
  if (scifiLog.mode === 'cycle' && !scifiLog.seeded) {
    scifiLog.seeded = true;
    const pool = buildSciFiLogPool();
    for (let i = 0; i < 30; i++) {
      pushSciFiLogLine(pool[i % pool.length], false, -(30 - i) * 340);
    }
    scifiLog.cursor = 30;
  }

  if (!motion) return;

  // Cycle live department mission readouts smoothly across active tasks every ~4.2s
  scifiLog.missionAcc += dt;
  if (scifiLog.missionAcc >= 4.2) {
    scifiLog.missionAcc = 0;
    const archFlowTarget = {
      research: 'review',
      review: 'verification',
      verification: 'publication',
      publication: 'outreach',
      outreach: 'verification',
      books: 'verification',
      studio: 'books'
    };
    for (const [, cell] of state.cells) {
      if (!cell.missions || cell.missions.length <= 1) continue;
      cell.missionIdx = ((cell.missionIdx || 0) + 1) % cell.missions.length;
      cell.status.textContent = cell.missions[cell.missionIdx];
    }
  }

  if (!rolling) return;
  scifiLog.acc += dt;
  if (scifiLog.acc >= scifiLog.nextGap) {
    scifiLog.acc = 0;
    scifiLog.nextGap = 0.28 + (scifiLog.cursor % 5) * 0.055;
    const pool = buildSciFiLogPool();
    const entry = pool[scifiLog.cursor % pool.length];
    scifiLog.cursor += 1;
    pushSciFiLogLine(entry, true);
  }
}

// Cycle mode pauses only while the pointer rests on the log lines, not on its header controls.
const logStreamEl = $('#scifi-log-stream');
if (logStreamEl) {
  logStreamEl.addEventListener('pointerenter', () => { scifiLog.hoverPaused = true; });
  logStreamEl.addEventListener('pointerleave', () => { scifiLog.hoverPaused = false; });
  logStreamEl.addEventListener('scroll', () => {
    if (scifiLog.mode !== 'latest') return;
    scifiLog.stick = logAtBottom(logStreamEl);
    if (scifiLog.stick) scifiLog.unseen = 0;
    updateLogJump();
  }, { passive: true });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      if (scifiLog.mode === 'latest' && scifiLog.stick) logStreamEl.scrollTop = logStreamEl.scrollHeight;
    }).observe(logStreamEl);
  }
}
$('#log-jump-latest')?.addEventListener('click', followLatestLog);
for (const btn of document.querySelectorAll('[data-log-mode]')) {
  btn.addEventListener('click', () => {
    setLogMode(btn.dataset.logMode);
    try {
      localStorage.setItem(logModeKey, scifiLog.mode);
    } catch {}
  });
}
try {
  setLogMode(localStorage.getItem(logModeKey) || 'cycle');
} catch {
  setLogMode('cycle');
}

// ============================================================================
// MAIN 3D BIOMIMETIC RENDER FRAME
// ============================================================================
// Use the space around the projected models. The rear pair prefers the inner
// gaps, and the other wings prefer the outer shoulders of the station.
function placeStationLabels(labels, bounds) {
  const { left, right, top, bottom } = bounds;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const occupied = [];
  const gap = 6;
  const axisX = labels.find(label => label.id === 'verification')?.body.x ?? (left + right) / 2;

  const upper = [null, null];
  const silhouettes = [];
  // Batch layout reads before moving any buttons. Use projected body extents
  // rather than the much larger radius reserved for pointer picking.
  for (const label of labels) {
    label.width = label.cell.button.offsetWidth;
    label.height = label.cell.button.offsetHeight;
    const { x, y } = label.body;
    const radius = label.radius * (label.id === 'verification' || label.apex ? 1.8 : 1.45);
    silhouettes.push({ left: x - radius, right: x + radius, top: y - radius,
      bottom: Math.max(label.anchor.y, y + radius * 0.7) });
    if (label.cell.leader) {
      const side = x < axisX ? 0 : 1;
      if (!upper[side] || y < upper[side].body.y) upper[side] = label;
    }
  }

  // Central labels have fixed attachment points. Place the wings in a stable
  // order so a depth-sort change alone cannot change which card makes room.
  labels.sort((a, b) => a.order - b.order);
  for (const label of labels) {
    const { cell, anchor, apex, scale, body } = label;
    const { button, leader } = cell;
    const hw = label.width * (leader ? 1 : scale) / 2;
    const hh = label.height * (leader ? 1 : scale) / 2;
    let x, cy;
    if (leader) {
      const isUpper = upper.includes(label);
      const outward = body.x < axisX ? -1 : 1;
      const direction = isUpper ? -outward : outward;
      const shoulder = clamp((right - left) / 760, 0.6, 1);
      const offset = hw * shoulder + clamp(label.radius * 0.7, 10, 34);
      const drop = clamp(label.radius * (label.branch ? 0.66 : 0.32), 8, label.branch ? 34 : 18);
      const limitX = v => clamp(v, left + hw, right - hw);
      const limitY = v => clamp(v, top + hh, bottom - hh);
      const preferredX = limitX(anchor.x + direction * offset);
      const preferredY = limitY(isUpper ? body.y : anchor.y + hh + drop);
      const intersects = (cx, y, r) => cx + hw > r.left - gap && cx - hw < r.right + gap &&
        y + hh > r.top - gap && y - hh < r.bottom + gap;
      x = preferredX;
      cy = preferredY;
      const obstacles = silhouettes.concat(occupied);
      if (obstacles.some(r => intersects(x, cy, r))) {
        // The nearest free point touches a side of an obstacle or the stage.
        // Test those coordinates, with a slight preference for the previous
        // offset when two openings are equally close during a slow orbit.
        const xs = new Set([x]), ys = new Set([cy]);
        for (const r of obstacles) {
          xs.add(limitX(r.left - hw - gap - 0.5));
          xs.add(limitX(r.right + hw + gap + 0.5));
          ys.add(limitY(r.top - hh - gap - 0.5));
          ys.add(limitY(r.bottom + hh + gap + 0.5));
        }
        let best = Infinity;
        for (const cx of xs) {
          for (const y of ys) {
            const dx = cx - preferredX, dy = y - preferredY;
            let cost = dx * dx + dy * dy;
            const prev = cell.labelOffset;
            if (prev) cost += 0.12 * ((cx - anchor.x - prev.x) ** 2 + (y - anchor.y - prev.y) ** 2);
            if (cost >= best || occupied.some(r => intersects(cx, y, r))) continue;
            for (const r of silhouettes) {
              const overlapW = Math.min(cx + hw, r.right) - Math.max(cx - hw, r.left);
              const overlapH = Math.min(y + hh, r.bottom) - Math.max(y - hh, r.top);
              if (overlapW > 0 && overlapH > 0) cost += 16 * overlapW * overlapH;
            }
            if (cost < best) { best = cost; x = cx; cy = y; }
          }
        }
      }
      cell.labelOffset = { x: x - anchor.x, y: cy - anchor.y };
      const endX = anchor.x - x + hw, endY = anchor.y - cy + hh;
      const startX = clamp(endX, 0, 2 * hw), startY = clamp(endY, 0, 2 * hh);
      leader.setAttribute('d', `M${startX.toFixed(1)},${startY.toFixed(1)} L${endX.toFixed(1)},${endY.toFixed(1)}`);
    } else {
      x = clamp(anchor.x, left + hw, right - hw);
      cy = clamp(anchor.y + (apex ? -hh : hh), top + hh, bottom - hh);
      button.style.setProperty('--depth-scale', scale.toFixed(3));
      button.classList.toggle('is-apex-label', apex);
    }
    occupied.push({ left: x - hw, right: x + hw, top: cy - hh, bottom: cy + hh });
    const y = leader ? cy : cy + (apex ? hh : -hh);
    button.style.left = `${x.toFixed(1)}px`;
    button.style.top = `${y.toFixed(1)}px`;
    button.style.zIndex = String(label.selected ? 40 : Math.max(1, Math.round(30 - anchor.z)));
    button.classList.add('is-projected');
  }
}

function drawHolo3DFrame(dt = 0.016) {
  const canvas = $('#holo-3d');
  if (!canvas || /jsdom/i.test(navigator.userAgent || '')) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width || window.innerWidth || 1440));
  const h = Math.max(280, Math.round(rect.height || window.innerHeight || 900));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stepDt = Math.max(0, Math.min(0.05, dt));
  if (!state.quiet && !reduced) {
    holoCam.time += stepDt;
    holoCam.bootAge += stepDt;
  } else {
    holoCam.bootAge = 5;
  }
  const t = holoCam.time;

  const isLight = document.documentElement.dataset.theme === 'light';
  const isBlueprint = document.documentElement.dataset.look === 'matrix' || document.documentElement.dataset.look === 'blueprint';
  const isHolo = !isLight && !isBlueprint;

  // Lazy-init real WebGL2 PBR Spatial Engine (gracefully falls back to 2D canvas in jsdom/legacy)
  if (!holoCam.gl && !holoCam.glFailed && typeof window !== 'undefined' && window.TrureGL && !/jsdom/i.test(navigator.userAgent || '')) {
    const glCanvas = $('#holo-gl');
    if (glCanvas) {
      try {
        holoCam.gl = new window.TrureGL(glCanvas);
      } catch {
        holoCam.glFailed = true;
      }
    }
  }
  const useGL = Boolean(holoCam.gl);
  if (!useGL && introCinema.active) skipIntroCinema();
  const activeId = state.hovered || state.selected;
  const isZenHud = $('#research-room')?.classList.contains('is-hud-zen');
  const rightGutter = (w >= 1120 && !isZenHud && !state.focused) ? (w <= 1320 ? 274 : 298) : 0;
  const preset = LAYER_PRESETS[state.layer] || LAYER_PRESETS.mix;

  // Smooth damped 3D camera choreography (3-Strata Layer Transitions + Igloo fly-in + Active Theory parallax!)
  const damp = 1 - Math.exp(-Math.max(0.008, stepDt) * 5.4);
  const targetShiftX = rightGutter > 0 ? (rightGutter / Math.max(1, w)) : 0.0;
  holoCam.ndcShiftX += (targetShiftX - holoCam.ndcShiftX) * damp;

  const galaxyCam = useGL && truthNebula.loaded ? galaxyCameraFocus() : null;
  const galaxyFrame = galaxyCam ? galaxyWorldFrame(galaxyCam.cid) : null;
  holoCam.galaxyMainCid = galaxyFrame ? galaxyCam.cid : null;
  syncGalaxyMainView(galaxyFrame);
  const fly = 1 - Math.exp(-Math.max(0.008, stepDt) * 3.4);
  const fovY = holoCam.gl?.fovY || (40 * Math.PI / 180);
  const stageAspect = Math.max(0.4, (w - rightGutter) / Math.max(1, h));
  const gatherPlan = galaxyFrame ? galaxyGatherPlanFor(galaxyCam.cid, galaxyFrame, fovY, stageAspect) : null;
  const nowMs = performance.now();
  const eligible = growthInsetAllowed({ mode: state.mode, layer: state.layer,
    focusedDepartment: state.focused, manual: Boolean(truthGrowth.manualFocus) });
  const activeGrowth = stepTruthGrowth(nowMs);
  const growthEvents = eligible ? activeGrowth : [];
  if (!growthEvents.length) $('#growth-observations').hidden = true;

  // Step DAG Genesis Time-Scrub playback when open
  if (genesisScrub.open && genesisScrub.playing && !state.quiet && !reduced) {
    genesisScrub.value += stepDt * 0.088;
    if (genesisScrub.value >= 1.0) {
      genesisScrub.value = 1.0;
      genesisScrub.playing = false;
    }
    updateGenesisScrubUI();
  }

  // Compute Opening Sequence (Zenith Dive + Blueprint-to-Crystal Holographic Wave + Layered DAG Genesis)
  let genesisRadius = 99.0;
  let introGenCut = 1.05;
  if (introCinema.active && useGL && !galaxyFrame && !state.focused) {
    if (!introCinema.startMs) introCinema.startMs = nowMs;
    const elapsed = Math.max(0, nowMs - introCinema.startMs);
    const u = Math.min(1, elapsed / INTRO_DURATION_MS);
    introCinema.progress = u;
    const eDive = 1 - Math.pow(1 - u, 3);
    const waveU = Math.max(0, Math.min(1, (u - 0.14) / 0.72));
    genesisRadius = waveU <= 0 ? 0.0 : waveU >= 1 ? 99.0 : (waveU * waveU * (3 - 2 * waveU)) * 26.0;
    introGenCut = Math.min(1.05, (u / 0.78) * 1.05);
    const metaEl = $('#realm-xp-meta');
    if (metaEl && truthNebula.loaded) {
      const totalTh = truthNebula.clusters.reduce((s, c) => s + (c.count || 0), 0) || 18367;
      const curTh = Math.round(totalTh * Math.min(1, u * 1.12));
      metaEl.textContent = isEn()
        ? `${curTh.toLocaleString()} theorems · Genesis ${Math.round(u * 100)}%`
        : `${curTh.toLocaleString()} 定理 · 创世展开 ${Math.round(u * 100)}%`;
    }
    const pill = $('#intro-cinema-pill');
    if (pill) {
      pill.hidden = false;
      const sub = pill.querySelector('span');
      if (sub) {
        sub.textContent = u < 0.35
          ? tr('intro_step1', 'OMEGA OBSERVATORY // ① 周天星海 · 真值 DAG 创世绽放')
          : u < 0.72
            ? tr('intro_step2', 'OMEGA OBSERVATORY // ② 全息蓝图扫描 · 轨道空间站实体化')
            : tr('intro_step3', 'OMEGA OBSERVATORY // ③ 实时自动化观测 · 准备就绪');
      }
    }
    holoCam.lookX = 0.0;
    holoCam.lookY = 5.30 + (preset.lookY - 5.30) * eDive;
    holoCam.lookZ = -1.60 + (preset.lookZ - -1.60) * eDive;
    holoCam.yaw = -0.34 + (holoCam.targetYaw - -0.34) * eDive;
    holoCam.pitch = 0.50 + (preset.pitch - 0.50) * eDive;
    holoCam.dist = 16.0 + (preset.dist - 16.0) * eDive;
    holoCam.stationAlpha = Math.max(0.20, Math.min(1.0, (u - 0.08) / 0.45)) * preset.stationAlpha;
    holoCam.galaxyAlpha = Math.min(1.22, 0.88 + 0.32 * (1 - eDive) + preset.galaxyAlpha * 0.22);
    if (u >= 1.0) {
      skipIntroCinema();
      syncInstituteRealm();
    }
  } else if (galaxyFrame) {
    // Galaxy main view: fly to the galaxy (and the galaxies gathered around it) from the
    // station side; a selected node zooms in further. The station fades back.
    const restPose = galaxyCameraPose(galaxyFrame.center, galaxyFrame.radius, fovY);
    const nodeView = selectedNodeView(galaxyCam.cid, gatherPlan);
    const pose = nodeView
      ? nodeCameraPose(nodeView.world, nodeView.neighbors, fovY, stageAspect, restPose.yaw, restPose.pitch)
      : gatherPlan?.neighbors.length
        ? galaxyCameraPose(galaxyFrame.center, Math.max(gatherPlan.extentY, gatherPlan.extentX / stageAspect), fovY, 0.9)
        : restPose;
    holoCam.lookX += (pose.lookX - holoCam.lookX) * fly;
    holoCam.lookY += (pose.lookY - holoCam.lookY) * fly;
    holoCam.lookZ += (pose.lookZ - holoCam.lookZ) * fly;
    holoCam.yaw += (pose.yaw - holoCam.yaw) * fly;
    holoCam.pitch += (pose.pitch - holoCam.pitch) * fly;
    holoCam.dist += (pose.dist * holoCam.galaxyZoomScale - holoCam.dist) * fly;
    holoCam.stationAlpha += ((gatherPlan?.neighbors.length ? 0.05 : 0.12) - holoCam.stationAlpha) * fly;
    holoCam.galaxyAlpha += (1.3 - holoCam.galaxyAlpha) * fly;
  } else if (useGL && state.focused && holoWorld[state.focused]) {
    const fc = holoWorld[state.focused];
    const flyY = (fc.y || 0) + (fc.eye ? 0.0 : 0.85);
    const flyYaw = (!state.quiet && !reduced) ? Math.sin(t * 0.24) * 0.55 : 0.25;
    holoCam.lookX += (fc.x - holoCam.lookX) * damp;
    holoCam.lookY += (flyY - holoCam.lookY) * damp;
    holoCam.lookZ += (fc.z - holoCam.lookZ) * damp;
    holoCam.yaw += (flyYaw - holoCam.yaw) * damp;
    holoCam.pitch += (0.28 - holoCam.pitch) * damp;
    holoCam.dist += (5.8 - holoCam.dist) * damp;
    holoCam.stationAlpha += (1.0 - holoCam.stationAlpha) * damp;
    holoCam.galaxyAlpha += (0.45 - holoCam.galaxyAlpha) * damp;
  } else if (cinemaDirector.active && useGL && !state.quiet && !reduced) {
    const SHOT_MS = 8200;
    const elapsedC = Math.max(0, nowMs - cinemaDirector.startMs);
    const shotIdx = Math.floor(elapsedC / SHOT_MS) % CINEMA_SHOTS.length;
    const shotFrac = (elapsedC % SHOT_MS) / SHOT_MS;
    const shot = CINEMA_SHOTS[shotIdx];
    const cineDamp = 1 - Math.exp(-Math.max(0.008, stepDt) * 1.45);
    const swayYaw = Math.sin(shotFrac * Math.PI * 2) * 0.085;
    holoCam.lookX += (shot.lookX - holoCam.lookX) * cineDamp;
    holoCam.lookY += (shot.lookY - holoCam.lookY) * cineDamp;
    holoCam.lookZ += (shot.lookZ - holoCam.lookZ) * cineDamp;
    holoCam.yaw += (shot.yaw + swayYaw - holoCam.yaw) * cineDamp;
    holoCam.pitch += (shot.pitch - holoCam.pitch) * cineDamp;
    holoCam.dist += (shot.dist - holoCam.dist) * cineDamp;
    holoCam.stationAlpha += (shot.stationAlpha - holoCam.stationAlpha) * cineDamp;
    holoCam.galaxyAlpha += (shot.galaxyAlpha - holoCam.galaxyAlpha) * cineDamp;
  } else {
    const idleDrift = (!holoCam.dragging && !state.quiet && !reduced) ? Math.sin(t * 0.20) * 0.032 : 0;
    const parallaxX = (!holoCam.dragging && !state.quiet && !reduced) ? holoCam.mouseNormX * 0.048 : 0;
    const parallaxY = (!holoCam.dragging && !state.quiet && !reduced) ? holoCam.mouseNormY * 0.022 : 0;
    holoCam.lookX += (0.0 - holoCam.lookX) * damp;
    holoCam.lookY += (preset.lookY - holoCam.lookY) * damp;
    holoCam.lookZ += (preset.lookZ - holoCam.lookZ) * damp;
    holoCam.yaw += (holoCam.targetYaw + idleDrift + parallaxX - holoCam.yaw) * damp;
    holoCam.pitch += (Math.max(preset.minPitch, Math.min(preset.maxPitch, holoCam.targetPitch + parallaxY)) - holoCam.pitch) * damp;
    holoCam.dist += (holoCam.targetDist - holoCam.dist) * damp;
    holoCam.stationAlpha += (preset.stationAlpha - holoCam.stationAlpha) * damp;
    holoCam.galaxyAlpha += (preset.galaxyAlpha - holoCam.galaxyAlpha) * damp;
  }

  const effectiveGenesisCut = (introCinema.active && useGL)
    ? introGenCut
    : (genesisScrub.open ? genesisScrub.value : 1.05);
  const targetGalaxyBoost = state.layer === 'galaxy' || galaxyFrame ? 1.0 : 0.0;
  holoCam.galaxyBoost += (targetGalaxyBoost - holoCam.galaxyBoost) * damp;
  // Use our unified orbital spiral-galaxy DAG (sized & colored by real dependency count) across all views!
  holoCam.fullAtlasAlpha = 0.0;
  const targetStationFocus = (state.layer === 'station' && !galaxyFrame && !state.focused) ? 1.0 : 0.0;
  holoCam.stationFocus += (targetStationFocus - holoCam.stationFocus) * damp;

  // Age pulses & live streaking spoke comet flares
  for (let i = holoCam.pulses.length - 1; i >= 0; i--) {
    holoCam.pulses[i].age += stepDt * 1.35;
    if (holoCam.pulses[i].age >= 1) holoCam.pulses.splice(i, 1);
  }
  for (let i = holoCam.flares.length - 1; i >= 0; i--) {
    holoCam.flares[i].age += stepDt * 1.15;
    if (holoCam.flares[i].age >= 1) holoCam.flares.splice(i, 1);
  }
  for (let i = holoCam.nebulaRipples.length - 1; i >= 0; i--) {
    holoCam.nebulaRipples[i].age += stepDt * 0.28;
    if (holoCam.nebulaRipples[i].age >= 1) holoCam.nebulaRipples.splice(i, 1);
  }

  // Compute TWO independent Embedded Branch sliding wipers:
  // Branch A (02 独立评审 · 红队审计支路, inner violet rail z=3.08): serves research / books / verification / publication
  // Branch B (06 工具与表达 · 工具基建支路, outer ice-cyan rail z=3.88): serves publication / outreach / books / verification / research
  const REV_BRANCH_TARGETS = ['research', 'books', 'verification', 'publication'];
  const STU_BRANCH_TARGETS = ['publication', 'outreach', 'books', 'verification', 'research'];
  const CORE_RHEOSTAT_DEPTS = ['research', 'books', 'verification', 'publication', 'outreach'];

  let revTarget = 'research';
  if (activeId && REV_BRANCH_TARGETS.includes(activeId)) {
    revTarget = activeId;
  } else {
    const busyRev = REV_BRANCH_TARGETS
      .map(id => ({ id, run: countRunning(department(id)) || 0 }))
      .filter(x => x.run > 0)
      .sort((a, b) => b.run - a.run);
    if (busyRev.length > 1 && !state.quiet && !reduced) {
      revTarget = busyRev[Math.floor(t / 10.5) % busyRev.length].id;
    } else if (busyRev.length) {
      revTarget = busyRev[0].id;
    } else if (!state.quiet && !reduced) {
      revTarget = REV_BRANCH_TARGETS[Math.floor(t / 11.5) % REV_BRANCH_TARGETS.length];
    }
  }

  let stuTarget = 'publication';
  if (activeId && STU_BRANCH_TARGETS.includes(activeId)) {
    stuTarget = activeId;
  } else {
    const busyStu = STU_BRANCH_TARGETS
      .map(id => ({ id, run: countRunning(department(id)) || 0 }))
      .filter(x => x.run > 0 && x.id !== revTarget)
      .sort((a, b) => b.run - a.run);
    const fallbackStu = STU_BRANCH_TARGETS.filter(id => id !== revTarget);
    if (busyStu.length > 1 && !state.quiet && !reduced) {
      stuTarget = busyStu[Math.floor((t + 4.5) / 11.5) % busyStu.length].id;
    } else if (busyStu.length) {
      stuTarget = busyStu[0].id;
    } else if (!state.quiet && !reduced) {
      stuTarget = fallbackStu[Math.floor((t + 4.5) / 12.5) % fallbackStu.length];
    } else {
      stuTarget = fallbackStu[0] || 'publication';
    }
  }

  holoCam.rheostatRevTargetId = revTarget;
  holoCam.rheostatStuTargetId = stuTarget;
  const targetRevX = Math.max(-5.10, Math.min(3.30, (holoWorld[revTarget]?.x || 0) * 0.78));
  const targetStuX = Math.max(-3.30, Math.min(5.10, (holoWorld[stuTarget]?.x || 0) * 0.78));
  holoCam.rheostatRevX += (targetRevX - holoCam.rheostatRevX) * Math.min(1, damp * 0.85);
  holoCam.rheostatStuX += (targetStuX - holoCam.rheostatStuX) * Math.min(1, damp * 0.85);

  const yaw = holoCam.yaw;
  const pitch = holoCam.pitch;
  if (useGL) {
    holoCam.gl.ensureSize(w, h, dpr);
    holoCam.gl.setCamera(yaw, pitch, holoCam.dist,
      holoCam.lookX, holoCam.lookY, holoCam.lookZ, holoCam.ndcShiftX);
  }

  // Exact shared 3D -> 2D projection (sub-pixel locked to WebGL2 camera when active!)
  const cx = w * 0.5;
  const cy = state.focused ? h * 0.52 : h * 0.535;
  const fov = Math.min(Math.min(w, h) * (w > 1360 ? 1.08 : w > 980 ? 0.98 : 0.92), w * 0.84);
  const cosY = Math.cos(holoCam.yaw);
  const sinY = Math.sin(holoCam.yaw);
  const cosP = Math.cos(holoCam.pitch);
  const sinP = Math.sin(holoCam.pitch);
  const lookY = 0.55;
  const lookZ = 0.45;

  const project = useGL
    ? (wx, wy, wz) => holoCam.gl.project(wx, wy, wz)
    : (wx, wy, wz) => {
        const x0 = wx;
        const y0 = wy - lookY;
        const z0 = wz - lookZ;
        const x1 = x0 * cosY - z0 * sinY;
        const z1 = x0 * sinY + z0 * cosY;
        const y2 = y0 * cosP - z1 * sinP;
        const z2 = y0 * sinP + z1 * cosP + holoCam.dist;
        if (z2 < 0.8) return null;
        const s = fov / z2;
        return { x: cx + x1 * s, y: cy - y2 * s, z: z2, s };
      };

  if (useGL) {
    // 1. REAL WEBGL2 3-STRATA GPU SCENE: Ground Abyss + Floating Space Station + Overhead 3D Truth DAG Cosmos!
    const themeIdx = isLight ? 2 : isBlueprint ? 1 : 0;
    const glNebPalette = isBlueprint
      ? [[34,255,122],[74,255,158],[148,255,114],[26,224,128],[92,255,174],[48,242,136],[168,255,124],[34,192,108]]
      : isLight
        ? [[8,96,92],[10,82,138],[142,74,12],[66,48,146],[12,102,82],[24,72,148],[134,78,16],[36,78,94]]
        : [[142,182,224],[154,190,232],[202,188,154],[174,164,218],[146,198,186],[160,184,224],[208,178,164],[158,184,216]];
    const lightEntityPalette = {
      direction: [154, 84, 8], research: [4, 108, 78], review: [55, 48, 163], verification: [3, 83, 136],
      books: [107, 33, 168], publication: [17, 100, 53], outreach: [180, 60, 12], studio: [45, 67, 86]
    };
    if (truthNebula.loaded) {
      const settledConjs = state.settledConjectures || conjectureRecords();
      holoCam.gl.syncTruthDag(truthNebula.stars, truthNebula.edges, truthNebula.clusters, glNebPalette, truthGrowth.recentByCluster, isLight, settledConjs);
    }
    if (truthAtlasFull.loaded && holoCam.gl.syncFullAtlas) {
      holoCam.gl.syncFullAtlas(truthAtlasFull.data, themeIdx);
    }
    stepGalaxyGather(gatherPlan, fly, state.layer === 'galaxy' && !introCinema.active);
    const glEntities = departments().map(d => {
      const cfg = holoWorld[d.id] || { x: 0, y: 0, z: 0, r: 0.7, baseH: 1.2, order: 0, hex: [116, 224, 244] };
      return {
        id: d.id,
        x: cfg.x,
        y: cfg.y || 0,
        z: cfg.z,
        r: cfg.r,
        eye: Boolean(cfg.eye),
        order: cfg.order,
        hEntity: towerHeight(d.id),
        rgb: isBlueprint ? (cfg.eye ? [168, 255, 118] : [34, 255, 122]) : (isLight ? (lightEntityPalette[d.id] || cfg.hex) : cfg.hex),
        isSel: d.id === activeId,
        running: Boolean(countRunning(d))
      };
    });
    const sonarAge = (nowMs - holoCam.sonarStart) / 1000;
    const sonarActive = sonarAge >= 0 && sonarAge < 2.2;
    const sonarU = sonarActive ? sonarAge / 2.2 : 0;
    const totalRunning = departments().reduce((acc, d) => acc + (countRunning(d) || 0), 0);
    const ciLoad = Math.max(0.18, Math.min(1.0, (totalRunning + 2) / 14));
    const detail = holoCam.gl.growthDetail;
    detail.fill(0);
    for (const event of growthEvents) detail[event.cid + 1] = growthInsetOpacity(nowMs - event.start, event.timing);
    const fadeElapsed = nowMs - (holoCam.themeFadeStart || -99999);
    const exposure = (fadeElapsed >= 0 && fadeElapsed < 540)
      ? (0.28 + 0.72 * (1 - Math.pow(1 - fadeElapsed / 540, 3)))
      : 1.0;
    holoCam.gl.render({
      t,
      themeIdx,
      entities: glEntities,
      activeId,
      focusedId: state.focused,
      bootAge: holoCam.bootAge,
      quiet: state.quiet || reduced,
      stationAlpha: holoCam.stationAlpha,
      galaxyAlpha: holoCam.galaxyAlpha,
      galaxyBoost: holoCam.galaxyBoost,
      fullAtlasAlpha: holoCam.fullAtlasAlpha,
      stationFocus: holoCam.stationFocus,
      galaxyFocused: Boolean(galaxyFrame),
      sonarRadius: sonarActive ? (sonarU * 22.0) : 0.0,
      sonarAlpha: sonarActive ? (Math.sin(sonarU * Math.PI) * 0.85) : 0.0,
      rheostatRevX: holoCam.rheostatRevX,
      rheostatStuX: holoCam.rheostatStuX,
      genesisRadius,
      genesisCut: effectiveGenesisCut,
      ciLoad,
      scholarCount: outreachScholarCount(),
      exposure
    });
    // Transparent 2D vector HUD canvas layered cleanly over WebGL2 output
    ctx.clearRect(0, 0, w, h);
    if (state.focused) return;
    // WebGL2 renders the full 3D 0/1 binary flashing curtain natively; in 2D here, add crisp subtle 0/1 bit-burst flashes in open space!
    if (isBlueprint && !state.quiet && !reduced) {
      const safeW = w - rightGutter;
      const bursts = w <= 700 ? 10 : 18;
      ctx.save();
      ctx.font = '600 10.5px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let b = 0; b < bursts; b++) {
        const seed = (b * 137.508) % 360;
        const bx = ((b * 97 + 41) % 86 + 7) / 100 * safeW;
        const by = ((b * 53 + 29) % 72 + 14) / 100 * h;
        // Keep central focal silhouette clean
        const distCenter = Math.hypot((bx / Math.max(1, safeW) - 0.5) * 1.4, (by / Math.max(1, h) - 0.5) * 1.4);
        if (distCenter < 0.28) continue;
        const pulse = Math.pow(Math.max(0, Math.sin(t * (1.7 + (b % 5) * 0.55) + seed)), 12);
        if (pulse < 0.08) continue;
        const tick = Math.floor(t * 9 + b * 7);
        const bitStr = b % 3 === 0
          ? `${(tick >> 2) & 1}${(tick >> 1) & 1}${tick & 1}`
          : `${tick & 1}`;
        ctx.fillStyle = pulse > 0.72
          ? `rgba(224, 255, 232, ${(pulse * 0.72).toFixed(3)})`
          : `rgba(24, 224, 96, ${(pulse * 0.54).toFixed(3)})`;
        ctx.fillText(bitStr, bx, by);
      }
      ctx.restore();
    }
  } else {
    // 2D Canvas Fallback Atmosphere (jsdom tests / software fallback)
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.34, 30, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    if (isLight) {
      bg.addColorStop(0, '#f7f4ec');
      bg.addColorStop(0.6, '#eeeae0');
      bg.addColorStop(1, '#dfd9cc');
    } else if (isBlueprint) {
      bg.addColorStop(0, '#102644');
      bg.addColorStop(0.55, '#0a182d');
      bg.addColorStop(1, '#061020');
    } else {
      bg.addColorStop(0, '#0a1220');
      bg.addColorStop(0.45, '#050912');
      bg.addColorStop(1, '#020408');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  initHoloParticles();

  // 1B. PURE BACKGROUND TRUTH DAG OUTER-RIM CRYSTALLIZATION & ASTRONOMICAL STAR-TRACKER LABELS
  drawTruthDagNebula(ctx, w, h, t, isLight, isBlueprint, growthEvents, nowMs);

  // 1C. INTERACTIVE CONJECTURE LANTERN STARS (sub-pixel hover reticle + click-to-read proof! Ring/focus modes only)
  holoCam.projectedLanterns = [];
  if (useGL && holoCam.galaxyAlpha > 0.20 && holoCam.fullAtlasAlpha < 0.35) {
    const rawLanterns = holoCam.gl.getLanternStars();
    const maxSafeX = rightGutter > 0 ? w - rightGutter - 18 : w - 24;
    for (let i = 0; i < rawLanterns.length; i++) {
      const ls = rawLanterns[i];
      if (ls.gen > effectiveGenesisCut + 0.02) continue;
      const gp = holoCam.gl.applyGather([ls.wx, ls.wy, ls.wz], ls.cid);
      const pt = holoCam.gl.project(gp[0], gp[1], gp[2]);
      if (!pt || pt.x < 18 || pt.x > maxSafeX || pt.y < 52 || pt.y > h - 68) continue;
      holoCam.projectedLanterns.push({ x: pt.x, y: pt.y, z: pt.z, cid: ls.cid, gen: ls.gen, rec: ls.rec });
    }
    if (holoCam.hoveredLantern) {
      const hl = holoCam.projectedLanterns.find(l => (l.rec.url || l.rec.title) === (holoCam.hoveredLantern.rec.url || holoCam.hoveredLantern.rec.title));
      if (hl) {
        const isRef = hl.rec.verdict === 'refuted';
        const lCol = isRef ? (isLight ? [184, 88, 28] : [248, 178, 114]) : (isLight ? [164, 112, 24] : [250, 224, 154]);
        ctx.save();
        ctx.strokeStyle = rgba(lCol, 0.90);
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(hl.x, hl.y, 13, 0, Math.PI * 2);
        ctx.stroke();
        // 4 subtle optical cardinal ticks
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2 + t * 0.45;
          ctx.beginPath();
          ctx.moveTo(hl.x + Math.cos(a) * 10, hl.y + Math.sin(a) * 10);
          ctx.lineTo(hl.x + Math.cos(a) * 18, hl.y + Math.sin(a) * 18);
          ctx.stroke();
        }
        const rawTitle = curLang() === 'en' ? (hl.rec.enTitle || hl.rec.title || 'Settled Conjecture') : (hl.rec.title || hl.rec.enTitle || '已归档猜想');
        const shortT = rawTitle.length > 26 ? `${rawTitle.slice(0, 25)}…` : rawTitle;
        const badge = `${isRef ? tr('lantern_refuted', '✕ 反驳') : tr('lantern_proved', '✓ 已证明')} · ${shortT} · ${tr('lantern_click', '点击读证明')}`;
        ctx.font = '600 10.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
        const tw = ctx.measureText(badge).width + 18;
        const bx = Math.max(24, Math.min(maxSafeX - tw, hl.x - tw * 0.5));
        const by = hl.y > 108 ? hl.y - 34 : hl.y + 20;
        ctx.fillStyle = isLight ? 'rgba(250, 247, 240, 0.94)' : 'rgba(6, 12, 22, 0.92)';
        ctx.strokeStyle = rgba(lCol, 0.65);
        ctx.lineWidth = 1.0;
        ctx.fillRect(bx, by, tw, 22);
        ctx.strokeRect(bx, by, tw, 22);
        ctx.fillStyle = rgba(lCol, 0.98);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge, bx + 9, by + 11.5);
        ctx.restore();
      }
    }
  }

  // 1D. CONSTELLATION HARP SILK TRAIL (Shift + Glide across sky stars!)
  if (holoCam.harpTrail.length) {
    for (let i = holoCam.harpTrail.length - 1; i >= 0; i--) {
      holoCam.harpTrail[i].age += stepDt * 0.85;
      if (holoCam.harpTrail[i].age >= 1) holoCam.harpTrail.splice(i, 1);
    }
    if (holoCam.harpTrail.length >= 2) {
      ctx.save();
      if (!isLight) ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < holoCam.harpTrail.length; i++) {
        const a = holoCam.harpTrail[i - 1];
        const b = holoCam.harpTrail[i];
        const fade = Math.max(0, 1 - Math.max(a.age, b.age));
        const col = i % 2 === 0 ? [248, 224, 158] : [132, 224, 246];
        ctx.strokeStyle = rgba(col, fade * (isLight ? 0.45 : 0.62));
        ctx.lineWidth = 0.8 + fade * 1.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (fade > 0.25) {
          ctx.fillStyle = rgba(col, fade * 0.85);
          ctx.beginPath();
          ctx.arc(b.x, b.y, 1.4 + fade * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // KPR / Active Theory Peripheral Optical Viewfinder Frame (frames the open left-to-center 82% 3D viewport!)
  if (useGL) {
    const isCompactVf = w <= 700;
    const fx0 = isCompactVf ? 10 : 22;
    const fx1 = rightGutter > 0 ? w - rightGutter - 12 : w - (isCompactVf ? 10 : 22);
    const fy0 = isCompactVf ? 10 : 64, fy1 = h - (isCompactVf ? 46 : 70);
    const tick = isCompactVf ? 8 : 12;
    const vfCol = isLight ? [60, 74, 88] : [156, 198, 228];
    ctx.save();
    ctx.strokeStyle = rgba(vfCol, isLight ? 0.24 : 0.20);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 + tick); ctx.lineTo(fx0, fy0); ctx.lineTo(fx0 + tick, fy0);
    ctx.moveTo(fx1 - tick, fy0); ctx.lineTo(fx1, fy0); ctx.lineTo(fx1, fy0 + tick);
    ctx.moveTo(fx0, fy1 - tick); ctx.lineTo(fx0, fy1); ctx.lineTo(fx0 + tick, fy1);
    ctx.moveTo(fx1 - tick, fy1); ctx.lineTo(fx1, fy1); ctx.lineTo(fx1, fy1 - tick);
    ctx.stroke();
    if (isCompactVf) {
      // Compact top-right badge on mobile so top-left stays 100% clear for Nyx Assistant & zero overlap with Akasha Eye!
      const dagTotal = truthNebula.counts?.truth_nodes || 19022;
      const shortTag = state.layer === 'galaxy'
        ? `${L('星系', 'COSMOS')} · ${dagTotal.toLocaleString()}`
        : state.layer === 'station'
          ? L('空间站 · 24/7 环路', 'STATION · 24/7 LOOP')
          : `${L('天地星阵', 'PANORAMA')} · ${holoCam.dist.toFixed(0)}m`;
      ctx.font = '500 8.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = rgba(vfCol, isLight ? 0.62 : 0.56);
      ctx.fillText(shortTag, fx1 - 10, fy0 + 2);
    } else {
      // Live camera azimuth / elevation / dolly / strata readout (top-left inside optical corner, clear of zenith galaxies!)
      const azDeg = (holoCam.yaw * 180 / Math.PI).toFixed(1).padStart(5, ' ');
      const elVal = holoCam.pitch * 180 / Math.PI;
      const elDeg = (elVal >= 0 ? '+' : '') + elVal.toFixed(1);
      const modeTag = introCinema.active
        ? ' · GENESIS SCAN'
        : cinemaDirector.active
          ? ` · ◎ CINEMA`
          : genesisScrub.open
            ? (isEn() ? ` · GENESIS ${Math.round(genesisScrub.value * 100)}%` : ` · 演化 ${Math.round(genesisScrub.value * 100)}%`)
            : '';
      const camTag = isEn() ? (preset.tagEn || preset.tag) : preset.tag;
      const camReadout = `CAM // ${camTag} · AZ ${azDeg}°  EL ${elDeg}°  DOLLY ${holoCam.dist.toFixed(1)}m${modeTag}`;
      ctx.font = '500 8.5px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = rgba(vfCol, isLight ? 0.58 : 0.48);
      ctx.fillText(camReadout, fx0 + 16, fy0 + 3);
    }
    ctx.restore();
    // In Cosmos / Galaxy Observatory mode, hide foreground Space Station 2D overlays
    // EXCEPT keep the Supreme Akasha Eye crowned, projected, clickable, and casting celestial oversight rays over the Truth DAG!
    if (holoCam.stationAlpha < 0.22) {
      holoCam.projectedTowers.clear();
      if (holoCam.galaxyMainCid == null && holoWorld.direction) {
        const eyeCfg = holoWorld.direction;
        const pEye = holoCam.gl.project(eyeCfg.x, eyeCfg.y, eyeCfg.z);
        if (pEye && pEye.x > 20 && pEye.x < w - rightGutter - 20 && pEye.y > (isCompactVf ? 28 : 48) && pEye.y < h - 54) {
          const hitR = Math.max(38, Math.min(76, pEye.s * 1.55));
          holoCam.projectedTowers.set('direction', { x: pEye.x, y: pEye.y, r: hitR, z: pEye.z });
          const eyeRGB = isLight ? [154, 84, 8] : isBlueprint ? [168, 255, 118] : [242, 206, 134];
          const eyeActive = activeId === 'direction';
          const haloR = Math.max(isCompactVf ? 24 : 34, Math.min(isCompactVf ? 46 : 72, pEye.s * 1.48));
          const spin = (state.quiet || reduced) ? 0.35 : t * 0.26;
          ctx.save();
          // 1. Delicate celestial oversight rays streaming from Akasha Eye down to every named Truth DAG galaxy
          for (const [cid, gProj] of holoCam.projectedGalaxies) {
            if (!gProj || gProj.cl?.name === 'Other') continue;
            const isHovG = holoCam.hoveredGalaxy === cid;
            const rayA = isHovG ? (isLight ? 0.48 : 0.52) : (isLight ? 0.16 : 0.19);
            const gGrad = ctx.createLinearGradient(pEye.x, pEye.y + haloR * 0.35, gProj.x, gProj.y);
            gGrad.addColorStop(0, rgba(eyeRGB, rayA * 1.15));
            gGrad.addColorStop(0.55, rgba(eyeRGB, rayA * 0.42));
            gGrad.addColorStop(1, rgba(gProj.col || eyeRGB, rayA * 0.82));
            ctx.strokeStyle = gGrad;
            ctx.lineWidth = isHovG ? 1.25 : 0.72;
            ctx.setLineDash(isHovG ? [] : [3, 6]);
            ctx.lineDashOffset = -(state.quiet || reduced ? 0 : t * 14 + cid * 7);
            ctx.beginPath();
            ctx.moveTo(pEye.x, pEye.y + haloR * 0.32);
            ctx.lineTo(gProj.x, gProj.y);
            ctx.stroke();
            ctx.setLineDash([]);
            if (!state.quiet && !reduced) {
              const uMote = (t * (isHovG ? 0.45 : 0.16) + cid * 0.19) % 1;
              const mx = pEye.x + (gProj.x - pEye.x) * uMote;
              const my = (pEye.y + haloR * 0.32) + (gProj.y - (pEye.y + haloR * 0.32)) * uMote;
              ctx.fillStyle = rgba(isHovG ? eyeRGB : (gProj.col || eyeRGB), Math.sin(uMote * Math.PI) * (isHovG ? 0.92 : 0.56));
              ctx.beginPath();
              ctx.arc(mx, my, isHovG ? 2.2 : 1.35, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          // 2. Precision 2D golden astrolabe crown reticle framing the 3D Akasha Eye
          ctx.strokeStyle = rgba(eyeRGB, eyeActive ? 0.78 : (isLight ? 0.44 : 0.42));
          ctx.lineWidth = eyeActive ? 1.35 : 0.95;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.arc(pEye.x, pEye.y, haloR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + spin;
            const rIn = haloR * (k % 2 === 0 ? 0.88 : 0.93);
            const rOut = haloR * (k % 2 === 0 ? 1.16 : 1.07);
            ctx.strokeStyle = rgba(eyeRGB, k % 2 === 0 ? (eyeActive ? 0.88 : 0.62) : 0.34);
            ctx.lineWidth = k % 2 === 0 ? 1.15 : 0.75;
            ctx.beginPath();
            ctx.moveTo(pEye.x + Math.cos(a) * rIn, pEye.y + Math.sin(a) * rIn);
            ctx.lineTo(pEye.x + Math.cos(a) * rOut, pEye.y + Math.sin(a) * rOut);
            ctx.stroke();
          }
          // 3. Sleek zenith architectural emblem caption cleanly above Akasha Eye's top needle tip (zero overlap!)
          const pEyeTop = holoCam.gl.project(eyeCfg.x, eyeCfg.y + 1.92, eyeCfg.z);
          const capTitle = L('◈ A0 · 阿卡西之眼', '◈ A0 · AKASHA EYE');
          const capSub = L('全局方向 · 统摄真值星海', 'GLOBAL DIRECTION · COSMOS OVERSIGHT');
          const topTipY = pEyeTop ? pEyeTop.y : (pEye.y - haloR * 1.25);
          const capY = isCompactVf
            ? Math.max(36, Math.min(topTipY - 14, pEye.y - haloR * 1.18 - 10))
            : Math.max(98, Math.min(topTipY - 26, pEye.y - haloR * 1.26 - 20));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = isCompactVf
            ? '700 10px "Geist Mono", -apple-system, "PingFang SC", sans-serif'
            : '700 11px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
          ctx.lineWidth = 3.2;
          ctx.strokeStyle = isLight ? 'rgba(242, 239, 232, 0.95)' : 'rgba(2, 6, 12, 0.92)';
          ctx.strokeText(capTitle, pEye.x, capY);
          ctx.fillStyle = rgba(eyeRGB, eyeActive ? 1.0 : 0.95);
          ctx.fillText(capTitle, pEye.x, capY);
          if (!isCompactVf) {
            ctx.font = '500 8.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
            ctx.lineWidth = 2.6;
            ctx.strokeText(capSub, pEye.x, capY + 13.5);
            ctx.fillStyle = rgba(eyeRGB, isLight ? 0.74 : 0.68);
            ctx.fillText(capSub, pEye.x, capY + 13.5);
          }
          ctx.restore();
        }
      }
      return;
    }
  }


  const draw3DRing = (rx, ry, rz, radX, radZ, segs, stroke, lw = 1, dash = null, rot = 0) => {
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2 + rot;
      const pt = project(rx + Math.cos(a) * radX, ry, rz + Math.sin(a) * radZ);
      if (!pt) continue;
      if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.restore();
  };

  const draw3DSeg = (p1, p2, stroke, lw = 1.1) => {
    if (!p1 || !p2) return;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  };

  // 2. Clean dark-space backdrop (random ambient sparkles removed to eliminate visual fatigue!)

  // 3. ZOOMED DEPARTMENT 3D INTERIOR MODE
  if (state.focused) {
    const fCfg = holoWorld[state.focused] || holoWorld.research;
    const rgb = isBlueprint ? [150, 215, 255] : fCfg.hex;
    ctx.save();
    if (!isLight) ctx.globalCompositeOperation = 'lighter';
    for (let ringIdx = 0; ringIdx < 5; ringIdx++) {
      const ry = -1.6 + ringIdx * 1.1;
      const rad = 5.4 - Math.abs(ringIdx - 2) * 0.7;
      draw3DRing(0, ry + 0.7, 0, rad, rad, 6, rgba(rgb, 0.14), 1, null, t * 0.08 * (ringIdx % 2 === 0 ? 1 : -1));
    }
    [2.1, 2.65, 3.25].forEach((gr, gi) => {
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const gx = Math.cos(a) * gr;
        const gy = Math.sin(a) * gr * (gi === 0 ? 0.3 : gi === 1 ? 0.75 : 0.95);
        const gz = Math.sin(a) * gr * (gi === 0 ? 0.95 : gi === 1 ? 0.65 : 0.25);
        const rot = t * (0.28 + gi * 0.11) * (gi % 2 === 0 ? 1 : -1);
        const pt = project(gx * Math.cos(rot) - gz * Math.sin(rot), gy + 0.85, gx * Math.sin(rot) + gz * Math.cos(rot));
        if (!pt) continue;
        if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = rgba(rgb, isLight ? 0.22 : 0.26 - gi * 0.05);
      ctx.lineWidth = gi === 0 ? 1.6 : 1.1;
      ctx.stroke();
    });
    const cY = 0.85, spin = t * 0.65;
    const verts = [[0, cY + 1.05, 0], [0, cY - 1.05, 0], ...[0, 1, 2, 3].map(k => [Math.cos(spin + k * Math.PI / 2) * 0.85, cY, Math.sin(spin + k * Math.PI / 2) * 0.85])].map(v => project(v[0], v[1], v[2]));
    for (const [u, v] of [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,3],[3,4],[4,5],[5,2]]) {
      draw3DSeg(verts[u], verts[v], rgba(rgb, isLight ? 0.35 : 0.55), 1.4);
    }
    ctx.restore();
    return;
  }

  ctx.save();

  // ==========================================================================
  // 4. MATRIX ARCHITECTURAL CAMPUS: 4 SOVEREIGN SECTORS + CENTRAL LEAN BRIDGE
  //    + INDEPENDENT AKASHA EYE (THE ARCHITECT) ABOVE
  // Spacious institutional wing architecture — Lean is the glowing central
  // structural bridge connecting independent wings, NOT swallowing them!
  // ==========================================================================
  const tier1RGB = [229, 192, 123];
  const hubRGB = isBlueprint ? [150, 215, 255] : [116, 224, 244];
  const matrixRGB = isBlueprint ? [125, 185, 245] : [132, 174, 214];
  const titaniumRGB = isLight ? [100, 116, 139] : isBlueprint ? [150, 215, 255] : [148, 188, 224];
  const hubX = 0.0, hubY = 0.22, hubZ = -0.45;
  const eyeCfg = holoWorld.direction;
  const sec1Hot = activeId === 'research' || activeId === 'books';
  const sec2Hot = activeId === 'publication' || activeId === 'outreach';
  const sec3Hot = activeId === 'review';
  const sec4Hot = activeId === 'studio';
  const onDemandHot = sec3Hot || sec4Hot;
  const bridgeHot = activeId === 'verification';

  // Smoothly track gaze toward active department
  const gazeTarget = (activeId && activeId !== 'direction' && holoWorld[activeId]) ? holoWorld[activeId] : holoWorld.verification;
  holoCam.gazeX += (gazeTarget.x - holoCam.gazeX) * 0.09;
  holoCam.gazeZ += (gazeTarget.z - holoCam.gazeZ) * 0.09;

  // 4A..4D. 2D Fallback Campus Geometry (ONLY rendered when WebGL2 is unavailable!)
  if (!useGL) {
  // 4A. Quiet Receding 3D Orbital CAD Floor Grid (crisp hairline architectural depth)
  ctx.save();
  for (let gx = -8; gx <= 8; gx += 2.0) {
    const edgeFade = 1 - Math.abs(gx) / 10;
    draw3DSeg(
      project(gx, -0.04, -4.8),
      project(gx, -0.04, 6.4),
      rgba(matrixRGB, (isLight ? 0.040 : isBlueprint ? 0.052 : 0.036) * edgeFade),
      0.65
    );
  }
  for (let gz = -4.0; gz <= 6.0; gz += 2.0) {
    const zFade = 1 - Math.abs(gz - 0.8) / 7.0;
    draw3DSeg(
      project(-8.6, -0.04, gz),
      project(8.6, -0.04, gz),
      rgba(matrixRGB, (isLight ? 0.040 : isBlueprint ? 0.052 : 0.036) * Math.max(0.25, zFade)),
      0.65
    );
  }
  ctx.restore();

  // 4B. Whisper-subtle atmospheric optical veil beneath the Supervisory Aperture (zero loud pyramid cone!)
  const eyeOrigin = project(eyeCfg.x, eyeCfg.y, eyeCfg.z);
  const rimL = project(-6.20, 0.05, -0.35);
  const rimR = project( 6.20, 0.05, -0.35);
  const eyeBoost = activeId === 'direction' ? 1.85 : 1.0;
  if (eyeOrigin && rimL && rimR) {
    ctx.save();
    const veil = ctx.createLinearGradient(eyeOrigin.x, eyeOrigin.y, eyeOrigin.x, Math.max(rimL.y, rimR.y));
    veil.addColorStop(0, rgba(tier1RGB, (isLight ? 0.045 : 0.038) * eyeBoost));
    veil.addColorStop(0.45, rgba(tier1RGB, (isLight ? 0.012 : 0.010) * eyeBoost));
    veil.addColorStop(1, rgba(tier1RGB, 0));
    ctx.fillStyle = veil;
    ctx.beginPath();
    ctx.moveTo(eyeOrigin.x, eyeOrigin.y);
    ctx.lineTo(rimL.x, rimL.y);
    ctx.lineTo(rimR.x, rimR.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 4C. FOUR CLEAN SOVEREIGN ARCHITECTURAL WING TERRACES (Unified titanium CAD hairlines at rest, crisp accent on active!)
  const drawSectorTerrace = (sx, sz, hx, hz, rgb, isHot = false) => {
    const ch = 0.36;
    const poly = [
      [sx - hx + ch, sz - hz], [sx + hx - ch, sz - hz],
      [sx + hx, sz - hz + ch], [sx + hx, sz + hz - ch],
      [sx + hx - ch, sz + hz], [sx - hx + ch, sz + hz],
      [sx - hx, sz + hz - ch], [sx - hx, sz - hz + ch]
    ];
    const pts = poly.map(([px, pz]) => project(px, 0.0, pz));
    if (pts.some(p => !p)) return;
    const strokeRGB = isHot ? rgb : titaniumRGB;
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = isLight
      ? (isHot ? 'rgba(255, 253, 247, 0.72)' : 'rgba(249, 247, 240, 0.40)')
      : rgba(strokeRGB, isHot ? 0.048 : 0.014);
    ctx.fill();
    ctx.strokeStyle = rgba(strokeRGB, isLight ? (isHot ? 0.56 : 0.20) : (isHot ? 0.54 : 0.14));
    ctx.lineWidth = isHot ? 1.15 : 0.80;
    ctx.stroke();
    ctx.restore();
  };

  drawSectorTerrace(-5.65, -0.50, 1.96, 3.72, holoWorld.research.hex, sec1Hot);
  drawSectorTerrace( 5.65, -0.50, 1.96, 3.72, holoWorld.publication.hex, sec2Hot);
  drawSectorTerrace(-4.25,  5.20, 1.48, 0.96, holoWorld.review.hex, sec3Hot);
  drawSectorTerrace( 4.25,  5.20, 1.48, 0.96, holoWorld.studio.hex, sec4Hot);

  // 4D. PRECISION CAD SUSPENDED LEAN BRIDGE DECK + TWIN TRUSS SPANS
  const drawBridgeSpan = (xStart, xEnd, zCenter, yDeck, halfW, rgb, isHot) => {
    const segs = 4;
    const step = (xEnd - xStart) / segs;
    const strokeMain = rgba(rgb, isLight ? (isHot ? 0.65 : 0.36) : (isHot ? 0.66 : 0.30));
    const strokeTruss = rgba(rgb, isLight ? 0.20 : 0.14);
    const deckCorners = [
      project(xStart, yDeck, zCenter - halfW),
      project(xEnd, yDeck, zCenter - halfW),
      project(xEnd, yDeck, zCenter + halfW),
      project(xStart, yDeck, zCenter + halfW)
    ];
    if (!deckCorners.some(p => !p)) {
      ctx.beginPath();
      deckCorners.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = isLight ? rgba(rgb, 0.10) : rgba(rgb, isHot ? 0.08 : 0.036);
      ctx.fill();
    }
    draw3DSeg(project(xStart, yDeck, zCenter - halfW), project(xEnd, yDeck, zCenter - halfW), strokeMain, 1.05);
    draw3DSeg(project(xStart, yDeck, zCenter + halfW), project(xEnd, yDeck, zCenter + halfW), strokeMain, 1.05);
    for (let i = 0; i < segs; i++) {
      const xa = xStart + i * step, xb = xa + step;
      draw3DSeg(project(xa, yDeck, zCenter - halfW), project(xb, yDeck, zCenter + halfW), strokeTruss, 0.70);
      draw3DSeg(project(xa, yDeck, zCenter + halfW), project(xb, yDeck, zCenter - halfW), strokeTruss, 0.70);
      draw3DSeg(project(xa, yDeck, zCenter - halfW), project(xa, yDeck, zCenter + halfW), strokeTruss, 0.70);
    }
  };
  drawBridgeSpan(-3.67, -1.45, hubZ, hubY * 0.72, 0.44, hubRGB, bridgeHot || sec1Hot);
  drawBridgeSpan( 1.45,  3.67, hubZ, hubY * 0.72, 0.44, hubRGB, bridgeHot || sec2Hot);

  // Sleek precision CAD octagonal CENTRAL LEAN BRIDGE DECK (zero neon glare or rotating dashed radar rings!)
  const drawBridgeDeck = (hx, hy, hz, radX, radZ, rgb) => {
    const sides = 8;
    const topPts = [], botPts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + Math.PI / 8;
      topPts.push(project(hx + Math.cos(a) * radX, hy, hz + Math.sin(a) * radZ));
      botPts.push(project(hx + Math.cos(a) * radX, 0.0, hz + Math.sin(a) * radZ));
    }
    if (topPts.some(p => !p) || botPts.some(p => !p)) return;
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      ctx.beginPath();
      ctx.moveTo(topPts[i].x, topPts[i].y);
      ctx.lineTo(topPts[j].x, topPts[j].y);
      ctx.lineTo(botPts[j].x, botPts[j].y);
      ctx.lineTo(botPts[i].x, botPts[i].y);
      ctx.closePath();
      ctx.fillStyle = isLight ? rgba(rgb, 0.12) : rgba(rgb, 0.085);
      ctx.fill();
      ctx.strokeStyle = rgba(rgb, isLight ? 0.34 : 0.28);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.beginPath();
    topPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = isLight ? 'rgba(235, 250, 246, 0.88)' : 'rgba(8, 18, 28, 0.72)';
    ctx.fill();
    ctx.strokeStyle = rgba(rgb, isLight ? 0.65 : 0.62);
    ctx.lineWidth = 1.25;
    ctx.stroke();
    draw3DRing(hx, hy + 0.01, hz, radX * 0.76, radZ * 0.76, 32, rgba(rgb, isLight ? 0.26 : 0.28), 0.75);
  };
  drawBridgeDeck(hubX, hubY, hubZ, 1.52, 1.22, hubRGB);

  // Subtle boot pulse ring expanding from Central Bridge during 0..1.0s
  if (holoCam.bootAge < 1.0 && !state.quiet && !reduced) {
    const bu = holoCam.bootAge / 1.0;
    draw3DRing(hubX, 0.04, hubZ, 0.8 + bu * 5.8, 0.6 + bu * 4.2, 64, rgba(hubRGB, (1 - bu) * 0.38), 1.1);
  }
  } // end if (!useGL) fallback campus geometry

  // ==========================================================================
  // 5. CLOSED-LOOP WORKFLOW CONDUITS + AKASHA EYE SUPERVISORY GUIDANCE BEAM
  // Below: complete self-contained 24/7 closed-loop around Formal Verification.
  // Above: living golden supervisory focus ray from the Eye of Akasha!
  // ==========================================================================

  // Helper: render a smooth 3D polyline conduit with directional chevrons & photons
  const drawConduit3D = (waypoints, colorRGB, opts = {}) => {
    const { lw = 1.6, alpha = 0.55, dashed = false, particles = 0, speed = 0.35, chevrons = true, bidir = false } = opts;
    const pts = waypoints.map(([x, y, z]) => project(x, y, z));
    if (pts.some(p => !p)) return;

    ctx.save();
    if (dashed) ctx.setLineDash([5, 6]);
    ctx.beginPath();
    pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = rgba(colorRGB, alpha);
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    const segLens = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      segLens.push(l);
      total += l;
    }
    if (total < 6) return;

    const sampleAt = u => {
      const target = Math.max(0, Math.min(1, u)) * total;
      let acc = 0;
      for (let i = 0; i < segLens.length; i++) {
        if (acc + segLens[i] >= target || i === segLens.length - 1) {
          const frac = segLens[i] > 0.001 ? (target - acc) / segLens[i] : 0;
          const x = pts[i].x + (pts[i + 1].x - pts[i].x) * frac;
          const y = pts[i].y + (pts[i + 1].y - pts[i].y) * frac;
          const ang = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
          return { x, y, ang };
        }
        acc += segLens[i];
      }
      return { x: pts[0].x, y: pts[0].y, ang: 0 };
    };

    if (chevrons) {
      const chCount = Math.max(1, Math.min(3, Math.floor(total / 100)));
      ctx.strokeStyle = rgba(colorRGB, Math.min(1, alpha + 0.35));
      ctx.lineWidth = Math.max(1.3, lw * 0.85);
      for (let c = 0; c < chCount; c++) {
        const u = (c + 0.5) / chCount;
        const s = sampleAt(u);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.ang);
        ctx.beginPath(); ctx.moveTo(-4.2, -3.3); ctx.lineTo(3.2, 0); ctx.lineTo(-4.2, 3.3); ctx.stroke();
        ctx.restore();
        if (bidir) {
          const s2 = sampleAt(Math.max(0.16, u - 0.18));
          ctx.save();
          ctx.translate(s2.x, s2.y);
          ctx.rotate(s2.ang + Math.PI);
          ctx.beginPath(); ctx.moveTo(-4.2, -3.3); ctx.lineTo(3.2, 0); ctx.lineTo(-4.2, 3.3); ctx.stroke();
          ctx.restore();
        }
      }
    }

    if (particles > 0 && !state.quiet && !reduced && !isStale()) {
      for (let k = 0; k < particles; k++) {
        const rawU = (t * speed + k / particles) % 1;
        const u = (bidir && k % 2 === 1) ? (1 - rawU) : rawU;
        const s = sampleAt(u);
        ctx.fillStyle = rgba([230, 246, 255], 0.90);
        ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(colorRGB, 0.28);
        ctx.beginPath(); ctx.arc(s.x, s.y, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  // Helper: crisp unboxed whisper-clean holographic caption (safe-clamped clear of right stacked console!)
  const drawHoloText = (wx, wy, wz, text, rgb, isHot = false, size = 9.5) => {
    const pt = project(wx, wy, wz);
    if (!pt) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0, Math.min(1, holoCam.stationAlpha));
    ctx.font = `${isHot ? '600' : '500'} ${size}px "Geist Mono", -apple-system, "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const halfText = ctx.measureText(text).width * 0.5;
    const minTx = 26 + halfText;
    const maxTx = rightGutter > 0 ? w - rightGutter - 18 - halfText : w - 26 - halfText;
    const tx = Math.max(minTx, Math.min(maxTx, pt.x));
    ctx.lineWidth = 3.0;
    ctx.strokeStyle = isLight ? 'rgba(248, 245, 238, 0.94)' : 'rgba(4, 7, 12, 0.92)';
    ctx.strokeText(text, tx, pt.y);
    ctx.fillStyle = isLight ? rgba(rgb, isHot ? 0.96 : 0.86) : rgba(rgb, isHot ? 0.96 : 0.72);
    ctx.fillText(text, tx, pt.y);
    ctx.restore();
  };

  ctx.save();
  if (useGL && holoCam.stationAlpha < 0.99) ctx.globalAlpha = Math.max(0, holoCam.stationAlpha);

  // 1. CAUSALLY CO-LOCATED 3D SPACE STATION CONDUITS + SLIDING RHEOSTAT TAP BEAM + ROAMING MICRO-WORKERS
  const thHot = activeId === 'research' || activeId === 'verification';
  const bkHot = activeId === 'books' || activeId === 'verification';
  const rbHot = activeId === 'research' || activeId === 'books';
  const pbHot = activeId === 'publication' || activeId === 'verification';
  const coHot = activeId === 'outreach' || activeId === 'verification';
  const poHot = activeId === 'publication' || activeId === 'outreach';
  const loopClosedHot = activeId === 'research' || activeId === 'publication' || activeId === 'outreach';

  const calmRGB = isLight ? [100, 116, 139] : isBlueprint ? [150, 215, 255] : [142, 182, 218];
  const mathesisRGB = poHot
    ? [244, 206, 132]
    : (isLight ? [168, 112, 36] : isBlueprint ? [176, 224, 255] : [224, 188, 126]);
  const revBranchRGB = isLight ? [92, 82, 178] : isBlueprint ? [162, 212, 255] : [178, 192, 250];
  const stuBranchRGB = isLight ? [20, 114, 162] : isBlueprint ? [146, 224, 255] : [132, 214, 248];

  // A. LEFT WING (SEC.01 // 理论生产翼: 猜想攻关 + 书籍推进 ⇄ 形式化核枢)
  drawConduit3D(
    [[-4.55, 0.06, -2.45], [-3.10, 0.16, -0.68], [-1.35, 0.22, -0.55]],
    thHot ? holoWorld.research.hex : calmRGB,
    { lw: thHot ? 1.6 : 0.95, alpha: thHot ? 0.80 : 0.28, particles: thHot ? 2 : 1, speed: 0.34, bidir: true, chevrons: thHot }
  );
  drawConduit3D(
    [[-5.05, 0.06, 1.55], [-3.10, 0.16, -0.22], [-1.35, 0.22, -0.32]],
    bkHot ? holoWorld.books.hex : calmRGB,
    { lw: bkHot ? 1.5 : 0.85, alpha: bkHot ? 0.76 : 0.22, particles: bkHot ? 2 : 1, speed: 0.30, bidir: true, chevrons: bkHot }
  );
  // Intra-Left-Wing Theory Co-Production Channel (解决猜想 ⇄ 书籍理论推进)
  drawConduit3D(
    [[-5.45, 0.06, -2.00], [-5.70, 0.06, -0.45], [-5.85, 0.06, 1.15]],
    rbHot ? holoWorld.books.hex : calmRGB,
    { lw: rbHot ? 1.55 : 0.95, alpha: rbHot ? 0.78 : 0.26, particles: rbHot ? 2 : 1, speed: 0.32, bidir: true, chevrons: rbHot }
  );

  // B. RIGHT WING (SEC.02 // 自动论文 · Mathesis 审稿/Preprint ⇄ 200+ 学者对外合作)
  drawConduit3D(
    [[1.35, 0.22, -0.55], [3.10, 0.16, -0.68], [4.55, 0.06, -2.45]],
    pbHot ? holoWorld.publication.hex : calmRGB,
    { lw: pbHot ? 1.6 : 0.95, alpha: pbHot ? 0.80 : 0.28, particles: pbHot ? 2 : 1, speed: 0.34, bidir: true, chevrons: pbHot }
  );
  drawConduit3D(
    [[5.05, 0.06, 1.55], [3.10, 0.16, -0.22], [1.35, 0.22, -0.32]],
    coHot ? holoWorld.outreach.hex : calmRGB,
    { lw: coHot ? 1.45 : 0.82, alpha: coHot ? 0.74 : 0.19, particles: coHot ? 1 : 0, speed: 0.32, bidir: true, chevrons: coHot }
  );
  // Prominent Bidirectional Mathesis Review/Preprint <-> 200+ External Scholars Channel!
  drawConduit3D(
    [[5.45, 0.06, -2.00], [5.74, 0.08, -0.45], [5.85, 0.06, 1.15]],
    mathesisRGB,
    { lw: poHot ? 1.90 : 1.28, alpha: poHot ? 0.88 : 0.52, particles: 2, speed: 0.36, bidir: true, chevrons: true }
  );

  // C. SCHOLAR FEEDBACK RETURN ARC (200+ 学者反馈 ⇢ 新猜想攻关 — closes the 24/7 academic loop!)
  drawConduit3D(
    [[4.55, 0.14, -3.45], [2.40, 0.24, -4.35], [0.0, 0.26, -4.55], [-2.40, 0.24, -4.35], [-4.55, 0.14, -3.45]],
    loopClosedHot ? mathesisRGB : calmRGB,
    { lw: loopClosedHot ? 1.15 : 0.80, alpha: loopClosedHot ? 0.44 : 0.15, dashed: true, particles: loopClosedHot ? 1 : 0, speed: 0.22, chevrons: loopClosedHot }
  );

  // D1. EMBEDDED BRANCH A (02 独立评审 · 红队审计支路 — inner violet sliding rail z = 3.08, x = -5.40..+3.60)
  const revWx = Math.max(-5.10, Math.min(3.30, holoCam.rheostatRevX));
  const revTgt = holoWorld[holoCam.rheostatRevTargetId] || holoWorld.research;
  const revFade = sec4Hot ? 0.35 : 1.0;
  drawConduit3D(
    [[-4.25, 0.08, 4.55], [-4.25, 0.11, 3.08], [revWx, 0.14, 3.08]],
    revBranchRGB,
    { lw: sec3Hot ? 1.65 : 1.0, alpha: (sec3Hot ? 0.84 : 0.38) * revFade, particles: sec3Hot ? 2 : 1, speed: 0.36, chevrons: false }
  );
  drawConduit3D(
    [[revWx, 0.27, 3.08], [(revWx + revTgt.x) * 0.5, 0.56, (3.08 + revTgt.z) * 0.5], [revTgt.x, (revTgt.y || 0) + 0.26, revTgt.z]],
    revBranchRGB,
    { lw: sec3Hot ? 1.60 : 1.05, alpha: (sec3Hot ? 0.82 : 0.42) * revFade, dashed: true, particles: 1, speed: 0.40, chevrons: sec3Hot }
  );
  const revWiperPt = project(revWx, 0.27, 3.08);
  if (revWiperPt) {
    ctx.save();
    ctx.fillStyle = rgba(revBranchRGB, (isLight ? 0.82 : 0.94) * revFade);
    ctx.beginPath();
    ctx.arc(revWiperPt.x, revWiperPt.y, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(revBranchRGB, 0.40 * revFade);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(revWiperPt.x, revWiperPt.y, 6.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // D2. EMBEDDED BRANCH B (06 工具与表达 · 工具基建支路 — outer ice-cyan sliding rail z = 3.88, x = -3.60..+5.40)
  const stuWx = Math.max(-3.30, Math.min(5.10, holoCam.rheostatStuX));
  const stuTgt = holoWorld[holoCam.rheostatStuTargetId] || holoWorld.publication;
  const stuFade = sec3Hot ? 0.35 : 1.0;
  drawConduit3D(
    [[4.25, 0.08, 4.55], [4.25, 0.11, 3.88], [stuWx, 0.14, 3.88]],
    stuBranchRGB,
    { lw: sec4Hot ? 1.65 : 1.0, alpha: (sec4Hot ? 0.84 : 0.38) * stuFade, particles: sec4Hot ? 2 : 1, speed: 0.36, chevrons: false }
  );
  drawConduit3D(
    [[stuWx, 0.27, 3.88], [(stuWx + stuTgt.x) * 0.5, 0.56, (3.88 + stuTgt.z) * 0.5], [stuTgt.x, (stuTgt.y || 0) + 0.26, stuTgt.z]],
    stuBranchRGB,
    { lw: sec4Hot ? 1.60 : 1.05, alpha: (sec4Hot ? 0.82 : 0.42) * stuFade, dashed: true, particles: 1, speed: 0.40, chevrons: sec4Hot }
  );
  const stuWiperPt = project(stuWx, 0.27, 3.88);
  if (stuWiperPt) {
    ctx.save();
    ctx.fillStyle = rgba(stuBranchRGB, (isLight ? 0.82 : 0.94) * stuFade);
    ctx.beginPath();
    ctx.arc(stuWiperPt.x, stuWiperPt.y, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(stuBranchRGB, 0.40 * stuFade);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(stuWiperPt.x, stuWiperPt.y, 6.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // E. TWO INDEPENDENT MICRO-WORKER SQUADS (Branch A: 7 Violet Diamond Review Scouts · Branch B: 7 Ice-Cyan Square Foundry Drones)
  if (!holoCam.workers.length) {
    for (let i = 0; i < 14; i++) {
      const role = i < 7 ? 'review' : 'studio';
      const pool = role === 'review' ? REV_BRANCH_TARGETS : STU_BRANCH_TARGETS;
      const tgt = pool[i % pool.length];
      const c0 = holoWorld[tgt];
      const ang = (i / 14) * Math.PI * 2;
      holoCam.workers.push({
        role,
        targetId: tgt,
        x: c0.x + Math.cos(ang) * 1.15,
        y: (c0.y || 0) + 0.82 + (i % 3) * 0.22,
        z: c0.z + Math.sin(ang) * 1.15,
        vx: 0,
        vz: 0,
        orbitR: 0.96 + (i % 4) * 0.14,
        orbitY: 0.70 + (i % 3) * 0.26,
        orbitSpd: (i % 2 === 0 ? 1 : -1) * (0.48 + (i % 5) * 0.09),
        phase: ang,
        nextSwitch: 4.5 + (i * 1.37) % 9.0
      });
    }
  }
  const activeRevPool = REV_BRANCH_TARGETS.filter(id => (countRunning(department(id)) || 0) > 0);
  const activeStuPool = STU_BRANCH_TARGETS.filter(id => (countRunning(department(id)) || 0) > 0);
  const wFollow = 1 - Math.exp(-Math.max(0.008, stepDt) * 1.9);
  for (let i = 0; i < holoCam.workers.length; i++) {
    const wk = holoCam.workers[i];
    const isRevW = wk.role === 'review';
    const branchPool = isRevW
      ? (activeRevPool.length ? activeRevPool : REV_BRANCH_TARGETS)
      : (activeStuPool.length ? activeStuPool : STU_BRANCH_TARGETS);
    const branchPrimary = isRevW ? holoCam.rheostatRevTargetId : holoCam.rheostatStuTargetId;
    if (!state.quiet && !reduced) {
      // First 3 workers of each branch rally to that branch's active wiper target; others patrol that branch's live demand!
      const localIdx = isRevW ? i : (i - 7);
      if (localIdx < 3) {
        wk.targetId = branchPrimary;
      } else if (t >= wk.nextSwitch) {
        wk.nextSwitch = t + 7.0 + ((i * 2.3) % 7.5);
        wk.targetId = branchPool[(Math.floor(t) + i) % branchPool.length];
      }
      const tc = holoWorld[wk.targetId] || holoWorld.verification;
      const orbAng = wk.phase + t * wk.orbitSpd;
      const goalX = tc.x + Math.cos(orbAng) * wk.orbitR;
      const goalY = (tc.y || 0) + wk.orbitY + Math.sin(t * 1.4 + wk.phase) * 0.10;
      const goalZ = tc.z + Math.sin(orbAng) * wk.orbitR;
      const prevX = wk.x, prevZ = wk.z;
      wk.x += (goalX - wk.x) * wFollow;
      wk.y += (goalY - wk.y) * wFollow;
      wk.z += (goalZ - wk.z) * wFollow;
      wk.vx = (wk.x - prevX) / Math.max(0.008, stepDt);
      wk.vz = (wk.z - prevZ) / Math.max(0.008, stepDt);
    }
    const wp = project(wk.x, wk.y, wk.z);
    if (!wp) continue;
    const wFade = (isRevW && sec4Hot) || (!isRevW && sec3Hot) ? 0.32 : 1.0;
    const wCol = isRevW ? revBranchRGB : stuBranchRGB;
    const speed = Math.hypot(wk.vx, wk.vz);
    if (speed > 1.1) {
      const tailP = project(wk.x - wk.vx * 0.14, wk.y, wk.z - wk.vz * 0.14);
      if (tailP) {
        ctx.strokeStyle = rgba(wCol, (isLight ? 0.36 : 0.40) * wFade);
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(tailP.x, tailP.y);
        ctx.lineTo(wp.x, wp.y);
        ctx.stroke();
      }
    }
    const rD = Math.max(2.6, Math.min(4.2, wp.s * 0.062));
    if (isRevW) {
      // Branch A Review Scout: Violet-silver diamond + delicate orbital halo
      ctx.strokeStyle = rgba(wCol, (isLight ? 0.36 : 0.38) * wFade);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, rD * 1.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(wCol, (isLight ? 0.84 : 0.92) * wFade);
      ctx.beginPath();
      ctx.moveTo(wp.x, wp.y - rD);
      ctx.lineTo(wp.x + rD * 0.9, wp.y);
      ctx.lineTo(wp.x, wp.y + rD);
      ctx.lineTo(wp.x - rD * 0.9, wp.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Branch B Foundry Drone: Ice-cyan framed micro-cube glyph
      const hs = rD * 1.38;
      ctx.strokeStyle = rgba(wCol, (isLight ? 0.46 : 0.52) * wFade);
      ctx.lineWidth = 0.85;
      ctx.strokeRect(wp.x - hs, wp.y - hs, hs * 2, hs * 2);
      ctx.fillStyle = rgba(wCol, (isLight ? 0.84 : 0.92) * wFade);
      const cs = rD * 0.72;
      ctx.fillRect(wp.x - cs, wp.y - cs, cs * 2, cs * 2);
    }
    ctx.fillStyle = rgba(isLight ? wCol : [245, 252, 255], 0.68 * wFade);
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, rD * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Restrained live telemetry flares
  for (const fl of holoCam.flares) {
    const a = holoWorld[fl.fromId], b = holoWorld[fl.toId];
    if (!a || !b) continue;
    const u = fl.age;
    const tailU = Math.max(0, u - 0.16);
    const ptAt = frac => {
      const lx = a.x + (b.x - a.x) * frac;
      const lz = a.z + (b.z - a.z) * frac;
      const ly = (a.y || 0.08) + ((b.y || 0.16) - (a.y || 0.08)) * frac + Math.sin(frac * Math.PI) * 0.35;
      return project(lx, ly, lz);
    };
    const pHead = ptAt(u), pTail = ptAt(tailU);
    if (!pHead || !pTail) continue;
    const fade = Math.sin(u * Math.PI);
    const grad = ctx.createLinearGradient(pTail.x, pTail.y, pHead.x, pHead.y);
    grad.addColorStop(0, rgba(fl.rgb, 0));
    grad.addColorStop(1, rgba([230, 248, 255], fade * 0.78));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pTail.x, pTail.y); ctx.lineTo(pHead.x, pHead.y); ctx.stroke();
    ctx.fillStyle = rgba([245, 252, 255], fade * 0.9);
    ctx.beginPath(); ctx.arc(pHead.x, pHead.y, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();

  // ==========================================================================
  // 8. EIGHT PRECISION SCI-FI 3D CAD HOLOGRAPHIC DEPARTMENT INSTRUMENTS
  // Fine-line architectural wireframes with restrained glass depth — zero neon blowout!
  // ==========================================================================
  const drawBiomimetic = (id, cfg, hEntity, yBase, rgb, isSel, running, bootK, pulseBoost) => {
    const cx3 = cfg.x, cz3 = cfg.z;
    const glowA = Math.min(1.0, (isSel ? 0.86 : running ? 0.68 : 0.46) + pulseBoost * 0.22);
    const fillA = isLight ? 0.14 : (isSel ? 0.14 : running ? 0.085 : 0.05) + pulseBoost * 0.06;
    const hiRGB = isLight ? rgb : [220, 236, 250];

    ctx.save();

    // Precision CAD Hex Pedestal Ring (crisp hairlines, zero spinning dashed game rings!)
    if (!cfg.eye) {
      draw3DRing(cx3, yBase + 0.02, cz3, cfg.r * 0.94 * bootK, cfg.r * 0.94 * bootK, 6, rgba(rgb, glowA * 0.56), isSel ? 1.25 : 0.85, null, Math.PI / 6);
      draw3DRing(cx3, yBase + 0.02, cz3, cfg.r * 0.54 * bootK, cfg.r * 0.54 * bootK, 6, rgba(rgb, glowA * 0.28), 0.65, null, Math.PI / 6);
      if (isSel) {
        draw3DRing(cx3, yBase + 0.03, cz3, cfg.r * 1.22, cfg.r * 1.22, 6, rgba(rgb, 0.52), 0.9, null, Math.PI / 6);
      }
    }

    const nightPalette = !isLight && !isBlueprint ? StationModels.colors : null;
    if (id === 'direction') {
      // 01 SUPERVISORY OPTICAL APERTURE (监管之眼 · 精密光学轨道视界 — zero cartoon eyelashes!)
      const sy = yBase + Math.sin(t * 1.1) * 0.03;
      const ePt = project(cx3, sy, cz3);
      if (ePt) {
        const sc = Math.max(0.65, ePt.s / 62) * bootK;
        const wEye = 50 * sc;
        const hEye = 20 * sc;

        ctx.save();
        ctx.translate(ePt.x, ePt.y);

        // Minimalist concentric orbital optical reticle rings + hairline crosshairs
        ctx.strokeStyle = rgba(rgb, isLight ? 0.28 : 0.24);
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(0, 0, wEye * 0.86, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.rotate(StationModels.dialPoles[0] + t * 0.18);
        ctx.strokeStyle = rgba(rgb, isLight ? 0.52 : 0.62);
        ctx.beginPath();
        for (let i = 1; i < 12; i++) {
          if (i === 6) continue;
          const theta = i * Math.PI / 6;
          const inner = wEye * (i % 3 === 0 ? 0.76 : 0.81);
          ctx.moveTo(inner * Math.cos(theta), inner * Math.sin(theta));
          ctx.lineTo(wEye * 0.86 * Math.cos(theta), wEye * 0.86 * Math.sin(theta));
        }
        ctx.stroke();
        ctx.restore();

        // Opposite sights on one Bloch measurement axis, centred on the original reticle.
        for (const [i, angle] of StationModels.dialPoles.entries()) {
          ctx.save();
          ctx.rotate(angle + t * 0.18);
          ctx.translate(wEye * 0.86, 0);
          ctx.beginPath();
          ctx.moveTo(-3.8 * sc, 0);
          ctx.lineTo(0, -2.6 * sc);
          ctx.lineTo(3.8 * sc, 0);
          ctx.lineTo(0, 2.6 * sc);
          ctx.closePath();
          ctx.fillStyle = rgba(i === 0 ? rgb : hiRGB, 0.90);
          ctx.fill();
          ctx.restore();
        }

        // Cardinal reticle hairlines (precision aerospace optics)
        for (const [x1, y1, x2, y2] of [
          [-wEye * 1.16, 0, -wEye * 0.96, 0],
          [ wEye * 0.96, 0,  wEye * 1.16, 0],
          [0, -hEye * 1.65, 0, -hEye * 1.25],
          [0,  hEye * 1.25, 0,  hEye * 1.65]
        ]) {
          ctx.strokeStyle = rgba(rgb, isLight ? 0.42 : 0.36);
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }

        // Clean sculpted Vesica optical aperture
        ctx.beginPath();
        ctx.moveTo(-wEye, 0);
        ctx.quadraticCurveTo(0, -hEye * 1.32, wEye, 0);
        ctx.quadraticCurveTo(0,  hEye * 1.32, -wEye, 0);
        ctx.closePath();
        ctx.fillStyle = isLight ? 'rgba(255, 252, 244, 0.84)' : 'rgba(6, 10, 16, 0.86)';
        ctx.fill();
        ctx.strokeStyle = rgba(rgb, glowA * 0.95);
        ctx.lineWidth = 1.25;
        ctx.stroke();

        // Calm tracking optical iris (follows active department)
        ctx.save();
        ctx.clip();
        const gxOff = Math.max(-1, Math.min(1, holoCam.gazeX / 5.2)) * (wEye * 0.24);
        const gyOff = Math.max(-0.3, Math.min(1, (holoCam.gazeZ + 1.5) / 5.5)) * (hEye * 0.18);
        const rIris = hEye * 0.74;

        const ig = ctx.createRadialGradient(gxOff, gyOff, 1, gxOff, gyOff, rIris * 1.15);
        ig.addColorStop(0, rgba(hiRGB, 0.55));
        ig.addColorStop(0.45, rgba(rgb, 0.42));
        ig.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(gxOff, gyOff, rIris * 1.15, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = rgba(rgb, 0.82);
        ctx.lineWidth = 1.0;
        ctx.beginPath(); ctx.arc(gxOff, gyOff, rIris, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rgba(hubRGB, 0.55);
        ctx.lineWidth = 0.75;
        ctx.beginPath(); ctx.arc(gxOff, gyOff, rIris * 0.56, 0, Math.PI * 2); ctx.stroke();
        for (let b = 0; b < 8; b++) {
          const ba = (b / 8) * Math.PI * 2 + t * 0.18;
          ctx.strokeStyle = rgba(rgb, 0.36);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(gxOff + Math.cos(ba) * rIris * 0.56, gyOff + Math.sin(ba) * rIris * 0.56);
          ctx.lineTo(gxOff + Math.cos(ba) * rIris * 0.98, gyOff + Math.sin(ba) * rIris * 0.98);
          ctx.stroke();
        }

        ctx.fillStyle = isLight ? '#1c1914' : '#04070c';
        ctx.beginPath(); ctx.arc(gxOff, gyOff, rIris * 0.34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(hiRGB, 0.90);
        ctx.beginPath(); ctx.arc(gxOff - rIris * 0.12, gyOff - rIris * 0.12, Math.max(1.3, rIris * 0.10), 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
      }
    } else if (id === 'research') {
      // 02 MATH RESEARCH (数学攻坚): Precision Slow-Rotating Geodesic Polyhedron CAD Wireframe (zero flashing strobe!)
      const cy3 = yBase + hEntity * 0.56 * bootK;
      const rad = 0.66 * bootK;
      const spin = t * 0.18;
      const crystal = nightPalette?.cyan || rgb;
      const crownTint = nightPalette?.violet || hiRGB;
      const { vertices, faces } = StationModels.icosahedron;
      const cs = Math.cos(spin), sn = Math.sin(spin);
      const nodes = vertices.map(([x, y, z]) => project(
        cx3 + rad * (x * cs - z * sn), cy3 + y * rad, cz3 + rad * (x * sn + z * cs)
      ));
      for (const [i, j, k] of faces) {
        const a = nodes[i], b = nodes[j], c = nodes[k];
        if (!a || !b || !c) continue;
        const front = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
        const crown = i === 0 || j === 0 || k === 0;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
        if (crown && front) {
          ctx.fillStyle = rgba(crownTint, 0.34);
          ctx.fill();
        }
        ctx.strokeStyle = rgba(crown ? crownTint : crystal, (front ? 0.58 : 0.18) * glowA);
        ctx.lineWidth = crown && front ? 1.3 : 0.75;
        ctx.stroke();
      }
      draw3DSeg(project(cx3, 0.04, cz3), project(cx3, cy3 - rad * 0.84, cz3), rgba(rgb, 0.42), 1.0);
      draw3DRing(cx3, cy3, cz3, rad * 1.18, rad * 1.18, 32, rgba(rgb, 0.24), 0.75);
    } else if (id === 'verification') {
      // CENTRAL HUB (形式验证): Precision Ice-Cyan Architectural Double-Helix Lattice inside Hairline Prism Frame
      const hHelix = hEntity * bootK;
      const rH = 0.56 * bootK;
      const turns = 2.0;
      const steps = 28;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        draw3DSeg(project(cx3 + Math.cos(a) * (rH * 1.26), yBase + 0.04, cz3 + Math.sin(a) * (rH * 1.26)),
          project(cx3 + Math.cos(a) * (rH * 1.26), yBase + hHelix, cz3 + Math.sin(a) * (rH * 1.26)), rgba(rgb, 0.24), 0.75);
      }
      draw3DRing(cx3, yBase + hHelix, cz3, rH * 1.26, rH * 1.26, 4, rgba(rgb, 0.52), 1.0, null, Math.PI / 4);
      const apexTop = project(cx3, yBase + hHelix + 0.34 * bootK, cz3);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        draw3DSeg(apexTop, project(cx3 + Math.cos(a) * (rH * 1.26), yBase + hHelix, cz3 + Math.sin(a) * (rH * 1.26)), rgba(hiRGB, glowA * 0.58), 0.85);
      }
      const sA = [], sB = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const a = u * Math.PI * 2 * turns + t * 0.52;
        const py = yBase + 0.08 + u * (hHelix - 0.12);
        sA.push(project(cx3 + Math.cos(a) * rH, py, cz3 + Math.sin(a) * rH));
        sB.push(project(cx3 + Math.cos(a + Math.PI) * rH, py, cz3 + Math.sin(a + Math.PI) * rH));
        if (i % 4 === 0) {
          draw3DSeg(sA[i], sB[i], rgba(rgb, running ? 0.52 : 0.28), 0.80);
        }
      }
      for (const strand of [sA, sB]) {
        ctx.beginPath();
        strand.forEach((pt, idx) => { if (pt) idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y); });
        ctx.strokeStyle = rgba(rgb, glowA * 0.92);
        ctx.lineWidth = 1.30;
        ctx.stroke();
      }
      if (running && !state.quiet && !reduced) {
        const su = (t * 0.36) % 1;
        draw3DRing(cx3, yBase + 0.08 + su * hHelix, cz3, rH * 1.30, rH * 1.30, 16, rgba(hiRGB, Math.sin(su * Math.PI) * 0.55), 0.95);
      }
    } else if (id === 'books') {
      // 05 THEORY BOOKS (理论书写): Fine-Line Glass Architectural Codex
      const py = 0.34 * bootK + Math.sin(t * 1.0) * 0.03;
      const wLeaf = 0.74 * bootK, dLeaf = 0.50 * bootK, lift = 0.20 * bootK;
      draw3DSeg(project(cx3, 0.04, cz3), project(cx3, py, cz3), rgba(rgb, 0.38), 1.0);
      const lastPage = StationModels.jetPages.length - 1;
      for (const { order: lv, trace } of StationModels.jetPages) {
        const pageTint = nightPalette ? (lv === 2 ? nightPalette.cyan : nightPalette.violet) : rgb;
        const yL = py + (lv / lastPage) * 0.20 * bootK;
        const arch = (lv === lastPage ? 0.25 : 0.13 + lv * 0.025) * bootK;
        const spF = project(cx3, yL, cz3 + dLeaf), spB = project(cx3, yL, cz3 - dLeaf);
        const lMF = project(cx3 - wLeaf * 0.52, yL + arch, cz3 + dLeaf), lMB = project(cx3 - wLeaf * 0.52, yL + arch, cz3 - dLeaf);
        const lEF = project(cx3 - wLeaf, yL + lift * 0.55, cz3 + dLeaf), lEB = project(cx3 - wLeaf, yL + lift * 0.55, cz3 - dLeaf);
        const rMF = project(cx3 + wLeaf * 0.52, yL + arch, cz3 + dLeaf), rMB = project(cx3 + wLeaf * 0.52, yL + arch, cz3 - dLeaf);
        const rEF = project(cx3 + wLeaf, yL + lift * 0.55, cz3 + dLeaf), rEB = project(cx3 + wLeaf, yL + lift * 0.55, cz3 - dLeaf);
        for (const poly of [[spF, lMF, lEF, lEB, lMB, spB], [spF, rMF, rEF, rEB, rMB, spB]]) {
          if (poly.some(p => !p)) continue;
          ctx.beginPath();
          poly.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
          ctx.closePath();
          ctx.fillStyle = rgba(pageTint, fillA * (lv === lastPage ? 1.15 : 0.65));
          ctx.fill();
          ctx.strokeStyle = rgba(pageTint, glowA * (lv === lastPage ? 0.78 : 0.44));
          ctx.lineWidth = lv === lastPage ? 1.1 : 0.75;
          ctx.stroke();
        }
        // Index the truncation order on the front edge of each leaf.
        for (let k = 0; k <= lv; k++) {
          const x = cx3 + (0.24 + k * 0.075) * wLeaf;
          const y = yL + (0.24 + k * 0.075) * arch / 0.52;
          draw3DSeg(project(x, y, cz3 + dLeaf), project(x + 0.03 * wLeaf, y + 0.012 * bootK, cz3 + dLeaf),
            rgba(k === lv ? (nightPalette?.amber || hiRGB) : pageTint, 0.84), 1.15);
        }
        if (lv === lastPage) {
          ctx.beginPath();
          for (const [i, [x, sum]] of trace.entries()) {
            const u = 0.52 + 0.42 * x;
            const pageHeight = u <= 0.52 ? arch * u / 0.52 : arch + (lift * 0.55 - arch) * (u - 0.52) / 0.48;
            const pt = project(cx3 + wLeaf * u, yL + pageHeight + 0.012 * bootK, cz3 + dLeaf * (0.62 - 0.42 * sum));
            if (pt) i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
          }
          ctx.strokeStyle = rgba(nightPalette?.violet || hiRGB, 0.80);
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }
      const turnA = ((t * 0.34) % 1) * Math.PI;
      const yTop = py + 0.24 * bootK;
      const tX = cx3 + Math.cos(turnA) * wLeaf * 0.86;
      const tY = yTop + Math.sin(turnA) * wLeaf * 0.74;
      const turnPoly = [
        project(cx3, yTop, cz3 + dLeaf * 0.90),
        project(tX, tY, cz3 + dLeaf * 0.90),
        project(tX, tY, cz3 - dLeaf * 0.90),
        project(cx3, yTop, cz3 - dLeaf * 0.90)
      ];
      if (!turnPoly.some(p => !p)) {
        ctx.beginPath();
        turnPoly.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
        ctx.fillStyle = rgba(hiRGB, Math.sin(turnA) * 0.10);
        ctx.fill();
        ctx.strokeStyle = rgba(hiRGB, Math.sin(turnA) * 0.65);
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    } else if (id === 'studio') {
      // 08 STUDIO & TOOLING (工具与表达): Precision Titanium CAD Gears + Holo Cube
      const cy3 = 0.52 * bootK;
      draw3DSeg(project(cx3, 0.04, cz3), project(cx3, cy3, cz3), rgba(rgb, 0.45), 1.15);
      const drawGear = (gx, gy, gz, rIn, rOut, dir, vertical = false) => {
        ctx.beginPath();
        const teeth = 8, pts = teeth * 4;
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * Math.PI * 2 + t * 0.36 * dir;
          const rG = (i % 4 < 2 ? rOut : rIn) * bootK;
          const pt = vertical
            ? project(gx + Math.cos(a) * rG, gy + Math.sin(a) * rG, gz)
            : project(gx + Math.cos(a) * rG, gy, gz + Math.sin(a) * rG);
          if (!pt) continue;
          if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        }
        ctx.fillStyle = rgba(nightPalette?.violet || rgb, fillA * 1.1);
        ctx.fill();
        ctx.strokeStyle = rgba(nightPalette?.violet || hiRGB, glowA * 0.78);
        ctx.lineWidth = 1.0;
        ctx.stroke();
      };
      drawGear(cx3 - 0.16 * bootK, cy3, cz3, 0.42, 0.58, 1, false);
      drawGear(cx3 + 0.34 * bootK, cy3 + 0.36 * bootK, cz3, 0.26, 0.40, -1.4, true);
      const cY = cy3 + 0.70 * bootK, cubeHalf = 0.20 * bootK, rot = t * 0.42;
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const cubeV = StationModels.bladeCorners.map(([x, y, z]) =>
        project(cx3 - 0.16 * bootK + (x * cs - z * sn) * cubeHalf,
          cY + y * cubeHalf, cz3 + (x * sn + z * cs) * cubeHalf));
      for (const { mask, toMask, lit } of StationModels.bladeEdges) {
        draw3DSeg(cubeV[mask], cubeV[toMask], rgba(lit ? (nightPalette?.cyan || hiRGB) : (nightPalette?.violet || rgb), glowA * (lit ? 0.95 : 0.42)), lit ? 1.2 : 0.7);
      }
    }

    if (StationModels.ids.includes(id)) {
      const { vertices, faces, lift, speed, breathBasis } = StationModels.get(id, true);
      const yaw = t * speed, cs = Math.cos(yaw), sn = Math.sin(yaw);
      const phase = (state.quiet || reduced ? 4.2 : t) * .72;
      const breath = breathBasis && [Math.cos(phase), Math.sin(phase), Math.cos((1 + Math.sqrt(5)) * .5 * phase)];
      const projected = vertices.map(([x, y, z], i) => {
        let scale = bootK;
        if (breath) {
          const [a, b, c] = breathBasis[i];
          scale *= .78 * (1 + a * breath[0] + b * breath[1] + c * breath[2]);
        }
        return project(cx3 + scale * (cs * x + sn * z), yBase + bootK * lift + scale * y,
          cz3 + scale * (cs * z - sn * x));
      });
      const visible = [];
      for (const face of faces) {
        let depth = 0;
        for (const index of face.indices) {
          if (!projected[index]) { depth = -1; break; }
          depth += projected[index].z;
        }
        if (depth >= 0) visible.push({ face, depth: depth / face.indices.length });
      }
      visible.sort((a, b) => b.depth - a.depth);
      for (const { face } of visible) {
        const { indices, finish, normal } = face;
        const [nx, ny, nz] = normal;
        const facing = Math.abs(-0.50 * (cs * nx + sn * nz) + 0.75 * ny + 0.42 * (cs * nz - sn * nx));
        ctx.fillStyle = finish.shades[Math.round(11 * facing)];
        const first = projected[indices[0]];
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        for (let k = 1; k < indices.length; k++) {
          const p = projected[indices[k]];
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Restrained Live Intel Pulse Ring
    for (const p of holoCam.pulses) {
      if (p.id !== id) continue;
      const rad = cfg.r * (0.95 + p.age * 1.25);
      draw3DRing(cx3, yBase + 0.04, cz3, rad, rad, 24, rgba(rgb, (1 - p.age) * 0.48 * p.strength), 1.0);
    }

    ctx.restore();
  };

  const list = departments();
  const sorted = list
    .map(d => {
      const cfg = holoWorld[d.id] || { x: 0, y: 0, z: 0, r: 0.7, baseH: 1.2, order: 0, hex: [116, 224, 244] };
      const center = project(cfg.x, cfg.y + towerHeight(d.id) * 0.5, cfg.z);
      return { d, cfg, depth: center ? center.z : 999 };
    })
    .sort((a, b) => b.depth - a.depth);

  const labels = [];
  holoCam.projectedTowers.clear();

  for (const { d, cfg } of sorted) {
    const rawBoot = Math.max(0, Math.min(1, (holoCam.bootAge - cfg.order * 0.03) / 0.32));
    const bootK = 1 - Math.pow(1 - rawBoot, 3);

    const hEntity = towerHeight(d.id);
    const yBase = cfg.y || 0;
    const running = Boolean(countRunning(d));
    const isSel = d.id === activeId;
    const rgb = isBlueprint ? [150, 215, 255] : cfg.hex;
    const pulseObj = holoCam.pulses.find(p => p.id === d.id);
    const pulseBoost = pulseObj ? (1 - pulseObj.age) : 0;

    if (!useGL && bootK > 0.02) {
      // 2D Fallback ambient reflection & vector sculptures (WebGL2 renders real PBR shaded monoliths!)
      if (!cfg.eye) {
        const gPt = project(cfg.x, yBase + 0.02, cfg.z);
        if (gPt) {
          const gRad = cfg.r * gPt.s * (isSel ? 1.45 : running ? 1.15 : 0.92) * bootK;
          const glow = ctx.createRadialGradient(gPt.x, gPt.y, 2, gPt.x, gPt.y, Math.max(8, gRad));
          glow.addColorStop(0, rgba(rgb, isLight ? 0.10 : (isSel ? 0.18 : running ? 0.10 : 0.05) + pulseBoost * 0.08));
          glow.addColorStop(1, rgba(rgb, 0));
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.ellipse(gPt.x, gPt.y, gRad, gRad * 0.48, 0, 0, Math.PI * 2); ctx.fill();
        }
      }

      if (isSel && !isLight && !cfg.eye) {
        const topBeam = project(cfg.x, yBase + hEntity + 0.9, cfg.z);
        const botBeam = project(cfg.x, yBase, cfg.z);
        if (topBeam && botBeam) {
          ctx.save();
          const bgGrad = ctx.createLinearGradient(botBeam.x, botBeam.y, topBeam.x, topBeam.y);
          bgGrad.addColorStop(0, rgba(rgb, 0.12));
          bgGrad.addColorStop(0.65, rgba(rgb, 0.03));
          bgGrad.addColorStop(1, rgba(rgb, 0));
          ctx.strokeStyle = bgGrad;
          ctx.lineWidth = Math.max(10, cfg.r * botBeam.s * 0.42);
          ctx.beginPath(); ctx.moveTo(botBeam.x, botBeam.y); ctx.lineTo(topBeam.x, topBeam.y); ctx.stroke();
          ctx.restore();
        }
      }

      drawBiomimetic(d.id, cfg, hEntity, yBase, rgb, isSel, running, bootK, pulseBoost);
    }

    // Model picking uses the sculpture center, independent of its callout.
    const anchorPt = cfg.apex
      ? project(cfg.x, yBase + 1.18, cfg.z)
      : project(cfg.x, yBase - 0.06, cfg.z + cfg.r * (d.id === 'verification' ? 1.05 : 0.85));
    const bodyCenter = project(cfg.x, yBase + (cfg.eye ? 0.0 : hEntity * 0.55), cfg.z);
    const cell = state.cells.get(d.id);
    if (cell) cell.button.hidden = !(anchorPt && bodyCenter);
    if (anchorPt && bodyCenter) {
      holoCam.projectedTowers.set(d.id, { x: bodyCenter.x, y: bodyCenter.y, r: Math.max(48, cfg.r * bodyCenter.s * 1.48) });
      if (cell) {
        labels.push({ cell, id: d.id, order: cfg.order, branch: cfg.onDemand, anchor: anchorPt, body: bodyCenter, radius: cfg.r * bodyCenter.s,
          scale: Math.max(0.84, Math.min(1.04, 16.5 / anchorPt.z)), apex: Boolean(cfg.apex), selected: isSel });
      }
    }
  }

  const controls = $('.scene-controls').getBoundingClientRect();
  placeStationLabels(labels, {
    left: controls.left - rect.left,
    right: controls.right - rect.left,
    top: controls.top - rect.top + 24,
    bottom: controls.bottom - rect.top - 40
  });

  // Supreme Akasha Eye Precision Gaze Beam + Celestial Crown Halo + Rotating 12-Tick Astrolabe Crown over tracked department!
  if (useGL && holoCam.stationAlpha > 0.25) {
    const gazeId = (activeId && activeId !== 'direction' && holoWorld[activeId]) ? activeId : 'verification';
    const gazeY = (gazeTarget.y || 0) + towerHeight(gazeId) + 0.34;
    const pEyeCenter = project(eyeCfg.x, eyeCfg.y, eyeCfg.z);
    const pEye = project(eyeCfg.x, eyeCfg.y - 0.14, eyeCfg.z);
    const pCrown = project(holoCam.gazeX, gazeY, holoCam.gazeZ);
    const gazeRGB = isLight ? [154, 102, 28] : isBlueprint ? [168, 255, 118] : [242, 206, 134];
    const sfEye = holoCam.stationFocus;
    // Crown reticle + golden supervisory tethers in Station mode so Akasha Eye visibly commands the 24/7 loop!
    if (pEyeCenter) {
      const eyeHaloR = Math.max(26, Math.min(58, pEyeCenter.s * (1.28 + sfEye * 0.22)));
      const eyeSpin = (state.quiet || reduced) ? 0.3 : t * 0.24;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, holoCam.stationAlpha)) * (0.48 + sfEye * 0.44);
      ctx.strokeStyle = rgba(gazeRGB, isLight ? 0.44 : 0.46);
      ctx.lineWidth = 0.9 + sfEye * 0.3;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(pEyeCenter.x, pEyeCenter.y, eyeHaloR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + eyeSpin;
        const rIn = eyeHaloR * (k % 2 === 0 ? 0.88 : 0.93);
        const rOut = eyeHaloR * (k % 2 === 0 ? 1.15 : 1.06);
        ctx.strokeStyle = rgba(gazeRGB, k % 2 === 0 ? 0.65 : 0.32);
        ctx.lineWidth = k % 2 === 0 ? 1.1 : 0.75;
        ctx.beginPath();
        ctx.moveTo(pEyeCenter.x + Math.cos(a) * rIn, pEyeCenter.y + Math.sin(a) * rIn);
        ctx.lineTo(pEyeCenter.x + Math.cos(a) * rOut, pEyeCenter.y + Math.sin(a) * rOut);
        ctx.stroke();
      }
      if (sfEye > 0.15) {
        // Golden canopy telemetry rays anchoring Akasha Eye to Core Verification + Left & Right Wings!
        const anchorIds = ['research', 'verification', 'publication'];
        for (let ai = 0; ai < anchorIds.length; ai++) {
          const aid = anchorIds[ai];
          const aCfg = holoWorld[aid];
          if (!aCfg) continue;
          const pDst = project(aCfg.x, (aCfg.y || 0) + towerHeight(aid) + 0.18, aCfg.z);
          if (!pDst) continue;
          const isCore = aid === 'verification';
          const grad = ctx.createLinearGradient(pEyeCenter.x, pEyeCenter.y + eyeHaloR * 0.35, pDst.x, pDst.y);
          grad.addColorStop(0, rgba(gazeRGB, (isCore ? 0.56 : 0.30) * sfEye));
          grad.addColorStop(0.55, rgba(gazeRGB, (isCore ? 0.22 : 0.10) * sfEye));
          grad.addColorStop(1, rgba(isBlueprint ? [64, 255, 146] : aCfg.hex, (isCore ? 0.48 : 0.28) * sfEye));
          ctx.strokeStyle = grad;
          ctx.lineWidth = isCore ? 1.25 : 0.82;
          ctx.setLineDash(isCore ? [5, 5] : [3, 7]);
          ctx.lineDashOffset = -(state.quiet || reduced ? 0 : t * (isCore ? 22 : 14) + ai * 9);
          ctx.beginPath();
          ctx.moveTo(pEyeCenter.x, pEyeCenter.y + eyeHaloR * 0.35);
          ctx.lineTo(pDst.x, pDst.y);
          ctx.stroke();
          ctx.setLineDash([]);
          if (!state.quiet && !reduced) {
            const uPulse = (t * (isCore ? 0.38 : 0.24) + ai * 0.33) % 1;
            const px = pEyeCenter.x + (pDst.x - pEyeCenter.x) * uPulse;
            const py = (pEyeCenter.y + eyeHaloR * 0.35) + (pDst.y - (pEyeCenter.y + eyeHaloR * 0.35)) * uPulse;
            ctx.fillStyle = rgba(gazeRGB, Math.sin(uPulse * Math.PI) * (isCore ? 0.92 : 0.68) * sfEye);
            ctx.beginPath();
            ctx.arc(px, py, isCore ? 2.2 : 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }
    if (pEye && pCrown) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, holoCam.stationAlpha)) * (activeId ? 0.88 : (0.52 + sfEye * 0.28));
      const beamGrad = ctx.createLinearGradient(pEye.x, pEye.y, pCrown.x, pCrown.y);
      beamGrad.addColorStop(0, rgba(gazeRGB, 0.56));
      beamGrad.addColorStop(0.5, rgba(gazeRGB, 0.20));
      beamGrad.addColorStop(1, rgba(gazeRGB, 0.52));
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = activeId ? 1.15 : (0.85 + sfEye * 0.25);
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -(state.quiet || reduced ? 0 : t * 18);
      ctx.beginPath();
      ctx.moveTo(pEye.x, pEye.y);
      ctx.lineTo(pCrown.x, pCrown.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!state.quiet && !reduced) {
        const uBead = (t * 0.42) % 1;
        const bx = pEye.x + (pCrown.x - pEye.x) * uBead;
        const by = pEye.y + (pCrown.y - pEye.y) * uBead;
        ctx.fillStyle = rgba(gazeRGB, 0.94 * Math.sin(uBead * Math.PI));
        ctx.beginPath();
        ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Delicate rotating 12-tick golden astrolabe ring hovering above tracked department spire
    const astR = (gazeTarget.r || 0.72) * 0.92;
    const astSpin = (state.quiet || reduced) ? 0.3 : t * 0.35;
    draw3DRing(holoCam.gazeX, gazeY, holoCam.gazeZ, astR, astR, 36, rgba(gazeRGB, (activeId ? 0.42 : 0.22) * holoCam.stationAlpha), 0.9, [3, 4], astSpin);
    ctx.save();
    ctx.globalAlpha = (activeId ? 0.48 : 0.24) * holoCam.stationAlpha;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + astSpin;
      const rIn = astR * (k % 3 === 0 ? 0.80 : 0.88);
      const rOut = astR * (k % 3 === 0 ? 1.12 : 1.04);
      const p1 = project(holoCam.gazeX + Math.cos(a) * rIn, gazeY, holoCam.gazeZ + Math.sin(a) * rIn);
      const p2 = project(holoCam.gazeX + Math.cos(a) * rOut, gazeY, holoCam.gazeZ + Math.sin(a) * rOut);
      draw3DSeg(p1, p2, rgba(gazeRGB, 0.9), k % 3 === 0 ? 1.05 : 0.75);
    }
    ctx.restore();
  }

  // Verified Collaborating Scholars Deep-Space Radio Beacon Waves (05 学术交流 dish -> right horizon beacons!)
  const scholarCount = outreachScholarCount();
  if (useGL && holoCam.stationAlpha > 0.25) {
    const dishPt = project(5.85, 1.38, 1.90);
    const farPt = project(11.4, 2.95, 2.15);
    const beaconRGB = isLight ? [168, 108, 28] : isBlueprint ? [150, 218, 255] : [244, 194, 108];
    if (dishPt && farPt) {
      const dx = farPt.x - dishPt.x;
      const dy = farPt.y - dishPt.y;
      const dirAng = Math.atan2(dy, dx);
      ctx.save();
      ctx.globalAlpha = holoCam.stationAlpha * (coHot || poHot ? 0.85 : 0.50);
      // 3 expanding soft amber radio signal arcs propagating outward toward the 223 scholar beacons
      for (let k = 0; k < 3; k++) {
        const u = ((state.quiet || reduced ? 0.45 : t * 0.26) + k / 3) % 1;
        const rx = dishPt.x + dx * (0.08 + u * 0.78);
        const ry = dishPt.y + dy * (0.08 + u * 0.78);
        const rad = 10 + u * 34;
        const al = Math.sin(u * Math.PI) * 0.58;
        ctx.strokeStyle = rgba(beaconRGB, al);
        ctx.lineWidth = 1.15 - u * 0.45;
        ctx.beginPath();
        ctx.arc(rx, ry, rad, dirAng - 0.52, dirAng + 0.52);
        ctx.stroke();
      }
      // Subtle returning scholar feedback light pulse traveling back to the dish
      if (!state.quiet && !reduced) {
        const uRet = (t * 0.34 + 0.5) % 1;
        const bx = farPt.x - dx * uRet;
        const by = farPt.y - dy * uRet;
        ctx.fillStyle = rgba([255, 232, 174], Math.sin(uRet * Math.PI) * 0.85);
        ctx.beginPath();
        ctx.arc(bx, by, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Dedicated 空间站 (Station) Active-Loop Telemetry FX: live animated pipeline chevrons, active output rings & wiper contact arcs!
  if (useGL && holoCam.stationFocus > 0.18 && holoCam.stationAlpha > 0.45) {
    const sf = holoCam.stationFocus;
    const loopPaths = [
      // Closed 24/7 institutional loop: Research -> Verification -> Publication -> Outreach -> Books -> Research
      { a: [-5.30, 0.36, -2.55], b: [-0.85, 0.36, -0.55], col: isBlueprint ? [34, 255, 122] : (isLight ? [4, 108, 78] : [94, 234, 212]), n: 3 },
      { a: [-5.85, 0.36,  1.65], b: [-0.85, 0.36, -0.35], col: isBlueprint ? [78, 255, 158] : (isLight ? [107, 33, 168] : [174, 184, 238]), n: 2 },
      { a: [ 0.85, 0.36, -0.55], b: [ 5.30, 0.36, -2.55], col: isBlueprint ? [42, 255, 136] : (isLight ? [3, 83, 136] : [125, 211, 252]), n: 3 },
      { a: [ 5.45, 0.36, -2.00], b: [ 5.80, 0.36,  1.45], col: isBlueprint ? [156, 255, 118] : (isLight ? [154, 84, 8] : [244, 200, 118]), n: 3 },
      { a: [ 5.80, 0.36,  1.45], b: [ 5.45, 0.36, -2.00], col: isBlueprint ? [120, 255, 150] : (isLight ? [180, 60, 12] : [250, 224, 156]), n: 2 },
      // Active branch wiper contact taps from Branch A (Review) & Branch B (Studio) to their serviced wing!
      { a: [holoCam.rheostatRevX, 0.32, 3.08], b: [holoWorld[holoCam.rheostatRevTargetId]?.x || 0, 0.42, holoWorld[holoCam.rheostatRevTargetId]?.z || 0], col: isBlueprint ? [56, 255, 146] : revBranchRGB, n: 2 },
      { a: [holoCam.rheostatStuX, 0.32, 3.88], b: [holoWorld[holoCam.rheostatStuTargetId]?.x || 0, 0.42, holoWorld[holoCam.rheostatStuTargetId]?.z || 0], col: isBlueprint ? [96, 255, 178] : stuBranchRGB, n: 2 }
    ];
    ctx.save();
    ctx.globalAlpha = sf * 0.90;
    for (let li = 0; li < loopPaths.length; li++) {
      const lp = loopPaths[li];
      const p0 = project(lp.a[0], lp.a[1], lp.a[2]);
      const p1 = project(lp.b[0], lp.b[1], lp.b[2]);
      if (!p0 || !p1) continue;
      ctx.strokeStyle = rgba(lp.col, isLight ? 0.52 : (isBlueprint ? 0.54 : 0.46));
      ctx.lineWidth = li >= 5 ? 1.15 : 1.45;
      ctx.setLineDash(isBlueprint ? [2.5, 4.5] : (li >= 5 ? [4, 5] : [6, 5]));
      ctx.lineDashOffset = -(state.quiet || reduced ? 0 : t * (isBlueprint ? 52 : 34));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Racing live loop energy beads (discrete high-speed green data packets in Matrix | luminous white-core beads in Holo/Light!)
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const ang = Math.atan2(dy, dx);
      for (let k = 0; k < lp.n; k++) {
        const u = ((state.quiet || reduced ? 0.3 : t * (isBlueprint ? 0.56 : 0.42)) + k / lp.n + li * 0.13) % 1;
        const bx = p0.x + dx * u;
        const by = p0.y + dy * u;
        if (isBlueprint) {
          // Segmented Matrix digital packet + incandescent #e8ffea leading head
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(ang);
          ctx.fillStyle = 'rgba(0, 255, 65, 0.55)';
          ctx.fillRect(-12, -1.4, 5, 2.8);
          ctx.fillStyle = 'rgba(61, 255, 122, 0.82)';
          ctx.fillRect(-5.5, -1.6, 5, 3.2);
          ctx.fillStyle = 'rgba(232, 255, 234, 0.98)';
          ctx.fillRect(1, -1.8, 3.6, 3.6);
          ctx.restore();
        } else {
          ctx.fillStyle = rgba(lp.col, 0.92);
          ctx.beginPath();
          ctx.arc(bx, by, 2.7, 0, Math.PI * 2);
          ctx.fill();
          // Pure-white luminous core anchor signaling active live execution!
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.beginPath();
          ctx.arc(bx, by, 1.15, 0, Math.PI * 2);
          ctx.fill();
        }
        // Tiny forward arrow chevron showing pipeline flow direction
        ctx.strokeStyle = isLight ? rgba(lp.col, 0.92) : 'rgba(245, 255, 252, 0.92)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(bx - Math.cos(ang - 0.55) * 5.2, by - Math.sin(ang - 0.55) * 5.2);
        ctx.lineTo(bx + Math.cos(ang) * 2.5, by + Math.sin(ang) * 2.5);
        ctx.lineTo(bx - Math.cos(ang + 0.55) * 5.2, by - Math.sin(ang + 0.55) * 5.2);
        ctx.stroke();
      }
    }
    // Live active department output pulses (rising pulsing beacon rings over every currently active department!)
    for (const d of departments()) {
      const run = countRunning(d);
      if (!run || d.id === 'direction') continue;
      const cfg = holoWorld[d.id];
      if (!cfg) continue;
      const uRing = ((state.quiet || reduced ? 0.35 : t * 0.55) + cfg.order * 0.21) % 1;
      const rPulse = cfg.r * (0.72 + uRing * 0.85);
      const colPulse = isBlueprint ? [34, 255, 122] : (isLight ? [4, 120, 87] : cfg.hex);
      draw3DRing(cfg.x, 0.12 + uRing * 0.55, cfg.z, rPulse, rPulse, 28, rgba(colPulse, Math.sin(uRing * Math.PI) * 0.65 * sf), 1.25);
    }
    ctx.restore();
  }

  // Minimalist KPR wing & dual-branch designations placed cleanly in open negative space (desktop/tablet only; suppressed on narrow phones to prevent text pileups!)
  if (w > 700) {
    const os = state.outreachStats || {};
    const wingLabelCol = isLight ? [15, 31, 46] : isBlueprint ? [96, 255, 162] : [168, 198, 224];
    const mathesisLabelCol = isLight ? [154, 84, 8] : isBlueprint ? [168, 255, 118] : [236, 200, 134];
    const bridgeLabelCol = isLight ? [11, 107, 101] : isBlueprint ? [64, 255, 146] : [148, 224, 238];
    const activeVerRun = countRunning(department('verification')) || 0;
    drawHoloText(-5.55, 2.26, -2.75, tr('hud_sec1', 'SEC.01 // 理论生产翼（猜想 · 书稿）'), wingLabelCol, sec1Hot || holoCam.stationFocus > 0.5, 8.6);
    drawHoloText( 5.55, 2.38, -2.75, tr('hud_sec2', `SEC.02 // 论文 · Mathesis · ${scholarCount} 合作学者`, { n: scholarCount }), wingLabelCol, sec2Hot || holoCam.stationFocus > 0.5, 8.6);
    drawHoloText(-1.55, 0.10,  4.68, tr('hud_branch_a', 'BRANCH A // 独立评审滑轨'), isBlueprint ? [64, 255, 146] : revBranchRGB, sec3Hot || holoCam.stationFocus > 0.5, 8.0);
    drawHoloText( 1.55, 0.10,  4.68, tr('hud_branch_b', 'BRANCH B // 工具表达滑轨'), isBlueprint ? [96, 255, 178] : stuBranchRGB, sec4Hot || holoCam.stationFocus > 0.5, 8.0);
    drawHoloText( 8.05, 0.18, -0.25, tr('hud_mathesis', `Mathesis ⇄ ${scholarCount} 合作学者`, { n: scholarCount }), mathesisLabelCol, poHot || holoCam.stationFocus > 0.5, 8.4);
    if (activeId === 'outreach') {
      drawHoloText(
        8.05, 0.88, 1.90,
        tr('hud_outreach_detail', `✦ ${scholarCount} 合作 · ${os.replied_scholars || 485} 回信 · ${os.contacted_scholars || 1049} 联络 · ${os.joint_papers || 32} 联合论文`, {
          n: scholarCount,
          replied: os.replied_scholars || 485,
          contacted: os.contacted_scholars || 1049,
          joint: os.joint_papers || 32
        }),
        mathesisLabelCol,
        true,
        8.2
      );
    }
    if (holoCam.stationFocus > 0.45) {
      drawHoloText(-2.58, 0.52, -1.06, tr('hud_station_left_live', `⚡ 猜想·书稿 ⇄ Lean 核枢 · ${activeVerRun} 项实时核验`, { run: activeVerRun }), bridgeLabelCol, true, 8.8);
      drawHoloText( 2.65, 0.52, -1.06, tr('hud_station_right_live', '✦ 自动论文工厂 ⇄ Mathesis · 持续产出'), mathesisLabelCol, true, 8.8);
      drawHoloText( 0.0,  0.12,  5.62, tr('hud_station_loop_tag', `24/7 ACTIVE LOOP // 猜想 → 形式化 → 书稿论文 → ${scholarCount} 学者回流`, { n: scholarCount }), bridgeLabelCol, true, 8.4);
    } else {
      if (thHot || bkHot) drawHoloText(-2.58, 0.26, -1.16, tr('hud_left_bridge', '理论生产 ⇄ Lean 核枢'), bridgeLabelCol, true, 8.8);
      if (pbHot || coHot) drawHoloText( 2.65, 0.26, -1.16, tr('hud_right_bridge', 'Lean 核枢 ⇄ 自动论文'), bridgeLabelCol, true, 8.8);
    }
    if (sec3Hot)        drawHoloText( 0.0,  0.10,  5.24, tr('hud_rev_tap', `评审支路接入 → ${langDeptLabel(holoCam.rheostatRevTargetId, '数学攻坚')}`, { dept: langDeptLabel(holoCam.rheostatRevTargetId, '数学攻坚') }), isBlueprint ? [64, 255, 146] : revBranchRGB, true, 8.5);
    if (sec4Hot)        drawHoloText( 0.0,  0.10,  5.24, tr('hud_stu_tap', `工具支路接入 → ${langDeptLabel(holoCam.rheostatStuTargetId, '论文与知识')}`, { dept: langDeptLabel(holoCam.rheostatStuTargetId, '论文与知识') }), isBlueprint ? [96, 255, 178] : stuBranchRGB, true, 8.5);
  }
  ctx.restore();
}

function startHoloLoop() {
  if (holoCam.raf || /jsdom/i.test(navigator.userAgent || '')) return;
  loadTruthNebula();
  triggerScanSweep();
  if (introCinema.active) startIntroCinema(performance.now());
  let prev;
  const tick = now => {
    const dt = prev === undefined ? 0 : (now - prev) / 1000;
    prev = now;
    if (!document.hidden) {
      drawHolo3DFrame(dt);
      stepSciFiLog(dt);
      stepXpFlights(now);
    }
    holoCam.raf = requestAnimationFrame(tick);
  };
  holoCam.raf = requestAnimationFrame(tick);
}

// Disciplined 3D Camera Drag (Clamped within tasteful command arc — never tangled!) & Direct 3D Entity Picking
const boardEl = $('#hive-board');
if (boardEl && !/jsdom/i.test(navigator.userAgent || '')) {
  let hoveredLabel = null;
  function setHoveredLabel(id) {
    const cell = state.cells.get(id) || null;
    if (cell === hoveredLabel) return;
    if (hoveredLabel) {
      // Leave enough time to move from the model to its callout.
      showStationLabel(hoveredLabel, 350);
      hoveredLabel.button.classList.remove('is-label-hover');
    }
    hoveredLabel = cell;
    cell?.button.classList.add('is-label-hover');
  }
  boardEl.addEventListener('pointerleave', () => setHoveredLabel(null));
  window.addEventListener('blur', () => setHoveredLabel(null));
  const hitTowerAt = (clientX, clientY) => {
    const rect = boardEl.getBoundingClientRect();
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    let best = null;
    let bestD = Infinity;
    for (const [id, info] of holoCam.projectedTowers) {
      const dist = Math.hypot(lx - info.x, ly - info.y);
      if (dist < info.r && dist < bestD) {
        best = id;
        bestD = dist;
      }
    }
    return best;
  };

  const hitGalaxyAt = (clientX, clientY) => {
    const rect = boardEl.getBoundingClientRect();
    return galaxyHitAt(clientX - rect.left, clientY - rect.top, holoCam.projectedGalaxies, holoCam.galaxyFootprints);
  };
  const inGalaxyView = () => Boolean(truthGrowth.manualFocus && !truthGrowth.manualFocus.closing);
  const lanternHint = l => {
    const vLabel = l.rec.verdict === 'refuted' ? L('反驳', 'Refuted') : L('已证明', 'Proved');
    const lTitle = isEn() ? (l.rec.enTitle || l.rec.title) : (l.rec.title || l.rec.enTitle);
    return isEn() ? `✦ Conjecture Lantern (${vLabel}) · ${lTitle} · Click to read proof archive` : `✦ 猜想提灯（${vLabel}）· ${lTitle} · 点击阅读证明档案`;
  };

  const hitLanternAt = (clientX, clientY) => {
    if (!holoCam.projectedLanterns.length || holoCam.galaxyAlpha < 0.25) return null;
    const rect = boardEl.getBoundingClientRect();
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < holoCam.projectedLanterns.length; i++) {
      const l = holoCam.projectedLanterns[i];
      const dist = Math.hypot(lx - l.x, ly - l.y);
      if (dist < 18 && dist < bestD) {
        best = l;
        bestD = dist;
      }
    }
    return best;
  };

  boardEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 || state.focused || e.target.closest('nyx-assistant, button, a, .department-lens, .scifi-log-wall, .department-panel, .galaxy-node-card, .genesis-scrub-bar, .intro-cinema-pill')) return;
    setHoveredLabel(null);
    skipIntroCinema();
    stopCinemaDirector();
    holoCam.dragging = true;
    holoCam.dragMoved = false;
    holoCam.lastX = e.clientX;
    holoCam.lastY = e.clientY;
    boardEl.classList.add('is-dragging');
  });

  window.addEventListener('pointermove', e => {
    if (e.target !== $('#holo-3d') || state.focused || galaxyDetail.picks.length || e.pointerType === 'touch') {
      setHoveredLabel(null);
    }
    // Active Theory / Igloo subtle living cursor parallax
    if (window.innerWidth > 0 && window.innerHeight > 0) {
      holoCam.mouseNormX = (e.clientX / window.innerWidth - 0.5) * 2;
      const boardRect = boardEl.getBoundingClientRect();
      holoCam.pointerLocal = { x: e.clientX - boardRect.left, y: e.clientY - boardRect.top };
      holoCam.mouseNormY = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    if (holoCam.dragging) {
      const rawDx = e.clientX - holoCam.lastX;
      const rawDy = e.clientY - holoCam.lastY;
      if (!Number.isFinite(rawDx) || !Number.isFinite(rawDy)) return;
      const dx = Math.max(-160, Math.min(160, rawDx));
      const dy = Math.max(-160, Math.min(160, rawDy));
      if (Math.abs(dx) + Math.abs(dy) > 3) holoCam.dragMoved = true;
      holoCam.lastX = e.clientX;
      holoCam.lastY = e.clientY;
      // Smooth orbital drag around the 3D monolith plaza & 3D cosmic sky dome!
      const lp = LAYER_PRESETS[state.layer] || LAYER_PRESETS.mix;
      const nextYaw = holoCam.targetYaw - dx * 0.0042;
      const nextPitch = holoCam.targetPitch + dy * 0.0034;
      if (Number.isFinite(nextYaw)) holoCam.targetYaw = Math.max(-0.58, Math.min(0.58, nextYaw));
      if (Number.isFinite(nextPitch)) holoCam.targetPitch = Math.max(lp.minPitch, Math.min(lp.maxPitch, nextPitch));
      return;
    }
    // Shift + Glide across the celestial sky strums the Constellation Harp with silk trails!
    if (e.shiftKey && !state.focused && e.target === $('#holo-3d') && !state.quiet && !reduced) {
      const rect = boardEl.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      const last = holoCam.harpTrail[holoCam.harpTrail.length - 1];
      if (!last || Math.hypot(lx - last.x, ly - last.y) > 16) {
        holoCam.harpTrail.push({ x: lx, y: ly, age: 0 });
        if (holoCam.harpTrail.length > 26) holoCam.harpTrail.shift();
        const nowH = performance.now();
        if (nowH - (Number(holoCam.lastHarpKey) || 0) > 105) {
          holoCam.lastHarpKey = nowH;
          sciFiAudio.playStarHarp(e.clientX / Math.max(1, window.innerWidth));
        }
      }
    }
    if (!state.focused && e.target === $('#holo-3d') && galaxyDetail.picks.length) {
      const rect = boardEl.getBoundingClientRect();
      const node = pickGalaxyNode(galaxyDetail.picks, e.clientX - rect.left, e.clientY - rect.top);
      galaxyDetail.hoverKey = node ? galaxyNodeKey(node) : null;
      const lantern = !node && inGalaxyView() ? hitLanternAt(e.clientX, e.clientY) : null;
      holoCam.hoveredLantern = lantern;
      boardEl.style.cursor = node || lantern ? 'pointer' : 'grab';
      const hint = $('#hive-hover-hint');
      if (hint && lantern) {
        hint.textContent = lanternHint(lantern);
      } else if (hint) {
        hint.textContent = node
          ? (isEn()
              ? `${galaxyNodeInfo(node, galaxyDetail.data, truthNebula.clusters).title} · Click to inspect (Shift+Click to trace shortest proof path)`
              : `${galaxyNodeInfo(node, galaxyDetail.data, truthNebula.clusters).title} · 点击聚焦（Shift+点击追踪两星最短证明路径）`)
          : L(
              '悬停或点击节点查看详情 · Shift+点击两节点连线 · 捏合/滚轮缩回全景',
              'Hover or click a theorem node · Shift+Click two nodes to trace proof path · Pinch/scroll out for panorama'
            );
      }
      return;
    }
    if (!state.focused && e.target === $('#holo-3d')) {
      const rawHit = hitTowerAt(e.clientX, e.clientY);
      const hit = state.layer === 'galaxy' ? (holoCam.galaxyMainCid == null && rawHit === 'direction' ? 'direction' : null) : rawHit;
      if (e.pointerType !== 'touch') setHoveredLabel(hit);
      if (hit) {
        holoCam.hoveredGalaxy = null;
        holoCam.hoveredLantern = null;
        boardEl.style.cursor = 'pointer';
        previewDepartment(hit);
      } else {
        const lUnder = hitLanternAt(e.clientX, e.clientY);
        const gUnder = hitGalaxyAt(e.clientX, e.clientY) || (lUnder ? holoCam.projectedGalaxies.get(lUnder.cid) || null : null);
        const lHit = skyClickTarget(inGalaxyView(), gUnder, lUnder) === 'lantern' ? lUnder : null;
        if (lHit) {
          holoCam.hoveredLantern = lHit;
          holoCam.hoveredGalaxy = null;
          boardEl.style.cursor = 'pointer';
          const hint = $('#hive-hover-hint');
          if (hint) hint.textContent = lanternHint(lHit);
          return;
        }
        holoCam.hoveredLantern = null;
        const gHit = gUnder;
        holoCam.hoveredGalaxy = gHit ? gHit.cl.id : null;
        holoCam.hoverGalaxyRecord = gHit ? { cid: gHit.cl.id, x: e.clientX, y: e.clientY, t: performance.now() } : null;
        boardEl.style.cursor = gHit ? 'pointer' : 'grab';
        const hint = $('#hive-hover-hint');
        if (gHit && hint) {
          hint.textContent = isEn()
            ? `⟡ ${langGalaxyName(gHit.cl)} Galaxy (${(gHit.cl.count || 0).toLocaleString()} verified theorems) · Click to inspect`
            : `⟡ ${gHit.cl.zh || gHit.cl.name} 星系（${(gHit.cl.count || 0).toLocaleString()} 冻结定理）· 点击设为主视角`;
        } else if (!gHit) {
          updateHoverHint(state.hovered || state.selected);
        }
      }
    }
  }, { passive: true });

  window.addEventListener('pointerup', e => {
    if (!holoCam.dragging) return;
    const moved = holoCam.dragMoved;
    holoCam.dragging = false;
    boardEl.classList.remove('is-dragging');
    if (!moved && !state.focused && e.target === $('#holo-3d') && galaxyDetail.picks.length) {
      const rect = boardEl.getBoundingClientRect();
      const node = pickGalaxyNode(galaxyDetail.picks, e.clientX - rect.left, e.clientY - rect.top);
      if (node) {
        openGalaxyNode(node, Boolean(e.shiftKey));
        return;
      }
      const lantern = inGalaxyView() ? hitLanternAt(e.clientX, e.clientY) : null;
      if (lantern) {
        closeGalaxyNodeCard();
        openLanternConjectureCard(lantern);
        return;
      }
      if (galaxyDetail.selectedKey || !$('#galaxy-node-card')?.hidden) {
        closeGalaxyNodeCard();
        return;
      }
    }
    if (!moved && !state.focused && e.target === $('#holo-3d')) {
      const rawHit = hitTowerAt(e.clientX, e.clientY);
      const hit = state.layer === 'galaxy' ? (holoCam.galaxyMainCid == null && rawHit === 'direction' ? 'direction' : null) : rawHit;
      if (hit) {
        truthGrowth.manualFocus = null;
        selectDepartment(hit, true, true);
        return;
      }
      const lUnder = hitLanternAt(e.clientX, e.clientY);
      const hinted = hoveredGalaxyAt(holoCam.hoverGalaxyRecord, e.clientX, e.clientY, performance.now());
      const gHit = hitGalaxyAt(e.clientX, e.clientY)
        || (lUnder ? holoCam.projectedGalaxies.get(lUnder.cid) || null : null)
        || (hinted != null ? holoCam.projectedGalaxies.get(hinted) || null : null);
      if (skyClickTarget(inGalaxyView(), gHit, lUnder) === 'lantern') {
        openLanternConjectureCard(lUnder);
        return;
      }
      if (!gHit && !$('#galaxy-node-card')?.hidden && !galaxyDetail.selectedKey) {
        closeGalaxyNodeCard();
        return;
      }
      if (gHit) {
        const now = performance.now();
        sciFiAudio.playGalaxy();
        if (truthGrowth.manualFocus && truthGrowth.manualFocus.cid === gHit.cl.id && !truthGrowth.manualFocus.closing) {
          exitGalaxyMainView(now);
        } else {
          closeGalaxyNodeCard();
          holoCam.galaxyZoomScale = 1.0;
          truthGrowth.manualFocus = { cid: gHit.cl.id, cluster: gHit.cl, start: now, closing: false };
          updateGalaxyBackBar();
          if (!state.quiet && !reduced) {
            xpFx.bursts.push({ kind: 'ring', x: gHit.x, y: gHit.y, rgb: gHit.col, start: now, dur: 760, maxR: 48, width: 1.8 });
          }
        }
      } else if (truthGrowth.manualFocus && !truthGrowth.manualFocus.closing) {
        exitGalaxyMainView(performance.now());
      } else if (state.layer === 'galaxy' || (state.layer === 'mix' && e.clientY < window.innerHeight * 0.56)) {
        // Clicking open starlight strums the celestial harp with a calm ripple & meteor (zero fake XP!)
        triggerSkyStrum(e.clientX, e.clientY);
      }
    }
  });

  const stopBoardDrag = () => {
    if (!holoCam.dragging) return;
    holoCam.dragging = false;
    boardEl.classList.remove('is-dragging');
  };
  window.addEventListener('pointercancel', stopBoardDrag);
  window.addEventListener('blur', stopBoardDrag);

  boardEl.addEventListener('dblclick', e => {
    if (state.focused || e.target.closest('nyx-assistant, button, a, .department-lens, .scifi-log-wall, .department-panel, .galaxy-node-card, .genesis-scrub-bar, .intro-cinema-pill')) return;
    skipIntroCinema();
    stopCinemaDirector();
    holoCam.galaxyZoomScale = 1.0;
    const lp = LAYER_PRESETS[state.layer] || LAYER_PRESETS.mix;
    holoCam.targetYaw = 0.0;
    holoCam.targetPitch = lp.pitch;
    holoCam.targetDist = lp.dist;
  });

  const handleBoardZoom = (deltaY, ctrlKey, now = performance.now()) => {
    skipIntroCinema();
    stopCinemaDirector();
    const inGalaxy = Boolean(truthGrowth.manualFocus && !truthGrowth.manualFocus.closing);
    if (inGalaxy) {
      const res = stepGalaxyZoom(
        { scale: holoCam.galaxyZoomScale, cooldownUntil: holoCam.galaxyZoomCooldown },
        deltaY,
        ctrlKey,
        now
      );
      holoCam.galaxyZoomScale = res.scale;
      holoCam.galaxyZoomCooldown = res.cooldownUntil;
      if (res.action === 'step-out') {
        if (galaxyDetail.selectedKey || galaxyDetail.selectedNode) {
          closeGalaxyNodeCard();
        } else {
          exitGalaxyMainView(now);
        }
      }
      return;
    }
    const sens = ctrlKey ? 0.055 : 0.010;
    holoCam.targetDist = Math.max(11.5, Math.min(31.5, holoCam.targetDist + deltaY * sens));
  };

  boardEl.addEventListener('wheel', e => {
    if (state.focused || e.target.closest('nyx-assistant, .department-panel, .telemetry-dock, .scifi-log-wall, .inline-browser')) return;
    if (!e.ctrlKey && e.target.closest('.galaxy-node-card')) return;
    e.preventDefault();
    handleBoardZoom(e.deltaY, Boolean(e.ctrlKey), performance.now());
  }, { passive: false });

  // Safari macOS native trackpad pinch support (gesturestart / gesturechange)
  let safariGestureScale = 1;
  boardEl.addEventListener('gesturestart', e => {
    if (state.focused || e.target.closest('nyx-assistant, .department-panel, .telemetry-dock, .scifi-log-wall, .inline-browser')) return;
    skipIntroCinema();
    stopCinemaDirector();
    e.preventDefault();
    safariGestureScale = e.scale || 1;
  }, { passive: false });
  boardEl.addEventListener('gesturechange', e => {
    if (state.focused || e.target.closest('nyx-assistant, .department-panel, .telemetry-dock, .scifi-log-wall, .inline-browser')) return;
    e.preventDefault();
    const cur = e.scale || 1;
    const ds = safariGestureScale - cur;
    safariGestureScale = cur;
    handleBoardZoom(ds * 55, true, performance.now());
  }, { passive: false });
}

$('#galaxy-back-btn')?.addEventListener('click', () => {
  if (galaxyDetail.selectedKey || galaxyDetail.selectedNode) closeGalaxyNodeCard();
  else exitGalaxyMainView(performance.now());
});
$('#galaxy-home-btn')?.addEventListener('click', () => {
  exitGalaxyMainView(performance.now());
});

// Opening Cinema, Auto-Director Cruise & DAG Genesis Time-Scrub Controls
$('#replay-intro-btn')?.addEventListener('click', () => startIntroCinema(performance.now()));
$('#intro-skip-btn')?.addEventListener('click', () => {
  skipIntroCinema();
  syncInstituteRealm();
});
$('#cinema-director-btn')?.addEventListener('click', () => {
  if (cinemaDirector.active) stopCinemaDirector();
  else startCinemaDirector(performance.now());
});
$('#genesis-scrub-btn')?.addEventListener('click', () => {
  genesisScrub.open = !genesisScrub.open;
  if (genesisScrub.open) {
    skipIntroCinema();
    if (genesisScrub.value >= 0.98) genesisScrub.value = 0.08;
    genesisScrub.playing = true;
  } else {
    genesisScrub.playing = false;
    genesisScrub.value = 1.0;
  }
  updateGenesisScrubUI();
});
$('#genesis-play-btn')?.addEventListener('click', () => {
  if (!genesisScrub.playing && genesisScrub.value >= 0.99) genesisScrub.value = 0.02;
  genesisScrub.playing = !genesisScrub.playing;
  updateGenesisScrubUI();
});
$('#genesis-slider')?.addEventListener('input', e => {
  genesisScrub.playing = false;
  genesisScrub.value = Math.max(0, Math.min(1, Number(e.target.value) / 100));
  updateGenesisScrubUI();
});
$('#genesis-close-btn')?.addEventListener('click', () => {
  genesisScrub.open = false;
  genesisScrub.playing = false;
  genesisScrub.value = 1.0;
  updateGenesisScrubUI();
});

function applyLayer(layer) {
  const next = LAYER_PRESETS[layer] ? layer : 'mix';
  const changed = state.layer !== next;
  state.layer = next;
  const preset = LAYER_PRESETS[next];
  const room = $('#research-room');
  if (room) room.dataset.layer = next;
  for (const b of document.querySelectorAll('[data-layer]')) {
    b.setAttribute('aria-pressed', String(b.dataset.layer === next));
  }
  holoCam.targetYaw = 0.0;
  holoCam.targetPitch = preset.pitch;
  holoCam.targetDist = preset.dist;
  if (next === 'station' && truthGrowth.manualFocus && !truthGrowth.manualFocus.closing) {
    exitGalaxyMainView(performance.now());
  }
  const hint = $('#hive-hover-hint');
  if (hint) {
    hint.textContent = next === 'galaxy'
      ? tr('hint_galaxy', '浩瀚星空真值 DAG 穹顶 · 点击任意星系飞入节点网络 · Shift+划动拨弦')
      : next === 'station'
        ? tr('hint_station', '24/7 活态轨道空间站 · 实时循环产线与滑轨支路 · 点击部门飞入舱内')
        : tr('hint_mix', '周天星阵环绕天地 · 拖拽环视（双击复位） · 点击星海拨弦 · 按 Space 灵识扫频');
  }
  if (changed) {
    if (next === 'galaxy') void loadStarfieldEvidence();
    if (next !== 'galaxy') for (const cell of state.cells.values()) showStationLabel(cell, 4000);
    sciFiAudio.playLayer(next);
  }
}

for (const layerBtn of document.querySelectorAll('[data-layer]')) {
  layerBtn.addEventListener('click', () => applyLayer(layerBtn.dataset.layer));
}
if ($('#research-room')) $('#research-room').dataset.layer = state.layer;

$('#sonar-pulse-btn')?.addEventListener('click', () => triggerSonarSweep());
$('#human-sound-btn')?.addEventListener('click', () => {
  sciFiAudio.enabled = !sciFiAudio.enabled;
  try { localStorage.setItem(HUMAN_SOUND_KEY, sciFiAudio.enabled ? 'on' : 'off'); } catch {}
  renderSoundToggle();
  if (sciFiAudio.enabled) sciFiAudio.playStarHarp(0.6);
});
window.addEventListener('keydown', e => {
  if (e.target.closest?.('nyx-assistant') || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (state.focused || state.mode !== 'organization') return;
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'button' || tag === 'a') return;
  if (e.code === 'Space') {
    e.preventDefault();
    triggerSonarSweep();
  } else if (e.code === 'KeyC') {
    e.preventDefault();
    if (cinemaDirector.active) stopCinemaDirector();
    else startCinemaDirector(performance.now());
  }
});

$('#hud-zen-toggle')?.addEventListener('click', e => {
  const room = $('#research-room');
  if (!room) return;
  const zen = room.classList.toggle('is-hud-zen');
  e.currentTarget.setAttribute('aria-pressed', String(zen));
  e.currentTarget.textContent = zen ? tr('hud_expand', '展开') : tr('hud_zen', '纯净');
});

let themeVeilTimer = 0;
function triggerThemeFade(prevLook, nextLook) {
  if (!prevLook || prevLook === nextLook || /jsdom/i.test(navigator.userAgent || '')) return;
  holoCam.themeFadeStart = performance.now();
  let veil = document.getElementById('theme-fade-veil');
  if (!veil) {
    veil = document.createElement('div');
    veil.id = 'theme-fade-veil';
    veil.className = 'theme-fade-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
  }
  // Cushion dark <-> light exposure transitions through a calm soft neutral slate veil (zero harsh flash!)
  veil.style.background = prevLook === 'light'
    ? 'rgba(214, 222, 232, 0.72)'
    : prevLook === 'matrix'
      ? 'rgba(2, 16, 8, 0.76)'
      : 'rgba(6, 12, 22, 0.72)';
  veil.classList.remove('is-fading');
  veil.style.opacity = '1';
  void veil.offsetWidth;
  veil.classList.add('is-fading');
  veil.style.opacity = '0';
  clearTimeout(themeVeilTimer);
  themeVeilTimer = setTimeout(() => { veil.classList.remove('is-fading'); }, 580);
}

function applyLook(look) {
  const docEl = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const btn = $('#theme-toggle');
  const prevLook = docEl.dataset.theme === 'light' ? 'light' : (docEl.dataset.look || 'holo');
  const norm = look === 'blueprint' ? 'matrix' : look;
  if (norm === 'light') {
    docEl.dataset.theme = 'light';
    delete docEl.dataset.look;
    if (meta) meta.setAttribute('content', '#DCE2EA');
    if (btn) btn.textContent = '☾';
  } else if (norm === 'matrix') {
    delete docEl.dataset.theme;
    docEl.dataset.look = 'matrix';
    if (meta) meta.setAttribute('content', '#000802');
    if (btn) btn.textContent = '☀';
  } else {
    delete docEl.dataset.theme;
    delete docEl.dataset.look;
    if (meta) meta.setAttribute('content', '#01040A');
    if (btn) btn.textContent = '☀';
  }
  const activeLook = docEl.dataset.theme === 'light' ? 'light' : (docEl.dataset.look || 'holo');
  for (const b of document.querySelectorAll('[data-look]')) {
    b.setAttribute('aria-pressed', String(b.dataset.look === activeLook));
  }
  if (prevLook !== activeLook) triggerThemeFade(prevLook, activeLook);
  renderHoloSky();
  triggerScanSweep();
}

function applyTheme(theme) {
  applyLook(theme === 'light' ? 'light' : 'holo');
}

for (const lookBtn of document.querySelectorAll('[data-look]')) {
  lookBtn.addEventListener('click', () => {
    const next = lookBtn.dataset.look || 'holo';
    applyLook(next);
    try {
      localStorage.setItem(themeKey, next);
    } catch {}
  });
}

function applyLanguage(code) {
  const api = i18n();
  if (api) api.setLang(code);
  renderHealth();
  renderMetrics();
  renderTicker();
  renderHive();
  renderDepartment();
  if (state.focused) renderDepartmentLens(department(state.focused));
  if (state.mode === 'journey') renderJourney();
  renderActivity();
  renderLiveOps();
  renderQuestions();
  renderBooks();
  renderConjectures();
  renderPapers();
  renderRepos();
  updateControls();
  syncInstituteRealm();
  updateGalaxyBackBar();
  updateGenesisScrubUI();
  syncFullscreenButton();
  syncNyxDragTitles();

  // Rebuild live dispatch log wall in the newly chosen language (no stale mixed-language rows!)
  scifiLog.history.clear();
  scifiLog.painted = false;
  scifiLog.seeded = false;
  scifiLog.cursor = 0;
  const logStream = $('#scifi-log-stream');
  if (logStream) logStream.replaceChildren();
  updateLogBadge();
  updateLogJump();
  if (scifiLog.mode === 'latest') {
    renderLatestSciFiLog();
  } else if (view()) {
    const pool = buildSciFiLogPool();
    const initialCount = Math.min(8, pool.length);
    for (let i = 0; i < initialCount; i++) {
      pushSciFiLogLine(pool[i], false, -(initialCount - i) * 320);
    }
    scifiLog.cursor = initialCount % Math.max(1, pool.length);
    scifiLog.seeded = true;
  }

  // Update active telemetry drawer title if open (or default title)
  const activeTab = document.querySelector('[data-dock-tab][aria-selected="true"]')?.dataset.dockTab || 'live-ops';
  const titleEl = $('#dock-drawer-title');
  if (titleEl) {
    const map = isEn() ? dockTitlesEn : dockTitles;
    if (map[activeTab]) titleEl.textContent = map[activeTab];
  }

  // Re-render open galaxy node card if visible
  if (galaxyDetail.selectedNode && !$('#galaxy-node-card')?.hidden) {
    const node = galaxyDetail.selectedNode;
    const links = node.kind === 'star' ? nodeLinks(node.idx) : null;
    const info = galaxyNodeInfo(node, galaxyDetail.data, truthNebula.clusters, links);
    info.canTrace = node.kind === 'star';
    info.starIdx = node.idx;
    renderGalaxyNodeCard(info, null, null, galaxyDetail.bounds);
  }

  applyLayer(state.layer);
  const zenBtn = $('#hud-zen-toggle');
  if (zenBtn) {
    const zen = $('#research-room')?.classList.contains('is-hud-zen');
    zenBtn.textContent = zen ? tr('hud_expand', '展开') : tr('hud_zen', '纯净');
  }
  renderHoloSky();
}

for (const langBtn of document.querySelectorAll('[data-lang-btn]')) {
  langBtn.addEventListener('click', () => {
    applyLanguage(langBtn.dataset.langBtn || 'zh');
  });
}

window.addEventListener('resize', () => renderHoloSky(), { passive: true });

// Slide-Up Translucent FUI Telemetry Drawer (collapsed at rest so 3D space fills 100% of screen!)
const dockTitles = {
  'live-ops': 'TELEMETRY // LEAN CI 检验灯阵与跨部门接力',
  'questions': 'RESEARCH // 当前在研课题索引',
  'conjectures': 'ARCHIVE // 猜想解决与反驳档案库（永久归档 + Lean 实时合入）',
  'publications': 'ARCHIVE // 双语书稿与公开论文',
  'ecosystem': 'INFRA // 公开研究仓库与 Rust 开源模板'
};

const dockTitlesEn = {
  'live-ops': 'TELEMETRY // LEAN CI VERIFICATION ARRAY & CROSS-DECK RELAYS',
  'questions': 'RESEARCH // ACTIVE MATHEMATICAL THREADS',
  'conjectures': 'ARCHIVE // SETTLED CONJECTURES & REFUTATIONS (CURATED + LIVE LEAN)',
  'publications': 'ARCHIVE // BILINGUAL MONOGRAPHS & PUBLIC PAPERS',
  'ecosystem': 'INFRA // PUBLIC RESEARCH REPOSITORIES & RUST TEMPLATE'
};

function closeDockDrawer() {
  const dock = $('#telemetry-dock');
  if (!dock) return;
  dock.classList.remove('is-open');
  for (const tab of document.querySelectorAll('[data-dock-tab]')) {
    tab.setAttribute('aria-selected', 'false');
  }
}

for (const tab of document.querySelectorAll('[data-dock-tab]')) {
  tab.addEventListener('click', () => {
    const dock = $('#telemetry-dock');
    const target = tab.dataset.dockTab;
    const alreadyOpen = dock?.classList.contains('is-open') && tab.getAttribute('aria-selected') === 'true';
    if (alreadyOpen) {
      closeDockDrawer();
      return;
    }
    dock?.classList.add('is-open');
    const titleEl = $('#dock-drawer-title');
    const titleMap = isEn() ? dockTitlesEn : dockTitles;
    if (titleEl && titleMap[target]) titleEl.textContent = titleMap[target];
    for (const sibling of document.querySelectorAll('[data-dock-tab]')) {
      sibling.setAttribute('aria-selected', String(sibling === tab));
    }
    for (const panel of document.querySelectorAll('[data-dock-panel]')) {
      panel.classList.toggle('is-active', panel.dataset.dockPanel === target);
    }
  });
}

$('#dock-close-btn')?.addEventListener('click', closeDockDrawer);

// Read the same localized cards and source links that the dashboard renders.
const dashboardSections = {
  overview: '#hive-cells > *, #log-ops-strip > *',
  log: '#scifi-log-stream > *',
  department: '#department-title, #department-responsibility, #department-work > *, #lens-metrics > *, #lens-agents > *, #lens-spotlight > *',
  journey: '#journey-stages > *, #journey-links > *, #journey-events > *',
  'live-ops': '#checker-runs > *, #relay-bridges > *, #live-feed > *',
  questions: '#question-cards > *',
  conjectures: '#conjecture-summary, #conjecture-cards > *',
  publications: '#book-updates > *, #paper-cards > *',
  ecosystem: '#repo-matrix > *'
};

function dashboardCard(el) {
  // Preserve the boundaries between adjacent title, status and date elements.
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (text) parts.push(text);
  }
  const links = el.matches('a[href]') ? [el] : el.querySelectorAll('a[href]');
  const sources = [...links].map(a => a.getAttribute('href'));
  if (el.dataset.source) sources.unshift(el.dataset.source);
  return {
    text: parts.join(' ').replace(/\s+/g, ' ').slice(0, 900),
    sources: sources.map(safeURL).filter(url => url !== '#').slice(0, 4)
  };
}

function readDashboardSection(section, offset = 0, count = 6) {
  const cards = [...document.querySelectorAll(dashboardSections[section])].filter(card => !card.closest('[hidden]'));
  const end = offset + count;
  return { section, items: cards.slice(offset, end).map(dashboardCard), total: cards.length,
    nextOffset: end < cards.length ? end : null };
}

// The eight department models drawn by the station Canvas and WebGL renderers.
const stationGuideModels = {
  direction: 'orbital optical aperture', research: 'wireframe polyhedron', review: 'breathing surface',
  verification: 'Hopf station', books: 'glass codex', publication: 'folded page',
  outreach: 'consensus lens', studio: 'gears and cube'
};
function dashboardContext() {
  const drawer = $('[data-dock-tab][aria-selected="true"]')?.dataset.dockTab;
  const section = drawer || (state.mode === 'journey' ? 'journey' : 'department');
  const node = $('#galaxy-node-card');
  const galaxy = !$('#galaxy-back-bar').hidden && truthNebula.clusters.find(c => c.id === truthGrowth.manualFocus?.cid);
  return {
    title: document.title, language: document.documentElement.lang, mode: state.mode, following: state.follow,
    observedAt: view()?.observed_at ?? null, snapshotAt: state.snapshot?.collected_at ?? null,
    liveStatus: view() ? (isStale() ? 'delayed' : 'current') : 'unavailable',
    metrics: dashboardCard($('#institute-metrics')).text,
    dagNodes: $('#log-ops-dag').textContent, recentGrowth: $('#log-ops-growth').textContent,
    mainView: {layer: state.layer,
      station: departments().map(d => ({target: 'department:' + d.id, department: langDeptLabel(d),
        responsibility: langDeptResp(d), model: stationGuideModels[d.id]})),
      starfield: {meaning: 'Stars represent Lean modules grouped by domain. A module may contain multiple theorems. Use read_starfield for the legend and individual records.',
        ...(state.layer === 'galaxy' && starfieldEvidence(galaxy?.id)),
        clusters: truthNebula.clusters.filter(c => c.name !== 'Other').map(c => ({target: 'galaxy:' + c.id, name: langGalaxyName(c), nodes: c.count}))}},
    guideTargets: guideTargets(),
    selectedDepartment: department(state.selected) ? langDeptLabel(department(state.selected)) : null,
    journeyTitle: state.mode === 'journey' && state.topic ? $('#journey-title').textContent : null,
    selectedGalaxy: galaxy ? langGalaxyName(galaxy) : null, selectedNode: node.hidden ? null : dashboardCard(node),
    currentPanel: readDashboardSection(section, 0, 3),
    researchQuestions: [...document.querySelectorAll('.question-title')].slice(0, 3).map(el => el.textContent),
    latestActivity: $('#live-feed').firstElementChild ? dashboardCard($('#live-feed').firstElementChild) : null
  };
}

function guideTargets() {
  return ['overview', 'station', 'starfield', 'questions', 'journey', 'live-ops', 'conjectures', 'publications', 'ecosystem',
    ...departments().map(d => 'department:' + d.id),
    ...truthNebula.clusters.filter(c => c.name !== 'Other').map(c => 'galaxy:' + c.id)];
}

function showGuideScene(target) {
  if (!guideTargets().includes(target)) return false;
  const tab = [...document.querySelectorAll('[data-dock-tab]')].find(el => el.dataset.dockTab === target);
  if (tab) {
    if (tab.getAttribute('aria-selected') !== 'true') tab.click();
    return tab.getAttribute('aria-selected') === 'true';
  }
  closeDockDrawer();
  if (truthGrowth.manualFocus) exitGalaxyMainView();
  if (state.focused) closeDepartmentLens();
  state.follow = false;
  setMode(target === 'journey' ? 'journey' : 'organization');
  if (target.startsWith('department:')) {
    applyLayer('station');
    selectDepartment(target.slice(11));
    return state.focused === target.slice(11);
  }
  if (target.startsWith('galaxy:')) {
    const cluster = truthNebula.clusters.find(c => 'galaxy:' + c.id === target);
    applyLayer('galaxy');
    closeGalaxyNodeCard();
    holoCam.galaxyZoomScale = 1;
    truthGrowth.manualFocus = {cid: cluster.id, cluster, start: performance.now(), closing: false};
    updateGalaxyBackBar();
  } else if (target === 'overview' || target === 'station' || target === 'starfield') {
    applyLayer(target === 'starfield' ? 'galaxy' : target === 'station' ? 'station' : 'mix');
  }
  return true;
}

// A batch belongs to one period of active narration. Only its digest leaves the page automatically.
let guideEvents;
let guideBatchNumber = 0;
function guideActivity(a) {
  const url = safeURL(a.url);
  const source = url !== '#' && url.length <= 512 ? url : null;
  let category = 'work';
  if (source && isSettledMathRecord(a)) category = 'research';
  else if (a.kind === 'automation') category = 'checks';
  else if (a.department === 'review') category = 'reviews';
  else if (['books', 'publication'].includes(a.department)) category = 'publishing';
  return {category, at: a.at, department: a.department, status: a.status, kind: a.kind,
    title: String(a.label || '').slice(0, 160), summary: String(a.summary || '').slice(0, 280), source};
}

const guidePriority = {research: 2, frozen: 1, work: 0, reviews: 0, checks: 0, publishing: 0};
function beginGuideBriefings(signal) {
  let lastDigest = performance.now();
  const emptyCounts = () => ({research: 0, frozen: 0, work: 0, reviews: 0, checks: 0, publishing: 0});
  let counts = emptyCounts();
  let recent = [];
  const batches = new Map();
  const period = {
    batches,
    collect(arrivals) {
      for (const event of arrivals) counts[event.category]++;
      recent = [...arrivals, ...recent].sort((a, b) => guidePriority[b.category] - guidePriority[a.category]).slice(0, 48);
    }
  };
  guideEvents = period;
  signal.addEventListener('abort', () => {
    if (guideEvents === period) guideEvents = undefined;
    recent = [];
    batches.clear();
  }, {once: true});
  return () => {
    const now = performance.now();
    if (guideEvents !== period || !recent.length || now - lastDigest < 180000) return;
    lastDigest = now;
    const batch = 'B' + (++guideBatchNumber);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    batches.set(batch, {total, recent});
    if (batches.size > 3) batches.delete(batches.keys().next().value);
    const digest = `batch=${batch} research=${counts.research} frozen=${counts.frozen} work=${counts.work} reviews=${counts.reviews} checks=${counts.checks} publishing=${counts.publishing}`;
    const briefing = counts.research || counts.frozen ? {summary: digest, lookupTool: 'read_event_batch'} : digest;
    counts = emptyCounts();
    recent = [];
    return briefing;
  };
}

function readEventBatch(batch, offset) {
  const records = guideEvents?.batches.get(batch);
  if (!records) return {ok: false, code: 'unavailable', message: 'This event batch is no longer available.'};
  const items = records.recent.slice(offset, offset + 3);
  const end = offset + items.length;
  return {ok: true, value: {batch, total: records.total, retained: records.recent.length, items,
    nextOffset: end < records.recent.length ? end : null}};
}

const skyUnavailable = message => ({ok: false, code: 'unavailable', message});
const skyDomain = cid => truthNebula.clusters.find(c => c.id === cid);
function skyPage(rows, offset, describe) {
  const end = offset + 4;
  return {ok: true, value: {total: rows.length, items: rows.slice(offset, end).map(describe),
    nextOffset: end < rows.length ? end : null}};
}

function skyModuleRef(index) {
  const row = galaxyDetail.data.stars[index];
  const domain = skyDomain(truthNebula.stars[index][3]);
  return {module: row[0], title: row[1], role: row[3], domain: domain.name,
    target: domain.name === 'Other' ? null : 'module:' + row[0]};
}

function describeBundle([u, v, forward, reverse]) {
  const from = skyDomain(u).name, to = skyDomain(v).name;
  return {from, to, target: 'bundle:' + from + '->' + to,
    prerequisitesFromTo: forward, prerequisitesToFrom: reverse};
}

function starfieldEvidence(domainId) {
  const inDomain = (from, to) => domainId === undefined || from === domainId || to === domainId;
  const bundle = truthNebula.clusterLinks.find(([from, to]) => inDomain(from, to));
  const evidence = {moduleDetailsStatus: galaxyDetail.status, ...(bundle && {exampleBundle: describeBundle(bundle)})};
  if (!galaxyDetail.data) return evidence;
  const edge = truthNebula.edges.find(([u, v]) => {
    const from = truthNebula.stars[u][3], to = truthNebula.stars[v][3];
    return inDomain(from, to) && skyDomain(from).name !== 'Other' && skyDomain(to).name !== 'Other';
  });
  if (edge) evidence.exampleDependency = {prerequisite: skyModuleRef(edge[0]), dependent: skyModuleRef(edge[1])};
  return evidence;
}

async function loadStarfieldEvidence() {
  await loadTruthNebula();
  await loadGalaxyDetails(true);
}

async function readStarfield({section, domainId, query = '', connected = false, offset = 0}) {
  await loadTruthNebula();
  if (!truthNebula.loaded) return skyUnavailable('The starfield atlas is unavailable.');
  const domain = skyDomain(domainId);
  if (domainId !== undefined && !domain) return skyUnavailable('Unknown domain ID. Read the overview for available domains.');
  if (section === 'overview') {
    await loadGalaxyDetails(true);
    return {ok: true, value: {...starfieldEvidence(domainId), release: truthNebula.release, releaseModules: truthNebula.releaseModuleCount,
      releaseDependencies: truthNebula.counts?.truth_edges, inspectableSample: truthNebula.baseCount,
      sampleDrawnEdges: truthNebula.edges.length, domains: truthNebula.clusters.map(c => ({
        id: c.id, name: c.name, displayedModules: c.count, target: c.name === 'Other' ? null : 'galaxy:' + c.id})),
      legend: {star: 'One verified Lean module can contain several theorems. Its topology role, DAG layer and reuse tier describe different properties.',
        galaxy: 'The seven largest mathematical domains have named galaxies. Remaining domains share the Other belt.',
        dependency: 'A directed edge runs from a prerequisite to the module using it. Bundles aggregate connections between domains in each direction.',
        reuseTier: 'Higher tiers mark modules with more downstream reuse. Brightness or proximity alone cannot establish a dependency.',
        growth: 'Newly frozen D5 modules come from the live dev feed. Their animated branches illustrate arrival. Preview stars are demonstrations.',
        lantern: 'Settled conjecture records carry a verdict and evidence source. Some are curated, others are inferred from closed or merged public activity.'}}};
  }
  const inDomain = cid => !domain || cid === domain.id;
  if (section === 'bundles') {
    const links = truthNebula.clusterLinks.filter(([u,v]) => !domain || u === domain.id || v === domain.id);
    return skyPage(links, offset, describeBundle);
  }
  if (section === 'growth') {
    if (!state.stream?.truth_growth) return skyUnavailable('No live freeze observations available.');
    const events = truthGrowth.recentRaw.filter(ev => !ev.preview && inDomain(growthClusterId(ev.domain, truthNebula.clusters)));
    return skyPage(events, offset, ev => ({module: ev.module, domain: ev.domain, frozenAt: ev.at,
      source: galaxyNodeSourceUrl(ev.module, ev.commit)}));
  }
  if (section === 'lanterns') {
    const records = conjectureRecords().filter(rec => inDomain(matchGalaxyCidForText([rec.area, rec.title, rec.enTitle].join(' '))));
    return skyPage(records, offset, rec => ({title: rec.enTitle || rec.title, verdict: rec.verdict,
      provenance: rec.live ? 'inferred from public activity' : 'curated ledger', evidence: rec.evidenceKind,
      recordedAt: rec.settledAt, ...(rec.live ? {} : {summary: rec.summary.slice(0, 260)}),
      source: safeURL(rec.url), target: 'lantern:' + rec.id}));
  }
  await loadGalaxyDetails(true);
  const rows = galaxyDetail.data?.stars;
  if (!rows) return skyUnavailable('Matching module details are unavailable for this release.');
  const term = query.trim().toLowerCase();
  const indices = [];
  for (let i = 0; i < rows.length; i++) {
    const [module, title, , role] = rows[i];
    if (connected) {
      // The ordinary module reader offers the first three examples in either direction.
      const neighbors = [...(rows[i][8] || []).slice(0, 3), ...(rows[i][9] || []).slice(0, 3)];
      if (!neighbors.some(j => skyDomain(truthNebula.stars[j][3])?.name !== 'Other')) continue;
      if (skyDomain(truthNebula.stars[i][3])?.name === 'Other') continue;
    }
    if (inDomain(truthNebula.stars[i][3]) && (!term || [module, title, role].some(s => s.toLowerCase().includes(term)))) indices.push(i);
  }
  return skyPage(indices, offset, skyModuleRef);
}

async function readStarModule(module) {
  await loadTruthNebula();
  await loadGalaxyDetails(true);
  const details = galaxyDetail.data;
  const index = details?.stars.findIndex(row => row[0] === module) ?? -1;
  if (index < 0) return skyUnavailable('Module unavailable in the inspectable sample. Use read_starfield with section modules.');
  const [, , summary, , layer, theoremCount, prerequisiteCount, dependentCount, prereqs = [], uses = []] = details.stars[index];
  return {ok: true, value: {...skyModuleRef(index), summary, layer, theoremCount, prerequisiteCount, dependentCount,
    reuseTier: truthNebula.stars[index][6], sampledPrerequisites: prereqs.slice(0,3).map(skyModuleRef),
    sampledDependents: uses.slice(0,3).map(skyModuleRef), source: galaxyNodeSourceUrl(module, details.source_commit)}};
}

async function showSkyRecord(target, signal) {
  if (target.startsWith('bundle:')) {
    await loadTruthNebula();
    signal.throwIfAborted();
    const link = truthNebula.clusterLinks.find(row => describeBundle(row).target === target);
    if (!link) return skyUnavailable('Choose a bundle target returned by read_starfield.');
    const [u, v, forward, reverse] = link;
    const focus = skyDomain(v).name === 'Other' ? u : v;
    if (!showGuideScene('galaxy:' + focus)) return skyUnavailable('The galaxy could not be opened.');
    const from = langGalaxyName(skyDomain(u)), to = langGalaxyName(skyDomain(v));
    renderGalaxyNodeCard({badge: L('域间依赖', 'Domain dependencies'), title: from + ' ↔ ' + to,
      summary: L('箭头从提供前提的域指向使用该前提的域。', 'Each arrow runs from the domain providing the prerequisite to the domain using it.'),
      meta: [from + ' → ' + to + ' (' + forward + ')', to + ' → ' + from + ' (' + reverse + ')']},
      window.innerWidth * 0.5, window.innerHeight * 0.5, galaxyDetail.bounds || {
        left: 12, top: 116, right: window.innerWidth - 12, bottom: window.innerHeight - 80});
    return {ok: true, value: {opened: target, ...describeBundle(link)}};
  }
  if (target.startsWith('module:')) {
    const module = target.slice(7);
    const record = await readStarModule(module);
    signal.throwIfAborted();
    if (!record.ok || !record.value.target) return skyUnavailable('This module has no focusable star in the named galaxies.');
    const idx = galaxyDetail.data.stars.findIndex(row => row[0] === module);
    const [x,y,z,cid] = truthNebula.stars[idx];
    if (!showGuideScene('galaxy:' + cid)) return skyUnavailable('The galaxy could not be opened.');
    openGalaxyNode({kind: 'star', idx, cid, nx: x / 1000, ny: y / 1000, nz: z / 1000,
      x: window.innerWidth * 0.5, y: window.innerHeight * 0.5});
    return {ok: true, value: {opened: target, title: record.value.title, summary: record.value.summary, source: record.value.source}};
  }
  const rec = conjectureRecords().find(r => 'lantern:' + r.id === target);
  if (!rec) return skyUnavailable('This conjecture record is unavailable.');
  const cid = matchGalaxyCidForText([rec.area, rec.title, rec.enTitle].join(' '));
  if (!showGuideScene('galaxy:' + cid)) return skyUnavailable('The galaxy could not be opened.');
  openLanternConjectureCard({rec, x: window.innerWidth * 0.5, y: window.innerHeight * 0.5});
  return {ok: true, value: {opened: target, verdict: rec.verdict, title: rec.enTitle || rec.title, source: safeURL(rec.url)}};
}

function registerDashboardTools({ host, z }) {
  nyxWidget.context = dashboardContext;
  host.registerTool({
    name: 'read_starfield', description: 'Read the sky legend and domains, or browse module stars, directed domain bundles, recent freezes, or conjecture lanterns. domainId filters lists. For modules, query matches a module path, title or topology role. Set connected to true for a pair of module cards you can visit along a verified edge. Four matches per page.',
    parameters: z.object({section: z.enum(['overview','modules','bundles','growth','lanterns']),
      domainId: z.number().int().nonnegative().optional(), query: z.string().optional(), connected: z.boolean().optional(), offset: z.number().int().nonnegative().optional()}),
    execute: readStarfield,
  });
  host.registerTool({
    name: 'read_star_module', description: 'Inspect an exact module path returned by read_starfield. Returns the theorem count, role, directed prerequisite and dependent examples, and its Lean source.',
    parameters: z.object({module: z.string()}), execute: ({module}) => readStarModule(module),
  });
  host.registerTool({
    name: 'read_event_batch', description: 'Look up a guide digest by its batch ID. Returns up to three public activities and sources. Use nextOffset for more.',
    parameters: z.object({batch: z.string(), offset: z.number().int().nonnegative().optional()}),
    execute: ({batch, offset = 0}) => readEventBatch(batch, offset),
  });
  host.registerTool({
    name: 'read_view',
    description: 'Read this tab’s current research dashboard. Choose starfield for a real module dependency and a domain bundle, or another section for rendered records and sources.',
    parameters: z.object({ section: z.enum([...Object.keys(dashboardSections), 'starfield']).optional(), offset: z.number().int().nonnegative().optional() }),
    execute: async ({section, offset}) => {
      if (section === 'starfield') return readStarfield({section: 'overview'});
      if (!section && state.layer === 'galaxy') await loadStarfieldEvidence();
      return {ok: true, value: section ? readDashboardSection(section, offset) : dashboardContext()};
    },
  });
  host.registerTool({
    name: 'show_scene', description: 'Show a guideTargets entry or open the exact target returned for a module, domain bundle or lantern.',
    parameters: z.object({target: z.string()}),
    execute: async ({target}, signal) => {
      if (target === 'starfield' || target.startsWith('galaxy:')) await loadStarfieldEvidence();
      signal.throwIfAborted();
      if (/^(module|bundle|lantern):/.test(target)) return showSkyRecord(target, signal);
      return showGuideScene(target) ? {ok: true, value: dashboardContext()} :
        {ok: false, code: 'unavailable', message: 'Choose a currently available guide target.'};
    },
  });
  host.registerTool({
    name: 'switch_view', description: 'Switch this tab to the organization overview or the journey view.',
    parameters: z.object({ mode: z.enum(['organization', 'journey']) }),
    execute: ({ mode }, signal) => {
      signal.throwIfAborted();
      const button = document.querySelector(`button[data-mode="${mode}"]`);
      if (!button || button.disabled) return { ok: false, code: 'unavailable', message: L('当前视图无法切换。', 'Cannot switch view right now.') };
      button.click();
      if (state.mode !== mode) return { ok: false, code: 'unavailable', message: L('页面尚未切换视图。', 'View did not switch as requested.') };
      return { ok: true, value: dashboardContext() };
    },
  });
}
// On short phones the wrapping header and sticky relay rail share the scene's viewport.
const sceneHeader = $('.fui-top');
const sceneFooter = $('.fui-bottom-shell');
if (sceneHeader && sceneFooter && typeof ResizeObserver === 'function') {
  const sizeScene = () => {
    const chromeHeight = sceneHeader.offsetHeight + sceneFooter.offsetHeight;
    $('#hive-board').style.setProperty('--scene-chrome-height', chromeHeight + 'px');
  };
  const chromeObserver = new ResizeObserver(sizeScene);
  chromeObserver.observe(sceneHeader);
  chromeObserver.observe(sceneFooter);
  sizeScene();
}

const nyxWidget = document.querySelector('nyx-assistant');
if (nyxWidget) nyxWidget.tourBriefings = beginGuideBriefings;
nyxWidget?.addEventListener('nyx-ready', event => registerDashboardTools(event.detail));
if (nyxWidget?.host) registerDashboardTools(nyxWidget);

const NYX_POS_STORAGE_KEY = 'trureturing-nyx-pos-v1';
let syncNyxDragTitles = () => {};

function initNyxDraggable(el) {
  if (!el || el.dataset.nyxDragBound === '1') return;
  el.dataset.nyxDragBound = '1';

  const defaultPos = () => {
    const narrow = window.innerWidth <= 980;
    if (narrow) {
      // Anchor right below .fui-top inside the top-left of the 3D stage so Nyx NEVER covers header controls!
      const topBar = document.querySelector('.fui-top');
      const board = document.querySelector('#hive-board');
      const topY = board
        ? Math.max(10, Math.round(board.getBoundingClientRect().top + 8))
        : (topBar ? Math.max(10, Math.round(topBar.getBoundingClientRect().bottom + 8)) : 96);
      return { x: 10, y: topY };
    }
    return { x: 22, y: 86 };
  };

  let hasCustomPos = false;
  let curX = defaultPos().x;
  let curY = defaultPos().y;
  let suppressClickUntil = 0;

  try {
    const raw = JSON.parse(localStorage.getItem(NYX_POS_STORAGE_KEY) || 'null');
    if (raw && Number.isFinite(raw.x) && Number.isFinite(raw.y)) {
      curX = raw.x;
      curY = raw.y;
      hasCustomPos = true;
    }
  } catch {}

  const shadowParts = () => {
    const sr = el.shadowRoot;
    return {
      launcher: sr?.querySelector('.launch') || null,
      header: sr?.querySelector('header') || null,
      panel: sr?.querySelector('.panel') || null
    };
  };

  const clampPos = (x, y) => {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    const margin = 10;
    const topMin = vw <= 980 ? 10 : 56;
    const hostRect = el.getBoundingClientRect();
    const hw = hostRect.width || 116;
    const hh = hostRect.height || 36;
    const { panel } = shadowParts();
    if (panel && !panel.hidden) {
      const pr = panel.getBoundingClientRect();
      if (pr.width > 20 && pr.height > 20) {
        const leftExt = Math.max(0, hostRect.left - pr.left);
        const rightExt = Math.max(hw, pr.right - hostRect.left);
        const topExt = Math.max(0, hostRect.top - pr.top);
        const botExt = Math.max(hh, pr.bottom - hostRect.top);
        const minX = margin + leftExt;
        const maxX = Math.max(minX, vw - margin - rightExt);
        const minY = Math.max(topMin, margin + topExt);
        const maxY = Math.max(minY, vh - margin - botExt);
        return {
          x: Math.max(minX, Math.min(maxX, x)),
          y: Math.max(minY, Math.min(maxY, y))
        };
      }
    }
    const maxX = Math.max(margin, vw - margin - hw);
    const maxY = Math.max(topMin, vh - margin - hh);
    return {
      x: Math.max(margin, Math.min(maxX, x)),
      y: Math.max(topMin, Math.min(maxY, y))
    };
  };

  const applyPos = (x, y, persist = false) => {
    const clamped = clampPos(x, y);
    curX = Math.round(clamped.x);
    curY = Math.round(clamped.y);
    el.style.left = `${curX}px`;
    el.style.top = `${curY}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    if (persist) {
      hasCustomPos = true;
      try {
        localStorage.setItem(NYX_POS_STORAGE_KEY, JSON.stringify({ x: curX, y: curY }));
      } catch {}
    }
  };

  const syncQuadrant = () => {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    const r = el.getBoundingClientRect();
    const { panel } = shadowParts();
    const pw = Math.max(360, (panel && !panel.hidden && panel.offsetWidth) || Math.min(448, vw - 32));
    const ph = Math.max(320, (panel && !panel.hidden && panel.offsetHeight) || Math.min(380, vh - 140));
    const spaceBelow = vh - r.bottom - 12;
    const spaceAbove = r.top - 56;
    const spaceRight = vw - r.left - 12;
    const spaceLeft = r.right - 12;
    const vDir = (spaceBelow >= ph || spaceBelow >= spaceAbove) ? 'below' : 'above';
    const hDir = (spaceRight >= pw || spaceRight >= spaceLeft) ? 'left' : 'right';
    el.setAttribute('data-nyx-v', vDir);
    el.setAttribute('data-nyx-h', hDir);
    el.setAttribute('position', hDir);
  };

  const resetToDefault = () => {
    hasCustomPos = false;
    try { localStorage.removeItem(NYX_POS_STORAGE_KEY); } catch {}
    const def = defaultPos();
    el.setAttribute('data-nyx-v', 'below');
    el.setAttribute('data-nyx-h', 'left');
    el.setAttribute('position', 'left');
    applyPos(def.x, def.y, false);
    syncQuadrant();
  };

  const bindShadow = () => {
    const { launcher, header, panel } = shadowParts();
    if (!launcher || !header || !panel || launcher.dataset.nyxDragReady === '1') return Boolean(launcher);
    launcher.dataset.nyxDragReady = '1';

    syncNyxDragTitles = () => {
      const tipLauncher = L('点击打开 Nyx 助手 · 按住可自由拖拽', 'Click to toggle Nyx Assistant · Drag to move');
      const tipHeader = L('按住标题栏自由拖拽 · 双击复位左上角', 'Drag title bar to move · Double-click to reset to top-left');
      launcher.title = tipLauncher;
      header.title = tipHeader;
    };
    syncNyxDragTitles();

    let drag = null;

    const beginDrag = (ev, source) => {
      if (ev.button !== 0) return;
      if (source === 'header') {
        const target = ev.composedPath?.()[0] || ev.target;
        if (target?.closest?.('button, a, input, textarea')) return;
      }
      ev.stopPropagation();
      const rect = el.getBoundingClientRect();
      curX = rect.left;
      curY = rect.top;
      drag = {
        pointerId: ev.pointerId,
        startX: ev.clientX,
        startY: ev.clientY,
        origX: curX,
        origY: curY,
        moved: false,
        source
      };
    };

    launcher.addEventListener('pointerdown', ev => beginDrag(ev, 'launcher'));
    header.addEventListener('pointerdown', ev => beginDrag(ev, 'header'));

    // Swallow the synthetic click right after dragging the launcher pill so dragging doesn't toggle the panel.
    launcher.addEventListener('click', ev => {
      if (performance.now() < suppressClickUntil) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    }, true);

    header.addEventListener('dblclick', ev => {
      const target = ev.composedPath?.()[0] || ev.target;
      if (target?.closest?.('button, a')) return;
      resetToDefault();
    });

    window.addEventListener('pointermove', ev => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) >= 5) {
        drag.moved = true;
        el.setAttribute('data-nyx-dragging', '');
      }
      if (!drag.moved) return;
      ev.preventDefault();
      applyPos(drag.origX + dx, drag.origY + dy, false);
    }, { passive: false });

    const finishDrag = ev => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      const wasMoved = drag.moved;
      drag = null;
      el.removeAttribute('data-nyx-dragging');
      if (wasMoved) {
        suppressClickUntil = performance.now() + 260;
        if (panel.hidden) syncQuadrant();
        applyPos(curX, curY, true);
      }
    };
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    // Whenever the chat panel opens, orient toward the clearest quadrant and keep the full panel inside the viewport.
    if (typeof MutationObserver === 'function') {
      const mo = new MutationObserver(() => {
        if (!panel.hidden) {
          syncQuadrant();
          requestAnimationFrame(() => applyPos(curX, curY, false));
        }
      });
      mo.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    }

    const syncDefault = () => {
      if (hasCustomPos) return;
      const def = defaultPos();
      applyPos(def.x, def.y, false);
    };
    applyPos(curX, curY, false);
    requestAnimationFrame(() => { syncDefault(); syncQuadrant(); });
    syncQuadrant();
    return true;
  };

  if (!bindShadow() && window.customElements?.whenDefined) {
    window.customElements.whenDefined('nyx-assistant').then(() => {
      bindShadow();
    }).catch(() => {});
  }

  const syncOnViewportChange = () => {
    const { panel } = shadowParts();
    if (!hasCustomPos) {
      const def = defaultPos();
      applyPos(def.x, def.y, false);
    } else {
      applyPos(curX, curY, false);
    }
    if (!panel || panel.hidden) syncQuadrant();
  };
  window.addEventListener('resize', syncOnViewportChange, { passive: true });
  window.addEventListener('scroll', () => {
    if (!hasCustomPos && window.innerWidth <= 980) {
      const def = defaultPos();
      applyPos(def.x, def.y, false);
    }
  }, { passive: true });
}

if (nyxWidget) initNyxDraggable(nyxWidget);

for (const button of document.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => {
    if (button.dataset.mode === 'journey') state.follow = false;
    setMode(button.dataset.mode);
  });
}

for (const button of document.querySelectorAll('[data-method-department]')) {
  button.addEventListener('click', () => {
    setMode('organization');
    selectDepartment(button.dataset.methodDepartment, true, true);
  });
}

for (const button of document.querySelectorAll('[data-branch-department]')) {
  button.addEventListener('click', () => {
    setMode('organization');
    selectDepartment(button.dataset.branchDepartment, true, true);
  });
}

for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    state.limit = 9;
    for (const sibling of document.querySelectorAll('[data-filter]')) {
      sibling.setAttribute('aria-pressed', String(sibling === button));
    }
    renderQuestions();
  });
}

for (const button of document.querySelectorAll('[data-verdict-filter]')) {
  button.addEventListener('click', () => {
    state.verdictFilter = button.dataset.verdictFilter || 'all';
    for (const sibling of document.querySelectorAll('[data-verdict-filter]')) {
      sibling.setAttribute('aria-pressed', String(sibling === button));
    }
    renderConjectures();
  });
}

for (const button of document.querySelectorAll('[data-feed-filter]')) {
  button.addEventListener('click', () => {
    state.feedFilter = button.dataset.feedFilter;
    for (const sibling of document.querySelectorAll('[data-feed-filter]')) {
      sibling.setAttribute('aria-pressed', String(sibling === button));
    }
    renderLiveFeed();
  });
}

$('#ticker-action')?.addEventListener('click', () => {
  const item = state.tickerTarget;
  if (!item) return;
  if (item.task) {
    selectTopic(item);
  } else {
    setMode('organization');
    selectDepartment(item.department, true, true);
  }
  $('#institute').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
});

$('#open-lens-button')?.addEventListener('click', () => {
  setMode('organization');
  selectDepartment(state.selected, true, true);
});

$('#more-questions').addEventListener('click', () => {
  state.limit += 9;
  renderQuestions();
});

$('#journey-back').addEventListener('click', () => setMode('organization'));
$('#lens-back').addEventListener('click', () => closeDepartmentLens());

// Clicking a panel's own blank background returns one level up. Controls, text,
// drags, text selections and scrollbar presses keep the panel open.
const panelControlSelector = 'nyx-assistant, a, button, input, select, textarea, summary, label, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"]), .lens-agent';

function bindBackgroundBack(panel, back) {
  if (!panel) return;
  let press = null;
  const isBlank = target => {
    if (!(target instanceof Element) || !panel.contains(target)) return false;
    if (target.closest(panelControlSelector)) return false;
    return ![...target.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  };
  panel.addEventListener('pointerdown', event => {
    press = event.button === 0 && isBlank(event.target) ? { x: event.clientX, y: event.clientY } : null;
  });
  panel.addEventListener('click', event => {
    const start = press;
    press = null;
    const target = event.target;
    if (!start || event.defaultPrevented || !isBlank(target)) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    if (target.clientWidth && (event.offsetX > target.clientWidth || event.offsetY > target.clientHeight)) return;
    if (String(window.getSelection?.() || '').trim()) return;
    back();
  });
}

bindBackgroundBack($('#department-lens'), () => closeDepartmentLens());
bindBackgroundBack($('#journey-panel'), () => setMode('organization'));
bindBackgroundBack($('#telemetry-dock'), closeDockDrawer);

// With a window open, a press on empty space outside it (the 3D scene, or the empty part
// of a window underneath) closes just that window, the topmost one: the built-in browser,
// then the drawer, then the department. Empty space inside a window is handled by
// bindBackgroundBack.
function topWindow() {
  const browser = $('#inline-browser');
  if (browser && !browser.hidden) return { el: browser.querySelector('.ib-window'), close: closeInlineBrowser };
  const dock = $('#telemetry-dock');
  if (dock?.classList.contains('is-open')) return { el: dock, close: closeDockDrawer };
  if (state.focused) return { el: $('#department-lens'), close: closeDepartmentLens };
  return null;
}

const isEmptySpot = target => {
  if (!(target instanceof Element)) return false;
  if (['holo-3d', 'holo-gl', 'hive-board'].includes(target.id) || target.hasAttribute('data-ib-backdrop')) return true;
  if (target.closest(panelControlSelector)) return false;
  return ![...target.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
};
let windowPress = null;
document.addEventListener('pointerdown', event => {
  windowPress = null;
  const top = topWindow();
  if (event.button !== 0 || !top || top.el?.contains(event.target) || !isEmptySpot(event.target)) return;
  windowPress = { x: event.clientX, y: event.clientY, close: top.close };
  event.stopPropagation();
}, true);
document.addEventListener('click', event => {
  const press = windowPress;
  windowPress = null;
  if (!press || !isEmptySpot(event.target)) return;
  event.stopPropagation();
  if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
  if (String(window.getSelection?.() || '').trim()) return;
  press.close();
}, true);

// ---- Built-in browser -------------------------------------------------------
// Every outside link opens in a window on the page. GitHub refuses to be framed, so its
// pull requests, issues, Actions runs, commits, files, releases and repositories are read
// from the public GitHub API and laid out here; the description HTML GitHub renders is
// shown in a sandboxed frame that cannot run scripts. arXiv opens its PDF, which may be
// framed; sites that allow framing open directly; the rest explain and offer a new tab.
const INLINE_BLOCKED_HOSTS = /(^|\.)(openreview\.net|x\.com|twitter\.com|google\.com|youtube\.com|linkedin\.com|facebook\.com)$/;
const inlineBrowser = { history: [], index: -1, cache: new Map(), token: 0 };

function resolveInlineBrowserRoute(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const href = url.href;
  if (url.hostname === 'github.com') {
    const [owner, repo, section, ...rest] = url.pathname.split('/').filter(Boolean);
    if (owner && repo) {
      const api = `https://api.github.com/repos/${owner}/${repo}`;
      const base = { href, owner, repo };
      if (!section) return { ...base, kind: 'github-repo', api };
      if (section === 'pull' && /^\d+$/.test(rest[0] || '')) return { ...base, kind: 'github-pr', number: Number(rest[0]), api: `${api}/pulls/${rest[0]}` };
      if (section === 'issues' && /^\d+$/.test(rest[0] || '')) return { ...base, kind: 'github-issue', number: Number(rest[0]), api: `${api}/issues/${rest[0]}` };
      if (section === 'actions' && rest[0] === 'runs' && /^\d+$/.test(rest[1] || '')) return { ...base, kind: 'github-run', api: `${api}/actions/runs/${rest[1]}`, job: rest[2] === 'job' ? rest[3] || null : null };
      if (section === 'commit' && /^[0-9a-f]{4,40}$/i.test(rest[0] || '')) return { ...base, kind: 'github-commit', api: `${api}/commits/${rest[0]}` };
      if (section === 'blob' && rest.length >= 2) return { ...base, kind: 'github-blob', ref: rest[0], path: rest.slice(1).join('/'), raw: `https://raw.githubusercontent.com/${owner}/${repo}/${rest.join('/')}` };
      if (section === 'releases') return { ...base, kind: 'github-release', tag: rest[0] === 'tag' ? rest[1] || null : null, api: rest[0] === 'tag' && rest[1] ? `${api}/releases/tags/${rest[1]}` : `${api}/releases?per_page=8` };
    }
    return { href, kind: 'blocked', host: url.hostname };
  }
  if (url.hostname === 'arxiv.org' || url.hostname === 'www.arxiv.org') {
    const m = url.pathname.match(/^\/(?:abs|pdf)\/(.+?)(?:\.pdf)?$/);
    return m ? { href, kind: 'frame', src: `https://arxiv.org/pdf/${m[1]}`, label: L('arXiv 论文', 'arXiv Paper') } : { href, kind: 'blocked', host: url.hostname };
  }
  if (INLINE_BLOCKED_HOSTS.test(url.hostname)) return { href, kind: 'blocked', host: url.hostname };
  return { href, kind: 'frame', src: href, label: L('网页', 'Web Page') };
}

const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ibTime = iso => (iso
  ? (isEn()
      ? `${new Date(iso).toLocaleString('en-US', { hour12: false })} (${relative(iso)})`
      : `${new Date(iso).toLocaleString('zh-CN', { hour12: false })}（${relative(iso)}）`)
  : '—');
const ibDuration = (a, b) => {
  const ms = timestamp(b) - timestamp(a);
  if (!Number.isFinite(ms) || ms < 0) return '';
  const s = Math.round(ms / 1000);
  return isEn()
    ? (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)
    : (s >= 60 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒` : `${s} 秒`);
};
const IB_KIND_LABEL = { 'github-pr': 'Pull Request', 'github-issue': 'Issue', 'github-run': 'Actions 运行', 'github-commit': '提交', 'github-blob': '源码', 'github-release': '发布', 'github-repo': '仓库', frame: '网页', blocked: '外部站点' };
const IB_KIND_LABEL_EN = { 'github-pr': 'Pull Request', 'github-issue': 'Issue', 'github-run': 'Actions Run', 'github-commit': 'Commit', 'github-blob': 'Source', 'github-release': 'Release', 'github-repo': 'Repository', frame: 'Web Page', blocked: 'External Site' };
const ibKindLabel = kind => (isEn() ? (IB_KIND_LABEL_EN[kind] || '') : (IB_KIND_LABEL[kind] || ''));

const IB_DOC_CSS = `
:root{color-scheme:dark}
body{margin:0;padding:22px 28px 40px;background:#0a141d;color:#dceeed;font:14px/1.6 -apple-system,"PingFang SC","Segoe UI",sans-serif}
body.light{background:#faf7f0;color:#1d2a2c}
h1{font-size:21px;line-height:1.35;margin:4px 0 10px;color:#f2fffd}
body.light h1{color:#10302e}
.kind{font:600 11px/1 ui-monospace,monospace;letter-spacing:.08em;color:#7fe3dc;text-transform:uppercase}
body.light .kind{color:#10766e}
.num{color:#8aa9b0;font-weight:500}
.meta{color:#9bb8be;font-size:13px;margin:6px 0}
body.light .meta{color:#4a6468}
.chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;margin-right:6px;border:1px solid currentColor}
.chip.merged{color:#c49bff}.chip.open,.chip.success{color:#4fdc9c}.chip.closed,.chip.failure,.chip.cancelled{color:#ff7a7a}.chip.draft,.chip.neutral,.chip.skipped,.chip.queued,.chip.in_progress{color:#a8b8c0}
.label{display:inline-block;padding:1px 8px;border-radius:6px;background:rgba(127,227,220,.12);color:#9fe9e2;font-size:12px;margin:0 4px 4px 0}
.add{color:#4fdc9c}.del{color:#ff7a7a}
code,pre{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12.5px}
p code,li code,.meta code{background:rgba(127,227,220,.1);padding:1px 5px;border-radius:4px}
.markdown{margin-top:18px;padding-top:14px;border-top:1px solid rgba(127,227,220,.18)}
.markdown img{max-width:100%}
.markdown pre{background:rgba(0,0,0,.28);padding:10px 12px;border-radius:8px;overflow:auto}
body.light .markdown pre{background:rgba(0,0,0,.05)}
.markdown table{border-collapse:collapse}.markdown td,.markdown th{border:1px solid rgba(127,227,220,.22);padding:4px 8px}
.markdown blockquote{margin:0;padding-left:12px;border-left:3px solid rgba(127,227,220,.35);color:#9bb8be}
a{color:#7fe3dc}body.light a{color:#10766e}
.muted{color:#7d969b}
table.rows{border-collapse:collapse;width:100%;margin-top:14px}
table.rows td{padding:6px 8px;border-bottom:1px solid rgba(127,227,220,.12);vertical-align:top}
table.rows tr.hit td{background:rgba(127,227,220,.1)}
.steps{color:#9bb8be;font-size:12.5px;margin:4px 0 0;padding-left:18px}
pre.code{counter-reset:line;background:rgba(0,0,0,.28);border-radius:8px;padding:10px 0;overflow:auto;line-height:1.5}
body.light pre.code{background:rgba(0,0,0,.04)}
pre.code span{display:block;padding:0 14px 0 0;white-space:pre}
pre.code span::before{counter-increment:line;content:counter(line);display:inline-block;width:46px;margin-right:14px;text-align:right;color:#5d7a80}
`;

function ibPage(route, body) {
  const light = document.documentElement.dataset.theme === 'light' ? 'light' : '';
  return `<!doctype html><html><head><meta charset="utf-8"><base href="https://github.com/"><style>${IB_DOC_CSS}</style></head><body class="${light}">`
    + `<div class="kind">${htmlEscape(ibKindLabel(route.kind))} · ${htmlEscape(`${route.owner}/${route.repo}`)}</div>${body}</body></html>`;
}

async function ibFetch(url, accept, asText = false) {
  const resp = await fetch(url, { headers: { Accept: accept } });
  if (!resp.ok) {
    const remaining = resp.headers?.get?.('x-ratelimit-remaining');
    if ((resp.status === 403 || resp.status === 429) && remaining === '0') {
      throw new Error(L(
        'GitHub 公开接口本小时的访问额度已用完（每位访客每小时 60 次）。请稍后再试，或在新标签打开原页面。',
        'GitHub public API hourly rate limit reached (60 requests/hr per visitor). Please try again later or open in a new tab.'
      ));
    }
    if (resp.status === 404) throw new Error(L('GitHub 上找不到这个页面，或它不是公开的。', 'This GitHub page was not found or is not public.'));
    throw new Error(isEn() ? `Unable to load from GitHub (HTTP ${resp.status}).` : `GitHub 暂时无法读取（HTTP ${resp.status}）。`);
  }
  return asText ? resp.text() : resp.json();
}

const ibLabels = labels => (labels || []).map(l => `<span class="label">${htmlEscape(l.name || l)}</span>`).join('');
const ibMarkdown = html => `<article class="markdown">${html || `<p class="muted">${L('（没有正文）', '(No description)')}</p>`}</article>`;

async function githubView(route) {
  const JSONH = 'application/vnd.github.html+json';
  if (route.kind === 'github-pr') {
    const pr = await ibFetch(route.api, JSONH);
    const [label, cls] = pr.merged_at ? [L('已合并', 'Merged'), 'merged'] : pr.state === 'open' ? (pr.draft ? [L('草稿', 'Draft'), 'draft'] : [L('进行中', 'Open'), 'open']) : [L('已关闭', 'Closed'), 'closed'];
    return ibPage(route, `<h1>${htmlEscape(pr.title)} <span class="num">#${pr.number}</span></h1>`
      + `<p class="meta"><span class="chip ${cls}">${label}</span>${htmlEscape(pr.user?.login || '')} · ${L('创建于', 'Opened')} ${htmlEscape(ibTime(pr.created_at))}${pr.merged_at ? ` · ${L('合并于', 'Merged')} ${htmlEscape(ibTime(pr.merged_at))}` : ''}</p>`
      + `<p class="meta"><code>${htmlEscape(pr.head?.ref)}</code> → <code>${htmlEscape(pr.base?.ref)}</code> · <span class="add">+${pr.additions ?? 0}</span> <span class="del">−${pr.deletions ?? 0}</span> · ${pr.changed_files ?? 0} ${L('个文件', 'files')} · ${pr.commits ?? 0} ${L('个提交', 'commits')}</p>`
      + `<p>${ibLabels(pr.labels)}</p>${ibMarkdown(pr.body_html)}`);
  }
  if (route.kind === 'github-issue') {
    const is = await ibFetch(route.api, JSONH);
    const [label, cls] = is.state === 'open' ? [L('进行中', 'Open'), 'open'] : [L('已关闭', 'Closed'), 'closed'];
    return ibPage(route, `<h1>${htmlEscape(is.title)} <span class="num">#${is.number}</span></h1>`
      + `<p class="meta"><span class="chip ${cls}">${label}</span>${htmlEscape(is.user?.login || '')} · ${L('创建于', 'Opened')} ${htmlEscape(ibTime(is.created_at))} · ${is.comments ?? 0} ${L('条评论', 'comments')}${is.closed_at ? ` · ${L('关闭于', 'Closed')} ${htmlEscape(ibTime(is.closed_at))}` : ''}</p>`
      + `<p>${ibLabels(is.labels)}</p>${ibMarkdown(is.body_html)}`);
  }
  if (route.kind === 'github-run') {
    const run = await ibFetch(route.api, 'application/vnd.github+json');
    const jobs = await ibFetch(`${route.api}/jobs?per_page=50`, 'application/vnd.github+json').catch(() => ({ jobs: [] }));
    const verdict = run.conclusion || run.status;
    const rows = (jobs.jobs || []).map(j => {
      const hit = route.job && String(j.id) === String(route.job);
      const steps = hit ? `<ol class="steps">${(j.steps || []).map(st => `<li>${htmlEscape(st.name)} · ${htmlEscape(st.conclusion || st.status)}</li>`).join('')}</ol>` : '';
      return `<tr class="${hit ? 'hit' : ''}"><td>${htmlEscape(j.name)}${steps}</td><td><span class="chip ${htmlEscape(j.conclusion || j.status)}">${htmlEscape(j.conclusion || j.status)}</span></td><td>${htmlEscape(ibDuration(j.started_at, j.completed_at))}</td></tr>`;
    }).join('');
    return ibPage(route, `<h1>${htmlEscape(run.display_title || run.name)} <span class="num">#${run.run_number ?? ''}</span></h1>`
      + `<p class="meta"><span class="chip ${htmlEscape(verdict)}">${htmlEscape(verdict)}</span>${htmlEscape(run.name)} · ${htmlEscape(run.event)} · <code>${htmlEscape(run.head_branch)}</code> · <code>${htmlEscape(String(run.head_sha || '').slice(0, 7))}</code></p>`
      + `<p class="meta">${L('开始', 'Started')} ${htmlEscape(ibTime(run.run_started_at || run.created_at))} · ${L('用时', 'Duration')} ${htmlEscape(ibDuration(run.run_started_at || run.created_at, run.updated_at))}</p>`
      + (rows ? `<table class="rows">${rows}</table>` : ''));
  }
  if (route.kind === 'github-commit') {
    const c = await ibFetch(route.api, 'application/vnd.github+json');
    const [head, ...rest] = String(c.commit?.message || '').split('\n');
    const files = (c.files || []).slice(0, 200).map(f => `<tr><td><code>${htmlEscape(f.filename)}</code></td><td class="add">+${f.additions}</td><td class="del">−${f.deletions}</td></tr>`).join('');
    return ibPage(route, `<h1>${htmlEscape(head)}</h1>`
      + `<p class="meta">${htmlEscape(c.commit?.author?.name || '')} · ${htmlEscape(ibTime(c.commit?.author?.date))} · <code>${htmlEscape(String(c.sha || '').slice(0, 10))}</code> · <span class="add">+${c.stats?.additions ?? 0}</span> <span class="del">−${c.stats?.deletions ?? 0}</span></p>`
      + (rest.join('\n').trim() ? `<pre>${htmlEscape(rest.join('\n').trim())}</pre>` : '')
      + (files ? `<table class="rows">${files}</table>` : ''));
  }
  if (route.kind === 'github-blob') {
    const text = await ibFetch(route.raw, 'text/plain', true);
    const lines = String(text).slice(0, 400000).split('\n').slice(0, 6000);
    return ibPage(route, `<h1>${htmlEscape(route.path.split('/').pop())}</h1><p class="meta"><code>${htmlEscape(route.path)}</code> · <code>${htmlEscape(route.ref.slice(0, 12))}</code> · ${lines.length} ${L('行', 'lines')}</p>`
      + `<pre class="code">${lines.map(l => `<span>${htmlEscape(l) || ' '}</span>`).join('')}</pre>`);
  }
  if (route.kind === 'github-release') {
    const data = await ibFetch(route.api, JSONH);
    const list = Array.isArray(data) ? data : [data];
    return ibPage(route, list.map(r => `<h1>${htmlEscape(r.name || r.tag_name)}</h1><p class="meta"><code>${htmlEscape(r.tag_name)}</code> · ${htmlEscape(r.author?.login || '')} · ${htmlEscape(ibTime(r.published_at))}</p>${ibMarkdown(r.body_html)}`).join('') || `<p class="muted">${L('还没有发布。', 'No releases yet.')}</p>`);
  }
  if (route.kind === 'github-repo') {
    const repo = await ibFetch(route.api, 'application/vnd.github+json');
    const readme = await ibFetch(`${route.api}/readme`, 'application/vnd.github.html', true).catch(() => '');
    return ibPage(route, `<h1>${htmlEscape(repo.full_name)}</h1><p>${htmlEscape(repo.description || '')}</p>`
      + `<p class="meta">★ ${repo.stargazers_count ?? 0} · ${htmlEscape(repo.language || '')} · ${L('最近推送', 'Last push')} ${htmlEscape(ibTime(repo.pushed_at))}</p><p>${ibLabels(repo.topics)}</p>${ibMarkdown(readme)}`);
  }
  throw new Error(L('无法显示这个 GitHub 页面。', 'Unable to display this GitHub page.'));
}

function ibStatus(message, offerTab = false) {
  const status = $('#inline-browser .ib-status');
  if (!status) return;
  status.replaceChildren(element('p', message));
  if (offerTab) {
    const out = element('a', L('在新标签打开原页面 ↗', 'Open Original in New Tab ↗'), 'ib-status-out');
    out.href = inlineBrowser.history[inlineBrowser.index] || '#';
    out.target = '_blank';
    out.rel = 'noopener noreferrer';
    out.setAttribute('data-ib-out', '');
    status.append(out);
  }
  status.hidden = false;
}

function showInlineBrowserRoute(route) {
  const box = $('#inline-browser');
  if (!box) return;
  box.hidden = false;
  const frame = box.querySelector('.ib-frame');
  const native = box.querySelector('.ib-native');
  const status = box.querySelector('.ib-status');
  box.querySelector('.ib-url').textContent = route.href;
  box.querySelector('.ib-kind').textContent = route.label || ibKindLabel(route.kind);
  box.querySelector('[data-ib-out]').setAttribute('href', route.href);
  box.querySelector('[data-ib="back"]').disabled = inlineBrowser.index <= 0;
  box.querySelector('[data-ib="forward"]').disabled = inlineBrowser.index >= inlineBrowser.history.length - 1;
  const token = ++inlineBrowser.token;
  status.hidden = true;
  if (route.kind === 'frame') {
    native.hidden = true;
    native.removeAttribute('srcdoc');
    frame.hidden = false;
    if (frame.getAttribute('src') !== route.src) frame.setAttribute('src', route.src);
    return;
  }
  frame.hidden = true;
  if (frame.getAttribute('src') !== 'about:blank') frame.setAttribute('src', 'about:blank');
  native.hidden = true;
  if (route.kind === 'blocked') {
    ibStatus(
      isEn()
        ? `${route.host} does not allow embedding inside another page. Open it in a new tab instead.`
        : `${route.host} 不允许在其他网页里显示，只能在新标签打开。`,
      true
    );
    return;
  }
  const cached = inlineBrowser.cache.get(route.href);
  const show = html => {
    if (token !== inlineBrowser.token) return;
    inlineBrowser.cache.set(route.href, html);
    native.setAttribute('srcdoc', html);
    native.hidden = false;
    status.hidden = true;
  };
  if (cached) {
    show(cached);
    return;
  }
  ibStatus(L('正在从 GitHub 读取…', 'Loading from GitHub…'));
  githubView(route).then(show).catch(err => {
    if (token === inlineBrowser.token) ibStatus(err.message || L('读取失败。', 'Failed to load.'), true);
  });
}

function openInlineBrowser(url) {
  const route = resolveInlineBrowserRoute(url);
  if (!route) return false;
  inlineBrowser.history = inlineBrowser.history.slice(0, inlineBrowser.index + 1);
  inlineBrowser.history.push(route.href);
  inlineBrowser.index = inlineBrowser.history.length - 1;
  showInlineBrowserRoute(route);
  return true;
}

function stepInlineBrowser(delta) {
  const next = inlineBrowser.index + delta;
  if (next < 0 || next >= inlineBrowser.history.length) return;
  inlineBrowser.index = next;
  showInlineBrowserRoute(resolveInlineBrowserRoute(inlineBrowser.history[next]));
}

function closeInlineBrowser() {
  const box = $('#inline-browser');
  if (!box || box.hidden) return;
  box.hidden = true;
  inlineBrowser.token += 1;
  inlineBrowser.history = [];
  inlineBrowser.index = -1;
  const frame = box.querySelector('.ib-frame');
  if (frame && frame.getAttribute('src') !== 'about:blank') frame.setAttribute('src', 'about:blank');
  box.querySelector('.ib-native')?.removeAttribute('srcdoc');
}

// Plain clicks on outside links open the built-in browser; modified clicks keep the
// browser's own behaviour (new tab or window).
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link || link.hasAttribute('data-ib-out') || link.hasAttribute('download')) return;
  const href = link.href;
  if (!/^https:\/\//.test(href)) return;
  try {
    if (new URL(href).origin === location.origin) return;
  } catch {
    return;
  }
  if (openInlineBrowser(href)) event.preventDefault();
});

{
  const box = $('#inline-browser');
  box?.querySelector('[data-ib-backdrop]')?.addEventListener('click', () => closeInlineBrowser());
  box?.querySelector('[data-ib="close"]')?.addEventListener('click', () => closeInlineBrowser());
  box?.querySelector('[data-ib="back"]')?.addEventListener('click', () => stepInlineBrowser(-1));
  box?.querySelector('[data-ib="forward"]')?.addEventListener('click', () => stepInlineBrowser(1));
  box?.querySelector('[data-ib="reload"]')?.addEventListener('click', () => {
    const href = inlineBrowser.history[inlineBrowser.index];
    if (!href) return;
    inlineBrowser.cache.delete(href);
    const frame = box.querySelector('.ib-frame');
    if (frame && !frame.hidden) frame.setAttribute('src', 'about:blank');
    showInlineBrowserRoute(resolveInlineBrowserRoute(href));
  });
  // Links inside rendered GitHub content stay in the built-in browser too.
  const native = box?.querySelector('.ib-native');
  native?.addEventListener('load', () => {
    const doc = native.contentDocument;
    doc?.addEventListener('click', event => {
      const link = event.target?.closest?.('a[href]');
      if (!link) return;
      event.preventDefault();
      const raw = link.getAttribute('href') || '';
      if (raw.startsWith('#')) {
        doc.getElementById(decodeURIComponent(raw.slice(1)))?.scrollIntoView();
        return;
      }
      if (!openInlineBrowser(link.href)) window.open(link.href, '_blank', 'noopener');
    });
  });
}

$('#follow-live').addEventListener('click', () => {
  state.follow = !state.follow;
  if (state.follow) {
    state.focused = null;
    state.selected = view()?.recent?.[0]?.department || 'research';
    setMode('organization');
  }
  updateControls();
  renderLive();
});

$('#motion-toggle').addEventListener('click', () => {
  state.quiet = !state.quiet;
  document.body.classList.toggle('quiet', state.quiet);
  $('#motion-toggle').setAttribute('aria-pressed', String(state.quiet));
  renderRoutes();
  if (state.focused) renderDepartmentLens(department(state.focused));
});

$('#theme-toggle')?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try {
    localStorage.setItem(themeKey, next);
  } catch {}
});

// Whole-page fullscreen: header, 3D campus, readouts and relay rail stay together.
const fullscreenButton = $('#expand-room');
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

function syncFullscreenButton() {
  const on = Boolean(fullscreenElement());
  fullscreenButton.setAttribute('aria-pressed', String(on));
  fullscreenButton.setAttribute('aria-label', on ? tr('fullscreen_exit', '退出全屏') : L('进入全屏', 'Enter fullscreen'));
  fullscreenButton.title = on ? L('退出全屏（Esc）', 'Exit fullscreen (Esc)') : tr('fullscreen_title', '全屏显示');
  fullscreenButton.querySelector('span').textContent = on ? tr('fullscreen_exit', '退出全屏') : tr('fullscreen_enter', '全屏');
}

fullscreenButton.hidden = !(document.fullscreenEnabled || document.webkitFullscreenEnabled);
fullscreenButton.addEventListener('click', async () => {
  const root = document.documentElement;
  try {
    if (fullscreenElement()) {
      await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
    } else {
      await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen());
    }
  } catch {}
  syncFullscreenButton();
});
document.addEventListener('fullscreenchange', syncFullscreenButton);
document.addEventListener('webkitfullscreenchange', syncFullscreenButton);

document.addEventListener('keydown', event => {
  if (event.target.closest?.('nyx-assistant')) return;
  if (event.key === 'Escape') {
    if (introCinema.active) {
      skipIntroCinema();
      syncInstituteRealm();
      return;
    }
    if (cinemaDirector.active) {
      stopCinemaDirector();
      return;
    }
    if (genesisScrub.open) {
      genesisScrub.open = false;
      genesisScrub.playing = false;
      genesisScrub.value = 1.0;
      updateGenesisScrubUI();
      return;
    }
    if ($('#inline-browser') && !$('#inline-browser').hidden) {
      closeInlineBrowser();
      return;
    }
    if (galaxyDetail.selectedKey || !$('#galaxy-node-card')?.hidden) {
      closeGalaxyNodeCard();
      return;
    }
    if ($('#telemetry-dock')?.classList.contains('is-open')) closeDockDrawer();
    if (state.focused) closeDepartmentLens();
    if (truthGrowth.manualFocus && !truthGrowth.manualFocus.closing) {
      exitGalaxyMainView(performance.now());
    }
  }
});

if (reduced) {
  document.body.classList.add('quiet');
  $('#motion-toggle').hidden = true;
}

try {
  i18n()?.applyDom(document);
  if (isEn()) {
    const set = (sel, txt) => { const el = $(sel); if (el) el.textContent = txt; };
    set('#hive-hover-hint', tr('hint_mix', '3-Strata Observatory · Drag to orbit (dbl-click reset) · Click sky to strum · Space for Sonar'));
    set('#ticker-text', 'Connecting to trureturing live collaboration & Lean CI stream…');
    set('#dock-drawer-title', dockTitlesEn['live-ops']);
    set('#realm-stage', `${tr('stage_prefix', 'TIER ')}IV`);
    set('#realm-name', i18n()?.realmName ? i18n().realmName(4, 'Ascension') : 'Ascension');
    set('#realm-xp-meta', 'Syncing');
    set('#department-mode', tr('exec_sessions', 'Research Sessions'));
    set('#department-state', tr('connecting', 'Connecting'));
    set('#department-title', langDeptLabel('research', 'Math Research'));
    set('#department-responsibility', langDeptResp('research'));
    set('#activity-note', 'Live research signals');
    set('#relay-summary', 'Cross-deck flow');
    set('#live-feed-meta', 'Syncing…');
    set('#conjecture-summary', 'Loading curated & live Lean proofs and refutations…');
    updateLogBadge();
    syncFullscreenButton();
  }
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === 'light' || savedTheme === 'matrix' || savedTheme === 'blueprint') applyLook(savedTheme);
  else renderHoloSky();
} catch {
  renderHoloSky();
  triggerScanSweep();
}
startHoloLoop();
startGrowthPreview();

try {
  const saved = JSON.parse(localStorage.getItem(cacheKey));
  if (validSnapshot(saved)) {
    state.snapshot = saved;
    renderPapers();
    renderRepos();
  }
  const savedStream = JSON.parse(localStorage.getItem(streamCacheKey));
  if (validStream(savedStream) && Date.now() - timestamp(savedStream.organization.observed_at) < 3600000) {
    state.stream = savedStream;
    observeTruthGrowth(savedStream.truth_growth);
    for (const a of savedStream.organization.recent) state.seen.add(eventKey(a));
    renderLive();
  }
} catch {}

updateControls();
refreshSnapshot();
refreshConjectures();
refreshOutreachStats();
refreshLive();
setInterval(() => { if (!document.hidden) refreshSnapshot(); }, 60000);
setInterval(() => { if (!document.hidden || guideEvents) refreshLive(); }, 8000);
setInterval(() => {
  if (!document.hidden) {
    renderHealth();
    if (isStale()) renderLive();
  }
}, 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    renderHealth();
    if (!state.lastLiveFetchAt || Date.now() - state.lastLiveFetchAt >= 4000) refreshLive();
  }
});
