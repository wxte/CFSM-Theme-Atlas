export function flag(code){
 const rect=(y,h,fill)=>`<rect y="${y}" width="30" height="${h}" fill="${fill}"/>`;
 let body='';
 if(code==='DE')body=rect(0,20,'#111')+rect(6.67,6.67,'#da3039')+rect(13.34,6.66,'#f4ca4a');
 if(code==='US'){body=rect(0,20,'white');for(let i=0;i<13;i+=2)body+=rect(i*20/13,20/13,'#cc3b47');body+='<rect width="13" height="10.8" fill="#345178"/>';for(let y=2;y<10;y+=2)for(let x=2;x<12;x+=2)body+=`<circle cx="${x}" cy="${y}" r=".45" fill="white"/>`;}
 if(code==='GB')body=rect(0,20,'#304b79')+'<path d="M0 0L30 20M30 0L0 20" stroke="white" stroke-width="5"/><path d="M0 0L30 20M30 0L0 20" stroke="#c43f49" stroke-width="2"/><path d="M15 0V20M0 10H30" stroke="white" stroke-width="7"/><path d="M15 0V20M0 10H30" stroke="#c43f49" stroke-width="4"/>';
 if(code==='SG')body=rect(0,20,'white')+rect(0,10,'#d8404e')+'<circle cx="7" cy="5" r="3.5" fill="white"/><circle cx="8.5" cy="4.5" r="3" fill="#d8404e"/><g fill="white"><circle cx="12" cy="2.5" r=".65"/><circle cx="15" cy="4" r=".65"/><circle cx="14" cy="7" r=".65"/><circle cx="11" cy="7" r=".65"/><circle cx="10" cy="4" r=".65"/></g>';
 if(code==='HK'){body=rect(0,20,'#d63849');for(let i=0;i<5;i++)body+=`<path d="M15 10C10 8 13 3 16 5C18 6 15 7 15 10" fill="white" transform="rotate(${i*72} 15 10)"/>`;}
 if(code==='JP')body=rect(0,20,'white')+'<circle cx="15" cy="10" r="5" fill="#bd3041"/>';
 if(!body)return /^[A-Z]{2}$/.test(code)?code:'—';
 return `<svg viewBox="0 0 30 20" aria-hidden="true">${body}</svg>`;
}
