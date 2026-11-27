const Sim=require('../src/sim.js');
const S=Sim.S;Sim.init(7,'lake');
const N=Sim.N;
Sim.paintDistrict(70,70,110,100,1);Sim.paintDistrict(60,110,95,130,2);Sim.paintDistrict(100,110,120,125,3);Sim.paintDistrict(40,60,56,75,4);
let T=0;function tryP(t,x,y){for(let r=0;r<4;r++){const q=Sim.place(t,x,y,r);if(q.ok)return q.b;}return null;}
function run(sec){for(let i=0;i<sec*20;i++){Sim.step(0.05);}}
S.stock.wood=400;S.stock.stone=300;
let msgs=[];Sim.hooks.toast=m=>msgs.push(Math.round(S.t)+' '+m.slice(0,70));
const pl=[['wood',60,40],['quarry',130,60],['well',88,96],['school',100,110],['infirmary',74,110],['church',84,84]];
for(const [t,x,y] of pl){let b=null;for(let dx=0;dx<30&&!b;dx+=3)for(let dy=0;dy<30&&!b;dy+=3)b=tryP(t,x+dx,y+dy);console.log(t,!!b);}
const t0=Date.now();
for(let a=1;a<=4;a++){run(2400);const st=Sim.stats();console.log('annata',a,'pop',st.pop,'kids',st.children,'houses',st.houses,'sick',st.sick,'dead',st.deaths,JSON.stringify(st.deathsBy),'inh',st.inherits,'cured',st.cured,'moves',st.moves,'well',st.avgWell.toFixed(0),'fire',st.fire+'/'+st.fireNeed,'plague',st.plague,'school',st.schooled);
 if(a===1){for(const k of ['birthBonus','schoolMandatory','woodDuty'])Sim.setEdict(k,true);}
 if(a===2){Sim.setEdict('quarantine',true);}if(a===3)Sim.setEdict('quarantine',false);}
console.log('ms',Date.now()-t0);
// force plague
Sim._t.startPlague('x');run(600);const s2=Sim.stats();console.log('after plague','pop',s2.pop,'sick',s2.sick,'dead',s2.deaths,s2.plague);
// reg check
let n=0,logs=0;for(const [id,r] of Sim.reg){n++;logs+=r.log.length;}console.log('reg',n,logs);
const v=Sim.villagers()[0];const r=Sim.reg.get(v.id);console.log(r.name,r.fam,r.log.slice(-3).map(e=>e.txt),Sim.dateStr(S.t));
console.log(msgs.slice(0,40).join('\n'));
