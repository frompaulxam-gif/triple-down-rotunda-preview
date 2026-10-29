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
  function select(index,focus=false){
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
  select(0);
  chapter.classList.add('is-enhanced');
  choices.hidden=false;
})();
