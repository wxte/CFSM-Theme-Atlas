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

let mobileLoaded=false;
const mobile=matchMedia('(max-width:800px)');
const loadMobile=()=>{
 if(mobileLoaded||!mobile.matches)return;
 mobileLoaded=true;
 import('./mobile-polish.js?v=mobile-v2').catch(()=>{});
};
mobile.addEventListener?.('change',loadMobile);

function loadMotion(){
 if(!document.querySelector('link[data-atlas-motion]')){
  const link=document.createElement('link');
  link.rel='stylesheet';link.href='/assets/motion.css?v=motion-v1.1';link.dataset.atlasMotion='1';
  document.head.append(link);
 }
 import('./motion.js?v=motion-v1').catch(()=>{});
 loadMobile();
}

if(document.readyState==='complete')idle(loadMotion);
else addEventListener('load',()=>idle(loadMotion),{once:true});
