/* Dimension gallery inside Orbit: balanced cards, shared zigzag geometry and
   scroll-linked light. The Orbit opening and native agency pages stay separate. */
(() => {
  'use strict';
  const section=document.querySelector('.work-showcase');if(!section)return;
  const cases=JSON.parse(section.querySelector('.dimension-data').textContent),count=cases.length;
  const $=selector=>section.querySelector(selector),mod=(n,m)=>((n%m)+m)%m,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const experience=$('.dimension-viewport'),gallery=$('.dimension-gallery'),track=$('.dimension-track'),thread=$('.dimension-thread');
  const caption=$('.dimension-caption'),category=$('.dimension-category'),index=$('.dimension-index'),indexButtons=[...section.querySelectorAll('[data-dimension-jump]')];
  // Keep the native index scroller outside the drag surface's touch-action scope.
  section.append(index);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),cards=[],svgNS='http://www.w3.org/2000/svg';
  const signal=document.createElementNS(svgNS,'g'),tail=document.createElementNS(svgNS,'path'),signalLogo=document.createElementNS(svgNS,'image');
  signal.classList.add('dimension-signal');tail.classList.add('dimension-signal-tail');signalLogo.classList.add('dimension-signal-logo');
  signalLogo.setAttribute('href',document.querySelector('.site-header .wordmark img').src);signalLogo.setAttribute('width','24');signalLogo.setAttribute('height',String(24*700/1160));signalLogo.setAttribute('preserveAspectRatio','xMidYMid meet');
  signal.append(tail,signalLogo);thread.append(signal);
  let selected=0,position=0,target=0,width,height,cardW,cardH,pitch,centerY,entered=false,leaving=0;
  let raf=0,lastFrame=0,scrollFrame=0,lastScrollY=scrollY,snapTimer=0,lastWheel=0,wheelDirection=0,pointer=null,moved=false,settledIndex=0,gestureStart=0,gestureDelta=0;
  let captionAnimations=[],points=[],reserveKey='',reservedCaptionHeight=0,lastPulse=-1,lastPosition=0;
  const pulses=new Map();
  function paintLogo(element,project,alt){
    element.replaceChildren();if(project.logo){const image=new Image();image.src=project.logo.image;image.alt=alt;image.className='dimension-logo '+project.logo.treatment;element.append(image);}
    else{const word=document.createElement('span');word.className='dimension-wordmark';word.textContent=project.name;element.append(word);}
  }
  for(let slot=0;slot<count+4;slot++){
    const i=mod(slot-2,count),project=cases[i],el=document.createElement('a'),image=new Image();
    el.className='dimension-card';el.href=project.href;el.dataset.orbitStory=project.slug;el.setAttribute('aria-label',`View ${project.name} story`);
    image.src=project.image;image.alt=project.alt;image.draggable=false;el.append(image);track.append(el);
    el.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;if(moved){event.preventDefault();event.stopPropagation();return;}if(i!==selected){event.preventDefault();event.stopPropagation();selectProject(i);}});
    cards.push({el,slot,index:i,rotation:(i%2?1:-1)*(2.5+(i%3)*.7)});
  }
  function captionReserve(captionWidth,compact){
    const key=`${captionWidth.toFixed(1)}:${compact}`;if(key===reserveKey)return reservedCaptionHeight;
    const probe=caption.cloneNode(true);probe.classList.add('dimension-size-probe');probe.setAttribute('aria-hidden','true');probe.inert=true;
    Object.assign(probe.style,{visibility:'hidden',left:'0',top:'0',width:captionWidth+'px',minHeight:'0',pointerEvents:'none'});experience.append(probe);
    let maximum=0;for(const project of cases){probe.querySelector('.dimension-case-line').textContent=project.line;maximum=Math.max(maximum,probe.getBoundingClientRect().height);}probe.remove();
    reserveKey=key;reservedCaptionHeight=Math.ceil(maximum);return reservedCaptionHeight;
  }
  function measure(){
    width=experience.clientWidth;height=experience.clientHeight;
    const mobile=width<=600,stacked=mobile,compact=height<600;
    section.classList.toggle('gallery-stacked',stacked);section.classList.toggle('gallery-compact',compact);
    const headerHeight=document.querySelector('.site-header').getBoundingClientRect().height;
    const edge=mobile?22:width*.045,topSafe=headerHeight+12,controlsBottom=mobile?(height<=700?12:22):24,contentBottom=height-controlsBottom-60;
    const set=(key,value)=>section.style.setProperty(key,value);let captionWidth,captionTop;
    set('--index-top',(headerHeight+8)+'px');
    if(stacked){
      captionWidth=width-edge*2;set('--caption-width',captionWidth+'px');set('--caption-left',edge+'px');
      const captionHeight=captionReserve(captionWidth,compact),gap=18;
      captionTop=contentBottom-captionHeight-gap;
      const railBottom=captionTop-16,railHeight=Math.max(64,railBottom-topSafe);
      cardW=Math.min(width*.7,width-128,360,railHeight*.6*460/300);cardH=cardW*300/460;
      centerY=topSafe+railHeight/2;pitch=cardH+clamp(cardH*.28,32,62);
      set('--rail-top',topSafe+'px');set('--rail-bottom',railBottom+'px');
    }else{
      cardW=Math.min(460,width*.4,Math.max(90,contentBottom-topSafe)*460/300);cardH=cardW*300/460;
      const preferredCenter=height>=650?Math.max(height*.44,topSafe+cardH*.95+50):height*.44;
      centerY=clamp(preferredCenter,topSafe+cardH/2,contentBottom-cardH/2);
      captionWidth=Math.min(300,Math.max(120,(width-cardW-cardH*.14)/2-edge-18));set('--caption-width',captionWidth+'px');set('--caption-left',edge+'px');
      const captionHeight=caption.getBoundingClientRect().height;captionTop=clamp(centerY-captionHeight/2,topSafe,contentBottom-captionHeight);pitch=cardH*1.45;
    }
    set('--caption-top',captionTop+'px');set('--category-top',(stacked?captionTop:Math.max(centerY,headerHeight+190))+'px');set('--photo-bottom',centerY+cardH/2+'px');
    points=cards.map(card=>{const sign=card.index%2?1:-1,offset=(mobile?-12:0)+sign*Math.min(mobile?11:20,cardW*.045);card.offset=offset;Object.assign(card.el.style,{width:cardW+'px',height:cardH+'px',top:card.slot*pitch+'px'});return{x:width/2+offset+sign*cardW*.18,y:card.slot*pitch};});
    thread.querySelector('path').setAttribute('d',points.map((point,i)=>`${i?'L':'M'}${point.x} ${point.y}`).join(' '));paintPosition();
  }
  function updateCaption(animate=true){
    const project=cases[selected];$('.dimension-number').textContent=String(selected+1).padStart(2,'0');paintLogo($('.dimension-case-logo'),project,project.name);
    $('.dimension-case-line').textContent=project.line;category.textContent=project.category;const link=$('.dimension-open');link.href=project.href;link.dataset.orbitStory=project.slug;
    $('.dimension-controls output').textContent=`${String(selected+1).padStart(2,'0')} / ${count}`;indexButtons.forEach((button,i)=>button.setAttribute('aria-current',String(i===selected)));
    measure();captionAnimations.forEach(animation=>animation.cancel());captionAnimations=[];
    if(animate&&!reduced.matches)for(const el of[caption,category])captionAnimations.push(el.animate([{opacity:0,translate:'0 7px'},{opacity:1,translate:'0 0'}],{duration:240,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
  }
  function pointAt(slot){const lower=clamp(Math.floor(slot),0,points.length-2),fraction=clamp(slot-lower,0,1),a=points[lower],b=points[lower+1];return{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};}
  function cardInterval(card,a,b){
    // Intersect the shared connector with the photo's actual rotated bounds.
    const angle=-card.rotation*Math.min(Math.abs(card.slot-2-position),1)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
    const x=a.x-width/2-card.offset,y=a.y-card.slot*pitch,dx=b.x-a.x,dy=b.y-a.y;
    const origin=[x*cos-y*sin,x*sin+y*cos],vector=[dx*cos-dy*sin,dx*sin+dy*cos],half=[cardW/2,cardH/2];
    let enter=0,exit=1;
    for(let axis=0;axis<2;axis++){
      if(Math.abs(vector[axis])<.00001){if(Math.abs(origin[axis])>half[axis])return null;continue;}
      const first=(-half[axis]-origin[axis])/vector[axis],last=(half[axis]-origin[axis])/vector[axis];
      enter=Math.max(enter,Math.min(first,last));exit=Math.min(exit,Math.max(first,last));
    }
    return enter<=exit?{enter,exit}:null;
  }
  function pulse(index){
    index=mod(index,count);if(reduced.matches||index===lastPulse)return;lastPulse=index;
    for(const card of cards.filter(card=>card.index===mod(index,count))){pulses.get(card.el)?.cancel();const animation=card.el.animate([{'--arrival-light':0},{'--arrival-light':.23,offset:.16},{'--arrival-light':0}],{duration:550,easing:'ease-out'});pulses.set(card.el,animation);animation.onfinish=()=>pulses.delete(card.el);}
  }
  function paintPosition(){
    if(!pitch)return;const y=centerY-(position+2)*pitch;track.style.transform=`translateY(${y}px)`;thread.style.transform=`translateY(${y}px)`;
    for(const card of cards){const distance=Math.abs(card.slot-2-position),active=distance<.5;card.el.style.transform=`translate(-50%,-50%) translateX(${card.offset}px) rotate(${card.rotation*Math.min(distance,1)}deg)`;card.el.classList.toggle('active',active);card.el.tabIndex=active?0:-1;card.el.setAttribute('aria-hidden',String(distance>1.2));card.el.inert=distance>1.2;}
    const moving=Math.abs(target-position)>.002||pointer;
    if(reduced.matches||!moving){signal.style.opacity='0';return;}
    const direction=Math.sign(target-position)||Math.sign(position-lastPosition)||1,from=Math.floor(position),fraction=position-from;
    const source=cards[2+from],destination=cards[3+from],a=pointAt(2+from),b=pointAt(3+from);
    if(!source||!destination){signal.style.opacity='0';return;}
    const departure=cardInterval(source,a,b),arrival=cardInterval(destination,a,b);
    if(!departure||!arrival){signal.style.opacity='0';return;}
    const length=Math.hypot(b.x-a.x,b.y-a.y),padding=10/length,start=departure.exit+padding,end=arrival.enter-padding;
    if(end<=start){signal.style.opacity='0';return;}
    // Start on the exposed line immediately and cross its whole visible gap.
    // Mapping only the visible gap avoids spending the start hidden by a photo.
    // One canonical segment keeps the marker continuous if a gesture reverses.
    const slot=2+from+start+(end-start)*fraction,point=pointAt(slot),behind=pointAt(slot-direction*.04);
    signalLogo.setAttribute('x',point.x-12);signalLogo.setAttribute('y',point.y-12*700/1160);tail.setAttribute('d',`M${behind.x} ${behind.y} L${point.x} ${point.y}`);signal.style.opacity='1';
    if(direction>0?fraction>.98:fraction<.02)pulse(from+(direction>0?1:0));
  }
  function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
  function tick(now){
    raf=0;const dt=lastFrame?Math.min(40,now-lastFrame):16.667;lastFrame=now;lastPosition=position;
    const distance=target-position;if(reduced.matches)position=target;else position+=clamp(distance*(1-Math.exp(-dt/(pointer?55:100))),-dt*.0065,dt*.0065);
    if(Math.abs(target-position)<.002)position=target;
    if(position>count-.5){position-=count;target-=count;lastPosition-=count;}else if(position<-.5){position+=count;target+=count;lastPosition+=count;}
    if(position>lastPosition){for(let i=Math.floor(lastPosition)+1;i<=Math.floor(position);i++)pulse(i);}
    else if(position<lastPosition){for(let i=Math.ceil(lastPosition)-1;i>=Math.ceil(position);i--)pulse(i);}
    const next=mod(Math.round(position),count);if(next!==selected){selected=next;updateCaption();}
    paintPosition();
    if(position===target&&!pointer){lastFrame=0;if(Number.isInteger(position)&&settledIndex!==selected){settledIndex=selected;$('.dimension-announcement').textContent=`${cases[selected].name}. ${cases[selected].line}`;}if(Number.isInteger(position)&&Math.abs(lastPosition-position)>.0001)pulse(selected);}
    else wake();
  }
  function enter(){if(entered)return;entered=true;section.classList.add('has-entered');updateCaption(false);$('.dimension-announcement').textContent=`${cases[selected].name}. ${cases[selected].line}`;if(!reduced.matches)gallery.animate([{opacity:0,scale:'.97'},{opacity:1,scale:'1'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});}
  function aligned(){return Math.abs(section.getBoundingClientRect().top)<=3;}
  function align(){leaving=0;scrollTo({top:scrollY+section.getBoundingClientRect().top,behavior:'instant'});enter();checkScroll();}
  function clearIntent(){clearTimeout(snapTimer);wheelDirection=0;lastWheel=0;gestureDelta=0;}
  function selectProject(index){enter();clearIntent();lastPulse=-1;target=clamp(index,0,count-1);if(reduced.matches){position=target;selected=mod(Math.round(position),count);updateCaption(false);}wake();}
  function advance(direction){
    if(document.querySelector('dialog[open]'))return;enter();clearIntent();
    if(Math.sign(target-position)&&Math.sign(target-position)!==direction)target=position;
    target=clamp(Math.round(target)+direction,Math.ceil(position-2),Math.floor(position+2));wake();
  }
  function snap(){target=clamp(Math.round(target),0,count-1);wake();}
  function snapWheel(){let destination=Math.round(target);if(destination===gestureStart&&Math.abs(gestureDelta)>=40)destination+=Math.sign(gestureDelta);target=clamp(destination,0,count-1);gestureDelta=0;wake();}
  function atBoundary(end){const boundary=end?count-1:0;return Math.abs(position-boundary)<.06&&Math.abs(target-boundary)<.01;}
  function stop(){clearIntent();pointer=null;target=position=mod(Math.round(position),count);selected=mod(Math.round(position),count);lastFrame=0;signal.style.opacity='0';updateCaption(false);}
  function exit(direction){stop();leaving=direction;const destination=direction>0?document.querySelector('#introduction'):document.querySelector('.gallery-stage');if(destination){destination.tabIndex=-1;destination.focus({preventScroll:true});destination.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});}}
  section.addEventListener('wheel',event=>{
    if(document.querySelector('dialog[open]')||event.ctrlKey)return;
    if(index.contains(event.target)&&index.scrollHeight>index.clientHeight+1)return;
    let delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;if(event.deltaMode===1)delta*=16;if(event.deltaMode===2)delta*=height;
    const rect=section.getBoundingClientRect(),direction=Math.sign(delta);if(leaving&&Math.abs(delta)>=2&&direction!==leaving)leaving=0;
    if(!aligned()){if(leaving)return;if(Math.abs(rect.top)<=48)align();else if((rect.top>0&&rect.top<innerHeight*.55&&delta>0)||(rect.top<0&&rect.top>-innerHeight*.55&&delta<0)){event.preventDefault();align();}else return;}
    if(leaving)return;if(Math.abs(delta)<2){event.preventDefault();return;}
    const atStart=atBoundary(false),atEnd=atBoundary(true);
    if((atStart&&delta<0)||(atEnd&&delta>0)){stop();leaving=direction;return;}
    event.preventDefault();enter();const now=performance.now(),reversing=direction!==(wheelDirection||Math.sign(target-position));
    if(now-lastWheel>220||reversing){gestureStart=mod(Math.round(position),count);gestureDelta=0;}
    if(reversing)target=position;lastWheel=now;wheelDirection=direction;gestureDelta+=delta;
    target=clamp(target+clamp(delta,-540,540)/180,Math.max(0,position-2),Math.min(count-1,position+2));
    clearTimeout(snapTimer);snapTimer=setTimeout(snapWheel,160);wake();
  },{passive:false});
  experience.addEventListener('pointerdown',event=>{if(event.isPrimary===false||event.button!==0||event.target.closest('.dimension-controls,.dimension-index,.dimension-caption,.dimension-continue'))return;target=position;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,start:position};moved=false;clearIntent();});
  experience.addEventListener('pointermove',event=>{if(!pointer||event.pointerId!==pointer.id)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;if(Math.hypot(dx,dy)<=8)return;moved=true;if(!aligned())return;try{experience.setPointerCapture(event.pointerId);}catch{}const distance=clamp(height*.3,150,250),travel=Math.abs(dx)>Math.abs(dy)?dx:dy;target=clamp(pointer.start-travel/distance,0,count-1);wake();});
  experience.addEventListener('pointerup',event=>{
    if(!pointer||event.pointerId!==pointer.id)return;const origin=pointer,dx=event.clientX-origin.x,dy=event.clientY-origin.y;pointer=null;
    if(moved&&aligned()){const travel=Math.abs(dx)>Math.abs(dy)?dx:dy,direction=-Math.sign(travel);if(Math.abs(travel)>26){if((origin.start<=0&&direction<0)||(origin.start>=count-1&&direction>0))exit(direction);else{if(Math.abs(target-origin.start)<.5)target=clamp(Math.round(origin.start)+direction,0,count-1);snap();}}else snap();}else snap();
    setTimeout(()=>moved=false,0);
  });
  experience.addEventListener('pointercancel',event=>{if(!pointer||event.pointerId!==pointer.id)return;pointer=null;moved=false;snap();});
  addEventListener('pointerup',event=>{if(pointer&&event.pointerId===pointer.id){pointer=null;snap();setTimeout(()=>moved=false,0);}});
  document.addEventListener('keydown',event=>{if(!section.contains(event.target)&&event.target!==document.body&&event.target!==document.documentElement)return;if(!aligned()||document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,[contenteditable]'))return;const direction=['ArrowDown','ArrowRight','PageDown'].includes(event.key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(event.key)?-1:0;if(direction){event.preventDefault();if((atBoundary(false)&&direction<0)||(atBoundary(true)&&direction>0))exit(direction);else advance(direction);}if(event.key==='Home'||event.key==='End'){event.preventDefault();selectProject(event.key==='Home'?0:count-1);}});
  indexButtons.forEach((button,i)=>button.addEventListener('click',()=>{align();selectProject(i);}));
  $('[data-dimension-next]').addEventListener('click',()=>{align();advance(1);});$('[data-dimension-previous]').addEventListener('click',()=>{align();advance(-1);});
  $('.dimension-continue').addEventListener('click',event=>{event.preventDefault();exit(1);});document.querySelector('.scroll-hint')?.addEventListener('click',event=>{event.preventDefault();align();section.focus({preventScroll:true});});
  function checkScroll(){scrollFrame=0;const rect=section.getBoundingClientRect(),direction=scrollY-lastScrollY;lastScrollY=scrollY;if(rect.top>innerHeight*.6||rect.bottom<innerHeight*.3||direction*leaving<0)leaving=0;if(!leaving&&direction!==0&&Math.abs(rect.top)>3&&rect.top<=innerHeight*.3&&rect.top>-innerHeight*.4){align();return;}if(rect.top<innerHeight*.75&&rect.bottom>innerHeight*.25)enter();const active=aligned();section.classList.toggle('is-work-active',active);document.body.classList.toggle('dimension-in-view',active);if(!active&&Math.abs(target-position)>.01)stop();}
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(checkScroll);},{passive:true});
  addEventListener('resize',()=>{const keepAligned=section.classList.contains('is-work-active');reserveKey='';measure();if(keepAligned)align();});document.fonts.ready.then(()=>{reserveKey='';measure();});
  reduced.addEventListener('change',()=>{captionAnimations.forEach(animation=>animation.cancel());pulses.forEach(animation=>animation.cancel());stop();});
  new MutationObserver(()=>{if(document.querySelector('dialog[open]'))stop();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else wake();});
  experience.hidden=false;section.classList.add('is-enhanced');updateCaption(false);checkScroll();
})();
