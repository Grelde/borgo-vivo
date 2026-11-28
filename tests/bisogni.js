// ritmo della giornata guidato dai bisogni: quanti abitanti dormono / mangiano / bevono / pregano / lavorano per fase del giorno
const Sim=require(process.env.SIMPATH||'../src/sim.js');
const S=Sim.S;Sim.init(7,'lake');
Sim.paintDistrict(70,70,110,100,1);Sim.paintDistrict(60,110,95,130,2);Sim.paintDistrict(100,110,120,125,3);Sim.paintDistrict(40,60,56,75,4);
S.stock.wood=400;S.stock.stone=300;
function tryP(t,x,y){for(let r=0;r<4;r++){const q=Sim.place(t,x,y,r);if(q.ok)return q.b;}return null;}
for(const [t,x,y] of [['wood',60,40],['quarry',130,60],['well',88,96],['school',100,110],['church',84,84],['plaza',96,90]]){let b=null;for(let dx=0;dx<30&&!b;dx+=3)for(let dy=0;dy<30&&!b;dy+=3)b=tryP(t,x+dx,y+dy);}
const run=s=>{for(let i=0;i<s*20;i++)Sim.step(0.05);};
run(Sim.YEARL*0.5);
const cat=v=>v.state==='sleep'?'dorme':v.state==='eat'?'mangia':(v.state==='toWell'||v.state==='draw')?'acqua':(v.state==='toChurch'||v.state==='pray')?'chiesa':(v.state==='toPlaza'||v.state==='chat')?'piazza':(v.state==='toHomeLife')?'casa':'altro';
const acc={};let n=0;const meals=[],low={};
for(let t=0;t<Sim.DAY*4;t+=3){run(3);const ph=S.ph;acc[ph]=acc[ph]||{tot:0};for(const v of Sim.villagers()){if(v.child&&v.age<3)continue;const c=cat(v);acc[ph][c]=(acc[ph][c]||0)+1;acc[ph].tot++;if(v.n)for(const k of Object.keys(v.n))if(v.n[k]<20)low[k]=(low[k]||0)+1;}n++;}
for(const ph of ['night','evening','work','meal']){const a=acc[ph];if(!a)continue;console.log(ph.padEnd(8),Object.entries(a).filter(([k])=>k!=='tot').map(([k,x])=>k+' '+Math.round(x/a.tot*100)+'%').join(' · '));}
const st=Sim.stats();console.log('pop',st.pop,'morti',st.deaths,JSON.stringify(st.deathsBy),'felicità',Math.round(st.avgJoy),'sotto 20% (campioni):',JSON.stringify(low));
const vs=Sim.villagers();const avg={};for(const k of Object.keys(vs[0].n||{}))avg[k]=Math.round(vs.reduce((a,v)=>a+v.n[k],0)/vs.length);console.log('medie indicatori',JSON.stringify(avg));
