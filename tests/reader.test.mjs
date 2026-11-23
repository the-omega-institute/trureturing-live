import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readObservation} from '../api/live.mjs';

function observation(at){return {schema:'trureturing-live-stream.v1',observed_at:at,messages:[],errors:[],coverage:{}};}
test('the relay reads an immutable commit rather than the cached branch URL',async()=>{
  const sha='a'.repeat(40),urls=[];
  const result=await readObservation(async url=>{urls.push(url);return urls.length===1?{ok:true,text:async()=>`<id>tag:github.com,2008:Grit::Commit/${sha}</id>`}:{ok:true,json:async()=>observation('2026-11-23T15:00:00Z')};},{});
  assert.equal(urls[1],`https://raw.githubusercontent.com/the-omega-institute/trureturing-live/${sha}/live.json`);
  assert.equal(result.publication_sha,sha);
});
test('a changed commit advances the observation even when the branch URL would remain cached',async()=>{
  const cache={},first='a'.repeat(40),second='b'.repeat(40);
  let sha=first;
  const fetcher=async url=>url.endsWith('.atom')?{ok:true,text:async()=>`Grit::Commit/${sha}`}:{ok:true,json:async()=>observation(sha===first?'2026-11-23T15:00:00Z':'2026-11-23T15:01:00Z')};
  await readObservation(fetcher,cache);sha=second;
  const data=await readObservation(fetcher,cache);
  assert.equal(data.publication_sha,second);assert.equal(data.observed_at,'2026-11-23T15:01:00Z');
});
test('an invalid public feed cannot select an arbitrary fetch destination',async()=>{
  let calls=0;
  await assert.rejects(readObservation(async()=>{calls++;return {ok:true,text:async()=>'<id>https://other.example/private</id>'};},{}));
  assert.equal(calls,1);
});
