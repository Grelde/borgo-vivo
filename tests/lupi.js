// v65: lupi, ferite persistenti e Cerusico.
// Branchi (almeno 4) di notte, forza 1/6 di un brigante (metà di un cittadino); cercano allevamenti e pascoli e azzannano chi è fuori;
// un guerriero li batte ma si ferisce; le ferite restano e le cura il cerusico (addetto istruito).
const Sim=require('../src/sim.js');const S=Sim.S;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const run=(sec,dt=0.2)=>{for(let i=0;i<sec/dt;i++)Sim.step(dt);};
const mil=side=>Sim.guests().filter(g=>g.mil&&(!side||g.side===side));
const wolves=()=>mil('wolf');
const built=(type,cx,cy)=>{for(let d=0;d<=30;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===d&&Sim.canPlace(type,cx+dx,cy+dy,0)===''){return Sim._t.addBuilding(type,cx+dx,cy+dy,true,{rot:0});}return null;};
// borgo di prova: un vero villaggio fatto crescere una volta sola, poi ricaricato identico a ogni prova
let BASE=null;
const hold=()=>{S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);};
const baseTown=()=>{
  if(BASE)return BASE;
  Math.random=mulberry(77);Sim.init(7,'lake',undefined,{story:true});S.rank=2;S.stock.wood=500;S.stock.stone=300;
  Sim.paintDistrict(78,78,111,108,1);built('store',93,70);
  for(let i=0;i<10*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0)hold();}
  BASE=JSON.stringify(Sim.exportState());
  return BASE;
};
const houses=()=>[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');
const town=seed=>{
  const j=baseTown();Math.random=mulberry(seed*7919+13);Sim.init(1,'river');Sim.importState(JSON.parse(j));
  S.rank=3;S.stock.wood=500;S.stock.stone=300;
  S.raid.next=99999;S.raid.arm=1;S.raid.seq=1;S.raid.fallen=0;S.raid.drafted=0;
  Object.assign(S.wolf,{arm:1,next:99999,seq:0,killed:0,lost:0,eaten:0,bitten:0,dead:0,bands:{}});
  const gs=Sim.guests();for(let i=gs.length-1;i>=0;i--)if(gs[i].mil)gs.splice(i,1);
  // un solo giardino con allevamento: sarà la preda; gli altri coltivano verdure
  const hs=houses();hs.forEach(h=>{h.crop='veg';});
  const prey=hs[0];prey.crop='herd';prey.goods.meat=6;
  return prey;
};
const waitPack=(max=Sim.DAY*3)=>{let t=0;while(!wolves().length&&t<max){Sim.step(0.2);t+=0.2;}return wolves().length>0;};

console.log('1) forza dei lupi: 1/6 di un brigante, metà di un cittadino');
ok(near(Sim.FRATIO.wolf,1/6)&&near(Sim.FRATIO.wolf/Sim.FRATIO.citizen,0.5),'FRATIO.wolf = 1/6, la metà di un cittadino');

console.log('2) i lupi arrivano di notte, in branco di almeno 4, e vanno dagli animali');
const prey=town(41);S.wolf.next=1;
let seq0=S.wolf.seq,steps=0,ph=null;while(S.wolf.seq===seq0&&steps++<Sim.DAY*3/0.2){Sim.step(0.2);if(S.wolf.seq!==seq0)ph=S.ph;}
ok(S.wolf.seq>seq0,'è arrivato un branco');
ok(ph==='night','arriva di notte (fase '+ph+')');
const pack=wolves();
ok(pack.length>=4&&pack.length<=8,'il branco ha almeno 4 lupi ('+pack.length+')');
ok(pack.every(w=>w.target===prey.id),'vanno al giardino con allevamento');
const w0=pack[0];
ok(near(w0.mhp/(24*w0.pw),1/6)&&near(w0.dps/(4*w0.pw),1/6),'ogni lupo ha 1/6 della forza di un brigante (pf '+(w0.mhp/(24*w0.pw)).toFixed(3)+')');
ok(near(w0.mhp/(24*Sim.FRATIO.citizen*w0.pw),0.5),'ed è la metà di un cittadino');

console.log('3) azzannano chi è rimasto fuori e sbranano gli animali');
// un adulto rimasto fuori accanto al branco
const vs=Sim.villagers().filter(v=>!v.child&&!v.ill&&!v.inside&&v.state!=='war');
const pv=vs[0]||Sim.villagers().find(v=>!v.child);
pv.inside=false;pv.state='wait';pv.timer=9999;pv.x=w0.x+0.8;pv.z=w0.z;pv.cell=w0.cell;pv.cool=0;
const wp0=Sim.villagers().length;
run(8);
ok(Sim.hpOf(pv)<100||!Sim.villagers().some(v=>v.id===pv.id),'il lupo ha azzannato l\'abitante rimasto fuori (salute '+Math.round(Sim.hpOf(pv))+')');
ok(S.wolf.bitten>=1,'morso contato');
ok(wolves().some(w=>w.hp<w.mhp)||S.wolf.killed>0,'l\'adulto si è difeso (un lupo ferito o morto)');
let g3=0;while(wolves().length&&g3++<1500)Sim.step(0.2);
ok(S.wolf.eaten>0&&prey.goods.meat<6,'sbranati degli animali ('+S.wolf.eaten+', carne '+prey.goods.meat+')');
ok(!wolves().length,'il branco se ne va o muore');

console.log('4) di giorno niente morsi: i lupi cacciano solo di sera e di notte');
town(43);const hvs=Sim.villagers().filter(v=>!v.child)[0];
S.wolf.next=1;waitPack();
S.f=0.5;S.ph='work'; // a metà giornata
const ww=wolves()[0];hvs.inside=false;hvs.state='wait';hvs.timer=9999;hvs.x=ww.x+0.8;hvs.z=ww.z;hvs.cell=ww.cell;
const b0=S.wolf.bitten;Sim.step(0.2);
ok(S.wolf.bitten===b0,'di giorno nessun morso (morsi '+S.wolf.bitten+')');

console.log('5) un guerriero batte il branco ma si ferisce; le ferite restano');
const prey5=town(45);
const bar=built('barracks',72,93);bar.want=1; // un solo guerriero
let wk=0;while(bar.workers.length<1&&wk<150){Sim.step(0.2);wk+=0.2;}
ok(bar.workers.length===1,'la caserma ha un guerriero ('+bar.workers.length+')');
const warrior=Sim.villagers().find(v=>v.id===bar.workers[0]);
S.stock.weapons=0;S.wolf.next=1;waitPack();
const nPack=wolves().length;
let g5=0;const hpSeen=[];
let maxFighters=0;while((wolves().length||mil('mine').length)&&g5++<4000){Sim.step(0.2);maxFighters=Math.max(maxFighters,mil('mine').filter(g=>g.kind==='warrior'||g.kind==='armed').length);}
ok(maxFighters===1,'in campo c\'è un solo guerriero, non uno in più a ogni secondo ('+maxFighters+')');
ok(Sim.villagers().find(v=>v.id===warrior.id).job===bar.id,'il guerriero mantiene il suo posto alla caserma');
ok(S.wolf.killed+S.wolf.lost>=nPack,'il branco è finito ('+S.wolf.killed+' morti, '+S.wolf.lost+' in fuga su '+nPack+')');
ok(S.wolf.killed>=Math.ceil(nPack/2),'il guerriero ha ucciso la maggior parte dei lupi ('+S.wolf.killed+' su '+nPack+')');
const wv=Sim.villagers().find(v=>v.id===warrior.id);
ok(!!wv,'il guerriero è sopravvissuto');
ok(wv&&Sim.hpOf(wv)<95,'ma è ferito: salute '+(wv?Math.round(Sim.hpOf(wv)):'-')+'%');
console.log('   salute del guerriero dopo il branco:',wv?Math.round(Sim.hpOf(wv)):'-','%');
ok(wv&&wv.state!=='war','e non resta bloccato in guerra');
const hp5=Sim.hpOf(wv);
run(60);
const gainHome=Sim.hpOf(wv)-hp5;
ok(gainHome>0&&gainHome<8,'a casa guarisce piano (+'+gainHome.toFixed(1)+' in 60 s)');
ok(Sim.hpOf(wv)<100,'dopo un minuto è ancora ferito');
// chi è molto ferito non scende in campo

console.log('6) il Cerusico: addetto istruito, cura in fretta');
town(47);
const cer=built('surgeon',72,93);
for(const v of Sim.villagers())v.schooled=false;
run(40);
ok(cer&&cer.workers.length===0,'senza persone istruite il cerusico resta vuoto');
ok(!Sim.surgeonOpen(cer),'e non cura');
const adults=Sim.villagers().filter(v=>!v.child&&!v.job&&!v.ill&&!v.duty);
const lettered=adults[0];lettered.schooled=true;
let w6=0;while(cer.workers.length<1&&w6<150){Sim.step(0.2);w6+=0.2;}
ok(cer.workers.includes(lettered.id)&&cer.workers.length===1,'il posto va a una persona istruita');
ok(Sim.surgeonOpen(cer),'ora il cerusico cura');
// due feriti: uno vicino al cerusico, uno fuori raggio
const hs6=houses();
const dist=(a,b)=>Math.hypot(a.cell%Sim.N-b.cell%Sim.N,(a.cell/Sim.N|0)-(b.cell/Sim.N|0));
const nearH=hs6.filter(h=>dist(h,cer)<=Sim.HEAL_R&&h.members.length),farH=hs6.filter(h=>dist(h,cer)>Sim.HEAL_R+3&&h.members.length);
const vn=Sim.villagers().find(v=>v.id===nearH[0].members[0]);
vn.hp=30;
const hn0=Sim.hpOf(vn);run(60);
const gainCer=Sim.hpOf(vn)-hn0;
ok(gainCer>=0.35*60*0.9,'vicino al cerusico guarisce in fretta (+'+gainCer.toFixed(1)+' in 60 s)');
ok(gainCer>5*Math.max(gainHome,0.5),'molto più in fretta che a casa');
ok((cer.healed||0)>0,'la bottega conta i punti curati ('+Math.round(cer.healed)+')');
if(farH.length){const vf=Sim.villagers().find(v=>v.id===farH[0].members[0]);vf.hp=30;run(60);ok(Sim.hpOf(vf)-30<8,'fuori dal raggio guarisce solo a casa (+'+(Sim.hpOf(vf)-30).toFixed(1)+')');}
else console.log('   (nessuna casa fuori dal raggio nel borgo di prova: controllo saltato)');
// il progetto del Re: richiede la scuola
ok(Sim.PROJ.some(p=>p.id==='surgeon'&&(p.req||[]).includes('school')),'il progetto del cerusico richiede la scuola');
ok(Sim.TRADENAME.surgeon==='cerusico','mestiere: cerusico');

console.log('7) chi è troppo ferito non va in battaglia; salvataggio con feriti e lupi');
town(49);
const bar7=built('barracks',72,93);let w7=0;while(bar7.workers.length<2&&w7<150){Sim.step(0.2);w7+=0.2;}
const hurt7=bar7.workers.map(id=>Sim.villagers().find(x=>x.id===id));
S.wolf.next=1;{let t=0;while(!wolves().length&&t<Sim.DAY*3){for(const v of hurt7)v.hp=20;Sim.step(0.2);t+=0.2;}}run(3);
ok(mil('mine').filter(g=>g.kind==='warrior'||g.kind==='armed').length===0,'i guerrieri feriti gravi (20%) restano a casa');
const sv=Sim.villagers().find(v=>!v.child);sv.hp=55;
const json=JSON.stringify(Sim.exportState());const nw=wolves().length;
Sim.init(1,'river');Sim.importState(JSON.parse(json));
ok(wolves().length===nw,'il salvataggio riporta il branco ('+wolves().length+')');
ok(Sim.hpOf(Sim.villagers().find(v=>v.id===sv.id))===55,'e le ferite');
ok(S.wolf&&S.wolf.bands&&typeof S.wolf.eaten==='number','stato dei lupi nel salvataggio');
const old=JSON.parse(json);delete old.S.wolf;Sim.importState(old);
ok(S.wolf&&S.wolf.next>=0&&S.wolf.bands,'un salvataggio senza lupi (v64) si carica con valori di riserva');
run(30);ok(true,'la partita prosegue senza errori');

console.log(fail?`${fail} FALLITI su ${n}`:`OK: ${n} controlli`);process.exit(fail?1:0);
