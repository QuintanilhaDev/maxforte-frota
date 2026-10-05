// Holograma 3D da Bahia (contorno simplificado) + postos clicáveis. Requer THREE (r128).
const BAHIA=[[-46.6,-12.9],[-46.0,-12.1],[-45.1,-11.0],[-44.5,-10.0],[-43.8,-9.6],[-42.9,-9.4],[-41.9,-9.2],[-41.2,-8.9],[-40.6,-8.9],[-40.4,-9.4],[-39.6,-9.0],[-38.8,-8.6],[-38.3,-9.2],[-37.9,-9.9],[-37.6,-10.6],[-37.35,-11.4],[-37.7,-12.0],[-38.2,-12.7],[-38.5,-13.0],[-38.9,-13.4],[-39.05,-14.2],[-38.95,-15.0],[-39.2,-16.0],[-39.1,-16.5],[-39.25,-17.3],[-39.2,-18.0],[-39.8,-18.3],[-40.5,-18.1],[-41.0,-17.6],[-41.3,-16.5],[-41.5,-15.4],[-42.6,-15.0],[-43.3,-14.5],[-44.0,-14.3],[-44.4,-13.6],[-45.0,-13.2],[-45.8,-13.3]];
const Holo=(()=>{
 let host,R,scene,cam,grp,pins=[],ray,mouse,yaw=0,tilt=.95,drag=null,moved=0,onPick=null,raf=0,t0=0,scan;
 const X=lon=>(lon+41.9)*.974, Z=lat=>-lat-13.2;
 function label(txt){const c=document.createElement('canvas');c.width=256;c.height=96;const g=c.getContext('2d');
  g.fillStyle='rgba(10,8,25,.85)';g.strokeStyle='#a78bfa';g.lineWidth=4;g.beginPath();g.roundRect?g.roundRect(4,8,248,80,18):g.rect(4,8,248,80);g.fill();g.stroke();
  g.fillStyle='#fff';g.font='700 38px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,128,49);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));s.scale.set(1.1,.41,1);return s}
 function init(el,pick){
  dispose();host=el;R=new THREE.WebGLRenderer({antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(R.domElement);onPick=pick;
  scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(42,1,.1,100);grp=new THREE.Group();scene.add(grp);
  const sh=new THREE.Shape();BAHIA.forEach(([lo,la],i)=>{const x=X(lo),y=la+13.2;i?sh.lineTo(x,y):sh.moveTo(x,y)});
  const geo=new THREE.ExtrudeGeometry(sh,{depth:.25,bevelEnabled:false});
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x7c3aed,transparent:true,opacity:.16,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;grp.add(mesh);
  const ed=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0xc4b5fd}));ed.rotation.x=-Math.PI/2;grp.add(ed);
  const grid=new THREE.GridHelper(16,32,0x8b5cf6,0x3b2a7a);grid.position.set(0,-.02,0);grid.material.transparent=true;grid.material.opacity=.35;grp.add(grid);
  for(let r=1;r<=3;r++){const ring=new THREE.Mesh(new THREE.RingGeometry(r*2.6,r*2.6+.02,96),new THREE.MeshBasicMaterial({color:0x8b5cf6,transparent:true,opacity:.35,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(0,-.01,0);grp.add(ring)}
  scan=new THREE.Mesh(new THREE.PlaneGeometry(10,.05),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.5}));scan.rotation.x=-Math.PI/2;scan.position.set(0,.27,0);grp.add(scan);
  ray=new THREE.Raycaster();mouse=new THREE.Vector2();
  const d=R.domElement;
  d.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};moved=0;d.setPointerCapture(e.pointerId)};
  d.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved+=Math.abs(dx)+Math.abs(dy);yaw=Math.max(-1.1,Math.min(1.1,yaw+dx*.006));tilt=Math.max(.35,Math.min(1.35,tilt+dy*.005));drag={x:e.clientX,y:e.clientY}};
  d.onpointerup=e=>{if(moved<6)pickAt(e);drag=null};
  d.onwheel=e=>{e.preventDefault();zoom=Math.max(.6,Math.min(1.6,zoom+e.deltaY*.001))};
  addEventListener('resize',size);size();t0=performance.now();loop();
 }
 let zoom=1;
 function size(){if(!R||!host)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;R.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();base=w/h<.9?19:w/h<1.4?15:12.5}
 let base=13;
 function pickAt(e){const r=R.domElement.getBoundingClientRect();mouse.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(mouse,cam);
  const hit=ray.intersectObjects(pins.map(p=>p.hit))[0];if(hit){const p=pins.find(p=>p.hit===hit.object);onPick&&onPick(p.posto)}}
 function setPostos(list,counts,selId){
  pins.forEach(p=>grp.remove(p.g));pins=[];
  list.forEach(po=>{const n=counts[po.id]||0,h=.5+Math.min(n,12)*.12,g=new THREE.Group(),on=po.id===selId;
   g.position.set(X(po.lng),.25,Z(po.lat));
   const col=on?0xffffff:0xa78bfa;
   const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,h,12),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.75}));cyl.position.y=h/2;g.add(cyl);
   const top=new THREE.Mesh(new THREE.SphereGeometry(on?.2:.14,16,16),new THREE.MeshBasicMaterial({color:col}));top.position.y=h;g.add(top);
   const base=new THREE.Mesh(new THREE.RingGeometry(.14,.2,32),new THREE.MeshBasicMaterial({color:0xc4b5fd,side:THREE.DoubleSide,transparent:true,opacity:.8}));base.rotation.x=-Math.PI/2;base.position.y=.01;base.userData.pulse=1;g.add(base);
   const hit=new THREE.Mesh(new THREE.SphereGeometry(.35),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=h*.6;g.add(hit);
   const lb=label(`#${po.numero} · ${n}`);lb.position.y=h+.45;g.add(lb);
   grp.add(g);pins.push({g,hit,posto:po,base})});
 }
 function loop(){raf=requestAnimationFrame(loop);const t=(performance.now()-t0)/1000;
  if(!drag)yaw+=(Math.sin(t*.25)*.35-yaw)*.004;
  grp.rotation.y=yaw;const d=base*zoom;cam.position.set(0,Math.sin(tilt)*d,Math.cos(tilt)*d);cam.lookAt(0,0,0);
  grp.position.set(-4.5*Math.cos(yaw)*0,0,0);
  scan.position.z=((t*.8)%10)-5;pins.forEach((p,i)=>{const s=1+((t*.9+i*.3)%1)*1.6;p.base.scale.set(s,s,1);p.base.material.opacity=.8*(1-((t*.9+i*.3)%1))});
  R.render(scene,cam)}
 function dispose(){cancelAnimationFrame(raf);removeEventListener('resize',size);if(R){R.domElement.remove();R.dispose();R=null}host=null;pins=[]}
 return {init,setPostos,dispose}
})();
