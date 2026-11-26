/* One persistent audio element for the entire site. It never leaves the document during modal moves. */
(function(){
 function initMusic(){
  const boxes=[...document.querySelectorAll('.abyss-bgm')];
  const tracks=new Map();
  const audio=document.getElementById('persistent-world-audio');
  audio.loop=true;
  audio.preload='none';
  const repeatToggle=document.getElementById('music-repeat');
  repeatToggle?.addEventListener('click',()=>{audio.loop=!audio.loop;repeatToggle.textContent=audio.loop?'↻ 반복 ON':'↻ 반복 OFF';repeatToggle.setAttribute('aria-pressed',String(audio.loop));repeatToggle.title=audio.loop?'반복 재생 켜짐':'반복 재생 꺼짐';});
  const dock=document.getElementById('music-dock');
  const dockToggle=document.getElementById('music-dock-toggle');
  const dockPanel=document.getElementById('music-dock-panel');
  const dockClose=document.getElementById('music-dock-close');
  const dockLive=document.getElementById('music-dock-live');
  const dockLabel=document.querySelector('.music-dock-label');
  const owner=document.getElementById('mini-track-owner');
  const song=document.getElementById('mini-track-song');
  const miniPlay=document.getElementById('mini-play');
  const miniStop=document.getElementById('mini-stop');
  const miniSeek=document.getElementById('mini-seek');
  const miniClock=document.getElementById('mini-clock');
  const miniSec=document.getElementById('mini-sec');
  const miniState=document.getElementById('mini-state');
  const volume=document.getElementById('music-volume');
  const volumeValue=document.getElementById('music-volume-value');
  const mute=document.getElementById('music-mute');
  const clampVolume=n=>Math.max(0,Math.min(100,Math.round(Number(n)||0)));
  let savedVolume=70;
  try{const stored=localStorage.getItem('commanderMusicVolume');if(stored!==null)savedVolume=clampVolume(stored)}catch(_){}
  audio.volume=savedVolume/100;
  function setVolume(value,remember=true){
    const n=clampVolume(value);audio.volume=n/100;audio.muted=false;
    if(volume)volume.value=String(n);
    if(volumeValue)volumeValue.textContent=n+'%';
    if(mute){mute.textContent=n===0?'🔇':'🔊';mute.setAttribute('aria-label',n===0?'음악 음소거 해제':'음악 음소거');mute.setAttribute('aria-pressed',String(n===0))}
    if(volume)volume.style.setProperty('--pct',n+'%');
    if(remember)try{localStorage.setItem('commanderMusicVolume',String(n))}catch(_){}
  }
  setVolume(savedVolume,false);
  volume?.addEventListener('input',()=>setVolume(volume.value));
  mute?.addEventListener('click',()=>{
    if(audio.muted || audio.volume===0){setVolume(savedVolume||70)}
    else {savedVolume=Math.round(audio.volume*100)||70;setVolume(0)}
  });
  volume?.addEventListener('change',()=>{if(Number(volume.value)>0)savedVolume=Number(volume.value)});

  let key='hunter', error='';
  const format=s=>{const n=Math.floor(Math.max(0,Number(s)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
  for(const box of boxes){
    const k=box.dataset.bgm;
    const seek=box.querySelector('[data-bgm-seek]');
    tracks.set(k,{key:k,box,url:box.dataset.trackUrl,owner:box.dataset.trackName||k,song:box.dataset.trackSong||'',fallback:Number(seek?.max)||0,play:box.querySelector('[data-bgm-play]'),stop:box.querySelector('[data-bgm-stop]'),seek,clock:box.querySelector('[data-bgm-clock]'),secs:box.querySelector('[data-bgm-sec]'),state:box.querySelector('[data-bgm-state]')});
  }
  const duration=()=>{const track=tracks.get(key);return Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:(track?.fallback||0)};
  const selected=()=>tracks.get(key);
  const songButtons=new Map([...document.querySelectorAll('.song-card button[data-song]')].map(b=>[b.dataset.song,b]));
  let lastRenderedKey=null;
  const putText=(el,v)=>{if(el&&el.textContent!==v)el.textContent=v};
  function panel(open){dockPanel.hidden=!open;dockToggle.setAttribute('aria-expanded',String(open));dock.classList.toggle('is-open',open)}
  function update(){
    const active=selected(); if(!active)return;
    const playing=!audio.paused&&!audio.ended;
    const t=Math.max(0,audio.currentTime||0),d=duration(),pct=d?Math.min(100,100*t/d):0;
    const status=error||(!audio.paused?(audio.ended?'재생 완료':'재생 중'):(audio.ended?'재생 완료':'재생 대기'));
    dock.classList.toggle('is-playing',playing);
    dockLive.textContent=playing?'● 재생 중':'Ⅱ 일시정지';
    dockLive.classList.toggle('playing',playing);
    dockLabel.textContent=active.owner;
    owner.textContent=active.owner;song.textContent=active.song;
    miniClock.textContent=format(t)+' / '+format(d);
    miniSec.textContent=Math.floor(t)+'초';miniState.textContent=status;
    miniSeek.max=String(d||1);miniSeek.value=String(Math.min(t,d));miniSeek.style.setProperty('--pct',pct+'%');
    miniPlay.textContent=playing?'Ⅱ':'▶';miniPlay.setAttribute('aria-label',playing?'음악 일시정지':'음악 재생');
    const renderTracks=lastRenderedKey===null?[...tracks.values()]:[...new Set([tracks.get(key),tracks.get(lastRenderedKey)])].filter(Boolean);
    for(const track of renderTracks){
      const current=track.key===key;
      const time=current?t:0,total=current?d:track.fallback;
      if(track.play) track.play.textContent=current&&playing?'Ⅱ 일시정지':'▶ 재생';
      if(track.clock) track.clock.textContent=format(time)+' / '+format(total);
      if(track.secs) track.secs.textContent=Math.floor(time)+'초';
      if(track.state) track.state.textContent=current?status:'재생 버튼을 누르세요';
      if(track.seek){track.seek.max=String(total||1);track.seek.value=String(Math.min(time,total));track.seek.style.setProperty('--pct',current?pct+'%':'0%')}
      track.box.dataset.playing=current&&playing?'yes':'no';
      const b=songButtons.get(track.key);
      if(b){b.textContent=current&&playing?'Ⅱ 일시정지':'▶ 재생';b.closest('.song-card')?.classList.toggle('playing',current&&playing)}
    }
    lastRenderedKey=key;
  }
  function selectTrack(next){
    if(!tracks.has(next))return false;
    if(key!==next || !audio.getAttribute('src')){
      audio.pause();key=next;error='';
      audio.src=tracks.get(key).url;
      audio.load();
    }
    update();return true;
  }
  async function playCurrent(){
    const track=selected();if(!track)return;
    selectTrack(track.key);
    error='';
    try{await audio.play()}catch(ex){error='재생할 수 없어요 · 음원 경로를 확인하세요'}
    update();
  }
  function toggle(next=key){
    if(next===key && !audio.paused && !audio.ended){audio.pause();update();return}
    if(!selectTrack(next))return;
    playCurrent();
  }
  function stop(){audio.pause();try{audio.currentTime=0}catch(_){}error='';update()}
  function jump(n){try{audio.currentTime=Math.max(0,Math.min(duration(),Number(n)||0))}catch(_){}update()}
  window.worldMusic={play:key=>{if(selectTrack(key)){playCurrent()}},toggle,stop,open:()=>panel(true),current:()=>key,audio};
  for(const track of tracks.values()){
    track.play?.addEventListener('click',()=>toggle(track.key));
    track.stop?.addEventListener('click',stop);
    track.seek?.addEventListener('input',()=>{if(key!==track.key)selectTrack(track.key);jump(track.seek.value)});
  }
  document.querySelectorAll('button[data-song]').forEach(btn=>btn.addEventListener('click',()=>{
    const next=btn.dataset.song;
    const box=tracks.get(next)?.box;
    const char=box?.closest('details.char,details.boss-character');
    if(char && document.getElementById('detail-modal')?.open===false)window.openArchiveDetail?.(char);
    toggle(next);
  }));
  dockToggle?.addEventListener('click',()=>panel(dockPanel.hidden));
  dockClose?.addEventListener('click',()=>panel(false));
  miniPlay?.addEventListener('click',()=>toggle());
  miniStop?.addEventListener('click',stop);
  miniSeek?.addEventListener('input',()=>jump(miniSeek.value));
  ['play','pause','timeupdate','loadedmetadata','durationchange','seeked','seeking','ended'].forEach(ev=>audio.addEventListener(ev,update));
  audio.addEventListener('error',()=>{error='음원 불러오기 실패 · audio 폴더를 확인하세요';update()});
  selectTrack('hunter');
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initMusic,{once:true});else initMusic();
})();


(function(){
 const roots=[document.querySelector('#hunters details.root'),document.querySelector('#calamities details.root'),document.querySelector('#regions details.root')];
 const navLinks=Array.from(document.querySelectorAll('.nav-link'));
 function reveal(el){
   if(!el)return;
   let p=el.parentElement;
   const chain=[];
   while(p){if(p.tagName==='DETAILS') chain.unshift(p);p=p.parentElement;}
   chain.forEach(d=>d.open=true);
   if(el.tagName==='DETAILS')el.open=true;
   if(el.matches('details.char,details.boss-character,details.region-character')){window.openArchiveDetail?.(el);return;}
   requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('spotlight');setTimeout(()=>el.classList.remove('spotlight'),1600)});
 }
 function revealSection(sectionId){
   const section=document.getElementById(sectionId);
   if(!section)return;
   if(sectionId==='hunters'||sectionId==='regions')section.querySelector('details.root')?.setAttribute('open','');
   // The spoiler remains closed until the reader intentionally opens the calamity category.
   requestAnimationFrame(()=>section.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{
  const dest=a.getAttribute('href').slice(1);
  if(['hunters','regions','creatures'].includes(dest))revealSection(dest);
 }));
 function setNav(){
   const sections=['home','hunters','calamities','regions','creatures','music'];
   let current='home';
   for(const id of sections){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=180)current=id;}
   navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+current));
 }
 let navQueued=false;window.addEventListener('scroll',()=>{if(navQueued)return;navQueued=true;requestAnimationFrame(()=>{navQueued=false;setNav()})},{passive:true});setNav();
 document.querySelector('[data-expand="hunters"]')?.addEventListener('click',e=>{
  const section=document.getElementById('hunters'),all=Array.from(section.querySelectorAll('details.root, details.group'));
  const open=all.some(d=>!d.open);all.forEach(d=>d.open=open);
  if(!open)section.querySelectorAll('details.char[open]').forEach(d=>d.open=false);
  e.currentTarget.textContent=open?'분류 모두 접기':'분류 모두 펼치기';
 });
 const dlg=document.getElementById('search-dialog'),inp=document.getElementById('search-query'),results=document.getElementById('search-results');
 const searchables=[];
 let indexed=false;
 function indexSearch(){if(indexed)return;indexed=true;
 document.querySelectorAll('details.char,details.boss-character,details.region-character,details.creature-character').forEach(el=>{
   const label=el.querySelector(':scope > summary')?.textContent.replace(/\s+/g,' ').trim()||'';
   const kind=el.matches('.char')?'토벌자':el.matches('.boss-character')?'재앙체':el.matches('.creature-character')?'크리처':'지역';
   const code=el.querySelector('.code')?.textContent.trim()||el.dataset.code||el.dataset.region||'';
   searchables.push({el,kind,code,label});
 });}
 function search(text){
   results.innerHTML='';const q=text.trim().toLocaleLowerCase();
   if(!q){results.innerHTML='<div class="search-empty">이름이나 지역 코드를 입력해 주세요.</div>';return;}
   indexSearch();
   const items=searchables.filter(x=>(x.label+' '+x.code).toLocaleLowerCase().includes(q)).slice(0,16);
   if(!items.length){results.innerHTML='<div class="search-empty">검색 결과가 없어요.</div>';return;}
   items.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='search-result';
      const lab=document.createElement('span');lab.textContent=x.label;
      const cat=document.createElement('span');cat.className='result-kind';cat.textContent=x.kind;
      const arrow=document.createElement('span');arrow.textContent='↗';b.append(cat,lab,arrow);
      b.addEventListener('click',()=>{dlg.close();inp.value='';reveal(x.el);});results.appendChild(b);
   });
 }
 const open=()=>{if(typeof dlg.showModal==='function'){dlg.showModal();inp.value='';search('');inp.focus();}};
 document.getElementById('search-open').addEventListener('click',open);
 document.getElementById('search-close').addEventListener('click',()=>dlg.close());
 dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
 inp.addEventListener('input',()=>search(inp.value));
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}});
})();


(function(){
 const opening=document.getElementById('opening');
 const enter=document.getElementById('enter-site');
 if(!opening||!enter)return;
 document.body.classList.add('opening-active');
 const closeOpening=()=>{
   opening.classList.add('hidden');
   document.body.classList.remove('opening-active');
   try{sessionStorage.setItem('commanderOpeningSeen','1')}catch(_){ }
 };
 let openingSeen=false;try{openingSeen=sessionStorage.getItem('commanderOpeningSeen')==='1'}catch(_){}
 if(openingSeen){
   opening.classList.add('hidden');
   document.body.classList.remove('opening-active');
 } else {
   document.body.classList.add('opening-active');
 }
 enter.addEventListener('click', closeOpening);
 opening.addEventListener('click',e=>{if(e.target===opening)closeOpening();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!opening.classList.contains('hidden'))closeOpening();});
})();

/* full-screen character & region detail view, moving the original node to preserve audio and events */
(function(){
 const modal=document.getElementById('detail-modal');
 const body=document.getElementById('detail-body');
 const title=document.getElementById('detail-title');
 const crumb=document.getElementById('detail-crumb');
 const close=document.getElementById('detail-close');
 if(!modal||!body||!close)return;
 let active=null;let placeholder=null;let previousFocus=null;
 function kind(el){return el.matches('.boss-character')?'재앙체':el.matches('.region-character')?'지역 안내':'토벌자'}
 function name(el){
  const sum=el.querySelector(':scope > summary');
  return sum?.querySelector('.atlas-card-info strong')?.textContent.trim()||'상세 기록';
 }
 function closeModal(){
  if(!active)return;
  active.open=false;
  placeholder.replaceWith(active);
  active=null;placeholder=null;
  if(modal.open)modal.close();
  document.body.classList.remove('detail-open');
  // Hand over the ongoing track to the mini player at the upper-right.
  if(window.worldMusic && !window.worldMusic.audio.paused)window.worldMusic.open();
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 window.openArchiveDetail=function(el){
   if(!el)return;
   if(active===el)return;
   if(active)closeModal();
   const p=el.parentNode;
   if(!p)return;
   previousFocus=document.activeElement;
   placeholder=document.createElement('div');
   placeholder.className='detail-placeholder';
   p.insertBefore(placeholder,el);
   active=el;
   title.textContent=name(el);
   const label=kind(el);
   crumb.textContent='지휘관님!! 기록 보관소  /  '+label;
   body.replaceChildren(el);
   el.open=true;
   document.body.classList.add('detail-open');
   modal.showModal();
   body.scrollTop=0;
   close.focus();
 };
 document.querySelectorAll('details.char,details.boss-character,details.region-character').forEach(el=>{
   const sum=el.querySelector(':scope > summary');
   if(!sum)return;
   sum.addEventListener('click',e=>{e.preventDefault();window.openArchiveDetail(el)});
 });
 close.addEventListener('click',closeModal);
 modal.addEventListener('cancel',e=>{e.preventDefault();closeModal()});
 modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
})();

/* Scroll-reveal navigation and cinematic interface transitions. */
(function(){
 const progress=document.getElementById('scroll-progress');
 const update=()=>{if(!progress)return;const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%'};
 let progressQueued=false;const queueProgress=()=>{if(progressQueued)return;progressQueued=true;requestAnimationFrame(()=>{progressQueued=false;update()})};window.addEventListener('scroll',queueProgress,{passive:true});window.addEventListener('resize',queueProgress,{passive:true});update();
 const canAnimate=!(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 if(!canAnimate)return;
 if('IntersectionObserver' in window){
   const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target)}})},{threshold:.07,rootMargin:'0px 0px -20px 0px'});
   document.documentElement.classList.add('js-animate');
   document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
 }
 // Folder animations deliberately disabled: avoid forced layout on each toggle.
})();

/* Creature images are not requested until a visitor explicitly reveals them. */
(function(){
 const root=document.getElementById('creatures');if(!root)return;
 const setPreview=(box,open)=>{
  const button=box.querySelector('.creature-preview-toggle');
  const panel=box.querySelector('.creature-preview-content');
  const media=box.querySelector('.creature-preview-media');
  const status=box.querySelector('.creature-preview-status');
  button.setAttribute('aria-expanded',String(open));panel.hidden=!open;
  button.querySelector('.creature-preview-label strong').textContent=open?'미리보기 숨기기':'미리보기 주의';
  button.querySelector('.creature-preview-label small').textContent=open?'클릭하여 외형 다시 가리기':'크리처 외형이 공개됩니다 · 클릭하여 보기';
  if(!open){media.replaceChildren();status.textContent='';return;}
  const img=new Image();img.alt=box.dataset.name+' 외형';img.decoding='async';
  status.textContent='이미지를 불러오는 중입니다.';
  img.addEventListener('load',()=>{if(img.parentNode===media)status.textContent='';},{once:true});
  img.addEventListener('error',()=>{if(img.parentNode===media){img.remove();status.textContent='이미지를 불러올 수 없습니다. 숨긴 후 다시 열어 주세요.';}},{once:true});
  media.replaceChildren(img);img.src=box.dataset.image;
 };
 root.addEventListener('click',e=>{const b=e.target.closest('.creature-preview-toggle');if(!b||!root.contains(b))return;setPreview(b.closest('.creature-preview'),b.getAttribute('aria-expanded')!=='true');});
 root.addEventListener('toggle',e=>{const d=e.target;if(!d.matches('details.creature-character,details.creature-region')||d.open)return;d.querySelectorAll('.creature-preview-toggle[aria-expanded="true"]').forEach(b=>setPreview(b.closest('.creature-preview'),false));},true);
})();
