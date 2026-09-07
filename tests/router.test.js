import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewRouter,pageFromHash} from '../assets/router.js';
function setup(hash='#overview'){
 const listeners=new Map(),links=['#overview','#nodes','#network'].map(href=>({getAttribute:()=>href,addEventListener(type,fn){this.click=fn;}}));
 const location={hash};const entries=[];let index=-1;const views=[];
 const env={location,scrollY:0,scrollTo({top}){this.scrollY=top;},addEventListener(type,fn){listeners.set(type,fn);}};
 env.history={state:null,replaceState(state,title,hash){location.hash=hash;this.state=state;if(index<0)index=0;entries[index]={state,hash};},pushState(state,title,hash){entries.splice(index+1);entries.push({state,hash});index++;this.state=state;location.hash=hash;},go(delta){index+=delta;const entry=entries[index];this.state=entry.state;location.hash=entry.hash;listeners.get('popstate')({state:entry.state});}};
 const router=new ViewRouter(page=>views.push(page),env,{querySelectorAll:()=>links});return {env,router,links,views,entries};
}
test('deep links render one chosen view and invalid routes safely default',()=>{assert.equal(pageFromHash('#network'),'network');assert.equal(pageFromHash('#unknown'),'overview');const {env,views}=setup('#resources');assert.deepEqual(views,['resources']);assert.equal(env.location.hash,'#resources');assert.equal(env.scrollY,0);});
test('view changes prevent anchor scrolling and history restores each entry position',()=>{const {env,router,links,views,entries}=setup();env.scrollY=500;let prevented=false;links[2].click({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(env.location.hash,'#network');assert.equal(env.scrollY,0);env.scrollY=90;env.history.go(-1);assert.equal(views.at(-1),'overview');assert.equal(env.scrollY,500);env.history.go(1);assert.equal(views.at(-1),'network');assert.equal(env.scrollY,90);router.navigate('network');assert.equal(entries.length,2);});
test('modified clicks preserve browser new-tab behavior',()=>{const {links,entries}=setup();links[2].click({ctrlKey:true,preventDefault(){throw Error('Modified click intercepted');}});assert.equal(entries.length,1);});
