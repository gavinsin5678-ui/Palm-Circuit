import * as T from './vendor/three.module.min.js';
import {createWorld,runway,runwayWest,onStreet,atAirfield,districtFor,isCore} from './world.js?v=streets';
import wasm from './drive-wasm.js?v=airfield';
import {parking,beachAccess,dockHeight,waveHeight,animatePerson,paintWake,makeInterior,disposeInterior} from './life-world.js?v=streets';
import {createSocial} from './social.js?v=connections';
import {createMobility} from './mobility.js?v=fleet-variants';
import {makeArchipelago,regions,islandAt,highwayAt,isRoad,solidLand,runways,stops,stopById,nearestRail,railAt,railLength,railRouteLength,railSector,signals,signalAt} from './metro-world.js?v=rail-network';
import {makeTerminal,venueFor} from './terminal-world.js?v=streets';
import {cabinLevel,cabinService,makePassengerCabins} from './cabin.js?v=terminal';
import {fleetProducts} from './fleet.js?v=fleet-variants';
import {makeExtraModels,vehiclePaint} from './fleet-models.js?v=fleet-variants';
import {createCombat} from './combat.js?v=streets';
import {flightEnvelope,coordinatedTurnRate,stepWatercraft} from './vehicle-physics.js?v=handling';
import {createAirDefense} from './air-defense.js?v=hijack';

const $=id=>document.getElementById(id), viewport=$('viewport');
const names={roam:'Free Roam',sprint:'Coastal Sprint',delivery:'Express Delivery'};
const routes={
  roam:[],
  sprint:[[3.5,11],[3.5,-46],[3.5,-94],[-45,-97],[-96,-94],[-93,-47],[-47,-47]],
  delivery:[[3.5,-13],[-47,-47]]
};
const deliveryBend=[3.5,-47];
const cameras=['Chase Cam','Hood Cam','Overhead'];
const airCameras=['Chase Cam','Pilot Cam','Survey Cam'];
const footCameras=['Follow Cam','Eye Level','Overhead'];
const waterCameras=['Chase Cam','Bow Cam','Overhead'];
const fleet=['car','plane','walk','sport','van','boat','yacht','train','jet','gravity','hydro',...Object.keys(fleetProducts)];
const vehicleName={car:'Roadster',plane:'Trainer',walk:'On Foot',sport:'Sport Coupe',van:'Utility Van',boat:'Speedboat',yacht:'Yacht',train:'Railcar',jet:'Jet Roadster',gravity:'Gravity Coupe',hydro:'Skylift'};
const boatParking={boat:[...parking.boat],yacht:[...parking.yacht],hydro:[48,64,0]};
const prototypeIds=fleet.slice(8),variant=id=>fleetProducts[id],modelOf=id=>variant(id)?.chassis??id;
const isAir=id=>id==='plane'||variant(id)?.kind==='air',isSea=id=>['boat','yacht','hydro'].includes(id)||variant(id)?.kind==='boat';
const isRail=id=>id==='train'||variant(id)?.kind==='rail';
const vehicleMaxHealth=id=>{
  const p=variant(id),model=p?.chassis??id;
  if(p?.kind==='rail'||id==='train')return 250;
  if(p?.kind==='air'||id==='plane')return 150;
  if(p?.kind==='boat'||['boat','yacht','hydro'].includes(id))return model==='sub'?165:190;
  if(['bus','van','rover'].includes(model)||p?.family==='bus')return model==='bus'?220:180;
  if(model==='bike')return 64;
  if(['sport','jet','gravity'].includes(model))return 84;
  return 110;
};
const ability=(...ids)=>state.ability>0&&ids.includes(variant(state.vehicle)?.ability);
for(const [id,p] of Object.entries(fleetProducts))vehicleName[id]=p.name;
const state={mode:'roam',vehicle:'car',phase:'ready',time:0,elapsed:0,checkpoint:0,camera:0,x:3.5,z:75,heading:0,speed:0,vx:0,vz:0,steer:0,hit:0,hits:0,
  altitude:0,throttle:0,pitch:0,bank:0,vertical:0,airborne:false,flightNotice:'',noticeTime:0,waterY:0,waterVertical:0,
  vehicleHealth:110,hijackedAirliner:false,hijackTime:0,hijackBountyTick:0,
  cash:75,heat:0,bounty:0,owned:[],gadget:null,jump:0,track:0,railY:0,ability:0,abilityCool:0,signal:null,
  job:'available',collected:0,fins:false,dialogue:null,swimming:false,interior:null,message:'',messageTime:0,crash:null};
const keys=new Set(), touchKeys=new Set();
const step=1/60, minmax=(n,a,b)=>Math.max(a,Math.min(b,n));
const camera=new T.PerspectiveCamera(57,1,.13,610);
const cameraTarget=new T.Vector3(), lookAt=new T.Vector3(), currentLook=new T.Vector3();
const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let core, world, renderer, snap=true, perfFrames=0, perfStart=performance.now();
let audio,osc,harmonic,volume,sounded=false, manual=false, acc=0, last=0, lastPaint=0, scale=1;
let indoor=null,insidePlace=null,groundPosition=null,lastMount=null,interactable=null,simTime=0,jumpVelocity=0;
const speedBars=Array.from({length:12},()=>document.createElement('i'));$('meter').replaceChildren(...speedBars);
const buttons=[...document.querySelectorAll('.mode')], vehicles=[...document.querySelectorAll('.vehicle')],start=$('start-btn'),mobileStart=$('mobile-start');
for(const [id,p] of Object.entries(fleetProducts)){
  const b=document.createElement('button');b.type='button';b.className='vehicle';b.dataset.vehicle=id;b.textContent=p.name;b.title=p.info;b.hidden=true;
  document.querySelector('.vehicle-list').append(b);vehicles.push(b);
}
start.disabled=mobileStart.disabled=true;
const fmt=n=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
const action=(...codes)=>codes.some(c=>keys.has(c)||touchKeys.has(c));
const target=()=>routes[state.mode][state.checkpoint];
const flying=()=>isAir(state.vehicle);
const walking=()=>state.vehicle==='walk';
const boating=()=>isSea(state.vehicle);
const rail=()=>isRail(state.vehicle);
const motoring=()=>!walking()&&!flying()&&!boating()&&!rail();
const drivable=(x,z)=>x<=15.5||!!islandAt(x,z)||highwayAt(x,z);
const roadSurface=(x,z)=>x<=15.5&&(onStreet(x,z)||atAirfield(x,z))||isRoad(x,z);
const solidHit=(x,z,y,r)=>world?.stream.hit(x,z,y,r)||world?.arch.hit(x,z,y,r);
const nearProperties=(x,z)=>{const {properties,people}=world.stream.nearby(x,z);if(x>219)properties.push(...world.arch.properties);return {properties,people}};
const streetPropAt=(x,z)=>world?.arch.props.find(p=>Math.hypot(p.x-x,p.z-z)<1.9);
const clearKeys=()=>{keys.clear();touchKeys.clear()};
const shift=()=>action('ShiftLeft','ShiftRight');
const cameraName=()=>mobility.cockpit()?(mobility.ride()?.pilotControl?'Flight Deck':mobility.ride()?'Passenger Cabin':'Control Room'):(flying()?airCameras:rail()?['Rail Chase','Driver Cab','Survey Cam']:walking()?footCameras:boating()?waterCameras:cameras)[state.camera];
const launchTitle=()=>flying()?'Start flying':walking()?'Start exploring':boating()?'Set sail':rail()?'Drive Railcar':'Start driving';
const endTitle=()=>flying()?'End flight':walking()?'End walk':boating()?'Moor boat':rail()?'Park Railcar':'End drive';
const social=createSocial(state,()=>{if(state.dialogue)clearKeys();refresh()},()=>{document.body.classList.remove('dialog-open');focusView(false);refresh()},()=>mobility.fine('theft'));
const worldPosition=()=>groundPosition??[state.x,state.z];
const districtAt=(x,z)=>{const island=islandAt(x,z);return island?[island.tag,island.name]:highwayAt(x,z)&&x>31?['PACIFICA ARCHIPELAGO','Channel Expressway']:districtFor(x,z)};
const mobility=createMobility({state,social,refresh,syncSelection,clearKeys,position:worldPosition,focus:()=>focusView(false),snap:()=>{snap=true},
  sync:syncSelection, sound:playChime,startRide,ridePosition,endRide,driveTransitVehicle,hit:solidHit,isIndoor:()=>!!indoor,isWalking:walking,isRoadVehicle:motoring,isFlying:flying,isBoating:boating,isRail:rail,
  venue:()=>indoor?.zone?indoor:null,enterVenue,leaveVenue,goRunway,takeoverAircraft,
  wardActions:p=>combat.wardActions(p),expose:p=>combat.expose(p),aid:p=>combat.aid(p)});
const combat=createCombat({state,walking,actors:combatActors,scene:()=>indoor?.scene??world?.scene,
  blocked:()=>mobility.panel()||mobility.ride()||mobility.detained()||indoor?.zone==='arena',
  notice:social.notice,law:mobility.law,sound:playChime,refresh,canMove:combatCanMove,lineClear:combatLineClear,recoverFromFight,
  damageWorld:(from,to,amount,radius)=>world?.stream.strike(from,to,amount,radius)??null,
  props:()=>indoor?[]:world?.arch.props??[]});
function combatActors(){
  if(!world||mobility.ride())return [];
  if(indoor)return ['arena','jail'].includes(indoor.zone)?[]:indoor.people??[];
  const {x,z}=state;
  return [...world.life.npcs.filter(p=>Math.abs(p.x-x)<32&&Math.abs(p.z-z)<32),...world.stream.nearby(x,z).people];
}
function combatCanMove(x,z){
  if(indoor)return Math.abs(x)<indoor.w-.35&&Math.abs(z)<indoor.d-.35&&!indoor.blocked?.(x,z)&&!indoor.points.some(p=>Math.abs(p.x-x)<p.w+.2&&Math.abs(p.z-z)<p.d+.2);
  return solidLand(x,z)&&!solidHit(x,z,.4,.24);
}
function combatLineClear(a,b){
  const d=Math.hypot(a.x-b.x,a.z-b.z);
  for(let k=.30;k<d-.62;k+=.28){
    const f=k/d,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;
    if(indoor?(indoor.blocked?.(x,z)||indoor.points.some(p=>!p.wardBed&&Math.abs(x-p.x)<p.w&&Math.abs(z-p.z)<p.d)):solidHit(x,z,.93,.06))return false;
  }
  return true;
}
function recoverFromFight(){
  if(mobility.detained())return;
  enterVenue(stopById('hospital'),'hospital');state.vitality=100;
  social.notice('You woke up at Pacifica Medical. Your bounty is still on record.');
}
let atlas='';let mapOX=0,mapOZ=0, mapSX=.67,mapSZ=.328;
const mapX=x=>77+(x-mapOX)*mapSX, mapY=z=>52.5+(z-mapOZ)*mapSZ;
const map=$('map');
map.innerHTML=`<g id="map-grid"></g>
  <polyline id="map-route" fill="none" stroke="#f7c38b" stroke-width="1.2" stroke-dasharray="3 2"/>
  <circle id="map-pin" r="3.5" fill="#ffc78c" stroke="#283b42" stroke-width="1"/>
  <g id="map-car"><circle r="6" fill="#203a41"/><path d="M0-5 4 4 0 2.5-4 4Z" fill="#8afad2" stroke="#ddfff8" stroke-width=".5"/></g>`;
const mapPin=$('map-pin'), mapCar=$('map-car'), mapRoute=$('map-route');
function paintMap(){
  const [x,z]=worldPosition(),core=!flying()&&!boating()&&(isCore(x,z)||state.mode!=='roam');
  const broad=flying()||state.x>30||mobility.ride();
  const cx=core?-63:Math.round(x/96)*96,cz=core?-24:Math.round(z/96)*96,zoom=core?0:broad?2:1;
  const id=`${cx}/${cz}/${zoom}`;
  if(id===atlas)return;
  atlas=id;mapOX=cx;mapOZ=cz;mapSX=core?.67:broad?.29:.50;mapSZ=core?.328:broad?.28:.50;
  const left=cx-74/mapSX,right=cx+74/mapSX,top=cz-50/mapSZ,bottom=cz+50/mapSZ,coast=minmax(mapX(16),2,152);
  const xs=[],zs=[];
  for(let xx=Math.ceil(left/48)*48;xx<=Math.min(0,right);xx+=48)xs.push(xx);
  for(let zz=Math.ceil(top/48)*48;zz<=bottom;zz+=48)zs.push(zz);
  $('map-grid').innerHTML=`<rect x="2" y="2" width="150" height="101" fill="#24333c"/>
  <path d="M${coast} 2 H152 V103 H${coast}Z" fill="#2d5261"/>
  <path d="M${coast} 2 V103" stroke="#80b5ad" stroke-width="1.3"/>
  ${xs.flatMap((xx,i)=>zs.map(zz=>`<rect x="${mapX(xx-24)+2}" y="${mapY(zz)+2.5}" width="${24*mapSX}" height="${34*mapSZ}" rx="1" fill="${i%2?'#45565a':'#384650'}"/>`)).join('')}
  ${xs.map(xx=>`<path d="M${mapX(xx)} 3 V101" stroke="${xx===0?'#a2a69b':'#6b7c84'}" stroke-width="${xx===0?2.5:1.5}"/>`).join('')}
  ${zs.map(zz=>`<path d="M3 ${mapY(zz)} H${minmax(mapX(2),3,152)}" stroke="#6b7c84" stroke-width="1.4"/>`).join('')}
  ${regions.slice(1).filter(i=>i.z+70>=top&&i.z-70<=bottom&&388>left&&237<right).map(i=>`<rect x="${mapX(237)}" y="${mapY(i.z-70)}" width="${151*mapSX}" height="${140*mapSZ}" fill="${i.rim}" opacity=".65"/><path d="M${mapX(237)} ${mapY(i.z)} H${mapX(388)}" stroke="#dbe2cd" stroke-width=".8"/>`).join('')}
  <path d="M${mapX(7)} ${mapY(96)} H${mapX(313)} M${mapX(313)} ${mapY(-120)} V${mapY(528)}" stroke="#dcdbb7" stroke-width="1.3" fill="none"/>
  <path d="M${mapX(runway.x)} ${mapY(runway.north)} V${mapY(runway.south)} M${mapX(runwayWest.x)} ${mapY(runwayWest.north)} V${mapY(runwayWest.south)}" stroke="#f4c189" opacity=".73" stroke-width="${14*mapSX}" stroke-dasharray="5 2"/>`;
}
function syncSelection(){
  const airlinerFlight=mobility.ride()?.pilotControl&&!mobility.ride()?.arrived;
  document.body.classList.toggle('aviation',flying()||airlinerFlight);
  document.body.classList.toggle('crashed',state.phase==='crashed');
  document.body.classList.toggle('on-foot',walking());document.body.classList.toggle('boating',boating());
  for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));
  for(const b of vehicles){const id=b.dataset.vehicle;b.setAttribute('aria-pressed',String(id===state.vehicle));b.hidden=prototypeIds.includes(id)&&!state.owned.includes(id)&&id!==state.vehicle}
  $('controls-label').textContent=airlinerFlight?'AIRLINER FLIGHT CONTROLS':flying()?'FLIGHT CONTROLS':walking()?'ON-FOOT CONTROLS':boating()?'BOAT CONTROLS':rail()?'RAIL CONTROLS':'DRIVER CONTROLS';
  $('drive-controls').hidden=flying()||walking()||rail()||airlinerFlight;
  $('flight-controls').hidden=!flying()&&!airlinerFlight;$('flight-data').hidden=!flying()&&!airlinerFlight;$('rail-controls').hidden=!rail();
  $('arrow-note').hidden=!flying();$('walk-controls').hidden=!walking()||airlinerFlight;
  start.querySelector('span').textContent=state.phase==='running'?endTitle():state.phase==='crashed'?
    state.crash?.vehicle?'Repair vehicle':'Recover aircraft':launchTitle();
  mobileStart.textContent=launchTitle();
}

function select(mode){
  if(mobility.detained()||mobility.outOfRide())return;
  if(mobility.panel())mobility.close(false);
  if(mode!=='roam')state.vehicle='car';
  state.mode=mode;state.phase='ready';state.checkpoint=0;state.time=0;state.elapsed=0;state.hits=0;
  resetCar();document.body.classList.remove('playing');
  keys.clear();touchKeys.clear();$('result').hidden=true;syncSelection();
  refresh();
}
function resetCar(loc=null){
  leaveInterior(false);social.close(false);
  mobility.resetCockpit();
  const stock=flying()?[runway.x,runway.z,0]:rail()?[13,96,Math.PI/2]:(parking[state.vehicle]??(boating()?boatParking[state.vehicle]??boatParking.hydro:parking.car));
  const [x,z,h]=loc??stock;
  if(boating())boatParking[state.vehicle]=[x,z,h];
  Object.assign(state,{x,z,heading:h,speed:0,vx:0,vz:0,hit:0,steer:0,
    altitude:0,throttle:0,pitch:0,bank:0,vertical:0,airborne:false,flightNotice:'',noticeTime:0,swimming:walking()&&!solidLand(x,z)&&dockHeight(x,z)===null,
    crash:null,jump:0,railY:0,ability:0,signal:null,waterLanding:false,depth:0,waterY:waveHeight(x,z,simTime),waterVertical:0,
    vehicleHealth:vehicleMaxHealth(state.vehicle),hijackedAirliner:false,hijackTime:0,hijackBountyTick:0});
  jumpVelocity=0;
  if(rail()){
    const p=nearestRail(x,z);Object.assign(state,{track:p.track,railY:p.y,x:p.x,z:p.z,heading:p.heading});
  }
  if(flying())world?.wreck.clear();
  world?.airDefense?.clear();
  $('crash').hidden=true;
  snap=true;world?.stream.sync(state.x,state.z,flying(),true);
}
function stashVehicle(){
  if(boating())boatParking[state.vehicle]=[state.x,state.z,state.heading];
}
function selectVehicle(vehicle){
  if(mobility.detained()||vehicle===state.vehicle||prototypeIds.includes(vehicle)&&!state.owned.includes(vehicle)||mobility.outOfRide())return;
  if(mobility.panel())mobility.close(false);
  const live=state.phase==='running'||state.phase==='crashed';
  const [x,z]=worldPosition(),heading=state.heading,old=state.vehicle;
  const loc=live?swapLocation(vehicle,x,z,heading,old):null;
  stashVehicle();lastMount=null;
  if(!live){state.vehicle=vehicle;state.camera=0;select('roam');return}
  state.vehicle=vehicle;state.mode='roam';state.phase='running';state.camera=0;state.checkpoint=0;state.time=0;state.hits=0;
  clearKeys();resetCar(loc);document.body.classList.add('playing');syncSelection();snap=true;focusView();refresh();
}
function swapVehicle(){const list=fleet.filter(x=>!prototypeIds.includes(x)||state.owned.includes(x));selectVehicle(list[(list.indexOf(state.vehicle)+1)%list.length])}
function swapLocation(id,x,z,yaw,old){
  if(isAir(id)){
    const takeoffHeading=(r,zz)=>zz<(r.min+r.max)*.5?Math.PI:0;
    const options=runways.map(r=>{const zz=minmax(z,r.min+10,r.max-10);return [r.x,zz,takeoffHeading(r,zz)]});
    const onRunway=runways.find(r=>Math.abs(x-r.x)<4.4&&z>=r.min+10&&z<=r.max-10);
    if(onRunway)return [x,z,takeoffHeading(onRunway,z)];
    return options.sort((a,b)=>Math.hypot(x-a[0],z-a[1])-Math.hypot(x-b[0],z-b[1]))[0];
  }
  if(isRail(id)){const p=nearestRail(x,z);return [p.x,p.z,p.heading]}
  if(isRail(old)&&state.railY<-1.8){
    const stopsOnRail=stops.filter(s=>s.type==='rail').sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
    ({x,z}=stopsOnRail[0]);
  }
  const useWater=isSea(id);
  const valid=(a,b)=>useWater?!solidLand(a,b)&&a>32.6&&dockHeight(a,b)===null:
    id==='walk'?!solidHit(a,b,.5,.36):drivable(a,b)&&roadSurface(a,b)&&!solidHit(a,b,.35,1.42)&&!trafficAt(a,b);
  if(valid(x,z))return [x,z,yaw];
  for(let r=1.4;r<=175;r+=r>60?5:1.8){
    const samples=r<12?16:r<65?28:52;
    for(let n=0;n<samples;n++){
      const t=n/samples*Math.PI*2,a=x+Math.cos(t)*r,b=z+Math.sin(t)*r;
      if(valid(a,b))return [a,b,yaw];
    }
  }
  if(useWater){const i=regionAt(x,z);return i.id==='main'?[Math.max(38,x),z,yaw]:[230,i.z+28,yaw]}
  if(id==='walk')return [x,z,yaw];
  return [3.5,Math.round(z/48)*48,yaw];
}
function focusView(scroll=true){
  if(scroll&&matchMedia('(max-width: 720px)').matches)window.scrollTo({top:0,behavior:'instant'});
  renderer?.domElement.focus({preventScroll:true});
}
function begin(){
  if(!renderer||mobility.detained())return;
  if(mobility.outOfRide())return;
  if(mobility.panel())mobility.close(false);
  if(state.phase==='crashed'){recover();return}
  if(state.phase==='running'){stashVehicle();select(state.mode);return}
  resetCar();state.checkpoint=0;state.time=state.mode==='delivery'?65:0;state.elapsed=0;state.hits=0;state.phase='running';
  $('result').hidden=true;document.body.classList.add('playing');syncSelection();
  focusView();refresh();
}
function driveTransitVehicle(id,stop,destination){
  if(!variant(id))return false;
  const heading=Math.atan2(destination.x-stop.x,stop.z-destination.z);
  const x=variant(id).kind==='boat'?(stop.region==='main'?43:222):stop.x;
  const [px,pz,yaw]=swapLocation(id,x,stop.z,heading,'walk');
  mobility.close(false);lastMount=null;state.vehicle=id;state.mode='roam';state.phase='running';state.camera=0;
  state.checkpoint=0;state.time=0;state.hits=0;resetCar([px,pz,yaw]);
  document.body.classList.add('playing');syncSelection();focusView();refresh();
  return true;
}
function takeoverAircraft(pose){
  leaveInterior(false);mobility.resetCockpit();
  Object.assign(state,{vehicle:'plane',mode:'roam',phase:'running',x:pose.x,z:pose.z,heading:pose.heading,
    speed:0,vx:0,vz:0,altitude:0,vertical:0,throttle:0,pitch:0,bank:0,airborne:false,
    vehicleHealth:vehicleMaxHealth('plane'),hijackedAirliner:true,hijackTime:0,hijackBountyTick:0,
    crash:null,signal:null,swimming:false});
  clearKeys();document.body.classList.add('playing');$('crash').hidden=true;
  syncSelection();snap=true;focusView(false);social.notice('Flight deck seized · Take off and evade the response.');
  refresh();
}
function startRide(){
  leaveInterior(true);social.close(false);clearKeys();lastMount=null;mobility.resetCockpit();
  state.vehicle='walk';state.mode='roam';state.phase='running';state.speed=0;state.camera=0;state.swimming=false;
  Object.assign(state,{vx:0,vz:0,altitude:0,railY:0,throttle:0,bank:0,pitch:0,airborne:false,jump:0,ability:0});
  document.body.classList.add('playing','riding');syncSelection();
  const pos=mobility.ride()?.pose;
  if(pos){state.x=pos.x;state.z=pos.z;state.speed=0;ridePosition(pos)}
  snap=true;
}
function ridePosition(pos){
  state.speed=Math.min(85,Math.hypot(state.x-pos.x,state.z-pos.z)/step);
  Object.assign(state,{x:pos.x,z:pos.z,heading:pos.heading,altitude:Math.max(0,pos.y),railY:Math.min(0,pos.y)});
}
function endRide(dest){
  mobility.resetCockpit();document.body.classList.remove('riding');state.vehicle='walk';
  let loc=[dest.x,dest.z,0];
  if(['rail','ferry','airport'].includes(dest.type)){
    const east=[7,6,Math.PI/2],west=[-7,6,-Math.PI/2],towardCity=dest.type==='airport'||dest.type==='ferry'&&dest.region==='main';
    const candidates=[...(towardCity?[west,east]:[east,west]),[0,6.4,Math.PI],[7,-4,Math.PI/2],[-7,-4,-Math.PI/2]];
    for(const [a,b,h] of candidates){
      const xx=dest.x+a,zz=dest.z+b;
      if(solidLand(xx,zz)&&!solidHit(xx,zz,.5,.5)){loc=[xx,zz,h];break}
    }
  }
  Object.assign(state,{x:loc[0],z:loc[1],speed:0,heading:loc[2],altitude:0,railY:0,throttle:0,pitch:0,bank:0,airborne:false,swimming:false,jump:0});
  snap=true;syncSelection();focusView(false);
}
function complete(won){
  state.phase=won?'finished':'failed';state.speed=state.vx=state.vz=0;keys.clear();touchKeys.clear();document.body.classList.remove('playing');
  $('result-title').textContent=won?(state.mode==='sprint'?'Sprint complete':'Delivery complete'):'Time’s up';
  $('result-details').textContent=won?`Finished in ${fmt(state.elapsed)}. ${state.hits===0?'No collisions.':`${state.hits} collision${state.hits===1?'':'s'}.`}`:'The delivery window closed. Follow the orange map marker and try again.';
  if(won)social.changeCash(state.mode==='sprint'?45:70,state.mode==='sprint'?'Sprint prize':'Delivery pay');
  $('result').hidden=false;$('retry').focus({preventScroll:true});syncSelection();refresh();
}
function cycleCamera(){state.camera=(state.camera+1)%cameras.length;snap=true;refresh()}
function fullscreen(){
  const next=!document.body.classList.contains('expanded');
  document.body.classList.toggle('expanded',next);$('fullscreen').setAttribute('aria-pressed',String(next));
  $('fullscreen').setAttribute('aria-label',next?'Restore layout':'Expand game view');
  $('fullscreen').querySelector('span').textContent=next?'Restore':'Fullscreen';
  resize();
}
function toggleAudio(){
  if(!audio){
    try{
      audio=new AudioContext();osc=audio.createOscillator();harmonic=audio.createOscillator();volume=audio.createGain();
      const cut=audio.createBiquadFilter(), hgain=audio.createGain();hgain.gain.value=.25;cut.type='lowpass';cut.frequency.value=160;
      osc.type='triangle';harmonic.type='sawtooth';volume.gain.value=0;osc.connect(cut);harmonic.connect(hgain).connect(cut);
      cut.connect(volume).connect(audio.destination);osc.start();harmonic.start();
    }catch{ $('sound').disabled=true;return; }
  }
  sounded=!sounded;if(sounded)audio.resume().catch(()=>{});
  const icon=$('sound').querySelector('path');icon.setAttribute('d',sounded?'M3 10v4h4l5 4V6l-5 4H3Zm13-1a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12':'M3 10v4h4l5 4V6l-5 4H3Zm13 0 5 5m0-5-5 5');
  $('sound').setAttribute('aria-pressed',String(sounded));
}
function playChime(hz){
  if(!audio||audio.state!=='running'||!sounded)return;
  const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
  o.frequency.value=hz;o.type='sine';g.gain.setValueAtTime(.085,t);g.gain.exponentialRampToValueAtTime(.001,t+.36);
  o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.37);
}
function refresh(){
  const {mode,phase,x,z,speed,heading,checkpoint,time,elapsed}=state;
  const [wx,wz]=worldPosition();
  const district=insidePlace?['INDOORS',insidePlace.name]:(rail()||mobility.ride()?.type==='rail')&&state.railY<-3?['COASTAL RAIL',railSector(x,state.railY)]:walking()&&x>16.5&&x<30.6?['OCEAN DISTRICT','Pacifica Beach']:districtAt(wx,wz);
  if($('location').lastChild.textContent!==` ${district[0]}`)$('location').lastChild.textContent=' '+district[0];
  if($('district').textContent!==district[1])$('district').textContent=district[1];
  const km=Math.round(Math.abs(speed)*3.6);$('speed').textContent=String(km).padStart(3,'0');
  $('gear').textContent=phase==='crashed'?'OUT':flying()?(state.airborne?'AIR':state.waterLanding?'FLOAT':'GND'):walking()?(state.swimming?'SWIM':'FOOT'):boating()?(state.depth>.6?`−${state.depth.toFixed(1)}m`:'SEA'):rail()?'RAIL':phase!=='running'?'P':speed<-.4?'R':String(minmax(Math.floor(km/30)+1,1,5));
  $('wallet').textContent=`$${state.cash}`;
  if(flying()){$('altitude').textContent=Math.round(state.altitude);$('throttle').textContent=Math.round(state.throttle*100)}
  speedBars.forEach((b,i)=>b.classList.toggle('on',i<Math.ceil(flying()?state.throttle*12:km/13)));$('camera-label').textContent=cameraName().toUpperCase();
  const round=mobility.round(),imaniHere=combat.vital({id:'imani'})>0;
  const pilotFlight=mobility.ride()?.pilotControl;
  const labels=pilotFlight?['Manual airliner flight',`${Math.round(state.altitude)} m altitude · ${Math.round(state.speed*3.6)} km/h · land low and slow at ${mobility.ride().d.name}`]:
    flying()?(phase==='crashed'?['Aircraft disabled','The wreck stays here until you choose to recover.']:state.flightNotice?[state.flightNotice,'Throttle is idle. Brake to a stop.']:
      state.airborne?['Explore from the air',speed<27?'Low airspeed. Add throttle.':'Ease off the throttle and descend gently to land.']:
      ['Ready for takeoff',matchMedia('(pointer: coarse)').matches?'Raise throttle with +. Use ↑ at 100 km/h.':'Hold ↑ to take off. Press P for the cockpit.']):
    walking()?(insidePlace?(indoor?.zone?(indoor.zone==='arena'&&round?['Hologram Tag',round.done?'Round cleared. Replay at the terminal.':`${round.tags.length}/3 tagged · ${Math.ceil(round.remaining)}s`]:[indoor.zone==='jail'?'In custody':'Explore on foot',indoor.zone==='jail'?'Visit the custody terminal or wait out the sentence.':'Follow the signs and press E near a marked point.']):['Explore the room','Walk up to the door, cash drawer, or resident to interact.']):
      state.job==='cleanup'&&imaniHere?['Beach cleanup',`Pick up litter by the pier · ${state.collected} / 3`]:
      state.job==='turn-in'&&imaniHere?['Return to Imani','Talk to Imani on the boardwalk to collect $90.']:
      state.swimming?['Swimming in Pacifica Bay',state.fins?'Your fins give you a faster stroke.':'Reach the swimming beach or press G near a boat.']:
      ['Meet the neighborhood',imaniHere?'Talk to Imani for work. Press T to find stations and sports.':'Press T to find stations, sports centers, and other stops.']):
    boating()?['Explore Pacifica Bay','Arrow keys steer and change speed. Stop and press G to swim.']:
    rail()?[state.railY<-4?'Under the bay':'Drive the Coastal Line','↑ powers the train. ↓ brakes or reverses. Press P for the cab.']:
    mode==='roam'?[state.signal?`Traffic light: ${state.signal}`:'Explore Pacifica Bay',state.bounty>=60?'Patrol alert active. Visit a police desk to settle the bounty.':'Press T for the Transit Atlas. Take the Channel Expressway to the islands.']:
    mode==='sprint'?[phase==='ready'?'Hit all 7 checkpoints':phase==='finished'?'Course cleared':`Checkpoint ${checkpoint+1} of 7`,phase==='ready'?'Follow the green rings.':`Time ${fmt(elapsed)} · ${checkpoint} / 7 cleared`]:
      [phase==='finished'?'Parcel delivered':phase==='failed'?'Delivery expired':checkpoint===0?'Pick up the parcel':'Reach the drop-off',phase==='ready'?'Two stops. 65 seconds.':`${fmt(Math.ceil(time))} remaining · ${checkpoint} / 2 stops`];
  const tag=pilotFlight?'COMMERCIAL PILOT':flying()?'FREE FLIGHT':walking()?`${state.swimming?'SWIMMING':'ON FOOT'}${state.heat?' · HEAT '+state.heat:''}`:boating()||rail()?vehicleName[state.vehicle].toUpperCase():names[mode].toUpperCase();
  if($('objective-tag').textContent!==tag)$('objective-tag').textContent=tag;
  if($('objective').textContent!==labels[0])$('objective').textContent=labels[0];
  if($('detail').textContent!==labels[1])$('detail').textContent=labels[1];
  paintMap();mapCar.setAttribute('transform',`translate(${mapX(wx)},${mapY(wz)}) rotate(${heading*180/Math.PI})`);
  const mark=mobility.waypoint();
  const stop=target()??(mark?[mark.x,mark.z]:null)??(walking()&&imaniHere&&state.job==='turn-in'?[12.1,71.7]:walking()&&imaniHere&&state.job==='cleanup'?
    world?.life.beachItems.filter(p=>!social.picked.has(p.id)).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)).map(p=>[p.x,p.z])[0]:null);
  mapPin.style.display=stop?'':'none';
  if(stop){mapPin.setAttribute('cx',minmax(mapX(stop[0]),5,149));mapPin.setAttribute('cy',minmax(mapY(stop[1]),6,99))}
  if(target()){
    const [tx,tz]=target();mapPin.setAttribute('cx',mapX(tx));mapPin.setAttribute('cy',mapY(tz));
    const remaining=routes[mode].slice(checkpoint);
    if(mode==='delivery'&&state.z>-41&&state.x>-9)remaining.splice(Math.max(0,1-checkpoint),0,deliveryBend);
    mapRoute.setAttribute('points',remaining.map(([a,b])=>`${mapX(a)},${mapY(b)}`).join(' '));
  }else mapRoute.removeAttribute('points');
  document.body.classList.toggle('dialog-open',!!state.dialogue);
  $('notice').hidden=state.messageTime<=0;
  if($('notice').textContent!==state.message)$('notice').textContent=state.message;
  interactable=world&&(walking()||motoring()&&Math.abs(speed)<.8)&&state.phase==='running'&&!state.dialogue&&!mobility.panel()&&!mobility.ride()?findAction():null;
  $('interact').hidden=!interactable;
  if(interactable&&$('interact-label').textContent!==interactable.label)$('interact-label').textContent=interactable.label;
  $('ability-tool').hidden=!prototypeIds.includes(state.vehicle)||state.phase!=='running';
  $('ability-tool').title=variant(state.vehicle)?.info??'Activate vehicle ability (H)';
  $('gadget-tool').hidden=!walking()||state.phase!=='running'||!!state.dialogue||!!mobility.panel()||(indoor?.zone!=='arena'&&(!state.gadget||!!indoor));
  $('jump-tool').hidden=!walking()||state.phase!=='running'||state.swimming;
  mobility.refresh();
  combat.hud();
}
function initTraffic(dt){
  for(const t of world.traffic){
    t.pause=Math.max(0,(t.pause??0)-dt);
    const sign=signals.find(s=>Math.abs((t.axis==='x'?s.z:s.x)-t.lane)<.7&&((t.axis==='x'?s.x:s.z)-t.coord)*t.dir>=6.6&&((t.axis==='x'?s.x:s.z)-t.coord)*t.dir<8.5);
    const stopsForLight=state.mode==='roam'&&sign&&signalAt(sign,simTime,t.axis)!=='green';
    if(!t.pause&&!stopsForLight)t.coord+=t.dir*t.v*dt;
    const [min,max]=t.span??(t.axis==='x'?[-159,9]:[-169,125]);
    if(t.coord>max)t.coord=min;
    if(t.coord<min)t.coord=max;
    if(t.axis==='z'){
      t.mesh.position.set(t.lane-t.dir*3.65,.025,t.coord);t.mesh.rotation.y=t.dir===1?Math.PI:0;
    }else{
      t.mesh.position.set(t.coord,.025,t.lane+t.dir*3.3);t.mesh.rotation.y=-t.dir*Math.PI/2;
    }
  }
}
function trafficAt(x,z){return world?.traffic.find(t=>Math.abs(x-t.mesh.position.x)<(t.axis==='z'?1.54:2.45)&&Math.abs(z-t.mesh.position.z)<(t.axis==='z'?2.45:1.54));}
function invalid(x,z){
  const hover=state.vehicle==='gravity'&&state.ability>0;
  return (!drivable(x,z)&&!(hover&&x<=33))||solidHit(x,z,hover?2.2:.2,1.05)||(!hover&&trafficAt(x,z));
}
function leaveInterior(restore=true){
  if(!indoor)return;
  if(indoor.zone){if(!mobility.ride())mobility.leaveVenueState(indoor.stop);indoor.dispose()}
  else disposeInterior(indoor);
  if(restore&&groundPosition){[state.x,state.z]=groundPosition;state.heading=indoor.zone?0:Math.PI}
  state.interior=null;groundPosition=null;insidePlace=null;indoor=null;state.speed=0;snap=true;
}
function enterPlace(place){
  insidePlace=place;groundPosition=[place.doorX,place.doorZ+.45];
  indoor=makeInterior(place);state.interior={name:place.name,kind:place.kind,id:place.id};
  [state.x,state.z]=indoor.entry;state.heading=0;state.speed=0;state.camera=0;
  keys.clear();touchKeys.clear();snap=true;refresh();
}
function enterVenue(stop,zone=venueFor(stop),gate=false,entry=null,heading=0){
  const same=indoor?.stop?.id===stop.id,anchor=same?groundPosition:[stop.x,stop.z+4.1];
  if(indoor){if(indoor.zone)indoor.dispose();else disposeInterior(indoor)}
  groundPosition=anchor;
  indoor=makeTerminal(stop,zone,gate);
  insidePlace={id:stop.id,name:indoor.title,kind:'terminal'};
  state.interior={...insidePlace,zone};
  state.vehicle='walk';state.phase='running';state.mode='roam';state.speed=0;state.camera=0;state.swimming=false;state.jump=0;state.ability=0;state.depth=0;jumpVelocity=0;
  [state.x,state.z]=entry??indoor.entry;state.heading=heading;
  clearKeys();document.body.classList.add('playing');syncSelection();snap=true;focusView(false);refresh();
}
function leaveVenue(){leaveInterior(true);clearKeys();focusView(false);refresh()}
function goRunway(stop,id='plane',west=false){
  leaveInterior(false);state.vehicle=id;
  const r=west&&stop.region==='main'?runwayWest:runways.find(x=>x.id===stop.region)??runways[0];
  resetCar([r.x,r.z,0]);state.phase='running';state.mode='roam';syncSelection();focusView(false);refresh();
}
function nearestBoard(){
  if(indoor)return null;
  const [x,z]=[state.x,state.z], pool=['boat','yacht',...(state.owned.includes('hydro')?['hydro']:[])].map(id=>({id,coords:boatParking[id]}));
  if(lastMount&&!['boat','yacht','hydro'].includes(lastMount.id))pool.push(lastMount);
  return pool.map(q=>({...q,d:Math.hypot(q.coords[0]-x,q.coords[1]-z)}))
    .filter(p=>p.d<(p.id==='yacht'?6.9:p.id==='boat'?5.7:4.3)).sort((a,b)=>a.d-b.d)[0]??null;
}
function findAction(){
  const {x,z}=state;
  const pool=[];
  if(indoor){
    pool.push(...indoor.targets.filter(p=>!p.actorId));
    for(const p of indoor.people??[]){
      if(!p.model.visible||combat.vital(p)<=0)continue;
      const a=indoor.targets.find(q=>q.actorId===p.id);
      if(a)pool.push({...a,x:p.model.position.x,z:p.model.position.z});
    }
  }
  else if(walking()){
    pool.push(...mobility.atStation(x,z,true));
    const near=nearProperties(x,z);
    for(const p of near.properties) if(Math.abs(p.doorX-x)<4.6&&Math.abs(p.doorZ-z)<4.6){
      pool.push({type:'door',label:`Enter ${p.name}`,x:p.doorX,z:p.doorZ,r:3.15,place:p});
    }
    for(const p of [...world.life.npcs,...near.people])if(combat.vital(p)>0&&p.model.visible){
      const pos=p.model.getWorldPosition(new T.Vector3());
      pool.push({...p,x:pos.x,z:pos.z,type:'talk',label:`Talk to ${p.name}`,r:3.85});
    }
    if(state.job==='cleanup')for(const p of world.life.beachItems)if(!social.picked.has(p.id))pool.push({...p,r:2.4,type:'collect',label:'Pick up litter'});
    if(x>32){const q=nearestBoard();if(q)pool.push({type:'board',label:`Board ${vehicleName[q.id]}`,x:q.coords[0],z:q.coords[1],r:q.id==='yacht'?6.9:5.7,board:q})}
  }else pool.push(...mobility.atStation(x,z,false));
  let best=Infinity,found=null;
  for(const p of pool){
    const d=Math.hypot(p.x-x,p.z-z);
    if(d<=p.r&&d<best){best=d;found=p}
  }
  return found;
}
function interact(){
  if(mobility.ride()){mobility.rideInteract();return}
  if((!walking()&&!(motoring()&&Math.abs(state.speed)<.8))||state.dialogue||mobility.panel()||state.phase!=='running')return;
  const a=findAction();if(!a)return;
  if(a.type==='door')enterPlace(a.place);
  if(a.type==='exit'){leaveInterior();keys.clear();touchKeys.clear();refresh()}
  if(a.type==='talk')social.talk(a);
  if(a.type==='cash')social.cashDrawer(a.place);
  if(a.type==='collect')social.collect(a);
  if(a.type==='board')boardVehicle(a.board);
  if(a.type==='transit')mobility.handle(a.station);
  if(a.type==='patrol')mobility.patrolTalk();
  if(a.type==='venue')mobility.venueAction(a);
}
function boardVehicle(q){
  social.close(false);keys.clear();touchKeys.clear();
  mobility.resetCockpit();
  state.vehicle=q.id;[state.x,state.z,state.heading]=q.coords;
  state.swimming=false;state.speed=state.vx=state.vz=state.steer=0;
  state.camera=0;state.altitude=state.vertical=state.pitch=state.bank=state.throttle=0;state.airborne=false;
  state.mode='roam';state.phase='running';state.crash=null;lastMount=null;
  state.ability=state.depth=0;
  if(isRail(q.id)){const p=nearestRail(state.x,state.z);state.track=p.track;state.railY=p.y}
  document.body.classList.add('playing');syncSelection();snap=true;focusView();refresh();
}
function changeOnFoot(fromWreck=false){
  if(!world||mobility.detained()||mobility.panel()||mobility.outOfRide())return;
  if(state.phase==='crashed')fromWreck=true;
  if(rail()&&state.railY<-1.8||boating()&&state.depth>.9){social.notice('Reach the surface before leaving the vehicle.');return}
  if(walking()){
    if(indoor){social.notice('Leave the building before boarding.');return}
    const q=nearestBoard();
    if(q)boardVehicle(q);else social.notice('No parked vehicle nearby. Use V to switch.');
    return;
  }
  if(!fromWreck&&(state.airborne||Math.abs(state.speed)>4.2)){social.notice(state.airborne?'Land before leaving the plane.':'Slow down to exit the vehicle.');return}
  if(state.phase==='ready'){selectVehicle('walk');begin();return}
  const prev=state.vehicle, wreckCenter=fromWreck&&state.crash?.aircraft?world.wreck.center():null;
  const [x,z,yaw]=[wreckCenter?.x??state.x,wreckCenter?.z??state.z,state.heading],vStep=boating()?2.8:2.15;
  if(!fromWreck)lastMount={id:prev,coords:[x,z,yaw]};else lastMount=null;
  stashVehicle();mobility.resetCockpit();state.vehicle='walk';state.mode='roam';state.phase='running';state.camera=0;
  state.x=x+Math.cos(yaw)*vStep;state.z=z+Math.sin(yaw)*vStep;
  if(solidHit(state.x,state.z,.6,.35)){state.x=x-Math.cos(yaw)*vStep;state.z=z-Math.sin(yaw)*vStep}
  if(fromWreck&&solidHit(state.x,state.z,.6,.35)){
    search:for(let r=2.5;r<=32;r+=2.5)for(let a=0;a<6.27;a+=Math.PI*.25){
      const xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;
      if(!solidHit(xx,zz,.6,.42)){state.x=xx;state.z=zz;break search}
    }
  }
  state.altitude=state.vertical=state.pitch=state.bank=state.throttle=state.speed=state.depth=0;
  state.airborne=false;state.swimming=!solidLand(state.x,state.z)&&dockHeight(state.x,state.z)===null;
  state.crash=null;state.flightNotice='';keys.clear();touchKeys.clear();
  $('crash').hidden=true;document.body.classList.add('playing');syncSelection();snap=true;focusView();refresh();
}
function recover(){
  if(!world||mobility.detained()||mobility.outOfRide())return;
  if(mobility.panel())mobility.close(false);
  if(state.phase==='crashed'){state.phase='running';document.body.classList.add('playing')}
  const [x,z]=worldPosition(),loc=state.mode==='roam'&&x>35?swapLocation(state.vehicle,x,z,state.heading,state.vehicle):null;
  resetCar(loc);syncSelection();focusView(false);refresh();
}
function flightCrash(message,x,z,altitude,water){
  const energy=Math.hypot(state.speed,state.vertical*1.75);
  if(!water&&message==='Collision with a building')world.stream.damageAt(x,z,200+energy*5,2);
  world.wreck.impact({x,z,altitude,energy,water,heading:state.heading,vx:state.vx,vz:state.vz,vertical:state.vertical,pitch:state.pitch,bank:state.bank});
  world.airDefense?.clear();keys.clear();touchKeys.clear();state.phase='crashed';state.crash={message,x,z,water,aircraft:true,severity:energy>45?'severe':'moderate'};
  state.hijackedAirliner=false;
  mobility.resetCockpit();
  Object.assign(state,{x,z,altitude:Math.max(0,altitude),speed:0,vx:0,vz:0,vertical:0,airborne:false,throttle:0,camera:0,flightNotice:''});
  document.body.classList.remove('playing');$('crash-title').textContent=state.crash.message==='Anti-aircraft hit'?'Aircraft struck':'Aircraft wrecked';
  $('crash').querySelector('.eyebrow').textContent='FLIGHT INCIDENT';
  $('crash-details').textContent=`${message}. Recover at the runway or continue near the wreck.`;
  $('crash-walk').textContent=water?'Continue swimming':'Continue on foot';$('crash-recover').textContent='Recover aircraft';$('crash').hidden=false;snap=true;syncSelection();refresh();
}
function vehicleCrash(message){
  mobility.close(false);world.airDefense?.clear();keys.clear();touchKeys.clear();
  state.vehicleHealth=0;state.speed=state.vx=state.vz=0;state.phase='crashed';
  state.crash={message,x:state.x,z:state.z,vehicle:true};
  document.body.classList.remove('playing');
  $('crash-title').textContent='Vehicle disabled';$('crash').querySelector('.eyebrow').textContent='ROAD INCIDENT';
  $('crash-details').textContent=`${message}. The vehicle is too damaged to drive. Continue on foot or repair and recover it.`;
  $('crash-walk').textContent='Continue on foot';$('crash-recover').textContent='Repair & recover';
  $('crash').hidden=false;snap=true;syncSelection();refresh();
}
function damageVehicle(impactSpeed,message){
  if(impactSpeed<2.6)return false;
  const maximum=vehicleMaxHealth(state.vehicle),relative=100/maximum;
  const damage=Math.min(maximum,Math.max(3,Math.pow(Math.max(0,impactSpeed-1),1.65)*.55*relative));
  state.vehicleHealth=Math.max(0,(state.vehicleHealth??maximum)-damage);
  if(state.vehicleHealth<=0){vehicleCrash(message);return true}
  if(state.vehicleHealth<maximum*.28)social.notice('Critical vehicle damage · Handling and power reduced.');
  return false;
}
function updatePlane(dt){
  if(state.noticeTime>0){state.noticeTime-=dt;if(state.noticeTime<=0)state.flightNotice=''}
  const air=state.airborne, arrowShift=shift(), up=keys.has('ArrowUp'),down=keys.has('ArrowDown'),p=variant(state.vehicle);
  const brake=action('Space')||(!air&&down&&!arrowShift);
  const throttle=Number(action('KeyW')||(up&&(arrowShift||!air)))-Number(action('KeyS')||(down&&(arrowShift||!air)));
  state.throttle=minmax(state.throttle+throttle*dt*.73,0,1);
  const steer=mobility.assist()?0:Number(action('KeyD','ArrowRight'))-Number(action('KeyA','ArrowLeft'));
  const pitch=Number((up&&!arrowShift)||touchKeys.has('ArrowUp'))-Number((down&&!arrowShift)||touchKeys.has('ArrowDown'));
  const ratio=(p?.power??1)*(ability('afterburn')&&air?1.27:1);
  state.speed=core.air_speed(state.speed/ratio,state.throttle,Math.sin(state.pitch),+brake,+!air,dt)*ratio;
  const stallBase=p?.model==='thermal'?18:p?.model==='sprintjet'?31:p?.model==='trimotor'?24:p?.family==='float'?22:27;
  const takeoffSpeed=ability('short')?18:stallBase;
  const envelope=flightEnvelope(state.speed,state.bank,stallBase),authority=air?envelope.control:1;
  const nose=air?(envelope.stalled?-.20:pitch<0?-.18:pitch*.31*authority):
    (state.speed>=takeoffSpeed?Math.max(0,pitch)*.30:0);
  state.pitch+=(nose-state.pitch)*Math.min(1,dt*(air&&envelope.stalled?2.4:3.2));
  state.bank+=((air?steer*(ability('stabilize')?.27:.67)*(p?.steer??1)*authority:0)-state.bank)*Math.min(1,dt*(ability('stabilize')?6:3.3));
  const loadedEnvelope=flightEnvelope(state.speed,state.bank,stallBase);
  const turn=air?coordinatedTurnRate(state.speed,state.bank,Math.max(12,stallBase*.7)):
    steer*Math.min(1,state.speed*.20)*(.76-state.speed*.009);
  state.heading=(state.heading+turn*dt)%(Math.PI*2);
  let desired=core.air_vertical(state.speed+(ability('short')&&!air?8:0),Math.sin(state.pitch));
  if(air){
    const liftFloor=(state.speed/stallBase-1)*3.2+state.speed*Math.sin(state.pitch)*.42;
    desired=loadedEnvelope.stalled?Math.min(desired,-loadedEnvelope.sink):Math.max(desired,liftFloor);
    const load=1/Math.max(.35,Math.cos(state.bank));
    state.speed*=Math.exp(-((load-1)*.35+Math.abs(Math.sin(state.pitch))*.08)*dt);
  }
  if(ability('soar')&&air)desired+=3.9;
  if(ability('glide')&&air&&state.throttle<.45)desired=Math.max(-1.4,desired);
  state.vertical+=((air||desired>0?desired:0)-state.vertical)*Math.min(1,dt*(air?2.3:5.0));
  let y=Math.min(395,state.altitude+state.vertical*dt);
  state.vx=Math.sin(state.heading)*state.speed*Math.cos(state.pitch);state.vz=-Math.cos(state.heading)*state.speed*Math.cos(state.pitch);
  const x=state.x+state.vx*dt,z=state.z+state.vz*dt;
  if(solidHit(x,z,y+1.05,air?2.7:2.35)){
    if(air||state.speed>14){flightCrash('Collision with a building',x,z,y,false);return}
    state.speed=0;return;
  }
  if(y<=0&&air){
    const wet=!solidLand(x,z);
    const floats=wet&&ability('floats')&&state.speed<45&&state.vertical>-5&&Math.abs(state.bank)<.28;
    if(wet&&!floats||state.speed>47||state.vertical<-7||Math.abs(state.bank)>.42){flightCrash(wet?'Water impact':'Hard landing',x,z,y,wet);return}
    state.waterLanding=floats;
    state.vertical=0;state.bank=0;state.pitch=0;state.throttle=0;
    state.flightNotice='Touchdown';state.noticeTime=4.2;
  }
  if(y<=0&&!solidLand(x,z)&&!state.waterLanding){flightCrash('Water impact',x,z,y,true);return}
  if(solidLand(x,z))state.waterLanding=false;
  state.x=x;state.z=z;state.altitude=Math.max(0,y);state.airborne=y>.025||(air&&y>0);
}
function updateWalk(dt){
  const {x,z}=state;
  const wet=!indoor&&!solidLand(x,z)&&dockHeight(x,z)===null;
  if(state.jump>0||jumpVelocity>0){
    jumpVelocity-=13.3*dt;state.jump=Math.max(0,state.jump+jumpVelocity*dt);
    if(state.jump===0)jumpVelocity=0;
  }
  const axes=Number(action('KeyW','ArrowUp'))-Number(action('KeyS','ArrowDown'));
  const steer=Number(action('KeyD','ArrowRight'))-Number(action('KeyA','ArrowLeft'));
  state.heading=(state.heading+steer*dt*(wet?1.87:2.6))%(Math.PI*2);
  const m=wet?(state.fins?3.40:2.42):shift()?7.25:4.60;
  const aim=axes*m*(axes<0?.60:1);
  state.speed+=(aim-state.speed)*Math.min(1,dt*10.8);
  const sx=Math.sin(state.heading)*state.speed*dt,sz=(-Math.cos(state.heading)*state.speed+(indoor?.belt?.(x,z)??0)*2.2)*dt;
  const blocked=(a,b)=>{
    if(indoor)return Math.abs(a)>indoor.w-.30||Math.abs(b)>indoor.d-.24||indoor.blocked?.(a,b)||state.jump<.78&&indoor.points.some(p=>Math.abs(a-p.x)<p.w+.20&&Math.abs(b-p.z)<p.d+.20);
    const fence=a>15.94&&a<16.77&&b>=-167&&b<119&&!beachAccess(b)&&Math.abs(b-69)>2.2&&!highwayAt(a,b);
    return fence&&state.jump<.98||solidHit(a,b,.5+state.jump,.32);
  };
  if(!blocked(x+sx,z))state.x+=sx;
  if(!blocked(state.x,z+sz))state.z+=sz;
  state.swimming=!indoor&&!solidLand(state.x,state.z)&&dockHeight(state.x,state.z)===null;
  if(state.swimming){state.jump=0;jumpVelocity=0}
}
function jump(){
  if(!walking()||state.swimming||state.phase!=='running'||state.dialogue||mobility.panel()||mobility.ride()||state.jump>0||jumpVelocity>0)return;
  jumpVelocity=5.5;playChime(290);
}
function special(){
  if(!prototypeIds.includes(state.vehicle)||state.phase!=='running'||mobility.ride()||mobility.panel())return;
  if(state.abilityCool>0){social.notice('Prototype is still recharging.');return}
  const p=variant(state.vehicle),special=p?.ability;
  state.ability=p?({floats:24,deep:14,dive:9,glide:9,steady:10,hold:7,short:12,'ferryfoil':7,'ferry-stabilize':8,'current-anchor':7,'bus-turbo':5.5,'taxi-sprint':5.5}[special]??5.2):state.vehicle==='jet'?2.6:state.vehicle==='gravity'?4.8:5.7;
  state.abilityCool=state.ability+6;
  if(special==='scan'||special==='station'){
    const type=special==='scan'?'ferry':'rail';
    const found=stops.filter(s=>s.type===type).sort((a,b)=>Math.hypot(a.x-state.x,a.z-state.z)-Math.hypot(b.x-state.x,b.z-state.z))[0];
    if(found)mobility.mark(found);
  }
  playChime(180);social.notice(p?p.info.replace(' Press H to activate.',''):state.vehicle==='jet'?'Jet boost':state.vehicle==='gravity'?'Gravity field active':'Skylift foils raised');
}
function updateBoat(dt){
  const p=variant(state.vehicle),racing=modelOf(state.vehicle)!=='yacht',sub=modelOf(state.vehicle)==='sub',forward=action('KeyW','ArrowUp'),reverse=action('KeyS','ArrowDown'),
    anchored=ability('current-anchor'),brake=action('Space')||ability('hold')||anchored;
  const steer=mobility.assist()?0:Number(action('KeyD','ArrowRight'))-Number(action('KeyA','ArrowLeft'));
  const fx=Math.sin(state.heading),fz=-Math.cos(state.heading),sx=Math.cos(state.heading),sz=Math.sin(state.heading);
  const waveAlong=(waveHeight(state.x+fx*2,state.z+fz*2,simTime)-waveHeight(state.x-fx*2,state.z-fz*2,simTime))*.25;
  const waveAcross=(waveHeight(state.x+sx*2,state.z+sz*2,simTime)-waveHeight(state.x-sx*2,state.z-sz*2,simTime))*.25;
  const foil=state.vehicle==='hydro'&&state.ability>0;
  const steady=ability('steady')||ability('ferry-stabilize');
  const acceleration=(sub?2.2:state.vehicle==='yacht'?3.2:p?.family==='ferry'?3.8:5.4)*(p?.power??1)*
    (ability('skim')?1.55:ability('ferryfoil')?1.18:1);
  const maxSpeed=(sub?8:state.vehicle==='yacht'?13:p?.family==='ferry'?16:foil?27:22)*(p?.power??1)*
    (ability('skim')?1.12:ability('ferryfoil')?1.25:1);
  const rudder=ability('rudder')||ability('dock-rudder')||ability('ferry-turn')?1.55:1;
  const motion=stepWatercraft(state,{throttle:forward,reverse,brake,steer,acceleration,
    reverseAcceleration:sub?1.2:2.1,brakeAcceleration:anchored?17:ability('hold')?13:7.5,
    maxSpeed,reverseLimit:sub?2.2:racing?4.5:3.4,
    steerRate:(racing?.84:.58)*(p?.steer??1),rudder,waveAlong:steady?0:waveAlong,waveAcross:steady?0:waveAcross,time:simTime},dt);
  const {x,z}=motion;
  state.depth=sub?state.depth+((ability('deep')?7:ability('dive')?3.1:0)-state.depth)*Math.min(1,dt*1.7):0;
  state.steer+=(steer-state.steer)*dt*5.8;
  if(foil?!solidHit(x,z,3.4,.9):x>32.5&&!solidLand(x,z)&&dockHeight(x,z)===null)Object.assign(state,motion);
  else{state.speed*=-.31;state.vx*=-.31;state.vz*=-.31;if(state.hit===0){state.hit=.80;social.notice('Shallow water or dock ahead.')}}
  const targetY=waveHeight(state.x,state.z,simTime),buoyancy=(targetY-state.waterY)*8.5-state.waterVertical*5.3;
  state.waterVertical+=buoyancy*dt;state.waterY+=state.waterVertical*dt;
}
function updateTrain(dt){
  const p=variant(state.vehicle),forward=action('KeyW','ArrowUp'),reverse=action('KeyS','ArrowDown'),
    metroRegen=ability('metro-regen'),brake=action('Space')||ability('regen')||metroRegen&&!forward;
  const force=brake?-Math.sign(state.speed)*(ability('regen')?34:metroRegen?29:22):forward?(state.speed<0?12:7.7)*(p?.power??1)*(ability('rail-sprint')?1.9:ability('climb')&&state.railY<-1?1.65:1):reverse?(state.speed>.15?-12:-4):0;
  const raw=state.speed+force*dt;
  state.speed=brake&&Math.sign(raw)!==Math.sign(state.speed)?0:minmax(raw*(1-dt*.095),ability('shunt')?-3:-14,ability('shunt')?8:39*(p?.power??1)*(ability('rail-sprint')?1.19:1));
  state.track=minmax(state.track+state.speed*dt,0,railLength);
  if((state.track<=.001&&state.speed<0)||(state.track>=railLength-.001&&state.speed>0))state.speed=0;
  const pos=railAt(state.track);
  Object.assign(state,{x:pos.x,z:pos.z,heading:pos.heading,railY:pos.y});
}
function update(dt){
  simTime+=dt;
  initTraffic(dt);
  indoor?.step?.(simTime);
  if(!indoor)world.stream.sync(state.x,state.z,flying());
  world.wreck.step(dt);
  mobility.update(dt,simTime,world.arch);
  if(mobility.cutscene())return;
  combat.step(dt);
  if(state.messageTime>0)state.messageTime=Math.max(0,state.messageTime-dt);
  if(state.phase==='crashed'){state.altitude=Math.max(0,state.altitude-dt*(7+state.altitude*.58));return}
  if(state.phase!=='running'||mobility.ride()||mobility.panel())return;
  state.elapsed+=dt;state.hit=Math.max(0,state.hit-dt);
  if(state.dialogue){state.speed=0;return}
  const before=state.ability;
  state.ability=Math.max(0,state.ability-dt);state.abilityCool=Math.max(0,state.abilityCool-dt);
  if(before>0&&!state.ability&&((state.vehicle==='hydro'&&solidLand(state.x,state.z))||(state.vehicle==='gravity'&&!drivable(state.x,state.z)))){
    const [x,z]=swapLocation(state.vehicle,state.x,state.z,state.heading,state.vehicle);state.x=x;state.z=z;state.speed=0;snap=true;
  }
  if(flying()){
    updatePlane(dt);
    if(state.hijackedAirliner&&state.phase==='running'){
      state.hijackTime+=dt;state.hijackBountyTick+=dt;
      while(state.hijackBountyTick>=5){state.hijackBountyTick-=5;mobility.airPiracyTick()}
      world.airDefense.step(dt,state.hijackTime,state,()=>flightCrash('Anti-aircraft hit',state.x,state.z,state.altitude,false));
    }
    return;
  }
  if(walking()){updateWalk(dt);return}
  if(boating()){updateBoat(dt);return}
  if(rail()){updateTrain(dt);return}
  if(state.mode==='delivery'){
    state.time=Math.max(0,state.time-dt);
    if(state.time<=0){complete(false);return}
  }
  const accelerating=action('KeyW','ArrowUp'),braking=action('KeyS','ArrowDown'),
    drift=action('Space')||ability('slip')||ability('race-drift')||ability('taxi-drift');
  const steer=Number(action('KeyD','ArrowRight'))-Number(action('KeyA','ArrowLeft'));
  const onRoad=roadSurface(state.x,state.z);
  const mod=variant(state.vehicle),roughGrip=['terrain-lock','scrambler-grip','sand-skim','bus-allterrain'].some(id=>ability(id)),
    taxiBoost=ability('taxi-sprint')&&accelerating,busBoost=ability('bus-turbo')&&accelerating&&onRoad&&Math.abs(steer)<.22,
    cornerBoost=accelerating&&(ability('passing-burst')&&Math.abs(steer)>.18||ability('corner-launch')&&Math.abs(steer)<.42&&Math.abs(state.steer)>.32),
    ratio=(mod?.power??(state.vehicle==='sport'||state.vehicle==='gravity'?1.23:state.vehicle==='van'?.72:1))*
      (state.vehicle==='jet'&&state.ability>0?1.60:1)*(taxiBoost?1.24:1)*(busBoost?1.18:1)*(cornerBoost?1.20:1)*
      (.52+.48*(state.vehicleHealth??vehicleMaxHealth(state.vehicle))/vehicleMaxHealth(state.vehicle));
  state.speed=core.longitudinal(state.speed/ratio,+accelerating,+braking,+action('Space'),onRoad||ability('grip')||roughGrip?1:.56,dt*(state.vehicle==='van'?.86:1))*ratio;
  if(ability('launch')&&accelerating&&state.speed<12)state.speed+=dt*8;
  if(ability('anchor')&&braking&&state.speed>0)state.speed=Math.max(0,state.speed-dt*14);
  if(ability('bus-airbrake')&&(braking||action('Space'))&&state.speed>0)state.speed=Math.max(0,state.speed-dt*19);
  if(ability('rescue-brake')&&(braking||action('Space'))&&state.speed>0)state.speed=Math.max(0,state.speed-dt*12);
  if(state.vehicle==='jet'&&state.ability>0&&!braking&&!drift)state.speed=Math.min(67,state.speed+dt*15);
  const turnBoost=ability('cornering')?1.28:ability('taxi-evasion')?1.25:ability('bank')?1.40:1;
  const damageHandling=.55+.45*(state.vehicleHealth??vehicleMaxHealth(state.vehicle))/vehicleMaxHealth(state.vehicle);
  state.heading=(state.heading+core.yaw_rate(state.speed,steer,+drift)*dt*(mod?.steer??(state.vehicle==='van'?.70:state.vehicle==='sport'?1.12:1))*turnBoost*damageHandling*
    (ability('race-drift')&&drift?1.18:ability('taxi-drift')&&drift?1.32:1))%(Math.PI*2);
  state.steer+=(steer-state.steer)*Math.min(1,dt*10);
  const traction=Math.min(1,core.grip(state.speed,+drift,dt)*(ability('grip')?1.55:roughGrip?1.42:ability('cornering')&&steer?1.18:1));
  state.vx+=(Math.sin(state.heading)*state.speed-state.vx)*traction;
  state.vz+=(-Math.cos(state.heading)*state.speed-state.vz)*traction;
  const oldX=state.x,oldZ=state.z,x=state.x+state.vx*dt,z=state.z+state.vz*dt,impactSpeed=Math.hypot(state.vx,state.vz),prop=streetPropAt(x,z);
  if(!invalid(x,z)&&!prop){state.x=x;state.z=z}
  else{
    if(!prop&&!invalid(x,state.z))state.x=x;
    if(!prop&&!invalid(state.x,z))state.z=z;
    if(Math.abs(state.speed)>2.5&&state.hit===0){
      state.hits++;state.hit=.72;
      const other=trafficAt(x,z);
      if(other)mobility.collision(other,Math.abs(state.speed),accelerating);
      if(prop){prop.vx+=state.vx*.48;prop.vz+=state.vz*.48;prop.vy=Math.max(prop.vy,2.4)}
      if(damageVehicle(impactSpeed,other?'Traffic collision':prop?'Street-object collision':'Building collision'))return;
    }
    state.speed*=ability('buffer')?0:ability('impact-cushion')?-.08:ability('taxi-evasion')?-.14:-.24;state.vx*=.16;state.vz*=.16;
  }
  if(!indoor&&!(state.vehicle==='gravity'&&state.ability>0)){
    const along=Math.sign(state.speed||1)*(modelOf(state.vehicle)==='bike'?.80:1.32),dx=Math.sin(state.heading)*along,dz=-Math.cos(state.heading)*along;
    if(combat.vehicle(oldX+dx,oldZ+dz,state.x+dx,state.z+dz,impactSpeed,modelOf(state.vehicle)==='bike'?.77:1.20)){
      const impactFactor=ability('taxi-evasion')?.50:ability('impact-cushion')?.62:.78;
      state.speed*=impactFactor;state.vx*=impactFactor;state.vz*=impactFactor;
    }
  }
  mobility.runSignals(simTime,dt,world,oldX,oldZ);
  const next=target();
  if(next&&Math.hypot(next[0]-state.x,next[1]-state.z)<5.05){
    state.checkpoint++;
    if(!target()){complete(true);return}
    refresh();
  }
}
function draw(dt,now){
  const {x,z,heading,steer,speed}=state, sin=Math.sin(heading), cos=Math.cos(heading);
  const ride=mobility.ride(), inCab=mobility.cockpit(), passenger=!!ride&&cabinService(ride.type)&&!ride.pilotControl, model=modelOf(state.vehicle), parkedModel=modelOf(lastMount?.id);
  const roadLift=state.vehicle==='gravity'&&state.ability>0?2.15+.13*Math.sin(simTime*4):0;
  const a=prefersReduced?0:Math.abs(speed)*.0007;
  for(const [id,{car,wheels}] of Object.entries(world.cars)){
    const active=!ride&&!variant(state.vehicle)&&model===id, parked=!ride&&!variant(lastMount?.id)&&!indoor&&walking()&&parkedModel===id;
    car.visible=parked||(active&&state.camera!==1);
    if(!car.visible)continue;
    const [cx,cz,cyaw]=active?[x,z,heading]:lastMount.coords;
    vehiclePaint(car,variant(active?state.vehicle:lastMount.id)?.color);
    car.position.set(cx,.035+Math.sin(now*.018)*a+(active?roadLift:0),cz);car.rotation.set(0,-cyaw,active?-steer*Math.min(id==='bike'?.28:.06,Math.abs(speed)*(id==='bike'?.019:.003)):0,'YZX');
    for(const w of wheels){w.mount.rotation.y=active&&w.front?-steer*.30:0;if(active&&id!=='bike'&&id!=='rover')w.mount.rotation.x-=speed*dt/.37}
  }
  for(const [id,{model:vehicle,kind,propellers}] of Object.entries(world.extras.fleetModels)){
    if(kind==='rail')continue;
    const p=variant(id),active=!ride&&state.vehicle===id,parked=!ride&&!indoor&&walking()&&lastMount?.id===id;
    const passengerRide=ride?.pack?.vehicleId===id;
    vehicle.visible=(active&&state.camera!==1)||(parked&&state.camera!==1)||(passengerRide&&!inCab);
    if(!vehicle.visible)continue;
    const pose=active?{x,z,heading}:parked?{x:lastMount.coords[0],z:lastMount.coords[1],heading:lastMount.coords[2]}:ride.pose;
    const {x:vx,z:vz,heading:vh}=pose;
    const isWater=kind==='boat',isAir=kind==='air';
    const abilityOn=active&&state.ability>0;
    const steady=abilityOn&&['steady','ferry-stabilize'].includes(p.ability);
    const submerge=isWater&&p.chassis==='sub'?(active?state.depth:0):0;
    const y=isWater?(steady?-.13:active?state.waterY:waveHeight(vx,vz,simTime))-submerge+(abilityOn&&p.ability==='ferryfoil'?1.25:0):isAir?state.altitude+.025:active?roadLift+.035:.035;
    vehiclePaint(vehicle,p.color);
    vehicle.position.set(vx,y,vz);
    const wavePitch=(waveHeight(vx,vz+2,simTime)-waveHeight(vx,vz-2,simTime))*.28;
    const waveRoll=(waveHeight(vx+1.5,vz,simTime)-waveHeight(vx-1.5,vz,simTime))*.34;
    vehicle.rotation.set(isAir&&active?state.pitch:isWater?(steady?0:wavePitch):0,
      -vh,isAir&&active?-state.bank:isWater?(steady?0:waveRoll-(active?state.steer*Math.min(.12,Math.abs(state.speed)*.006):0)):active?-steer*Math.min(.10,Math.abs(speed)*.003):0,'YXZ');
    for(const prop of propellers)prop.rotation.z+=dt*(2.5+(active?state.throttle:0)*68);
  }
  world.extras.rider.visible=model==='bike';
  const {mesh,prop}=world.aircraft,alt=state.altitude;
  const parkedPlane=walking()&&isAir(lastMount?.id)&&!variant(lastMount?.id),variantPlane=variant(state.vehicle)?.kind==='air';
  mesh.visible=(flying()&&!variantPlane&&!state.hijackedAirliner&&state.phase!=='crashed'&&state.camera!==1&&!inCab)||(!indoor&&parkedPlane&&!ride);
  const aircraftId=parkedPlane?lastMount.id:state.vehicle, floats=modelOf(aircraftId)==='float';
  if(mesh.visible){vehiclePaint(mesh,variant(aircraftId)?.color);mesh.scale.set(aircraftId==='thermal'?1.28:aircraftId==='sprintjet'?.86:1,1,aircraftId==='trimotor'?1.25:1)}
  for(const o of world.extras.floats.values())o.visible=floats;
  if(parkedPlane)mesh.position.set(lastMount.coords[0],.025,lastMount.coords[1]);
  else mesh.position.set(x,alt+.025,z);
  mesh.rotation.set(state.pitch,-(parkedPlane?lastMount.coords[2]:heading),-state.bank,'YXZ');
  prop.rotation.z+=dt*(3+state.throttle*73);
  const {life}=world,t=simTime;
  const pier=walking()&&!indoor?dockHeight(x,z):null;
  const footY=state.swimming?waveHeight(x,z,t)-.61:(pier??.065)+state.jump;
  const pedestrian=indoor?.player??life.player;
  life.player.model.visible=walking()&&!indoor&&state.camera!==1&&!ride;
  if(walking()&&!ride){
    pedestrian.model.visible=state.camera!==1;
    pedestrian.model.position.set(x,indoor?.scene?state.jump:footY,z);
    pedestrian.model.rotation.set(state.swimming?-1.07:0,-heading,0,'YXZ');
    animatePerson(pedestrian,t,speed,state.swimming);
    if(combat.striking())pedestrian.limbs[1].arm.rotation.x=-1.47;
    combat.drawWeapon(pedestrian);
  }
  for(const n of life.npcs){
    if(indoor||n.model.userData.inCombat||Math.hypot(n.x-x,n.z-z)>38)continue;
    if(state.dialogue?.name===n.name)n.model.rotation.y=Math.atan2(x-n.x,z-n.z)+Math.PI;
    animatePerson(n,t,0);
  }
  for(const p of life.beachItems){p.model.visible=state.job==='cleanup'&&!social.picked.has(p.id);p.model.rotation.y+=dt*.84}
  for(const [id,craft] of Object.entries(life.craft)){
    if(id==='hydro'&&!state.owned.includes(id)){craft.visible=false;continue}
    const active=!variant(state.vehicle)&&model===id,parked=walking()&&!variant(lastMount?.id)&&!indoor&&parkedModel===id&&isSea(lastMount?.id);
    if(id==='sub'&&!active&&!parked){craft.visible=false;continue}
    const [bx,bz,byaw]=active?[x,z,heading]:parked?lastMount.coords:boatParking[id];
    craft.visible=!active||state.camera!==1&&!inCab;
    const steady=active&&(ability('steady')||ability('ferry-stabilize')),y=(steady?-.13:active?state.waterY:waveHeight(bx,bz,t))+(active?(id==='hydro'&&state.ability>0?3.3:0)-state.depth:0);
    const pitch=steady?0:(waveHeight(bx,bz+2,t)-waveHeight(bx,bz-2,t))*.28;
    vehiclePaint(craft,variant(active?state.vehicle:parked?lastMount.id:null)?.color);
    craft.position.set(bx,y,bz);
    craft.rotation.set(pitch+(active?Math.min(.12,Math.abs(speed)*.003):0),-byaw,
      (steady?0:(waveHeight(bx+1.5,bz,t)-waveHeight(bx-1.5,bz,t))*.34)-(active?state.steer*Math.min(.12,Math.abs(speed)*.006):0),'YXZ');
  }
  drawTransitModels(ride,inCab,t);
  paintWake(life,boating()&&state.depth<1?model:state.swimming?'swim':null,x,z,heading,speed,t);
  world.playerShadow.visible=!ride&&!rail()&&state.camera!==1&&!boating()&&!state.swimming&&!indoor&&state.phase!=='crashed'&&(!flying()||alt<15);
  world.playerShadow.scale.set(flying()?8.6:walking()?1.65:4.1,1,flying()?7.7:walking()?1.9:6.6);
  world.playerShadow.material.opacity=flying()?minmax(1-alt/15,0,1):1;
  world.playerShadow.position.x=x;world.playerShadow.position.z=z+.22;world.playerShadow.rotation.y=-heading;
  const mobile=viewport.clientWidth<540;
  if(inCab&&(ride||rail()||flying()||boating())){
    const rideY=ride?.pose?.y, base=rideY??(rail()?state.railY:boating()?(ability('steady')||ability('ferry-stabilize')?-.13:state.waterY)+(state.vehicle==='hydro'&&state.ability>0?3.3:0)-state.depth:alt);
    const isAir=flying()||ride?.type==='airport',isTrain=rail()||ride?.type==='rail';
    const front=ride?.type==='airport'?ride.pilotControl?10.4:5.95:ride?.type==='ferry'?3.75:isTrain?3.12:ride?.type==='bus'?3.55:flying()?.81:.74;
    const y=base+(isAir?2.2:isTrain?2.28:model==='yacht'||ride?.type==='ferry'?2.62:ride?.type==='bus'?2.23:1.48);
    const seat=passenger?[-.22,.06,.20][cabinLevel(ride.cls)]:0;
    cameraTarget.set(x+sin*front+cos*seat,y,z-cos*front+sin*seat);
    const yaw=heading+mobility.trim();
    lookAt.set(x+Math.sin(yaw)*40,y+(flying()?state.pitch*24:0),z-Math.cos(yaw)*40);
  }else if(ride||rail()){
    const pose=ride?.pose??{y:state.railY,heading};
    const y=pose.y;
    const tunnel=(rail()||ride?.type==='rail')&&y<-2.1;
    if(tunnel||rail()&&state.camera===1){
      cameraTarget.set(x+sin*3.45,y+2.12,z-cos*3.45);lookAt.set(x+sin*18,y+1.76,z-cos*18);
    }else{
      const isAir=ride?.type==='airport',base=isAir?27:ride?.type==='ferry'?19:13.5,up=rail()&&state.camera===2?23:isAir?9:6;
      cameraTarget.set(x-sin*base+cos*.8,y+up,z+cos*base+sin*.8);lookAt.set(x+sin*11,y+1.6,z-cos*11);
    }
  }else if(state.phase==='crashed'){
    const center=state.crash?.aircraft?world.wreck.center():null;
    const cx=center?.x??x,cz=center?.z??z,cy=Math.max(0,center?.y??alt);
    cameraTarget.set(cx-sin*11+cos*5.2,cy+6.8,cz+cos*11+sin*5.2);
    lookAt.set(cx,cy+.43,cz-.9);
  }else if(walking()){
    if(state.camera===1){
      cameraTarget.set(x+sin*.33,footY+(state.swimming?.83:1.62),z-cos*.33);
      lookAt.set(x+sin*4.5,footY+(state.swimming?.70:1.48),z-cos*4.5);
    }else if(state.camera===2){
      cameraTarget.set(x-sin*4,footY+(indoor?10:14),z+cos*4);lookAt.set(x+sin*1.5,footY,z-cos*1.5);
    }else{
      const back=indoor?4.6:mobile?6.4:5.6;
      cameraTarget.set(x-sin*back+cos*1.16,footY+(indoor?5.25:3.52),z+cos*back+sin*1.16);
      lookAt.set(x+sin*3.1,footY+1.22,z-cos*3.1);
    }
  }else if(boating()){
    const yacht=model==='yacht',back=yacht?17:model==='sub'?7.6:11.3,lift=(state.vehicle==='hydro'&&state.ability>0?3.3:0)-state.depth;
    if(state.camera===1){cameraTarget.set(x+sin*.25,(yacht?2.7:1.48)+lift,z-cos*.25);lookAt.set(x+sin*26,1.70+lift,z-cos*26)}
    else if(state.camera===2){cameraTarget.set(x-sin*8,(yacht?27:22)+lift,z+cos*8);lookAt.set(x+sin*3,lift,z-cos*3)}
    else{cameraTarget.set(x-sin*back+cos*.8,(yacht?6.8:model==='sub'&&state.depth>1?1.52:4.5)+lift,z+cos*back+sin*.8);lookAt.set(x+sin*(model==='sub'?7:14),1.45+lift,z-cos*(model==='sub'?7:14))}
  }else if(flying()&&state.camera===0){
    const back=mobile?21:17.2;
    cameraTarget.set(x-sin*back+cos*.8,alt+6.1+Math.abs(speed)*.023,z+cos*back+sin*.8);
    lookAt.set(x+sin*24,alt+1.8+state.pitch*10-Math.min(5,alt*.07),z-cos*24);
  }else if(flying()&&state.camera===1){
    cameraTarget.set(x+sin*.64,alt+2.12,z-cos*.64);
    lookAt.set(x+sin*35,alt+2.12+state.pitch*28,z-cos*35);
  }else if(flying()){
    cameraTarget.set(x-sin*25,alt+53,z+cos*25);lookAt.set(x+sin*16,alt-10,z-cos*16);
  }else if(state.camera===0){const back=mobile?11.6:9.65;
    cameraTarget.set(x-sin*back+cos*.9,4.65+Math.abs(speed)*.024,z+cos*back+sin*.9);lookAt.set(x+sin*13,2.07,z-cos*13);
  }else if(state.camera===1){cameraTarget.set(x+sin*.95,1.61,z-cos*.95);lookAt.set(x+sin*28,2.3,z-cos*28)}
  else {cameraTarget.set(x-sin*8,26,z+cos*8);lookAt.set(x+sin*3,0,z-cos*3)}
  const lerp=snap||inCab||state.camera===1?1:1-Math.exp(-dt*5.7);
  camera.position.lerp(cameraTarget,lerp);currentLook.lerp(lookAt,lerp);camera.lookAt(currentLook);snap=false;
  world.cab.visible=inCab&&!passenger;
  world.passengerCabins.draw(ride?.type,ride?cabinLevel(ride.cls):0,inCab&&passenger);
  if(inCab&&!passenger)world.cab.children[1].material.color.set(mobility.lamp()?'#84d6ab':'#476266');
  const underwater=camera.position.y<-.6&&((boating()&&state.depth>1.45)||((rail()||ride?.type==='rail')&&x>31&&x<237&&state.railY<-4));
  viewport.classList.toggle('submerged',underwater);
  world.sky.visible=!underwater;
  world.extras.shoal.visible=underwater;
  world.scene.background=underwater?world.waterBackground:null;
  world.scene.fog.color.set(underwater?'#348295':'#ae8991');
  world.scene.fog.density=underwater?.019:.0043;
  if(indoor?.exitDoor)indoor.exitDoor.visible=camera.position.z<indoor.d+.03;
  indoor?.frame?.(camera.position.x,camera.position.z);
  world.sky.position.copy(camera.position);
  world.ocean.material.uniforms.clock.value=t;
  const waypoint=target();world.gate.visible=!!waypoint&&state.phase==='running';
  if(world.gate.visible){
    const [tx,tz]=waypoint;world.gate.position.set(tx,0,tz);world.gate.rotation.y=Math.atan2(camera.position.x-tx,camera.position.z-tz);
    world.beacon.position.y=7.15+(prefersReduced?0:Math.sin(now*.003)*.34);world.beacon.rotation.y=now*.0012;
    world.ring.material.color.set(state.mode==='delivery'?'#ffc78c':'#85f8d3');
    world.circle.material.color.copy(world.ring.material.color);
  }
  renderer.render(indoor?.scene??world.scene,camera);
  if(now-lastPaint>80){refresh();lastPaint=now}
  if(audio&&audio.state==='running'){
    const hz=flying()?28+state.throttle*81:38+Math.abs(speed)*2.75;
    osc.frequency.setTargetAtTime(hz,audio.currentTime,.12);
    harmonic.frequency.setTargetAtTime(hz*(flying()?1.5:1.985),audio.currentTime,.12);
    volume.gain.setTargetAtTime(sounded&&state.phase==='running'&&!walking()?(flying()?.012+state.throttle*.04:.018+Math.abs(speed)*.00057):0,audio.currentTime,.095);
  }
  perfFrames++;
  if(now-perfStart>=1100){
    const fps=Math.round(perfFrames*1000/(now-perfStart));
    $('perf').textContent=manual?'WEBGL':`${fps} FPS`;
    if(!manual&&fps<28&&scale>.68){scale=Math.max(.68,scale-.12);resize()}
    perfStart=now;perfFrames=0;
  }
}
function drawTransitModels(ride,cab,t){
  const {arch}=world;
  const pose=(g,p)=>{g.position.set(p.x,p.y+.04,p.z);g.rotation.y=-p.heading};
  const manual=rail()&&!variant(state.vehicle), offset=9.2;
  const parked=isRail(lastMount?.id)&&!variant(lastMount?.id),paint=variant(manual?state.vehicle:lastMount?.id);
  arch.train.front.visible=(manual||parked)&&!ride&&!(manual&&(cab||state.camera===1||state.railY<-2));
  arch.train.back.visible=(manual||parked)&&!ride;
  if(manual||parked){
    vehiclePaint(arch.train.front,paint?.color);
    const tram=paint?.chassis==='tram';arch.train.front.scale.set(tram?.9:1,tram?.91:1,tram?1.14:1);
    const t=manual?state.track:nearestRail(lastMount.coords[0],lastMount.coords[1]).track;
    pose(arch.train.front,railAt(t));pose(arch.train.back,railAt(t-offset));
    if(t<4.5||tram)arch.train.back.visible=false;
  }
  const line=(t*.018)%2, schedule=line<1?line:2-line;
  const metro=ride?.type==='rail'||!ride&&!manual&&state.phase==='running',route=ride?.line??'below',length=railRouteLength(route);
  arch.metro.front.visible=metro&&!(ride?.type==='rail'&&(cab||ride.pose.y<-2));
  arch.metro.back.visible=metro;
  if(metro){
    const passenger=ride?.type==='rail',k=passenger?ride.from+(ride.to-ride.from)*ride.time/ride.duration:18+schedule*(length-31),
      sign=passenger?Math.sign(ride.to-ride.from):(line<1?1:-1);
    const b=railAt(k-sign*offset,route);
    if(sign<0)b.heading+=Math.PI;
    const front=passenger?ride.pose:railAt(k,route);
    if(!passenger&&sign<0)front.heading+=Math.PI;
    pose(arch.metro.front,front);pose(arch.metro.back,b);
    if(Math.abs(k-(sign<0?length:0))<4.5)arch.metro.back.visible=false;
  }
  const railVariant=variant(state.vehicle)?.kind==='rail'?state.vehicle:walking()&&variant(lastMount?.id)?.kind==='rail'?lastMount.id:null;
  if(railVariant){
    const item=world.extras.fleetModels[railVariant],active=rail()&&state.vehicle===railVariant,parked=walking()&&lastMount?.id===railVariant&&!indoor;
    const model=variant(railVariant),track=active?state.track:nearestRail(lastMount.coords[0],lastMount.coords[1]).track;
    const front=railAt(track),back=railAt(track-offset);
    vehiclePaint(item.model,model.color);if(item.back)vehiclePaint(item.back,model.color);
    item.model.visible=active&&!cab&&state.camera!==1&&state.railY>=-2||parked&&state.camera!==1;
    if(item.back)item.back.visible=(active&&!cab&&state.camera!==1||parked&&state.camera!==1)&&track>=4.5&&model.chassis!=='tram';
    pose(item.model,front);if(item.back)pose(item.back,back);
  }
  for(const id of ['bus','taxi','ferry','airport']){
    const m=arch.vehicleModels[id], active=ride?.type===id;
    const hijacked=id==='airport'&&state.hijackedAirliner;
    const idle=id==='ferry'&&state.x<65&&Math.abs(state.z-70)<125||id==='bus'&&state.x<42&&Math.abs(state.z-62)<68;
    m.visible=active?(ride?.pack?.vehicleId?false:!cab):hijacked?state.phase!=='crashed':idle;
    if(!m.visible)continue;
    if(active){
      pose(m,ride.pose);
      if(id==='airport'&&ride.pilotControl)m.rotation.set(ride.pilotPitch,-ride.pose.heading,-ride.pilotBank,'YXZ');
    }
    else if(hijacked){m.position.set(state.x,state.altitude+.04,state.z);m.rotation.set(state.pitch,-state.heading,-state.bank,'YXZ')}
    else if(id==='ferry')pose(m,{x:39,z:70,y:waveHeight(39,70,t),heading:Math.PI/2});
    else pose(m,{x:8.1,z:61,y:0,heading:0});
  }
}
function makeCab(){
  const group=new T.Group();camera.add(group);
  const mesh=(x,y,z,w,h,d,c)=>{
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color:c}));m.position.set(x,y,z);group.add(m);return m;
  };
  mesh(0,-.73,-1.53,3.6,.35,.42,'#1a2630');mesh(0,-.54,-1.58,3.5,.029,.35,'#476266');
  mesh(0,.87,-1.65,3.7,.18,.25,'#29343d');
  for(const s of [-1,1]){
    mesh(s*1.34,.13,-1.44,.092,1.55,.12,'#28343b').rotation.z=s*.24;
    mesh(s*.51,-.53,-1.6,.47,.08,.25,'#243f43');
    for(let j=0;j<4;j++)mesh(s*.50+j*.057,-.48,-1.63,.029,.048,.088,j%3===0?'#ecbd82':'#80d4b2');
  }
  return group;
}
function resize(){
  if(!renderer)return;
  const w=viewport.clientWidth,h=viewport.clientHeight||1;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.2)*scale);renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.fov=w<540?64:57;camera.updateProjectionMatrix();snap=true;
}
function loop(now){
  const dt=last?Math.min(.1,(now-last)/1000):step;last=now;
  if(!manual){
    acc+=dt;while(acc>=step){update(step);acc-=step}
    draw(dt,now);
  }
  requestAnimationFrame(loop);
}
window.render_game_to_text=()=>JSON.stringify({...state,coordinates:'+X is east/right; -Z is north; altitude above ground in meters',target:target()??null,
  economy:social.economy(),
  district:insidePlace?['INDOORS',insidePlace.name]:districtAt(...worldPosition()),loadedDistricts:world?.stream.count()??0,mobility:mobility.inspect(),
  combat:combat.inspect(),
  nearbyAction:interactable?.label??null,nearbyBoat:walking()?nearestBoard()?.id??null:null,wreckPieces:world?.wreck.count()??0,
  nearbyStations:!indoor?stops.filter(s=>Math.hypot(s.x-state.x,s.z-state.z)<52).map(({id,x,z,name,type})=>({id,x,z,name,type})):[],
  interactionPoints:walking()?(indoor?indoor.targets.map(({label,type,x,z,action,data})=>({label,type,x,z,action,data:action==='ward-person'?data.name:data})):
    world?nearProperties(state.x,state.z).properties.filter(p=>Math.hypot(p.doorX-state.x,p.doorZ-state.z)<38).map(p=>({label:p.name,type:'door',x:p.doorX,z:p.doorZ})):[]):[],
  controls:flying()?'Hold Up to take off; arrows pitch/bank, W/S or Shift+Up/Down throttle, P cockpit, R recover':
    walking()?'WASD or arrows move, Space jump, E interact, X attack, B switch weapon, Q gadget, T transit atlas':rail()?'Up throttle, Down brake/reverse, Space brake, P cab, G dismount':'WASD or arrows move, Space brake, G exit, V vehicle, H ability',
  speedKmh:Math.round(Math.abs(state.speed)*3.6),cameraName:cameraName()});
window.advanceTime=(ms,paint=true)=>{
  if(!renderer)return;
  manual=true;
  const frames=Math.max(1,Math.round(ms/(step*1000)));
  for(let i=0;i<frames;i++)update(step);
  if(paint){draw(Math.min(.2,frames*step),performance.now());refresh()}
};
const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight']);
addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(state.dialogue){
    const n=Number(e.key);
    if(n>=1&&n<=9&&!e.repeat){e.preventDefault();social.choose(n-1)}
    else if(e.code==='Escape'){e.preventDefault();social.close()}
    return;
  }
  if(mobility.key(e))return;
  if(movement.has(e.code)&&state.phase==='running'){
    if(e.code==='Space'&&e.target instanceof HTMLButtonElement)return;
    if(!e.code.startsWith('Shift'))e.preventDefault();keys.add(e.code);
    if(e.code==='Space'&&!e.repeat)jump();
  }
  if(e.repeat)return;
  switch(e.code){
    case 'KeyC':cycleCamera();break;case 'KeyR':if(state.phase==='running'||state.phase==='crashed')recover();break;
    case 'KeyF':fullscreen();break;case 'KeyM':toggleAudio();break;case 'KeyV':swapVehicle();break;
    case 'KeyE':interact();break;case 'KeyG':changeOnFoot();break;
    case 'KeyQ':if(world)mobility.gadget(world.arch);break;case 'KeyH':special();break;
    case 'KeyX':combat.attack();break;case 'KeyB':combat.cycle();break;
    case 'Escape':if(document.body.classList.contains('expanded'))fullscreen();break;
  }
});
addEventListener('keyup',e=>{keys.delete(e.code);mobility.keyUp(e)});
addEventListener('blur',()=>{keys.clear();touchKeys.clear();mobility.clearFlightInputs()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();touchKeys.clear();mobility.clearFlightInputs()}});
for(const b of buttons)b.addEventListener('click',()=>select(b.dataset.mode));
for(const b of vehicles)b.addEventListener('click',()=>selectVehicle(b.dataset.vehicle));
$('switch-vehicle').addEventListener('click',swapVehicle);
$('walk-toggle').addEventListener('click',()=>changeOnFoot());
$('quick-atlas').addEventListener('click',()=>$('transit-toggle').click());
$('jump-tool').addEventListener('click',()=>{jump();focusView(false)});
$('ability-tool').addEventListener('click',()=>{special();focusView(false)});
$('gadget-tool').addEventListener('click',()=>{if(world)mobility.gadget(world.arch);focusView(false)});
$('attack-tool').addEventListener('click',()=>{combat.attack();focusView(false)});
$('weapon-tool').addEventListener('click',()=>{combat.cycle();focusView(false)});
$('interact').addEventListener('click',()=>{interact();if(!state.dialogue)focusView(false)});
$('crash-walk').addEventListener('click',()=>changeOnFoot(true));$('crash-recover').addEventListener('click',recover);
start.addEventListener('click',begin);mobileStart.addEventListener('click',begin);
$('retry').addEventListener('click',begin);$('back').addEventListener('click',()=>{select(state.mode);start.focus()});
$('camera').addEventListener('click',()=>{cycleCamera();if(state.phase==='running')renderer?.domElement.focus({preventScroll:true})});
$('reset').addEventListener('click',recover);
$('sound').addEventListener('click',toggleAudio);$('fullscreen').addEventListener('click',fullscreen);
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{if(state.phase!=='running')return;e.preventDefault();b.setPointerCapture(e.pointerId);touchKeys.add(b.dataset.key);mobility.flightInput(b.dataset.key,true)});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{touchKeys.delete(b.dataset.key);mobility.flightInput(b.dataset.key,false)});
}
try{
  const {instance}=await WebAssembly.instantiate(Uint8Array.from(atob(wasm),c=>c.charCodeAt(0)));
  core=instance.exports;
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl)throw Error('WebGL 2 is unavailable');
  renderer=new T.WebGLRenderer({canvas,context:gl});
  renderer.setClearColor('#625872');renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Pacifica Bay 3D game canvas');$('world').append(renderer.domElement);
  world=createWorld();world.arch=makeArchipelago(world.scene);world.airDefense=createAirDefense(world.scene);world.traffic.push(...world.arch.traffic);
  world.waterBackground=new T.Color('#275465');world.ocean.material.side=T.DoubleSide;
  world.extras=makeExtraModels(world);
  world.scene.add(camera);world.cab=makeCab();world.cab.visible=false;world.passengerCabins=makePassengerCabins(camera);
  initTraffic(0);world.stream.sync(state.x,state.z,flying(),true);resize();new ResizeObserver(()=>{resize();if(manual)draw(0,performance.now())}).observe(viewport);
  start.disabled=mobileStart.disabled=false;$('load-status').hidden=true;syncSelection();refresh();requestAnimationFrame(loop);
}catch(e){
  renderer=null;$('load-status').querySelector('span').textContent='The 3D view could not start. Try a browser with WebGL 2 enabled.';console.error(e);
}
