const $ = selector => document.querySelector(selector);
const ns = 'http://www.w3.org/2000/svg';
const liveURL = 'https://trureturing-live-reader.vercel.app/api/live';
const cacheKey = 'trureturing-live.hive.content.v2';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {snapshot:null,stream:null,selected:'research',focused:null,mode:'organization',follow:true,quiet:reduced,filter:'all',limit:9,topic:null,cells:new Map(),seen:new Set(),animated:new Set(),arrivals:[],snapshotBusy:false,liveBusy:false};
const positions = {direction:[48,49],research:[20,25],review:[46,14],verification:[74,25],books:[80,57],publication:[58,82],outreach:[31,82],studio:[16,54]};
const execution = {human:'人的方向与判断',sessions:'独立研究会话',actions:'Actions 自动引擎',mixed:'会话与自动化协作'};
const methodByDepartment = {
  direction:['人的方向','问题与判断','数学攻坚'],
  research:['数学攻坚','问题与公开认领','可检验的论证'],
  review:['独立评审','待复核的论证','修订意见'],
  verification:['形式验证','研究提交与 CI','通过或需要修订的检查'],
  books:['理论书写','已检验的研究','可继续阅读的章节'],
  publication:['论文与知识','研究结果','公开的论证与索引'],
  outreach:['学术交流','研究说明','新的问题与讨论'],
  studio:['工具与表达','研究需要的工具','可复用的表达与出版']
};
const glyphPaths = {
  direction:['M12 3v18M3 12h18','m7 7 5-4 5 4M7 17l5 4 5-4'],
  research:['M17 4H6l7 8-7 8h11'],
  review:['M3 8h17m-4-4 4 4-4 4M21 16H4m4-4-4 4 4 4'],
  verification:['m5 12 4 4L19 6','M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9'],
  books:['M12 6C8 3 4 4 3 5v14c3-2 6-1 9 1 3-2 6-3 9-1V5c-3-2-6-1-9 1Z','M12 6v14'],
  publication:['M6 3h9l4 4v14H6Z','M14 3v5h5M9 12h7M9 16h5'],
  outreach:['M4 5h16v12H9l-5 4V5Z','M8 9h8M8 13h5'],
  studio:['M5 4v16M12 4v16M19 4v16','M2 8h6M9 16h6M16 10h6']
};
const timestamp = value => Date.parse(value);
const relative = value => {
  const n = Math.max(0,(Date.now()-timestamp(value))/1000);
  return !Number.isFinite(n)?'近期':n<60?'刚刚':n<3600?`${Math.floor(n/60)} 分钟前`:n<86400?`${Math.floor(n/3600)} 小时前`:`${Math.floor(n/86400)} 天前`;
};
const element = (tag,text='',className='') => {const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
const safeURL = value => {try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'#';}catch{return '#';}};
function external(label,url,className=''){const el=element('a',label,className);el.href=safeURL(url);el.target='_blank';el.rel='noopener noreferrer';return el;}
const view = () => state.stream?.organization;
const departments = () => view()?.departments||[];
const department = id => departments().find(d=>d.id===id);
const activities = () => departments().flatMap(d=>d.activities);
const key = ref => ref?`${ref.repository}#${ref.number}`:'';
const editorialKey = ref => ref?`${ref.repository.split('/').at(-1)}#${ref.number}`:'';
const eventKey = a => `${a.id}/${a.status}/${a.at}`;
const isStale = () => !view()||Date.now()-timestamp(view().observed_at)>180000;
const fresh = a => Boolean(a.fresh&&!isStale());
const active = a => fresh(a)&&['working','waiting'].includes(a.status)&&['automation','session'].includes(a.kind);
const sourceLabel = a => view()?.sources.find(s=>s.id===a.source)?.label||'研究有了新的进展';
const technical = /\b(?:audit|cache|runner|workflow|roster|stratalint|lint|heartbeat|registration|worktree|bootstrap|toolchain|CI|template)\b|four-slot|compilation|protected judge|trusted judge|judge reuse|current dev|tools preview|Adopt tested tools|编译判官|禁止流水账|流水线|缓存|工具接入|审计|登记|加载器|合并规则/i;
const cleanTitle = text => String(text||'').replace(/^(?:research|math|docs|feat|fix|chore|refactor)(?:\([^)]*\))?\s*[:：]\s*/i,'').replace(/^(?:Research (?:unit|line)(?:\s*\([^)]*\))?|Open problem\s*\(preregistration\))\s*[:—-]\s*/i,'').replace(/\b[a-f0-9]{12,64}\b/gi,'').replace(/[\r\n]+/g,' ').trim();
function humanTitle(value){
  const text=cleanTitle(value);
  const patterns=[
    [/diffuse.*(?:uniform|sinc).*Euclidean/i,'分散的扰动，能否只付出欧氏尺度的误差？'],
    [/exact.*(?:marginal.*rank|rank.*marginal)|marginal.rank.*overlap/i,'相邻态的重叠，怎样决定边缘态的秩？'],
    [/closed.window.*(?:Gaussian|mass)|Gaussian.*closed.window/i,'用带相位的高斯核，约束窗口中的质量'],
    [/Fibonacci.*(?:divergence|qubit)|qubit.*Fibonacci/i,'斐波那契量子态，具有怎样的散度与界？'],
    [/primitive.?root|素数原根/i,'寻找更小的素数原根'],
    [/legal.growth|compactness|紧致/i,'无限生长的过程，何时具有紧致性？'],
    [/countably|countable.*(?:interval|test)|可数.*检验/i,'让可数多个检验，共享一次频谱扰动'],
    [/spectral.*(?:order|count)|preserve.*count|频谱.*计数/i,'微调频率，能保住原来的计数规律吗？'],
    [/near.collision|weighted.*collision|近碰撞/i,'怎样控制频谱中的近碰撞？'],
    [/spectr|fourier|频谱|傅里叶/i,'寻找彼此相容的频谱与误差估计'],
    [/ternary|Steiner|Latin|internal.extension|三元.*扩展/i,'三元结构的扩展，哪些规模能达到？'],
    [/stretch|gain.reconstruction|拉伸|增益重构/i,'图的结构，怎样决定重构误差？'],
    [/recognition.depth|识别深度/i,'识别深度何时会稳定下来？'],
    [/theta|Bilgici|θ.*分解/i,'用 θ 函数的分解，寻找新的结构'],
    [/Kraus|entang|quantum|量子|纠缠/i,'量子态、纠缠与误差之间的联系'],
    [/entropy|deletion|insertion|delete|删除|窗口/i,'删除与重构，怎样改变信息？'],
    [/Möbius|Moebius|mobius|multicolor/i,'从有限结构，计算 Möbius 多项式'],
    [/matroid|graph|cube|sphere|图论|立方|球面/i,'图与几何中的结构问题'],
    [/cubic|Frobenius|polynomial|BMV|多项式/i,'多项式与代数结构中的新线索']
  ];
  return patterns.find(([test])=>test.test(text))?.[1]||text||'从一个问题，继续推进论证';
}
function copyFor(a){
  const copies=state.snapshot?.editorial?.questions||{};
  const direct=copies[editorialKey(a.task)];if(direct)return {...direct,canonical:key(a.task)};
  const refs=(a.references||[]).filter(ref=>ref.repository===a.task?.repository);
  const match=refs.find(ref=>copies[editorialKey(ref)]);
  if(match)return {...copies[editorialKey(match)],canonical:key(match)};
  const book=a.department==='books',title=humanTitle(a.label);
  const text=String(a.label||'');
  const area=book?'理论书写':/prime|arith|原根|素数/i.test(text)?'数论':/quantum|Kraus|量子|纠缠/i.test(text)?'量子信息':/graph|matroid|ternary|Steiner|Latin|图|三元|cube/i.test(text)?'组合与几何':/spectr|fourier|compact|频谱|紧致/i.test(text)?'分析与结构':'数学研究';
  return {title,area,question:book?'把新的构造与论证整理成书稿，让后来的研究可以接着往前。':'围绕这个问题，寻找新的构造、证明与可以共同讨论的下一步。',canonical:key(a.task)};
}
function phase(a){
  if(a.kind==='automation')return ({working:fresh(a)?'正在执行':'稍早正在执行',waiting:fresh(a)?'等待执行':'稍早等待执行',succeeded:'本轮执行完成',failed:'继续处理这一轮',cancelled:'本轮已结束',closed:'本轮已结束',unknown:'等待新的进展'})[a.status]||'最近的执行进展';
  if(a.kind==='session')return ({working:fresh(a)?'正在推进':'等待新的进展',waiting:'等待下一步',succeeded:'这一轮已完成',failed:'继续处理',cancelled:'这一轮已结束',ready:'准备继续',unknown:'等待新的进展'})[a.status]||'研究会话';
  if(a.status==='merged')return a.department==='books'?'已汇入书稿':'新论证已汇入';
  if(a.status==='closed')return '这一段探索已结束';
  if(a.status==='claimed')return '已接下这项工作';
  if(a.kind==='review')return '继续复核论证';
  if(a.kind==='discussion')return '交换思路';
  if(a.kind==='task')return '问题已经提出';
  return a.department==='books'?'正在完善书稿':'正在推进论证';
}
function messageFor(a){
  if(!a.task)return null;
  return (state.stream?.messages||[]).find(m=>m.url===a.url)||null;
}
function progress(a){
  if(a.kind==='automation')return {title:sourceLabel(a),summary:a.department==='outreach'?'协调交流工作，让研究走向更广的讨论。':a.department==='books'?'把书稿中的新内容，接到持续构建与出版的流程。':a.department==='publication'?'让已有的研究，出现在可以阅读与继续探索的地方。':'研究提交正在经过项目已有的共同检验。'};
  const message=messageFor(a),text=message?.text||'';
  if(a.kind==='review'||message?.kind==='review_comment')return {title:'提出了论证的复核意见',summary:'回到问题、条件与结论之间，检查还有哪些细节需要补充。'};
  if(/^(?:本轮)?认领|^I(?: am|'m) taking|^Claimed\b/i.test(text))return {title:'接下了这条研究线索',summary:'沿着已有问题，开始推进下一部分论证。'};
  if(/sharp.*(?:relative|bound)|Refine.*(?:count|discrepancy)|更紧|锐.*估计/i.test(text))return {title:'提议把估计再推进一步',summary:'从已有结论出发，尝试更精确的控制与更清楚的边界。'};
  if(/counterexample|反例|boundary|边界/i.test(text))return {title:'继续考察边界与反例',summary:'从具体情形出发，寻找需要补充的条件。'};
  if(/independent.*review|review.*passes|独立.*评审|评审.*意见/i.test(text))return {title:'更新了独立复核的讨论',summary:'围绕已有论证，继续交换检查与修订的意见。'};
  if(a.kind==='discussion')return {title:a.department==='books'?'继续讨论这一部分书稿':'补充了新的研究进展',summary:copyFor(a).title};
  return {title:copyFor(a).title,summary:copyFor(a).question};
}
function person(actor){
  const label=actor.kind==='agent'&&actor.tool?`${actor.tool} · ${actor.label}`:actor.label||actor.id;
  const el=element('span','','person'+(actor.kind==='agent'?' agent':''));
  const mark=element('span',label.slice(0,1).toUpperCase(),'person-mark');mark.setAttribute('aria-hidden','true');el.append(mark,document.createTextNode(label));return el;
}
function peopleFor(items){const people=new Map();for(const a of items)if(a.actor)people.set(`${a.actor.kind}:${a.actor.id}`,a.actor);return [...people.values()];}
function actorLabel(actor){return actor?.kind==='agent'&&actor.tool?`${actor.tool} · ${actor.label||actor.id}`:actor?.label||actor?.id||'公开账号';}
function actorTasks(d,actor){return d.activities.filter(a=>a.actor?.id===actor.id&&a.actor?.kind===actor.kind).sort((a,b)=>Number(active(b))-Number(active(a))||timestamp(b.at)-timestamp(a.at));}
function publicSeatCount(d){const keys=new Set((d.participants||[]).map(actor=>`${actor.kind}:${actor.id}`));for(const a of d.activities)if(a.actor)keys.add(`${a.actor.kind}:${a.actor.id}`);return keys.size;}
function actorTaskTitle(a,d){
  if(a.kind==='automation')return sourceLabel(a);
  if(a.task&&['research','books'].includes(d.id))return copyFor(a).title;
  if(a.task)return sourceLabel(a);
  return progress(a).title;
}
function renderAgentRoster(d){
  const container=$('#department-agents');if(!container)return;
  const actors=new Map((d.participants||[]).map(actor=>[`${actor.kind}:${actor.id}`,actor]));
  for(const a of d.activities)if(a.actor)actors.set(`${a.actor.kind}:${a.actor.id}`,a.actor);
  const roster=[...actors.values()].sort((a,b)=>{
    const at=actorTasks(d,a),bt=actorTasks(d,b);return Number(bt.some(active))-Number(at.some(active))||timestamp(bt[0]?.at)-timestamp(at[0]?.at)||actorLabel(a).localeCompare(actorLabel(b));
  });
  $('#department-agent-count').textContent=roster.length?`${roster.length} 个公开席位`:'';
  container.replaceChildren();
  if(!roster.length){container.append(element('p','这个部门暂时没有可公开归属的工作席位。','loading'));return;}
  for(const actor of roster){
    const tasks=actorTasks(d,actor),running=tasks.filter(active),card=element('article','','agent-card');
    card.dataset.focusKey=`agent:${d.id}:${actor.kind}:${actor.id}`;
    const head=element('div','','agent-card-head'),identity=element('div','','agent-identity');identity.append(person(actor),element('span',actor.kind==='agent'?'明确标注的 agent':'公开账号','agent-kind'));head.append(identity,element('span',running.length?`${running.length} 项正在执行`:tasks.length?'最近参与':'已登记','agent-state'+(running.length?' is-running':'')));card.append(head);
    const taskList=element('div','','agent-task-list');
    for(const a of tasks.slice(0,3)){const row=a.task?element('button','','agent-task'):external('',a.url,'agent-task');if(a.task)row.type='button';row.dataset.focusKey=`agent-task:${a.id}`;row.append(element('span',phase(a),'agent-task-state'),element('strong',actorTaskTitle(a,d)),element('small',a.kind==='automation'?progress(a).summary:copyFor(a).question));if(a.task)row.addEventListener('click',()=>selectTopic(a));taskList.append(row);}
    if(!tasks.length)taskList.append(element('p','最近的公开活动将在这里出现。','agent-empty'));
    card.append(taskList);container.append(card);
  }
}
function renderDepartmentLens(d){
  const lens=$('#department-lens'),room=$('#research-room');if(!lens||!room)return;
  if(!d||state.mode!=='organization'||!state.focused){lens.hidden=true;room.classList.remove('is-department-focused');return;}
  lens.hidden=false;room.classList.add('is-department-focused');
  $('#lens-title').textContent=d.label;$('#lens-responsibility').textContent=d.responsibility;
  const method=methodByDepartment[d.id]||[d.label,'公开工作','交给下一个部门'];$('#lens-input').textContent=method[1];$('#lens-output').textContent=method[2];
  const stats=queueStats(d),freshness=view()?.observed_at?`${relative(view().observed_at)}更新`:'等待现场';$('#lens-freshness').textContent=freshness;
  const metric=(value,label,className='')=>{const item=element('div','','lens-metric'+(className?' '+className:''));item.append(element('strong',String(value)),element('span',label));return item;};
  $('#lens-metrics').replaceChildren(metric(publicSeatCount(d),'公开席位'),metric(stats.running,'正在执行','is-running'),metric(stats.label,'可见待接力',stats.waiting?'is-queued':''),metric(stats.recent,'近 24 小时记录'));
  const actors=new Map((d.participants||[]).map(actor=>[`${actor.kind}:${actor.id}`,actor]));for(const a of d.activities)if(a.actor)actors.set(`${a.actor.kind}:${a.actor.id}`,a.actor);
  const roster=[...actors.values()].sort((a,b)=>{const at=actorTasks(d,a),bt=actorTasks(d,b);return Number(bt.some(active))-Number(at.some(active))||timestamp(bt[0]?.at)-timestamp(at[0]?.at)||actorLabel(a).localeCompare(actorLabel(b));});
  const container=$('#lens-agents');container.replaceChildren();
  if(!roster.length){container.append(element('p','这个部门目前没有可公开展示的工作席位。','lens-empty'));return;}
  for(const actor of roster){
    const tasks=actorTasks(d,actor),running=tasks.filter(active),card=element('article','','lens-agent');card.dataset.focusKey=`lens-agent:${d.id}:${actor.kind}:${actor.id}`;
    const head=element('div','','lens-agent-head'),identity=element('div','','lens-agent-identity');identity.append(person(actor),element('span',actor.kind==='agent'?'明确标注的 agent':'公开账号','agent-kind'));head.append(identity,element('span',running.length?`${running.length} 项执行中`:tasks.length?'最近参与':'已登记','lens-agent-status'+(running.length?' is-running':'')));card.append(head);
    const lane=element('div','','lens-task-lane');
    if(tasks.length){for(const a of tasks.slice(0,3)){const row=a.task?element('button','','lens-task'):external('',a.url,'lens-task');if(a.task)row.type='button';row.dataset.focusKey=`lens-task:${a.id}`;const status=element('span',phase(a),'lens-task-status'+(active(a)?' is-running':''));row.append(status,element('strong',actorTaskTitle(a,d)),element('small',a.kind==='automation'?progress(a).summary:copyFor(a).question));if(a.task)row.addEventListener('click',()=>selectTopic(a));lane.append(row);}}
    else lane.append(element('p','等待新的公开工作记录。','lens-empty'));
    card.append(lane);container.append(card);
  }
}
function preserveFocus(render){const selected=document.activeElement?.dataset.focusKey;render();if(selected){const target=[...document.querySelectorAll('[data-focus-key]')].find(el=>el.dataset.focusKey===selected);target?.focus({preventScroll:true});}}
function icon(id){const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');for(const d of glyphPaths[id]||glyphPaths.research){const p=document.createElementNS(ns,'path');p.setAttribute('d',d);svg.append(p);}return svg;}
function countRunning(d){return isStale()?null:(d.running_automations||0)+(d.running_sessions||0);}
function queueStats(d){
  const waiting=d.activities.filter(a=>['waiting','queued','requested'].includes(a.status)||(a.kind==='task'&&['open','claimed'].includes(a.status))).length;
  const running=Math.max(d.activities.filter(active).length||0,(d.running_automations||0)+(d.running_sessions||0));
  const recent=d.activities.filter(a=>timestamp(a.at)>Date.now()-86400000).length;
  return {waiting,running,recent,sampled:d.activities.length>=100,label:waiting?`${waiting}${d.activities.length>=100?'+':''}`:'0'};
}
function departmentState(d){
  if(d.execution==='human')return '问题从这里出发';
  const count=countRunning(d);if(count===null)return '等待新的进展';
  const queue=queueStats(d);if(count&&queue.waiting)return `${count} 项执行 · ${queue.label} 项待接力`;
  if(count)return `${count} 项工作正在执行`;
  if(queue.waiting)return `${queue.label} 项待接力`;
  const waiting=d.activities.filter(a=>active(a)&&a.status==='waiting').length;if(waiting)return `${waiting} 项工作等待接力`;
  return d.activities.length?'新的想法持续汇入':'等待下一段探索';
}
function renderHealth(){
  const current=view();if(!current)return;
  const late=isStale();const connection=$('#connection');connection.classList.toggle('delayed',late);
  connection.lastElementChild.textContent=late?'等待新的现场更新':`${relative(current.observed_at)}更新`;
  $('#connection-note').hidden=!late;$('#connection-note').textContent='更新稍慢。你仍然可以阅读已有的研究与讨论。';
}
function renderMetrics(){
  const list=departments();if(!list.length)return;
  const running=list.reduce((n,d)=>n+(d.running_automations||0),0),sessions=list.reduce((n,d)=>n+(d.running_sessions||0),0);
  const items=[];
  const metric=(n,label,className='')=>{const el=element('span','',className);el.append(element('strong',String(n)),document.createTextNode(label));return el;};
  items.push(metric(list.length,'个部门，持续相连'));
  items.push(metric(isStale()?'—':running,'项自动化正在运转','metric-active'));
  if(sessions)items.push(metric(isStale()?'—':sessions,'个研究会话正在推进','metric-active'));
  items.push(element('span','从人的提问，到更广的学术讨论','metric-end'));
  $('#institute-metrics').replaceChildren(...items);
  const n=state.snapshot?.repositories?.length;$('#institute-scope').textContent=n?`${n} 个研究空间，共同生长`:'';
}
function createCell(d,index){
  const position=positions[d.id]||[20+(index%3)*28,23+Math.floor(index/3)*27];
  const button=element('button','','hive-cell');button.type='button';button.dataset.department=d.id;button.dataset.execution=d.execution;button.dataset.focusKey=`department:${d.id}`;
  button.style.setProperty('--x',position[0]+'%');button.style.setProperty('--y',position[1]+'%');
  const content=element('span','','cell-content'),glyph=element('span','','cell-icon'),title=element('strong',d.label,'cell-title'),status=element('span','','cell-status'),mode=element('span',d.execution==='human'?'研究院的起点':execution[d.execution],'cell-mode');glyph.append(icon(d.id));content.append(glyph,title,status,mode);button.append(content);
  button.addEventListener('click',()=>selectDepartment(d.id));
  button.addEventListener('pointerenter',()=>highlightRoutes(d.id));button.addEventListener('pointerleave',()=>highlightRoutes(state.selected));
  button.addEventListener('keydown',event=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)){event.preventDefault();const ordered=departments(),i=ordered.findIndex(x=>x.id===d.id),delta=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1,next=ordered[(i+delta+ordered.length)%ordered.length];selectDepartment(next.id);state.cells.get(next.id)?.button.focus();}});
  return {button,status,title,mode};
}
function renderHive(){
  const list=departments(),container=$('#hive-cells');if(!list.length)return;
  if(!state.cells.size)container.replaceChildren();
  list.forEach((d,i)=>{if(!state.cells.has(d.id)){const cell=createCell(d,i);state.cells.set(d.id,cell);container.append(cell.button);}const cell=state.cells.get(d.id);cell.title.textContent=d.label;cell.status.textContent=departmentState(d);cell.button.setAttribute('aria-pressed',String(d.id===state.selected));cell.button.setAttribute('aria-label',`${d.label}。${d.responsibility}。${departmentState(d)}`);cell.button.classList.toggle('is-running',Boolean(countRunning(d)));cell.button.classList.toggle('has-arrival',state.arrivals.some(a=>a.department===d.id));cell.button.classList.toggle('is-focused',Boolean(state.focused&&d.id===state.focused));cell.button.classList.toggle('is-dimmed',Boolean(state.focused&&d.id!==state.focused));});
  renderRoutes();
}
function pathBetween(from,to,bend=0){const p=positions[from],q=positions[to];if(!p||!q)return null;return `M ${p[0]} ${p[1]} Q ${(p[0]+q[0])/2+bend} ${(p[1]+q[1])/2-bend} ${q[0]} ${q[1]}`;}
function renderRoutes(){
  const svg=$('#hive-routes');svg.replaceChildren();
  for(const route of view()?.routes||[]){const d=pathBetween(route.from,route.to,route.from==='outreach'?-8:3);if(!d)continue;const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class','responsibility-route');path.dataset.from=route.from;path.dataset.to=route.to;svg.append(path);}
  const grouped=new Map();for(const relation of view()?.handoffs||[]){if(relation.kind!=='reference')continue;const identity=[relation.from,relation.to].sort().join('|');if(!grouped.has(identity))grouped.set(identity,relation);}
  for(const [identity,relation] of grouped){const d=pathBetween(relation.from,relation.to,-6);if(!d)continue;const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class','research-connection');path.dataset.from=relation.from;path.dataset.to=relation.to;svg.append(path);
    const arrival=state.arrivals.find(a=>a.id===relation.activity),animationKey=arrival&&`${identity}/${eventKey(arrival)}`;
    if(!state.quiet&&!reduced&&arrival&&!state.animated.has(animationKey)){state.animated.add(animationKey);const dot=document.createElementNS(ns,'circle');dot.setAttribute('r','.43');dot.setAttribute('class','arrival-particle');const motion=document.createElementNS(ns,'animateMotion');motion.setAttribute('dur','1.5s');motion.setAttribute('path',d);motion.setAttribute('repeatCount','1');dot.append(motion);svg.append(dot);}
  }
  highlightRoutes(state.selected);
}
function highlightRoutes(id){for(const path of document.querySelectorAll('#hive-routes path'))path.classList.toggle('selected',path.dataset.from===id||path.dataset.to===id);}
function primaryWork(d){
  const items=[...d.activities];
  if(d.execution==='human')return [];
  if(d.id==='research'||d.id==='books'){
    const work=items.filter(a=>a.kind==='session'&&active(a)||['task','contribution'].includes(a.kind)&&!technical.test(a.label)).sort((a,b)=>Number(active(b))-Number(active(a))||timestamp(b.at)-timestamp(a.at)).slice(0,3);
    const building=d.id==='books'&&items.find(a=>a.kind==='automation'&&active(a));
    return building?[building,...work.slice(0,2)]:work;
  }
  return items.sort((a,b)=>Number(active(b))-Number(active(a))||timestamp(b.at)-timestamp(a.at)).slice(0,3);
}
function renderDepartment(){
  const d=department(state.selected)||departments().find(x=>x.id==='research')||departments()[0];if(!d)return;state.selected=d.id;
  $('#department-mode').textContent=execution[d.execution]||'共同研究';$('#department-mode').dataset.execution=d.execution;
  $('#department-title').textContent=d.label;$('#department-responsibility').textContent=d.responsibility;$('#department-state').textContent=isStale()?'稍早的研究现场':d.running_automations?'自动引擎运行中':d.running_sessions?'研究会话推进中':'各自推进，共同接力';
  const people=d.participants||[];$('#department-people').replaceChildren();$('#department-people').append(element('span',people.length?`${people.length} 个公开参与席位`:'暂时没有公开参与席位','people-label'),element('span',d.activities.length?`${d.activities.length} 条近期工作记录`:'等待第一条公开工作','people-summary'));
  renderAgentRoster(d);
  const work=primaryWork(d),container=$('#department-work');container.replaceChildren();$('#department-work-count').textContent=countRunning(d)?`${countRunning(d)} 项执行中`:'';
  $('#department-work-title').textContent=d.execution==='human'?'研究如何继续':'这里正在发生';
  if(d.execution==='human'){container.append(element('p','提出值得研究的问题，判断哪些方向值得继续。研究中的新结果与交流反馈，再成为下一轮问题的起点。','loading'));const button=element('button','看看数学攻坚在推进什么 →','text-button');button.addEventListener('click',()=>selectDepartment('research'));container.append(button);}
  for(const a of work){const task=a.task,card=task?element('button','','work-item'):external('',a.url,'work-item');if(task)card.type='button';card.dataset.focusKey=`work:${a.id}`;card.classList.toggle('is-active',active(a));const meta=element('div','','work-meta');meta.append(element('span',phase(a),'work-state'),element('time',relative(a.at)));meta.lastChild.dateTime=a.at;
    const title=['automation','session'].includes(a.kind)?sourceLabel(a):['studio','verification','publication','outreach'].includes(d.id)?sourceLabel(a):copyFor(a).title;
    card.append(meta,element('strong',title),element('p',a.kind==='automation'?progress(a).summary:copyFor(a).question));const bottom=element('div','','work-bottom');bottom.append(element('span',a.actor?.kind==='agent'&&a.actor.tool?a.actor.tool:a.actor?.label||execution[d.execution]),element('span',task?'沿着课题继续看 ↗':'读公开动态 ↗','work-arrow'));card.append(bottom);if(task)card.addEventListener('click',()=>selectTopic(a));container.append(card);
  }
  if(!work.length&&d.execution!=='human')container.append(element('p',d.id==='review'?'新的复核意见会在这里汇入。也可以沿着课题，继续阅读公开讨论。':'新的进展会在这里汇入。先沿着已有的研究线索继续探索。','loading'));
  const related=new Set((view()?.routes||[]).filter(r=>r.from===d.id||r.to===d.id).map(r=>r.from===d.id?r.to:r.from));const links=$('#department-connections');links.replaceChildren();if(related.size){links.append(element('span','接力的方向','people-label'));for(const id of related){const target=department(id);if(!target)continue;const button=element('button',`${target.label} ↗`,'connection-chip');button.type='button';button.dataset.focusKey=`connection:${id}`;button.addEventListener('click',()=>selectDepartment(id));links.append(button);}}
}
function selectDepartment(id,manual=true){if(!department(id))return;state.selected=id;if(manual)state.follow=false;updateControls();renderHive();preserveFocus(renderDepartment);if(manual&&state.mode==='organization'){state.focused=id;renderHive();renderDepartmentLens(department(id));}}
function closeDepartmentLens(){state.focused=null;$('#research-room')?.classList.remove('is-department-focused');if($('#department-lens'))$('#department-lens').hidden=true;renderHive();renderDepartment();}
function questionTopics(){
  const topics=new Map();
  const rows=activities().filter(a=>['research','books'].includes(a.department)&&['task','contribution'].includes(a.kind)&&a.task&&!technical.test(a.label)).sort((a,b)=>timestamp(b.at)-timestamp(a.at));
  for(const a of rows){const copy=copyFor(a),id=copy.canonical||key(a.task);if(!topics.has(id))topics.set(id,{id,copy,activity:a,book:a.department==='books'});}
  return [...topics.values()];
}
function relatedTo(topic){
  const keys=new Set([key(topic.task),copyFor(topic).canonical,...(topic.references||[]).map(key)].filter(Boolean)),rows=activities();
  for(let i=0;i<2;i++){const next=new Set(keys);for(const a of rows){const references=[key(a.task),...(a.references||[]).map(key)].filter(Boolean);if(references.some(ref=>keys.has(ref)))for(const ref of references)if(next.size<60)next.add(ref);}if(next.size===keys.size)break;for(const ref of next)keys.add(ref);}
  return rows.filter(a=>keys.has(key(a.task))||(a.references||[]).some(ref=>keys.has(key(ref)))).sort((a,b)=>timestamp(b.at)-timestamp(a.at));
}
function selectTopic(a){const work=activities().find(item=>['task','contribution'].includes(item.kind)&&key(item.task)===key(a.task));a=work||a;state.topic={task:a.task,reference:key(a.task),activity:a};state.follow=false;setMode('journey');if(matchMedia('(max-width: 620px)').matches)$('#institute').scrollIntoView({behavior:reduced?'instant':'smooth'});}
function renderJourney(){
  let topic=state.topic?.activity;if(topic){topic=activities().find(a=>a.id===topic.id)||topic;}
  if(!topic){topic=questionTopics()[0]?.activity;if(topic)state.topic={task:topic.task,reference:key(topic.task),activity:topic};}
  const stages=$('#journey-stages'),events=$('#journey-events'),people=$('#journey-people'),links=$('#journey-links');stages.replaceChildren();events.replaceChildren();people.replaceChildren();links.replaceChildren();if(!topic)return;
  const copy=copyFor(topic),related=relatedTo(topic);$('#journey-title').textContent=copy.title;$('#journey-description').textContent=copy.question;
  const order=['research','review','verification','books','publication','outreach'];
  const touched=order.map(id=>({d:department(id),items:related.filter(a=>a.department===id)})).filter(x=>x.d&&x.items.length);
  touched.forEach(({d,items},i)=>{const button=element('button','','journey-stage');button.type='button';button.classList.toggle('is-active',items.some(active));button.dataset.focusKey=`stage:${d.id}`;const running=items.filter(active).length;button.append(element('span',String(i+1).padStart(2,'0')),element('strong',d.label),element('p',running?`${running} 项相关工作正在执行`:phase(items[0])));button.addEventListener('click',()=>{setMode('organization');selectDepartment(d.id);});stages.append(button);});
  const messages=(state.stream?.messages||[]).filter(m=>related.some(a=>a.task?.repository===m.repository&&a.task?.number===m.number));
  const contributors=peopleFor(related);for(const message of messages){if(!contributors.some(actor=>actor.id===message.actor))contributors.push({id:message.actor,label:message.actor,kind:'account'});}people.append(...contributors.slice(0,6).map(person));
  const newest=messages.sort((a,b)=>timestamp(b.updated_at)-timestamp(a.updated_at)),chosen=[];
  for(const message of newest)if(chosen.length<3&&!chosen.some(item=>item.actor===message.actor))chosen.push(message);
  for(const message of newest)if(chosen.length<3&&!chosen.includes(message))chosen.push(message);
  const story=[];for(const message of chosen.sort((a,b)=>timestamp(b.updated_at)-timestamp(a.updated_at))){const context=related.find(a=>a.task?.repository===message.repository&&a.task?.number===message.number&&['task','contribution'].includes(a.kind))||topic;const entry={...context,kind:message.kind==='review_comment'?'review':'discussion',at:message.updated_at,actor:{id:message.actor,label:message.actor,kind:'account'},task:{repository:message.repository,number:message.number},url:message.url};story.push(entry);}
  for(const a of related.filter(a=>['contribution','automation','review','session'].includes(a.kind)).slice(0,3))if(story.length<3&&!story.some(item=>item.url===a.url))story.push(a);
  for(const a of story){const item=element('article','','journey-event'),update=progress(a),time=element('time',relative(a.at));time.dateTime=a.at;const mentions=messageFor(a)?.mentions||[],byline=a.actor?.label?`${a.actor.label}${mentions.length?' → '+mentions.slice(0,2).map(name=>'@'+name).join('、'):''}`:'';item.append(time,element('strong',a.kind==='automation'?phase(a):update.title),element('p',byline,'journey-byline'),element('p',a.kind==='automation'?update.title:update.summary),external('阅读这一段进展 ↗',a.url));events.append(item);}
  if(!story.length)events.append(element('p','问题已经提出，下一段探索会在这里继续。','loading'));
  links.append(external('阅读这条研究线索 ↗',topic.url,'text-link'));
  if(related.some(a=>a.department==='books'))links.append(external('走进相关的理论书库 ↗','https://books.trureturing.org/','text-link'));
}
function renderQuestions(){
  const topics=questionTopics().filter(t=>state.filter==='all'||(state.filter==='books'?t.book:!t.book)),container=$('#question-cards');container.replaceChildren();
  for(const topic of topics.slice(0,state.limit)){const a=topic.activity,card=element('article','','question-card'),top=element('div','','question-card-top');top.append(element('span',topic.book?'理论书写':topic.copy.area),element('span',phase(a),'phase'));const title=element('button',topic.copy.title,'question-title');title.type='button';title.title=cleanTitle(a.label);title.dataset.focusKey=`question:${topic.id}`;title.addEventListener('click',()=>{selectTopic(a);$('#institute').scrollIntoView({behavior:reduced?'instant':'smooth'});});card.append(top,title,element('p',topic.copy.question));const bottom=element('div','','question-card-bottom');bottom.append(element('span',`${relative(a.at)}有新进展`),element('span','跟随这个问题 ↗'));card.append(bottom);container.append(card);}
  if(!topics.length)container.append(element('p','新的研究线索正在汇入。','loading'));$('#more-questions').hidden=topics.length<=state.limit;
}
function renderActivity(){
  const items=(view()?.recent||[]).filter(a=>!['task'].includes(a.kind)&&(!['research','books'].includes(a.department)||!['contribution'].includes(a.kind)||!technical.test(a.label)));
  const unique=[],seen=new Set();for(const a of items){const identity=`${a.source}:${a.id}`;if(seen.has(identity))continue;seen.add(identity);unique.push(a);if(unique.length===4)break;}
  const container=$('#activity-strip');container.replaceChildren();for(const a of unique){const d=department(a.department),card=element('button','','activity-card');card.type='button';card.dataset.focusKey=`activity:${a.id}`;const arrivalKey=`card/${eventKey(a)}`,arrived=state.arrivals.some(item=>eventKey(item)===eventKey(a))&&!state.animated.has(arrivalKey);card.classList.toggle('has-arrival',arrived);if(arrived)state.animated.add(arrivalKey);const top=element('div','','activity-card-top');top.append(element('span',d?.label||'研究现场','activity-role'),element('time',relative(a.at)));top.lastChild.dateTime=a.at;const update=progress(a);card.append(top,element('strong',a.kind==='automation'?phase(a):update.title),element('p',a.kind==='automation'?update.title:update.summary),element('span',a.actor?.kind==='agent'&&a.actor.tool?`${a.actor.tool} · ${a.actor.label}`:a.actor?.label||execution[d?.execution]||'共同推进','activity-byline'));card.addEventListener('click',()=>{if(a.task)selectTopic(a);else{setMode('organization');selectDepartment(a.department);}});container.append(card);}
  if(!unique.length)container.append(element('p','下一段探索，正在继续。','loading'));
  $('#activity-note').textContent=state.arrivals.length?`${state.arrivals.length} 段新进展汇入`:'真实发生的下一步';
}
function renderBooks(){const container=$('#book-updates');container.replaceChildren();for(const t of questionTopics().filter(t=>t.book).slice(0,3)){const row=element('div','','book-update'),button=element('button',t.copy.title,'text-button');button.type='button';button.addEventListener('click',()=>{selectTopic(t.activity);$('#institute').scrollIntoView({behavior:reduced?'instant':'smooth'});});row.append(element('span',phase(t.activity)),button);container.append(row);}}
function renderPapers(){
  const publications=state.snapshot?.publications||[],copies=state.snapshot?.editorial?.papers||{},container=$('#paper-cards');container.replaceChildren();
  for(const paper of publications.slice(0,6)){const copy=copies[paper.id],card=element('article','','paper-card');if(paper.image){const img=document.createElement('img');try{img.src=safeURL(new URL(paper.image,'https://www.trureturing.org/').href);}catch{img.src='';}img.alt='';img.loading='lazy';card.append(img);}const content=element('div','','paper-content'),title=external(copy?.title||paper.title,paper.url,'paper-title');title.title=paper.title;content.append(element('span',/preprint/i.test(paper.status||'')?'预印本':'研究论文','paper-type'),title,element('p',copy?.summary||paper.summary||'','paper-summary'),element('div',paper.authors||'','paper-authors'));card.append(content);container.append(card);}
  if(!publications.length){const empty=element('div','','paper-empty');empty.append(element('p','研究正在长成可以阅读、讨论与继续推进的论文。'),external('阅读公开研究 ↗','https://www.trureturing.org/research','text-link'));container.append(empty);}
}
function updateControls(){for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===state.mode));$('#follow-live').setAttribute('aria-pressed',String(state.follow));$('#follow-live span').textContent=state.follow?'跟随最新':'已固定视角';$('#research-room').dataset.mode=state.mode;$('#journey-panel').hidden=state.mode!=='journey';}
function setMode(mode){state.mode=mode;if(mode!=='organization'){state.focused=null;$('#research-room')?.classList.remove('is-department-focused');if($('#department-lens'))$('#department-lens').hidden=true;}updateControls();if(mode==='journey')renderJourney();else{renderHive();renderDepartment();renderDepartmentLens(department(state.focused));}}
function renderLive(){preserveFocus(()=>{renderHealth();renderMetrics();renderHive();renderDepartment();renderDepartmentLens(department(state.focused));renderQuestions();renderActivity();renderBooks();if(state.mode==='journey')renderJourney();updateControls();});}
function validSnapshot(data){return data?.schema==='trureturing-live.v1'&&Number.isFinite(timestamp(data.collected_at))&&Array.isArray(data.repositories);}
function validStream(data){const org=data?.organization;return data?.schema==='trureturing-live-stream.v1'&&Number.isFinite(timestamp(data.observed_at))&&Array.isArray(data.messages)&&org?.schema==='ai-org.live.v1'&&org.organization?.id==='trureturing'&&Number.isFinite(timestamp(org.observed_at))&&Array.isArray(org.departments)&&org.departments.every(d=>typeof d.id==='string'&&Array.isArray(d.activities)&&Array.isArray(d.participants))&&Array.isArray(org.sources)&&Array.isArray(org.recent);}
async function refreshSnapshot(){if(state.snapshotBusy)return;state.snapshotBusy=true;try{const response=await fetch(new URL('data/snapshot.json',document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(18000)});if(!response.ok)throw new Error('unavailable');const data=await response.json();if(!validSnapshot(data)||state.snapshot&&timestamp(data.collected_at)<timestamp(state.snapshot.collected_at))return;const changed=state.snapshot?.collected_at!==data.collected_at;state.snapshot=data;if(changed){renderLive();renderPapers();try{localStorage.setItem(cacheKey,JSON.stringify(data));}catch{}}}catch{if(!state.snapshot)renderPapers();}finally{state.snapshotBusy=false;}}
async function refreshLive(){if(state.liveBusy)return;state.liveBusy=true;try{const response=await fetch(liveURL,{cache:'no-store',signal:AbortSignal.timeout(18000)});if(!response.ok)throw new Error('unavailable');const data=await response.json();if(!validStream(data)||state.stream&&timestamp(data.organization.observed_at)<timestamp(view().observed_at))return;const changed=state.stream?.organization.observed_at!==data.organization.observed_at;if(!changed){renderHealth();return;}
    const first=!state.stream,watermarks=new Map();for(const a of view()?.recent||[])watermarks.set(a.source,Math.max(watermarks.get(a.source)||0,timestamp(a.at)||0));
    const arrivals=first?[]:data.organization.recent.filter(a=>!state.seen.has(eventKey(a))&&timestamp(a.at)>=(watermarks.get(a.source)||0)&&Date.now()-timestamp(a.at)<900000);
    state.stream=data;state.arrivals=arrivals.slice(0,8);for(const a of data.organization.recent)state.seen.add(eventKey(a));if(state.seen.size>1600)state.seen=new Set([...state.seen].slice(-1000));if(state.animated.size>800)state.animated=new Set([...state.animated].slice(-400));
    if(state.follow&&state.mode==='organization'&&arrivals.length)state.selected=arrivals[0].department;
    renderLive();if(arrivals.length)$('#live-announcement').textContent=`${department(arrivals[0].department)?.label||'研究院'}有新的进展。`;
  }catch{renderHealth();if(!state.stream){$('#connection-note').hidden=false;$('#connection-note').textContent='研究现场连接稍慢，稍后会自动恢复。你可以先阅读已有的研究。';}}finally{state.liveBusy=false;}}
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{if(button.dataset.mode==='journey')state.follow=false;setMode(button.dataset.mode);});
for(const button of document.querySelectorAll('[data-method-department]'))button.addEventListener('click',()=>{setMode('organization');selectDepartment(button.dataset.methodDepartment);});
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{state.filter=button.dataset.filter;state.limit=9;for(const sibling of document.querySelectorAll('[data-filter]'))sibling.setAttribute('aria-pressed',String(sibling===button));renderQuestions();});
$('#more-questions').addEventListener('click',()=>{state.limit+=9;renderQuestions();});
$('#journey-back').addEventListener('click',()=>setMode('organization'));
$('#lens-back').addEventListener('click',()=>closeDepartmentLens());
$('#follow-live').addEventListener('click',()=>{state.follow=!state.follow;if(state.follow){state.selected=view()?.recent?.[0]?.department||'research';setMode('organization');}updateControls();renderLive();});
$('#motion-toggle').addEventListener('click',()=>{state.quiet=!state.quiet;document.body.classList.toggle('quiet',state.quiet);$('#motion-toggle').setAttribute('aria-pressed',String(state.quiet));renderRoutes();});
$('#expand-room').addEventListener('click',async()=>{const room=$('#research-room');if(document.fullscreenElement){await document.exitFullscreen();return;}if(room.classList.contains('is-expanded')){room.classList.remove('is-expanded');document.body.style.overflow='';return;}if(room.requestFullscreen){try{await room.requestFullscreen();return;}catch{}}room.classList.add('is-expanded');document.body.style.overflow='hidden';});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('#research-room').classList.remove('is-expanded');document.body.style.overflow='';}});
if(reduced){document.body.classList.add('quiet');$('#motion-toggle').hidden=true;}
try{const saved=JSON.parse(localStorage.getItem(cacheKey));if(validSnapshot(saved)){state.snapshot=saved;renderPapers();}}catch{}
updateControls();refreshSnapshot();refreshLive();setInterval(()=>{if(!document.hidden)refreshSnapshot();},60000);setInterval(()=>{if(!document.hidden)refreshLive();},15000);setInterval(()=>{if(!document.hidden){renderHealth();if(isStale())renderLive();}},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshSnapshot();refreshLive();}});
