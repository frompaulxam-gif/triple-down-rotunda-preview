/* Variant D's panel crossfade and selected-button treatment, with native
   service links and a complete no-script description fallback. */
(() => {
  'use strict';
  const chapter=document.querySelector('.service-chapter');
  if(!chapter)return;
  const choices=chapter.querySelector('.service-chapter-choices');
  const buttons=[...chapter.querySelectorAll('[data-service-choice]')];
  const visuals=[...chapter.querySelectorAll('[data-service-visual]')];
  const details=[...chapter.querySelectorAll('[data-service-detail]')];
  const stage=chapter.querySelector('.service-chapter-stage');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const rotation=document.createElement('button');
  rotation.type='button';
  rotation.className='service-chapter-rotation';
  rotation.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path/></svg>';
  const rotationSymbol=rotation.querySelector('path');
  stage.append(rotation);
  let activeIndex=0,timer=0,inView=false,paused=false;
  function clearRotation(){clearTimeout(timer);timer=0;}
  function canRotate(){
    const focused=document.activeElement;
    const reading=focused!==rotation&&chapter.contains(focused)&&focused.matches(':focus-visible');
    return inView&&!paused&&!document.hidden&&!reducedMotion.matches&&!reading;
  }
  function scheduleRotation(){
    clearRotation();
    rotation.hidden=reducedMotion.matches;
    const label=paused?'Play service slideshow':'Pause service slideshow';
    rotation.setAttribute('aria-label',label);
    rotation.title=label;
    rotationSymbol.setAttribute('d',paused?'m9 5 11 7-11 7z':'M7 5h4v14H7zm6 0h4v14h-4z');
    if(canRotate())timer=setTimeout(()=>{timer=0;if(canRotate())select((activeIndex+1)%buttons.length);},5000);
  }
  function select(index,focus=false){
    activeIndex=index;
    buttons.forEach((button,i)=>{
      const active=i===index;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
      visuals[i].classList.toggle('is-active',active);
      details[i].hidden=!active;
      details[i].inert=!active;
    });
    if(focus)buttons[index].focus();
    scheduleRotation();
  }
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>select(index));
    button.addEventListener('keydown',event=>{
      const last=buttons.length-1;
      const next=event.key==='Home'?0:event.key==='End'?last:['ArrowRight','ArrowDown'].includes(event.key)?(index+1)%buttons.length:['ArrowLeft','ArrowUp'].includes(event.key)?(index+last)%buttons.length:null;
      if(next===null)return;
      event.preventDefault();select(next,true);
    });
    details[index].setAttribute('role','tabpanel');
    details[index].tabIndex=0;
  });
  rotation.addEventListener('click',()=>{paused=!paused;scheduleRotation();});
  chapter.addEventListener('focusin',scheduleRotation);
  chapter.addEventListener('focusout',()=>queueMicrotask(scheduleRotation));
  chapter.addEventListener('keydown',scheduleRotation);
  document.addEventListener('visibilitychange',scheduleRotation);
  reducedMotion.addEventListener('change',scheduleRotation);
  addEventListener('pagehide',clearRotation);
  addEventListener('pageshow',scheduleRotation);
  select(0);
  chapter.classList.add('is-enhanced');
  choices.hidden=false;
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      inView=entries[0].intersectionRatio>=.35;
      scheduleRotation();
    },{threshold:[0,.35]});
    observer.observe(stage);
  }else{
    const checkView=()=>{const rect=stage.getBoundingClientRect();inView=rect.bottom>0&&rect.top<innerHeight;scheduleRotation();};
    addEventListener('scroll',checkView,{passive:true});
    checkView();
  }
})();
