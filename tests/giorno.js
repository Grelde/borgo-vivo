// v58: il giorno dura il doppio (300 s) ma la notte resta di 27 s. Si misura sulla simulazione, secondo per secondo.
const Sim=require('../src/sim.js');const {S}=Sim;
let fail=0;const ok=(c,m)=>{if(!c){console.log('FALLITO:',m);fail++;}};
ok(Sim.DAY===300,'il giorno dura 300 s (era 150), trovato '+Sim.DAY);
Sim.init(5,'lake');
const sec={night:0,work:0,meal:0,evening:0};let dusk=0,light=0,last=null,order=[];
const dt=0.1,T0=S.t;
// due giorni interi dal primo mezzogiorno: si conta quanto dura ogni fase
for(let i=0;S.t-T0<Sim.DAY*2;i++){Sim.step(dt);if(S.t-T0>=Sim.DAY){sec[S.ph]+=dt;if(S.ph!==last){order.push(S.ph);last=S.ph;}}}
const tot=sec.night+sec.work+sec.meal+sec.evening;
ok(Math.abs(tot-Sim.DAY)<1,'un giorno intero dura 300 s ('+tot.toFixed(1)+')');
ok(Math.abs(sec.night-27)<=0.6,'la notte dura 27 s come prima ('+sec.night.toFixed(1)+')');
ok(Math.abs(sec.night/tot-0.09)<0.005,'la notte è il 9% del giorno ('+(100*sec.night/tot).toFixed(1)+'%)');
ok(Math.abs(sec.meal-40)<=1,'il pranzo dura circa 40 s ('+sec.meal.toFixed(1)+')');
ok(Math.abs(sec.evening-40)<=1,'la sera dura circa 40 s ('+sec.evening.toFixed(1)+')');
ok(sec.work>191&&sec.work<195,'il lavoro dura circa 193 s, alba compresa ('+sec.work.toFixed(1)+')');
// l'ordine delle fasi in un giorno è sempre notte → lavoro → pranzo → lavoro → sera → notte
const seq=order.join('>');ok(/^(night>)?work>meal>work>evening>night(>work)?$/.test(seq),'ordine delle fasi: '+seq);
// il tramonto (case e lavori) arriva a 215 s e dura fino all'inizio della sera
ok(Math.abs(Sim.TL.dusk*Sim.DAY-215)<1,'il tramonto comincia a circa 215 s');
// le stagioni durano sempre 6 giorni: ora sono 1800 s
ok(Sim.YEARL===6*4*300,'un anno dura 24 giorni da 300 s ('+Sim.YEARL+')');
console.log('fasi (s):',JSON.stringify(Object.fromEntries(Object.entries(sec).map(([k,v])=>[k,+v.toFixed(1)]))),'ordine',seq);
console.log(fail?'GIORNO: '+fail+' FALLIMENTI':'GIORNO OK');process.exit(fail?1:0);
