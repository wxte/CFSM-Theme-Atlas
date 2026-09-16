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
 import('./mobile-polish.js?v=0.5.25').catch(()=>{mobileLoaded=false;});
};


function loadDeferredUi(){
 loadMobile();
}

mobile.addEventListener?.('change',loadDeferredUi);

if(document.readyState==='complete')idle(loadDeferredUi);
else addEventListener('load',()=>idle(loadDeferredUi),{once:true});
