// A fixed, public, read-only relay. No GitHub or hosting credential is used here.
const memo={sha:null,data:null};
export async function readObservation(fetcher=fetch,cache=memo){
  const response=await fetcher('https://github.com/the-omega-institute/trureturing-live/commits/live-data.atom',{headers:{'User-Agent':'trureturing-live-reader/1','Accept':'application/atom+xml'},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('public feed unavailable');
  const atom=await response.text();
  const sha=atom.match(/Grit::Commit\/([a-f0-9]{40})\b/)?.[1];
  if(!sha)throw new Error('public feed has no valid observation commit');
  if(cache.sha===sha&&cache.data)return cache.data;
  const immutable=await fetcher(`https://raw.githubusercontent.com/the-omega-institute/trureturing-live/${sha}/live.json`,{signal:AbortSignal.timeout(8000)});
  if(!immutable.ok)throw new Error('observation unavailable');
  const data=await immutable.json();
  if(data.schema!=='trureturing-live-stream.v1'||!Number.isFinite(Date.parse(data.observed_at))||!Array.isArray(data.messages)||!Array.isArray(data.errors)||!data.coverage)throw new Error('invalid observation');
  const result={...data,publication_sha:sha};cache.sha=sha;cache.data=result;return result;
}
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD, OPTIONS');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method==='OPTIONS'){res.status(204).end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.status(405).json({error:'read-only endpoint'});return;}
  try{
    const data=await readObservation();
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=10, stale-while-revalidate=10');
    res.status(200).json(data);
  }catch{
    res.setHeader('Cache-Control','no-store');
    res.status(503).json({error:'The public observation is temporarily unavailable.'});
  }
}
