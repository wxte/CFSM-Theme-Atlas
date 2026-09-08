import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const fail=msg=>{console.error('✗ '+msg);process.exitCode=1;};
const ok=msg=>console.log('✓ '+msg);
for(const p of ['index.html','package.json','assets/app.js','assets/enhancements.js','assets/enhancements.css']){
 if(!fs.existsSync(p))fail(`缺少 ${p}`);else ok(`存在 ${p}`);
}
if(process.exitCode)process.exit();
const html=read('index.html'),app=read('assets/app.js'),pkg=JSON.parse(read('package.json'));
html.includes('theme-version" content="WXT Atlas v0.3.0"')?ok('HTML 版本为 v0.3.0'):fail('HTML theme-version 不是 v0.3.0');
html.includes('/assets/enhancements.js?v=0.3.0')?ok('增强脚本已挂载'):fail('index.html 未挂载增强脚本');
html.includes('/assets/enhancements.css?v=0.3.0')?ok('增强样式已挂载'):fail('index.html 未挂载增强样式');
app.includes("$('#clear-region').hidden=!state.selected;")?ok('地区清除按钮 Bug 已修复'):fail('地区清除按钮修复不存在');
pkg.version==='0.3.0'?ok('package.json 版本正确'):fail(`package.json 版本为 ${pkg.version}`);
let stale=[];for(const name of fs.readdirSync('assets'))if(name.endsWith('.js')&&read('assets/'+name).includes('?v=0.2.9'))stale.push(name);
stale.length?fail('仍有旧缓存版本引用：'+stale.join(', ')):ok('运行时 JS 无 ?v=0.2.9 残留');
for(const name of fs.readdirSync('assets').filter(n=>n.endsWith('.js')&&!n.startsWith('vendor'))){const r=spawnSync(process.execPath,['--check','assets/'+name],{encoding:'utf8'});if(r.status===0)ok('语法通过 assets/'+name);else fail('语法失败 assets/'+name+'\n'+r.stderr);}
if(!process.exitCode)console.log('\n静态验证通过。再运行 npm test && npm run check 即可。');
