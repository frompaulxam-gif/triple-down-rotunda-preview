(() => {
  'use strict';
  const projects = window.PROJECTS.map(p=>({...p,cover:'../'+p.cover,images:p.images.map(src=>'../'+src),logo:p.slug==='moonshine'?'brand-assets/moonshine-wordmark.svg':p.logo?'../'+p.logo:null,cardLogo:p.cardLogo?'../'+p.cardLogo:undefined}));
  const $ = s => document.querySelector(s);
  const stage = $('.stage'), ring = $('#ring'), scene = $('#scene');
  const dialog = $('#project-dialog'), index = $('#work-index');
  const homeKey=location.pathname.replace(/\/?$/,'/')+':gallery';
  let restored=null;
  try{restored=JSON.parse(sessionStorage.getItem(homeKey)||'null');if(performance.getEntriesByType('navigation')[0]?.type==='reload')restored=null;}catch{}
  let paused=Boolean(restored?.paused),galleryVisible=true,announcePending=false,sceneIntroOffset=0,returningFromHistory=false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const count = projects.length, slots = count * 2, step = 360 / slots;
  const introPasses=4,introSteps=count*introPasses;
  const introStart=900,initialSpeed=3.5,approachSpeed=4.5,buildSpeed=6.5,peakSpeed=22;
  const fillThreshold=slots*.85,approachSeconds=fillThreshold*2/(initialSpeed+approachSpeed);
  const finalFillSeconds=(slots-fillThreshold)*2/(approachSpeed+buildSpeed);
  const buildSeconds=approachSeconds+finalFillSeconds,rushSeconds=.9,brakeSeconds=.6;
  const idleSpeed=1.68;
  const rushDistance=(buildSpeed+peakSpeed)*rushSeconds/2;
  const cruiseSeconds=(introSteps-slots-rushDistance-peakSpeed*brakeSeconds/2)/peakSpeed;
  const motionEnd=introStart+(buildSeconds+rushSeconds+cruiseSeconds+brakeSeconds)*1000;
  const introDuration=motionEnd+1050;
  let angle = Number(restored?.angle)||0, target = Number(restored?.angle)||0, selected = 0, radius = 410, cardW = 190, cardH = 250;
  let raf = 0, lastTime = 0, startTime = performance.now(), intro = !reduced.matches&&!restored;
  if(intro)document.body.classList.add('in-intro');
  let drag = null, dragged = false, snapTimer = 0, returnFocus = null, currentProject = 0;
  let lastInteract=-Infinity, keyboardMode=false, lockupAnimations=[], introTimer=0, lastVisualRotation=null;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mod = (n,m) => ((n%m)+m)%m;
  const logo = (p,cls='brand-logo') => p.logo ? `<img class="client-logo ${cls}" data-brand="${p.slug}" src="${p.logo}" alt="${escape(p.title)}">` : `<span class="plain-wordmark">${escape(p.title)}</span>`;
  const cardLogo=p=>logo(p.cardLogo?{...p,logo:p.cardLogo}:p);
  const reel=$('#logo-reel'),cross=$('.intro-cross'),photoBlurNode=$('#card-directional-blur');
  let lastBlurValue='',lastBlurEnabled=null;
  let reelSlot=100,lastReelIndex=null,initialised=false;
  function finishLockup(){document.body.classList.remove('in-intro');$('#intro-lockup').hidden=true;saveGallery();}
  function saveGallery(){try{sessionStorage.setItem(homeKey,JSON.stringify({angle:lastVisualRotation??angle,paused,scroll:scrollY,seen:true}));}catch{}}
  function cancelIntro(){clearTimeout(introTimer);lockupAnimations.forEach(a=>a.cancel());finishLockup();}
  function introMotion(elapsed){
    const t=(elapsed-introStart)/1000;
    let distance=0,speed=0;
    // Tighten the cadence gently, then lift the pace as the final 15% arrives.
    if(t>0&&t<=approachSeconds){
      const q=t/approachSeconds;
      distance=initialSpeed*t+(approachSpeed-initialSpeed)*approachSeconds*(q*q*q-.5*q*q*q*q);
      speed=initialSpeed+(approachSpeed-initialSpeed)*q*q*(3-2*q);
    }else if(t>approachSeconds&&t<=buildSeconds){
      const q=(t-approachSeconds)/finalFillSeconds;
      distance=fillThreshold+finalFillSeconds*(approachSpeed*q+(buildSpeed-approachSpeed)*(q*q*q-.5*q*q*q*q));
      speed=approachSpeed+(buildSpeed-approachSpeed)*q*q*(3-2*q);
    }else if(t>buildSeconds&&t<=buildSeconds+rushSeconds){
      const q=(t-buildSeconds)/rushSeconds;
      distance=slots+rushSeconds*(buildSpeed*q+(peakSpeed-buildSpeed)*(q*q*q-.5*q*q*q*q));
      speed=buildSpeed+(peakSpeed-buildSpeed)*q*q*(3-2*q);
    }else if(t>buildSeconds+rushSeconds&&t<=buildSeconds+rushSeconds+cruiseSeconds){
      distance=slots+rushDistance+peakSpeed*(t-buildSeconds-rushSeconds);speed=peakSpeed;
    }else if(t>buildSeconds+rushSeconds+cruiseSeconds&&t<buildSeconds+rushSeconds+cruiseSeconds+brakeSeconds){
      const q=(t-buildSeconds-rushSeconds-cruiseSeconds)/brakeSeconds;
      distance=slots+rushDistance+peakSpeed*cruiseSeconds+peakSpeed*brakeSeconds*(q-q*q*q+.5*q*q*q*q);
      speed=peakSpeed*(1-q*q*(3-2*q));
    }else if(t>=buildSeconds+rushSeconds+cruiseSeconds+brakeSeconds){distance=introSteps;}
    return {distance,speed,normalisedSpeed:speed/peakSpeed};
  }
  function introRotation(elapsed,motion){
    // Blend the braking ring into its idle speed instead of coming to rest.
    const coastSeconds=Math.max(0,(elapsed-motionEnd+brakeSeconds*1000)/1000);
    const q=Math.min(coastSeconds/brakeSeconds,1);
    const coastDistance=idleSpeed*(brakeSeconds*(q*q*q-.5*q*q*q*q)+Math.max(0,coastSeconds-brakeSeconds));
    return -motion.distance*step*3-coastDistance;
  }
  function updateBrandReel(motion){
    const position=Math.floor(motion.distance),fraction=motion.distance-position;
    // Keep only five neighbouring rows mounted. Blur the small slots, never a tall GPU layer.
    if(position!==lastReelIndex){
      reel.innerHTML=Array.from({length:5},(_,i)=>`<div class="intro-logo">${logo(projects[mod(position+i-2,count)],'')}</div>`).join('');
      lastReelIndex=position;
    }
    reel.style.transform=`translateY(${-(2+fraction)*reelSlot}px)`;
    reel.style.setProperty('--brand-motion-blur',`${(motion.normalisedSpeed*3.2).toFixed(2)}px`);
    cross.style.filter=`blur(${(motion.normalisedSpeed*.8).toFixed(2)}px)`;
  }
  function brandIntro(){
    if(!intro||reduced.matches){finishLockup();return;}
    document.body.classList.add('in-intro');
    const mobile=innerWidth<701,at=ms=>ms/introDuration;
    sceneIntroOffset=Math.min(0,innerHeight*.52-scene.getBoundingClientRect().top);
    reelSlot=mobile?80:100;
    lastReelIndex=null;
    reel.dataset.cycles=String(introPasses);reel.dataset.steps=String(introSteps);updateBrandReel(introMotion(0));
    const header=$('.header .wordmark img').getBoundingClientRect(),fly=$('.intro-tdg');
    Object.assign(fly.style,{left:header.x+'px',top:header.y+'px',width:header.width+'px',height:header.height+'px'});
    const textTarget=$('.header .logo-type').getBoundingClientRect();
    const lockupWidth=textTarget.right-header.x;
    const scale=Math.min(mobile?1.7:2.1,(innerWidth-44)/lockupWidth),rowY=innerHeight*.29;
    $('#intro-lockup').style.setProperty('--intro-row-y',rowY+'px');
    const centreX=innerWidth*.5-header.width*scale*.5-header.x;
    const centreY=rowY-header.height*scale*.5-header.y;
    const lockupLeft=(innerWidth-lockupWidth*scale)/2;
    const leftX=lockupLeft-header.x;
    const centred=`translate(${centreX}px,${centreY}px) scale(${scale})`;
    const left=`translate(${leftX}px,${centreY}px) scale(${scale})`;
    lockupAnimations.push(fly.animate([
      {transform:`translate(${centreX}px,${centreY+8}px) scale(${scale*.9})`,opacity:0,filter:'blur(7px)',offset:0,easing:'ease-out'},
      {transform:centred,opacity:1,filter:'blur(0px)',offset:at(250)},
      {transform:centred,opacity:1,filter:'blur(0px)',offset:at(380),easing:'cubic-bezier(.22,1,.36,1)'},
      {transform:left,opacity:1,filter:'blur(0px)',offset:at(760)},
      {transform:left,opacity:1,filter:'blur(0px)',offset:at(motionEnd+450),easing:'cubic-bezier(.22,1,.36,1)'},
      {transform:'translate(0,0) scale(1)',opacity:1,filter:'blur(0px)',offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    lockupAnimations.push(cross.animate([
      {opacity:0,transform:'translateX(-8px)',offset:0},
      {opacity:0,transform:'translateX(-8px)',offset:at(720),easing:'ease-out'},
      {opacity:1,transform:'translateX(0)',offset:at(860)},
      {opacity:1,transform:'translateX(0)',offset:at(motionEnd+50),easing:'ease-out'},
      {opacity:0,transform:'translateY(-5px)',offset:at(motionEnd+290)},
      {opacity:0,offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    lockupAnimations.push($('.logo-window').animate([
      {opacity:0,offset:0},{opacity:0,offset:at(800),easing:'ease-out'},{opacity:1,offset:at(860)},
      {opacity:1,transform:'translateY(0)',offset:at(motionEnd+50),easing:'ease-out'},
      {opacity:0,transform:'translateY(-9px)',offset:at(motionEnd+290)},
      {opacity:0,offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    const name=$('.intro-name');
    Object.assign(name.style,{left:textTarget.x+'px',top:textTarget.y+'px'});
    const textX=lockupLeft+(textTarget.x-header.x)*scale-textTarget.x,textY=rowY-textTarget.height*scale*.5-textTarget.y;
    const textPose=`translate(${textX}px,${textY}px) scale(${scale})`;
    lockupAnimations.push(name.animate([
      {opacity:0,transform:textPose,filter:'blur(4px)',offset:0},
      {opacity:0,transform:`translate(${textX}px,${textY+8}px) scale(${scale})`,filter:'blur(4px)',offset:at(motionEnd+90),easing:'ease-out'},
      {opacity:1,transform:textPose,filter:'blur(0px)',offset:at(motionEnd+350)},
      {opacity:1,transform:textPose,offset:at(motionEnd+450),easing:'cubic-bezier(.22,1,.36,1)'},
      {opacity:1,transform:'translate(0,0) scale(1)',offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    $('#intro-lockup').classList.add('is-ready');
    introTimer=setTimeout(finishLockup,introDuration);
  }
  const cards = [...projects,...projects].map((p,i) => {
    const projectIndex=i%count; const photo=i<count?p.cover:p.images[0];
    const el = document.createElement(i<count?'button':'div');
    el.className = 'project-card'; el.dataset.project = p.slug;el.style.opacity='0';
    el.setAttribute('aria-label', `Open ${p.title} story`);
    if(i>=count)el.setAttribute('aria-hidden','true');
    el.innerHTML = `<span class="card-face"><img class="card-photo" src="${photo}" alt="${escape(p.title)} project" draggable="false" fetchpriority="${i<3?'high':'auto'}"><span class="wash"></span><span class="card-caption"><span class="name">${cardLogo(p)}</span></span></span>`;
    el.addEventListener('click', () => {if (!dragged) openProject(projectIndex, el);});
    el.addEventListener('focus',()=>{ if (!drag && document.activeElement===el){stopIntro();target=-i*step+Math.round((angle+i*step)/360)*360;wake();} });
    ring.append(el); return el;
  });
  $('#project-list').innerHTML = projects.map((p,i)=>`<button class="project-row" data-index="${i}"><img src="${p.cover}" alt="" loading="lazy"><strong class="index-title">${logo(p,'row-logo')}</strong><span class="row-kind">${escape(p.category)}</span><span class="row-arrow" aria-hidden="true">→</span></button>`).join('');
  $('#project-list').addEventListener('click', e=>{const el=e.target.closest('[data-index]');if(el)openProject(+el.dataset.index,el);});
  function size(){
    const w=innerWidth,h=innerHeight;
    const mobile=w<701;
    radius=mobile?Math.min(w*.57,300):Math.min(w*.378,h*.66,570);
    cardW=mobile?Math.min(80,Math.max(62,w*.18)):Math.min(w*.117,h*.225,190)*(1-radius/1900);
    cardH=cardW*(mobile?1.38:1.39);
    ring.style.setProperty('--card-width',cardW+'px');ring.style.setProperty('--card-height',cardH+'px');
    scene.style.perspective=(mobile?1050:1500)+'px';
    wake();
  }
  function status(){
    const n=mod(Math.round(-angle/step),count);
    if(n!==selected || !$('#active-title').innerHTML){
      selected=n;$('#active-title').innerHTML=logo(projects[n]);
      $('#active-kind').textContent=projects[n].category;
      $('#position').textContent=`${String(n+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`;
      $('#active-title').setAttribute('aria-label',`Open ${projects[n].title} story`);
    }
    if(announcePending&&Math.abs(target-angle)<.5){$('#gallery-announcement').textContent=projects[n].title;announcePending=false;}
  }
  function draw(t){
    raf=0;
    if(!galleryVisible||document.hidden){lastTime=0;return;}
    const dt=lastTime?Math.min((t-lastTime)/16.667,3):1;lastTime=t;
    const wasIntro=intro;
    let spread=1,spin=0,introElapsed=Infinity,buildDistance=Infinity;
    if(intro){
      const elapsed=t-startTime,p=Math.min(elapsed/introDuration,1);
      introElapsed=elapsed;
      const motion=introMotion(elapsed);
      // Populate a medium ring, then expand through the longer fast spin.
      buildDistance=motion.distance;
      const built=Math.max(0,Math.min(motion.distance/(slots-.28),1));
      const growth=Math.max(0,Math.min((elapsed-introStart-buildSeconds*1000)/((rushSeconds+cruiseSeconds)*1000),1));
      spread=.26+.4*built+.44*growth*growth*(3-2*growth);
      const settle=Math.max(0,Math.min((elapsed-motionEnd+120)/400,1));
      spread+=(1-spread)*(1-Math.pow(1-settle,3));
      spin=introRotation(elapsed,motion);
      updateBrandReel(motion);
      if(p===1){angle+=spin;target+=spin;spin=0;intro=false;finishLockup();}
    }
    const idle=!wasIntro&&!paused&&!drag&&!dialog.open&&!index.open&&!reduced.matches&&performance.now()-lastInteract>1800&&!(keyboardMode&&stage.contains(document.activeElement));
    if(idle){const drift=idleSpeed*dt/60;target-=drift;angle-=drift;}
    angle+=(target-angle)*(reduced.matches?1:1-Math.pow(.84,dt));
    if(Math.abs(target-angle)<.005)angle=target;
    const rotation=angle+spin;
    const velocity=lastVisualRotation===null?0:Math.abs(mod(rotation-lastVisualRotation+180,360)-180)/dt;
    lastVisualRotation=rotation;
    const photoBlur=reduced.matches?0:Math.min(8,Math.max(0,velocity-.07)*.55);
    const blurValue=`${photoBlur.toFixed(2)} ${Math.min(.3,photoBlur*.04).toFixed(2)}`;
    if(blurValue!==lastBlurValue){photoBlurNode.setAttribute('stdDeviation',blurValue);lastBlurValue=blurValue;}
    const blurEnabled=photoBlur>.05;
    if(innerWidth<701){ring.style.setProperty('--card-photo-filter',blurEnabled?`blur(${Math.min(2,photoBlur*.3).toFixed(2)}px)`:'none');}
    else if(blurEnabled!==lastBlurEnabled){ring.style.setProperty('--card-photo-filter',blurEnabled?'url(#card-motion-filter)':'none');}
    lastBlurEnabled=blurEnabled;
    cards.forEach((el,i)=>{
      const theta=(i*step+angle+spin)*Math.PI/180;
      const cos=Math.cos(theta),sin=Math.sin(theta),r=radius*spread;
      // A card arrives when the matching client reaches the reel's centre.
      const arrival=i===0?(introElapsed-860)/180:(buildDistance-i)/.72;
      const entrance=Math.max(0,Math.min(arrival,1));
      const arrived=1-Math.pow(1-entrance,3);
      const landing=Math.max(0,Math.min((introElapsed-motionEnd-200)/850,1));
      const introY=Number.isFinite(introElapsed)?sceneIntroOffset*(1-landing*landing*(3-2*landing)):0;
      const x=sin*r,y=cos*r*.165-(1-arrived)*innerHeight*.72+introY,z=cos*r*.986-(1-arrived)*85;
      el.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateY(${i*step+angle+spin}deg) rotateX(-9.5deg) scale(${(.88+.12*arrived)*(.5+.5*spread)})`;
      el.style.opacity=String(Math.min(1,entrance*3));
      el.querySelector('.wash').style.opacity=String(Math.max(0,(-cos+.15)*.65));
      // The back half remains visible, with the front faces taking pointer priority.
      el.style.pointerEvents=cos>-.2&&entrance>.85?'auto':'none';
    });
    status();
    if(intro||(!paused&&!reduced.matches&&!dialog.open&&!index.open)||drag||Math.abs(target-angle)>.005)wake();
  }
  function wake(){if(initialised&&!raf&&galleryVisible&&!document.hidden)raf=requestAnimationFrame(draw);}
  function stopIntro(){lastInteract=performance.now();if(intro){intro=false;angle=target=lastVisualRotation??angle;cancelIntro();lastVisualRotation=null;}}
  document.addEventListener('focusin',e=>{if(intro&&e.target.closest('.header,.hero-title,.gallery-status,.work-showcase'))stopIntro();});
  addEventListener('scroll',()=>{if(intro&&stage.getBoundingClientRect().bottom<innerHeight*.75)stopIntro();},{passive:true});
  $('.scroll-hint')?.addEventListener('click',stopIntro);
  function move(d){stopIntro();announcePending=true;target=Math.round(target/step)*step+d*step;wake();}
  function snap(){target=Math.round(target/step)*step;wake();}
  stage.addEventListener('wheel',e=>{
    if(dialog.open||!!index.open||e.ctrlKey)return;
    if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)*1.2)return;
    e.preventDefault();stopIntro();
    announcePending=true;
    let d=e.deltaX;
    if(e.deltaMode===1)d*=16;if(e.deltaMode===2)d*=innerHeight;
    target-=Math.max(-260,Math.min(260,d))*.065;wake();
    clearTimeout(snapTimer);snapTimer=setTimeout(snap,180);
  },{passive:false});
  stage.addEventListener('pointerdown',e=>{
    keyboardMode=false;
    if(drag||e.isPrimary===false||e.button!==0||e.target.closest('a,.gallery-footer,.gallery-status'))return;
    stopIntro();clearTimeout(snapTimer);dragged=false;
    drag={x:e.clientX,y:e.clientY,start:target,last:e.clientX,lastTime:performance.now(),speed:0,id:e.pointerId};
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!dragged&&e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>7){drag=null;return;}
    if(Math.abs(dx)>7){dragged=true;stage.classList.add('dragging');stage.setPointerCapture(e.pointerId);}
    if(dragged){e.preventDefault();target=drag.start+(dx-dy*.35)*.21;
      const now=performance.now();drag.speed=(e.clientX-drag.last)/Math.max(now-drag.lastTime,1);drag.last=e.clientX;drag.lastTime=now;wake();}
  });
  function endDrag(){if(!drag)return;const speed=performance.now()-drag.lastTime<90?drag.speed:0;
    if(dragged){announcePending=true;target+=Math.max(-step,Math.min(step,speed*16));snap();}
    drag=null;stage.classList.remove('dragging');setTimeout(()=>{dragged=false;},0);
  }
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',()=>{drag=null;dragged=false;stage.classList.remove('dragging');snap();});
  $('#previous').onclick=()=>move(1);$('#next').onclick=()=>move(-1);$('#active-title').onclick=()=>openProject(selected,cards[mod(Math.round(-angle/step),slots)]);
  stage.addEventListener('keydown',e=>{
    if(e.target.closest('input,textarea,select,[contenteditable]'))return;
    keyboardMode=true;lastInteract=performance.now();
    if(!!index.open)return;
    if(e.key==='ArrowRight'){e.preventDefault();move(-1);}if(e.key==='ArrowLeft'){e.preventDefault();move(1);}
  });
  function showIndex(show){
    if(show){stopIntro();if(!index.open)index.showModal();$('#close-index').focus();}
    else if(index.open)index.close();
    $('#index-button').setAttribute('aria-expanded',String(index.open));wake();
  }
  $('#index-button').onclick=()=>showIndex(!index.open);$('#close-index').onclick=()=>showIndex(false);
  index.addEventListener('cancel',e=>{e.preventDefault();showIndex(false);});
  index.addEventListener('close',()=>{$('#index-button').setAttribute('aria-expanded','false');$('#index-button').focus({preventScroll:true});wake();});
  function openProject(i,from){
    const p=projects[i],wasOpen=dialog.open;currentProject=i;
    if(!wasOpen)returnFocus=from?.getAttribute('aria-hidden')==='true'?$('#active-title'):(from||document.activeElement);
    saveGallery();
    let rect=from?.classList.contains('project-card')?(from.querySelector('.card-face')||from).getBoundingClientRect():null;
    $('#project-content').innerHTML=`<div class="project-opening"><img class="project-hero" src="${p.cover}" alt="${escape(p.title)} project"><div class="project-summary"><p class="project-kicker">Earlier work and experience · ${escape(p.category)}</p><h2 id="project-title">${logo(p,'project-logo')}</h2><p class="project-intro">${escape(p.intro)}</p><p class="project-services">${escape(p.services)}</p></div></div>${p.body.length?`<div class="project-body">${p.body.map(t=>`<p>${escape(t)}</p>`).join('')}</div>`:'<div style="height:40px"></div>'}<div class="project-images">${p.images.map((s,j)=>`<img src="${s}" alt="${escape(p.title)} ${j?'project detail':'in focus'}" loading="lazy">`).join('')}</div><div class="project-bottom"><button id="next-case"><span>Next project</span>${escape(projects[mod(i+1,count)].title)} →</button><a href="mailto:systems@tripledown.group">Let's make something happen</a></div>`;
    if(!wasOpen)dialog.showModal();dialog.scrollTop=0;
    $('#next-case').onclick=()=>openProject(mod(currentProject+1,count));
    if(!returningFromHistory){const method=wasOpen||location.hash==='#'+p.slug?'replaceState':'pushState';history[method]({...history.state,orbitModal:true},'',`#${p.slug}`);}
    if(rect&&!reduced.matches){
      const img=$('.project-hero');const dst=img.getBoundingClientRect();
      const clone=new Image();clone.className='flight';clone.src=p.cover;
      Object.assign(clone.style,{left:dst.x+'px',top:dst.y+'px',width:dst.width+'px',height:dst.height+'px'});document.body.append(clone);
      const animation=clone.animate([{transform:`translate(${rect.x-dst.x}px,${rect.y-dst.y}px) scale(${rect.width/dst.width},${rect.height/dst.height})`,borderRadius:'13px'},{transform:'translate(0,0) scale(1)',borderRadius:'0'}],{duration:680,easing:'cubic-bezier(.16,1,.3,1)'});
      animation.onfinish=()=>clone.remove();animation.oncancel=()=>clone.remove();
      $('.project-summary').animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,delay:140,fill:'backwards',easing:'ease-out'});
    }
  }
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[data-orbit-story]');
    if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const projectIndex=projects.findIndex(p=>p.slug===link.dataset.orbitStory);
    if(projectIndex<0)return;
    e.preventDefault();stopIntro();openProject(projectIndex,link);
  });
  function closeProject(){if(history.state?.orbitModal&&!returningFromHistory)history.back();else{dialog.close();history.replaceState({...history.state,orbitModal:false},'',location.pathname+location.search);}}
  $('.close-project').onclick=closeProject;
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeProject();});
  dialog.addEventListener('close',()=>{target=-currentProject*step+Math.round((angle+currentProject*step)/(count*step))*(count*step);wake();returnFocus?.focus({preventScroll:true});});
  dialog.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[contenteditable]'))return;if(e.key==='ArrowRight'){e.preventDefault();openProject(mod(currentProject+1,count));}if(e.key==='ArrowLeft'){e.preventDefault();openProject(mod(currentProject-1,count));}});
  window.addEventListener('popstate',()=>{const i=projects.findIndex(p=>p.slug===location.hash.slice(1));returningFromHistory=true;try{if(i>=0)openProject(i);else if(dialog.open)dialog.close();}finally{returningFromHistory=false;}});
  $('#pause-gallery').setAttribute('aria-pressed',String(paused));$('#pause-gallery').textContent=paused?'Resume rotation':'Pause rotation';
  $('#pause-gallery').onclick=()=>{paused=!paused;if(intro)stopIntro();$('#pause-gallery').setAttribute('aria-pressed',String(paused));$('#pause-gallery').textContent=paused?'Resume rotation':'Pause rotation';saveGallery();wake();};
  new IntersectionObserver(([entry])=>{galleryVisible=entry.isIntersecting;if(!galleryVisible&&intro)stopIntro();if(galleryVisible){lastTime=0;wake();}},{threshold:0}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&intro)stopIntro();if(!document.hidden){lastTime=0;wake();}});
  window.addEventListener('pagehide',saveGallery);
  document.querySelectorAll('a[href]').forEach(a=>a.addEventListener('click',saveGallery));
  reduced.addEventListener('change',()=>{if(reduced.matches){intro=false;angle=target;cancelIntro();lastVisualRotation=null;}wake();});
  let viewportWidth=innerWidth,viewportHeight=innerHeight;
  window.addEventListener('resize',()=>{if(intro&&(Math.abs(innerWidth-viewportWidth)>20||Math.abs(innerHeight-viewportHeight)>120))stopIntro();viewportWidth=innerWidth;viewportHeight=innerHeight;lastBlurEnabled=null;size();});
  async function initialise(){
  const fontsReady=await Promise.race([document.fonts.ready.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),1200))]);
  if(!fontsReady)intro=false;
  initialised=true;startTime=performance.now();brandIntro();size();status();
  const hash=location.hash.slice(1),hashIndex=projects.findIndex(x=>x.slug===hash);
  if(hashIndex>=0){intro=false;cancelIntro();target=angle=-hashIndex*step;returningFromHistory=true;openProject(hashIndex);returningFromHistory=false;}
  if(restored){try{if(sessionStorage.getItem(location.pathname+':return')==='logo'){sessionStorage.removeItem(location.pathname+':return');scrollTo(0,0);}}catch{}}
  }
  initialise();
})();
