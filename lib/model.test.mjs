import assert from 'node:assert/strict';
import {initialState,transition,laboEvents,duration,addDays,materialCatalog,normalizeState,distanceMeters,refGeo} from './model.ts';
let s=initialState();
assert.equal(addDays('2026-09-01',-5),'2026-08-27');
assert.equal(laboEvents(s,'2026-09-05').length,0);
assert.equal(laboEvents(s,'2026-09-06').length,1);
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
assert.equal(migrated.hourlyRate,18);
assert.equal(migrated.expenses.length,0);
assert.equal(migrated.events[0].budget,0);

// analyse / rentabilité : budget de prestation
s=transition(s,{type:'event',name:'Test budget',place:'Test',date:'2026-10-15',guests:10,budget:1500,staffing:[]});
assert.equal(s.events.find(e=>e.name==='Test budget').budget,1500);
s=transition(s,{type:'event',name:'Test sans budget',place:'Test',date:'2026-10-22',guests:10,staffing:[]});
assert.equal(s.events.find(e=>e.name==='Test sans budget').budget,0);

// taux horaire
s=transition(s,{type:'hourlyRate',value:22});
assert.equal(s.hourlyRate,22);
assert.throws(()=>transition(s,{type:'hourlyRate',value:-1}),/invalide/);
assert.throws(()=>transition(s,{type:'hourlyRate',value:'vingt'}),/invalide/);

// module frais : création, correction, remboursement groupé
const before=s.expenses.length;
s=transition(s,{type:'expense',person:'Lou Martin',label:'Péage',amount:12.4,date:'2026-09-10',event:'e1',photo:''});
assert.equal(s.expenses.length,before+1);
const x=s.expenses[s.expenses.length-1];
assert.equal(x.reimbursed,false);
assert.equal(x.amount,12.4);
assert.throws(()=>transition(s,{type:'expense',person:'Inconnu',label:'Péage',amount:12,date:'2026-09-10',event:'',photo:''}),/invalide/);
assert.throws(()=>transition(s,{type:'expense',person:'Lou Martin',label:'',amount:12,date:'2026-09-10',event:'',photo:''}),/invalide/);
assert.throws(()=>transition(s,{type:'expense',person:'Lou Martin',label:'Test',amount:-5,date:'2026-09-10',event:'',photo:''}),/invalide/);
assert.throws(()=>transition(s,{type:'expense',person:'Lou Martin',label:'Test',amount:12,date:'2026-09-10',event:'',photo:'x'.repeat(900000)}),/lourde/);
s=transition(s,{type:'expenseReimbursed',id:x.id,value:true});
assert.equal(s.expenses.find(e=>e.id===x.id).reimbursed,true);
s=transition(s,{type:'expenseReimbursed',id:x.id,value:false});
assert.equal(s.expenses.find(e=>e.id===x.id).reimbursed,false);
assert.throws(()=>transition(s,{type:'expenseReimbursed',id:'inconnu',value:true}),/introuvable/);
s=transition(s,{type:'expense',person:'Lou Martin',label:'Parking',amount:5,date:'2026-09-11',event:'',photo:''});
assert.equal(s.expenses.filter(e=>e.person==='Lou Martin'&&!e.reimbursed).length,3);
s=transition(s,{type:'reimbursePerson',person:'Lou Martin'});
assert.equal(s.expenses.filter(e=>e.person==='Lou Martin'&&!e.reimbursed).length,0);
assert.throws(()=>transition(s,{type:'reimbursePerson',person:'Inconnu'}),/invalide/);


// géolocalisation du pointage : distance, normalisation, réglages
const dHyeresToulon = distanceMeters(43.1206,6.1286,43.1242,5.9280);
assert.ok(dHyeresToulon>15000 && dHyeresToulon<25000);
assert.ok(distanceMeters(43.1206,6.1286,43.1206,6.1286)<1);

const legacyGeo=normalizeState(JSON.parse(JSON.stringify({approval:false,events:[{id:'e1',name:'X',date:'2026-09-10',place:'Y',guests:5}],missions:[],workshops:[],availability:[],clocks:[{id:'c1',person:'Lou Martin',mission:'m1',start:'2026-09-09T09:00:00',end:null,pause:0,validated:false}],trips:[],production:[]})));
assert.equal(legacyGeo.geoMode,'record');
assert.equal(legacyGeo.geoRadius,150);
assert.equal(legacyGeo.laboLat,null);
assert.equal(legacyGeo.laboLng,null);
assert.equal(legacyGeo.events[0].lat,null);
assert.equal(legacyGeo.clocks[0].lat,null);
assert.equal(legacyGeo.clocks[0].endLat,null);

s=transition(s,{type:'geoSettings',geoMode:'warn',geoRadius:200,laboLat:43.1206,laboLng:6.1286});
assert.equal(s.geoMode,'warn');
assert.equal(s.geoRadius,200);
assert.equal(s.laboLat,43.1206);
assert.throws(()=>transition(s,{type:'geoSettings',geoMode:'partout',geoRadius:200,laboLat:null,laboLng:null}),/Mode/);
assert.throws(()=>transition(s,{type:'geoSettings',geoMode:'warn',geoRadius:5,laboLat:null,laboLng:null}),/Rayon/);
assert.throws(()=>transition(s,{type:'geoSettings',geoMode:'warn',geoRadius:200,laboLat:43.1,laboLng:null}),/latitude et longitude/);

const mepMission=s.missions.find(m=>m.role==='Mise en place');
assert.deepEqual(refGeo(s,mepMission),{lat:43.1206,lng:6.1286});
const serviceMission=s.missions.find(m=>m.role==='Service');
assert.equal(refGeo(s,serviceMission),null);
s=transition(s,{type:'event',name:'Avec lieu',place:'Villa géolocalisée',date:'2026-11-01',guests:10,lat:43.5,lng:6.9,staffing:[]});
const evGeo=s.events.find(e=>e.name==='Avec lieu');
assert.equal(evGeo.lat,43.5);
const serviceMissionGeo={role:'Service',event:evGeo.id};
assert.deepEqual(refGeo(s,serviceMissionGeo),{lat:43.5,lng:6.9});

// mode 'record' et 'warn' : jamais de blocage, même loin
s=transition(s,{type:'clockIn',person:'Camille Robert',mission:'m4',lat:10,lng:10});
const farClock=s.clocks.find(c=>c.person==='Camille Robert'&&!c.end);
assert.equal(farClock.lat,10);
s=transition(s,{type:'clockOut',id:farClock.id,pause:0,lat:11,lng:11});
assert.equal(s.clocks.find(c=>c.id===farClock.id).endLat,11);

// mode 'block' : sans position de référence pour le lieu -> jamais bloqué
s=transition(s,{type:'geoSettings',geoMode:'block',geoRadius:200,laboLat:43.1206,laboLng:6.1286});
s=transition(s,{type:'clockIn',person:'Camille Robert',mission:'m4',lat:10,lng:10});
assert.equal(s.clocks.find(c=>c.person==='Camille Robert'&&!c.end).lat,10);
s=transition(s,{type:'clockOut',id:s.clocks.find(c=>c.person==='Camille Robert'&&!c.end).id,pause:0});

// mode 'block' : avec position de référence (labo), loin -> refusé
assert.throws(()=>transition(s,{type:'clockIn',person:'Lou Martin',mission:'m1',lat:10,lng:10}),/semblez à/);
assert.throws(()=>transition(s,{type:'clockIn',person:'Lou Martin',mission:'m1'}),/Activez la localisation/);
s=transition(s,{type:'clockIn',person:'Lou Martin',mission:'m1',lat:43.1206,lng:6.1287});
assert.ok(s.clocks.some(c=>c.person==='Lou Martin'&&!c.end));
s=transition(s,{type:'clockOut',id:s.clocks.find(c=>c.person==='Lou Martin'&&!c.end).id,pause:0,lat:43.1206,lng:6.1287});
assert.equal(s.clocks.filter(c=>c.person==='Lou Martin'&&!c.end).length,0);

console.log('80 vérifications métier réussies : bornes labo, conflits, nuit, inscriptions, validation, dates, checklist camion, roadbook, attribution des préparations, migration des anciennes données, budget/rentabilité, remboursement des frais et géolocalisation du pointage.');
