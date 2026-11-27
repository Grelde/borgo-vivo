(function(){
'use strict';
const {N,CS,W,BT,PATH,S,SC}=Sim;
const NOGATE={house:1,stall:1,flowers:1,statue:1,plaza:1,well:1,cemetery:1};
const {tree,rock,ore,water,sap,road,dist,occ,wear,plev,field,door,attr}=Sim.grids;
let attrOn=false,capNow=80;
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
const flagGeo=(()=>{const a=new THREE.CylinderGeometry(.04,.04,1.8,5);a.translate(0,.9,0);const b=new THREE.ConeGeometry(.28,.8,3);b.rotateZ(-Math.PI/2);b.translate(.4,1.45,0);return [a,b];})();
const poleM=new THREE.InstancedMesh(flagGeo[0],new THREE.MeshLambertMaterial({color:0x4a3520}),600);
const pennM=new THREE.InstancedMesh(flagGeo[1],new THREE.MeshBasicMaterial({color:0xff8a1c,side:THREE.DoubleSide}),600);
const pennF=new THREE.InstancedMesh(flagGeo[1],new THREE.MeshBasicMaterial({color:0x2f9bff,side:THREE.DoubleSide}),600);
poleM.count=pennM.count=pennF.count=0;scene.add(poleM);scene.add(pennM);scene.add(pennF);
for(const m of[poleM,pennM,pennF])m.frustumCulled=false;
function drawZones(){
  const noisy=[];for(const b of Sim.buildings().values())if(b.type==='wood'||b.type==='quarry'||b.type==='mine')noisy.push(b);
  let n=0,nh=0,nf=0;
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
    if(n<600&&((kind===1&&x%12===1&&y%12===1)||(kind===2&&(x*3+y*5)%15===0))){
      dummy.position.set(Sim.cx2w(x)+(kind===1?.5:0),0,Sim.cy2w(y)+(kind===1?.5:0));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
      poleM.setMatrixAt(n,dummy.matrix);if(kind===1)pennM.setMatrixAt(nh++,dummy.matrix);else pennF.setMatrixAt(nf++,dummy.matrix);n++;
    }
  }
  poleM.count=n;pennM.count=nh;pennF.count=nf;poleM.instanceMatrix.needsUpdate=pennM.instanceMatrix.needsUpdate=pennF.instanceMatrix.needsUpdate=true;
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
function drawGround(){
  if(!zonesOn){poleM.count=pennM.count=pennF.count=0;}
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
    g.fillStyle='rgba(122,88,48,0.92)';g.fillRect(x0,y0,PX+.5,PX+.5);
    g.fillStyle=((i/N|0)%2)?'rgba(84,60,32,.55)':'rgba(206,178,86,.4)';g.fillRect(x0,y0+PX*.2,PX+.5,PX*.35);
  }
  if(zonesOn)drawZones();
  g.fillStyle='rgba(88,66,40,0.5)';
  for(let i=0;i<N*N;i++)if(occ[i])g.fillRect((i%N)*PX-1,((i/N)|0)*PX-1,PX+2,PX+2);
  // sentieri a quattro livelli: dal terreno appena calpestato (livello 1) al sentiero di terra battuta (livello 4); i livelli bassi si disegnano per primi e più larghi sotto quelli alti
  const lc=[0,0,0,0,0];
  for(let i=0;i<N*N;i++){const L=plev[i];if(L>0&&!road[i]&&!occ[i])lc[L]++;}
  for(let L=1;L<=4;L++){
    if(!lc[L]&&!lc.slice(L).some(n=>n>0))continue;
    pg.clearRect(0,0,TEX,TEX);
    stripOn(pg,i=>plev[i]>=L&&!road[i]&&!occ[i],PX*PLW[L],PLC[L]);
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
  }else{
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
function garden(g,b){
  const fm=b.pure?MAT.cream:MAT.timber;
  for(const s of[-1,1]){bx(g,1.8,.05,.05,fm,0,.28,s*.9);bx(g,.05,.05,1.8,fm,s*.9,.28,0);}
  for(const sx of[-1,1])for(const sz of[-1,1])bx(g,.08,.4,.08,fm,sx*.9,.2,sz*.9);
  if(b.pure){
    const fl=[MAT.flower1,MAT.flower2,MAT.flower3];
    for(let k=0;k<7;k++){sph(g,.075,fl[(k+b.id)%3],-.78+k*.26,.13,-.8,1,1,1);sph(g,.075,fl[(k+b.id+1)%3],-.84,.13,-.55+k*.2,1,1,1);sph(g,.075,fl[(k+b.id+2)%3],.84,.13,-.55+k*.2,1,1,1);}
    cyl(g,.05,.07,.55,6,MAT.timber,-.62,.28,-.6);sph(g,.3,MAT.leaf2,-.62,.78,-.6,1,.9,1);
    for(let k=0;k<5;k++)sph(g,.045,MAT.red,-.62+Math.cos(k*1.3)*.24,.78+Math.sin(k*2.1)*.12,-.6+Math.sin(k*1.3)*.24);
  }
  if(b.crop==='herd'){
    for(const [px,pz] of[[-.45,-.4],[.2,.4],[.45,-.35]]){bx(g,.45,.28,.28,MAT.wool,px,.3,pz,(px+pz)*2);sph(g,.12,MAT.timber,px+.26,.34,pz);}
    bx(g,.7,.5,.6,MAT.log,.5,.25,-.5);bx(g,.9,.07,.8,MAT.thatch,.5,.58,-.5).rotation.z=.15;
  }else if(b.crop==='veg'){
    for(let r=-1;r<=1;r++){bx(g,1.5,.1,.22,MAT.soil,0,.05,r*.5);
      for(let k=-2;k<=2;k++){const m=(k+r+b.id)%3===0?MAT.carrot:(k%2?MAT.leaf:MAT.leaf2);sph(g,.11,m,k*.3,.2,r*.5,1,1.1,1);}}
  }else if(b.crop==='wood'){
    woodPile(g,-.3,-.45);
    for(const [px,pz,rx,rz] of[[-.4,.3,0,Math.PI/2],[.05,.55,Math.PI/2,0],[.45,.2,0,Math.PI/2]])cyl(g,.08,.08,.55,7,MAT.logD,px,.09,pz,rx,rz);
    for(const [px,pz] of[[.62,.55],[-.68,.58]]){cyl(g,.04,.06,.5,6,MAT.timber,px,.25,pz);sph(g,.22,MAT.leaf2,px,.62,pz,1,.9,1);}
  }else{
    bx(g,.7,.5,.6,MAT.log,.45,.25,-.45);bx(g,.9,.07,.8,MAT.thatch,.45,.58,-.45).rotation.z=.15;bx(g,.2,.25,.04,MAT.door,.45,.18,-.14);
    for(let k=0;k<4;k++){const hx=-.5+((b.id*7+k*5)%9)*.1,hz=.1+((b.id*3+k*7)%8)*.08-.1*k*.2;sph(g,.12,MAT.hen,hx,.18,hz+k*.12-.1,1,.9,1.3);sph(g,.06,MAT.henR,hx,.32,hz+k*.12-.02);}
  }
}
const BUILD={
  house(b){
    const g=new THREE.Group(),[fx,fz]=footCenter(b);
    const hx=Sim.cx2w(b.hx+1)-fx,hz=Sim.cy2w(b.hy+1)-fz,gx=Sim.cx2w(b.gx+1)-fx,gz=Sim.cy2w(b.gy+1)-fz;
    const dxw=Sim.cx2w(b.door%N)-fx,dzw=Sim.cy2w((b.door/N)|0)-fz;const h=new THREE.Group();h.position.set(hx,0,hz);h.rotation.y=Math.atan2(dxw-hx,dzw-hz);houseLevel(h,b);g.add(h);
    const gg=new THREE.Group();gg.position.set(gx,0,gz);garden(gg,b);
    if(b.craft){bx(gg,.35,.3,.22,MAT.iron,-.5,.4,.55);bx(gg,.18,.1,.18,MAT.iron,-.5,.6,.55);bx(gg,.4,.35,.4,MAT.stoneD,.25,.2,.6);bx(gg,.2,.1,.2,MAT.fire,.25,.42,.6);}
    if(b.bake){const o=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8,0,6.3,0,1.6),MAT.stone);o.position.set(-.45,.1,.5);o.castShadow=true;gg.add(o);bx(gg,.2,.16,.06,MAT.fire,-.45,.22,.9);cyl(gg,.06,.06,.5,6,MAT.stoneD,-.45,.7,.5);}
    if(b.weave){bx(gg,.9,.7,.15,MAT.timber,-.35,.55,.7);bx(gg,.9,.1,.05,MAT.cloth,-.35,.55,.62);for(let k=0;k<4;k++)bx(gg,.02,.5,.02,MAT.cream,-.7+k*.22,.55,.64);bx(gg,.3,.3,.3,MAT.wool,.3,.15,.7);}
    if(b.tailor){cyl(gg,.05,.05,.9,6,MAT.timber,.3,.45,.6);cone(gg,.28,.7,8,MAT.cloth,.3,.55,.6,0);sph(gg,.1,MAT.cream,.3,1.0,.6);bx(gg,.5,.12,.3,MAT.timber,-.4,.4,.7);}
    for(const c of (b.ext||[])){const e2=new THREE.Group();e2.position.set(Sim.cx2w(c%N)-fx,0,Sim.cy2w((c/N)|0)-fz);bx(e2,.64,.07,.64,MAT.soil,0,.035,0);if(b.crop==='herd'){sph(e2,.12,MAT.wool,0,.2,0,1.2,.9,1);}else if(b.crop==='eggs'){sph(e2,.12,MAT.hen,0,.18,0,1,.9,1.3);sph(e2,.06,MAT.henR,0,.3,.08);}else if(b.crop==='wood'){cyl(e2,.09,.09,.5,7,MAT.log,-.1,.1,0,0,Math.PI/2);cyl(e2,.09,.09,.5,7,MAT.logD,.1,.1,.05,0,Math.PI/2);cyl(e2,.09,.09,.5,7,MAT.log,0,.26,.02,0,Math.PI/2);}else{sph(e2,.11,(c+b.id)%3?MAT.leaf:MAT.carrot,0,.17,0,1,1.1,1);sph(e2,.08,MAT.leaf2,.18,.14,.15);}g.add(e2);}
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
  stall(b){const g=new THREE.Group();
    bx(g,1.4,.1,.8,MAT.log,0,.55,0);bx(g,1.3,.5,.1,MAT.logD,0,.25,.3);bx(g,1.3,.5,.1,MAT.logD,0,.25,-.3);
    for(const sx of[-1,1])for(const sz of[-1,1])bx(g,.07,1.35,.07,MAT.timber,sx*.65,.68,sz*.4);
    const aw=(b.id%2)?MAT.red:MAT.blue;
    for(let k=0;k<4;k++)bx(g,.36,.05,1.0,k%2?MAT.cream:aw,-.54+k*.36,1.42-k*0,0).rotation.x=0;
    bx(g,.3,.2,.3,MAT.veg,-.4,.7,0);bx(g,.3,.2,.3,MAT.egg,0,.7,0);bx(g,.3,.2,.3,MAT.grain,.4,.7,0);return g;},
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
    cone(g,.45,.9,8,MAT.hay,-1.2,.45,1.2,0);cone(g,.4,.8,8,MAT.hay,-.6,.4,1.45,0);return g;}
};
const ents=new Map(),pickables=[];
function mountBody(e){
  const b=e.b;if(e.body)e.root.remove(e.body);
  e.body=BUILD[b.type](b);if(b.type!=='house'&&b.rot)e.body.rotation.y=-b.rot*Math.PI/2;e.root.add(e.body);
  for(let i=pickables.length-1;i>=0;i--)if(pickables[i].userData.bid===b.id&&pickables[i]!==e.hit)pickables.splice(i,1);
  e.body.traverse(o=>{if(o.isMesh){o.userData.bid=b.id;pickables.push(o);}});
}
Sim.hooks.building=function(b){
  const root=new THREE.Group(),[cx,cz]=footCenter(b);root.position.set(cx,0,cz);
  const scaf=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w*CS*.96,2.6,b.h*CS*.96)),new THREE.LineBasicMaterial({color:0x6b4a2b}));
  scaf.position.y=1.3;root.add(scaf);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(b.w*CS,3,b.h*CS),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  hit.position.y=1.5;hit.userData.bid=b.id;root.add(hit);pickables.push(hit);
  if(b.state==='done')scaf.visible=false;
  const e={b,root,body:null,scaf,hit};ents.set(b.id,e);mountBody(e);scene.add(root);
};
Sim.hooks.done=function(b){const e=ents.get(b.id);if(!e)return;e.scaf.visible=false;e.body.scale.y=1;e.pop=0.35;};
Sim.hooks.upgraded=function(b){const e=ents.get(b.id);if(!e)return;mountBody(e);e.pop=0.5;};
Sim.hooks.removed=function(b){
  const e=ents.get(b.id);if(!e)return;scene.remove(e.root);ents.delete(b.id);
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
const CARRY={wood:MAT.log,stone:MAT.stoneD,veg:MAT.veg,eggs:MAT.egg,grain:MAT.grain,water:MAT.water,iron:MAT.iron,flour:MAT.flour,fish:MAT.fishM,meat:MAT.meatM,firewood:MAT.fw,bread:MAT.hay,tools:MAT.iron,wool:MAT.wool,cloth:MAT.cloth,clothes:MAT.cloth};
const vms=new Map(),vpick=[];
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
    if(v.horse){const hs=new THREE.Group();bx(hs,.5,.5,1.1,MAT.horse,0,.55,-.2);bx(hs,.22,.5,.25,MAT.horse,0,.95,.45);for(const sx of[-.16,.16])for(const sz of[-.55,.15])bx(hs,.1,.35,.1,MAT.horse,sx,.18,sz);bx(hs,.55,.1,.5,MAT.cloth,0,.82,-.2);gp.add(hs);gp.userData.horse=hs;}}
  if(!v.guest){const vh=new THREE.Mesh(new THREE.SphereGeometry(.6,6,5),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));vh.position.y=.55;vh.userData.vid=v.id;gp.add(vh);vpick.push(vh);}
  scene.add(gp);vms.set(v.id,{gp,load,carry:null,body,mat,ill:false});
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
  {id:'d5',label:'Pascolo',key:'p',dt:5,col:0xe8e4d0,hint:'Trascina: le famiglie fonderanno ovili per la lana, che serve ai tessitori (case di livello 3).'},
  {id:'undistrict',label:'Togli zona',key:'5',dt:0,col:0xd9553f,hint:'Trascina per cancellare un quartiere.'},
  {id:'road',label:'Strada',key:'6',hint:'Trascina per tracciare una strada: resta a lungo anche senza passaggi, poi torna sentiero e sparisce. Puoi demolirla.'},
  {id:'wood',label:'Taglialegna',key:'7',hint:'Vicino a un bosco. Rumoroso: le case vicine perdono attrattiva.'},
  {id:'quarry',label:'Cava',key:'8',hint:'Vicino alle rocce. Molto rumorosa: tienila lontana dalle case.'},
  {id:'forester',label:'Guardaboschi',key:'g',hint:'Pianta alberi nelle zone forestali. Servono circa 2 minuti perché crescano.'},
  {id:'mine',label:'Miniera',key:'m',hint:'Vicino ai filoni di ferro (rocce scure). Molto rumorosa. Il ferro va al magazzino.'},
  {id:'granary',label:'Granaio',key:'b',hint:'Le fattorie portano qui il grano in eccedenza. Il mulino lo macina.'},
  {id:'mill',label:'Mulino',key:'l',hint:'Trasforma il grano del granaio in farina per i panettieri.'},
  {id:'inn',label:'Locanda',key:'i',hint:'Dà da mangiare ai viandanti e ha una stalla per i cavalli. Serve un oste; le famiglie portano il cibo. Qualcuno può fermarsi in paese.'},
  {id:'plaza',label:'Piazza',key:'z',hint:'Piazza con fontana: abbellimento che rende molto più piacevole la zona.'},
  {id:'flowers',label:'Aiuola',key:'u',hint:'Piccola decorazione: più attrattiva nei dintorni.'},
  {id:'statue',label:'Statua',key:'t',hint:'Monumento: aumenta l\'attrattiva della zona.'},
  {id:'store',label:'Magazzino',key:'9',hint:'Secondo deposito con 3 addetti e scorte fino a 80. Un po\' rumoroso.'},
  {id:'well',label:'Pozzo',key:'0',hint:'Dà acqua alle case entro 30 celle e rende la zona più piacevole.'},
  {id:'school',label:'Scuola',key:'k',hint:'I bambini dai 6 anni vengono qui al mattino (serve un maestro). Chi sa leggere e scrivere fa migliorare la casa più in fretta.'},
  {id:'infirmary',label:'Ospizio',key:'o',hint:'Un erborista cura i malati delle case entro 45 celle: guariscono prima e rischiano meno. Frena le epidemie.'},
  {id:'church',label:'Chiesa',key:'c',hint:'Le case entro 54 celle possono raggiungere il livello più alto. Molto attraente.'},
  {id:'demolish',label:'Demolisci',key:'x',hint:'Clicca un edificio, una casa, una strada o un sentiero.'},
  {id:'pan',label:'Muovi',key:'h',hint:'Trascina per spostare la mappa.'}
];
const TOOL=Object.fromEntries(TOOLS.map(t=>[t.id,t]));
const CATS=[
  {id:'tools',label:'Strumenti',ids:['select','pan','demolish']},
  {id:'zone',label:'Zone e strade',ids:['d1','d2','d3','d4','d5','undistrict','road']},
  {id:'prod',label:'Produzione',ids:['wood','quarry','mine','forester','granary','mill']},
  {id:'serv',label:'Servizi',ids:['store','well','school','infirmary','church','inn']},
  {id:'deco',label:'Decorazioni',ids:['plaza','flowers','statue']}];
const CATOF={};CATS.forEach(c=>c.ids.forEach(i=>{CATOF[i]=c.id;}));
const catBtns={};
let curCat='tools';
function setCat(c){curCat=c;for(const k in toolBtns)toolBtns[k].style.display=CATOF[k]===c?'':'none';for(const k in catBtns)catBtns[k].classList.toggle('on',k===c);}
for(const c of CATS){const b=document.createElement('button');b.className='btn sm';b.type='button';b.textContent=c.label;b.addEventListener('click',()=>setCat(c.id));$('cats').appendChild(b);catBtns[c.id]=b;}
let tool='select';const toolBtns={};let drag=null,hover=null,pend=false;
const costHTML=c=>(c.wood?`<span><i class="sw w"></i>${c.wood}</span>`:'')+(c.stone?`<span><i class="sw s"></i>${c.stone}</span>`:'');
for(const t of TOOLS){
  const b=document.createElement('button');b.className='btn';b.type='button';
  b.innerHTML=`<span class="nm">${t.label}<kbd>${t.key.toUpperCase()}</kbd></span><span class="cs">${BT[t.id]?costHTML(BT[t.id].cost):''}</span>`;
  b.addEventListener('click',()=>setTool(t.id));$('tools').appendChild(b);toolBtns[t.id]=b;
}
function setTool(id){pend=false;hover=null;$('pbar').hidden=true;if(CATOF[id]&&CATOF[id]!==curCat)setCat(CATOF[id]);tool=id;ghost.visible=false;arrow.visible=false;$('rotBtn').style.display=(BT[id]&&!NOGATE[id])?'':'none';for(const k in toolBtns)toolBtns[k].classList.toggle('on',k===id);$('hint').textContent=(TOOL[id].hint||'')+((BT[id]&&!NOGATE[id])?' R = ruota: la freccia gialla è l\'ingresso.':'');if(id!=='select')select(null);if(document.body.classList.contains('touch')&&id!=='select')toast(TOOL[id].hint+(BT[id]?' Tocca o trascina sulla mappa, poi conferma con ✓.':''));}
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
  if(b.state==='site'){const need=t.cost.wood+t.cost.stone,got=b.got.wood+b.got.stone;info=(b.prog>0?`In costruzione: ${Math.round(b.prog*100)}%`:`Cantiere: materiali portati ${got}/${need}`)+(()=>{const nb=Sim.villagers().filter(v=>v.state==='build'&&v.target===b.id).length;const full=b.got.wood>=t.cost.wood&&b.got.stone>=t.cost.stone;return full?` · operai al lavoro: ${nb}${nb?'':' (servono operai)'}`:'';})()+(S.ph==='work'?'':' · i lavori riprendono al mattino');}
  else if(b.type==='house'){
    name=Sim.LVNAME[b.level-1];const cap=Sim.CAPS[b.level-1],fl=b.flags,gd=b.goods,fn=Sim.fuelNeed();
    const hd=b.head&&VM(b.head);
    info=`Famiglia ${hd?esc(hd.fam):''}: ${b.members.length}/${cap} · giardino: ${b.crop==='veg'?'orto':b.crop==='eggs'?'galline':b.crop==='wood'?'legna da ardere (catasta, ceppo e alberelli)':'allevamento'}${b.pure?' (giardino fisso: staccionata chiara e fiori, resta sempre così)':''}${b.crop==='wood'?' (specializzazione fissa)':''}${b.craft?' · bottega':''}${b.bake?' · panificio':''}${b.weave?' · tessitore':''}${b.tailor?' · sarto':''}`;
    const rows=b.members.map(id=>{const v=VM(id);return v?`<div><span class="lk" data-v="${v.id}">${esc(v.name)}</span>${v.id===b.head?' ★':''} (${v.age|0} anni${v.schooled?', istruito':''}${v.ill?', malato':''}): ${esc(Sim.roleText(v))}</div>`:'';}).join('');
    const need=b.level>=Sim.MAXLV?'':('Per migliorare: cibo'+(b.level>=2?', acqua':'')+(b.level>=3?', chiesa':'')+(b.level>=2?', quiete, legna':'')+(()=>{const u=Sim.UPC[b.level+1];return u?`, materiali (legno ${u.wood}${u.stone?`, pietra ${u.stone}`:''})`:'';})()+` (${Math.min(25,b.up)}/25)`);
    list=rows+`<div>Felicità <b>${b.well}</b>/100</div><div class="wbar"><i style="width:${b.well}%"></i></div>${needsHtml(b)}<div>Legna da ardere: ${gd.firewood}/${fn} ${gd.firewood>=fn?'(scorta sufficiente)':'(scorta scarsa)'}</div>`+(S.edicts&&S.edicts.noUpgrade?'<div>Editto in vigore: le case non migliorano.</div>':'')+`${b.ext&&b.ext.length?`<div>Giardino ampliato di ${b.ext.length} celle, verso la strada.</div>`:''}<div>Attività secondaria: ${b.side==='fish'?'pesca (casa vicino all\'acqua)':b.side==='hunt'?'caccia (casa vicino a un bosco tranquillo)':'nessuna'}. ${b.crop==='wood'?'Il giardino produce solo legna: la scorta in più la baratta al mercato con il cibo.':'Non produce legna: la compra al mercato.'}</div><div>Attrattiva della zona: ${Sim.attrLabel(b.attr)} (${b.attr.toFixed(1)})</div>`+
      `<div class="flags"><span class="${fl.food?'ok':'no'}">Cibo</span><span class="${fl.water?'ok':'no'}">Acqua</span><span class="${fl.church?'ok':'no'}">Chiesa</span><span class="${fl.attr?'ok':'no'}">Quiete</span><span class="${fl.heat?'ok':'no'}">Caldo</span><span class="${fl.fuel?'ok':'warn'}">Legna</span><span class="${fl.mat?'ok':'no'}">Materiali</span></div>`+
      `<div>Scorte: ortaggi ${gd.veg} · uova ${gd.eggs} · grano ${gd.grain} · pesce ${gd.fish} · carne ${gd.meat} · pane ${gd.bread}</div><div>Legna ${gd.firewood} · ferro ${gd.iron} · farina ${gd.flour} · attrezzi ${gd.tools}</div><div>Lana ${gd.wool} · tessuto ${gd.cloth} · abiti ${gd.clothes}</div>`+(b.level>=3&&!fl.tools?'<div>Per salire a livello 4 serve un attrezzo di ferro.</div>':'')+(need?`<div>${need}</div>`:'<div>Livello massimo raggiunto.</div>');
  }
  else if(b.type==='stall'){const o=Sim.buildings().get(b.owner);info=b.open?'Banco aperto: si accettano baratti.':'Banco chiuso.';
    if(o)list=`<div>Merce: ortaggi ${o.goods.veg} · uova ${o.goods.eggs} · pesce ${o.goods.fish} · carne ${o.goods.meat} · pane ${o.goods.bread} · legna ${o.goods.firewood} · attrezzi ${o.goods.tools}</div>`;}
  else if(b.type==='farm'){const w=Sim.villagers().filter(v=>v.job===b.id);info=`Campi: ${b.fields.length} · lavorano ${w.length}`;
    list=w.map((v,i)=>`<div>Contadino ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+"<div>Il grano raccolto va alla famiglia che l'ha fondata.</div>";}
  else if(b.type==='store'){
    name=b.center?'Centro cittadino':'Magazzino';
    const w=Sim.villagers().filter(v=>v.job===b.id);
    info=`Addetti: ${w.length}/${b.want} · scorte: legno ${S.stock.wood}/${capNow}, pietra ${S.stock.stone}/${capNow}, ferro ${S.stock.iron}/${capNow}`;
    list=w.map((v,i)=>`<div>Addetto ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>Portano i materiali ai cantieri e ritirano quanto prodotto da taglialegna e cave.</div>'+(b.center?'':`<div>Se il centro contiene materiali, gli addetti li portano qui: legno ${S.wh.wood}, pietra ${S.wh.stone}, ferro ${S.wh.iron}.</div>`)+(b.center?`<div>Il centro cresce con il numero di case. Si può demolire solo quando è vuoto.</div>`:'');
  }
  else if(t.slots&&b.type!=='inn'&&b.type!=='school'&&b.type!=='infirmary'){
    const res=b.type==='wood'?'wood':b.type==='mine'?'iron':'stone';
    const prod=b.buf!==undefined;
    const full=prod&&(b.buf>=Sim.BUFCAP||(S.stock[res]>=capNow*0.9&&b.buf>=2));
    info=prod?`Al lavoro: ${b.workers.length} su ${b.want} · scorta nell'edificio ${b.buf}/${Sim.BUFCAP}`:b.type==='forester'?`Al lavoro: ${b.workers.length} su ${b.want} · alberelli in crescita: ${Sim.stats().saps}`:`Al lavoro: ${b.workers.length} su ${b.want} · grano ${S.stock.grain}, farina ${S.stock.flour}`;
    list=Sim.villagers().filter(v=>v.job===b.id).map((v,i)=>`<div>Addetto ${i+1}: ${esc(Sim.roleText(v))}</div>`).join('')+(full?'<div>Il villaggio ne ha già abbastanza: gli addetti aiutano gli altri.</div>':'')+(b.workers.length===0&&b.want>0?`<div>Nessun addetto: servono abitanti liberi (${Sim.villagers().length} in paese). Disegna un quartiere residenziale abbastanza grande, almeno 8×5 celle libere, perché nascano case e famiglie.</div>`:'')+(b.why&&!full?`<div>${esc(b.why)}</div>`:'');
  }
  else if(b.type==='inn'){const w=Sim.villagers().filter(v=>v.job===b.id);info=`Dispensa ${b.pantry}/20 · ospiti ${b.guestsIn}/4 · cavalli in stalla ${b.horses}/3`;
    list=w.map(v=>`<div>Oste: ${esc(Sim.roleText(v))}</div>`).join('')+`<div>Pasti serviti: ${S.visits} · viandanti diventati abitanti: ${S.settled}</div><div>L'oste compra il cibo in eccedenza dalle famiglie.</div>`;}
  else if(b.type==='sheepfold'){const w=Sim.villagers().filter(v=>v.job===b.id);info=`Lana pronta: ${b.buf}/${Sim.BUFCAP} · pascolo: ${b.fields.length} celle`;list=w.map(v=>`<div>Pastore: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>I tessitori ritirano la lana qui.</div>';}
  else if(b.type==='plaza'||b.type==='flowers'||b.type==='statue')info='Abbellimento: rende più piacevole la zona e attira nuovi abitanti.';
  else if(b.type==='granary')info=`Grano immagazzinato: ${S.stock.grain}/${Sim.stats().capGrain}. Lo ritira il mugnaio.`;
  else if(b.type==='well')info=`Acqua per le case entro ${Sim.WELL_R} celle. Luogo piacevole.`;
  else if(b.type==='church'){info=`Le case entro ${Sim.CHURCH_R} celle possono raggiungere il livello massimo. Luogo molto attraente.`+(b.cem?' Il cimitero sorge accanto alla chiesa.':'');}
  else if(b.type==='school'){const w=Sim.villagers().filter(v=>v.job===b.id);info=`Maestri: ${w.length}/${b.want} · alunni ora: ${b.pupils|0}/${Sim.SCHOOL_CAP} · persone istruite: ${stt.schooled}`;
    list=w.map(v=>`<div>Maestro: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>I bambini dai 6 anni vengono al mattino (con l\'editto sull\'istruzione obbligatoria anche al pomeriggio). A 14 anni chi ha studiato abbastanza sa leggere e scrivere: la sua casa migliora più in fretta.</div>'+(w.length===0?'<div>Senza maestro la scuola resta chiusa.</div>':'')+((b.pupils|0)>=Sim.SCHOOL_CAP?'<div>Aula piena: costruisci un\'altra scuola.</div>':'');}
  else if(b.type==='infirmary'){const w=Sim.villagers().filter(v=>v.job===b.id);const near=Sim.villagers().filter(v=>{if(!v.ill)return false;const hb=Sim.buildings().get(v.home);return hb&&Math.hypot(hb.cell%N-b.cell%N,(hb.cell/N|0)-(b.cell/N|0))<=Sim.HEAL_R;}).length;
    info=`Erboristi: ${w.length}/${b.want} · malati nel raggio di cura: ${near} · guariti finora: ${S.cured}`;
    list=w.map(v=>`<div>Erborista: ${esc(Sim.roleText(v))}</div>`).join('')+'<div>Cura i malati delle case entro 45 celle: guariscono più in fretta e rischiano meno di morire. Frena anche il contagio.</div>'+(w.length===0?'<div>Senza erborista l\'ospizio non cura.</div>':'');}
  else if(b.type==='cemetery'){info=`Sepolti: ${S.buried} · defunti senza sepoltura: ${S.unburied||0}`;list='<div>I defunti ricevono sepoltura qui: senza un cimitero i morti rendono la zona meno piacevole.</div>';}
  $('selName').textContent=name;$('selInfo').textContent=info;if(selCacheList!==list){selCacheList=list;$('selList').innerHTML=list;}
  $('selJobs').hidden=!(b.state==='done'&&t.slots>0);
  $('selZone').hidden=!(Sim.ZONED[b.type]&&b.state==='done');if(!$('selZone').hidden){$('zR').textContent=b.zone?b.zone.r:(b.type==='forester'?72:39);$('zSet').textContent=zoneEdit===b.id?'Clicca sulla mappa…':(b.zone?'Sposta zona':'Scegli sulla mappa');}$('wCount').textContent=b.want;
  $('selCem').hidden=!(b.type==='church'&&b.state==='done'&&!b.cem);
  $('selDemo').hidden=b.type==='stall';
  $('selDemo').textContent=b.state==='site'?'Annulla cantiere':'Demolisci';
}
function selB(){return sel&&Sim.buildings().get(sel);}
$('selCem').addEventListener('click',()=>{const b=selB();if(!b||b.type!=='church')return;const res=Sim.addCemetery(b.id);toast(res.ok?'Cantiere del cimitero avviato accanto alla chiesa.':(res.msg||'Non c\'è spazio per il cimitero'));refreshSel();});
const EDICTS=[
  {k:'noUpgrade',ic:'🏚️',t:'Vieta l\'avanzamento delle Case',d:'Le famiglie non potranno più migliorare la propria casa: i livelli restano come sono.',fx:'Utile per tenere basso il livello del borgo.'},
  {k:'noImmig',ic:'🚧',t:'Blocca l\'immigrazione',d:'I viandanti non si fermeranno più in paese e nessun nuovo abitante arriverà da fuori.',fx:'La popolazione crescerà solo con le nascite.'},
  {k:'birthBonus',ic:'👶',t:'Incentivo alle nascite',d:'Le famiglie con una coppia in salute hanno figli più spesso: la comunità promette doni e aiuto ai genitori.',fx:'Più bambini = più bocche da sfamare e più legna da scaldare.'},
  {k:'schoolMandatory',ic:'📖',t:'Istruzione obbligatoria',d:'I bambini dai 6 anni frequentano la scuola anche il pomeriggio e imparano più in fretta.',fx:'Meno aiuto in giardino, ma più persone istruite. Serve una scuola con maestro.'},
  {k:'quarantine',ic:'🚷',t:'Quarantena',d:'Si chiudono porte e mercati: niente viandanti né nuovi arrivi, niente banchi e baratti. Il contagio rallenta molto.',fx:'Il commercio si ferma finché resta in vigore.'},
  {k:'woodDuty',ic:'🪵',t:'Obbligo di legna da ardere',d:'Ogni famiglia deve tenere in casa il doppio della scorta di legna e comprarla al mercato in ogni stagione; i giardini della legna ne accumulano fino a 20.',fx:'Case più calde e sane, ma i giardini rendono un po\' meno.'}];
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
function updPbar(){const on=pend&&BT[tool]&&!zoneEdit;$('pbar').hidden=!on;if(!on)return;const c=BT[tool].cost,p=[];if(c.wood)p.push('legno '+c.wood);if(c.stone)p.push('pietra '+c.stone);$('pName').textContent=BT[tool].name+(p.length?' · '+p.join(', '):'');$('pRot').style.display=NOGATE[tool]?'none':'';}
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
const TK={};TOOLS.forEach(t=>TK[t.key]=t.id);
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys[k]=true;
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
function toggleZones(){zonesOn=!zonesOn;$('zoneBtn').classList.toggle('on',zonesOn);groundDirty=true;if(zonesOn)toast('Zone segnalate: bandiere arancioni = caccia (boschi fitti e tranquilli), bandiere azzurre = pesca (rive di lago e fiume; in inverno sono ghiacciate).');}
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

// ---------- livelli ----------
const lv2=s=>s.levels[2]+s.levels[3]+s.levels[4];
const LEVELS=[
  {title:'Il Villaggio',intro:'Il centro cittadino è una staccionata con le scorte: tre magazzinieri portano i materiali ai cantieri. Disegna un quartiere e costruisci i primi mestieri.',
   outro:'Il primo raccolto è in dispensa. Nessuno è morto di fame: dai carri sono nate case, e dalle case un villaggio. Frate Anselmo benedice i tetti di paglia.',goals:[
    {txt:'Disegna 12 lotti di quartiere residenziale (1 lotto = 3×3 celle)',cur:s=>s.dc[1],n:12},
    {txt:'Costruisci un taglialegna',cur:s=>s.built.wood||0,n:1},
    {txt:'Costruisci una cava di pietra',cur:s=>s.built.quarry||0,n:1},
    {txt:'Raggiungi 8 abitanti',cur:s=>s.pop,n:8}]},
  {title:'Il Borgo',intro:'Le famiglie vogliono acqua e un mercato. Un pozzo e una zona mercato fanno la differenza.',
   outro:'Una primavera dopo, sul sentiero arrivano i mercanti: sentono odore di pane e di legna tagliata. Il borgo comincia ad avere un nome.',goals:[
    {txt:'Costruisci un pozzo',cur:s=>s.built.well||0,n:1},
    {txt:'Disegna 8 lotti di mercato',cur:s=>s.dc[3],n:8},
    {txt:'Una casa migliorata a livello 2',cur:s=>lv2(s),n:1},
    {txt:'Raggiungi 18 abitanti',cur:s=>s.pop,n:18}]},
  {title:'La Città',intro:'Con una zona agricola le famiglie fonderanno fattorie. Una chiesa porta le case ai livelli alti. Il legname non è infinito: disegna una zona forestale e metti un guardaboschi.',
   outro:"La chiesa suona per la prima volta. Anselmo apre la cassa che ha sempre custodito: dentro, la carta della valle e una lettera del vescovo. Il borgo ha il diritto di chiamarsi città se saprà battere il ferro.",goals:[
    {txt:'Disegna 12 lotti di zona agricola',cur:s=>s.dc[2],n:12},
    {txt:'Una fattoria fondata dagli abitanti',cur:s=>s.farms,n:1},
    {txt:'Cinque baratti al mercato',cur:s=>s.barters,n:5},
    {txt:'Costruisci una chiesa',cur:s=>s.built.church||0,n:1},
    {txt:'Disegna 8 lotti di zona forestale',cur:s=>s.dc[4],n:8},
    {txt:'Costruisci un guardaboschi',cur:s=>s.built.forester||0,n:1}]},
  {title:'Le Botteghe',intro:'Nelle rocce scure c\'è il ferro. Con una miniera, le case di terzo livello aprono botteghe di artigianato. Con granaio e mulino, quelle di quarto livello apriranno il panificio.',
   outro:"Il fabbro batte il primo vomere nuovo. Sotto il portico del mercato qualcuno ricorda il feudo di Rocca Nera, e per la prima volta ne parla senza paura.",goals:[
    {txt:'Costruisci una miniera di ferro',cur:s=>s.built.mine||0,n:1},
    {txt:'Un piccolo allevamento nei giardini',cur:s=>s.herds,n:1},
    {txt:'Una bottega di artigianato',cur:s=>s.crafters,n:1},
    {txt:'Costruisci un granaio',cur:s=>s.built.granary||0,n:1},
    {txt:'Costruisci un mulino',cur:s=>s.built.mill||0,n:1},
    {txt:'Raggiungi 40 abitanti',cur:s=>s.pop,n:40}]},
  {title:'Locanda e Telai',intro:'Una locanda accoglie i viandanti: mercanti, pellegrini, artigiani. Qualcuno potrebbe fermarsi. Con un pascolo e un ovile nascono la lana, i tessitori (livello 3) e i sarti (livello 4). Abbellisci il centro con piazze e decorazioni.',
   outro:"La campana della locanda suona la sera. Un mercante parla di fiere lontane e di città che ancora non conoscono Borgo Vivo. Ogni notte, però, le porte si chiudono e i cantieri riposano.",goals:[
    {txt:'Costruisci una locanda',cur:s=>s.built.inn||0,n:1},
    {txt:'Servi 5 pasti ai viandanti',cur:s=>s.visits,n:5},
    {txt:'Disegna 10 lotti di pascolo',cur:s=>s.dc[5],n:10},
    {txt:'Un tessitore',cur:s=>s.weavers,n:1},
    {txt:'Un sarto',cur:s=>s.tailors,n:1},
    {txt:'Una piazza con fontana',cur:s=>s.built.plaza||0,n:1}]},
  {title:'La Capitale',intro:'Ultimo traguardo del prototipo.',
   outro:'Dalle mura di legno al campanile di pietra: la carovana di sette carri è diventata una capitale. Ma questa è soltanto la prima pagina della storia di Borgo Vivo.',goals:[
    {txt:'Due case signorili (livello 4)',cur:s=>s.levels[4],n:2},
    {txt:'Un panificio',cur:s=>s.bakers,n:1},
    {txt:'Raggiungi 60 abitanti',cur:s=>s.pop,n:60},
    {txt:'Un viandante diventa abitante',cur:s=>s.settled,n:1},
    {txt:'Tre banchi aperti al mercato',cur:s=>s.stalls,n:3},
    {txt:'Traccia 25 tratti di strada',cur:s=>s.roads,n:25}]}
];
let lvl=0,goalEls=[],cleared=false;
function showLevel(){
  const L0=LEVELS[lvl];$('lvlTitle').textContent=`Livello ${lvl+1} · ${L0.title}`;
  const ul=$('goals');ul.innerHTML='';goalEls=L0.goals.map(gl=>{const li=document.createElement('li');li.innerHTML=`<span>${gl.txt}</span><em></em>`;ul.appendChild(li);return li;});
  cleared=false;toast(L0.intro);
}
function checkGoals(st){
  const L0=LEVELS[lvl];let all=true;
  L0.goals.forEach((gl,i)=>{const c=Math.min(gl.n,Math.floor(gl.cur(st))),done=c>=gl.n;goalEls[i].classList.toggle('done',done);goalEls[i].lastChild.textContent=`${c}/${gl.n}`;if(!done)all=false;});
  if(all&&!cleared){cleared=true;setTimeout(()=>{
    const last=lvl===LEVELS.length-1;$('mTitle').textContent=last?'Prototipo completato':`Livello ${lvl+1} completato`;
    $('mText').textContent=LEVELS[lvl].outro+(last?' Puoi continuare a costruire liberamente.':'');
    $('modal').hidden=false;setSpeed(0);},700);}
}
$('mBtn').addEventListener('click',()=>{$('modal').hidden=true;setSpeed(1);if(lvl<LEVELS.length-1){lvl++;showLevel();}});
$('lvlTitle').addEventListener('click',()=>$('lvl').classList.toggle('collapsed'));
if(window.innerWidth<640||COARSE)$('lvl').classList.add('collapsed');

// ---------- bisogni di una casa (felicità) ----------
function needsHtml(b){
  const n=Sim.needsOf(b),row=(t,v,m)=>`<div class="need"><span>${v>=m?'✓':'✗'} ${t}</span><b>${v}/${m}</b></div>`;
  return row('Cibo',n.food,30)+row('Casa (caldo, legna, quiete, spazio)',Math.round(n.home),25)+row('Acqua (pozzo vicino)',n.water,25)+(n.hasChurch?row('Chiesa vicina',n.church,20):'<div class="need"><span>• Chiesa: serve dal livello 2</span><b>–</b></div>');
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
  h+='<h4>Istruzione</h4>';
  const sch=dead?r.schooled:v.schooled;
  if(!dead&&child){const p=Math.min(100,Math.round(v.edu/3));h+=`<p>${age<6?'Troppo piccolo per la scuola.':'Frequenta la scuola, se c\'è un maestro.'}</p><div class="bar"><i style="width:${p}%"></i></div><p>Apprendimento: ${p}%</p>`;}
  else h+=`<p>${sch?'Sa leggere e scrivere.':'Non sa leggere né scrivere.'}</p>`;
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
$('selList').addEventListener('click',ev=>{const l=ev.target.closest&&ev.target.closest('[data-v]');if(l)openCard(+l.getAttribute('data-v'));});
addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('card').hidden)closeCard();});

// ---------- HUD ----------
let hudT=0;const PHN={work:'lavoro',meal:'pasto',evening:'sera',night:'notte'};
function updateHUD(){
  const st=Sim.stats();
  capNow=st.capRes||80;if(attrOn)groundDirty=true;
  $('rWood').textContent=`${S.stock.wood}/${capNow}`;$('rStone').textContent=`${S.stock.stone}/${capNow}`;$('rFood').textContent=st.food;$('rIron').textContent=`${S.stock.iron}`;$('rGrain').textContent=`${S.stock.grain}·${S.stock.flour}`;
  $('rDay').textContent=`${Sim.SEASONS[st.season]} ${st.day%Sim.SEASON_DAYS+1}/${Sim.SEASON_DAYS} · annata ${st.year} · ${PHN[st.ph]}`;
  $('rPop').textContent=`${st.pop}/${st.cap}`+(st.children?` (👶${st.children})`:'');$('rJobs').textContent=`${st.jobs}/${st.slots}`;$('rBarter').textContent=st.barters;
  $('rFire').textContent=`${st.fire}/${st.fireNeed}`;$('rSick').textContent=st.sick+(st.plague?' ☣':'');$('chipSick').classList.toggle('alert',st.sick>0);$('rWell').textContent=Math.round(st.avgJoy)+(st.unhappy?' · '+st.unhappy+' tristi':'');$('chipJoy').classList.toggle('alert',st.unhappy>0&&st.avgJoy<45);
  checkGoals(st);refreshSel();if(cardId)renderCard();
  for(const t of TOOLS)if(BT[t.id])toolBtns[t.id].classList.toggle('poor',!Sim.afford(t.id));
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
let sIdx=0;
function showStory(){
  const sc=STORY[sIdx];$('sTitle').textContent=sc.t;$('sText').textContent=sc.x;$('sBtns').innerHTML='';
  if(sc.choice){
    for(const [m,l] of[['lake','Il lago'],['river','Il fiume']]){const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=l;b.addEventListener('click',()=>begin(m));$('sBtns').appendChild(b);}
  }else{const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=sIdx===0?'Inizia':'Avanti';b.addEventListener('click',()=>{Music.start();sIdx++;showStory();});$('sBtns').appendChild(b);}
}
function begin(mode){
  Music.start();$('story').hidden=true;
  Sim.init(7,mode);started=true;if(COARSE)setTimeout(()=>toast('Un dito: sposta la mappa. Due dita: pizzica per zoomare, ruota per girare. Scegli una categoria e uno strumento in basso.'),7000);
  if(treesDirty)rebuildTrees();if(rocksDirty)rebuildRocks();if(sapsDirty)rebuildSaps();groundDirty=true;
  showLevel();
}
showStory();
let last=performance.now(),clock=0;
function frame(now){requestAnimationFrame(frame);try{frame2(now);}catch(e){console.error(e);}}
function frame2(now){
  const dt=Math.min(0.1,(now-last)/1000);last=now;clock+=dt;
  if(started&&speed>0){let rem=dt*speed;while(rem>0){const d=Math.min(0.05,rem);Sim.step(d);rem-=d;}}
  updateCam(dt);
  if(treesDirty)rebuildTrees();if(rocksDirty)rebuildRocks();if(sapsDirty)rebuildSaps();
  if(groundDirty&&now-lastGround>350){drawGround();groundDirty=false;lastGround=now;}
  for(const e of ents.values()){
    const b=e.b,ud=e.body.userData;
    if(ud&&ud.sails)ud.sails.rotation.z-=dt*0.7;
    if(ud&&ud.gv){const n=Math.min(ud.gv.length,S.buried|0);if(ud.shown!==n){ud.shown=n;ud.gv.forEach((m,i)=>{m.visible=i<n;});}}
    if(ud&&ud.logs){ud.logs.scale.y=0.15+0.85*Math.min(1,S.stock.wood/capNow);ud.stones.scale.y=0.2+0.8*Math.min(1,S.stock.stone/capNow);}
    if(b.state==='site'){const t=BT[b.type],tot=t.cost.wood+t.cost.stone,fr=(b.got.wood+b.got.stone)/Math.max(1,tot);e.body.scale.y=0.1+0.9*(fr*0.25+b.prog*0.75);}
    else if(e.pop>0){e.pop-=dt;e.body.scale.y=1+Math.sin(Math.max(0,e.pop)/0.4*Math.PI)*0.08;if(e.pop<=0)e.body.scale.y=1;}
  }
  for(const v of Sim.villagers().concat(Sim.guests())){
    const m=vms.get(v.id);if(!m)continue;
    m.gp.visible=!v.inside&&!hiddenIn(v);m.gp.position.set(v.x,v.moving?Math.abs(Math.sin(clock*11+v.id))*0.07:0,v.z);m.gp.rotation.y=v.fa;
    if(v.age!==undefined&&!v.guest){const k=0.8*(0.62+0.38*Math.min(1,v.age/14));if(m.k!==k){m.k=k;m.gp.scale.setScalar(k);}}
    if(!v.guest){const ill=!!v.ill;if(m.ill!==ill){m.ill=ill;m.body.material=ill?MAT.sick:m.mat;}}
    const cw=v.carry||null;if(cw!==m.carry){m.carry=cw;m.load.visible=!!cw;if(cw)m.load.material=CARRY[cw]||MAT.log;}
  }
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
