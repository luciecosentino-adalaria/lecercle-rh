import assert from 'node:assert/strict';
import {initialState,transition,laboEvents,duration,addDays} from './model.ts';
let s=initialState();
assert.equal(addDays('2026-09-01',-5),'2026-08-27');
assert.equal(laboEvents(s,'2026-09-05').length,1);
assert.equal(laboEvents(s,'2026-09-13').length,1);
assert.equal(duration(s.missions.find(m=>m.id==='m3')),480);
assert.throws(()=>transition(s,{type:'workshop',name:'Test',date:'2026-09-13',start:'09:00',end:'12:00'}),/réservé/);
assert.throws(()=>transition(s,{type:'event',name:'Test',place:'Test',date:'2026-09-24',guests:30,staffing:[]}),/Conflit labo/);
s=transition(s,{type:'event',name:'Anniversaire',place:'Villa Test',date:'2026-10-01',guests:20,staffing:[
  {role:'Service',date:'2026-10-01',start:'18:00',end:'23:00',capacity:2},
  {role:'Chef leader',date:'2026-10-01',start:'18:00',end:'23:00',capacity:1},
  {role:'Second',date:'2026-09-30',start:'09:00',end:'17:00',capacity:1},
  {role:'Maître d’hôtel',date:'2026-10-01',start:'18:00',end:'23:00',capacity:1},
  {role:'Logistique',date:'2026-09-29',start:'09:00',end:'17:00',capacity:1},
  {role:'Plonge',date:'2026-10-01',start:'18:00',end:'23:00',capacity:1},
]});
const ev=s.events.at(-1);
const staffMissions=s.missions.filter(m=>m.event===ev.id);
assert.equal(staffMissions.length,6);
assert.equal(staffMissions.find(m=>m.role==='Service').capacity,2);
assert.equal(staffMissions.find(m=>m.role==='Chef leader').capacity,1);
assert.equal(staffMissions.find(m=>m.role==='Maître d’hôtel').capacity,1);
assert.equal(staffMissions.find(m=>m.role==='Second').date,'2026-09-30');
assert.equal(staffMissions.find(m=>m.role==='Logistique').date,'2026-09-29');
assert.equal(staffMissions.find(m=>m.role==='Plonge').capacity,1);
assert.throws(()=>transition(s,{type:'event',name:'X',place:'Y',date:'2026-10-05',guests:10,staffing:[{role:'Service',date:'2026-10-05',start:'18:00',end:'23:00',capacity:-1}]}),/invalide/);
s=transition(s,{type:'join',mission:'m4',person:'Lou Martin'});
assert.equal(s.missions.find(m=>m.id==='m4').people.at(-1).status,'confirmed');
s=transition(s,{type:'approval',value:true});
assert.equal(s.missions.find(m=>m.id==='m4').people.at(-1).status,'confirmed');
s=transition(s,{type:'join',mission:'m6',person:'Lou Martin'});
assert.equal(s.missions.find(m=>m.id==='m6').people.at(-1).status,'pending');
s=transition(s,{type:'confirm',mission:'m6',person:'Lou Martin'});
assert.equal(s.missions.find(m=>m.id==='m6').people.at(-1).status,'confirmed');
assert.throws(()=>transition(s,{type:'join',mission:'m6',person:'Alex Bernard'}),/complet/);
assert.throws(()=>transition(s,{type:'event',name:'Test',place:'Test',date:'2026-02-30',guests:3}),/Renseignez/);
console.log('20 vérifications métier réussies : bornes labo, conflits, nuit, inscriptions, validation et dates.');
