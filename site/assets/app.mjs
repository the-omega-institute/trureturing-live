const $ = (selector) => document.querySelector(selector);
const ACTIVE = new Set(['in_progress', 'queued', 'waiting', 'pending', 'requested']);
const STATUS = {in_progress:'运行中',queued:'排队中',waiting:'等待审批',pending:'等待中',requested:'等待执行',success:'执行成功',failure:'执行失败',cancelled:'已取消',timed_out:'执行超时',action_required:'需要处理',neutral:'执行完成',skipped:'已跳过',stale:'已过期',completed:'执行完成',startup_failure:'启动失败'};
const state = {snapshot:null,repo:'trureturing',tab:'runs',filter:'all',query:'',limit:20,fetching:false,lastError:null,lastCheck:0};
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
  const age=(Date.now()-date(state.snapshot.collected_at).getTime())/1000;
  const stale=age>900;
  const degraded=state.snapshot.repositories.some(repo=>repo.errors.length);
  $('#connection-state').textContent=state.lastError?'连接暂不可用':stale?'观测数据已延迟':degraded?'部分来源不可用':'公开观测已连接';
  $('#signal-dot').className='signal-dot '+((stale||degraded||state.lastError)?'stale':'fresh');
  $('#observation-time').dateTime=state.snapshot.collected_at;
  $('#observation-time').textContent=date(state.snapshot.collected_at).toLocaleString('zh-CN',{timeZone:'Asia/Singapore',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+' SGT';
  $('#observation-time').title=state.snapshot.collected_at;
  $('#freshness').textContent=`${relative(state.snapshot.collected_at)}采集 · 约每 5 分钟更新`;
  const messages=[];
  if(state.lastError)messages.push('暂时无法读取新的观测。当前显示上次成功读取的数据，页面将继续重试。');
  if(stale)messages.push('当前采集已超过 15 分钟，请按下方时间判断记录的新鲜度。');
  if(degraded)messages.push(`${state.snapshot.repositories.filter(repo=>repo.errors.length).length} 个研究区的部分来源读取失败；缺失项保留为未知。`);
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
  const repo=currentRepo();$('#inspector-title').textContent=repo.label;$('#repo-name').textContent=repo.name;$('#repo-link').href=external(repo.url);$('#repo-description').textContent=repo.description;
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
function render(){renderFreshness();renderMetrics();renderFocus();renderMap();renderInspector();renderActivities();}
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
    if(changed)render();else renderFreshness();
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
$('#refresh').addEventListener('click',refresh);$('#show-more').addEventListener('click',()=>{state.limit+=30;renderActivities();});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏大屏':'进入全屏大屏'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
try{const cached=JSON.parse(localStorage.getItem(cacheKey));if(validSnapshot(cached)){state.snapshot=cached;render();}}catch{}
refresh();
setInterval(()=>{if(!document.hidden)refresh();},60000);
setInterval(()=>{if(state.snapshot&&!document.hidden)renderFreshness();},15000);
