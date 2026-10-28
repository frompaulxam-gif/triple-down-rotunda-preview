(() => {
  'use strict';
  const projects = window.PROJECTS;
  const $ = s => document.querySelector(s);
  const stage = $('.stage'), ring = $('#ring'), scene = $('#scene');
  const dialog = $('#project-dialog'), about = $('#about-dialog'), index = $('#work-index');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const count = projects.length, slots = count * 2, step = 360 / slots;
  let angle = 0, target = 0, selected = 0, radius = 410, cardW = 190, cardH = 250;
  let raf = 0, lastTime = 0, startTime = performance.now(), intro = !reduced.matches;
  let drag = null, dragged = false, snapTimer = 0, returnFocus = null, currentProject = 0;
  let lastInteract=performance.now()+5000, keyboardMode=false, lockupAnimations=[], introTimer=0, lastVisualRotation=null;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mod = (n,m) => ((n%m)+m)%m;
  const logo = (p,cls='brand-logo') => p.logo ? `<img class="client-logo ${cls}" data-brand="${p.slug}" src="${p.logo}" alt="${escape(p.title)}">` : `<span class="plain-wordmark">${escape(p.title)}</span>`;
  const cardLogo=p=>logo(p.cardLogo?{...p,logo:p.cardLogo}:p);
  const introDuration=5000;
  const introPasses=2,introSteps=count*introPasses;
  const reel=$('#logo-reel'),cross=$('.intro-cross'),photoBlurNode=$('#card-directional-blur');
  let lastBlurValue='',lastBlurEnabled=null;
  let reelSlot=100;
  function finishLockup(){document.body.classList.remove('in-intro');$('#intro-lockup').hidden=true;}
  function cancelIntro(){clearTimeout(introTimer);lockupAnimations.forEach(a=>a.cancel());finishLockup();}
  function introMotion(elapsed){
    const t=(elapsed-1120)/1000;
    const initial=2.5,peak=18,read=1,ramp=.7,cruise=.2,brake=.8;
    const rawDistance=initial*read+(initial+peak)*ramp/2+peak*cruise+peak*brake/2;
    const scale=introSteps/rawDistance;
    let distance=0,speed=0;
    if(t>0&&t<=read){distance=initial*t;speed=initial;}
    else if(t>read&&t<=read+ramp){
      const q=(t-read)/ramp;
      distance=initial*read+ramp*(initial*q+(peak-initial)*(q*q*q-.5*q*q*q*q));
      speed=initial+(peak-initial)*q*q*(3-2*q);
    }else if(t>read+ramp&&t<=read+ramp+cruise){
      distance=initial*read+(initial+peak)*ramp/2+peak*(t-read-ramp);speed=peak;
    }else if(t>read+ramp+cruise&&t<read+ramp+cruise+brake){
      const q=(t-read-ramp-cruise)/brake;
      distance=initial*read+(initial+peak)*ramp/2+peak*cruise+peak*brake*(q-q*q*q+.5*q*q*q*q);
      speed=peak*(1-q*q*(3-2*q));
    }else if(t>=read+ramp+cruise+brake){distance=rawDistance;}
    return {distance:distance*scale,speed:speed*scale,normalisedSpeed:speed/peak};
  }
  function updateBrandReel(motion){
    reel.style.transform=`translateY(${-motion.distance*reelSlot}px)`;
    reel.style.filter=`blur(${(motion.normalisedSpeed*3.2).toFixed(2)}px)`;
    cross.style.filter=`blur(${(motion.normalisedSpeed*.8).toFixed(2)}px)`;
  }
  function brandIntro(){
    if(reduced.matches){finishLockup();return;}
    document.body.classList.add('in-intro');
    const mobile=innerWidth<701,at=ms=>ms/introDuration;
    reelSlot=mobile?80:100;
    const brands=[...Array.from({length:introPasses},()=>projects).flat(),projects[0]];
    reel.innerHTML=brands.map(p=>`<div class="intro-logo">${logo(p,'')}</div>`).join('');
    reel.dataset.cycles=String(introPasses);reel.dataset.steps=String(introSteps);updateBrandReel(introMotion(0));
    const header=$('.header .wordmark img').getBoundingClientRect(),fly=$('.intro-tdg');
    Object.assign(fly.style,{left:header.x+'px',top:header.y+'px',width:header.width+'px',height:header.height+'px'});
    const scale=mobile?2:2.7,rowY=innerHeight*.29;
    const centreX=innerWidth*.5-header.width*scale*.5-header.x;
    const centreY=rowY-header.height*scale*.5-header.y;
    const leftX=centreX-(mobile?80:130);
    const centred=`translate(${centreX}px,${centreY}px) scale(${scale})`;
    const left=`translate(${leftX}px,${centreY}px) scale(${scale})`;
    lockupAnimations.push(fly.animate([
      {transform:`translate(${centreX}px,${centreY+8}px) scale(${scale*.9})`,opacity:0,filter:'invert(1) blur(7px)',offset:0,easing:'ease-out'},
      {transform:centred,opacity:1,filter:'invert(1) blur(0px)',offset:at(250)},
      {transform:centred,opacity:1,filter:'invert(1) blur(0px)',offset:at(380),easing:'cubic-bezier(.22,1,.36,1)'},
      {transform:left,opacity:1,filter:'invert(1) blur(0px)',offset:at(760)},
      {transform:left,opacity:1,filter:'invert(1) blur(0px)',offset:at(4330),easing:'cubic-bezier(.22,1,.36,1)'},
      {transform:'translate(0,0) scale(1)',opacity:1,filter:'invert(1) blur(0px)',offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    lockupAnimations.push(cross.animate([
      {opacity:0,transform:'translateX(-8px)',offset:0},
      {opacity:0,transform:'translateX(-8px)',offset:at(720),easing:'ease-out'},
      {opacity:1,transform:'translateX(0)',offset:at(860)},
      {opacity:1,transform:'translateX(0)',offset:at(3920),easing:'ease-out'},
      {opacity:0,transform:'translateY(-5px)',offset:at(4160)},
      {opacity:0,offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    lockupAnimations.push($('.logo-window').animate([
      {opacity:0,offset:0},{opacity:0,offset:at(800),easing:'ease-out'},{opacity:1,offset:at(860)},
      {opacity:1,transform:'translateY(0)',filter:'blur(0px)',offset:at(3920),easing:'ease-out'},
      {opacity:0,transform:'translateY(-9px)',filter:'blur(3px)',offset:at(4160)},
      {opacity:0,offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    const textTarget=$('.header .logo-type').getBoundingClientRect(),name=$('.intro-name');
    Object.assign(name.style,{left:textTarget.x+'px',top:textTarget.y+'px'});
    const textX=innerWidth*.5+(mobile?17:12)-textTarget.x,textY=rowY-textTarget.height*scale*.5-textTarget.y;
    const textPose=`translate(${textX}px,${textY}px) scale(${scale})`;
    lockupAnimations.push(name.animate([
      {opacity:0,transform:textPose,filter:'blur(4px)',offset:0},
      {opacity:0,transform:`translate(${textX}px,${textY+8}px) scale(${scale})`,filter:'blur(4px)',offset:at(3960),easing:'ease-out'},
      {opacity:1,transform:textPose,filter:'blur(0px)',offset:at(4220)},
      {opacity:1,transform:textPose,offset:at(4330),easing:'cubic-bezier(.22,1,.36,1)'},
      {opacity:1,transform:'translate(0,0) scale(1)',offset:1}
    ],{duration:introDuration,fill:'both',easing:'linear'}));
    introTimer=setTimeout(finishLockup,introDuration);
  }
  const cards = [...projects,...projects].map((p,i) => {
    const projectIndex=i%count; const photo=i<count?p.cover:p.images[0];
    const el = document.createElement('button');
    el.className = 'project-card'; el.dataset.project = p.slug;
    el.setAttribute('aria-label', `Open ${p.title} case study`);
    el.innerHTML = `<img class="card-photo" src="${photo}" alt="${escape(p.title)} project" draggable="false" fetchpriority="${i<3?'high':'auto'}"><span class="wash"></span><span class="card-caption"><span class="name">${cardLogo(p)}</span></span>`;
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
    cardW=mobile?Math.min(76,w*.17):Math.min(w*.117,h*.225,190)*(1-radius/1900);
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
      $('#active-title').setAttribute('aria-label',`Open ${projects[n].title} case study`);
    }
  }
  function draw(t){
    raf=0;
    const dt=lastTime?Math.min((t-lastTime)/16.667,3):1;lastTime=t;
    let spread=1,spin=0,introElapsed=Infinity;
    if(intro){
      const elapsed=t-startTime,p=Math.min(elapsed/introDuration,1);
      introElapsed=elapsed;
      const motion=introMotion(elapsed);
      // The reel and ring share one clock. The ring waits, then turns three times faster.
      spread=.72+.28*Math.min(motion.distance/4,1);
      spin=-motion.distance*step*3;
      updateBrandReel(motion);
      if(p===1){intro=false;finishLockup();}
    }
    const idle=!intro&&!drag&&!dialog.open&&!about.open&&index.hidden&&!reduced.matches&&performance.now()-lastInteract>1800&&!(keyboardMode&&stage.contains(document.activeElement));
    if(idle)target-=.028*dt;
    angle+=(target-angle)*(reduced.matches?1:1-Math.pow(.84,dt));
    if(Math.abs(target-angle)<.005)angle=target;
    const rotation=angle+spin;
    const velocity=lastVisualRotation===null?0:Math.abs(mod(rotation-lastVisualRotation+180,360)-180)/dt;
    lastVisualRotation=rotation;
    const photoBlur=reduced.matches?0:Math.min(8,Math.max(0,velocity-.07)*.55);
    const blurValue=`${photoBlur.toFixed(2)} ${Math.min(.3,photoBlur*.04).toFixed(2)}`;
    if(blurValue!==lastBlurValue){photoBlurNode.setAttribute('stdDeviation',blurValue);lastBlurValue=blurValue;}
    const blurEnabled=photoBlur>.05;
    if(blurEnabled!==lastBlurEnabled){ring.style.setProperty('--card-photo-filter',blurEnabled?'url(#card-motion-filter)':'none');lastBlurEnabled=blurEnabled;}
    cards.forEach((el,i)=>{
      const theta=(i*step+angle+spin)*Math.PI/180;
      const cos=Math.cos(theta),sin=Math.sin(theta),r=radius*spread;
      const order=i===0?0:i<=slots/2?i*2-1:(slots-i)*2;
      const entrance=Math.max(0,Math.min((introElapsed-110-order*32)/300,1));
      const arrived=1-Math.pow(1-entrance,3);
      const x=sin*r*(.92+.08*arrived),y=cos*r*.165+(1-arrived)*74,z=cos*r*.986-(1-arrived)*100;
      el.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateY(${i*step+angle+spin}deg) rotateX(-9.5deg) scale(${.82+.18*arrived})`;
      el.style.opacity=String(Math.min(1,entrance*3));
      el.querySelector('.wash').style.opacity=String(Math.max(0,(-cos+.15)*.65));
      // The back half remains visible, with the front faces taking pointer priority.
      el.style.pointerEvents=cos>-.2&&entrance>.85?'auto':'none';
    });
    status();
    if(!reduced.matches || intro || Math.abs(target-angle)>.005)wake();
  }
  function wake(){if(!raf)raf=requestAnimationFrame(draw);}
  function stopIntro(){lastInteract=performance.now();if(intro){intro=false;angle=target;cancelIntro();lastVisualRotation=null;}}
  function move(d){stopIntro();target=Math.round(target/step)*step+d*step;wake();}
  function snap(){target=Math.round(target/step)*step;wake();}
  stage.addEventListener('wheel',e=>{
    if(dialog.open||about.open||!index.hidden||e.ctrlKey)return;
    e.preventDefault();stopIntro();
    let d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
    if(e.deltaMode===1)d*=16;if(e.deltaMode===2)d*=innerHeight;
    target-=Math.max(-260,Math.min(260,d))*.065;wake();
    clearTimeout(snapTimer);snapTimer=setTimeout(snap,180);
  },{passive:false});
  stage.addEventListener('pointerdown',e=>{
    keyboardMode=false;
    if(e.button!==0||e.target.closest('.gallery-footer,.gallery-status'))return;
    stopIntro();clearTimeout(snapTimer);dragged=false;
    drag={x:e.clientX,y:e.clientY,start:target,last:e.clientX,lastTime:performance.now(),speed:0,id:e.pointerId};
  });
  stage.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>7){dragged=true;stage.classList.add('dragging');stage.setPointerCapture(e.pointerId);}
    if(dragged){e.preventDefault();target=drag.start+(dx-dy*.35)*.21;
      const now=performance.now();drag.speed=(e.clientX-drag.last)/Math.max(now-drag.lastTime,1);drag.last=e.clientX;drag.lastTime=now;wake();}
  });
  function endDrag(){if(!drag)return;const speed=performance.now()-drag.lastTime<90?drag.speed:0;
    if(dragged){target+=Math.max(-step,Math.min(step,speed*16));snap();}
    drag=null;stage.classList.remove('dragging');setTimeout(()=>{dragged=false;},0);
  }
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',()=>{drag=null;dragged=false;stage.classList.remove('dragging');snap();});
  $('#previous').onclick=()=>move(1);$('#next').onclick=()=>move(-1);$('#active-title').onclick=()=>openProject(selected,cards[selected]);
  document.addEventListener('keydown',e=>{
    keyboardMode=true;lastInteract=performance.now();
    if(about.open)return;
    if(dialog.open){if(e.key==='ArrowRight'){e.preventDefault();openProject(mod(currentProject+1,count));}if(e.key==='ArrowLeft'){e.preventDefault();openProject(mod(currentProject-1,count));}return;}
    if(!index.hidden)return;
    if(e.key==='ArrowRight'){e.preventDefault();move(-1);}if(e.key==='ArrowLeft'){e.preventDefault();move(1);}
  });
  function showIndex(show){index.hidden=!show;stage.inert=show;$('#index-button').setAttribute('aria-expanded',String(show));
    if(show){$('#close-index').focus();}else{$('#index-button').focus();}}
  $('.skip-link').onclick=e=>{e.preventDefault();showIndex(true);};
  $('#index-button').onclick=()=>showIndex(index.hidden);$('#close-index').onclick=()=>showIndex(false);
  index.addEventListener('keydown',e=>{if(e.key==='Escape')showIndex(false);});
  function openProject(i,from){
    const p=projects[i],wasOpen=dialog.open;currentProject=i;
    if(!wasOpen)returnFocus=from||document.activeElement;
    let rect=from?.classList.contains('project-card')?from.getBoundingClientRect():null;
    $('#project-content').innerHTML=`<div class="project-opening"><img class="project-hero" src="${p.cover}" alt="${escape(p.title)} project"><div class="project-summary"><p class="project-kicker">${escape(p.category)}</p><h2 id="project-title">${logo(p,'project-logo')}</h2><p class="project-intro">${escape(p.intro)}</p><p class="project-services">${escape(p.services)}</p></div></div>${p.body.length?`<div class="project-body">${p.body.map(t=>`<p>${escape(t)}</p>`).join('')}</div>`:'<div style="height:40px"></div>'}<div class="project-images">${p.images.map((s,j)=>`<img src="${s}" alt="${escape(p.title)} ${j?'project detail':'in focus'}" loading="lazy">`).join('')}</div><div class="project-bottom"><button id="next-case"><span>Next project</span>${escape(projects[mod(i+1,count)].title)} →</button><a href="mailto:nico@tripledown.group">Let's make something happen</a></div>`;
    if(!wasOpen)dialog.showModal();dialog.scrollTop=0;
    $('#next-case').onclick=()=>openProject(mod(currentProject+1,count));
    history.replaceState(null,'',`#${p.slug}`);
    if(rect&&!reduced.matches){
      const img=$('.project-hero');const dst=img.getBoundingClientRect();
      const clone=new Image();clone.className='flight';clone.src=p.cover;
      Object.assign(clone.style,{left:dst.x+'px',top:dst.y+'px',width:dst.width+'px',height:dst.height+'px'});document.body.append(clone);
      const animation=clone.animate([{transform:`translate(${rect.x-dst.x}px,${rect.y-dst.y}px) scale(${rect.width/dst.width},${rect.height/dst.height})`,borderRadius:'13px'},{transform:'translate(0,0) scale(1)',borderRadius:'0'}],{duration:680,easing:'cubic-bezier(.16,1,.3,1)'});
      animation.onfinish=()=>clone.remove();animation.oncancel=()=>clone.remove();
      $('.project-summary').animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,delay:140,fill:'backwards',easing:'ease-out'});
    }
  }
  function closeProject(){dialog.close();}
  $('.close-project').onclick=closeProject;
  dialog.addEventListener('close',()=>{history.replaceState(null,'',location.pathname+location.search);target=-currentProject*step+Math.round((angle+currentProject*step)/360)*360;wake();returnFocus?.focus({preventScroll:true});});
  $('#about-button').onclick=()=>about.showModal();$('.close-about').onclick=()=>about.close();
  about.addEventListener('click',e=>{if(e.target===about){const r=about.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)about.close();}});
  reduced.addEventListener('change',()=>{if(reduced.matches){intro=false;angle=target;cancelIntro();lastVisualRotation=null;}wake();});
  window.addEventListener('resize',size);brandIntro();size();status();
  const hash=location.hash.slice(1),hashIndex=projects.findIndex(x=>x.slug===hash);
  if(hashIndex>=0){intro=false;cancelIntro();target=angle=-hashIndex*step;openProject(hashIndex);}
})();
