// v64: ambiente — fertilità del suolo, corrente del fiume, vento (Sim.env). Sono derivati dal seme, dall'acqua e dal tempo:
// niente di nuovo nei salvataggi. Controlla distribuzioni sensate, coerenza tra celle vicine, stagioni, determinismo e salvataggio.
const Sim=require('../src/sim.js');const {N,SC,S,env,grids:G}=Sim;
let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
const SEEDS=[7,101,2024,31337,555555,9001];
const hashCut=i=>((i*2654435761)>>>0)%3===0;

// --- fertilità
for(const mode of ['river','lake']){
  let lo=1,hi=0,wrongWater=0,badRock=0,nearSum=0,nearN=0,farSum=0,farN=0;
  for(const sd of SEEDS){
    Sim.init(sd,mode,'normale');
    let land=0,high=0;
    for(let i=0;i<N*N;i++){
      if(G.water[i]){if(env.fert[i]!==0)wrongWater++;continue;}
      if(G.rock[i]||G.ore[i]){if(env.fert[i]>12)badRock++;}
      land++;if(env.fert[i]>=env.FERT_HIGH)high++;
      // distanza dall'acqua (grezza, in tile) per il confronto riva/lontano
    }
    const share=high/land;lo=Math.min(lo,share);hi=Math.max(hi,share);
    const ws=[];for(let i=0;i<N*N;i++)if(G.water[i])ws.push(i);
    for(let i=0;i<N*N;i+=5){
      if(G.water[i]||G.rock[i]||G.ore[i])continue;
      let m=1e9;for(let k=0;k<ws.length;k+=9){const dx=(i%N)-(ws[k]%N),dy=((i/N)|0)-((ws[k]/N)|0);const d=Math.hypot(dx,dy)/SC;if(d<m)m=d;}
      if(m<6){nearSum+=env.fert[i];nearN++;}else if(m>22){farSum+=env.fert[i];farN++;}
    }
  }
  console.log(`${mode}: quota di terra ottima ${(lo*100).toFixed(0)}%-${(hi*100).toFixed(0)}%, riva ${(nearSum/nearN).toFixed(0)}, lontano ${(farSum/farN).toFixed(0)}`);
  ok(wrongWater===0,mode+': acqua = fertilità 0');
  ok(badRock===0,mode+': rocce e minerali = suolo magro');
  ok(lo>=0.08&&hi<=0.5,mode+': la terra ottima è una quota sensata del terreno (8%-50%) su ogni mappa');
  ok(nearN>50&&farN>50&&nearSum/nearN>farSum/farN+5,mode+': la terra di riva è più fertile di quella lontana');
}

// --- corrente: lago = nessuna, fiume = verso coerente e forza sensata
Sim.init(7,'lake','normale');
ok(!env.riverInfo().on&&env.riverInfo().avg===0,'lago: nessuna corrente');
{let any=0;for(let i=0;i<N*N;i++)if(env.flowS[i]>0)any++;ok(any===0,'lago: nessuna cella con corrente');}
for(const sd of SEEDS){
  Sim.init(sd,'river','normale');
  let nW=0,zero=0,bad=0,fordSum=0,fordN=0,openSum=0,openN=0,minV=9,maxV=0;
  for(let i=0;i<N*N;i++){
    if(!G.water[i]){if(env.flowS[i]!==0)bad++;continue;}
    nW++;const v=env.flowS[i],l=Math.hypot(env.flowX[i],env.flowY[i]);
    if(!(v>0))zero++;if(Math.abs(l-1)>1e-3||!Number.isFinite(v))bad++;
    minV=Math.min(minV,v);maxV=Math.max(maxV,v);
    if(G.water[i]===2){fordSum+=v;fordN++;}else{openSum+=v;openN++;}
  }
  // coerenza: celle d'acqua vicine hanno versi simili (il fiume ha un solo verso di scorrimento)
  let dot=0,dn=0;for(let i=0;i<N*N-1;i++){const j=i+1;if(G.water[i]&&G.water[j]&&(i%N)<N-1){dot+=env.flowX[i]*env.flowX[j]+env.flowY[i]*env.flowY[j];dn++;}}
  for(let i=0;i<N*N-N;i++){const j=i+N;if(G.water[i]&&G.water[j]){dot+=env.flowX[i]*env.flowX[j]+env.flowY[i]*env.flowY[j];dn++;}}
  console.log(`river seme ${sd}: ${nW} celle, forza ${minV.toFixed(2)}-${maxV.toFixed(2)}, coerenza ${(dot/dn).toFixed(2)}, guadi ${fordN?(fordSum/fordN).toFixed(2):'-'} contro ${(openSum/openN).toFixed(2)}`);
  ok(nW>0&&zero===0&&bad===0,'seme '+sd+': ogni cella d\'acqua ha una corrente valida, fuori dall\'acqua nessuna');
  ok(dot/dn>0.9,'seme '+sd+': il verso è coerente tra celle vicine');
  ok(minV>=0.05&&maxV<=1,'seme '+sd+': forza tra 0,05 e 1');
  if(fordN>0)ok(fordSum/fordN<openSum/openN,'seme '+sd+': sui guadi la corrente è più debole');
}
// stagioni: primavera piena, fine estate più magra, inverno fermo; la scheda lo dice
Sim.init(7,'river','normale');
{
  const at=(day,f)=>{S.day=day;S.f=f;S.frozen=false;return env.flowSeason();};
  const spring=at(2,0.5),summerEnd=at(10,0.5),autumn=at(15,0.5);S.frozen=true;const winter=env.flowSeason(),info=env.riverInfo();
  console.log('stagioni: primavera',spring.toFixed(2),'fine estate',summerEnd.toFixed(2),'autunno',autumn.toFixed(2),'inverno',winter);
  ok(spring>summerEnd&&spring>1,'primavera: fiume gonfio per il disgelo');
  ok(winter===0&&info.avg===0&&info.frozen,'inverno: corrente ferma, fiume ghiacciato');
  S.frozen=false;S.day=2;S.f=0.5;const ri=env.riverInfo();
  ok(ri.on&&ri.avg>0&&ri.avg<=1&&ri.ms>0&&typeof ri.label==='string','scheda del fiume: attiva, forza e metri al secondo');
}

// --- vento: determinato dal seme e dal tempo, direzione coerente con il vettore, forza 0-1
Sim.init(555,'lake','normale');
{
  const a=env.windNow();S.t=0;const a2=env.windNow();
  ok(a.vx===a2.vx&&a.vy===a2.vy&&a.sp===a2.sp,'vento: stesso seme e stesso tempo, stesso vento');
  let dirs=new Set(),minS=9,maxS=0,badV=0,badName=0,span=0;let prev=null;
  for(let d=0;d<48;d+=0.25){S.t=d*Sim.DAY-6;S.season=Math.floor(d/6)%4;const w=env.windNow();
    dirs.add(w.from);minS=Math.min(minS,w.sp);maxS=Math.max(maxS,w.sp);
    if(Math.abs(Math.hypot(w.vx,w.vy)-1)>1e-6)badV++;
    // "da dove viene" = opposto del vettore: nord (-y) se soffia verso sud (+y)
    const toNorth=-w.vy,toEast=w.vx,fromAng=(Math.atan2(-toEast,-toNorth)+2*Math.PI)%(2*Math.PI),k=Math.round(fromAng/(Math.PI/4))%8;
    if(k!==w.from||env.COMPASS8[w.from]!==w.fromName)badName++;
    if(prev){let da=Math.atan2(w.vy,w.vx)-Math.atan2(prev.vy,prev.vx);da=Math.abs(Math.atan2(Math.sin(da),Math.cos(da)));span=Math.max(span,da);}
    prev=w;}
  console.log('vento: direzioni toccate',[...dirs].join(','),'forza',minS.toFixed(2),'-',maxS.toFixed(2),'salto massimo in 6 ore',span.toFixed(2),'rad');
  ok(badV===0,'vento: vettore unitario');
  ok(badName===0,'vento: il nome "da dove viene" corrisponde al vettore');
  ok(minS>=0.03&&maxS<=1&&maxS-minS>0.25,'vento: forza tra 0,03 e 1 e variabile');
  ok(dirs.size>=2,'vento: la direzione cambia nei giorni');
  ok(span<0.8,'vento: vira piano (nessun salto brusco)');
  const w=env.windNow();let lg=0;for(let cy=2;cy<N;cy+=17)for(let cx=2;cx<N;cx+=17){const l=env.windAt(cx,cy,w);if(!(l.sp>0&&l.sp<=1)||Math.abs(Math.hypot(l.vx,l.vy)-1)>1e-6)lg++;}
  ok(lg===0,'vento locale: forza 0-1, vettore unitario');
  // i boschi frenano il vento
  Sim.init(555,'lake','normale');const w2=env.windNow();let fo=null,op=null;
  for(let cy=8;cy<N-8&&(!fo||!op);cy++)for(let cx=8;cx<N-8;cx++){let tr=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(G.tree[(cy+dy)*N+cx+dx])tr++;
    if(!fo&&tr>=14&&!G.water[cy*N+cx])fo=[cx,cy];if(!op&&tr===0&&!G.water[cy*N+cx])op=[cx,cy];}
  ok(fo&&op&&env.windAt(fo[0],fo[1],w2).sp<env.windAt(op[0],op[1],w2).sp,'vento locale: nel bosco fitto è più debole che a campo aperto');
}

// --- salvataggio: nulla di nuovo nel file, e dopo il caricamento ambiente e vento sono identici
Sim.init(2024,'river','normale');
{
  const f0=Uint8Array.from(env.fert),s0=Float32Array.from(env.flowS),x0=Float32Array.from(env.flowX),w0=env.windNow();
  S.t=1234;const w1=env.windNow();
  const data=JSON.parse(JSON.stringify(Sim.exportState()));
  ok(!('fert' in data.grids)&&!('flowS' in data.grids),'salvataggio: nessuna griglia ambientale nel file (formato invariato)');
  Sim.init(99,'lake','normale');
  ok(!Sim.env.riverInfo().on,'(prova) un\'altra partita cambia l\'ambiente');
  Sim.importState(data);
  let same=true;for(let i=0;i<N*N;i++)if(env.fert[i]!==f0[i]||env.flowS[i]!==s0[i]||env.flowX[i]!==x0[i]){same=false;break;}
  ok(same,'dopo il caricamento fertilità e corrente sono identiche');
  // cava e miniera tolgono rocce e minerali durante la partita: dopo un salvataggio il suolo non deve cambiare
  Sim.init(2024,'river','normale');const f1=Uint8Array.from(env.fert);let cut=0;
  for(let i=0;i<N*N;i++)if((G.rock[i]||G.ore[i])&&hashCut(i)){G.rock[i]=0;G.ore[i]=0;cut++;}
  const rock1=Uint8Array.from(G.rock),tree1=Uint8Array.from(G.tree),water1=Uint8Array.from(G.water);
  S.t=1234;const d2=JSON.parse(JSON.stringify(Sim.exportState()));Sim.init(31337,'river','normale');Sim.importState(d2);
  let same2=true;for(let i=0;i<N*N;i++)if(env.fert[i]!==f1[i]){same2=false;break;}
  let live=true;for(let i=0;i<N*N;i++)if(G.rock[i]!==rock1[i]||G.tree[i]!==tree1[i]||G.water[i]!==water1[i]){live=false;break;}
  ok(cut>50,'(prova) tolte '+cut+' celle di roccia e minerale');
  ok(same2,'dopo cava e caricamento la fertilità è identica (calcolata sul terreno naturale)');
  ok(live,'il caricamento non altera le griglie vive (rocce tolte, alberi, acqua)');
  const w3=env.windNow();ok(w3.vx===w1.vx&&w3.sp===w1.sp&&w3.vx!==w0.vx,'dopo il caricamento il vento è lo stesso allo stesso tempo di gioco');
}
console.log(fails?'FALLITO: '+fails+' controlli':'AMBIENTE_OK');process.exit(fails?1:0);
