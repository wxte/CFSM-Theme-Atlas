import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const dir of ['assets','tools'])for(const file of fs.readdirSync(dir))if(/\.(m?js)$/.test(file))execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
console.log('All runtime and tool JavaScript syntax checks passed.');
