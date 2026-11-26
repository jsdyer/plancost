import {fields,normalize,compare,summary,money,rank,bill} from './model.mjs';
const $=id=>document.getElementById(id);
const examples=await fetch(new URL('./examples.json',import.meta.url)).then(r=>{if(!r.ok) throw new Error('Examples unavailable'); return r.json();});
const starting=examples.find(e=>e.slug===document.body.dataset.example)??examples[0];
const key='coolcode:plancost:comparison:v1';
let current;
function input(parent, id, labelText, value, numeric=false, month=false, key='') {
  const label=document.createElement('label');label.htmlFor=id;label.textContent=labelText;
  const node=document.createElement('input');node.id=id;node.value=value;
  if(numeric){node.type='number';node.min=key==='creditMonth'?'1':'0';node.max=month?'120':key==='tax'?'100':'100000';node.step=month?'1':key==='tax'?'0.001':'0.01';node.required=true;}
  else {node.maxLength=80;}
  parent.append(label,node);
}
function drawForm(example) {
  $('months').value=example.months;
  $('offers').replaceChildren();
  example.offers.forEach((raw,i)=>{
    const o=normalize(raw), block=document.createElement('fieldset'),legend=document.createElement('legend');
    legend.textContent=i===0?'Offer A · baseline':'Offer '+String.fromCharCode(65+i)+' · alternative';block.append(legend);
    input(block,'name'+i,'Offer name',o.name);
    const advanced=document.createElement('details'),heading=document.createElement('summary');heading.textContent='Equipment, fees, credits and tax';advanced.append(heading);
    for (const [index,[key,label]] of fields.entries()) input(index<3?block:advanced,key+i,label,o[key],true,['promoMonths','creditMonth','equipmentMonths'].includes(key),key);
    block.append(advanced);
    if(i>=2){
      const remove=document.createElement('button');remove.type='button';remove.textContent='Remove this offer';
      remove.onclick=()=>{const d=values();d.offers.splice(i,1);drawForm(d);calculate('Your comparison');};block.append(remove);
    }
    $('offers').append(block);
  });
  $('add').disabled=example.offers.length>=10;
}
function values() {
  return {months:Number($('months').value),offers:Array.from($('offers').children,(_,i)=>Object.fromEntries(['name',...fields.map(x=>x[0])].map(k=>[k,$(k+i).value])))};
}
function calculate(label) {
  if(!$('form').checkValidity()){
    current=null;$('ranking').hidden=true;$('headline').textContent='Check the highlighted inputs';$('totals').textContent='';$('break').textContent='';$('bills').replaceChildren();return false;
  }
  const data=values(), ordered=rank(data.offers,data.months);
  const alternate=ordered.find(row=>row.index!==0);
  current=compare([data.offers[0],data.offers[alternate.index]],data.months);
  $('ranking').hidden=ordered.length<=2;
  $('ranked').replaceChildren(...ordered.map(row=>{
    const li=document.createElement('li');li.textContent=row.name+' · '+money(row.total)+' total, '+money(row.average)+'/month';return li;
  }));
  $('alternate-bill').textContent=current.b.name+' bill';$('alternate-total').textContent=current.b.name+' to date';
  const s=summary(current,data.months);$('headline').textContent=s.headline;$('totals').textContent=s.totals;$('break').textContent=s.crossover;$('kind').textContent=label;
  $('bills').replaceChildren(...current.a.rows.map((a,i)=>{
    const b=current.b.rows[i],tr=document.createElement('tr');
    for(const item of [a.month,money(a.charge),money(b.charge),money(a.total),money(b.total)]){const td=document.createElement('td');td.textContent=item;tr.append(td);}
    return tr;
  }));
  return true;
}
drawForm(starting);calculate('Illustrative comparison');
$('form').addEventListener('input',()=>calculate('Your comparison'));
$('form').addEventListener('submit',e=>{e.preventDefault();calculate('Your comparison');$('headline').scrollIntoView({block:'center'});});
try{$('saved').hidden=!localStorage.getItem(key);}catch{}
$('save').onclick=()=>{if(!calculate('Your comparison')) return;try{localStorage.setItem(key,JSON.stringify(values()));$('saved').hidden=false;$('status').textContent='Saved in this browser.';}catch{$('status').textContent='Browser storage unavailable.';}};
$('load').onclick=()=>{try{const d=JSON.parse(localStorage.getItem(key));rank(d.offers,d.months);drawForm(d);calculate('Saved comparison');$('status').textContent='Loaded.';}catch{$('status').textContent='Could not read the saved comparison.';}};
$('forget').onclick=()=>{try{localStorage.removeItem(key);$('saved').hidden=true;$('status').textContent='Deleted saved comparison.';}catch{$('status').textContent='Browser storage unavailable.';}};
$('add').onclick=()=>{
  if(!$('form').reportValidity())return;
  const d=values();d.offers.push({name:'Offer '+String.fromCharCode(65+d.offers.length),monthly:60});drawForm(d);calculate('Your comparison');
  $('name'+(d.offers.length-1)).focus();
};
function download(contents,type,filename) {
  const url=URL.createObjectURL(new Blob([contents],{type}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export-terms').onclick=()=>{if(calculate('Your comparison'))download(JSON.stringify({version:1,...values()},null,2),'application/json','plan-cost-comparison.json');};
$('import-terms').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>64000)throw new Error();
    const d=JSON.parse(await file.text());if(d.version!==1)throw new Error();rank(d.offers,d.months);
    drawForm(d);calculate('Imported comparison');$('status').textContent='Loaded comparison from this device.';
  }catch{$('status').textContent='Choose a valid Plan Cost comparison JSON file.';}finally{e.target.value='';}
};
$('csv').onclick=()=>{
  if(!current)return;
  const d=values(), bills=d.offers.map(o=>bill(o,d.months));
  const rows=[['month',...bills.flatMap((_,i)=>['offer_'+(i+1)+'_bill_cad','offer_'+(i+1)+'_cumulative_cad'])]];
  for(let m=0;m<d.months;m++)rows.push([m+1,...bills.flatMap(b=>[b.rows[m].charge,b.rows[m].total].map(v=>(v/100).toFixed(2)))]);
  download(rows.map(r=>r.join(',')).join('\r\n'),'text/csv','plan-cost-by-month.csv');
};
