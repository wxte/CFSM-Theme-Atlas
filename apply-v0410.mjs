import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const self=fileURLToPath(import.meta.url);
const root=path.dirname(self);
process.chdir(root);

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
const exists=p=>fs.existsSync(p);
const die=m=>{throw new Error(m)};

const tracked=[
  'assets/app.js',
  'index.html',
  'package.json',
  'tests/fonts.test.js',
  'README.md'
].filter(exists);
const original=new Map(tracked.map(p=>[p,fs.readFileSync(p)]));
const restore=()=>{for(const [p,b] of original)fs.writeFileSync(p,b)};

function run(command){
  const r=process.platform==='win32'
    ?spawnSync('cmd.exe',['/d','/s','/c',command],{stdio:'inherit'})
    :spawnSync('sh',['-lc',command],{stdio:'inherit'});
  if(r.error)throw r.error;
  if(r.status!==0)die(`${command} failed with exit code ${r.status}`);
}

try{
  console.log('[1/6] Verify Atlas v0.4.9 baseline...');
  const pkg=JSON.parse(read('package.json'));
  if(pkg.version!=='0.4.9')die(`Expected package version 0.4.9, got ${pkg.version}`);

  let app=read('assets/app.js');
  let index=read('index.html');

  if(!app.includes("document.title='Atlas · Cloudflare Server Monitor';"))
    die('Expected v0.4.9 hardcoded document title was not found');
  if(!app.includes("const title=config.site_title||'CFSM';"))
    die('Expected v0.4.9 /api/config title handler was not found');
  if(!index.includes('id="brand-logo"'))
    die('Expected v0.4.9 brand logo hook was not found');

  console.log('[2/6] Respect CFSM-injected title and favicon...');
  app=app.replace(
    "document.title='Atlas · Cloudflare Server Monitor';",
    "const injectedSiteTitle=document.title||'CF-Server-Monitor';"
  );

  const oldConfig="json('/api/config').then(config=>{state.config=config||{};const title=config.site_title||'CFSM';set($('#site-title'),title);document.title=title+' · Atlas';if(state.ready)renderAggregates();}).catch(()=>{});";
  const newConfig=`json('/api/config').then(config=>{
 state.config=config||{};
 const title=String(config.site_title||injectedSiteTitle||'CF-Server-Monitor').trim();
 set($('#site-title'),title);
 document.title=title;
 const preferred=String(config.preferred_theme||'auto').toLowerCase();
 let hasLocalAppearance=false;
 try{hasLocalAppearance=Boolean(JSON.parse(localStorage.getItem('wxt-atlas-settings')||'{}').appearance);}catch{}
 if(!hasLocalAppearance){
   settings.appearance=preferred==='dark'?'dark':preferred==='light'?'light':'system';
   applySettings();
 }
 const backend=$('#backend-version'),version=String(config.version||'').trim();
 if(backend)set(backend,version?'Powered by CF-Server-Monitor '+version:'Powered by CF-Server-Monitor');
 if(state.ready)renderAggregates();
}).catch(()=>{
 set($('#site-title'),injectedSiteTitle);
 document.title=injectedSiteTitle;
});`;

  if(!app.includes(oldConfig))die('Could not patch /api/config handler');
  app=app.replace(oldConfig,newConfig);

  console.log('[3/6] Align browser chrome with the ThreeUI palette...');
  app=app.replace(
    "document.querySelector('meta[name=\"theme-color\"]').content=theme==='dark'?'#15191d':'#ffffff';",
    "document.querySelector('meta[name=\"theme-color\"]').content=theme==='dark'?'#050608':'#ececeb';"
  );

  console.log('[4/6] Add official CFSM attribution and backend version...');
  const oldFooter=/<footer><span>Atlas <b>v0\.4\.9<\/b> · Cloudflare Server Monitor<\/span><span id="footer-status">原生实时监控<\/span><span id="location-note">地球点位为地区中心示意<\/span><\/footer>/;
  const newFooter='<footer><span>Atlas <b>v0.4.10</b></span><a id="backend-version" href="https://github.com/huilang-me/CF-Server-Monitor/" target="_blank" rel="noopener">Powered by CF-Server-Monitor</a><span id="footer-status">原生实时监控</span><span id="location-note">地球点位为地区中心示意</span></footer>';
  if(!oldFooter.test(index))die('Expected v0.4.9 footer was not found');
  index=index.replace(oldFooter,newFooter);

  console.log('[5/6] Bump v0.4.10 cache keys...');
  index=index.replaceAll('v0.4.9','v0.4.10');
  app=app.replaceAll('?v=0.4.9','?v=0.4.10');
  pkg.version='0.4.10';

  write('assets/app.js',app);
  write('index.html',index);
  write('package.json',JSON.stringify(pkg,null,2)+'\n');

  if(exists('tests/fonts.test.js')){
    write('tests/fonts.test.js',read('tests/fonts.test.js').replaceAll('v0.4.9','v0.4.10'));
  }
  if(exists('README.md')){
    write('README.md',read('README.md').replace(/当前版本：v0\.4\.\d+/,'当前版本：v0.4.10'));
  }

  const finalIndex=read('index.html');
  const finalApp=read('assets/app.js');

  if((finalIndex.match(/id="site-title"/g)||[]).length!==1)die('site-title must exist exactly once');
  if((finalIndex.match(/id="backend-version"/g)||[]).length!==1)die('backend-version must exist exactly once');
  if(!finalApp.includes("config.site_title||injectedSiteTitle"))die('CFSM site_title binding missing');
  if(!finalApp.includes("config.preferred_theme||'auto'"))die('preferred_theme binding missing');
  if(finalApp.includes("title+' · Atlas'"))die('Atlas is still overriding the backend site title');
  if(!finalIndex.includes('/assets/app.js?v=0.4.10'))die('app.js cache key mismatch');
  if(!finalIndex.includes('/assets/atlas.css?v=0.4.10'))die('atlas.css cache key mismatch');

  console.log('[6/6] Run regression checks...');
  run('npm.cmd run check');
  run('npm.cmd test');

  console.log('');
  console.log('Atlas v0.4.10 backend integration completed successfully.');
  console.log('site_title -> Atlas header badge + document title');
  console.log('favicon -> backend-injected <link rel="icon"> -> Atlas brand icon');
  console.log('preferred_theme -> first-visit default; local Atlas choice still wins');
  console.log('version -> Powered by CF-Server-Monitor footer');
  console.log('Runtime stylesheet count remains 1.');

  fs.rmSync(self,{force:true});
}catch(error){
  console.error('');
  console.error('v0.4.10 validation failed. Restoring v0.4.9 files...');
  restore();
  throw error;
}
