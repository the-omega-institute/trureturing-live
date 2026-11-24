const $ = selector => document.querySelector(selector);
const ns = 'http://www.w3.org/2000/svg';
const liveURL = 'https://trureturing-live-reader.vercel.app/api/live';
const cacheKey = 'trureturing-live.hive.content.v7';
const themeKey = 'trureturing-live.theme.v2';
const logModeKey = 'trureturing-live.log-mode.v1';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  snapshot: null,
  stream: null,
  selected: 'research',
  focused: null,
  hovered: null,
  hoveredSeat: null,
  mode: 'organization',
  follow: true,
  quiet: reduced,
  filter: 'all',
  feedFilter: 'all',
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
  direction: '监管之眼',
  research: '定理攻关',
  review: '对抗复核',
  verification: 'Lean 桥梁',
  books: '双语书稿',
  publication: '短文·论文',
  outreach: '对外合作',
  studio: '工程表达'
};

const hubMeta = {
  direction: { tag: 'THE ARCHITECT · HUMAN', title: '方向策源' },
  research: { tag: 'SECTOR 01 · THEORY', title: '课题攻坚台' },
  review: { tag: 'SECTOR 01 · AUDIT', title: '独立复核台' },
  verification: { tag: 'LEAN FORMAL BRIDGE', title: '形式验证桥梁' },
  publication: { tag: 'OUTREACH ENGINE · PAPERS', title: '论文知识台' },
  outreach: { tag: 'OUTREACH ENGINE · COLLAB', title: '对外合作台' },
  books: { tag: 'SECTOR 03 · LIVING BOOKS', title: '双语书稿台' },
  studio: { tag: 'SECTOR 04 · FOUNDRY', title: '工程与表达台' }
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
  if (!Number.isFinite(n)) return '近期';
  if (n < 60) return '刚刚';
  if (n < 3600) return `${Math.floor(n / 60)} 分钟前`;
  if (n < 86400) return `${Math.floor(n / 3600)} 小时前`;
  return `${Math.floor(n / 86400)} 天前`;
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
const sourceLabel = a => view()?.sources.find(s => s.id === a.source)?.label || '研究有了新的进展';

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
  const copies = state.snapshot?.editorial?.questions || {};
  const direct = copies[editorialKey(a.task)];
  if (direct) return { ...direct, canonical: key(a.task), hasEditorial: true };
  const refs = (a.references || []).filter(ref => ref.repository === a.task?.repository);
  const match = refs.find(ref => copies[editorialKey(ref)]);
  if (match) return { ...copies[editorialKey(match)], canonical: key(match), hasEditorial: true };
  const book = a.department === 'books';
  const title = humanTitle(a.label);
  const text = String(a.label || '');
  const area = book
    ? '理论书写'
    : /prime|arith|原根|素数|exponent/i.test(text) ? '数论'
    : /quantum|Kraus|qubit|量子|纠缠/i.test(text) ? '量子信息'
    : /graph|matroid|ternary|Steiner|Latin|Hardin|图|三元|cube/i.test(text) ? '组合与几何'
    : /spectr|fourier|compact|harmonic|occupation|频谱|紧致/i.test(text) ? '分析与结构'
    : '数学研究';
  return {
    title,
    area,
    question: book
      ? '将验证通过的新论证沉淀为可读的双语章节。'
      : '围绕这个问题探索新的构造、证明与可检验边界。',
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
  if (a.status === 'merged') return a.department === 'books' ? '已汇入书稿' : '新论证已汇入';
  if (a.status === 'closed') return '这一段探索已结束';
  if (a.status === 'claimed') return '已接下这项工作';
  if (a.kind === 'review') return '继续复核论证';
  if (a.kind === 'discussion') return '交换思路';
  if (a.kind === 'task') return '问题已经提出';
  return a.department === 'books' ? '正在完善书稿' : '正在推进论证';
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
        ? '协调交流工作，让研究走向更广的讨论。'
        : a.department === 'books'
          ? '把书稿中的新内容，接到持续构建与出版的流程。'
          : a.department === 'publication'
            ? '让已有的研究，出现在可以阅读与继续探索的地方。'
            : '研究提交正在经过项目已有的共同检验。'
    };
  }
  const message = messageFor(a);
  const text = message?.text || '';
  if (a.kind === 'review' || message?.kind === 'review_comment') {
    return { title: '提出了论证的复核意见', summary: '回到问题、条件与结论之间，检查还有哪些细节需要补充。' };
  }
  if (/^(?:本轮)?认领|^I(?: am|'m) taking|^Claimed\b/i.test(text)) {
    return { title: '接下了这条研究线索', summary: '沿着已有问题，开始推进下一部分论证。' };
  }
  if (/sharp.*(?:relative|bound)|Refine.*(?:count|discrepancy)|更紧|锐.*估计/i.test(text)) {
    return { title: '提议把估计再推进一步', summary: '从已有结论出发，尝试更精确的控制与更清楚的边界。' };
  }
  if (/counterexample|反例|boundary|边界/i.test(text)) {
    return { title: '继续考察边界与反例', summary: '从具体情形出发，寻找需要补充的条件。' };
  }
  if (/independent.*review|review.*passes|独立.*评审|评审.*意见/i.test(text)) {
    return { title: '更新了独立复核的讨论', summary: '围绕已有论证，继续交换检查与修订的意见。' };
  }
  if (a.kind === 'discussion') {
    return { title: a.department === 'books' ? '继续讨论这一部分书稿' : '补充了新的研究进展', summary: copyFor(a).title };
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
    : actor?.label || actor?.id || '公开账号';
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
  if (d.execution === 'human') return '问题从这里出发';
  const count = countRunning(d);
  if (count === null) return '等待新的进展';
  const queue = queueStats(d);
  if (count && queue.waiting) return `${count} 项执行 · ${queue.label} 待接力`;
  if (count) return `${count} 项工作正在执行`;
  if (queue.waiting) return `${queue.label} 项待接力`;
  const waiting = d.activities.filter(a => active(a) && a.status === 'waiting').length;
  if (waiting) return `${waiting} 项工作等待接力`;
  return d.activities.length ? '新的想法持续汇入' : '等待下一段探索';
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
  if (!current) return;
  const late = isStale();
  const connection = $('#connection');
  connection.classList.toggle('delayed', late);
  connection.lastElementChild.textContent = late ? '等待新的现场更新' : `${relative(current.observed_at)}更新`;
  $('#connection-note').hidden = !late;
  $('#connection-note').textContent = '更新稍慢。你仍然可以浏览已有架构、历史进展与公开讨论。';
}

function isGenericAutomationTitle(title) {
  return /^(?:检验研究提交|检查与构建书稿|出版在线书库|更新公开研究页面|发布研究知识|协调学术交流与传播|准备研究传播材料)$/.test(String(title || '').trim());
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
          push(`牵引：${copyFor(a).title}`);
          if (missions.length >= 3) break;
        }
      }
    }
    if (!missions.length) push('提出前沿问题 · 设定约束与方向把关');
    return missions;
  }

  if (d.id === 'verification') {
    const sorted = [...d.activities].sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at));
    for (const a of sorted) {
      if (a.kind === 'task' && !technical.test(a.label)) {
        push(`请求：${copyFor(a).title}`);
      } else if (a.kind === 'automation' && a.task) {
        const linked = findLinkedTaskActivity(a.task);
        if (linked && !technical.test(linked.label)) push(`核验：${copyFor(linked).title}`);
      }
      if (missions.length >= 4) break;
    }
    if (!missions.length) push('Lean 4 内核核验与定理账本固化');
    return missions;
  }

  if (d.id === 'review') {
    for (const a of d.activities) {
      const t = cleanWorkTitle(a, d);
      if (!isGenericAutomationTitle(t)) push(`复核：${t}`);
      if (missions.length >= 3) break;
    }
    if (!missions.length) {
      const rDept = department('research');
      const latest = rDept?.activities.find(a => a.kind === 'contribution' && !technical.test(a.label));
      push(latest ? `待审边界：${copyFor(latest).title}` : '独立跨模型边界复核就绪');
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
    if (!missions.length) push('双语理论章节整理与书面证明回流');
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
      const copy = state.snapshot?.editorial?.papers?.[p.id];
      push(`预印本：${copy?.title || humanTitle(p.title)}`);
      if (missions.length >= 4) break;
    }
    if (!missions.length) push('短文 DOI 发布与 Mathesis 公开目录');
    return missions;
  }

  if (d.id === 'outreach') {
    for (const p of (state.snapshot?.publications || []).slice(0, 2)) {
      const copy = state.snapshot?.editorial?.papers?.[p.id];
      push(`学者协作：${copy?.title || humanTitle(p.title)}`);
    }
    push('向题源作者同步已验证定理并回收请求');
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
    if (!missions.length) push('出版模板、交互可视化与大屏观测');
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
  if (!missions.length) push('持续探索新证明、反例与边界构造');
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
  $('#ticker-text').textContent = `${d?.label || '研究院'} · ${phase(item)}：${title}`;
  $('#ticker-time').textContent = `${relative(item.at)} · 查看 →`;
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
  items.push(metric(list.length, '个部门，持续相连'));
  items.push(metric(isStale() ? '—' : running, '项自动化正在运转', 'metric-active'));
  if (sessions) items.push(metric(isStale() ? '—' : sessions, '个研究会话正在推进', 'metric-active'));
  if (handoffsCount) items.push(metric(handoffsCount, '条跨部门引用接力'));
  items.push(element('span', '24/7 AI 自治闭环与人的方向指引', 'metric-end'));
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

  for (const btn of document.querySelectorAll('[data-method-department]')) {
    const id = btn.dataset.methodDepartment;
    const d = department(id);
    const badge = btn.querySelector('[data-step-badge]');
    btn.setAttribute('aria-pressed', String(state.focused === id || (!state.focused && state.selected === id)));
    if (!d || !badge) continue;
    if (d.execution === 'human') {
      badge.textContent = '指引';
      badge.classList.remove('is-hot');
      continue;
    }
    const run = countRunning(d);
    const q = queueStats(d);
    if (run) {
      badge.textContent = `${run} 运行中`;
      badge.classList.add('is-hot');
    } else if (q.waiting) {
      badge.textContent = `${q.label} 待接力`;
      badge.classList.remove('is-hot');
    } else if (d.activities.length) {
      badge.textContent = `${d.activities.length} 动态`;
      badge.classList.remove('is-hot');
    } else {
      badge.textContent = '就绪';
      badge.classList.remove('is-hot');
    }
  }
}

function createCell(d, index) {
  const pos = positions[d.id] || [200 + (index % 3) * 260, 180 + Math.floor(index / 3) * 200];
  const button = element('button', '', 'hive-cell is-boot-flash');
  button.type = 'button';
  button.dataset.department = d.id;
  button.dataset.execution = d.execution;
  button.dataset.focusKey = `department:${d.id}`;
  button.style.setProperty('--x', `${(pos[0] / 10).toFixed(2)}%`);
  button.style.setProperty('--y', `${(pos[1] / 7.4).toFixed(2)}%`);
  button.style.setProperty('--stagger', String(index));

  const pin = element('span', '', 'cell-pin');
  pin.setAttribute('aria-hidden', 'true');
  pin.append(element('i', '', 'cell-pin-node'), element('i', '', 'cell-pin-stem'));

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
  return { button, status, title, mode, seats, landmark, landmarkCap };
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
    hint.textContent = '点击任意部门六边形，放大进入该部门内部工作图';
    return;
  }
  const routes = view()?.routes || [];
  const out = routes.filter(r => r.from === id).map(r => department(r.to)?.label).filter(Boolean);
  const inc = routes.filter(r => r.to === id).map(r => department(r.from)?.label).filter(Boolean);
  const parts = [];
  if (inc.length) parts.push(`承接：${inc.join(' / ')}`);
  if (out.length) parts.push(`交棒：${out.join(' / ')}`);
  hint.textContent = parts.length ? `${d.label} · ${parts.join(' → ')}（点击放大进入部门图）` : `${d.label} · 点击放大进入部门图`;
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
    }
    const cell = state.cells.get(d.id);
    const missions = departmentMissions(d);
    cell.missions = missions;
    const mIdx = (cell.missionIdx || 0) % Math.max(1, missions.length);
    cell.title.textContent = d.label;
    cell.status.textContent = missions[mIdx] || departmentState(d);
    renderCellSeats(d, cell.seats);
    cell.button.setAttribute('aria-pressed', String(d.id === state.selected));
    cell.button.setAttribute('aria-label', `${d.label}。${d.responsibility}。${missions[0] || departmentState(d)}`);
    const running = countRunning(d);
    const q = queueStats(d);
    cell.button.classList.toggle('is-running', Boolean(running));
    if (cell.landmark && cell.landmarkCap) {
      if (d.execution === 'human') {
        cell.landmark.classList.remove('is-visible', 'is-live', 'is-human');
      } else if (d.id === 'verification' && running) {
        cell.landmarkCap.textContent = `${running} 核验`;
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
    svgText(958, 36, '问题策源 · 方向把关', 'arch-tier-sub')
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
    svgText(958, 238, 'AI 全天候自动攻关 ⇄ 独立复核 ▸ Lean CI 闭环', 'arch-tier-sub')
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
    svgText(958, 526, '书稿出版 · 论文与知识地图 · 学术交流 · 工程底座', 'arch-tier-sub')
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
  $('#department-agent-count').textContent = roster.length ? `${roster.length} 个公开席位` : '';
  container.replaceChildren();
  if (!roster.length) {
    container.append(element('p', '这个部门暂时没有可公开归属的工作席位。', 'loading'));
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
      element('span', actor.kind === 'agent' ? '明确标注的 agent' : '公开账号', 'agent-kind')
    );
    head.append(
      identity,
      element('span', running.length ? `${running.length} 项正在执行` : tasks.length ? '最近参与' : '已登记', 'agent-state' + (running.length ? ' is-running' : ''))
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
      taskList.append(element('p', '待命 · 等待新信号', 'agent-empty'));
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
  $('#department-mode').textContent = execution[d.execution] || '共同研究';
  $('#department-mode').dataset.execution = d.execution;
  $('#department-title').textContent = d.label;
  $('#department-responsibility').textContent = d.responsibility;
  $('#department-state').textContent = isStale()
    ? '稍早的研究现场'
    : d.running_automations ? `${d.running_automations} 项自动引擎运行中`
    : d.running_sessions ? `${d.running_sessions} 个研究会话推进中`
    : '24/7 持续接力';

  const people = d.participants || [];
  $('#department-people').replaceChildren(
    element('span', people.length ? `${people.length} 个公开参与席位` : '人类指引与把关', 'people-label'),
    element('span', d.activities.length ? `${d.observed_activities || d.activities.length} 条近期记录` : '等待公开动态', 'people-summary')
  );

  renderAgentRoster(d);

  const work = primaryWork(d);
  const container = $('#department-work');
  container.replaceChildren();
  $('#department-work-count').textContent = countRunning(d) ? `${countRunning(d)} 项执行中` : '';
  $('#department-work-title').textContent = d.execution === 'human' ? '研究如何继续' : '这里正在发生';

  if (d.execution === 'human') {
    container.append(element('p', '人提出值得研究的问题，判断哪些方向值得继续；AI 会话与 Lean CI 在下方闭环中 24/7 持续推进。', 'loading'));
    const button = element('button', '放大进入数学攻坚部门图 →', 'text-button');
    button.type = 'button';
    button.addEventListener('click', () => selectDepartment('research', true, true));
    container.append(button);
  }

  for (const a of work) {
    const task = a.task;
    const card = task ? element('button', '', 'work-item') : external('', a.url, 'work-item');
    if (task) card.type = 'button';
    card.dataset.focusKey = `work:${a.id}`;
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
      ? `${copyFor(linked).area} · 形式核验`
      : a.kind === 'automation'
        ? (d.id === 'books' ? '书稿构建' : d.id === 'outreach' ? '学术协作' : d.id === 'publication' ? '知识发布' : '形式核验')
        : d.id === 'publication'
          ? 'Mathesis / 知识'
          : d.id === 'studio'
            ? '工具与表达'
            : copyFor(a).area;
    bottom.append(
      element('span', areaTag),
      element('span', task ? '追踪接力 ↗' : '查看 ↗', 'work-arrow')
    );
    card.append(bottom);
    if (task) card.addEventListener('click', () => selectTopic(a));
    container.append(card);
  }

  if (!work.length && d.execution !== 'human') {
    container.append(element(
      'p',
      d.id === 'review'
        ? '新的复核意见会在这里汇入。也可以沿着课题，继续阅读公开讨论。'
        : '新的进展会在这里汇入。先沿着已有的研究线索继续探索。',
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
    links.append(element('span', '接力的上下游部门', 'people-label'));
    for (const id of related) {
      const target = department(id);
      if (!target) continue;
      const button = element('button', `${target.label} ↗`, 'connection-chip');
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
    spot.append(element('span', '悬浮通道高亮研究光束 · 点击右侧线索追踪全院接力 · 点击左右门户直达上下游'));
    return;
  }
  const tasks = actorTasks(d, actor);
  spot.append(element('strong', `通道 ${String(idx).padStart(2, '0')}：`));
  if (!tasks.length) {
    spot.append(element('span', '当前待命中，等待新的研究任务。'));
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
  lens.hidden = false;
  lens.dataset.department = d.id;
  room.classList.add('is-department-focused');

  // 1. Top 8-department quick switcher
  const switcher = $('#lens-switcher');
  if (switcher) {
    switcher.replaceChildren();
    for (const dept of departments()) {
      const pill = element('button', '', 'lens-switch-pill' + (countRunning(dept) ? ' has-running' : ''));
      pill.type = 'button';
      pill.setAttribute('role', 'tab');
      pill.setAttribute('aria-selected', String(dept.id === d.id));
      pill.append(element('i', '', 'lens-switch-dot'), document.createTextNode(dept.label));
      pill.addEventListener('click', () => selectDepartment(dept.id, true, true));
      switcher.append(pill);
    }
  }

  // 2. Compact header strip + inline KPIs
  $('#lens-title').textContent = d.label;
  $('#lens-responsibility').textContent = d.responsibility;
  const execPill = $('#lens-exec-pill');
  if (execPill) {
    execPill.textContent = execution[d.execution] || '共同研究';
    execPill.dataset.execution = d.execution;
  }
  $('#lens-freshness').textContent = view()?.observed_at ? `${relative(view().observed_at)}更新` : '';

  const method = methodByDepartment[d.id] || [d.label, '公开工作', '交给下一个部门'];
  $('#lens-input').textContent = method[1];
  $('#lens-output').textContent = method[2];

  const stats = queueStats(d);
  const metric = (value, label, className = '') => {
    const item = element('div', '', 'lens-metric' + (className ? ' ' + className : ''));
    item.append(element('strong', String(value)), element('span', label));
    return item;
  };
  $('#lens-metrics').replaceChildren(
    metric(isStale() ? '—' : stats.running, '正在执行', !isStale() && stats.running ? 'is-running' : ''),
    metric(stats.label, '可见待接力', stats.waiting ? 'is-queued' : ''),
    metric(d.observed_activities || stats.recent, '近期推进')
  );

  // 3. Central Department Medallion Hub (#lens-hub)
  const hubEl = $('#lens-hub');
  const meta = hubMeta[d.id] || { tag: 'DEPARTMENT', title: d.label };
  const runCount = countRunning(d);
  if (hubEl) {
    hubEl.classList.toggle('is-running', Boolean(runCount));
    hubEl.replaceChildren(
      element('span', meta.tag, 'map-hub-code'),
      element('strong', meta.title, 'map-hub-title'),
      element('span', runCount ? `${runCount} 项运行中` : d.execution === 'human' ? '方向起点' : stats.waiting ? `${stats.label} 待接力` : '24/7 待命', 'map-hub-stat')
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
      svgText(76, 24, 'IN // 上游输入', 'zoom-zone-label'),
      svgText(310, 24, 'STREAMS // 并行通道', 'zoom-zone-label'),
      svgText(590, 24, 'CORE // 部门枢纽', 'zoom-zone-label'),
      svgText(872, 24, 'ACTIVE // 流转线索', 'zoom-zone-label'),
      svgText(1122, 24, 'OUT // 下游交棒', 'zoom-zone-label')
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
        element('span', dir === 'in' ? '← 上游' : '下游 →', 'map-portal-dir'),
        element('strong', target.label),
        element('span', count ? `${count} 接力` : '点击直达', 'map-portal-count')
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
    const chLabel = element('span', `通道 ${code}`, 'lens-channel-label');
    const stEl = element('span', '', 'lens-agent-status' + (running.length ? ' is-running' : ''));
    stEl.append(
      element('i'),
      document.createTextNode(running.length ? `${running.length} 项执行中` : tasks.length ? `${relative(tasks[0].at)}活跃` : '待命中')
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
      lane.append(element('p', '通道就绪 · 等待新任务', 'lens-empty-seat'));
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
        ? '人类研究指引区：提出新的数学问题与战略方向，驱动下方 AI 部门 24/7 自治接力。'
        : '当前采样窗口内暂无活跃推进，新的研究任务出现后会实时点亮这里。',
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
        element('span', t.running ? '正在运转' : '持续流转'),
        element('span', hasTask ? '跟随接力 →' : '查看动态 ↗')
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
  if (manual) state.follow = false;
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
      element('strong', d.label),
      element('p', running ? `${running} 项相关工作正在执行` : phase(items[0]))
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
      ? `${a.actor.label}${mentions.length ? ' → ' + mentions.slice(0, 2).map(name => '@' + name).join('、') : ''}`
      : '';
    item.append(
      time,
      element('strong', a.kind === 'automation' ? phase(a) : update.title),
      element('p', byline, 'journey-byline'),
      element('p', a.kind === 'automation' ? update.title : update.summary),
      external('阅读这一段进展 ↗', a.url)
    );
    events.append(item);
  }
  if (!story.length) events.append(element('p', '问题已经提出，下一段探索会在这里继续。', 'loading'));

  links.append(external('阅读公开研究原线索 ↗', topic.url, 'text-link'));
  if (related.some(a => a.department === 'books')) {
    links.append(external('走进相关的理论书库 ↗', 'https://books.trureturing.org/', 'text-link'));
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
    top.append(element('span', d?.label || '研究现场', 'activity-role'), timeEl);
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
  if (!unique.length) container.append(element('p', '下一段探索，正在继续。', 'loading'));
  $('#activity-note').textContent = state.arrivals.length ? `${state.arrivals.length} 段新进展汇入` : '真实发生的下一步';
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
    const title = linked ? copyFor(linked).title : (deptId === 'books' ? '理论书稿章节讨论' : '研究论证推进讨论');
    const fallback = deptId === 'books' ? '围绕书稿推导与章节结构交换修订意见。' : '围绕当前课题补充新的构造、边界检验与证明思路。';
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
      actor: a.actor?.label || execution[department(a.department)?.execution] || 'Actions',
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
  if (meta) meta.textContent = `${filtered.length} 条动态`;
  container.replaceChildren();

  if (!filtered.length) {
    container.append(element('p', '当前筛选下暂无新的公开动态。', 'loading'));
    return;
  }

  for (const entry of filtered.slice(0, 6)) {
    const d = department(entry.deptId);
    const row = element('article', '', 'feed-entry');
    const head = element('div', '', 'feed-entry-head');
    const who = element('div', '', 'feed-who');
    const dot = element('i', '', 'feed-dept-dot');
    dot.style.background = deptColors[entry.deptId] || 'var(--accent)';
    who.append(dot, element('span', d?.label || entry.deptId, 'feed-dept-tag'));
    head.append(who, element('time', relative(entry.at), 'feed-time'));

    row.append(head, element('div', entry.title, 'feed-title'));
    if (entry.excerpt) row.append(element('p', entry.excerpt, 'feed-excerpt'));

    const foot = element('div', '', 'feed-footer');
    const actions = element('div', '', 'feed-actions');
    if (entry.linkedActivity) {
      const followBtn = element('button', '跟随接力 →');
      followBtn.type = 'button';
      followBtn.addEventListener('click', () => {
        selectTopic(entry.linkedActivity);
        $('#institute').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
      });
      actions.append(followBtn);
    }
    if (entry.url) actions.append(external('查看来源 ↗', entry.url));
    foot.append(element('span', d?.responsibility?.slice(0, 24) ? '' : ''), actions);
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
      ? '等待刷新'
      : `${workingCount} 运行中${waitingCount ? ` · ${waitingCount} 排队` : ''} · ${passedCount} 通过`;
  }

  // Visual checker light matrix (48 compact status cells)
  if (lights) {
    lights.replaceChildren();
    for (const a of runs.slice(0, 48)) {
      const st = fresh(a) ? a.status : (a.status === 'working' || a.status === 'waiting' ? 'unknown' : a.status);
      const cell = external('', a.url || '#', `checker-light is-${st}`);
      const d = department(a.department);
      cell.title = `${d?.label || a.department} · ${sourceLabel(a)} · ${phase(a)} (${relative(a.at)})`;
      lights.append(cell);
    }
  }

  container.replaceChildren();
  if (!runs.length) {
    container.append(element('p', '暂无观察到的自动检验记录。', 'loading'));
    return;
  }

  const badgeLabel = a => {
    if (a.status === 'working') return fresh(a) ? '运行中' : '稍早运行';
    if (a.status === 'waiting') return fresh(a) ? '排队中' : '稍早等待';
    if (a.status === 'succeeded') return '通过';
    if (a.status === 'failed') return '待修';
    if (a.status === 'cancelled') return '已取消';
    return '已结束';
  };

  for (const a of runs.slice(0, 5)) {
    const d = department(a.department);
    const linked = findLinkedTaskActivity(a.task);
    const row = external('', a.url || '#', 'checker-row');
    const st = fresh(a) ? a.status : (a.status === 'working' || a.status === 'waiting' ? 'unknown' : a.status);
    const badge = element('span', badgeLabel(a), `checker-badge is-${st}`);
    const main = element('span', '', 'checker-main');
    main.append(
      element('strong', `${d?.label || a.department} · ${sourceLabel(a)}`),
      element('small', linked ? copyFor(linked).title : '全天候自动检验与构建')
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
  if (summary) summary.textContent = total ? `共 ${total} 条跨部门接力` : '部门间流转';
  container.replaceChildren();

  if (!bridges.length) {
    container.append(element('p', '当不同部门的任务互相衔接时，接力流量会在这里展示。', 'loading'));
    return;
  }

  const maxCount = bridges[0].count || 1;
  for (const b of bridges.slice(0, 5)) {
    const fromLabel = department(b.from)?.label || b.from;
    const toLabel = department(b.to)?.label || b.to;
    const row = element('button', '', 'bridge-row');
    row.type = 'button';
    const top = element('div', '', 'bridge-top');
    const lbl = element('span', '', 'bridge-label');
    lbl.append(document.createTextNode(fromLabel), element('em', '→'), document.createTextNode(toLabel));
    top.append(lbl, element('span', `${b.count} 条`, 'bridge-count'));
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
    const top = element('div', '', 'question-card-top');
    top.append(element('span', topic.book ? '理论书写' : topic.copy.area), element('span', phase(a), 'phase'));
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
      element('span', `${relative(a.at)}有新进展`),
      element('span', '跟随接力 ↗')
    );
    card.append(bottom);
    container.append(card);
  }
  if (!topics.length) container.append(element('p', '新的研究线索正在汇入。', 'loading'));
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
  const copies = state.snapshot?.editorial?.papers || {};
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
      element('span', /preprint/i.test(paper.status || '') ? '预印本' : '研究论文', 'paper-type'),
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
      element('p', '研究正在长成可以阅读、讨论与继续推进的论文。'),
      external('阅读公开研究 ↗', 'https://www.trureturing.org/research', 'text-link')
    );
    container.append(empty);
  }
}

function renderRepos() {
  const container = $('#repo-matrix');
  const countEl = $('#repo-matrix-count');
  if (!container) return;
  const repos = state.snapshot?.repositories || [];
  if (countEl) countEl.textContent = repos.length ? `${repos.length} 个公开研究空间` : '';
  container.replaceChildren();
  if (!repos.length) {
    container.append(element('p', '正在同步公开研究仓库列表…', 'loading'));
    return;
  }
  const owner = state.snapshot?.owner || 'the-omega-institute';
  for (const repo of repos) {
    const tile = external('', `https://github.com/${owner}/${repo.name}`, 'repo-tile');
    const head = element('div', '', 'repo-tile-head');
    head.append(element('strong', repo.label || repo.name));
    if (repo.short) head.append(element('span', repo.short, 'repo-short'));
    tile.append(head, element('span', repo.description || repo.name, 'repo-name-mono'));
    container.append(tile);
  }
}

function updateControls() {
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
  }
  $('#follow-live').setAttribute('aria-pressed', String(state.follow));
  $('#follow-live span').textContent = state.follow ? '跟随最新' : '已固定视角';
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

function renderLive() {
  preserveFocus(() => {
    renderHealth();
    renderTicker();
    renderMetrics();
    renderHive();
    renderDepartment();
    renderDepartmentLens(department(state.focused));
    renderQuestions();
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
  try {
    const response = await fetch(liveURL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(18000)
    });
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (!validStream(data) || (state.stream && timestamp(data.organization.observed_at) < timestamp(view().observed_at))) return;
    const changed = state.stream?.organization.observed_at !== data.organization.observed_at;
    if (!changed) {
      renderHealth();
      return;
    }
    const first = !state.stream;
    const watermarks = new Map();
    for (const a of view()?.recent || []) {
      watermarks.set(a.source, Math.max(watermarks.get(a.source) || 0, timestamp(a.at) || 0));
    }
    const arrivals = first
      ? []
      : data.organization.recent.filter(a =>
          !state.seen.has(eventKey(a))
          && timestamp(a.at) >= (watermarks.get(a.source) || 0)
          && Date.now() - timestamp(a.at) < 900000
        );
    state.stream = data;
    state.arrivals = arrivals.slice(0, 8);
    for (const a of data.organization.recent) state.seen.add(eventKey(a));
    if (state.seen.size > 1600) state.seen = new Set([...state.seen].slice(-1000));
    if (state.animated.size > 800) state.animated = new Set([...state.animated].slice(-400));
    if (state.follow && state.mode === 'organization' && arrivals.length) {
      state.selected = arrivals[0].department;
    }
    renderLive();
    if (arrivals.length) {
      $('#live-announcement').textContent = `${department(arrivals[0].department)?.label || '研究院'}有新的进展。`;
    }
  } catch {
    renderHealth();
    if (!state.stream) {
      $('#connection-note').hidden = false;
      $('#connection-note').textContent = '研究现场连接稍慢，稍后会自动恢复。你可以先阅读已有的研究。';
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
const holoWorld = {
  direction:    { x:  0.0,  y: 3.65, z: -3.75, r: 0.72, baseH: 0.90, apex: true,  eye: true,  order: 0, hex: [244, 197, 83]  },
  verification: { x:  0.0,  y: 0.22, z: -0.45, r: 0.84, baseH: 1.44, apex: false, eye: false, order: 1, hex: [0, 255, 208]   },
  research:     { x: -5.30, y: 0.0,  z: -2.95, r: 0.72, baseH: 1.28, apex: false, eye: false, order: 2, hex: [29, 255, 130]  },
  review:       { x: -6.05, y: 0.0,  z:  1.95, r: 0.68, baseH: 1.20, apex: false, eye: false, order: 3, hex: [184, 148, 255] },
  publication:  { x:  5.30, y: 0.0,  z: -2.95, r: 0.72, baseH: 1.26, apex: false, eye: false, order: 4, hex: [61, 242, 180]  },
  outreach:     { x:  6.05, y: 0.0,  z:  1.95, r: 0.68, baseH: 1.20, apex: false, eye: false, order: 5, hex: [245, 161, 86]  },
  books:        { x: -3.35, y: 0.0,  z:  5.35, r: 0.68, baseH: 1.18, apex: false, eye: false, order: 6, hex: [217, 150, 245] },
  studio:       { x:  3.35, y: 0.0,  z:  5.35, r: 0.66, baseH: 1.14, apex: false, eye: false, order: 7, hex: [108, 214, 255] }
};

const holoCam = {
  yaw: -0.22,
  pitch: 0.68,
  dist: 22.0,
  targetYaw: 0.0,
  targetPitch: 0.55,
  targetDist: 18.8,
  gazeX: -5.30,
  gazeZ: -2.95,
  dragging: false,
  dragMoved: false,
  lastX: 0,
  lastY: 0,
  time: 0,
  bootAge: 0,
  raf: 0,
  stars: [],
  sparks: [],
  matrixCols: [],
  pulses: [],
  flares: [],
  nebulaRipples: [],
  projectedTowers: new Map()
};

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
  truthNebula.counts = data.counts || null;
  truthNebula.clusters = Array.isArray(data.clusters) ? data.clusters : [];
  truthNebula.clusterLinks = Array.isArray(data.cluster_links) ? data.cluster_links : [];
  truthNebula.stars = data.stars;
  truthNebula.edges = Array.isArray(data.edges) ? data.edges : [];
  const n = data.stars.length;
  truthNebula.projX = new Float32Array(n);
  truthNebula.projY = new Float32Array(n);
  truthNebula.projZ = new Float32Array(n);
  truthNebula.projLit = new Float32Array(n);

  // Build 144 continuously sprouting Frontier DAG Branches anchored to outer-rim stars of each galaxy!
  const clusterCenterById = new Map(truthNebula.clusters.map(c => [c.id, c.center]));
  const rimIndices = [];
  for (let i = 0; i < n; i++) {
    if (data.stars[i][4] >= 48) rimIndices.push(i);
  }
  const pool = rimIndices.length ? rimIndices : Array.from({ length: n }, (_, i) => i);
  let seed = 9187;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  truthNebula.frontier = [];
  for (let k = 0; k < 144; k++) {
    const pIdx = pool[Math.floor(rand() * pool.length)];
    const s = data.stars[pIdx];
    const ctr = clusterCenterById.get(s[3]) || [0, 0, 0];
    // Sprout outward along this star's real radial direction from its galaxy centroid!
    const dx = (s[0] - ctr[0]) / 1000, dy = (s[1] - ctr[1]) / 1000, dz = (s[2] - ctr[2]) / 1000;
    const r = Math.hypot(dx, dy, dz) || 0.12;
    const jx = (rand() - 0.5) * 0.16, jy = (rand() - 0.5) * 0.16, jz = (rand() - 0.5) * 0.12;
    truthNebula.frontier.push({
      parentIdx: pIdx,
      cid: s[3],
      vx: (dx / r) * (0.20 + rand() * 0.18) + jx,
      vy: (dy / r) * (0.20 + rand() * 0.18) + jy,
      vz: (dz / r) * (0.14 + rand() * 0.14) + jz,
      phase: rand(),
      speed: 0.068 + rand() * 0.055,
      size: 1.15 + rand() * 1.15
    });
  }
  truthNebula.loaded = true;
  if (view()) renderHealth();
}

async function loadTruthNebula() {
  if (truthNebula.loaded || truthNebula.loading || /jsdom/i.test(navigator.userAgent || '')) return;
  truthNebula.loading = true;
  try {
    const resp = await fetch('data/truth-nebula.v1.json', { cache: 'force-cache' });
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

function drawTruthDagNebula(ctx, w, h, t, isLight, isBlueprint) {
  if (!truthNebula.loaded || !truthNebula.stars.length) return;
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
        [120, 210, 255], [148, 228, 255], [108, 182, 255], [176, 198, 255],
        [126, 222, 248], [136, 192, 255], [214, 236, 255], [112, 198, 246]
      ]
    : isLight
      ? [
          [12, 136, 108], [16, 122, 166], [182, 104, 18], [114, 64, 188],
          [16, 138, 98], [46, 108, 192], [176, 112, 20], [28, 124, 120]
        ]
      : [
          [0, 242, 152],   // 0 Combinatorics: Matrix Emerald
          [0, 222, 240],   // 1 Quantum: Deep Quantum Cyan
          [246, 198, 86],  // 2 Arith: Prime Gold
          [178, 126, 255], // 3 ConceptDynamics: Cosmic Violet
          [56, 240, 184],  // 4 Analytic: Luminous Jade
          [112, 196, 255], // 5 Weil: Stellar Azure
          [252, 218, 124], // 6 Observer: Architect Gold
          [0, 224, 146]    // 7 Foundations Core: Matrix Core Emerald
        ];

  const quiet = state.quiet || reduced;
  const tEff = quiet ? 4.2 : t;
  // Subtle gentle stereo parallax sway tied to 3D drag (keeps galaxies stably framed in open sky!)
  const nebYaw = (quiet ? 0 : Math.sin(tEff * 0.14) * 0.045) + holoCam.yaw * 0.28;
  const nebPitch = 0.05 + (holoCam.pitch - 0.55) * 0.18;
  const cY = Math.cos(nebYaw), sY = Math.sin(nebYaw);
  const cP = Math.cos(nebPitch), sP = Math.sin(nebPitch);

  // Continuous cosmological expansion wavefronts sweeping core (0) -> outer rim (1.28)
  const front0 = quiet ? 0.52 : (tEff * 0.14) % 1.30;
  const front1 = quiet ? 0.92 : (tEff * 0.14 + 0.65) % 1.30;
  const breath = 1.0 + (quiet ? 0.02 : 0.038 * Math.sin(tEff * 0.30));

  const cx = w * 0.5;
  const cy = h * 0.50;
  const scaleX = w * 0.425 * breath;
  const scaleY = h * 0.455 * breath;
  const camZ = 2.65;

  const projectNeb = (nx, ny, nz) => {
    const x1 = nx * cY - nz * sY;
    const z1 = nx * sY + nz * cY;
    const y2 = ny * cP - z1 * sP;
    const z2 = ny * sP + z1 * cP + camZ;
    const inv = 1.85 / Math.max(0.65, z2);
    return [cx + x1 * scaleX * inv, cy - y2 * scaleY * inv, z2, inv];
  };

  // STRICT CORE SANCTUARY MASK: keeps the central foreground architecture (Akasha Eye,
  // 4-sector campus & Central Lean Bridge) 100% clear & unobstructed while letting the
  // vast outer Truth DAG cosmic ring shine brightly all around!
  const coreClear = (px, py) => {
    const dx = (px - w * 0.5) / (w * 0.235);
    const dy = (py - h * 0.49) / (h * 0.255);
    const d = Math.hypot(dx, dy);
    if (d <= 0.72) return 0.05;
    if (d >= 1.18) return 1.0;
    const u = (d - 0.72) / 0.46;
    return 0.05 + 0.95 * (u * u * (3 - 2 * u));
  };

  // Pre-project all named mathematical galaxy centroids around the outer cosmic perimeter!
  const clProj = new Map();
  for (const cl of clusters) {
    const [px, py, pz, inv] = projectNeb(cl.center[0] / 1000, cl.center[1] / 1000, cl.center[2] / 1000);
    clProj.set(cl.id, { cl, x: px, y: py, z: pz, inv, col: nebPalette[cl.id % nebPalette.length] });
  }

  ctx.save();
  if (!isLight) ctx.globalCompositeOperation = 'lighter';

  // PASS 1: Wide, airy Volumetric Cosmic Nebula Mist enveloping the 7 outer mathematical galaxies!
  for (const { cl, x: px, y: py, inv, col } of clProj.values()) {
    if (cl.name === 'Other') continue;
    const weight = Math.min(1.42, 0.78 + Math.sqrt((cl.count || 500) / 1600) * 0.48);
    const rad = Math.min(w, h) * 0.22 * weight * inv;
    const pulse = 1.0 + (quiet ? 0 : 0.08 * Math.sin(tEff * 0.44 + cl.id * 1.1));
    const g = ctx.createRadialGradient(px, py, 6, px, py, rad * pulse);
    const baseA = (isLight ? 0.052 : isBlueprint ? 0.082 : 0.098) * coreClear(px, py);
    g.addColorStop(0, rgba(col, baseA));
    g.addColorStop(0.52, rgba(col, baseA * 0.42));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, rad * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // PASS 2: Subtle Outer Cosmological Expansion Shockwaves (hugging the outer cosmos, clear of center!)
  const waveColor = isBlueprint ? [150, 215, 255] : isLight ? [15, 118, 110] : [0, 255, 168];
  const drawCosmicWave = (u, peakAlpha, lw) => {
    if (u <= 0.58 || u >= 1.28) return;
    const rx = w * 0.45 * u;
    const ry = h * 0.45 * u;
    const norm = (u - 0.58) / 0.70;
    const fade = Math.sin(Math.min(1, norm) * Math.PI);
    ctx.strokeStyle = rgba(waveColor, fade * peakAlpha);
    ctx.lineWidth = lw;
    ctx.setLineDash([6, 16]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  drawCosmicWave(0.58 + (front0 / 1.30) * 0.70, isLight ? 0.09 : 0.13, 0.95);
  drawCosmicWave(0.58 + (front1 / 1.30) * 0.70, isLight ? 0.06 : 0.09, 0.80);
  for (const rp of holoCam.nebulaRipples) {
    drawCosmicWave(0.58 + rp.age * 0.70, isLight ? 0.12 : 0.22, 1.25);
  }

  // PASS 3: PERIMETER-HUGGING CURVED INTER-GALAXY TRUTH DAG CONDUITS!
  // Routes real cross-galaxy dependencies gracefully AROUND the outer cosmic ring — ZERO lines cut across the core!
  const ringRx = w * 0.34;
  const ringRy = h * 0.385;
  const namedLinks = clusterLinks.filter(([u, v]) => {
    const cu = clProj.get(u)?.cl, cv = clProj.get(v)?.cl;
    return cu && cv && cu.name !== 'Other' && cv.name !== 'Other';
  });
  for (let i = 0; i < namedLinks.length; i++) {
    const [fromId, toId, count] = namedLinks[i];
    const a = clProj.get(fromId);
    const b = clProj.get(toId);
    if (!a || !b) continue;
    const angA = Math.atan2((a.y - cy) / ringRy, (a.x - cx) / ringRx);
    const angB = Math.atan2((b.y - cy) / ringRy, (b.x - cx) / ringRx);
    let diff = angB - angA;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    // Skip far-opposite diagonals (> 145 deg) so every link sweeps cleanly along the outer perimeter!
    if (Math.abs(diff) > 2.55) continue;

    // Sample 18 points smoothly along the outer elliptical cosmic arch (never entering core sanctuary!)
    const segs = 18;
    const pts = [];
    const rBoost = 1.0 + Math.min(0.14, Math.abs(diff) * 0.06) + (i % 3) * 0.025;
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const ang = angA + diff * u;
      const arch = Math.sin(u * Math.PI);
      const px = (a.x * (1 - u) + b.x * u) * (1 - arch * 0.72) + (cx + Math.cos(ang) * ringRx * rBoost) * (arch * 0.72);
      const py = (a.y * (1 - u) + b.y * u) * (1 - arch * 0.72) + (cy + Math.sin(ang) * ringRy * rBoost) * (arch * 0.72);
      pts.push([px, py]);
    }

    const strength = Math.min(1.0, Math.log1p(count) / Math.log1p(140));
    const lw = 0.85 + strength * 1.05;
    const alpha = (isLight ? 0.24 : 0.26) + strength * (isLight ? 0.20 : 0.24);
    const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, rgba(a.col, alpha));
    grad.addColorStop(1, rgba(b.col, alpha * 1.1));
    ctx.strokeStyle = grad;
    ctx.lineWidth = lw;
    ctx.beginPath();
    pts.forEach(([px, py], idx) => idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
    ctx.stroke();

    // Directional DAG chevron (▸) midway along the outer cosmic arc
    const midIdx = Math.floor(segs * 0.52);
    const p0 = pts[midIdx - 1], p1 = pts[midIdx];
    const chAng = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    ctx.save();
    ctx.translate(p1[0], p1[1]);
    ctx.rotate(chAng);
    ctx.strokeStyle = rgba(b.col, Math.min(0.90, alpha + 0.30));
    ctx.lineWidth = Math.max(1.0, lw * 0.85);
    ctx.beginPath();
    ctx.moveTo(-3.8, -2.6); ctx.lineTo(2.8, 0); ctx.lineTo(-3.8, 2.6);
    ctx.stroke();
    ctx.restore();

    // Gliding proof-packet traveling in the TRUE DAG direction along the perimeter arc
    if (!quiet) {
      const pu = (tEff * (0.14 + strength * 0.07) + i * 0.21) % 1;
      const fIdx = pu * segs;
      const i0 = Math.min(segs - 1, Math.floor(fIdx));
      const frac = fIdx - i0;
      const px = pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * frac;
      const py = pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * frac;
      const fade = Math.sin(pu * Math.PI);
      ctx.fillStyle = rgba(b.col, fade * (isLight ? 0.32 : 0.42));
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isLight ? rgba(b.col, fade * 0.86) : rgba([235, 255, 245], fade * 0.90);
      ctx.beginPath(); ctx.arc(px, py, 1.35, 0, Math.PI * 2); ctx.fill();
    }
  }

  // PASS 4: Project all 1,160 real Truth DAG stars with subtle airy radial expansion
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    const gen = s[4] / 100;
    const d0 = Math.max(0, 1 - Math.abs(gen - front0) / 0.16);
    const d1 = Math.max(0, 1 - Math.abs(gen - front1) / 0.16);
    const lit = Math.max(d0, d1);
    const cl = clProj.get(s[3])?.cl;
    const ctrX = (cl && cl.name !== 'Other') ? cl.center[0] / 1000 : 0;
    const ctrY = (cl && cl.name !== 'Other') ? cl.center[1] / 1000 : 0;
    const ctrZ = (cl && cl.name !== 'Other') ? cl.center[2] / 1000 : 0;
    const swell = 1.0 + lit * 0.08 + (quiet ? 0 : gen * 0.04 * Math.sin(tEff * 0.38 + gen * 4.2));
    const nx = ctrX + (s[0] / 1000 - ctrX) * swell;
    const ny = ctrY + (s[1] / 1000 - ctrY) * swell;
    const nz = ctrZ + (s[2] / 1000 - ctrZ) * swell;
    const [px, py, pz] = projectNeb(nx, ny, nz);
    projX[i] = px;
    projY[i] = py;
    projZ[i] = pz;
    projLit[i] = lit;
  }

  // PASS 5: AIRY BRANCHING INTRA-GALAXY DAG TREES (strictly masked outside core sanctuary!)
  for (let cid = 0; cid < clusters.length; cid++) {
    const col = nebPalette[cid % nebPalette.length];
    ctx.strokeStyle = rgba(col, isLight ? 0.24 : 0.26);
    ctx.lineWidth = 0.72;
    ctx.beginPath();
    let countNormal = 0;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (e[2] === 1) continue;
      const u = e[0], v = e[1];
      if (stars[u][3] !== cid) continue;
      // Never draw stray DAG branches inside the central foreground core!
      if (coreClear((projX[u] + projX[v]) * 0.5, (projY[u] + projY[v]) * 0.5) < 0.35) continue;
      if (Math.max(projLit[u], projLit[v]) > 0.52) continue;
      ctx.moveTo(projX[u], projY[u]);
      ctx.lineTo(projX[v], projY[v]);
      countNormal++;
    }
    if (countNormal) ctx.stroke();

    ctx.strokeStyle = isLight ? rgba(col, 0.50) : rgba([205, 255, 235], 0.50);
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    let countHot = 0;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (e[2] === 1) continue;
      const u = e[0], v = e[1];
      if (stars[u][3] !== cid) continue;
      if (coreClear((projX[u] + projX[v]) * 0.5, (projY[u] + projY[v]) * 0.5) < 0.35) continue;
      if (Math.max(projLit[u], projLit[v]) <= 0.52) continue;
      ctx.moveTo(projX[u], projY[u]);
      ctx.lineTo(projX[v], projY[v]);
      countHot++;
    }
    if (countHot) ctx.stroke();
  }

  // PASS 6: Render 1,160 Airy Real Truth DAG Stars (fine diamond stardust, 0 glare in core!)
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    const px = projX[i], py = projY[i];
    if (px < -12 || px > w + 12 || py < -12 || py > h + 12) continue;
    const mask = coreClear(px, py);
    if (mask < 0.08) continue;
    const col = nebPalette[s[3] % nebPalette.length];
    const degW = s[5];
    const lit = projLit[i];
    const aCore = ((isLight ? 0.36 : 0.38) + lit * (isLight ? 0.30 : 0.38) + (degW >= 7 ? 0.16 : 0)) * mask;

    if (degW >= 7 || lit > 0.68) {
      const rCore = (degW >= 8 ? 1.55 : 1.05) + lit * 0.40;
      ctx.fillStyle = rgba(col, Math.min(0.24, aCore * 0.32));
      ctx.beginPath();
      ctx.arc(px, py, rCore * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isLight ? rgba(col, Math.min(0.80, aCore)) : rgba([230, 255, 244], Math.min(0.88, aCore));
      ctx.beginPath();
      ctx.arc(px, py, rCore, 0, Math.PI * 2);
      ctx.fill();
      if (degW >= 9 && !isLight && mask > 0.65) {
        const sp = rCore * 3.8;
        ctx.strokeStyle = rgba(col, Math.min(0.46, aCore * 0.52));
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(px - sp, py); ctx.lineTo(px + sp, py);
        ctx.moveTo(px, py - sp); ctx.lineTo(px, py + sp);
        ctx.stroke();
      }
    } else {
      const sz = degW >= 5 ? 1.55 : 1.15;
      ctx.fillStyle = rgba(col, Math.min(0.72, aCore));
      ctx.fillRect(px - sz * 0.5, py - sz * 0.5, sz, sz);
    }
  }

  // PASS 7: 144 CONTINUOUSLY SPROUTING FRONTIER DAG BRANCHES (expanding outward into deep cosmos!)
  for (let k = 0; k < truthNebula.frontier.length; k++) {
    const f = truthNebula.frontier[k];
    const pStar = stars[f.parentIdx];
    const u = quiet ? ((f.phase * 0.70 + 0.18) % 1) : ((tEff * f.speed + f.phase) % 1);
    const dist = Math.pow(u, 0.82) * 0.55;
    const fx = pStar[0] / 1000 + f.vx * dist;
    const fy = pStar[1] / 1000 + f.vy * dist;
    const fz = pStar[2] / 1000 + f.vz * dist;
    const [px, py] = projectNeb(fx, fy, fz);
    if (px < -12 || px > w + 12 || py < -12 || py > h + 12) continue;
    const mask = coreClear(px, py);
    if (mask < 0.25) continue;
    const col = nebPalette[f.cid % nebPalette.length];
    const fade = Math.sin(u * Math.PI) * mask;

    if (u < 0.78) {
      const branchA = (1 - u / 0.78) * fade * (isLight ? 0.36 : 0.48);
      ctx.strokeStyle = rgba(col, branchA);
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(projX[f.parentIdx], projY[f.parentIdx]);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(col, fade * (isLight ? 0.22 : 0.32));
    ctx.beginPath();
    ctx.arc(px, py, f.size * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isLight ? rgba(col, fade * 0.80) : rgba([235, 255, 245], fade * 0.88);
    ctx.beginPath();
    ctx.arc(px, py, f.size * 0.82, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // PASS 8: CRISP ASTRONOMICAL TRUTH DAG GALAXY LABELS IN WIDE OPEN PERIMETER SKY!
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const strokeHalo = isLight ? 'rgba(247, 244, 236, 0.94)' : 'rgba(2, 10, 5, 0.94)';

  if (truthNebula.counts?.truth_nodes) {
    const hdr = `TRUTH DAG NEBULA // ${truthNebula.counts.truth_nodes.toLocaleString()} FROZEN THEOREMS · ${(truthNebula.counts.truth_edges || 0).toLocaleString()} DEPENDENCIES`;
    ctx.font = '700 9px "Geist Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeHalo;
    ctx.strokeText(hdr, w * 0.5, 62);
    ctx.fillStyle = isLight ? 'rgba(15, 118, 110, 0.78)' : isBlueprint ? 'rgba(150, 215, 255, 0.72)' : 'rgba(0, 242, 152, 0.74)';
    ctx.fillText(hdr, w * 0.5, 62);
  }

  for (const { cl, x: px, y: py, col } of clProj.values()) {
    if (cl.name === 'Other') continue;
    const isBottom = cl.center[1] < 0;
    const lx = Math.max(308, Math.min(w - 308, px));
    const ly = isBottom ? Math.min(h - 104, py + 38) : Math.max(84, py - 34);
    if (lx < 276 || lx > w - 276) continue;

    ctx.strokeStyle = rgba(col, isLight ? 0.45 : 0.42);
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(lx, isBottom ? ly - 10 : ly + 10);
    ctx.lineTo(px, py + (isBottom ? 10 : -10));
    ctx.stroke();

    ctx.fillStyle = rgba(col, isLight ? 0.82 : 0.88);
    ctx.beginPath();
    ctx.arc(lx, isBottom ? ly - 10 : ly + 10, 1.9, 0, Math.PI * 2);
    ctx.fill();

    const mainLabel = `${cl.zh || cl.name} · ${(cl.count || 0).toLocaleString()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 9.5px "Geist Mono", -apple-system, "PingFang SC", sans-serif';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = strokeHalo;
    ctx.strokeText(mainLabel, lx, ly);
    ctx.fillStyle = isLight ? rgba(col, 0.90) : rgba(col, 0.88);
    ctx.fillText(mainLabel, lx, ly);

    ctx.font = '600 7.6px "Geist Mono", ui-monospace, monospace';
    ctx.strokeText(cl.en || cl.name.toUpperCase(), lx, ly + (isBottom ? 11 : -11));
    ctx.fillStyle = isLight ? rgba(col, 0.66) : rgba([215, 248, 232], 0.56);
    ctx.fillText(cl.en || cl.name.toUpperCase(), lx, ly + (isBottom ? 11 : -11));
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
  mode: 'latest',
  latestSignature: null,
  latestKeys: new Set()
};

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
    return { tag: 'VERIFY', tone: 'cyan', deptId: a.department, targetId: 'research', text: `形式验证 ▸ 核验：${title}` };
  }
  if (a.department === 'books') {
    return { tag: 'CODEX', tone: 'violet', deptId: 'books', targetId: 'verification', text: `理论书写 ▸ ${title}` };
  }
  if (a.department === 'publication') {
    return { tag: 'PAPER', tone: 'live', deptId: 'publication', targetId: 'verification', text: `论文与知识 ▸ ${title}` };
  }
  if (a.department === 'studio') {
    return { tag: 'FORGE', tone: 'cyan', deptId: 'studio', targetId: 'books', text: `工具与表达 ▸ ${title}` };
  }
  return { tag: 'PROOF', tone: 'live', deptId: a.department, targetId: 'verification', text: `${d?.label || '数学攻坚'} ▸ ${title}` };
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
        text: `${d.label} ▸ ${m}`
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
    const f = department(b.from)?.label || b.from;
    const to = department(b.to)?.label || b.to;
    add({ tag: 'RELAY', tone: 'gold', deptId: b.from, targetId: b.to, text: `${f} ══▸ ${to} // ${b.count} 条引用接力` });
  }

  // 4. Hub summary pulse
  if (totalHandoffs) {
    add({ tag: 'HUB', tone: 'cyan', deptId: 'verification', targetId: 'research', text: `形式验证枢纽 ▸ 四路汇聚 · ${totalHandoffs} 条跨部门接力` });
  }

  return pool.length ? pool : [{ tag: 'BOOT', tone: 'cyan', deptId: 'verification', text: '正在接入全院实时研究战报流…' }];
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

  if (animate && entry.deptId) {
    spawnHoloPulse(entry.deptId, 0.78);
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

// Each distinct line appears once, at the time of its newest event.
function latestSciFiLogEntries() {
  const byLine = new Map();
  const rows = (view()?.recent || [])
    .filter(a => Number.isFinite(timestamp(a.at)))
    .sort((a, b) => timestamp(a.at) - timestamp(b.at));
  for (const a of rows) {
    const entry = activityLogEntry(a);
    if (!entry) continue;
    const line = `${entry.tag}:${entry.text}`;
    byLine.delete(line);
    byLine.set(line, { ...entry, key: eventKey(a), at: a.at });
  }
  return [...byLine.values()].slice(-30);
}

function renderLatestSciFiLog() {
  const container = $('#scifi-log-stream');
  if (!container || scifiLog.mode !== 'latest' || !view()) return;
  const entries = latestSciFiLogEntries();
  const signature = entries.map(e => e.key).join('|');
  if (signature === scifiLog.latestSignature) return;
  const firstPaint = scifiLog.latestSignature === null;
  const shown = scifiLog.latestKeys;
  container.replaceChildren(...entries.map(e => sciFiLogRow(e, !firstPaint && !shown.has(e.key), eventClock(e.at))));
  if (!entries.length) container.append(sciFiLogRow({ tag: 'IDLE', tone: 'muted', text: '暂无新的公开事件' }, false, '--:--:--'));
  scifiLog.latestKeys = new Set(entries.map(e => e.key));
  scifiLog.latestSignature = signature;
  const pktEl = $('#log-pkt-count');
  if (pktEl) pktEl.textContent = `${entries.length} 条最新`;
}

function setLogMode(mode) {
  scifiLog.mode = mode === 'cycle' ? 'cycle' : 'latest';
  for (const btn of document.querySelectorAll('[data-log-mode]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.logMode === scifiLog.mode));
  }
  const badge = $('#log-rate-badge');
  if (badge) badge.textContent = scifiLog.mode === 'cycle' ? 'HIGH-DENSITY INTEL · 轮播' : 'LATEST · 最新在下';
  $('#scifi-log-stream')?.replaceChildren();
  scifiLog.seeded = false;
  scifiLog.acc = 0;
  scifiLog.cursor = 0;
  scifiLog.latestSignature = null;
  scifiLog.latestKeys = new Set();
  renderLatestSciFiLog();
}

function stepSciFiLog(dt) {
  const container = $('#scifi-log-stream');
  if (!container || /jsdom/i.test(navigator.userAgent || '')) return;

  const motion = !state.quiet && !reduced;
  const rolling = scifiLog.mode === 'cycle' && motion && !scifiLog.hoverPaused;
  const spec = $('#log-spectrum');
  if (spec) spec.classList.toggle('is-paused', !rolling);
  if (!view()) return;

  // Cycle mode seeds an initial burst of 22 staggered high-density lines on its first frame.
  if (scifiLog.mode === 'cycle' && !scifiLog.seeded) {
    scifiLog.seeded = true;
    const pool = buildSciFiLogPool();
    for (let i = 0; i < 22; i++) {
      pushSciFiLogLine(pool[i % pool.length], false, -(22 - i) * 340);
    }
    scifiLog.cursor = 22;
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
    for (const [deptId, cell] of state.cells) {
      if (!cell.missions || cell.missions.length <= 1) continue;
      cell.missionIdx = ((cell.missionIdx || 0) + 1) % cell.missions.length;
      cell.status.textContent = cell.missions[cell.missionIdx];
      cell.button.classList.add('is-mission-shift');
      setTimeout(() => cell.button.classList.remove('is-mission-shift'), 420);
      if (archFlowTarget[deptId]) spawnSpokeFlare(deptId, archFlowTarget[deptId]);
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

const logWallEl = $('#scifi-log-wall');
if (logWallEl) {
  logWallEl.addEventListener('pointerenter', () => { scifiLog.hoverPaused = true; });
  logWallEl.addEventListener('pointerleave', () => { scifiLog.hoverPaused = false; });
}
for (const btn of document.querySelectorAll('[data-log-mode]')) {
  btn.addEventListener('click', () => {
    setLogMode(btn.dataset.logMode);
    try {
      localStorage.setItem(logModeKey, scifiLog.mode);
    } catch {}
  });
}
try {
  setLogMode(localStorage.getItem(logModeKey) || 'latest');
} catch {
  setLogMode('latest');
}

// ============================================================================
// MAIN 3D BIOMIMETIC RENDER FRAME
// ============================================================================
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

  const stepDt = Math.min(0.05, dt);
  if (!state.quiet && !reduced) {
    holoCam.time += stepDt;
    holoCam.bootAge += stepDt;
  } else {
    holoCam.bootAge = 5;
  }
  const t = holoCam.time;

  // Subtle disciplined camera micro-parallax (NO chaotic wild rotation!)
  const idleDrift = (!holoCam.dragging && !state.quiet && !reduced) ? Math.sin(t * 0.22) * 0.042 : 0;
  const ease = holoCam.bootAge < 1.2 ? 0.11 : 0.085;
  holoCam.yaw += (holoCam.targetYaw + idleDrift - holoCam.yaw) * ease;
  holoCam.pitch += (holoCam.targetPitch - holoCam.pitch) * ease;
  holoCam.dist += (holoCam.targetDist - holoCam.dist) * ease;

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

  const isLight = document.documentElement.dataset.theme === 'light';
  const isBlueprint = document.documentElement.dataset.look === 'blueprint';
  const isHolo = !isLight && !isBlueprint;

  // 1. Background Atmosphere (The Matrix Construct / Blueprint / Architectural Maquette)
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.36, 30, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  if (isLight) {
    bg.addColorStop(0, '#f7f4ec');
    bg.addColorStop(0.6, '#eeeae0');
    bg.addColorStop(1, '#dfd9cc');
  } else if (isBlueprint) {
    bg.addColorStop(0, '#102644');
    bg.addColorStop(0.55, '#0a182d');
    bg.addColorStop(1, '#061020');
  } else {
    bg.addColorStop(0, '#072213');
    bg.addColorStop(0.42, '#020d06');
    bg.addColorStop(1, '#010402');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  initHoloParticles();

  // Far-Background Matrix Mathematical & Lean Proof Code Rain (subtle, atmospheric, razor-sharp!)
  if (isHolo) {
    const aura = ctx.createRadialGradient(w * 0.5, h * 0.16, 10, w * 0.5, h * 0.32, w * 0.46);
    aura.addColorStop(0, 'rgba(0, 255, 136, 0.085)');
    aura.addColorStop(0.45, 'rgba(244, 197, 83, 0.032)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    const matrixGlyphs = ['∀', '∃', '⊢', '∎', 'λ', 'Σ', 'π', '∫', '∈', '⊂', '≤', '≥', '⊕', '⊗', '∞', '∅', '0', '1', 'L', 'e', 'a', 'n', 'Q', 'E', 'D', '→', '↔', '≡', '¬', '∧'];
    const tRain = (state.quiet || reduced) ? 3.5 : t;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const col of holoCam.matrixCols) {
      const px = col.u * w;
      // Gently attenuate in dead center so the 3D campus pops with crisp Matrix atmosphere on the flanks
      const centerDist = Math.abs(col.u - 0.5) * 2;
      const zoneFade = 0.44 + centerDist * 0.62;
      const stepY = col.size + 4;
      const rows = Math.ceil(h / stepY) + col.len + 6;
      const headRow = Math.floor((tRain * col.speed + col.phase) % rows);
      ctx.font = `600 ${col.size}px "Geist Mono", ui-monospace, Menlo, monospace`;
      for (let k = 0; k < col.len; k++) {
        const r = headRow - k;
        const py = r * stepY;
        if (py < -stepY || py > h) continue;
        const gIdx = Math.abs((col.seed + r * 7 + Math.floor(tRain * 1.4) * (k === 0 ? 3 : 0)) % matrixGlyphs.length);
        const ch = matrixGlyphs[gIdx];
        if (k === 0) {
          ctx.fillStyle = `rgba(218, 255, 232, ${(0.34 * col.depth * zoneFade).toFixed(3)})`;
        } else {
          const decay = Math.pow(1 - k / col.len, 1.38);
          ctx.fillStyle = `rgba(0, 238, 122, ${(0.19 * decay * col.depth * zoneFade).toFixed(3)})`;
        }
        ctx.fillText(ch, px, py);
      }
    }
    ctx.restore();
  }

  // 1B. LIVING EXPANDING 3D TRUTH DAG COSMIC NEBULA (real 18,367-node trureturing Truth DAG!)
  drawTruthDagNebula(ctx, w, h, t, isLight, isBlueprint);

  // Symmetrical Hero Framing across the expanded center Matrix campus!
  const cx = w * 0.5;
  const cy = state.focused ? h * 0.52 : h * 0.535;
  // Portrait boards are width-limited: keep the whole campus inside the frame.
  const fov = Math.min(Math.min(w, h) * (w > 1360 ? 1.08 : w > 980 ? 0.98 : 0.92), w * 0.84);
  const cosY = Math.cos(holoCam.yaw);
  const sinY = Math.sin(holoCam.yaw);
  const cosP = Math.cos(holoCam.pitch);
  const sinP = Math.sin(holoCam.pitch);
  const lookY = 0.55;
  const lookZ = 0.45;

  const project = (wx, wy, wz) => {
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

  // 2. Parallax Starfield / Matrix Sparks
  if (!isLight) {
    for (const st of holoCam.stars) {
      const p = project(st.x, st.y, st.z);
      if (!p || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) continue;
      ctx.fillStyle = isBlueprint
        ? `rgba(150,215,255,${(st.a * 0.55).toFixed(2)})`
        : st.cyan ? `rgba(0,255,148,${(st.a * 0.65).toFixed(2)})` : `rgba(190,255,220,${(st.a * 0.45).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sp of holoCam.sparks) {
      if (!state.quiet && !reduced) {
        sp.y += sp.vy * stepDt;
        if (sp.y > 4.4) sp.y = 0.05;
      }
      const p = project(sp.x, sp.y, sp.z);
      if (!p) continue;
      const fade = Math.sin((sp.y / 4.4) * Math.PI);
      const col = isBlueprint
        ? [150, 215, 255]
        : (sp.hue === 0 ? [0, 255, 160] : sp.hue === 1 ? [29, 255, 130] : [244, 197, 83]);
      ctx.fillStyle = rgba(col, fade * 0.52);
      ctx.beginPath(); ctx.arc(p.x, p.y, sp.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

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

  // ==========================================================================
  // 4. MATRIX ARCHITECTURAL CAMPUS: 4 SOVEREIGN SECTORS + CENTRAL LEAN BRIDGE
  //    + INDEPENDENT AKASHA EYE (THE ARCHITECT) ABOVE
  // Spacious institutional wing architecture — Lean is the glowing central
  // structural bridge connecting independent wings, NOT swallowing them!
  // ==========================================================================
  const tier1RGB = [244, 197, 83];
  const hubRGB = isBlueprint ? [150, 215, 255] : [0, 255, 208];
  const matrixRGB = isBlueprint ? [125, 185, 245] : [0, 235, 120];
  const hubX = 0.0, hubY = 0.22, hubZ = -0.45;
  const eyeCfg = holoWorld.direction;
  const activeId = state.hovered || state.selected;

  // Smoothly track the Akasha Eye's living gaze toward the active AI department below!
  const gazeTarget = (activeId && activeId !== 'direction' && holoWorld[activeId]) ? holoWorld[activeId] : holoWorld.verification;
  holoCam.gazeX += (gazeTarget.x - holoCam.gazeX) * 0.09;
  holoCam.gazeZ += (gazeTarget.z - holoCam.gazeZ) * 0.09;

  // 4A. Crisp Receding 3D Matrix Construct Floor Grid
  ctx.save();
  for (let gx = -9; gx <= 9; gx += 1.5) {
    const edgeFade = 1 - Math.abs(gx) / 11;
    draw3DSeg(
      project(gx, -0.04, -5.0),
      project(gx, -0.04, 6.8),
      rgba(matrixRGB, (isLight ? 0.07 : isBlueprint ? 0.11 : 0.095) * edgeFade),
      0.8
    );
  }
  for (let gz = -4.5; gz <= 6.5; gz += 1.5) {
    const zFade = 1 - Math.abs(gz - 0.8) / 7.2;
    draw3DSeg(
      project(-9.2, -0.04, gz),
      project(9.2, -0.04, gz),
      rgba(matrixRGB, (isLight ? 0.07 : isBlueprint ? 0.11 : 0.095) * Math.max(0.25, zFade)),
      0.8
    );
  }
  ctx.restore();

  // 4B. Symmetric Bidirectional Oversight & Telemetry Field between ENTIRE 4-Sector Campus & Akasha Eye!
  const eyeOrigin = project(eyeCfg.x, eyeCfg.y, eyeCfg.z);
  const rimL = project(-6.85, 0.05, -0.35);
  const rimR = project( 6.85, 0.05, -0.35);
  const eyeBoost = activeId === 'direction' ? 1.55 : 1.0;
  if (eyeOrigin && rimL && rimR) {
    ctx.save();
    if (!isLight) ctx.globalCompositeOperation = 'lighter';
    const veil = ctx.createLinearGradient(eyeOrigin.x, eyeOrigin.y, eyeOrigin.x, Math.max(rimL.y, rimR.y));
    veil.addColorStop(0, rgba(tier1RGB, (isLight ? 0.11 : 0.14) * eyeBoost));
    veil.addColorStop(0.50, rgba(tier1RGB, (isLight ? 0.032 : 0.036) * eyeBoost));
    veil.addColorStop(1, rgba(tier1RGB, 0));
    ctx.fillStyle = veil;
    ctx.beginPath();
    ctx.moveTo(eyeOrigin.x, eyeOrigin.y);
    ctx.lineTo(rimL.x, rimL.y);
    ctx.lineTo(rimR.x, rimR.y);
    ctx.closePath();
    ctx.fill();

    // Four symmetric oversight sightlines embracing both sovereign wings + bridge
    const fieldAnchors = [
      [-6.85, 0.05, -0.35, 0.16],
      [-3.10, 0.05, -2.80, 0.10],
      [ 3.10, 0.05, -2.80, 0.10],
      [ 6.85, 0.05, -0.35, 0.16]
    ];
    ctx.lineWidth = 0.95;
    ctx.setLineDash([4, 7]);
    for (const [ax, ay, az, al] of fieldAnchors) {
      const pA = project(ax, ay, az);
      if (!pA) continue;
      ctx.strokeStyle = rgba(tier1RGB, Math.min(0.65, (isLight ? al * 1.2 : al) * eyeBoost));
      ctx.beginPath(); ctx.moveTo(eyeOrigin.x, eyeOrigin.y); ctx.lineTo(pA.x, pA.y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Continuous upward observation/feedback streams rising symmetrically from ALL 7 departments into the Eye!
    if (!state.quiet && !reduced) {
      const streamDepts = ['research', 'review', 'outreach', 'verification', 'publication', 'studio', 'books'];
      const sampleUp = (src, u) => {
        const ease = 1 - Math.pow(1 - u, 1.35);
        const mx = src.x * (1 - ease) + eyeCfg.x * ease;
        const mz = src.z * (1 - ease) + eyeCfg.z * ease;
        const my = ((src.y || 0) + 0.55) * (1 - u) + (eyeCfg.y - 0.10) * u;
        return project(mx, my, mz);
      };
      for (let i = 0; i < streamDepts.length; i++) {
        const src = holoWorld[streamDepts[i]];
        if (!src) continue;
        const col = isBlueprint ? [150, 215, 255] : src.hex;
        for (let wave = 0; wave < 2; wave++) {
          const u = (t * 0.23 + i / streamDepts.length + wave * 0.5) % 1;
          const uTail = Math.max(0, u - 0.11);
          const ptHead = sampleUp(src, u);
          const ptTail = sampleUp(src, uTail);
          if (!ptHead || !ptTail) continue;
          const fade = Math.sin(u * Math.PI) * Math.min(1.25, eyeBoost);
          const stGrad = ctx.createLinearGradient(ptTail.x, ptTail.y, ptHead.x, ptHead.y);
          stGrad.addColorStop(0, rgba(col, 0));
          stGrad.addColorStop(0.55, rgba(col, fade * (isLight ? 0.40 : 0.48)));
          stGrad.addColorStop(1, rgba(isLight ? tier1RGB : [255, 245, 210], fade * (isLight ? 0.70 : 0.85)));
          ctx.strokeStyle = stGrad;
          ctx.lineWidth = isLight ? 1.45 : 1.35;
          ctx.beginPath(); ctx.moveTo(ptTail.x, ptTail.y); ctx.lineTo(ptHead.x, ptHead.y); ctx.stroke();
          ctx.fillStyle = rgba(isLight ? tier1RGB : [255, 248, 224], fade * 0.88);
          ctx.beginPath(); ctx.arc(ptHead.x, ptHead.y, 1.7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = rgba(col, fade * 0.34);
          ctx.beginPath(); ctx.arc(ptHead.x, ptHead.y, 3.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Subtle downward golden supervisory pulse wave descending symmetrically over the entire campus
      const dw = (t * 0.26) % 1;
      const wy = eyeCfg.y - 0.30 - dw * (eyeCfg.y - 0.36);
      const wz = eyeCfg.z + dw * (hubZ - eyeCfg.z);
      const wrx = 0.65 + dw * 5.85;
      const wrz = 0.30 + dw * 3.10;
      draw3DRing(0, wy, wz, wrx, wrz, 48, rgba(tier1RGB, Math.sin(dw * Math.PI) * (isLight ? 0.26 : 0.24) * eyeBoost), 1.1, [5, 7]);
    }
    ctx.restore();
  }

  // 4C. FOUR SOVEREIGN ARCHITECTURAL WING TERRACES (Clear Departmental Architecture!)
  const drawSectorTerrace = (sx, sz, hx, hz, rgb, isHot = false) => {
    const ch = 0.38; // architectural chamfered corners
    const poly = [
      [sx - hx + ch, sz - hz], [sx + hx - ch, sz - hz],
      [sx + hx, sz - hz + ch], [sx + hx, sz + hz - ch],
      [sx + hx - ch, sz + hz], [sx - hx + ch, sz + hz],
      [sx - hx, sz + hz - ch], [sx - hx, sz - hz + ch]
    ];
    const pts = poly.map(([px, pz]) => project(px, 0.0, pz));
    if (pts.some(p => !p)) return;
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = isLight ? 'rgba(249, 247, 240, 0.78)' : rgba(rgb, isHot ? 0.095 : 0.048);
    ctx.fill();
    ctx.strokeStyle = rgba(rgb, isLight ? (isHot ? 0.65 : 0.38) : (isHot ? 0.78 : 0.36));
    ctx.lineWidth = isHot ? 1.8 : 1.25;
    ctx.stroke();

    // Crisp illuminated architectural corner brackets on all 4 corners
    const bLen = 0.55;
    const corners = [
      [[sx - hx, sz - hz + bLen], [sx - hx, sz - hz + ch], [sx - hx + ch, sz - hz], [sx - hx + bLen, sz - hz]],
      [[sx + hx - bLen, sz - hz], [sx + hx - ch, sz - hz], [sx + hx, sz - hz + ch], [sx + hx, sz - hz + bLen]],
      [[sx + hx, sz + hz - bLen], [sx + hx, sz + hz - ch], [sx + hx - ch, sz + hz], [sx + hx - bLen, sz + hz]],
      [[sx - hx + bLen, sz + hz], [sx - hx + ch, sz + hz], [sx - hx, sz + hz - ch], [sx - hx, sz + hz - bLen]]
    ];
    ctx.strokeStyle = rgba(rgb, isLight ? 0.80 : 0.92);
    ctx.lineWidth = 2.0;
    for (const br of corners) {
      const bp = br.map(([bx, bz]) => project(bx, 0.025, bz));
      if (bp.some(p => !p)) continue;
      ctx.beginPath();
      bp.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
    ctx.restore();
  };

  const sec1Hot = activeId === 'research' || activeId === 'review';
  const sec2Hot = activeId === 'publication' || activeId === 'outreach';
  const sec3Hot = activeId === 'books';
  const sec4Hot = activeId === 'studio';
  const bridgeHot = activeId === 'verification';

  // Left Wing: Sector 01 — Theory & Adversarial Audit (数学攻坚 + 独立评审)
  drawSectorTerrace(-5.65, -0.50, 1.96, 3.72, isBlueprint ? [150, 215, 255] : [29, 255, 130], sec1Hot);
  // Right Wing: Sector 02 — OUTREACH ENGINE (论文与知识 ⇄ 对外学术合作 ▸ 写回形式化)
  drawSectorTerrace( 5.65, -0.50, 1.96, 3.72, isBlueprint ? [150, 215, 255] : [245, 168, 92], sec2Hot);
  // Front-Left: Sector 03 — Independent Living Books Division (理论书写 · trureturing-books)
  drawSectorTerrace(-3.35,  5.35, 1.68, 1.05, isBlueprint ? [150, 215, 255] : [217, 150, 245], sec3Hot);
  // Front-Right: Sector 04 — Independent Tooling & Expression Foundry (工具与表达)
  drawSectorTerrace( 3.35,  5.35, 1.68, 1.05, isBlueprint ? [150, 215, 255] : [108, 214, 255], sec4Hot);

  // 4D. SUSPENDED STRUCTURAL LEAN BRIDGE DECK + TWIN HORIZONTAL BRIDGE TRUSS SPANS!
  // Visually establishes Formal Verification as the structural BRIDGE joining the wings!
  const drawBridgeSpan = (xStart, xEnd, zCenter, yDeck, halfW, rgb, isHot) => {
    const segs = 4;
    const step = (xEnd - xStart) / segs;
    const strokeMain = rgba(rgb, isLight ? (isHot ? 0.72 : 0.45) : (isHot ? 0.85 : 0.46));
    const strokeTruss = rgba(rgb, isLight ? 0.28 : 0.24);
    // Translucent bridge roadway fill
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
      ctx.fillStyle = isLight ? rgba(rgb, 0.14) : rgba(rgb, isHot ? 0.14 : 0.075);
      ctx.fill();
    }
    // North & South bridge side rails
    draw3DSeg(project(xStart, yDeck, zCenter - halfW), project(xEnd, yDeck, zCenter - halfW), strokeMain, 1.5);
    draw3DSeg(project(xStart, yDeck, zCenter + halfW), project(xEnd, yDeck, zCenter + halfW), strokeMain, 1.5);
    // Architectural X-truss cross-bracing beneath the bridge deck
    for (let i = 0; i < segs; i++) {
      const xa = xStart + i * step, xb = xa + step;
      draw3DSeg(project(xa, yDeck, zCenter - halfW), project(xb, yDeck, zCenter + halfW), strokeTruss, 0.9);
      draw3DSeg(project(xa, yDeck, zCenter + halfW), project(xb, yDeck, zCenter - halfW), strokeTruss, 0.9);
      draw3DSeg(project(xa, yDeck, zCenter - halfW), project(xa, yDeck, zCenter + halfW), strokeTruss, 0.9);
    }
  };
  drawBridgeSpan(-3.67, -1.45, hubZ, hubY * 0.72, 0.44, hubRGB, bridgeHot || sec1Hot);
  drawBridgeSpan( 1.45,  3.67, hubZ, hubY * 0.72, 0.44, hubRGB, bridgeHot || sec2Hot);

  // Sculpted elevated 3D octagonal CENTRAL LEAN BRIDGE DECK!
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
      ctx.fillStyle = isLight ? rgba(rgb, 0.16) : rgba(rgb, 0.18);
      ctx.fill();
      ctx.strokeStyle = rgba(rgb, isLight ? 0.44 : 0.50);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.beginPath();
    topPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = isLight ? 'rgba(235, 250, 246, 0.90)' : rgba(rgb, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(rgb, isLight ? 0.78 : 0.94);
    ctx.lineWidth = 2.0;
    ctx.stroke();
    draw3DRing(hx, 0.02, hz, radX * 1.18, radZ * 1.18, 40, rgba(rgb, isLight ? 0.34 : 0.46), 1.2, [8, 6], t * 0.22);
    draw3DRing(hx, hy + 0.01, hz, radX * 0.78, radZ * 0.78, 32, rgba(rgb, isLight ? 0.36 : 0.56), 1.1, null, -t * 0.35);
  };
  drawBridgeDeck(hubX, hubY, hubZ, 1.52, 1.22, hubRGB);

  // Boot Shockwave Ring expanding from the Central Bridge during 0..1.1s
  if (holoCam.bootAge < 1.1 && !state.quiet && !reduced) {
    const bu = holoCam.bootAge / 1.1;
    draw3DRing(hubX, 0.04, hubZ, 0.6 + bu * 7.2, 0.5 + bu * 5.2, 64, rgba(hubRGB, (1 - bu) * 0.85), 2.4);
  }

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
        ctx.fillStyle = rgba([235, 255, 252], 0.95);
        ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(colorRGB, 0.42);
        ctx.beginPath(); ctx.arc(s.x, s.y, 5.0, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  // Helper: crisp unboxed whisper-clean holographic caption (NO heavy pill box clutter!)
  const drawHoloText = (wx, wy, wz, text, rgb, isHot = false, size = 9.5) => {
    const pt = project(wx, wy, wz);
    if (!pt) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${isHot ? '700' : '600'} ${size}px "Geist Mono", -apple-system, "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = isLight ? 'rgba(248, 245, 238, 0.92)' : 'rgba(2, 10, 5, 0.92)';
    ctx.strokeText(text, pt.x, pt.y);
    ctx.fillStyle = isLight ? rgba(rgb, isHot ? 1.0 : 0.86) : rgba(rgb, isHot ? 1.0 : 0.80);
    ctx.fillText(text, pt.x, pt.y);
    ctx.restore();
  };

  ctx.save();
  if (!isLight) ctx.globalCompositeOperation = 'lighter';

  // 1. MULTI-DEPARTMENT ARCHITECTURAL CONDUITS (Sovereign Wings + Central Lean Bridge + Outreach Engine!)
  const thHot = activeId === 'research' || activeId === 'verification';
  const rvHot = activeId === 'review' || activeId === 'verification';
  const pbHot = activeId === 'publication' || activeId === 'verification';
  const coHot = activeId === 'outreach' || activeId === 'verification';
  const bkHot = activeId === 'books' || activeId === 'verification';
  const rrHot = activeId === 'research' || activeId === 'review';
  const poHot = activeId === 'publication' || activeId === 'outreach';
  const stBkHot = activeId === 'studio' || activeId === 'books';
  const stOutHot = activeId === 'studio' || activeId === 'outreach' || activeId === 'publication';
  const bkRevHot = activeId === 'books' || activeId === 'review' || activeId === 'research';
  const loopClosedHot = activeId === 'research' || activeId === 'publication' || activeId === 'outreach';

  // A. LEFT LEAN BRIDGE SPAN: Sector 01 (数学攻坚 / 独立评审) ⇄ Central Lean Bridge (形式验证)
  drawConduit3D(
    [[-4.45, 0.06, -2.40], [-3.20, 0.14, -0.68], [-1.35, 0.22, -0.55]],
    isBlueprint ? [150, 215, 255] : [29, 255, 130],
    { lw: thHot ? 3.0 : 2.1, alpha: thHot ? 0.96 : 0.76, particles: 4, speed: 0.44, bidir: true }
  );
  drawConduit3D(
    [[-5.10, 0.06, 1.45], [-3.20, 0.14, -0.20], [-1.35, 0.22, -0.32]],
    isBlueprint ? [150, 215, 255] : [184, 148, 255],
    { lw: rvHot ? 2.5 : 1.5, alpha: rvHot ? 0.92 : 0.50, particles: rvHot ? 3 : 1, speed: 0.40 }
  );

  // B. RIGHT LEAN BRIDGE SPAN — THE OUTREACH ENGINE LOOP:
  //    trureturing (Lean) ▸ 论文与知识 ⇄ 对外合作 ⇄ 论文 ▸ 写回形式化 (Lean)!
  // Upper lane: Lean 桥梁 ▸ 论文与知识 (verified results -> short notes, DOIs, Mathesis papers)
  drawConduit3D(
    [[1.35, 0.22, -0.55], [3.20, 0.14, -0.68], [4.45, 0.06, -2.40]],
    isBlueprint ? [150, 215, 255] : [61, 242, 180],
    { lw: pbHot ? 3.0 : 2.1, alpha: pbHot ? 0.96 : 0.78, particles: 4, speed: 0.44, bidir: true }
  );
  // Lower lane: 学术交流 (对外合作) ▸ Lean 桥梁 (write-back formalization requests!)
  drawConduit3D(
    [[5.10, 0.06, 1.45], [3.20, 0.14, -0.20], [1.35, 0.22, -0.32]],
    isBlueprint ? [150, 215, 255] : [245, 161, 86],
    { lw: coHot ? 3.0 : 2.1, alpha: coHot ? 0.96 : 0.76, particles: 4, speed: 0.42 }
  );

  // C. SOUTH-LEFT LEAN BRIDGE SPAN: Sector 03 (独立理论书写部) ⇄ Central Lean Bridge
  drawConduit3D(
    [[-2.75, 0.06, 4.45], [-1.45, 0.14, 2.25], [-0.45, 0.22, 0.78]],
    isBlueprint ? [150, 215, 255] : [217, 150, 245],
    { lw: bkHot ? 2.8 : 2.0, alpha: bkHot ? 0.96 : 0.72, particles: 3, speed: 0.40, bidir: true }
  );

  // D. SOVEREIGN INTRA-WING LOOPS!
  // Sector 01 internal vertical loop: 数学攻坚 ⇄ 独立评审
  drawConduit3D(
    [[-5.40, 0.06, -2.05], [-5.75, 0.06, -0.45], [-5.95, 0.06, 1.15]],
    isBlueprint ? [150, 215, 255] : [184, 148, 255],
    { lw: rrHot ? 2.8 : 1.9, alpha: rrHot ? 0.96 : 0.68, particles: 2, speed: 0.44, bidir: true }
  );
  // Sector 02 (OUTREACH ENGINE) internal bidirectional loop: 短文·论文 ⇄ 对外合作 ⇄ 合作论文!
  drawConduit3D(
    [[5.40, 0.06, -2.05], [5.75, 0.06, -0.45], [5.95, 0.06, 1.15]],
    isBlueprint ? [150, 215, 255] : [245, 161, 86],
    { lw: poHot ? 3.0 : 2.2, alpha: poHot ? 0.98 : 0.78, particles: 3, speed: 0.44, bidir: true }
  );

  // E. INDEPENDENT BOOK & ENGINEERING PLATFORM ROUTES!
  // Sector 04 (工具与表达) ▸ Sector 03 (理论书写): 书稿模板 · mdbook 在线书库!
  drawConduit3D(
    [[1.65, 0.06, 5.35], [0.0, 0.06, 5.48], [-1.65, 0.06, 5.35]],
    isBlueprint ? [150, 215, 255] : [108, 214, 255],
    { lw: stBkHot ? 2.6 : 1.8, alpha: stBkHot ? 0.94 : 0.62, particles: 2, speed: 0.36 }
  );
  // Sector 04 (工具与表达) ▸ Sector 02 (Outreach Engine): 可视化 · 影像 · 公开展示!
  drawConduit3D(
    [[4.25, 0.06, 4.55], [5.35, 0.06, 3.65], [5.85, 0.06, 2.85]],
    isBlueprint ? [150, 215, 255] : [108, 214, 255],
    { lw: stOutHot ? 2.6 : 1.8, alpha: stOutHot ? 0.94 : 0.60, particles: 2, speed: 0.38 }
  );
  // Sector 03 (理论书写) ⇄ Sector 01 (独立评审 / 数学攻坚): 书稿论证复核与草稿同步!
  drawConduit3D(
    [[-4.25, 0.06, 4.55], [-5.35, 0.06, 3.65], [-5.85, 0.06, 2.85]],
    isBlueprint ? [150, 215, 255] : [217, 150, 245],
    { lw: bkRevHot ? 2.6 : 1.7, alpha: bkRevHot ? 0.92 : 0.56, particles: 2, speed: 0.36, bidir: true }
  );

  // F. NORTH AUTONOMOUS INSTITUTE RETURN ARC (Outreach Engine replies & open conjectures ↺ Theory Wing!)
  drawConduit3D(
    [[4.35, 0.12, -3.55], [2.40, 0.22, -4.35], [0.0, 0.24, -4.55], [-2.40, 0.22, -4.35], [-4.35, 0.12, -3.55]],
    isBlueprint ? [150, 215, 255] : [0, 240, 145],
    { lw: loopClosedHot ? 2.4 : 1.4, alpha: loopClosedHot ? 0.86 : 0.44, dashed: true, particles: 3, speed: 0.26, chevrons: true }
  );

  // 3. CINEMATIC STREAKING TACTICAL COMET FLARES synced to live Intel Stream!
  for (const fl of holoCam.flares) {
    const a = holoWorld[fl.fromId], b = holoWorld[fl.toId];
    if (!a || !b) continue;
    const u = fl.age;
    const tailU = Math.max(0, u - 0.18);
    const ptAt = frac => {
      const lx = a.x + (b.x - a.x) * frac;
      const lz = a.z + (b.z - a.z) * frac;
      const ly = (a.y || 0.08) + ((b.y || 0.16) - (a.y || 0.08)) * frac + Math.sin(frac * Math.PI) * 0.42;
      return project(lx, ly, lz);
    };
    const pHead = ptAt(u), pTail = ptAt(tailU);
    if (!pHead || !pTail) continue;
    const fade = Math.sin(u * Math.PI);
    const grad = ctx.createLinearGradient(pTail.x, pTail.y, pHead.x, pHead.y);
    grad.addColorStop(0, rgba(fl.rgb, 0));
    grad.addColorStop(1, rgba([240, 255, 255], fade * 0.95));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(pTail.x, pTail.y); ctx.lineTo(pHead.x, pHead.y); ctx.stroke();
    ctx.fillStyle = rgba([255, 255, 255], fade);
    ctx.beginPath(); ctx.arc(pHead.x, pHead.y, 3.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(fl.rgb, fade * 0.45);
    ctx.beginPath(); ctx.arc(pHead.x, pHead.y, 6.8, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();

  // ==========================================================================
  // 8. EIGHT BESPOKE 3D BIOMIMETIC HOLOGRAPHIC DEPARTMENT ENTITIES!
  // Each department has its own unmistakable living holographic silhouette!
  // ==========================================================================
  const drawBiomimetic = (id, cfg, hEntity, yBase, rgb, isSel, running, bootK, pulseBoost) => {
    const cx3 = cfg.x, cz3 = cfg.z;
    const glowA = (isSel ? 0.95 : running ? 0.82 : 0.56) + pulseBoost * 0.35;
    const fillA = isLight ? 0.24 : (isSel ? 0.26 : running ? 0.20 : 0.12) + pulseBoost * 0.14;

    ctx.save();
    if (!isLight) ctx.globalCompositeOperation = 'lighter';

    // Pedestal Hex Base Plate (for the 7 grounded closed-loop entities — NOT the independent floating Eye!)
    if (!cfg.eye) {
      draw3DRing(cx3, yBase + 0.02, cz3, cfg.r * 0.96 * bootK, cfg.r * 0.96 * bootK, 6, rgba(rgb, glowA * 0.72), isSel ? 1.9 : 1.2, null, Math.PI / 6);
      draw3DRing(cx3, yBase + 0.02, cz3, cfg.r * 0.56 * bootK, cfg.r * 0.56 * bootK, 6, rgba(rgb, glowA * 0.38), 0.9, null, Math.PI / 6);
      if (isSel) {
        draw3DRing(cx3, yBase + 0.04, cz3, cfg.r * 1.36, cfg.r * 1.36, 6, rgba(rgb, 0.92), 1.8, [10, 6], t * 0.5);
      }
    }

    if (id === 'direction') {
      // 01 INDEPENDENT SUPERVISORY LAYER: THE EYE OF AKASHA (阿卡西之眼 · 人类监管与指引)
      // Hovering independently above the closed-loop workflow, with a living tracking iris!
      const sy = yBase + Math.sin(t * 1.4) * 0.05;
      const ePt = project(cx3, sy, cz3);
      if (ePt) {
        const sc = Math.max(0.65, ePt.s / 62) * bootK;
        const wEye = 56 * sc;
        const hEye = 24 * sc;

        ctx.save();
        ctx.translate(ePt.x, ePt.y);

        // 1. Delicate outer Akasha sacred-geometry halo & rotating dashed constraint ring
        ctx.strokeStyle = rgba(rgb, isLight ? 0.42 : 0.38);
        ctx.lineWidth = 1.1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, wEye * 0.82, t * 0.25, t * 0.25 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Delicate celestial eyebrow crown & lower supervisory arc
        ctx.strokeStyle = rgba(rgb, isLight ? 0.58 : 0.52);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-wEye * 1.08, 0);
        ctx.quadraticCurveTo(0, -hEye * 1.72, wEye * 1.08, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-wEye * 0.88, hEye * 0.12);
        ctx.quadraticCurveTo(0, hEye * 1.55, wEye * 0.88, hEye * 0.12);
        ctx.stroke();

        // Subtle golden cardinal lashes / optical telemetry ticks around the eye
        for (let k = -2; k <= 2; k++) {
          const ang = -Math.PI / 2 + k * 0.32;
          const r1 = hEye * 1.38, r2 = hEye * (k === 0 ? 1.85 : 1.62);
          ctx.strokeStyle = rgba(rgb, isLight ? 0.65 : 0.68);
          ctx.lineWidth = k === 0 ? 1.6 : 1.0;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * r1 * 1.25, Math.sin(ang) * r1);
          ctx.lineTo(Math.cos(ang) * r2 * 1.25, Math.sin(ang) * r2);
          ctx.stroke();
        }

        // 2. Sculpted Almond (Vesica Piscis) Eye Aperture with luminous sclera glass fill
        ctx.beginPath();
        ctx.moveTo(-wEye, 0);
        ctx.quadraticCurveTo(0, -hEye * 1.35, wEye, 0);
        ctx.quadraticCurveTo(0,  hEye * 1.35, -wEye, 0);
        ctx.closePath();
        ctx.fillStyle = isLight ? 'rgba(255, 250, 236, 0.88)' : 'rgba(18, 14, 6, 0.78)';
        ctx.fill();
        ctx.strokeStyle = rgba([255, 224, 140], glowA);
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 3. Living Tracking Iris & Optical Aperture Blades (follows active department!)
        ctx.save();
        ctx.clip(); // Keep iris cleanly inside the almond eyelids!
        const gxOff = Math.max(-1, Math.min(1, holoCam.gazeX / 5.2)) * (wEye * 0.24);
        const gyOff = Math.max(-0.3, Math.min(1, (holoCam.gazeZ + 1.5) / 5.5)) * (hEye * 0.20);
        const rIris = hEye * 0.76;

        // Soft golden-cyan iris aura
        const ig = ctx.createRadialGradient(gxOff, gyOff, 2, gxOff, gyOff, rIris * 1.25);
        ig.addColorStop(0, rgba([255, 248, 215], 0.96));
        ig.addColorStop(0.36, rgba(rgb, 0.88));
        ig.addColorStop(0.75, rgba(isBlueprint ? [150, 215, 255] : [94, 237, 236], 0.55));
        ig.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(gxOff, gyOff, rIris * 1.25, 0, Math.PI * 2); ctx.fill();

        // Precision segmented iris ring + 12 rotating optical aperture spokes
        ctx.strokeStyle = rgba([255, 235, 165], 0.95);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(gxOff, gyOff, rIris, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rgba([94, 237, 236], 0.78);
        ctx.lineWidth = 1.0;
        ctx.beginPath(); ctx.arc(gxOff, gyOff, rIris * 0.58, 0, Math.PI * 2); ctx.stroke();
        for (let b = 0; b < 12; b++) {
          const ba = (b / 12) * Math.PI * 2 + t * 0.45;
          ctx.strokeStyle = rgba(rgb, 0.55);
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(gxOff + Math.cos(ba) * rIris * 0.56, gyOff + Math.sin(ba) * rIris * 0.56);
          ctx.lineTo(gxOff + Math.cos(ba) * rIris * 0.98, gyOff + Math.sin(ba) * rIris * 0.98);
          ctx.stroke();
        }

        // Sharp dark vertical diamond pupil + bright white specular glint (living gaze!)
        ctx.fillStyle = isLight ? '#2c1e06' : '#050810';
        ctx.beginPath();
        ctx.arc(gxOff, gyOff, rIris * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 252, 240, 0.98)';
        ctx.beginPath();
        ctx.arc(gxOff - rIris * 0.14, gyOff - rIris * 0.14, Math.max(1.8, rIris * 0.12), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Crisp inner corner diamond nodes at left & right eye tips
        for (const sx of [-wEye, wEye]) {
          ctx.fillStyle = rgba([255, 236, 175], 0.95);
          ctx.beginPath(); ctx.arc(sx, 0, 2.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    } else if (id === 'research') {
      // 02 MATH RESEARCH (数学攻坚): Emerald Firing Neural-Brain Cortex Polyhedron!
      const cy3 = yBase + hEntity * 0.56 * bootK;
      const rad = 0.68 * bootK;
      const spin = t * 0.30;
      const nodes = [];
      for (let i = 0; i < 12; i++) {
        const phi = Math.acos(1 - 2 * ((i + 0.5) / 12));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i + spin;
        const nx = cx3 + Math.sin(phi) * Math.cos(theta) * rad;
        const ny = cy3 + Math.cos(phi) * rad * 0.88;
        const nz = cz3 + Math.sin(phi) * Math.sin(theta) * rad;
        nodes.push({ p: project(nx, ny, nz), x: nx, y: ny, z: nz });
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y, nodes[i].z - nodes[j].z);
          if (dist < rad * 1.28) {
            const fire = Math.sin(t * 4.5 + i * 1.3 + j) > 0.62;
            draw3DSeg(nodes[i].p, nodes[j].p, rgba(fire ? [225, 255, 245] : rgb, fire ? 0.95 : glowA * 0.55), fire ? 1.8 : 1.0);
          }
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const pt = nodes[i].p;
        if (!pt) continue;
        ctx.fillStyle = rgba(i % 3 === 0 ? [225, 255, 245] : rgb, 0.94);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.8, 0, Math.PI * 2); ctx.fill();
      }
      draw3DSeg(project(cx3, 0.04, cz3), project(cx3, cy3 - rad * 0.82, cz3), rgba(rgb, 0.55), 2.2);
      const midPt = project(cx3, cy3, cz3);
      if (midPt) {
        const g = ctx.createRadialGradient(midPt.x, midPt.y, 1, midPt.x, midPt.y, Math.max(10, rad * midPt.s * 0.85));
        g.addColorStop(0, rgba([215, 255, 242], 0.62));
        g.addColorStop(0.55, rgba(rgb, 0.22));
        g.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(midPt.x, midPt.y, Math.max(10, rad * midPt.s * 0.85), 0, Math.PI * 2); ctx.fill();
      }
      draw3DRing(cx3, cy3, cz3, rad * 1.30, rad * 1.30, 32, rgba(rgb, 0.48), 1.2, [6, 5], -t * 0.42);
    } else if (id === 'review') {
      // 03 INDEPENDENT REVIEW (独立评审): Unmistakable 3D Holographic Justice Balance Scales (平衡天平)!
      const hPole = 1.05 * bootK;
      const tilt = Math.sin(t * 1.35) * 0.14;
      const arm = 0.66 * bootK;
      const baseP = project(cx3, 0.04, cz3);
      const fulcP = project(cx3, hPole, cz3);
      draw3DSeg(baseP, fulcP, rgba(rgb, glowA * 0.92), 2.6);
      // Fulcrum glowing amethyst eye crown
      const eyeTop = project(cx3, hPole + 0.28 * bootK, cz3);
      draw3DSeg(fulcP, eyeTop, rgba([230, 215, 255], glowA), 1.8);
      if (eyeTop) {
        ctx.fillStyle = rgba([235, 225, 255], 0.96);
        ctx.beginPath(); ctx.arc(eyeTop.x, eyeTop.y, 4.0, 0, Math.PI * 2); ctx.fill();
      }
      // Oscillating horizontal balance beam + twin suspended glowing scale pans!
      const lx = cx3 - Math.cos(tilt) * arm, ly = hPole + Math.sin(tilt) * arm;
      const rx = cx3 + Math.cos(tilt) * arm, ry = hPole - Math.sin(tilt) * arm;
      draw3DSeg(project(lx, ly, cz3), project(rx, ry, cz3), rgba([230, 215, 255], glowA), 2.3);
      for (const [px, py] of [[lx, ly], [rx, ry]]) {
        const panY = py - 0.42 * bootK;
        const rPan = 0.30 * bootK;
        const topArm = project(px, py, cz3);
        // 3 suspension chains down to glowing scale pan
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + t * 0.35;
          draw3DSeg(topArm, project(px + Math.cos(a) * rPan, panY, cz3 + Math.sin(a) * rPan), rgba(rgb, glowA * 0.65), 1.0);
        }
        // Solid translucent hexagonal scale pan dish
        const panPts = [];
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          panPts.push(project(px + Math.cos(a) * rPan, panY, cz3 + Math.sin(a) * rPan));
        }
        if (!panPts.some(p => !p)) {
          ctx.beginPath();
          panPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.fillStyle = rgba(rgb, fillA * 1.4);
          ctx.fill();
          ctx.strokeStyle = rgba([230, 215, 255], glowA);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    } else if (id === 'verification') {
      // CENTRAL HUB (形式验证): Hero Ice-Cyan DNA Double-Helix Proof Lighthouse + Diamond Crown!
      const hHelix = hEntity * bootK;
      const rH = 0.60 * bootK;
      const turns = 2.2;
      const steps = 28;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        draw3DSeg(project(cx3 + Math.cos(a) * (rH * 1.24), yBase + 0.04, cz3 + Math.sin(a) * (rH * 1.24)),
          project(cx3 + Math.cos(a) * (rH * 1.24), yBase + hHelix, cz3 + Math.sin(a) * (rH * 1.24)), rgba(rgb, 0.30), 1.0);
      }
      draw3DRing(cx3, yBase + hHelix, cz3, rH * 1.24, rH * 1.24, 4, rgba(rgb, 0.78), 1.6, null, Math.PI / 4);
      // Crystalline apex beacon above the DNA column
      const apexTop = project(cx3, yBase + hHelix + 0.36 * bootK, cz3);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        draw3DSeg(apexTop, project(cx3 + Math.cos(a) * (rH * 1.24), yBase + hHelix, cz3 + Math.sin(a) * (rH * 1.24)), rgba([215, 255, 255], glowA * 0.75), 1.3);
      }
      const sA = [], sB = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const a = u * Math.PI * 2 * turns + t * 0.95;
        const py = yBase + 0.08 + u * (hHelix - 0.12);
        sA.push(project(cx3 + Math.cos(a) * rH, py, cz3 + Math.sin(a) * rH));
        sB.push(project(cx3 + Math.cos(a + Math.PI) * rH, py, cz3 + Math.sin(a + Math.PI) * rH));
        if (i % 3 === 0) {
          draw3DSeg(sA[i], sB[i], rgba(running ? [190, 255, 252] : rgb, running ? 0.78 : 0.40), 1.25);
        }
      }
      for (const strand of [sA, sB]) {
        ctx.beginPath();
        strand.forEach((pt, idx) => { if (pt) idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y); });
        ctx.strokeStyle = rgba(rgb, glowA);
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      if (running && !state.quiet && !reduced) {
        const su = (t * 0.58) % 1;
        draw3DRing(cx3, yBase + 0.08 + su * hHelix, cz3, rH * 1.38, rH * 1.38, 12, rgba([245, 255, 255], 0.95), 2.2);
      }
    } else if (id === 'books') {
      // 05 THEORY BOOKS (理论书写): Unmistakable 3D Open Hardcover Codex with Turning Luminous Page!
      const py = 0.34 * bootK + Math.sin(t * 1.5) * 0.04;
      const wLeaf = 0.78 * bootK, dLeaf = 0.54 * bootK, lift = 0.22 * bootK;
      draw3DSeg(project(cx3, 0.04, cz3), project(cx3, py, cz3), rgba(rgb, 0.52), 2.0);
      // Thick book cover base + 3 crisp stacked open-wing pages
      for (let lv = 0; lv < 3; lv++) {
        const yL = py + lv * 0.11 * bootK;
        const arch = (lv === 2 ? 0.28 : 0.14 + lv * 0.06) * bootK;
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
          ctx.fillStyle = rgba(rgb, fillA * (lv === 2 ? 1.35 : 0.75));
          ctx.fill();
          ctx.strokeStyle = rgba(lv === 2 ? [238, 215, 255] : rgb, glowA * (lv === 2 ? 0.96 : 0.55));
          ctx.lineWidth = lv === 2 ? 1.8 : 1.1;
          ctx.stroke();
        }
      }
      // Animated translucent page turning smoothly across the book spine!
      const turnA = ((t * 0.55) % 1) * Math.PI;
      const yTop = py + 0.26 * bootK;
      const tX = cx3 + Math.cos(turnA) * wLeaf * 0.88;
      const tY = yTop + Math.sin(turnA) * wLeaf * 0.78;
      const turnPoly = [
        project(cx3, yTop, cz3 + dLeaf * 0.92),
        project(tX, tY, cz3 + dLeaf * 0.92),
        project(tX, tY, cz3 - dLeaf * 0.92),
        project(cx3, yTop, cz3 - dLeaf * 0.92)
      ];
      if (!turnPoly.some(p => !p)) {
        ctx.beginPath();
        turnPoly.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
        ctx.fillStyle = rgba([240, 222, 255], Math.sin(turnA) * 0.28);
        ctx.fill();
        ctx.strokeStyle = rgba([250, 238, 255], Math.sin(turnA) * 0.92);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else if (id === 'publication') {
      // 06 PAPERS & KNOWLEDGE (论文与知识): Mint Crystal Knowledge Constellation Tree + Paper Scrolls!
      const hTree = hEntity * bootK;
      const basePt = project(cx3, 0.04, cz3);
      const forkPt = project(cx3, hTree * 0.44, cz3);
      draw3DSeg(basePt, forkPt, rgba(rgb, glowA * 0.95), 2.6);
      const branches = [
        [0, 1.02, 0],
        [-0.64, 0.84, 0.24], [0.64, 0.84, 0.24],
        [-0.44, 0.78, -0.50], [0.44, 0.78, -0.50],
        [0, 0.72, 0.62]
      ];
      const tips = [];
      for (let i = 0; i < branches.length; i++) {
        const [bx, by, bz] = branches[i];
        const rot = t * 0.18;
        const rx = bx * Math.cos(rot) - bz * Math.sin(rot);
        const rz = bx * Math.sin(rot) + bz * Math.cos(rot);
        const tip = project(cx3 + rx * bootK, by * hTree, cz3 + rz * bootK);
        tips.push(tip);
        draw3DSeg(forkPt, tip, rgba(rgb, glowA * 0.76), 1.5);
      }
      for (let i = 1; i < tips.length; i++) {
        draw3DSeg(tips[0], tips[i], rgba(rgb, 0.34), 0.9);
        draw3DSeg(tips[i], tips[(i % (tips.length - 1)) + 1], rgba(rgb, 0.26), 0.8);
      }
      for (let i = 0; i < tips.length; i++) {
        if (!tips[i]) continue;
        ctx.fillStyle = rgba(i === 0 ? [225, 255, 245] : rgb, 0.96);
        ctx.beginPath(); ctx.arc(tips[i].x, tips[i].y, i === 0 ? 4.6 : 3.2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (id === 'outreach') {
      // 07 ACADEMIC OUTREACH (学术交流): Coral Deep-Space Parabolic Radio Dish + Expanding Signal Waves!
      const hDish = hEntity * 0.58 * bootK;
      draw3DSeg(project(cx3, 0.04, cz3), project(cx3, hDish, cz3), rgba(rgb, glowA * 0.88), 2.5);
      draw3DRing(cx3, hDish + 0.10, cz3, 0.36 * bootK, 0.36 * bootK, 16, rgba(rgb, glowA * 0.75), 1.4);
      draw3DRing(cx3, hDish + 0.30, cz3, 0.72 * bootK, 0.72 * bootK, 20, rgba([255, 212, 175], glowA), 2.1);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + t * 0.25;
        draw3DSeg(project(cx3, hDish, cz3), project(cx3 + Math.cos(a) * 0.72 * bootK, hDish + 0.30, cz3 + Math.sin(a) * 0.72 * bootK), rgba(rgb, 0.56), 1.0);
      }
      const tip = project(cx3, hDish + 0.56 * bootK, cz3);
      draw3DSeg(project(cx3, hDish, cz3), tip, rgba([255, 232, 205], 0.95), 1.8);
      if (tip) { ctx.fillStyle = rgba([255, 235, 210], 0.98); ctx.beginPath(); ctx.arc(tip.x, tip.y, 3.6, 0, Math.PI * 2); ctx.fill(); }
      for (let wv = 0; wv < 3; wv++) {
        const u = (t * 0.52 + wv / 3) % 1;
        const rad = (0.28 + u * 0.90) * bootK;
        draw3DRing(cx3, hDish + 0.48 + u * 0.82, cz3, rad, rad, 24, rgba(rgb, (1 - u) * 0.88), 1.6);
      }
    } else {
      // 08 STUDIO & TOOLING (工具与表达): Titanium Interlocking 3D Foundry Gears + Wireframe Holo Cube!
      const cy3 = 0.52 * bootK;
      draw3DSeg(project(cx3, 0.04, cz3), project(cx3, cy3, cz3), rgba(rgb, 0.58), 2.2);
      const drawGear = (gx, gy, gz, rIn, rOut, dir, vertical = false) => {
        ctx.beginPath();
        const teeth = 8, pts = teeth * 4;
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * Math.PI * 2 + t * 0.60 * dir;
          const rG = (i % 4 < 2 ? rOut : rIn) * bootK;
          const pt = vertical
            ? project(gx + Math.cos(a) * rG, gy + Math.sin(a) * rG, gz)
            : project(gx + Math.cos(a) * rG, gy, gz + Math.sin(a) * rG);
          if (!pt) continue;
          if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        }
        ctx.fillStyle = rgba(rgb, fillA * 1.25);
        ctx.fill();
        ctx.strokeStyle = rgba([210, 235, 250], glowA * 0.95);
        ctx.lineWidth = 1.6;
        ctx.stroke();
      };
      drawGear(cx3 - 0.16 * bootK, cy3, cz3, 0.44, 0.60, 1, false);
      drawGear(cx3 + 0.34 * bootK, cy3 + 0.38 * bootK, cz3, 0.28, 0.42, -1.4, true);
      // Floating wireframe holographic projector cube hovering above the gears
      const cY = cy3 + 0.72 * bootK, cs = 0.22 * bootK, rot = t * 0.7;
      const cubeV = [-1, 1].flatMap(sy => [0, 1, 2, 3].map(k => {
        const a = rot + k * Math.PI / 2 + Math.PI / 4;
        return project(cx3 - 0.16 * bootK + Math.cos(a) * cs * 1.4, cY + sy * cs, cz3 + Math.sin(a) * cs * 1.4);
      }));
      for (const [u, v] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]) {
        draw3DSeg(cubeV[u], cubeV[v], rgba([180, 240, 255], glowA * 0.85), 1.15);
      }
    }

    // Synchronized Live Intel Pulse Shockwave Ring!
    for (const p of holoCam.pulses) {
      if (p.id !== id) continue;
      const rad = cfg.r * (0.95 + p.age * 1.45);
      draw3DRing(cx3, yBase + 0.04, cz3, rad, rad, 24, rgba(rgb, (1 - p.age) * 0.92 * p.strength), 2.2);
    }

    ctx.restore();
  };

  const list = departments();
  const sorted = list
    .map(d => {
      const cfg = holoWorld[d.id] || { x: 0, y: 0, z: 0, r: 0.7, baseH: 1.2, order: 0, hex: [94, 237, 236] };
      const center = project(cfg.x, cfg.y + towerHeight(d.id) * 0.5, cfg.z);
      return { d, cfg, depth: center ? center.z : 999 };
    })
    .sort((a, b) => b.depth - a.depth);

  holoCam.projectedTowers.clear();

  for (const { d, cfg } of sorted) {
    const rawBoot = Math.max(0, Math.min(1, (holoCam.bootAge - cfg.order * 0.065) / 0.42));
    const bootK = 1 - Math.pow(1 - rawBoot, 3);
    if (bootK <= 0.02) continue;

    const hEntity = towerHeight(d.id);
    const yBase = cfg.y || 0;
    const running = Boolean(countRunning(d));
    const isSel = d.id === activeId;
    const rgb = isBlueprint ? [150, 215, 255] : cfg.hex;
    const pulseObj = holoCam.pulses.find(p => p.id === d.id);
    const pulseBoost = pulseObj ? (1 - pulseObj.age) : 0;

    // Ground glow aura (for grounded workflow entities; Eye floats cleanly above in deep space!)
    if (!cfg.eye) {
      const gPt = project(cfg.x, yBase + 0.02, cfg.z);
      if (gPt) {
        const gRad = cfg.r * gPt.s * (isSel ? 1.9 : running ? 1.45 : 1.1) * bootK;
        const glow = ctx.createRadialGradient(gPt.x, gPt.y, 2, gPt.x, gPt.y, Math.max(8, gRad));
        glow.addColorStop(0, rgba(rgb, isLight ? 0.18 : (isSel ? 0.38 : running ? 0.24 : 0.11) + pulseBoost * 0.18));
        glow.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.ellipse(gPt.x, gPt.y, gRad, gRad * 0.52, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (isSel && !isLight && !cfg.eye) {
      const topBeam = project(cfg.x, yBase + hEntity + 1.05, cfg.z);
      const botBeam = project(cfg.x, yBase, cfg.z);
      if (topBeam && botBeam) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const bgGrad = ctx.createLinearGradient(botBeam.x, botBeam.y, topBeam.x, topBeam.y);
        bgGrad.addColorStop(0, rgba(rgb, 0.30));
        bgGrad.addColorStop(0.65, rgba(rgb, 0.07));
        bgGrad.addColorStop(1, rgba(rgb, 0));
        ctx.strokeStyle = bgGrad;
        ctx.lineWidth = Math.max(12, cfg.r * botBeam.s * 0.52);
        ctx.beginPath(); ctx.moveTo(botBeam.x, botBeam.y); ctx.lineTo(topBeam.x, topBeam.y); ctx.stroke();
        ctx.restore();
      }
    }

    drawBiomimetic(d.id, cfg, hEntity, yBase, rgb, isSel, running, bootK, pulseBoost);

    // Anchor sleek mission card cleanly above Akasha Eye or below each closed-loop sculpture!
    const anchorPt = cfg.apex
      ? project(cfg.x, yBase + 0.72, cfg.z)
      : project(cfg.x, yBase - 0.06, cfg.z + cfg.r * (d.id === 'verification' ? 0.94 : 0.74));
    const bodyCenter = project(cfg.x, yBase + (cfg.eye ? 0.0 : hEntity * 0.5), cfg.z);
    if (anchorPt && bodyCenter) {
      holoCam.projectedTowers.set(d.id, { x: bodyCenter.x, y: bodyCenter.y, r: Math.max(46, cfg.r * bodyCenter.s * 1.45) });
      const cell = state.cells.get(d.id);
      if (cell) {
        const depthScale = Math.max(0.84, Math.min(1.04, 14.5 / anchorPt.z));
        cell.button.style.left = `${anchorPt.x.toFixed(1)}px`;
        cell.button.style.top = `${anchorPt.y.toFixed(1)}px`;
        cell.button.style.zIndex = String(isSel ? 40 : Math.round(30 - anchorPt.z));
        cell.button.style.setProperty('--depth-scale', depthScale.toFixed(3));
        cell.button.classList.toggle('is-apex-label', Boolean(cfg.apex));
        cell.button.classList.add('is-projected');
      }
    }
  }

  // Whisper-clean unboxed architectural sector designations & bridge labels
  drawHoloText(-6.25, 0.06, -4.65, 'SEC.01 // 理论与复核部', isLight ? [4, 120, 87] : [80, 255, 165], sec1Hot, 9);
  drawHoloText( 5.85, 0.06, -4.65, 'OUTREACH // 论文与合作', isLight ? [180, 83, 9] : [255, 210, 155], sec2Hot, 9);
  drawHoloText( 0.0,  0.26, -4.75, '↺ 24/7 AI 自主闭环工作流', isLight ? [15, 118, 110] : [135, 255, 198], loopClosedHot, 9);
  drawHoloText(-2.58, 0.26, -1.16, '理论 ⇄ Lean 桥梁', isLight ? [4, 120, 87] : [125, 255, 210], thHot || rvHot, 9);
  drawHoloText( 2.65, 0.26, -1.16, '论文·合作 ⇄ 写回形式化', isLight ? [180, 83, 9] : [255, 214, 165], pbHot || coHot, 9);
  drawHoloText(-1.92, 0.14,  2.85, '写书 ⇄ 验证请求', isLight ? [109, 40, 217] : [232, 198, 255], bkHot, 9);
  drawHoloText( 0.0,  0.08,  5.68, '出版模板 ◂ 工程底座', isLight ? [3, 105, 161] : [155, 232, 255], stBkHot, 9);
}

function startHoloLoop() {
  if (holoCam.raf || /jsdom/i.test(navigator.userAgent || '')) return;
  loadTruthNebula();
  triggerScanSweep();
  let prev = performance.now();
  const tick = now => {
    const dt = (now - prev) / 1000;
    prev = now;
    if (!document.hidden) {
      drawHolo3DFrame(dt);
      stepSciFiLog(dt);
    }
    holoCam.raf = requestAnimationFrame(tick);
  };
  holoCam.raf = requestAnimationFrame(tick);
}

// Disciplined 3D Camera Drag (Clamped within tasteful command arc — never tangled!) & Direct 3D Entity Picking
const boardEl = $('#hive-board');
if (boardEl && !/jsdom/i.test(navigator.userAgent || '')) {
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

  boardEl.addEventListener('pointerdown', e => {
    if (state.focused || e.target.closest('button, a, .department-lens, .scifi-log-wall, .department-panel')) return;
    holoCam.dragging = true;
    holoCam.dragMoved = false;
    holoCam.lastX = e.clientX;
    holoCam.lastY = e.clientY;
    boardEl.classList.add('is-dragging');
  });

  window.addEventListener('pointermove', e => {
    if (holoCam.dragging) {
      const dx = e.clientX - holoCam.lastX;
      const dy = e.clientY - holoCam.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) holoCam.dragMoved = true;
      holoCam.lastX = e.clientX;
      holoCam.lastY = e.clientY;
      // Clamped disciplined viewing arc: keeps layout readable at all times!
      holoCam.targetYaw = Math.max(-0.58, Math.min(0.58, holoCam.targetYaw + dx * 0.0055));
      holoCam.targetPitch = Math.max(0.28, Math.min(0.86, holoCam.targetPitch + dy * 0.0045));
      return;
    }
    if (!state.focused && e.target === $('#holo-3d')) {
      const hit = hitTowerAt(e.clientX, e.clientY);
      boardEl.style.cursor = hit ? 'pointer' : 'grab';
      if (hit) previewDepartment(hit);
    }
  }, { passive: true });

  window.addEventListener('pointerup', e => {
    if (!holoCam.dragging) return;
    const moved = holoCam.dragMoved;
    holoCam.dragging = false;
    boardEl.classList.remove('is-dragging');
    if (!moved && !state.focused && e.target === $('#holo-3d')) {
      const hit = hitTowerAt(e.clientX, e.clientY);
      if (hit) selectDepartment(hit, true, true);
    }
  });

  window.addEventListener('pointercancel', () => {
    if (!holoCam.dragging) return;
    holoCam.dragging = false;
    boardEl.classList.remove('is-dragging');
  });

  boardEl.addEventListener('wheel', e => {
    if (state.focused || e.target.closest('.department-panel, .telemetry-dock, .scifi-log-wall')) return;
    e.preventDefault();
    holoCam.targetDist = Math.max(11.2, Math.min(18.5, holoCam.targetDist + e.deltaY * 0.006));
  }, { passive: false });
}

function applyLook(look) {
  const docEl = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const btn = $('#theme-toggle');
  if (look === 'light') {
    docEl.dataset.theme = 'light';
    delete docEl.dataset.look;
    if (meta) meta.setAttribute('content', '#F2EEE6');
    if (btn) btn.textContent = '☾';
  } else if (look === 'blueprint') {
    delete docEl.dataset.theme;
    docEl.dataset.look = 'blueprint';
    if (meta) meta.setAttribute('content', '#081426');
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

window.addEventListener('resize', () => renderHoloSky(), { passive: true });

// Slide-Up Translucent FUI Telemetry Drawer (collapsed at rest so 3D space fills 100% of screen!)
const dockTitles = {
  'live-ops': 'TELEMETRY // LEAN CI 检验灯阵与跨部门接力',
  'questions': 'RESEARCH // 当前在研课题索引',
  'publications': 'ARCHIVE // 双语书稿与公开论文',
  'ecosystem': 'INFRA // 公开研究仓库与 Rust 开源模板'
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
    if (titleEl && dockTitles[target]) titleEl.textContent = dockTitles[target];
    for (const sibling of document.querySelectorAll('[data-dock-tab]')) {
      sibling.setAttribute('aria-selected', String(sibling === tab));
    }
    for (const panel of document.querySelectorAll('[data-dock-panel]')) {
      panel.classList.toggle('is-active', panel.dataset.dockPanel === target);
    }
  });
}

$('#dock-close-btn')?.addEventListener('click', closeDockDrawer);

// Event bindings
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
  fullscreenButton.setAttribute('aria-label', on ? '退出全屏' : '进入全屏');
  fullscreenButton.title = on ? '退出全屏（Esc）' : '全屏显示';
  fullscreenButton.querySelector('span').textContent = on ? '退出全屏' : '全屏';
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
  if (event.key === 'Escape') {
    if ($('#telemetry-dock')?.classList.contains('is-open')) closeDockDrawer();
    if (state.focused) closeDepartmentLens();
  }
});

if (reduced) {
  document.body.classList.add('quiet');
  $('#motion-toggle').hidden = true;
}

try {
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === 'light' || savedTheme === 'blueprint') applyLook(savedTheme);
  else renderHoloSky();
} catch {
  renderHoloSky();
  triggerScanSweep();
}
startHoloLoop();

try {
  const saved = JSON.parse(localStorage.getItem(cacheKey));
  if (validSnapshot(saved)) {
    state.snapshot = saved;
    renderPapers();
    renderRepos();
  }
} catch {}

updateControls();
refreshSnapshot();
refreshLive();
setInterval(() => { if (!document.hidden) refreshSnapshot(); }, 60000);
setInterval(() => { if (!document.hidden) refreshLive(); }, 15000);
setInterval(() => {
  if (!document.hidden) {
    renderHealth();
    if (isStale()) renderLive();
  }
}, 30000);
