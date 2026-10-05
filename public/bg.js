// Fundo: grade de quadrados em diagonal (isométrica) que se eleva conforme o mouse/toque.
(()=>{const c=document.getElementById('bg'),x=c.getContext('2d');let W,H,mx=-999,my=-999,tx=-999,ty=-999,t=0;
const S=46;
function rs(){const d=Math.min(devicePixelRatio||1,2);W=c.width=innerWidth*d;H=c.height=innerHeight*d;x.setTransform(d,0,0,d,0,0);W/=d;H/=d}
addEventListener('resize',rs);rs();
addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY});
addEventListener('pointerleave',()=>{tx=ty=-999});
function frame(){t+=.012;mx+=(tx-mx)*.12;my+=(ty-my)*.12;
 x.clearRect(0,0,W,H);const g=x.createRadialGradient(W/2,H*.4,0,W/2,H*.4,Math.max(W,H)*.8);g.addColorStop(0,'#14102a');g.addColorStop(1,'#050508');x.fillStyle=g;x.fillRect(0,0,W,H);
 const n=Math.ceil((W+H)/S)+4;
 for(let i=-n;i<n;i++)for(let j=-n;j<n;j++){
  const px=W/2+(i-j)*S*.5,py=H*.42+(i+j)*S*.25;
  if(px<-S||px>W+S||py<-S||py>H+S*2)continue;
  const d=Math.hypot(px-mx,py-my),k=Math.max(0,1-d/230),wave=Math.sin(t+i*.35+j*.35)*2;
  const h=3+wave+k*k*34,a=.1+k*.7;
  const hw=S*.5,hh=S*.25,y=py-h;
  x.fillStyle=`rgba(139,92,246,${a*.55})`;x.beginPath();x.moveTo(px,y-hh);x.lineTo(px+hw,y);x.lineTo(px,y+hh);x.lineTo(px-hw,y);x.closePath();x.fill();
  x.fillStyle=`rgba(40,20,90,${.5+k*.3})`;x.beginPath();x.moveTo(px-hw,y);x.lineTo(px,y+hh);x.lineTo(px,py+hh);x.lineTo(px-hw,py);x.closePath();x.fill();
  x.fillStyle=`rgba(20,10,50,${.6+k*.3})`;x.beginPath();x.moveTo(px+hw,y);x.lineTo(px,y+hh);x.lineTo(px,py+hh);x.lineTo(px+hw,py);x.closePath();x.fill();
  x.strokeStyle=`rgba(200,180,255,${.08+k*.6})`;x.lineWidth=1;x.beginPath();x.moveTo(px,y-hh);x.lineTo(px+hw,y);x.lineTo(px,y+hh);x.lineTo(px-hw,y);x.closePath();x.stroke();
 }
 requestAnimationFrame(frame)}
frame()})();
