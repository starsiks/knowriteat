'use strict';
const $=id=>document.getElementById(id), KEY='algo-write-eat-v1';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const defaults=()=>({nameMode:'dotted',dateMode:'dotted',trace:6,solo:2});
let state={school:null,date:today(),students:[],active:null,menus:[],selected:[],candidates:[],history:{}};
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored&&typeof stored==='object'){
  state={...state,...stored,date:today(),menus:[],selected:[],candidates:[]};
  if(!Array.isArray(state.students))state.students=[];
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
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=esc;
const student=()=>state.students.find(x=>x.id===state.active)||null;
const status=(id,msg,error=false)=>{$(id).textContent=msg;$(id).classList.toggle('err',!!error)};
const cleanMenu=s=>String(s).replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\([^)]*\)/g,'').replace(/\[[^\]]*\]/g,'').replace(/[0-9]+(?:\.[0-9]+)*/g,'').replace(/[★☆*]/g,'').trim();
const foodWords=[
'우유','두부','새우','오이','가지','고기','돼지','소고기','닭고기','닭','소시지','치킨','카레','국수','미역','계란','달걀','수박','사과','배추','바나나','포도','딸기','토마토','키위','멜론','참외','귤','레몬','복숭아','파인애플','고구마','감자','호박','버섯','당근','옥수수','콩나물','콩','시금치','브로콜리','양파','파','김치','깍두기','무','밥','볶음밥','김밥','주먹밥','떡','떡국','만두','빵','식빵','피자','국','탕','김','치즈','요거트','주스','두유','샐러드','어묵','생선','연어','고등어','멸치','김가루','자두','파프리카','유부','나물','잡채','불고기','돈가스','돈까스','소스','햄','초코','쿠키','젤리','두릅','쌀','보리','호두','아몬드','배','무침','튀김','찜'];
const isCoda=ch=>{const n=ch.charCodeAt(0)-0xac00;return n>=0&&n<11172&&n%28!==0};
const scoreWord=(w,m)=>{const arr=[...w];let score=arr.length===2?35:arr.length===3?28:arr.length===1?2:7;score-=arr.filter(isCoda).length*7;score+=(m===w?10:0);score+=Math.min(20,state.history[w]||0);if(['무침','소스','국','탕','밥','튀김','찜'].includes(w))score-=16;return score};
function candidatesFromMenus(){const found=new Map();state.menus.forEach((raw,i)=>{const m=cleanMenu(raw).replace(/[^가-힣]/g,'');for(const w of foodWords){if(m.includes(w)){
 const score=scoreWord(w,m)-i*.08; if(!found.has(w)||found.get(w)<score)found.set(w,score);
}}if(m.length>=2&&m.length<=4&&!found.has(m))found.set(m,scoreWord(m,m)-14);});return [...found].sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,32)}
function autoWords(){let out=[];for(const w of state.candidates){if(out.join('').length+w.length>9)continue;if(out.some(x=>x.includes(w)||w.includes(x)))continue;out.push(w)}if(out.length<2)for(const w of state.candidates){if(!out.includes(w)&&out.join('').length+w.length<=9)out.push(w)}state.selected=out}
function setMenus(menus){state.menus=menus.map(cleanMenu).filter(Boolean).slice(0,9);$('menuEditor').value=state.menus.join('\n');state.candidates=candidatesFromMenus();autoWords();renderWords();renderPreview();save()}
function renderWords(){ $('menus').innerHTML=state.menus.length?state.menus.map(x=>`<span class="menu">${esc(x)}</span>`).join(''):'<span class="muted">급식 메뉴가 없습니다. 직접 입력해 사용할 수 있습니다.</span>';
 const choices=[...new Set([...state.candidates,...state.selected])];$('suggestions').innerHTML=choices.length?choices.map(w=>`<button type="button" class="pill word ${state.selected.includes(w)?'active':''}" data-word="${esc(w)}">${esc(w)}</button>`).join(''):'<span class="muted">메뉴를 조회하면 추천 낱말이 나타납니다.</span>';
 $('wordCount').textContent=`선택 ${state.selected.length}개 · ${state.selected.join('').length}/9음절`;
 $('suggestions').querySelectorAll('[data-word]').forEach(el=>el.onclick=()=>toggleWord(el.dataset.word));}
function toggleWord(w){if(state.selected.includes(w))state.selected=state.selected.filter(x=>x!==w);else if(state.selected.join('').length+[...w].length>9)status('wordStatus','총 9음절을 넘을 수 없습니다.',true);else{state.selected.push(w);state.history[w]=(state.history[w]||0)+1;status('wordStatus','')}renderWords();renderPreview();save()}
function renderStudents(){const box=$('studentList');if(!state.students.length){box.innerHTML='<div class="muted">학생이 없습니다. 아래에서 추가하세요.</div>';return;}box.innerHTML=state.students.map(x=>`<div class="studentRow"><button class="name ${state.active===x.id?'active':''}" data-student="${esc(x.id)}">${esc(x.name)}</button><button class="secondary tiny danger" title="학생 삭제" data-delete="${esc(x.id)}">삭제</button></div>`).join('');box.querySelectorAll('[data-student]').forEach(b=>b.onclick=()=>{state.active=b.dataset.student;syncSettings();save()});box.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(!confirm('이 학생을 목록에서 삭제할까요?'))return;state.students=state.students.filter(x=>x.id!==b.dataset.delete);if(!student())state.active=state.students[0]?.id||null;syncSettings();save()})}
function syncSettings(){const s=student();renderStudents();document.querySelectorAll('input[name=nameMode]').forEach(r=>{r.checked=(s?.nameMode||'dotted')===r.value;r.disabled=!s});document.querySelectorAll('input[name=dateMode]').forEach(r=>{r.checked=(s?.dateMode||'dotted')===r.value;r.disabled=!s});$('traceVal').textContent=s?.trace??6;$('soloVal').textContent=s?.solo??2;$('rowTotal').textContent=`총 ${(s?.trace??6)+(s?.solo??2)} / 8줄 · 진한 본보기 1줄은 별도`;const t=s?.trace??6,v=s?.solo??2;for(const [id,disabled] of [['traceMinus',!s||t<=0],['tracePlus',!s||t+v>=8],['soloMinus',!s||v<=0],['soloPlus',!s||t+v>=8]])$(id).disabled=disabled;renderPreview()}
// A4: 794 x 1123. 엘점선체를 실제 폰트로 사용합니다.
// @font-face는 index.html에서 제공하고 PDF 래스터화 시 SVG에 내장합니다.
const WRITE_FONT="Malgun Gothic,Noto Sans CJK KR,sans-serif";
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
    }else a.push(blackText(dx+w/2,headerY+69,t,70,600));
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
        if(r===-1)a.push(blackText(bx+cellW/2,baseline,syl[i].c,size,500));
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
function renderPreview(){$('preview').innerHTML=buildSVG();}
function fitPreview(){
  const panel=document.querySelector('.previewPanel');
  const container=$('preview');
  if(!panel||!container)return;
  // 모든 설정 조절 중 A4 전체를 볼 수 있도록 화면 높이에 맞춰 축소합니다.
  if(window.matchMedia('(max-width:950px)').matches){container.style.width='100%';return;}
  const availableHeight=Math.max(250,window.innerHeight-315);
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
async function svgToJpeg(svg){const source=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const src=URL.createObjectURL(source);try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('학습지 이미지 변환에 실패했습니다.'));img.src=src});const canvas=document.createElement('canvas');canvas.width=2382;canvas.height=3369;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return{data:jpegBytes(canvas.toDataURL('image/jpeg',.94)),width:canvas.width,height:canvas.height}}finally{URL.revokeObjectURL(src)}}
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function makePDF(kind){if(!state.selected.length){status('pdfStatus','먼저 낱말을 하나 이상 선택하세요.',true);return;}const list=kind==='all'?state.students:kind==='blank'?[null]:[student()];if(!list.length||(kind==='one'&&!student())){status('pdfStatus','학생을 먼저 추가하세요. 빈 이름 학습지는 학생 등록 없이 다운로드할 수 있습니다.',true);return;}status('pdfStatus',`PDF 생성 중 (${list.length}쪽)…`);try{const imgs=[];for(const s of list){imgs.push(await svgToJpeg(buildSVG(s,kind==='blank')))}const file=createPdf(imgs);const name=kind==='blank'?'빈이름':kind==='all'?'전체학생':(student()?.name||'학습지');download(file,`${state.date}_알고쓰고먹자_${name}.pdf`);status('pdfStatus',`${list.length}쪽 PDF를 다운로드했습니다.`)}catch(e){console.error(e);status('pdfStatus','PDF 생성 오류: '+e.message,true)}}
$('searchSchool').onclick=searchSchools;$('schoolQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchSchools()});$('today').onclick=()=>{$('date').value=today();state.date=today();renderPreview();save();if(state.school)loadMeals()};$('date').onchange=()=>{state.date=$('date').value;state.menus=[];state.selected=[];state.candidates=[];renderWords();renderPreview();save();if(state.school)loadMeals()};$('loadMeals').onclick=loadMeals;
$('applyMenu').onclick=()=>{setMenus($('menuEditor').value.split(/\r?\n/));status('wordStatus','입력한 메뉴를 반영했습니다.')};$('addWord').onclick=()=>{const w=$('customWord').value.trim().replace(/\s+/g,'');if(!/^[가-힣]{1,9}$/.test(w)){status('wordStatus','한글 낱말을 1~9음절로 입력해 주세요.',true);return}if(!state.candidates.includes(w))state.candidates.unshift(w);if(!state.selected.includes(w))toggleWord(w);else renderWords();$('customWord').value=''};$('customWord').onkeydown=e=>{if(e.key==='Enter')$('addWord').click()};
$('addStudent').onclick=()=>{const name=$('newStudent').value.trim();if(!name)return;const id='s'+Date.now()+Math.random().toString(36).slice(2,6);state.students.push({id,name,...defaults()});state.active=id;$('newStudent').value='';syncSettings();save()};$('newStudent').onkeydown=e=>{if(e.key==='Enter')$('addStudent').click()};document.querySelectorAll('input[name=nameMode]').forEach(r=>r.onchange=()=>{const s=student();if(!s)return;s.nameMode=r.value;syncSettings();save()});document.querySelectorAll('input[name=dateMode]').forEach(r=>r.onchange=()=>{const s=student();if(!s)return;s.dateMode=r.value;syncSettings();save()});$('traceMinus').onclick=()=>counter('trace',-1);$('tracePlus').onclick=()=>counter('trace',1);$('soloMinus').onclick=()=>counter('solo',-1);$('soloPlus').onclick=()=>counter('solo',1);$('resetSettings').onclick=()=>{const s=student();if(!s)return;Object.assign(s,defaults());syncSettings();save()};
$('downloadOne').onclick=()=>makePDF('one');$('downloadBlank').onclick=()=>makePDF('blank');$('downloadAll').onclick=()=>makePDF('all');$('print').onclick=()=>window.print();
fitPreview();$('date').value=state.date;if(state.school){$('schoolQuery').value=state.school.name;$('chosenSchool').textContent=`✓ ${state.school.name} · ${state.school.office}`;loadMeals()}syncSettings();renderWords();
