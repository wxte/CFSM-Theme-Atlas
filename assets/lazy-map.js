export class DeferredNodeMap{
 constructor(onRegion){this.onRegion=onRegion;this._active=true;this._mode='auto';this.impl=null;this.promise=null;this.lastUpdate=null;this.lastFocus='';}
 get active(){return this._active} set active(v){this._active=!!v;if(this.impl)this.impl.active=this._active;}
 get mode(){return this._mode} set mode(v){this._mode=v||'auto';if(this.impl)this.impl.mode=this._mode;}
 load(){
  if(this.impl)return Promise.resolve(this.impl);
  if(!this.promise)this.promise=import('./globe.js?v=0.4.1').then(({NodeMap})=>{const m=new NodeMap(this.onRegion);m.active=this._active;m.mode=this._mode;this.impl=m;if(this.lastUpdate)m.update(...this.lastUpdate);if(this.lastFocus)m.focus(this.lastFocus);return m;});
  return this.promise;
 }
 update(...args){this.lastUpdate=args;if(this.impl)this.impl.update(...args);}
 focus(code){this.lastFocus=code||'';if(this.impl)this.impl.focus(code);}
 clearTip(){if(this.impl)this.impl.clearTip();}
 requestDraw(){if(this.impl)this.impl.requestDraw();}
 init(){return this.load().then(m=>m.init());}
}
