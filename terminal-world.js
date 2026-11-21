import * as T from './vendor/three.module.min.js';
import {person,animatePerson} from './life-world.js?v=articulated-physics';

const geometry=new T.BoxGeometry(),mats=new Map();
let terminalSerial=0;
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
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.flipY=true;textures.set(key,tex);
  }
  const root=new T.Group();root.userData.venueLabel=true;root.position.set(x,y,z);root.rotation.y=rot;g.add(root);
  block(root,0,0,0,w+.18,h+.18,.18,'#243b48');
  for(const [side,turn] of [[1,0],[-1,Math.PI]]){
    const face=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:textures.get(key)}));
    face.position.z=side*.101;face.rotation.y=turn;root.add(face);
  }
}
const tint={concourse:'#8fd8c2',surface:'#ecc18d',below:'#7ddddd',airport:'#a5c9ec',hangar:'#f3bc7e',hospital:'#aee6dc',jail:'#e7bb72',arena:'#cbaeed',bank:'#f5d28f',sports:'#aaf198',bus:'#a9d6a5',taxi:'#f0cc8c',ferry:'#8fdce1',jetbridge:'#8fc5d5',airliner:'#9fc4e4',railcar:'#b6d2d7',buscar:'#a9d6a5',taxicar:'#f0cc8c',ferrycar:'#8fdce1'};
export const hasVenue=s=>s&&['rail','airport','hospital','arena','bus','taxi','ferry','bank','sports'].includes(s.type);
export function venueFor(stop,zone){
  return zone??(stop.type==='rail'?'concourse':stop.type);
}
export function makeTerminal(stop,zone,openGate=false,options={}){
  const scene=new T.Scene(),g=new T.Group();scene.add(g);scene.background=new T.Color('#263846');
  g.position.y=zone==='below'?-2:0;
  const instance=++terminalSerial;
  scene.add(new T.HemisphereLight('#e5f6ff','#b29b8b',2.2));
  const key=new T.DirectionalLight('#fff0cb',2);key.position.set(4,10,5);scene.add(key);
  const compact=['bus','taxi','ferry'].includes(zone);
  const w=zone==='airliner'?5.8:zone==='railcar'?2.15:zone==='buscar'?1.5:zone==='taxicar'?1.15:zone==='ferrycar'?3.4:zone==='jetbridge'?5.2:zone==='jail'?6.5:zone==='hospital'?13:zone==='airport'?34:['surface','below'].includes(zone)?20:compact?9:16,
    d=zone==='airliner'?28:zone==='railcar'?11:zone==='buscar'?4.7:zone==='taxicar'?2.8:zone==='ferrycar'?6.2:zone==='jetbridge'?18:zone==='jail'?6:zone==='hospital'?15:zone==='airport'?104:compact?12:22;
  const accent=tint[zone], points=[],targets=[],people=[],belts=[],trains=[],ramps=[],aircraftAreas=[],labelPosition=new T.Vector3();
  const box=(...v)=>block(g,...v);
  const sign=(x,y,z,b,label,sub='',rot=0)=>placard(g,x,y,z,b,label,sub,accent,rot);
  const target=(label,x,z,action,data=null,r=2.6)=>targets.push({id:action+(data??''),type:'venue',label,x,z,r,action,data});
  const solid=(x,z,r,s)=>points.push({x,z,w:r,d:s});
  const npc=(x,z,name,shirt,act,walk=0,facing=0)=>{
    const p=person(shirt,people.length%2?'#bf805f':'#8d6149');p.model.position.set(x,.04,z);p.model.rotation.y=facing;g.add(p.model);
    const actor={...p,id:`${stop.id}/${zone}/${instance}/${people.length}`,name,x,z,walk,facing,phase:people.length*1.73,ward:zone==='hospital'};
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
    const z0=z-3.6,z1=z+2.4,y0=zone==='below'?0:zone==='surface'?0:up?0:-2,y1=zone==='below'?2:0,width=3.8;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute([
      x-width/2,y0,z0,x+width/2,y0,z0,
      x-width/2,y1,z1,x+width/2,y1,z1
    ],3));
    geo.setIndex([0,2,1,2,3,1]);geo.computeVertexNormals();
    g.add(new T.Mesh(geo,new T.MeshLambertMaterial({color:'#58717b'})));
    const angle=-Math.asin((y1-y0)/(z1-z0));
    for(const side of [-1,1]){
      const wall=box(x+side*(width/2+.1),(y0+y1)/2+1.65,(z0+z1)/2,.18,3.3,z1-z0+.2,'#496573');
      wall.rotation.x=angle;
      const rail=box(x+side*(width/2+.20),(y0+y1)/2+1.02,(z0+z1)/2,.10,.10,z1-z0,'#83cfc6',true);
      rail.rotation.x=angle;
    }
    ramps.push({x,z0,z1,y0,y1,width});
  };
  const airliner=(centerZ,centerX,gate)=>{
    const aircraft=new T.Group();aircraft.position.x=centerX;aircraft.userData.aircraftGate=gate;g.add(aircraft);
    aircraftAreas.push({x:centerX,minZ:centerZ-27,maxZ:centerZ+27});
    const box=(...v)=>block(aircraft,...v);
    const solid=(x,z,r,s)=>points.push({x:centerX+x,z,w:r,d:s});
    const target=(label,x,z,action,data=null,r=2.6)=>targets.push({id:`${action}${data??''}${gate}`,type:'venue',label,x:centerX+x,z,r,action,data,gate});
    const sign=(x,y,z,b,label,sub='')=>placard(aircraft,x,y,z,b,label,sub,accent);
    box(0,.035,centerZ,8.6,.12,54,'#314b5d');
    box(0,4.55,centerZ,8.6,.12,54,'#516b7a');
    for(const side of [-1,1]){
      const doorZ=centerZ+(side<0?15:22);
      for(const [a,b] of [[centerZ-27,doorZ-.8],[doorZ+.8,centerZ+27]]){
        const mid=(a+b)/2;box(side*4.35,2.35,mid,.20,4.5,b-a,'#526e80');
      }
      for(let z=centerZ-22;z<=centerZ+22;z+=4.5){
        if(Math.abs(z-doorZ)<1.6)continue;
        box(side*4.22,2.72,z,.045,.95,1.7,'#75a9c2',true);
        box(side*4.19,2.72,z,.075,1.12,1.94,'#354e61');
      }
      box(side*3.68,3.63,centerZ,1.08,.56,49,'#496171');
      box(side*3.68,3.32,centerZ,1.13,.09,49,accent,true);
    }
    for(const z of [centerZ-28,centerZ+28])box(0,2.3,z,8.6,4.5,.20,'#526e80');
    box(0,.12,centerZ-1,1.35,.055,51,'#8de6ca',true);
    for(const z of [centerZ+10,centerZ+16,centerZ+22,centerZ+28]){
      for(const x of [-3.3,-2.2,-1.1,1.1,2.2,3.3]){
        box(x,.62,z,.91,.20,1.05,'#526c7c');
        box(x,1.04,z+.18,.89,.86,.31,'#69889a');
        box(x,1.52,z+.18,.77,.13,.24,'#9fbec6');
        solid(x,z,.28,.39);
      }
    }
    for(const z of [centerZ-23,centerZ-17,centerZ-11,centerZ-5]){
      for(const x of [-3.25,-1.08,1.08,3.25]){
        box(x,.62,z,1.18,.22,1.55,'#506c80');
        box(x,1.08,z+.26,1.16,1.03,.39,'#6789a0');
        box(x,1.65,z+.26,.95,.15,.29,'#b6d2d7');
        solid(x,z,.35,.55);
      }
    }
    box(-2.45,2.3,centerZ-18,3.1,3.8,.20,'#425f72');
    box(2.45,2.3,centerZ-18,3.1,3.8,.20,'#425f72');
    box(-2.2,1.3,centerZ-17.8,1.12,2.2,.15,'#64889a');
    box(2.2,1.3,centerZ-17.8,1.12,2.2,.15,'#64889a');
    box(0,.6,centerZ-28.6,4.5,.8,1.25,'#293c4b');
    box(0,1.08,centerZ-28.7,4.4,.15,1.36,'#597b8d');
    for(const x of [-1.4,-.7,0,.7,1.4])box(x,1.24,centerZ-28.96,.36,.25,.25,'#8bd5c1',true);
    target('Take your Economy Class seat',1.55,centerZ+18,'flight-seat','Economy',2.8);
    target('Take your Business Class seat',1.55,centerZ-11,'flight-seat','Business',2.8);
    target('Enter the flight deck',0,centerZ-25,'flight-deck',null,2.8);
    sign(0,3.55,centerZ-5,8,'BUSINESS CLASS','2 · 2  /  FORWARD');
    sign(0,3.55,centerZ+24,8,'ECONOMY CLASS','3 · 3  /  REAR');
    for(const z of [centerZ+8,centerZ+13])for(const x of [-3.5,3.5]){
      box(x,1.85,z,1.15,2.55,2.2,'#536f78');
      box(x,3.12,z,1.08,.13,2.05,'#8dc6c2',true);
    }
    box(0,.08,centerZ+26,7.2,.15,2.2,'#334d5e');
    box(0,1.15,centerZ+26,6.8,2.25,.18,'#425f72');
    sign(0,2.2,centerZ+27,4.8,'GALLEY & LAVATORY');
  };
  if(zone==='concourse'){
    for(const [x0,x1] of [[-w-.15,-8.9],[-5.1,5.1],[8.9,w+.15]])
      box((x0+x1)/2,-.13,0,x1-x0,.26,d*2+.3,'#526873');
    for(const x of [-7,7]){
      box(x,-.13,(-d-21.6)/2,3.8,.26,d-21.6,'#526873');
      box(x,-.13,(22-15.3)/2,3.8,.26,22+15.3,'#526873');
    }
  }else box(0,-.13,0,w*2+.3,.26,d*2+.3,'#526873');
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
  let title=stop.name,entry=zone==='airport'?[0,12]:[0,d-2.8],exit='street';
  if(zone==='railcar')entry=[0,7.4];
  if(zone==='buscar')entry=[0,2.4];
  if(zone==='taxicar')entry=[0,1.2];
  if(zone==='ferrycar')entry=[0,4.5];
  if(['railcar','buscar','taxicar','ferrycar'].includes(zone))exit=null;
  if(zone==='concourse'){
    sign(0,3.82,-13,6.4,'TICKET HALL','SURFACE RAIL  /  UNDERGROUND METRO');
    for(const x of [-1.38,1.38])box(x,.029,4.8,.052,.021,16.3,'#9bbdb1',true);
    for(const side of [-1,1])for(let i=0;i<5;i++)box(side*(.6+i*1.27),.035,-7.3-i*1.68,.12,.021,1.82,side<0?'#84dad6':'#e4b883',true).rotation.y=-side*.64;
    desk(-8,7);npc(-8,5.5,'Station attendant','#bc9675','staff');
    for(const [x,z] of [[-10,15],[10,15],[-11,-11],[10,-12]])bench(x,z);
    walkway(8,8,12,-1);walkway(-10,-9,10,1);
    for(let x=-w+.3;x<w;x+=1.3)if(Math.abs(x)>1.92)box(x,.57,-4,.26,1.12,.23,'#607b84');
    for(const x of [-2,2]){box(x,.58,-4,.47,1.16,.54,'#405d6b');box(x,1.12,-4,.35,.09,.37,openGate?'#8ff7c2':'#f0ae72',true)}
    if(!openGate){
      box(0,.86,-4,3.54,.12,.12,'#f5ce94',true);
    }
    sign(-7,2.9,-17,4.6,'↓  UNDERGROUND METRO');
    sign(7,2.9,-17,4.6,'↑  SURFACE RAILWAY');
    stairs(-7,-17.7,false);stairs(7,-17.7,true);
    npc(4,5,'Commuter','#c08e65',null,3);npc(4,-12,'Passenger','#739dba',null,4);
    npc(-4,10,'Passenger','#b1758f',null,4);npc(-7,-19,'Passenger','#8a9e85',null,1.8);
  }else if(zone==='surface'||zone==='below'){
    const isBelow=zone==='below';title=`${stop.name} · ${isBelow?'Underground Metro':'Surface Railway'}`;exit='hall';
    scene.background=new T.Color(isBelow?'#1c3a49':'#a9848b');
    sign(0,3.36,-18,11,isBelow?'UNDERGROUND METRO':'SURFACE RAILWAY',isBelow?'CROSS-BAY LINE  /  TRACK 1 + TRACK 2':'COASTAL LINE  /  TRACK 1 + TRACK 2');
    stairs(-7,-17.7,false);stairs(7,-17.7,true);
    for(const s of [-1,1]){
      const x=s*10.7;
      box(x,.016,0,4.2,.036,d*2,'#243845');
      box(s*7.8,.035,0,.29,.03,d*2,accent,true);
      for(const a of [-1,1])box(x+a*.85,.06,0,.13,.070,d*2,'#b7c2bb');
      for(let z=-d+1;z<d;z+=2.1)box(x,.032,z,3.6,.034,.23,'#796a60');
      const train=new T.Group(),doors=[];g.add(train);trains.push({train,x,doors,phase:s===1?0:7});
      for(const z of [-5.2,4.3]){
        const carColor=s===1?'#4d8b88':'#668eaa';
        block(train,0,.10,z,2.9,.12,8.4,'#586b71');
        block(train,0,2.4,z,3.2,.25,8.9,'#7ba8a7');
        for(const end of [-1,1]){
          const endZ=z+end*4.32;
          if(Math.abs(endZ+.45)<.55){
            for(const side of [-1,1])block(train,side*1.1,1.23,endZ,.9,2.18,.16,carColor);
          }else block(train,0,1.23,endZ,3.1,2.18,.16,carColor);
        }
        for(const side of [-1,1])for(const [a,b] of [[-4.2,-.95],[.34,4.2]]){
          const offset=(a+b)/2;block(train,side*1.55,.65,z+offset,.13,.98,b-a,carColor);
        }
        for(const row of [-3,-1,1,3])for(const side of [-1,1]){
          block(train,side*.88,.63,z+row,.65,.16,.78,'#526c7c');
          block(train,side*.88,.91,z+row+.16,.63,.48,.18,'#69889a');
        }
        for(const x of [-1.12,1.12]){
          block(train,x,1.94,z,.05,.05,7.8,'#b9d4c8');
          for(let offset=-3.2;offset<3.6;offset+=1.2)block(train,x,1.68,z+offset,.045,.48,.045,'#d7e5d7');
        }
        for(let n=-3;n<=3;n+=2)for(const side of [-1,1])block(train,side*1.60,1.59,z+n,.06,.72,1.47,'#b3e0dc',true);
        for(const side of [-1,1]){
          block(train,side*1.585,1.04,z-.32,.14,1.95,1.13,'#304957');
          for(const leaf of [-1,1]){
            const center=z-.32+leaf*.24,mesh=block(train,side*1.67,1.04,center,.09,1.94,.485,'#7da7b5');
            doors.push({mesh,center,leaf});
          }
        }
      }
      block(train,0,.10,-.45,2.05,.12,.78,'#586b71');
      for(const side of [-1,1])block(train,side*1.08,1.18,-.45,.12,2.1,.78,'#485c64');
      block(train,0,2.18,-.45,2.05,.12,.78,'#485c64');
      bench(s*3,10);npc(s*5,-9,'Waiting passenger',s<0?'#d8a477':'#a9b5d2',null,2.3);
      const commuter=npc(s*6.8,2,'Boarding commuter',s>0?'#d5a284':'#a6cbb2',null);
      commuter.route=[[s*6.8,6],[s*6.35,-5.55],[s*10.7,-5.55]];commuter.period=29;commuter.offset=s>0?0:7;
    }
    port(-15.6,-8,'TRACK 1 · DEPARTURES','departures',zone);
    port(15.6,-8,'TRACK 2 · DEPARTURES','departures',zone);
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
    }else if(zone==='bus'){
      const bx=-6.75,bz=-5;
      box(bx,.08,bz,2.35,.16,7.1,'#344e5b');
      box(bx,2.35,bz,2.38,.18,7.05,'#344e5b');
      for(const side of [-1,1]){
        if(side<0)box(bx+side*1.12,.83,bz, .16,1.42,6.8,accent);
        else for(const [a,b] of [[-3.35,-2.75],[-1.95,.85],[2.05,3.35]]){
          const center=(a+b)/2;box(bx+side*1.12,.83,bz+center,.16,1.42,b-a,accent);
        }
        for(const z of [-2.8,-.85,1.1]){
          if(side>0&&[-2.35,1.45].some(door=>Math.abs(z-door)<1.25))continue;
          box(bx+side*1.10,1.62,bz+z,.05,.78,1.62,'#9ccbd0',true);
          box(bx+side*1.14,1.62,bz+z,.07,.92,1.76,'#405e69');
        }
      }
      for(const z of [-2.8,-.85,1.1])for(const x of [-.78,.78]){
        box(bx+x,.62,bz+z,.58,.18,.72,'#536f80');
        box(bx+x,.94,bz+z+.15,.56,.52,.18,'#69899a');
        solid(bx+x,bz+z,.12,.25);
      }
      box(bx-.35,.60,bz-3.35,.56,.16,.65,'#536f80');
      box(bx-.35,.95,bz-3.46,.56,.55,.18,'#69899a');
      box(bx,.18,bz-3.55,.10,1.6,.12,'#b9d4c8');
      for(const x of [-.95,.95])box(bx+x,1.98,bz,.055,.055,6.2,'#b9d4c8');
      for(const z of [-2.9,-1.8,-.7,.4,1.5])box(bx+1.36,.17,bz+z,.46,.12,.72,'#a4a89a');
    }else{
      box(-6.75,.61,-5,2.25,1.1,zone==='bus'?7:4.5,accent);
      box(-6.75,1.31,-5,2.04,.51,zone==='bus'?6.5:2.5,'#6590a0');
    }
  }else if(zone==='railcar'){
    box(0,.05,0,3.7,.12,20,'#344e5b');box(0,4.45,0,3.7,.12,20,'#455f6d');
    for(const side of [-1,1]){
      for(const [a,b] of [[-8.9,-5.6],[-4.4,-.65],[.65,4.4],[5.6,8.9]]){
        const z=(a+b)/2;box(side*1.78,2.2,z,.12,4.25,b-a,'#526e7c');
      }
      for(const z of [-7,-3,3,7]){
        box(side*1.77,2.7,z,.045,.88,1.42,'#77aabe',true);
        box(side*1.73,2.7,z,.07,1.05,1.63,'#354e61');
      }
    }
    for(const z of [-9,9])box(0,2.2,z,3.7,4.25,.14,'#526e7c');
    for(const z of [-7,-3,3,7])for(const side of [-1,1]){
      box(side*1.06,.62,z,.62,.18,1.02,'#526c7c');
      box(side*1.06,1.02,z+.20,.60,.62,.22,'#69899a');
      solid(side*1.06,z,.23,.36);
    }
    for(const x of [-1.4,1.4]){
      box(x,1.9,0,.06,.06,18,'#b9d4c8');
      for(let z=-8;z<=8;z+=1.3)if(Math.abs(z)>1)box(x,1.65,z,.045,.42,.045,'#d7e5d7');
    }
    box(0,.12,0,1.15,.05,19,'#8de6ca',true);
    sign(0,3.9,-9.6,3.1,'RAILCAR');
  }else if(zone==='buscar'){
    box(0,.08,0,2.65,.16,9.1,'#344e5b');box(0,2.55,0,2.65,.16,9.1,'#344e5b');
    for(const side of [-1,1]){
      for(const [a,b] of [[-4.45,-3.3],[-2.3,4.45]]){
        const z=(a+b)/2;box(side*1.34,.95,z,.12,1.72,b-a,'#8bb69e');
      }
      for(const z of [-3.1,-1.7,-.3,1.1,2.5,3.9]){
        if(Math.abs(z-2.5)<.2)continue;
        box(side*1.32,1.62,z,.055,.74,1.08,'#9ccbd0',true);
        box(side*1.29,1.62,z,.08,.91,1.23,'#405e69');
      }
    }
    for(const z of [-3,-1.5,0,1.5,3])for(const side of [-1,1]){
      box(side*.82,.62,z,.48,.18,.76,'#536f80');
      box(side*.82,.94,z+.16,.46,.52,.18,'#69899a');
      solid(side*.82,z,.19,.3);
    }
    box(0,.18,-4.25,2.2,.36,.25,'#b9d4c8');
    box(-.48,.61,-3.55,.55,.16,.66,'#536f80');box(-.48,.96,-3.66,.55,.55,.18,'#69899a');
    for(const side of [-1,1])box(side*1.08,1.85,0,.055,.055,8.2,'#b9d4c8');
    sign(0,2.05,-4.55,2.2,'BUS');
  }else if(zone==='taxicar'){
    box(0,.08,0,2.05,.16,5.4,'#344e5b');box(0,1.95,0,2.05,.14,5.4,'#344e5b');
    for(const side of [-1,1]){
      for(const z of [-1.5,1.4]){
        box(side*.99,1.3,z,.06,.68,1.12,'#8fc2d0',true);
        box(side*.96,1.3,z,.08,.84,1.28,'#405e69');
      }
      for(const z of [-1.8,1.7]){
        box(side*.66,.60,z,.48,.17,.67,'#536f80');
        box(side*.66,.92,z+.14,.46,.5,.18,'#69899a');
        solid(side*.66,z,.18,.28);
      }
    }
    box(0,.18,-2.55,1.75,.36,.22,'#b9d4c8');box(0,1.35,0,.1,1.5,.12,'#536e7d');
    sign(0,1.78,-2.62,1.5,'TAXI');
  }else if(zone==='ferrycar'){
    box(0,.06,0,6.3,.14,12.1,'#344e5b');box(0,3.8,0,6.3,.14,12.1,'#455f6d');
    for(const side of [-1,1]){
      box(side*3.08,1.85,0,.14,3.55,11.9,'#496d79');
      for(let z=-4.5;z<=4.5;z+=2.25)box(side*3.0,2.25,z,.05,1.05,1.55,'#8fc9d0',true);
    }
    for(const z of [-5.9,5.9])box(0,1.8,z,6.2,3.45,.14,'#496d79');
    for(const z of [-4.2,-1.4,1.4,4.2])for(const side of [-1,1]){
      box(side*1.85,.64,z,1.05,.18,1.38,'#536f80');
      box(side*1.85,1.02,z+.24,1.02,.58,.22,'#69899a');
      solid(side*1.85,z,.38,.48);
    }
    box(0,.13,0,1.1,.05,11.8,'#8de6ca',true);
    sign(0,3.3,-5.65,3.8,'FERRY CABIN');
  }else if(zone==='airport'){
    sign(0,3.7,4,11,'PACIFICA AIR','DEPARTURES  /  CHECK-IN  /  AIRCRAFT SALES');
    for(const x of [-2.2,2.2])box(x,1.5,16,.16,3,.14,'#536e7d');
    for(const x of [-1.1,1.1])box(x,1.45,16,.08,2.55,.08,'#9cc9d0',true);
    box(0,3.15,16,4.6,.18,.2,'#536e7d');
    desk(-5,8,'#365c78');desk(-11,8,'#365c78');
    npc(-11,6,'Check-in attendant','#8aaecf','staff');
    target('Check departures with check-in',-5,9.8,'check-in');
    walkway(7,2,22,-1);walkway(11,2,22,1);
    for(const z of [4,-2,-9]){bench(-10,z);bench(-4,z)}
    const bridge=(x1,z1,x2,z2,label)=>{
      const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),cx=(x1+x2)/2,cz=(z1+z2)/2;
      const path=box(cx,.06,cz,3.15,.12,len,'#354f5e');path.rotation.y=angle;
      for(const side of [-1,1]){
        const px=cx+Math.cos(angle)*side*1.63,pz=cz-Math.sin(angle)*side*1.63;
        const wall=box(px,2.1,pz,.12,4.1,len,'#58798a');wall.rotation.y=angle;
        const glass=box(cx+Math.cos(angle)*side*1.58,2.35,cz-Math.sin(angle)*side*1.58,.055,3.25,len-.3,'#84b7c5',true);glass.rotation.y=angle;
      }
      const roof=box(cx,3.8,cz,3.15,.14,len,'#577789');roof.rotation.y=angle;
      for(let d=3.2;d<len-1;d+=3.2){
        const t=d/len,px=x1+dx*t,pz=z1+dz*t;
        const rib=box(px,3.72,pz,3.12,.10,.20,'#d7e2db',true);rib.rotation.y=angle;
      }
      sign(cx,3.55,cz,4.8,label,'',angle);
    };
    for(const [gate,x] of [['A',-21],['B',-7],['C',7],['D',21]]){
      port(x,-17,`GATE ${gate} · BOARDING`,'departures',gate);
      for(const side of [-1,1]){
        box(x+side*2.22,2.55,-21.6,.15,3.05,.20,'#455c6c');
        box(x+side*1.82,1.58,-21.6,.06,2.0,.07,'#86b7ca',true);
      }
      box(x,4.12,-21.6,4.55,.18,.2,'#455c6c');
      bridge(x,-21.7,x,-43.1,`GATE ${gate} · AIRCRAFT ${gate}`);
      bridge(x,-43.1,x-4.35,-52,'← BUSINESS / FIRST');
      bridge(x,-43.1,x+4.35,-45,'ECONOMY →');
      airliner(-67,x,gate);
    }
    port(30,-4,'HANGAR & SALES','hangar');
    npc(-10,-2,'Passenger','#d6a881',null,2.5);
    npc(3,4,'Passenger','#8fc2a5',null,6);
    npc(4,-16,'Gate agent','#9ab6d8','staff');npc(-12,-17,'Passenger','#af8ba4',null,2);
    npc(-11,14,'Queueing passenger','#b8a386',null);people.at(-1).route=[[-11,13],[-11,9.5],[-13.5,8.9]];
    npc(-7.5,-8,'Boarding passenger','#b3a8ca',null);people.at(-1).route=[[-7.5,-8],[-7.5,-16],[-7.5,-21.5]];
    npc(2.8,-18.4,'Boarding agent','#8ba2ba','staff');
    npc(-2,-9,'Departing traveler','#ceab8c',null);people.at(-1).route=[[-2,-9],[-.8,-15.2],[-.8,-21.5]];
    npc(-5,12,'Check-in traveler','#c8a995',null);people.at(-1).route=[[-5,12],[-5,9.1],[-7.45,7.2]];
  }else if(zone==='jetbridge'){
    title=`${stop.name} · Jet Bridge`;exit='airport';
    sign(0,3.7,-13,8,'JET BRIDGE','FOLLOW THE LIGHTS TO YOUR AIRCRAFT');
    for(let z=-d+2;z<d-2;z+=3.5){
      for(const x of [-3.85,3.85])box(x,2.7,z,.12,4.7,.18,'#45697b');
      box(0,.11,z,7.5,.04,.055,'#b4dce1',true);
    }
    box(0,3.95,-7,7.6,.16,18,'#577789');
    npc(-2,3,'Cabin attendant','#9cc7d3','staff',.8);
  }else if(zone==='airliner'){
    title=`${stop.name} · Pacifica Air`;exit='jetbridge';
    sign(0,3.55,-25,8,'BUSINESS CLASS','QUIET CABIN  /  FORWARD');
    sign(0,3.55,-3,8,'ECONOMY CLASS','STANDARD SEATING  /  REAR');
    box(0,2.4,-23,10.8,4.7,.24,'#526e80');
    box(0,2.4,27,10.8,4.7,.24,'#526e80');
    for(const side of [-1,1]){
      box(side*5.55,2.55,0,.24,5.1,54,'#526e80');
      for(let z=-20;z<=20;z+=4.2){
        box(side*5.40,2.68,z,.06,1.02,1.72,'#75a9c2',true);
        box(side*5.34,2.68,z,.08,1.15,1.9,'#354e61');
      }
    }
    for(const z of [-17,-13,-9]){
      for(const side of [-1,1]){
        box(side*2.7,.59,z,1.58,.22,1.58,'#506c80');
        box(side*2.7,1.06,z+.29,1.56,1.07,.42,'#6789a0');
        box(side*2.7,1.63,z+.28,1.27,.15,.31,'#b6d2d7');
        box(side*2.7,.77,z-.49,1.48,.16,.34,'#344d60');
        solid(side*2.7,z,.82,.86);
      }
    }
    for(const z of [-5,0,5,10,15,20]){
      for(const side of [-1,1])for(const offset of [2.52,3.67]){
        const x=side*offset;
        box(x,.57,z,.94,.18,1.18,'#526c7c');
        box(x,1.00,z+.22,.93,.91,.32,'#69889a');
        box(x,1.51,z+.22,.79,.13,.25,'#9fbec6');
        box(x,.72,z-.40,.86,.13,.25,'#354d5d');
        solid(x,z,.49,.61);
      }
    }
    box(0,.08,-21,9.3,.16,1.3,'#334d5e');
    box(0,1.6,-20,9.2,3.1,.22,'#425f72');
    box(-2.2,1.28,-19.8,1.12,2.2,.15,'#64889a');
    box(2.2,1.28,-19.8,1.12,2.2,.15,'#64889a');
    box(0,.62,-23.4,4.5,.8,1.25,'#293c4b');
    box(0,1.08,-23.5,4.4,.15,1.36,'#597b8d');
    for(const x of [-1.4,-.7,0,.7,1.4])box(x,1.24,-23.76,.36,.25,.25,'#8bd5c1',true);
    target('Enter the flight deck',0,-20,'flight-deck',null,2.8);
    target('Take your Business Class seat',1.55,-13,'flight-seat','Business',2.8);
    target('Take your Economy Class seat',1.55,5,'flight-seat','Economy',2.8);
    npc(0,-21.5,'Flight Captain','#b7c8ce',null,0,Math.PI);
    npc(-4.3,1,'Cabin attendant','#a8cbd3','staff',1.2);
    npc(4.3,11,'Passenger','#c5a58e',null,1);
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
  }else if(zone==='bank'){
    sign(0,3.8,-8,12,'PACIFICA COMMUNITY BANK','DEPOSITS  /  CREDIT  /  SERVICE');
    desk(0,-13,'#6e7466');npc(0,-10.7,'Banker Mira','#d2b37f','banker');
    box(0,.15,-17,8,.28,1.3,'#c7a86d');box(0,2.1,-19,8,4,.24,'#536570');
    for(let x=-3.2;x<=3.2;x+=1.6)box(x,2.05,-18.82,.045,2.3,.04,'#c4a878');
    const guards=Math.min(8,Math.max(0,options.security??0));
    for(let i=0;i<guards;i++){
      const x=-5.4+(i%4)*3.6,z=5-Math.floor(i/4)*3;
      const guard=npc(x,z,`Bank Guard ${i+1}`,'#596a72',null,0,Math.PI);
      guard.role='Bank security';guard.hostile=true;guard.rival=true;
    }
    if(guards)sign(0,3.8,7.3,10,`${guards} SECURITY OFFICERS`,'ROBBERY RESPONSE');
  }else if(zone==='sports'){
    sign(0,3.8,-8,12,'PACIFICA SPORTS CENTER','CHOOSE A LOCAL PLAYER  /  1v1');
    box(0,.035,-2,25,.07,31,'#587a65');
    for(const x of [-12.2,12.2])box(x,.052,-2,.12,.02,30,'#d8dfce');
    for(const z of [-17,13])box(0,.052,z,24,.02,.12,'#d8dfce');
    box(0,.052,-2,.12,.02,30,'#d8dfce');
    box(0,1.8,-15,3.7,3.6,.24,'#526776');box(0,3.5,-15,1.5,.12,.18,'#d7e5df');
    box(0,1.8,11,5.4,3.6,.24,'#526776');
    const players=[
      ['basketball','Basketball · Nia','1v1 basketball','#d8895e',-7,-3],
      ['football','Football · Tomas','Penalty shootout','#7daa82',0,-2],
      ['tennis','Tennis · Jules','Singles tennis','#8097c4',7,-3],
      ['volleyball','Volleyball · Ren','Beach volleyball','#bb8dc1',-4,6],
      ['badminton','Badminton · Sol','Badminton rally','#c7aa72',4,6]
    ];
    for(const [id,name,role,shirt,x,z] of players){
      const peer=npc(x,z,name,shirt,'sports-player',0,Math.PI);
      peer.sport=id;peer.role=role;
    }
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
  if(exit&&!['airport','bus'].includes(zone)&&!(stop.type==='rail'&&['concourse','surface','below'].includes(zone))){
    const label=exit==='hall'?'Return to ticket hall':exit==='terminal'||exit==='airport'?'Return to the terminal':exit==='jetbridge'?'Return to the jet bridge':'Exit to street';
    port(0,d-1.2,label.toUpperCase(),exit);targets.at(-1).label=label;
  }
  const player=person('#66ada2','#c48b65',true);g.add(player.model);
  return {scene,g,w,d,targets,points,people,player,title,entry,zone,stop,openGate,groupY:g.position.y,
    tag(id,visible){const p=people.find(v=>v.tag===id);if(p)p.model.visible=visible},
    blocked(x,z){return zone==='concourse'&&Math.abs(z+4)<.49&&(!this.openGate||Math.abs(x)>1.55)},
    floorAt(x,z){
      const ramp=ramps.find(r=>Math.abs(x-r.x)<=r.width/2&&z>=r.z0&&z<=r.z1);
      if(!ramp)return 0;
      const t=(z-ramp.z0)/(ramp.z1-ramp.z0);
      return ramp.y0+(ramp.y1-ramp.y0)*t;
    },
    transitionAt(x,z){
      const ramp=ramps.find(r=>Math.abs(x-r.x)<r.width/2-.15);
      if(zone==='concourse'&&z>d-1.5)return 'street';
      if(zone==='airport'&&z>15.5)return 'street';
      if(zone==='bus'&&z>d-1.5)return 'street';
      if(!ramp)return null;
      if(zone==='concourse'&&z<ramp.z0+.45)return ramp.x<0?'below':'surface';
      if((zone==='surface'||zone==='below')&&z>ramp.z1-.45)return 'concourse';
      return null;
    },
    trainBoardingAt(x,z,t){
      return trains.some(p=>{
        const phase=(t+p.phase)%29;
        if(phase<6.5||phase>20.5)return false;
        const offset=phase<5?(5-phase)*9:phase>22?(22-phase)*8:0;
        return Math.abs(x-p.x)<1.35&&[-5.2,4.3].some(center=>Math.abs(z-center-offset)<3.7);
      });
    },
    serviceBoardingAt(x,z){
      return zone==='bus'&&Math.abs(x+6.75)<.58&&z>-8.3&&z<-1.7;
    },
    commercialVehicleAt(x,z){
      return aircraftAreas.some(a=>Math.abs(x-a.x)<4.25&&z>a.minZ&&z<a.maxZ);
    },
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
      g.traverse(o=>{
        if(!o.userData.venueLabel)return;
        o.getWorldPosition(labelPosition);
        o.visible=Math.hypot(cameraX-(labelPosition.x-g.position.x),cameraZ-(labelPosition.z-g.position.z))>1.08;
      });
    },
    dispose(){
      g.traverse(o=>{if(o.userData.venueLabel)o.traverse(child=>{if(child.isMesh&&child.geometry!==geometry)child.geometry.dispose()})});
      scene.clear();
    }
  };
}
