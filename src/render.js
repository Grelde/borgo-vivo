(function(){
'use strict';
const {N,CS,W,BT,PATH,S,SC}=Sim;
const NOGATE={house:1,stall:1,flowers:1,statue:1,plaza:1,well:1,cemetery:1};
const {tree,rock,ore,water,sap,road,dist,occ,wear,plev,field,door,attr}=Sim.grids;
let attrOn=false,capNow=80,capStoneNow=80;
const COARSE=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
if(COARSE)document.body.classList.add('touch');
const $=id=>document.getElementById(id);
const cv=$('cv');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});}
catch(e){const d=document.createElement('div');d.id='nogl';d.className='panel';d.textContent='Il tuo browser non supporta WebGL: il gioco 3D non può partire.';$('app').appendChild(d);return;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,COARSE?1.5:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const SKY=0xbcd0de;
const scene=new THREE.Scene();scene.background=new THREE.Color(SKY);scene.fog=new THREE.Fog(SKY,170,420);
const camera=new THREE.PerspectiveCamera(46,1,1,800);
const hemi=new THREE.HemisphereLight(0xdfeaff,0x6f5d3d,0.85);scene.add(hemi);
const NIGHT=new THREE.Color(0x1a2338),DAYC=new THREE.Color(SKY),skyC=new THREE.Color();
const sun=new THREE.DirectionalLight(0xfff1d2,0.85);sun.position.set(-50,90,35);sun.castShadow=true;
sun.shadow.mapSize.set(COARSE?1024:2048,COARSE?1024:2048);const sc=sun.shadow.camera;sc.left=-82;sc.right=82;sc.top=82;sc.bottom=-82;sc.near=10;sc.far=260;sun.shadow.bias=-0.0006;scene.add(sun);

// ---------- neve ----------
const SNOWN=700,snowP=new Float32Array(SNOWN*3);
for(let i=0;i<SNOWN;i++){snowP[i*3]=(Math.random()-.5)*130;snowP[i*3+1]=Math.random()*55;snowP[i*3+2]=(Math.random()-.5)*130;}
const snowG=new THREE.BufferGeometry();snowG.setAttribute('position',new THREE.BufferAttribute(snowP,3));
const snow=new THREE.Points(snowG,new THREE.PointsMaterial({color:0xffffff,size:.45,transparent:true,opacity:.9}));snow.frustumCulled=false;snow.visible=false;scene.add(snow);
// ---------- terreno ----------
const TEX=2048,PX=TEX/N,TK2=TEX/1024;
const base=document.createElement('canvas');base.width=base.height=TEX;
(function(){
  const g=base.getContext('2d');g.fillStyle='#6f8f45';g.fillRect(0,0,TEX,TEX);
  let s=12345;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  for(let k=0;k<2400;k++){g.fillStyle=r()<.5?`rgba(150,176,84,${.05+r()*.07})`:`rgba(52,84,38,${.05+r()*.08})`;g.beginPath();g.arc(r()*TEX,r()*TEX,(14+r()*46)*TK2,0,7);g.fill();}
  for(let k=0;k<14000;k++){g.fillStyle=r()<.5?'rgba(190,210,120,.25)':'rgba(40,70,30,.25)';g.fillRect(r()*TEX,r()*TEX,2*TK2,3*TK2);}
})();
const gc=document.createElement('canvas');gc.width=gc.height=TEX;const g=gc.getContext('2d');
// strato di lavoro per i sentieri: ogni livello si disegna opaco qui e poi si sovrappone al terreno con la sua trasparenza, così gli incroci non si scuriscono
const plc=document.createElement('canvas');plc.width=plc.height=TEX;const pg=plc.getContext('2d');
const gtex=new THREE.CanvasTexture(gc);gtex.anisotropy=8;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(W,W),new THREE.MeshLambertMaterial({map:gtex}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const outer=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshLambertMaterial({color:0x56743a}));
outer.rotation.x=-Math.PI/2;outer.position.y=-0.04;scene.add(outer);
let groundDirty=true,lastGround=0;
const SKYS=[0xbcd0de,0xa9cde8,0xd2c4a8,0xcfd8e0],OUTS=[0x56743a,0x66833a,0x7d6a35,0xdfe7ec];
const DFILL=[null,'rgba(222,176,70,0.20)','rgba(150,196,70,0.22)','rgba(214,106,58,0.24)','rgba(40,120,70,0.28)','rgba(236,232,214,0.34)'];
const DLINE=[null,'rgba(240,200,100,0.95)','rgba(170,220,90,0.95)','rgba(238,130,80,0.95)','rgba(90,190,120,0.95)','rgba(246,244,230,0.98)'];
// livelli dei sentieri: 1-3 il terreno si scolorisce verso il giallino, 4 è il sentiero vero (terra battuta)
const PLC=[null,'rgb(176,192,100)','rgb(196,188,92)','rgb(208,178,96)','rgb(122,92,56)'],PLA=[0,0.40,0.58,0.76,0.9],PLW=[0,0.55,0.65,0.75,0.82];
let zonesOn=true;
// v36.1: al posto delle bandiere, icone esplicative sempre rivolte alla camera (arco e freccia = caccia, pesce = pesca)
function zoneIconTex(kind){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle=kind===1?'#e0701c':'#2f86d6';x.strokeStyle='#fff';x.lineWidth=5;
  x.beginPath();x.arc(64,64,58,0,7);x.fill();x.stroke();
  x.fillStyle='#fff';x.lineCap='round';x.lineJoin='round';
  if(kind===1){
    x.lineWidth=7;x.beginPath();x.arc(46,64,38,-1.15,1.15);x.stroke();
    x.lineWidth=3;x.beginPath();x.moveTo(46+38*Math.cos(-1.15),64+38*Math.sin(-1.15));x.lineTo(46+38*Math.cos(1.15),64+38*Math.sin(1.15));x.stroke();
    x.lineWidth=6;x.beginPath();x.moveTo(30,64);x.lineTo(104,64);x.stroke();
    x.beginPath();x.moveTo(108,64);x.lineTo(92,53);x.lineTo(92,75);x.closePath();x.fill();
    x.beginPath();x.moveTo(30,64);x.lineTo(21,55);x.moveTo(30,64);x.lineTo(21,73);x.lineWidth=4;x.stroke();
  }else{
    x.beginPath();x.ellipse(60,64,34,20,0,0,7);x.fill();
    x.beginPath();x.moveTo(90,64);x.lineTo(112,46);x.lineTo(112,82);x.closePath();x.fill();
    x.fillStyle='#2f86d6';x.beginPath();x.arc(44,58,4.5,0,7);x.fill();
  }
  const t=new THREE.CanvasTexture(c);return t;
}
const zoneTex=[null,zoneIconTex(1),zoneIconTex(2)];
const zoneIcons=new THREE.Group();scene.add(zoneIcons);
const zonePool=[];
function zoneIcon(i,kind,wx,wz){
  let sp=zonePool[i];
  if(!sp){sp=new THREE.Sprite(new THREE.SpriteMaterial({map:zoneTex[1],transparent:true,depthWrite:false}));sp.scale.set(2.6,2.6,1);sp.frustumCulled=false;zonePool[i]=sp;zoneIcons.add(sp);}
  sp.material.map=zoneTex[kind];sp.position.set(wx,2.2,wz);sp.visible=true;
}
function hideZoneIcons(from){for(let i=from;i<zonePool.length;i++)zonePool[i].visible=false;}
function drawZones(){
  const noisy=[];for(const b of Sim.buildings().values())if(b.type==='wood'||b.type==='quarry'||b.type==='mine')noisy.push(b);
  let n=0;
  for(let i=0;i<N*N;i++){
    const x=i%N,y=(i/N)|0,x0=x*PX,y0=y*PX;
    let kind=0;
    if(tree[i]){
      let c=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<N&&ny<N&&tree[ny*N+nx])c++;}
      if(c>=5){let q=true;for(const nb of noisy)if(Math.hypot(nb.x-x,nb.y-y)<=36){q=false;break;}if(q)kind=1;}
    }else if(!S.frozen&&!water[i]&&!occ[i]){
      outer:for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<N&&ny<N&&water[ny*N+nx]===1){kind=2;break outer;}}
    }
    if(!kind)continue;
    g.fillStyle=kind===1?'rgba(224,112,28,0.34)':'rgba(60,150,230,0.42)';g.fillRect(x0,y0,PX,PX);
    if(n<400&&((kind===1&&x%12===1&&y%12===1)||(kind===2&&(x*3+y*5)%15===0))){
      zoneIcon(n,kind,Sim.cx2w(x)+(kind===1?.5:0),Sim.cy2w(y)+(kind===1?.5:0));n++;
    }
  }
  hideZoneIcons(n);
}
// strisce che seguono le celle collegate: cerchio per cella e segmento verso i vicini
const NB=[[1,0],[0,1],[1,1],[-1,1]];
function stripOn(c,test,w,style){
  c.lineCap='round';c.lineJoin='round';
  c.strokeStyle=style;c.fillStyle=style;c.lineWidth=w;
  for(let i=0;i<N*N;i++){
    if(!test(i))continue;const x=i%N,y=(i/N)|0,cx=(x+.5)*PX,cy=(y+.5)*PX;
    c.beginPath();c.arc(cx,cy,w/2,0,7);c.fill();
    for(const [dx,dy] of NB){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;if(!test(ny*N+nx))continue;
      c.beginPath();c.moveTo(cx,cy);c.lineTo((nx+.5)*PX,(ny+.5)*PX);c.stroke();}
  }
}
// sentieri morbidi: le celle consecutive si ammorbidiscono (media coi vicini) e ogni cella disegna una curva da metà del tratto precedente a metà del successivo, con tangente continua; incroci e capi restano segmenti
const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
function curveOn(c,test,w,style){
  const m=new Uint8Array(N*N);let any=false;
  for(let i=0;i<N*N;i++)if(test(i)){m[i]=1;any=true;}
  if(!any)return;
  const nb=new Map(),px=new Float32Array(N*N),py=new Float32Array(N*N);
  for(let i=0;i<N*N;i++){
    if(!m[i])continue;const x=i%N,y=(i/N)|0,l=[];
    for(const [dx,dy] of N8){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N||!m[ny*N+nx])continue;
      // la diagonale è inutile se i due lati ortogonali sono già collegati
      if(dx&&dy&&m[y*N+nx]&&m[ny*N+x])continue;
      l.push(ny*N+nx);}
    nb.set(i,l);px[i]=(x+.5)*PX;py[i]=(y+.5)*PX;
  }
  // due passate di rilassamento sulle celle con due vicini (i capi e gli incroci restano fermi)
  for(let k=0;k<2;k++){
    const qx=px.slice(),qy=py.slice();
    for(const [i,l] of nb)if(l.length===2){qx[i]=.5*px[i]+.25*(px[l[0]]+px[l[1]]);qy[i]=.5*py[i]+.25*(py[l[0]]+py[l[1]]);}
    px.set(qx);py.set(qy);
  }
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=style;c.fillStyle=style;c.lineWidth=w;
  const seen=new Set();
  for(const [i,l] of nb){
    const cx=px[i],cy=py[i];
    if(l.length===0){c.beginPath();c.arc(cx,cy,w/2,0,7);c.fill();continue;}
    if(l.length===2){
      const a=l[0],b=l[1];
      c.beginPath();c.moveTo((cx+px[a])/2,(cy+py[a])/2);c.quadraticCurveTo(cx,cy,(cx+px[b])/2,(cy+py[b])/2);c.stroke();
    }else{
      c.beginPath();for(const a of l){c.moveTo(cx,cy);c.lineTo((cx+px[a])/2,(cy+py[a])/2);}c.stroke();
      c.beginPath();c.arc(cx,cy,w/2,0,7);c.fill();
    }
  }
}
function drawGround(){
  if(!zonesOn)hideZoneIcons(0);
  g.drawImage(base,0,0);
  const SN=S.season;
  if(SN===3){g.fillStyle='rgba(238,245,251,0.66)';g.fillRect(0,0,TEX,TEX);}
  else if(SN===2){g.fillStyle='rgba(196,120,40,0.22)';g.fillRect(0,0,TEX,TEX);}
  else if(SN===1){g.fillStyle='rgba(214,196,64,0.12)';g.fillRect(0,0,TEX,TEX);}
  else{g.fillStyle='rgba(120,220,120,0.10)';g.fillRect(0,0,TEX,TEX);}
  for(let i=0;i<N*N;i++){const w=water[i];if(!w)continue;const x0=(i%N)*PX,y0=((i/N)|0)*PX;
    g.fillStyle=w===2?'rgba(120,150,150,0.95)':S.frozen?'rgb(190,218,234)':'rgb(52,96,128)';g.fillRect(x0-1,y0-1,PX+2,PX+2);
    continue;
    if(w===1&&S.frozen&&Sim.hash(i,43)<.4){g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.5;g.beginPath();g.moveTo(x0+2,y0+Sim.hash(i,44)*PX);g.lineTo(x0+PX-2,y0+Sim.hash(i,45)*PX);g.stroke();}
    else if(w===1&&Sim.hash(i,41)<.35){g.fillStyle='rgba(170,210,230,.35)';g.fillRect(x0+3,y0+PX*0.4,PX*0.6,2);}
    if(w===2){g.fillStyle='rgba(160,140,100,.8)';for(let k=0;k<3;k++)g.fillRect(x0+2+k*5,y0+k*4+1,5,3);}}
  for(let i=0;i<N*N;i++){const w=water[i];if(!w)continue;const x0=(i%N)*PX,y0=((i/N)|0)*PX;
    if(w===1&&S.frozen&&Sim.hash(i,43)<.12){g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;g.beginPath();g.moveTo(x0+2,y0+Sim.hash(i,44)*PX);g.lineTo(x0+PX*3,y0+Sim.hash(i,45)*PX);g.stroke();}
    else if(w===1&&!S.frozen&&Sim.hash(i,41)<.07){g.fillStyle='rgba(170,210,230,.35)';g.fillRect(x0+3,y0+PX*0.4,PX*2.2,3);}
    if(w===2&&Sim.hash(i,46)<.25){g.fillStyle='rgba(160,140,100,.8)';g.fillRect(x0+1,y0+2,PX*1.6,PX*.7);}}
  for(let t=1;t<=5;t++){
    g.fillStyle=DFILL[t];
    for(let i=0;i<N*N;i++)if(dist[i]===t)g.fillRect((i%N)*PX,((i/N)|0)*PX,PX,PX);
    g.strokeStyle=DLINE[t];g.lineWidth=3;g.setLineDash([12,9]);g.beginPath();
    for(let i=0;i<N*N;i++){if(dist[i]!==t)continue;const x=i%N,y=(i/N)|0,px=x*PX,py=y*PX;
      if(y===0||dist[i-N]!==t){g.moveTo(px,py);g.lineTo(px+PX,py);}
      if(y===N-1||dist[i+N]!==t){g.moveTo(px,py+PX);g.lineTo(px+PX,py+PX);}
      if(x===0||dist[i-1]!==t){g.moveTo(px,py);g.lineTo(px,py+PX);}
      if(x===N-1||dist[i+1]!==t){g.moveTo(px+PX,py);g.lineTo(px+PX,py+PX);}}
    g.stroke();g.setLineDash([]);
  }
  for(let i=0;i<N*N;i++){
    if(!field[i])continue;const x0=(i%N)*PX,y0=((i/N)|0)*PX;
    const fb=Sim.buildings().get(field[i]),fk=fb&&fb.crop;
    g.fillStyle='rgba(122,88,48,0.92)';g.fillRect(x0,y0,PX+.5,PX+.5);
    g.fillStyle=((i/N|0)%2)?'rgba(84,60,32,.55)':fk==='flax'?'rgba(110,140,196,.55)':fk==='hemp'?'rgba(96,150,70,.55)':fk==='dye'?'rgba(150,70,110,.55)':'rgba(206,178,86,.4)';g.fillRect(x0,y0+PX*.2,PX+.5,PX*.35);
  }
  if(zonesOn)drawZones();
  g.fillStyle='rgba(88,66,40,0.5)';
  // v45.1: il terreno dei giardini segue il contorno (diagonale dove il bordo era a scaletta); le altre celle occupate restano quadrate
  const gard=new Set(),hv=[];for(const b of Sim.buildings().values())if(b.type==='house'&&b.gcells){hv.push(b);for(const c of b.gcells)gard.add(c);for(const c of (b.ext||[]))gard.add(c);}
  for(let i=0;i<N*N;i++)if(occ[i]&&!gard.has(i))g.fillRect((i%N)*PX-1,((i/N)|0)*PX-1,PX+2,PX+2);
  for(const b of hv){const ol=Sim.lotOutline(b);g.beginPath();
    for(const loop of ol.loops){g.moveTo(loop[0].x0*PX,loop[0].y0*PX);for(const e of loop)g.lineTo(e.x1*PX,e.y1*PX);g.closePath();}
    g.fill();}
  // sentieri a quattro livelli: dal terreno appena calpestato (livello 1) al sentiero di terra battuta (livello 4); i livelli bassi si disegnano per primi e più larghi sotto quelli alti
  const lc=[0,0,0,0,0];
  for(let i=0;i<N*N;i++){const L=plev[i];if(L>0&&!road[i]&&!occ[i])lc[L]++;}
  for(let L=1;L<=4;L++){
    if(!lc[L]&&!lc.slice(L).some(n=>n>0))continue;
    pg.clearRect(0,0,TEX,TEX);
    curveOn(pg,i=>plev[i]>=L&&!road[i]&&!occ[i],PX*PLW[L],PLC[L]);
    g.globalAlpha=PLA[L];g.drawImage(plc,0,0);g.globalAlpha=1;
  }
  g.lineCap='round';g.lineJoin='round';
  // strade tracciate dal giocatore: tre quarti di tile
  stripOn(g,i=>road[i]===1,PX*1.15,'rgb(141,128,108)');
  for(let i=0;i<N*N;i++){
    if(!road[i])continue;const x0=(i%N)*PX,y0=((i/N)|0)*PX;
    for(let k=0;k<2;k++){g.fillStyle=Sim.hash(i,k+10)<.5?'rgba(180,168,146,.8)':'rgba(96,86,70,.7)';g.fillRect(x0+Sim.hash(i,k+20)*PX*.8,y0+Sim.hash(i,k+30)*PX*.8,2,2);}
  }
  g.fillStyle='rgba(150,118,76,.8)';
  for(let i=0;i<N*N;i++)if(door[i]&&!road[i]){g.beginPath();g.arc((i%N+.5)*PX,((i/N|0)+.5)*PX,PX*0.55,0,7);g.fill();}
  if(attrOn){for(let i=0;i<N*N;i++){const a=attr[i];if(Math.abs(a)<0.2)continue;g.fillStyle=a>0?`rgba(70,190,90,${Math.min(.5,a*.09)})`:`rgba(225,70,50,${Math.min(.55,-a*.1)})`;g.fillRect((i%N)*PX,((i/N)|0)*PX,PX,PX);}}
  g.strokeStyle='rgba(60,45,25,.55)';g.lineWidth=10;g.strokeRect(0,0,TEX,TEX);
  gtex.needsUpdate=true;
}

// ---------- alberi e rocce ----------
const dummy=new THREE.Object3D();
const rn=(i,k)=>Sim.hash(i*7+k,k*13+5);
const trunkGeo=new THREE.CylinderGeometry(.12,.2,.9,6);trunkGeo.translate(0,.45,0);
const crownGeo=new THREE.ConeGeometry(.78,2.0,7);crownGeo.translate(0,1.75,0);
const MAXI=N*N;
const trunks=new THREE.InstancedMesh(trunkGeo,new THREE.MeshLambertMaterial({color:0x5b3d22}),MAXI);
const crowns=new THREE.InstancedMesh(crownGeo,new THREE.MeshLambertMaterial({color:0xffffff}),MAXI);
trunks.castShadow=crowns.castShadow=true;scene.add(trunks);scene.add(crowns);
trunks.frustumCulled=crowns.frustumCulled=false;
const rocksM=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.85,0),new THREE.MeshLambertMaterial({color:0xffffff}),MAXI);
rocksM.castShadow=true;rocksM.receiveShadow=true;scene.add(rocksM);
rocksM.frustumCulled=false;
const oresM=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.8,0),new THREE.MeshLambertMaterial({color:0xffffff}),MAXI);
oresM.castShadow=true;scene.add(oresM);
oresM.frustumCulled=false;
const sapM=new THREE.InstancedMesh(new THREE.ConeGeometry(.28,.8,5),new THREE.MeshLambertMaterial({color:0x7bb04a}),MAXI);sapM.count=0;scene.add(sapM);
sapM.frustumCulled=false;
const col=new THREE.Color();
let sapsDirty=true;
crowns.setColorAt(0,col.set(0x4f8a3a));rocksM.setColorAt(0,col.set(0x9a9a92));oresM.setColorAt(0,col.set(0x6a4a3a));
function rebuildSaps(){let n=0;
  for(let i=0;i<N*N;i++){if(!sap[i])continue;
    dummy.position.set(Sim.cx2w(i%N)+(rn(i,2)-.5)*.6,.4,Sim.cy2w((i/N)|0)+(rn(i,3)-.5)*.6);dummy.rotation.set(0,rn(i,4)*6,0);const sc=.7+rn(i,5)*.4;dummy.scale.set(sc,sc,sc);dummy.updateMatrix();sapM.setMatrixAt(n++,dummy.matrix);}
  sapM.count=n;sapM.instanceMatrix.needsUpdate=true;sapsDirty=false;}
let treesDirty=true,rocksDirty=true;
function rebuildTrees(){
  let n=0;
  for(let i=0;i<N*N;i++){
    if(!tree[i])continue;
    const sc=0.8+rn(i,1)*0.55;
    dummy.position.set(Sim.cx2w(i%N)+(rn(i,2)-.5)*0.9,0,Sim.cy2w((i/N)|0)+(rn(i,3)-.5)*0.9);
    dummy.rotation.set(0,rn(i,4)*6.28,0);dummy.scale.set(sc,sc*(0.9+rn(i,5)*.35),sc);dummy.updateMatrix();
    trunks.setMatrixAt(n,dummy.matrix);crowns.setMatrixAt(n,dummy.matrix);
    const SN=S.season;
    if(SN===3)col.setHSL(0.45,0.08,0.78+rn(i,8)*0.1);
    else if(SN===2)col.setHSL(0.04+rn(i,6)*0.09,0.65,0.38+rn(i,8)*0.12);
    else if(SN===0)col.setHSL(0.25+rn(i,6)*0.05,0.5,0.32+rn(i,8)*0.1);
    else col.setHSL(0.27+rn(i,6)*0.06,0.38+rn(i,7)*0.12,0.22+rn(i,8)*0.1);
    crowns.setColorAt(n,col);n++;
  }
  trunks.count=crowns.count=n;trunks.instanceMatrix.needsUpdate=crowns.instanceMatrix.needsUpdate=true;
  if(crowns.instanceColor)crowns.instanceColor.needsUpdate=true;treesDirty=false;
}
function rebuildRocks(){
  let n=0;
  for(let i=0;i<N*N;i++){
    if(rock[i]<=0)continue;
    const sc=0.45+rock[i]*0.075;
    dummy.position.set(Sim.cx2w(i%N)+(rn(i,2)-.5)*0.6,sc*0.45,Sim.cy2w((i/N)|0)+(rn(i,3)-.5)*0.6);
    dummy.rotation.set(rn(i,4)*3,rn(i,5)*6.28,rn(i,6)*3);dummy.scale.set(sc*(1+rn(i,7)*.4),sc*0.8,sc*(1+rn(i,8)*.3));dummy.updateMatrix();
    rocksM.setMatrixAt(n,dummy.matrix);col.setHSL(0.1,0.04+rn(i,9)*0.05,0.5+rn(i,10)*0.14);rocksM.setColorAt(n,col);n++;
  }
  rocksM.count=n;rocksM.instanceMatrix.needsUpdate=true;if(rocksM.instanceColor)rocksM.instanceColor.needsUpdate=true;
  let m=0;
  for(let i=0;i<N*N;i++){if(ore[i]<=0)continue;const sc=0.45+ore[i]*0.06;
    dummy.position.set(Sim.cx2w(i%N)+(rn(i,2)-.5)*.6,sc*.5,Sim.cy2w((i/N)|0)+(rn(i,3)-.5)*.6);dummy.rotation.set(rn(i,4)*2,rn(i,5)*6.28,rn(i,6)*2);dummy.scale.set(sc,sc*.9,sc);dummy.updateMatrix();
    oresM.setMatrixAt(m,dummy.matrix);col.setHSL(0.04+rn(i,9)*.04,0.35,0.3+rn(i,10)*0.1);oresM.setColorAt(m,col);m++;}
  oresM.count=m;oresM.instanceMatrix.needsUpdate=true;if(oresM.instanceColor)oresM.instanceColor.needsUpdate=true;rocksDirty=false;
}

// ---------- edifici ----------
const L=c=>new THREE.MeshLambertMaterial({color:c});
const MAT={plaster:L(0xd9c9a2),wattle:L(0xb99a68),timber:L(0x5b3f26),thatch:L(0xb9924b),tile:L(0xa8492e),slate:L(0x4b5560),stone:L(0xa3a39b),stoneD:L(0x77776f),
  log:L(0x8d5d32),logD:L(0x6a4524),gold:L(0xd6ad4e),door:L(0x35230f),glass:L(0x2c3a46),soil:L(0x5d4128),leaf:L(0x4f8a3a),leaf2:L(0x6ea04a),carrot:L(0xd9822b),
  hen:L(0xf2ede0),henR:L(0xb5472e),hay:L(0xd2b45a),water:L(0x35566e),veg:L(0x6ea04a),egg:L(0xf3ead2),grain:L(0xd6b24e),red:L(0xa8362a),cream:L(0xe8dcb8),blue:L(0x3a5f8a),iron:L(0x55575c),rust:L(0x8a4a2c),fire:L(0xe0732a),flour:L(0xf0ead8),fishM:L(0x9fb7c4),meatM:L(0xb04a3e),fw:L(0xa8793f),wool:L(0xe9e4d4),cloth:L(0xb8434a),sand:L(0xcfc3a2),fount:L(0x5d93b5),flower1:L(0xd94f6a),flower2:L(0xf0c040),flower3:L(0x9a6ad0),horse:L(0x6b4426),sick:L(0x8fb06a)};
function bx(grp,w,h,d,mat,x,y,z,ry){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);if(ry)m.rotation.y=ry;m.castShadow=m.receiveShadow=true;grp.add(m);return m;}
function cone(grp,r,h,seg,mat,x,y,z,ry){const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),mat);m.position.set(x,y,z);m.rotation.y=ry||0;m.castShadow=true;grp.add(m);return m;}
function cyl(grp,rt,rb,h,seg,mat,x,y,z,rx,rz){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat);m.position.set(x,y,z);m.rotation.x=rx||0;m.rotation.z=rz||0;m.castShadow=true;grp.add(m);return m;}
function sph(grp,r,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),mat);m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);m.castShadow=true;grp.add(m);return m;}
function gable(grp,w,d,rise,mat,y){
  const half=w/2,len=Math.hypot(half,rise)+0.15,ang=Math.atan2(rise,half);
  bx(grp,len,0.14,d+0.3,mat,-half/2,y+rise/2,0).rotation.z=ang;
  bx(grp,len,0.14,d+0.3,mat,half/2,y+rise/2,0).rotation.z=-ang;
}
function footCenter(b){return [(b.x+b.w/2)*CS-W/2,(b.y+b.h/2)*CS-W/2];}
function cellW(c){return [Sim.cx2w(c%N),Sim.cy2w((c/N)|0)];}
function gab(g,w,d,rise,mat,y,x,z,ry){const s2=new THREE.Group();gable(s2,w,d,rise,mat,0);s2.position.set(x||0,y,z||0);s2.rotation.y=ry||0;g.add(s2);return s2;}
function chim(g,x,y,z,hh){hh=hh||.6;bx(g,.22,hh,.22,MAT.stoneD,x,y,z);bx(g,.3,.05,.3,MAT.stone,x,y+hh/2,z);}
function houseLevel(g,b){
  const lv=b.level,v=(b.variant|0)%4;
  if(lv===1){
    if(v===0){bx(g,1.25,.75,1.15,MAT.wattle,0,.375,0);cone(g,1.1,.9,4,MAT.thatch,0,1.2,0,Math.PI/4);bx(g,.28,.5,.06,MAT.door,0,.25,.59);}
    else if(v===1){bx(g,1.3,.75,1.1,MAT.log,0,.375,0);for(const y of[.18,.42,.66])bx(g,1.36,.05,1.16,MAT.logD,0,y,0);gab(g,1.3,1.1,.55,MAT.thatch,.75);bx(g,.26,.5,.06,MAT.door,0,.25,.56);bx(g,.18,.18,.05,MAT.glass,.4,.5,.56);chim(g,.42,1.05,-.25,.5);}
    else if(v===2){cyl(g,.62,.68,.8,10,MAT.wattle,0,.4,0);cone(g,.95,.95,10,MAT.thatch,0,1.27,0,0);bx(g,.26,.5,.06,MAT.door,0,.25,.66);bx(g,.16,.16,.05,MAT.glass,.36,.55,.6).rotation.y=.5;}
    else{bx(g,1.3,.4,1.2,MAT.stoneD,0,.2,0);bx(g,1.2,.45,1.1,MAT.wattle,0,.62,0);gab(g,1.35,1.15,.45,MAT.leaf2,.85);bx(g,.26,.5,.06,MAT.door,0,.25,.61);bx(g,.16,.16,.05,MAT.glass,-.4,.62,.56);}
  }else if(lv===2){
    if(v===0){bx(g,1.5,1.0,1.4,MAT.plaster,0,.5,0);
      for(const sx of[-1,1])for(const sz of[-1,1])bx(g,.1,1.0,.1,MAT.timber,sx*.72,.5,sz*.67);
      bx(g,1.56,.1,1.46,MAT.timber,0,1.0,0);cone(g,1.3,.95,4,(b.id%2)?MAT.tile:MAT.thatch,0,1.5,0,Math.PI/4);
      bx(g,.32,.55,.06,MAT.door,0,.28,.71);bx(g,.2,.2,.06,MAT.glass,.45,.62,.71);bx(g,.2,.45,.2,MAT.stoneD,.45,1.6,-.3);}
    else if(v===1){bx(g,1.5,.9,1.3,MAT.plaster,0,.45,0);bx(g,1.56,.08,1.36,MAT.timber,0,.9,0);gab(g,1.56,1.36,.75,MAT.tile,.9);
      bx(g,.34,.55,.06,MAT.door,0,.28,.66);bx(g,.7,.06,.45,MAT.timber,0,.62,.9);for(const sx of[-.3,.3])bx(g,.06,.6,.06,MAT.timber,sx,.3,1.08);
      bx(g,.2,.22,.05,MAT.glass,-.5,.55,.66);bx(g,.2,.22,.05,MAT.glass,.5,.55,.66);chim(g,.55,1.35,-.3,.7);}
    else if(v===2){bx(g,1.5,.95,1.4,MAT.log,0,.475,0);for(const x of[-.55,-.18,.18,.55])bx(g,.04,.95,1.42,MAT.logD,x,.475,0);
      gab(g,1.4,1.5,.7,MAT.thatch,.95,0,0,Math.PI/2);bx(g,.3,.55,.06,MAT.door,-.2,.28,.71);bx(g,.22,.22,.06,MAT.glass,.4,.58,.71);
      bx(g,.4,.6,.9,MAT.logD,.88,.3,-.1);bx(g,.46,.06,1.0,MAT.thatch,.88,.65,-.1).rotation.z=.2;chim(g,-.5,1.5,-.2,.6);}
    else{bx(g,1.5,1.0,1.4,MAT.plaster,0,.5,0);for(const x of[-.6,0,.6]){bx(g,.07,1.0,.07,MAT.timber,x,.5,.72);}
      for(const x of[-.3,.3]){bx(g,.05,.7,.05,MAT.timber,x,.5,.73).rotation.z=.7;}bx(g,1.56,.08,1.46,MAT.timber,0,1.0,0);
      cone(g,1.32,.9,4,MAT.tile,0,1.47,0,Math.PI/4);bx(g,.32,.28,.26,MAT.plaster,0,1.38,.45);gab(g,.34,.3,.16,MAT.tile,1.52,0,.45);
      bx(g,.32,.55,.06,MAT.door,0,.28,.71);bx(g,.2,.22,.05,MAT.glass,.5,.62,.71);bx(g,.2,.22,.05,MAT.glass,-.5,.62,.71);}
  }else if(lv===3){
    if(v===0){bx(g,1.5,1.0,1.4,MAT.plaster,0,.5,0);bx(g,1.62,.85,1.52,MAT.plaster,0,1.42,0);
      for(const sx of[-1,1])for(const sz of[-1,1]){bx(g,.1,1.0,.1,MAT.timber,sx*.72,.5,sz*.67);bx(g,.1,.85,.1,MAT.timber,sx*.79,1.42,sz*.73);}
      bx(g,1.7,.1,1.6,MAT.timber,0,1.0,0);bx(g,1.7,.1,1.6,MAT.timber,0,1.88,0);cone(g,1.45,1.0,4,MAT.tile,0,2.4,0,Math.PI/4);
      bx(g,.32,.6,.06,MAT.door,0,.3,.71);bx(g,.22,.3,.06,MAT.glass,.5,.65,.71);bx(g,.22,.3,.06,MAT.glass,-.5,1.45,.77);bx(g,.22,.3,.06,MAT.glass,.5,1.45,.77);bx(g,.24,.6,.24,MAT.stoneD,.5,2.5,-.3);}
    else if(v===1){bx(g,1.6,1.0,1.4,MAT.stone,0,.5,0);bx(g,1.76,.85,1.58,MAT.plaster,0,1.42,0);bx(g,1.8,.1,1.62,MAT.timber,0,1.0,0);bx(g,1.8,.1,1.62,MAT.timber,0,1.88,0);
      for(const x of[-.7,-.25,.25,.7])bx(g,.07,.85,.07,MAT.timber,x,1.42,.8);gab(g,1.8,1.62,.85,MAT.tile,1.93);
      bx(g,.34,.62,.06,MAT.door,0,.31,.71);bx(g,.2,.3,.05,MAT.glass,-.55,.62,.71);bx(g,.2,.3,.05,MAT.glass,.55,.62,.71);bx(g,.2,.3,.05,MAT.glass,-.45,1.45,.81);bx(g,.2,.3,.05,MAT.glass,.45,1.45,.81);
      chim(g,-.65,2.5,-.3,.7);chim(g,.65,2.5,-.3,.7);}
    else if(v===2){bx(g,1.5,1.0,1.0,MAT.plaster,0,.5,-.3);bx(g,1.4,.85,.9,MAT.plaster,0,1.42,-.3);bx(g,.8,1.0,.8,MAT.plaster,.55,.5,.55);bx(g,.9,.1,1.0,MAT.timber,0,1.0,-.3);
      gab(g,1.5,1.0,.8,MAT.tile,1.85,0,-.3,0);cone(g,.75,.8,4,MAT.tile,.55,1.4,.55,Math.PI/4);
      bx(g,.6,.06,.4,MAT.timber,-.4,1.0,.35);for(const x of[-.65,-.15])bx(g,.05,.35,.05,MAT.timber,x,1.2,.52);bx(g,.6,.05,.05,MAT.timber,-.4,1.38,.52);
      bx(g,.3,.55,.06,MAT.door,.55,.28,.96);bx(g,.2,.3,.05,MAT.glass,-.4,.62,.2);bx(g,.2,.3,.05,MAT.glass,0,1.45,.16);chim(g,-.55,2.3,-.5,.6);}
    else{bx(g,1.5,1.0,1.4,MAT.stone,0,.5,0);bx(g,1.4,.9,1.3,MAT.plaster,0,1.45,0);bx(g,1.56,.08,1.46,MAT.timber,0,1.0,0);
      gab(g,1.5,1.4,.8,MAT.slate,1.9,0,0,Math.PI/2);cyl(g,.34,.36,2.1,8,MAT.stone,.7,1.05,.55);cone(g,.46,.8,8,MAT.slate,.7,2.5,.55,0);
      bx(g,.32,.6,.06,MAT.door,-.2,.3,.71);bx(g,.2,.3,.05,MAT.glass,-.6,1.45,.66);bx(g,.2,.3,.05,MAT.glass,.1,1.45,.66);bx(g,.1,.3,.05,MAT.glass,.7,1.6,.9);}
  }else if(lv===4){
    if(v===0){bx(g,1.7,1.1,1.6,MAT.stone,0,.55,0);bx(g,1.6,.9,1.5,MAT.plaster,0,1.55,0);
      for(const sx of[-1,1])for(const sz of[-1,1])bx(g,.1,.9,.1,MAT.timber,sx*.77,1.55,sz*.72);
      bx(g,1.66,.1,1.56,MAT.timber,0,1.1,0);bx(g,1.66,.1,1.56,MAT.timber,0,2.0,0);cone(g,1.5,1.25,4,MAT.slate,0,2.6,0,Math.PI/4);
      bx(g,.38,.7,.06,MAT.door,0,.35,.81);bx(g,.1,.1,.08,MAT.gold,.1,.35,.85);
      for(const sx of[-.55,.55]){bx(g,.24,.34,.06,MAT.glass,sx,.75,.81);bx(g,.24,.34,.06,MAT.glass,sx,1.6,.77);}
      bx(g,.26,.7,.26,MAT.stoneD,.55,2.65,-.35);bx(g,.26,.7,.26,MAT.stoneD,-.55,2.65,-.35);
      cyl(g,.02,.02,1.2,4,MAT.timber,0,3.45,0);bx(g,.4,.22,.03,MAT.red,.2,3.8,0);}
    else if(v===1){bx(g,1.8,1.1,1.5,MAT.stone,0,.55,0);bx(g,1.7,.9,1.4,MAT.plaster,0,1.55,0);bx(g,1.76,.1,1.46,MAT.timber,0,1.1,0);bx(g,1.76,.1,1.46,MAT.timber,0,2.0,0);
      gab(g,1.76,1.46,.95,MAT.slate,2.0);bx(g,.4,.75,.06,MAT.door,0,.38,.76);bx(g,.1,.1,.08,MAT.gold,.12,.38,.8);
      for(const sx of[-.6,.6]){bx(g,.24,.34,.06,MAT.glass,sx,.75,.76);bx(g,.24,.34,.06,MAT.glass,sx,1.6,.72);}
      for(const x of[-.2,.2])bx(g,.07,.9,.07,MAT.timber,x,1.55,.72);
      chim(g,-.7,2.75,-.3,.8);chim(g,.7,2.75,-.3,.8);cyl(g,.02,.02,.9,4,MAT.timber,0,3.3,0);bx(g,.36,.2,.03,MAT.gold,.18,3.55,0);}
    else if(v===2){bx(g,1.8,1.0,1.7,MAT.stone,0,.5,0);bx(g,1.7,1.0,1.6,MAT.plaster,0,1.5,0);bx(g,1.76,.1,1.66,MAT.timber,0,1.0,0);
      bx(g,1.8,.1,1.7,MAT.stoneD,0,2.05,0);
      for(let k=-3;k<=3;k++){if(k%2===0){bx(g,.2,.2,.1,MAT.stone,k*.26,2.2,.82);bx(g,.2,.2,.1,MAT.stone,k*.26,2.2,-.82);}}
      for(const sx of[-.9,.9])for(const sz of[-.82,.82]){cyl(g,.2,.22,2.4,8,MAT.stone,sx,1.2,sz);cone(g,.3,.55,8,MAT.slate,sx,2.65,sz,0);}
      bx(g,.4,.75,.06,MAT.door,0,.38,.86);bx(g,.24,.34,.05,MAT.glass,-.5,1.55,.81);bx(g,.24,.34,.05,MAT.glass,.5,1.55,.81);bx(g,.24,.3,.05,MAT.glass,-.55,.7,.86);
      cyl(g,.02,.02,1.0,4,MAT.timber,0,2.5,0);bx(g,.4,.24,.03,MAT.red,.2,2.85,0);}
    else{bx(g,.6,1.5,1.7,MAT.plaster,-.65,.75,0);bx(g,.6,1.5,1.7,MAT.plaster,.65,.75,0);bx(g,1.9,1.5,.55,MAT.plaster,0,.75,-.6);bx(g,1.9,.12,1.8,MAT.stone,0,.06,0);
      gab(g,.7,1.8,.65,MAT.tile,1.5,-.65,0,0);gab(g,.7,1.8,.65,MAT.tile,1.5,.65,0,0);gab(g,.7,1.9,.65,MAT.tile,1.5,0,-.6,Math.PI/2);
      bx(g,.5,1.0,.1,MAT.stone,0,.5,.8);bx(g,.3,.6,.12,MAT.door,0,.3,.82);bx(g,.5,.12,.14,MAT.stoneD,0,1.0,.8);
      for(const sx of[-.65,.65]){bx(g,.2,.3,.05,MAT.glass,sx,.9,.86);bx(g,.2,.3,.05,MAT.glass,sx,1.2,-.86);}
      cyl(g,.18,.22,.2,8,MAT.stoneD,0,.2,0);cyl(g,.12,.12,.04,8,MAT.fount,0,.31,0);chim(g,-.7,1.95,-.4,.6);cyl(g,.02,.02,.9,4,MAT.timber,0,2.2,-.6);bx(g,.34,.2,.03,MAT.gold,.17,2.5,-.6);}
  }else{
    // livello 5: palazzo
    if(v%2===0){
      bx(g,1.95,1.2,1.85,MAT.stone,0,.6,0);bx(g,1.85,.95,1.75,MAT.plaster,0,1.68,0);
      bx(g,2.0,.1,1.9,MAT.timber,0,1.2,0);bx(g,2.0,.12,1.9,MAT.stoneD,0,2.2,0);
      for(let k=-3;k<=3;k++){bx(g,.2,.2,.1,MAT.stone,k*.28,2.36,.9);bx(g,.2,.2,.1,MAT.stone,k*.28,2.36,-.9);}
      for(const sx of[-1,1])for(const sz of[-1,1]){cyl(g,.24,.27,2.8,9,MAT.stone,sx*.98,1.4,sz*.92);cone(g,.36,.8,9,MAT.slate,sx*.98,3.2,sz*.92,0);sph(g,.06,MAT.gold,sx*.98,3.65,sz*.92);}
      bx(g,.9,.85,.9,MAT.stone,0,2.6,-.1);cone(g,.8,.9,4,MAT.slate,0,3.5,-.1,Math.PI/4);cyl(g,.02,.02,1.0,4,MAT.timber,0,4.4,-.1);bx(g,.42,.26,.03,MAT.gold,.21,4.75,-.1);
      bx(g,.5,.8,.08,MAT.door,0,.4,.93);bx(g,.62,.12,.12,MAT.gold,0,.88,.93);bx(g,.12,.12,.1,MAT.gold,.14,.4,.97);
      for(const sx of[-.55,.55]){bx(g,.24,.36,.06,MAT.glass,sx,.8,.93);bx(g,.24,.4,.06,MAT.glass,sx,1.72,.88);}
      bx(g,.3,.45,.06,MAT.glass,0,1.72,.88);bx(g,.8,.06,.3,MAT.stoneD,0,1.3,1.0);
      for(const sx of[-.98,.98])bx(g,.4,.7,.03,MAT.red,sx,2.2,.0).rotation.y=Math.PI/2;
    }else{
      bx(g,.75,1.3,1.8,MAT.stone,-.62,.65,0);bx(g,.75,1.3,1.8,MAT.stone,.62,.65,0);bx(g,.62,1.0,1.7,MAT.plaster,-.62,1.8,0);bx(g,.62,1.0,1.7,MAT.plaster,.62,1.8,0);
      gab(g,.8,1.8,.7,MAT.slate,2.3,-.62,0,0);gab(g,.8,1.8,.7,MAT.slate,2.3,.62,0,0);
      bx(g,.9,1.9,1.0,MAT.stone,0,.95,.1);bx(g,.8,.9,.9,MAT.plaster,0,2.35,.1);gab(g,1.0,1.0,.9,MAT.slate,2.8,0,.1,0);
      bx(g,.42,.9,.1,MAT.door,0,.45,.62);bx(g,.58,.1,.12,MAT.gold,0,.95,.62);cyl(g,.16,.16,.05,10,MAT.gold,0,2.5,.6).rotation.x=Math.PI/2;
      for(const sx of[-.62,.62]){bx(g,.22,.36,.06,MAT.glass,sx,.8,.9);bx(g,.22,.36,.06,MAT.glass,sx,1.85,.86);}
      for(const sx of[-1.05,1.05]){cyl(g,.2,.22,2.0,8,MAT.stone,sx,1.0,.0);cone(g,.3,.6,8,MAT.slate,sx,2.3,0,0);}
      chim(g,-.62,3.2,-.4,.8);chim(g,.62,3.2,-.4,.8);cyl(g,.02,.02,1.0,4,MAT.timber,0,3.8,.1);bx(g,.4,.24,.03,MAT.gold,.2,4.1,.1);
    }
  }
}
// v23: giardino fisso (b.pure) = staccionata chiara, bordo fiorito e alberello da frutta; giardino della legna (b.crop==='wood') = coltura al posto di orto, galline o allevamento: catasta con tettoia, ceppo con ascia, tronchi sparsi e alberelli da ceduo
function woodPile(g,x,z){
  for(let L=0;L<3;L++)for(let k=0;k<4-L;k++)cyl(g,.095,.095,.9,7,(k+L)%2?MAT.logD:MAT.log,x+(k-(3-L)/2)*.21,.11+L*.17,z,0,Math.PI/2);
  for(const sx of[-.5,.5])bx(g,.06,.7,.06,MAT.timber,x+sx,.35,z-.17);
  bx(g,1.15,.06,.5,MAT.thatch,x,.72,z-.08).rotation.x=.18;
  cyl(g,.16,.18,.26,8,MAT.log,x+.95,.13,z+.05);
  bx(g,.04,.32,.04,MAT.timber,x+.95,.42,z+.05).rotation.z=.9;bx(g,.11,.07,.03,MAT.iron,x+1.04,.5,z+.05);
}
// staccionata che segue il contorno di tutte le celle del giardino (base + ampliamenti): stessi materiali, nessun tratto interno
function fenceCells(g,cells,fx,fz,mat,skip,diag){
  const h=CS/2-.1,has=(x,y)=>cells.has(y*N+x),posts=new Set();
  const post=(px,pz)=>{const k=px.toFixed(2)+','+pz.toFixed(2);if(posts.has(k))return;posts.add(k);bx(g,.08,.4,.08,mat,px,.2,pz);};
  for(const key of cells){
    const x=key%N,y=(key/N)|0,cx=Sim.cx2w(x)-fx,cz=Sim.cy2w(y)-fz;
    for(const [nx,ny] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(has(x+nx,y+ny))continue;
      if(skip&&skip.has((y+ny)*N+x+nx))continue;
      if(diag&&diag(x+nx+.5,y+ny+.5,x+.5+nx*.5,y+.5+ny*.5))continue;
      const tx=ny!==0?1:0,ty=nx!==0?1:0,ends=[];
      for(const sg of[-1,1]){
        const wx=x+tx*sg,wy=y+ty*sg;let e;
        if(!has(wx,wy))e=h;else if(has(wx+nx,wy+ny))e=CS-h;else e=CS/2;
        ends.push(e*sg);
        if(e!==CS/2)post(cx+nx*h+tx*e*sg,cz+ny*h+ty*e*sg);
      }
      const len=ends[1]-ends[0],mid=(ends[0]+ends[1])/2;
      bx(g,tx?len:.05,.05,ty?len:.05,mat,cx+nx*h+tx*mid,.28,cz+ny*h+ty*mid);
    }
  }
}
// v35.1: staccionata diagonale lungo il taglio del triangolo (angoli di cella -> mondo)
// v45.1: staccionata lungo il contorno del giardino (Sim.lotOutline): tratti dritti uniti in una sola asse, diagonale dove il bordo era a scaletta; si interrompe lungo la casa e davanti al cancello
function fenceLoops(g,ol,fx,fz,mat){
  const w=(X,Y)=>[Sim.cx2w(0)-CS/2+X*CS-fx,Sim.cy2w(0)-CS/2+Y*CS-fz],ins=.16,posts=new Set();
  const nOf=e=>{const dx=e.x1-e.x0,dy=e.y1-e.y0,L=Math.hypot(dx,dy);return [-dy/L,dx/L];};
  const sameDir=(a,b)=>{const [ax,ay]=nOf(a),[bx,by]=nOf(b);return Math.abs(ax-bx)<1e-6&&Math.abs(ay-by)<1e-6;};
  const post=(px,pz)=>{const k=px.toFixed(2)+','+pz.toFixed(2);if(posts.has(k))return;posts.add(k);bx(g,.08,.4,.08,mat,px,.2,pz);};
  for(const loop of ol.loops){
    const n=loop.length;let st=0;
    for(let i=0;i<n;i++){const a=loop[(i+n-1)%n],b=loop[i];if(a.skip!==b.skip||!sameDir(a,b)){st=i;break;}}
    let cnt=0;
    while(cnt<n){
      const i0=(st+cnt)%n,first=loop[i0];let len=1;
      while(cnt+len<n){const nx=loop[(i0+len)%n];if(nx.skip!==first.skip||!sameDir(nx,first))break;len++;}
      cnt+=len;
      if(first.skip)continue;
      const last=loop[(i0+len-1)%n],prev=loop[(i0+n-1)%n],next=loop[(i0+len)%n];
      const nA=nOf(first),miter=(nb,v)=>{ // punto d'estremità spostato verso l'interno: se il tratto vicino è recintato si usa l'intersezione tra le due rette
        if(!nb||nb.skip)return [v[0]+nA[0]*ins,v[1]+nA[1]*ins];
        const nB=nOf(nb),d=1+nA[0]*nB[0]+nA[1]*nB[1];return [v[0]+(nA[0]+nB[0])*ins/d,v[1]+(nA[1]+nB[1])*ins/d];};
      const p0=miter(prev,[first.x0,first.y0]),p1=miter(next,[last.x1,last.y1]);
      const [ax,az]=w(p0[0],p0[1]),[bx2,bz]=w(p1[0],p1[1]);
      const L=Math.hypot(bx2-ax,bz-az),m=bx(g,L,.05,.05,mat,(ax+bx2)/2,.28,(az+bz)/2);m.rotation.y=-Math.atan2(bz-az,bx2-ax);
      post(ax,az);post(bx2,bz);
      const k=Math.floor(L/(CS*3));for(let q=1;q<=k;q++)post(ax+(bx2-ax)*q/(k+1),az+(bz-az)*q/(k+1));
    }
  }
}
function fenceDiag(g,b,fx,fz,mat){
  const w=(X,Y)=>[Sim.cx2w(0)-CS/2+X*CS-fx,Sim.cy2w(0)-CS/2+Y*CS-fz],[x0,z0]=w(b.diag.p[0],b.diag.p[1]),[x1,z1]=w(b.diag.p[2],b.diag.p[3]);
  const len=Math.hypot(x1-x0,z1-z0),m=bx(g,len,.05,.05,mat,(x0+x1)/2,.28,(z0+z1)/2);m.rotation.y=-Math.atan2(z1-z0,x1-x0);
  const n=Math.max(2,Math.round(len/CS));for(let k=0;k<=n;k++)bx(g,.08,.4,.08,mat,x0+(x1-x0)*k/n,.2,z0+(z1-z0)*k/n);
}
// v27: le botteghe del giardino (fabbro, panettiere, tessitore, sarto) sono piccoli laboratori ben visibili, con tettoia e insegna colorata
function shopSign(g,x,z,col){cyl(g,.04,.05,1.25,6,MAT.timber,x,.62,z);bx(g,.34,.04,.04,MAT.timber,x-.15,1.2,z);bx(g,.42,.24,.04,col,x-.2,1.02,z);bx(g,.46,.04,.06,MAT.timber,x-.2,1.16,z);}
function shopRoof(g,hh,col){for(const sx of[-.72,.72])for(const sz of[.34,.9])bx(g,.07,hh,.07,MAT.timber,sx,hh/2,sz);bx(g,1.7,.07,.7,col,0,hh+.04,.62).rotation.x=.14;}
function shopProps(g,b){
  if(b.craft){
    bx(g,1.6,.04,.62,MAT.stoneD,0,.02,.62);shopRoof(g,.95,MAT.thatch);
    bx(g,.55,.42,.42,MAT.stoneD,-.4,.21,.55);bx(g,.4,.08,.3,MAT.fire,-.4,.44,.55);cyl(g,.08,.1,.85,7,MAT.stoneD,-.4,.85,.4);
    cyl(g,.15,.17,.3,8,MAT.log,.32,.15,.62);bx(g,.4,.1,.16,MAT.iron,.32,.35,.62);bx(g,.16,.07,.1,MAT.iron,.58,.36,.62);bx(g,.28,.12,.14,MAT.iron,.32,.43,.62);
    bx(g,.04,.3,.04,MAT.timber,.08,.4,.8).rotation.z=.7;bx(g,.12,.07,.05,MAT.iron,.0,.52,.8);
    shopSign(g,.8,.9,MAT.rust);bx(g,.2,.06,.05,MAT.iron,.6,1.02,.93);
  }
  if(b.bake){
    bx(g,1.6,.04,.62,MAT.sand,0,.02,.62);shopRoof(g,.95,MAT.tile);
    const o=new THREE.Mesh(new THREE.SphereGeometry(.5,12,9,0,6.3,0,1.6),MAT.stone);o.position.set(-.35,.12,.6);o.castShadow=true;g.add(o);
    bx(g,.26,.2,.08,MAT.fire,-.35,.3,.97);cyl(g,.07,.09,.8,7,MAT.stoneD,-.35,.8,.5);
    bx(g,.6,.08,.42,MAT.timber,.42,.46,.65);for(const sx of[.18,.66])bx(g,.06,.46,.06,MAT.timber,sx,.23,.65);
    for(let k=0;k<4;k++)sph(g,.1,MAT.hay,.24+k*.14,.58,.65,1.3,.8,1);
    shopSign(g,.8,.9,MAT.hay);
  }
  if(b.weave){
    bx(g,1.6,.04,.62,MAT.sand,0,.02,.62);shopRoof(g,.95,MAT.thatch);
    for(const sx of[-.55,.15])bx(g,.07,.85,.07,MAT.timber,sx,.45,.55);bx(g,.8,.07,.07,MAT.timber,-.2,.88,.55);bx(g,.8,.07,.07,MAT.timber,-.2,.2,.55);
    const cs=[MAT.cloth,MAT.blue,MAT.cream,MAT.red];for(let k=0;k<7;k++)bx(g,.08,.6,.03,cs[k%4],-.52+k*.11,.55,.55);
    bx(g,.34,.3,.3,MAT.wool,.58,.15,.7);bx(g,.28,.24,.28,MAT.wool,.58,.4,.7);
    shopSign(g,.8,.9,MAT.blue);
  }
  if(b.tailor){
    bx(g,1.6,.04,.62,MAT.sand,0,.02,.62);
    for(const sx of[-.72,.72])for(const sz of[.34,.9])bx(g,.07,.9,.07,MAT.timber,sx,.45,sz);
    for(let k=0;k<6;k++)bx(g,.29,.05,.7,k%2?MAT.cream:MAT.red,-.72+k*.29+.14,.96-k*0,.62).rotation.x=.14;
    cyl(g,.04,.04,.9,6,MAT.timber,-.35,.45,.6);cone(g,.28,.7,8,MAT.cloth,-.35,.55,.6,0);sph(g,.1,MAT.cream,-.35,1.0,.6);
    bx(g,.6,.08,.4,MAT.timber,.35,.4,.65);for(const sx of[.1,.6])bx(g,.06,.4,.06,MAT.timber,sx,.2,.65);
    const cs=[MAT.cloth,MAT.blue,MAT.leaf2];for(let k=0;k<3;k++)cyl(g,.07,.07,.34,8,cs[k],.2+k*.18,.52,.65,0,Math.PI/2);
    shopSign(g,.8,.9,MAT.red);
  }
}
function garden(g,b){
  if(b.pure){
    const fl=[MAT.flower1,MAT.flower2,MAT.flower3];
    for(let k=0;k<7;k++){sph(g,.075,fl[(k+b.id)%3],-.78+k*.26,.13,-.8,1,1,1);sph(g,.075,fl[(k+b.id+1)%3],-.84,.13,-.55+k*.2,1,1,1);sph(g,.075,fl[(k+b.id+2)%3],.84,.13,-.55+k*.2,1,1,1);}
    cyl(g,.05,.07,.55,6,MAT.timber,-.62,.28,-.6);sph(g,.3,MAT.leaf2,-.62,.78,-.6,1,.9,1);
    for(let k=0;k<5;k++)sph(g,.045,MAT.red,-.62+Math.cos(k*1.3)*.24,.78+Math.sin(k*2.1)*.12,-.6+Math.sin(k*1.3)*.24);
  }
  if(b.crop==='herd'){
    for(const [px,pz] of[[-.45,-.4],[.2,b.craft||b.bake||b.weave||b.tailor?-.1:.4],[.45,-.35]]){bx(g,.45,.28,.28,MAT.wool,px,.3,pz,(px+pz)*2);sph(g,.12,MAT.timber,px+.26,.34,pz);}
    bx(g,.7,.5,.6,MAT.log,.5,.25,-.5);bx(g,.9,.07,.8,MAT.thatch,.5,.58,-.5).rotation.z=.15;
  }else if(b.crop==='veg'){
    const shop=b.craft||b.bake||b.weave||b.tailor;
    for(let r=-1;r<=(shop?0:1);r++){bx(g,1.5,.1,.22,MAT.soil,0,.05,r*.5);
      for(let k=-2;k<=2;k++){const m=(k+r+b.id)%3===0?MAT.carrot:(k%2?MAT.leaf:MAT.leaf2);sph(g,.11,m,k*.3,.2,r*.5,1,1.1,1);}}
  }else if(b.crop==='wood'){
    woodPile(g,-.3,-.45);
    for(const [px,pz,rx,rz] of[[-.4,.3,0,Math.PI/2],[.05,.55,Math.PI/2,0],[.45,.2,0,Math.PI/2]])cyl(g,.08,.08,.55,7,MAT.logD,px,.09,pz,rx,rz);
    for(const [px,pz] of[[.62,.55],[-.68,.58]]){cyl(g,.04,.06,.5,6,MAT.timber,px,.25,pz);sph(g,.22,MAT.leaf2,px,.62,pz,1,.9,1);}
  }else{
    bx(g,.7,.5,.6,MAT.log,.45,.25,-.45);bx(g,.9,.07,.8,MAT.thatch,.45,.58,-.45).rotation.z=.15;bx(g,.2,.25,.04,MAT.door,.45,.18,-.14);
    for(let k=0;k<4;k++){const hx=-.5+((b.id*7+k*5)%9)*.1,hz=.1+((b.id*3+k*7)%8)*.08-.1*k*.2;{const sh=(b.craft||b.bake||b.weave||b.tailor)?-.5:0;sph(g,.12,MAT.hen,hx,.18,hz+k*.12-.1+sh,1,.9,1.3);sph(g,.06,MAT.henR,hx,.32,hz+k*.12-.02+sh);}}
  }
}
const BUILD={
  house(b){
    const g=new THREE.Group(),[fx,fz]=footCenter(b);
    // v29: casa da 3×3 a 6×4 e giardino da 3×3 a 4×6: il modello 3D (pensato per 3×3) si allunga su un lato (due moduli affiancati se la lunghezza è 5-6) e il giardino fisso sta nell'angolo; le altre celle sono come gli ampliamenti
    const hx=Sim.cx2w(b.hx)+(b.hw-1)*CS/2-fx,hz=Sim.cy2w(b.hy)+(b.hh-1)*CS/2-fz;
    // v32: il giardino ha una forma libera: il blocco 3×3 (o 2×2, in scala) più vicino al centro regge orto/animali/bottega; le altre celle sono come gli ampliamenti
    const OL=Sim.lotOutline(b),gset=new Set(b.gcells);let mx=0,mz=0;for(const c of b.gcells){mx+=c%N;mz+=(c/N)|0;}mx/=b.gcells.length;mz/=b.gcells.length;
    let anc=null,asz=0,abd=1e9;
    for(const sz of[3,2]){
      for(const c of b.gcells){const x0=c%N,y0=(c/N)|0;let ok=true;for(let yy=0;yy<sz&&ok;yy++)for(let xx=0;xx<sz;xx++)if(!gset.has((y0+yy)*N+x0+xx)||OL.cut.has((y0+yy)*N+x0+xx)){ok=false;break;}
        if(!ok)continue;const d=Math.hypot(x0+(sz-1)/2-mx,y0+(sz-1)/2-mz);if(d<abd){abd=d;anc=[x0,y0];asz=sz;}}
      if(anc)break;
    }
    if(!anc){let bd=1e9;for(const c of b.gcells){const d=Math.hypot(c%N-mx,((c/N)|0)-mz);if(d<bd){bd=d;anc=[c%N,(c/N)|0];}}asz=1;}
    const gx=Sim.cx2w(anc[0])+(asz-1)*CS/2-fx,gz=Sim.cy2w(anc[1])+(asz-1)*CS/2-fz;
    const dxw=Sim.cx2w(b.door%N)-fx,dzw=Sim.cy2w((b.door/N)|0)-fz;
    const fX=Math.abs(dxw-hx)>Math.abs(dzw-hz),rotY=fX?(dxw>hx?Math.PI/2:-Math.PI/2):(dzw>hz?0:Math.PI);
    const lW=fX?b.hh:b.hw,lD=fX?b.hw:b.hh,alongX=lW>=lD,len=Math.max(lW,lD),nMod=len>=5?2:1;
    const sLong=len/(3*nMod),sShort=Math.min(lW,lD)/3;
    for(let m=0;m<nMod;m++){
      const off=(m-(nMod-1)/2)*(len/nMod)*CS;
      const h=new THREE.Group();h.position.set(hx+(alongX?off*Math.cos(rotY):off*Math.sin(rotY)),0,hz+(alongX?-off*Math.sin(rotY):off*Math.cos(rotY)));
      h.rotation.y=rotY+((b.id*37)%100/100-.5)*.22;h.scale.set(alongX?sLong:sShort,1,alongX?sShort:sLong);houseLevel(h,b);g.add(h);
    }
    if(b.work&&b.work.kind!=='up'){ // v57: lavori al giardino: picchetti sulle celle in cantiere e legname accatastato
      for(const c of (b.work.cells||[])){const px=Sim.cx2w(c%N)-fx,pz=Sim.cy2w((c/N)|0)-fz;for(const[dx,dz]of[[-.25,-.25],[.25,.25]])bx(g,.05,.45,.05,MAT.timber,px+dx,.22,pz+dz);bx(g,.5,.03,.03,MAT.timber,px,.34,pz-.25).rotation.y=.8;}
      const nw2=Math.min(5,b.got.wood),dxw2=Sim.cx2w(b.door%N)-fx,dzw2=Sim.cy2w((b.door/N)|0)-fz;
      for(let k=0;k<nw2;k++)bx(g,.5,.08,.1,MAT.timber,dxw2+.5,.06+Math.floor(k/3)*.1,dzw2+(k%3)*.14);
    }
    if(b.work&&b.work.kind==='up'){ // v56: impalcatura attorno alla casa mentre i costruttori lavorano: più traverse con l'avanzare dei lavori, e il materiale consegnato accatastato
      const hxw=b.hw*CS/2+.14,hzw=b.hh*CS/2+.14,pr=b.prog||0;
      for(const sx of[-1,1])for(const sz of[-1,1])bx(g,.07,1.5,.07,MAT.timber,hx+sx*hxw,.75,hz+sz*hzw);
      for(let k=0;k<=Math.min(3,Math.floor(pr*4));k++){const y=.4+k*.36;for(const sz of[-1,1])bx(g,hxw*2,.05,.05,MAT.timber,hx,y,hz+sz*hzw);for(const sx of[-1,1])bx(g,.05,.05,hzw*2,MAT.timber,hx+sx*hxw,y,hz);}
      const nw=Math.min(5,b.got.wood),ns=Math.min(5,b.got.stone);
      for(let k=0;k<nw;k++)bx(g,.5,.08,.1,MAT.timber,hx+hxw+.45,.06+Math.floor(k/3)*.1,hz-.3+(k%3)*.14);
      for(let k=0;k<ns;k++)bx(g,.16,.12,.16,MAT.stoneD,hx-hxw-.4+(k%3)*.18,.08+Math.floor(k/3)*.12,hz+.2);
    }
    const gg=new THREE.Group();gg.position.set(gx,0,gz);gg.scale.setScalar(asz===3?1:asz===2?.667:.36);garden(gg,b);
    const used=new Set();if(asz>1)for(let yy=0;yy<asz;yy++)for(let xx=0;xx<asz;xx++)used.add((anc[1]+yy)*N+anc[0]+xx);else used.add(anc[1]*N+anc[0]);
    const cells=new Set(b.gcells),extra=[];
    for(const c of b.gcells)if(!used.has(c))extra.push(c);
    for(const c of (b.ext||[])){cells.add(c);extra.push(c);}
    // la staccionata ricalca il giardino ma si interrompe lungo la casa e davanti al cancello
    const skip=new Set([b.door]);for(let yy=b.hy;yy<b.hy+b.hh;yy++)for(let xx=b.hx;xx<b.hx+b.hw;xx++)skip.add(yy*N+xx);
    const fm=b.pure?MAT.cream:MAT.timber;
    if(b.gfull!==false)fenceLoops(g,OL,fx,fz,fm);
    shopProps(gg,b);
    for(const c of extra){const e2=new THREE.Group();e2.position.set(Sim.cx2w(c%N)-fx,0,Sim.cy2w((c/N)|0)-fz);{const ct=OL.cut.get(c);if(ct){e2.position.x-=Math.sign(ct[0])*CS*.2;e2.position.z-=Math.sign(ct[1])*CS*.2;}}if(b.pure){const q=(c*7+b.id)%5;if(q===0){cyl(e2,.04,.06,.4,6,MAT.timber,0,.2,0);sph(e2,.22,MAT.leaf2,0,.55,0,1,.9,1);}else if(q<3)sph(e2,.15,MAT.leaf2,0,.14,0,1.2,.8,1.2);}else if(b.crop==='herd'){sph(e2,.12,MAT.wool,0,.2,0,1.2,.9,1);}else if(b.crop==='eggs'){sph(e2,.12,MAT.hen,0,.18,0,1,.9,1.3);sph(e2,.06,MAT.henR,0,.3,.08);}else if(b.crop==='wood'){cyl(e2,.09,.09,.5,7,MAT.log,-.1,.1,0,0,Math.PI/2);cyl(e2,.09,.09,.5,7,MAT.logD,.1,.1,.05,0,Math.PI/2);cyl(e2,.09,.09,.5,7,MAT.log,0,.26,.02,0,Math.PI/2);}else{for(const rz of[-.15,.15]){bx(e2,.5,.1,.14,MAT.soil,0,.05,rz);for(let k=-1;k<=1;k++){const m=(k+(rz>0?1:0)+b.id+c)%3===0?MAT.carrot:(k%2?MAT.leaf:MAT.leaf2);sph(e2,.09,m,k*.18,.18,rz,1,1.1,1);}}}
      if(b.pure){const fl=[MAT.flower1,MAT.flower2,MAT.flower3];sph(e2,.07,fl[(c+b.id)%3],-.24,.13,-.24);sph(e2,.07,fl[(c+b.id+1)%3],.24,.13,.24);}g.add(e2);}
    g.add(gg);return g;},
  wood(b){const g=new THREE.Group();
    bx(g,3,1.3,2.6,MAT.log,-.2,.65,-.2);gable(g,3.2,2.6,1.0,MAT.thatch,1.3);g.children[g.children.length-1].position.x+=-.2;g.children[g.children.length-2].position.x+=-.2;
    bx(g,.5,.8,.06,MAT.door,-.2,.4,1.12);
    for(let i=0;i<3;i++)for(let j=0;j<=i;j++)cyl(g,.16,.16,1.5,7,MAT.logD,1.3+(j-i*.5)*.34,.17+i*.29,.9,Math.PI/2,0);
    cyl(g,.35,.4,.45,8,MAT.log,1.2,.22,-1.2);bx(g,.08,.5,.08,MAT.timber,1.2,.7,-1.2);return g;},
  quarry(b){const g=new THREE.Group();
    bx(g,3.6,.2,3.6,MAT.stoneD,0,.1,0);
    bx(g,1.4,.9,1.1,MAT.stone,-.8,.65,-.6,.2);bx(g,1.0,.6,1.2,MAT.stone,.6,.5,-.9,-.3);bx(g,1.2,.5,.9,MAT.stoneD,-.5,.45,.9,.1);bx(g,.7,.5,.7,MAT.stone,-.8,1.35,-.6,.5);
    bx(g,.15,2.3,.15,MAT.timber,1.2,1.25,1.0);bx(g,2.1,.15,.15,MAT.timber,.3,2.3,1.0);cyl(g,.02,.02,1.2,4,MAT.timber,-.6,1.7,1.0);bx(g,.4,.4,.4,MAT.stone,-.6,1.0,1.0);return g;},
  store(b){const g=new THREE.Group();
    if(b.center){
      for(const x of[-1.9,-.95,0,.95,1.9]){bx(g,.1,.9,.1,MAT.timber,x,.45,-1.9);if(Math.abs(x)>1.5)bx(g,.1,.9,.1,MAT.timber,x,.45,1.9);bx(g,.1,.9,.1,MAT.timber,-1.9,.45,x);bx(g,.1,.9,.1,MAT.timber,1.9,.45,x);}
      for(const y of[.35,.7]){bx(g,3.9,.07,.07,MAT.timber,0,y,-1.9);bx(g,.4,.07,.07,MAT.timber,-1.7,y,1.9);bx(g,.4,.07,.07,MAT.timber,1.7,y,1.9);bx(g,.07,.07,3.9,MAT.timber,-1.9,y,0);bx(g,.07,.07,3.9,MAT.timber,1.9,y,0);}
      const logs=new THREE.Group();logs.position.set(-1.0,0,1.0);
      for(let i=0;i<3;i++)for(let j=0;j<=i;j++)cyl(logs,.16,.16,1.3,7,MAT.logD,(j-i*.5)*.34,.17+i*.29,0,Math.PI/2,0);
      g.add(logs);
      const stones=new THREE.Group();stones.position.set(1.0,0,1.0);
      bx(stones,.6,.4,.5,MAT.stone,0,.2,0,.3);bx(stones,.5,.35,.5,MAT.stoneD,.5,.17,.2,.8);bx(stones,.5,.4,.4,MAT.stone,-.1,.55,.05,.1);bx(stones,.4,.3,.4,MAT.stoneD,.3,.5,-.1,.5);
      g.add(stones);g.userData.logs=logs;g.userData.stones=stones;
      if(b.stage===0){
        for(const q of[-1,1])bx(g,.08,1.0,.08,MAT.timber,q*.8,.5,-1.1);
        bx(g,1.9,.08,1.2,MAT.thatch,0,1.05,-1.2).rotation.x=.2;bx(g,1.5,.3,.5,MAT.log,0,.2,-1.4);
      }else{
        const w=b.stage===2?2.8:1.9,d=b.stage===2?1.5:1.2,hh=b.stage===2?1.6:1.2;
        bx(g,w,hh,d,MAT.plaster,0,hh/2,-1.1);bx(g,w+.08,.1,d+.08,MAT.timber,0,hh,-1.1);
        gable(g,w+.2,d,.8,b.stage===2?MAT.tile:MAT.thatch,hh);
        g.children[g.children.length-1].position.z+=-1.1;g.children[g.children.length-2].position.z+=-1.1;
        bx(g,.35,.6,.06,MAT.door,0,.3,-.48);
        if(b.stage===2){bx(g,.7,2.4,.7,MAT.stone,1.5,1.2,-1.5);cone(g,.6,.9,4,MAT.slate,1.5,2.85,-1.5,Math.PI/4);}
      }
      cyl(g,.03,.03,2.0,5,MAT.timber,0,1.0,1.9);bx(g,.5,.3,.03,MAT.red,.28,1.8,1.9);
      return g;}
    bx(g,3.4,1.7,2.9,MAT.logD,0,.85,0);for(const sx of[-1.6,0,1.6])bx(g,.12,1.7,3.0,MAT.timber,sx,.85,0);
    gable(g,3.6,2.9,1.3,MAT.tile,1.7);bx(g,.9,1.1,.06,MAT.door,0,.55,1.46);bx(g,.8,.5,.6,MAT.thatch,1.1,.25,1.8);bx(g,.5,.5,.5,MAT.log,-1.2,.25,1.8);return g;},
  church(b){const g=new THREE.Group();
    bx(g,3.4,2.6,5.0,MAT.stone,0,1.3,.5);gable(g,3.4,5.0,1.5,MAT.slate,2.6);g.children[g.children.length-1].position.z+=.5;g.children[g.children.length-2].position.z+=.5;
    bx(g,1.8,4.6,1.8,MAT.stone,0,2.3,-2.4);cone(g,1.4,2.6,4,MAT.slate,0,5.9,-2.4,Math.PI/4);
    bx(g,.1,.8,.1,MAT.gold,0,7.5,-2.4);bx(g,.45,.1,.1,MAT.gold,0,7.65,-2.4);
    bx(g,.8,1.3,.06,MAT.door,0,.65,3.02);for(const sx of[-1,1])for(const z of[0.2,1.8])bx(g,.06,.9,.35,MAT.glass,sx*1.72,1.5,z);
    bx(g,.4,.9,.06,MAT.glass,0,3.4,-1.48);return g;},
  school(b){const g=new THREE.Group();
    bx(g,3.2,1.5,2.4,MAT.plaster,0,.75,.2);bx(g,3.3,.22,2.5,MAT.stoneD,0,.11,.2);
    gable(g,3.4,2.5,1.1,MAT.tile,1.5);g.children[g.children.length-1].position.z+=.2;g.children[g.children.length-2].position.z+=.2;
    bx(g,.7,1.0,.7,MAT.timber,-1.1,2.1,-.4);cone(g,.55,.6,4,MAT.tile,-1.1,3.0,-.4,Math.PI/4);bx(g,.16,.2,.16,MAT.gold,-1.1,2.25,-.4);
    bx(g,.55,1.0,.06,MAT.door,0,.5,1.43);for(const sx of[-1,1])bx(g,.4,.45,.06,MAT.glass,sx*1.0,.95,1.43);
    for(const sx of[-.9,.9]){bx(g,.9,.07,.3,MAT.timber,sx,.3,1.85);bx(g,.07,.3,.07,MAT.timber,sx-.4,.15,1.85);bx(g,.07,.3,.07,MAT.timber,sx+.4,.15,1.85);}
    bx(g,.06,.7,.06,MAT.timber,1.5,.35,1.7);bx(g,.5,.3,.05,MAT.cloth,1.5,.8,1.7);
    return g;},
  infirmary(b){const g=new THREE.Group();
    bx(g,3.2,1.4,2.4,MAT.plaster,0,.7,.2);bx(g,3.3,.2,2.5,MAT.stoneD,0,.1,.2);
    gable(g,3.4,2.5,1.0,MAT.slate,1.4);g.children[g.children.length-1].position.z+=.2;g.children[g.children.length-2].position.z+=.2;
    bx(g,.55,1.0,.06,MAT.door,0,.5,1.43);bx(g,.16,.7,.05,MAT.red,0,1.7,1.45);bx(g,.6,.16,.05,MAT.red,0,1.7,1.45);
    for(const sx of[-1,1])bx(g,.4,.45,.06,MAT.glass,sx*1.0,.95,1.43);
    chim(g,1.1,2.1,-.5,.6);
    for(const sx of[-1,0,1]){bx(g,.7,.12,.5,MAT.soil,sx*.9,.08,1.95);for(let k=0;k<3;k++)sph(g,.11,k%2?MAT.leaf2:MAT.leaf,sx*.9-.22+k*.22,.24,1.95,1,1.1,1);}
    bx(g,.06,.7,.06,MAT.timber,1.7,.35,1.9);bx(g,.5,.3,.05,MAT.white||MAT.cream,1.7,.8,1.9);bx(g,.1,.22,.06,MAT.red,1.7,.8,1.93);bx(g,.22,.08,.06,MAT.red,1.7,.8,1.93);
    return g;},
  cemetery(b){const g=new THREE.Group();
    const dw=b.w*CS,dh=b.h*CS,hw=dw/2-.1,hh=dh/2-.1;
    for(let x=-hw;x<=hw+.01;x+=.7){bx(g,.08,.5,.08,MAT.timber,x,.25,-hh);bx(g,.08,.5,.08,MAT.timber,x,.25,hh);}
    for(let z=-hh;z<=hh+.01;z+=.7){bx(g,.08,.5,.08,MAT.timber,-hw,.25,z);bx(g,.08,.5,.08,MAT.timber,hw,.25,z);}
    for(const y of[.2,.4]){bx(g,dw-.2,.05,.05,MAT.timber,0,y,-hh);bx(g,dw-.2,.05,.05,MAT.timber,0,y,hh);bx(g,.05,.05,dh-.2,MAT.timber,-hw,y,0);bx(g,.05,.05,dh-.2,MAT.timber,hw,y,0);}
    bx(g,.1,1.1,.1,MAT.stoneD,0,.55,0);bx(g,.5,.1,.1,MAT.stoneD,0,.85,0);
    const gv=[];const cols=Math.max(2,Math.floor((dw-.8)/.7)),rows=Math.max(1,Math.floor((dh-.8)/.7));
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const x=-dw/2+.55+i*((dw-1.1)/Math.max(1,cols-1)),z=-dh/2+.55+j*((dh-1.1)/Math.max(1,rows-1));
      if(Math.abs(x)<.45&&Math.abs(z)<.45)continue;
      const st=new THREE.Group();st.position.set(x,0,z);
      const cross=(i+j*3+b.id)%3===0;
      if(cross){bx(st,.08,.45,.08,MAT.stone,0,.22,0);bx(st,.3,.08,.08,MAT.stone,0,.34,0);}else{bx(st,.28,.4,.09,MAT.stone,0,.2,0);}
      bx(st,.34,.04,.5,MAT.soil,0,.02,.3);
      st.visible=false;g.add(st);gv.push(st);}
    cone(g,.3,1.5,6,MAT.leaf2,-dw/2+.3,.75,-dh/2+.3);cone(g,.3,1.5,6,MAT.leaf2,dw/2-.3,.75,-dh/2+.3);
    g.userData.gv=gv;return g;},
  well(b){const g=new THREE.Group();
    cyl(g,.6,.66,.6,12,MAT.stone,0,.3,0);cyl(g,.45,.45,.05,12,MAT.water,0,.58,0);
    bx(g,.1,1.3,.1,MAT.timber,-.55,.95,0);bx(g,.1,1.3,.1,MAT.timber,.55,.95,0);bx(g,1.3,.1,.1,MAT.timber,0,1.6,0);
    gable(g,1.1,1.0,.4,MAT.thatch,1.62);cyl(g,.015,.015,.5,4,MAT.timber,0,1.3,0);cyl(g,.1,.08,.14,8,MAT.logD,0,1.02,0);return g;},
  stall(b){const g0=new THREE.Group(),g=new THREE.Group();g.scale.setScalar(.86);g0.add(g);  // v31.1: il banco sta in 2×2 celle, più piccolo delle case
    bx(g,1.4,.1,.8,MAT.log,0,.55,0);bx(g,1.3,.5,.1,MAT.logD,0,.25,.3);bx(g,1.3,.5,.1,MAT.logD,0,.25,-.3);
    for(const sx of[-1,1])for(const sz of[-1,1])bx(g,.07,1.35,.07,MAT.timber,sx*.65,.68,sz*.4);
    const aw=(b.id%2)?MAT.red:MAT.blue;
    for(let k=0;k<4;k++)bx(g,.36,.05,1.0,k%2?MAT.cream:aw,-.54+k*.36,1.42-k*0,0).rotation.x=0;
    bx(g,.3,.2,.3,MAT.veg,-.4,.7,0);bx(g,.3,.2,.3,MAT.egg,0,.7,0);bx(g,.3,.2,.3,MAT.grain,.4,.7,0);return g0;},
  mine(b){const g=new THREE.Group();
    bx(g,3.6,.18,3.6,MAT.stoneD,0,.09,0);
    bx(g,2.0,1.6,1.4,MAT.stone,-.4,.8,-1.0);bx(g,1.0,1.0,.2,MAT.door,-.4,.5,-.28);
    bx(g,.12,1.2,.12,MAT.timber,-.95,.7,-.2);bx(g,.12,1.2,.12,MAT.timber,.15,.7,-.2);bx(g,1.4,.12,.14,MAT.timber,-.4,1.3,-.2);
    for(let k=0;k<3;k++)bx(g,.6,.3,.5,MAT.rust,1.1+k*.15,.18+k*.3,.9-k*.2,k);
    bx(g,.8,.3,.5,MAT.log,1.0,.2,-.2);cyl(g,.18,.18,.08,8,MAT.iron,1.0,.38,-.2);
    bx(g,.1,2.0,.1,MAT.timber,1.4,1.0,-1.2);bx(g,.6,.1,.1,MAT.timber,1.2,2.0,-1.2);return g;},
  forester(b){const g=new THREE.Group();
    bx(g,2.2,1.2,1.8,MAT.log,-.2,.6,-.3);gable(g,2.4,1.8,.9,MAT.thatch,1.2);for(const k of[1,2]){const sl=g.children[g.children.length-k];sl.position.x+=-.2;sl.position.z+=-.3;}
    bx(g,.45,.8,.06,MAT.door,-.2,.4,.62);
    for(let k=0;k<4;k++){cone(g,.28,.7,5,MAT.leaf2,1.0+k*.28,.35,.9+(k%2)*.3,0);bx(g,.07,.18,.07,MAT.timber,1.0+k*.28,.1,.9+(k%2)*.3);}
    bx(g,.7,.2,.5,MAT.soil,1.2,.1,1.2);cyl(g,.03,.03,1.1,4,MAT.timber,1.9,.55,.2);bx(g,.4,.08,.08,MAT.iron,1.95,1.05,.2);return g;},
  granary(b){const g=new THREE.Group();
    for(const sx of[-.9,.9])for(const sz of[-.9,.9])cyl(g,.12,.14,.55,6,MAT.stoneD,sx,.28,sz);
    bx(g,2.2,1.5,2.2,MAT.wattle,0,1.3,0);for(const y of[.9,1.4,1.9])bx(g,2.28,.07,2.28,MAT.timber,0,y,0);
    cone(g,1.9,1.1,4,MAT.thatch,0,2.55,0,Math.PI/4);bx(g,.5,.7,.06,MAT.door,0,1.0,1.12);
    for(let k=0;k<3;k++)sph(g,.2,MAT.grain,-1.5+k*.1,.2+k*.05,1.4,1,.7,1);return g;},
  mill(b){const g=new THREE.Group();
    cyl(g,.9,1.2,2.6,10,MAT.plaster,0,1.3,0);cone(g,1.15,1.1,10,MAT.thatch,0,3.1,0,0);
    bx(g,.5,.8,.06,MAT.door,0,.4,1.18);
    const sails=new THREE.Group();sails.position.set(0,2.4,1.25);
    for(let k=0;k<4;k++){const arm=new THREE.Group();arm.rotation.z=k*Math.PI/2;bx(arm,.12,2.8,.08,MAT.timber,0,1.4,0);bx(arm,.7,1.7,.04,MAT.cream,.4,1.8,0);sails.add(arm);}
    g.add(sails);g.userData.sails=sails;
    bx(g,.5,.4,.5,MAT.flour,1.5,.2,.9);bx(g,.5,.4,.5,MAT.flour,1.7,.2,1.4);return g;},
  inn(b){const g=new THREE.Group();
    bx(g,3.4,1.4,2.2,MAT.plaster,-1.0,.7,0);bx(g,3.5,.1,2.3,MAT.timber,-1.0,1.4,0);bx(g,3.0,1.0,1.9,MAT.plaster,-1.0,1.95,0);
    for(const x of[-2.6,-1.0,.6]){bx(g,.1,2.4,.1,MAT.timber,x,1.2,1.15);}
    gable(g,3.6,2.4,1.0,MAT.tile,2.5);for(const k of[1,2]){g.children[g.children.length-k].position.x+=-1.0;}
    bx(g,.55,.9,.06,MAT.door,-1.0,.45,1.12);bx(g,.3,.35,.06,MAT.glass,-1.9,.8,1.12);bx(g,.3,.35,.06,MAT.glass,-.1,.8,1.12);bx(g,.3,.35,.06,MAT.glass,-1.5,1.9,.97);bx(g,.3,.35,.06,MAT.glass,-.5,1.9,.97);
    bx(g,.4,.9,.4,MAT.stoneD,-2.0,2.9,-.5);
    cyl(g,.03,.03,1.0,4,MAT.timber,.2,1.5,1.3);bx(g,.5,.4,.05,MAT.gold,.45,1.7,1.3);
    // stalla con cavalli
    bx(g,1.5,1.0,2.0,MAT.logD,2.7,.5,0);bx(g,1.7,.1,2.2,MAT.thatch,2.7,1.1,0).rotation.z=.12;bx(g,.9,.8,.06,MAT.door,2.7,.4,1.02);
    bx(g,.9,.5,.5,MAT.horse,2.7,.55,-.2);sph(g,.2,MAT.horse,3.2,.8,-.2);bx(g,.4,.35,.4,MAT.hay,2.2,.2,.7);return g;},
  sheepfold(b){const g=new THREE.Group();
    for(const sx of[-1.7,1.7])for(let k=-1.7;k<=1.7;k+=.85){bx(g,.08,.5,.08,MAT.timber,sx,.25,k);bx(g,.08,.5,.08,MAT.timber,k,.25,sx);}
    for(const y of[.2,.4]){bx(g,3.5,.05,.05,MAT.timber,0,y,-1.7);bx(g,3.5,.05,.05,MAT.timber,0,y,1.7);bx(g,.05,.05,3.5,MAT.timber,-1.7,y,0);bx(g,.05,.05,3.5,MAT.timber,1.7,y,0);}
    bx(g,1.3,.9,1.0,MAT.log,-.7,.45,-1.0);bx(g,1.5,.1,1.2,MAT.thatch,-.7,1.0,-1.0).rotation.z=.12;
    for(const [px,pz,r] of[[.7,.3,.5],[-.3,.9,2],[1.0,-.6,1],[.1,.2,3],[-1.1,.3,.2]]){bx(g,.5,.32,.32,MAT.wool,px,.33,pz,r);sph(g,.12,MAT.timber,px+Math.cos(r)*.3,.38,pz-Math.sin(r)*.3);}
    return g;},
  plaza(b){const g=new THREE.Group();
    bx(g,5.8,.1,5.8,MAT.sand,0,.05,0);bx(g,4.6,.12,4.6,MAT.stone,0,.1,0);
    cyl(g,1.25,1.3,.5,16,MAT.stoneD,0,.35,0);cyl(g,1.05,1.05,.06,16,MAT.fount,0,.6,0);
    cyl(g,.18,.22,1.2,8,MAT.stone,0,1.1,0);cyl(g,.55,.45,.12,12,MAT.stone,0,1.7,0);cyl(g,.3,.3,.04,10,MAT.fount,0,1.78,0);
    for(const [x,z] of[[-2.2,-2.2],[2.2,2.2],[-2.2,2.2],[2.2,-2.2]]){bx(g,.5,.4,.5,MAT.stoneD,x,.3,z);sph(g,.22,MAT.flower1,x,.6,z);}
    for(const [x,z] of[[0,2.3],[0,-2.3]])bx(g,1.2,.25,.3,MAT.log,x,.25,z);return g;},
  flowers(b){const g=new THREE.Group();
    bx(g,1.5,.2,1.5,MAT.log,0,.1,0);bx(g,1.3,.1,1.3,MAT.soil,0,.22,0);
    const cols=[MAT.flower1,MAT.flower2,MAT.flower3];
    for(let k=0;k<7;k++)sph(g,.1,cols[(k+b.id)%3],-.45+(k%3)*.45,.35,-.4+((k/3)|0)*.4,1,1,1);return g;},
  statue(b){const g=new THREE.Group();
    bx(g,1.2,.4,1.2,MAT.stoneD,0,.2,0);bx(g,.8,.8,.8,MAT.stone,0,.8,0);
    cyl(g,.2,.3,.9,8,MAT.stone,0,1.65,0);sph(g,.2,MAT.stone,0,2.25,0);bx(g,.1,.8,.1,MAT.stone,.3,1.9,0).rotation.z=-.5;
    bx(g,.6,.02,.35,MAT.gold,0,.62,.41);return g;},
  farm(b){const g=new THREE.Group();
    bx(g,3.0,1.5,2.3,MAT.logD,-.2,.75,-.5);gable(g,3.2,2.3,1.2,MAT.tile,1.5);for(const k of[1,2]){const sl=g.children[g.children.length-k];sl.position.x+=-.2;sl.position.z+=-.5;}
    bx(g,.9,1.1,.06,MAT.door,-.2,.55,.68);cyl(g,.5,.55,2.0,10,MAT.plaster,1.35,1.0,-1.0);cone(g,.65,.7,10,MAT.tile,1.35,2.35,-1.0,0);
    cone(g,.45,.9,8,MAT.hay,-1.2,.45,1.2,0);cone(g,.4,.8,8,MAT.hay,-.6,.4,1.45,0);return g;},
  // v32: edifici lavorativi
  carpenter(b){const g=new THREE.Group();
    bx(g,2.8,1.4,2.0,MAT.logD,-.2,.7,-.6);for(const y of[.35,.7,1.05])bx(g,2.88,.05,2.08,MAT.timber,-.2,y,-.6);
    gab(g,3.0,2.2,.9,MAT.thatch,1.4,-.2,-.6);bx(g,.8,1.0,.06,MAT.door,-.2,.5,.42);bx(g,.22,.22,.06,MAT.glass,.85,.85,.42);
    for(const sx of[-1.2,1.1])bx(g,.1,1.1,.1,MAT.timber,sx,.55,1.55);
    bx(g,2.6,.08,1.1,MAT.thatch,-.05,1.15,1.3).rotation.x=-.14;
    for(let k=0;k<6;k++)bx(g,1.2,.07,.36,MAT.hay,.7,.1+k*.09,1.4);
    bx(g,.9,.08,.4,MAT.log,-.8,.55,1.45);for(const sx of[-1.15,-.45])bx(g,.07,.55,.07,MAT.timber,sx,.28,1.45);
    bx(g,.5,.05,.2,MAT.iron,-.8,.62,1.45);
    for(let i=0;i<3;i++)cyl(g,.17,.17,1.2,7,MAT.log,1.65,.17+(i===2?.28:0),-.2+(i%2)*.33-.15*(i===2?1:0),0,Math.PI/2);
    return g;},
  mason(b){const g=new THREE.Group();
    bx(g,3.0,.2,3.4,MAT.stoneD,0,.1,0);
    bx(g,2.4,1.3,1.6,MAT.stone,-.4,.85,-1.0);bx(g,2.5,.12,1.7,MAT.stoneD,-.4,1.5,-1.0);gab(g,2.6,1.7,.7,MAT.slate,1.56,-.4,-1.0);
    bx(g,.7,.95,.06,MAT.door,-.4,.58,-.18);
    for(const [x,z,s] of[[1.1,.4,.6],[1.35,.45,.5],[1.2,.3,.55],[-1.2,.9,.5],[-.6,1.0,.45]])bx(g,s,s*.8,s,MAT.stone,x,.2+s*.4,z,x);
    for(const sx of[-.3,.9]){bx(g,.1,2.0,.1,MAT.timber,sx,1.1,.9).rotation.z=sx<0?.18:-.18;}
    bx(g,1.3,.1,.1,MAT.timber,.3,2.0,.9);cyl(g,.015,.015,.8,4,MAT.timber,.5,1.55,.9);bx(g,.4,.3,.4,MAT.stone,.5,1.05,.9);
    bx(g,.8,.5,.5,MAT.stone,-1.3,.45,1.2);bx(g,.06,.5,.06,MAT.iron,-1.1,.9,1.2);bx(g,.3,.06,.06,MAT.iron,-1.1,1.15,1.2);
    return g;},
  smithy(b){const g=new THREE.Group();
    bx(g,2.7,1.45,2.0,MAT.stone,-.1,.72,-.6);bx(g,2.8,.1,2.1,MAT.timber,-.1,1.45,-.6);gab(g,2.9,2.2,.8,MAT.slate,1.5,-.1,-.6);
    bx(g,.9,.9,.06,MAT.door,-.9,.45,.42);
    bx(g,.8,2.5,.8,MAT.stoneD,.9,1.25,-.9);bx(g,.95,.14,.95,MAT.stone,.9,2.55,-.9);
    bx(g,.8,.7,.7,MAT.stoneD,1.0,.35,.2);bx(g,.5,.16,.4,MAT.fire,1.0,.78,.2);
    bx(g,.55,.3,.35,MAT.iron,.1,.58,1.0);bx(g,.24,.25,.24,MAT.logD,.1,.28,1.0);bx(g,.12,.12,.12,MAT.iron,.38,.7,1.0);
    bx(g,.8,.4,.55,MAT.iron,-1.1,.2,1.25);bx(g,.3,.25,.3,MAT.rust,-.5,.15,1.3);
    for(const sx of[-.4,-.1])bx(g,.04,.6,.04,MAT.timber,sx,.8,.9);
    return g;},
  bakery(b){const g=new THREE.Group();
    bx(g,2.6,1.3,2.0,MAT.plaster,-.2,.65,-.6);for(const sx of[-1.4,.95])bx(g,.1,1.3,2.1,MAT.timber,sx,.65,-.6);
    bx(g,2.7,.1,2.1,MAT.timber,-.2,1.3,-.6);gab(g,2.8,2.2,.85,MAT.tile,1.35,-.2,-.6);
    bx(g,.6,.95,.06,MAT.door,-.7,.48,.42);bx(g,.4,.4,.06,MAT.glass,.2,.8,.42);
    sph(g,.8,MAT.stoneD,1.45,.6,.4,1.1,.85,1.1);bx(g,.36,.3,.06,MAT.fire,1.45,.42,1.1);chim(g,1.45,1.5,.35,.8);
    bx(g,1.3,.08,.6,MAT.log,-.4,.62,1.2);for(const sx of[-.95,.15])bx(g,.07,.62,.07,MAT.timber,sx,.31,1.2);
    for(let k=0;k<4;k++)sph(g,.13,MAT.hay,-.8+k*.32,.78,1.2,1.3,.7,.9);
    bx(g,.5,.35,.05,MAT.gold,-.7,1.15,.45);
    for(const sx of[1.1,1.7])bx(g,.4,.4,.4,MAT.flour,sx,.2,-1.5);
    return g;},
  weaver(b){const g=new THREE.Group();
    bx(g,2.7,1.2,2.0,MAT.wattle,-.2,.6,-.6);for(const x of[-1.1,-.4,.3,1.0])bx(g,.07,1.2,2.04,MAT.timber,x-.0,.6,-.6);
    gab(g,2.9,2.2,.85,MAT.thatch,1.2,-.2,-.6);bx(g,.6,.95,.06,MAT.door,-.9,.48,.42);bx(g,.4,.4,.06,MAT.glass,.3,.75,.42);
    // telaio all'aperto con tessuti a strisce
    for(const sx of[.9,1.9])bx(g,.1,1.5,.1,MAT.timber,sx,.75,1.2);bx(g,1.2,.1,.1,MAT.timber,1.4,1.5,1.2);bx(g,1.2,.1,.1,MAT.timber,1.4,.3,1.2);
    for(let k=0;k<6;k++)bx(g,.14,1.1,.04,k%2?MAT.red:MAT.blue,1.0+k*.18,.9,1.2);
    for(const [x,z] of[[-1.5,1.0],[-1.0,1.3],[-1.35,1.5]])sph(g,.3,MAT.wool,x,.3,z,1,.8,1);
    return g;},
  retting(b){const g=new THREE.Group();
    bx(g,2.2,1.1,1.8,MAT.wattle,-.6,.55,-.9);for(const x of[-1.4,-.6,.2])bx(g,.07,1.1,1.84,MAT.timber,x,.55,-.9);
    gab(g,2.4,1.9,.75,MAT.thatch,1.1,-.6,-.9);bx(g,.55,.85,.06,MAT.door,-.9,.42,.02);
    // vasca per la macerazione, steli in fascio e fibra stesa ad asciugare
    bx(g,1.7,.35,1.1,MAT.logD,1.0,.18,1.0);bx(g,1.5,.05,.9,MAT.water,1.0,.33,1.0);
    for(let k=0;k<5;k++)cyl(g,.05,.05,1.0,5,MAT.hay,.5+k*.08,.4,1.0,0,Math.PI/2);
    for(const sx of[-1.9,-1.1])bx(g,.07,1.1,.07,MAT.timber,sx,.55,.9);bx(g,.9,.05,.05,MAT.timber,-1.5,1.05,.9);
    for(let k=0;k<5;k++)bx(g,.08,.6,.03,MAT.cream,-1.8+k*.16,.74,.9);
    return g;},
  ropewalk(b){const g=new THREE.Group();
    bx(g,2.2,1.2,1.7,MAT.log,-.9,.6,-.8);for(const y of[.2,.5,.8,1.1])bx(g,2.26,.05,1.76,MAT.logD,-.9,y,-.8);
    gab(g,2.4,1.8,.75,MAT.thatch,1.2,-.9,-.8);bx(g,.55,.85,.06,MAT.door,-.9,.42,.08);
    // lunga corsia con pali: la corda si torce camminando all'indietro
    for(let k=0;k<4;k++){bx(g,.08,.9,.08,MAT.timber,.5+k*.7,.45,1.1);}
    bx(g,2.2,.04,.04,MAT.cream,1.55,.8,1.1);bx(g,2.2,.04,.04,MAT.hay,1.55,.7,1.1);
    for(let k=0;k<3;k++)cyl(g,.22,.22,.14,10,MAT.cream,-.2+k*.4,.15,1.3,Math.PI/2,0);
    bx(g,.5,.35,.4,MAT.timber,2.6,.2,1.1);cyl(g,.12,.12,.4,8,MAT.hay,2.6,.5,1.1);
    return g;},
  charcoal(b){const g=new THREE.Group();
    bx(g,1.8,1.0,1.5,MAT.logD,-1.0,.5,-.9);for(const y of[.2,.5,.8])bx(g,1.86,.05,1.56,MAT.timber,-1.0,y,-.9);
    gab(g,2.0,1.7,.65,MAT.thatch,1.0,-1.0,-.9);bx(g,.5,.8,.06,MAT.door,-1.0,.4,-.12);
    // tre cataste di legna coperte di terra (carbonaie), fumo e fascine
    for(const [x,z] of[[.6,.4],[1.6,.6],[1.1,-.9]]){sph(g,.8,MAT.soil,x,.15,z,1,.8,1);cyl(g,.08,.08,.3,6,MAT.stoneD,x,.9,z);}
    for(let k=0;k<5;k++)cyl(g,.08,.08,.9,5,MAT.log,-1.9+k*.14,.12,.8,0,Math.PI/2);
    return g;},
  smelter(b){const g=new THREE.Group();
    bx(g,2.4,.9,2.0,MAT.stoneD,-.4,.45,-.6);bx(g,2.5,.1,2.1,MAT.stone,-.4,.95,-.6);
    // alto forno di pietra con camino e bocca incandescente
    bx(g,1.2,2.3,1.2,MAT.stoneD,.2,1.15,-.7);bx(g,1.3,.12,1.3,MAT.stone,.2,2.35,-.7);chim(g,.2,2.5,-.7,.8);
    bx(g,.5,.5,.06,MAT.fire,.2,.5,-.08);bx(g,.35,.3,.06,MAT.fire,.2,1.2,-.08);
    bx(g,.6,.95,.06,MAT.door,-1.2,.48,.42);
    for(let k=0;k<3;k++)bx(g,.5,.14,.2,MAT.iron,-1.2+k*.55,.1,1.3);
    for(const sx of[.9,1.3])bx(g,.4,.3,.4,MAT.rust,sx,.15,1.2);
    return g;},
  dyehouse(b){const g=new THREE.Group();
    bx(g,2.2,1.2,1.8,MAT.plaster,-.7,.6,-.9);for(const x of[-1.5,-.7,.1])bx(g,.07,1.2,1.84,MAT.timber,x,.6,-.9);
    gab(g,2.4,1.9,.75,MAT.tile,1.2,-.7,-.9);bx(g,.55,.85,.06,MAT.door,-1.0,.42,.02);chim(g,-.2,1.6,-1.3,.7);
    // tre tini di tintura e tessuti stesi ad asciugare
    for(const [x,c] of[[.7,MAT.red],[1.4,MAT.blue],[2.1,MAT.leaf]]){cyl(g,.32,.3,.5,10,MAT.logD,x,.25,.9);cyl(g,.26,.26,.04,10,c,x,.5,.9);}
    for(const sx of[-1.9,-.3])bx(g,.07,1.3,.07,MAT.timber,sx,.65,1.0);bx(g,1.8,.05,.05,MAT.timber,-1.1,1.3,1.0);
    for(const [x,c] of[[-1.7,MAT.red],[-1.3,MAT.blue],[-.9,MAT.red],[-.5,MAT.blue]])bx(g,.3,.7,.03,c,x,.9,1.0);
    return g;},
  tailor(b){const g=new THREE.Group();
    bx(g,2.6,1.35,2.0,MAT.plaster,-.2,.68,-.6);bx(g,2.7,.1,2.1,MAT.timber,-.2,1.35,-.6);gab(g,2.8,2.2,.8,MAT.tile,1.4,-.2,-.6);
    bx(g,.6,.95,.06,MAT.door,-.6,.48,.42);bx(g,.5,.5,.06,MAT.glass,.5,.85,.42);
    for(let k=0;k<5;k++)bx(g,.28,.05,.9,k%2?MAT.red:MAT.cream,-1.0+k*.28,1.0,1.0).rotation.x=-.4;
    for(const sx of[-1.1,.3])bx(g,.06,.75,.06,MAT.timber,sx,.5,1.45);
    cyl(g,.1,.16,.8,7,MAT.timber,1.3,.4,1.1);sph(g,.16,MAT.plaster,1.3,.95,1.1);bx(g,.4,.5,.25,MAT.cloth,1.3,.62,1.1);
    for(const [x,c] of[[-.7,MAT.blue],[-.4,MAT.red],[-.1,MAT.cloth]])cyl(g,.13,.13,.7,8,c,x,.14,1.25,0,Math.PI/2);
    return g;},
  fisher(b){const g=new THREE.Group();
    bx(g,2.2,1.2,1.7,MAT.log,-.3,.6,-.8);for(const y of[.2,.5,.8,1.1])bx(g,2.26,.05,1.76,MAT.logD,-.3,y,-.8);
    gab(g,2.4,1.8,.75,MAT.thatch,1.2,-.3,-.8);bx(g,.55,.85,.06,MAT.door,-.3,.42,.08);
    for(const sx of[.9,1.9])bx(g,.07,1.2,.07,MAT.timber,sx,.6,.5);bx(g,1.2,.06,.06,MAT.timber,1.4,1.2,.5);
    for(let k=0;k<4;k++){bx(g,.07,.3,.05,MAT.fishM,1.05+k*.25,1.0,.5);}
    // barca e rete
    bx(g,1.5,.25,.6,MAT.logD,-1.0,.14,1.4);bx(g,1.2,.06,.4,MAT.log,-1.0,.3,1.4);cyl(g,.03,.03,1.1,4,MAT.timber,-1.0,.85,1.4);
    bx(g,.9,.04,.7,MAT.cream,.9,.05,1.3);bx(g,.06,.4,.06,MAT.timber,.5,.2,1.0);bx(g,.06,.4,.06,MAT.timber,1.3,.2,1.0);
    return g;},
  hunter(b){const g=new THREE.Group();
    bx(g,2.2,1.2,1.8,MAT.logD,-.3,.6,-.7);for(const y of[.2,.5,.8,1.1])bx(g,2.26,.05,1.86,MAT.timber,-.3,y,-.7);
    gab(g,2.4,1.9,.8,MAT.thatch,1.2,-.3,-.7);bx(g,.55,.85,.06,MAT.door,-.3,.42,.22);
    for(const sx of[-.1,.1]){bx(g,.05,.35,.05,MAT.cream,sx,1.55,.25).rotation.z=sx*3;}bx(g,.35,.08,.08,MAT.timber,0,1.4,.25);
    // pelli stese e carne appesa
    for(const sx of[.9,1.9])bx(g,.07,1.3,.07,MAT.timber,sx,.65,.9);bx(g,1.2,.06,.06,MAT.timber,1.4,1.3,.9);
    bx(g,.4,.7,.04,MAT.horse,1.1,.9,.9);bx(g,.4,.6,.04,MAT.wool,1.7,.95,.9);
    for(const x of[1.25,1.55])bx(g,.12,.3,.1,MAT.meatM,x,1.1,.55);
    // bersaglio e ceppo
    cyl(g,.4,.4,.06,10,MAT.cream,-1.4,.7,1.1,Math.PI/2,0);cyl(g,.18,.18,.06,10,MAT.red,-1.4,.7,1.14,Math.PI/2,0);bx(g,.07,.7,.07,MAT.timber,-1.4,.35,1.05);
    return g;},
  tavern(b){const g=new THREE.Group();
    bx(g,3.6,1.3,2.2,MAT.plaster,-.2,.65,-.2);bx(g,3.7,.1,2.3,MAT.timber,-.2,1.3,-.2);bx(g,3.2,1.0,2.0,MAT.plaster,-.2,1.85,-.2);
    for(const x of[-1.7,-.5,.7,1.3])bx(g,.1,2.3,.1,MAT.timber,x,1.15,.95);
    gab(g,3.8,2.3,1.0,MAT.tile,2.35,-.2,-.2);
    bx(g,.6,.95,.06,MAT.door,-.2,.48,.92);for(const x of[-1.2,.8])bx(g,.4,.4,.06,MAT.glass,x,.8,.92);for(const x of[-1.0,-.2,.6])bx(g,.3,.35,.06,MAT.glass,x,1.85,.82);
    chim(g,1.1,2.9,-.7,.7);
    // insegna con boccale e botti
    bx(g,.08,.08,.7,MAT.timber,1.75,1.7,1.25);bx(g,.5,.4,.05,MAT.gold,1.75,1.4,1.55);cyl(g,.1,.1,.18,8,MAT.logD,1.75,1.4,1.59,Math.PI/2,0);
    for(const [x,z] of[[-1.9,1.2],[-1.5,1.35],[-1.7,.95]])cyl(g,.26,.26,.5,10,MAT.logD,x,.25,z);
    bx(g,.8,.06,.4,MAT.log,.9,.5,1.35);for(const sx of[.6,1.2])bx(g,.06,.5,.06,MAT.timber,sx,.25,1.35);
    return g;},
  mercery(b){const g=new THREE.Group();
    bx(g,3.4,1.2,2.2,MAT.plaster,-.2,.6,-.2);bx(g,3.5,.1,2.3,MAT.timber,-.2,1.2,-.2);bx(g,3.0,.9,2.0,MAT.wattle,-.2,1.7,-.2);
    for(const x of[-1.7,-.5,.9,1.3])bx(g,.09,2.15,.09,MAT.timber,x,1.07,.93);
    gab(g,3.6,2.1,1.0,MAT.tile,2.15,-.2,-.2);
    bx(g,.55,.9,.06,MAT.door,.6,.46,.92);bx(g,1.3,.6,.06,MAT.glass,-.9,.8,.92);for(const x of[-.9,.3])bx(g,.4,.4,.06,MAT.glass,x,1.75,.82);
    chim(g,1.0,2.7,-.7,.7);
    // tettoia rossa sul banco e pezze di stoffa colorate
    bx(g,2.6,.07,.9,MAT.red,-.5,1.1,1.4).rotation.x=.3;
    for(const x of[-1.75,.75])bx(g,.06,1.1,.06,MAT.timber,x,.55,1.8);
    bx(g,2.2,.5,.45,MAT.log,-.5,.25,1.45);
    for(const [c,x] of[[MAT.cloth,-1.3],[MAT.blue,-.95],[MAT.cream,-.6],[MAT.gold,-.25],[MAT.leaf,.1]])bx(g,.28,.3,.32,c,x,.65,1.45);
    // insegna a bandiera con rocchetto d'oro
    bx(g,.08,.08,.7,MAT.timber,1.75,1.7,1.25);bx(g,.45,.45,.05,MAT.plaster,1.75,1.38,1.58);cyl(g,.12,.12,.16,8,MAT.gold,1.75,1.38,1.64,Math.PI/2,0);
    // balle di tessuto e cassette accanto alla porta
    cyl(g,.2,.2,.5,10,MAT.cloth,1.3,.25,1.4);bx(g,.4,.3,.4,MAT.fw,1.45,.15,1.0);
    return g;},
  hall(b){const g=new THREE.Group();
    bx(g,4.6,.18,5.0,MAT.stoneD,0,.09,0);
    bx(g,4.0,1.9,2.4,MAT.plaster,0,1.1,-1.1);for(const x of[-1.9,-.95,0,.95,1.9])bx(g,.12,1.9,2.5,MAT.timber,x,1.1,-1.1);
    bx(g,4.1,.12,2.5,MAT.timber,0,2.05,-1.1);gab(g,4.3,2.6,1.4,MAT.tile,2.1,0,-1.1);
    bx(g,.9,1.3,.06,MAT.door,0,.8,.12);for(const x of[-1.4,1.4])bx(g,.5,.7,.06,MAT.glass,x,1.2,.12);
    // stendardi, falò e tavolate
    for(const [x,c] of[[-2.2,MAT.red],[2.2,MAT.blue]]){bx(g,.07,2.6,.07,MAT.timber,x,1.3,.5);bx(g,.5,.8,.04,c,x+.28,2.1,.5);bx(g,.2,.2,.05,MAT.gold,x+.28,2.1,.53);}
    for(let k=0;k<4;k++)bx(g,.16,.12,.16,MAT.log,-.1+(k%2)*.2,.2+(k>>1)*.1,1.5);bx(g,.3,.35,.3,MAT.fire,.0,.46,1.5);
    for(const sx of[-1.5,1.5]){bx(g,1.2,.07,.45,MAT.log,sx,.55,1.5);bx(g,.06,.5,.06,MAT.timber,sx-.5,.27,1.5);bx(g,.06,.5,.06,MAT.timber,sx+.5,.27,1.5);bx(g,1.2,.05,.2,MAT.logD,sx,.3,1.9);bx(g,1.2,.05,.2,MAT.logD,sx,.3,1.1);}
    cyl(g,.05,.05,2.2,6,MAT.timber,-.1,1.1,-2.0);return g;}
};
BUILD.tent=function(b){const g=new THREE.Group();
  gable(g,1.25,1.15,.75,MAT.cream,0);bx(g,.34,.5,.04,MAT.door,0,.25,.6);
  for(const sx of[-.62,.62])cyl(g,.03,.03,.9,5,MAT.timber,sx,.45,.55);bx(g,.05,.05,1.15,MAT.timber,0,.82,0);
  bx(g,.4,.12,.4,MAT.timber,.9,.06,.4);return g;};
BUILD.watchtower=function(b){const g=new THREE.Group();
  bx(g,1.9,.5,1.9,MAT.stoneD,0,.25,0);bx(g,1.5,3.6,1.5,MAT.stone,0,2.3,0);bx(g,2.1,.4,2.1,MAT.timber,0,4.3,0);
  for(const sx of[-.95,.95])for(const sz of[-.95,.95])bx(g,.14,.7,.14,MAT.timber,sx,4.8,sz);
  for(const sx of[-.95,.95])bx(g,.08,.14,1.9,MAT.timber,sx,5.05,0);
  for(const sz of[-.95,.95])bx(g,1.9,.14,.08,MAT.timber,0,5.05,sz);
  cone(g,1.6,1.3,4,MAT.slate,0,5.7,0,Math.PI/4);bx(g,.5,.9,.06,MAT.door,0,.45,.77);
  cyl(g,.03,.03,1.1,5,MAT.timber,.9,6.3,.9);bx(g,.6,.35,.03,MAT.red,1.2,6.6,.9);return g;};
BUILD.barracks=function(b){const g=new THREE.Group();
  bx(g,3.6,.4,3.4,MAT.stoneD,0,.2,0);bx(g,3.4,1.6,3.0,MAT.stone,0,1.2,0);gable(g,3.6,3.0,1.2,MAT.slate,2.0);
  bx(g,.9,1.2,.06,MAT.door,0,.8,1.52);for(const sx of[-1.1,1.1])bx(g,.4,.5,.06,MAT.glass,sx,1.5,1.52);
  cyl(g,.04,.04,2.4,5,MAT.timber,1.7,1.6,1.5);bx(g,.7,.5,.03,MAT.red,2.05,2.5,1.5);
  cyl(g,.05,.05,.9,5,MAT.timber,-1.4,.5,2.2);bx(g,.5,.08,.08,MAT.timber,-1.4,.85,2.2);return g;};
const ents=new Map(),pickables=[];
function mountBody(e){
  const b=e.b;if(e.body)e.root.remove(e.body);
  e.body=BUILD[b.type](b);if(b.type!=='house'&&b.rot)e.body.rotation.y=-b.rot*Math.PI/2;e.root.add(e.body);
  for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.bid===b.id&&pickables[i]!==e.hit)pickables.splice(i,1);
  e.body.traverse(o=>{if(o.isMesh){o.userData.bid=b.id;pickables.push(o);}});
}
// v36: recinto dell'ovile = staccionata lungo il contorno della zona Pascolo contigua; le pecore passeggiano di cella in cella restando dentro
function mountPen(e){
  const b=e.b;
  if(e.pen){scene.remove(e.pen);e.pen=null;e.sheep=null;}
  if(b.type!=='sheepfold'||b.state!=='done'||!b.pen||!b.pen.length)return;
  const g=new THREE.Group(),[ex,ey]=Sim.entranceOf(b.x,b.y,b.w,b.h,b.rot|0);
  fenceCells(g,new Set(b.pen),0,0,MAT.timber,new Set([ey*N+ex]));
  const free=new Set(b.fields),sheep=[];
  const n=free.size?Math.min(9,2+((free.size/10)|0)):0,arr=[...free];
  for(let k=0;k<n;k++){
    const c=arr[(Math.random()*arr.length)|0],sg=new THREE.Group();
    bx(sg,.5,.32,.32,MAT.wool,0,.33,0);sph(sg,.12,MAT.timber,.3,.38,0);
    const x=Sim.cx2w(c%N),z=Sim.cy2w((c/N)|0);sg.position.set(x,0,z);sg.rotation.y=Math.random()*6.28;g.add(sg);
    sheep.push({g:sg,c,x,z,tx:x,tz:z,nc:c,wait:Math.random()*4});
  }
  e.pen=g;e.sheep={list:sheep,free};scene.add(g);
}
function animSheep(e,dt){
  const {list,free}=e.sheep;
  for(const s of list){
    if(s.wait>0){s.wait-=dt;continue;}
    if(s.nc===s.c){
      const opts=[];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=s.c%N+dx,ny=((s.c/N)|0)+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const j=ny*N+nx;if(free.has(j))opts.push(j);}
      if(!opts.length){s.wait=3;continue;}
      s.nc=opts[(Math.random()*opts.length)|0];s.tx=Sim.cx2w(s.nc%N);s.tz=Sim.cy2w((s.nc/N)|0);
      s.g.rotation.y=Math.atan2(-(s.tz-s.z),s.tx-s.x);
    }
    const dx=s.tx-s.x,dz=s.tz-s.z,d=Math.hypot(dx,dz),st=0.35*dt;
    if(d<=st){s.x=s.tx;s.z=s.tz;s.c=s.nc;s.wait=1.5+Math.random()*4;s.g.position.set(s.x,0,s.z);}
    else{s.x+=dx/d*st;s.z+=dz/d*st;s.g.position.set(s.x,Math.abs(Math.sin(clock*6+s.x))*0.03,s.z);}
  }
}
Sim.hooks.building=function(b){
  const root=new THREE.Group(),[cx,cz]=footCenter(b);root.position.set(cx,0,cz);
  const scaf=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w*CS*.96,2.6,b.h*CS*.96)),new THREE.LineBasicMaterial({color:0x6b4a2b}));
  scaf.position.y=1.3;root.add(scaf);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(b.w*CS,3,b.h*CS),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  hit.position.y=1.5;hit.userData.bid=b.id;root.add(hit);pickables.push(hit);
  if(b.state==='done')scaf.visible=false;
  const e={b,root,body:null,scaf,hit};ents.set(b.id,e);mountBody(e);scene.add(root);mountPen(e);
};
Sim.hooks.done=function(b){const e=ents.get(b.id);if(!e)return;e.scaf.visible=false;e.body.scale.y=1;e.pop=0.35;mountPen(e);};
// v40.2: quando il giardino si allarga si ricostruisce il modello: la staccionata e le piante seguono la nuova forma
Sim.hooks.regarden=function(b){const e=ents.get(b.id);if(e)mountBody(e);};
Sim.hooks.upgraded=function(b){const e=ents.get(b.id);if(!e)return;mountBody(e);e.pop=0.5;};
Sim.hooks.removed=function(b){
  const e=ents.get(b.id);if(!e)return;scene.remove(e.root);if(e.pen)scene.remove(e.pen);ents.delete(b.id);
  for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.bid===b.id)pickables.splice(i,1);
  if(sel===b.id)select(null);
};
Sim.hooks.trees=()=>{treesDirty=true;};
Sim.hooks.rocks=()=>{rocksDirty=true;};
Sim.hooks.saps=()=>{sapsDirty=true;};
Sim.hooks.ground=()=>{groundDirty=true;};
Sim.hooks.toast=m=>toast(m);

// ---------- abitanti ----------
const TUN=[0x8c2f23,0x2f5d73,0x6a7a3b,0x7c5a2c,0x6b4a7a,0x5d5d5d,0xb0802e],tunMats={};
const skin=L(0xe0b48c);
const CARRY={wood:MAT.log,stone:MAT.stoneD,veg:MAT.veg,eggs:MAT.egg,grain:MAT.grain,water:MAT.water,iron:MAT.iron,flour:MAT.flour,fish:MAT.fishM,meat:MAT.meatM,firewood:MAT.fw,bread:MAT.hay,tools:MAT.iron,wool:MAT.wool,cloth:MAT.cloth,clothes:MAT.cloth,planks:MAT.hay};
const vms=new Map(),vpick=[];
// v34: carichi visibili. Asse e tronco sulla spalla, sasso in braccio, carretto spinto davanti per pietre, tronchi e minerale.
// Costruttori e magazzinieri usano gli stessi modelli: li sceglie loadKind() dal carico e da quello che l'abitante sta facendo.
MAT.plank=L(0xd9b97c);MAT.wheel=L(0x4a3520);
const LG={
  plank:new THREE.BoxGeometry(.07,.035,.95),
  log:(()=>{const g=new THREE.CylinderGeometry(.075,.075,.95,7);g.rotateX(Math.PI/2);return g;})(),
  rock:new THREE.DodecahedronGeometry(.15,0),
  bed:new THREE.BoxGeometry(.62,.1,.7),
  side:new THREE.BoxGeometry(.05,.16,.7),
  wheel:(()=>{const g=new THREE.CylinderGeometry(.19,.19,.05,10);g.rotateZ(Math.PI/2);return g;})(),
  handle:new THREE.BoxGeometry(.04,.04,.55),
  stone:new THREE.DodecahedronGeometry(.13,0),
  board:new THREE.BoxGeometry(.5,.045,.62),
  clog:(()=>{const g=new THREE.CylinderGeometry(.07,.07,.55,6);g.rotateZ(Math.PI/2);return g;})()
};
const isWhWorker=v=>{const jb=v.job&&Sim.buildings().get(v.job);return !!jb&&jb.type==='store';};
const CART_AT=['toSite','toStoreC','toWhT','toCenterT'],CARTR=['toStoreC','toWhT','toCenterT'];
// v47: col carretto si portano 3 pezzi (si vedono tutti quelli portati), a mano 1 (un'asse, un tronco, un sasso)
// v39: i carretti sono solo dei magazzinieri (wh = l'abitante lavora in un Magazzino o nel centro); gli altri portano assi e tronchi sulla spalla, sassi in braccio, il resto a blocchetto
function loadKind(v,wh){
  const c=v.carry,s=v.state;
  if(!c)return null;
  if(c==='wood'){
    if(s==='toSite')return wh?'cartWood':'log';
    if(s==='toStoreC')return wh&&(v.cq|0)>=3?'cartWood':'log';
    if(s==='toWhT'||s==='toCenterT')return wh?'cartWood':'log';
    if(s==='toWork')return 'log';
    return 'box';
  }
  if(c==='planks')return s==='toSite'?(wh?'cartPlanks':'plank'):'box';
  if(c==='stone')return s==='toWork'?'rock':CART_AT.includes(s)?(wh?'cartStone':'rock'):'box';
  if(c==='iron')return wh&&CARTR.includes(s)?'cartOre':'box';
  if(c==='flax'||c==='hemp'||c==='dye')return 'plank';
  return 'box';
}
// quanti pezzi si vedono nel carretto: quanto raccolto (1-4); per un cantiere o un trasferimento, un carico pieno
const loadQty=v=>v.state==='toStoreC'?Math.max(1,Math.min(4,(v.cq|0)||1)):v.state==='toSite'?Math.max(1,Math.min(3,(v.cq|0)||3)):3;
function makeRig(gp){
  const root=new THREE.Group();
  const plank=new THREE.Group();
  for(let i=0;i<3;i++){const p=new THREE.Mesh(LG.plank,MAT.plank);p.position.set((i-1)*.06,i===1?.04:0,0);plank.add(p);}
  plank.position.set(.15,.82,0);plank.rotation.x=-.18;plank.visible=false;root.add(plank);
  const log=new THREE.Mesh(LG.log,MAT.log);log.position.set(-.15,.8,0);log.rotation.x=-.12;log.visible=false;root.add(log);
  const rock=new THREE.Mesh(LG.rock,MAT.stoneD);rock.position.set(0,.5,.26);rock.visible=false;root.add(rock);
  const cart=new THREE.Group();cart.position.set(0,0,1.0);cart.visible=false;
  const bed=new THREE.Mesh(LG.bed,MAT.timber);bed.position.set(0,.32,0);bed.castShadow=true;cart.add(bed);
  for(const sx of[-.3,.3]){const s=new THREE.Mesh(LG.side,MAT.timber);s.position.set(sx,.42,0);cart.add(s);}
  const wheels=[];
  for(const sx of[-.34,.34]){const w=new THREE.Mesh(LG.wheel,MAT.wheel);w.position.set(sx,.19,.08);cart.add(w);wheels.push(w);}
  for(const sx of[-.2,.2]){const h=new THREE.Mesh(LG.handle,MAT.timber);h.position.set(sx,.4,-.5);h.rotation.x=.08;cart.add(h);}
  const pos=[[-.14,-.16],[.14,-.12],[-.1,.16],[.15,.17]];
  const mk=(geo,mats,y)=>pos.map((p,i)=>{const o=new THREE.Mesh(geo,mats[i%mats.length]);o.position.set(p[0],y+(i%2)*.03,p[1]);o.rotation.y=i*1.3;o.visible=false;cart.add(o);return o;});
  const stones=mk(LG.stone,[MAT.stoneD,MAT.stone],.45),ores=mk(LG.stone,[MAT.iron,MAT.rust],.45);
  const clogs=[[0,.43,-.17],[0,.43,.17],[0,.56,0],[0,.56,.3]].map(p=>{const o=new THREE.Mesh(LG.clog,MAT.log);o.position.set(p[0],p[1],p[2]);o.visible=false;cart.add(o);return o;});
  const boards=[0,1,2].map(i=>{const o=new THREE.Mesh(LG.board,MAT.plank);o.position.set(0,.4+i*.05,0);o.rotation.y=(i-1)*.12;o.visible=false;cart.add(o);return o;});
  root.add(cart);gp.add(root);
  return {root,plank,log,rock,cart,wheels,stones,ores,clogs,boards};
}
function applyLoad(m,v,kind,qty){
  m.load.visible=kind==='box';
  if(kind==='box')m.load.material=CARRY[v.carry]||MAT.log;
  if(!m.rig){if(!kind||kind==='box')return;m.rig=makeRig(m.gp);}
  const r=m.rig;
  r.plank.visible=kind==='plank';r.log.visible=kind==='log';r.rock.visible=kind==='rock';
  // a mano un'asse sola (le assi del magazzino); gli altri carichi 'plank' (lino, canapa, tinture) restano un fascio
  const one=kind==='plank'&&v.carry==='planks';r.plank.children.forEach((c,i)=>{c.visible=!one||i===1;});
  r.cart.visible=kind==='cartStone'||kind==='cartWood'||kind==='cartOre'||kind==='cartPlanks';
  r.boards.forEach((o,i)=>{o.visible=kind==='cartPlanks'&&i<qty;});
  r.stones.forEach((o,i)=>{o.visible=kind==='cartStone'&&i<qty;});
  r.ores.forEach((o,i)=>{o.visible=kind==='cartOre'&&i<qty;});
  r.clogs.forEach((o,i)=>{o.visible=kind==='cartWood'&&i<qty;});
}
Sim.hooks.gone=function(v){const m=vms.get(v.id);if(m){scene.remove(m.gp);vms.delete(v.id);}const i=vpick.findIndex(o=>o.userData.vid===v.id);if(i>=0)vpick.splice(i,1);if(typeof cardId!=='undefined'&&cardId===v.id)setTimeout(renderCard,0);};
Sim.hooks.villager=function(v){
  const c=TUN[v.id%TUN.length];const mat=tunMats[c]||(tunMats[c]=L(c));
  const gp=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.25,.62,8),mat);body.position.y=.31;body.castShadow=true;gp.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),skin);head.position.y=.76;head.castShadow=true;gp.add(head);
  const hood=new THREE.Mesh(new THREE.ConeGeometry(.17,.24,8),mat);hood.position.y=.95;gp.add(hood);
  const load=new THREE.Mesh(new THREE.BoxGeometry(.36,.2,.2),MAT.log);load.position.set(0,.5,-.2);load.visible=false;gp.add(load);
  gp.scale.setScalar(0.8);gp.position.set(v.x,0,v.z);
  if(v.guest){hood.material=L(v.kind==='merchant'?0x2f5a3c:v.kind==='pilgrim'?0x6b5a3a:0x4a4a68);
    if(v.caravan){const ct=new THREE.Group();bx(ct,.7,.1,1.0,MAT.log,0,.38,0);for(const sx of[-.4,.4])cyl(ct,.24,.24,.06,10,MAT.logD,sx,.26,0,0,Math.PI/2);bx(ct,.55,.34,.6,MAT.cloth,0,.62,-.05);bx(ct,.3,.22,.3,MAT.hay,.1,.86,.1);bx(ct,.05,.05,.8,MAT.timber,0,.45,.75);ct.position.set(0,0,-1.55);gp.add(ct);gp.userData.cart=ct;}
    if(v.horse){const hs=new THREE.Group();bx(hs,.5,.5,1.1,MAT.horse,0,.55,-.2);bx(hs,.22,.5,.25,MAT.horse,0,.95,.45);for(const sx of[-.16,.16])for(const sz of[-.55,.15])bx(hs,.1,.35,.1,MAT.horse,sx,.18,sz);bx(hs,.55,.1,.5,MAT.cloth,0,.82,-.2);gp.add(hs);gp.userData.horse=hs;}}
  let hpb=null;
  if(v.mil){
    body.material=L(v.kind==='raider'?0x3a1d1d:v.kind==='royal'?0x4a2a6b:0x2f5d9a);hood.material=L(v.kind==='raider'?0x1a0f0f:v.kind==='royal'?0xb0802e:0x6a7a8c);
    bx(gp,.05,.05,.95,MAT.timber,.24,.6,.18);bx(gp,.07,.18,.07,MAT.iron,.24,.6,.7);
    hpb=new THREE.Sprite(new THREE.SpriteMaterial({color:v.side==='mine'?0x5fae5f:0xd9553f}));hpb.scale.set(.55,.09,1);hpb.position.y=1.5;gp.add(hpb);
  }
  if(!v.guest){const vh=new THREE.Mesh(new THREE.SphereGeometry(.6,6,5),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));vh.position.y=.55;vh.userData.vid=v.id;gp.add(vh);vpick.push(vh);}
  scene.add(gp);vms.set(v.id,{gp,load,carry:null,body,mat,ill:false,hpb});
};

// v48: frecce delle torri di guardia (una linea che dura un attimo)
const shots=[];
Sim.hooks.shot=function(x0,z0,x1,z1){
  const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0,5.4,z0),new THREE.Vector3(x1,.9,z1)]),new THREE.LineBasicMaterial({color:0xffe6a0,transparent:true,opacity:.9}));
  scene.add(ln);shots.push({ln,t:.25});
};
// ---------- ghost e selezione ----------
const ghost=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0x66cc66,transparent:true,opacity:.45,depthWrite:false}));
ghost.visible=false;scene.add(ghost);
const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,40),new THREE.MeshBasicMaterial({color:0xd6ad4e,side:THREE.DoubleSide,transparent:true,opacity:.95}));
ring.rotation.x=-Math.PI/2;ring.position.y=.12;ring.visible=false;scene.add(ring);
const arrow=new THREE.Group();
{const cn=new THREE.Mesh(new THREE.ConeGeometry(.32,.9,3),new THREE.MeshBasicMaterial({color:0xffd34d}));cn.rotation.z=-Math.PI/2;cn.position.y=.25;arrow.add(cn);}
arrow.visible=false;scene.add(arrow);
let rot=0;
function showArrow(type,x,y,r,ok){
  if(NOGATE[type]){arrow.visible=false;return;}
  const [w,h]=Sim.dimsOf(BT[type],r),[ex,ey]=Sim.entranceOf(x,y,w,h,r),f=Sim.ROTD[r];
  arrow.visible=true;arrow.position.set(Sim.cx2w(ex),0.05,Sim.cy2w(ey));arrow.rotation.y=Math.atan2(f[1],-f[0]);
  arrow.children[0].material.color.setHex(ok?0xffd34d:0xff6a4d);
}
function setGhost(x0,y0,w,h,ok,tall,color){
  ghost.visible=true;ghost.scale.set(w*CS,tall,h*CS);ghost.position.set((x0+w/2)*CS-W/2,tall/2+0.05,(y0+h/2)*CS-W/2);
  ghost.material.color.setHex(color||(ok?0x66cc66:0xd9553f));
}

// ---------- telecamera ----------
const cam={x:0,z:0,yaw:Math.PI*0.25,pitch:0.85,dist:62,goal:62};
function updateCam(dt){
  const sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw),sp=cam.dist*0.9*dt;
  let mx=0,mz=0;
  if(keys.w||keys.arrowup){mx+=-sy;mz+=-cy;} if(keys.s||keys.arrowdown){mx+=sy;mz+=cy;}
  if(keys.a||keys.arrowleft){mx+=-cy;mz+=sy;} if(keys.d||keys.arrowright){mx+=cy;mz+=-sy;}
  cam.x+=mx*sp;cam.z+=mz*sp;
  if(keys.q)cam.yaw+=1.4*dt;if(keys.e)cam.yaw-=1.4*dt;
  cam.x=Math.max(-W/2,Math.min(W/2,cam.x));cam.z=Math.max(-W/2,Math.min(W/2,cam.z));
  cam.dist+=(cam.goal-cam.dist)*Math.min(1,dt*10);
  const cp=Math.cos(cam.pitch);
  camera.position.set(cam.x+cam.dist*cp*Math.sin(cam.yaw),cam.dist*Math.sin(cam.pitch),cam.z+cam.dist*cp*Math.cos(cam.yaw));
  camera.lookAt(cam.x,0,cam.z);
}
function resize(){
  const w=$('app').clientWidth,h=$('app').clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe($('app'));resize();

// ---------- strumenti ----------
const TOOLS=[
  {id:'select',label:'Osserva',key:'1',hint:'Clicca un edificio o una casa per vedere famiglia, mestieri e bisogni. Trascina con il tasto sinistro per spostarti sulla mappa.'},
  {id:'d1',label:'Residenziale',key:'2',dt:1,col:0xe3b84a,hint:'Trascina: qui nascono case con giardino, anche lontano dal magazzino.'},
  {id:'d2',label:'Agricolo',key:'3',dt:2,col:0x9ccf4a,hint:'Trascina: gli abitanti fonderanno qui le fattorie e i campi.'},
  {id:'d3',label:'Mercato',key:'4',dt:3,col:0xe0773f,hint:'Trascina: qui le famiglie apriranno i banchi per il baratto.'},
  {id:'d4',label:'Forestale',key:'f',dt:4,col:0x3f9a5d,hint:'Trascina: i guardaboschi pianteranno qui alberi che crescono e si possono tagliare di nuovo.'},
  {id:'d5',label:'Pascolo',key:'p',dt:5,col:0xe8e4d0,hint:'Trascina: l\'ovile nasce solo dentro il pascolo. La zona intorno all\'ovile viene chiusa da un recinto e le pecore restano lì dentro. La lana serve ai tessitori.'},
  {id:'undistrict',label:'Togli zona',key:'5',dt:0,col:0xd9553f,hint:'Trascina per cancellare un quartiere.'},
  {id:'road',label:'Strada',key:'6',hint:'Trascina per tracciare una strada: resta a lungo anche senza passaggi, poi torna sentiero e sparisce. Puoi demolirla.'},
  {id:'wood',label:'Taglialegna',key:'7',hint:'Vicino a un bosco. Rumoroso: le case vicine perdono attrattiva.'},
  {id:'quarry',label:'Cava',key:'8',hint:'Vicino alle rocce. Molto rumorosa: tienila lontana dalle case.'},
  {id:'forester',label:'Guardaboschi',key:'g',hint:'Pianta alberi nelle zone forestali. Servono circa 2 minuti perché crescano.'},
  {id:'mine',label:'Miniera',key:'m',hint:'Vicino ai filoni di ferro (rocce scure). Molto rumorosa. Il ferro va al magazzino.'},
  {id:'carpenter',label:'Falegnameria',key:'n',hint:'Gli addetti trasformano il legno del magazzino in assi (2 assi per legno). Scuola, ospizio, chiesa, mulino, locanda, magazzino, fabbro, forno, telaio, sartoria, taverna e sala delle feste richiedono assi; senza falegnameria si pagano in legno (2 legni per asse). Un po\' rumorosa.'},
  {id:'mason',label:'Bottega del muratore',key:'y',hint:'I muratori portano i materiali ai cantieri e costruiscono il 60% più in fretta degli altri operai.'},
  {id:'smithy',label:'Fucina del fabbro',key:'',hint:'Trasforma il ferro del magazzino in attrezzi (3 per ferro ogni 10 s) e li porta alle case: con gli attrezzi il giardino rende il 10% in più. Molto più produttiva della bottega di un giardino. Rumorosa.'},
  {id:'bakery',label:'Forno del panettiere',key:'',hint:'Trasforma la farina del mulino in pane (3 pagnotte per farina ogni 8 s) e lo porta alle famiglie.'},
  {id:'weaver',label:'Telaio del tessitore',key:'',hint:'Trasforma la lana degli ovili in tessuto (2 per lana ogni 9 s) o la fibra di lino del maceratoio (3 per fibra). Serve un ovile con i pastori, oppure lino e maceratoio.'},
  {id:'retting',label:'Maceratoio',key:'',hint:'Sulla riva di un lago o di un fiume. Macera gli steli di lino e canapa portati dalle fattorie (1 fibra per stelo ogni 8 s). La coltura si sceglie nel pannello della fattoria.'},
  {id:'charcoal',label:'Carbonaia',key:'',hint:'Vicino a un bosco fitto. Trasforma il legno del magazzino in carbone (2 ogni 3 legni, ogni 10 s). Lavora quando il legno è abbondante (30 o più) o quando la fonderia ha bisogno di carbone.'},
  {id:'smelter',label:'Fonderia',key:'',hint:'Fonde 2 ferro della miniera con 1 carbone in 2 barre di ferro (ogni 11 s). Il fabbro ricava 5 attrezzi da una barra invece di 3 da un ferro. Le barre si vendono a caro prezzo ai mercanti.'},
  {id:'ropewalk',label:'Cordaio',key:'',hint:'Torce la fibra di canapa del maceratoio in corde (3 per fibra ogni 9 s). Le corde si vendono ai mercanti e rinforzano le riparazioni degli edifici.'},
  {id:'dyehouse',label:'Tintoria',key:'',hint:'Sulla riva di un lago o di un fiume. Tinge il tessuto del telaio con le piante tintorie delle fattorie (1 pezza per pianta ogni 10 s). Il sarto ricava 3 abiti da una pezza tinta, invece di 2.'},
  {id:'tailor',label:'Sartoria',key:'',hint:'Cuce abiti (2 per tessuto ogni 10 s) con il tessuto del telaio e li porta alle case dal livello 3: +3 di felicità. Serve un telaio.'},
  {id:'fisher',label:'Capanna del pescatore',key:'',hint:'Sulla riva di un lago o di un fiume. Pesce per le famiglie (2 ogni 7 s per pescatore); con il ghiaccio non si pesca.'},
  {id:'hunter',label:'Capanna del cacciatore',key:'',hint:'Vicino a un bosco fitto. Porta carne alle famiglie (2 ogni 8 s per cacciatore); d\'inverno la selvaggina è scarsa.'},
  {id:'sheepfold',label:'Ovile',key:'',hint:'Costruisci l\'ovile dentro una zona Pascolo (tasto P): la zona intorno si chiude con un recinto, i pastori portano le pecore a brucare lì dentro e producono la lana per il tessitore.'},
  {id:'mercery',label:'Merceria',key:'',hint:'Con un merciaio: le botteghe portano qui attrezzi, pane, tessuto e abiti (fino a 40 per merce) e le famiglie entro 135 celle vengono a ritirare ciò che manca. Se è chiusa o lo scaffale è pieno, le botteghe consegnano alle case.'},
  {id:'tavern',label:'Taverna',key:'',hint:'Con un taverniere: chi abita entro 36 celle ha +4 di felicità. Attrae nuovi abitanti.'},
  {id:'hall',label:'Sala delle feste',key:'',hint:'Con un musicante: chi abita entro 45 celle ha +6 di felicità. Molto piacevole.'},
  {id:'granary',label:'Granaio',key:'b',hint:'Le fattorie portano qui il grano in eccedenza. Il mulino lo macina.'},
  {id:'mill',label:'Mulino',key:'l',hint:'Trasforma il grano del granaio in farina per i panettieri.'},
  {id:'inn',label:'Locanda',key:'i',hint:'Dà da mangiare ai viandanti e ha una stalla per i cavalli. Serve un oste; le famiglie portano il cibo. Qualcuno può fermarsi in paese.'},
  {id:'plaza',label:'Piazza',key:'z',hint:'Piazza con fontana: abbellimento che rende molto più piacevole la zona.'},
  {id:'flowers',label:'Aiuola',key:'u',hint:'Piccola decorazione: più attrattiva nei dintorni.'},
  {id:'statue',label:'Statua',key:'t',hint:'Monumento: aumenta l\'attrattiva della zona.'},
  {id:'store',label:'Magazzino',key:'9',hint:'Secondo deposito con 3 addetti e scorte fino a 80. Un po\' rumoroso.'},
  {id:'well',label:'Pozzo',key:'0',hint:'Dà acqua alle case entro 30 celle e rende la zona più piacevole.'},
  {id:'school',label:'Scuola',key:'k',hint:'I bambini dai 6 anni vengono qui al mattino (serve un maestro). Chi sa leggere e scrivere fa migliorare la casa più in fretta. Serve alle case entro 45 celle per salire al livello 4.'},
  {id:'infirmary',label:'Ospizio',key:'o',hint:'Un erborista cura i malati delle case entro 45 celle: guariscono prima e rischiano meno. Frena le epidemie.'},
  {id:'church',label:'Chiesa',key:'c',hint:'Serve alle case entro 54 celle per salire dal livello 2 in su. Molto attraente.'},
  {id:'watchtower',label:'Torre di guardia',key:'',hint:'Gli arcieri tirano ai predoni e ai soldati nemici entro 24 celle. Mettila vicino ai magazzini e al centro: i predoni cercano le scorte.'},
  {id:'barracks',label:'Caserma',key:'',hint:'Quando arrivano i nemici manda fino a 3 soldati incontro a loro (uno ogni 5 s); finita la minaccia rientrano.'},
  {id:'demolish',label:'Demolisci',key:'x',hint:'Clicca un edificio, una casa, una strada o un sentiero.'},
  {id:'pan',label:'Muovi',key:'h',hint:'Trascina per spostare la mappa.'}
];
const TOOL=Object.fromEntries(TOOLS.map(t=>[t.id,t]));
const CATS=[
  {id:'tools',label:'Strumenti',ids:['select','pan','demolish']},
  {id:'zone',label:'Zone e strade',ids:['d1','d2','d3','d4','d5','undistrict','road']},
  {id:'prod',label:'Produzione',ids:['wood','quarry','mine','forester','granary','mill']},
  {id:'shop',label:'Botteghe',ids:['carpenter','mason','smithy','bakery','sheepfold','charcoal','smelter','retting','ropewalk','dyehouse','weaver','tailor','fisher','hunter','mercery']},
  {id:'serv',label:'Servizi',ids:['store','well','school','infirmary','church','inn','tavern','hall']},
  {id:'deco',label:'Decorazioni',ids:['plaza','flowers','statue']},
  {id:'def',label:'Difesa',ids:['watchtower','barracks']}];
const CATOF={};CATS.forEach(c=>c.ids.forEach(i=>{CATOF[i]=c.id;}));
const catBtns={};
let curCat='tools';
function setCat(c){curCat=c;for(const k in toolBtns)toolBtns[k].style.display=CATOF[k]===c&&Sim.owns(k)?'':'none';for(const k in catBtns)catBtns[k].classList.toggle('on',k===c);}
for(const c of CATS){const b=document.createElement('button');b.className='btn sm';b.type='button';b.textContent=c.label;b.addEventListener('click',()=>setCat(c.id));$('cats').appendChild(b);catBtns[c.id]=b;}
let tool='select';const toolBtns={};let drag=null,hover=null,pend=false;
const costHTML=c=>(c.wood?`<span><i class="sw w"></i>${c.wood}</span>`:'')+(c.stone?`<span><i class="sw s"></i>${c.stone}</span>`:'')+(c.planks?`<span><i class="sw p"></i>${c.planks}</span>`:'');
for(const t of TOOLS){
  const b=document.createElement('button');b.className='btn';b.type='button';
  b.innerHTML=`<span class="nm">${t.label}${t.key?`<kbd>${t.key.toUpperCase()}</kbd>`:''}</span><span class="cs">${BT[t.id]?costHTML(BT[t.id].cost):''}</span>`;
  b.addEventListener('click',()=>setTool(t.id));$('tools').appendChild(b);toolBtns[t.id]=b;
}
function setTool(id){if(!Sim.owns(id)){toast('Questo progetto non è ancora tuo: compralo tra i Progetti del Re (🏛️).',true);return;}pend=false;hover=null;$('pbar').hidden=true;if(CATOF[id]&&CATOF[id]!==curCat)setCat(CATOF[id]);tool=id;ghost.visible=false;arrow.visible=false;$('rotBtn').style.display=(BT[id]&&!NOGATE[id])?'':'none';for(const k in toolBtns)toolBtns[k].classList.toggle('on',k===id);$('hint').textContent=(TOOL[id].hint||'')+((BT[id]&&!NOGATE[id])?' R = ruota: la freccia gialla è l\'ingresso.':'');if(id!=='select')select(null);if(document.body.classList.contains('touch')&&id!=='select')toast(TOOL[id].hint+(BT[id]?' Tocca o trascina sulla mappa, poi conferma con ✓.':''));}
setCat('tools');setTool('select');
let toastT=0;
function toast(msg,bad){const t=$('toast');t.textContent=msg;t.classList.toggle('bad',!!bad);t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),5600);}

// ---------- selezione ----------
let sel=null,zoneEdit=null,selCacheList=null;
const zoneRing=new THREE.Mesh(new THREE.RingGeometry(.975,1,72),new THREE.MeshBasicMaterial({color:0xff9a3c,side:THREE.DoubleSide,transparent:true,opacity:.9}));
zoneRing.rotation.x=-Math.PI/2;zoneRing.position.y=.14;zoneRing.visible=false;scene.add(zoneRing);
const zoneDot=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,1.2,10),new THREE.MeshBasicMaterial({color:0xff9a3c}));zoneDot.visible=false;scene.add(zoneDot);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function select(id){sel=id;zoneEdit=null;selCacheList=null;const b=id&&Sim.buildings().get(id);
  if(!b){zoneRing.visible=false;zoneDot.visible=false;$('sel').hidden=true;ring.visible=false;return;}
  $('sel').hidden=false;ring.visible=true;const [cx,cz]=footCenter(b);ring.position.set(cx,.12,cz);const r=Math.max(b.w,b.h)*CS*.78;ring.scale.set(r,r,1);
  refreshSel();}
function refreshSel(){
  const b=sel&&Sim.buildings().get(sel);if(!b)return;const t=BT[b.type];
  let name=t.name,info='',list='';
  const VM=id=>Sim.villagers().find(v=>v.id===id);
  const stt=Sim.stats();
  if(b.state==='site'){const sc=b.cost||Sim.costOf(b.type),need=sc.wood+sc.stone+(sc.planks||0),got=b.got.wood+b.got.stone+(b.got.planks||0);info=(b.prog>0?`In costruzione: ${Math.round(b.prog*100)}%`:`Cantiere: materiali portati ${got}/${need}${sc.planks?` (assi ${b.got.planks}/${sc.planks})`:''}`)+(()=>{const nb=Sim.villagers().filter(v=>v.state==='build'&&v.target===b.id).length;const full=Sim.siteReady(b);return full?` · operai al lavoro: ${nb}${nb?'':' (servono operai)'}`:'';})()+(S.ph==='work'?'':' · i lavori riprendono al mattino');}
  else if(b.type==='house'){
    name=Sim.LVNAME[b.level-1];const cap=Sim.CAPS[b.level-1],fl=b.flags,gd=b.goods,fn=Sim.fuelNeed();
    const hd=b.head&&VM(b.head);
    info=`Famiglia ${hd?esc(hd.fam):''}: ${b.members.length}/${cap} · casa ${b.hw}×${b.hh} · giardino ${Sim.SHAPE_NAME[b.shape]||'a lato'} ${b.gcells.length+b.ext.length} celle (max 24) · giardino: ${b.crop==='veg'?'orto':b.crop==='eggs'?'galline':b.crop==='wood'?'legna da ardere (catasta, ceppo e alberelli)':'allevamento'}${b.pure?' (giardino fisso: staccionata chiara e fiori, resta sempre così)':''}${b.crop==='wood'?' (specializzazione fissa)':''}${b.craft?' · fabbro':''}${b.bake?' · panificio':''}${b.weave?' · tessitore':''}${b.tailor?' · sarto':''}`;
    const rows=b.members.map(id=>{const v=VM(id);return v?`<div><span class="lk" data-v="${v.id}">${esc(v.name)}</span>${v.id===b.head?' ★':''} (${v.age|0} anni${v.schooled?', istruito':''}${v.ill?', malato':''}): ${esc(Sim.roleText(v))}</div>`:'';}).join('');
    const need=b.level>=Sim.MAXLV?'':('Per migliorare: '+Math.min(3,b.level)+(b.level>1?' tipi':' tipo')+' di cibo, acqua, legna'+(b.level>=2?', chiesa':'')+(b.level>=3?', scuola vicina':'')+(b.level>=4?', zona di qualità ottima (attrattiva 3 o più)':'')+(()=>{const u=Sim.UPC[b.level+1];return u?`, materiali (legno ${u.wood}${u.stone?`, pietra ${u.stone}`:''})`:'';})()+` (${Math.min(25,b.up)}/25)`);
    const shopTxt=b.craft?'Fabbro: lavora il ferro del magazzino e consuma legna.':b.bake?'Panettiere: cuoce il pane con farina e legna.':b.weave?'Tessitore: trasforma la lana in tessuto.':b.tailor?'Sarto: cuce abiti con il tessuto.':(b.pure?'Giardino fisso: non diventerà mai una bottega.':(b.crop==='wood'||b.level<3?(b.crop==='wood'?'Giardino della legna: non diventa una bottega.':'Da livello 3 il giardino può diventare bottega: fabbro (serve una miniera) o tessitore (serve un ovile); da livello 4 sarto o panettiere (serve un mulino).'):'Può ancora diventare bottega salendo di livello o quando ci sono miniera, ovile o mulino.'));
    const wk=b.work?`<div><b>Lavori in corso</b>: ${b.work.kind==='up'?'ampliamento della casa':b.work.kind==='garden'?'nuovo giardino':'ampliamento del giardino'} · materiali ${(b.got.wood||0)+(b.got.stone||0)}/${((b.cost||{}).wood||0)+((b.cost||{}).stone||0)} · avanzamento ${Math.round((b.prog||0)*100)}%</div>`:(b.gfull===false?'<div>Orto piccolo: dal livello 2 potrà farsi un giardino recintato (serve legna e un costruttore).</div>':'');
        list=wk+rows+`<div>${shopTxt}</div><div>Felicità <b>${b.well}</b>/100</div><div class="wbar"><i style="width:${b.well}%"></i></div>${needsHtml(b)}<div>Legna da ardere: ${gd.firewood}/${fn} ${gd.firewood>=fn?'(scorta sufficiente)':'(scorta scarsa)'}</div>`+(S.edicts&&S.edicts.noUpgrade?'<div>Editto in vigore: le case non migliorano.</div>':'')+`${b.ext&&b.ext.length?`<div>Giardino ampliato di ${b.ext.length} celle, verso la strada.</div>`:''}<div>Attività secondaria: ${b.side==='fish'?'pesca (casa vicino all\'acqua)':b.side==='hunt'?'caccia (casa vicino a un bosco tranquillo)':'nessuna'}. ${b.crop==='wood'?'Niente orto né galline: la famiglia va nel bosco a raccogliere la legna e quella in più la baratta al mercato con il cibo.':'Non produce legna: la compra al mercato.'}</div><div>Attrattiva della zona: ${Sim.attrLabel(b.attr)} (${b.attr.toFixed(1)})</div>`+
      `<div class="flags"><span class="${fl.foodUp?'ok':'no'}">Cibo ${b.level}+</span><span class="${fl.water?'ok':'no'}">Acqua</span><span class="${fl.church?'ok':'no'}">Chiesa</span>${b.level>=3?`<span class="${fl.school?'ok':'no'}">Scuola</span>`:''}${b.level>=4?`<span class="${fl.quality?'ok':'no'}">Zona</span>`:''}<span class="${fl.attr?'ok':'no'}">Quiete</span><span class="${fl.heat?'ok':'no'}">Caldo</span><span class="${fl.fuel?'ok':'warn'}">Legna</span><span class="${fl.mat?'ok':'no'}">Materiali</span></div>`+
      `<div>Scorte: ortaggi ${gd.veg} · uova ${gd.eggs} · grano ${gd.grain} · pesce ${gd.fish} · carne ${gd.meat} · pane ${gd.bread}</div><div>Legna ${gd.firewood} · ferro ${gd.iron} · farina ${gd.flour} · attrezzi ${gd.tools}</div><div>Lana ${gd.wool} · tessuto ${gd.cloth} · abiti ${gd.clothes}</div>`+(need?`<div>${need}</div>`:'<div>Livello massimo raggiunto.</div>');
  }
  else if(b.type==='stall'){const o=Sim.buildings().get(b.owner);info=b.open?'Banco aperto: si accettano baratti.':'Banco chiuso.';
    if(o)list=`<div>Merce: ortaggi ${o.goods.veg} · uova ${o.goods.eggs} · pesce ${o.goods.fish} · carne ${o.goods.meat} · pane ${o.goods.bread} · legna ${o.goods.firewood} · attrezzi ${o.goods.tools}</div>`;}
  else if(b.type==='farm'){const w=Sim.villagers().filter(v=>v.job===b.id);const fc=b.crop||'grain',CN={grain:'grano',flax:'lino',hemp:'canapa',dye:'tintorie'},ri=Sim.retInfo(fc==='dye'?'dyehouse':'retting');info=`Campi: ${b.fields.length} · lavorano ${w.length} · coltura: ${CN[fc]}`;
    list='<div class="sh">Coltura dei campi</div><div>'+['grain','flax','hemp','dye'].map(k=>`<button class="btn sm${k===fc?' on':''}" type="button" data-crop="${k}">${CN[k][0].toUpperCase()+CN[k].slice(1)}</button>`).join(' ')+'</div>'+
      w.map((v,i)=>`<div>Contadino ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+(fc==='grain'?"<div>Il grano raccolto va alla famiglia che l'ha fondata.</div>":(fc==='dye'?'<div>Le piante tintorie vanno alla tintoria: la famiglia non riceve grano da questa fattoria.</div>':`<div>Gli steli di ${CN[fc]} vanno al maceratoio: la famiglia non riceve grano da questa fattoria.</div>`)+(ri.any?'':`<div>Senza ${fc==='dye'?'una tintoria':'un maceratoio'} i contadini raccolgono grano.</div>`));}
  else if(b.type==='store'){
    name=b.center?'Centro cittadino':'Magazzino';
    const w=Sim.villagers().filter(v=>v.job===b.id);
    const si=b.state==='done'?Sim.storeInfo(b):null;
    info=b.center?`Addetti: ${w.length}/${b.want} · scorte: legno ${S.stock.wood}/${Sim.CENTER_CAP}, pietra ${S.stock.stone}/${Sim.CENTER_CAP}, ferro ${S.stock.iron}/${Sim.CENTER_CAP}`:`Addetti: ${w.length}/${b.want}`+(si?` · contiene ${si.tot}/${si.total}`:'');
    list=w.map((v,i)=>`<div>Addetto ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>Portano i materiali ai cantieri e ritirano quanto prodotto da taglialegna e cave.</div>'+(b.center?'':`<div>Accetta materiali da costruzione e i prodotti di fabbro, tessitore e sarto (le botteghe dei giardini non vi consegnano). Le merci che qui sono spente non vengono accolte.</div><div>Se il centro contiene materiali, gli addetti li portano qui: legno ${S.wh.wood}, pietra ${S.wh.stone}, ferro ${S.wh.iron}.</div>`)+(b.center?`<div>Il centro cresce con il numero di case. Si può demolire solo quando è vuoto.</div>`:'');
  }
  else if(b.type==='mason'){
    const w=Sim.villagers().filter(v=>v.job===b.id);
    info=`Muratori: ${w.length}/${b.want} · assi nel magazzino: ${S.stock.planks}`;
    list=w.map((v,i)=>`<div>Muratore ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>Portano i materiali ai cantieri e costruiscono il 60% più in fretta. Senza lavori aiutano le famiglie e portano i materiali ai magazzini.</div>'+(w.length===0?`<div>Nessun muratore: servono abitanti liberi.</div>`:'');
  }
  else if(b.type==='mercery'){
    const w=Sim.villagers().filter(v=>v.job===b.id),GLM={tools:'attrezzi',bread:'pane',cloth:'tessuto',clothes:'abiti'};
    info=`Addetti: ${w.length}/${b.want} · scaffali: `+Object.keys(GLM).map(k=>`${GLM[k]} ${b.shelf[k]}/${Sim.SHELFCAP}`).join(', ')+` · denari ${S.coins}`;
    list=w.map((v,i)=>`<div>Merciaio ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>Fucina, forno, telaio e sartoria portano qui i loro prodotti; le famiglie entro 135 celle mandano qualcuno a ritirare ciò che manca. Il sarto prende qui il tessuto.</div>'+(w.length===0?'<div>Nessun merciaio: la merceria è chiusa e le botteghe consegnano direttamente alle case. Servono abitanti liberi.</div>':'')+`<div>Commercio: con un merciaio le carovane delle città di cui hai aperto la rotta vengono qui a comprare e vendere a denari (rotte aperte ${S.routes.filter(r=>r.open).length}/4). <span class="lk" data-trade="1">Apri il registro delle rotte</span></div>`;
  }
  else if(Sim.WS[b.type]){
    const w=Sim.villagers().filter(v=>v.job===b.id),g=Sim.PROD[b.type],spec=Sim.WS[b.type];
    const GL={tools:'attrezzi',bread:'pane',cloth:'tessuto',clothes:'abiti',fish:'pesce',meat:'carne',rope:'corde'};
    const DESC={
      carpenter:`Trasforma il legno del magazzino in assi (2 per legno ogni ${spec.t} s per falegname). Legno ${S.stock.wood} · assi ${S.stock.planks}/${Sim.PLANK_CAP}. Le assi servono ai cantieri di scuola, ospizio, chiesa, mulino, locanda, magazzino e botteghe.`,
      smithy:`Un fabbro trasforma 1 ferro in 3 attrezzi ogni ${spec.t} s e li porta alle case (con gli attrezzi il giardino rende il 10% in più). Ferro nel magazzino: ${S.stock.iron}.`,
      bakery:`Un panettiere trasforma 1 farina in 3 pagnotte ogni ${spec.t} s e le porta alle famiglie. Farina nei mulini: ${S.stock.flour}.`,
      weaver:`Un tessitore trasforma 1 lana in 2 pezze di tessuto ogni ${spec.t} s, o 1 fibra di lino in 3 pezze. La lana viene dagli ovili vicini, la fibra dal maceratoio. Le pezze vanno ai sarti e alle case con il telaio.`,
      retting:`Un maceratore trasforma 1 stelo di lino o canapa in 1 fibra ogni ${spec.t} s. Steli in attesa: lino ${(b.inp||{}).flax|0}, canapa ${(b.inp||{}).hemp|0} (max ${Sim.RET_CAP}) · fibra pronta: lino ${b.out.flaxf|0}, canapa ${b.out.hempf|0}. Il lino va ai telai, la canapa ai cordai. Gli steli li portano i contadini delle fattorie che coltivano lino o canapa.`,
      charcoal:`Un carbonaio trasforma 3 legni del magazzino in 2 carboni ogni ${spec.t} s. Legno ${S.stock.wood} · carbone ${S.stock.charcoal|0}/${Sim.CHAR_CAP}. Con meno di 30 legni lavora solo se una fonderia ha bisogno di carbone, così i cantieri non restano senza legno.`,
      smelter:`Un fonditore fonde 2 ferro e 1 carbone in 2 barre ogni ${spec.t} s. Ferro ${S.stock.iron} · carbone ${S.stock.charcoal|0} · barre ${S.stock.bars|0}/${Sim.BAR_CAP}. Il fabbro usa le barre per fare 5 attrezzi ciascuna; senza barre torna al ferro grezzo (3 attrezzi).`,
      dyehouse:`Un tintore tinge 1 pezza di tessuto con 1 pianta tintoria ogni ${spec.t} s. Piante in attesa: ${(b.inp||{}).dye|0} (max ${Sim.RET_CAP}) · pezze tinte pronte: ${b.out.dyed|0}. Il tessuto lo prende dal telaio vicino; il sarto con una pezza tinta cuce 3 abiti invece di 2. Le piante le portano i contadini delle fattorie con la coltura tintorie.`,
      ropewalk:`Un cordaio trasforma 1 fibra di canapa in 3 corde ogni ${spec.t} s. Corde nel magazzino: ${S.stock.rope|0}. Le corde si vendono ai mercanti e rinforzano le riparazioni (+50%).`,
      tailor:`Un sarto trasforma 1 pezza di tessuto in 2 abiti ogni ${spec.t} s; le case dal livello 3 che li ricevono hanno +3 di felicità. Il tessuto viene dai telai.`,
      fisher:`Un pescatore porta 2 pesci ogni ${spec.t} s. Con il ghiaccio non si pesca.`,
      hunter:`Un cacciatore porta 2 pezzi di carne ogni ${spec.t} s; d'inverno la selvaggina è scarsa.`,
      tavern:`Con almeno un taverniere, chi abita entro ${Sim.FUN.tavern.r} celle ha +${Sim.FUN.tavern.joy} di felicità.`,
      hall:`Con almeno un musicante, chi abita entro ${Sim.FUN.hall.r} celle ha +${Sim.FUN.hall.joy} di felicità.`}[b.type];
    info=`Al lavoro: ${w.length} su ${b.want}`+(g?` · pronti: ${GL[g]} ${b.out[g]}/${Sim.OUTCAP}`:'')+(b.type==='carpenter'?` · assi ${S.stock.planks}/${Sim.PLANK_CAP}`:'');
    list=w.map((v,i)=>`<div>Addetto ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+`<div>${DESC}</div>`+(g?`<div>Resa più alta della bottega di un giardino: la merce è portata alle famiglie che ne hanno più bisogno.</div>`:'')+(w.length===0?`<div>Nessun addetto: servono abitanti liberi.</div>`:'')+(b.why&&w.length?`<div>${esc(b.why)}</div>`:'');
  }
  else if(t.slots&&b.type!=='inn'&&b.type!=='school'&&b.type!=='infirmary'&&b.type!=='sheepfold'){
    const res=b.type==='wood'?'wood':b.type==='mine'?'iron':'stone';
    const prod=b.buf!==undefined;
    const full=prod&&(b.buf>=Sim.BUFCAP||(S.stock[res]>=Sim.capRes(res)*0.9&&b.buf>=2));
    info=prod?`Al lavoro: ${b.workers.length} su ${b.want} · scorta nell'edificio ${b.buf}/${Sim.BUFCAP}`:b.type==='forester'?`Al lavoro: ${b.workers.length} su ${b.want} · alberelli in crescita: ${Sim.stats().saps}`:`Al lavoro: ${b.workers.length} su ${b.want} · grano ${S.stock.grain}, farina ${S.stock.flour}`;
    list=Sim.villagers().filter(v=>v.job===b.id).map((v,i)=>`<div>Addetto ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+(full?'<div>Il villaggio ne ha già abbastanza: gli addetti aiutano gli altri.</div>':'')+(b.workers.length===0&&b.want>0?`<div>Nessun addetto: servono abitanti liberi (${Sim.villagers().length} in paese). Disegna un quartiere residenziale abbastanza grande, almeno 8×5 celle libere, perché nascano case e famiglie.</div>`:'')+(b.why&&!full?`<div>${esc(b.why)}</div>`:'');
  }
  else if(b.type==='inn'){const w=Sim.villagers().filter(v=>v.job===b.id);info=`Dispensa ${b.pantry}/20 · ospiti ${b.guestsIn}/4 · cavalli in stalla ${b.horses}/3`;
    list=w.map(v=>`<div>Oste: ${esc(Sim.roleText(v))}</div>`).join('')+`<div>Pasti serviti: ${S.visits} · viandanti diventati abitanti: ${S.settled}</div><div>L'oste compra il cibo in eccedenza dalle famiglie.</div>`;}
  else if(b.type==='sheepfold'){const w=Sim.villagers().filter(v=>v.job===b.id);info=`Lana pronta: ${b.buf}/${Sim.BUFCAP} · pascolo: ${b.fields.length} celle`+(b.owner?'':` · pastori ${w.length}/${b.want}`);list=w.map(v=>`<div>Pastore: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>Il telaio del tessitore e le case con il telaio ritirano la lana qui.</div>'+(!b.fields.length?'<div>Nessun pascolo libero dentro il recinto: allarga la zona Pascolo intorno all\'ovile.</div>':'')+(b.why&&w.length?`<div>${esc(b.why)}</div>`:'');}
  else if(b.type==='plaza'){
    const f=b.fest,F=Sim.FEST,st=f&&f.st;
    info='Abbellimento: rende più piacevole la zona e attira nuovi abitanti.';
    const dl=f?Math.max(0,Math.ceil((f.due-S.t)/Sim.DAY)):0,prog=f?`legno ${f.have.wood}/${F.need.wood} · cibo ${f.have.food}/${F.need.food}`:'';
    if(st==='prep'){info=`Festa di paese in preparazione: mancano ${dl} giorni · ${prog}`;list=`<div>Il paese raccoglie il legno dal magazzino e il cibo in eccesso delle case. Più si raccoglie, più la festa sarà bella${f.ext?' (i preparativi sono in ritardo)':''}.</div>`;}
    else if(st==='ready'){info=`Festa di paese: tutto pronto, comincia dopopranzo · ${prog}`;}
    else if(st==='on'){info=`Festa di paese in corso · ${f.att} partecipanti · ${prog}`;list=`<div>Chi abita entro ${F.r} celle ha +${Math.round(F.joy*f.q)} di felicità.</div>`;}
    else if(st==='cool'&&S.t<f.coolT)info=`Il paese ha festeggiato: tra ${Math.ceil((f.coolT-S.t)/Sim.DAY)} giorni si potrà indire un'altra festa.`;
    else if(b.state==='done')list=`<div>Clicca "Indici la festa di paese": dopo ${Math.round(F.prep/Sim.DAY)} giorni di preparativi (legno ${F.need.wood}, cibo ${F.need.food}) tutto il borgo si raduna in piazza e la felicità sale.</div>`;
  }
  else if(b.type==='flowers'||b.type==='statue')info='Abbellimento: rende più piacevole la zona e attira nuovi abitanti.';
  else if(b.type==='granary'){const si=b.state==='done'?Sim.storeInfo(b):null;
    info=si?`Contiene ${si.tot}/${si.total} · grano ${S.stock.grain} · farina ${S.stock.flour} · pane ${S.stock.bread} · pesce ${S.stock.fish} · carne ${S.stock.meat}`:'Granaio in costruzione.';
    list='<div>Accoglie il cibo che non viene dai giardini: grano delle fattorie, farina del mulino, pane del forno, pesce e carne dei pescatori e dei cacciatori. Il raccolto dei giardini resta alle case. Il mugnaio ritira il grano.</div>';}
  else if(b.type==='well')info=`Acqua per le case entro ${Sim.WELL_R} celle. Luogo piacevole.`;
  else if(b.type==='watchtower')info=`Arcieri: tirano al nemico più vicino entro ${Sim.TOWER_R} celle (${Sim.TOWER_DPS} colpi al secondo). Predoni uccisi finora: ${S.raid.killed}.`;
  else if(b.type==='barracks')info='Quando arrivano nemici manda fino a 3 soldati incontro a loro, uno ogni 5 secondi; finita la minaccia rientrano.';
  else if(b.type==='church'){info=`Le case entro ${Sim.CHURCH_R} celle possono raggiungere il livello massimo. Luogo molto attraente.`+(b.cem?' Il cimitero sorge accanto alla chiesa.':'');}
  else if(b.type==='school'){const w=Sim.villagers().filter(v=>v.job===b.id);info=`Maestri: ${w.length}/${b.want} · alunni ora: ${b.pupils|0}/${Sim.SCHOOL_CAP} · persone istruite: ${stt.schooled}`;
    list=w.map(v=>`<div>Maestro: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>I bambini dai 6 anni vengono al mattino (con l\'editto sull\'istruzione obbligatoria anche al pomeriggio). A 14 anni chi ha studiato abbastanza sa leggere e scrivere: la sua casa migliora più in fretta.</div>'+(w.length===0?'<div>Senza maestro la scuola resta chiusa.</div>':'')+((b.pupils|0)>=Sim.SCHOOL_CAP?'<div>Aula piena: costruisci un\'altra scuola.</div>':'');}
  else if(b.type==='infirmary'){const w=Sim.villagers().filter(v=>v.job===b.id);const near=Sim.villagers().filter(v=>{if(!v.ill)return false;const hb=Sim.buildings().get(v.home);return hb&&Math.hypot(hb.cell%N-b.cell%N,(hb.cell/N|0)-(b.cell/N|0))<=Sim.HEAL_R;}).length;
    info=`Erboristi: ${w.length}/${b.want} · malati nel raggio di cura: ${near} · guariti finora: ${S.cured}`;
    list=w.map(v=>`<div>Erborista: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>Cura i malati delle case entro 45 celle: guariscono più in fretta e rischiano meno di morire. Frena anche il contagio.</div>'+(w.length===0?'<div>Senza erborista l\'ospizio non cura.</div>':'');}
  else if(b.type==='cemetery'){info=`Sepolti: ${S.buried} · defunti senza sepoltura: ${S.unburied||0}`;list='<div>I defunti ricevono sepoltura qui: senza un cimitero i morti rendono la zona meno piacevole.</div>';}
  if(b.state==='done'&&Sim.maintainable(b)){const cv=Math.round(Sim.condOf(b));info+=` · condizione ${cv}/100 (${Sim.condLabel(b)})`+(cv<Sim.REPAIR_BELOW?(S.stock.tools>0||(b.type==='house'&&b.goods.tools>0)?' · in attesa di riparazione':' · servono attrezzi del fabbro'):'');}
  $('selName').textContent=name;$('selInfo').textContent=info;if(selCacheList!==list){selCacheList=list;$('selList').innerHTML=list;}
  updStoreCfg((b.type==='granary'||(b.type==='store'&&!b.center))&&b.state==='done'?b:null);
  $('selJobs').hidden=!(b.state==='done'&&t.slots>0&&!(b.type==='sheepfold'&&b.owner));
  $('selZone').hidden=!(Sim.ZONED[b.type]&&b.state==='done');if(!$('selZone').hidden){$('zR').textContent=b.zone?b.zone.r:(b.type==='forester'?72:39);$('zSet').textContent=zoneEdit===b.id?'Clicca sulla mappa…':(b.zone?'Sposta zona':'Scegli sulla mappa');}$('wCount').textContent=b.want;
  $('selCem').hidden=!(b.type==='church'&&b.state==='done'&&!b.cem&&Sim.owns('cemetery'));
  $('selFest').hidden=!(b.type==='plaza'&&b.state==='done');
  if(!$('selFest').hidden){const fs=b.fest&&b.fest.st;$('selFest').textContent=(fs==='prep'||fs==='ready')?'Annulla la festa':fs==='on'?'Festa in corso…':'Indici la festa di paese';$('selFest').disabled=fs==='on';}
  $('selDemo').hidden=b.type==='stall';
  $('selDemo').textContent=b.state==='site'?'Annulla cantiere':'Demolisci';
}
function selB(){return sel&&Sim.buildings().get(sel);}
// v36: pannello di accettazione e massimali di Magazzino e Granaio (le righe si creano una volta per edificio, poi si aggiornano solo i numeri)
const STKNAME={wood:'Legno',stone:'Pietra',iron:'Ferro',planks:'Assi',tools:'Attrezzi',cloth:'Tessuto',clothes:'Abiti',rope:'Corde',charcoal:'Carbone',bars:'Barre di ferro',grain:'Grano',flour:'Farina',bread:'Pane',fish:'Pesce',meat:'Carne'};
let stkCfgFor=null;
function updStoreCfg(b){
  const box=$('selStore');
  if(!b){box.hidden=true;stkCfgFor=null;return;}
  box.hidden=false;
  const si=Sim.storeInfo(b);
  if(stkCfgFor!==b.id){
    stkCfgFor=b.id;
    box.innerHTML=`<div class="sh">Cosa accettare</div>`+si.pol.map(p=>`<div class="sr" data-r="${p.k}"><label><input type="checkbox" data-k="${p.k}" ${p.on?'checked':''}>${STKNAME[p.k]}</label><span class="held"></span><input type="number" min="0" max="${si.total}" step="50" data-m="${p.k}" value="${p.max}" aria-label="Massimale ${STKNAME[p.k]}"></div>`).join('')+`<div class="sn" id="stkNote"></div>`;
  }
  for(const p of si.pol){
    const row=box.querySelector(`[data-r="${p.k}"]`);if(!row)continue;
    const cb=row.querySelector('input[type=checkbox]'),nm=row.querySelector('input[type=number]');
    if(document.activeElement!==cb)cb.checked=p.on;
    if(document.activeElement!==nm)nm.value=p.max;
    row.classList.toggle('off',!p.on);
    row.querySelector('.held').textContent=p.held;
  }
  $('stkNote').textContent=`In tutto ${si.tot}/${si.total}: il posto è condiviso fra le merci accettate, ogni massimale limita la singola merce.`;
}
$('selStore').addEventListener('change',ev=>{
  const t=ev.target;if(!sel||!t||!t.getAttribute)return;
  const k=t.getAttribute('data-k'),m=t.getAttribute('data-m');
  if(k)Sim.setPolicy(sel,k,{on:t.checked});
  else if(m)Sim.setPolicy(sel,m,{max:t.value});
  refreshSel();
});
$('selCem').addEventListener('click',()=>{const b=selB();if(!b||b.type!=='church')return;const res=Sim.addCemetery(b.id);toast(res.ok?'Cantiere del cimitero avviato accanto alla chiesa.':(res.msg||'Non c\'è spazio per il cimitero'));refreshSel();});
$('selFest').addEventListener('click',()=>{const b=selB();if(!b||b.type!=='plaza')return;const st=b.fest&&b.fest.st;
  if(st==='prep'||st==='ready'){Sim.cancelFest(b.id);toast('Festa annullata: il legno raccolto torna al magazzino.');}
  else{const r=Sim.callFest(b.id);if(!r.ok)toast(r.msg,true);}
  refreshSel();});
// v37: addobbi della festa di paese (pali con ghirlande, tavoli col cibo, catasta di legna, falò)
function mountFest(e){
  const g=new THREE.Group(),pile=new THREE.Group(),bunt=new THREE.Group(),tables=new THREE.Group(),food=new THREE.Group(),fire=new THREE.Group();
  const P=[[-2.7,-2.7],[2.7,-2.7],[2.7,2.7],[-2.7,2.7]],cols=[MAT.red,MAT.flower2,MAT.blue,MAT.cloth,MAT.leaf2];
  for(const [x,z] of P)cyl(g,.07,.07,2.4,6,MAT.timber,x,1.2,z);
  for(let s=0;s<4;s++){const [x0,z0]=P[s],[x1,z1]=P[(s+1)%4];
    for(let k=1;k<9;k++){const t=k/9;bx(bunt,.22,.3,.03,cols[(k+s)%5],x0+(x1-x0)*t,2.2-Math.sin(t*Math.PI)*.35,z0+(z1-z0)*t,s%2?Math.PI/2:0);}}
  for(const [x,z] of [[-2.2,.0],[2.2,.0]]){
    bx(tables,.6,.08,1.6,MAT.timber,x,.55,z+.8);
    for(const [lx,lz] of [[-.25,.05],[.25,.05],[-.25,1.55],[.25,1.55]])bx(tables,.08,.5,.08,MAT.logD,x+lx,.27,z+lz);
    [MAT.grain,MAT.carrot,MAT.egg,MAT.meatM,MAT.flour,MAT.veg].forEach((m,i)=>bx(food,.18,.12,.18,m,x+(i%2?.14:-.14),.65,z+.25+((i/2)|0)*.45));
  }
  for(let i=0;i<5;i++)cyl(pile,.13,.13,1.1,6,MAT.log,-2.3,.15+((i/3)|0)*.24,-1.4+(i%3)*.26-((i/3)|0)*.13,0,Math.PI/2);
  pile.position.set(0,0,0);
  cyl(fire,.5,.6,.15,8,MAT.stoneD,2.3,.08,-1.4);
  for(let k=0;k<3;k++){const l=cyl(fire,.07,.07,.8,6,MAT.logD,2.3,.3,-1.4,0,Math.PI/2);l.rotation.y=k*1.05;}
  const flame=cone(fire,.3,.9,7,MAT.fire,2.3,.7,-1.4,0);
  g.add(bunt,tables,food,pile,fire);e.root.add(g);e.fest={g,pile,bunt,tables,food,fire,flame};
}
function animFest(e){
  const b=e.b,f=b.fest,st=f?f.st:'';
  if(!e.fest){if(!st||b.state!=='done')return;mountFest(e);}
  const F=e.fest,show=st==='prep'||st==='ready'||st==='on'||(st==='cool'&&S.t<f.glowT);
  F.g.visible=show;if(!show)return;
  const prog=st==='prep'?Math.min(1,(S.t-f.t0)/(f.due-f.t0)):1,N0=Sim.FEST.need;
  F.pile.visible=st==='prep'||st==='ready';F.pile.scale.setScalar(.3+.7*Math.min(1,f.have.wood/N0.wood));
  F.bunt.visible=prog>=.5;F.tables.visible=prog>=.7;
  F.food.visible=prog>=.7&&f.have.food>0;F.food.scale.setScalar(.4+.6*Math.min(1,f.have.food/N0.food));
  F.fire.visible=st==='on';
  if(st==='on')F.flame.scale.set(1+.15*Math.sin(clock*13),1+.3*Math.sin(clock*9+1),1+.15*Math.sin(clock*11));
}
const EDICTS=[
  {k:'noUpgrade',ic:'🏚️',t:'Vieta l\'avanzamento delle Case',d:'Le famiglie non potranno più migliorare la propria casa: i livelli restano come sono.',fx:'Utile per tenere basso il livello del borgo.'},
  {k:'noImmig',ic:'🚧',t:'Blocca l\'immigrazione',d:'I viandanti non si fermeranno più in paese e nessun nuovo abitante arriverà da fuori.',fx:'La popolazione crescerà solo con le nascite.'},
  {k:'birthBonus',ic:'👶',t:'Incentivo alle nascite',d:'Le famiglie con una coppia in salute hanno figli più spesso: la comunità promette doni e aiuto ai genitori.',fx:'Più bambini = più bocche da sfamare e più legna da scaldare.'},
  {k:'schoolMandatory',ic:'📖',t:'Istruzione obbligatoria',d:'I bambini dai 6 anni frequentano la scuola anche il pomeriggio e imparano più in fretta.',fx:'Meno aiuto in giardino, ma più persone istruite. Serve una scuola con maestro.'},
  {k:'quarantine',ic:'🚷',t:'Quarantena',d:'Si chiudono porte e mercati: niente viandanti né nuovi arrivi, niente banchi e baratti. Il contagio rallenta molto.',fx:'Il commercio si ferma finché resta in vigore.'},
  {k:'woodDuty',ic:'🪵',t:'Obbligo di legna da ardere',d:'Ogni famiglia deve tenere in casa il doppio della scorta di legna e comprarla al mercato in ogni stagione; le case col giardino della legna ne tengono fino a 32.',fx:'Case più calde e sane, ma i giardini rendono un po\' meno.'}];
function renderEdicts(){
  const E=S.edicts||{};
  $('edList').innerHTML=EDICTS.map(e=>`<div class="edC${E[e.k]?' on':''}"><div class="ic">${e.ic}</div><div><b>${e.t}</b><span class="d">${e.d}</span><span class="fx">${E[e.k]?'In vigore · ':''}${e.fx}</span></div><button class="btn" type="button" data-ed="${e.k}">${E[e.k]?'Ritira':'Emana'}</button><div class="seal">✠</div></div>`).join('')+
  '<div class="edC lock"><div class="ic">🔒</div><div><b>Altri editti</b><span class="d">Nuovi decreti si sbloccheranno man mano che il borgo cresce.</span></div></div>';
}
function openEdicts(v){$('edicts').hidden=!v;$('edictBtn').classList.toggle('on',!!v);if(v)renderEdicts();}
$('edictBtn').addEventListener('click',()=>openEdicts($('edicts').hidden));
$('edClose').addEventListener('click',()=>openEdicts(false));
$('edicts').addEventListener('click',ev=>{if(ev.target===$('edicts')){openEdicts(false);return;}const bt=ev.target.closest&&ev.target.closest('[data-ed]');if(!bt)return;const k=bt.getAttribute('data-ed');const on=!(S.edicts&&S.edicts[k]);Sim.setEdict(k,on);const e=EDICTS.find(x=>x.k===k);toast(on?`Editto emanato: ${e.t}`:`Editto ritirato: ${e.t}`);renderEdicts();});
addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('edicts').hidden)openEdicts(false);});

// ---------- commercio: registro delle rotte (v44) ----------
let tradeCache='';
const TDIR={w:'⬅',n:'⬆',e:'➡',s:'⬇'};
const tgood=(k,q,p)=>`${Sim.TGN[k]}${q?' ×'+q:''}${p?' ('+p+')':''}`;
const tprices=o=>Object.keys(o).map(k=>`<span>${Sim.TGN[k]} ${o[k]}</span>`).join('');
const daysTxt=sec=>{const d=sec/Sim.DAY;return d<0.5?'poche ore':d<1.5?'circa 1 giorno':'circa '+Math.round(d)+' giorni';};
function tradeRule(){
  const K=Sim.T_KEEP,T=Sim.T_TARGET;
  return `Il merciaio vende ciò che supera la scorta da tenere (legno ${K.wood}, pietra ${K.stone}, ferro ${K.iron}, assi ${K.planks}; per cibo, attrezzi e abiti il fabbisogno delle case più ${K.tools}-${K.bread} pezzi) e compra ciò che manca (legno sotto ${T.wood}, pietra ${T.stone}, ferro ${T.iron}, assi ${T.planks} e solo con una falegnameria; attrezzi, pane, tessuto e abiti per gli scaffali della merceria, pesce e carne per le case secondo il bisogno). Al massimo ${Sim.VISIT_CAP} pezzi per merce a visita, e spende al massimo metà della cassa.`;
}
function renderTrade(force){
  if($('trade').hidden)return;
  const st=Sim.tradeStatus(),O=S.tradeOpt,live=Sim.guests().filter(g=>g.caravan);
  const hasHub=[...Sim.buildings().values()].some(b=>b.type==='mercery'&&b.state==='done');
  let h=`<div class="trTop"><div class="trPurse">Denari in cassa: <b>${S.coins}</b></div><div class="trOpt"><button class="btn${O.sell?'':' off'}" type="button" data-topt="sell">Vendi eccedenze: ${O.sell?'sì':'no'}</button><button class="btn${O.buy?'':' off'}" type="button" data-topt="buy">Compra il necessario: ${O.buy?'sì':'no'}</button></div></div>`;
  h+=`<p class="trRule">${tradeRule()}</p>`;
  if(!st.ok)h+=`<div class="trWarn">${esc(st.why)}</div>`;
  h+=Sim.ROUTE_IDS.map(id=>{
    const T=Sim.TOWNS[id],r=S.routes.find(x=>x.id===id);
    let state='';
    if(r.open){
      const coming=live.some(g=>g.route===id);
      state=`<span class="fx">Rotta aperta · ${r.visits} visite · incassati ${r.earned} · spesi ${r.spent} · `+(!st.ok?'carovane ferme':coming?'una carovana è in arrivo':r.blocked?'la carovana non trova la strada fino alla Merceria: libera un passaggio dal bordo della mappa':'prossima carovana tra '+daysTxt(r.next))+`</span>`;
    }else state=`<span class="fx">${hasHub?`Rotta chiusa: aprirla costa ${T.cost} denari.`:'Rotta chiusa: serve prima una Merceria.'}</span>`;
    const btn=r.open?'':`<button class="btn" type="button" data-route="${id}" title="Costa ${T.cost} denari">Apri · ${T.cost}</button>`;
    return `<div class="edC${r.open?' on':''}"><div class="ic">${TDIR[id]}</div><div><b>${T.name} <small>· a ${T.side}</small></b><span class="d">${T.desc}</span><div class="trP"><em>Vende a te:</em>${tprices(T.sells)}</div><div class="trP"><em>Compra da te:</em>${tprices(T.buys)}</div>${state}</div>${btn}<div class="seal">✠</div></div>`;
  }).join('');
  const lg=(S.tlog||[]).slice(0,8);
  h+=`<div class="trLog"><h4>Ultime carovane · incassati ${S.trade.sold} · spesi ${S.trade.bought}</h4>`+(lg.length?lg.map(e=>{const T=Sim.TOWNS[e.route];
    const sv=e.sold.length?'vendute: '+e.sold.map(x=>tgood(x.k,x.q,x.p)).join(', ')+' = +'+e.earned:'',bg=e.bought.length?'comprate: '+e.bought.map(x=>tgood(x.k,x.q,x.p)).join(', ')+' = −'+e.spent:'';
    return `<div><b>${T.name}</b> · ${Sim.dateStr(e.t)} — ${[sv,bg].filter(Boolean).join(' · ')||'nessuno scambio'}</div>`;}).join(''):'<div>Nessuna carovana è ancora passata.</div>')+`</div>`;
  if(force||h!==tradeCache){tradeCache=h;$('trList').innerHTML=h;}
}
function openTrade(v){$('trade').hidden=!v;$('tradeBtn').classList.toggle('on',!!v);if(v)renderTrade(true);}
$('tradeBtn').addEventListener('click',()=>openTrade($('trade').hidden));
$('trClose').addEventListener('click',()=>openTrade(false));
{const el=$('chipCoins');el.addEventListener('click',()=>openTrade(true));el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();openTrade(true);}});}
$('trade').addEventListener('click',ev=>{
  if(ev.target===$('trade')){openTrade(false);return;}
  const rt=ev.target.closest&&ev.target.closest('[data-route]');
  if(rt){const res=Sim.unlockRoute(rt.getAttribute('data-route'));toast(res.msg,!res.ok);renderTrade(true);return;}
  const op=ev.target.closest&&ev.target.closest('[data-topt]');
  if(op){const k=op.getAttribute('data-topt');Sim.setTradeOpt(k,!S.tradeOpt[k]);renderTrade(true);}
});
addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('trade').hidden)openTrade(false);});
$('zSet').addEventListener('click',()=>{const b=selB();if(!b)return;zoneEdit=zoneEdit===b.id?null:b.id;if(zoneEdit)toast(document.body.classList.contains('touch')?'Tocca la mappa dove vuoi il centro della zona di lavoro. Ritocca il pulsante per annullare.':'Clicca sulla mappa il centro della zona di lavoro. Tasto destro per annullare.');refreshSel();});
$('zMinus').addEventListener('click',()=>{const b=selB();if(!b)return;const r=(b.zone?b.zone.r:(b.type==='forester'?72:39))-6;Sim.setZone(b.id,b.zone?b.zone.c:b.cell,r);refreshSel();});
$('zPlus').addEventListener('click',()=>{const b=selB();if(!b)return;const r=(b.zone?b.zone.r:(b.type==='forester'?72:39))+6;Sim.setZone(b.id,b.zone?b.zone.c:b.cell,r);refreshSel();});
$('zReset').addEventListener('click',()=>{const b=selB();if(!b)return;Sim.setZone(b.id,-1,0);refreshSel();});
$('wMinus').addEventListener('click',()=>{if(sel){const b=Sim.buildings().get(sel);if(b)Sim.setWant(sel,b.want-1);refreshSel();}});
$('wPlus').addEventListener('click',()=>{if(sel){const b=Sim.buildings().get(sel);if(b)Sim.setWant(sel,b.want+1);refreshSel();}});
$('selDemo').addEventListener('click',()=>{if(!sel)return;const b=Sim.buildings().get(sel);if(!b)return;
  const dm=Sim.canDemolish(b);if(dm){toast(dm,true);return;}
  if(b.type==='store'&&!b.center&&b.state==='done'&&[...Sim.buildings().values()].filter(q=>q.type==='store'&&q.state==='done').length<=1){toast('Serve almeno un magazzino.',true);return;}
  Sim.removeBuilding(sel);});

// ---------- input ----------
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hitP=new THREE.Vector3();
function setRay(e){const r=cv.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,camera);}
function cellAt(e,off){setRay(off?{clientX:e.clientX,clientY:e.clientY-off}:e);if(!ray.ray.intersectPlane(plane,hitP))return null;
  const cx=Math.floor((hitP.x+W/2)/CS),cy=Math.floor((hitP.z+W/2)/CS);if(cx<0||cy<0||cx>=N||cy>=N)return null;return {cx,cy};}
const anchor=(type,c)=>{const [w,h]=Sim.dimsOf(BT[type],rot);return {x:c.cx-Math.floor((w-1)/2),y:c.cy-Math.floor((h-1)/2)};};
const isDist=id=>TOOL[id]&&TOOL[id].dt!==undefined;
const keys={};
const ptrs=new Map(),TOFF=64;let gest=null,lockPtr=false;
function updPbar(){const on=pend&&BT[tool]&&!zoneEdit;$('pbar').hidden=!on;if(!on)return;const c=Sim.costOf(tool),p=[];if(c.wood)p.push('legno '+c.wood);if(c.stone)p.push('pietra '+c.stone);if(c.planks)p.push('assi '+c.planks);$('pName').textContent=BT[tool].name+(p.length?' · '+p.join(', '):'');$('pRot').style.display=NOGATE[tool]?'none':'';}
$('pOk').addEventListener('click',()=>{if(!hover||!BT[tool])return;const a=anchor(tool,hover),r=Sim.place(tool,a.x,a.y,rot);if(!r.ok)toast(r.msg,true);});
$('pRot').addEventListener('click',()=>rotate());
$('pNo').addEventListener('click',()=>{pend=false;hover=null;updPbar();});
// gesti a due dita: pizzico = zoom, torsione = rotazione, trascinamento = spostamento
function gInfo(){const a=[...ptrs.values()],p=a[0],q=a[1];return {d:Math.hypot(q.x-p.x,q.y-p.y)||1,ang:Math.atan2(q.y-p.y,q.x-p.x),mx:(p.x+q.x)/2,my:(p.y+q.y)/2};}
function startGest(){const g=gInfo();gest={d:g.d,ang:g.ang,mx:g.mx,my:g.my,goal:cam.goal,yaw:cam.yaw};}
function moveGest(){
  if(!gest||ptrs.size<2)return;const g=gInfo();
  cam.goal=Math.max(16,Math.min(150,gest.goal*gest.d/g.d));
  cam.yaw=gest.yaw+(g.ang-gest.ang);
  const dx=g.mx-gest.mx,dy=g.my-gest.my;gest.mx=g.mx;gest.my=g.my;
  const k=cam.dist*0.0019,sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw),kf=k/Math.max(.5,Math.sin(cam.pitch));
  cam.x+=-cy*dx*k-sy*dy*kf;cam.z+=sy*dx*k-cy*dy*kf;
}
function ptrUp(e){
  const t=e.pointerType==='touch';
  if(t){ptrs.delete(e.pointerId);
    if(gest){if(ptrs.size<2){gest=null;lockPtr=ptrs.size>0;}drag=null;return;}
    if(lockPtr){if(!ptrs.size)lockPtr=false;drag=null;return;}}
  const wasPlace=drag&&drag.m==='place';
  endDrag();
  if(t&&!(wasPlace||pend))hover=null;
}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
  cv.focus();cv.setPointerCapture(e.pointerId);const touch=e.pointerType==='touch';
  if(touch){document.body.classList.add('touch');ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size>=2){drag=null;startGest();return;}if(lockPtr)return;}
  const c=cellAt(e,touch&&BT[tool]&&!zoneEdit?TOFF:0);
  if(e.button===2){drag={m:'rot',x:e.clientX,y:e.clientY,acc:0};return;}
  if(e.button===1){e.preventDefault();drag={m:'pan',x:e.clientX,y:e.clientY};return;}
  if(e.button!==0)return;
  if(zoneEdit&&c){const b=Sim.buildings().get(zoneEdit);if(b){Sim.setZone(b.id,c.cy*N+c.cx,b.zone?b.zone.r:(b.type==='forester'?60:39));toast('Zona di lavoro impostata.');}zoneEdit=null;refreshSel();return;}
  if(tool==='pan'){drag={m:'pan',x:e.clientX,y:e.clientY};return;}
  if(tool==='select'){drag={m:'selpan',x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};return;}
  if(!c)return;
  if(isDist(tool)){drag={m:tool,a:c,b:c};return;}
  if(tool==='road'){drag={m:'road',last:c};Sim.paintRoad(c.cx,c.cy);return;}
  if(tool==='demolish'){const r=Sim.demolishAt(c.cx,c.cy);if(r&&r!=='ok')toast(r,true);return;}
  if(BT[tool]){if(touch){hover=c;pend=true;drag={m:'place'};updPbar();return;}const a=anchor(tool,c),r=Sim.place(tool,a.x,a.y,rot);if(!r.ok)toast(r.msg,true);}
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'){const p=ptrs.get(e.pointerId);if(p){p.x=e.clientX;p.y=e.clientY;}if(gest){moveGest();return;}if(lockPtr)return;}
  if(drag&&drag.m==='selpan'){
    if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<(e.pointerType==='touch'?10:5))return;
    drag.moved=true;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    const k=cam.dist*0.0019,sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw),kf=k/Math.max(.5,Math.sin(cam.pitch));
    cam.x+=-cy*dx*k-sy*dy*kf;cam.z+=sy*dx*k-cy*dy*kf;return;
  }
  if(drag&&(drag.m==='rot'||drag.m==='pan')){
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.acc=(drag.acc||0)+Math.abs(dx)+Math.abs(dy);
    if(drag.m==='rot'){cam.yaw-=dx*0.006;cam.pitch=Math.max(0.35,Math.min(1.35,cam.pitch+dy*0.005));}
    else{const k=cam.dist*0.0019,sy=Math.sin(cam.yaw),cy=Math.cos(cam.yaw),kf=k/Math.max(.5,Math.sin(cam.pitch));
      cam.x+=-cy*dx*k-sy*dy*kf;cam.z+=sy*dx*k-cy*dy*kf;}
    return;
  }
  const c=cellAt(e,e.pointerType==='touch'&&drag&&drag.m==='place'?TOFF:0);hover=c;
  if(drag&&c){
    if(isDist(drag.m))drag.b=c;
    else if(drag.m==='road'){let x=drag.last.cx,y=drag.last.cy;const dx=Math.abs(c.cx-x),dy=Math.abs(c.cy-y),sx=x<c.cx?1:-1,sy=y<c.cy?1:-1;let er=dx-dy;
      while(true){Sim.paintRoad(x,y);if(x===c.cx&&y===c.cy)break;const e2=2*er;if(e2>-dy){er-=dy;x+=sx;}if(e2<dx){er+=dx;y+=sy;}}drag.last=c;}
  }
});
function endDrag(){
  if(drag&&drag.m==='rot'&&(drag.acc||0)<6){setTool('select');select(null);toast('Modalità Osserva.');}
  if(drag&&drag.m==='selpan'&&!drag.moved){setRay({clientX:drag.sx,clientY:drag.sy});const vh=ray.intersectObjects(vpick,false),h=ray.intersectObjects(pickables,false);
    if(vh.length&&(!h.length||vh[0].distance<=h[0].distance+3))openCard(vh[0].object.userData.vid);else select(h.length?h[0].object.userData.bid:null);}
  if(drag&&isDist(drag.m)){
    const t=TOOL[drag.m];const n=Sim.paintDistrict(drag.a.cx,drag.a.cy,drag.b.cx,drag.b.cy,t.dt);
    if(t.dt===1&&(Math.abs(drag.a.cx-drag.b.cx)<9||Math.abs(drag.a.cy-drag.b.cy)<9))toast('Zona residenziale piccola: una casa con giardino richiede circa 8×5 celle libere. Disegna un rettangolo più ampio (1 lotto = 3×3 celle).',true);
    if(n===0&&t.dt)toast('Quella zona è già di questo tipo.');
  }
  drag=null;
}
cv.addEventListener('pointerup',ptrUp);cv.addEventListener('pointercancel',ptrUp);
cv.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')hover=null;});
cv.addEventListener('wheel',e=>{e.preventDefault();cam.goal=Math.max(16,Math.min(150,cam.goal*Math.exp(e.deltaY*0.0012)));},{passive:false});
const TK={};TOOLS.forEach(t=>{if(t.key)TK[t.key]=t.id;});
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='s'){e.preventDefault();quickSave();return;}
  keys[k]=true;
  if(TK[k])setTool(TK[k]);
  if(k==='r'&&BT[tool]&&!NOGATE[tool]){rotate();}
  if(k==='v')toggleAttr();
  if(k==='j')toggleZones();
  if(k==='escape'){setTool('select');select(null);}
  if(k===' '){e.preventDefault();setSpeed(speed===0?1:0);}
  if(k.startsWith('arrow'))e.preventDefault();
});
function rotate(){rot=(rot+1)%4;}
$('rotBtn').addEventListener('click',rotate);
function toggleZones(){zonesOn=!zonesOn;$('zoneBtn').classList.toggle('on',zonesOn);groundDirty=true;if(zonesOn)toast('Zone segnalate: icona arco e freccia (arancione) = caccia nei boschi fitti e tranquilli, icona pesce (azzurra) = pesca su rive di lago e fiume (in inverno ghiacciate).');}
$('zoneBtn').addEventListener('click',toggleZones);
function toggleAttr(){attrOn=!attrOn;$('attrBtn').classList.toggle('on',attrOn);groundDirty=true;}
$('attrBtn').addEventListener('click',toggleAttr);
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
$('camL').addEventListener('click',()=>{cam.yaw+=0.4;});$('camR').addEventListener('click',()=>{cam.yaw-=0.4;});
$('camIn').addEventListener('click',()=>{cam.goal=Math.max(16,cam.goal*0.8);});$('camOut').addEventListener('click',()=>{cam.goal=Math.min(150,cam.goal*1.25);});

// ---------- velocità ----------
let speed=1;
function setSpeed(s){speed=s;document.querySelectorAll('#speed .btn[data-s]').forEach(b=>b.classList.toggle('on',+b.dataset.s===s));}
document.querySelectorAll('#speed .btn[data-s]').forEach(b=>b.addEventListener('click',()=>setSpeed(+b.dataset.s)));

// ---------- il Regno: guida della storia, messo del Re, progetti (v48) ----------
// Niente più obiettivi a livelli: gli abitanti dicono cosa serve e il Re concede un nuovo titolo (con nuovi progetti) quando il borgo è cresciuto.
const ZONE_PRJ={d2:'Zona agricola',d3:'Zona di mercato',d4:'Zona forestale',d5:'Zona di pascolo'};
const prName=id=>ZONE_PRJ[id]||(BT[id]?BT[id].name:id);
const prHint=id=>{const t=TOOL[id];return t?t.hint:'';};
const owns=id=>Sim.owns(id);
// consigli degli abitanti: il primo passo non ancora fatto è la frase letta nel pannello (GUIDE[titolo])
const GUIDE=[
  [[s=>(s.built.wood||0)>=1,'Servono legno e pietra, e ne abbiamo poco. Indicaci dove costruire il taglialegna, vicino a un bosco.'],
   [s=>(s.built.quarry||0)>=1,'Ora la pietra: costruisci una cava vicino alle rocce.'],
   [s=>s.dc[1]>=4,'Dove costruiamo le case? Disegna un quartiere residenziale (tasto 2).'],
   [s=>s.pop>=8&&s.houses>=3,'Le famiglie arrivano dove ci sono case, cibo e lavoro: lascia crescere il borgo.']],
  [[s=>owns('well')&&owns('d3'),'Il messo ci ha lasciato dei progetti: apri i Progetti del Re (🏛️) e compra il pozzo e la zona di mercato.'],
   [s=>(s.built.well||0)>=1,'Costruisci il pozzo: con l\'acqua vicina la gente sta meglio.'],
   [s=>s.dc[3]>=4,'Disegna una zona di mercato: qui le famiglie scambieranno i prodotti dei loro giardini.'],
   [s=>s.pop>=16,'Più case e più braccia: il borgo deve crescere ancora.']],
  [[s=>owns('church')&&owns('d2'),'Nuovi progetti dal Re: compra la chiesa e la zona agricola (🏛️).'],
   [s=>(s.built.church||0)>=1,'Costruisci la chiesa: le case di livello più alto ne hanno bisogno, e la gente vuole pregare.'],
   [s=>s.farms>=1,'Disegna una zona agricola: le famiglie vi fonderanno le fattorie.'],
   [s=>s.pop>=28,'Servono ancora abitanti: cibo, acqua e una chiesa vicina li tengono contenti.']],
  [[s=>owns('watchtower'),'Con il titolo di Borgo arrivano i predoni. Compra il progetto della torre di guardia (🏛️).'],
   [s=>(s.built.watchtower||0)>=1,'Costruisci una torre di guardia vicino ai magazzini: i predoni cercano le nostre scorte.'],
   [s=>Sim.S.raid.repelled>=1,'Resisti ai predoni: più torri vicino alle scorte significano meno furti.'],
   [s=>s.pop>=40,'Il borgo deve crescere ancora.']],
  [[s=>owns('barracks')&&owns('mercery')&&owns('inn'),'Compra la caserma, la merceria e la locanda (🏛️): servono a difendere e a commerciare.'],
   [s=>(s.built.mercery||0)>=1,'Costruisci la Merceria: con lei arrivano le carovane e i denari.'],
   [s=>(s.built.inn||0)>=1,'Costruisci la locanda: i viandanti portano notizie e merci.'],
   [s=>(s.built.barracks||0)>=1,'Costruisci una caserma: i soldati escono quando ci sono nemici.'],
   [s=>s.pop>=60,'Il borgo cresce: ancora un po\' di gente e il Re se ne accorgerà.']],
  [[s=>owns('hall')&&owns('plaza'),'Nuovi progetti, ma ora costano anche denari: commercia con le città e compra la sala delle feste e la piazza (🏛️).'],
   [s=>(s.built.hall||0)>=1,'Costruisci la sala delle feste.'],
   [s=>(s.built.plaza||0)>=1,'Costruisci la piazza con la fontana.'],
   [s=>Sim.S.routes.filter(r=>r.open).length>=2,'Apri almeno due rotte commerciali (💰): servono denari.'],
   [s=>s.pop>=85,'Ancora un po\' di gente e saremo una Città.']],
  [[s=>false,'Siamo una Città. Il Re ci osserva con sospetto: più cresciamo, più ci teme. Prepariamo le difese.']],
  [[s=>false,'Sei il Re. La capitale del regno è nata da una carovana di sette carri.']]
];
// allarmi: guerra e predoni si leggono sempre, anche con i consigli spenti
function alertLine(inf){
  const W=inf.war;
  if(W.phase==='warn'){const d=Math.max(1,Math.ceil((W.at-S.t)/Sim.DAY));return {t:`Il Re ci ha dichiarato guerra! L'esercito arriverà tra ${d} ${d===1?'giorno':'giorni'}: torri di guardia e caserme intorno al centro del borgo!`,war:true};}
  if(W.phase==='fight')return {t:'L\'esercito del Re assedia il centro del borgo: difendilo!',war:true};
  if(inf.raiders)return {t:'Predoni! Le torri e la caserma difendono i magazzini.',war:true};
  return null;
}
// consigli urgenti: la prima condizione vera vince (ordine = priorità)
const ADVICE=[
  [(st)=>st.pop>=4&&st.hungry>=2,'Molte famiglie hanno fame. Servono ortaggi, uova, pesce o grano: i giardini delle case, una zona agricola o un pescatore aiutano.'],
  [(st)=>st.houses>=3&&st.fireNeed>0&&st.fire<st.fireNeed*0.4,'La legna da ardere scarseggia e le case al freddo si ammalano. Un giardino della legna, o il mercato, ne danno.'],
  [(st)=>st.plague,'Epidemia! I malati restano a letto. Un pozzo e legna in casa frenano il contagio'+(owns('infirmary')?', e un ospizio con un erborista cura i malati.':'.')],
  [(st)=>owns('infirmary')&&st.sick>=3&&!(st.built.infirmary),'Ci sono troppi malati. Un ospizio con un erborista li cura più in fretta.'],
  [(st)=>st.unhappy>=3,'Alcuni sono scontenti. Apri il pannello della gente (clic su Abitanti, poi Felicità): dice cosa manca, tra cibo, casa, acqua e chiesa.'],
  [(st)=>st.sites>0&&S.stock.wood<8,'Il legno è finito e i cantieri aspettano. Servono più taglialegna: costruiscine un altro vicino a un bosco.'],
  [(st)=>st.sites>0&&S.stock.stone<5,'La pietra è finita e i cantieri aspettano. Una seconda cava, vicino alle rocce, risolve.'],
  [(st)=>st.houses>0&&st.pop>=st.cap-1&&st.pop>=8,'Nelle case non c\'è più posto. Disegna altri lotti residenziali.'],
  [(st)=>st.pop>=8&&st.att.unemp>=3,'Troppi adulti senza lavoro. Servono nuove botteghe, cave o fattorie per dar loro un mestiere.'],
  [(st)=>st.pop>=8&&st.att.unemp===0&&st.slots-st.jobs>=5,'Molti posti di lavoro restano vuoti. Servono più famiglie: più case e più attrattiva (pozzo, mercato, chiesa).'],
  [(st)=>{const m=Sim.maintStats();return owns('smithy')&&m.worn>=2&&S.stock.tools<1&&!(st.built.smithy);},'Gli edifici si logorano. Senza attrezzi non si ripara nulla: serve un fabbro con la sua fucina.'],
  [(st)=>{const m=Sim.maintStats();return owns('smithy')&&m.worn>=2&&S.stock.tools<1;},'Gli edifici logori aspettano gli attrezzi: la fucina deve avere ferro e lavoratori.'],
  [(st)=>{const m=Sim.maintStats();return owns('smithy')&&m.worn>=2&&S.stock.tools>=1;},'Gli edifici logori verranno riparati: servono muratori o gente libera che porti gli attrezzi.'],
  [(st)=>S.stock.wood>=(st.capRes||80)*0.97&&st.pop>=8,'Il legno si accumula e rischia di andare sprecato: costruisci edifici che lo usino.'],
  [(st)=>S.coins>=300&&Sim.S.routes.some(r=>!r.open)&&owns('mercery')&&(st.built.mercery||0)>=1,'Abbiamo denari da parte: apri una nuova rotta commerciale (💰).']
];
// quando non c'è nulla di urgente e i passi del titolo sono fatti, a rotazione (cambia ogni due giorni)
const TIPS=[
  ['Il lavoro non finisce: più famiglie arrivano se il paese è tranquillo e ha da mangiare.','Le strade nascono dai passi: costruisci i lavori vicino alle case e i sentieri si formeranno da soli.','Un taglialegna e una cava vicino alle case lavorano meglio, ma fanno rumore: la gente non ama abitarci accanto.'],
  ['Un pozzo e un mercato tra le case rendono la zona più piacevole: le famiglie ci arrivano volentieri.','Taglia gli alberi vicino alle case ma non tutti: senza boschi il legno finisce.','Frate Anselmo dice che una chiesa non è lontana: gente che prega è gente che resta.'],
  ['Ogni casa ha il suo giardino: qui nascono ortaggi, galline, legna da ardere. Lascia spazio tra i lotti.','Le fattorie nutrono il borgo: cresci insieme ai campi, non prima.','Gli abitanti nuovi arrivano dove c\'è da mangiare e un tetto sicuro.'],
  ['Le torri di guardia vicino ai magazzini fermano i predoni: ne servono almeno due vicine.','Non lasciare le scorte lontane dalla torre: i predoni cercano ciò che è indifeso.','Legna da ardere in ogni casa: d\'inverno salva molte vite.'],
  ['La merceria porta le carovane: apri le rotte con le città vicine per vendere le eccedenze.','Una locanda attira viandanti, e qualcuno resta a vivere in paese.','Soldati e torri attorno al centro: così si difende un borgo.'],
  ['La sala delle feste e la piazza rendono felici le case intorno: la gente festeggia nei giorni di mercato.','Telai e sartorie vestono la gente: chi è ben vestito è più contento.','Le rotte commerciali fruttano denari: spendili per i progetti del Re.'],
  ['Una città ricca attira l\'attenzione del Re. Torri e caserme intorno al centro non sono mai troppe.','Tieni scorte di legno, pietra e attrezzi: se il Re ci assedierà, serviranno per ricostruire.','Più case signorili, più rotte e più abitanti: il Re ci osserva e non è tranquillo.'],
  ['Il regno è tuo. Costruisci, abbellisci e fai crescere la tua capitale.','Le feste di paese, le piazze e le statue rendono memorabile una capitale.','I predoni arrivano ancora: tieni in ordine le difese.']
];
const SEASON_TIP=['In primavera il ghiaccio si scioglie: i giardini tornano a produrre.','L\'estate è la stagione dei raccolti: fai scorta di cibo per l\'inverno.','L\'autunno è l\'ultimo raccolto: fate scorta di cibo e di legna da ardere.','È inverno: i laghi gelano, la pesca si ferma e serve legna in ogni casa.'];
function adviceLine(st,inf){
  for(const [c,t] of ADVICE)if(c(st))return {t};
  const list=GUIDE[Math.min(inf.rank,GUIDE.length-1)]||[];
  for(const [done,txt] of list)if(!done(st))return {t:txt};
  if(inf.rank>=1&&newProjects())return {t:'Il Re ci concede dei progetti e possiamo permetterceli: apri i Progetti del Re (🏛️).'};
  const tips=(TIPS[Math.min(inf.rank,TIPS.length-1)]||[]).concat([SEASON_TIP[S.season|0]||'']);
  const k=Math.floor((S.day|0)/2)%tips.length;
  return {t:(inf.rank<6?'Il borgo è pronto: attendiamo il messo del Re. ':'')+tips[k]};
}
function guideLine(st,inf){
  const a=alertLine(inf);if(a)return a;
  return adviceOn?adviceLine(st,inf):{t:''};
}
let guideKey='',guideN=0,adviceOn=true;
function setAdvice(v){adviceOn=!!v;guideKey='';const b=$('advBtn');b.textContent=adviceOn?'💬 Consigli: sì':'💬 Consigli: no';b.classList.toggle('on',adviceOn);}
function refreshGuide(st){
  guideN++;const inf=Sim.regnoInfo(st);
  $('lvl').hidden=!inf.story;if(!inf.story)return;
  $('lvlTitle').textContent=`${inf.name}`;
  const g=guideLine(st,inf);
  const needs=inf.needs||[];
  const head=inf.rank<6?`Il Re concederà il titolo di ${inf.nextName} quando:`:(inf.warNeeds&&inf.needs?'Il Re ti dichiarerà guerra quando il borgo avrà:':'');
  const key=g.t+'|'+head+'|'+needs.map(x=>x.cur+'/'+x.n).join(',');
  if(key===guideKey)return;guideKey=key;
  const gd=$('guide');gd.textContent=g.t;gd.classList.toggle('war',!!g.war);
  $('goalsH').textContent=head;
  const ul=$('goals');ul.innerHTML='';
  for(const x of needs){const li=document.createElement('li');li.className=x.cur>=x.n?'done':'';li.innerHTML=`<span>${esc(x.t)}</span><em>${x.cur}/${x.n}</em>`;ul.appendChild(li);}
}
function showLevel(){guideKey='';refreshGuide(Sim.stats());}
$('advBtn').addEventListener('click',()=>{setAdvice(!adviceOn);showLevel();});
setAdvice(true);
$('lvlTitle').addEventListener('click',()=>$('lvl').classList.toggle('collapsed'));
if(window.innerWidth<640||COARSE)$('lvl').classList.add('collapsed');

// ---- messo del Re: pergamene ----
const INTRO={t:'Il nostro insediamento',f:'La tua gente',btn:'Al lavoro',x:[
  'Eccoci arrivati. Questa è la nostra terra.',
  'Abbiamo parlato a lungo, durante il viaggio, e abbiamo deciso: sarai tu a guidarci. Ogni scelta spetterà a te, e noi ti seguiremo.',
  'Ci servono presto dei tetti sopra la testa, ma non abbiamo quasi nulla. Prima bisogna procurarsi legno e pietra: indicaci dove tagliare gli alberi e dove cavare la roccia.',
  'Poi mostraci dove costruire le case.']};
const RANK_MSG=[null,
  ['Il Re ha udito che in questa valle si lavora con ordine. Per suo volere il vostro accampamento è riconosciuto come CASALE.','Sua Maestà concede ai vostri capimastri di acquistare i progetti di nuovi edifici: pozzi, magazzini e le prime zone di lavoro.'],
  ['Le vostre case sono ormai tante e il fumo dei camini si vede da lontano. Il Re vi riconosce il titolo di VILLAGGIO.','Concede i progetti della chiesa e delle prime botteghe: Frate Anselmo dice che sarebbe ora di una campana.'],
  ['Mercato, chiesa e campi: ora avete tutto ciò che fa di un villaggio un BORGO, e il Re ve ne dà il titolo.','Ma un borgo ricco attira anche cattive attenzioni: dai boschi giungono voci di predoni. Il Re vi esorta a costruire torri di guardia e a difendere le scorte.'],
  ['Avete respinto i predoni: il Re vi riconosce come BORGO FORTIFICATO.','Concede i progetti della caserma, della merceria e della locanda. Chi ha una guarnigione può permettersi di commerciare.'],
  ['Le vostre difese hanno fatto parlare tutto il regno. Il Re vi eleva a TERRA MURATA.','I progetti dei telai, della sala delle feste e della piazza si pagano ora anche con denari: i mercanti delle città vicine sapranno come procurarveli.'],
  ['Il Re vi concede il titolo di CITTÀ, la più alta dignità che un suo suddito possa ricevere.','Ma si dice a corte che il Re non sia sereno: una città tanto ricca e tanto forte potrebbe un giorno non aver più bisogno di lui.']];
const MSGS={
  war:{t:'Dichiarazione di guerra',f:'Il messo del Re',btn:'Prepariamoci',x:['Il Re, che un tempo vi concesse i titoli, ora teme la vostra forza e non può più tollerare una città che non gli appartiene.','Tra tre giorni il suo esercito marcerà sul vostro borgo. Chi tiene il centro del borgo resterà padrone di ciò che ha costruito; chi lo perde, perderà scorte e denari.','Torri di guardia e caserme intorno al centro: questo è il momento.']},
  victory:{t:'Il Re sei tu',f:'Il popolo del borgo',btn:'Lunga vita al Re',x:['L\'esercito del Re è stato respinto e i suoi stendardi giacciono nel fango.','Il popolo ti acclama: il regno non ha più un sovrano, e la tua città è ora la CAPITALE DEL REGNO.','Dalla carovana di sette carri di Rocca Nera a questo trono: la storia di Borgo Vivo comincia adesso. Puoi continuare a costruire liberamente.']},
  defeat:{t:'Il borgo è stato saccheggiato',f:'Il messo del Re',btn:'Resistiamo',x:['L\'esercito del Re ha tenuto il centro del borgo e ha portato via parte delle scorte e dei denari.','Si è ritirato, ma tra due giorni tornerà. Rafforza le difese: più torri vicino al centro, più caserme.']}
};
const CITIZEN=[null,
  {t:'Le parole della gente',x:[
    'Il messo è ripartito e ora ti parliamo noi, la tua gente. Lo diciamo con rispetto: da quando siamo qui, ogni giorno ci tocca andare fino a {acqua} con i secchi, e l\'acqua arriva sporca, o ne arriva poca.',
    'Un pozzo qui tra le case ci darebbe acqua fresca e pulita, e meno malanni. È la prima cosa che ti chiediamo.',
    'Poi c\'è un\'altra cosa. Ora che siamo in tanti ognuno ha il suo orto, le sue uova, la sua legna, ma non possiamo scambiarli. Vorremmo un mercato dove le famiglie si incontrino a barattare.',
    'Il Re ti ha dato i progetti: compra il pozzo e la zona di mercato, il resto può aspettare.']},
  {t:'Le parole della gente',x:['Frate Anselmo dice che il villaggio ha bisogno di una chiesa, e noi con lui: la gente vuole un posto dove pregare e le case migliori non crescono senza.','E ci servono campi: più famiglie vogliono più cibo. Compra la chiesa e la zona agricola.']},
  {t:'Le parole della gente',x:['Qualcuno ha visto fuochi nel bosco, di notte. Sono predoni: cercano le nostre scorte.','Ci serve almeno una torre di guardia vicino ai magazzini. Compra il progetto e costruiscila.']},
  {t:'Le parole della gente',x:['Abbiamo respinto i predoni, ma torneranno. Una caserma ci darà dei soldati; una merceria e una locanda ci porteranno carovane e viandanti.','Sono queste le tre cose che ti chiediamo.']},
  {t:'Le parole della gente',x:['Il commercio ci ha arricchiti. Ora vorremmo una piazza con la fontana e una sala per le feste: sono i luoghi dove un borgo si riconosce.','Ci serviranno denari: apri qualche rotta con le città vicine.']},
  {t:'Le parole della gente',x:['Il Re ci teme. Non chiediamo nulla di nuovo: rinforziamo le torri e le caserme intorno al centro, e teniamo scorte per ricostruire.']}];
function citizenMsg(r){
  const c=CITIZEN[r];if(!c)return null;
  const acq=S.mode==='river'?'al fiume':'al lago';
  return {t:c.t,f:'I tuoi abitanti',x:c.x.map(p=>p.replace('{acqua}',acq)),proj:0,btn:'Continua',openProj:r<=5};
}
let envBusy=false,envPrev=1;
function projNames(r){return Sim.PROJ.filter(p=>p.rank===r).map(p=>prName(p.id)).join(', ');}
function openEnvoy(o){
  envBusy=true;envPrev=speed;setSpeed(0);
  $('evTitle').textContent=o.t;$('evFrom').textContent=o.f;
  $('evText').innerHTML=o.x.map(p=>`<p>${esc(p)}</p>`).join('');
  const lp=o.list||o.proj;$('evNew').innerHTML=lp?`<b>Nuovi progetti concessi:</b> ${esc(projNames(lp))}.`:'';
  const bt=$('evBtns');bt.innerHTML='';
  const mk=(txt,fn)=>{const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=txt;b.addEventListener('click',fn);bt.appendChild(b);};
  if(o.proj)mk('Vedi i progetti',()=>{closeEnvoy();openProjects(true);});
  if(o.openProj)mk('Apri i progetti',()=>{closeEnvoy();openProjects(true);});
  mk(o.btn||'Continua',()=>{closeEnvoy();if(o.next)openEnvoy(o.next);});
  $('envoy').hidden=false;
}
function closeEnvoy(){$('envoy').hidden=true;envBusy=false;setSpeed(envPrev===0?1:envPrev);}
function showMsg(m){
  if(m.k==='rank'){openEnvoy({t:`Titolo di ${Sim.RANK_NAMES[m.r]}`,f:'Il messo del Re',x:RANK_MSG[m.r]||[],proj:(adviceOn&&citizenMsg(m.r))?0:(m.r<=6?m.r:0),list:m.r<=6?m.r:0,next:adviceOn?citizenMsg(m.r):null,btn:'Continua'});return;}
  const o=MSGS[m.k];if(o)openEnvoy(o);
}
function pollEnvoy(){
  if(envBusy||!$('envoy').hidden||!Sim.msgCount())return;
  const m=Sim.takeMsg();if(m)showMsg(m);
}

// ---- progetti del Re: si comprano con risorse e, dai titoli alti, anche con denari ----
let prSel=null,prKey='';
function openProjects(v){
  $('projects').hidden=!v;
  if(v){
    if(!prSel||!Sim.projectState(prSel).known){
      const all=Sim.PROJ.map(p=>[p,Sim.projectState(p.id)]);
      const pick=all.find(([p,q])=>!q.owned&&!q.locked&&!q.need.length&&q.afford)||all.find(([p,q])=>!q.owned&&!q.locked&&!q.need.length)||all[0];
      prSel=pick[0].id;
    }
    prKey='';renderProjects(true);
  }
}
const prChip=(k,n,q)=>{const no=q.miss.includes(k)?' no':'';return k==='coins'?`<span class="${no.trim()}"><i class="sw" style="background:#d6ad4e"></i>${n} denari</span>`:`<span class="${no.trim()}"><i class="sw ${k==='wood'?'w':k==='stone'?'s':'p'}"></i>${n} ${k==='wood'?'legno':k==='stone'?'pietra':'ferro'}</span>`;};
const prNodeCls=q=>q.owned?'own':q.locked?'lk':q.need.length?'rq':q.afford?'ok':'av';
const prNodeTxt=q=>q.owned?'✓ Tuo':q.locked?'🔒 Titolo del Re':q.need.length?'⛓ Prima: '+q.need.map(prName).join(', '):q.afford?'Acquistabile':'Mancano risorse';
function renderProjects(force){
  const inf=Sim.regnoInfo(),sts={};
  for(const p of Sim.PROJ)sts[p.id]=Sim.projectState(p.id);
  $('prSub').textContent=`Ogni blueprint si sblocca con il titolo del Re (colonne) e con i blueprint che lo precedono nel suo ramo (linee). Hai ${Math.floor(S.stock.wood)} di legno, ${Math.floor(S.stock.stone)} di pietra e ${Math.floor(S.coins)} denari. Un progetto acquistato resta tuo.`;
  const key=inf.rank+'|'+prSel+'|'+Sim.PROJ.map(p=>{const q=sts[p.id];return(q.owned?'o':q.locked?'l':q.need.length?'r':q.afford?'a':'n')+q.miss.join('');}).join(',');
  if(!force&&key===prKey)return;prKey=key;
  const sc=$('prScroll'),sl=sc.scrollLeft,stp=sc.scrollTop;
  let h='<div class="prGrid"><div class="prCorner"></div>';
  for(let r=1;r<=6;r++)h+=`<div class="prColH${inf.rank<r?' lock':''}">${esc(Sim.RANK_NAMES[r])}${inf.rank<r?' 🔒':''}</div>`;
  for(const br of Sim.BRANCHES){
    h+=`<div class="prRowH">${esc(br.n)}</div>`;
    for(let r=1;r<=6;r++){
      h+='<div class="prCell">';
      for(const p of Sim.PROJ)if(p.br===br.id&&p.rank===r){
        const q=sts[p.id];
        h+=`<button type="button" class="prN ${prNodeCls(q)}${prSel===p.id?' sel':''}" data-n="${p.id}"><b>${esc(prName(p.id))}</b><small>${esc(prNodeTxt(q))}</small></button>`;
      }
      h+='</div>';
    }
  }
  h+='</div><svg id="prLines" xmlns="http://www.w3.org/2000/svg"></svg>';
  $('prIn').innerHTML=h;
  sc.scrollLeft=sl;sc.scrollTop=stp;
  prDetail(sts);prDraw();
}
function prDetail(sts){
  const box=$('prDet'),p=Sim.PROJ.find(x=>x.id===prSel);
  if(!p){box.className='prC';box.innerHTML='<div>Tocca un blueprint per vedere il costo e acquistarlo.</div>';return;}
  const q=sts[p.id],cost=Object.keys(p.cost).map(k=>prChip(k,p.cost[k],q)).join('');
  const req=(p.req||[]).length?`<span class="d rq2">Richiede: ${p.req.map(id=>`<span class="${sts[id]&&sts[id].owned?'':'no'}">${sts[id]&&sts[id].owned?'✓':'✗'} ${esc(prName(id))}</span>`).join(' · ')}</span>`:'';
  const br=Sim.BRANCHES.find(x=>x.id===p.br);
  const btn=q.owned?'<b>✓ Tuo</b>':q.locked?`<span>🔒 Titolo di ${esc(Sim.RANK_NAMES[p.rank])}</span>`:`<button class="btn" type="button" data-p="${p.id}"${(q.afford&&!q.need.length)?'':' disabled'}>Acquista</button>`;
  box.className='prC'+(q.owned?' own':q.locked?' lock':'');
  box.innerHTML=`<div><b>${esc(prName(p.id))}</b><span class="d">${esc(br?br.n:'')} · ${esc(Sim.RANK_NAMES[p.rank])}${prHint(p.id)?' — '+esc(prHint(p.id)):''}</span>${req}<div class="prCost">${cost}</div></div><div>${btn}</div>`;
}
function prDraw(){
  const inn=$('prIn'),svg=$('prLines');if(!inn||!svg||$('projects').hidden||typeof inn.querySelector!=='function')return;
  const R=inn.getBoundingClientRect();svg.style.width=inn.scrollWidth+'px';svg.style.height=inn.scrollHeight+'px';
  let d='';
  for(const p of Sim.PROJ)for(const qid of(p.req||[])){
    const a=inn.querySelector(`[data-n="${qid}"]`),b=inn.querySelector(`[data-n="${p.id}"]`);if(!a||!b)continue;
    const A=a.getBoundingClientRect(),B=b.getBoundingClientRect(),own=Sim.projectState(qid).owned;
    let path;
    if(Math.abs(A.left-B.left)<4){const x1=A.left+A.width/2-R.left,y1=A.bottom-R.top,x2=B.left+B.width/2-R.left,y2=B.top-R.top;path=`M${x1} ${y1}L${x2} ${y2}`;}
    else{const x1=A.right-R.left,y1=A.top+A.height/2-R.top,x2=B.left-R.left,y2=B.top+B.height/2-R.top,m=(x1+x2)/2;path=`M${x1} ${y1}C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;}
    d+=`<path d="${path}"${own?' class="on"':''}/>`;
  }
  svg.innerHTML=d;
}
$('projects').addEventListener('click',ev=>{
  const t=ev.target,bt=t.closest&&t.closest('[data-p]');
  if(bt){const res=Sim.buyProject(bt.getAttribute('data-p'));toast(res.msg,!res.ok);renderProjects(true);refreshPalette();showLevel();return;}
  const n=t.closest&&t.closest('[data-n]');
  if(n){prSel=n.getAttribute('data-n');renderProjects(true);return;}
  if(t===$('projects'))openProjects(false);
});
new ResizeObserver(()=>{if(!$('projects').hidden)prDraw();}).observe($('app'));
$('prClose').addEventListener('click',()=>openProjects(false));
$('projBtn').addEventListener('click',()=>openProjects($('projects').hidden));
// la palette mostra solo gli strumenti posseduti
let palKey='';
function refreshPalette(){
  const key=CATS.map(c=>c.ids.filter(owns).join()).join('|');
  if(key===palKey)return;palKey=key;
  for(const c of CATS)catBtns[c.id].style.display=c.ids.some(owns)?'':'none';
  if(!CATS.find(c=>c.id===curCat)||!CATS.find(c=>c.id===curCat).ids.some(owns))curCat='tools';
  setCat(curCat);if(!owns(tool))setTool('select');
}
function newProjects(){return Sim.PROJ.some(p=>{const q=Sim.projectState(p.id);return !q.owned&&!q.locked&&!q.need.length&&q.afford;});}

// ---------- bisogni di una casa (felicità) ----------
function needsHtml(b){
  const n=Sim.needsOf(b),row=(t,v,m)=>`<div class="need"><span>${v>=m?'✓':'✗'} ${t}</span><b>${v}/${m}</b></div>`;
  return row('Cibo',n.food,30)+row('Casa (caldo, legna, quiete, spazio)',Math.round(n.home),25)+row('Acqua (pozzo vicino)',n.water,25)+(n.hasChurch?row('Chiesa vicina',n.church,20):'<div class="need"><span>• Chiesa: serve dal livello 2</span><b>–</b></div>');
}
function skillHtml(sk){
  const ks=Object.keys(sk||{}).filter(k=>sk[k]>=1).sort((a,b)=>sk[b]-sk[a]);if(!ks.length)return '';
  return '<h4>Bravura</h4>'+ks.map(k=>{const l=Sim.skLevel({sk},k),p=Math.round((sk[k]%Sim.XPL)/Sim.XPL*100);return `<div class="need"><span>${Sim.TRADENAME[k]||k}: ${Sim.SKNAME[l]} (livello ${l})</span><b>${l>=Sim.SKMAX?'massimo':p+'%'}</b></div>`;}).join('');
}
// ---------- scheda abitante ----------
let cardId=null,cardHtml='';
function relLink(id){const r=Sim.reg.get(id);if(!r)return '?';return `<span class="lk" data-v="${id}">${esc(r.name)} ${esc(r.fam)}</span>${r.died!==null&&r.cause!=='left'?' †':''}`;}
function openCard(id){cardId=id;cardHtml='';$('card').hidden=false;renderCard();}
function closeCard(){cardId=null;$('card').hidden=true;}
function renderCard(){
  if(cardId===null)return;
  const r=Sim.reg.get(cardId);if(!r){closeCard();return;}
  const v=Sim.villagers().find(x=>x.id===cardId),dead=r.died!==null;
  const age=dead?r.ageD:Math.floor(v.age),child=v?v.child:age<14;
  const sexT=r.sex==='M'?'Uomo':'Donna',ageT=child?(r.sex==='M'?'Bambino':'Bambina'):sexT;
  let h=`<h2>${esc(r.name)} ${esc(r.fam)}</h2><div class="sub">${ageT}, ${age} anni${dead?(r.cause==='left'?' · partito/a dal paese ':' · morto/a ')+Sim.dateStr(r.died):''}</div>`;
  h+='<h4>Mestiere</h4>';
  if(dead)h+=`<p>${r.trade?Sim.TRADENAME[r.trade]:'Nessun mestiere'}${r.inh?' <span class="tag">ereditato</span>':''}</p><p>${r.cause?({age:'Morto di vecchiaia.',cold:'Morto di freddo.',hunger:'Morto di fame.',ill:'Morto di malattia.',left:'Ha lasciato il paese perché infelice.'})[r.cause]||'':''}</p>`;
  else{h+=`<p>${child?(age<6?'Gioca in giardino':'Gioca e studia'):esc(Sim.roleText(v))}${v.trade&&!child?` · mestiere: ${Sim.TRADENAME[v.trade]}`:''}${v.inh?' <span class="tag">ereditato</span>':''}</p>`;}
  if(!dead&&v.job){const cd=Math.round(Sim.commuteOf(v));h+=`<p>Casa-lavoro: ${cd} celle${cd>Sim.COMMUTE_OK?' <span class="tag bad">troppo lontano: scontento</span>':''}</p>`;}
  h+=skillHtml(dead?r.sk:v.sk);
  h+='<h4>Istruzione</h4>';
  const sch=dead?r.schooled:v.schooled;
  if(!dead&&child){const p=Math.min(100,Math.round(v.edu/3));h+=`<p>${age<6?'Troppo piccolo per la scuola.':'Frequenta la scuola, se c\'è un maestro.'}</p><div class="bar"><i style="width:${p}%"></i></div><p>Apprendimento: ${p}%</p>`;}
  else h+=`<p>${sch?'Sa leggere e scrivere: lavora meglio (+25%) e a tavola consuma meno cibo (-25%).':'Non sa leggere né scrivere.'}</p>`;
  if(!dead){
    h+='<h4>Salute</h4>';
    if(v.ill)h+=`<p>Malato: ${Sim.DIS[v.ill.k].n} <span class="tag bad">a letto</span></p>`;
    else h+=`<p>In salute${v.immT>S.t?' · immune per un po\'':''}.</p>`;
    const hb=v.home&&Sim.buildings().get(v.home),tr=v.trait&&Sim.TRAITS[v.trait];
    h+='<h4>Carattere e felicità</h4>'+(tr?`<p><span class="tag bad">${tr.n}</span> ${tr.d}</p>`:'<p>Nessun difetto particolare.</p>')+`<div class="bar"><i style="width:${v.joy}%"></i></div><p>Felicità: ${v.joy}/100${v.joy<25?' · pensa di andarsene':v.joy<35?' · scontento, lavora meno':''}</p>`+(hb?needsHtml(hb):'');
    h+='<h4>Casa</h4>'+(hb?`<p>${Sim.LVNAME[hb.level-1]} · felicità ${hb.well}/100 · legna ${hb.goods.firewood}/${Sim.fuelNeed()}</p>`:'<p>Senza casa.</p>');
  }
  if(dead&&r.trait)h+=`<h4>Carattere</h4><p>${Sim.TRAITS[r.trait].n}: ${Sim.TRAITS[r.trait].d}</p>`;
  h+='<h4>Parenti</h4>';
  const par=r.par.map(relLink).join(', ')||'sconosciuti (arrivato da fuori)',kids=r.kids.map(relLink).join(', ')||'nessuno';
  h+=`<p>Genitori: ${par}</p><p>Figli: ${kids}</p>`;
  if(!dead){const hb=v.home&&Sim.buildings().get(v.home);if(hb){const oth=hb.members.filter(i=>i!==cardId&&!r.kids.includes(i)&&!r.par.includes(i));if(oth.length)h+=`<p>In casa con: ${oth.map(relLink).join(', ')}</p>`;}}
  h+='<h4>Storia</h4><ul class="log">'+r.log.slice().reverse().map(e=>`<li>${esc(e.txt)}<em>${Sim.dateStr(e.t)}</em></li>`).join('')+'</ul>';
  if(h!==cardHtml){cardHtml=h;$('cardBody').innerHTML=h;}
  $('cardHome').disabled=dead||!(v&&v.home);$('cardHome').style.opacity=$('cardHome').disabled?.5:1;
}
$('cardClose').addEventListener('click',closeCard);
$('card').addEventListener('click',ev=>{if(ev.target===$('card')){closeCard();return;}const l=ev.target.closest&&ev.target.closest('[data-v]');if(l)openCard(+l.getAttribute('data-v'));});
$('cardHome').addEventListener('click',()=>{const v=Sim.villagers().find(x=>x.id===cardId);const b=v&&v.home&&Sim.buildings().get(v.home);if(!b)return;closeCard();const [cx,cz]=footCenter(b);cam.x=cx;cam.z=cz;cam.goal=Math.min(cam.goal,34);select(b.id);});
$('selList').addEventListener('click',ev=>{const cbt=ev.target.closest&&ev.target.closest('[data-crop]');if(cbt&&sel){Sim.setFarmCrop(sel,cbt.getAttribute('data-crop'));groundDirty=true;selCacheList=null;refreshSel();return;}if(ev.target.closest&&ev.target.closest('[data-trade]')){openTrade(true);return;}const l=ev.target.closest&&ev.target.closest('[data-v]');if(l)openCard(+l.getAttribute('data-v'));});
addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('card').hidden)closeCard();});

// ---------- v27: pannello dettagli Abitanti e Felicità ----------
// Si apre cliccando i chip Abitanti o Felicità del cruscotto; si aggiorna da solo (updateHUD → renderPop).
let popOpen=false,popTab='pop',popHtml='';
const AGEB=[['0–5 anni',0,6],['6–13 anni (età scolare)',6,14],['14–39 anni',14,40],['40–54 anni',40,55],['55 anni e oltre',55,999]];
// etichetta stabile (non cambia a ogni passo dell'abitante: la lista non si ridisegna di continuo)
function stableRole(v){
  if(v.child)return v.age<6?'piccolo':'in età scolare';
  const b=v.job&&Sim.buildings().get(v.job);
  return b?(Sim.TRADENAME[b.type]||BT[b.type].name).toLowerCase():'a casa';
}
function whyV(v){
  const b=v.home&&Sim.buildings().get(v.home),r=[];
  if(!b||b.state!=='done')r.push('senza casa');
  else{const f=b.flags;
    if(!f.food)r.push('cibo scarso');if(!f.water)r.push('niente acqua');
    if(!f.heat)r.push('al freddo');else if(!f.fuel)r.push('poca legna');
    if(!f.attr)r.push('zona rumorosa');if(b.level>=2&&!f.church)r.push('chiesa lontana');
    if(b.members.length>Sim.CAPS[b.level-1])r.push('casa affollata');}
  if(v.ill)r.push('malato');
  if(v.trait==='brontolone'||v.trait==='litigioso')r.push(Sim.TRAITS[v.trait].n.toLowerCase());
  return r;
}
const popRow=(a,b)=>`<div class="row"><span>${a}</span><b>${b}</b></div>`;
function popPeople(st){
  const vs=Sim.villagers(),S2=Sim.S,adults=vs.filter(v=>!v.child);
  let h=`<div class="kv"><div>Abitanti<b>${st.pop}/${st.cap}</b></div><div>Bambini<b>${st.children}</b></div><div>Adulti<b>${adults.length}</b></div><div>Istruiti<b>${st.schooled}</b></div><div>Malati<b>${st.sick}${st.plague?' ☣':''}</b></div><div>Al lavoro<b>${st.jobs}/${st.slots}</b></div>${(()=>{const m=Sim.maintStats();return `<div>Edifici logori<b>${m.worn}/${m.total}</b></div><div>Riparazioni<b>${m.repairs}</b></div><div>Difficoltà<b>${Sim.DIFFS[m.diff]?Sim.DIFFS[m.diff].n:'-'}</b></div>`;})()}</div>`;
  const at=st.att;
  h+='<h4>Capacità e attrattiva</h4>'+popRow('Posti nelle case',st.capHouses)+popRow('Bonus di attrattiva',`+${st.capBonus}`)+popRow('Adulti senza lavoro',at.unemp)+popRow('Attrattiva (felicità ÷ disoccupati)',Math.round(at.a*100)+'%');
  h+='<p style="opacity:.75;font-size:12px">Più gli abitanti sono felici e meno adulti sono senza lavoro, più gente vuole trasferirsi, anche oltre i posti delle case (in case un po\' affollate).</p>';
  h+='<h4>Casa e lavoro</h4>'+popRow('Distanza media casa-lavoro',Math.round(st.avgCommute)+' celle')+popRow(`Lavorano lontano (oltre ${Sim.COMMUTE_OK} celle): scontenti`,`${st.far}/${st.commuters}`)+popRow('Bravura media nel mestiere',st.avgSkill.toFixed(1)+' / '+Sim.SKMAX)+popRow('Maestri (livello massimo)',st.masters);
  h+='<h4>Per età</h4>'+AGEB.map(([t,a,b])=>popRow(t,vs.filter(v=>v.age>=a&&v.age<b).length)).join('');
  const jc={};let home=0;
  for(const v of adults){const b=v.job&&Sim.buildings().get(v.job);if(b)jc[b.type]=(jc[b.type]||0)+1;else home++;}
  h+='<h4>Mestieri degli adulti</h4>'+Object.keys(jc).sort((a,b)=>jc[b]-jc[a]).map(k=>popRow(Sim.TRADENAME[k]||BT[k].name,jc[k])).join('')+popRow('A casa (giardino, bottega, commissioni)',home);
  h+='<h4>Case</h4>'+[1,2,3,4,5].filter(l=>st.levels[l]).map(l=>popRow(Sim.LVNAME[l-1],st.levels[l])).join('');
  const d=S2.deathsBy;
  h+='<h4>Nascite, arrivi e partenze</h4>'+popRow('Nati in paese',S2.births)+popRow('Viandanti diventati abitanti',S2.settled)+popRow('Partiti perché infelici',S2.left)+popRow('Morti in tutto',S2.deaths)+popRow('di vecchiaia · freddo · fame · malattia',`${d.age} · ${d.cold} · ${d.hunger} · ${d.ill}`)+popRow('Trasferimenti tra case',S2.moves);
  const list=vs.slice().sort((a,b)=>a.fam.localeCompare(b.fam)||b.age-a.age);
  h+=`<h4>Tutti gli abitanti (${vs.length}) · a destra la felicità</h4><div class="popList">`+(list.map(v=>popRow(`<span class="lk" data-v="${v.id}">${esc(v.name)} ${esc(v.fam)}</span> · ${v.age|0} anni · ${esc(stableRole(v))}`,v.joy)).join('')||'<div class="row"><span>Nessun abitante.</span></div>')+'</div>';
  return h;
}
function popJoy(st){
  const vs=Sim.villagers(),hs=[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');
  const n=vs.length,cnt=k=>vs.filter(v=>v.trait===k).length;
  let h=`<div class="kv"><div>Felicità media<b>${Math.round(st.avgJoy)}/100</b></div><div>Scontenti (sotto 35)<b>${st.unhappy}</b></div><div>Malati<b>${st.sick}</b></div><div>Brontoloni<b>${cnt('brontolone')}</b></div><div>Litigiosi<b>${cnt('litigioso')}</b></div></div>`;
  const BK=[['Pensano di andarsene (sotto 25)',0,25,'bad'],['Scontenti, lavorano meno (25–34)',25,35,'bad'],['Così così (35–59)',35,60,'mid'],['Contenti (60–79)',60,80,''],['Felici (80–100)',80,101,'']];
  h+='<h4>Come stanno gli abitanti</h4>'+BK.map(([t,a,b,c])=>{const k=vs.filter(v=>v.joy>=a&&v.joy<b).length;return popRow(t,k)+`<div class="bar ${c}"><i style="width:${n?Math.round(k/n*100):0}%"></i></div>`;}).join('');
  if(!hs.length)return h+'<p>Nessuna casa ancora: la felicità dipende da cibo, casa, acqua e (dal livello 2) chiesa.</p>';
  const mean=(arr,f)=>arr.length?arr.reduce((a,x)=>a+f(x),0)/arr.length:0;
  const hc=hs.filter(b=>b.level>=2),nd=hs.map(b=>Sim.needsOf(b)),ndc=hc.map(b=>Sim.needsOf(b));
  const over=b=>b.members.length>Sim.CAPS[b.level-1];
  const NEED=[
    {t:'Cibo',max:30,v:mean(nd,x=>x.food),tip:'Servono più tipi di cibo: orti, galline, pesca, caccia e baratti al mercato.'},
    {t:'Casa (caldo, legna, quiete, spazio)',max:25,v:mean(nd,x=>x.home),tip:'Controlla la legna da ardere (giardini della legna e mercato), il rumore di cave e taglialegna vicino alle case, il sovraffollamento.'},
    {t:'Acqua',max:25,v:mean(nd,x=>x.water),tip:'Costruisci pozzi: ognuno serve le case entro '+Sim.WELL_R+' celle.'},
    {t:'Chiesa (case dal livello 2)',max:20,v:mean(ndc,x=>x.church),tip:'Costruisci una chiesa: serve le case entro '+Sim.CHURCH_R+' celle.',skip:!hc.length}
  ];
  h+='<h4>I bisogni delle case (media)</h4>';
  let worst=null,wp=2;
  for(const x of NEED){
    if(x.skip){h+=popRow(x.t,'–');continue;}
    const p=x.v/x.max;if(p<wp){wp=p;worst=x;}
    h+=popRow(x.t,`${Math.round(x.v)}/${x.max}`)+`<div class="bar ${p<.5?'bad':p<.8?'mid':''}"><i style="width:${Math.round(p*100)}%"></i></div>`;
  }
  const P=(t,k)=>popRow(t,k?`${k} / ${hs.length} case`:'✓ nessuna');
  const farc=hc.filter(b=>!b.flags.church).length;
  h+='<h4>Problemi nelle case</h4>'+P('Cibo scarso o fame',hs.filter(b=>!b.flags.food).length)+P('Senza acqua vicina',hs.filter(b=>!b.flags.water).length)+P('Al freddo (senza legna)',hs.filter(b=>!b.flags.heat).length)+P('Legna sotto scorta',hs.filter(b=>b.flags.heat&&!b.flags.fuel).length)+P('Zona rumorosa',hs.filter(b=>!b.flags.attr).length)+P('Case affollate',hs.filter(over).length)+(hc.length?popRow('Chiesa lontana (livello 2+)',farc?`${farc} / ${hc.length} case`:'✓ nessuna'):'');
  if(worst&&wp<.85)h+=`<div class="popTip"><b>Il punto debole è: ${esc(worst.t)}.</b> ${worst.tip}</div>`;
  const low=vs.slice().sort((a,b)=>a.joy-b.joy).slice(0,10);
  h+='<h4>I più scontenti</h4><div class="popList">'+low.map(v=>{const w=whyV(v);return popRow(`<span class="lk" data-v="${v.id}">${esc(v.name)} ${esc(v.fam)}</span> · ${v.age|0} anni${w.length?' · '+esc(w.join(', ')):''}`,v.joy);}).join('')+'</div>';
  return h;
}
function renderPop(st){
  if(!popOpen)return;
  st=st||Sim.stats();
  document.querySelectorAll('#pop .popTabs .btn').forEach(b=>b.classList.toggle('on',b.dataset.tab===popTab));
  const h=popTab==='joy'?popJoy(st):popPeople(st);
  if(h===popHtml)return;
  // conserva la posizione di scorrimento quando il contenuto si aggiorna
  const box=$('popBox'),body=$('popBody'),ql=e=>e.querySelector?e.querySelector('.popList'):null,bs=box.scrollTop,ol=ql(body),ls=ol?ol.scrollTop:0;
  popHtml=h;body.innerHTML=h;
  box.scrollTop=bs;const nl=ql(body);if(nl)nl.scrollTop=ls;
}
function openPop(tab){popTab=tab;popHtml='';popOpen=true;$('pop').hidden=false;renderPop();$('popBox').scrollTop=0;}
function closePop(){popOpen=false;popHtml='';$('pop').hidden=true;}
$('pop').addEventListener('click',ev=>{
  if(ev.target===$('pop')){closePop();return;}
  const t=ev.target.closest&&ev.target.closest('[data-tab]');
  if(t){popTab=t.getAttribute('data-tab');popHtml='';renderPop();$('popBox').scrollTop=0;return;}
  const l=ev.target.closest&&ev.target.closest('[data-v]');if(l)openCard(+l.getAttribute('data-v'));
});
$('popClose').addEventListener('click',closePop);
// Esc chiude prima la scheda dell'abitante, se aperta (capture: gira prima dell'altro gestore)
addEventListener('keydown',ev=>{if(ev.key==='Escape'&&popOpen&&$('card').hidden)closePop();},true);
for(const [id,tab] of [['chipPop','pop'],['chipJoy','joy']]){
  const el=$(id);
  el.addEventListener('click',()=>openPop(tab));
  el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();openPop(tab);}});
}

// ---------- HUD ----------
let hudT=0;const PHN={work:'lavoro',meal:'pasto',evening:'sera',night:'notte'};
function updateHUD(){
  const st=Sim.stats();
  capNow=st.capRes||80;capStoneNow=st.capStone||80;if(attrOn)groundDirty=true;
  $('rWood').textContent=`${S.stock.wood}/${capNow}`;$('rStone').textContent=`${S.stock.stone}/${capStoneNow}`;$('rFood').textContent=st.food;$('rIron').textContent=`${S.stock.iron}`;$('rPlanks').textContent=`${S.stock.planks}`;$('rCoins').textContent=st.coins;$('rGrain').textContent=`${S.stock.grain}·${S.stock.flour}`;
  $('rDay').textContent=`${Sim.SEASONS[st.season]} ${st.day%Sim.SEASON_DAYS+1}/${Sim.SEASON_DAYS} · annata ${st.year} · ${PHN[st.ph]}`;
  $('rPop').textContent=`${st.pop}/${st.cap}`+(st.children?` (👶${st.children})`:'');$('rJobs').textContent=`${st.jobs}/${st.slots}`;$('rBarter').textContent=st.barters;
  $('rFire').textContent=`${st.fire}/${st.fireNeed}`;$('rSick').textContent=st.sick+(st.plague?' ☣':'');$('chipSick').classList.toggle('alert',st.sick>0);$('rWell').textContent=Math.round(st.avgJoy)+(st.unhappy?' · '+st.unhappy+' tristi':'');$('chipJoy').classList.toggle('alert',st.unhappy>0&&st.avgJoy<45);
  refreshGuide(st);pollEnvoy();refreshPalette();if(!$('projects').hidden)renderProjects();else $('projBtn').classList.toggle('on',newProjects());refreshSel();if(cardId)renderCard();renderPop(st);renderTrade();
  for(const t of TOOLS)if(BT[t.id])toolBtns[t.id].classList.toggle('poor',!Sim.afford(t.id));
}

// v57: fumo dal comignolo quando qualcuno è in casa
const SMK_G=new THREE.SphereGeometry(.12,6,5);
function smokeTick(e,dt,on){
  const b=e.b,sm=e.sm||(e.sm={t:Math.random()*1.5,p:[]});
  sm.t-=dt;
  if(on&&sm.t<=0&&sm.p.length<5){sm.t=.9+Math.random()*.6;
    const [fx,fz]=footCenter(b),hx=Sim.cx2w(b.hx)+(b.hw-1)*CS/2,hz=Sim.cy2w(b.hy)+(b.hh-1)*CS/2;
    const m=new THREE.Mesh(SMK_G,new THREE.MeshBasicMaterial({color:0xd8d4cc,transparent:true,opacity:.55,depthWrite:false}));
    m.position.set(hx+.35*(1+(b.id%3)*.2)-.3,.8+.45*b.level+.4,hz-.25);m.userData.a=0;scene.add(m);sm.p.push(m);}
  for(let i=sm.p.length-1;i>=0;i--){const m=sm.p[i];m.userData.a+=dt;const a=m.userData.a;
    m.position.y+=dt*.55;m.position.x+=dt*.12;m.scale.setScalar(1+a*1.4);m.material.opacity=Math.max(0,.55*(1-a/3));
    if(a>=3){scene.remove(m);m.material.dispose();sm.p.splice(i,1);}}
}
function hiddenIn(v){
  const id=occ[v.cell];if(!(id>0))return false;
  const b=Sim.buildings().get(id);if(!b||b.state!=='done')return false;
  return b.type==='house'&&Sim.inHouse(b,v.cell);
}
// ---------- ciclo principale ----------
let started=false;
// ---------- colonna sonora (WebAudio, nessun file esterno) ----------
const Music=(function(){
  let ac=null,master=null,on=true,vol=0.5,nextT=0,beat=0,timer=0,drone=null;
  const D=[146.83,164.81,174.61,196,220,246.94,261.63,293.66]; // re dorico
  const deg=(d,o)=>D[((d%7)+7)%7]*Math.pow(2,Math.floor(d/7)+(o||0));
  function pluck(t,f,g,dur){const o=ac.createOscillator(),e=ac.createGain(),fl=ac.createBiquadFilter();o.type='triangle';o.frequency.value=f;fl.type='lowpass';fl.frequency.setValueAtTime(2600,t);fl.frequency.exponentialRampToValueAtTime(500,t+dur);
    e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g,t+0.008);e.gain.exponentialRampToValueAtTime(0.0008,t+dur);o.connect(fl);fl.connect(e);e.connect(master);o.start(t);o.stop(t+dur+0.05);}
  function flute(t,f,g,dur){const o=ac.createOscillator(),lf=ac.createOscillator(),lg=ac.createGain(),e=ac.createGain();o.type='sine';o.frequency.value=f;lf.frequency.value=5;lg.gain.value=f*0.012;lf.connect(lg);lg.connect(o.frequency);
    e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g,t+0.12);e.gain.linearRampToValueAtTime(g*0.7,t+dur*0.7);e.gain.linearRampToValueAtTime(0,t+dur);o.connect(e);e.connect(master);o.start(t);lf.start(t);o.stop(t+dur+0.05);lf.stop(t+dur+0.05);}
  function bell(t,f,g){for(const [m,k] of[[1,1],[2.76,.5],[5.4,.25]]){const o=ac.createOscillator(),e=ac.createGain();o.type='sine';o.frequency.value=f*m;e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(g*k,t+0.01);e.gain.exponentialRampToValueAtTime(0.0005,t+3.5);o.connect(e);e.connect(master);o.start(t);o.stop(t+3.6);}}
  function startDrone(){drone=[];for(const f of[73.42,110]){const o=ac.createOscillator(),fl=ac.createBiquadFilter(),e=ac.createGain();o.type='sawtooth';o.frequency.value=f;fl.type='lowpass';fl.frequency.value=260;e.gain.value=0.035;o.connect(fl);fl.connect(e);e.connect(master);o.start();drone.push(e);}}
  const PAT=[[0,2,4,2],[0,4,2,4],[0,2,4,6],[-1,2,4,2]];
  let pat=PAT[0],phrase=[],pi=0;
  function tick(){
    if(!ac||!on)return;
    const mood=S.ph;const bpm=mood==='night'?56:mood==='evening'?66:mood==='meal'?78:84,sp=60/bpm/2;
    while(nextT<ac.currentTime+0.6){
      const t=nextT,st=beat%8;
      if(st===0){pat=PAT[(beat/8|0)%PAT.length]; if(Math.random()<.4)pat=PAT[(Math.random()*PAT.length)|0];}
      const root=(((beat/32)|0)%2)?-1:0;
      if(st%2===0||mood==='work'){const d=pat[(st>>1)%4]+root+(st%2?2:0);if(!(mood==='night'&&st%4)){pluck(t,deg(d,0),mood==='night'?0.07:0.1,1.1);}}
      if(st===0)pluck(t,deg(root,-1),0.12,1.6);
      if(st===4&&mood!=='night'&&Math.random()<.5)flute(t,deg(pat[(Math.random()*4)|0]+7,0),0.05,sp*3.5);
      if(beat%64===0&&mood==='evening')bell(t,392,0.04);
      beat++;nextT+=sp;
    }
  }
  function start(){
    if(ac){if(ac.state==='suspended')ac.resume();return;}
    try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ac=new C();master=ac.createGain();master.gain.value=vol*0.8;
      const cp=ac.createDynamicsCompressor();master.connect(cp);cp.connect(ac.destination);startDrone();nextT=ac.currentTime+0.2;timer=setInterval(tick,200);}catch(e){ac=null;}
  }
  function set(v){on=v;if(master)master.gain.setTargetAtTime(v?vol*0.8:0,ac.currentTime,0.1);if(drone)drone.forEach(e=>e.gain.setTargetAtTime(v?0.035:0,ac.currentTime,0.2));}
  function setVol(v){vol=v;if(master&&on)master.gain.setTargetAtTime(v*0.8,ac.currentTime,0.05);}
  function toast_(){return on;}
  return {start,set,setVol,isOn:toast_};
})();
$('musBtn').addEventListener('click',()=>{Music.start();const o=!Music.isOn();Music.set(o);$('musBtn').classList.toggle('on',o);$('musBtn').textContent=o?'♪':'♪̸';});
$('musVol').addEventListener('input',e=>{Music.start();Music.setVol(+e.target.value);});
$('musBtn').classList.add('on');

// ---------- storia iniziale e scelta del terreno ----------
const STORY=[
 {t:'Anno 1187 · Rocca Nera',x:'Tre estati di grandine e un signore che ha raddoppiato la decima. I granai di Rocca Nera sono vuoti, e chi non può pagare perde la terra. Una sera, a lume di candela, sette famiglie decidono di partire.'},
 {t:'La carovana',x:"Sette carri, qualche gallina, un sacco di sementi e frate Anselmo, che porta con sé una cassa sigillata. «Esiste una valle dimenticata, dove un tempo sorgeva un'abbazia. Là l'acqua è buona e nessun conte reclama la terra.»"},
 {t:'La valle',x:"Dopo undici giorni di strada la nebbia si apre. Boschi fitti, rocce, e qualche vena di ferro che luccica nelle pendici. Il capocarovana, che sei tu, sa che la primavera è appena cominciata: se si danno da fare, il primo raccolto arriverà prima del gelo."},
 {t:'Dove ci fermiamo?',x:"Anselmo ricorda due valli sulla sua mappa. Una ha un lago tranquillo, ricco di pesce. L'altra è attraversata da un fiume che si guada soltanto in due punti. Scegli dove piantare i pali del primo recinto.",choice:true}
];
// ---------- salvataggi (v40) ----------
// Posti: 'auto' (automatico, ogni minuto e quando la pagina si chiude) e 1-3 (manuali), nella memoria del browser (localStorage).
// Ogni salvataggio contiene lo stato della simulazione (Sim.exportState) e quello dell'interfaccia (livello, telecamera, velocità).
// Si può anche esportare in un file .json e importarlo su un altro dispositivo.
const SAVE_PFX='borgovivo.slot.',SAVE_SLOTS=['auto','1','2','3'],SAVE_APP='borgo-vivo',GAME_VER=($('ver').textContent||'').replace(/^v/,'');
let lastAuto=performance.now(),saveErrShown=false;
function makeSave(){
  return {app:SAVE_APP,ver:GAME_VER,at:Date.now(),
    meta:{pop:Sim.villagers().length,date:Sim.dateStr(S.t),day:S.day,lvl:S.rank+1,mode:S.mode},
    ui:{lvl:S.rank,advice:adviceOn,speed,cam:{x:cam.x,z:cam.z,yaw:cam.yaw,pitch:cam.pitch,dist:cam.dist,goal:cam.goal}},
    sim:Sim.exportState()};
}
function writeSlot(k,quiet){
  try{localStorage.setItem(SAVE_PFX+k,JSON.stringify(makeSave()));saveErrShown=false;return true;}
  catch(e){console.error(e);if(!quiet||!saveErrShown){saveErrShown=true;toast('Salvataggio non riuscito: lo spazio del browser è pieno o bloccato. Elimina un salvataggio, oppure usa "Esporta in un file".',true);}return false;}
}
function readSlot(k){
  try{const t=localStorage.getItem(SAVE_PFX+k);if(!t)return null;const w=JSON.parse(t);return w&&w.app===SAVE_APP&&w.sim?w:null;}catch(e){return null;}
}
function newestSave(){let best=null;for(const k of SAVE_SLOTS){const w=readSlot(k);if(w&&(!best||w.at>best.at))best=w;}return best;}
function applySave(w){
  if(!w||w.app!==SAVE_APP||!w.sim)throw new Error('Questo file non è un salvataggio di Borgo Vivo.');
  Sim.importState(w.sim); // se il salvataggio è rovinato lancia un errore prima di toccare la partita in corso
  const u=w.ui||{};
  started=true;$('story').hidden=true;$('modal').hidden=true;
  closeCard();closePop();select(null);openEdicts(false);openSaves(false);
  $('envoy').hidden=true;envBusy=false;openProjects(false);palKey='';refreshPalette();setAdvice(u.advice!==false);showLevel();
  const c=u.cam;if(c&&['x','z','yaw','pitch','dist','goal'].every(k=>Number.isFinite(c[k])))Object.assign(cam,{x:c.x,z:c.z,yaw:c.yaw,pitch:c.pitch,dist:c.dist,goal:c.goal});
  Music.start();setSpeed(u.speed===0?0:u.speed===3?3:1);
  if(treesDirty)rebuildTrees();if(rocksDirty)rebuildRocks();if(sapsDirty)rebuildSaps();groundDirty=true;
  lastAuto=performance.now();
}
const askOk=m=>typeof confirm!=='function'||confirm(m);
function saveInfo(w){
  const m=w.meta||{},d=new Date(w.at),when=isNaN(d)?'':d.toLocaleString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return `${esc(m.date||'')} · ${m.pop|0} abitanti · titolo ${esc(Sim.RANK_NAMES[(m.lvl|0)-1]||'')}<br>salvato ${esc(when)}`;
}
function renderSaves(){
  $('svList').innerHTML=SAVE_SLOTS.map(k=>{
    const w=readSlot(k),name=k==='auto'?'Salvataggio automatico':'Posto '+k;
    const btns=(k==='auto'?'':`<button class="btn" type="button" data-sv="save" data-k="${k}"${started?'':' disabled'}>Salva</button>`)+(w?`<button class="btn" type="button" data-sv="load" data-k="${k}">Carica</button>`:'')+(w&&k!=='auto'?`<button class="btn danger" type="button" data-sv="del" data-k="${k}">Elimina</button>`:'');
    return `<div class="svC${w?'':' empty'}"><div><b>${name}</b><span class="d">${w?saveInfo(w):'Vuoto'}</span></div><div class="svB">${btns}</div></div>`;
  }).join('');
  $('svExport').disabled=!started;
}
function openSaves(v){$('saves').hidden=!v;$('saveBtn').classList.toggle('on',!!v);if(v)renderSaves();}
function saveTo(k){
  if(!started)return;
  if(readSlot(k)&&!askOk('Sovrascrivere il salvataggio nel posto '+k+'?'))return;
  if(writeSlot(k))toast('Partita salvata nel posto '+k+'.');
  renderSaves();
}
function quickSave(){if(started)saveTo('1');}
function loadFrom(k){
  const w=readSlot(k);if(!w){toast('Salvataggio non trovato o rovinato.',true);renderSaves();return;}
  if(started&&!askOk('Caricare questo salvataggio? La partita in corso andrà persa se non l\'hai salvata.'))return;
  try{applySave(w);toast('Partita caricata.');}catch(e){console.error(e);toast(e.message||'Caricamento non riuscito.',true);}
}
function exportFile(){
  if(!started)return;
  try{
    const blob=new Blob([JSON.stringify(makeSave())],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`borgo-vivo-annata${S.year}-giorno${S.day+1}.json`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast('Salvataggio esportato in un file.');
  }catch(e){console.error(e);toast('Esportazione non riuscita.',true);}
}
function importFile(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
  inp.addEventListener('change',()=>{
    const f=inp.files&&inp.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>{
      let w;try{w=JSON.parse(rd.result);}catch(e){toast('Il file non è un salvataggio valido.',true);return;}
      if(started&&!askOk('Caricare questo file? La partita in corso andrà persa se non l\'hai salvata.'))return;
      try{applySave(w);toast('Partita caricata dal file.');}catch(e){console.error(e);toast(e.message||'Caricamento non riuscito.',true);}
    };
    rd.onerror=()=>toast('Impossibile leggere il file.',true);
    rd.readAsText(f);
  });
  inp.click();
}
$('saveBtn').addEventListener('click',()=>openSaves($('saves').hidden));
$('svClose').addEventListener('click',()=>openSaves(false));
$('svExport').addEventListener('click',exportFile);
$('svImport').addEventListener('click',importFile);
$('svList').addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-sv]');if(!b||b.disabled)return;
  const k=b.dataset.k,a=b.dataset.sv;
  if(a==='save')saveTo(k);else if(a==='load')loadFrom(k);
  else if(a==='del'&&askOk('Eliminare il salvataggio nel posto '+k+'?')){try{localStorage.removeItem(SAVE_PFX+k);}catch(err){}renderSaves();}
});
// salvataggio automatico: ogni minuto, quando la scheda va in secondo piano e quando la pagina si chiude
function autoSave(){if(started)writeSlot('auto',true);}
addEventListener('pagehide',autoSave);
if(document.addEventListener)document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')autoSave();});
let sIdx=0,curDiff='normale';
function showStory(){
  const sc=STORY[sIdx];$('sTitle').textContent=sc.t;$('sText').textContent=sc.x;$('sBtns').innerHTML='';
  if(sc.choice){
    // v47: livello di difficoltà (decide quanto in fretta si logorano gli edifici)
    const dw=document.createElement('div');dw.style.cssText='width:100%;margin-bottom:8px';
    const dd=document.createElement('p');dd.style.cssText='margin:6px 0;font-size:14px';
    const dbs=[];
    const showD=()=>{dbs.forEach(([k,bt])=>bt.classList.toggle('on',k===curDiff));dd.textContent='Manutenzione degli edifici — '+Sim.DIFFS[curDiff].d;};
    for(const k of ['facile','normale','difficile']){const bt=document.createElement('button');bt.className='btn';bt.type='button';bt.textContent=Sim.DIFFS[k].n;bt.addEventListener('click',()=>{curDiff=k;showD();});dbs.push([k,bt]);dw.appendChild(bt);dw.appendChild(document.createTextNode(' '));}
    dw.appendChild(dd);$('sBtns').appendChild(dw);showD();
    // v49: i cittadini possono suggerire cosa fare (sempre, non solo all'inizio); si può cambiare in partita con il tasto 💬
    const aw=document.createElement('div');aw.style.cssText='width:100%;margin-bottom:8px';
    const ad=document.createElement('p');ad.style.cssText='margin:6px 0;font-size:14px';
    const abs=[];
    const showA=()=>{abs.forEach(([k,bt])=>bt.classList.toggle('on',k===adviceOn));ad.textContent=adviceOn?'I cittadini ti suggeriscono cosa fare a ogni passo, per tutta la partita.':'Nessun suggerimento: i cittadini parlano solo di guerra e predoni. Restano visibili i requisiti del Re.';};
    for(const [k,l] of [[true,'Consigli dei cittadini: sì'],[false,'No, decido io']]){const bt=document.createElement('button');bt.className='btn';bt.type='button';bt.textContent=l;bt.addEventListener('click',()=>{setAdvice(k);showA();});abs.push([k,bt]);aw.appendChild(bt);}
    aw.appendChild(ad);$('sBtns').appendChild(aw);showA();
    for(const [m,l] of[['lake','Il lago'],['river','Il fiume']]){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=l;b.addEventListener('click',()=>begin(m));$('sBtns').appendChild(b);}
  }else{
    const mk=(txt,fn)=>{const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=txt;b.addEventListener('click',fn);$('sBtns').appendChild(b);};
    mk(sIdx===0?'Inizia':'Avanti',()=>{Music.start();sIdx++;showStory();});
    if(sIdx===0){
      const best=newestSave();
      if(best)mk('Continua la partita',()=>{try{applySave(best);}catch(e){console.error(e);toast(e.message||'Caricamento non riuscito.',true);}});
      mk('Salvataggi',()=>openSaves(true));
    }
  }
}
function begin(mode){
  if(readSlot('auto')&&!askOk('Esiste già un salvataggio automatico: una nuova partita lo sostituirà entro un minuto (i posti 1-3 non cambiano). Iniziare comunque?'))return;
  Music.start();$('story').hidden=true;lastAuto=performance.now();
  // v42: ogni partita ha una mappa nuova; con ?seme=1234 nell'indirizzo si rivede una mappa già giocata
  let sd=0;try{if(typeof location!=='undefined'){const q=new URLSearchParams(location.search).get('seme');if(q&&/^\d{1,9}$/.test(q))sd=+q;}}catch(e){}
  if(!sd)sd=1+((Math.random()*999999999)|0);
  Sim.init(sd,mode,curDiff,{story:true});started=true;setTimeout(()=>toast('Valle n. '+sd+'. Per rivederla: aggiungi ?seme='+sd+' all\'indirizzo.'),1500);if(COARSE)setTimeout(()=>toast('Un dito: sposta la mappa. Due dita: pizzica per zoomare, ruota per girare. Scegli una categoria e uno strumento in basso.'),7000);
  if(treesDirty)rebuildTrees();if(rocksDirty)rebuildRocks();if(sapsDirty)rebuildSaps();groundDirty=true;
  palKey='';refreshPalette();showLevel();openEnvoy(INTRO);
}
showStory();
let last=performance.now(),clock=0;
function frame(now){requestAnimationFrame(frame);try{frame2(now);}catch(e){console.error(e);}}
function frame2(now){
  const dt=Math.min(0.1,(now-last)/1000);last=now;clock+=dt;
  if(started&&speed>0){let rem=dt*speed;while(rem>0){const d=Math.min(0.05,rem);Sim.step(d);rem-=d;}}
  if(started&&now-lastAuto>60000){lastAuto=now;writeSlot('auto',true);}
  updateCam(dt);
  if(treesDirty)rebuildTrees();if(rocksDirty)rebuildRocks();if(sapsDirty)rebuildSaps();
  if(groundDirty&&now-lastGround>350){drawGround();groundDirty=false;lastGround=now;}
  for(const e of ents.values()){
    const b=e.b,ud=e.body.userData;
    if(e.sheep)animSheep(e,dt);
    if(b.type==='plaza')animFest(e);
    if(ud&&ud.sails)ud.sails.rotation.z-=dt*0.7;
    if(ud&&ud.gv){const n=Math.min(ud.gv.length,S.buried|0);if(ud.shown!==n){ud.shown=n;ud.gv.forEach((m,i)=>{m.visible=i<n;});}}
    if(ud&&ud.logs){ud.logs.scale.y=0.15+0.85*Math.min(1,S.stock.wood/Math.min(capNow,160));ud.stones.scale.y=0.2+0.8*Math.min(1,S.stock.stone/Math.min(capStoneNow,160));}
    if(b.state==='site'){const sc2=b.cost||Sim.costOf(b.type),tot=sc2.wood+sc2.stone+(sc2.planks||0),fr=(b.got.wood+b.got.stone+(b.got.planks||0))/Math.max(1,tot);e.body.scale.y=0.1+0.9*(fr*0.25+b.prog*0.75);}
    else if(e.pop>0){e.pop-=dt;e.body.scale.y=1+Math.sin(Math.max(0,e.pop)/0.4*Math.PI)*0.08;if(e.pop<=0)e.body.scale.y=1;}
  }
  const homeIn=new Map();for(const v of Sim.villagers()){if(v.home&&(v.inside||hiddenIn(v))){const hb=Sim.buildings().get(v.home);if(hb&&hb.type==='house')homeIn.set(v.home,(homeIn.get(v.home)||0)+1);}}
  for(const e of ents.values()){const b=e.b;if(b.type!=='house'||b.state!=='done')continue;smokeTick(e,dt,homeIn.get(b.id)>0);}
  for(const v of Sim.villagers().concat(Sim.guests())){
    const m=vms.get(v.id);if(!m)continue;
    m.gp.visible=!v.inside&&!hiddenIn(v);m.gp.position.set(v.x,v.moving?Math.abs(Math.sin(clock*11+v.id))*0.07:0,v.z);m.gp.rotation.y=v.fa;
    if(v.age!==undefined&&!v.guest){const k=0.8*(0.62+0.38*Math.min(1,v.age/14));if(m.k!==k){m.k=k;m.gp.scale.setScalar(k);}}
    if(v.mil&&m.hpb)m.hpb.scale.x=.55*Math.max(.03,v.hp/v.mhp);
    if(!v.guest){const ill=!!v.ill;if(m.ill!==ill){m.ill=ill;m.body.material=ill?MAT.sick:m.mat;}}
    const lk=loadKind(v,isWhWorker(v)),lq=lk&&lk.startsWith('cart')?loadQty(v):0,lkey=lk?lk+':'+(lk==='box'||lk==='plank'?v.carry:lq):'';
    if(lkey!==m.lk){m.lk=lkey;m.carry=v.carry||null;applyLoad(m,v,lk,lq);}
    if(m.rig&&m.rig.cart.visible&&v.moving){const a=dt*7.5;for(const w of m.rig.wheels)w.rotation.x+=a;}
  }
  for(let i=shots.length-1;i>=0;i--){const sh=shots[i];sh.t-=dt;if(sh.t<=0){scene.remove(sh.ln);if(sh.ln.geometry&&sh.ln.geometry.dispose)sh.ln.geometry.dispose();shots.splice(i,1);}}
  ghost.visible=false;arrow.visible=false;
  if(hover&&(!drag||drag.m==='place')){
    if(BT[tool]){const a=anchor(tool,hover),ok=!Sim.canPlace(tool,a.x,a.y,rot)&&Sim.afford(tool),[gw,gh]=Sim.dimsOf(BT[tool],rot);setGhost(a.x,a.y,gw,gh,ok,1.2);showArrow(tool,a.x,a.y,rot,ok);}
    else if(isDist(tool)||tool==='road')setGhost(hover.cx,hover.cy,1,1,true,0.2,isDist(tool)?TOOL[tool].col:0xcfc5ae);
    else if(tool==='demolish')setGhost(hover.cx,hover.cy,1,1,false,0.3);
  }
  if(drag&&isDist(drag.m)){
    const x0=Math.min(drag.a.cx,drag.b.cx),y0=Math.min(drag.a.cy,drag.b.cy),x1=Math.max(drag.a.cx,drag.b.cx),y1=Math.max(drag.a.cy,drag.b.cy);
    setGhost(x0,y0,x1-x0+1,y1-y0+1,true,0.25,TOOL[drag.m].col);
  }
  {const zb=sel&&Sim.buildings().get(sel);if(zb&&Sim.ZONED[zb.type]&&zb.state==='done'){const zc=zb.zone?zb.zone.c:zb.cell,zr=(zb.zone?zb.zone.r:(zb.type==='forester'?72:39))*CS,zx=Sim.cx2w(zc%N),zz=Sim.cy2w((zc/N)|0);zoneRing.visible=true;zoneRing.position.set(zx,.14,zz);zoneRing.scale.set(zr,zr,1);zoneDot.visible=!!zb.zone;zoneDot.position.set(zx,.6,zz);}else{zoneRing.visible=false;zoneDot.visible=false;}}
  hudT+=dt;if(hudT>0.3){hudT=0;if(started)updateHUD();}
  DAYC.setHex(SKYS[S.season]);outer.material.color.setHex(OUTS[S.season]);
  snow.visible=S.season===3;
  if(snow.visible){const pa=snowG.attributes.position.array;for(let i=0;i<SNOWN;i++){pa[i*3+1]-=dt*(5+(i%5));pa[i*3]+=Math.sin(clock+i)*dt*0.6;if(pa[i*3+1]<0)pa[i*3+1]=55;}snowG.attributes.position.needsUpdate=true;snow.position.set(cam.x,0,cam.z);}
  {const f=((S.t+6)%Sim.DAY)/Sim.DAY;let Lh;if(f<0.06)Lh=0;else if(f<0.12)Lh=(f-0.06)/0.06;else if(f<0.76)Lh=1;else if(f<0.88)Lh=1-(f-0.76)/0.12;else Lh=0;
   hemi.intensity=0.32+0.53*Lh;sun.intensity=0.08+0.77*Lh;skyC.copy(NIGHT).lerp(DAYC,Lh);scene.background.copy(skyC);scene.fog.color.copy(skyC);}
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
})();
