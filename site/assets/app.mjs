const $ = selector => document.querySelector(selector);
const ns = 'http://www.w3.org/2000/svg';
const liveURL = 'https://trureturing-live-reader.vercel.app/api/live';
const cacheKey = 'trureturing-live.hive.content.v7';
const themeKey = 'trureturing-live.theme.v2';
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

const hubMeta = {
  direction: { tag: 'HUMAN IN THE LOOP', title: '方向策源' },
  research: { tag: '24/7 AI LOOP', title: '课题攻坚台' },
  review: { tag: 'CROSS CHECK', title: '独立复核台' },
  verification: { tag: '24/7 LEAN CI', title: '形式检验核' },
  books: { tag: 'LIVING BOOKS', title: '双语书稿台' },
  publication: { tag: 'KNOWLEDGE ATLAS', title: '知识发布台' },
  outreach: { tag: 'OPEN DIALOGUE', title: '学术交流台' },
  studio: { tag: 'INFRA & VISUALS', title: '工具工坊' }
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
  direction: ['人的方向', '提出问题与研究方向', '交由 24/7 AI 攻坚'],
  research: ['数学攻坚', '问题与公开认领', '可检验的论证与反例'],
  review: ['独立评审', '待复核的论证', '边界审查与修订意见'],
  verification: ['形式验证', '研究提交与 Lean CI', '通过或回流继续迭代'],
  books: ['理论书写', '已检验的数学成果', '可阅读的双语章节'],
  publication: ['论文与知识', '阶段性研究成果', '公开论文与知识地图'],
  outreach: ['学术交流', '研究说明与传播材料', '社区反馈与新问题'],
  studio: ['工具与表达', '研究基础设施需求', '可视化、模板与观测']
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

const technical = /\b(?:audit|reg audit|registration audit|cache|runner|workflow|roster|stratalint|lint|heartbeat|registration|worktree|bootstrap|toolchain|CI|template)\b|four-slot|compilation|protected judge|trusted judge|judge reuse|current dev|tools preview|Adopt tested tools|编译判官|禁止流水账|流水线|缓存|工具接入|审计|登记|加载器|合并规则/i;

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

function renderTicker() {
  const recent = view()?.recent || [];
  const item = recent.find(a => active(a)) || recent[0];
  if (!item) return;
  const d = department(item.department);
  const actor = item.actor?.label || execution[d?.execution] || '研究院';
  const title = actorTaskTitle(item, d || { id: item.department });
  state.tickerTarget = item;
  $('#ticker-text').textContent = `${d?.label || '研究院'} · ${actor} · ${phase(item)}：${title}`;
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
    clockEl.textContent = isStale()
      ? 'SIGNAL STANDBY · AWAITING PULSE'
      : running
        ? `24·7 LOOP // ${running} CI ACTIVE · ${handoffsCount} RELAYS`
        : `24·7 LOOP // ${list.length} SECTORS ONLINE`;
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
  const button = element('button', '', 'hive-cell');
  button.type = 'button';
  button.dataset.department = d.id;
  button.dataset.execution = d.execution;
  button.dataset.focusKey = `department:${d.id}`;
  button.style.setProperty('--x', `${(pos[0] / 10).toFixed(2)}%`);
  button.style.setProperty('--y', `${(pos[1] / 7.4).toFixed(2)}%`);

  const content = element('span', '', 'cell-content');
  const topRow = element('span', '', 'cell-top-row');
  const liveDot = element('i', '', 'cell-live-dot');
  const code = element('span', deptCodes[d.id] || String(index + 1).padStart(2, '0'));
  topRow.append(liveDot, code);

  const head = element('span', '', 'cell-head');
  const glyph = element('span', '', 'cell-icon');
  glyph.append(icon(d.id));
  const title = element('strong', d.label, 'cell-title');
  head.append(glyph, title);

  const seats = element('span', '', 'cell-seats');
  const status = element('span', '', 'cell-status');
  const mode = element('span', d.execution === 'human' ? 'Human in the Loop' : execution[d.execution], 'cell-mode');

  const landmark = element('span', '', 'cell-landmark');
  landmark.setAttribute('aria-hidden', 'true');
  const landmarkCap = element('span', '', 'cell-landmark-cap');
  const landmarkPin = element('i', '', 'cell-landmark-pin');
  landmark.append(landmarkCap, landmarkPin);

  content.append(topRow, head, seats, status, mode);
  button.append(landmark, hexShellSVG(), content);

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
    const pip = element('span', '人', 'seat-pip');
    pip.title = '人的方向与问题提出';
    container.append(pip);
    return;
  }
  const roster = departmentRoster(d);
  if (!roster.length) return;
  for (const actor of roster.slice(0, 4)) {
    const busy = !isStale() && actorTasks(d, actor).some(active);
    const pip = element('span', seatMonogram(actor), 'seat-pip' + (busy ? ' is-active' : ''));
    pip.title = actorLabel(actor);
    container.append(pip);
  }
  if (roster.length > 4) {
    container.append(element('span', `+${roster.length - 4}`, 'seat-pip-more'));
  }
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
    cell.title.textContent = d.label;
    cell.status.textContent = departmentState(d);
    renderCellSeats(d, cell.seats);
    cell.button.setAttribute('aria-pressed', String(d.id === state.selected));
    cell.button.setAttribute('aria-label', `${d.label}。${d.responsibility}。${departmentState(d)}`);
    const running = countRunning(d);
    cell.button.classList.toggle('is-running', Boolean(running));
    if (cell.landmark && cell.landmarkCap) {
      if (running) {
        cell.landmarkCap.textContent = `${running} RUN`;
        cell.landmark.classList.add('is-visible', 'is-live');
        cell.landmark.classList.remove('is-human');
      } else if (d.execution === 'human') {
        cell.landmarkCap.textContent = 'HUMAN LOOP';
        cell.landmark.classList.add('is-visible', 'is-human');
        cell.landmark.classList.remove('is-live');
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
  if (d.id === 'research' || d.id === 'books') {
    const work = items
      .filter(a => (a.kind === 'session' && active(a)) || (['task', 'contribution'].includes(a.kind) && !technical.test(a.label)))
      .sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at))
      .slice(0, 3);
    const building = d.id === 'books' && items.find(a => a.kind === 'automation' && active(a));
    return building ? [building, ...work.slice(0, 2)] : work;
  }
  return items.sort((a, b) => Number(active(b)) - Number(active(a)) || timestamp(b.at) - timestamp(a.at)).slice(0, 3);
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
    const title = ['automation', 'session'].includes(a.kind)
      ? sourceLabel(a)
      : ['studio', 'verification', 'publication', 'outreach'].includes(d.id)
        ? sourceLabel(a)
        : copyFor(a).title;
    card.append(meta, element('strong', title));
    const bottom = element('div', '', 'work-bottom');
    bottom.append(
      element('span', a.actor?.kind === 'agent' && a.actor.tool ? a.actor.tool : a.actor?.label || execution[d.execution]),
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

function updateLensSpotlight(d, actor) {
  const spot = $('#lens-spotlight');
  if (!spot) return;
  spot.replaceChildren();
  if (!actor) {
    spot.append(element('span', '悬浮或点击任意席位高亮其研究连线 · 点击右侧线索跟随全院接力 · 点击左右门户直达上下游部门'));
    return;
  }
  const tasks = actorTasks(d, actor);
  spot.append(element('strong', `${actorLabel(actor)}：`));
  if (!tasks.length) {
    spot.append(element('span', '当前待命中，等待新的公开研究记录。'));
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
    metric(publicSeatCount(d), '公开席位'),
    metric(isStale() ? '—' : stats.running, '正在执行', !isStale() && stats.running ? 'is-running' : ''),
    metric(stats.label, '可见待接力', stats.waiting ? 'is-queued' : ''),
    metric(d.observed_activities || stats.recent, '近期记录')
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
      element('span', runCount ? `${runCount} 项运行中` : d.execution === 'human' ? '方向起点' : `${publicSeatCount(d)} 席位协同`, 'map-hub-stat')
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
      svgText(310, 24, 'SEATS // 公开席位', 'zoom-zone-label'),
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

  // 7. Render Spatial Work-Seat Nodes (#lens-agents)
  const buildSeatCard = (actor, pos) => {
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
    const identity = element('div', '', 'lens-agent-identity');
    identity.append(person(actor));
    head.append(identity, element('span', actor.kind === 'agent' ? '明确标注的 agent' : '公开账号', 'agent-kind'));

    const metaRow = element('div', '', 'lens-agent-meta-row');
    const stEl = element('span', '', 'lens-agent-status' + (running.length ? ' is-running' : ''));
    stEl.append(
      element('i'),
      document.createTextNode(running.length ? `${running.length} 项执行中` : tasks.length ? `${relative(tasks[0].at)}活跃` : '已登记')
    );
    metaRow.append(stEl);
    card.append(head, metaRow);

    const lane = element('div', '', 'lens-task-lane');
    if (tasks.length) {
      // Prioritize real mathematical topics over maintenance/audit records on seat cards
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
      lane.append(element('p', '待命中 · 等待新任务', 'lens-empty-seat'));
    }
    card.append(lane);

    card.addEventListener('pointerenter', () => {
      highlightZoomSeat(actor.id);
      updateLensSpotlight(d, actor);
    });
    card.addEventListener('pointerleave', () => {
      highlightZoomSeat(state.hoveredSeat);
    });
    card.addEventListener('click', () => {
      state.hoveredSeat = state.hoveredSeat === actor.id ? null : actor.id;
      highlightZoomSeat(state.hoveredSeat);
      updateLensSpotlight(d, state.hoveredSeat ? actor : null);
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
        : '当前采样窗口内暂无活跃席位，新的公开推进记录出现后会实时点亮这里。',
      'lens-empty-map'
    ));
  } else {
    primarySeats.forEach((actor, idx) => {
      seatContainer.append(buildSeatCard(actor, seatSlots[idx]));
    });
    if (extraContainer && extraSeats.length) {
      for (const actor of extraSeats) extraContainer.append(buildSeatCard(actor, null));
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
        element('span', t.actors.length ? `${t.actors.length} 席位参与` : '跨部门线索'),
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
    state.focused = id;
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
      element('strong', headline),
      element('span', a.actor?.kind === 'agent' && a.actor.tool ? `${a.actor.tool} · ${a.actor.label}` : a.actor?.label || execution[d?.execution] || '共同推进', 'activity-byline')
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
    who.append(dot, element('span', entry.actor, 'feed-actor'));
    if (entry.mentions.length) {
      who.append(element('span', `→ ${entry.mentions.slice(0, 2).map(n => '@' + n).join(' ')}`, 'feed-arrow-to'));
    }
    who.append(element('span', d?.label || entry.deptId, 'feed-dept-tag'));
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

function renderHoloSky() {
  const svg = $('#holo-sky');
  if (!svg) return;
  svg.replaceChildren();
  const w = 1200;
  const h = 760;
  const isLight = document.documentElement.dataset.theme === 'light';
  const isBlueprint = document.documentElement.dataset.look === 'blueprint';

  const make = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  };

  // 1. Chrono-Metaverse deterministic orbital starfield (sky.ts)
  if (!isLight) {
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const stars = make('g', { class: 'holo-stars' });
    const count = isBlueprint ? 55 : 120;
    for (let i = 0; i < count; i++) {
      const sx = (rand() * w).toFixed(1);
      const sy = (rand() * h * 0.62).toFixed(1);
      const r = rand() > 0.84 ? '1.3' : '0.75';
      const op = (0.16 + rand() * 0.52).toFixed(2);
      const fill = isBlueprint
        ? '#96d7ff'
        : i % 5 === 0 ? '#5eedec' : '#d7eeff';
      stars.append(make('circle', { cx: sx, cy: sy, r, fill, opacity: op }));
    }
    svg.append(stars);
  }

  // 2. Chrono-Metaverse 3D Perspective Architectural Floor Grid receding into horizon
  const vpX = w * 0.5;
  const vpY = -h * 0.24;
  const startY = h * 0.08;
  const gridStroke = isLight
    ? 'rgba(120, 113, 102, 0.16)'
    : isBlueprint
      ? 'rgba(150, 215, 255, 0.16)'
      : 'rgba(94, 237, 236, 0.09)';

  const grid = make('g', { stroke: gridStroke, 'stroke-width': '1', fill: 'none' });
  const cols = 16;
  for (let i = -cols; i <= cols; i++) {
    const bottomX = vpX + (i / (cols * 0.45)) * w;
    const t = (startY - vpY) / (h - vpY);
    const topX = vpX + (bottomX - vpX) * t;
    grid.append(make('line', { x1: topX.toFixed(1), y1: startY.toFixed(1), x2: bottomX.toFixed(1), y2: h }));
  }
  const rows = 14;
  for (let r = 0; r <= rows; r++) {
    const p = Math.pow(r / rows, 1.55);
    const y = (startY + p * (h - startY)).toFixed(1);
    grid.append(make('line', { x1: 0, y1: y, x2: w, y2: y, opacity: (0.28 + p * 0.72).toFixed(2) }));
  }
  svg.append(grid);
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
    if (meta) meta.setAttribute('content', '#0C192C');
    if (btn) btn.textContent = '☀';
  } else {
    delete docEl.dataset.theme;
    delete docEl.dataset.look;
    if (meta) meta.setAttribute('content', '#02060E');
    if (btn) btn.textContent = '☀';
  }
  const activeLook = docEl.dataset.theme === 'light' ? 'light' : (docEl.dataset.look || 'holo');
  for (const b of document.querySelectorAll('[data-look]')) {
    b.setAttribute('aria-pressed', String(b.dataset.look === activeLook));
  }
  renderHoloSky();
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

// Dock tab switching
for (const tab of document.querySelectorAll('[data-dock-tab]')) {
  tab.addEventListener('click', () => {
    const target = tab.dataset.dockTab;
    for (const sibling of document.querySelectorAll('[data-dock-tab]')) {
      sibling.setAttribute('aria-selected', String(sibling === tab));
    }
    for (const panel of document.querySelectorAll('[data-dock-panel]')) {
      panel.classList.toggle('is-active', panel.dataset.dockPanel === target);
    }
  });
}

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

$('#expand-room').addEventListener('click', async () => {
  const room = $('#research-room');
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (room.classList.contains('is-expanded')) {
    room.classList.remove('is-expanded');
    document.body.style.overflow = '';
    return;
  }
  if (room.requestFullscreen) {
    try {
      await room.requestFullscreen();
      return;
    } catch {}
  }
  room.classList.add('is-expanded');
  document.body.style.overflow = 'hidden';
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (state.focused) closeDepartmentLens();
    $('#research-room').classList.remove('is-expanded');
    document.body.style.overflow = '';
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
}

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
