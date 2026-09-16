// Horizontal sampling gestures retain native vertical page scrolling.
export function bindSampleDrag(element,select){
 let pointer=null,rect=null;
 element.addEventListener('pointerdown',event=>{
  if(event.isPrimary===false||event.button>0)return;
  pointer=event.pointerId;rect=element.getBoundingClientRect();
  element.focus?.({preventScroll:true});
  element.setPointerCapture?.(pointer);
  if(rect.width>0)select(event.clientX,rect);
 });
 element.addEventListener('pointermove',event=>{
  if(event.pointerId===pointer&&rect?.width>0)select(event.clientX,rect);
 });
 const end=event=>{if(event.pointerId!==pointer)return;pointer=null;rect=null;};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,end);
}
