'use strict';
const $=id=>document.getElementById(id), KEY='algo-write-eat-v1';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const defaults=()=>({nameMode:'dotted',dateMode:'dotted',trace:6,solo:2,sentenceDisplay:'hint',sheetType:'word'});
let state={school:null,date:today(),students:[],active:null,menus:[],selected:[],candidates:[],history:{},sheetType:'word',sentenceSelected:[],sentenceCommon:{},sentenceOverrides:{},sentenceScope:'common',sentenceDate:today()};
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored&&typeof stored==='object'){
  state={...state,...stored,date:today(),menus:[],selected:[],candidates:[]};
  if(!Array.isArray(state.students))state.students=[];
  if(!['word','sentence'].includes(state.sheetType))state.sheetType='word';
  if(!Array.isArray(state.sentenceSelected))state.sentenceSelected=[];
  if(!state.sentenceCommon||typeof state.sentenceCommon!=='object')state.sentenceCommon={};
  if(!state.sentenceOverrides||typeof state.sentenceOverrides!=='object')state.sentenceOverrides={};
  if(state.sentenceDate!==today()){state.sentenceSelected=[];state.sentenceCommon={};state.sentenceOverrides={};state.sentenceDate=today()}

  // v1 초기 배포에 포함된 샘플 학생만 정리합니다. 실제로 추가한 학생은 유지합니다.
  state.students=state.students.filter(x=>!(x.id==='s1'&&x.name==='양지성'));
  if(!state.students.some(x=>x.id===state.active))state.active=state.students[0]?.id||null;
}}catch{}
// v1.2: 최초 이용 시에만 중립적인 예시 학생을 제시합니다.
// 초기화 여부를 별도로 저장해 사용자가 학생을 모두 삭제해도 다시 추가되지 않도록 합니다.
try {
  const initKey='algo-write-eat-default-student-v1-2';
  if (!localStorage.getItem(initKey)) {
    if (state.students.length===0) {
      state.students.push({id:'sample-alsseumeok',name:'알쓰먹',...defaults()});
      state.active='sample-alsseumeok';
    }
    localStorage.setItem(initKey,'1');
    localStorage.setItem(KEY,JSON.stringify(state));
  }
} catch {}
const save=()=>{try{storeCurrentMode();localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=esc;
const student=()=>state.students.find(x=>x.id===state.active)||null;
// 기존 사용자 설정과 호환: 저장된 학생별 학습지 유형을 우선 적용합니다.
const activeSheetType=()=>{if(state.workMode==='basic')return 'word';const type=student()?.sheetType;return ['word','sentence'].includes(type)?type:state.sheetType;};
// 예전 버전에서 저장된 학생은 현재 선택 학생의 기존 유형을 이어받고,
// 나머지는 낱말형을 초기값으로 설정합니다. 이후 변경은 각각 독립적으로 저장됩니다.
for(const s of state.students){
 if(!['word','sentence'].includes(s.sheetType))s.sheetType=s.id===state.active?state.sheetType:'word';
}
state.sheetType=activeSheetType();
// Each mode keeps its own worksheet choices and per-student settings.
// School and student directory (id/name) are shared. Migrate existing v2.2.3
// preferences into advanced, and begin with the familiar quick/basic view.
const studentPref=(s)=>({nameMode:s.nameMode||'dotted',dateMode:s.dateMode||'dotted',trace:Number.isInteger(s.trace)?s.trace:6,solo:Number.isInteger(s.solo)?s.solo:2,sentenceDisplay:s.sentenceDisplay||'hint',sheetType:s.sheetType||'word'});
const snapshot=()=>({date:state.date,selected:[...state.selected],sentenceSelected:[...state.sentenceSelected],sentenceCommon:{...state.sentenceCommon},sentenceOverrides:JSON.parse(JSON.stringify(state.sentenceOverrides)),sentenceScope:state.sentenceScope,sentenceDate:state.sentenceDate,students:Object.fromEntries(state.students.map(s=>[s.id,studentPref(s)]))});
if(!state.modeData||!state.modeData.basic||!state.modeData.advanced){
 const previous=snapshot();
 state.modeData={basic:{...previous,students:Object.fromEntries(state.students.map(s=>[s.id,{...studentPref(s),sheetType:'word'}]))},advanced:previous};
 state.workMode='basic';
}
if(!['basic','advanced'].includes(state.workMode))state.workMode='basic';
function restoreMode(mode){
 const data=state.modeData[mode]||{};
 state.date=data.date||today();
 state.selected=Array.isArray(data.selected)?[...data.selected]:[];
 state.sentenceSelected=Array.isArray(data.sentenceSelected)?[...data.sentenceSelected]:[];
 state.sentenceCommon={...(data.sentenceCommon||{})};
 state.sentenceOverrides=JSON.parse(JSON.stringify(data.sentenceOverrides||{}));
 state.sentenceScope=data.sentenceScope||'common';
 state.sentenceDate=data.sentenceDate||today();
 for(const s of state.students){
   const own=data.students?.[s.id]||defaults();
   Object.assign(s,{...defaults(),...own,sheetType:mode==='basic'?'word':own.sheetType||'word'});
 }
 state.sheetType=mode==='basic'?'word':activeSheetType();
}
restoreMode(state.workMode);
function storeCurrentMode(){state.modeData[state.workMode]=snapshot()}
function updateModeUI(){
 const basic=state.workMode==='basic';
 $('appLayout').classList.toggle('basic',basic);
 $('appLayout').classList.toggle('advanced',!basic);
 $('basicTab').classList.toggle('active',basic);
 $('advancedTab').classList.toggle('active',!basic);
 $('basicTab').setAttribute('aria-pressed',String(basic));
 $('advancedTab').setAttribute('aria-pressed',String(!basic));
 $('menuHeading').textContent=(basic?'③':'④')+' 오늘의 메뉴와 낱말';
 $('settingHeading').textContent=(basic?'④':'⑤')+' 학생별 쓰기 설정';
 $('previewHeading').textContent=(basic?'⑤':'⑥')+' 학습지 미리보기';
}
function switchWorkMode(mode){
 if(mode===state.workMode||!['basic','advanced'].includes(mode))return;
 storeCurrentMode();
 const oldDate=state.date;
 state.workMode=mode;
 restoreMode(mode);
 updateModeUI();
 $('date').value=state.date;
 $('menuEditor').value=state.menus.join('\n');
 syncSettings();renderWords();renderExamples();renderPreview();save();
 if(oldDate!==state.date&&state.school)loadMeals();
}
const status=(id,msg,error=false)=>{$(id).textContent=msg;$(id).classList.toggle('err',!!error)};
const cleanMenu=s=>String(s).replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\([^)]*\)/g,'').replace(/\[[^\]]*\]/g,'').replace(/[0-9]+(?:\.[0-9]+)*/g,'').replace(/[★☆*]/g,'').trim();
const foodWords=[
'우유','두부','새우','오이','가지','고기','돼지','소고기','닭고기','닭','소시지','치킨','카레','국수','미역','계란','달걀','수박','사과','배추','바나나','포도','딸기','토마토','키위','멜론','참외','귤','레몬','복숭아','파인애플','고구마','감자','호박','버섯','당근','옥수수','콩나물','콩','시금치','브로콜리','양파','파','김치','깍두기','무','밥','볶음밥','김밥','주먹밥','떡','떡국','만두','빵','식빵','피자','국','탕','김','치즈','요거트','주스','두유','샐러드','어묵','생선','연어','고등어','멸치','김가루','자두','파프리카','유부','나물','잡채','불고기','돈가스','돈까스','소스','햄','초코','쿠키','젤리','두릅','쌀','보리','호두','아몬드','배','무침','튀김','찜'];
const isCoda=ch=>{const n=ch.charCodeAt(0)-0xac00;return n>=0&&n<11172&&n%28!==0};
const scoreWord=(w,m)=>{const arr=[...w];let score=arr.length===2?35:arr.length===3?28:arr.length===1?2:7;score-=arr.filter(isCoda).length*7;score+=(m===w?10:0);score+=Math.min(20,state.history[w]||0);if(['무침','소스','국','탕','밥','튀김','찜'].includes(w))score-=16;return score};
function candidatesFromMenus(){const found=new Map();state.menus.forEach((raw,i)=>{const m=cleanMenu(raw).replace(/[^가-힣]/g,'');for(const w of foodWords){if(m.includes(w)){
 const score=scoreWord(w,m)-i*.08; if(!found.has(w)||found.get(w)<score)found.set(w,score);
}}if(m.length>=2&&m.length<=4&&!found.has(m))found.set(m,scoreWord(m,m)-14);});return [...found].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,32)}
function resetSentenceForDate(){state.sentenceSelected=[];state.sentenceCommon={};state.sentenceOverrides={};state.sentenceDate=state.date;}
function updateSentenceMenus(){
  const available=state.menus;
  state.sentenceSelected=state.sentenceSelected.filter(w=>available.includes(w)||state.candidates.includes(w)).slice(0,5);
  if(!state.sentenceSelected.length)state.sentenceSelected=available.slice(0,5);
  for(const w of available)if(!Object.prototype.hasOwnProperty.call(state.sentenceCommon,w))state.sentenceCommon[w]=w;
}
function exampleFor(s,w){
  const o=state.sentenceOverrides?.[s?.id];
  return o&&Object.prototype.hasOwnProperty.call(o,w)?o[w]:(state.sentenceCommon[w]??w);
}
function autoWords(){let out=[];for(const w of state.candidates){if(out.join('').length+w.length>9)continue;if(out.some(x=>x.includes(w)||w.includes(x)))continue;out.push(w)}if(out.length<2)for(const w of state.candidates){if(!out.includes(w)&&out.join('').length+w.length<=9)out.push(w)}state.selected=out}
function setMenus(menus){state.menus=menus.map(cleanMenu).filter(Boolean).slice(0,9);$('menuEditor').value=state.menus.join('\n');state.candidates=candidatesFromMenus();autoWords();updateSentenceMenus();renderWords();renderExamples();renderPreview();save()}
function renderWords(){
 $('menus').innerHTML=state.menus.length?state.menus.map(x=>`<span class="menu">${esc(x)}</span>`).join(''):'<span class="muted">급식 메뉴가 없습니다. 직접 입력할 수 있습니다.</span>';
 const sent=state.sheetType==='sentence';
 $('selectionTitle').textContent=sent?'추천 낱말과 오늘의 메뉴 (문장 쓰기형)':'추천 낱말과 오늘의 메뉴 (낱말 쓰기형)';
 $('customWord').placeholder=sent?'예: 우유, 주먹밥':'예: 두부, 바나나';
 // 추천 낱말을 먼저, 실제 급식 메뉴는 그 뒤에 제시합니다.
 const recommended=[...new Set([...state.candidates, ...(sent?[]:state.selected.filter(w=>!state.menus.includes(w)))])];
 const originals=[...new Set(state.menus)];
 const extra=sent?state.sentenceSelected.filter(w=>!recommended.includes(w)&&!originals.includes(w)):[];
 const selected=sent?state.sentenceSelected:state.selected;
 const section=(title,words,kind)=>words.length?`<div class="choiceSection"><div class="choiceLabel">${title}</div><div class="pills">${words.map(w=>`<button type="button" class="pill word ${selected.includes(w)?'active':''}" data-word="${esc(w)}" title="${esc(w)}">${esc(w)}</button>`).join('')}</div></div>`:'';
 $('suggestions').innerHTML=(recommended.length||originals.length||extra.length)
   ?section('추천 낱말',recommended,'word')+section('오늘의 메뉴',originals,'menu')+section('직접 추가한 낱말',extra,'extra')
   :'<span class="muted">메뉴를 조회하면 선택지가 나타납니다.</span>';
 $('selectionCount').textContent=sent?`선택한 항목 ${selected.length} / 5개`:`선택한 글자 ${[...state.selected.join('')].length} / 9자`;
 $('wordCount').textContent='';
 $('selectionGuide').textContent=sent?'문장 쓰기형에서는 낱말 또는 메뉴를 최대 5개 선택할 수 있습니다. 음절 수 제한은 없습니다.':'낱말 쓰기형에서는 낱말 또는 메뉴를 합계 9음절 이내에서 선택할 수 있습니다.';
 $('suggestions').querySelectorAll('[data-word]').forEach(el=>el.onclick=()=>toggleWord(el.dataset.word));
}

function toggleWord(w){
 if(state.sheetType==='sentence'){
  if(state.sentenceSelected.includes(w))state.sentenceSelected=state.sentenceSelected.filter(x=>x!==w);
  else if(state.sentenceSelected.length>=5){status('wordStatus','문장 쓰기형은 한 페이지에 최대 5개 낱말·메뉴만 선택할 수 있습니다.',true);return}
  else{state.sentenceSelected.push(w);if(!Object.prototype.hasOwnProperty.call(state.sentenceCommon,w))state.sentenceCommon[w]=w;}
 }else{
  if(state.selected.includes(w))state.selected=state.selected.filter(x=>x!==w);
  else if([...state.selected.join('')].length+[...w].length>9){status('wordStatus','낱말 쓰기형은 선택한 낱말·메뉴의 합계가 9음절을 넘을 수 없습니다.',true);return}
  else{state.selected.push(w);state.history[w]=(state.history[w]||0)+1}
 }
 status('wordStatus','');renderWords();renderExamples();renderPreview();save();
}
function renderExamples(){
 const sentence=state.sheetType==='sentence';$('wordSettings').hidden=sentence;$('sentenceSettings').hidden=!sentence;
 if(!sentence)return;
 const scope=state.sentenceScope==='individual'?'individual':'common';
 document.querySelectorAll('input[name=exampleScope]').forEach(r=>r.checked=r.value===scope);
 const s=student(),target=$('exampleTarget'),rows=$('exampleRows');
 target.textContent=scope==='individual'?(s?`현재 학생: ${s.name} (개별 설정)`:'학생을 먼저 선택하세요.'):'전체 학생에게 공통 적용 (개별 설정은 유지)';
 rows.innerHTML=state.sentenceSelected.length?state.sentenceSelected.map((w,i)=>{
  const own=scope==='individual'&&s&&Object.prototype.hasOwnProperty.call(state.sentenceOverrides[s.id]||{},w);
  const v=scope==='individual'&&s?exampleFor(s,w):(state.sentenceCommon[w]??w);
  return `<div class="exampleRow"><div class="lab" style="margin-bottom:5px">${i+1}. ${esc(w)}${own?' · 개별 설정':''}</div><div class="line"><div class="field"><input data-example="${i}" value="${esc(v)}" maxlength="90" placeholder="예시문 (비워두기 가능)" ${scope==='individual'&&!s?'disabled':''}></div><button type="button" class="secondary tiny" data-clear="${i}" title="예시문 비우기" ${scope==='individual'&&!s?'disabled':''}>비우기</button>${scope==='individual'?`<button type="button" class="secondary tiny" data-reset="${i}" title="공통 설정으로 복귀" ${!s?'disabled':''}>공통값</button>`:''}</div></div>`;
 }).join(''):'<div class="muted">먼저 ③에서 메뉴를 선택해 주세요.</div>';
 const store=(w,v)=>{if(scope==='individual'){if(!s)return;state.sentenceOverrides[s.id]??={};state.sentenceOverrides[s.id][w]=v}else state.sentenceCommon[w]=v;renderPreview();save()};
 rows.querySelectorAll('[data-example]').forEach(el=>el.addEventListener('input',()=>store(state.sentenceSelected[Number(el.dataset.example)],el.value)));
 rows.querySelectorAll('[data-clear]').forEach(el=>el.onclick=()=>{store(state.sentenceSelected[Number(el.dataset.clear)],'');renderExamples()});
 rows.querySelectorAll('[data-reset]').forEach(el=>el.onclick=()=>{if(!s)return;const w=state.sentenceSelected[Number(el.dataset.reset)];delete (state.sentenceOverrides[s.id]||{})[w];renderExamples();renderPreview();save()});
}
function switchType(type){if(!['word','sentence'].includes(type))return;state.sheetType=type;const s=student();if(s)s.sheetType=type;document.querySelectorAll('input[name=sheetType]').forEach(r=>r.checked=r.value===type);renderWords();syncSettings();renderExamples();renderPreview();save()}
function renderStudents(){const box=$('studentList');if(!state.students.length){box.innerHTML='<div class="muted">학생이 없습니다. 아래에서 추가하세요.</div>';return;}box.innerHTML=state.students.map(x=>`<div class="studentRow"><button class="name ${state.active===x.id?'active':''}" data-student="${esc(x.id)}">${esc(x.name)}</button><button class="secondary tiny danger" title="학생 삭제" data-delete="${esc(x.id)}">삭제</button></div>`).join('');box.querySelectorAll('[data-student]').forEach(b=>b.onclick=()=>{state.active=b.dataset.student;state.sheetType=activeSheetType();syncSettings();renderWords();save()});box.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(!confirm('이 학생을 목록에서 삭제할까요?'))return;state.students=state.students.filter(x=>x.id!==b.dataset.delete);if(!student())state.active=state.students[0]?.id||null;state.sheetType=activeSheetType();syncSettings();renderWords();save()})}
function syncSettings(){const s=student();document.querySelectorAll('input[name=sheetType]').forEach(r=>r.checked=r.value===state.sheetType);renderStudents();renderExamples();document.querySelectorAll('input[name=nameMode]').forEach(r=>{r.checked=(s?.nameMode||'dotted')===r.value;r.disabled=!s});document.querySelectorAll('input[name=dateMode]').forEach(r=>{r.checked=(s?.dateMode||'dotted')===r.value;r.disabled=!s});document.querySelectorAll('input[name=sentenceDisplay]').forEach(r=>{r.checked=(s?.sentenceDisplay||'hint')===r.value;r.disabled=!s});$('sentenceDisplayTarget').textContent=s?`현재 설정 대상: ${s.name}`:'학생을 먼저 추가해 주세요.';$('traceVal').textContent=s?.trace??6;$('soloVal').textContent=s?.solo??2;$('rowTotal').textContent=`총 ${(s?.trace??6)+(s?.solo??2)} / 8줄 · 진한 본보기 1줄은 별도`;const t=s?.trace??6,v=s?.solo??2;for(const [id,disabled] of [['traceMinus',!s||t<=0],['tracePlus',!s||t+v>=8],['soloMinus',!s||v<=0],['soloPlus',!s||t+v>=8]])$(id).disabled=disabled;renderPreview()}
// A4: 794 x 1123. 엘점선체를 실제 폰트로 사용합니다.
// @font-face는 index.html에서 제공하고 PDF 래스터화 시 SVG에 내장합니다.
const WRITE_FONT="'NanumGothicLocal','NanumGothic','Malgun Gothic',sans-serif";
const UI_FONT="Malgun Gothic,Noto Sans CJK KR,sans-serif";
const DASH_FONT="ElDot";
function strokeText(x,y,txt,size,anchor='middle'){
  // 엘점선체 원본 글리프의 실제 윤곽을 SVG path로 출력합니다.
  // 본문은 처음부터 점선체 글꼴이므로 겹윤곽선/인위적인 획 조합이 없습니다.
  const glyphs=[...String(txt)].map(ch=>[ch,window.EL_DOT_GLYPHS?.[ch]]);
  const advance=glyphs.reduce((sum,[c,g])=>sum+(g?g[0]:940),0)*size/1000;
  let left=x-(anchor==='start'?0:anchor==='end'?advance:advance/2),out='';
  for(const [c,g] of glyphs){
    if(g){out+=`<path d="${g[1]}" transform="translate(${left.toFixed(3)} ${y.toFixed(3)}) scale(${(size/1000).toFixed(5)} ${(-size/1000).toFixed(5)})" fill="#999"/>`;left+=g[0]*size/1000;}
    else{out+=`<text x="${left}" y="${y}" font-size="${size}" fill="#999" font-family="${DASH_FONT}">${xml(c)}</text>`;left+=size*.94;}
  }
  return out;
}
const blackText=(x,y,txt,size,weight=400,anchor='middle',font=WRITE_FONT)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="#111">${xml(txt)}</text>`;
const rect=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#111" stroke-width="1.1"/>`;
function buildSVG(s=student(),blankOverride=false){
  const mode=blankOverride?'blank':s?.nameMode||'blank';
  const dateMode=s?.dateMode||'dotted';
  const name=blankOverride?'':s?.name||'';
  const date=new Date((state.date||today())+'T12:00:00');
  const mon=date.getMonth()+1, day=date.getDate();
  const chars=[...name].slice(0,8);
  const syl=state.selected.flatMap((w,i)=>[...w].map((c,j)=>({c,first:j===0,word:i})));
  const n=Math.max(1,syl.length), trace=s?.trace??6, solo=s?.solo??2;
  const M=37.8, RIGHT=794-M, BOTTOM=1123-M, FULL=794-2*M;
  const headerY=M, headerRowH=88, headerH=headerRowH*2;
  const titleW=96, labelW=51, fieldX=M+titleW+labelW, fieldW=FULL-titleW-labelW;
  const writingY=headerY+headerH+10, headH=85, rowH=(BOTTOM-writingY-headH)/8;
  const cellW=FULL/n;
  let a=[`<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123"><rect width="794" height="1123" fill="white"/>`];
  // 제목을 세로 3줄로, 날짜와 이름은 같은 머리표 안의 각 행으로 배치
  a.push(rect(M,headerY,titleW,headerH));
  a.push(`<rect x="${M}" y="${headerY}" width="${titleW}" height="${headerH}" fill="#e8e8e8" stroke="#111" stroke-width="1.1"/>`);
  a.push(blackText(M+titleW/2,headerY+48,'알고',27,600,'middle',UI_FONT));
  a.push(blackText(M+titleW/2,headerY+101,'쓰고',27,600,'middle',UI_FONT));
  a.push(blackText(M+titleW/2,headerY+154,'먹자',27,600,'middle',UI_FONT));
  a.push(rect(M+titleW,headerY,labelW,headerRowH),rect(M+titleW,headerY+headerRowH,labelW,headerRowH));
  a.push(blackText(M+titleW+labelW/2,headerY+headerRowH/2+6,'날짜',15,500,'middle',UI_FONT));
  a.push(blackText(M+titleW+labelW/2,headerY+headerRowH+headerRowH/2+6,'이름',15,500,'middle',UI_FONT));
  // 날짜의 네 칸 (월 숫자 / 월 / 일 숫자 / 일)
  const dw=[fieldW*.28,fieldW*.22,fieldW*.28,fieldW*.22];
  let dx=fieldX;
  for(const [i,t] of [String(mon),'월',String(day),'일'].entries()){
    const w=dw[i];a.push(rect(dx,headerY,w,headerRowH));
    if(i%2===0){
      if(dateMode==='dotted')a.push(strokeText(dx+w/2,headerY+68,t,65));
      else if(dateMode==='hint')a.push(blackText(dx+9,headerY+22,t,21,400,'start'));
      // blank: 숫자를 제시하지 않고 빈칸으로 둡니다.
    }else a.push(blackText(dx+w/2,headerY+69,t,70,400));
    dx+=w;
  }
  // 이름: 모든 가용 폭을 활용하여 점선 / 좌상단 글자 / 빈칸을 표시
  const nameY=headerY+headerRowH;
  if(mode==='blank'||!chars.length)a.push(rect(fieldX,nameY,fieldW,headerRowH));
  else{
    const cw=fieldW/chars.length;
    chars.forEach((c,i)=>{
      const bx=fieldX+i*cw;a.push(rect(bx,nameY,cw,headerRowH));
      if(mode==='dotted')a.push(strokeText(bx+cw/2,nameY+68,c,Math.min(74,cw*.79)));
      else a.push(blackText(bx+9,nameY+22,c,20,400,'start'));
    });
  }
  // 10mm 여백 사이 전폭을 사용하는 글자 쓰기 표
  if(!syl.length){
    a.push(rect(M,writingY,FULL,headH));
    a.push(blackText(397,writingY+55,'급식 메뉴에서 낱말을 선택해 주세요',24,400,'middle',UI_FONT));
  }else{
    for(let r=-1;r<trace+solo;r++){
      const y=r===-1?writingY:writingY+headH+r*rowH;
      const h=r===-1?headH:rowH;
      a.push(rect(M,y,FULL,h));
      for(let i=0;i<n;i++){
        const bx=M+i*cellW;
        if(i>0)a.push(`<line x1="${bx}" y1="${y}" x2="${bx}" y2="${y+h}" stroke="#111" stroke-width=".8"/>`);
        const size=Math.min(78,cellW*.79,h*.77);
        const baseline=y+(h+size)*.5-3;
        if(r===-1)a.push(blackText(bx+cellW/2,baseline,syl[i].c,size,400));
        else if(r<trace)a.push(strokeText(bx+cellW/2,baseline,syl[i].c,size));
      }
    }
    const bottom=writingY+headH+(trace+solo)*rowH;
    for(let i=1;i<n;i++)if(syl[i].first){
      const bx=M+i*cellW;
      a.push(`<line x1="${bx-2.2}" y1="${writingY}" x2="${bx-2.2}" y2="${bottom}" stroke="#111" stroke-width="1.7"/>`);
      a.push(`<line x1="${bx+2.2}" y1="${writingY}" x2="${bx+2.2}" y2="${bottom}" stroke="#111" stroke-width="1.7"/>`);
    }
  }
  a.push('</svg>');return a.join('');
}
function buildSentenceSVG(s=student()){
 const M=37.8,FULL=794-2*M,BOTTOM=1123-M,hy=M,hh=88,titleW=96,labelW=51,fieldX=M+titleW+labelW,fieldW=FULL-titleW-labelW;
 const date=new Date((state.date||today())+'T12:00:00'),mon=date.getMonth()+1,day=date.getDate();
 const name=[...String(s?.name||'')].slice(0,8),mode=s?.nameMode||'blank',dateMode=s?.dateMode||'dotted';
 let a=[`<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123"><rect width="794" height="1123" fill="white"/>`];
 a.push(`<rect x="${M}" y="${hy}" width="${titleW}" height="176" fill="#e8e8e8" stroke="#111" stroke-width="1.1"/>`);
 for(const [t,dy] of [['알고',48],['쓰고',101],['먹자',154]])a.push(blackText(M+titleW/2,hy+dy,t,27,600,'middle',UI_FONT));
 a.push(rect(M+titleW,hy,labelW,hh),rect(M+titleW,hy+hh,labelW,hh));
 a.push(blackText(M+titleW+labelW/2,hy+hh/2+6,'날짜',15,500,'middle',UI_FONT),blackText(M+titleW+labelW/2,hy+hh+hh/2+6,'이름',15,500,'middle',UI_FONT));
 const dw=[fieldW*.28,fieldW*.22,fieldW*.28,fieldW*.22];let dx=fieldX;
 for(const [i,t] of [String(mon),'월',String(day),'일'].entries()){
  const w=dw[i];a.push(rect(dx,hy,w,hh));
  if(i%2===0){if(dateMode==='dotted')a.push(strokeText(dx+w/2,hy+68,t,65));else if(dateMode==='hint')a.push(blackText(dx+9,hy+22,t,21,400,'start'))}
  else a.push(blackText(dx+w/2,hy+69,t,70,400));dx+=w;
 }
 const ny=hy+hh;
 if(mode==='blank'||!name.length)a.push(rect(fieldX,ny,fieldW,hh));
 else{const cw=fieldW/name.length;name.forEach((c,i)=>{const bx=fieldX+i*cw;a.push(rect(bx,ny,cw,hh));if(mode==='dotted')a.push(strokeText(bx+cw/2,ny+68,c,Math.min(74,cw*.79)));else a.push(blackText(bx+9,ny+22,c,20,400,'start'))})}
 const list=state.sentenceSelected.slice(0,5),writingY=hy+176+12;
 if(!list.length){a.push(rect(M,writingY,FULL,140));a.push(blackText(397,writingY+76,'문장 쓰기에 사용할 메뉴를 선택해 주세요',22,400,'middle',UI_FONT));}
 else{
  const blockH=(BOTTOM-writingY)/list.length;
  list.forEach((w,i)=>{
   const y=writingY+i*blockH,wordH=Math.min(77,Math.max(55,blockH*.21)),writeY=y+wordH+5,writeH=blockH-wordH-10;
   const arr=[...w],charW=Math.min(67,FULL/Math.max(arr.length,1)),size=Math.min(58,charW*.78);
   arr.forEach((c,j)=>{const x=M+j*charW;a.push(rect(x,y,charW,wordH));a.push(blackText(x+charW/2,y+(wordH+size)/2-4,c,size,400))});
   a.push(rect(M,writeY,FULL,writeH));
   const example=s?.sentenceDisplay==='blank'?'':String(exampleFor(s,w)||'');
   if(example){const lines=wrapExample(example,36,3);lines.forEach((line,k)=>a.push(blackText(M+10,writeY+24+k*22,line,18,400,'start',WRITE_FONT)))}
  });
 }
 a.push('</svg>');return a.join('');
}
function wrapExample(t,max,lines){const chars=[...t].slice(0,max*lines),out=[];for(let i=0;i<chars.length;i+=max)out.push(chars.slice(i,i+max).join(''));return out.slice(0,lines)}
function activeSVG(s=student()){return (s?.sheetType||state.sheetType)==='sentence'?buildSentenceSVG(s):buildSVG(s)}
function renderPreview(){$('preview').innerHTML=activeSVG();}
function fitPreview(){
  const panel=document.querySelector('.previewPanel');
  const container=$('preview');
  if(!panel||!container)return;
  // 모든 설정 조절 중 A4 전체를 볼 수 있도록 화면 높이에 맞춰 축소합니다.
  if(window.matchMedia('(max-width:820px)').matches){container.style.width='100%';return;}
  const availableHeight=Math.max(250,window.innerHeight-252);
  const availableWidth=Math.max(220,panel.clientWidth-40);
  container.style.width=Math.min(620,availableWidth,availableHeight*210/297)+'px';
}
window.addEventListener('resize',fitPreview);

async function searchSchools(){const q=$('schoolQuery').value.trim();if(q.length<2){status('schoolStatus','학교 이름을 두 글자 이상 입력해 주세요.',true);return;}status('schoolStatus','학교 검색 중…');$('schoolResults').style.display='none';try{const r=await fetch('/api/schools?q='+encodeURIComponent(q));const j=await r.json();if(!r.ok)throw Error(j.error||'학교 검색 오류');const list=j.schools||[];status('schoolStatus',`검색 결과 ${list.length}개 · 학교를 선택하세요.`);const box=$('schoolResults');box.innerHTML=list.map((x,i)=>`<button type="button" data-i="${i}"><strong>${esc(x.name)} <small style="display:inline">${esc(x.kind)}</small></strong><small>${esc(x.office)} · ${esc(x.address)}</small></button>`).join('')||'<div class="muted" style="padding:12px">검색 결과가 없습니다.</div>';box.style.display='block';box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{state.school=list[Number(b.dataset.i)];$('chosenSchool').textContent=`✓ ${state.school.name} · ${state.school.office}`;$('schoolQuery').value=state.school.name;box.style.display='none';status('schoolStatus','');save();loadMeals()});}catch(e){status('schoolStatus',e.message,true)}}
let seq=0;async function loadMeals(){state.date=$('date').value;save();if(!state.school){status('schoolStatus','학교를 먼저 검색해 선택하세요.',true);return;}const id=++seq;status('schoolStatus','급식 조회 중…');try{const day=state.date.replace(/-/g,'');const url=`/api/meals?region=${encodeURIComponent(state.school.region)}&school=${encodeURIComponent(state.school.code)}&date=${day}`;const r=await fetch(url);const j=await r.json();if(!r.ok)throw Error(j.error||'급식 조회 오류');if(id!==seq)return;setMenus(j.menus||[]);status('schoolStatus',j.hasMeal?'급식 정보를 불러왔습니다.':'해당 날짜 점심 급식 정보가 없습니다. 메뉴를 직접 입력할 수 있습니다.');}catch(e){if(id!==seq)return;status('schoolStatus',e.message,true);setMenus([])}}
function counter(which,delta){const s=student();if(!s)return;const v=s[which]+delta;if(v<0||v+(which==='trace'?s.solo:s.trace)>8)return;s[which]=v;syncSettings();save()}
// PNG가 아닌 고해상도 JPEG를 PDF XObject로 직접 삽입하여 외부 JS 라이브러리 없이 1개 이상 페이지 생성
const encoder=new TextEncoder();const bytes=s=>encoder.encode(s);
function createPdf(jpegs){const chunks=[];let total=0;const append=b=>{chunks.push(b);total+=b.length};const write=s=>append(bytes(s));const offsets=[0];const object=(id,content)=>{offsets[id]=total;write(`${id} 0 obj\n${content}\nendobj\n`)};
write('%PDF-1.4\n%\xC2\xA0\xC2\xA0\n');const count=jpegs.length,root=1,pages=2;const kids=jpegs.map((_,i)=>`${3+i*3} 0 R`).join(' ');object(root,'<< /Type /Catalog /Pages 2 0 R >>');object(pages,`<< /Type /Pages /Kids [${kids}] /Count ${count} >>`);
for(let i=0;i<count;i++){const page=3+i*3,img=page+1,content=page+2,jpeg=jpegs[i];object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`);
 offsets[img]=total;write(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${jpeg.width} /Height ${jpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.data.length} >>\nstream\n`);append(jpeg.data);write('\nendstream\nendobj\n');
 const cmd=`q\n595.28 0 0 841.89 0 0 cm\n/Im${i} Do\nQ\n`;object(content,`<< /Length ${bytes(cmd).length} >>\nstream\n${cmd}endstream`);}
const start=total;const max=2+3*count;write(`xref\n0 ${max+1}\n0000000000 65535 f \n`);for(let i=1;i<=max;i++)write(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);write(`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(chunks,{type:'application/pdf'});}
function jpegBytes(dataURL){const base64=dataURL.split(',')[1];const str=atob(base64),u=new Uint8Array(str.length);for(let i=0;i<str.length;i++)u[i]=str.charCodeAt(i);return u}
async function svgToJpeg(svg){
 // SVG가 이미지로 변환될 때 외부 웹폰트를 대체할 수 있으므로,
 // 본보기 글자는 문서에 로드된 글꼴로 캔버스에 직접 그립니다.
 await document.fonts.load('400 78px NanumGothicLocal');
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
 const labels=[...doc.querySelectorAll('text')].map(t=>({x:Number(t.getAttribute('x')),y:Number(t.getAttribute('y')),text:t.textContent,
  family:t.getAttribute('font-family')||WRITE_FONT,size:Number(t.getAttribute('font-size')||20),weight:Number(t.getAttribute('font-weight')||400),
  align:t.getAttribute('text-anchor')||'middle',fill:t.getAttribute('fill')||'#111'}));
 doc.querySelectorAll('text').forEach(t=>t.remove());
 const base=new XMLSerializer().serializeToString(doc.documentElement);
 const source=new Blob([base],{type:'image/svg+xml;charset=utf-8'}),src=URL.createObjectURL(source);
 try{
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('학습지 이미지 변환에 실패했습니다.'));img.src=src});
  const canvas=document.createElement('canvas');canvas.width=2382;canvas.height=3369;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  ctx.save();ctx.scale(3,3);ctx.textBaseline='alphabetic';
  for(const t of labels){ctx.font=`${t.weight} ${t.size}px ${t.family}`;ctx.fillStyle=t.fill;ctx.textAlign=t.align==='start'?'left':t.align==='end'?'right':'center';ctx.fillText(t.text,t.x,t.y)}
  ctx.restore();return{data:jpegBytes(canvas.toDataURL('image/jpeg',.94)),width:canvas.width,height:canvas.height};
 }finally{URL.revokeObjectURL(src)}
}
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function makePDF(kind){
 const list=kind==='all'?state.students:[student()];
 if(!list.length||!list[0]){status('pdfStatus','학생을 먼저 등록하고 선택하세요.',true);return}
 const hasWords=state.selected.length>0,hasSentences=state.sentenceSelected.length>0;
 const missing=[...new Set(list.filter(s=>(s.sheetType||'word')==='sentence'?!hasSentences:!hasWords).map(s=>s.sheetType==='sentence'?'문장 쓰기형':'낱말 쓰기형'))];
 if(missing.length){status('pdfStatus',missing.join('·')+'에 사용할 낱말 또는 메뉴를 먼저 선택해 주세요.',true);return}
 status('pdfStatus',`PDF 생성 중 (${list.length}쪽)…`);
 try{
  const imgs=[];
  for(const s of list)imgs.push(await svgToJpeg(activeSVG(s)));
  const file=createPdf(imgs),name=kind==='all'?'전체학생':student().name;
  const types=new Set(list.map(s=>s.sheetType||'word'));
  const desc=types.size>1?'학생별유형':types.has('sentence')?'문장쓰기':'낱말쓰기';
  download(file,`${state.date}_알고쓰고먹자_${desc}_${name}.pdf`);
  status('pdfStatus',`${list.length}쪽 PDF를 다운로드했습니다.`);
 }catch(e){console.error(e);status('pdfStatus','PDF 생성 오류: '+e.message,true)}
}

$('searchSchool').onclick=searchSchools;$('schoolQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchSchools()});$('today').onclick=()=>{$('date').value=today();state.date=today();resetSentenceForDate();renderPreview();save();if(state.school)loadMeals()};$('date').onchange=()=>{state.date=$('date').value;resetSentenceForDate();state.menus=[];state.selected=[];state.candidates=[];renderWords();renderExamples();renderPreview();save();if(state.school)loadMeals()};$('loadMeals').onclick=loadMeals;
$('applyMenu').onclick=()=>{setMenus($('menuEditor').value.split(/\r?\n/));status('wordStatus','입력한 메뉴를 반영했습니다.')};$('addWord').onclick=()=>{const w=$('customWord').value.trim().replace(/\s+/g,'');if(!/^[가-힣]{1,45}$/.test(w)||(state.sheetType==='word'&&[...w].length>9)){status('wordStatus',state.sheetType==='word'?'한글 낱말을 1~9음절로 입력해 주세요.':'한글 메뉴명을 입력해 주세요.',true);return}if(state.sheetType==='sentence'){if(!state.menus.includes(w))state.menus.push(w);if(!state.sentenceSelected.includes(w))toggleWord(w);else renderWords()}else{if(!state.candidates.includes(w))state.candidates.unshift(w);if(!state.selected.includes(w))toggleWord(w);else renderWords()}$('customWord').value=''};$('customWord').onkeydown=e=>{if(e.key==='Enter')$('addWord').click()};
$('addStudent').onclick=()=>{const name=$('newStudent').value.trim();if(!name)return;const id='s'+Date.now()+Math.random().toString(36).slice(2,6);state.students.push({id,name,...defaults(),sheetType:state.sheetType});state.active=id;$('newStudent').value='';syncSettings();renderExamples();save()};$('newStudent').onkeydown=e=>{if(e.key==='Enter')$('addStudent').click()};document.querySelectorAll('input[name=nameMode]').forEach(r=>r.onchange=()=>{const s=student();if(!s)return;s.nameMode=r.value;syncSettings();save()});document.querySelectorAll('input[name=dateMode]').forEach(r=>r.onchange=()=>{const s=student();if(!s)return;s.dateMode=r.value;syncSettings();save()});$('traceMinus').onclick=()=>counter('trace',-1);$('tracePlus').onclick=()=>counter('trace',1);$('soloMinus').onclick=()=>counter('solo',-1);$('soloPlus').onclick=()=>counter('solo',1);$('resetSettings').onclick=()=>{const s=student();if(!s)return;Object.assign(s,{...defaults(),sheetType:s.sheetType||state.sheetType});syncSettings();save()};
$('downloadOne').onclick=()=>makePDF('one');$('downloadAll').onclick=()=>makePDF('all');$('print').onclick=()=>window.print();
document.querySelectorAll('input[name=sentenceDisplay]').forEach(r=>r.onchange=()=>{const s=student();if(!s)return;s.sentenceDisplay=r.value;syncSettings();save()});document.querySelectorAll('input[name=sheetType]').forEach(r=>r.onchange=()=>switchType(r.value));document.querySelectorAll('input[name=exampleScope]').forEach(r=>r.onchange=()=>{state.sentenceScope=r.value;renderExamples();save()});document.querySelectorAll('input[name=sheetType]').forEach(r=>r.checked=r.value===state.sheetType);fitPreview();$('date').value=state.date;if(state.school){$('schoolQuery').value=state.school.name;$('chosenSchool').textContent=`✓ ${state.school.name} · ${state.school.office}`;loadMeals()}syncSettings();renderWords();renderExamples();

$('basicTab').onclick=()=>switchWorkMode('basic');$('advancedTab').onclick=()=>switchWorkMode('advanced');updateModeUI();