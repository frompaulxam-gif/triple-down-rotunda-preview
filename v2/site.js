(() => {
  'use strict';
  const config=JSON.parse(document.querySelector('#site-config')?.textContent||'{}');
  const menu=document.querySelector('#site-menu'),toggle=document.querySelector('.menu-toggle');
  function closeMenu(){if(menu?.open)menu.close();}
  toggle?.addEventListener('click',()=>{if(menu.open)closeMenu();else menu.showModal();toggle.setAttribute('aria-expanded',String(menu.open));});
  menu?.querySelector('.close-menu')?.addEventListener('click',closeMenu);
  menu?.addEventListener('close',()=>{toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});});
  menu?.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeMenu();}});
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  const homePath=new URL(config.home||'./',location.href).pathname;
  document.querySelectorAll('[data-home-link]').forEach(a=>a.addEventListener('click',()=>{try{sessionStorage.setItem(homePath+':return','logo');}catch{}}));
  const form=document.querySelector('.enquiry-form');
  if(form){
    const errors=document.querySelector('#form-errors'),status=form.querySelector('.form-status'),button=form.querySelector('button[type="submit"]');
    const endpoint=form.dataset.endpoint;
    let nonce=null,busy=false,completed=false;
    const retryableCodes=new Set(['content_type','body_too_large','invalid_json','invalid_fields','nonce_invalid','nonce_expired','rate_limited','not_configured','origin_denied','https_required','not_found','method_not_allowed','preflight_denied']);
    async function requestJson(url,options,timeoutMs){
      const controller=new AbortController();let timer;
      try{return await Promise.race([
        (async()=>{const response=await fetch(url,{...options,signal:controller.signal});return {response,result:await response.json()};})(),
        new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('request timeout'));},timeoutMs);})
      ]);}finally{clearTimeout(timer);}
    }
    async function fetchNonce(){
      if(!endpoint)return;
      const {response,result}=await requestJson(new URL('/nonce',endpoint),{mode:'cors',credentials:'omit',cache:'no-store'},10000);
      if(!response.ok||result?.ok!==true||!/^\d{13}\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(result.nonce))throw new Error('nonce');
      nonce=result.nonce;
    }
    function showErrors(fields,message){
      form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
      form.querySelectorAll('.field-error').forEach(el=>el.textContent='');
      const entries=Object.entries(fields);
      errors.replaceChildren();const lead=document.createElement('p');lead.textContent=message||'Please check the highlighted fields.';errors.append(lead);
      if(entries.length){const list=document.createElement('ul');for(const [name,text] of entries){const input=form.elements.namedItem(name),target=document.querySelector('#'+name+'-error');if(input instanceof HTMLElement)input.setAttribute('aria-invalid','true');if(target)target.textContent=text;const item=document.createElement('li'),link=document.createElement('a');link.href='#'+name;link.textContent=text;link.addEventListener('click',e=>{e.preventDefault();input?.focus();});item.append(link);list.append(item);}errors.append(list);}
      errors.hidden=false;errors.focus();
    }
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(busy||completed||button.disabled)return;
      status.textContent='';const data=new FormData(form),fields={};const name=String(data.get('name')||'').trim(),email=String(data.get('email')||'').trim(),message=String(data.get('message')||'').trim();
      if(!name)fields.name='Please enter your name.';
      if(!email)fields.email='Please enter your email address.';else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fields.email='Please check your email address.';
      if(!message)fields.message='Please tell us a little about the project.';
      if(Object.keys(fields).length){showErrors(fields);return;}
      if(!endpoint){showErrors({},`Online form delivery is not connected. Please email ${config.email}.`);return;}
      busy=true;button.disabled=true;button.textContent='Sending...';errors.hidden=true;
      let attempted=false,uncertain=false,attemptId='';
      try{
        await fetchNonce();
        attemptId=String(nonce).split('.')[1]||'';
        const payload={name,email,message,business:String(data.get('business')||'').trim(),profile:String(data.get('profile')||'').trim(),services:data.getAll('services'),timing:String(data.get('timing')||'').trim(),budget:String(data.get('budget')||'').trim(),website:String(data.get('website_confirm')||''),nonce};
        attempted=true;
        const {response,result}=await requestJson(new URL('/enquiry',endpoint),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(payload)},30000);
        if(!response.ok||result?.ok!==true||result.id!==attemptId){
          if(result?.ok===false&&retryableCodes.has(result.error)){attempted=false;if(result.fields)showErrors(result.fields);else showErrors({},result.message||`Your enquiry hasn't been sent. Please try again, or email us at ${config.email}.`);return;}
          uncertain=true;showErrors({},`We could not confirm delivery. Please email ${config.email} and mention that you tried the form. Reference: ${attemptId}. Avoid resending until the result is checked.`);return;
        }
        completed=true;
        let receiptSaved=false;try{sessionStorage.setItem('tdg-enquiry-receipt',JSON.stringify({id:result.id,time:Date.now()}));receiptSaved=true;}catch{}
        const received="Thanks for getting in touch. We've received your enquiry. We'll review the details and get back to you to discuss the next step.";
        if(receiptSaved){try{location.assign(config.thanks);}catch{status.textContent=received;}}
        else status.textContent=received;
      }catch{uncertain=attempted;showErrors({},uncertain?`We could not confirm delivery. Please email ${config.email} and mention that you tried the form. Reference: ${attemptId}. Avoid resending until the result is checked.`:`Your enquiry hasn't been sent. Please try again, or email us at ${config.email}.`);nonce=null;}
      finally{busy=false;button.disabled=uncertain||completed;button.textContent=completed?'Enquiry sent':uncertain?'Check delivery before retrying':'Send enquiry';}
    });
    // The static form stays non-submittable if this controller cannot load.
    button.disabled=!endpoint;
  }
  const thanks=document.querySelector('#thanks-heading');
  if(thanks){try{const receipt=JSON.parse(sessionStorage.getItem('tdg-enquiry-receipt')||'null');if(receipt?.id&&Date.now()-receipt.time<30*60*1000){thanks.textContent='Thanks for getting in touch.';document.querySelector('#thanks-status').textContent="We've received your enquiry. We'll review the details and get back to you to discuss the next step.";}}catch{}}
})();
