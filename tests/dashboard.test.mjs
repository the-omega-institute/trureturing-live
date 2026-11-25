import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html=await readFile(new URL('../site/index.html',import.meta.url),'utf8');
const script=await readFile(new URL('../site/assets/app.mjs',import.meta.url),'utf8');
const repository='the-omega-institute/trureturing';
const bookRepository='the-omega-institute/trureturing-books';
const stamp=new Date().toISOString();
const task=(number,repo=repository)=>({repository:repo,number});
const actor={id:'research-seat',label:'research-seat',kind:'account',tool:null};
function activity(id,department,kind,changes={}){
  return {id,department,kind,status:'open',label:'An exact bound on weighted collisions',source:department,actor,at:stamp,url:`https://github.com/${repository}/issues/42#${id}`,task:task(42),references:[],fresh:true,...changes};
}
function live(){
  const research=activity('question','research','task');
  const build=activity('ci','verification','automation',{status:'working',references:[task(42)]});
  const book=activity('book','books','contribution',{label:'A chapter on weighted collisions',task:task(9,bookRepository),references:[task(42)],url:`https://github.com/${bookRepository}/pull/9`});
  const rows=[
    ['direction','研究方向','human',[]],
    ['research','数学攻坚','sessions',[research,activity('comment','research','discussion')]],
    ['review','独立评审','sessions',[]],
    ['verification','形式验证','actions',[build,activity('other-ci','verification','automation',{task:task(999),references:[],status:'working'})]],
    ['books','理论书写','mixed',[book,activity('book-ci','books','automation',{task:null,references:[],status:'working',label:'检查与构建书稿'})]],
    ['publication','论文与知识','mixed',[]],
    ['outreach','学术交流','actions',[activity('outreach-ci','outreach','automation',{task:null,status:'working'})]],
    ['studio','工具与表达','mixed',[]]
  ];
  const departments=rows.map(([id,label,execution,activities])=>({id,label,execution,responsibility:`${label}的职责`,activities,participants:activities.length?[actor]:[],running_automations:activities.filter(a=>a.kind==='automation'&&a.status==='working').length,running_sessions:0}));
  return {schema:'trureturing-live-stream.v1',observed_at:stamp,messages:[{
    id:'message',repository,number:42,actor:actor.id,kind:'comment',url:`https://github.com/${repository}/issues/42#comment`,updated_at:stamp,text:'Please check the boundary and counterexample.',mentions:['review-seat']
  }],organization:{schema:'ai-org.live.v1',organization:{id:'trureturing'},observed_at:stamp,departments,sources:departments.map(d=>({id:d.id,label:d.id==='verification'?'检验研究提交':d.id==='books'?'检查与构建书稿':d.id==='outreach'?'协调学术交流与传播':'推进问题与交换思路'})),recent:[build,book],routes:[{from:'direction',to:'research'},{from:'research',to:'verification'},{from:'verification',to:'books'},{from:'publication',to:'outreach'}],handoffs:[{kind:'reference',from:'research',to:'verification',activity:'ci',reference:task(42)}]}};
}
function snapshot(){
  return {schema:'trureturing-live.v1',collected_at:stamp,repositories:[{name:'trureturing'},{name:'trureturing-books'}],editorial:{questions:{'trureturing#42':{title:'怎样控制加权碰撞？',area:'分析与结构',question:'从有限构造出发，寻找一个可以检验的上界。'}},papers:{p1:{title:'有限构造中的边界',summary:'比较构造与精确界。'}}},publications:[{id:'p1',title:'An exact finite construction',authors:'A. Researcher and B. Researcher',status:'Preprint',url:'https://www.trureturing.org/research/p1'}]};
}
async function settle(){await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));}
async function boot(options={}){
  const dom=new JSDOM(html,{url:'https://live.trureturing.org/',runScripts:'outside-only',pretendToBeVisual:true});
  const win=dom.window,intervals=new Map(),responses={live:options.live||live(),snapshot:options.snapshot||snapshot()};
  win.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')?!!options.reduced:query.includes('max-width')?!!options.mobile:false});
  win.HTMLElement.prototype.scrollIntoView=function(){};
  win.AbortSignal=AbortSignal;
  win.fetch=async url=>{
    if(responses.offline)throw new Error('offline');
    return {ok:true,json:async()=>structuredClone(String(url).includes('/api/live')?responses.live:responses.snapshot)};
  };
  win.setInterval=(callback,ms)=>{intervals.set(ms,callback);return ms;};
  win.eval(script);await settle();
  return {dom,win,doc:win.document,responses,tick:async ms=>{intervals.get(ms)?.();await settle();}};
}

test('the hive separates session responsibilities from real running engines and preserves public account identity',async()=>{
  const {dom,doc}=await boot();try{
    assert.equal(doc.querySelectorAll('.hive-cell').length,8);
    assert.equal(doc.querySelectorAll('[data-method-department]').length,5);
    assert.match(doc.querySelector('.method-strip').textContent,/人的方向/);
    doc.querySelector('[data-method-department="verification"]').click();
    assert.equal(doc.querySelector('#department-title').textContent,'形式验证');
    assert.equal(doc.querySelector('#department-lens').hidden,false);
    assert.equal(doc.querySelector('#lens-title').textContent,'形式验证');
    assert.match(doc.querySelector('#lens-metrics').textContent,/正在执行/);
    assert.match(doc.querySelector('[data-department="research"]').textContent,/独立研究会话/);
    assert.match(doc.querySelector('[data-department="outreach"]').textContent,/Actions 自动引擎/);
    assert.match(doc.querySelector('#institute-metrics').textContent,/4项自动化正在运转/);
    assert.doesNotMatch(doc.querySelector('#institute-metrics').textContent,/个研究会话/);
    assert.match(doc.querySelector('#department-people').textContent,/1 个公开参与席位/);
    assert.match(doc.querySelector('#department-agents').textContent,/research-seat/);
    assert.equal(doc.querySelectorAll('#department-agents .agent-card').length,1);
    assert.equal(doc.querySelectorAll('.person.agent').length,0);
    doc.querySelector('[data-department="books"]').click();
    assert.match(doc.querySelector('#department-work').textContent,/检查与构建书稿/);
    assert.match(doc.querySelector('#department-work').textContent,/怎样控制频谱中的近碰撞/);
  }finally{dom.window.close();}
});

test('clicking a department opens an in-map operating view and exposes queue pressure before returning to architecture',async()=>{
  const {dom,doc}=await boot();try{
    doc.querySelector('[data-department="research"]').click();
    assert.equal(doc.querySelector('#research-room').classList.contains('is-department-focused'),true);
    assert.equal(doc.querySelector('#department-lens').hidden,false);
    assert.equal(doc.querySelector('#lens-title').textContent,'数学攻坚');
    assert.match(doc.querySelector('#lens-metrics').textContent,/可见待接力/);
    assert.equal(doc.querySelectorAll('#lens-agents .lens-agent').length,1);
    assert.match(doc.querySelector('#lens-agents').textContent,/research-seat/);
    doc.querySelector('#lens-back').click();
    assert.equal(doc.querySelector('#research-room').classList.contains('is-department-focused'),false);
    assert.equal(doc.querySelector('#department-lens').hidden,true);
    assert.equal(doc.querySelectorAll('.hive-cell').length,8);
  }finally{dom.window.close();}
});

test('department view lists every public work seat with its current task and keeps identity claims bounded',async()=>{
  const data=live(),research=data.organization.departments.find(d=>d.id==='research');
  const second={id:'review-seat',label:'review-seat',kind:'account',tool:null};
  research.participants.push(second);
  research.activities.push(activity('second-work','research','discussion',{actor:second,label:'math(fourier): inspect the boundary',task:task(43),at:new Date(Date.now()+200).toISOString()}));
  const {dom,doc}=await boot({live:data});try{
    doc.querySelector('[data-department="research"]').click();
    assert.equal(doc.querySelector('#department-agent-count').textContent,'2 个公开席位');
    assert.equal(doc.querySelectorAll('#department-agents .agent-card').length,2);
    assert.match(doc.querySelector('#department-agents').textContent,/research-seat/);
    assert.match(doc.querySelector('#department-agents').textContent,/review-seat/);
    assert.match(doc.querySelector('#department-agents').textContent,/当前|最近参与|公开账号/);
    assert.match(doc.querySelector('#department-agents').textContent,/明确标注的 agent|公开账号/);
    assert.doesNotMatch(doc.querySelector('#department-agents').textContent,/online|在线 agent/i);
  }finally{dom.window.close();}
});

test('keyboard navigation freezes the viewpoint; follow resumes only on newly observed activity',async()=>{
  const {dom,doc,win,responses,tick}=await boot();try{
    const research=doc.querySelector('[data-department="research"]');research.focus();
    research.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    assert.equal(doc.querySelector('#department-title').textContent,'独立评审');
    assert.equal(doc.activeElement.dataset.department,'review');
    assert.equal(doc.querySelector('#follow-live').getAttribute('aria-pressed'),'false');
    const update=structuredClone(responses.live);update.organization.observed_at=new Date(Date.now()+1000).toISOString();
    update.organization.recent=[activity('new-book','books','discussion',{at:new Date(Date.now()+500).toISOString()})];responses.live=update;await tick(15000);
    assert.equal(doc.querySelector('#department-title').textContent,'独立评审');
    assert.equal(doc.activeElement.dataset.department,'review');
    doc.querySelector('#follow-live').click();assert.equal(doc.querySelector('#department-title').textContent,'理论书写');
    const newer=structuredClone(update);newer.organization.observed_at=new Date(Date.now()+3000).toISOString();newer.organization.recent=[activity('new-outreach','outreach','automation',{at:new Date(Date.now()+2000).toISOString(),status:'working'})];responses.live=newer;await tick(15000);
    assert.equal(doc.querySelector('#department-title').textContent,'学术交流');
  }finally{dom.window.close();}
});

test('following a book traverses explicit outgoing references and counts only related executions',async()=>{
  const {dom,doc}=await boot();try{
    doc.querySelector('[data-filter="books"]').click();
    assert.equal(doc.querySelectorAll('.question-card').length,1);
    doc.querySelector('.question-title').click();
    assert.equal(doc.querySelector('#journey-panel').hidden,false);
    assert.match(doc.querySelector('#journey-stages').textContent,/数学攻坚/);
    assert.match(doc.querySelector('#journey-stages').textContent,/理论书写/);
    assert.match(doc.querySelector('[data-focus-key="stage:verification"]').textContent,/1 项相关工作正在执行/);
    assert.doesNotMatch(doc.querySelector('#journey-stages').textContent,/学术交流/);
    doc.querySelector('[data-focus-key="stage:verification"]').click();
    assert.equal(doc.querySelector('#journey-panel').hidden,true);
    assert.equal(doc.querySelector('#department-title').textContent,'形式验证');
  }finally{dom.window.close();}
});

test('engineering maintenance does not crowd mathematical questions or imply a completed review',async()=>{
  const data=live();data.organization.departments.find(d=>d.id==='research').activities.unshift(activity('maintenance','research','contribution',{label:'Reuse the protected judge and scoped Lean evidence in PR CI',task:task(1000)}));
  const {dom,doc}=await boot({live:data});try{
    assert.equal(doc.querySelectorAll('.question-card').length,2);
    assert.doesNotMatch(doc.querySelector('#department-work').textContent,/protected judge/);
    doc.querySelector('[data-department="review"]').click();
    assert.match(doc.querySelector('#department-work').textContent,/新的复核意见会在这里汇入/);
    assert.doesNotMatch(doc.querySelector('#department-work').textContent,/评审通过/);
  }finally{dom.window.close();}
});

test('a task-linked automation opens the mathematical question and real public mentions show the recipient',async()=>{
  const {dom,doc}=await boot();try{
    doc.querySelector('.activity-card').click();
    assert.equal(doc.querySelector('#journey-title').textContent,'怎样控制加权碰撞？');
    assert.match(doc.querySelector('#journey-events').textContent,/research-seat → @review-seat/);
    assert.match(doc.querySelector('#journey-events').textContent,/继续考察边界与反例/);
    assert.equal(doc.querySelector('.journey-event a').href,`https://github.com/${repository}/issues/42#comment`);
    assert.doesNotMatch(doc.querySelector('#journey-events').textContent,/Please check/);
  }finally{dom.window.close();}
});

test('history classifies the exact public message rather than another comment by the same account',async()=>{
  const data=live();data.messages.push({...data.messages[0],id:'newer',url:`https://github.com/${repository}/issues/42#newer`,updated_at:new Date(Date.now()+1000).toISOString(),text:'Claimed this task.',mentions:[]});
  const {dom,doc}=await boot({live:data});try{
    doc.querySelector('[data-mode="journey"]').click();
    const rows=[...doc.querySelectorAll('.journey-event')];
    assert.match(rows[0].textContent,/接下了这条研究线索/);
    assert.match(rows[1].textContent,/继续考察边界与反例/);
    assert.equal(rows[1].querySelector('a').href,data.messages[0].url);
  }finally{dom.window.close();}
});

test('stale observations lose live execution claims; failed and older refreshes preserve readable work',async()=>{
  const {dom,doc,responses,tick}=await boot();try{
    const old=live();old.organization.observed_at='2020-01-01T00:00:00Z';old.organization.departments=[];responses.live=old;await tick(15000);
    assert.equal(doc.querySelectorAll('.hive-cell').length,8);
    assert.match(doc.querySelector('#institute-metrics').textContent,/4项自动化/);
    responses.offline=true;await tick(15000);
    assert.equal(doc.querySelectorAll('.question-card').length,2);
  }finally{dom.window.close();}
  const data=live();data.organization.observed_at=new Date(Date.now()-600000).toISOString();
  const stale=await boot({live:data});try{
    assert.match(stale.doc.querySelector('#connection').textContent,/等待新的现场更新/);
    assert.match(stale.doc.querySelector('#institute-metrics').textContent,/—项自动化/);
    assert.equal(stale.doc.querySelectorAll('.hive-cell.is-running').length,0);
    assert.equal(stale.doc.querySelector('#connection-note').hidden,false);
  }finally{stale.dom.window.close();}
});

test('a different organization cannot replace the observed research institute',async()=>{
  const {dom,doc,responses,tick}=await boot();try{
    const wrong=live();wrong.organization.organization.id='another-organization';wrong.organization.observed_at=new Date(Date.now()+10000).toISOString();wrong.organization.departments=[];responses.live=wrong;await tick(15000);
    assert.equal(doc.querySelectorAll('.hive-cell').length,8);
    assert.equal(doc.querySelector('#department-title').textContent,'数学攻坚');
  }finally{dom.window.close();}
});

test('public strings stay text and hostile links cannot execute; publications retain actual authors and status',async()=>{
  const data=snapshot();data.editorial.questions['trureturing#42'].title='<img src=x onerror=alert(1)>';
  data.publications[0].url='javascript:alert(1)';data.publications[0].authors='<script>alert(1)</script>';
  const {dom,doc}=await boot({snapshot:data});try{
    assert.equal(doc.querySelector('.question-title').textContent,'<img src=x onerror=alert(1)>');
    assert.equal(doc.querySelectorAll('.question-card img').length,0);
    assert.equal(doc.querySelector('.paper-title').getAttribute('href'),'#');
    assert.equal(doc.querySelector('.paper-authors').textContent,'<script>alert(1)</script>');
    assert.equal(doc.querySelector('.paper-authors script'),null);
    assert.equal(doc.querySelector('.paper-type').textContent,'预印本');
    assert.equal(doc.querySelector('.paper-title').title,'An exact finite construction');
  }finally{dom.window.close();}
});

test('arrival signals require a new observation and do not replay after department selection',async()=>{
  const {dom,doc,responses,tick}=await boot();try{
    assert.equal(doc.querySelectorAll('.arrival-particle').length,0);
    const next=structuredClone(responses.live),ci=activity('ci-new','verification','automation',{status:'working',at:new Date(Date.now()+500).toISOString()});next.organization.observed_at=new Date(Date.now()+1000).toISOString();next.organization.recent=[ci];next.organization.handoffs=[{kind:'reference',from:'research',to:'verification',activity:ci.id}];responses.live=next;await tick(15000);
    assert.equal(doc.querySelectorAll('.arrival-particle').length,1);
    assert.equal(doc.querySelectorAll('.activity-card.has-arrival').length,1);
    doc.querySelector('[data-department="research"]').click();
    assert.equal(doc.querySelectorAll('.arrival-particle').length,0);
    await tick(15000);assert.equal(doc.querySelectorAll('.arrival-particle').length,0);
    doc.querySelector('#follow-live').click();
    assert.equal(doc.querySelectorAll('.activity-card.has-arrival').length,0);
  }finally{dom.window.close();}
});

test('reduced motion and mobile question navigation remain usable without animation',async()=>{
  const {dom,doc}=await boot({mobile:true,reduced:true});try{
    assert.ok(doc.body.classList.contains('quiet'));
    assert.equal(doc.querySelector('#motion-toggle').hidden,true);
    doc.querySelector('.question-title').click();
    assert.equal(doc.querySelector('#journey-panel').hidden,false);
    doc.querySelector('#journey-back').click();
    assert.equal(doc.querySelector('#journey-panel').hidden,true);
  }finally{dom.window.close();}
});

test('inside-the-institute live telemetry, checker runs, relay bridges, and workbench switcher render safely',async()=>{
  const data=live();
  data.messages[0].text='<img src=x onerror=alert(1)> Verified Steiner boundary.';
  const {dom,doc}=await boot({live:data});try{
    assert.match(doc.querySelector('#ticker-text').textContent,/形式验证|理论书写/);
    assert.ok(doc.querySelectorAll('#live-feed .feed-entry').length>=1);
    assert.match(doc.querySelector('#live-feed').textContent,/Verified Steiner boundary/);
    assert.equal(doc.querySelectorAll('#live-feed img').length,0);
    doc.querySelector('[data-feed-filter="automation"]').click();
    assert.ok(doc.querySelectorAll('#live-feed .feed-entry').length>=1);
    assert.ok(doc.querySelectorAll('#checker-runs .checker-row').length>=1);
    assert.match(doc.querySelector('#checker-summary').textContent,/4 运行中/);
    assert.ok(doc.querySelectorAll('#relay-bridges .bridge-row').length>=1);
    assert.match(doc.querySelector('#relay-bridges').textContent,/数学攻坚/);
    assert.equal(doc.querySelectorAll('#repo-matrix .repo-tile').length,2);
    doc.querySelector('[data-department="research"]').click();
    assert.equal(doc.querySelectorAll('#lens-switcher .lens-switch-pill').length,8);
    assert.match(doc.querySelector('#lens-downstream').textContent,/形式验证/);
    doc.querySelector('#theme-toggle').click();
    assert.equal(doc.documentElement.dataset.theme,'light');
    doc.querySelector('#theme-toggle').click();
    assert.equal(doc.documentElement.dataset.theme,undefined);
    doc.querySelector('#lens-back').click();
    doc.querySelector('[data-department="verification"]').dispatchEvent(new dom.window.Event('pointerenter'));
    assert.equal(doc.querySelector('#department-title').textContent,'形式验证');
    assert.equal(doc.querySelector('#department-lens').hidden,true);
  }finally{dom.window.close();}
});

test('the war-room log opens rolling; 最新 is a scrollable terminal of real events kept across observations',async()=>{
  const {dom,doc,win,responses,tick}=await boot();try{
    const stream=doc.querySelector('#scifi-log-stream');
    const lines=()=>[...stream.querySelectorAll('.scifi-log-line')];
    const pressed=mode=>doc.querySelector(`[data-log-mode="${mode}"]`).getAttribute('aria-pressed');
    assert.equal(pressed('cycle'),'true');
    assert.equal(pressed('latest'),'false');
    assert.ok(!stream.classList.contains('is-terminal'));
    // An event observed while rolling is still in the terminal's scrollback.
    const first=structuredClone(responses.live);
    const early=activity('book-early','books','contribution',{at:new Date(Date.now()+200).toISOString(),task:task(11,bookRepository),url:`https://github.com/${bookRepository}/pull/11`});
    first.organization.observed_at=new Date(Date.now()+300).toISOString();
    first.organization.recent=[...first.organization.recent,early];
    responses.live=first;await tick(15000);
    const later=structuredClone(responses.live);
    later.organization.observed_at=new Date(Date.now()+400).toISOString();
    later.organization.recent=later.organization.recent.filter(a=>a.id!=='book-early');
    responses.live=later;await tick(15000);
    doc.querySelector('[data-log-mode="latest"]').click();
    assert.equal(pressed('latest'),'true');
    assert.equal(pressed('cycle'),'false');
    assert.equal(win.localStorage.getItem('trureturing-live.log-mode.v2'),'latest');
    assert.ok(stream.classList.contains('is-terminal'));
    assert.ok(lines().some(row=>row.dataset.logKey.startsWith('book-early/')));
    const before=lines().length;
    const next=structuredClone(responses.live),at=new Date(Date.now()+500);
    const newest=activity('book-new','books','contribution',{label:'A fresh chapter on spectral gaps',at:at.toISOString(),task:task(10,bookRepository),url:`https://github.com/${bookRepository}/pull/10`});
    next.organization.observed_at=new Date(Date.now()+1000).toISOString();
    next.organization.recent=[...next.organization.recent,newest];
    responses.live=next;await tick(15000);
    const rows=lines();
    assert.equal(rows.length,before+1);
    assert.match(rows.at(-1).querySelector('.log-msg').textContent,/^理论书写 ▸ /);
    assert.ok(rows.at(-1).classList.contains('is-fresh'));
    assert.ok(rows.slice(0,-1).every(row=>!row.classList.contains('is-fresh')));
    const pad=n=>String(n).padStart(2,'0');
    assert.equal(rows.at(-1).querySelector('.log-ts').textContent,`${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`);
    await tick(15000);
    assert.equal(lines().length,before+1);
    // A repeated event on the same work is its own terminal line.
    const again=structuredClone(responses.live),rerun=structuredClone(again.organization.recent[0]);
    rerun.id='ci-rerun';rerun.at=new Date(Date.now()+1500).toISOString();
    again.organization.observed_at=new Date(Date.now()+2000).toISOString();
    again.organization.recent=[...again.organization.recent,rerun];
    responses.live=again;await tick(15000);
    assert.equal(lines().length,before+2);
    const original=rows.find(row=>row.dataset.logKey.startsWith(`${rerun.id.replace('-rerun','')}/`));
    assert.ok(original);
    assert.equal(lines().at(-1).querySelector('.log-msg').textContent,original.querySelector('.log-msg').textContent);
    // Events that leave the observation window stay in the scrollback, which holds far more than 30 lines.
    const many=structuredClone(responses.live),base=Date.now()+3000;
    many.organization.observed_at=new Date(base+60000).toISOString();
    many.organization.recent=Array.from({length:45},(_,i)=>activity(`ci-batch-${i}`,'verification','automation',{status:'working',at:new Date(base+i*1000).toISOString()}));
    responses.live=many;await tick(15000);
    assert.equal(lines().length,before+2+45);
    doc.querySelector('[data-log-mode="cycle"]').click();
    assert.equal(pressed('cycle'),'true');
    assert.equal(win.localStorage.getItem('trureturing-live.log-mode.v2'),'cycle');
    assert.ok(!stream.classList.contains('is-terminal'));
    doc.querySelector('[data-log-mode="latest"]').click();
    assert.equal(lines().length,before+2+45);
  }finally{dom.window.close();}
});

test('clicking a panel background returns one level up; controls, text and drags do not',async()=>{
  const {dom,doc,win}=await boot();try{
    const press=(el,{x=10,y=10,dx=0}={})=>{
      el.dispatchEvent(new win.MouseEvent('pointerdown',{bubbles:true,button:0,clientX:x,clientY:y}));
      el.dispatchEvent(new win.MouseEvent('click',{bubbles:true,button:0,clientX:x+dx,clientY:y}));
    };
    const lens=doc.querySelector('#department-lens');
    doc.querySelector('[data-method-department="verification"]').click();
    assert.equal(lens.hidden,false);
    press(doc.querySelector('#lens-title'));
    assert.equal(lens.hidden,false,'text inside the lens is not background');
    const control=lens.querySelector('#lens-switcher button, .lens-agent, #lens-back');
    assert.ok(control);
    if(control.id!=='lens-back'){press(control);}
    doc.querySelector('[data-method-department="verification"]').click();
    assert.equal(lens.hidden,false);
    press(lens,{dx:40});
    assert.equal(lens.hidden,false,'a drag that ends elsewhere is not a click on the background');
    press(lens);
    assert.equal(lens.hidden,true,'the lens background returns to the 3D institute');

    const journey=doc.querySelector('#journey-panel');
    doc.querySelector('[data-mode="journey"]').click();
    assert.equal(journey.hidden,false);
    press(doc.querySelector('#journey-title'));
    assert.equal(journey.hidden,false);
    press(doc.querySelector('.journey-detail'));
    assert.equal(journey.hidden,true,'the journey background returns to the 3D institute');
    assert.equal(doc.querySelector('[data-mode="organization"]').getAttribute('aria-pressed'),'true');

    const dock=doc.querySelector('#telemetry-dock');
    doc.querySelector('[data-dock-tab="live-ops"]').click();
    assert.ok(dock.classList.contains('is-open'));
    press(doc.querySelector('#dock-drawer-title'));
    assert.ok(dock.classList.contains('is-open'));
    press(dock);
    assert.ok(!dock.classList.contains('is-open'),'the drawer background closes the drawer');
    assert.equal(doc.querySelector('[data-dock-tab="live-ops"]').getAttribute('aria-selected'),'false');
  }finally{dom.window.close();}
});

test('matrix arrivals are ranked by importance and throttled like XP gains',async()=>{
  const {dom,win}=await boot();try{
    const plan=a=>win.xpPlanFor(a).tier;
    assert.equal(plan({kind:'contribution',status:'merged',department:'research'}),3);
    assert.equal(plan({kind:'task',status:'open',department:'research'}),2);
    assert.equal(plan({kind:'contribution',status:'open',department:'books'}),2);
    assert.equal(plan({kind:'automation',status:'succeeded',department:'verification'}),1);
    assert.equal(plan({kind:'discussion',status:'open',department:'research'}),1);
    assert.equal(plan({kind:'automation',status:'failed',department:'verification'}),-1);
    assert.equal(plan({kind:'automation',status:'cancelled',department:'verification'}),0);
    const t0=1000,fresh=()=>({lastLaunch:0,lastByTier:{},lastByDept:{}});
    let q=[];
    q=win.enqueueXp(q,{key:'a',deptId:'verification',tier:1},t0);
    q=win.enqueueXp(q,{key:'b',deptId:'verification',tier:1},t0+10);
    assert.equal(q.length,1,'common gains of one department merge into one flight');
    assert.equal(q[0].count,2);
    assert.equal(q[0].key,'b','the merged flight leaves from the newest line');
    q=win.enqueueXp(q,{key:'skip',deptId:'verification',tier:0},t0+15);
    assert.equal(q.length,1,'tier 0 has no flight');
    q=win.enqueueXp(q,{key:'c',deptId:'research',tier:3},t0+20);
    q=win.enqueueXp(q,{key:'d',deptId:'books',tier:2},t0+30);
    assert.equal(q[win.nextXpLaunch(q,t0+100,fresh(),0)].key,'c','the most important arrival flies first');
    assert.equal(win.nextXpLaunch(q,t0+100,{...fresh(),lastLaunch:t0+90},0),-1,'launches keep a global gap');
    assert.equal(win.nextXpLaunch(q,t0+100,fresh(),4),-1,'at most four flights at once');
    assert.equal(q[win.nextXpLaunch(q,t0+100,{...fresh(),lastByTier:{3:t0+50}},0)].key,'d','a tier on cooldown lets other tiers fly');
    assert.equal(win.nextXpLaunch(q,t0+100,{...fresh(),lastByTier:{3:t0+50,2:t0+60},lastByDept:{verification:t0+70}},0),-1,'a department receives common gains at a measured pace');
    assert.equal(win.nextXpLaunch(win.enqueueXp([],{key:'z',deptId:'books',tier:1},t0),t0+60000,fresh(),0),-1,'stale common gains expire');
    assert.equal(win.nextXpLaunch(win.enqueueXp([],{key:'y',deptId:'research',tier:3},t0),t0+45000,fresh(),0),0,'a level-up waits longer before expiring');
    let big=[];
    for(let i=0;i<30;i++)big=win.enqueueXp(big,{key:'k'+i,deptId:'d'+i,tier:1},t0+i);
    big=win.enqueueXp(big,{key:'gold',deptId:'research',tier:3},t0+40);
    assert.ok(big.length<=12,'the queue is bounded');
    assert.ok(big.some(item=>item.key==='gold'),'dropping keeps the important arrivals');
    const showing=[{kind:'text',deptId:'research',start:t0,dur:2000,pop:true},{kind:'ring',deptId:'research',start:t0,dur:2000}];
    assert.equal(win.xpTextTop('research',300,t0+100,showing),300-56,'a new label stacks above a level-up still showing');
    assert.equal(win.xpTextTop('books',300,t0+100,showing),300,'other departments are unaffected');
    assert.equal(win.xpTextTop('research',300,t0+2500,showing),300,'finished labels free their slot');
  }finally{dom.window.close();}
});

test('a new matrix entry carries its importance, and 轮播 shows the real entry at once',async()=>{
  const {dom,doc,responses,tick}=await boot();try{
    const stream=doc.querySelector('#scifi-log-stream');
    assert.equal(doc.querySelector('[data-log-mode="cycle"]').getAttribute('aria-pressed'),'true');
    const next=structuredClone(responses.live),at=new Date(Date.now()+500).toISOString();
    const merged=activity('merged-1','research','contribution',{status:'merged',at,task:task(77),url:`https://github.com/${repository}/pull/77`});
    next.organization.observed_at=new Date(Date.now()+1000).toISOString();
    next.organization.recent=[...next.organization.recent,merged];
    responses.live=next;await tick(15000);
    const real=stream.querySelector('[data-log-key^="merged-1/"]');
    assert.ok(real,'the real entry is inserted into the rolling log');
    assert.ok(real.classList.contains('is-real'));
    assert.equal(real.dataset.xpTier,'3');
    doc.querySelector('[data-log-mode="latest"]').click();
    const again=structuredClone(responses.live);
    const ci=activity('ci-xp','verification','automation',{status:'succeeded',at:new Date(Date.now()+1500).toISOString()});
    again.organization.observed_at=new Date(Date.now()+2000).toISOString();
    again.organization.recent=[...again.organization.recent,ci];
    responses.live=again;await tick(15000);
    const last=[...stream.querySelectorAll('.scifi-log-line')].at(-1);
    assert.ok(last.dataset.logKey.startsWith('ci-xp/'));
    assert.equal(last.dataset.xpTier,'1');
    assert.equal(stream.querySelector('[data-log-key^="merged-1/"]').dataset.xpTier,'3');
  }finally{dom.window.close();}
});

test('truth DAG growth is grouped by galaxy and brought into close-up one place at a time',async()=>{
  const {dom,win}=await boot();try{
    const clusters=[{id:0,name:'Combinatorics'},{id:1,name:'Quantum'},{id:7,name:'Other'}];
    assert.equal(win.growthClusterId('Combinatorics',clusters),0);
    assert.equal(win.growthClusterId('Fourier',clusters),7,'other domains grow in the remaining galaxy');
    assert.equal(win.growthClusterId('Quantum',[]),-1);
    const ev=(m,d)=>({module:`D5/S3/${d}/${m}`,domain:d,stratum:'S3',at:'2026-11-25T08:00:00Z',commit:'c'});
    const first=win.freshTruthGrowth(null,[ev('A','Combinatorics')]);
    assert.deepEqual([...first.fresh],[],'the first reading is the baseline, not growth');
    const next=win.freshTruthGrowth(first.seen,[ev('A','Combinatorics'),ev('B','Combinatorics'),ev('C','Quantum'),ev('D','Combinatorics')]);
    assert.deepEqual([...next.fresh.map(e=>e.module.split('/').at(-1))],['B','C','D']);
    assert.deepEqual([...win.freshTruthGrowth(next.seen,[ev('B','Combinatorics')]).fresh],[],'a module grows once');
    let q=win.enqueueGrowth([],next.fresh,clusters,1000);
    assert.deepEqual([...q.map(i=>i.cid)],[0,1],'one close-up per galaxy');
    assert.equal(q[0].modules.length,2);
    q=win.enqueueGrowth(q,[ev('E','Quantum')],clusters,1200);
    assert.equal(q.length,2);
    assert.equal(q[1].modules.length,2,'later growth joins the waiting galaxy');
    assert.equal(win.nextGrowthFocus(q,1000,0,null),0);
    assert.equal(win.nextGrowthFocus(q,1000,5000,null),-1,'calm keeps the sky still');
    assert.equal(win.nextGrowthFocus(q,9000,5000,0),1,'the next close-up prefers another galaxy');
    assert.equal(win.nextGrowthFocus([q[0]],9000,5000,0),0,'the same galaxy grows again when nothing else waits');
    assert.equal(win.nextGrowthFocus([],9000,0,null),-1);
    assert.equal(win.growthFocusAmount(0),0);
    const rising=win.growthFocusAmount(700);
    assert.ok(rising>0&&rising<1,'the close-up eases in');
    assert.equal(win.growthFocusAmount(3000),1,'the close-up holds while the galaxy grows');
    const settling=win.growthFocusAmount(6400);
    assert.ok(settling>0&&settling<1,'the close-up eases back');
    assert.equal(win.growthFocusAmount(8000),0,'then the sky is calm');
    assert.deepEqual(win.growthOffset('D5/S3/Quantum/X'),win.growthOffset('D5/S3/Quantum/X'),'a module always grows at the same place');
    assert.notDeepEqual(win.growthOffset('D5/S3/Quantum/X'),win.growthOffset('D5/S3/Quantum/Y'));
  }finally{dom.window.close();}
});

test('a growing galaxy is magnified locally while the rest of the sky stays put',async()=>{
  const {dom,win}=await boot();try{
    const warp=(x,y,d=2.4)=>[...win.growthLensWarp(x,y,500,300,100,d)];
    assert.deepEqual(warp(700,300),[700,300,1],'a point outside the lens does not move');
    assert.deepEqual(warp(500,460),[500,460,1]);
    const edge=warp(599.9,300);
    assert.ok(Math.abs(edge[0]-599.9)<0.5,'the lens edge is continuous with the sky around it');
    const near=warp(510,300),mid=warp(550,300);
    assert.ok(near[2]>mid[2]&&mid[2]>1,'magnification is strongest at the centre');
    assert.ok(near[0]>510&&mid[0]>550,'inner points move outward');
    let last=500;
    for(let x=501;x<600;x+=3){const [wx]=warp(x,300);assert.ok(wx>last,'the lens never folds the sky');last=wx;}
    assert.deepEqual(warp(530,320,0),[530,320,1],'no distortion when the close-up is not active');
    const centre=warp(500,300);
    assert.deepEqual(centre.slice(0,2),[500,300],'the centre itself stays fixed');
    assert.ok(centre[2]>near[2],'and is magnified the most');
  }finally{dom.window.close();}
});

test('spatial layers, tactile sonar sweep, and authentic automation-only realm level-up',async()=>{
  const {dom,win}=await boot();try{
    const doc=win.document;
    const room=doc.querySelector('#research-room');
    assert.equal(room.dataset.layer,'mix','starts in the 3-strata mix panorama');
    doc.querySelector('[data-layer="galaxy"]').click();
    assert.equal(room.dataset.layer,'galaxy','switches cleanly to galaxy observatory layer');
    assert.equal(doc.querySelector('[data-layer="galaxy"]').getAttribute('aria-pressed'),'true');
    doc.querySelector('[data-layer="station"]').click();
    assert.equal(room.dataset.layer,'station','switches cleanly to orbital space station layer');

    win.syncInstituteRealm(18367);
    assert.equal(doc.querySelector('#realm-stage').textContent,'境·IV');
    assert.equal(doc.querySelector('#realm-name').textContent,'化神');

    // Manual tactile sonar clicks MUST NOT fake-farm level ups!
    const sonarBtn=doc.querySelector('#sonar-pulse-btn');
    for(let i=0;i<6;i++)sonarBtn.click();
    assert.equal(doc.querySelector('#realm-stage').textContent,'境·IV','manual clicks never inflate automated realm level');

    // Only real automated theorem milestone advancement levels up the realm!
    win.syncInstituteRealm(20012);
    assert.equal(doc.querySelector('#realm-stage').textContent,'境·V');
    assert.equal(doc.querySelector('#realm-name').textContent,'渡劫');

    const soundBtn=doc.querySelector('#human-sound-btn');
    soundBtn.click();
    assert.equal(soundBtn.getAttribute('aria-pressed'),'false','sound toggle mutes cleanly');
  }finally{dom.window.close();}
});
