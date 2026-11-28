// v85: sottobosco con le bacche sotto gli alberi e bosco protetto (zona da non tagliare)
const Sim=require('../src/sim.js');const {N,SC,S,grids:G}=Sim;
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
const run=(sec,dt=0.2)=>{for(let i=0;i<sec/dt;i++)Sim.step(dt);};
const count=a=>{let c=0;for(let i=0;i<N*N;i++)if(a(i))c++;return c;};
console.log('1) il sottobosco nasce con la foresta della mappa');
for(const [sd,mode] of [[3,'lake'],[11,'river'],[27,'lake']]){
  Sim.init(sd,mode);const trees=count(i=>G.tree[i]),und=count(i=>Sim.under(i));
  ok(trees>500,'seme '+sd+': ci sono alberi ('+trees+')');
  ok(und/trees>0.2&&und/trees<0.6,'seme '+sd+': circa un terzo degli alberi ha il sottobosco ('+(100*und/trees).toFixed(0)+'%)');
  ok(count(i=>Sim.under(i)&&!G.tree[i])===0,'seme '+sd+': nessun sottobosco senza alberi');
  Sim.init(sd,mode);ok(count(i=>Sim.under(i))===und,'seme '+sd+': stesso seme, stesso sottobosco');
}
Sim.init(3,'lake');
console.log('2) tagliare l\'albero fa sparire il sottobosco; un albero nuovo lo riporta');
let cell=-1;for(let i=0;i<N*N;i++)if(Sim.under(i)){cell=i;break;}
ok(cell>=0,'esiste una cella con sottobosco');
G.tree[cell]=0;ok(!Sim.under(cell),'tolto l\'albero sparisce anche il sottobosco');
G.sap[cell]=1;G.sapT[cell]=0;let g=0;while(!G.tree[cell]&&g++<4000)Sim.step(1);
ok(G.tree[cell]===1&&Sim.under(cell),'il germoglio diventa albero e riporta il sottobosco (dopo '+g+' s)');
// il sottobosco di una cella senza macchia non nasce
let c2=-1;for(let i=0;i<N*N;i++)if(!G.undP[i]&&!G.tree[i]&&!G.water[i]&&!G.rock[i]){c2=i;break;}
G.sap[c2]=1;G.sapT[c2]=0;g=0;while(!G.tree[c2]&&g++<4000)Sim.step(1);
ok(G.tree[c2]===1&&!Sim.under(c2),'fuori dalle macchie un albero nuovo non ha sottobosco');
console.log('3) le bacche maturano in estate e in autunno');
const seasons=[];for(let k=0;k<4;k++){S.season=k;seasons.push(Sim.berriesRipe());}
ok(seasons.join()==='false,true,true,false','bacche solo in estate e autunno ('+seasons.join()+')');
console.log('4) bosco protetto: il taglialegna non taglia');
const prepare=prot=>{Sim.init(3,'lake');S.stock.wood=300;S.stock.stone=100;
  const b=Sim._t.addBuilding('wood',(Sim.CT-1)*SC-30,(Sim.CT-1)*SC,true,{rot:0});
  if(prot)ok(Sim.paintNoCut(0,0,N-1,N-1,1)>0,'protezione dipinta');
  return b;};
let b=prepare(false);const t0=count(i=>G.tree[i]);run(Sim.DAY*3);const t1=count(i=>G.tree[i]);
ok(t1<t0,'senza protezione il taglialegna taglia ('+t0+' → '+t1+')');
b=prepare(true);const p0=count(i=>G.tree[i]);run(Sim.DAY*3);const p1=count(i=>G.tree[i]);
ok(p1===p0,'con il bosco protetto non si taglia nessun albero ('+p0+' → '+p1+')');
// zona parziale: gli alberi fuori dalla zona si tagliano
Sim.init(3,'lake');S.stock.wood=300;Sim.paintNoCut(0,0,N-1,N-1,1);Sim.paintNoCut(0,0,N-1,N/2,0);
ok(count(i=>G.prot[i])>0&&count(i=>G.prot[i])<N*N,'protezione parziale e togli protezione funzionano');
ok(Sim.paintNoCut(0,0,N-1,N-1,1)>0&&count(i=>G.prot[i]&&G.water[i])===0,'l\'acqua non si protegge');
console.log('5) salvataggio');
Sim.init(5,'river');Sim.paintNoCut(40,40,90,90,1);const pr0=Array.from(G.prot).join();
const json=JSON.stringify(Sim.exportState());Sim.init(8,'lake');Sim.importState(JSON.parse(json));
ok(Array.from(G.prot).join()===pr0,'il bosco protetto torna dopo il caricamento');
const old=JSON.parse(json);delete old.grids.prot;Sim.importState(old);ok(count(i=>G.prot[i])===0,'un salvataggio senza protezione si carica senza zone protette');
Sim.init(5,'river');const u1=count(i=>Sim.under(i));Sim.importState(JSON.parse(json));ok(count(i=>Sim.under(i))===u1,'il sottobosco dopo il caricamento è quello della mappa');
console.log(fail?'SOTTOBOSCO: '+fail+' FALLIMENTI su '+n:'SOTTOBOSCO OK ('+n+' controlli)');process.exit(fail?1:0);
