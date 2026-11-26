export const fields = [
  ['monthly', 'Regular service per month ($)'], ['promo', 'Promotional service per month ($)'],
  ['promoMonths', 'Months at promotional price'], ['equipment', 'Equipment or device per month ($)'],
  ['equipmentMonths', 'Months charged for equipment'], ['setup', 'Setup and installation ($)'],
  ['exit', 'Cost to leave previous plan, after tax ($)'], ['credit', 'One-time bill credit, after tax ($)'],
  ['creditMonth', 'Month the credit posts'], ['endCharge', 'Final buyout at comparison end ($)'],
  ['tax', 'Tax on service, equipment and setup (%)']
];
export function normalize(input) {
  const offer = {name: String(input.name || 'Plan').trim().slice(0, 80) || 'Plan'};
  for (const [key] of fields) {
    const value = Number(input[key] ?? (key === 'creditMonth' ? 1 : 0));
    const isMonths = ['promoMonths','equipmentMonths','creditMonth'].includes(key);
    const maximum = isMonths ? 120 : (key === 'tax' ? 100 : 100000);
    if (!Number.isFinite(value) || value < (key === 'creditMonth' ? 1 : 0) || value > maximum || (isMonths && !Number.isInteger(value))) throw new Error('Enter valid prices and whole months (up to 120).');
    offer[key] = value;
  }
  return offer;
}
const cents = value => Math.round(value * 100 + Number.EPSILON);
export function bill(input, months) {
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new Error('Choose a comparison period from 1 to 120 months.');
  const o = normalize(input);
  let total = 0;
  const rows = Array.from({length: months}, (_, i) => {
    const month = i + 1;
    const service = cents(month <= o.promoMonths ? o.promo : o.monthly);
    const equipment = month <= o.equipmentMonths ? cents(o.equipment) : 0;
    const taxable = service + equipment + (month === 1 ? cents(o.setup) : 0) + (month === months ? cents(o.endCharge) : 0);
    const tax = Math.round(taxable * o.tax / 100);
    const charge = taxable + tax + (month === 1 ? cents(o.exit) : 0) - (month === o.creditMonth ? cents(o.credit) : 0);
    total += charge;
    return {month, charge, total};
  });
  return {name:o.name,total,rows,average:total/months};
}
export function compare(inputs, months) {
  const [a,b] = inputs.map(offer=>bill(offer, months));
  const difference = a.total - b.total;
  let sustained = null;
  if (difference > 0) {
    for (let i = months - 1; i >= 0 && b.rows[i].total < a.rows[i].total; i--) sustained = i+1;
  }
  const firstSaving = b.rows.findIndex((row,i) => row.total < a.rows[i].total);
  return {a,b,difference,sustained,firstSaving:firstSaving < 0 ? null : firstSaving+1};
}
export const money = cents => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
export function summary(result, months) {
  const {a,b,difference,sustained,firstSaving} = result;
  const winner = difference > 0 ? b : a;
  const headline = difference === 0 ? 'Both offers cost the same' : winner.name+' saves '+money(Math.abs(difference));
  const totals = a.name+' costs '+money(a.total)+' ('+money(a.average)+'/month). '+b.name+' costs '+money(b.total)+' ('+money(b.average)+'/month) over '+months+' months.';
  const crossover = sustained ? b.name+' stays ahead from month '+sustained+' through month '+months+'.' :
    (firstSaving ? b.name+' first costs less cumulatively in month '+firstSaving+', but does not finish ahead.' : b.name+' does not cost less cumulatively during this comparison.');
  return {headline,totals,crossover};
}

export function rank(offers, months) {
  if (!Array.isArray(offers) || offers.length < 2 || offers.length > 10) throw new Error('Compare between two and ten offers.');
  return offers.map((offer,index)=>({index,...bill(offer,months)})).sort((a,b)=>a.total-b.total || a.index-b.index);
}
