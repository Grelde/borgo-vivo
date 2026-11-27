// v27: botteghe del giardino. Regole: fabbro e tessitore dal livello 3 (miniera / ovile), sarto e panettiere dal livello 4 (tessitore / mulino); mai nei giardini fissi o della legna; una casa già di livello alto può aprire la bottega anche dopo, quando compare la filiera.
const Sim=require('../src/sim.js');const S=Sim.S;
Sim.init(7,'lake');S.stock.wood=500;S.stock.stone=300;
Sim.paintDistrict(60,100,125,128,1);Sim.paintDistrict(100,70,130,92,3);
for(const [t,x,y] of [['plaza',90,90],['well',84,96],['church',90,108],['school',96,100]])Sim.place(t,x,y,0);
const run=d=>{for(let i=0;i<d*Sim.DAY/0.2;i++){Sim.step(0.2);if(i%10===0){S.stock.wood=Math.max(S.stock.wood,300);S.stock.stone=Math.max(S.stock.stone,200);}}};
const hs=()=>[...Sim.buildings().values()].filter(b=>b.type==='house'&&b.state==='done');
const shop=h=>h.craft||h.bake||h.weave||h.tailor;
run(25);
const hi=hs().filter(h=>h.level>=3&&!h.pure&&h.crop!=='wood');
console.log('prima della filiera: case livello>=3 normali',hi.length,'con bottega',hi.filter(shop).length);
let bad=hs().filter(shop).length;
const o=Sim.buildings();let id=9000;for(const t of['sheepfold','mine','mill'])o.set(id,{id:id++,type:t,state:'done',cell:0,workers:[],members:[]});
run(15);
const H=hs();
const w=H.filter(h=>h.weave).length,c=H.filter(h=>h.craft).length,t=H.filter(h=>h.tailor).length,b=H.filter(h=>h.bake).length;
console.log('dopo miniera/ovile/mulino: fabbri',c,'tessitori',w,'sarti',t,'panettieri',b);
let v=0;
for(const h of H){if((h.craft||h.weave)&&h.level<3)v++;if((h.tailor||h.bake)&&h.level<4)v++;if(shop(h)&&(h.pure||h.crop==='wood'))v++;}
console.log('violazioni',v);
console.log(v===0&&c+w>0&&bad===0?'SHOPS_OK':'SHOPS_FAIL');process.exit(v===0&&c+w>0&&bad===0?0:1);
