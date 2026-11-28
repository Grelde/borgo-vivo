// v57.1: nessun abitante deve restare fermo a metà percorso. Con il passo del browser (0,05 s) un abitante si incastrava a una curva
// diagonale: il punto di mira coincideva con la sua posizione e lui restava "in cammino" per sempre (costruttori, boscaioli...).
// Il test fa girare più partite con passo 0,05 s e segnala chi è "in cammino" ma non si muove da più di 6 s di gioco.
const Sim=require(process.env.SIMPATH||'../src/sim.js');const S=Sim.S;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const put=(type,cx,cy,r)=>{for(let d=0;d<=r;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d){const q=Sim.place(type,cx+dx,cy+dy,0);if(q.ok)return q.b||true;}return false;};
let stuck=0,checked=0;const seen=new Set();
for(const seed of [1,2,3,4,5,6]){
  Math.random=mulberry(seed*7919+13);
  Sim.init(seed,seed%2?'lake':'river');
  S.stock.wood=60;S.stock.stone=40;
  Sim.paintDistrict(92+seed,92,102+seed,100,1);
  put('wood',84,96,30);put('quarry',108,96,30);
  const last=new Map();
  for(let i=0;i<Sim.DAY*4/0.05;i++){
    Sim.step(0.05);
    if(i%10)continue;
    for(const v of Sim.villagers()){
      if(!v.moving||!v.path.length){last.delete(v.id);continue;}
      checked++;
      const p=last.get(v.id);
      if(p&&Math.abs(p.x-v.x)<1e-6&&Math.abs(p.z-v.z)<1e-6&&p.path0===v.path[0]){
        if(S.t-p.t>6){const k=seed+':'+v.id+':'+v.path[0];if(!seen.has(k)){seen.add(k);stuck++;if(stuck<=5)console.log('BLOCCATO: seme',seed,'abitante',v.id,'stato',v.state,'cella',v.cell,'verso',v.path[0],'giorno',S.day);}}
      }else last.set(v.id,{x:v.x,z:v.z,path0:v.path[0],t:S.t});
    }
  }
}
// caso reale (v57, annata 1 giorno 5): il costruttore del campo si fermava per sempre a una curva diagonale e nessun cantiere avanzava
{
  const fs=require('fs'),path=require('path');
  const w=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','stallo-curva-diagonale.json'),'utf8'));
  Math.random=mulberry(99);Sim.importState(w.sim);
  const bld=Sim.buildings(),sites0=[...bld.values()].filter(b=>b.state==='site').map(b=>b.id);
  for(let i=0;i<Sim.DAY*1.2/0.05;i++)Sim.step(0.05);
  const built=sites0.filter(id=>{const b=bld.get(id);return !b||b.state==='done';}).length;
  console.log('caso reale: cantieri iniziali',sites0.length,'finiti dopo 1,2 giorni',built);
  if(built<sites0.length){stuck++;console.log('BLOCCATO: nessun cantiere finito dal salvataggio reale');}
}
console.log('controlli',checked,'abitanti bloccati',stuck);
if(stuck){console.log('FALLITO');process.exit(1);}
console.log('BLOCCATI_OK');
