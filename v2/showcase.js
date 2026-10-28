/* Gallery geometry and motion ported from Triple Down Dimension be3eeb9.
   Orbit keeps its own opening, story dialog and native agency page outside here. */
(() => {
  'use strict';
  const section = document.querySelector('.work-showcase');
  if (!section) return;
  const cases = JSON.parse(section.querySelector('.dimension-data').textContent);
  const $ = selector => section.querySelector(selector);
  const experience = $('.dimension-viewport'), gallery = $('.dimension-gallery');
  const track = $('.dimension-track'), thread = $('.dimension-thread');
  const caption = $('.dimension-caption'), category = $('.dimension-category');
  const indexButtons = [...section.querySelectorAll('[data-dimension-jump]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [], count = cases.length;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const duration = n => reduced.matches ? 0 : n;
  let selected = 0, displaySlot = 2, lockUntil = 0, wheelSum = 0, lastWheel = 0;
  let width, height, cardW, cardH, pitch, centerY, entered = false, pointerDown = null, moved = false;
  let scrollFrame = 0, lastScrollY = scrollY, leaving = 0, wrapTimer = 0;
  let captionAnimations = [];
  function paintLogo(target, project, alt) {
    target.replaceChildren();
    if (project.logo) {
      const image = new Image(); image.src = project.logo.image; image.alt = alt;
      image.className = 'dimension-logo ' + project.logo.treatment; target.append(image);
    } else { const word = document.createElement('span'); word.className='dimension-wordmark';word.textContent=project.name;target.append(word); }
  }
  // The same two clone slots either side as the recovered Dimension gallery.
  for (let slot=0;slot<count+4;slot++) {
    const i=(slot-2+count)%count, project=cases[i];
    const link=document.createElement('a');link.className='dimension-card';link.href=project.href;
    link.dataset.orbitStory=project.slug;link.setAttribute('aria-label',`View ${project.name} story`);
    const image=new Image();image.src=project.image;image.alt=project.alt;image.draggable=false;
    link.append(image);track.append(link);
    link.addEventListener('click',event=>{
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
      if(moved){event.preventDefault();event.stopPropagation();return;}
      if(i!==selected){event.preventDefault();event.stopPropagation();selectProject(i);}
    });
    cards.push({el:link,slot,index:i,rotation:Math.sin(i*18.371+1.7)*10.5});
  }
  function measure({smooth=false}={}) {
    width=experience.clientWidth;height=experience.clientHeight;const mobile=width<=700;
    const stacked=width<820,compact=height<540;
    section.classList.toggle('gallery-stacked',stacked);section.classList.toggle('gallery-compact',compact);
    const edge=mobile?22:width*.045,topSafe=mobile?82:92;
    const controlsBottom=mobile?(height<=700?12:22):35,contentBottom=height-controlsBottom-62;
    const set=(key,value)=>experience.style.setProperty(key,value);
    let captionWidth,captionTop;
    if(stacked){
      captionWidth=Math.min(width*.78,460);set('--caption-width',captionWidth+'px');set('--caption-left',(width-captionWidth)/2+'px');
      const captionHeight=Math.ceil(caption.getBoundingClientRect().height),gap=compact?16:24;
      const available=Math.max(64,contentBottom-topSafe-captionHeight-gap);
      cardW=Math.min(width*.78,mobile?360:460);cardH=Math.min(cardW*(mobile&&height>=500?1.25:300/460),available);
      const free=Math.max(0,contentBottom-topSafe-cardH-gap-captionHeight),photoTop=topSafe+free*.35;
      centerY=photoTop+cardH/2;captionTop=photoTop+cardH+gap;pitch=cardH+captionHeight+gap+100;
    }else{
      cardW=Math.min(460,width*.40,Math.max(90,contentBottom-topSafe)*460/300);cardH=cardW*300/460;
      centerY=clamp(height*.44,topSafe+cardH/2,contentBottom-cardH/2);
      const fullFrame=cardW+cardH*.22;captionWidth=Math.min(300,Math.max(120,(width-fullFrame)/2-edge-18));
      set('--caption-width',captionWidth+'px');set('--caption-left',edge+'px');
      const captionHeight=Math.ceil(caption.getBoundingClientRect().height);captionTop=clamp(centerY-captionHeight/2,topSafe,contentBottom-captionHeight);pitch=cardH*4/3;
    }
    set('--caption-top',captionTop+'px');set('--category-top',centerY+'px');set('--photo-bottom',centerY+cardH/2+'px');
    cards.forEach(card=>{card.el.style.width=`${cardW}px`;card.el.style.height=`${cardH}px`;card.el.style.top=`${card.slot*pitch}px`;});
    positionTrack(smooth);
    const path=[];for(let slot=0;slot<count+3;slot++){const y=slot*pitch;path.push(`${slot?'L':'M'}${width/2} ${y} C${width/2+35} ${y+pitch*.35} ${width/2-28} ${y+pitch*.65} ${width/2} ${y+pitch}`);}
    thread.querySelector('path').setAttribute('d',path.join(' '));
  }
  function positionTrack(smooth=true) {
    const y=centerY-displaySlot*pitch;
    track.style.transition=smooth?`transform ${duration(800)}ms cubic-bezier(.22,1,.36,1)`:'none';
    track.style.transform=`translateY(${y}px)`;
    thread.style.transition=track.style.transition;thread.style.transform=`translateY(${y}px)`;
    cards.forEach(card=>{
      card.el.style.transition=smooth?`transform ${duration(800)}ms cubic-bezier(.22,1,.36,1)`:'none';
      const active=card.slot===displaySlot;
      card.el.style.transform=`translate(-50%,-50%) rotate(${active?0:card.rotation}deg)`;
      card.el.classList.toggle('active',active);card.el.tabIndex=active?0:-1;
      const distant=Math.abs(card.slot-displaySlot)>1;
      card.el.setAttribute('aria-hidden',String(distant));card.el.inert=distant;
    });
  }
  function updateCaption(animate=true) {
    const project=cases[selected];$('.dimension-number').textContent=String(selected+1).padStart(2,'0');
    paintLogo($('.dimension-case-logo'),project,project.name);
    $('.dimension-case-line').textContent=project.line;category.textContent=project.category;
    const link=$('.dimension-open');link.href=project.href;link.dataset.orbitStory=project.slug;
    $('.dimension-controls output').textContent=`${String(selected+1).padStart(2,'0')} / ${count}`;
    indexButtons.forEach((button,i)=>button.setAttribute('aria-current',String(i===selected)));
    $('.dimension-announcement').textContent=entered?`${project.name}. ${project.line}`:'';
    measure({smooth:animate});
    captionAnimations.forEach(animation=>animation.cancel());captionAnimations=[];
    if(animate&&!reduced.matches)for(const element of [caption,category])captionAnimations.push(element.animate([{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:610,delay:110,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
  }
  function enter() {
    if(entered)return;
    entered=true;section.classList.add('has-entered');updateCaption(false);
    if(!reduced.matches)gallery.animate([{opacity:0,scale:'.94'},{opacity:1,scale:'1'}],{duration:600,easing:'cubic-bezier(.22,1,.36,1)'});
  }
  function aligned() { return Math.abs(section.getBoundingClientRect().top)<=3; }
  function align() { leaving=0;scrollTo({top:scrollY+section.getBoundingClientRect().top,behavior:'instant'});enter();checkScroll(); }
  function selectProject(target,step) {
    enter();const next=(target+count)%count;if(next===selected)return;
    selected=next;displaySlot=step?displaySlot+step:selected+2;
    lockUntil=performance.now()+duration(820);updateCaption();clearTimeout(wrapTimer);
    if(displaySlot<2||displaySlot>=count+2)wrapTimer=setTimeout(()=>{displaySlot=selected+2;positionTrack(false);},duration(810));
  }
  function advance(direction) {
    if(document.querySelector('dialog[open]')||performance.now()<lockUntil)return;
    selectProject(selected+direction,direction);
  }
  function exit(direction) {
    leaving=direction;const target=direction>0?document.querySelector('#introduction'):document.querySelector('.gallery-stage');
    if(target){target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});}
  }
  section.addEventListener('wheel',event=>{
    if(document.querySelector('dialog[open]')||event.ctrlKey)return;
    const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
    const rect=section.getBoundingClientRect();
    if(leaving&&Math.abs(delta)>=2&&Math.sign(delta)!==leaving)leaving=0;
    if(!aligned()){
      if(leaving)return;
      if(Math.abs(rect.top)<=48){align();}
      else if((rect.top>0&&rect.top<innerHeight*.55&&delta>0)||(rect.top<0&&rect.top>-innerHeight*.55&&delta<0)){
        event.preventDefault();align();lockUntil=performance.now()+duration(440);return;
      }else return;
    }
    const now=performance.now();
    // Normal page scrolling resumes at the ends, and during a deliberate exit.
    if(leaving)return;
    if(Math.abs(delta)<2){event.preventDefault();return;}
    if(now>=lockUntil&&((selected===0&&delta<0)||(selected===count-1&&delta>0))){
      leaving=Math.sign(delta);const target=delta>0?document.querySelector('#introduction'):document.querySelector('.gallery-stage');
      if(target){target.tabIndex=-1;target.focus({preventScroll:true});}return;
    }
    event.preventDefault();
    if(now-lastWheel>180)wheelSum=0;lastWheel=now;
    if(now<lockUntil){wheelSum=0;return;}
    wheelSum+=delta;if(Math.abs(wheelSum)>=40){advance(Math.sign(wheelSum));wheelSum=0;}
  },{passive:false});
  experience.addEventListener('pointerdown',event=>{if(event.isPrimary===false||event.button!==0)return;pointerDown={x:event.clientX,y:event.clientY};moved=false;});
  experience.addEventListener('pointermove',event=>{if(pointerDown&&Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>8)moved=true;});
  experience.addEventListener('pointerup',event=>{
    if(!pointerDown)return;const dx=event.clientX-pointerDown.x,dy=event.clientY-pointerDown.y;pointerDown=null;
    if(Math.max(Math.abs(dx),Math.abs(dy))>26&&aligned()){
      const direction=Math.abs(dx)>Math.abs(dy)?-Math.sign(dx):-Math.sign(dy);
      if((selected===0&&direction<0)||(selected===count-1&&direction>0))exit(direction);else advance(direction);
    }
    setTimeout(()=>moved=false,0);
  });
  experience.addEventListener('pointercancel',()=>{pointerDown=null;moved=false;});
  addEventListener('pointerup',()=>{if(pointerDown){pointerDown=null;setTimeout(()=>moved=false,0);}});
  document.addEventListener('keydown',event=>{
    if(!section.contains(event.target)&&event.target!==document.body&&event.target!==document.documentElement)return;
    if(!aligned()||document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,[contenteditable]'))return;
    const direction=['ArrowDown','ArrowRight','PageDown'].includes(event.key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(event.key)?-1:0;
    if(direction){event.preventDefault();if((selected===0&&direction<0)||(selected===count-1&&direction>0))exit(direction);else advance(direction);}
    if(event.key==='Home'||event.key==='End'){event.preventDefault();selectProject(event.key==='Home'?0:count-1);}
  });
  indexButtons.forEach((button,i)=>button.addEventListener('click',()=>{align();selectProject(i);}));
  $('[data-dimension-next]').addEventListener('click',()=>{align();advance(1);});
  $('[data-dimension-previous]').addEventListener('click',()=>{align();advance(-1);});
  $('.dimension-continue').addEventListener('click',event=>{event.preventDefault();exit(1);});
  document.querySelector('.scroll-hint')?.addEventListener('click',event=>{event.preventDefault();align();section.focus({preventScroll:true});});
  function checkScroll() {
    scrollFrame=0;const rect=section.getBoundingClientRect(),direction=scrollY-lastScrollY;lastScrollY=scrollY;
    if(rect.top>innerHeight*.6||rect.bottom<innerHeight*.3||direction*leaving<0)leaving=0;
    if(!leaving&&direction!==0&&Math.abs(rect.top)>3&&rect.top<=innerHeight*.3&&rect.top>-innerHeight*.4){align();return;}
    if(rect.top<innerHeight*.75&&rect.bottom>innerHeight*.25)enter();
    const active=aligned();section.classList.toggle('is-work-active',active);document.body.classList.toggle('dimension-in-view',active);
  }
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(checkScroll);},{passive:true});
  addEventListener('resize',()=>measure());
  document.fonts.ready.then(()=>measure());
  reduced.addEventListener('change',()=>{captionAnimations.forEach(animation=>animation.cancel());clearTimeout(wrapTimer);displaySlot=selected+2;measure();lockUntil=0;});
  experience.hidden=false;section.classList.add('is-enhanced');updateCaption(false);checkScroll();
})();
