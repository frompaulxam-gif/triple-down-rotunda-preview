(() => {
  'use strict';
  const root = document.documentElement;
  const stage = document.querySelector('.orbit-opening');
  const composition = stage.querySelector('.orbit-composition');
  const scene = composition.querySelector('.orbit-scene');
  const cards = [...scene.querySelectorAll('.orbit-print')];
  const washes = cards.map(card => card.querySelector('i'));
  const lockup = document.querySelector('#intro-lockup');
  const name = lockup.querySelector('.intro-name');
  const cross = lockup.querySelector('.intro-cross');
  const logoWindow = lockup.querySelector('.logo-window');
  const marks = [...logoWindow.querySelectorAll('.intro-logo')];
  const reel = stage.querySelector('.orbit-reel');
  const film = reel.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const slots = cards.length, count = marks.length, step = 360 / slots;
  // The original Rotunda four passes, 85% fill, rush and continuous brake.
  const introStart=900,initialSpeed=3.5,approachSpeed=4.5,buildSpeed=6.5,peakSpeed=22;
  const fillThreshold=slots*.85,approachSeconds=fillThreshold*2/(initialSpeed+approachSpeed);
  const finalFillSeconds=(slots-fillThreshold)*2/(approachSpeed+buildSpeed);
  const buildSeconds=approachSeconds+finalFillSeconds,rushSeconds=.9,brakeSeconds=.6;
  const idleSpeed=1.68, introSteps=count*4;
  const rushDistance=(buildSpeed+peakSpeed)*rushSeconds/2;
  const cruiseSeconds=(introSteps-slots-rushDistance-peakSpeed*brakeSeconds/2)/peakSpeed;
  const motionEnd=introStart+(buildSeconds+rushSeconds+cruiseSeconds+brakeSeconds)*1000;
  const introDuration=motionEnd+1050;
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => n*n*(3-2*n);
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
  let entering = root.hasAttribute('data-orbit-entering');
  let visible = true, ready = false;
  let frame = 0, previous = 0, startTime = 0, angle = -step/2;
  let radius = 0, sceneOffset = 0, drag = null;
  let keyboardCard = null, suppressClick = false;
  const animations = [];

  if (root.dataset.orbitFilm === 'centre') {
    scene.append(reel);
    reel.removeAttribute('tabindex');
    reel.removeAttribute('aria-hidden');
  }
  function syncPlayback() {
    const play = !entering && visible && !document.hidden && !reduced.matches && !connection?.saveData;
    if (!play) { film.pause(); return; }
    if (!film.hasAttribute('src')) film.src = film.dataset.film;
    film.play().catch(() => {}); // The poster stays visible if autoplay is blocked.
  }
  film.addEventListener('playing', () => reel.classList.add('is-playing'));
  film.addEventListener('error', () => reel.classList.remove('is-playing'));
  function measure() {
    radius = innerWidth < 701 ? Math.min(innerWidth*.46,300) : Math.min(innerWidth*.378,innerHeight*.66,570);
    const rect = scene.getBoundingClientRect();
    sceneOffset = Math.min(0, innerHeight*.53 - rect.top - rect.height/2);
  }
  function animateBrand() {
    const target = document.querySelector('.site-header .logo-type').getBoundingClientRect();
    const mobile = innerWidth < 701;
    const row = innerHeight*.29;
    // Move the writing to the left of the client reel, then dock those same letters in the real header.
    const gap = mobile ? 12 : 24, crossWidth = mobile ? 18 : 28;
    const reels = logoWindow.getBoundingClientRect().width;
    const available = innerWidth-32-reels-2*gap-crossWidth;
    const scale = Math.min(mobile ? 1.7 : 2.1, available/target.width);
    const rowWidth = target.width*scale;
    const rowLeft = (innerWidth-rowWidth-reels-2*gap-crossWidth)/2;
    const y = row-target.height*scale/2-target.y;
    const pose = (left,dy=0,zoom=scale) => `translate(${left-target.x}px,${y+dy}px) scale(${zoom})`;
    const centre = (innerWidth-rowWidth)/2;
    lockup.style.setProperty('--intro-row-y',row+'px');
    Object.assign(name.style,{left:target.x+'px',top:target.y+'px'});
    cross.style.left = (rowLeft+rowWidth+gap)+'px';
    logoWindow.style.left = (rowLeft+rowWidth+gap*2+crossWidth)+'px';
    const at = ms => ms/introDuration;
    const settings = {duration:introDuration,fill:'both',easing:'linear'};
    animations.push(name.animate([
      {opacity:0,transform:pose(centre,8,scale*.9),filter:'blur(7px)',offset:0,easing:'ease-out'},
      {opacity:1,transform:pose(centre),filter:'blur(0px)',offset:at(250)},
      {transform:pose(centre),offset:at(380),easing:'cubic-bezier(.22,1,.36,1)'},
      {transform:pose(rowLeft),offset:at(760)},
      {transform:pose(rowLeft),offset:at(motionEnd+450),easing:'cubic-bezier(.22,1,.36,1)'},
      {opacity:1,transform:'none',filter:'blur(0px)',offset:1}
    ],settings));
    for (const el of [cross,logoWindow]) animations.push(el.animate([
      {opacity:0,offset:0},{opacity:0,offset:at(el===cross?720:800)},
      {opacity:1,offset:at(860)},{opacity:1,offset:at(motionEnd+50)},
      {opacity:0,offset:at(motionEnd+290)},{opacity:0,offset:1}
    ],settings));
  }
  function endIntro() {
    if (!entering) return;
    entering = false;
    root.removeAttribute('data-orbit-entering');
    animations.forEach(animation => animation.cancel());
    scene.style.removeProperty('--photo-blur');
    syncPlayback();
    wake();
  }
  function updateMarks(motion) {
    for (let i=0; i<count; i++) {
      const delta = ((i-motion.distance+count*5+1)%count)-1;
      const mark = marks[i];
      mark.style.visibility = Math.abs(delta)<1 ? 'visible' : 'hidden';
      if (Math.abs(delta)<1) mark.style.transform = `translateY(${delta*100}%)`;
    }
    logoWindow.style.setProperty('--brand-motion-blur',(motion.normalisedSpeed*3.2).toFixed(2)+'px');
  }
  function draw(time) {
    frame = 0;
    const dt = previous ? Math.min(time-previous,50)/1000 : 0;
    previous = time;
    let spread = 1, landingOffset = 0, distance = Infinity, elapsed = Infinity;
    if (entering) {
      elapsed = time-startTime;
      const motion = introMotion(elapsed);
      distance = motion.distance;
      const growth = clamp((elapsed-introStart-buildSeconds*1000)/((rushSeconds+cruiseSeconds)*1000));
      spread = .26+.4*clamp(distance/(slots-.28))+.44*smooth(growth);
      spread += (1-spread)*(1-Math.pow(1-clamp((elapsed-motionEnd+120)/400),3));
      landingOffset = sceneOffset*(1-smooth(clamp((elapsed-motionEnd-200)/850)));
      angle = -step/2+introRotation(elapsed,motion);
      updateMarks(motion);
      scene.style.setProperty('--photo-blur',`blur(${(motion.normalisedSpeed*(innerWidth<701?1.6:3)).toFixed(2)}px)`);
      if (elapsed>=introDuration) endIntro();
    } else if (!reduced.matches && !drag && !keyboardCard) angle -= idleSpeed*dt;
    const r = radius*spread;
    cards.forEach((card,i) => {
      const rotation = i*step+angle, theta = rotation*Math.PI/180, cos = Math.cos(theta);
      const entrance = clamp(i===0?(elapsed-860)/180:(distance-i)/.72);
      const arrived = 1-Math.pow(1-entrance,3);
      const x = Math.sin(theta)*r, y = cos*r*.165-(1-arrived)*innerHeight*.72+landingOffset, z = cos*r*.986-(1-arrived)*85;
      card.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${z}px) rotateY(${rotation}deg) rotateX(-9.5deg) scale(${(.88+.12*arrived)*(.5+.5*spread)})`;
      card.style.opacity = Math.min(1,entrance*3);
      card.classList.toggle('back-facing',cos < 0);
      washes[i].style.opacity = Math.max(0,(-cos+.15)*.65);
    });
    if ((entering || !reduced.matches) && visible && !document.hidden) wake();
  }
  function wake() { if (ready && !frame && visible && !document.hidden) frame = requestAnimationFrame(draw); }
  function visibility() {
    if ((!visible || document.hidden) && entering) endIntro();
    previous = 0;
    syncPlayback(); wake();
  }
  new IntersectionObserver(([entry]) => {visible=entry.isIntersecting;visibility();}).observe(stage);
  document.addEventListener('visibilitychange',visibility);
  addEventListener('scroll',() => { if (scrollY>24) endIntro(); },{passive:true});
  document.addEventListener('focusin',endIntro);
  addEventListener('pointerdown',endIntro,{once:true,passive:true});
  addEventListener('resize',() => {measure();endIntro();wake();});
  function preferences() {
    if (reduced.matches) {endIntro();reel.classList.remove('is-playing');}
    syncPlayback(); wake();
  }
  reduced.addEventListener('change',preferences);
  connection?.addEventListener('change',preferences);
  scene.addEventListener('focusin',e => {
    const card=e.target.closest('.orbit-print:focus-visible');
    if (!card) return;
    endIntro();
    keyboardCard=card;
    angle=-cards.indexOf(card)*step;
    wake();
  });
  scene.addEventListener('focusout',() => {keyboardCard=null;wake();});
  composition.addEventListener('click',e => {
    if (suppressClick && e.detail>0) e.preventDefault();
  },true);
  composition.addEventListener('pointerdown',e => {
    if (!e.isPrimary || e.button!==0 || e.target.closest('.orbit-reel,button')) return;
    suppressClick=false;
    keyboardCard=null;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,angle,active:false};
  });
  composition.addEventListener('pointermove',e => {
    if (!drag || e.pointerId!==drag.id) return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if (!drag.active) {
      if (Math.abs(dy)>7 && Math.abs(dy)>Math.abs(dx)) {suppressClick=true;drag=null;return;}
      if (Math.abs(dx)<7) return;
      suppressClick=true; drag.active=true; composition.classList.add('dragging'); composition.setPointerCapture(e.pointerId);
    }
    angle=drag.angle+dx*.21; wake();
  });
  function release() {drag=null; composition.classList.remove('dragging');}
  composition.addEventListener('pointerup',release);
  composition.addEventListener('pointercancel',release);
  composition.addEventListener('lostpointercapture',release);
  composition.addEventListener('pointerleave',() => {if (drag && !drag.active) release();});
  async function init() {
    if (entering) await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,800))]);
    measure();
    if (entering && (!root.hasAttribute('data-orbit-entering') || scrollY>24 || reduced.matches)) endIntro();
    if (entering) animateBrand();
    ready=true; startTime=performance.now(); preferences(); wake();
  }
  init().catch(() => {endIntro();root.removeAttribute('data-orbit-entering');});
})();
