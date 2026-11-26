import {fields,normalize,compare,summary,money} from './model.mjs';
const $=id=>document.getElementById(id);
const examples=await fetch(new URL('./examples.json',import.meta.url)).then(r=>{if(!r.ok) throw new Error('Examples unavailable'); return r.json();});
const starting=examples.find(e=>e.slug===document.body.dataset.example)??examples[0];
const key='coolcode:plancost:comparison:v1';
let current;
function input(parent, id, labelText, value, numeric=false, month=false, key='') {
  const label=document.createElement('label');label.htmlFor=id;label.textContent=labelText;
  const node=document.createElement('input');node.id=id;node.value=value;
  if(numeric){node.type='number';node.min=key==='creditMonth'?'1':'0';node.max=month?'120':key==='tax'?'100':'100000';node.step=month?'1':'0.01';node.required=true;}
  else {node.maxLength=80;}
  parent.append(label,node);
}
function drawForm(example) {
  $('months').value=example.months;
  $('offers').replaceChildren();
  example.offers.forEach((raw,i)=>{
    const o=normalize(raw), block=document.createElement('fieldset'),legend=document.createElement('legend');
    legend.textContent=i===0?'Offer A · baseline':'Offer B · alternative';block.append(legend);
    input(block,'name'+i,'Offer name',o.name);
    const advanced=document.createElement('details'),heading=document.createElement('summary');heading.textContent='Equipment, fees, credits and tax';advanced.append(heading);
    for (const [index,[key,label]] of fields.entries()) input(index<3?block:advanced,key+i,label,o[key],true,['promoMonths','creditMonth','equipmentMonths'].includes(key),key);
    block.append(advanced);$('offers').append(block);
  });
}
function values() {
  return {months:Number($('months').value),offers:[0,1].map(i=>Object.fromEntries(['name',...fields.map(x=>x[0])].map(k=>[k,$(k+i).value])))};
}
function calculate(label) {
  if(!$('form').checkValidity()){
    current=null;$('headline').textContent='Check the highlighted inputs';$('totals').textContent='';$('break').textContent='';$('bills').replaceChildren();return false;
  }
  const data=values();current=compare(data.offers,data.months);
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
$('load').onclick=()=>{try{const d=JSON.parse(localStorage.getItem(key));if(d.offers.length!==2)throw new Error();compare(d.offers,d.months);drawForm(d);calculate('Saved comparison');$('status').textContent='Loaded.';}catch{$('status').textContent='Could not read the saved comparison.';}};
$('forget').onclick=()=>{try{localStorage.removeItem(key);$('saved').hidden=true;$('status').textContent='Deleted saved comparison.';}catch{$('status').textContent='Browser storage unavailable.';}};
$('csv').onclick=()=>{
  if(!current)return;
  const rows=[['month','offer_a_bill_cad','offer_b_bill_cad','offer_a_cumulative_cad','offer_b_cumulative_cad'],...current.a.rows.map((r,i)=>[r.month,...[r.charge,current.b.rows[i].charge,r.total,current.b.rows[i].total].map(v=>(v/100).toFixed(2))])];
  const url=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\r\n')],{type:'text/csv'}));
  const link=document.createElement('a');link.href=url;link.download='plan-cost-by-month.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
