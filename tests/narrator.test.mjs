import test from 'node:test';
import assert from 'node:assert/strict';
import {narrate} from '../site/assets/narrator.mjs';
import {writeSegments} from '../client/guide-model.mjs';

test('a tour crosses 24 hours, recovers a connection failure and never overlaps speech or carries a conversation forward', async () => {
  const controller = new AbortController();
  let clock = 0, requests = 0, shown = 0, spoken = 0, active = false, retries = 0;
  const connection = {request: async (slug, path, init) => {
    assert.equal(slug, 'llm-nyx');
    assert.deepEqual(path, ['v1','responses']);
    const request = JSON.parse(init.body);
    assert.equal(request.conversation, undefined);
    const input = JSON.parse(request.input);
    assert.equal(input.context.observedAt, clock);
    requests++;
    if (requests === 25) return new Response(null, {status:503});
    return Response.json({id:'r' + requests, conversation:{id:'c' + requests}, status:'completed',
      output:[{type:'message', role:'assistant', content:[{type:'output_text', text: JSON.stringify({
        target:input.context.stops[0].target, text:'Read observation ' + input.context.observedAt
      })}]}]});
  }};
  await narrate({
    sample: (idx, previous) => {
      assert.equal(idx, spoken);
      assert.ok(!active);
      if (idx > 0) assert.match(previous, /Read observation/);
      return {language:'en', observedAt:clock, stops:[{target:idx % 2 ? 'questions' : 'department:research'}]};
    },
    write:writeSegments(connection, undefined, 'Explain the dashboard.'),
    show: target => { assert.ok(!active); assert.equal(target, shown % 2 ? 'questions' : 'department:research'); shown++; return true; },
    caption: () => {}, retrying: () => {retries++;},
    speak:async () => {active=true; await Promise.resolve(); clock+=30_000; spoken++; active=false;},
    wait:async ms => {clock+=ms; if(clock>=25*3600_000) controller.abort();},
  }, controller.signal);
  assert.equal(retries, 1);
  assert.equal(shown, spoken);
  assert.equal(requests, spoken + 1);
  assert.ok(spoken > 2600);
});

test('stopping while generating fences the late result and makes no more scene or speech changes', async () => {
  const controller = new AbortController();
  const pending = Promise.withResolvers();
  const run = narrate({sample:()=>({}), write:()=>pending.promise,
    show:()=>assert.fail('late navigation'), caption:()=>assert.fail('late caption'),
    speak:()=>assert.fail('late speech'), retrying:()=>assert.fail('late retry')}, controller.signal);
  controller.abort();
  pending.resolve({target:'overview', text:'old'});
  await run;
});
