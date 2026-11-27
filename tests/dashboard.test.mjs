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
  const win=dom.window,intervals=new Map(),responses={live:options.live||live(),snapshot:options.snapshot||snapshot(),conjectures:options.conjectures||null};
  win.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')?!!options.reduced:query.includes('max-width')?!!options.mobile:false});
  win.HTMLElement.prototype.scrollIntoView=function(){};
  win.AbortSignal=AbortSignal;
  win.fetch=async url=>{
    if(responses.offline)throw new Error('offline');
    const u=String(url);
    if(u.includes('conjectures.json')){
      return responses.conjectures?{ok:true,json:async()=>structuredClone(responses.conjectures)}:{ok:false,json:async()=>({})};
    }
    return {ok:true,json:async()=>structuredClone(u.includes('/api/live')?responses.live:responses.snapshot)};
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
    update.organization.recent=[activity('new-book','books','discussion',{at:new Date(Date.now()+500).toISOString()})];responses.live=update;await tick(8000);
    assert.equal(doc.querySelector('#department-title').textContent,'独立评审');
    assert.equal(doc.activeElement.dataset.department,'review');
    doc.querySelector('#follow-live').click();assert.equal(doc.querySelector('#department-title').textContent,'理论书写');
    const newer=structuredClone(update);newer.organization.observed_at=new Date(Date.now()+3000).toISOString();newer.organization.recent=[activity('new-outreach','outreach','automation',{at:new Date(Date.now()+2000).toISOString(),status:'working'})];responses.live=newer;await tick(8000);
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
    const old=live();old.organization.observed_at='2020-01-01T00:00:00Z';old.organization.departments=[];responses.live=old;await tick(8000);
    assert.equal(doc.querySelectorAll('.hive-cell').length,8);
    assert.match(doc.querySelector('#institute-metrics').textContent,/4项自动化/);
    responses.offline=true;await tick(8000);
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
    const wrong=live();wrong.organization.organization.id='another-organization';wrong.organization.observed_at=new Date(Date.now()+10000).toISOString();wrong.organization.departments=[];responses.live=wrong;await tick(8000);
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
    const next=structuredClone(responses.live),ci=activity('ci-new','verification','automation',{status:'working',at:new Date(Date.now()+500).toISOString()});next.organization.observed_at=new Date(Date.now()+1000).toISOString();next.organization.recent=[ci];next.organization.handoffs=[{kind:'reference',from:'research',to:'verification',activity:ci.id}];responses.live=next;await tick(8000);
    assert.equal(doc.querySelectorAll('.arrival-particle').length,1);
    assert.equal(doc.querySelectorAll('.activity-card.has-arrival').length,1);
    doc.querySelector('[data-department="research"]').click();
    assert.equal(doc.querySelectorAll('.arrival-particle').length,0);
    await tick(8000);assert.equal(doc.querySelectorAll('.arrival-particle').length,0);
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
    responses.live=first;await tick(8000);
    const later=structuredClone(responses.live);
    later.organization.observed_at=new Date(Date.now()+400).toISOString();
    later.organization.recent=later.organization.recent.filter(a=>a.id!=='book-early');
    responses.live=later;await tick(8000);
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
    responses.live=next;await tick(8000);
    const rows=lines();
    assert.equal(rows.length,before+1);
    assert.match(rows.at(-1).querySelector('.log-msg').textContent,/^理论书写 ▸ /);
    assert.ok(rows.at(-1).classList.contains('is-fresh'));
    assert.ok(rows.slice(0,-1).every(row=>!row.classList.contains('is-fresh')));
    const pad=n=>String(n).padStart(2,'0');
    assert.equal(rows.at(-1).querySelector('.log-ts').textContent,`${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`);
    await tick(8000);
    assert.equal(lines().length,before+1);
    // A repeated event on the same work is its own terminal line.
    const again=structuredClone(responses.live),rerun=structuredClone(again.organization.recent[0]);
    rerun.id='ci-rerun';rerun.at=new Date(Date.now()+1500).toISOString();
    again.organization.observed_at=new Date(Date.now()+2000).toISOString();
    again.organization.recent=[...again.organization.recent,rerun];
    responses.live=again;await tick(8000);
    assert.equal(lines().length,before+2);
    const original=rows.find(row=>row.dataset.logKey.startsWith(`${rerun.id.replace('-rerun','')}/`));
    assert.ok(original);
    assert.equal(lines().at(-1).querySelector('.log-msg').textContent,original.querySelector('.log-msg').textContent);
    // Events that leave the observation window stay in the scrollback, which holds far more than 30 lines.
    const many=structuredClone(responses.live),base=Date.now()+3000;
    many.organization.observed_at=new Date(base+60000).toISOString();
    many.organization.recent=Array.from({length:45},(_,i)=>activity(`ci-batch-${i}`,'verification','automation',{status:'working',at:new Date(base+i*1000).toISOString()}));
    responses.live=many;await tick(8000);
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
    responses.live=next;await tick(8000);
    const real=stream.querySelector('[data-log-key^="merged-1/"]');
    assert.ok(real,'the real entry is inserted into the rolling log');
    assert.ok(real.classList.contains('is-real'));
    assert.equal(real.dataset.xpTier,'3');
    doc.querySelector('[data-log-mode="latest"]').click();
    const again=structuredClone(responses.live);
    const ci=activity('ci-xp','verification','automation',{status:'succeeded',at:new Date(Date.now()+1500).toISOString()});
    again.organization.observed_at=new Date(Date.now()+2000).toISOString();
    again.organization.recent=[...again.organization.recent,ci];
    responses.live=again;await tick(8000);
    const last=[...stream.querySelectorAll('.scifi-log-line')].at(-1);
    assert.ok(last.dataset.logKey.startsWith('ci-xp/'));
    assert.equal(last.dataset.xpTier,'1');
    assert.equal(stream.querySelector('[data-log-key^="merged-1/"]').dataset.xpTier,'3');
  }finally{dom.window.close();}
});

test('truth DAG growth is grouped by galaxy with separate close-ups for distinct galaxies',async()=>{
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
    assert.equal(win.nextGrowthFocus(q,null),0);
    assert.equal(win.nextGrowthFocus(q,0),1,'the next close-up prefers another galaxy');
    assert.equal(win.nextGrowthFocus([q[0]],0),0,'the same galaxy grows again when nothing else waits');
    assert.equal(win.nextGrowthFocus([],null),-1);
    for(const count of [1,3,12]){
      const timing=win.growthTiming(count);
      const amount=t=>win.growthFocusAmount(t,timing);
      assert.equal(amount(0),0);
      assert.ok(amount(200)>0 && amount(200)<1,'the core comes into view as the inset opens');
      assert.equal(amount(500),1,'the core is lit before the first new branch');
      assert.equal(amount(timing.pulse),1,'the last star ignites at the centre');
      assert.ok(amount(timing.pulse+1300)>0 && amount(timing.pulse+1300)<1,'return overlaps the expanding pulse');
      assert.equal(amount(timing.end),0);
    }
    assert.deepEqual(win.growthOffset('D5/S3/Quantum/X'),win.growthOffset('D5/S3/Quantum/X'),'a module always grows at the same place');
    assert.notDeepEqual(win.growthOffset('D5/S3/Quantum/X'),win.growthOffset('D5/S3/Quantum/Y'));
  }finally{dom.window.close();}
});

test('a full live batch completes its visible branches before the pulse and a replay preserves totals',async()=>{
  const {dom,win}=await boot();try{
    const nebula=JSON.parse(await readFile(new URL('../site/data/truth-nebula.v1.json',import.meta.url),'utf8'));
    win.initTruthNebulaData(nebula);
    const events=Array.from({length:12},(_,i)=>({domain:'Quantum',module:`D5/S1/Quantum/Q${i}`}));
    const before=nebula.counts.truth_nodes;
    win.observeTruthGrowth({events:[]});
    win.observeTruthGrowth({events});
    const [focus]=win.stepTruthGrowth(1000);
    assert.equal(focus.cluster.name,'Quantum');
    assert.equal(focus.spawned,0);
    assert.equal(win.stepTruthGrowth(2000)[0].spawned,1,'the first branch starts during approach');
    assert.ok(win.stepTruthGrowth(2900)[0].spawned>1);
    assert.equal(win.stepTruthGrowth(5800)[0].spawned,12);
    assert.equal(nebula.counts.truth_nodes,before+12);
    win.observeTruthGrowth({events:win.previewGrowthRecords(['Arith','Weil'])});
    const pair=win.stepTruthGrowth(5801);
    assert.deepEqual(Array.from(pair,f=>f.cluster.name),['Quantum','Arith']);
    const turnover=focus.start+focus.timing.end+1;
    const next=win.stepTruthGrowth(turnover);
    assert.deepEqual(Array.from(next,f=>f.cluster.name),['Arith','Weil']);
    assert.equal(next[1].slot,focus.slot,'the waiting third galaxy uses the released window');
    assert.equal(win.stepTruthGrowth(turnover+next[1].timing.end+1).length,0);
    assert.equal(nebula.counts.truth_nodes,before+12);
  }finally{dom.window.close();}
});

test('the magnifier draws projected stars, filaments and pulse rays at the device resolution',async()=>{
  const {dom,win}=await boot();try{
    win.devicePixelRatio=3;
    const images=[],arcs=[],lines=[],moves=[],palette=[[108,196,215]];
    const grad=()=>({addColorStop(){}});
    const ctx={setTransform(){},fillRect(){},save(){},restore(){},fill(){},beginPath(){},stroke(){},
      translate(){},scale(){},rotate(){},createRadialGradient:grad,createLinearGradient:grad,
      drawImage(image){images.push(image);},arc(x,y){arcs.push([x,y]);},
      moveTo(x,y){moves.push([x,y]);},lineTo(x,y){lines.push([x,y]);}};
    const canvas={getContext:()=>ctx}, skyWash={};
    const nebula={stars:[[0,0,0,0,25,1],[0,0,0,0,50,4],[0,0,0,0,30,2]],edges:[[0,1,0],[0,2,0]],
      projX:[197,211,900],projY:[168,170,900],projZ:[4,4,999]};
    const p={x:204,y:168,col:palette[0]},timing=win.growthTiming(1);
    let growthZoom;
    win.drawGrowthDetail(canvas,{width:260,height:184},p,null,
      {skyWash,nebula,palette,width:800,height:600,paintGrowth(_,zoom){growthZoom=zoom;}},
      [{p,age:timing.pulse,timing,size:336}]);
    assert.deepEqual([canvas.width,canvas.height],[780,552]);
    assert.ok(growthZoom>1);
    assert.deepEqual(images,[skyWash],'only the atmospheric colour is sampled');
    assert.deepEqual([...new Set(arcs.map(a=>a.join(',')))],['197,168','211,170']);
    assert.deepEqual(moves[0],[197,168]);
    assert.deepEqual(lines[0],[211,170]);
    assert.ok(moves[1][0]<0 && lines[1][0]===-moves[1][0],'pulse is painted through the same lens transform');
  }finally{dom.window.close();}
});

test('a growing branch is named at its gold tip in both views, including narrow lenses',async()=>{
  const {dom,win}=await boot();try{
    const points=[],labels=[],colors=[];
    const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},moveTo(){},closePath(){},fill(){},
      lineTo(x,y){points.push([x,y]);},stroke(){colors.push(this.strokeStyle);},
      measureText(t){return {width:t.length*6};},strokeText(){},fillText(t){labels.push(t);}};
    const branch={sx:40,sy:30,ex:100,ey:50,progress:0.5,opacity:1,number:2,module:'D5/Quantum/Branch'};
    const bounds={left:0,top:0,right:200,bottom:120};
    win.drawGrowthMarks(ctx,[branch],bounds,false,true);
    assert.deepEqual(points[0],[70,40]);
    assert.ok(colors.includes('#ffcf72'));
    assert.deepEqual(labels,['Branch']);
    labels.length=0;
    const longName='LeftStripGeometricComparisonBoundary';
    win.drawGrowthMarks(ctx,[{...branch,module:'D5/Quantum/'+longName}],{...bounds,right:132},false,true);
    assert.ok(labels.length>1);
    assert.equal(labels.join(''),longName,'the label wraps inside the lens without losing its module name');
    labels.length=0;
    win.drawGrowthMarks(ctx,[{...branch,progress:1}],{...bounds,right:400},false,false);
    assert.deepEqual(labels,['新 · Branch']);
  }finally{dom.window.close();}
});

test('a manually opened galaxy uses a local lens in the software renderer',async()=>{
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

test('conjecture resolution and refutation ledger stores verdicts and merges live settled proofs',async()=>{
  const ledger=JSON.parse(await readFile(new URL('../site/data/conjectures.json',import.meta.url),'utf8'));
  assert.equal(ledger.schema,'trureturing.conjectures.v1');
  assert.ok(ledger.entries.some(e=>e.verdict==='proved'),'ledger stores proved theorems');
  assert.ok(ledger.entries.some(e=>e.verdict==='refuted'),'ledger stores refuted/obstruction records');

  const feed=live();
  const mergedProof=activity('settled-pr','research','contribution',{status:'merged',label:'Prove a brand-new sharp spectral bound',url:`https://github.com/${repository}/pull/99999`});
  feed.organization.departments.find(d=>d.id==='research').activities.push(mergedProof);
  feed.organization.recent.push(mergedProof);

  const {dom,doc}=await boot({live:feed,conjectures:ledger});try{
    const totalCards=doc.querySelectorAll('#conjecture-cards .conjecture-card').length;
    assert.equal(totalCards,ledger.entries.length+1,'merges permanent ledger with newly observed live Lean proof');
    assert.equal(doc.querySelector('#conjectures-tab-count').textContent,String(totalCards));
    doc.querySelector('[data-verdict-filter="refuted"]').click();
    const refutedCards=[...doc.querySelectorAll('#conjecture-cards .conjecture-card')];
    assert.ok(refutedCards.length>0,'filters refuted/obstruction verdicts');
    assert.ok(refutedCards.every(c=>c.classList.contains('is-refuted')));
    doc.querySelector('[data-verdict-filter="proved"]').click();
    const provedCards=[...doc.querySelectorAll('#conjecture-cards .conjecture-card')];
    assert.ok(provedCards.length>0,'filters proved verdicts');
    assert.ok(provedCards.every(c=>!c.classList.contains('is-refuted')));
  }finally{dom.window.close();}
});

test('five-tier real-automation LEVEL UP planner maps settled conjectures to galaxy rockets, papers to Mathesis prism, and outreach to scholar sync',async()=>{
  const {dom,win}=await boot();try{
    const rocketProof=win.xpPlanFor({kind:'contribution',status:'merged',department:'research',label:'Prove sharp quantum Bloch entanglement bound'});
    assert.equal(rocketProof.tier,3);
    assert.equal(rocketProof.fx,'rocket');
    assert.equal(rocketProof.galaxyCid,1,'maps quantum proof rocket into Quantum galaxy (cid 1)');

    const rocketRefute=win.xpPlanFor({kind:'task',status:'closed',department:'research',label:'Counterexample disproving Robin prime conjecture variant'});
    assert.equal(rocketRefute.tier,3);
    assert.equal(rocketRefute.fx,'rocket');
    assert.equal(rocketRefute.label,'猜想反驳');
    assert.equal(rocketRefute.galaxyCid,2,'maps number theory refutation rocket into Arith galaxy (cid 2)');

    const paperPlan=win.xpPlanFor({kind:'contribution',status:'merged',department:'publication',label:'Publish Mathesis preprint'});
    assert.equal(paperPlan.tier,3);
    assert.equal(paperPlan.fx,'paper');

    const outreachPlan=win.xpPlanFor({kind:'contribution',status:'merged',department:'outreach',label:'Sync external scholar reply'});
    assert.equal(outreachPlan.tier,3);
    assert.equal(outreachPlan.fx,'outreach');

    const failPlan=win.xpPlanFor({kind:'automation',status:'failed',department:'verification',label:'Lean CI check'});
    assert.equal(failPlan.tier,-1);
    assert.equal(failPlan.fx,'fail');
  }finally{dom.window.close();}
});

test('independent embedded review and studio branch pills select each branch cleanly without altering the 5-stage core loop',async()=>{
  const {dom,doc}=await boot();try{
    assert.equal(doc.querySelectorAll('[data-method-department]').length,5);
    assert.equal(doc.querySelectorAll('[data-branch-department]').length,2);
    const revBtn=doc.querySelector('[data-branch-department="review"]');
    const stuBtn=doc.querySelector('[data-branch-department="studio"]');
    revBtn.click();
    assert.equal(revBtn.getAttribute('aria-pressed'),'true');
    assert.equal(stuBtn.getAttribute('aria-pressed'),'false');
    assert.equal(doc.querySelector('#lens-title').textContent,'独立评审');
    stuBtn.click();
    assert.equal(stuBtn.getAttribute('aria-pressed'),'true');
    assert.equal(revBtn.getAttribute('aria-pressed'),'false');
    assert.equal(doc.querySelector('#lens-title').textContent,'工具与表达');
  }finally{dom.window.close();}
});

test('opening a galaxy flies the camera to it as the main view; growth details use a side window',async()=>{
  const {dom,win}=await boot();try{
    const fov=38*Math.PI/180;
    const pose=win.galaxyCameraPose([-5.6,3.45,-9.9],1.4,fov);
    const cam=[pose.lookX+pose.dist*Math.cos(pose.pitch)*Math.sin(pose.yaw),pose.lookY+pose.dist*Math.sin(pose.pitch),pose.lookZ+pose.dist*Math.cos(pose.pitch)*Math.cos(pose.yaw)];
    assert.ok(Math.hypot(cam[0],cam[2])<Math.hypot(-5.6,-9.9),'the camera looks at the galaxy from the station side');
    assert.deepEqual([pose.lookX,pose.lookY,pose.lookZ],[-5.6,3.45,-9.9],'the galaxy is the centre of view');
    const fill=1.4/(pose.dist*Math.tan(fov/2));
    assert.ok(fill>0.5&&fill<0.75,'the galaxy fills most of the view');
    assert.ok(win.galaxyCameraPose([0,3.5,-10.6],3,fov).dist>pose.dist,'larger galaxies are framed from further away');
    assert.ok(win.galaxyCameraPose([0,3.5,-10.6],0.05,fov).dist>=3,'tiny galaxies are not approached too closely');
    const view=(o={})=>({mode:'organization',layer:'mix',focusedDepartment:null,manual:false,...o});
    assert.equal(win.galaxyCameraAllowed('manual',view()),true);
    assert.equal(win.galaxyCameraAllowed('growth',view()),false,'growth leaves the camera under reader control');
    assert.equal(win.galaxyCameraAllowed('manual',view({focusedDepartment:'research'})),false);
    assert.equal(win.galaxyCameraAllowed('manual',view({mode:'journey'})),false);
    assert.equal(win.growthInsetAllowed(view()),true,'the panorama supports the side window');
    assert.equal(win.growthInsetAllowed(view({layer:'galaxy'})),true);
    assert.equal(win.growthInsetAllowed(view({layer:'station'})),false,'the station view is left alone');
    assert.equal(win.growthInsetAllowed(view({manual:true})),false,'an opened galaxy is not disturbed');
    assert.equal(win.growthInsetAllowed(view({focusedDepartment:'research'})),false);
    for(const [w,h] of [[1140,900],[390,420]]){
      for(const xs of [[0.16,0.82],[0.50,0.52],[0.11,0.15]]){
        const points=xs.map(x=>({x:x*w,y:h*0.46}));
        const boxes=win.growthInsetLayout(points,w,h,w<550?100:0);
        const [a,b]=boxes;
        assert.equal(a.y,b.y,'both windows occupy the top row');
        assert.ok(a.y<h*0.10 && a.y+a.height<h*0.47);
        assert.ok(a.width*a.height >= (w<550 ? 156*130 : 296*219)*1.95);
        assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x);
        assert.equal(win.growthInsetLayout([{...points[1],placement:b.placement}],w,h)[0].x,b.x,
          'a window keeps its corner when the other one closes');
        boxes.forEach((box,i)=>{
          assert.ok(box.x>=0 && box.y>=(w<550?-100:0) && box.x+box.width<=w && box.y+box.height<=h);
          const arrow=win.growthPointer(box,points[i],w,h);
          assert.ok(arrow.length>6);
          assert.ok(Math.abs(arrow.x+(arrow.length+2)*Math.cos(arrow.angle)-points[i].x)<0.001);
          assert.ok(Math.abs(arrow.y+(arrow.length+2)*Math.sin(arrow.angle)-points[i].y)<0.001);
          if(xs[1]-xs[0]>0.5) assert.equal(box.x+box.width/2<w/2,points[i].x<w/2);
        });
      }
    }
    const preview=[...win.previewGrowthRecords(['Quantum','Arith'])];
    assert.ok(preview.length>=2&&preview.every(r=>r.preview===true),'preview growth is marked as preview');
    assert.deepEqual([...new Set(preview.map(r=>r.domain))],['Quantum','Arith']);
    const room=dom.window.document.querySelector('#research-room');
    win.syncGalaxyMainView(true);
    assert.ok(room.classList.contains('is-galaxy-main'),'station labels step aside while a galaxy is the main view');
    win.syncGalaxyMainView(false);
    assert.ok(!room.classList.contains('is-galaxy-main'),'station labels return with the panorama');
  }finally{dom.window.close();}
});

test('nodes in an opened galaxy can be picked, labelled and read, and new nodes are marked',async()=>{
  const {dom,win}=await boot();try{
    const doc=dom.window.document;
    const picks=[{kind:'star',idx:0,x:100,y:100},{kind:'new',module:'D5/S1/Combinatorics/Words/Lyndon',x:130,y:100}];
    assert.equal(win.pickGalaxyNode(picks,104,103)?.idx,0,'the nearest node is picked');
    assert.equal(win.pickGalaxyNode(picks,127,98)?.kind,'new');
    assert.equal(win.pickGalaxyNode(picks,300,300),null,'empty sky picks nothing');
    const release='sha256:r';
    const details={schema_version:'trureturing-truth-nebula-details.v1',truth_release_digest:release,source_commit:'c'.repeat(40),
      stars:[['D5/S0/Asymptotics/Bonferroni/TailBounds','Capture-Count Tail Bounds','Positive capture-count tails are bounded.','interface',7,3]]};
    assert.equal(win.galaxyDetailsUsable(details,release,1),true);
    assert.equal(win.galaxyDetailsUsable(details,'sha256:other',1),false,'details of another release are not shown');
    assert.equal(win.galaxyDetailsUsable(details,release,2),false,'details must line up star by star');
    assert.equal(win.galaxyDetailsUsable({...details,schema_version:'x'},release,1),false);
    const clusters=[{id:0,name:'Combinatorics',zh:'组合数学'}];
    const star=win.galaxyNodeInfo({kind:'star',idx:0,cid:0},details,clusters);
    assert.equal(star.title,'Capture-Count Tail Bounds');
    assert.equal(star.summary,'Positive capture-count tails are bounded.');
    assert.equal(star.module,'D5/S0/Asymptotics/Bonferroni/TailBounds');
    assert.equal(star.isNew,false);
    assert.ok(star.meta.some(m=>m.includes('3')&&m.includes('定理')),'theorem count is shown');
    assert.ok(star.meta.some(m=>m.includes('7')),'DAG layer is shown');
    assert.equal(star.href,`https://github.com/the-omega-institute/trureturing/blob/${'c'.repeat(40)}/D5/S0/Asymptotics/Bonferroni/TailBounds.lean`);
    const bare=win.galaxyNodeInfo({kind:'star',idx:0,cid:0},null,clusters);
    assert.equal(bare.href,null,'without details a sampled star is not named');
    assert.ok(bare.title.includes('组合数学'));
    const fresh=win.galaxyNodeInfo({kind:'new',cid:0,module:'D5/S1/Combinatorics/Words/Lyndon',at:new Date(Date.now()-120000).toISOString(),commit:'b'.repeat(40)},details,clusters);
    assert.equal(fresh.isNew,true);
    assert.equal(fresh.badge,'新加入');
    assert.equal(fresh.title,'Lyndon');
    assert.ok(fresh.meta.some(m=>m.includes('2 分钟前')),'the freeze time is shown');
    assert.equal(fresh.href,`https://github.com/the-omega-institute/trureturing/blob/${'b'.repeat(40)}/D5/S1/Combinatorics/Words/Lyndon.lean`);
    const preview=win.galaxyNodeInfo({kind:'new',cid:0,module:'D5/预览/Combinatorics/示例模块1',at:new Date().toISOString(),commit:'preview',preview:true},details,clusters);
    assert.equal(preview.href,null,'preview nodes link nowhere');
    assert.ok(preview.badge.includes('预览'));
    const placed=win.planGalaxyLabels([
      {x:100,y:100,w:80,text:'a'},{x:104,y:102,w:80,text:'b'},{x:400,y:300,w:80,text:'c'},{x:5,y:5,w:80,text:'d'}
    ],3,{left:0,top:0,right:600,bottom:500});
    assert.ok(placed.length<=3);
    for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
      const a=placed[i],b=placed[j];
      assert.ok(a.lx+a.w<=b.lx||b.lx+b.w<=a.lx||a.ly+a.h<=b.ly||b.ly+b.h<=a.ly,'labels never overlap');
    }
    assert.ok(placed.every(p=>p.lx>=0&&p.ly>=0&&p.lx+p.w<=600&&p.ly+p.h<=500),'labels stay on the stage');
    assert.equal(placed[0].text,'a','the first candidate has priority');
    const cardBox={lx:90,ly:80,w:200,h:120};
    const aside=[...win.planGalaxyLabels([{x:100,y:100,w:80,text:'a'},{x:400,y:300,w:80,text:'c'}],3,{left:0,top:0,right:600,bottom:500},[cardBox])];
    assert.ok(aside.every(p=>p.lx+p.w<=cardBox.lx||cardBox.lx+cardBox.w<=p.lx||p.ly+p.h<=cardBox.ly||cardBox.ly+cardBox.h<=p.ly),'labels stay clear of the node card');
    assert.ok(aside.some(p=>p.text==='c'));
    win.renderGalaxyNodeCard(fresh,200,150,{left:0,top:0,right:900,bottom:700});
    const card=doc.querySelector('#galaxy-node-card');
    assert.equal(card.hidden,false);
    assert.ok(card.textContent.includes('Lyndon')&&card.textContent.includes('新加入'));
    assert.equal(card.querySelector('a')?.getAttribute('href'),fresh.href);
    win.renderGalaxyNodeCard(preview,200,150,{left:0,top:0,right:900,bottom:700});
    assert.equal(card.querySelector('a'),null);
    win.closeGalaxyNodeCard();
    assert.equal(card.hidden,true);
  }finally{dom.window.close();}
});

test('an opened galaxy gathers the galaxies it depends on around it and a clicked node becomes the next focus',async()=>{
  const {dom,win}=await boot();try{
    const clusters=[{id:0,name:'Combinatorics'},{id:1,name:'Quantum'},{id:2,name:'Arith'},{id:3,name:'ConceptDynamics'},{id:5,name:'Weil'},{id:6,name:'Observer'},{id:7,name:'Other'}];
    const links=[[7,1,328,251],[0,7,315,198],[5,1,131,2],[6,1,61,32],[0,1,43,19],[6,0,34,2],[3,6,28,4],[5,2,79,25]];
    const frames=new Map([[0,{center:[-5.7,3.45,-9.8],radius:1.4}],[1,{center:[-9.9,1.35,-3.9],radius:1.2}],[2,{center:[5.7,3.45,-9.8],radius:1.3}],
      [3,{center:[-9.1,2.45,-6.5],radius:1.2}],[5,{center:[9.1,2.45,-6.5],radius:1.2}],[6,{center:[0,3.55,-11.2],radius:1.1}],[7,{center:[0,2,-10],radius:9}]]);
    const ids=list=>[...list].map(n=>n.cid).join(',');
    assert.equal(ids(win.galaxyGatherNeighbors(1,clusters,links,frames)),'5,6,0','linked galaxies, strongest dependency bundle first; the foundations belt is not gathered');
    const sparse=[...win.galaxyGatherNeighbors(3,clusters,links,frames)];
    assert.equal(ids(sparse),'6,1,0','a sparsely linked galaxy is joined by its nearest galaxies');
    assert.deepEqual(sparse.map(n=>n.linked),[true,false,false]);
    const pose=win.galaxyCameraPose(frames.get(1).center,1.2,38*Math.PI/180);
    const basis=win.galaxyViewBasis(pose.yaw,pose.pitch);
    const plan=win.galaxyGatherPlan(1,clusters,links,frames,basis,1.4);
    const f=frames.get(1).center,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((x,i)=>x-b[i]);
    const flat=p=>[dot(sub(p,f),basis.right),dot(sub(p,f),basis.up)];
    assert.equal(plan.neighbors.length,3);
    for(const n of plan.neighbors){
      assert.ok(n.scale>0.3&&n.scale<1,'gathered galaxies are shown smaller than the opened one');
      assert.deepEqual(n.offset.map(x=>+x.toFixed(9)),sub(n.target,n.pivot).map(x=>+x.toFixed(9)));
      const [x,y]=flat(n.target);
      assert.ok(Math.hypot(x,y)>1.2+n.radius,'a gathered galaxy does not cover the opened one');
      assert.ok(plan.extentX>=Math.abs(x)+n.radius-1e-9&&plan.extentY>=Math.abs(y)+n.radius-1e-9,'the framing extent covers the group');
    }
    for(let i=0;i<plan.neighbors.length;i++)for(let j=i+1;j<plan.neighbors.length;j++){
      const a=plan.neighbors[i],b=plan.neighbors[j];
      assert.ok(Math.hypot(...sub(a.target,b.target))>a.radius+b.radius,'gathered galaxies do not overlap');
    }
    const targets=win.galaxyGatherTargets(plan,clusters);
    assert.equal(targets.get(1).scale,1);assert.equal(targets.get(1).alpha,1);
    assert.equal(targets.get(5).scale,plan.neighbors[0].scale);
    assert.ok(targets.get(2).alpha<0.5,'unrelated galaxies dim');
    assert.equal(targets.get(2).scale,1);assert.deepEqual([...targets.get(2).offset],[0,0,0]);
    const rest=win.galaxyGatherTargets(null,clusters);
    assert.ok([...rest.values()].every(t=>t.scale===1&&t.alpha===1&&t.offset.every(v=>v===0)),'without an opened galaxy nothing moves');
    const node=[-9.6,1.6,-4.2];
    const near=win.nodeCameraPose(node,[[-9.2,1.9,-4.4]],38*Math.PI/180,1.4,pose.yaw,pose.pitch);
    const far=win.nodeCameraPose(node,[[-8.0,2.6,-5.2]],38*Math.PI/180,1.4,pose.yaw,pose.pitch);
    assert.deepEqual([near.lookX,near.lookY,near.lookZ],node,'the clicked node is the centre of view');
    assert.ok(near.dist<pose.dist,'opening a node zooms in further than the galaxy view');
    assert.ok(far.dist>near.dist,'the view widens to keep the node\'s connections in frame');
    assert.ok(far.dist<=6.5&&near.dist>=3,'a node is approached closely but its galaxy stays in view');
    const even=[...win.gatherSlots([0.1,0.3,2.0])];
    const gaps=even.map(a=>((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI)).sort((a,b)=>a-b);
    const spacing=[gaps[1]-gaps[0],gaps[2]-gaps[1],2*Math.PI-gaps[2]+gaps[0]];
    assert.ok(spacing.every(d=>Math.abs(d-2*Math.PI/3)<1e-9),'gathered galaxies are spaced evenly around the opened one');
    const order=[0.1,0.3,2.0].map((_,i)=>i).sort((i,j)=>((even[i]-even[0])%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-((even[j]-even[0])%(2*Math.PI)+2*Math.PI)%(2*Math.PI));
    assert.deepEqual(order,[0,1,2],'and keep the order in which they lie around it');
    assert.equal(near.yaw,pose.yaw,'zooming into a node keeps the galaxy view direction');
    const details={source_commit:'c'.repeat(40),stars:[['D5/S0/A/B','T','S','hub',3,4]]};
    const info=win.galaxyNodeInfo({kind:'star',idx:0,cid:0},details,clusters,{total:5,cross:2});
    assert.ok(info.meta.some(m=>m.includes('5')&&m.includes('相连')),'the card counts the node\'s connections');
    assert.ok(info.meta.some(m=>m.includes('2')&&m.includes('跨星系')));
    const full={source_commit:'c'.repeat(40),stars:[['D5/S0/A/B','T','S','hub',3,4,7,12,[1,2],[3]],['D5/S0/A/C','U','','internal',1,1,0,1,[],[0]]]};
    const deps=win.galaxyNodeInfo({kind:'star',idx:0,cid:0},full,clusters);
    assert.ok(deps.meta.some(m=>m.includes('依赖 7')&&m.includes('被 12')),'the card shows how many modules it depends on and how many depend on it');
    const conn=win.nodeConnections(0,full);
    assert.deepEqual([[...conn.prereqs],[...conn.dependents]],[[1,2],[3]],'connections come from the full dependency graph when known');
    assert.ok(pose.pitch>0.6,'the opened galaxy is seen from above');
  }finally{dom.window.close();}
});

test('clicking empty space while a window is open goes back one step',async()=>{
  const {dom,win,doc}=await boot();try{
    const press=(el,extra={})=>{
      el.dispatchEvent(new win.MouseEvent('pointerdown',{bubbles:true,cancelable:true,button:0,clientX:400,clientY:300,...extra}));
      el.dispatchEvent(new win.MouseEvent('pointerup',{bubbles:true,cancelable:true,button:0,clientX:400,clientY:300,...extra}));
      el.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true,button:0,clientX:400,clientY:300,...extra}));
    };
    const scene=doc.querySelector('#holo-3d');
    doc.querySelector('[data-method-department="verification"]').click();
    const lens=doc.querySelector('#department-lens');
    assert.equal(lens.hidden,false,'the department opens');
    doc.querySelector('[data-dock-tab]').click();
    assert.ok(doc.querySelector('#telemetry-dock').classList.contains('is-open'));
    press(scene);
    assert.ok(!doc.querySelector('#telemetry-dock').classList.contains('is-open'),'the drawer closes first');
    assert.equal(lens.hidden,false,'one click goes back one step');
    press(scene);
    assert.equal(lens.hidden,true,'then the department closes');
    doc.querySelector('[data-dock-tab]').click();
    press(doc.querySelector('#telemetry-dock .dock-drawer-title')||doc.querySelector('#dock-drawer-title'));
    assert.ok(doc.querySelector('#telemetry-dock').classList.contains('is-open'),'text inside a window does not close it');
    doc.querySelector('[data-method-department="verification"]').click();
    assert.equal(lens.hidden,false);
    press(doc.querySelector('#dept-zoom-canvas'));
    assert.ok(!doc.querySelector('#telemetry-dock').classList.contains('is-open'),'empty space in a window underneath closes the window on top');
    assert.equal(lens.hidden,false,'and only that window');
    press(doc.querySelector('#dept-zoom-canvas'));
    assert.equal(lens.hidden,true,'the next click goes back again');
  }finally{dom.window.close();}
});

test('links open in the built-in browser, GitHub pages render inside it',async()=>{
  const {dom,win,doc}=await boot();try{
    const r=u=>win.resolveInlineBrowserRoute(u);
    assert.equal(r('https://github.com/o/r/pull/5').kind,'github-pr');
    assert.equal(r('https://github.com/o/r/pull/5').api,'https://api.github.com/repos/o/r/pulls/5');
    assert.equal(r('https://github.com/o/r/issues/7').kind,'github-issue');
    assert.equal(r('https://github.com/o/r/actions/runs/123/job/9').kind,'github-run');
    assert.equal(r('https://github.com/o/r/actions/runs/123').api,'https://api.github.com/repos/o/r/actions/runs/123');
    assert.equal(r('https://github.com/o/r/blob/abc/D5/S1/X.lean').raw,'https://raw.githubusercontent.com/o/r/abc/D5/S1/X.lean');
    assert.equal(r('https://github.com/o/r/commit/abc123').kind,'github-commit');
    assert.equal(r('https://github.com/o/r/releases/tag/v1').kind,'github-release');
    assert.equal(r('https://github.com/o/r').kind,'github-repo');
    assert.equal(r('https://arxiv.org/abs/2611.15431v1').src,'https://arxiv.org/pdf/2611.15431v1','arXiv opens its PDF, which may be embedded');
    assert.equal(r('https://books.trureturing.org/').kind,'frame');
    assert.equal(r('https://openreview.net/forum?id=x').kind,'blocked','sites that refuse embedding say so');
    assert.equal(r('javascript:alert(1)'),null);
    assert.equal(r('http://example.com/'),null,'only https opens');

    const box=doc.querySelector('#inline-browser');
    const link=doc.querySelector('a[href="https://books.trureturing.org/"]');
    const meta=new win.MouseEvent('click',{bubbles:true,cancelable:true,metaKey:true});
    link.dispatchEvent(meta);
    assert.equal(meta.defaultPrevented,false,'a modified click keeps the browser default');
    assert.equal(box.hidden,true);
    const plain=new win.MouseEvent('click',{bubbles:true,cancelable:true});
    link.dispatchEvent(plain);
    assert.equal(plain.defaultPrevented,true,'a plain click stays on the page');
    assert.equal(box.hidden,false);
    assert.equal(doc.querySelector('.ib-url').textContent,'https://books.trureturing.org/');
    assert.equal(doc.querySelector('.ib-frame').getAttribute('src'),'https://books.trureturing.org/');
    assert.equal(doc.querySelector('[data-ib-out]').getAttribute('href'),'https://books.trureturing.org/');

    const calls=[];
    win.fetch=async(u,opts)=>{
      calls.push(String(u));
      if(String(u).includes('/pulls/5'))return{ok:true,status:200,headers:{get:()=>null},json:async()=>({number:5,title:'Prove <b>things</b>',state:'closed',merged_at:'2026-11-25T08:00:00Z',draft:false,user:{login:'loning'},created_at:'2026-11-25T07:00:00Z',head:{ref:'lane/x'},base:{ref:'dev'},additions:12,deletions:3,changed_files:2,commits:1,labels:[{name:'math'}],body_html:'<p>Body</p>'})};
      if(String(u).includes('/issues/9'))return{ok:false,status:403,headers:{get:h=>/remaining/i.test(h)?'0':null},json:async()=>({message:'API rate limit exceeded'})};
      return{ok:false,status:404,headers:{get:()=>null},json:async()=>({})};
    };
    win.openInlineBrowser('https://github.com/o/r/pull/5');
    await settle();await settle();
    const native=doc.querySelector('.ib-native');
    const html=native.getAttribute('srcdoc')||'';
    assert.ok(html.includes('Prove &lt;b&gt;things&lt;/b&gt;'),'the title is shown, escaped');
    assert.ok(html.includes('已合并'),'the PR state is shown');
    assert.ok(html.includes('<p>Body</p>'),'the rendered description is shown');
    assert.ok(html.includes('+12')&&html.includes('lane/x'));
    assert.equal(native.getAttribute('sandbox'),'allow-same-origin','rendered GitHub content cannot run scripts');
    assert.ok(calls.some(u=>u==='https://api.github.com/repos/o/r/pulls/5'));
    win.openInlineBrowser('https://github.com/o/r/issues/9');
    await settle();await settle();
    assert.match(doc.querySelector('.ib-status').textContent,/额度/,'an exhausted GitHub quota is explained');
    doc.querySelector('[data-ib="back"]').click();
    await settle();
    assert.equal(doc.querySelector('.ib-url').textContent,'https://github.com/o/r/pull/5','back returns to the previous page');
    assert.equal(calls.filter(u=>u.endsWith('/pulls/5')).length,1,'a page already read is not fetched again');
    doc.querySelector('[data-ib="forward"]').click();
    await settle();
    assert.equal(doc.querySelector('.ib-url').textContent,'https://github.com/o/r/issues/9');
    doc.querySelector('[data-ib-backdrop]').click();
    assert.equal(box.hidden,true,'clicking outside the browser closes it');
    win.openInlineBrowser('https://books.trureturing.org/');
    doc.querySelector('[data-dock-tab]').click();
    doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(box.hidden,true,'Esc closes the browser first');
    assert.ok(doc.querySelector('#telemetry-dock').classList.contains('is-open'));
  }finally{dom.window.close();}
});

test('trackpad pinch and scroll zoom out step cleanly from DAG node to galaxy to panorama with inertia cooldown',async()=>{
  const {dom,win,doc}=await boot();try{
    // 1. Zooming in smoothly brings camera closer down to min bound
    let z={scale:1.0,cooldownUntil:0};
    z=win.stepGalaxyZoom(z,-15,true,1000);
    assert.equal(z.action,'zoom');
    assert.ok(z.scale<1.0,'pinch-apart zooms closer inside galaxy/node view');

    // 2. Trackpad pinch-out (ctrlKey=true, deltaY>0) smoothly pulls back, then triggers step-out past threshold
    z={scale:1.0,cooldownUntil:0};
    const r1=win.stepGalaxyZoom(z,10,true,2000);
    assert.equal(r1.action,'zoom');
    assert.ok(r1.scale>1.0&&r1.scale<1.32,'initial pinch pulls camera back with live visual feedback');
    const r2=win.stepGalaxyZoom(r1,14,true,2040);
    assert.equal(r2.action,'step-out','continued pinch-out steps back one level');
    assert.equal(r2.scale,1.0,'zoom scale resets cleanly after stepping out');

    // 3. Residual macOS trackpad inertia within cooldown is swallowed so one gesture never skips two levels
    const rInertia=win.stepGalaxyZoom(r2,16,true,2120);
    assert.equal(rInertia.action,'cooldown','inertia inside cooldown does not double-exit');

    // 4. After cooldown expires, two-finger scroll zoom-out (ctrlKey=false) also steps out cleanly
    let s=win.stepGalaxyZoom(r2,80,false,2700);
    assert.equal(s.action,'zoom');
    s=win.stepGalaxyZoom(s,90,false,2740);
    assert.equal(s.action,'step-out','two-finger scroll-out steps back after cooldown');

    // 5. Floating back bar exposes explicit 1-click escape buttons when in galaxy/node view
    assert.equal(doc.querySelector('#galaxy-back-bar').hidden,true,'hidden in panorama');
  }finally{dom.window.close();}
});

test('local showcase: DAG axiom path tracing, anonymized upstream outreach stats, and genesis scrub / cinema controls',async()=>{
  const statsRaw=JSON.parse(await readFile(new URL('../site/data/outreach-stats.json',import.meta.url),'utf8'));
  assert.equal(statsRaw.schema,'trureturing.outreach-stats.v1');
  assert.equal(statsRaw.collaborating_scholars,223,'exact verified collaborating scholars from upstream outreach repo');
  assert.equal(statsRaw.replied_scholars,485);
  assert.equal(statsRaw.contacted_scholars,1049);
  assert.equal(statsRaw.joint_papers,32);
  assert.ok(!('emails' in statsRaw)&&!('scholars' in statsRaw),'zero PII exposed in public outreach-stats.json');

  const {dom,win,doc}=await boot();try{
    // 1. Backward axiom trace follows prerequisite edges down to roots
    const details={stars:[
      [null,'Axiom_0',null,null,0,null,0,1,[],[1]],
      [null,'Lemma_1',null,null,1,null,1,1,[0],[2]],
      [null,'Theorem_2',null,null,2,null,1,0,[1],[]]
    ]};
    const traceBack=win.traceDagPath(2,null,[[0,1],[1,2]],details);
    assert.ok(traceBack&&traceBack.edges.length===2,'backward axiom trace walks 2->1->0');
    assert.ok(traceBack.nodes.includes(0)&&traceBack.nodes.includes(2));

    // 2. Two-star shortest path finds exact bridge
    const tracePair=win.traceDagPath(0,2,[[0,1],[1,2],[2,3]],details);
    assert.ok(tracePair&&tracePair.edges.length===2,'shortest path finds 0->1->2');

    // 3. UI controls for genesis scrub, cinema director, and intro replay work cleanly
    assert.ok(doc.querySelector('#cinema-director-btn'));
    assert.ok(doc.querySelector('#replay-intro-btn'));
    const scrubBar=doc.querySelector('#genesis-scrub-bar');
    assert.equal(scrubBar.hidden,true,'genesis scrub bar starts hidden');
    doc.querySelector('#genesis-scrub-btn').click();
    assert.equal(scrubBar.hidden,false,'clicking 演化 opens genesis scrub bar');
    const slider=doc.querySelector('#genesis-slider');
    slider.value='50';
    slider.dispatchEvent(new win.Event('input',{bubbles:true}));
    assert.match(doc.querySelector('#genesis-meta').textContent,/50%/,'meta reflects 50% evolution');
    doc.querySelector('#genesis-close-btn').click();
    assert.equal(scrubBar.hidden,true,'close button hides genesis scrub bar');
  }finally{dom.window.close();}
});

test('bilingual (zh/en only, complete English coverage), three distinct visual themes (holo/matrix/light), and layer identities',async()=>{
  const i18nSrc=await readFile(new URL('../site/assets/i18n.js',import.meta.url),'utf8');
  const {dom,win,doc}=await boot();try{
    win.eval(i18nSrc);
    assert.ok(win.TrureI18n,'TrureI18n engine loads cleanly');
    assert.deepEqual([...win.TrureI18n.SUPPORTED],['zh','en'],'strictly bilingual zh/en (no Japanese)');
    assert.equal(doc.querySelector('[data-lang-btn="ja"]'),null,'Japanese toggle button removed');

    const hasHan=s=>/[\u4e00-\u9fff]/.test(String(s||''));

    // 1. Switch to English and assert comprehensive translation across HUD, tooltips, panels, log, drawer, and lens
    doc.querySelector('[data-lang-btn="en"]').click();
    assert.equal(doc.documentElement.lang,'en');
    assert.equal(doc.querySelector('[data-layer="galaxy"]').textContent,'Cosmos');
    assert.equal(doc.querySelector('[data-look="matrix"] span').textContent,'Matrix');
    assert.equal(win.TrureI18n.deptLabel('research'),'Math Research');
    assert.equal(win.TrureI18n.galaxyName({name:'Combinatorics',zh:'组合数学'}),'Combinatorics');

    // Tooltips translated via data-i18n-title
    for(const sel of ['#hud-zen-toggle','#motion-toggle','#realm-pill','#sonar-pulse-btn','#cinema-director-btn','#genesis-scrub-btn','#replay-intro-btn','[data-branch-department="review"]','[data-branch-department="studio"]']){
      const el=doc.querySelector(sel);
      assert.ok(el?.getAttribute('title'),`${sel} has title`);
      assert.equal(hasHan(el.getAttribute('title')),false,`${sel} title has no leaked Chinese: ${el.getAttribute('title')}`);
    }

    // Dynamic panels, ticker, follow control, hover hint, log wall, and humanTitle
    assert.equal(hasHan(doc.querySelector('#department-title').textContent),false,'department title is English');
    assert.equal(hasHan(doc.querySelector('#department-responsibility').textContent),false,'department responsibility is English');
    assert.equal(hasHan(doc.querySelector('#department-work-title').textContent),false,'department work heading is English');
    assert.equal(hasHan(doc.querySelector('#department-connections').textContent),false,'department connections are English');
    assert.equal(hasHan(doc.querySelector('#ticker-text').textContent),false,'ticker text is English');
    assert.equal(hasHan(doc.querySelector('#ticker-time').textContent),false,'ticker time is English');
    assert.equal(hasHan(doc.querySelector('#follow-live span').textContent),false,'follow label is English');
    assert.equal(hasHan(doc.querySelector('#hive-hover-hint').textContent),false,'hover hint is English');
    assert.equal(hasHan(doc.querySelector('#log-rate-badge').textContent),false,'log rate badge is English');
    assert.equal(hasHan(doc.querySelector('#scifi-log-stream').textContent),false,'log stream rows rebuilt in English');
    assert.equal(win.humanTitle('Bound weighted close pairs on cyclic band with positive Fejer weights'),'Bound weighted close pairs on cyclic band with positive Fejer weights','English titles are not rewritten to Chinese in EN mode');
    assert.equal(win.humanTitle('检验研究提交'),'Verify Research PR','generic Chinese automation labels translate cleanly in EN mode');

    // Open telemetry drawer tabs in EN
    doc.querySelector('[data-dock-tab="live-ops"]').click();
    assert.equal(hasHan(doc.querySelector('#dock-drawer-title').textContent),false,'drawer header is English');
    assert.equal(hasHan(doc.querySelector('#checker-summary').textContent),false,'checker summary is English');
    assert.equal(hasHan(doc.querySelector('#relay-summary').textContent),false,'relay summary is English');
    assert.equal(hasHan(doc.querySelector('#live-feed-meta').textContent),false,'live feed meta is English');

    // Open department interior lens in EN
    doc.querySelector('#open-lens-button').click();
    assert.equal(hasHan(doc.querySelector('#lens-title').textContent),false,'lens title is English');
    assert.equal(hasHan(doc.querySelector('#lens-responsibility').textContent),false,'lens responsibility is English');
    assert.equal(hasHan(doc.querySelector('#lens-input').textContent),false,'lens input is English');
    assert.equal(hasHan(doc.querySelector('#lens-output').textContent),false,'lens output is English');
    assert.equal(hasHan(doc.querySelector('#lens-spotlight').textContent),false,'lens spotlight is English');
    doc.querySelector('#lens-back').click();

    // Galaxy node info in EN
    const gInfo=win.galaxyNodeInfo(
      {kind:'star',idx:0,cid:0},
      {source_commit:'a'.repeat(40),stars:[['D5/S0/Example','Sample Hub Theorem','Summary text.','hub',4,12,3,5,[],[]]]},
      [{id:0,name:'Combinatorics',zh:'组合数学'}]
    );
    assert.equal(gInfo.badge,'Hub Theorem');
    assert.equal(hasHan(gInfo.meta.join(' · ')),false,'galaxy node meta is English');

    // Switch back to Chinese cleanly (state.follow is false after opening lens -> 已固定视角)
    doc.querySelector('[data-lang-btn="zh"]').click();
    assert.equal(doc.documentElement.lang,'zh-CN');
    assert.equal(doc.querySelector('[data-look="light"] span').textContent,'曜白');
    assert.equal(doc.querySelector('#follow-live span').textContent,'已固定视角');

    // 2. Three distinct themes (holo / matrix / light) + legacy blueprint alias
    doc.querySelector('[data-look="matrix"]').click();
    assert.equal(doc.documentElement.dataset.look,'matrix');
    doc.querySelector('[data-look="light"]').click();
    assert.equal(doc.documentElement.dataset.theme,'light');
    win.applyLook('blueprint');
    assert.equal(doc.documentElement.dataset.look,'matrix','legacy blueprint aliases cleanly to Matrix');
    doc.querySelector('[data-look="holo"]').click();
    assert.equal(doc.documentElement.dataset.look,undefined);

    // 3. Layer switching sets data-layer across galaxy / station / mix
    doc.querySelector('[data-layer="galaxy"]').click();
    assert.equal(doc.querySelector('#research-room').dataset.layer,'galaxy');
    doc.querySelector('[data-layer="station"]').click();
    assert.equal(doc.querySelector('#research-room').dataset.layer,'station');
    doc.querySelector('[data-layer="mix"]').click();
    assert.equal(doc.querySelector('#research-room').dataset.layer,'mix');
  }finally{dom.window.close();}
});

test('a click on a galaxy in the panorama opens it, even over its lanterns and away from its centre',async()=>{
  const {dom,win}=await boot();try{
    const projected=new win.Map([[0,{x:500,y:300,lx:500,ly:270,cl:{id:0}}],[2,{x:900,y:300,lx:900,ly:270,cl:{id:2}}]]);
    const band=[];for(let x=380;x<=620;x+=12)band.push([x,300+((x/12)%3)*6]);
    const footprints=new win.Map([[0,{x0:380,x1:620,y0:290,y1:312,pts:band}]]);
    assert.equal(win.galaxyHitAt(505,302,projected,footprints)?.cl.id,0,'the centre opens the galaxy');
    assert.equal(win.galaxyHitAt(608,306,projected,footprints)?.cl.id,0,'so do its stars away from the centre');
    assert.equal(win.galaxyHitAt(700,300,projected,footprints),null,'empty sky between galaxies does not');
    assert.equal(win.galaxyHitAt(612,420,projected,footprints),null,'nor space beside the band');
    assert.equal(win.galaxyHitAt(880,300,projected,footprints)?.cl.id,2,'the nearest galaxy wins');
    assert.equal(win.skyClickTarget(false,true,true),'galaxy','in the panorama a galaxy is opened rather than a lantern inside it');
    assert.equal(win.skyClickTarget(true,true,true),'lantern','inside an opened galaxy its lanterns can be read');
    assert.equal(win.skyClickTarget(false,false,true),'galaxy','in the panorama a lantern opens the galaxy it belongs to');
    assert.equal(win.skyClickTarget(false,true,false),'galaxy');
    assert.equal(win.skyClickTarget(false,false,false),null);
  }finally{dom.window.close();}
});

test('a click acts on the galaxy the hover hint just named',async()=>{
  const {dom,win}=await boot();try{
    const rec={cid:6,x:540,y:270,t:1000};
    assert.equal(win.hoveredGalaxyAt(rec,541,271,1800),6,'the galaxy named under a still pointer is the one clicked');
    assert.equal(win.hoveredGalaxyAt(rec,560,270,1800),null,'not after the pointer moved');
    assert.equal(win.hoveredGalaxyAt(rec,540,270,3500),null,'not long after the hint');
    assert.equal(win.hoveredGalaxyAt(null,540,270,1200),null);
  }finally{dom.window.close();}
});

test('a clicked popup opens beside the pointer where it hides the least',async()=>{
  const {dom,win}=await boot();try{
    const bounds={left:0,top:0,right:1200,bottom:800},size={w:300,h:180},gap=18;
    const covers=(p,x,y,r=0)=>x>=p.left-r&&x<=p.left+size.w+r&&y>=p.top-r&&y<=p.top+size.h+r;
    const free=win.placePopupNear({x:500,y:400},size,bounds,[],gap);
    assert.ok(!covers(free,500,400,8),'the pointer and what it clicked stay visible');
    const reach=p=>Math.hypot(Math.max(p.left-500,0,500-(p.left+size.w)),Math.max(p.top-400,0,400-(p.top+size.h)));
    assert.ok(reach(free)<=gap+1,'with nothing in the way it sits right beside the pointer');
    const edge=win.placePopupNear({x:1150,y:400},size,bounds,[],gap);
    assert.ok(edge.left+size.w<=1150,'near the right edge it opens to the left');
    assert.ok(edge.left>=0&&edge.top>=0&&edge.top+size.h<=800,'it stays on the stage');
    const crowd=[];for(let i=0;i<12;i++)crowd.push({x:560+i*18,y:330+(i%5)*30,r:6,weight:4});
    const aside=win.placePopupNear({x:500,y:400},size,bounds,crowd,gap);
    assert.ok(crowd.every(o=>!covers(aside,o.x,o.y)),'it avoids the connections and labels beside the pointer');
    assert.ok(reach(aside)<=gap+1,'and still sits next to the pointer');
    const boxed=[];for(const dx of [-200,0,200])for(const dy of [-150,0,150])if(dx||dy)boxed.push({x:500+dx,y:400+dy,r:40,weight:1});
    boxed.push({x:500+170,y:400,r:60,weight:50});
    const least=win.placePopupNear({x:500,y:400},size,bounds,boxed,gap);
    assert.ok(!covers(least,670,400,0),'when something must be covered it is the least important');
  }finally{dom.window.close();}
});

test('Nyx text turns and voice tools read the dashboard as the visitor changes panels', async () => {
  const {dom, win, doc} = await boot();
  try {
    win.structuredClone = structuredClone;
    win.AbortController = AbortController;
    const widget = doc.querySelector('nyx-assistant');
    const scriptUrl = new URL([...doc.scripts].find(s => s.src.includes('nyx-widget.js')).src);
    win.eval(await readFile(new URL('../site' + scriptUrl.pathname, import.meta.url), 'utf8'));
    let turn;
    widget.bind({request: async (service, path, init) => {
      assert.equal(service, 'llm-nyx');
      assert.equal(path.join('/'), 'v1/responses');
      turn = JSON.parse(JSON.parse(init.body).input);
      return Response.json({ id: 'r1', conversation: {id: 'c1'}, status: 'completed',
        output: [{type: 'message', role: 'assistant', content: [{type: 'output_text', text: 'ok'}]}] });
    }});
    await widget.host.send('当前有什么在研课题？');
    const title = doc.querySelector('.question-title').textContent;
    assert.ok(turn.context.researchQuestions.includes(title));
    assert.equal(turn.context.observedAt, stamp);
    assert.equal(turn.context.liveStatus, 'current');
    assert.equal(turn.context.mode, 'organization');
    assert.ok(turn.tools.some(tool => tool.name === 'read_view'));

    // Realtime voice captures this binding once and reads it throughout the call.
    const voice = widget.host.captureTools();
    const show = target => voice.invoke('show_scene', {target}, new AbortController().signal);
    assert.equal((await show('unregistered')).ok, false);
    const station = await show('station');
    assert.equal(station.value.mainView.layer, 'station');
    assert.equal(station.value.mainView.station.find(d => d.target === 'department:research').model, 'wireframe polyhedron');
    const sky = await show('starfield');
    assert.equal(sky.value.mainView.layer, 'galaxy');
    assert.equal(doc.querySelector('[data-layer="galaxy"]').getAttribute('aria-pressed'), 'true');
    assert.equal((await show('department:verification')).ok, true);
    assert.equal(doc.querySelector('#department-lens').hidden, false);
    assert.equal(doc.querySelector('#lens-title').textContent, '形式验证');
    assert.equal((await show('questions')).ok, true);
    assert.equal((await show('questions')).ok, true);
    assert.equal(doc.querySelector('[data-dock-tab="questions"]').getAttribute('aria-selected'), 'true');
    assert.equal((await show('overview')).ok, true);
    assert.equal(doc.querySelector('#department-lens').hidden, true);
    assert.ok(!doc.querySelector('#telemetry-dock').classList.contains('is-open'));
    doc.querySelector('[data-dock-tab="publications"]').click();
    const page = voice.context();
    assert.equal(page.currentPanel.section, 'publications');
    const read = await voice.invoke('read_view', {section: 'publications'}, new AbortController().signal);
    assert.equal(read.ok, true);
    assert.ok(read.value.items.some(row => row.text.includes(doc.querySelector('.paper-title').textContent) &&
      row.sources.includes(doc.querySelector('.paper-title').href)));
    doc.querySelector('#dock-close-btn').click();
    doc.querySelector('.question-title').click();
    assert.equal(voice.context().journeyTitle, doc.querySelector('#journey-title').textContent);
    assert.equal(voice.context().mode, 'journey');
  } finally { dom.window.close(); }
});

test('tour digests coalesce new arrivals and page stable records only while the tour is active', async () => {
  const {dom, win, doc, responses, tick} = await boot();
  try {
    const widget = doc.querySelector('nyx-assistant');
    let now = 0, observed = Date.now();
    win.performance.now = () => now;
    const publish = async rows => {
      const at = new Date(++observed).toISOString();
      responses.live.organization.observed_at = at;
      responses.live.organization.recent = rows;
      await tick(8000);
    };
    const make = (id, department = 'research', kind = 'task') =>
      activity(id, department, kind, {at: new Date(observed).toISOString(), label: 'Exact title ' + id});
    await publish([make('before-tour')]);
    const active = new AbortController();
    const digest = widget.tourBriefings(active.signal);
    now = 180000;
    assert.equal(digest(), undefined);
    const burst = Array.from({length: 50}, (_, i) => make('item-' + i));
    burst.push(make('review', 'review'), make('check', 'review', 'automation'), make('book', 'books'));
    await publish([...burst, burst[0]]);
    const summary = digest();
    assert.equal(summary, 'batch=B1 research=0 frozen=0 work=50 reviews=1 checks=1 publishing=1');
    assert.equal(digest(), undefined);
    win.structuredClone = structuredClone;
    win.AbortController = AbortController;
    win.eval(await readFile(new URL('../site/assets/nyx-widget.js', import.meta.url), 'utf8'));
    widget.bind({request: () => assert.fail('unexpected service request')});
    const voice = widget.host.captureTools();
    const read = (batch, offset) => voice.invoke('read_event_batch', {batch, offset}, active.signal);
    const page = (await read('B1', 0)).value;
    assert.equal(page.total, 53);
    assert.equal(page.retained, 48);
    assert.equal(page.items.length, 3);
    assert.equal(page.nextOffset, 3);
    assert.equal(page.items[0].title, 'Exact title item-0');
    assert.match(page.items[0].source, /^https:/);
    await publish([make('later'), ...burst]);
    assert.equal((await read('B1', 3)).value.items[0].title, 'Exact title item-3');
    assert.equal((await read('B1', 45)).value.nextOffset, null);
    now += 179999;
    assert.equal(digest(), undefined);
    now++;
    assert.equal(digest(), 'batch=B2 research=0 frozen=0 work=1 reviews=0 checks=0 publishing=0');
    for (const id of ['third', 'fourth']) {
      await publish([make(id)]);
      now += 180000;
      assert.ok(digest());
    }
    assert.equal((await read('B1', 0)).ok, false);
    assert.equal((await read('B2', 0)).ok, true);
    await publish([make('unsent')]);
    active.abort();
    await publish([make('paused')]);
    now += 180000;
    assert.equal(digest(), undefined);
    const resumed = new AbortController();
    const nextDigest = widget.tourBriefings(resumed.signal);
    assert.equal((await voice.invoke('read_event_batch', {batch:'B4'}, resumed.signal)).ok, false);
    now += 180000;
    assert.equal(nextDigest(), undefined);
    resumed.abort();
  } finally { dom.window.close(); }
});

test('sky tools distinguish release data, sampled dependency directions, freezes and lanterns', async () => {
  const atlas = JSON.parse(await readFile(new URL('../site/data/truth-nebula.v1.json', import.meta.url)));
  const details = JSON.parse(await readFile(new URL('../site/data/truth-nebula-details.v1.json', import.meta.url)));
  const feed = live();
  const frozen = {module: 'D5/S2/Quantum/Example', domain: 'Quantum', commit: details.source_commit, at: stamp};
  feed.truth_growth = {events: [frozen, {...frozen, module:'Demo', preview:true}]};
  const ledger = JSON.parse(await readFile(new URL('../site/data/conjectures.json', import.meta.url)));
  const {dom, win, doc} = await boot({live:feed, reduced:true, conjectures:ledger});
  try {
    win.structuredClone = structuredClone;
    win.AbortController = AbortController;
    Object.defineProperty(win.navigator, 'userAgent', {value:'sky-tool-test'});
    let mismatch = true, detailReads = 0;
    win.fetch = async url => {
      if (String(url).includes('nebula-details')) {
        detailReads++;
        return Response.json(mismatch ? {...details, truth_release_digest:'wrong-release'} : details);
      }
      assert.match(String(url), /truth-nebula\.v1\.json/);
      return Response.json(atlas);
    };
    const widget = doc.querySelector('nyx-assistant');
    win.eval(await readFile(new URL('../site/assets/nyx-widget.js', import.meta.url), 'utf8'));
    widget.bind({request: () => assert.fail('unexpected service request')});
    const voice = widget.host.captureTools();
    const invoke = (name, args) => voice.invoke(name, args, new AbortController().signal);
    const sky = (section, args = {}) => invoke('read_starfield', {section, ...args});
    const overview = (await sky('overview')).value;
    assert.equal(overview.releaseModules, atlas.counts.truth_nodes);
    assert.equal(overview.inspectableSample, atlas.stars.length);
    assert.equal(overview.domains.find(c => c.name === 'Other').target, null);
    assert.equal(overview.moduleDetailsStatus, 'failed');
    assert.equal(overview.exampleDependency, undefined);
    assert.ok(overview.exampleBundle.prerequisitesFromTo > 0);
    assert.equal((await sky('modules')).ok, false);
    const attemptsBeforeRecovery = detailReads;
    mismatch = false;
    const idx = details.stars.findIndex((r,i) => atlas.stars[i][3] === 0 && r[8].length && r[9].length);
    const row = details.stars[idx];
    const [list, record] = await Promise.all([sky('modules', {domainId:0, query:row[0]}), invoke('read_star_module', {module:row[0]})]);
    assert.equal(detailReads, attemptsBeforeRecovery + 1);
    const generic = (await invoke('read_view', {section:'starfield'})).value;
    const scene = (await invoke('show_scene', {target:'starfield'})).value.mainView.starfield;
    assert.deepEqual(scene.exampleDependency, generic.exampleDependency);
    assert.deepEqual(scene.exampleBundle, generic.exampleBundle);
    assert.deepEqual(structuredClone(voice.context().mainView.starfield.exampleDependency), structuredClone(generic.exampleDependency));
    const {prerequisite, dependent} = generic.exampleDependency;
    const findIndex = ref => details.stars.findIndex(row => row[0] === ref.module);
    assert.ok(atlas.edges.some(([u, v]) => u === findIndex(prerequisite) && v === findIndex(dependent)));
    for (const ref of [prerequisite, dependent]) {
      const selected = await invoke('show_scene', {target:ref.target});
      assert.ok(selected.ok && !doc.querySelector('#galaxy-node-card').hidden);
      assert.equal(selected.value.title, ref.title);
    }
    assert.equal(list.value.items[0].module, row[0]);
    assert.equal(record.value.theoremCount, row[5]);
    assert.equal(record.value.sampledPrerequisites[0].module, details.stars[row[8][0]][0]);
    assert.equal(record.value.sampledDependents[0].module, details.stars[row[9][0]][0]);
    assert.ok(record.value.source.endsWith('/' + details.source_commit + '/' + row[0] + '.lean'));
    const opened = await invoke('show_scene', {target:record.value.target});
    assert.equal(opened.ok, true, JSON.stringify(opened));
    assert.equal(doc.querySelector('#galaxy-node-card').hidden, false);
    assert.ok(doc.querySelector('#galaxy-node-card').textContent.includes(row[1]));
    const first = (await sky('modules', {query:'hub'})).value;
    assert.equal(first.items.length, 4);
    assert.ok(first.items.every(r => r.role === 'hub' || /hub/i.test(r.module + r.title)));
    assert.notEqual((await sky('modules', {query:'hub', offset:first.nextOffset})).value.items[0].module, first.items[0].module);
    const connected = (await sky('modules', {domainId:0, connected:true})).value;
    assert.equal(connected.items.length, 4);
    for (const star of connected.items) {
      const linked = (await invoke('read_star_module', {module:star.module})).value;
      assert.ok(star.target && [...linked.sampledPrerequisites, ...linked.sampledDependents].some(other => other.target));
    }
    const link = atlas.cluster_links[0];
    const bundle = (await sky('bundles')).value.items[0];
    assert.equal(bundle.prerequisitesFromTo, link[2]);
    assert.equal(bundle.prerequisitesToFrom, link[3]);
    assert.equal((await invoke('show_scene', {target:bundle.target})).value.opened, bundle.target);
    const card = doc.querySelector('#galaxy-node-card');
    assert.ok(!card.hidden && card.textContent.includes('(' + link[2] + ')') && card.textContent.includes('(' + link[3] + ')'));
    assert.equal((await invoke('show_scene', {target:'bundle:missing'})).ok, false);
    const lanterns = (await sky('lanterns')).value;
    const lantern = lanterns.items.find(r => r.provenance === 'curated ledger');
    assert.ok(lantern);
    const openedLantern = await invoke('show_scene', {target:lantern.target});
    assert.equal(openedLantern.value.verdict, lantern.verdict);
    assert.ok(doc.querySelector('#galaxy-node-card').textContent.includes(lantern.title));
    const growth = (await sky('growth')).value;
    assert.equal(growth.total, 1);
    assert.equal(growth.items[0].module, frozen.module);
    assert.equal((await sky('modules', {domainId:999})).ok, false);
    assert.equal((await invoke('read_star_module', {module:'missing'})).ok, false);
    assert.equal((await invoke('show_scene', {target:'module:missing'})).ok, false);
  } finally { dom.window.close(); }
});

test('the guide can find a sourced research change in a busy batch and receive a growth-only update', async () => {
  const at = new Date().toISOString();
  const record = module => ({module, domain:'Quantum', at, commit:'a'.repeat(40)});
  const stream = live();
  stream.truth_growth = {head:'old', events:[record('D5/S2/Quantum/Earlier')]};
  const {dom, win, doc, responses, tick} = await boot({live:stream});
  try {
    win.structuredClone = structuredClone;
    win.AbortController = AbortController;
    win.eval(await readFile(new URL('../site/assets/nyx-widget.js', import.meta.url), 'utf8'));
    const widget = doc.querySelector('nyx-assistant');
    widget.bind({request: () => assert.fail('unexpected service request')});
    const tools = widget.host.captureTools(), active = new AbortController();
    const read = batch => tools.invoke('read_event_batch', {batch}, active.signal);
    let now = 0;
    win.performance.now = () => now;
    const digest = widget.tourBriefings(active.signal);
    const incoming = Array.from({length:55}, (_,i)=>activity('run-'+i, 'verification', 'automation', {at}));
    const change = activity('quaternion', 'research', 'contribution', {status:'merged', at,
      label:'Prove the oriented axis identity for quaternion maps', summary:'The result assumes integer quaternions.'});
    incoming.push({...change, id:'unmerged', status:'open'}, change);
    responses.live.organization.recent = incoming;
    responses.live.observed_at = responses.live.organization.observed_at = new Date(Date.now()+1000).toISOString();
    await tick(8000);
    now = 180000;
    assert.equal(digest(),'batch=B1 research=1 frozen=0 work=1 reviews=0 checks=55 publishing=0');
    const first = (await read('B1')).value;
    assert.equal(first.total, 57);
    assert.equal(first.retained, 48);
    assert.equal(first.items[0].title, change.label);
    assert.equal(first.items[0].summary, change.summary);
    assert.equal(first.items[0].source, change.url);
    const frozen = record('D5/S2/Quantum/NewModule');
    responses.live.truth_growth = {head:'new', events:[...stream.truth_growth.events, frozen, frozen,
      {...record('demo'), preview:true}, {...record('old-update'), at:'2020-01-01T00:00:00Z'}]};
    await tick(8000);
    now += 180000;
    assert.equal(digest(),'batch=B2 research=0 frozen=1 work=0 reviews=0 checks=0 publishing=0');
    const second = (await read('B2')).value;
    assert.equal(second.items[0].module,frozen.module);
    assert.ok(second.items[0].source.endsWith('/'+frozen.commit+'/'+frozen.module+'.lean'));
    await tick(8000);
    now += 180000;
    assert.equal(digest(), undefined);
    active.abort();
  } finally { dom.window.close(); }
});
