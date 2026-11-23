import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html=await readFile(new URL('../site/index.html',import.meta.url),'utf8');
const script=await readFile(new URL('../site/assets/app.mjs',import.meta.url),'utf8');
const stamp=new Date().toISOString();
function snapshot(){
  const run={id:1,repository:'the-omega-institute/trureturing',name:'CI',title:'Prove an exact statement',status:'in_progress',conclusion:null,event:'pull_request',branch:'candidate',head_sha:'a'.repeat(40),url:'https://github.com/the-omega-institute/trureturing/actions/runs/1',actor:'trigger-bot',attempt:1,updated_at:stamp,created_at:stamp,pull_requests:[42]};
  const task={id:'the-omega-institute/trureturing#42',repository:run.repository,number:42,kind:'pull',title:'An exact proof',state:'open',url:'https://github.com/the-omega-institute/trureturing/pull/42',updated_at:stamp,author:'contributor',assignees:[],references:[],head_sha:run.head_sha};
  const core={name:'trureturing',full_name:run.repository,label:'形式化研究',description:'Core',short:'CORE',x:49,y:46,url:'https://github.com/the-omega-institute/trureturing',available:true,runs:[run],tasks:[task],coverage:{recent_runs:{}},errors:[]};
  const books={...core,name:'trureturing-books',full_name:'the-omega-institute/trureturing-books',label:'理论写作',short:'BOOKS',x:80,y:19,url:'https://github.com/the-omega-institute/trureturing-books',runs:[],tasks:[]};
  return {schema:'trureturing-live.v1',collected_at:stamp,repositories:[core,books]};
}
async function boot(data=snapshot(),live=null){
  const dom=new JSDOM(html,{url:'https://live.trureturing.org/',runScripts:'outside-only',pretendToBeVisual:true});
  const win=dom.window;
  // CSS.escape is a browser API not supplied by this DOM implementation.
  win.CSS={escape:value=>String(value).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)};
  win.fetch=async url=>({ok:true,json:async()=>structuredClone(String(url).includes('/api/live')&&live?live:data)});
  win.setInterval=()=>0;
  win.eval(script);
  await new Promise(resolve=>setImmediate(resolve));
  return {dom,win,doc:win.document};
}

test('real DOM rendering and map selection preserve source identity',async()=>{
  const {dom,doc}=await boot();
  try{
    assert.equal(doc.querySelector('#metric-running').textContent,'1');
    assert.equal(doc.querySelectorAll('.map-zone').length,2);
    assert.equal(doc.querySelectorAll('[data-focus]').length,2);
    assert.match(doc.querySelector('[data-focus="trureturing-books"]').textContent,/理论与章节/);
    assert.match(doc.querySelector('#inspector-content').textContent,/关联交付 #42/);
    assert.match(doc.querySelector('#inspector-content').textContent,/触发账号 trigger-bot/);
    doc.querySelector('[data-repo="trureturing-books"]').click();
    assert.equal(doc.querySelector('#inspector-title').textContent,'理论写作');
    assert.equal(doc.querySelector('[data-repo="trureturing-books"]').getAttribute('aria-pressed'),'true');
    assert.match(doc.querySelector('#inspector-content').textContent,/未观察到工作流记录/);
  }finally{dom.window.close();}
});

test('task tab, accessible navigation, filters and search update visible records',async()=>{
  const {dom,doc,win}=await boot();
  try{
    doc.querySelector('#tab-tasks').click();
    assert.match(doc.querySelector('#inspector-content').textContent,/An exact proof/);
    doc.querySelector('#tab-tasks').dispatchEvent(new win.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
    assert.equal(doc.querySelector('#tab-runs').getAttribute('aria-selected'),'true');
    doc.querySelector('[data-filter="active"]').click();
    assert.equal(doc.querySelectorAll('.activity-row').length,1);
    const search=doc.querySelector('#search');search.value='no-such-task';search.dispatchEvent(new win.Event('input'));
    assert.equal(doc.querySelectorAll('.activity-row').length,0);
    assert.match(doc.querySelector('#activity-list').textContent,/没有观察到记录/);
  }finally{dom.window.close();}
});

test('public text is escaped and non-GitHub task URLs cannot execute',async()=>{
  const data=snapshot();data.repositories[0].tasks[0].title='<img src=x onerror="alert(1)">';data.repositories[0].tasks[0].url='javascript:alert(1)';
  const {dom,doc}=await boot(data);
  try{
    assert.equal(doc.querySelectorAll('.activity-row img').length,0);
    const taskLink=[...doc.querySelectorAll('.activity-title')].find(node=>node.textContent.startsWith('<img'));
    assert.ok(taskLink);assert.equal(taskLink.getAttribute('href'),'#');
  }finally{dom.window.close();}
});

test('partial sources and a later fetch failure stay visibly distinct from zero activity',async()=>{
  const data=snapshot();data.repositories[1].errors=['runs_in_progress: GitHub HTTP 403'];
  const {dom,doc,win}=await boot(data);
  try{
    assert.equal(doc.querySelector('#notice').hidden,false);
    assert.match(doc.querySelector('[data-repo="trureturing-books"]').textContent,/部分来源不可用/);
    win.fetch=async()=>{throw new Error('offline');};doc.querySelector('#refresh').click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(doc.querySelector('#metric-running').textContent,'1');
    assert.match(doc.querySelector('#notice').textContent,/上次成功读取的数据/);
    assert.match(doc.querySelector('#connection-state').textContent,/暂不可用/);
  }finally{dom.window.close();}
});

test('an older response cannot replace a newer observed snapshot',async()=>{
  const {dom,doc,win}=await boot();
  try{
    const old=snapshot();old.collected_at='2020-01-01T00:00:00Z';old.repositories[0].runs=[];
    win.fetch=async()=>({ok:true,json:async()=>old});doc.querySelector('#refresh').click();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(doc.querySelector('#metric-running').textContent,'1');
    assert.match(doc.querySelector('#notice').textContent,/上次成功读取的数据/);
  }finally{dom.window.close();}
});

test('newly discovered research repositories appear without a frontend allowlist',async()=>{
  const data=snapshot();data.repositories.push({...data.repositories[1],name:'trureturing-new-theory',full_name:'the-omega-institute/trureturing-new-theory',label:'New theory'});
  const {dom,doc}=await boot(data);
  try{
    assert.equal(doc.querySelectorAll('.map-zone').length,3);
    doc.querySelector('[data-repo="trureturing-new-theory"]').click();
    assert.equal(doc.querySelector('#inspector-title').textContent,'New theory');
    assert.equal(doc.querySelector('#metric-repos').textContent,'3/3');
  }finally{dom.window.close();}
});

test('public collaboration shows actual accounts, explicit mentions and source-linked messages',async()=>{
  const message={id:'m1',kind:'comment',repository:'the-omega-institute/trureturing',number:42,thread:'the-omega-institute/trureturing#42',thread_url:'https://github.com/the-omega-institute/trureturing/issues/42',url:'https://github.com/the-omega-institute/trureturing/issues/42#issuecomment-1',actor:'research-seat',session:null,mentions:['review-seat'],created_at:stamp,updated_at:stamp,text:'Please review the exact construction.',references:[{repository:'the-omega-institute/trureturing-books',number:9,url:'https://github.com/the-omega-institute/trureturing-books/pull/9'}]};
  const live={schema:'trureturing-live-stream.v1',observed_at:stamp,messages:[message,{...message,id:'m2',actor:'review-seat',text:'The boundary case needs a correction.'}],coverage:{'the-omega-institute/trureturing':{}},focus_runs:{},errors:[]};
  const {dom,doc}=await boot(snapshot(),live);
  try{
    assert.equal(doc.querySelectorAll('.public-message').length,2);
    assert.match(doc.querySelector('#conversation-flow').textContent,/research-seat/);
    assert.match(doc.querySelector('#conversation-flow').textContent,/trureturing-books #9/);
    assert.match(doc.querySelector('#conversation-messages').textContent,/@review-seat/);
    assert.equal(doc.querySelectorAll('.message-session').length,0);
    assert.equal(doc.querySelector('.message-source').href,message.url);
    doc.querySelector('[data-thread-scope="trureturing-books"]').click();
    assert.equal(doc.querySelectorAll('.public-message').length,0);
    assert.match(doc.querySelector('#thread-list').textContent,/没有采样到公开讨论/);
  }finally{dom.window.close();}
});
