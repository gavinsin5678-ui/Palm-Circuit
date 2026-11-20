import {regions,regionAt,stops,stopById,stopTypes,railAt,railStop,railSector,signals,signalAt,solidLand,highwayAt} from './metro-world.js?v=rail-network';
import {sportsCard,sportModes} from './sports.js?v=connections';
import {animatePerson} from './life-world.js?v=connections';
import {hasVenue,venueFor} from './terminal-world.js?v=streets';
import {seats,cabinLevel,cabinService,cabinTitle} from './cabin.js?v=terminal';
import {fleetProducts,aircraft} from './fleet.js?v=fleet-variants';
import {weapons} from './combat.js?v=streets';

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
    return [[s.x,s.z],[sx,s.z],[sx,sz],...(scenic?stroll:[]),[sx,dz],[dx,dz],[dx,d.z],[d.x,d.z]];
  }
  const join=[[3.5,99.4],[311,99.4]],bridge=s.region==='main'?join:d.region==='main'?[...join].reverse():[];
  return [[s.x,s.z],[sx,s.z],[sx,sz],...bridge,[dx,dz],[dx,d.z],[d.x,d.z]];
}
function ferryPath(s,d,scenic){
  const x=q=>q.region==='main'?47:216;
  const z=q=>q.z;
  const end=q=>q.region==='main'?36:223;
  return [[end(s),z(s),.18],[x(s),z(s),.18],...(scenic?[[140,(z(s)+z(d))*.5+38,.18]]:s.region===d.region?[]:[[x(d),z(s),.18]]),[x(d),z(d),.18],[end(d),z(d),.18]];
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
  const log=[],gatePasses=new Map(),flightKeys=new Set();let panelMode=null, selection=null, ride=null, boarding=null, sport=null, waypoint=null, crossing=null, incident=null, roadOfficer=null;
  let alertCool=0, propFx=null, gadgetCool=0, atlasRegion='main', purchaseMsg='', prevSignal=null, uiClock=0;
  let sirenX=0,sirenZ=0, patrolHeading=0, cockpitOn=false, lamp=false, assist=false, chime=0, viewTrim=0;
  let pursuit=[],capture=0,custody=null,grace=0,flash=0,puzzleStep=0,arena=null,leadActive=false;
  const careDone=new Set(),wardRobbed=new Set();
  let wardTaken=false,wardDrill=0;
  const tiers=[200,325,500,725,1000],wanted=()=>tiers.filter(b=>state.bounty>=b).length;
  function law(delta,label){
    const previous=wanted(),old=state.bounty;state.bounty=Math.max(0,state.bounty+delta);state.heat=Math.min(5,Math.ceil(state.bounty/48));
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
  function heading(kicker,title){
    $('transit-kicker').textContent=kicker;
    $('transit-title').textContent=title;
  }
  function open(mode,select=null,remember=false){
    panelMode=mode;selection=select;if(!remember)purchaseMsg='';
    if(mode!=='sports-game')sport=null;
    panel.hidden=false;api.clearKeys();paint();$('transit-close').focus({preventScroll:true});api.refresh();
  }
  function close(focus=true){panelMode=null;selection=null;sport=null;panel.hidden=true;if(focus)api.focus();api.refresh()}
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
      if(gatePasses.has(s.id)){copy(gatePasses.get(s.id)==='paid'?'Ticket validated. Walk through the gate to your platform.':gatePasses.get(s.id)==='arrival'?'Connection access is open. A new trip requires a ticket.':'The fare violation has already been recorded.');return}
      copy('Validate once to unlock both platforms. The $9 entry includes an Economy ticket.');
      const pass=paid=>{
        if(paid&&state.cash<9){purchaseMsg=`You are ${money(9-state.cash)} short.`;paint();return}
        gatePasses.set(s.id,paid?'paid':'unpaid');
        if(paid)social.changeCash(-9,'Rail station entry');else fine('fare');
        const pos=[state.x,state.z],heading=state.heading;
        close(false);api.enterVenue(s,'concourse',true,pos,heading);
      };
      item('Pay $9 and open the gate','ECONOMY FARE INCLUDED',()=>pass(true));
      item('Skip the fare','+$9 bounty',()=>pass(false),{alt:true});
    }
    if(panelMode==='station'||panelMode==='check-in'){
      const s=selection.stop, line=selection.line;
      heading(stopTypes[s.type],s.name);
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      copy(panelMode==='check-in'?'Consult the departure board. Then walk to Gate A or Gate B to buy a fare and board.':line==='below'?'Cross-Bay Metro · Underground and under-bay service.':line==='surface'?'Coastal Rail · Above-ground local service.':'Choose a destination to buy a fare and board.');
      for(const d of availableDestinations(s,line)){
        const desk=panelMode==='check-in';
        item(d.name,line==='below'?'CROSS-BAY METRO':line==='surface'?'COASTAL RAIL':`From ${money(quote(s,d))}`,desk?null:()=>open('ticket',{stop:s,dest:d,line}),{disabled:desk});
      }
    }
    if(panelMode==='ticket'){
      const {stop:s,dest:d,line}=selection, base=quote(s,d),pass=gatePasses.get(s.id);
      heading(`${vehicleLabels[s.type]} · ${s.name}`,d.name);
      if(purchaseMsg)copy(purchaseMsg,'transit-warning');
      if(commuterTypes.includes(s.type)){
        copy('Choose a variant, then ride as a passenger for the standard fare or drive yourself for $10 more.');
        for(const [id,p] of Object.entries(fleetProducts).filter(([,p])=>p.family===s.type)){
          copy(`${p.info} · Handling ${p.power.toFixed(2)} power / ${p.steer.toFixed(2)} steering`,'product-info');
          item(`Ride as Passenger · ${p.name}`,`${money(base)} · standard fare`,()=>ticket(s,d,base,'Economy',false,line,{name:p.name,vehicleId:id}),{disabled:state.cash<base});
          item(`Drive Yourself · ${p.name}`,`${money(base+10)} · fare plus $10`,()=>ticket(s,d,base+10,'Standard',false,line,{vehicleId:id,driveSelf:true}),{disabled:state.cash<base+10});
        }
      }else if(s.type==='airport'){
        copy(`Gate ${line??'A'} · Choose passenger service or buy the flight-deck option for $10 above the standard ticket price.`);
        item('Fly as Passenger',`${money(base)} · standard Economy ticket`,()=>open('flight-class',selection),{disabled:state.cash<base});
        item('Fly Yourself',`${money(base+10)} · standard ticket plus $10 pilot fee`,()=>ticket(s,d,base+10,'Economy',false,line,{pilot:true,gate:line??'A'}),{disabled:state.cash<base+10});
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
    if(panelMode==='flight-class'){
      const {stop:s,dest:d,line}=selection,base=quote(s,d);
      heading('PACIFICA AIR · PASSENGER CABIN',d.name);
      copy('Select your passenger cabin. Economy is the standard ticket price; Business and First Class add the listed cabin upgrade.');
      for(const [i,cls] of Object.keys(seats).entries()){
        const fare=base+[0,33,64][i];
        item(`Fly as Passenger · ${cls}`,money(fare),()=>ticket(s,d,fare,cls,false,line,{gate:line??'A'}),{disabled:state.cash<fare});
      }
      item('Back to flight options','',()=>open('ticket',selection));
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
      copy('Free to enter. Win a challenge to earn $45. Use the on-screen button or Space to play.');
      for(const [id,m] of Object.entries(sportModes))item(m.name,m.icon,()=>{open('sports-game',selection);sport=sportsCard(id,n=>social.changeCash(n,`${m.name} prize`));paint()});
    }
    if(panelMode==='sports-game'&&sport){
      const m=sportModes[sport.status().id];
      heading('TAKE FIVE · SPORTS CHALLENGE',m.name);
      copy(m.instruction);area.append(sport.root);
      item('Back to sports','',()=>open('sports',selection));
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
    if(pack?.driveSelf&&fleetProducts[pack.vehicleId]?.family!==s.type)return;
    if(state.cash<fare){purchaseMsg=`You are ${money(fare-state.cash)} short. Choose another service or earn more cash.`;paint();return}
    if(fare>0)social.changeCash(-fare,`${stopTypes[s.type]} fare`);else if(unpaid&&gatePasses.get(s.id)!=='unpaid')fine('fare');
    if(s.type==='rail')gatePasses.delete(s.id);
    if(pack?.driveSelf){
      waypoint=d;close(false);api.driveTransitVehicle(pack.vehicleId,s,d);api.focus();api.refresh();return;
    }
    if(s.type==='airport'){
      boarding={ride:buildRide(s,d,!unpaid,cls,line,pack),pilot:!!pack?.pilot};
      close(false);api.enterVenue(s,'jetbridge',false,[0,15],0);return;
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
    ride.pilotControl=pilot;ride.pilotSpeed=0;ride.pilotThrottle=0;ride.pilotPitch=0;ride.pilotBank=0;ride.pilotDistance=0;
    const start=ride.course(0),end=ride.course(1);
    ride.pilotRouteLength=Math.max(1,Math.hypot(end.x-start.x,end.z-start.z));
    waypoint=null;flightKeys.clear();api.startRide();cockpitOn=true;close(false);api.focus();api.refresh();
  }
  function closest(list){const [x,z]=api.position();return [...list].sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0]}
  function handle(s){
    if(custody)return;
    if(s.type==='sports'){open('sports',s);return}
    if(s.type==='law'){open('law',{pay:true});return}
    if(s.type==='garage'){open('garage');return}
    if(s.type==='good'){if(!crossing)open('crossing');return}
    if(hasVenue(s)&&api.isWalking()){waypoint=null;api.enterVenue(s,venueFor(s),gatePasses.has(s.id));return}
    social.notice('Get out of the vehicle and approach the entrance on foot.');
  }
  function leaveVenueState(s){gatePasses.delete(s.id);if(s.type==='arena')arena=null}
  function venueAction(a){
    const v=api.venue(),s=v?.stop;
    if(!s)return;
    switch(a.action){
      case 'street': api.leaveVenue();break;
      case 'rail-gate':open('rail-gate',s);break;
      case 'platform': if(gatePasses.has(s.id)&&state.z<-4)api.enterVenue(s,a.data,true);else social.notice('Use the fare gate first.');break;
      case 'hall': api.enterVenue(s,'concourse',true,[0,-12],Math.PI);break;
      case 'departures': if(s.type!=='rail'||gatePasses.has(s.id))open('station',{stop:s,line:a.data});break;
      case 'aircraft-boarding': if(boarding)api.enterVenue(s,'airliner',false,[0,25.2],0);else social.notice('You need a flight ticket to board.');break;
      case 'flight-seat': if(boarding)startFlight(false);else social.notice('You need a flight ticket to board.');break;
      case 'flight-deck': if(boarding)startFlight(true);else social.notice('You need a flight ticket to board.');break;
      case 'airport':api.enterVenue(s,'airport',false,[0,-13],Math.PI);break;
      case 'jetbridge':api.enterVenue(s,'jetbridge',false,[0,15],0);break;
      case 'check-in':open('check-in',{stop:s});break;
      case 'hangar':api.enterVenue(s,'hangar');break;
      case 'terminal':api.enterVenue(s,'airport',false,[11,-13],Math.PI);break;
      case 'air-sales':open('air-sales');break;
      case 'runway':open('runway',s);break;
      case 'care':open('care',a.data);break;
      case 'ward-person':open('ward-person',a.data);break;
      case 'ward-theft':open('ward-theft');break;
      case 'ward-sim':open('ward-sim');break;
      case 'arena':open('arena');break;
      case 'custody':if(custody)open('custody');break;
      case 'hologram':social.notice('Face the hologram and press Q to tag it during a round.');break;
      case 'staff':{
        const line=v.zone==='concourse'?'Validate at the middle gate, then take the stairs to the surface platforms or the underground Metro. The Railcar in your fleet is separate.':
          v.zone==='airport'?'Flights board at Gate A and Gate B. Buy a ticket for passenger service or the $10 pilot option, then walk through the jet bridge to the aircraft.':
          v.zone==='hospital'?'Our volunteers bring blankets, return lost items, guide families, and help in the training room. Look for the markers beside the bays.':
          v.zone==='hangar'?'Browse the catalog here or go to the far end to take an owned aircraft onto the runway.':'Walk to the marked boarding point to check prices and destinations.';
        open('staff',{name:a.data,kicker:s.name,line});break;
      }
    }
  }
  function atStation(x,z,walk){
    if(ride)return [];
    const list=stops.filter(s=>Math.abs(s.x-x)<17&&Math.abs(s.z-z)<18&&(walk||s.type==='taxi'||s.type==='law'))
      .filter(s=>s.type!=='good'||!crossing)
      .map(s=>({...s,z:s.z+(hasVenue(s)?3.5:0),kind:s.type,type:'transit',r:s.type==='rail'?7.5:s.type==='good'?4.5:5.8,label:s.type==='good'?s.name:`Visit ${s.name}`,station:s}));
    if(roadOfficer&&walk&&Math.hypot(x-roadOfficer.x,z-roadOfficer.z)<13)list.push({...roadOfficer,type:'patrol',label:'Talk to patrol officer',r:9});
    return list;
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
    const star=wanted(),[px,pz]=api.position(),active=state.bounty>=60&&state.phase==='running'&&state.mode==='roam'&&!ride&&!api.isIndoor()&&solidLand(px,pz)&&!api.isFlying()&&!api.isBoating()&&!api.isRail()&&!custody&&grace<=0;
    leadActive=active;
    if(!active){w.patrol.visible=false;for(const u of pursuit)u.mesh.visible=false;roadOfficer=null;capture=Math.max(0,capture-dt*.7);return}
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
    const pace=clamp(Math.abs(state.speed)*.91+4+star*1.8,5,14+star*4);
    if(d>(star?2.5:6)){
      patrolHeading=Math.atan2(dx,-dz);
      const x=sirenX+dx/d*pace*dt,z=sirenZ+dz/d*pace*dt;
      if(solidLand(x,z)&&!api.hit(x,z,.45,.9)){sirenX=x;sirenZ=z}
      else if(!api.hit(sirenX,z,.45,.9)&&solidLand(sirenX,z))sirenZ=z;
      else if(!api.hit(x,sirenZ,.45,.9)&&solidLand(x,sirenZ))sirenX=x;
    }
    w.patrol.position.set(sirenX,.05,sirenZ);w.patrol.rotation.y=-patrolHeading;
    w.red.visible=Math.floor(uiClock*5)%2===0;w.blue.visible=!w.red.visible;
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
        const pos=spots.find(([x,z])=>solidLand(x,z)&&!api.hit(x,z,.45,.95));
        if(!pos){u.mesh.visible=false;continue}
        [u.x,u.z]=pos;u.mesh.visible=true;
      }
      const dx=px-u.x,dz=pz-u.z,near=Math.hypot(dx,dz);
      if(near>3){
        const x=u.x+dx/near*(pace-1)*dt,z=u.z+dz/near*(pace-1)*dt;
        if(solidLand(x,z)&&!api.hit(x,z,.45,.9)){u.x=x;u.z=z}
        else if(solidLand(u.x,z)&&!api.hit(u.x,z,.45,.9))u.z=z;
        else if(solidLand(x,u.z)&&!api.hit(x,u.z,.45,.9))u.x=x;
      }
      u.mesh.position.set(u.x,.05,u.z);u.mesh.rotation.y=-Math.atan2(dx,-dz);
      u.lights.forEach((l,j)=>l.visible=(Math.floor(uiClock*5+i)+j)%2===0);
      nearest=Math.min(nearest,near);
    }
    if(star){
      roadOfficer=null;
      capture=nearest<5.9&&Math.abs(state.speed)<8.5?Math.min(1,capture+dt/(4.2-star*.4)):Math.max(0,capture-dt*.6);
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
    grace=Math.max(0,grace-dt);flash=Math.max(0,flash-dt);
    if(flash<=0)$('wanted-flash').hidden=true;
    if(custody){custody.remaining=Math.max(0,custody.remaining-dt);if(custody.remaining<=0)release(false)}
    if(arena&&!arena.done&&arena.remaining>0){
      arena.remaining=Math.max(0,arena.remaining-dt);
      if(arena.remaining===0)social.notice('Time up. Restart at the arena terminal.');
    }
    if(sport)sport.step(dt);
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
    if(!ride)return;
    if(ride.pilotControl){
      updatePilotFlight(dt);
      api.ridePosition(ride.pose);
      return;
    }
    ride.time=Math.min(ride.duration,ride.time+dt);
    const progress=ride.time/ride.duration;
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
    ride.pilotSpeed=clamp(ride.pilotSpeed+(ride.pilotThrottle*13-2.6)*dt,0,58);
    if(flightKeys.has('Space'))ride.pilotSpeed=Math.max(0,ride.pilotSpeed-18*dt);
    ride.pilotBank+=(steer*.48-ride.pilotBank)*Math.min(1,dt*1.7);
    ride.pilotPitch+=(pitch*.27-ride.pilotPitch)*Math.min(1,dt*1.15);
    if(p.y<.3&&ride.pilotSpeed<23)p.y=0;
    else p.y=clamp(p.y+ride.pilotSpeed*Math.sin(ride.pilotPitch)*dt,0,190);
    p.heading=(p.heading+Math.sin(ride.pilotBank)*.14*(Math.max(12,ride.pilotSpeed)/30)*dt+Math.PI*2)%(Math.PI*2);
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
    ride=null;api.endRide(dest);
    if(dest.type==='rail'){gatePasses.set(dest.id,'arrival');api.enterVenue(dest,line,true,[0,-7],Math.PI)}
    else if(hasVenue(dest))api.enterVenue(dest,venueFor(dest),false,[0,dest.type==='airport'?-13:-5],Math.PI);
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
    if(e.repeat&&e.code!=='Space')return false;
    if(panelMode){
      if(e.code==='Escape'){e.preventDefault();close();return true}
      if(sport&&e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(!e.repeat)sport.action();return true}
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
  return {refresh,update,key,keyUp,clearFlightInputs,flightInput,atStation,handle,fine,law,collision,runSignals,gadget,bridgeToggle,resetCockpit,
    panel:()=>panelMode,close,rideInteract,outOfRide,ride:()=>ride,waypoint:()=>waypoint,venueAction,leaveVenueState,detained:()=>!!custody,round:()=>arena,
    cockpit:()=>cockpitOn,trim:()=>viewTrim,assist:()=>assist,lamp:()=>lamp,mark,patrolTalk:()=>open('law',{pay:true}),
    inspect:()=>({view:panelMode,gate:api.venue()?gatePasses.get(api.venue().stop.id)??null:null,
      boarding:boarding?{from:boarding.ride.s.id,to:boarding.ride.d.id,pilot:boarding.pilot}:null,
      ride:ride?{from:ride.s.id,to:ride.d.id,type:ride.type,line:ride.line,pack:ride.pack?.name,progress:ride.time/ride.duration,arrived:!!ride.arrived,paid:ride.paid,pilotControl:!!ride.pilotControl,cls:ride.cls,y:ride.pose?.y,tv:ride.tv,service:ride.service,speed:ride.pilotSpeed}:null,
      crossing:crossing?{...crossing}:null,waypoint:waypoint?.id??null,bountyLog:log,sport:sport?.status()??null,cockpit:cockpitOn,light:lamp,hold:assist,trim:viewTrim,
      wanted:wanted(),units:Number(leadActive)+pursuit.filter(p=>p.mesh.visible).length,capture,custody,grace,arena,care:[...careDone],wardTaken,wardDrill})
  };
}
