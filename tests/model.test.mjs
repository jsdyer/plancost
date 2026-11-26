import test from 'node:test';import assert from 'node:assert/strict';import {bill,compare,rank} from '../web/model.mjs';
test('promotion, equipment, post-tax credits and rounded bills',()=>{
 const r=bill({monthly:75,promo:40,promoMonths:1,equipment:10,equipmentMonths:1,setup:5,exit:7,credit:10,creditMonth:2,endCharge:12,tax:13},2);
 assert.deepEqual(r.rows.map(x=>x.charge),[6915,8831]);assert.equal(r.total,15746);
});
test('one-off discount may lose its lead; sustained break-even is disclosed',()=>{
 let r=compare([{monthly:70},{monthly:85,credit:30}],3);assert.equal(r.firstSaving,1);assert.equal(r.sustained,null);
 r=compare([{monthly:70},{monthly:60,setup:25}],6);assert.equal(r.sustained,3);
});
test('zero-price promotions, skipped future credits and term validation',()=>{
 assert.equal(bill({monthly:10,promo:0,promoMonths:1,credit:99,creditMonth:3},2).total,1000);
 assert.throws(()=>bill({monthly:-1},12));assert.throws(()=>bill({},0));
});

test('ranks three offers using identical horizons and accepts saved numeric strings',()=>{
 const ordered=rank([{monthly:'91'},{monthly:65},{monthly:85,credit:50}],2);
 assert.deepEqual(ordered.map(r=>r.index),[2,1,0]);assert.throws(()=>rank([{monthly:1}],2));
});

test('half-cent tax rounds up and three-place percentages retain precision',()=>{
 assert.equal(bill({monthly:15,tax:5.1},1).total,1577);
 assert.equal(bill({monthly:100,tax:14.975},1).total,11498);
 assert.throws(()=>bill({monthly:1.234},1));
});
