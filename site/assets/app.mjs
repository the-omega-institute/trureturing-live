const $ = (selector) => document.querySelector(selector);
const ACTIVE = new Set(['in_progress', 'queued', 'waiting', 'pending', 'requested']);
const STATUS = {in_progress:'运行中',queued:'排队中',waiting:'等待审批',pending:'等待中',requested:'等待执行',success:'执行成功',failure:'执行失败',cancelled:'已取消',timed_out:'执行超时',action_required:'需要处理',neutral:'执行完成',skipped:'已跳过',stale:'已过期',completed:'执行完成',startup_failure:'启动失败'};
const state = {snapshot:null,repo:'trureturing',tab:'runs',filter:'all',query:'',limit:20,fetching:false,lastError:null,lastCheck:0,live:null,liveError:null,liveFetching:false,thread:null,threadScope:'all'};
const cacheKey = 'trureturing-live.snapshot.v1';
const external = (url) => {
  try { const value = new URL(url); return value.protocol === 'https:' && value.hostname === 'github.com' ? value.href : '#'; } catch { return '#'; }
};
const text = (tag, value, className) => { const node = document.createElement(tag); node.textContent = value ?? ''; if (className) node.className = className; return node; };
const link = (label, url, className) => { const node = text('a',label,className); node.href = external(url); node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; };
const date = (value) => new Date(value);
const relative = (value) => {
  const seconds = Math.max(0, (Date.now()-date(value).getTime())/1000);
  if (!Number.isFinite(seconds)) return '时间未知';
  if(seconds < 60) return '刚刚'; if(seconds < 3600) return `${Math.floor(seconds/60)} 分钟前`;
  if(seconds < 86400) return `${Math.floor(seconds/3600)} 小时前`; return `${Math.floor(seconds/86400)} 天前`;
};
const isActive = (run) => ACTIVE.has(run.status);
const statusKey = (run) => run.status === 'completed' ? (run.conclusion || 'completed') : run.status;
const statusClass = (run) => isActive(run) ? run.status === 'in_progress' ? 'running' : 'queued' : statusKey(run);
function validSnapshot(snapshot) {
  return snapshot?.schema === 'trureturing-live.v1' && Number.isFinite(Date.parse(snapshot.collected_at)) && Array.isArray(snapshot.repositories) && snapshot.repositories.length > 0 && snapshot.repositories.every(repo => typeof repo.name === 'string' && typeof repo.full_name === 'string' && Array.isArray(repo.runs) && Array.isArray(repo.tasks) && Array.isArray(repo.errors));
}
function allRuns(){return state.snapshot.repositories.flatMap(repo=>repo.runs);}
function allTasks(){return state.snapshot.repositories.flatMap(repo=>repo.tasks);}
function currentRepo(){return state.snapshot.repositories.find(repo=>repo.name === state.repo) || state.snapshot.repositories[0];}
function relatedTask(run, repo) {
  // Match an explicitly attached PR; for fork runs whose PR array is empty,
  // require the exact current PR head SHA, never a title or branch guess.
  return repo.tasks.find(task=>task.kind==='pull' && run.pull_requests.includes(task.number)) || repo.tasks.find(task=>task.kind==='pull' && task.head_sha && task.head_sha === run.head_sha);
}
function symbol(run) { const node = text('i','','status-symbol '+statusClass(run)); node.setAttribute('aria-hidden','true'); return node; }
function renderFreshness() {
  if(!state.snapshot)return;
  const observation=state.live?.observed_at||state.snapshot.collected_at;
  const age=(Date.now()-date(observation).getTime())/1000;
  const stale=age>(state.live?180:1800);
  const degraded=state.snapshot.repositories.some(repo=>repo.errors.length)||Boolean(state.live?.errors.length);
  const connectionError=state.live?state.liveError:state.lastError;
  $('#connection-state').textContent=connectionError?'连接暂不可用':stale?'观测数据已延迟':degraded?'部分来源不可用':'公开观测已连接';
  $('#signal-dot').className='signal-dot '+((stale||degraded||connectionError)?'stale':'fresh');
  $('#observation-time').dateTime=observation;
  $('#observation-time').textContent=date(observation).toLocaleString('zh-CN',{timeZone:'Asia/Singapore',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+' SGT';
  $('#observation-time').title=observation;
  $('#freshness').textContent=state.live?`${relative(observation)}观测 · 协作通道约 60 秒采集`:`${relative(observation)}全景采集 · 协作通道连接中`;
  $('#panorama-age').textContent=`全景采集：${relative(state.snapshot.collected_at)}`;
  const messages=[];
  if(state.lastError)messages.push('暂时无法读取新的观测。当前显示上次成功读取的数据，页面将继续重试。');
  if(stale)messages.push('观测数据已延迟，请以显示的实际采集时间为准。');
  if(state.snapshot.repositories.some(repo=>repo.errors.length))messages.push(`${state.snapshot.repositories.filter(repo=>repo.errors.length).length} 个研究区的部分来源读取失败；缺失项保留为未知。`);
  if(state.live?.errors.length)messages.push(`${state.live.errors.length} 个协作来源本轮不可读，保留各自最近观测时间。`);
  $('#notice').hidden=!messages.length; $('#notice').textContent=messages.join(' ');
}
function renderMetrics() {
  const runs=allRuns(),tasks=allTasks(),repos=state.snapshot.repositories;
  $('#metric-running').textContent=runs.filter(run=>run.status==='in_progress').length;
  $('#metric-queued').textContent=runs.filter(run=>isActive(run)&&run.status!=='in_progress').length;
  $('#metric-pulls').textContent=tasks.filter(task=>task.kind==='pull'&&task.state==='open').length;
  $('#metric-repos').textContent=`${repos.filter(repo=>repo.available).length}/${repos.length}`;
  const bounded=repos.some(repo=>Object.entries(repo.coverage).some(([key,value])=>key.startsWith('runs_')&&value.truncated));
  $('#metric-coverage').textContent=bounded?'活跃工作流查询已触及采样上限':'公开仓库 · 有限采样';
  $('#map-repo-count').textContent=`${repos.length} PUBLIC REPOSITORIES`;
}
function renderFocus(){
  const container=$('#focus-hubs');container.replaceChildren();
  for(const name of ['trureturing','trureturing-books']){
    const repo=state.snapshot.repositories.find(repo=>repo.name===name);if(!repo)continue;
    const card=text('article','','focus-card');card.dataset.focus=name;
    const heading=text('div','','focus-card-heading');
    const group=text('div');group.append(text('p',name==='trureturing'?'RESEARCH & FORMALIZATION':'THEORY & CHAPTERS','eyebrow'));
    const button=text('button',name==='trureturing'?'trureturing · 研究与形式化':'trureturing-books · 理论与章节','focus-title');button.type='button';button.addEventListener('click',()=>{selectRepo(name);$('#inspector-title').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});group.append(button);
    heading.append(group,link('↗',repo.url,'focus-source'));card.append(heading);
    const running=repo.runs.filter(run=>run.status==='in_progress').length,waiting=repo.runs.filter(run=>isActive(run)&&run.status!=='in_progress').length,pulls=repo.tasks.filter(task=>task.kind==='pull'&&task.state==='open').sort((a,b)=>date(b.updated_at)-date(a.updated_at));
    const counts=text('p','','focus-counts');counts.append(text('strong',running),text('span','工作流运行中'),text('strong',waiting),text('span','等待'),text('strong',pulls.length),text('span','可见开放 PR'));card.append(counts);
    const deliveries=text('div','','focus-deliveries');
    for(const task of pulls.slice(0,3)){const row=text('div','','focus-delivery');row.append(text('span','#'+task.number),link(task.title,task.url));deliveries.append(row);}
    if(!pulls.length)deliveries.append(text('p',repo.errors.length?'交付来源部分不可用。':'本次采样没有开放 PR。','empty'));
    card.append(deliveries);container.append(card);
  }
}
function renderMap() {
  const map=$('#research-map');
  $('#map-loading')?.remove();
  for(const repo of state.snapshot.repositories){
    let button=map.querySelector(`[data-repo="${CSS.escape(repo.name)}"]`);
    if(!button){button=document.createElement('button');button.type='button';button.className='map-zone';button.dataset.repo=repo.name;button.dataset.core=String(repo.name==='trureturing');map.append(button);button.addEventListener('click',()=>selectRepo(repo.name));}
    button.dataset.featured=String(repo.name==='trureturing'||repo.name==='trureturing-books');
    button.setAttribute('aria-pressed',String(repo.name===state.repo));
    const active=repo.runs.filter(isActive),running=active.filter(run=>run.status==='in_progress').length,waiting=active.length-running;
    const heading=text('span','','zone-heading');heading.append(text('span',repo.label,'zone-label'),text('span',String(state.snapshot.repositories.indexOf(repo)+1).padStart(2,'0'),'zone-index'));
    const status=text('span',!repo.available?'来源不可用':active.length?`${running} 执行 · ${waiting} 等待`:repo.errors.length?'部分来源不可用':'暂无执行中的工作流','zone-state');status.dataset.active=String(active.length>0);status.dataset.error=String(repo.errors.length>0);
    const dots=text('span','','zone-dots');dots.setAttribute('aria-hidden','true');
    const samples=[...active,...repo.runs.filter(run=>!isActive(run)).slice(0,Math.max(0,10-active.length))].slice(0,18);
    for(const run of samples){const dot=text('i','',isActive(run)?(run.status==='in_progress'?'running':'queued'):run.conclusion==='failure'?'failed':'completed');dot.title=`${run.name} · ${STATUS[statusKey(run)]||run.status}`;dots.append(dot);}
    button.setAttribute('aria-label',`${repo.label}，${repo.name}，${status.textContent}`);
    button.replaceChildren(heading,text('span',repo.short,'zone-short'),status,dots);
  }
}
function selectRepo(name){state.repo=name;$('#inspector-content').scrollTop=0;for(const button of document.querySelectorAll('[data-repo]'))button.setAttribute('aria-pressed',String(button.dataset.repo===name));renderInspector();}
function runItem(run,repo){
  const item=text('article','','inspection-item');
  const top=text('div','','item-top');top.append(symbol(run),text('span',STATUS[statusKey(run)]||run.status),text('span',relative(run.updated_at)));item.append(top,link(run.name,run.url,'inspection-title'));
  const meta=text('div','','inspection-meta');meta.append(text('span',`触发账号 ${run.actor||'未知'} · ${run.event}`),document.createElement('br'),text('code',`${run.branch||'无分支'} · ${run.head_sha.slice(0,7)} · 尝试 ${run.attempt}`));
  const task=relatedTask(run,repo);if(task){meta.append(document.createElement('br'),link(`关联交付 #${task.number}`,task.url));}
  item.append(meta);return item;
}
function taskItem(task){
  const item=text('article','','inspection-item');
  const top=text('div','','item-top');top.append(text('span',task.kind==='pull'?(task.draft?'草稿 PR':'开放 PR'):(task.state==='open'?'开放课题':'已关闭 issue')),text('span','#'+task.number));item.append(top,link(task.title,task.url,'inspection-title'));
  const meta=text('div','','inspection-meta');meta.append(text('span',task.assignees.length?`GitHub 指派：${task.assignees.join('、')}`:'GitHub 指派：未声明'));
  if(task.declared_session){meta.append(document.createElement('br'),link(`已声明会话 ${task.declared_session.slice(0,8)}`,task.session_source_url));}
  const refs=task.references.filter(ref=>ref.repository!==task.repository||ref.number!==task.number).slice(0,3);
  for(const ref of refs){meta.append(document.createElement('br'),link(`${ref.repository.split('/')[1]} #${ref.number}`,ref.url));if(ref.evidence_url)meta.append(text('span',' · '),link('关联来源',ref.evidence_url));}
  item.append(meta);return item;
}
function renderInspector(){
  const repo=currentRepo();$('#inspector-title').textContent=repo.label;$('#repo-name').textContent=repo.name;$('#repo-link').href=external(repo.url);$('#repo-description').textContent=repo.description+' · '+relative(repo.observed_at||state.snapshot.collected_at)+'观测';
  $('#tab-runs-count').textContent=repo.runs.length;$('#tab-tasks-count').textContent=repo.tasks.length;
  const content=$('#inspector-content');const scroll=content.scrollTop;content.replaceChildren();content.setAttribute('aria-labelledby','tab-'+state.tab);
  if(repo.errors.length)content.append(text('p','部分来源：'+repo.errors.join('；'),'inspection-meta'));
  if(state.tab==='runs'){
    const sorted=[...repo.runs].sort((a,b)=>Number(isActive(b))-Number(isActive(a))||date(b.updated_at)-date(a.updated_at));
    for(const run of sorted.slice(0,30))content.append(runItem(run,repo));
    if(!sorted.length)content.append(text('p',repo.coverage.recent_runs?.unavailable?'工作流来源读取失败，执行状态未知。':'本次采样未观察到工作流记录。','empty'));
  }else{
    for(const task of [...repo.tasks].sort((a,b)=>date(b.updated_at)-date(a.updated_at)).slice(0,30))content.append(taskItem(task));
    if(!repo.tasks.length)content.append(text('p','本次采样未观察到课题或开放交付。','empty'));
  }
  content.scrollTop=scroll;
}
function activityRecords(){
  const repos=state.snapshot.repositories;
  const records=[];
  for(const repo of repos){
    for(const run of repo.runs)records.push({type:'run',id:'run-'+run.id,data:run,repo,at:run.updated_at,title:run.title,actor:run.actor||'未知',status:STATUS[statusKey(run)]||run.status});
    for(const task of repo.tasks)records.push({type:'task',id:'task-'+task.id,data:task,repo,at:task.updated_at,title:task.title,actor:task.author||'未知',status:task.kind==='pull'?(task.draft?'草稿交付':'开放交付'):(task.state==='open'?'开放课题':'已关闭 issue')});
  }
  return records.filter(row=>!(state.filter==='active'&&(row.type!=='run'||!isActive(row.data)))&&!(state.filter==='tasks'&&row.type!=='task')&&[row.title,row.repo.name,row.actor,row.data.branch||''].join(' ').toLowerCase().includes(state.query.toLowerCase())).sort((a,b)=>date(b.at)-date(a.at));
}
function renderActivities(){
  const records=activityRecords(),list=$('#activity-list');
  const frag=document.createDocumentFragment();
  for(const row of records.slice(0,state.limit)){
    const item=text('article','','activity-row');
    const time=text('time',relative(row.at),'activity-time');time.dateTime=row.at;time.title=date(row.at).toLocaleString();
    const status=text('div','','activity-status');if(row.type==='run')status.append(symbol(row.data));else status.append(text('span',row.data.kind==='pull'?'↗':'○','task-symbol'));status.append(text('span',row.status));
    const main=text('div','','activity-main');main.append(link(row.title,row.data.url,'activity-title'));
    const subtitle=row.type==='run'?`${row.repo.name} · ${row.data.name} · ${row.data.branch||'—'} · ${row.data.head_sha.slice(0,7)}`:`${row.repo.name} #${row.data.number}${row.data.assignees.length?' · 指派 '+row.data.assignees.join(', '):''}`;
    main.append(text('div',subtitle,'activity-subtitle'));
    const actor=text('div',row.actor,'activity-actor');actor.append(text('span',row.type==='run'?'工作流触发账号':'公开记录提交账号'));
    item.append(time,status,main,actor);frag.append(item);
  }
  if(!records.length)frag.append(text('p','当前筛选下没有观察到记录。','empty'));
  list.replaceChildren(frag);$('#activity-scope').textContent=`${records.length} 条采样记录 · 按 GitHub 更新时间`;$('#show-more').hidden=records.length<=state.limit;
}
function render(){
  if(state.live)for(const repo of state.snapshot.repositories){const current=state.live.focus_runs?.[repo.full_name];if(current&&Array.isArray(current.runs)&&date(current.observed_at)>=date(repo.observed_at||state.snapshot.collected_at)){repo.runs=current.runs;repo.observed_at=current.observed_at;}}
  renderFreshness();renderMetrics();renderFocus();renderMap();renderInspector();renderActivities();
}

function threadGroups(){
  const groups=new Map();
  for(const message of state.live?.messages||[]){
    if(state.threadScope!=='all'&&message.repository.split('/')[1]!==state.threadScope)continue;
    if(!groups.has(message.thread))groups.set(message.thread,[]);
    groups.get(message.thread).push(message);
  }
  return [...groups.entries()].map(([id,messages])=>({id,messages:messages.sort((a,b)=>date(a.created_at)-date(b.created_at)),latest:messages.reduce((a,b)=>date(a.updated_at)>date(b.updated_at)?a:b)})).sort((a,b)=>date(b.latest.updated_at)-date(a.latest.updated_at));
}
function threadTitle(message){
  const task=state.snapshot?.repositories.flatMap(repo=>repo.tasks).find(task=>task.repository===message.repository&&task.number===message.number);
  return task?.title||`${message.repository.split('/')[1]} #${message.number}`;
}
function renderConversation(){
  const groups=threadGroups(),list=$('#thread-list');
  if(!groups.some(group=>group.id===state.thread))state.thread=(groups.find(group=>new Set(group.messages.map(message=>message.actor)).size>1)||groups[0])?.id;
  const fragment=document.createDocumentFragment();
  for(const group of groups.slice(0,35)){
    const button=text('button','','thread-card');button.type='button';button.dataset.thread=group.id;button.setAttribute('aria-pressed',String(group.id===state.thread));
    button.append(text('span',`${group.latest.repository.split('/')[1]} #${group.latest.number}`,'thread-coordinate'),text('strong',threadTitle(group.latest)),text('span',`${new Set(group.messages.map(m=>m.actor)).size} 个公开账号 · ${group.messages.length} 条采样讨论 · ${relative(group.latest.updated_at)}`,'thread-meta'));
    button.addEventListener('click',()=>{state.thread=group.id;renderConversation();});fragment.append(button);
  }
  if(!groups.length)fragment.append(text('p','当前来源没有采样到公开讨论。','empty'));
  list.replaceChildren(fragment);
  const selected=groups.find(group=>group.id===state.thread),flow=$('#conversation-flow'),messages=$('#conversation-messages');
  if(!selected){flow.replaceChildren();messages.replaceChildren();return;}
  $('#conversation-title').replaceChildren(link(threadTitle(selected.latest),selected.latest.thread_url));
  const participants=text('div','','flow-participants');
  for(const actor of [...new Set(selected.messages.map(m=>m.actor))].slice(0,8))participants.append(text('span',actor,'flow-person'));
  const topic=text('div','','flow-topic');topic.append(text('small','共同更新的课题'),text('strong','#'+selected.latest.number));
  const refs=new Map();for(const message of selected.messages)for(const ref of message.references||[])if(`${ref.repository}#${ref.number}`!==selected.id)refs.set(`${ref.repository}#${ref.number}`,ref);
  const outputs=text('div','','flow-outputs');
  for(const ref of [...refs.values()].slice(0,4))outputs.append(link(`${ref.repository.split('/')[1]} #${ref.number}`,ref.url,'flow-reference'));
  if(!refs.size)outputs.append(text('span','后续交付尚无明确引用','flow-unknown'));
  const arrow=text('span','→','flow-arrow');arrow.title='公开记录中的更新与引用关系，不代表内部私聊';
  flow.replaceChildren(participants,arrow,topic,text('span','→','flow-arrow'),outputs);
  const scroll=messages.scrollTop,items=document.createDocumentFragment();
  for(const message of selected.messages.slice(-25)){
    const article=text('article','','public-message');article.dataset.messageId=message.id;
    const head=text('div','','public-message-head');head.append(text('strong',message.actor),text('span',message.kind==='review_comment'?'行内评审评论':'公开讨论更新'),text('time',relative(message.created_at)));head.lastChild.dateTime=message.created_at;
    article.append(head);if(message.session)article.append(text('div','原记录声明的会话：'+message.session,'message-session'));
    if(message.mentions?.length)article.append(text('div','明确提及：'+message.mentions.map(name=>'@'+name).join('、'),'message-mentions'));
    article.append(text('p',message.text,'message-excerpt'),link('原记录 ↗',message.url,'message-source'));items.append(article);
  }
  messages.replaceChildren(items);messages.scrollTop=scroll;
}
function liveHealth(){
  if(!state.live){$('#stream-status').textContent='协作通道暂未连接';return;}
  const age=(Date.now()-date(state.live.observed_at))/1000,late=age>180;
  $('#stream-status').textContent=state.liveError?'新观测暂不可读':late?'采集已延迟':`${relative(state.live.observed_at)}观测 · 持续采集`;
  $('#stream-dot').className='signal-dot '+((late||state.liveError||state.live.errors.length)?'stale':'fresh');
  $('#stream-count').textContent=`${state.live.messages.length} 条公开讨论 / 行内评审采样 · ${Object.keys(state.live.coverage).length} 个仓库已轮巡${state.live.errors.length?' · 部分来源不可用':''}`;
}
async function refreshLive(){
  if(state.liveFetching)return;state.liveFetching=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const url=new URL('https://raw.githubusercontent.com/the-omega-institute/trureturing-live/live-data/live.json');url.searchParams.set('tick',String(Math.floor(Date.now()/15000)));
    const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('live unavailable');
    const live=await response.json();
    if(live.schema!=='trureturing-live-stream.v1'||!Number.isFinite(Date.parse(live.observed_at))||!Array.isArray(live.messages)||!live.coverage||!Array.isArray(live.errors))throw new Error('live invalid');
    if(state.live&&date(live.observed_at)<date(state.live.observed_at))throw new Error('older live snapshot');
    const changed=JSON.stringify(state.live?.messages)!==JSON.stringify(live.messages),observedChanged=state.live?.observed_at!==live.observed_at;state.live=live;state.liveError=null;
    if(state.snapshot&&observedChanged)render();
    if(changed||!$('#thread-list [data-thread]'))renderConversation();
  }catch{state.liveError='unavailable';}finally{clearTimeout(timeout);state.liveFetching=false;liveHealth();}
}
async function refresh(){
  if(state.fetching)return;state.fetching=true;$('#refresh').disabled=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
  try{
    const response=await fetch(new URL('data/snapshot.json',document.baseURI),{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('snapshot unavailable');
    const snapshot=await response.json();if(!validSnapshot(snapshot))throw new Error('snapshot invalid');
    if(state.snapshot&&date(snapshot.collected_at)<date(state.snapshot.collected_at))throw new Error('older snapshot');
    const changed=state.snapshot?.collected_at!==snapshot.collected_at;
    state.snapshot=snapshot;state.lastError=null;state.lastCheck=Date.now();
    if(changed){render();if(state.live)renderConversation();}else renderFreshness();
    try{localStorage.setItem(cacheKey,JSON.stringify(snapshot));}catch{}
  }catch{
    state.lastError='unavailable';
    if(state.snapshot)renderFreshness();else{
      $('#connection-state').textContent='观测暂不可用';$('#signal-dot').className='signal-dot stale';
      $('#map-loading').textContent='尚未取得观测数据';$('#notice').hidden=false;$('#notice').textContent='公开观测暂时无法读取。页面会每分钟重试，也可以手动刷新。';
      $('#activity-list').replaceChildren(text('p','没有可显示的有效观测。','empty'));
    }
  }finally{clearTimeout(timeout);state.fetching=false;$('#refresh').disabled=false;}
}
for(const button of document.querySelectorAll('[data-tab]')){
  button.addEventListener('click',()=>{state.tab=button.dataset.tab;for(const tab of document.querySelectorAll('[data-tab]')){tab.setAttribute('aria-selected',String(tab===button));tab.tabIndex=tab===button?0:-1;}if(state.snapshot)renderInspector();});
  button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const target=$('#tab-'+(event.key==='Home'?'runs':event.key==='End'?'tasks':button.dataset.tab==='runs'?'tasks':'runs'));target.click();target.focus();}});
}
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{state.filter=button.dataset.filter;state.limit=20;for(const filter of document.querySelectorAll('[data-filter]'))filter.setAttribute('aria-pressed',String(filter===button));if(state.snapshot)renderActivities();});
$('#search').addEventListener('input',event=>{state.query=event.target.value;state.limit=20;if(state.snapshot)renderActivities();});
$('#refresh').addEventListener('click',()=>{refresh();refreshLive();});$('#show-more').addEventListener('click',()=>{state.limit+=30;renderActivities();});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏大屏':'进入全屏大屏'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
try{const cached=JSON.parse(localStorage.getItem(cacheKey));if(validSnapshot(cached)){state.snapshot=cached;render();}}catch{}
refresh();
refreshLive();
for(const button of document.querySelectorAll('[data-thread-scope]'))button.addEventListener('click',()=>{state.threadScope=button.dataset.threadScope;state.thread=null;for(const other of document.querySelectorAll('[data-thread-scope]'))other.setAttribute('aria-pressed',String(other===button));renderConversation();});
setInterval(()=>{if(!document.hidden)refresh();},60000);
setInterval(()=>{if(!document.hidden){refreshLive();if(state.snapshot)renderFreshness();liveHealth();}},15000);
