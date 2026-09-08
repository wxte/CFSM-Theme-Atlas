export const pages={overview:'概览',nodes:'节点',network:'网络',resources:'概览',activity:'活动'};
export function pageFromHash(hash){const key=String(hash||'').replace(/^#/,'');return Object.hasOwn(pages,key)?key:'overview';}

// Hash URLs remain compatible with CFSM; navigation never invokes anchor scrolling.
export class ViewRouter{
 constructor(render,environment=globalThis,root=document){
  this.env=environment;this.render=render;this.positions=new Map();this.key=0;this.page=pageFromHash(environment.location.hash);
  environment.history.scrollRestoration='manual';
  environment.history.replaceState({...environment.history.state,atlasKey:0},'','#'+this.page);
  this.apply(this.page,0,false);
  // The browser may apply its initial fragment scroll after module initialization.
  environment.addEventListener('load',()=>{environment.requestAnimationFrame?.(()=>{if(this.key===0)environment.scrollTo({top:0,behavior:'instant'});});},{once:true});
  for(const link of root.querySelectorAll('a[href^="#"]'))link.addEventListener('click',event=>{
   if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const hash=link.getAttribute('href');if(!Object.hasOwn(pages,hash.slice(1)))return;
   event.preventDefault();this.navigate(pageFromHash(hash));
   if(link.classList?.contains('skip'))root.querySelector('#nodes-heading')?.focus({preventScroll:true});
  });
  environment.addEventListener('popstate',event=>{
   this.remember();this.key=event.state?.atlasKey??++this.sequence;
   this.apply(pageFromHash(environment.location.hash),this.positions.get(this.key)||0,true);
  });
  environment.addEventListener('hashchange',()=>{
   const page=pageFromHash(environment.location.hash);if(page===this.page)return;
   this.remember();this.key=++this.sequence;
   environment.history.replaceState({...environment.history.state,atlasKey:this.key},'','#'+page);
   this.apply(page,0,true);
  });
  this.sequence=0;
 }
 remember(){this.positions.set(this.key,this.env.scrollY||0);}
 navigate(page){
  if(page===this.page)return;
  this.remember();this.key=++this.sequence;
  this.env.history.pushState({atlasKey:this.key},'','#'+page);
  this.apply(page,0,true);
 }
 apply(page,top,animate){this.page=page;this.render(page,animate);this.env.scrollTo({top,behavior:'instant'});}
}
