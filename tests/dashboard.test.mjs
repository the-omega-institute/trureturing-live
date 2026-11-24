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
