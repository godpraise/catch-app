import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,collection,getDoc,getDocs,setDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
import {ref,uploadBytes,getBytes,deleteObject} from 'firebase/storage';
import * as firestoreApi from 'firebase/firestore';
import * as storageApi from 'firebase/storage';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8787'||process.env.FIREBASE_STORAGE_EMULATOR_HOST!=='127.0.0.1:9199')throw Error('Only the configured local emulators may be used');
let env;
const code='ABC234',bucket='demo-catch-role-validation.appspot.com';
const context=u=>u?env.authenticatedContext(u):env.unauthenticatedContext();
const db=u=>context(u).firestore();
const room=(d,c=code)=>doc(d,'rooms',c);
const player=(d,u,c=code)=>doc(d,'rooms',c,'players',u);
const initial=(extra={})=>({nickname:'tester',profileImage:null,role:null,status:'alive',caughtAt:null,caughtBy:null,caughtPhotoUrl:null,missionType:null,missionStatus:null,missionAssignedAt:null,missionPhotoUrl:null,joinedAt:serverTimestamp(),roundId:0,...extra});
async function fixture(status='playing'){
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore(),roundId=status==='waiting'?0:2;
  await setDoc(room(d),{hostId:'host',status,maxPlayers:8,hideTimeSec:0,timeLimitSec:600,createdAt:Timestamp.now(),startedAt:Timestamp.fromMillis(Date.now()-60000),taggerId:status==='waiting'?null:'tagger',roundId});
  for(const u of ['host','tagger','runner'])await setDoc(player(d,u),initial({roundId,role:status==='waiting'?null:u==='tagger'?'tagger':'runner'}));
 });
}
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-catch-role-validation',firestore:{host:'127.0.0.1',port:8787,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')},storage:{host:'127.0.0.1',port:9199,rules:await readFile(new URL('../storage.rules',import.meta.url),'utf8')}});});
beforeEach(async()=>{await env.clearFirestore();await env.clearStorage();await fixture();});
after(async()=>{await env?.cleanup();});
test('unauthenticated and outside users cannot read active room players',async()=>{
 for(const u of [null,'intruder']){const d=db(u);await assertFails(getDoc(room(d)));await assertFails(getDocs(collection(d,'rooms',code,'players')));}
 await assertSucceeds(getDocs(collection(db('runner'),'rooms',code,'players')));
});
test('waiting invite lookup works without allowing room enumeration',async()=>{
 await fixture('waiting');const d=db('new');await assertSucceeds(getDoc(room(d)));await assertFails(getDocs(collection(d,'rooms')));
});
test('room and host membership can be atomically created only for the authenticated host',async()=>{
 const d=db('new'),c='DEF567',b=writeBatch(d);b.set(room(d,c),{hostId:'new',status:'waiting',maxPlayers:8,hideTimeSec:30,timeLimitSec:600,createdAt:serverTimestamp(),startedAt:null,taggerId:null,roundId:0});b.set(player(d,'new',c),initial());await assertSucceeds(b.commit());
 await assertFails(setDoc(room(db('intruder'),'GHJ789'),{hostId:'new',status:'waiting',maxPlayers:8,hideTimeSec:30,timeLimitSec:600,createdAt:serverTimestamp(),startedAt:null,taggerId:null,roundId:0}));
});
test('joining creates only the caller in a waiting room with no self-assigned role',async()=>{
 await fixture('waiting');const d=db('new');await assertSucceeds(setDoc(player(d,'new'),initial()));
 await assertFails(setDoc(player(db('other'),'victim'),initial()));await assertFails(setDoc(player(db('cheater'),'cheater'),initial({role:'tagger'})));
});
test('late joins and overwriting a current player are denied',async()=>{
 await assertFails(setDoc(player(db('new'),'new'),initial()));await assertFails(setDoc(player(db('runner'),'runner'),initial()));
});
test('non-host start, role escalation, and host-id takeover are denied',async()=>{
 const d=db('runner');await assertFails(updateDoc(room(d),{hostId:'runner'}));await assertFails(updateDoc(player(d,'runner'),{role:'tagger'}));await assertFails(updateDoc(room(d),{status:'hiding',startedAt:serverTimestamp(),taggerId:'runner',roundId:3}));
});
test('host role resets and the new room round succeed as one batch',async()=>{
 await fixture('waiting');const d=db('host'),b=writeBatch(d);
 for(const u of ['host','tagger','runner'])b.update(player(d,u),{role:u==='tagger'?'tagger':'runner',roundId:1,status:'alive',caughtAt:null,caughtBy:null,caughtPhotoUrl:null,missionType:null,missionStatus:null,missionAssignedAt:null,missionPhotoUrl:null});
 b.update(room(d),{status:'hiding',startedAt:serverTimestamp(),taggerId:'tagger',roundId:1});await assertSucceeds(b.commit());
 await assertSucceeds(updateDoc(room(d),{status:'playing'}));
});
test('host cannot change roles in a live round or start without matching tagger reset',async()=>{
 await assertFails(updateDoc(player(db('host'),'runner'),{role:'tagger'}));await fixture('waiting');await assertFails(updateDoc(room(db('host')),{status:'hiding',startedAt:serverTimestamp(),taggerId:'tagger',roundId:1}));
});
test('only the current tagger may catch a living runner',async()=>{
 const caught=u=>({status:'caught',caughtAt:serverTimestamp(),caughtBy:u,caughtPhotoUrl:'https://example.test/photo.jpg'});
 await assertFails(updateDoc(player(db('runner'),'host'),caught('runner')));await assertFails(updateDoc(player(db('intruder'),'runner'),caught('intruder')));
 await assertFails(updateDoc(player(db('tagger'),'tagger'),caught('tagger')));await assertSucceeds(updateDoc(player(db('tagger'),'runner'),caught('tagger')));
 await assertFails(updateDoc(player(db('tagger'),'runner'),caught('tagger')));
});
test('forged catch attribution and simultaneous unrelated mutations are denied',async()=>{
 const d=db('tagger');await assertFails(updateDoc(player(d,'runner'),{status:'caught',caughtAt:serverTimestamp(),caughtBy:'host',caughtPhotoUrl:'x'}));
 await assertFails(updateDoc(player(d,'runner'),{status:'caught',caughtAt:serverTimestamp(),caughtBy:'tagger',caughtPhotoUrl:'x',role:'tagger'}));
});
test('location updates are limited to the caller and valid coordinates',async()=>{
 const d=db('runner');await assertSucceeds(updateDoc(player(d,'runner'),{location:{lat:37,lng:127,updatedAt:Date.now()}}));await assertFails(updateDoc(player(d,'host'),{location:{lat:37,lng:127,updatedAt:Date.now()}}));await assertFails(updateDoc(player(d,'runner'),{location:{lat:999,lng:127,updatedAt:Date.now()}}));
});
test('a runner may assign and complete only their own allowed mission',async()=>{
 const d=db('runner');const m={missionType:'sky',missionStatus:'pending',missionAssignedAt:serverTimestamp(),missionPhotoUrl:null};
 await assertFails(updateDoc(player(d,'host'),m));await assertFails(updateDoc(player(d,'runner'),{...m,missionType:'invented'}));await assertSucceeds(updateDoc(player(d,'runner'),m));
 await assertSucceeds(updateDoc(player(d,'runner'),{missionStatus:'completed',missionPhotoUrl:'https://example.test/mission.jpg'}));
});
test('only host or tagger can end the game and running players cannot erase themselves',async()=>{
 await assertFails(updateDoc(room(db('runner')),{status:'ended'}));await assertFails(deleteDoc(player(db('runner'),'runner')));
 await assertSucceeds(updateDoc(room(db('tagger')),{status:'ended'}));await assertSucceeds(deleteDoc(player(db('runner'),'runner')));
});
test('stale-round participants cannot catch, update location, or upload photos',async()=>{
 await env.withSecurityRulesDisabled(c=>updateDoc(player(c.firestore(),'tagger'),{roundId:1}));
 await assertFails(updateDoc(player(db('tagger'),'runner'),{status:'caught',caughtAt:serverTimestamp(),caughtBy:'tagger',caughtPhotoUrl:'x'}));
 await assertFails(updateDoc(player(db('tagger'),'tagger'),{location:{lat:37,lng:127,updatedAt:Date.now()}}));
 await assertFails(uploadBytes(ref(context('tagger').storage(bucket),'rooms/ABC234/tagger/stale.jpg'),new Uint8Array([1,2]),{contentType:'image/jpeg'}));
});
test('storage permits current players JPEG uploads and member SDK reads only',async()=>{
 const path='rooms/ABC234/runner/photo.jpg';const own=ref(context('runner').storage(bucket),path);
 await assertSucceeds(uploadBytes(own,new Uint8Array([255,216,255,217]),{contentType:'image/jpeg'}));
 await assertSucceeds(getBytes(ref(context('host').storage(bucket),path)));
 await assertFails(getBytes(ref(context('intruder').storage(bucket),path)));await assertFails(getBytes(ref(context(null).storage(bucket),path)));
 await assertFails(uploadBytes(ref(context('host').storage(bucket),'rooms/ABC234/runner/forged.jpg'),new Uint8Array([1]),{contentType:'image/jpeg'}));await assertFails(deleteObject(own));
});
test('storage rejects wrong file types, oversized files, overwrites and legacy paths',async()=>{
 const s=context('runner').storage(bucket),p=ref(s,'rooms/ABC234/runner/once.jpg');
 await assertFails(uploadBytes(ref(s,'rooms/ABC234/runner/a.txt'),new Uint8Array([1]),{contentType:'text/plain'}));
 await assertFails(uploadBytes(ref(s,'rooms/ABC234/runner/large.jpg'),new Uint8Array(10*1024*1024),{contentType:'image/jpeg'}));
 await assertFails(uploadBytes(ref(s,'rooms/ABC234/legacy.jpg'),new Uint8Array([1]),{contentType:'image/jpeg'}));
 await assertSucceeds(uploadBytes(p,new Uint8Array([1]),{contentType:'image/jpeg'}));await assertFails(uploadBytes(p,new Uint8Array([2]),{contentType:'image/jpeg'}));
});
test('actual app room services complete create, join, start, capture, end and restart under these rules',async()=>{
 async function services(uid){
  const c=context(uid);
  const modules={
   'firebase/firestore':firestoreApi,
   'firebase/storage':storageApi,
   './config':{db:c.firestore(),storage:c.storage(bucket),auth:{currentUser:{uid}}},
  };
  // Keep object literals in the same JS realm as the Firebase SDK's plain-object checks.
  globalThis.__catchTestModules ||= {};
  let source=await readFile(new URL('../src/firebase/rooms.js',import.meta.url),'utf8');
  for(const [spec,values] of Object.entries(modules)){
   const key=uid+':'+spec;globalThis.__catchTestModules[key]=values;
   const dependency=Object.keys(values).filter(k=>k!=='default').map(k=>`export const ${k}=globalThis.__catchTestModules[${JSON.stringify(key)}][${JSON.stringify(k)}];`).join('\n');
   const url='data:text/javascript;base64,'+Buffer.from(dependency).toString('base64');source=source.replaceAll("'"+spec+"'",JSON.stringify(url));
  }
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 }
 const actors={};for(const u of ['creator','friend','sibling'])actors[u]=await services(u);
 const c=await actors.creator.createRoom({hostId:'creator',hostNickname:'creator',maxPlayers:8,hideTimeSec:0,timeLimitSec:600});
 for(const u of ['friend','sibling'])await actors[u].joinRoom({roomCode:c,userId:u,nickname:u});
 const taggerId=await actors.creator.startGame(c);await actors.creator.beginPlaying(c);
 const victim=['creator','friend','sibling'].find(u=>u!==taggerId);
 await actors[taggerId].updateMyLocation(c,taggerId,37,127);
 const url=await actors[taggerId].uploadCatchPhoto({roomCode:c,localUri:'data:image/jpeg;base64,/9j/2Q=='});
 await actors[taggerId].markPlayerCaught({roomCode:c,playerId:victim,caughtById:taggerId,photoUrl:url});
 assert.equal((await getDoc(player(db(taggerId),victim,c))).data().status,'caught');
 await actors[taggerId].endGame(c);await actors.creator.restartGame(c);
 assert.equal((await getDoc(room(db('creator'),c))).data().roundId,2);
 assert.equal((await getDoc(player(db('creator'),victim,c))).data().status,'alive');
});
