// v77: la mappa grande (128×128 tile) regge una partita vera: quartiere, pozzo, crescita, arrivi dal bordo. Rilancia anche i test di mappe e falde a dimensione piena.
process.env.BV_MT='128';
const {spawnSync}=require('child_process');
const Sim=require('../src/sim.js');const {S,CEN,N}=Sim;
let fail=0,n=0;const ok=(c,m)=>{n++;if(!c){fail++;console.log('FALLITO:',m);}};
Sim.init(31,'river',undefined,{aquifers:false});
ok(Sim.MT===128&&N===384,'mappa grande');
const cs=Sim.buildings();let center=null;for(const b of cs.values())if(b.type==='store'&&b.state==='done')center=b;
ok(!!center&&Math.abs(center.x-(Sim.CT-1)*Sim.SC)<=1,'il Centro Cittadino sta al centro della mappa');
Sim.paintDistrict(CEN-36,CEN-18,CEN+12,CEN+12,1);
for(const [t,dx,dy] of [['well',-12,0],['plaza',0,-8]])for(let d=0;d<30;d++){let done=false;for(let dy2=-d;dy2<=d&&!done;dy2+=3)for(let dx2=-d;dx2<=d&&!done;dx2+=3){const r=Sim.place(t,CEN+dx+dx2,CEN+dy+dy2,0);if(r.ok)done=true;}if(done)break;}
S.stock.wood=400;S.stock.stone=200;
for(let i=0;i<1500*2/0.2*0.5;i++)Sim.step(0.2);
const pop0=Sim.villagers().length;ok(pop0>=3,'gli abitanti lavorano sulla mappa grande ('+pop0+')');
ok(Sim.stats().houses>=2||Sim.stats().sites>=1,'nascono le case dal quartiere ('+Sim.stats().houses+')');
for(let i=0;i<3000;i++)Sim.step(0.2);
ok(Sim.villagers().length>=pop0,'la simulazione continua senza errori per altri 10 giorni ('+Sim.villagers().length+' abitanti)');
// test di dimensione piena
for(const t of ['mappe','falde']){const r=spawnSync(process.execPath,['tests/'+t+'.js'],{env:{...process.env,BV_MT:'128'},encoding:'utf8',cwd:require('path').join(__dirname,'..')});ok(r.status===0,t+' a 128 tile: '+(r.stdout||'').trim().split('\n').pop());}
console.log(fail?'GRANDE: '+fail+' FALLIMENTI su '+n:'GRANDE OK ('+n+' controlli)');process.exit(fail?1:0);
