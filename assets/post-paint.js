const idle=callback=>{
 if('requestIdleCallback' in window)return requestIdleCallback(callback,{timeout:1600});
 return setTimeout(callback,280);
};

function syncTitle(){
 const site=document.querySelector('#site-title')?.textContent.trim();
 const next=!site?'Atlas':/^Atlas(?:\s|$|·)/i.test(site)?site:`Atlas · ${site}`;
 if(document.title!==next)document.title=next;
}

const siteTitle=document.querySelector('#site-title');
if(siteTitle)new MutationObserver(syncTitle).observe(siteTitle,{childList:true,characterData:true,subtree:true});
syncTitle();

let mobileLoaded=false,motionLoaded=false;
const mobile=matchMedia('(max-width:800px)');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

const loadMobile=()=>{
 if(mobileLoaded||!mobile.matches)return;
 mobileLoaded=true;
 import('./mobile-polish.js?v=0.5.24').catch(()=>{});
};

const loadDesktopMotion=()=>{
 if(motionLoaded||mobile.matches||reduced.matches)return;
 motionLoaded=true;
 if(!document.querySelector('link[data-atlas-motion]')){
  const link=document.createElement('link');
  link.rel='stylesheet';link.href='/assets/motion.css?v=0.5.24';link.dataset.atlasMotion='1';
  document.head.append(link);
 }
 import('./motion.js?v=0.5.24').catch(()=>{});
};

function loadDeferredUi(){
 loadMobile();
 loadDesktopMotion();
}

mobile.addEventListener?.('change',loadDeferredUi);
reduced.addEventListener?.('change',loadDesktopMotion);

if(document.readyState==='complete')idle(loadDeferredUi);
else addEventListener('load',()=>idle(loadDeferredUi),{once:true});
