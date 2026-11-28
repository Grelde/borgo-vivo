// v89: fertilità che rende, ricchezza dei giacimenti, falde acquifere e Rabdomante.
const Sim=require('../src/sim.js');const {N,SC,grids:G,S}=Sim;const FE=Sim.env.fert;
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
const run=(sec,dt=0.2)=>{for(let i=0;i<sec/dt;i++)Sim.step(dt);};
const C=Sim.CEN;
console.log('1) una falda passa sempre sotto il Centro Cittadino, in ogni mappa');
const lv=[0,0,0,0];let aqSum=0,cnt=0;const lvOf=v=>v<25?0:v<45?1:v<70?2:3;
for(const mode of ['lake','river'])for(let k=0;k<30;k++){
  const sd=500+k*173;Sim.init(sd,mode,undefined,{aquifers:true});
  let c=0;for(let y=C-3;y<=C+3;y++)for(let x=C-3;x<=C+3;x++)if(G.aq[y*N+x])c++;
  ok(c>=40,mode+' '+sd+': falda sotto il centro ('+c+'/49 celle)');
  let known=0;for(let y=C-3;y<=C+3;y++)for(let x=C-3;x<=C+3;x++)if(G.aqK[y*N+x])known++;
  ok(known>=40,mode+' '+sd+': la falda sotto il centro è già nota ('+known+')');
  ok(Sim.canPlace('well',C+4,C+4,0)===''||/spazio|occupat|Non|vicin|libero/i.test(Sim.canPlace('well',C+4,C+4,0)),mode+' '+sd+': pozzo vicino al centro valutabile');
  let a=0;for(let i=0;i<N*N;i++){if(!G.water[i])lv[lvOf(FE[i])]++;if(G.aq[i])a++;}aqSum+=a;cnt++;
}
const tot=lv.reduce((a,b)=>a+b,0);
console.log('livelli di suolo (arido/povero/buono/fertile %):',lv.map(v=>(100*v/tot).toFixed(1)).join(' / '),'· celle di falda medie',Math.round(aqSum/cnt));
ok(lv.every(v=>v/tot>0.05),'tutti e quattro i livelli di fertilità compaiono');
ok(lv[0]/tot<0.3,'il suolo arido è una minoranza');
ok(Math.abs(Sim.soilF(0)-0.6)<1e-9&&Math.abs(Sim.soilF(100)-1.4)<1e-9&&Math.abs(Sim.soilF(50)-1)<1e-9,'resa ×0,6 / ×1 / ×1,4 a fertilità 0 / 50 / 100');

console.log('2) fertilità: più resa dove il suolo è buono');
Sim.init(77,'lake',undefined,{aquifers:true});
ok(Sim.soilF(10)<Sim.soilF(40)&&Sim.soilF(40)<Sim.soilF(80),'moltiplicatori crescenti');
ok(Sim.soilName(10)==='Arida'&&Sim.soilName(60)==='Buona'&&Sim.soilName(90)==='Ottima','nomi dei livelli');
let m=0;for(let y=C-45;y<=C+45;y++)for(let x=C-45;x<=C+45;x++)m+=Sim.soilF(FE[y*N+x]);
m/=91*91;ok(m>0.8&&m<1.2,'resa media attorno al centro vicina a 1 ('+m.toFixed(2)+')');
let oSum=0,oN=0;for(let i=0;i<N*N;i++)if(G.ore[i]){oSum+=G.ore[i];oN++;}
ok(oN>0&&oSum/oN>6&&oSum/oN<15,'ricchezza media dei giacimenti attorno a 10 ('+(oSum/oN).toFixed(1)+')');

console.log('3) pozzi: solo sulle falde note, Rabdomante per scoprirne altre');
let ax=-1,ay=-1,fx=-1,fy=-1;
for(let y=0;y<N&&(ax<0||fx<0);y+=3)for(let x=0;x<N;x+=3){const i=y*N+x;if(G.aq[i]&&!G.aqK[i]&&ax<0&&Math.hypot(x-C,y-C)>70){ax=x;ay=y;}
  if(!G.aq[i]&&fx<0&&Math.hypot(x-C,y-C)<40&&!G.water[i]){fx=x;fy=y;}}
ok(ax>=0,'esiste una falda lontana ancora ignota');
S.stock.wood=200;S.rank=6;
if(ax>=0){
  const r0=Sim.canPlace('well',ax,ay,0);ok(/falda|Rabdomante/.test(r0),'senza falda nota il pozzo è rifiutato: '+r0);
  const w0=S.stock.wood;const d=Sim.dowse(ax,ay);
  ok(d.ok&&d.found>0&&S.stock.wood===w0-Sim.AQ_COST,'il rabdomante trova la falda e costa '+Sim.AQ_COST+' legni ('+d.msg+')');
  ok(G.aqK[ay*N+ax]===1,'la cella è ora nota');
  const d2=Sim.dowse(ax,ay);ok(!d2.ok&&S.stock.wood===w0-Sim.AQ_COST,'ripetere nello stesso punto non costa nulla ('+d2.msg+')');
  // un posto davvero libero sulla falda scoperta: tutta l'impronta del pozzo deve stare sull'acqua nota
  let okSpot=false;for(let y=Math.max(0,ay-27);y<=Math.min(N-1,ay+27)&&!okSpot;y++)for(let x=Math.max(0,ax-27);x<=Math.min(N-1,ax+27);x++)if(G.aqK[y*N+x]&&Sim.canPlace('well',x,y,0)===''){okSpot=true;break;}
  ok(okSpot,'sulla falda scoperta si può scavare un pozzo');
}
if(fx>=0){const w1=S.stock.wood;const d3=Sim.dowse(fx,fy);ok(d3.ok&&d3.found===0&&S.stock.wood===w1-Sim.AQ_COST||d3.found>0,'dove non c\'è acqua il rabdomante lo dice: '+d3.msg);}
S.stock.wood=0;const d4=Sim.dowse(ax,ay);ok(!d4.ok,'senza legno non si cerca: '+d4.msg);
Sim.init(5,'lake');ok(!S.aqRule,'senza l\'opzione (test e vecchie partite) i pozzi restano liberi');

console.log('4) salvataggio: suolo e falde note viaggiano; i vecchi salvataggi le ricreano dal seme');
Sim.init(91,'river',undefined,{aquifers:true});S.stock.wood=100;
Sim.dowse(40,40);
const fert0=Array.from(FE),aq0=Array.from(G.aq),k0=Array.from(G.aqK);
const json=JSON.stringify(Sim.exportState());
Sim.init(3,'lake');Sim.importState(JSON.parse(json));
ok(Array.from(FE).join()===fert0.join()&&Array.from(G.aq).join()===aq0.join()&&Array.from(G.aqK).join()===k0.join(),'fertilità, falde e falde note identiche dopo il caricamento');
ok(S.aqRule===true,'la regola delle falde resta attiva');
const old=JSON.parse(json);delete old.grids.aq;delete old.grids.aqK;
Sim.init(3,'lake');Sim.importState(old);
let cc=0;for(let y=C-3;y<=C+3;y++)for(let x=C-3;x<=C+3;x++)if(G.aq[y*N+x])cc++;
ok(cc>=40,'senza i dati del suolo falde e suolo vengono ricreati dal seme, con la falda sotto il centro ('+cc+')');
ok(Array.from(FE).join()===fert0.join(),'la fertilità resta identica (si ricava dal seme)');
ok(Array.from(G.aqK).join()===Array.from(G.aq).join(),'le partite vecchie conoscono tutte le falde');
run(20);ok(true,'la partita ricaricata prosegue');

console.log(fail?'FALDE: '+fail+' FALLIMENTI su '+n:'FALDE OK ('+n+' controlli)');process.exit(fail?1:0);
