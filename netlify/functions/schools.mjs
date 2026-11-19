function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=600, s-maxage=3600'}})}
export default async function handler(request){
  const q=(new URL(request.url).searchParams.get('q')||'').trim();
  if(q.length<2||q.length>50)return respond({error:'학교 이름을 두 글자 이상 입력해 주세요.'},400);
  const key=process.env.NEIS_API_KEY;
  if(!key)return respond({error:'Netlify 환경변수 NEIS_API_KEY가 없습니다.'},503);
  const params=new URLSearchParams({KEY:key,Type:'json',pIndex:'1',pSize:'100',SCHUL_NM:q});
  try{
    const r=await fetch('https://open.neis.go.kr/hub/schoolInfo?'+params,{signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw Error('나이스 응답 '+r.status);
    const j=await r.json();const rows=j.schoolInfo?.find(x=>x.row)?.row||[];
    const results=rows.map(x=>({name:x.SCHUL_NM,region:x.ATPT_OFCDC_SC_CODE,code:x.SD_SCHUL_CODE,address:x.ORG_RDNMA||x.ORG_RDNDA||'',office:x.ATPT_OFCDC_SC_NM||'',kind:x.SCHUL_KND_SC_NM||''}));
    const problem=j.RESULT?.MESSAGE||'';
    if(!results.length&&problem&&!/해당하는 데이터가 없습니다/.test(problem))return respond({error:'나이스: '+problem},502);
    return respond({schools:results});
  }catch(e){return respond({error:'학교 검색에 실패했습니다: '+e.message},502)}
}
