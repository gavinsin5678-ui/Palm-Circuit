import {regions,regionAt,stops,stopById,stopTypes,railAt,railStop,railSector,signals,signalAt,solidLand,highwayAt} from './metro-world.js?v=walkable-transit-v2';
import {createSportsMatch,sportModes} from './sports.js?v=gameplay-overhaul';
import {animatePerson} from './life-world.js?v=articulated-physics';
import {hasVenue,venueFor} from './terminal-world.js?v=walkable-transit-v2';
import {seats,cabinLevel,cabinService,cabinTitle} from './cabin.js?v=terminal';
import {fleetProducts,aircraft} from './fleet.js?v=road-dynamics';
import {weapons} from './combat.js?v=ragdoll-physics';
import {flightEnvelope,coordinatedTurnRate} from './vehicle-physics.js?v=suspension-model';

const $=id=>document.getElementById(id),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fareRates={rail:9,bus:5,taxi:16,ferry:22,airport:38};
const commuterTypes=['bus','taxi','ferry'];
const care=[
  ['Warm blankets','A nurse is restocking the observation area. Deliver folded blankets to the waiting bays.','Bring the blankets','$18 volunteer stipend'],
  ['Lost wristband','A visitor found a patient’s lost wristband. Return it to the coordinator for safekeeping.','Return the wristband','Up to −$35 bounty or $12'],
  ['Family update','A family is waiting to find the care desk. Guide them there so staff can help.','Walk them to reception','$27 volunteer stipend']
];
const vehicleLabels={rail:'Metro / Coastal Rail',bus:'Pacifica Link Bus',taxi:'Metered Taxi',ferry:'Island Ferry',airport:'Pacifica Air'};
const charges={fare:[9,'Unpaid fare'],red:[14,'Red-light violation'],theft:[34,'Property theft'],crash:[26,'Traffic collision'],major:[86,'Dangerous collision'],reckless:[120,'High-speed crossing hazard'],pulse:[18,'Unlicensed pulse discharge']};
export const gadgets={
  jet:{price:115,name:'Jet Roadster',info:'A brief burst of straight-line acceleration. H engages the boost.'},
  gravity:{price:145,name:'Gravity Coupe',info:'H engages a low hover and lets the coupe glide over roadside obstacles.'},
  hydro:{price:130,name:'Skylift',info:'A hydrofoil boat that lifts clear of the water and glides over short land gaps with H.'},
  pulse:{price:55,name:'Pulse Disc',info:'Q nudges test crates with a visible shockwave. Keep it inside the marked garage test yard.'},
  bubble:{price:70,name:'Bubble Buoy',info:'Floats test crates briefly before dropping them.',fx:[8,1.7,8.3,'#9cefff']},
  tug:{price:28,name:'Magnet Kite',info:'Draws lightweight props toward the effect.',fx:[7,-6.2,2.1,'#ef9bd8']},
  orbit:{price:32,name:'Orbit Marble',info:'Sweeps props sideways into a short orbit.',fx:[8,1,2,'#e6a6ff',7]},
  spring:{price:33,name:'Spring Tile',info:'Pops nearby props vertically with almost no push.',fx:[4,.25,10.8,'#aed998']},
  hush:{price:39,name:'Hush Foam',info:'Absorbs the momentum of moving props.',fx:[8,0,0,'#b9d3df',0,0]},
  prism:{price:44,name:'Prism Chalk',info:'Recolors props in its radius without moving them.',fx:[9,0,null,'#db9cff',0,1,true]},
  drift:{price:49,name:'Drift Fan',info:'A broad sideways breeze pushes props along the ground.',fx:[12,0,0,'#8be4e3',5]},
  rings:{price:53,name:'Ripple Rings',info:'Launches props in a wide, low wave.',fx:[12,3.8,1.2,'#efd290']},
  stitch:{price:58,name:'Stitch Beacon',info:'Returns roaming test props to their starting pads.',fx:[45,0,null,'#aee9d2',0,1,false,true]},
  comet:{price:63,name:'Comet Speck',info:'A small, powerful upward and outward burst for props.',fx:[3.4,8,11.6,'#f6a78c']},
  glimmer:{price:67,name:'Glimmer Lens',info:'Brightens target props and creates a slow, vertical lift.',fx:[10,.55,5,'#ffd897',0,1,true]}
};
export const products={...gadgets,...fleetProducts};
const isGadget=id=>id==='pulse'||!!gadgets[id]?.fx;
const availableDestinations=(s,line)=>{
  if(s.type==='rail')return stops.filter(q=>q.type==='rail'&&q.id!==s.id);
  if(s.type==='taxi')return stops.filter(q=>q.id!==s.id&&q.region===s.region&&['taxi','bus','sports','law','rail'].includes(q.type));
  return stops.filter(q=>q.type===s.type&&q.id!==s.id&&(s.type!=='bus'||s.region==='main'||q.region==='main'||q.region===s.region));
};
const byRegion=id=>regions.find(i=>i.id===id);
const money=n=>`$${n}`;
function path(pts){
  let length=0;const segs=[];
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i],n=Math.hypot(b[0]-a[0],b[1]-a[1],(b[2]??0)-(a[2]??0));
    if(n>.05){segs.push({a,b,len:n,start:length});length+=n}
  }
  return t=>{
    if(!length)return {x:pts[0][0],z:pts[0][1],y:0,heading:0};
    const d=length*clamp(t,0,1),{a,b,len,start}=segs.find(q=>d<=q.start+q.len)??segs.at(-1),w=(d-start)/len;
    return {x:a[0]+w*(b[0]-a[0]),z:a[1]+w*(b[1]-a[1]),y:(a[2]??0)+w*((b[2]??0)-(a[2]??0)),heading:Math.atan2(b[0]-a[0],a[1]-b[1])};
  };
}
function roadPath(s,d,scenic){
  const [sa,da]=[s,d].map(q=>q.region==='main'?[clamp(Math.round(q.x/48)*48+3.5,-191,3.5),Math.round(q.z/48)*48+3.5]:[316.4,byRegion(q.region).z+3.5]);
  const [sx,sz]=sa,[dx,dz]=da;
  if(s.region===d.region){
    const stroll=s.region==='main'?[[sx-48,sz],[sx-48,dz]]:[[sx,byRegion(s.region).z+40.5],[365,byRegion(s.region).z+40.5],[365,byRegion(s.region).z+3.5]];
    return [[s.x,s.z],[sx,s.z],[sx,sz],...(scenic?stroll:[]),[sx,dz],[dx,dz],[dx,d.z],[d.x,d.z]].map(([x,z])=>[x,z,.12]);
  }
  const join=[[3.5,99.4],[311,99.4]],bridge=s.region==='main'?join:d.region==='main'?[...join].reverse():[];
  return [[s.x,s.z],[sx,s.z],[sx,sz],...bridge,[dx,dz],[dx,d.z],[d.x,d.z]].map(([x,z])=>[x,z,.12]);
}
function ferryPath(s,d,scenic){
  const lane=223,sea=.18,under=-4.5;
  const points=s.region==='main'?[[s.x,s.z,sea],[36,s.z,sea],[47,s.z,sea],[lane,s.z,sea]]:
    [[s.x,s.z,sea],[lane,s.z,sea]];
  const waterSegment=(x,from,to)=>{
    if((from<96&&to>96)||(from>96&&to<96)){
      const direction=Math.sign(to-from);
      points.push([x,96-direction*12,sea],[x,96-direction*8,under],
        [x,96+direction*8,under],[x,96+direction*12,sea]);
    }
    points.push([x,to,sea]);
  };
  if(scenic){
    points.push([140,s.z,sea]);
    const scenicZ=(s.z+d.z)*.5+38;
    waterSegment(140,s.z,scenicZ);waterSegment(140,scenicZ,d.z);
    points.push([lane,d.z,sea]);
  }else{
    waterSegment(lane,s.z,d.z);
  }
  if(d.region==='main')points.push([36,d.z,sea],[d.x,d.z,sea]);
  else points.push([d.x,d.z,sea]);
  return points;
}
function flightPath(s,d){
  const r=q=>q.region==='main'?-195:369;
  const start=[r(s),s.z-5,0],end=[r(d),d.z-5,0],farS=[start[0],start[1]-103,26],farD=[end[0],end[1]-74,20];
  return [start,[start[0],start[1]-32,0],farS,[(start[0]+end[0])/2,(start[1]+end[1])/2-31,83],farD,[end[0],end[1]-39,0],end];
}
function buildRide(s,d,paid,cls,line,pack){
  const type=s.type, rail=type==='rail', from=rail?railStop(s,line):0,to=rail?railStop(d,line):0;
  const duration=(rail?clamp(Math.abs(to-from)/22,8.5,28):type==='airport'?25:type==='ferry'?20:clamp(Math.hypot(s.x-d.x,s.z-d.z)/23+5,12,25))*(pack?.pace??1);
  const course=rail?null:path(type==='ferry'?ferryPath(s,d,pack?.scenic):type==='airport'?flightPath(s,d):roadPath(s,d,pack?.scenic));
  return {s,d,type,paid,cls,from,to,duration,time:0,course,line,pack,pose:null,tv:false,channel:0,service:''};
}

export function createMobility(api){
  const {state,social}=api;
  const panel=$('transit-panel'), area=$('transit-content'), live=$('ride-hud'), cockpit=$('bridge-console');
  const log=[],gatePasses=new Map(),flightKeys=new Set();let panelMode=null, selection=null, ride=null, boarding=null,railBoarding=null,serviceBoarding=null, activeMatch=null, sportsSelection=null, matchRewarded=false, waypoint=null, crossing=null, incident=null, roadOfficer=null,fareGateSensor=null;
  let alertCool=0, propFx=null, gadgetCool=0, atlasRegion='main', purchaseMsg='', prevSignal=null, uiClock=0,policeAttackCool=0,taserCool=0,heliAttackCool=0;
  let sirenX=0,sirenZ=0, patrolHeading=0, cockpitOn=false, lamp=false, assist=false, chime=0, viewTrim=0;
  let pursuit=[],capture=0,custody=null,grace=0,flash=0,puzzleStep=0,arena=null,leadActive=false,hijackCutscene=null;
  const careDone=new Set(),wardRobbed=new Set(),banksRobbedThisVisit=new Set();
  let wardTaken=false,wardDrill=0;
  const tiers=[200,325,500,725,1000,1400,1900],wanted=()=>tiers.filter(b=>state.bounty>=b).length;
  function law(delta,label){
    const previous=wanted(),old=state.bounty;state.bounty=Math.max(0,state.bounty+delta);state.heat=wanted();
    if(wanted()>previous){flash=1.75;const f=$('wanted-flash');f.querySelector('strong').textContent='★'.repeat(wanted());f.hidden=true;void f.offsetWidth;f.hidden=false;api.sound(275)}
    if(old!==state.bounty){log.unshift({label,amount:state.bounty-old});if(log.length>12)log.pop()}
    social.notice(`${label} · ${delta>=0?'+':'−'}${money(Math.abs(old-state.bounty))} bounty`);
    api.refresh();
  }
  const fine=(key)=>{const [n,l]=charges[key];law(n,l)};
  function el(tag,txt,cls){const n=document.createElement(tag);if(txt)n.textContent=txt;if(cls)n.className=cls;return n}
  function item(label,meta,fn,opt={}){
    const b=el('button',null,'transit-row'+(opt.alt?' is-alt':'')+(opt.selected?' is-selected':''));b.type='button';
    b.append(el('strong',label));if(meta)b.append(el('span',meta));if(fn)b.addEventListener('click',fn);
    if(opt.disabled)b.disabled=true;
    area.append(b);return b;
  }
  function copy(txt,cls='transit-description'){area.append(el('p',txt,cls))}
  function typedAmount(){
    const amount=Number(area.querySelector('#bank-amount')?.value);
    if(!Number.isSafeInteger(amount)||amount<1){purchaseMsg='Enter a whole amount greater than zero.';return null}
    return amount;
  }
  function heading(kicker,title){
    $('transit-kicker').textContent=kicker;
    $('transit-title').textContent=title;
  }
  function open(mode,select=null,remember=false){
    if(activeMatch)return;
    panelMode=mode;selection=select;if(!remember)purchaseMsg='';
    panel.hidden=false;api.clearKeys();paint();$('transit-close').focus({preventScroll:true});api.refresh();
  }
  function close(focus=true){panelMode=null;selection=null;panel.hidden=true;if(focus)api.focus();api.refresh()}
  function mark(s){
    waypoint=s;close();social.notice(`Waypoint set · ${s.name}`);
  }
  function purchase(id,p){
    const owns=state.owned.includes(id),gadget=isGadget(id);
    item(p.name,owns?(gadget?(state.gadget===id?'EQUIPPED':'EQUIP'):'OWNED'):money(p.price),()=>{
      if(!owns){
        if(state.cash<p.price){purchaseMsg=`You need ${money(p.price-state.cash)} more for ${p.name}.`;paint();return}
        state.owned.push(id);social.changeCash(-p.price,p.name);purchaseMsg=`${p.name} unlocked.`;api.sync();
      }
      if(gadget)state.gadget=id;
      paint();api.refresh();
    },{disabled:owns&&!gadget});
  }
  function paint(){
    area.replaceChildren();
    if(panelMode==='atlas'){
      heading('PACIFICA TRANSPORT AUTHORITY','Transit Atlas');
      const tabs=el('div',null,'region-tabs');
      for(const i of regions){const b=el('button',i.id==='main'?'Pacifica':i.name);b.type='button';b.style.setProperty('--zone',i.accent);b.setAttribute('aria-pressed',String(atlasRegion===i.id));b.addEventListener('click',()=>{atlasRegion=i.id;paint();tabs.querySelector('[aria-pressed=true]')?.focus()});tabs.append(b)}
      area.append(tabs);
      const region=byRegion(atlasRegion),[x,z]=api.position();
      const card=el('div',null,'region-card');card.style.setProperty('--zone',region.accent);card.append(el('small',region.tag),el('strong',region.name),el('p',region.about));area.append(card);
      copy('Set a waypoint, then approach the station sign and press E. Trips start at the station, not from this atlas.');
      for(const s of stops.filter(a=>a.region===atlasRegion&&(a.type!=='good'||!crossing))){
        const d=Math.round(Math.hypot(x-s.x,z-s.z));
        item(s.name,`${stopTypes[s.type]} · ${d} m`,()=>mark(s));
      }
    }
    if(panelMode==='rail-gate'){
      const s=selection;
      heading('ENTRY CONTROL',s.name);
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      if(gatePasses.has(s.id)){copy(['paid','boarding'].includes(gatePasses.get(s.id))?'Ticket validated. Walk through the gate to your platform.':gatePasses.get(s.id)==='arrival'?'Connection access is open. A new trip requires a ticket.':'The fare violation has already been recorded.');return}
      copy('Validate once to unlock both platforms. The $9 entry includes an Economy ticket.');
      const pass=paid=>{
        if(paid&&state.cash<9){purchaseMsg=`You are ${money(9-state.cash)} short.`;paint();return}
        gatePasses.set(s.id,paid?'paid':'unpaid');
        if(paid)social.changeCash(-9,'Rail station entry');else fine('fare');
        const venue=api.venue();
        if(venue?.stop.id===s.id&&venue.zone==='concourse')venue.openGate=true;
        close(false);social.notice('Fare validated · walk through the automatic gate and follow the platform ramp.');
      };
      item('Pay $9 and open the gate','ECONOMY FARE INCLUDED',()=>pass(true));
      item('Skip the fare','+$9 bounty',()=>pass(false),{alt:true});
    }
    if(panelMode==='station'||panelMode==='check-in'){
      const s=selection.stop, line=selection.line;
      heading(stopTypes[s.type],s.name);
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      copy(panelMode==='check-in'?'Select a destination, then choose Economy, Business, or the +$10 manual flight option.':line==='below'?'Cross-Bay Metro · Underground and under-bay service.':line==='surface'?'Coastal Rail · Above-ground local service.':'Choose a destination to buy a fare and board.');
      for(const d of availableDestinations(s,line)){
        item(d.name,line==='below'?'CROSS-BAY METRO':line==='surface'?'COASTAL RAIL':`From ${money(quote(s,d))}`,()=>open('ticket',{stop:s,dest:d,line:panelMode==='check-in'?'A':line}));
      }
    }
    if(panelMode==='ticket'){
      const {stop:s,dest:d,line}=selection, base=quote(s,d),pass=gatePasses.get(s.id);
      heading(`${vehicleLabels[s.type]} · ${s.name}`,d.name);
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      if(commuterTypes.includes(s.type)){
        copy('Choose a variant, ride as a passenger for the standard fare, or rent the vehicle to drive yourself for $10 more.');
        for(const [id,p] of Object.entries(fleetProducts).filter(([,p])=>p.family===s.type)){
          copy(`${p.info} · Handling ${p.power.toFixed(2)} power / ${p.steer.toFixed(2)} steering`,'product-info');
          item(`Ride as Passenger · ${p.name}`,`${money(base)} · standard fare`,()=>ticket(s,d,base,'Economy',false,line,{name:p.name,vehicleId:id}));
          item(`Drive Yourself · ${p.name}`,`${money(base+10)} · fare plus $10`,()=>ticket(s,d,base+10,'Standard',false,line,{vehicleId:id,driveSelf:true}));
        }
      }else if(s.type==='airport'){
        copy(`Gate ${line??'A'} · Fly as a passenger, pilot for $10 extra, or hijack the aircraft and take the controls.`);
        item('Economy · Fly as Passenger',`${money(base)} · standard ticket`,()=>ticket(s,d,base,'Economy',false,line,{gate:line??'A'}));
        item('Business · Fly as Passenger',`${money(base+33)} · Business cabin`,()=>ticket(s,d,base+33,'Business',false,line,{gate:line??'A'}));
        item('Fly Yourself · Economy + $10',`${money(base+10)} · manual flight option`,()=>ticket(s,d,base+10,'Economy',false,line,{pilot:true,gate:line??'A'}));
        item('Hijack the aircraft',`${money(base)} · pilot takeover · high bounty`,()=>ticket(s,d,base,'Economy',false,line,{hijack:true,gate:line??'A'}),{alt:true});
      }else if(cabinService(s.type)){
        const paid=pass==='paid'?0:base, premium=s.type==='airport'?[0,33,64]:s.type==='rail'?[0,12,25]:[0,9,19];
        copy(pass==='paid'?'Your validated pass includes Economy. Upgrades cost only the class difference.':'Pick a cabin. Business and First Class include VIP service and a personal TV.');
        for(const [i,cls] of Object.keys(seats).entries()){
          const cost=paid+premium[i];item(`Board ${cls}`,`${cost?money(cost):'FARE INCLUDED'} · ${seats[cls].size}`,()=>ticket(s,d,cost,cls,false,line));
        }
      }else{
        copy('Choose a service for this trip.');
        item('Standard service',money(base),()=>ticket(s,d,base,'Standard',false,line));
      }
      if(pass!=='paid'&&s.type!=='airport')item('Board without paying',pass==='unpaid'?'FARE VIOLATION ALREADY RECORDED':'+$9 bounty',()=>ticket(s,d,0,'Economy',true,line),{alt:true});
      item('Back to departures','',()=>open('station',{stop:s,line}));
    }
    if(panelMode==='law'){
      heading('PACIFICA POLICE SERVICE','Bounty Ledger');
      copy(`${money(state.bounty)} outstanding · ${wanted()?`${wanted()} wanted ${wanted()===1?'star':'stars'} · active pursuit`:state.bounty>=60?'A patrol may ask you to stop.':'No active patrol alert.'}`);
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      if(selection?.pay&&state.bounty>0){
        item('Pay the fine in full',money(state.bounty),()=>{const b=state.bounty;if(state.cash<b){purchaseMsg='Not enough cash. You can take a job, play sports, or help out in the city.';paint();return}social.changeCash(-b,'Fine paid');law(-b,'Bounty cleared');paint()});
        if(state.bounty>20)item('Make a $20 payment','−$20 bounty',()=>{if(state.cash<20){purchaseMsg='Not enough cash for a partial payment.';paint();return}social.changeCash(-20,'Fine payment');law(-20,'Partial payment');paint()});
      }
      if(!selection?.pay)item('Mark nearest police desk','PAY FINES',()=>mark(closest(stops.filter(s=>s.type==='law'))));
      if(!log.length)copy('No incidents on record.');
      for(const entry of log)area.append(el('div',`${entry.amount>0?'+':'−'}${money(Math.abs(entry.amount))} · ${entry.label}`,'ledger-entry'));
      copy('Minor violations cost less than dangerous collisions. Community work can reduce the balance.');
    }
    if(panelMode==='garage'||panelMode==='air-sales'){
      const air=panelMode==='air-sales';
      heading(air?'PACIFICA AIRFIELD':'STRAYLIGHT EXPERIMENTAL',air?'Aircraft Sales':'Mod Garage');
      copy(air?'Purchased aircraft appear in the fleet and at the runway access desk.':'Buy prototype vehicles, prop gadgets, or fictional energy weapons.');
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      if(!air&&!selection?.catalog){
        item('Road & utility','MODIFIED LAND VEHICLES',()=>open('garage',{catalog:'road'}));
        item('Marine & rail','BOATS AND TRAINS',()=>open('garage',{catalog:'marine'}));
        item('Hologram & prop tools','GADGET EQUIPMENT',()=>open('garage',{catalog:'gadgets'}));
        item('Weapons workshop','COMBAT EQUIPMENT',()=>open('garage',{catalog:'weapons'}));
        copy('Shop for aircraft at the airport hangar.');
      }else if(selection?.catalog==='weapons'){
        copy('Press X to attack and B to cycle owned weapons. Q still controls prop gadgets. Attacking people adds bounty.');
        for(const [id,p] of Object.entries(weapons).filter(([id])=>id!=='hands')){
          copy(p.info,'product-info');
          const owns=state.owned.includes(id);
          item(p.name,state.weapon===id?'EQUIPPED':owns?'EQUIP':money(p.price),()=>{
            if(!owns){
              if(state.cash<p.price){purchaseMsg=`You need ${money(p.price-state.cash)} more for ${p.name}.`;paint();return}
              state.owned.push(id);social.changeCash(-p.price,p.name);purchaseMsg=`${p.name} unlocked.`;
            }
            state.weapon=id;paint();api.refresh();
          });
        }
        item('Back to departments','',()=>open('garage'));
      }else{
        for(const [id,p] of Object.entries(products).filter(([id,p])=>air?aircraft.includes(id):selection.catalog==='gadgets'?isGadget(id):!isGadget(id)&&!aircraft.includes(id)&&(selection.catalog==='marine'?['boat','rail'].includes(p.kind)||id==='hydro':!['boat','rail'].includes(p.kind)&&id!=='hydro'))){
          copy(p.info,'product-info');purchase(id,p);
        }
        if(!air)item('Back to departments','',()=>open('garage'));
      }
    }
    if(panelMode==='runway'){
      heading('FLIGHT OPERATIONS','Runway access');
      copy('Choose an aircraft from your fleet. Passenger departures stay separate from pilot operations.');
      if(selection.region==='main')item(selection.west?'Switch to Runway 36':'Switch to Runway 36 West',selection.west?'WEST RUNWAY SELECTED':'MAIN RUNWAY SELECTED',()=>{
        selection={...selection,west:!selection.west};paint();
      });
      for(const id of ['plane',...aircraft.filter(k=>state.owned.includes(k))])item(products[id]?.name??'Trainer','TAKE THE CONTROLS',()=>{
        const s=selection;close(false);api.goRunway(s,id,s.west);
      });
    }
    if(panelMode==='staff'){
      heading(selection.kicker,selection.name);copy(selection.line);
      item('Thanks','',()=>close());
    }
    if(panelMode==='care'){
      const data=care[selection];
      heading('PACIFICA MEDICAL · VOLUNTEER DESK',data[0]);copy(data[1]);
      if(careDone.has(selection))copy('You already completed this task.');
      else item(data[2],data[3],()=>{const i=selection;careDone.add(i);close();
        if(i===1&&state.bounty>0)law(-Math.min(35,state.bounty),'Hospital volunteer credit');else social.changeCash(i===0?18:i===1?12:27,'Hospital volunteer shift');
      });
    }
    if(panelMode==='ward-person'){
      const actor=selection,status=api.wardActions(actor);
      heading(`PACIFICA MEDICAL · ${actor.role.toUpperCase()}`,actor.name);
      if(status.dead)copy('This character has died.');
      else {
        if(status.poison)area.append(el('p',`Violet exposure · ${status.remaining}s to use the antidote`,'terminal-chip violet-clock'));
        else copy(status.injured?'This person is injured. You can use the ward’s instant aid action.':
          'The ward monitors are stable. You can leave this person alone or choose a fictional encounter.');
        if(status.injured||status.poison)item(status.poison?'Give Violet antidote':'Stabilize and save',status.rescued?'ALREADY RECEIVED CREDIT':'UP TO −$35 BOUNTY',()=>{close();api.aid(actor)});
        if(!status.poison)item('Inflict fictional Violet toxin','+$145 BOUNTY · 22 SECONDS TO RESCUE',()=>{close();api.expose(actor)},{alt:true});
        if(!wardRobbed.has(actor.id)){
          const cash=actor.resting?18:24;
          item(`Rob ${actor.name}`,`TAKE $${cash} · +$65 BOUNTY`,()=>{
            if(api.wardActions(actor).dead||wardRobbed.has(actor.id))return;
            wardRobbed.add(actor.id);close();social.changeCash(cash,'Belongings taken');law(65,`Ward robbery · ${actor.name}`);
          },{alt:true});
        }
      }
      item('Leave them alone','',()=>close());
    }
    if(panelMode==='ward-theft'){
      heading('PACIFICA MEDICAL · ADMIN OFFICE','Admin lockbox');
      copy(wardTaken?'The lockbox is empty.':'The lockbox holds $55 in petty cash. Taking it will be added to the bounty ledger.');
      if(!wardTaken)item('Steal the $55','+$85 BOUNTY',()=>{wardTaken=true;close();social.changeCash(55,'Hospital cash taken');law(85,'Hospital theft')},{alt:true});
      item('Leave the lockbox alone','',()=>close());
    }
    if(panelMode==='ward-sim'){
      heading('PACIFICA MEDICAL · TRAINING','Ward simulator');
      if(wardDrill===0){
        copy('A fictional power fault has stopped the training monitors. Run the drill to help restore them.');
        item('Start the rescue drill','NO REAL PATIENTS INVOLVED',()=>{wardDrill=1;paint()});
      }else if(wardDrill===1){
        copy('Training fault active. Bring the virtual backup online to restore the monitors.');
        item('Restore the monitors','$25 VOLUNTEER REWARD',()=>{wardDrill=2;close();social.changeCash(25,'Ward rescue drill')});
      }else copy('All training monitors are back online. The drill is complete.');
      item('Return to the ward','',()=>close());
    }
    if(panelMode==='arena'){
      heading('STRAYLIGHT TEST ARENA','Hologram Tag');
      copy('Tag all three training holograms with Q. Walk up and face each platform. The arena disables combat weapons.');
      item(arena&&!arena.done?'Restart round':'Start training round','WIN $35',()=>{
        arena={tags:[],remaining:45,done:false};
        for(let id=0;id<3;id++)api.venue()?.tag(id,true);
        close();social.notice('Training round started · 45 seconds');
      });
    }
    if(panelMode==='custody'&&custody){
      heading('PACIFICA DETENTION','Custody terminal');
      area.append(el('div',`${Math.ceil(custody.remaining)} seconds until release`,'terminal-chip custody-clock'));
      copy('Wait for release or take the optional virtual escape challenge.');
      item('Return to the holding room','WAIT OUT SENTENCE',()=>close());
      item('Play virtual escape puzzle','ESCAPE ADDS $120 BOUNTY',()=>{puzzleStep=0;open('puzzle')},{alt:true});
    }
    if(panelMode==='puzzle'&&custody){
      heading('VIRTUAL CHALLENGE','Signal lock');
      area.append(el('div',`${Math.ceil(custody.remaining)} seconds until release`,'terminal-chip custody-clock'));
      copy('Repeat the fictional light pattern: AMBER · CYAN · VIOLET · CYAN. A wrong input resets the sequence.');
      copy(`${puzzleStep} / 4 correct`);
      const row=el('div',null,'terminal-puzzle');
      for(const color of ['Amber','Cyan','Violet']){
        const b=el('button',color);b.type='button';b.addEventListener('click',()=>{
          puzzleStep=color===['Amber','Cyan','Violet','Cyan'][puzzleStep]?puzzleStep+1:0;
          if(puzzleStep===4)release(true);else{paint();area.querySelectorAll('.terminal-puzzle button')[['Amber','Cyan','Violet'].indexOf(color)]?.focus()}
        });row.append(b);
      }area.append(row);
    }
    if(panelMode==='sports'){
      heading('PUBLIC SPORTS CENTER',selection?.name??'Recreation Hall');
      copy(`Choose a 3D match with ${selection?.player??'a local player'}.`);
      for(const [id,m] of Object.entries(sportModes))item(m.name,m.icon,()=>startSportsMatch(id,m));
    }
    if(panelMode==='bank'){
      const bank=selection.stop,loans=state.bankLoans??[],active=loans.filter(loan=>loan.remaining>0);
      heading(bank.name,'Banker service');
      copy(`Wallet $${state.cash} · protected savings $${state.bankBalance}. Deposits survive death.`);
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      const label=el('label','Amount in dollars','bank-amount-label');
      const input=el('input');input.id='bank-amount';input.type='number';input.min='1';input.step='1';input.inputMode='numeric';input.placeholder='Enter an amount';input.setAttribute('aria-label','Amount in dollars');
      area.append(label,input);
      for(const loan of active){
        const remaining=Math.max(0,Math.ceil(loan.dueAt-uiClock));
        copy(`Loan balance $${loan.remaining} · ${loan.bountyCharged?'bounty filed':`due in ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`}`,'terminal-chip');
      }
      item('Deposit','Move wallet cash into protected savings',()=>{
        const amount=typedAmount();if(amount===null){paint();return}
        if(amount>state.cash){purchaseMsg='You do not have that much cash in your wallet.';paint();return}
        state.bankBalance+=amount;social.changeCash(-amount,'Bank deposit');paint();
      });
      item('Withdraw',`Available savings: $${state.bankBalance}`,()=>{
        const amount=typedAmount();if(amount===null){paint();return}
        if(amount>state.bankBalance){purchaseMsg='You can only withdraw money already deposited.';paint();return}
        state.bankBalance-=amount;social.changeCash(amount,'Bank withdrawal');paint();
      });
      const debt=active.reduce((sum,loan)=>sum+loan.remaining,0);
      item('Request a loan','Up to $500 · repay within 10 minutes',()=>{
        const amount=typedAmount();if(amount===null){paint();return}
        if(amount>500||debt>0){purchaseMsg=debt>0?'Repay your current loan before borrowing again.':'The maximum loan is $500.';paint();return}
        state.bankLoans??=[];state.bankLoans.push({remaining:amount,dueAt:uiClock+600,bountyCharged:false});
        social.changeCash(amount,'Bank loan');paint();
      },{disabled:debt>0});
      item('Repay loan','Pays down the oldest outstanding loan',()=>{
        const amount=typedAmount();if(amount===null){paint();return}
        if(!debt){purchaseMsg='You have no outstanding loan.';paint();return}
        if(amount>debt){purchaseMsg=`You can repay up to the remaining balance of $${debt}.`;paint();return}
        if(amount>state.cash){purchaseMsg='You do not have enough wallet cash to repay that amount.';paint();return}
        let left=amount;
        for(const loan of active){const paid=Math.min(left,loan.remaining);loan.remaining-=paid;left-=paid;if(!left)break}
        social.changeCash(-amount,'Loan repayment');paint();
      },{disabled:!debt});
      item('Rob this bank','Take your entered amount · bounty increases by the same amount',()=>{
        if(banksRobbedThisVisit.has(bank.id)){purchaseMsg='This bank has already been robbed during this visit.';paint();return}
        const amount=typedAmount();if(amount===null){paint();return}
        banksRobbedThisVisit.add(bank.id);state.bankRobberies??={};
        state.bankRobberies[bank.id]=(state.bankRobberies[bank.id]??0)+1;
        social.changeCash(amount,'Bank robbery');law(amount,`Bank robbery · ${bank.name}`);
        purchaseMsg=`$${amount} taken. ${Math.min(8,state.bankRobberies[bank.id]*2)} guards will secure this bank when you return.`;paint();
      },{alt:true,disabled:banksRobbedThisVisit.has(bank.id)});
      item('Leave the bank','',()=>close());
    }
    if(panelMode==='crossing'){
      heading('COMMUNITY WORK','Help Mae cross');
      copy('Mae is waiting by the boardwalk. Walk with her to the marked sidewalk on the other side of the street.');
      item('Walk with Mae','Up to −$35 bounty',()=>{crossing={x:11.8,z:55.8,to:-10.8,done:false};waypoint=null;close();social.notice('Stay close to Mae as you cross to the west sidewalk.')});
    }
    if(panelMode==='incident'){
      heading('TRAFFIC INCIDENT',`${selection.name} pulled over`);
      copy(selection.severe?'That was a dangerous hit. The vehicles stopped and the incident was reported.':'The other driver asks you to exchange details. Nobody was hurt.');
      item('Apologize and exchange details','Up to −$8 bounty',()=>{law(-8,'Cooperated at the scene');incident=null;close()});
      if(!selection.severe)item('Offer to cover the repair','$18 · up to −$20 bounty',()=>{if(state.cash<18){copy('Not enough cash. You can still exchange details.','transit-warning');return}social.changeCash(-18,'Repair contribution');law(-20,'Repair resolved');incident=null;close()});
      item('Leave the conversation','Bounty stays on record',()=>{incident=null;close()},{alt:true});
    }
  }
  function quote(s,d){
    const m=Math.hypot(s.x-d.x,s.z-d.z);
    return fareRates[s.type]+(s.type==='taxi'?Math.min(22,Math.floor(m/22)):s.type==='airport'?Math.min(17,Math.floor(m/36)):s.type==='bus'&&s.region!==d.region?6:s.type==='ferry'&&m>290?5:0);
  }
  function ticket(s,d,fare,cls,unpaid=false,line,pack){
    if(api.venue()?.stop.id!==s.id||s.type==='rail'&&(api.venue()?.zone!==line||!gatePasses.has(s.id)))return;
    if(state.cash<fare){purchaseMsg=`You are ${money(fare-state.cash)} short. Choose another service or earn more cash.`;paint();return}
    if(fare>0)social.changeCash(-fare,`${stopTypes[s.type]} fare`);else if(unpaid&&gatePasses.get(s.id)!=='unpaid')fine('fare');
    if(s.type==='rail')gatePasses.delete(s.id);
    if(s.type==='rail'){
      const pending=buildRide(s,d,true,cls,line,pack);
      pending.pose=railAt(pending.from,line);pending.previousVehicle=state.vehicle;
      railBoarding={ride:pending,line};
      gatePasses.set(s.id,'boarding');
      close(false);social.notice('Ticket validated · walk through an open train door to board.');api.refresh();return;
    }
    if(['bus','taxi','ferry'].includes(s.type)&&!pack?.driveSelf){
      const pending=buildRide(s,d,true,cls,line,pack);
      pending.pose=pending.course(0);pending.previousVehicle=state.vehicle;
      serviceBoarding={ride:pending,stop:s};
      close(false);social.notice(`Ticket issued · walk aboard the ${s.type} at its marked entrance.`);api.refresh();return;
    }
    if(pack?.driveSelf){
      waypoint=d;close(false);api.driveTransitVehicle(pack.vehicleId,s,d);api.focus();api.refresh();return;
    }
    if(s.type==='airport'){
      boarding={ride:buildRide(s,d,!unpaid,cls,line,pack),pilot:!!pack?.pilot||!!pack?.hijack,hijack:!!pack?.hijack};
      close(false);social.notice(`Ticket issued for Gate ${pack?.gate??'A'} · walk through the jet bridge to the aircraft.`);api.refresh();return;
    }
    ride=buildRide(s,d,!unpaid,cls,line,pack);ride.pose=ride.type==='rail'?railAt(ride.from,line):ride.course(0);
    ride.previousVehicle=state.vehicle;
    waypoint=null;
    api.startRide();if(cabinService(ride.type))cockpitOn=true;close(false);api.focus();api.refresh();
  }
  function startFlight(pilot){
    if(!boarding){social.notice('Buy a flight ticket at the terminal before boarding.');return}
    if(pilot&&!boarding.pilot){social.notice('The flight-deck controls require the $10 pilot option.');return}
    ride=boarding.ride;boarding=null;ride.pose=ride.course(0);ride.previousVehicle=state.vehicle;
    ride.walkableCabin=!pilot;
    ride.pilotControl=pilot;ride.pilotSpeed=0;ride.pilotThrottle=0;ride.pilotPitch=0;ride.pilotBank=0;ride.pilotDistance=0;
    const start=ride.course(0),end=ride.course(1);
    ride.pilotRouteLength=Math.max(1,Math.hypot(end.x-start.x,end.z-start.z));
    waypoint=null;flightKeys.clear();api.startRide();cockpitOn=true;close(false);api.focus();api.refresh();
  }
  function startHijack(){
    if(!boarding?.hijack){startFlight(true);return}
    const venue=api.venue(),pilot=venue?.people.find(p=>p.name==='Flight Captain');
    hijackCutscene={elapsed:0,pilot,player:venue?.player};
    grace=8;law(160,'Commercial aircraft hijacking');api.clearKeys();api.snap();api.refresh();
  }
  function stepHijack(dt){
    if(!hijackCutscene)return;
    const c=hijackCutscene;c.elapsed+=dt;
    if(c.player){
      c.player.model.position.set(0,.04,-19.1);c.player.model.rotation.y=Math.PI;
      animatePerson(c.player,uiClock,0);
      c.player.limbs[1].arm.rotation.x=c.elapsed<.55?-1.35:c.elapsed<.92?-.1:-.42;
      c.player.limbs[1].arm.rotation.z=-.12;
    }
    if(c.pilot){
      c.pilot.model.position.set(0,.04,-21.5);
      c.pilot.model.rotation.set(c.elapsed>.8?-1.38:0,0,0,'YXZ');
      c.pilot.limbs[1].arm.rotation.x=c.elapsed<.65?-.12:-.9;
    }
    if(c.elapsed<1.9)return;
    const flight=boarding?.ride;
    if(!flight){hijackCutscene=null;return}
    boarding=null;hijackCutscene=null;api.takeoverAircraft(flight.course(0));api.refresh();
  }
  function closest(list){const [x,z]=api.position();return [...list].sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0]}
  function startSportsMatch(id,mode){
    if(wanted()>=7){social.notice('The sports center is closed to you while you have seven wanted stars.');return}
    const venue=api.venue();
    if(!venue||venue.zone!=='sports'){social.notice('Return to the sports center to start a match.');return}
    sportsSelection=selection;
    activeMatch=createSportsMatch(venue.scene,id,sportsSelection.player);
    matchRewarded=false;panelMode=null;selection=null;panel.hidden=true;api.clearKeys();
    $('sports-hud').hidden=false;
    $('sports-title').textContent=`${mode.name} · vs ${sportsSelection.player}`;
    $('sports-instructions').textContent=mode.instruction;
    $('sports-action').textContent=`${mode.action} · X`;
    $('sports-score').textContent=`YOU 0  ·  ${sportsSelection.player} 0`;
    $('sports-status').textContent='Move close to the ball and press X.';
    $('sports-action').disabled=false;
    api.refresh();api.focus();
  }
  function sportAction(){
    if(!activeMatch)return;
    if(!activeMatch.action(state.x,state.z,state.heading,state.jump))social.notice('Move closer to the ball and face the play before acting.');
  }
  function endSports(returnToMenu=true){
    if(!activeMatch)return;
    activeMatch.dispose();activeMatch=null;matchRewarded=false;
    $('sports-hud').hidden=true;
    const next=sportsSelection;sportsSelection=null;
    if(returnToMenu&&next&&api.venue()?.zone==='sports')open('sports',next);
    else{api.focus();api.refresh()}
  }
  function handle(s){
    if(custody)return;
    if(s.type==='law'){open('law',{pay:true});return}
    if(s.type==='garage'){open('garage');return}
    if(s.type==='good'){if(!crossing)open('crossing');return}
    if(hasVenue(s)&&api.isWalking()){waypoint=null;api.enterVenue(s,venueFor(s),gatePasses.has(s.id));return}
    social.notice('Get out of the vehicle and approach the entrance on foot.');
  }
  function leaveVenueState(s){
    if(railBoarding?.ride.s.id!==s.id)gatePasses.delete(s.id);
    if(s.type==='arena')arena=null;if(s.type==='bank')banksRobbedThisVisit.delete(s.id);
    if(activeMatch){activeMatch.dispose();activeMatch=null;sportsSelection=null;matchRewarded=false;$('sports-hud').hidden=true}
  }
  function venueAction(a){
    const v=api.venue(),s=v?.stop;
    if(!s)return;
    switch(a.action){
      case 'street': api.leaveVenue();break;
      case 'rail-gate':open('rail-gate',s);break;
      case 'departures': if(s.type!=='rail'||gatePasses.has(s.id))open('station',{stop:s,line:a.data});break;
      case 'flight-seat':
        if(!boarding)social.notice('You need a flight ticket to board.');
        else if(a.gate&&a.gate!==boarding.ride.pack?.gate)social.notice(`Your ticket is for Gate ${boarding.ride.pack?.gate??'A'}.`);
        else if(a.data&&a.data!==boarding.ride.cls)social.notice(`This ticket is for ${boarding.ride.cls}.`);
        else startFlight(false);
        break;
      case 'flight-deck':
        if(!boarding)social.notice('You need a flight ticket to board.');
        else if(a.gate&&a.gate!==boarding.ride.pack?.gate)social.notice(`Your ticket is for Gate ${boarding.ride.pack?.gate??'A'}.`);
        else if(boarding.hijack)startHijack();
        else startFlight(true);
        break;
      case 'check-in':open('check-in',{stop:s});break;
      case 'hangar':api.enterVenue(s,'hangar');break;
      case 'terminal':api.enterVenue(s,'airport',false,[11,-13],Math.PI);break;
      case 'air-sales':open('air-sales');break;
      case 'runway':open('runway',s);break;
      case 'care':open('care',a.data);break;
      case 'ward-person':open('ward-person',a.data);break;
      case 'ward-theft':open('ward-theft');break;
      case 'ward-sim':open('ward-sim');break;
      case 'sports-player':
        if(wanted()>=7)social.notice('The local players are too frightened to play while you have seven wanted stars.');
        else open('sports',{stop:s,player:a.data});
        break;
      case 'banker':{
        const guards=v.people.filter(p=>p.hostile&&api.actorVital(p)>0);
        if(guards.length){social.notice(`${guards.length} bank security ${guards.length===1?'officer is':'officers are'} blocking the teller. Defeat them first.`);break}
        open('bank',{stop:s,banker:a.data});break;
      }
      case 'arena':open('arena');break;
      case 'custody':if(custody)open('custody');break;
      case 'hologram':social.notice('Face the hologram and press Q to tag it during a round.');break;
      case 'staff':{
        const line=v.zone==='concourse'?'Validate at the middle gate, then take the stairs to the surface platforms or the underground Metro. The Railcar in your fleet is separate.':
          v.zone==='airport'?'Flights board at Gates A–D. Buy a ticket for passenger service or the $10 pilot option, then walk through the jet bridge and choose a cabin at the fork.':
          v.zone==='hospital'?'Our volunteers bring blankets, return lost items, guide families, and help in the training room. Look for the markers beside the bays.':
          v.zone==='hangar'?'Browse the catalog here or go to the far end to take an owned aircraft onto the runway.':'Walk to the marked boarding point to check prices and destinations.';
        open('staff',{name:a.data,kicker:s.name,line});break;
      }
    }
  }
  function atStation(x,z,walk){
    if(ride)return [];
    const list=stops.filter(s=>Math.abs(s.x-x)<17&&Math.abs(s.z-z)<18&&(walk||s.type==='taxi'||s.type==='law'))
      .filter(s=>!walk||!['rail','airport','bus'].includes(s.type))
      .filter(s=>s.type!=='good'||!crossing)
      .map(s=>({...s,z:s.z+(hasVenue(s)?3.5:0),kind:s.type,type:'transit',r:s.type==='rail'?7.5:s.type==='good'?4.5:5.8,label:s.type==='good'?s.name:`Visit ${s.name}`,station:s}));
    if(roadOfficer&&walk&&Math.hypot(x-roadOfficer.x,z-roadOfficer.z)<13)list.push({...roadOfficer,type:'patrol',label:'Talk to patrol officer',r:9});
    return list;
  }
  function venueEntranceAt(x,z){
    return stops.find(s=>['rail','airport','bus'].includes(s.type)&&Math.hypot(s.x-x,s.z-z)<3.7)??null;
  }
  function autoFareGateAt(x,z){
    const venue=api.venue();
    if(!venue||venue.zone!=='concourse'||gatePasses.has(venue.stop.id)){fareGateSensor=null;return false}
    if(Math.hypot(x,z+2.2)>=1.7){fareGateSensor=null;return false}
    if(fareGateSensor===venue.stop.id)return false;
    fareGateSensor=venue.stop.id;
    if(!panelMode){open('rail-gate',venue.stop);return true}
    return false;
  }
  function boardTransitAt(x,z,t){
    const venue=api.venue();
    if(ride||!api.isWalking()||!venue)return false;
    if(railBoarding&&venue.stop.id===railBoarding.ride.s.id&&venue.zone===railBoarding.line&&venue.trainBoardingAt?.(x,z,t)){
      ride=railBoarding.ride;railBoarding=null;ride.time=0;ride.arrived=false;ride.walkableCabin=true;ride.pose=railAt(ride.from,ride.line);
      gatePasses.delete(venue.stop.id);
      api.startRide();cockpitOn=false;api.refresh();return true;
    }
    if(serviceBoarding&&venue.stop.id===serviceBoarding.stop.id&&venue.zone===serviceBoarding.ride.type&&venue.serviceBoardingAt?.(x,z)){
      ride=serviceBoarding.ride;serviceBoarding=null;ride.time=0;ride.arrived=false;ride.walkableCabin=true;ride.pose=ride.course(0);
      api.startRide();cockpitOn=false;api.refresh();return true;
    }
    return false;
  }
  function runSignals(t,dt,world,oldX,oldZ){
    if(state.mode!=='roam'||state.phase!=='running'||ride||api.isIndoor()||!api.isRoadVehicle())return;
    const axis=Math.abs(Math.sin(state.heading))>.65?'x':'z';
    const s=signals.find(q=>Math.abs(q.x-state.x)<17&&Math.abs(q.z-state.z)<17);
    if(!s){prevSignal=null;state.signal=null;return}
    const at=axis==='x'?s.x:s.z, old=axis==='x'?oldX:oldZ,now=axis==='x'?state.x:state.z;
    const before=Math.abs(old-at),after=Math.abs(now-at), color=signalAt(s,t,axis);
    state.signal=color;
    if(before>=8&&after<8&&color==='red'&&Math.abs(state.speed)>2.2&&prevSignal!==s){prevSignal=s;fine(Math.abs(state.speed)>25?'reckless':'red')}
  }
  function collision(t,speed,gas){
    if(alertCool>0||state.mode!=='roam'||ride)return;
    alertCool=5.2;
    const severe=speed>17&&gas;
    fine(severe?'major':'crash');
    t.pause=7;
    incident={name:t.name??'A local driver',severe};
    state.speed=state.vx=state.vz=0;
    open('incident',incident);
  }
  function walkAcross(dt,world){
    if(!crossing)return;
    if(crossing.done)return;
    const d=Math.hypot(state.x-crossing.x,state.z-crossing.z);
    const accompanying=Math.abs(state.speed)>.3||state.x<crossing.x-.38||state.x<crossing.to+1.45;
    if(api.isWalking()&&!api.isIndoor()&&d<7.1&&accompanying){
      crossing.x=Math.max(crossing.to,crossing.x-dt*2.4);
      world.mae.model.position.x=crossing.x;world.mae.model.rotation.y=Math.PI/2;
      animatePerson(world.mae,uiClock,2.1);
      if(crossing.x<=crossing.to+.15){
        crossing.done=true;const saved=Math.min(35,state.bounty);
        if(saved)law(-saved,'Helped Mae cross');else social.changeCash(15,'Community thank-you');
      }
    }else animatePerson(world.mae,uiClock,0);
  }
  function lawPatrol(dt,w){
    if(!w)return;
    const star=wanted(),[px,pz]=api.position(),
      active=state.bounty>=60&&state.phase==='running'&&state.mode==='roam'&&!custody&&grace<=0;
    leadActive=active;
    if(!active){w.patrol.visible=false;w.helicopter.visible=false;for(const u of pursuit)u.mesh.visible=false;roadOfficer=null;capture=Math.max(0,capture-dt*.7);return}
    if(!w.patrol.visible||Math.hypot(px-sirenX,pz-sirenZ)>95){
      if(px<=30.45){sirenX=Math.round(px/48)*48-3.3;sirenZ=pz+24}
      else if(highwayAt(px,pz)&&px<304.9){sirenX=clamp(px+(px<46?21:-21),9,300);sirenZ=98.8}
      else if(highwayAt(px,pz)){sirenX=316.2;sirenZ=clamp(pz+(pz>505?-24:24),-120,528)}
      else{
        const zone=regionAt(px,pz);
        if(Math.abs(px-313)<Math.abs(pz-zone.z)){sirenX=316.2;sirenZ=clamp(pz+(pz>zone.z? -24:24),zone.z-62,zone.z+62)}
        else{sirenX=clamp(px+(px>312?-24:24),242,382);sirenZ=zone.z+3.2}
      }
      w.patrol.visible=true;
    }
    const dx=px-sirenX,dz=pz-sirenZ,d=Math.hypot(dx,dz);
    const pace=clamp(Math.abs(state.speed)*.91+4+star*2.7,5,star>=7?34:14+star*2);
    if(d>(star?2.5:6)){
      patrolHeading=Math.atan2(dx,-dz);
      const x=sirenX+dx/d*pace*dt,z=sirenZ+dz/d*pace*dt;
      const allModes=api.isIndoor()||api.isFlying()||api.isBoating()||api.isRail();
      if(allModes){sirenX=x;sirenZ=z}
      else if(solidLand(x,z)&&!api.hit(x,z,.45,.9)){sirenX=x;sirenZ=z}
      else if(!api.hit(sirenX,z,.45,.9)&&solidLand(sirenX,z))sirenZ=z;
      else if(!api.hit(x,sirenZ,.45,.9)&&solidLand(x,sirenZ))sirenX=x;
    }
    w.patrol.position.set(sirenX,api.isFlying()?state.altitude*.8:.05,sirenZ);w.patrol.rotation.y=-patrolHeading;
    w.red.visible=Math.floor(uiClock*5)%2===0;w.blue.visible=!w.red.visible;
    w.helicopter.visible=star>=6;
    if(w.helicopter.visible){
      w.helicopter.position.set(px+Math.cos(uiClock*.16)*17,Math.max(18,state.altitude+21),pz+Math.sin(uiClock*.16)*17);
      w.helicopter.lookAt(px,Math.max(0,state.altitude),pz);w.helicopterRotor.rotation.y+=dt*(star>=7?22:14);
    }
    const backup=star>2?2:star>1?1:0;
    let nearest=Math.hypot(px-sirenX,pz-sirenZ);
    for(let i=0;i<Math.max(backup,pursuit.length);i++){
      if(!pursuit[i]){
        const mesh=w.patrol.clone();w.patrol.parent.add(mesh);pursuit[i]={mesh,lights:[...mesh.children.slice(-2)],x:px,z:pz};
      }
      const u=pursuit[i],dist=Math.hypot(px-u.x,pz-u.z);
      if(i>=backup){u.mesh.visible=false;continue}
      if(!u.mesh.visible||dist>105){
        const spots=[[px,pz-27-i*8],[px+22,pz],[px-22,pz+6],[px,pz+29]];
        const pos=spots.find(([x,z])=>api.isIndoor()||api.isFlying()||api.isBoating()||api.isRail()||solidLand(x,z)&&!api.hit(x,z,.45,.95));
        if(!pos){u.mesh.visible=false;continue}
        [u.x,u.z]=pos;u.mesh.visible=true;
      }
      const dx=px-u.x,dz=pz-u.z,near=Math.hypot(dx,dz);
      if(near>3){
        const x=u.x+dx/near*(pace-1)*dt,z=u.z+dz/near*(pace-1)*dt;
        const allModes=api.isIndoor()||api.isFlying()||api.isBoating()||api.isRail();
        if(allModes){u.x=x;u.z=z}
        else if(solidLand(x,z)&&!api.hit(x,z,.45,.9)){u.x=x;u.z=z}
        else if(solidLand(u.x,z)&&!api.hit(u.x,z,.45,.9))u.z=z;
        else if(solidLand(x,u.z)&&!api.hit(x,u.z,.45,.9))u.x=x;
      }
      u.mesh.position.set(u.x,api.isFlying()?state.altitude*.8:.05,u.z);u.mesh.rotation.y=-Math.atan2(dx,-dz);
      u.lights.forEach((l,j)=>l.visible=(Math.floor(uiClock*5+i)+j)%2===0);
      nearest=Math.min(nearest,near);
    }
    if(api.isIndoor()){
      roadOfficer=null;capture=Math.max(0,capture-dt*.6);return;
    }
    if(api.isWalking()&&star>0&&star<=3&&nearest<1.75&&policeAttackCool<=0){
      policeAttackCool=1.35;api.damagePlayer?.(4+star*2,`Police punch · ${star} star${star===1?'':'s'}`);
    }else if(api.isWalking()&&star>=4&&nearest<3.4&&taserCool<=0){
      taserCool=3.5;api.stunPlayer?.(1.35);api.damagePlayer?.(3+star,`Police taser · ${star} stars`);
    }
    if(star>=5&&nearest<42&&policeAttackCool<=0){
      policeAttackCool=star>=7?1.35:2.25;api.damagePlayer?.(7+star*1.3,`Police fire · ${star} stars`);
    }
    if(star>=7&&api.isFlying()&&w.helicopter.visible&&heliAttackCool<=0){
      heliAttackCool=1.05;api.helicopterHit?.();
    }
    if(star){
      roadOfficer=null;
      const crossMode=api.isIndoor()||api.isFlying()||api.isBoating()||api.isRail();
      const pursuitDistance=crossMode?(api.isIndoor()?35:api.isFlying()?120:55):5.9;
      const canCapture=crossMode?(nearest<pursuitDistance&&(!api.isBoating()||state.depth<.9)):nearest<pursuitDistance&&Math.abs(state.speed)<8.5;
      capture=canCapture?Math.min(1,capture+dt/(4.2-star*.4)):Math.max(0,capture-dt*.6);
      if(capture>=1)book();
      return;
    }
    if(d<14){roadOfficer={x:sirenX,z:sirenZ};if(!panelMode&&api.isRoadVehicle()&&Math.abs(state.speed)<.4&&d<8.7&&alertCool<=0){
      alertCool=18;open('law',{pay:true});
    }}else roadOfficer=null;
  }
  function book(){
    const s=closest(stops.filter(s=>s.type==='law')),duration=18+wanted()*9;
    custody={remaining:duration,duration};capture=0;api.social.close(false);close(false);api.enterVenue(s,'jail');social.notice(`Taken into custody · ${duration} seconds`);
  }
  function release(escape){
    if(!custody)return;
    custody=null;grace=escape?18:6;
    close(false);api.leaveVenue();
    if(escape)law(120,'Virtual escape');
    else law(-state.bounty,'Sentence served');
  }
  function update(dt,t,w){
    uiClock+=dt;alertCool=Math.max(0,alertCool-dt);gadgetCool=Math.max(0,gadgetCool-dt);chime=Math.max(0,chime-dt);
    policeAttackCool=Math.max(0,policeAttackCool-dt);taserCool=Math.max(0,taserCool-dt);heliAttackCool=Math.max(0,heliAttackCool-dt);
    for(const loan of state.bankLoans??[]){
      if(loan.remaining>0&&!loan.bountyCharged&&uiClock>=loan.dueAt){
        loan.bountyCharged=true;law(loan.remaining,'Overdue bank loan');
      }
    }
    if(activeMatch){
      const result=activeMatch.step(dt,state.x,state.z),score=`YOU ${result.player}  ·  ${result.opponent} ${result.opponentScore}`;
      if($('sports-score').textContent!==score)$('sports-score').textContent=score;
      if($('sports-status').textContent!==result.message)$('sports-status').textContent=result.message;
      if(result.done&&!matchRewarded){
        matchRewarded=true;$('sports-action').disabled=true;
        if(result.winner==='player'){social.changeCash(45,'Sports match win');social.notice(`You won against ${result.opponent} · $45 prize.`)}
        else social.notice(`${result.opponent} won the match. Better luck next time.`);
      }
    }
    grace=Math.max(0,grace-dt);flash=Math.max(0,flash-dt);
    if(flash<=0)$('wanted-flash').hidden=true;
    if(custody){custody.remaining=Math.max(0,custody.remaining-dt);if(custody.remaining<=0)release(false)}
    if(arena&&!arena.done&&arena.remaining>0){
      arena.remaining=Math.max(0,arena.remaining-dt);
      if(arena.remaining===0)social.notice('Time up. Restart at the arena terminal.');
    }
    if(w){
      w.signal(t);walkAcross(dt,w);lawPatrol(dt,w);
      const marker=waypoint??(crossing&&!crossing.done?{x:crossing.to,z:crossing.z}:null);
      if(marker){w.way.visible=true;w.way.position.set(marker.x,0,marker.z);w.arrow.position.y=4.0+Math.sin(t*3)*.44;w.arrow.rotation.y=t*.75}
      else w.way.visible=false;
      for(const p of w.props){
        if(Math.hypot(p.vx,p.vz)<.003&&p.vy===0&&p.mesh.position.y<=.55)continue;
        p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=Math.pow(.22,dt);p.vz*=Math.pow(.22,dt);p.vy-=9.81*dt;
        p.mesh.position.set(p.x,Math.max(.55,p.mesh.position.y+p.vy*dt),p.z);
        if(p.mesh.position.y<=.55)p.vy=Math.abs(p.vy)>1.2?-p.vy*.21:0;
        p.mesh.rotation.y+=p.vx*.15*dt;p.mesh.rotation.x+=p.vz*.15*dt;
      }
      if(propFx){
        propFx.age+=dt;const phase=propFx.age/.75;w.pulse.visible=phase<1;
        w.pulse.position.set(propFx.x,.14,propFx.z);w.pulse.scale.setScalar(1+phase*8);
        w.pulse.material.opacity=Math.max(0,.8*(1-phase));
        if(phase>=1)propFx=null;
      }
    }
    if(hijackCutscene){stepHijack(dt);return}
    if(!ride)return;
    if(ride.pilotControl){
      updatePilotFlight(dt);
      api.ridePosition(ride.pose);
      return;
    }
    ride.time=Math.min(ride.duration,ride.time+dt);
    const linearProgress=ride.time/ride.duration,progress=ride.type==='rail'?linearProgress*linearProgress*(3-2*linearProgress):linearProgress;
    if(ride.type==='rail'){
      const a=railAt(ride.from+(ride.to-ride.from)*progress,ride.line);
      if(ride.to<ride.from)a.heading+=Math.PI;
      ride.pose=a;
    }else{
      const p=ride.course(progress);
      if(ride.pack?.foil)p.y+=Math.sin(Math.PI*progress)*1.15;
      ride.pose=p;
    }
    api.ridePosition(ride.pose);
    if(progress>=1&&!ride.arrived){ride.arrived=true;social.notice(`Arrived · ${ride.d.name}`)}
  }
  function updatePilotFlight(dt){
    if(ride.arrived){flightKeys.clear();return}
    const p=ride.pose,steer=Number(flightKeys.has('KeyD')||flightKeys.has('ArrowRight'))-Number(flightKeys.has('KeyA')||flightKeys.has('ArrowLeft')),
      pitch=Number(flightKeys.has('ArrowUp'))-Number(flightKeys.has('ArrowDown'));
    if(flightKeys.has('KeyW'))ride.pilotThrottle=clamp(ride.pilotThrottle+dt*.42,0,1);
    if(flightKeys.has('KeyS'))ride.pilotThrottle=clamp(ride.pilotThrottle-dt*.62,0,1);
    ride.pilotSpeed=clamp(ride.pilotSpeed+(ride.pilotThrottle*8.6-.42-ride.pilotSpeed*ride.pilotSpeed*.0012)*dt,0,58);
    if(flightKeys.has('Space'))ride.pilotSpeed=Math.max(0,ride.pilotSpeed-18*dt);
    const envelope=flightEnvelope(ride.pilotSpeed,ride.pilotBank,24);
    ride.pilotBank+=(steer*.48*envelope.control-ride.pilotBank)*Math.min(1,dt*1.7);
    ride.pilotPitch+=((envelope.stalled?-.18:pitch*.27*envelope.control)-ride.pilotPitch)*Math.min(1,dt*(envelope.stalled?1.8:1.15));
    const lift=(ride.pilotSpeed/envelope.stallSpeed-1)*3.2;
    const climb=envelope.stalled?-envelope.sink:ride.pilotSpeed*Math.sin(ride.pilotPitch)*.52+lift;
    p.y=clamp(p.y+climb*dt,0,190);
    p.heading=(p.heading+coordinatedTurnRate(ride.pilotSpeed,ride.pilotBank,17)*dt+Math.PI*2)%(Math.PI*2);
    p.x+=Math.sin(p.heading)*ride.pilotSpeed*dt;
    p.z-=Math.cos(p.heading)*ride.pilotSpeed*dt;
    ride.pilotDistance+=ride.pilotSpeed*dt;
    ride.time=ride.duration*Math.min(.99,ride.pilotDistance/ride.pilotRouteLength);
    state.throttle=ride.pilotThrottle;state.pitch=ride.pilotPitch;state.bank=ride.pilotBank;state.airborne=p.y>.3;
    const end=ride.course(1),distance=Math.hypot(end.x-p.x,end.z-p.z);
    if(distance<38&&p.y<9&&ride.pilotSpeed<24&&!ride.arrived){
      ride.arrived=true;ride.time=ride.duration;flightKeys.clear();api.syncSelection();social.notice(`Landed · ${ride.d.name}`);api.sound(515);
    }
  }
  function rideInteract(){
    if(!ride)return;
    if(!ride.arrived){social.notice('Stay aboard until the next stop.');return}
    const dest=ride.d,line=ride.line;
    const completedRide=ride;ride=null;api.endRide(dest,completedRide);
    if(dest.type==='rail')gatePasses.set(dest.id,'arrival');
    api.refresh();
  }
  function outOfRide(){
    if(!ride)return false;
    if(ride.arrived){rideInteract();return true}
    social.notice('Wait for arrival before changing transportation.');return true;
  }
  function gadget(w){
    if(ride||panelMode||!api.isWalking())return;
    if(api.venue()?.zone==='arena'){
      if(!arena||arena.done||arena.remaining<=0){social.notice('Start a round from the arena terminal.');return}
      if(gadgetCool>0)return;
      gadgetCool=.45;
      const aim=api.venue().targets.filter(p=>p.action==='hologram'&&!arena.tags.includes(p.data)).map(p=>{
        const dx=p.x-state.x,dz=p.z-state.z,d=Math.hypot(dx,dz);
        return {...p,d,dot:(dx*Math.sin(state.heading)-dz*Math.cos(state.heading))/Math.max(.13,d)};
      }).filter(p=>p.d<10&&p.dot>.70).sort((a,b)=>a.d-b.d)[0];
      if(!aim){social.notice('No training target ahead. Aim at a hologram within 10 m.');return}
      api.venue().tag(aim.data,false);arena.tags.push(aim.data);api.sound(448+aim.data*55);
      if(arena.tags.length===3){arena.done=true;social.changeCash(35,'Hologram Tag prize')}
      else social.notice(`${arena.tags.length} / 3 holograms tagged`);
      return;
    }
    if(api.isIndoor())return;
    if(!state.gadget){social.notice('Buy a test gadget at the Mod Garage.');return}
    if(gadgetCool>0)return;
    gadgetCool=1.15;
    const [x,z]=api.position(),aimX=x+Math.sin(state.heading)*2.3,aimZ=z-Math.cos(state.heading)*2.3;
    const [reach,push,lift,color,side=0,damp=1,recolor=false,reset=false]=gadgets[state.gadget]?.fx??[8.1,5.8,3.6,'#92f5dc'];
    propFx={x:aimX,z:aimZ,age:0};w.pulse.material.color.set(color);api.sound(105+reach*14);
    for(const o of w.props){
      const dx=o.x-aimX,dz=o.z-aimZ,d=Math.hypot(dx,dz);
      if(d<reach){
        o.origin??=[o.x,o.z];
        if(reset){[o.x,o.z]=o.origin;o.vx=o.vy=o.vz=0;o.mesh.position.set(o.x,.55,o.z);o.mesh.rotation.set(0,0,0);continue}
        o.vx=o.vx*damp+(dx*push-dz*side)/Math.max(.6,d);o.vz=o.vz*damp+(dz*push+dx*side)/Math.max(.6,d);
        if(lift!==null)o.vy=lift;
        if(recolor){if(!o.mesh.userData.tint){o.mesh.material=o.mesh.material.clone();o.mesh.userData.tint=true}o.mesh.material.color.set(color)}
      }
    }
    if(!(x>8&&x<18&&z>-30&&z<-10)&&regionAt(x,z).id!=='future')fine('pulse');
  }
  function bridgeToggle(){
    if(!api.isFlying()&&!api.isBoating()&&!api.isRail()&&!(ride&&['airport','ferry','rail','bus','taxi'].includes(ride.type))){social.notice('Control rooms are available in aircraft, boats, trains, and on passenger trips.');return}
    if(state.phase==='crashed')return;
    cockpitOn=!cockpitOn;
    if(!cockpitOn){assist=false;viewTrim=0;lamp=false}
    api.snap();api.refresh();api.focus();
  }
  function resetCockpit(){cockpitOn=false;lamp=false;assist=false;viewTrim=0}
  function playerDeath(){
    close(false);ride=null;boarding=null;railBoarding=null;serviceBoarding=null;hijackCutscene=null;arena=null;custody=null;
    if(activeMatch){activeMatch.dispose();activeMatch=null;$('sports-hud').hidden=true}
    sportsSelection=null;matchRewarded=false;
    capture=0;grace=0;leadActive=false;policeAttackCool=taserCool=heliAttackCool=0;
  }
  function refresh(){
    const output=$('bounty');
    output.textContent=money(state.bounty);$('law-badge').classList.toggle('hot',state.bounty>=60);
    $('law-badge').setAttribute('aria-label',`Bounty ledger, ${state.bounty} dollars outstanding`);
    document.body.classList.toggle('transit-open',!!panelMode);
    const showCabin=!!ride&&cabinService(ride.type)&&cockpitOn&&!ride.pilotControl,star=wanted();
    $('wanted-hud').hidden=!star&&!custody;
    $('wanted-stars').textContent='★'.repeat(star);
    $('wanted-status').textContent=custody?`CUSTODY · ${Math.ceil(custody.remaining)}s`:grace>0?`GRACE · ${Math.ceil(grace)}s`:api.isIndoor()?'WANTED · INDOORS':capture>0?'CAPTURE RISK':'ACTIVE PURSUIT';
    $('wanted-capture').hidden=capture<=0||!!custody;$('wanted-capture').value=capture;
    if(custody&&['custody','puzzle'].includes(panelMode)){
      const clock=area.querySelector('.custody-clock'),label=`${Math.ceil(custody.remaining)} seconds until release`;
      if(clock&&clock.textContent!==label)clock.textContent=label;
    }
    if(panelMode==='ward-person'){
      const clock=area.querySelector('.violet-clock');
      if(clock){
        const status=api.wardActions(selection),label=`Violet exposure · ${status.remaining}s to use the antidote`;
        if(status.dead)paint();
        else if(clock.textContent!==label)clock.textContent=label;
      }
    }
    cockpit.hidden=!cockpitOn||showCabin;
    $('cabin-panel').hidden=!showCabin;
    $('cockpit-view').hidden=!(api.isFlying()||api.isBoating()||api.isRail()||ride);
    if(cockpitOn&&!showCabin){
      $('bridge-name').textContent=ride?ride.pilotControl?'Pacifica Air · Flight Deck':ride.type==='airport'?'Pacifica Air · Passenger Cabin':ride.type==='taxi'?'Taxi cabin':'Ferry observation deck':api.isFlying()?'Pilot cockpit':api.isRail()?'Railcar cab':'Wheelhouse';
      $('bridge-gauge').textContent=`${String(((Math.round(state.heading*180/Math.PI)%360)+360)%360).padStart(3,'0')}° · ${Math.round(Math.abs(state.speed)*3.6)} km/h`;
      $('bridge-light').setAttribute('aria-pressed',String(lamp));$('bridge-hold').setAttribute('aria-pressed',String(assist));
      $('bridge-hold').hidden=!!ride||api.isRail();
      cockpit.classList.toggle('deck-lit',lamp);cockpit.classList.toggle('chiming',chime>0);
    }
    live.hidden=!ride;
    if(ride){
      $('ride-line').textContent=`${vehicleLabels[ride.type]} · ${ride.pilotControl?'PILOTING':ride.pack?.name??ride.cls}${ride.pack&&cabinService(ride.type)?` · ${ride.cls}`:''}`;
      $('ride-title').textContent=ride.arrived?`Arrived at ${ride.d.name}`:ride.d.name;
      $('ride-progress').value=ride.time/ride.duration;
      $('ride-exit').hidden=!ride.arrived;
      $('ride-view').hidden=false;$('ride-view').childNodes[0].nodeValue=cockpitOn?'Outside view ':'Inside view ';
      $('ride-sector').textContent=ride.type==='rail'?railSector(ride.pose.x,ride.pose.y).toUpperCase():ride.pilotControl?'MANUAL FLIGHT · W/S THROTTLE · ARROWS PITCH / BANK · SPACE BRAKE':ride.paid?'VALIDATED FARE':'UNVALIDATED FARE';
      if(showCabin){
        const data=seats[ride.cls];$('cabin-panel').dataset.level=cabinLevel(ride.cls);
        $('cabin-line').textContent=cabinTitle(ride.type);$('cabin-title').textContent=ride.cls;$('cabin-seat').textContent=data.seat;
        $('cabin-tv-toggle').hidden=!data.screen;$('cabin-tv').hidden=!ride.tv;
        $('cabin-tv-label').textContent=data.screen;$('cabin-tv-toggle').textContent=ride.tv?'Next TV channel':'Turn on TV';
        $('cabin-channel').textContent=['Route map','Pacifica Highlights','Quiet skies'][ride.channel];
        $('cabin-tv').dataset.channel=ride.channel;$('cabin-tv').style.setProperty('--ride-progress',`${100*ride.time/ride.duration}%`);
        $('cabin-service').hidden=!ride.service;$('cabin-service').textContent=ride.service;
        $('cabin-call').hidden=!data.screen;
      }
    }
  }
  function key(e){
    if(hijackCutscene)return true;
    if(e.repeat&&e.code!=='Space')return false;
    if(activeMatch&&e.code==='KeyX'){e.preventDefault();if(!e.repeat)sportAction();return true}
    if(activeMatch&&e.code==='Escape'){e.preventDefault();endSports();return true}
    if(panelMode){
      if(e.code==='Escape'){e.preventDefault();close();return true}
      return true;
    }
    if(e.code==='KeyT'){e.preventDefault();if(ride||custody)return true;atlasRegion=regionAt(...api.position()).id;open('atlas');return true}
    if(e.code==='KeyL'){e.preventDefault();if(!ride&&!custody)open('law');return true}
    if(e.code==='KeyP'){e.preventDefault();bridgeToggle();return true}
    if(ride){
      if(ride.pilotControl&&['KeyW','KeyS','ArrowUp','ArrowDown','KeyA','KeyD','ArrowLeft','ArrowRight','Space'].includes(e.code)){
        e.preventDefault();flightKeys.add(e.code);return true;
      }
      if(e.code==='KeyE'||e.code==='KeyG'){e.preventDefault();rideInteract()}
      if(e.code==='KeyC'){e.preventDefault();bridgeToggle()}
      return true;
    }
    return false;
  }
  function keyUp(e){flightKeys.delete(e.code)}
  function clearFlightInputs(){flightKeys.clear()}
  function flightInput(code,down){
    if(!ride?.pilotControl)return;
    if(down)flightKeys.add(code);else flightKeys.delete(code);
  }
  $('transit-close').addEventListener('click',()=>close());$('transit-toggle').addEventListener('click',()=>{if(panelMode){close();return}if(!ride&&!custody){atlasRegion=regionAt(...api.position()).id;open('atlas')}});
  $('sports-action').addEventListener('click',sportAction);$('sports-exit').addEventListener('click',()=>endSports());
  $('law-badge').addEventListener('click',()=>{if(!ride&&!custody)open('law')});
  $('ride-exit').addEventListener('click',rideInteract);$('ride-view').addEventListener('click',bridgeToggle);$('cockpit-view').addEventListener('click',bridgeToggle);
  $('bridge-light').addEventListener('click',()=>{lamp=!lamp;refresh();api.focus()});
  $('bridge-hold').addEventListener('click',()=>{assist=!assist;refresh();api.focus()});
  $('bridge-chime').addEventListener('click',()=>{chime=.62;api.sound(515);refresh();api.focus()});
  $('bridge-pan').addEventListener('click',()=>{viewTrim=viewTrim===0?-.53:viewTrim<0?.53:0;api.snap();api.focus()});
  $('cabin-meal').addEventListener('click',()=>{if(ride){const s=seats[ride.cls];if(s)ride.service=`${s.size}: ${s.food}.`;refresh();api.focus()}});
  $('cabin-call').addEventListener('click',()=>{if(ride){const s=seats[ride.cls];if(s)ride.service=`VIP service · Your attendant brings ${s.drink.toLowerCase()}.`;refresh();api.focus()}});
  $('cabin-tv-toggle').addEventListener('click',()=>{if(ride&&seats[ride.cls]?.screen){if(ride.tv)ride.channel=(ride.channel+1)%3;ride.tv=true;refresh();api.focus()}});
  $('cabin-look').addEventListener('click',()=>{viewTrim=viewTrim===0?.39:viewTrim>0?-.39:0;api.snap();api.focus()});
  return {refresh,update,key,keyUp,clearFlightInputs,flightInput,atStation,venueEntranceAt,autoFareGateAt,boardTransitAt,gateOpen:id=>gatePasses.has(id),handle,fine,law,airPiracyTick:()=>law(8,'Ongoing air piracy'),collision,runSignals,gadget,bridgeToggle,resetCockpit,playerDeath,
    panel:()=>panelMode,close,rideInteract,outOfRide,ride:()=>ride,waypoint:()=>waypoint,venueAction,leaveVenueState,detained:()=>!!custody,round:()=>arena,
    sporting:()=>!!activeMatch,sportAction,endSports,
    cutscene:()=>!!hijackCutscene,
    cockpit:()=>cockpitOn,trim:()=>viewTrim,assist:()=>assist,lamp:()=>lamp,mark,patrolTalk:()=>open('law',{pay:true}),
    inspect:()=>({view:panelMode,gate:api.venue()?gatePasses.get(api.venue().stop.id)??null:null,
      boarding:boarding?{from:boarding.ride.s.id,to:boarding.ride.d.id,pilot:boarding.pilot}:null,
      ride:ride?{from:ride.s.id,to:ride.d.id,type:ride.type,line:ride.line,pack:ride.pack?.name,progress:ride.time/ride.duration,arrived:!!ride.arrived,paid:ride.paid,pilotControl:!!ride.pilotControl,cls:ride.cls,y:ride.pose?.y,tv:ride.tv,service:ride.service,speed:ride.pilotSpeed}:null,
      crossing:crossing?{...crossing}:null,waypoint:waypoint?.id??null,bountyLog:log,sport:activeMatch?.status()??null,cockpit:cockpitOn,light:lamp,hold:assist,trim:viewTrim,
      wanted:wanted(),units:Number(leadActive)+pursuit.filter(p=>p.mesh.visible).length,capture,custody,grace,arena,care:[...careDone],wardTaken,wardDrill,hijackCutscene:hijackCutscene?.elapsed??0})
  };
}
