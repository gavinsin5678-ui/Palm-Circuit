import * as T from './vendor/three.module.min.js';
import {person,animatePerson} from './life-world.js?v=streets';

const geometry=new T.BoxGeometry(),mats=new Map();
function material(color,luminous=false){
  const key=color+luminous;
  if(!mats.has(key))mats.set(key,luminous?new T.MeshBasicMaterial({color}):new T.MeshLambertMaterial({color}));
  return mats.get(key);
}
function block(g,x,y,z,w,h,d,color,luminous=false){
  const o=new T.Mesh(geometry,material(color,luminous));o.position.set(x,y,z);o.scale.set(w,h,d);g.add(o);return o;
}
const textures=new Map();
function placard(g,x,y,z,w,label,sub='',accent='#8fe5c9',rot=0){
  const h=sub?w*.275:w*.165,key=[label,sub,accent].join('/');
  if(!textures.has(key)){
    const c=document.createElement('canvas');c.width=640;c.height=sub?176:108;
    const q=c.getContext('2d');q.fillStyle='#102531';q.fillRect(0,0,c.width,c.height);
    q.fillStyle=accent;q.fillRect(0,0,12,c.height);q.font='800 54px system-ui';q.textBaseline='middle';q.fillText(label,34,sub?61:57,568);
    if(sub){q.font='700 26px system-ui';q.fillStyle='#d9eae5';q.fillText(sub,38,122,555)}
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;textures.set(key,tex);
  }
  const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:textures.get(key),side:T.DoubleSide}));
  o.userData.venueLabel=true;o.position.set(x,y,z);o.rotation.y=rot;g.add(o);
}
const tint={concourse:'#8fd8c2',surface:'#ecc18d',below:'#7ddddd',airport:'#a5c9ec',hangar:'#f3bc7e',hospital:'#aee6dc',jail:'#e7bb72',arena:'#cbaeed',bus:'#a9d6a5',taxi:'#f0cc8c',ferry:'#8fdce1'};
export const hasVenue=s=>s&&['rail','airport','hospital','arena','bus','taxi','ferry'].includes(s.type);
export function venueFor(stop,zone){
  return zone??(stop.type==='rail'?'concourse':stop.type);
}
export function makeTerminal(stop,zone,openGate=false){
  const scene=new T.Scene(),g=new T.Group();scene.add(g);scene.background=new T.Color('#263846');
  scene.add(new T.HemisphereLight('#e5f6ff','#b29b8b',2.2));
  const key=new T.DirectionalLight('#fff0cb',2);key.position.set(4,10,5);scene.add(key);
  const compact=['bus','taxi','ferry'].includes(zone);
  const w=zone==='jail'?6.5:zone==='hospital'?13:compact?9:16,d=zone==='jail'?6:zone==='hospital'?15:compact?12:22;
  const accent=tint[zone], points=[],targets=[],people=[],belts=[],trains=[];
  const box=(...v)=>block(g,...v);
  const sign=(x,y,z,b,label,sub='',rot=0)=>placard(g,x,y,z,b,label,sub,accent,rot);
  const target=(label,x,z,action,data=null,r=2.6)=>targets.push({id:action+(data??''),type:'venue',label,x,z,r,action,data});
  const solid=(x,z,r,s)=>points.push({x,z,w:r,d:s});
  const npc=(x,z,name,shirt,act,walk=0,facing=0)=>{
    const p=person(shirt,people.length%2?'#bf805f':'#8d6149');p.model.position.set(x,.04,z);p.model.rotation.y=facing;g.add(p.model);
    const actor={...p,id:`${stop.id}/${zone}/${people.length}`,name,x,z,walk,facing,phase:people.length*1.73,ward:zone==='hospital'};
    people.push(actor);
    if(act){
      target(`Talk to ${name}`,x,z,act,null,act==='ward-person'?2.05:2.6);
      Object.assign(targets.at(-1),{actorId:actor.id,data:act==='ward-person'?actor:name});
    }
    return actor;
  };
  const bench=(x,z,k=1)=>{
    box(x,.53,z,k*3.2,.18,.65,'#869896');box(x,.83,z-.29,k*3.2,.5,.12,'#759092');
    for(const s of [-1,1])box(x+s*k*1.24,.23,z,.15,.46,.52,'#4b6469');
  };
  const desk=(x,z,color='#4e7985')=>{
    box(x,.64,z,4.4,1.28,1.25,color);box(x,1.33,z,4.55,.13,1.39,'#a9c3c3');box(x+1,1.54,z-.32,.75,.38,.14,'#364f5b');
    solid(x,z,2.2,.64);
  };
  const port=(x,z,label,action,data)=>{
    box(x,.05,z,3.4,.085,2.7,accent,true);
    sign(x,2.9,z-1.15,4.6,label);
    target(label,x,z,action,data);
  };
  const walkway=(x,z,len,dir)=>{
    box(x,.045,z,2.8,.08,len,'#354f5e');
    for(const s of [-1,1]){
      box(x+s*1.4,.43,z,.11,.85,len,'#749fa6');
      box(x+s*1.4,.9,z,.13,.11,len,accent,true);
      solid(x+s*1.4,z,.12,len*.5);
    }
    const lines=[];
    for(let n=0;n<Math.ceil(len);n++)lines.push(box(x,.10,z-len/2+n,2.5,.018,.095,'#8ab4b0',true));
    sign(x,1.48,z-dir*(len/2+.29),2.2,dir<0?'WALKWAY · NORTH':'WALKWAY · SOUTH');
    belts.push({x,z,len,dir,lines});
  };
  const stairs=(x,z,up)=>{
    for(let i=0;i<6;i++){
      const h=(up?i+1:6-i)*.075;
      box(x,h/2,z-i*.41,2.88,h,.43,'#58717b');
      box(x,h+.013,z-i*.41+.17,2.84,.025,.052,accent,true);
    }
    for(const s of [-1,1]){box(x+s*1.51,.48,z-1.02,.095,.96,2.5,'#496573');box(x+s*1.51,.99,z-1.02,.13,.08,2.5,accent,true)}
  };
  box(0,-.13,0,w*2+.3,.26,d*2+.3,'#526873');
  box(0,.007,0,4.7,.018,d*2,'#687f86');
  const rear=box(0,2.7,-d,w*2,5.4,.24,'#355261'),front=box(0,2.7,d,w*2,5.4,.24,'#4f666e');
  const edgeL=box(-w,2.6,0,.24,5.2,d*2,'#496574'),edgeR=box(w,2.6,0,.24,5.2,d*2,'#496574');
  for(let z=-d+2;z<d;z+=4){
    box(0,.013,z,w*2-.7,.015,.059,'#94a7a7');
    for(const x of [-w*.62,w*.62]){box(x,4.63,z,5.6,.16,.35,'#d2e6d8',true);box(x,4.87,z,w*.74,.28,.26,'#486676')}
  }
  for(const x of [-w+.28,w-.28])for(let z=-d+2;z<d;z+=4.8){
    box(x,1.14,z,.28,2.3,.17,'#4e6a76');box(x,2.45,z,.30,.17,3.4,accent,true);
  }
  let title=stop.name,entry=[0,d-2.8],exit='street';
  if(zone==='concourse'){
    sign(0,3.82,-13,6.4,'TICKET HALL','SURFACE RAIL  /  UNDERGROUND METRO');
    for(const x of [-1.38,1.38])box(x,.029,4.8,.052,.021,16.3,'#9bbdb1',true);
    for(const side of [-1,1])for(let i=0;i<5;i++)box(side*(.6+i*1.27),.035,-7.3-i*1.68,.12,.021,1.82,side<0?'#84dad6':'#e4b883',true).rotation.y=-side*.64;
    desk(-8,7);npc(-8,5.5,'Station attendant','#bc9675','staff');
    for(const [x,z] of [[-10,15],[10,15],[-11,-11],[10,-12]])bench(x,z);
    walkway(8,8,12,-1);walkway(-10,-9,10,1);
    for(let x=-w+.3;x<w;x+=1.3)if(Math.abs(x)>1.92)box(x,.57,-4,.26,1.12,.23,'#607b84');
    for(const x of [-2,2]){box(x,.58,-4,.47,1.16,.54,'#405d6b');box(x,1.12,-4,.35,.09,.37,openGate?'#8ff7c2':'#f0ae72',true)}
    if(!openGate)box(0,.86,-4,3.54,.12,.12,'#f5ce94',true);
    target(openGate?'See validated ticket':'Use the fare gate',0,-2.2,'rail-gate');
    port(-7,-17,'↓  UNDERGROUND METRO','platform','below');
    port(7,-17,'↑  SURFACE RAILWAY','platform','surface');
    stairs(-7,-17.7,false);stairs(7,-17.7,true);
    npc(4,5,'Commuter','#c08e65',null,3);npc(4,-12,'Passenger','#739dba',null,4);
    npc(-4,10,'Passenger','#b1758f',null,4);npc(-7,-19,'Passenger','#8a9e85',null,1.8);
  }else if(zone==='surface'||zone==='below'){
    const isBelow=zone==='below';title=`${stop.name} · ${isBelow?'Underground Metro':'Surface Railway'}`;exit='hall';
    scene.background=new T.Color(isBelow?'#1c3a49':'#a9848b');
    sign(0,3.36,-18,11,isBelow?'UNDERGROUND METRO':'SURFACE RAILWAY',isBelow?'CROSS-BAY LINE  /  TRACK 1 + TRACK 2':'COASTAL LINE  /  TRACK 1 + TRACK 2');
    for(const s of [-1,1]){
      const x=s*10.7;
      box(x,.016,0,5.2,.036,d*2,'#243845');solid(x,0,2.15,d);
      box(s*7.8,.035,0,.29,.03,d*2,accent,true);
      for(const a of [-1,1])box(x+a*.85,.06,0,.13,.070,d*2,'#b7c2bb');
      for(let z=-d+1;z<d;z+=2.1)box(x,.032,z,3.6,.034,.23,'#796a60');
      const train=new T.Group(),doors=[];g.add(train);trains.push({train,x,doors,phase:s===1?0:7});
      for(const z of [-5.2,4.3]){
        block(train,0,1.2,z,3.15,2.4,8.8,s===1?'#4d8b88':'#668eaa');
        block(train,0,2.4,z,3.2,.25,8.9,'#7ba8a7');
        for(let n=-3;n<=3;n+=2)for(const side of [-1,1])block(train,side*1.60,1.59,z+n,.06,.72,1.47,'#b3e0dc',true);
        for(const side of [-1,1]){
          block(train,side*1.585,1.04,z-.32,.14,1.95,1.13,'#304957');
          for(const leaf of [-1,1]){
            const center=z-.32+leaf*.24,mesh=block(train,side*1.67,1.04,center,.09,1.94,.485,'#7da7b5');
            doors.push({mesh,center,leaf});
          }
        }
      }
      bench(s*3,10);npc(s*5,-9,'Waiting passenger',s<0?'#d8a477':'#a9b5d2',null,2.3);
      const commuter=npc(s*6.8,2,'Boarding commuter',s>0?'#d5a284':'#a6cbb2',null);
      commuter.route=[[s*6.8,6],[s*6.35,-5.55],[s*10.7,-5.55]];commuter.period=29;commuter.offset=s>0?0:7;
    }
    port(-6.35,-8,'TRACK 1 · DEPARTURES','departures',zone);
    port(6.35,-8,'TRACK 2 · DEPARTURES','departures',zone);
    npc(4,12,'Platform staff','#9bc1bd','staff',0,Math.PI);
  }else if(compact){
    const id=zone==='bus'?'COACH BAY':zone==='taxi'?'TAXI DISPATCH':'FERRY TERMINAL';
    sign(0,3.5,-7,11,id,'TICKETS  /  BOARDING');
    desk(-4,1);npc(-4,2.5,'Ticket clerk','#a4c3a6','staff');
    bench(4,5);npc(4,3,'Passenger','#bd9981',null,1.2);
    port(0,-7,zone==='bus'?'BUS · BAY 1':zone==='taxi'?'TAXI · PICKUP':'FERRY · BERTH 1','departures');
    if(zone==='ferry'){
      box(-6,.05,-6,3.1,.1,8.6,'#467988');
      box(-6,.55,-6,2.35,1,6.7,'#c5dfdc');box(-6,1.15,-6,1.85,.58,4.5,'#6798a6');
    }else{
      box(-6.75,.61,-5,2.25,1.1,zone==='bus'?7:4.5,accent);
      box(-6.75,1.31,-5,2.04,.51,zone==='bus'?6.5:2.5,'#6590a0');
    }
  }else if(zone==='airport'){
    sign(0,3.7,4,11,'PACIFICA AIR','DEPARTURES  /  CHECK-IN  /  AIRCRAFT SALES');
    desk(-5,8,'#365c78');desk(-11,8,'#365c78');
    npc(-11,6,'Check-in attendant','#8aaecf','staff');
    target('Check departures with check-in',-5,9.8,'check-in');
    walkway(7,2,22,-1);walkway(11,2,22,1);
    for(const z of [4,-2,-9]){bench(-10,z);bench(-4,z)}
    port(-7.5,-17,'GATE A · BOARDING','departures');
    port(0,-17,'GATE B · BOARDING','departures');
    port(11,-17,'HANGAR & SALES','hangar');
    for(const x of [-10,-5,0,5]){
      box(x,2.62,-21.64,4.7,2.75,.07,'#86b7ca',true);
      box(x,1.90,-21.56,4.65,.74,.035,'#728682',true);
      box(x,1.90,-21.53,4.58,.045,.03,'#d6d9bd',true);
      box(x-2.44,2.6,-21.52,.16,2.94,.26,'#455c6c');
    }
    box(-5,2.43,-21.48,6.65,.33,.06,'#e2e5d4');box(-3.4,2.69,-21.47,.27,.56,.065,'#a2aac8');box(-6.1,2.47,-21.45,2.9,.14,.08,'#668697');
    npc(-10,-2,'Passenger','#d6a881',null,2.5);
    npc(3,4,'Passenger','#8fc2a5',null,6);
    npc(4,-16,'Gate agent','#9ab6d8','staff');npc(-12,-17,'Passenger','#af8ba4',null,2);
    npc(-11,14,'Queueing passenger','#b8a386',null);people.at(-1).route=[[-11,13],[-11,9.5],[-13.5,8.9]];
    npc(-7.5,-8,'Boarding passenger','#b3a8ca',null);people.at(-1).route=[[-7.5,-8],[-7.5,-16],[-7.5,-21.5]];
    npc(2.8,-18.4,'Boarding agent','#8ba2ba','staff');
    npc(-2,-9,'Departing traveler','#ceab8c',null);people.at(-1).route=[[-2,-9],[-.8,-15.2],[-.8,-21.5]];
    npc(-5,12,'Check-in traveler','#c8a995',null);people.at(-1).route=[[-5,12],[-5,9.1],[-7.45,7.2]];
    box(-7.5,2.25,-21.4,2.05,3.1,.18,'#465d73');box(-7.5,2.24,-21.27,1.62,2.46,.09,'#749bad',true);
    box(-.8,2.25,-21.4,2.05,3.1,.18,'#465d73');box(-.8,2.24,-21.27,1.62,2.46,.09,'#749bad',true);
  }else if(zone==='hangar'){
    title='Pacifica Air · Hangar';exit='terminal';
    sign(0,3.95,-17,11,'HANGAR 01','FLIGHT SCHOOL  /  AIRCRAFT SALES');
    for(const [x,c] of [[-8,'#c19b6a'],[7,'#75a5b9']]){
      box(x,.85,-7,1.6,1.25,7.5,c);box(x,1.13,-7,9.1,.23,2.4,c);box(x,1.25,-4.3,4.3,.16,1.2,'#9eb8bc');
      box(x,1.5,-7,1.3,.54,2.15,'#87b5bd');box(x,1.78,-4.4,.28,1.6,1.65,'#576f84');
      solid(x,-7,4.5,2.6);
    }
    desk(0,4);port(0,1.7,'AIRCRAFT CATALOG','air-sales');npc(2.75,2.6,'Flight technician','#d69b62','staff');
    port(-8,-15,'TAXI TO RUNWAY','runway');
  }else if(zone==='hospital'){
    sign(0,3.62,-5,10,'PACIFICA MEDICAL','CARE DESK  /  OBSERVATION WARD');
    desk(0,4,'#587f81');npc(1.4,2.7,'Dr. Sol','#cae1df','ward-person').role='Ward physician';
    npc(-4.3,-8,'Nurse Ren','#70aeab','ward-person',.8,Math.PI).role='Observation nurse';
    npc(8.1,.2,'Dr. Noor','#cbe0d8','ward-person',1.4).role='Emergency physician';
    for(const [i,x,z] of [[0,-8,-7],[1,0,-10],[2,8,-7]]){
      box(x,.43,z,2.45,.48,3.8,'#778f97');box(x,.84,z,2.33,.41,3.65,'#86b8b2');box(x,.99,z-1.1,1.73,.29,.85,'#e1e9da');
      solid(x,z,1.23,1.9);points.at(-1).wardBed=true;
      const patient=npc(x,z+.15,['Ada','Luis','Mina'][i],['#b7aace','#87b8cf','#c4a8aa'][i],'ward-person');
      patient.role='Adult patient';patient.resting=true;patient.model.position.y=.99;patient.model.rotation.x=-Math.PI/2;
      port(x,z+2.6,['WARM BLANKETS','LOST WRISTBAND','FAMILY UPDATE'][i],'care',i);
    }
    bench(-8,7);bench(8,7);npc(-6,6,'Volunteer','#7da49b','staff',1.5);
    desk(9,8,'#607687');box(9.5,1.49,8,.77,.23,.52,'#c4a579');
    port(9,10,'ADMIN LOCKBOX','ward-theft');
    port(-9,10,'WARD SIMULATOR','ward-sim');
  }else if(zone==='arena'){
    sign(0,3.82,-8,11,'STRAYLIGHT ARENA','HOLOGRAM TAG  /  TEST ONLY');
    port(0,4,'START HOLOGRAM TAG','arena');
    for(const [i,x] of [-8,0,8].entries()){
      box(x,.26,-7,3.8,.5,3.8,'#647298');box(x,.55,-7,3.1,.09,3.1,accent,true);
      npc(x,-7,'Hologram','#91c8ed',null,0,Math.PI);people.at(-1).tag=i;
      target(['Cyan','Mint','Violet'][i]+' hologram',x,-7,'hologram',i,6);
    }
  }else if(zone==='jail'){
    title='Pacifica Detention';exit=null;
    sign(0,3.25,-3.4,8,'DETENTION','CUSTODY  /  RELEASE CONTROL');
    for(let x=-6.1;x<=6.1;x+=.63)if(Math.abs(x)>1.5)box(x,1.85,-3.4,.14,3.7,.14,'#7f9ca7');
    for(const y of [.4,2.25,3.65])box(0,y,-3.4,12.8,.12,.15,'#8ba1aa');
    bench(-3.7,2,1);port(0,-1,'CUSTODY TERMINAL','custody');
  }
  if(exit){const label=exit==='hall'?'Return to ticket hall':exit==='terminal'?'Return to the terminal':'Exit to street';port(0,d-1.2,label.toUpperCase(),exit);targets.at(-1).label=label}
  const player=person('#66ada2','#c48b65',true);g.add(player.model);
  return {scene,g,w,d,targets,points,people,player,title,entry,zone,stop,openGate,
    tag(id,visible){const p=people.find(v=>v.tag===id);if(p)p.model.visible=visible},
    blocked(x,z){return zone==='concourse'&&Math.abs(z+4)<.49&&(!this.openGate||Math.abs(x)>1.55)},
    belt(x,z){return belts.find(b=>Math.abs(x-b.x)<1.29&&Math.abs(z-b.z)<b.len*.5)?.dir??0},
    step(t){
      for(const p of people){
        if(p.model.userData.inCombat||p.resting)continue;
        if(p.route){
          const phase=(t+(p.offset??p.phase*3))%(p.period??19), leg=phase<8?0:1, f=leg?Math.min(1,Math.max(0,(phase-10)/4)):phase/8;
          const [a,b]=[p.route[leg],p.route[leg+1]];
          p.model.visible=phase<14.3;
          p.model.position.set(a[0]+(b[0]-a[0])*f,.04,a[1]+(b[1]-a[1])*f);
          p.model.rotation.y=Math.atan2(a[0]-b[0],b[1]-a[1]);
          animatePerson(p,t,phase<8||phase>10&&phase<14?3:0);continue;
        }
        const v=t*.46+p.phase;p.model.position.z=p.z+Math.sin(v)*p.walk;
        p.model.rotation.y=p.walk?(Math.cos(v)>0?Math.PI:0):p.facing;animatePerson(p,t,p.walk?Math.abs(Math.cos(v)*p.walk*.46):0)
      }
      for(const b of belts)b.lines.forEach((line,i)=>{line.position.z=b.z-b.len/2+(((i+b.dir*t*2.2)%b.len)+b.len)%b.len});
      for(const p of trains){
        const tm=(t+p.phase)%29;p.train.position.set(p.x,0,tm<5?(5-tm)*9:tm>22?(22-tm)*8:0);
        const opening=Math.max(0,Math.min(1,(tm-6)*2,(21-tm)*2));
        for(const {mesh,center,leaf} of p.doors)mesh.position.z=center+leaf*.49*opening;
      }
    },
    frame(cameraX,cameraZ){
      edgeL.visible=cameraX>-w+.5;edgeR.visible=cameraX<w-.5;
      rear.visible=cameraZ>-d+.35;front.visible=cameraZ<d-.35;
      for(const o of g.children)if(o.userData.venueLabel)o.visible=Math.hypot(cameraX-o.position.x,cameraZ-o.position.z)>1.08;
    },
    dispose(){
      for(const o of g.children)if(o.userData.venueLabel)o.geometry.dispose();
      scene.clear();
    }
  };
}
