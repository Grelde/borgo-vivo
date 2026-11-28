// v85: l'elenco delle merci di Magazzino e Granaio è a gruppi che si comprimono ed espandono. Prova in un vero DOM (Chromium headless):
// si estrae dal sorgente il blocco del pannello e lo si fa girare con una Sim finta.
const fs=require('fs');const {chromium}=require('playwright');
const src=fs.readFileSync(__dirname+'/../src/render.js','utf8');
const a=src.indexOf('// v85: l\'elenco delle merci'),b=src.indexOf('$(\'selCem\').addEventListener',a);
if(a<0||b<0){console.log('ERRORE blocco non trovato');process.exit(1);}
const block=src.slice(a,b);
(async()=>{
  const br=await chromium.launch(),pg=await br.newPage();let fails=0;const ok=(c,m)=>{console.log((c?'  ok ':'  ERRORE ')+m);if(!c)fails++;};
  const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
  await pg.setContent('<div id="selStore" hidden></div>');
  const keys=['wood','stone','planks','clay','iron','bars','tools','cloth','hides','grain','bread','fish','meat','game','cured','wine','zzz'];
  const r=await pg.evaluate(({block,keys})=>{
    const $=id=>document.getElementById(id);let sel=1,refreshed=0;const refreshSel=()=>{refreshed++;};
    const Sim={storeInfo:()=>({tot:50,total:1000,pol:keys.map((k,i)=>({k,on:true,max:1000,held:i}))}),S:{extra:{}},setPolicy(){},buildings:()=>new Map()};
    const out={};
    const STKNAME={};for(const k of keys)STKNAME[k]=k.toUpperCase();
    window.__upd=new Function('$','Sim','refreshSel','sel','STKNAME','document',block+';return updStoreCfg;')($,Sim,refreshSel,sel,STKNAME,document);
    window.__upd({id:7});
    const box=$('selStore');
    out.groups=[...box.querySelectorAll('.sg')].map(g=>g.dataset.g+':'+g.querySelectorAll('.sr').length);
    out.counts=[...box.querySelectorAll('.sgn')].map(e=>e.textContent);
    out.hidden0=[...box.querySelectorAll('.sgb')].map(e=>e.hidden);
    const h=box.querySelector('[data-gh="Cibo"]');h.click();
    out.hiddenAfter=[...box.querySelectorAll('.sgb')].map(e=>e.hidden);out.car=h.querySelector('.car').textContent;out.aria=h.getAttribute('aria-expanded');
    window.__upd({id:8});   // altra selezione: lo stato resta
    out.hiddenKept=[...box.querySelectorAll('.sgb')].map(e=>e.hidden);
    box.querySelector('[data-gh="Cibo"]').click();
    out.hiddenBack=[...box.querySelectorAll('.sgb')].map(e=>e.hidden);
    out.rows=box.querySelectorAll('.sr').length;
    return out;
  },{block,keys});
  console.log(JSON.stringify(r));
  ok(r.groups.join()==='Materiali da costruzione:4,Metalli e armi:3,Tessuti, pelli e corde:2,Cibo:7,Altro:1'.replace('Tessuti, pelli e corde','Tessuti, pelli e corde'),'le merci sono divise nei gruppi giusti (e "Altro" per le sconosciute)');
  ok(r.hidden0.every(x=>!x),'all\'inizio tutti i gruppi sono aperti');
  ok(r.hiddenAfter[3]===true&&r.hiddenAfter.filter(x=>x).length===1&&r.car==='▸'&&r.aria==='false','un clic comprime solo quel gruppo');
  ok(r.hiddenKept[3]===true,'cambiando selezione il gruppo resta compresso');
  ok(r.hiddenBack.every(x=>!x),'un altro clic lo riespande');
  ok(r.rows===keys.length,'tutte le merci restano nell\'elenco (nessuna persa)');
  ok(errs.length===0,'nessun errore nella pagina '+errs.join(';'));
  await br.close();console.log(fails?'FALLITO: '+fails:'MAGAZZINO_GRUPPI_OK');process.exit(fails?1:0);
})();
