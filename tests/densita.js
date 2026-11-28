// v61: zona alta densità, giardino pieno dal rango 4, fusione delle case in centro
let sd=12345;Math.random=()=>{sd=(sd*1664525+1013904223)%4294967296;return sd/4294967296;};
const Sim=require('../src/sim.js');const S=Sim.S,N=Sim.N,G=Sim.grids;
Sim.init(7,'lake');Sim.hooks.regarden=()=>{};S.rank=4;
S.stock.wood=600;S.stock.stone=300;
Sim.paintDistrict(60,100,100,128,1);
Sim.paintDistrict(102,100,125,128,6);
for(let y=96;y<=132;y++)Sim.paintRoad(101,y);
for(let x=56;x<=130;x++)Sim.paintRoad(x,114);
Sim.place('well',84,96,0);
let bad=0;
for(let i=0;i<60*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,400);S.stock.stone=Math.max(S.stock.stone,200);S.stock.bread=Math.max(S.stock.bread,500);S.stock.fish=Math.max(S.stock.fish,500);S.stock.meat=Math.max(S.stock.meat,500);}}
const hs=[...Sim.buildings().values()].filter(h=>h.type==='house');
const dn=hs.filter(h=>h.dens),rs=hs.filter(h=>!h.dens);
console.log('case',hs.length,'alta densità',dn.length,'residenziali',rs.length,'fusioni',rs.reduce((a,h)=>a+(h.merged|0),0));
for(const h of dn){if(G.dist[h.cell]!==6){bad++;console.log('casa densa fuori zona');}if(h.ext.length){bad++;console.log('casa densa con giardino');}}
// muri in comune: almeno una coppia di case dense addossate (nessuna cella libera in mezzo)
let touch=0;const occH=new Map();for(const h of dn)for(const i of h.cells)occH.set(i,h.id);
for(const h of dn)for(const i of h.cells){for(const d of[1,N]){const j=i+d,o=occH.get(j);if(o&&o!==h.id){touch++;}}}
console.log('contatti tra case dense',touch);
let full=0,small=0;for(const h of rs){if(h.gfull===false)small++;else if(h.gcells.length>=9||h.merged)full++;}
console.log('case residenziali con giardino pieno',full,'con orto piccolo',small);
const hungry=dn.filter(h=>h.hungry>=60).length,starved=S.deathsBy.hunger|0;
console.log('dense affamate',hungry,'morti per fame',starved);
// fusione: forza la ricerca più volte (la scelta naturale è casuale) e verifica coerenza
const before=rs.length;let merged=0;for(let k=0;k<30;k++){if(Sim.mergeTick())merged++;}
const after=[...Sim.buildings().values()].filter(h=>h.type==='house'&&!h.dens);
console.log('fusioni forzate',merged,'case residenziali',before,'->',after.length);
for(const h of after){for(const i of h.ext){if(Sim.grids.occ[i]!==h.id){bad++;console.log('cella ext non occupata');break;}}}
if(!(rs.reduce((a,h)=>a+(h.merged|0),0)+merged>=1)){bad++;console.log('nessuna fusione avvenuta');}
if(dn.length<3){bad++;console.log('poche case dense');}
if(touch<1){bad++;console.log('nessuna casa addossata');}
if(small>0){bad++;console.log('orti piccoli a rango 4');}
if(dn.length&&hungry>dn.length*0.3){bad++;console.log('troppe dense affamate');}
console.log(bad?'DENSITA_FAIL':'DENSITA_OK');process.exit(bad?1:0);
