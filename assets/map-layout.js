// Place visible labels without covering one another or crossing the map edges.
export function placeLabel(x,y,w,h,width,height,occupied){
  if(width<w+8||height<h+8)return null;
  x=Math.max(w/2+4,Math.min(width-w/2-4,x));
  for(let step=0;step<Math.ceil(height/(h+4));step++){
    for(const sign of step?[1,-1]:[1]){
      const cy=y+step*(h+4)*sign;
      const box={x:x-w/2,y:cy-h/2,w,h};
      if(box.y<4||box.y+h>height-4)continue;
      if(occupied.some(b=>box.x<b.x+b.w+4&&box.x+w+4>b.x&&box.y<b.y+b.h+4&&box.y+h+4>b.y))continue;
      occupied.push(box);return {x,y:cy};
    }
  }
  return null;
}
