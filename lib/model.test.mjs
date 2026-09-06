import assert from 'node:assert/strict';
import {initialState,transition,laboEvents,duration,addDays,materialCatalog,normalizeState} from './model.ts';
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
assert.equal(s.checklists.filter(c=>c.event===ev.id).length,materialCatalog.length);
assert.ok(s.roadbooks.some(r=>r.event===ev.id));
const item=s.checklists.find(c=>c.event===ev.id);
s=transition(s,{type:'checklistItem',id:item.id,patch:{needed:true,qtyNeeded:'12',prepared:true,loaded:true}});
const updated=s.checklists.find(c=>c.id===item.id);
assert.equal(updated.needed,true);
assert.equal(updated.qtyNeeded,'12');
assert.equal(updated.loaded,true);
assert.throws(()=>transition(s,{type:'checklistItem',id:'inconnu',patch:{needed:true}}),/introuvable/);
s=transition(s,{type:'roadbook',event:ev.id,clients:'Sophie & Stephane',planner:'Florence',staff:{chef:'Lucie',second:'Lou'},comments:{camion:'ok'},food:{cocktail:'punch'},timeline:[{label:'Mairie',time:'11:00',note:''},{label:'',time:'',note:''}]});
const rb=s.roadbooks.find(r=>r.event===ev.id);
assert.equal(rb.clients,'Sophie & Stephane');
assert.equal(rb.staff.chef,'Lucie');
assert.equal(rb.comments.camion,'ok');
assert.equal(rb.food.cocktail,'punch');
assert.equal(rb.timeline.length,2);
assert.throws(()=>transition(s,{type:'roadbook',event:'inconnu',clients:'',planner:''}),/introuvable/);
s=transition(s,{type:'produced',id:'p1',person:'Lou Martin'});
assert.equal(s.production.find(p=>p.id==='p1').done,true);
assert.equal(s.production.find(p=>p.id==='p1').doneBy,'Lou Martin');
s=transition(s,{type:'produced',id:'p1',person:'Lou Martin'});
assert.equal(s.production.find(p=>p.id==='p1').done,false);
assert.equal(s.production.find(p=>p.id==='p1').doneBy,null);
assert.throws(()=>transition(s,{type:'produced',id:'p1',person:'Inconnu'}),/invalide/);
// migration : état persisté avant l'ajout checklist/roadbook (données réelles anciennes)
const legacy={approval:false,events:[{id:'e1',name:'Ancienne presta',date:'2026-09-10',place:'X',guests:10}],missions:[],workshops:[],availability:[],clocks:[],trips:[],production:[{id:'p1',event:'e1',recipe:'r1',quantity:1,done:true}]};
const migrated=normalizeState(JSON.parse(JSON.stringify(legacy)));
assert.equal(Array.isArray(migrated.checklists),true);
assert.equal(Array.isArray(migrated.roadbooks),true);
assert.equal(migrated.checklists.filter(c=>c.event==='e1').length,materialCatalog.length);
assert.equal(migrated.roadbooks.some(r=>r.event==='e1'),true);
assert.equal(migrated.production[0].doneBy,null);
const migratedTwice=normalizeState(JSON.parse(JSON.stringify(migrated)));
assert.equal(migratedTwice.checklists.filter(c=>c.event==='e1').length,materialCatalog.length);
console.log('39 vérifications métier réussies : bornes labo, conflits, nuit, inscriptions, validation, dates, checklist camion, roadbook, attribution des préparations et migration des anciennes données.');
