function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=900, s-maxage=3600'}})}
export default async function handler(request){
  const p=new URL(request.url).searchParams,region=p.get('region')||'',school=p.get('school')||'',date=p.get('date')||'';
  if(!/^[A-Z]\d{2}$/.test(region)||!/^[0-9]{7,10}$/.test(school)||!/^20\d{6}$/.test(date))return respond({error:'학교와 날짜 정보가 올바르지 않습니다.'},400);
  const key=process.env.NEIS_API_KEY;if(!key)return respond({error:'Netlify 환경변수 NEIS_API_KEY가 없습니다.'},503);
  const params=new URLSearchParams({KEY:key,Type:'json',pIndex:'1',pSize:'100',ATPT_OFCDC_SC_CODE:region,SD_SCHUL_CODE:school,MLSV_YMD:date,MMEAL_SC_CODE:'2'});
  try{
    const r=await fetch('https://open.neis.go.kr/hub/mealServiceDietInfo?'+params,{signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw Error('나이스 응답 '+r.status);
    const j=await r.json(),rows=j.mealServiceDietInfo?.find(x=>x.row)?.row||[];
    const issue=j.RESULT?.MESSAGE||j.mealServiceDietInfo?.find(x=>x.head)?.head?.find(x=>x.RESULT)?.RESULT?.MESSAGE||'';
    if(!rows.length&&issue&&!/해당하는 데이터가 없습니다/.test(issue))return respond({error:'나이스: '+issue},502);
    const lines=rows.filter(x=>x.MMEAL_SC_CODE==='2').flatMap(x=>String(x.DDISH_NM||'').split(/<br\s*\/?\s*>|\n/gi).map(y=>y.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim()).filter(Boolean));
    return respond({menus:lines,hasMeal:lines.length>0});
  }catch(e){return respond({error:'급식 조회에 실패했습니다: '+e.message},502)}
}
