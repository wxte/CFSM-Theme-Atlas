import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=process.cwd();
const abs=p=>path.join(root,p);
const read=p=>fs.readFileSync(abs(p),'utf8');
const write=(p,s)=>fs.writeFileSync(abs(p),s);
const requireFile=p=>{if(!fs.existsSync(abs(p)))throw new Error(`缺少 ${p}，请在 cfsm-line-grid 仓库根目录运行。`);};
for(const p of ['index.html','assets/app.js','assets/style.css','package.json'])requireFile(p);

fs.copyFileSync(path.join(here,'enhancements.js'),abs('assets/enhancements.js'));
fs.copyFileSync(path.join(here,'enhancements.css'),abs('assets/enhancements.css'));

// Fix the v0.2.9 region-clear bug and keep cache-busting versions consistent in every runtime module.
let app=read('assets/app.js');
if(app.includes("$('#clear-region').hidden=true;"))app=app.replace("$('#clear-region').hidden=true;","$('#clear-region').hidden=!state.selected;");
else if(!app.includes("$('#clear-region').hidden=!state.selected;"))throw new Error('未识别当前 app.js 的地区筛选代码，停止以避免误改。');
write('assets/app.js',app);

for(const name of fs.readdirSync(abs('assets'))){
 if(!name.endsWith('.js'))continue;
 const p=`assets/${name}`;let text=read(p);const next=text.replaceAll('?v=0.2.9','?v=0.3.0');if(next!==text)write(p,next);
}

let html=read('index.html').replaceAll('v0.2.9','v0.3.0').replaceAll('?v=0.2.9','?v=0.3.0');
if(!html.includes('/assets/enhancements.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/enhancements.css?v=0.3.0"></head>');
if(!html.includes('/assets/enhancements.js'))html=html.replace('</body>','<script type="module" src="/assets/enhancements.js?v=0.3.0"></script></body>');
write('index.html',html);

const pkg=JSON.parse(read('package.json'));pkg.version='0.3.0';
if(typeof pkg.scripts?.check==='string'&&!pkg.scripts.check.includes('enhancements.js'))pkg.scripts.check+=' && node --check assets/enhancements.js';
write('package.json',JSON.stringify(pkg,null,2)+'\n');

if(fs.existsSync(abs('README.md'))){
 let md=read('README.md');
 if(!md.includes('## v0.3.0')){
  const notes=`## v0.3.0\n\n- 新增 ⌘K / Ctrl+K 命令面板：搜索节点、跳转页面、刷新、切换主题/动态效果以及常用筛选。\n- 节点详情改为桌面右侧 Drawer / 手机底部抽屉，数据随实时节点 DOM 更新；支持复制详情与直接跳转该节点网络分析。\n- 新增当前会话 Toast：离线、异常、恢复和连接变化；同一消息短时间去重。\n- “更新于 HH:MM:SS”改为相对时间，并保留精确时间 tooltip。\n- 修复地区筛选后“清除地区筛选”按钮始终隐藏的问题；统一运行时模块缓存版本为 v0.3.0。\n- 保持原生 JS/CSS，无新增第三方运行依赖。\n\n`;
  md=md.replace('# WXT Atlas\n\n','# WXT Atlas\n\n'+notes);
 }
 md=md.replaceAll('WXT Atlas v0.2.9','WXT Atlas v0.3.0');
 write('README.md',md);
}

console.log('WXT Atlas v0.3.0 增强层已应用。');
console.log('建议继续运行：node verify-v0.3.0.mjs && npm test && npm run check');
