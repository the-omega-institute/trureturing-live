// ============================================================================
// TRURETURING // LIVE — Bilingual Localization Engine (中文 / English)
// Zero-reload instant language switching across DOM HUD, tooltips, 3D Canvas,
// department telemetry, live dispatch wall, Truth DAG galaxies, and drawers.
// ============================================================================
(() => {
  'use strict';

  const STORAGE_KEY = 'trureturing-lang-v1';
  const SUPPORTED = ['zh', 'en'];

  const DICTS = {
    zh: {
      assistant_read: '读取当前视图',
      assistant_journey: '查看接力轨迹',
      page_title: 'TRURETURING // LIVE · 3D 矩阵架构指挥大屏',
      skip_link: '进入 3D 全息指挥大屏',
      connecting: '正在连接',
      connecting_stream: '正在接入全息流',
      layer_galaxy: '星系',
      layer_station: '空间站',
      layer_mix: '混合',
      layer_galaxy_title: '宏大 3D 星空真值 DAG 穹顶',
      layer_station_title: '聚焦 24/7 悬浮轨道空间站与实时产出闭环',
      layer_mix_title: '地面 · 轨道空间站 · 星空三层全景',
      look_holo: '星穹',
      look_matrix: '矩阵',
      look_light: '曜白',
      look_holo_title: '深空星穹观测站（默认）',
      look_matrix_title: '黑客帝国磷光矩阵风格',
      look_light_title: '高对比曜白建筑沙盘',
      mode_org: '3D 架构',
      mode_journey: '接力轨迹',
      follow_live: '跟随最新',
      follow_fixed: '已固定视角',
      hud_zen: '纯净',
      hud_expand: '展开',
      hud_zen_title: '隐藏右侧面板，纯享 3D 空间',
      motion_quiet: '静看',
      motion_quiet_title: '暂停旋转 / 静看',
      fullscreen_enter: '全屏',
      fullscreen_exit: '退出全屏',
      fullscreen_title: '全屏显示',
      back_galaxy: '← 返回星系',
      back_panorama: '← 返回全景',
      home_panorama: '返回全景',
      realm_title: '由全院 24/7 自动化 Lean 形式验证与冻结定理总数实时驱动，仅真实科研突破自动进阶',
      sonar_btn: '灵识扫频',
      sonar_title: '发射灵识扫频光波（快捷键 Space）巡检当前活跃部门与周天星环',
      cinema_btn: '巡航',
      cinema_title: '导演自动巡航模式（快捷键 C）· 自动切换电影机位，任意鼠标/触控板操作立刻归还控制',
      genesis_btn: '演化',
      genesis_title: '星系时间机器 · 拖动滑块回放从公理奇点到当前定理星海的演化史',
      intro_btn: '开屏',
      intro_title: '重播 2.8 秒「天顶俯冲 + 蓝图扫描显影 + 真实 DAG 分层星爆」开屏',
      sound_title: '开启或静音科幻晶体微音效',
      genesis_play_title: '播放或暂停演化回放',
      intro_skip: '跳过',
      intro_step1: 'OMEGA OBSERVATORY // ① 周天星海 · 真值 DAG 创世绽放',
      intro_step2: 'OMEGA OBSERVATORY // ② 全息蓝图扫描 · 轨道空间站实体化',
      intro_step3: 'OMEGA OBSERVATORY // ③ 实时自动化观测 · 准备就绪',
      log_wall_title: 'MATRIX // 全院战报',
      log_mode_latest: '最新',
      log_mode_latest_title: '按时间列出真实的最新事件，有新事件才追加',
      log_mode_cycle: '轮播',
      log_mode_cycle_title: '循环滚动播放全院动态',
      log_ops_dag: 'DAG 节点',
      log_ops_growth: '近期增长',
      log_ops_ci: 'CI 引擎',
      log_jump_latest: '↓ 回到最新',
      open_lens: '飞入舱内 ⤢',
      exit_lens: '← 退出舱内 · 返回 3D 全院',
      panel_happening: '这里正在发生',
      panel_realtime: '实时推进',
      panel_waiting: '等待全息信号…',
      panel_relay_links: '接力的上下游部门',
      journey_back: '← 返回 3D 全院',
      journey_title_default: '选择一个正在推进的问题',
      journey_desc_default: '沿着公开讨论与研究引用，追踪一条线索如何跨部门接力生长。',
      journey_links_head: '关联入口',
      journey_events_head: '接力轨迹与公开进展',
      rail_01: '人的方向',
      rail_01_badge: '指引',
      rail_02: '解决猜想',
      rail_bridge: '形式化',
      rail_04: '书籍推进',
      rail_05: '论文·合作',
      rail_review: '独立评审',
      rail_review_title: '按需红队独立支路：接入猜想、书稿、形式化与论文的对抗评审',
      rail_studio: '工具表达',
      rail_studio_title: '按需工具基建支路：支撑全院编译工具、书稿渲染与前端表达',
      tab_live_ops: '检验灯阵',
      tab_questions: '在研课题',
      tab_conjectures: '猜想档案',
      tab_publications: '书稿论文',
      tab_ecosystem: '开源底座',
      dock_close: '✕ 收起',
      ops_checker_title: 'Lean CI 检验灯阵',
      ops_relay_title: '跨部门接力热力',
      ops_feed_title: '协作信号流',
      filter_all: '全部',
      filter_discussion: '讨论',
      filter_work: '课题',
      filter_automation: '检验',
      q_all: '全部课题',
      q_research: '数学研究',
      q_books: '理论书写',
      q_more: '展开更多 ↓',
      c_all: '全部结论',
      c_proved: '✓ 已证明',
      c_refuted: '✕ 反驳 / 障碍',
      pub_books: '双语书稿进展',
      pub_books_link: '书库 ↗',
      pub_papers: '已公开论文',
      pub_papers_link: '全部研究 ↗',
      eco_repos: '公开研究仓库',
      eco_tpl_title: '复用到任意「人 + AI」GitHub 组织',
      eco_tpl_desc: '独立 Rust 观测引擎自动拉取 Issue / PR / Actions，零改造映射为 3D 全息蜂巢大屏。',
      eco_tpl_btn: 'Rust 开源模板 ↗',
      eco_atlas_btn: '知识地图 ↗',
      ib_open_new: '新标签打开 ↗',
      hint_mix: '周天星阵环绕天地 · 拖拽环视（双击复位） · 点击星海拨弦 · 按 Space 灵识扫频',
      hint_galaxy: '浩瀚星空真值 DAG 穹顶 · 点击任意星系飞入节点网络 · Shift+划动拨弦',
      hint_station: '24/7 活态轨道空间站 · 实时循环产线与滑轨支路 · 点击部门飞入舱内',
      hint_cinema: '◎ 导演自动巡航中 · 拖拽、滚轮或点击任意处立即归还控制权',
      hud_sec1: 'SEC.01 // 理论生产翼（猜想 · 书稿）',
      hud_sec2: 'SEC.02 // 论文 · Mathesis · {n} 合作学者',
      hud_branch_a: 'BRANCH A // 独立评审滑轨',
      hud_branch_b: 'BRANCH B // 工具表达滑轨',
      hud_mathesis: 'Mathesis ⇄ {n} 合作学者',
      hud_left_bridge: '理论生产 ⇄ Lean 核枢',
      hud_right_bridge: 'Lean 核枢 ⇄ 自动论文',
      hud_outreach_detail: '✦ {n} 合作 · {replied} 回信 · {contacted} 联络 · {joint} 联合论文',
      hud_rev_tap: '评审支路接入 → {dept}',
      hud_stu_tap: '工具支路接入 → {dept}',
      hud_station_left_live: '⚡ 猜想·书稿 ⇄ Lean 核枢 · {run} 项实时核验',
      hud_station_right_live: '✦ 自动论文工厂 ⇄ Mathesis · 持续产出',
      hud_station_loop_tag: '24/7 ACTIVE LOOP // 猜想 → 形式化 → 书稿论文 → {n} 学者回流',
      hud_dag_banner: 'TRUTH DAG COSMOS // L0 公理底座 → L18 前沿定理 · {n} 冻结节点',
      lantern_proved: '✓ 已证明',
      lantern_refuted: '✕ 反驳',
      lantern_click: '点击读证明',
      lantern_badge_proved: '✦ 猜想提灯 · 已证明',
      lantern_badge_refuted: '✦ 猜想提灯 · 反驳 / 障碍',
      lantern_read_btn: '在内置浏览器阅读证明 ↗',
      trace_btn_open: '⟡ 追溯公理根 ({n} 条)',
      trace_btn_close: '✕ 收起公理光脉 ({n})',
      lean_source_btn: '查看 Lean 源码 ↗',
      genesis_meta: 'DAG 演化 · {pct}% · ~{th} 定理 · ✦ {conj} 猜想',
      health_connected: '刚刚更新',
      exec_human: '人的方向与判断',
      exec_sessions: '独立研究会话',
      exec_actions: 'Actions 自动引擎',
      exec_mixed: '会话与自动化协作',
      stage_prefix: '境·',
      depts: {
        direction:    { label: '研究方向', role: '全局监控', resp: '提出前沿数学问题与边界约束，把握全院长期研究方向与判断。' },
        research:     { label: '数学攻坚', role: '猜想攻关', resp: '认领课题，探索证明与反例，把可以检验的论证提交给共同研究。' },
        review:       { label: '独立评审', role: '评审支路', resp: '独立跨模型复核与对抗边界审计，剔除漏洞并提炼可形式化声明。' },
        verification: { label: '形式验证', role: 'Lean 核枢', resp: '承接来自数学攻坚、理论书写、论文评议与外部合作的形式化验证请求，固化可复用 Lean 定理。' },
        books:        { label: '理论书写', role: '书籍理论', resp: '把验证通过的定理沉淀为结构清晰的双语理论专著章节，并持续提出新的形式化需求。' },
        publication:  { label: '论文与知识', role: 'Mathesis', resp: '将形式化成果自动汇编为公开论文、短文与 Mathesis 审稿预印本目录。' },
        outreach:     { label: '学术交流', role: '{n} 合作学者', resp: '与全球合作学者双向联络，同步已验证定理与短文，并把新问题回流研究闭环。' },
        studio:       { label: '工具与表达', role: '工具支路', resp: '构建 Lean 验证工具链、双语书稿编译管线、交互式可视化与实时观测大屏。' }
      },
      galaxies: {
        Combinatorics: '组合数学',
        Quantum: '量子结构',
        Arith: '数论算术',
        ConceptDynamics: '概念动力',
        Analytic: '解析分析',
        Weil: 'Weil 理论',
        Observer: '观察者论',
        Other: '基础公理带'
      },
      realms: ['初凝', '筑基', '结丹', '化神', '渡劫', '大乘']
    },

    en: {
      assistant_read: 'Read current view',
      assistant_journey: 'Show the relay journey',
      page_title: 'TRURETURING // LIVE · 3D AI Math Observatory',
      skip_link: 'Enter 3D Observatory',
      connecting: 'Connecting',
      connecting_stream: 'Connecting telemetry stream',
      layer_galaxy: 'Cosmos',
      layer_station: 'Station',
      layer_mix: 'Hybrid',
      layer_galaxy_title: 'Grand 3D Truth DAG Starfield Cosmos',
      layer_station_title: 'Focus on 24/7 Orbital Station & Active Research Loop',
      layer_mix_title: '3-Strata Panorama: Mirror Floor · Orbital Station · Truth Cosmos',
      look_holo: 'Holo',
      look_matrix: 'Matrix',
      look_light: 'Light',
      look_holo_title: 'Deep-Space Observatory (Default)',
      look_matrix_title: 'The Matrix Cyber-Phosphor Style',
      look_light_title: 'High-Contrast Architectural Daylight',
      mode_org: '3D Grid',
      mode_journey: 'Relay',
      follow_live: 'Follow',
      follow_fixed: 'Pinned',
      hud_zen: 'Zen',
      hud_expand: 'Panel',
      hud_zen_title: 'Hide right console for full-bleed 3D space',
      motion_quiet: 'Calm',
      motion_quiet_title: 'Pause orbital motion / calm mode',
      fullscreen_enter: 'Full',
      fullscreen_exit: 'Exit Full',
      fullscreen_title: 'Toggle fullscreen',
      back_galaxy: '← Galaxy View',
      back_panorama: '← Panorama',
      home_panorama: 'Panorama',
      realm_title: 'Driven live by verified Lean theorems across the institute; advances only on real breakthroughs',
      sonar_btn: 'Sonar',
      sonar_title: 'Emit 3D sonar pulse (Space) across active decks and celestial rings',
      cinema_btn: 'Cruise',
      cinema_title: 'Auto-Director camera cruise (C) · drag, scroll or click anywhere to take control',
      genesis_btn: 'Genesis',
      genesis_title: 'DAG Time Machine · scrub through the evolution from Layer-0 axioms to frontier theorems',
      intro_btn: 'Intro',
      intro_title: 'Replay opening sequence (Zenith dive + holographic scan + layered DAG genesis)',
      sound_title: 'Toggle subtle crystalline audio cues',
      genesis_play_title: 'Play or pause evolution playback',
      intro_skip: 'Skip',
      intro_step1: 'OMEGA OBSERVATORY // 01 CELESTIAL DOME · TRUTH DAG GENESIS',
      intro_step2: 'OMEGA OBSERVATORY // 02 HOLOGRAPHIC SCAN · STATION MATERIALIZING',
      intro_step3: 'OMEGA OBSERVATORY // 03 LIVE AUTOMATED TELEMETRY · ONLINE',
      log_wall_title: 'MATRIX // LIVE DISPATCH',
      log_mode_latest: 'Live',
      log_mode_latest_title: 'Chronological stream of real observed events',
      log_mode_cycle: 'Cycle',
      log_mode_cycle_title: 'Continuous cycling dispatch across all departments',
      log_ops_dag: 'DAG Nodes',
      log_ops_growth: 'Recent',
      log_ops_ci: 'CI Engines',
      log_jump_latest: '↓ Jump to Latest',
      open_lens: 'Enter Deck ⤢',
      exit_lens: '← Exit Deck · Back to 3D Institute',
      panel_happening: 'Happening Now',
      panel_realtime: 'Active Work',
      panel_waiting: 'Awaiting telemetry signal…',
      panel_relay_links: 'Upstream & Downstream Relays',
      journey_back: '← Back to 3D Institute',
      journey_title_default: 'Select an active mathematical thread',
      journey_desc_default: 'Follow public discussions and citations as a proof relays across departments.',
      journey_links_head: 'Connected Entry Points',
      journey_events_head: 'Relay Trajectory & Public Progress',
      rail_01: 'Direction',
      rail_01_badge: 'Guide',
      rail_02: 'Proofs',
      rail_bridge: 'Lean',
      rail_04: 'Books',
      rail_05: 'Papers',
      rail_review: 'Review',
      rail_review_title: 'On-demand red-team review branch serving conjectures, books, verification & papers',
      rail_studio: 'Studio',
      rail_studio_title: 'On-demand tooling & presentation branch powering build pipelines, books & observatory UI',
      tab_live_ops: 'CI',
      tab_questions: 'Problems',
      tab_conjectures: 'Archive',
      tab_publications: 'Papers',
      tab_ecosystem: 'Stack',
      dock_close: '✕ Close',
      ops_checker_title: 'Lean CI Verification Array',
      ops_relay_title: 'Cross-Department Relay Heat',
      ops_feed_title: 'Live Collaboration Stream',
      filter_all: 'All',
      filter_discussion: 'Discuss',
      filter_work: 'Tasks',
      filter_automation: 'CI Runs',
      q_all: 'All Threads',
      q_research: 'Math Research',
      q_books: 'Monographs',
      q_more: 'Load More ↓',
      c_all: 'All Verdicts',
      c_proved: '✓ Proved',
      c_refuted: '✕ Refuted / Obstruction',
      pub_books: 'Bilingual Monographs',
      pub_books_link: 'Library ↗',
      pub_papers: 'Public Preprints & Papers',
      pub_papers_link: 'All Research ↗',
      eco_repos: 'Public Research Repositories',
      eco_tpl_title: 'Deploy for Any Human + AI GitHub Org',
      eco_tpl_desc: 'Standalone Rust observer ingests Issues, PRs & Actions into a real-time 3D observatory.',
      eco_tpl_btn: 'Rust Template ↗',
      eco_atlas_btn: 'Knowledge Atlas ↗',
      ib_open_new: 'Open New Tab ↗',
      hint_mix: '3-Strata Observatory · Drag to orbit (dbl-click reset) · Click sky to strum · Space for Sonar',
      hint_galaxy: 'Grand Truth DAG Starfield · Click any galaxy to inspect nodes · Shift+Glide to play harp',
      hint_station: '24/7 Active Orbital Loop · Live pipelines, shuttles & branch rails · Click any deck to zoom in',
      hint_cinema: '◎ Auto-Director Cruise · Drag, scroll, or click anywhere to take control',
      hud_sec1: 'SEC.01 // THEORY WING (CONJECTURES · BOOKS)',
      hud_sec2: 'SEC.02 // PAPERS · MATHESIS · {n} SCHOLARS',
      hud_branch_a: 'BRANCH A // REVIEW SLIDING RAIL',
      hud_branch_b: 'BRANCH B // STUDIO SLIDING RAIL',
      hud_mathesis: 'Mathesis ⇄ {n} Scholars',
      hud_left_bridge: 'Theory Wing ⇄ Lean Core',
      hud_right_bridge: 'Lean Core ⇄ Paper Factory',
      hud_outreach_detail: '✦ {n} Collaborating · {replied} Replied · {contacted} Contacted · {joint} Joint Papers',
      hud_rev_tap: 'Review Branch Active → {dept}',
      hud_stu_tap: 'Studio Branch Active → {dept}',
      hud_station_left_live: '⚡ Theory & Books ⇄ Lean Core · {run} Verifying',
      hud_station_right_live: '✦ Auto-Paper Factory ⇄ Mathesis · Shipping',
      hud_station_loop_tag: '24/7 ACTIVE LOOP // Conjecture → Lean → Books & Papers → {n} Scholars',
      hud_dag_banner: 'TRUTH DAG COSMOS // L0 Axioms → L18 Frontier · {n} Verified Nodes',
      lantern_proved: '✓ Proved',
      lantern_refuted: '✕ Refuted',
      lantern_click: 'Click for proof',
      lantern_badge_proved: '✦ Conjecture Lantern · Proved',
      lantern_badge_refuted: '✦ Conjecture Lantern · Refuted',
      lantern_read_btn: 'Read Proof in Built-in Browser ↗',
      trace_btn_open: '⟡ Trace Axioms ({n} edges)',
      trace_btn_close: '✕ Hide Proof Veins ({n})',
      lean_source_btn: 'View Lean Source ↗',
      genesis_meta: 'DAG Genesis · {pct}% · ~{th} Theorems · ✦ {conj} Conjectures',
      health_connected: 'Live Now',
      exec_human: 'Human Direction',
      exec_sessions: 'Research Sessions',
      exec_actions: 'Actions Automation',
      exec_mixed: 'Sessions + CI',
      stage_prefix: 'TIER ',
      depts: {
        direction:    { label: 'Direction',        role: 'Overseer',     resp: 'Sets open mathematical questions, strategic constraints, and research direction for the institute.' },
        research:     { label: 'Math Research',    role: 'Proofs',       resp: 'Claims open problems, explores proofs and counterexamples, and submits verifiable arguments.' },
        review:       { label: 'Indep. Review',    role: 'Red-Team',     resp: 'Runs independent cross-model audits and adversarial boundary checks before formalization.' },
        verification: { label: 'Verification',     role: 'Lean Core',    resp: 'Formal verification bridge checking proofs from research, monographs, papers & outreach in Lean 4.' },
        books:        { label: 'Monographs',       role: 'Books',        resp: 'Distills verified theorems into living bilingual monographs and routes new formalization requests.' },
        publication:  { label: 'Papers & Wiki',    role: 'Mathesis',     resp: 'Compiles certified results into preprints, short notes, and the Mathesis review platform.' },
        outreach:     { label: 'Scholar Outreach', role: '{n} Scholars', resp: 'Maintains two-way dialogue with external mathematicians, syncing verified proofs and new questions.' },
        studio:       { label: 'Tools & Studio',   role: 'Tools',        resp: 'Builds Lean tooling, book publication pipelines, interactive visualizations, and the live observatory.' }
      },
      galaxies: {
        Combinatorics: 'Combinatorics',
        Quantum: 'Quantum Structure',
        Arith: 'Number Theory',
        ConceptDynamics: 'Concept Dynamics',
        Analytic: 'Analytic Theory',
        Weil: 'Weil Theory',
        Observer: 'Observer Theory',
        Other: 'Axiom Foundations'
      },
      realms: ['Spark', 'Foundation', 'Core', 'Ascension', 'Transcendence', 'Sovereign']
    }
  };

  function detectInitialLang() {
    try {
      const q = new URLSearchParams(window.location.search).get('lang');
      if (q && SUPPORTED.includes(q.toLowerCase())) return q.toLowerCase();
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch {}
    return 'zh';
  }

  let currentLang = detectInitialLang();

  function interpolate(str, vars) {
    if (!vars || typeof str !== 'string') return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  }

  function t(key, vars = null, fallback = null) {
    const d = DICTS[currentLang] || DICTS.zh;
    const raw = d[key] ?? DICTS.zh[key] ?? fallback ?? key;
    return interpolate(raw, vars);
  }

  function deptLabel(id, fallback = '') {
    const d = DICTS[currentLang] || DICTS.zh;
    return d.depts?.[id]?.label || DICTS.zh.depts?.[id]?.label || fallback || id;
  }

  function deptRole(id, vars = null, fallback = '') {
    const d = DICTS[currentLang] || DICTS.zh;
    const raw = d.depts?.[id]?.role || DICTS.zh.depts?.[id]?.role || fallback || '';
    return interpolate(raw, vars);
  }

  function deptResp(id, fallback = '') {
    const d = DICTS[currentLang] || DICTS.zh;
    return d.depts?.[id]?.resp || fallback || '';
  }

  function galaxyName(cluster) {
    if (!cluster) return '';
    const d = DICTS[currentLang] || DICTS.zh;
    if (currentLang === 'zh') return cluster.zh || d.galaxies?.[cluster.name] || cluster.name;
    return d.galaxies?.[cluster.name] || cluster.name || cluster.zh || '';
  }

  function realmName(idx, fallback = '') {
    const d = DICTS[currentLang] || DICTS.zh;
    // INSTITUTE_REALMS uses 1-based idx (1..6)
    const i = Number.isInteger(idx) ? Math.max(0, idx - 1) : 0;
    return d.realms?.[i] || fallback || '';
  }

  function applyDom(doc = document) {
    if (!doc) return;
    const htmlLang = currentLang === 'en' ? 'en' : 'zh-CN';
    if (doc.documentElement) {
      doc.documentElement.lang = htmlLang;
      doc.documentElement.dataset.lang = currentLang;
    }
    doc.title = t('page_title');
    for (const el of doc.querySelectorAll('[data-i18n]')) {
      const key = el.dataset.i18n;
      if (key) el.textContent = t(key);
    }
    for (const el of doc.querySelectorAll('[data-i18n-title]')) {
      const key = el.dataset.i18nTitle;
      if (key) el.setAttribute('title', t(key));
    }
    for (const btn of doc.querySelectorAll('[data-lang-btn]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.langBtn === currentLang));
    }
  }

  function setLang(code) {
    const next = SUPPORTED.includes(code) ? code : 'zh';
    currentLang = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    applyDom(document);
    return currentLang;
  }

  window.TrureI18n = {
    SUPPORTED,
    getLang: () => currentLang,
    setLang,
    t,
    deptLabel,
    deptRole,
    deptResp,
    galaxyName,
    realmName,
    applyDom
  };
})();
