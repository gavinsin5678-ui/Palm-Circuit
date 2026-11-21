import * as T from './vendor/three.module.min.js';
import {person} from './life-world.js?v=connections';

export const islands=[
  {id:'dune',name:'Saffron Dunes',tag:'DESERT ISLAND',z:96,ground:'#c89959',rim:'#e9c084',road:'#675652',accent:'#ffba73',about:'Sandstone mesas, market arcades and a solar observatory.'},
  {id:'jungle',name:'Canopy Key',tag:'JUNGLE ISLAND',z:-120,ground:'#48725a',rim:'#92a96b',road:'#435453',accent:'#9ceda7',about:'Rainforest towers, a botanical court and a treetop village.'},
  {id:'snow',name:'Frostpeak',tag:'ALPINE ISLAND',z:312,ground:'#c9dce7',rim:'#e5f1ee',road:'#586b79',accent:'#a8dcff',about:'Blue ice ridges, snowy lodges and a high alpine sports club.'},
  {id:'future',name:'Neon Meridian',tag:'FUTURE CITY',z:528,ground:'#393b58',rim:'#74668e',road:'#2f3a52',accent:'#f494eb',about:'Magenta skybridges, luminous towers and a prototype test district.'}
];
export const mainland={id:'main',name:'Pacifica Bay',tag:'MAINLAND',z:96,accent:'#85f8d3',about:'The original coastal city, with Central Station, Runway 36 and the boardwalk.'};
export const regions=[mainland,...islands];
export const regionAt=(x,z)=>islands.find(i=>x>=237&&x<=388&&Math.abs(z-i.z)<=70)??mainland;
export const islandAt=(x,z)=>islands.find(i=>x>=237&&x<=388&&Math.abs(z-i.z)<=70);
export const highwayAt=(x,z)=>(x>=7&&x<=313&&Math.abs(z-96)<=8.1)||(Math.abs(x-313)<=8.1&&z>=-120&&z<=528);
export const solidLand=(x,z)=>x<=30.45||!!islandAt(x,z)||highwayAt(x,z);
export const isRoad=(x,z)=>highwayAt(x,z)||!!islandAt(x,z)&&(Math.abs(x-313)<9||Math.abs(z-regionAt(x,z).z)<9||Math.abs(z-regionAt(x,z).z-40)<6||Math.abs(x-366)<6);
export const runways=[{id:'main',x:-195,z:92,min:-161,max:117},...islands.map(i=>({id:i.id,x:369,z:i.z+42,min:i.z-56,max:i.z+57}))];

const stop=(id,type,name,x,z,region='main',extra={})=>({id,type,name,x,z,region,...extra});
export const stops=[
  stop('central','rail','Pacifica Central',11.8,99,'main',{platform:true}),
  stop('depot','rail','West End Station',-110,86,'main',{platform:true}),
  stop('boardwalk','bus','Boardwalk Bus Stop',12,63),
  stop('downtown','bus','Downtown Bus Terminal',10,-48),
  stop('airbus','bus','Airfield Bus Stop',-184,106),
  stop('taxi','taxi','Pacifica Taxi Rank',-11,98),
  stop('market-taxi','taxi','Miramar Taxi Stand',10.6,35.3),
  stop('ferry','ferry','Pacifica Ferry Terminal',26.5,69),
  stop('airport','airport','Pacifica International',-183,113),
  stop('airport-north','airport','North Bay Airfield',-195,-104,'main'),
  stop('airport-west','airport','West Bay Regional',-214,72,'main'),
  stop('sport','sports','Boardwalk Sports Club',13.7,113),
  stop('law','law','Pacifica Police Desk',11.5,21),
  stop('bank-central','bank','Pacifica Trust Bank',-79,-119),
  stop('bank-marina','bank','Miramar Credit Union',10,49),
  stop('hospital','hospital','Pacifica Medical',11.8,9.7),
  stop('arena','arena','Straylight Arena',11.8,-27),
  stop('garage','garage','Straylight Mod Garage',11,-13),
  stop('cross','good','Help Mae cross',11.8,55.8)
];
for(const i of islands){
  stops.push(stop(`${i.id}-ferry`,'ferry',`${i.name} Ferry Pier`,243,i.z+27,i.id));
  stops.push(stop(`${i.id}-air`,'airport',`${i.name} Airfield`,357,i.z+41,i.id));
  stops.push(stop(`${i.id}-air-east`,'airport',`${i.name} East Airfield`,376,i.z+47,i.id));
  stops.push(stop(`${i.id}-bus`,'bus',`${i.name} Bus Terminal`,301,i.z+8,i.id));
  stops.push(stop(`${i.id}-taxi`,'taxi',`${i.name} Taxi Rank`,325,i.z+8,i.id));
  stops.push(stop(`${i.id}-sports`,'sports',`${i.name} Recreation`,326,i.z-11,i.id));
  stops.push(stop(`${i.id}-bank`,'bank',`${i.name} Community Bank`,344,i.z+4,i.id));
  stops.push(stop(`${i.id}-law`,'law',`${i.name} Police Desk`,298,i.z-14,i.id));
}
stops.push(stop('dune-rail','rail','Saffron Lowline',280,54,'dune',{platform:true}));
stops.push(stop('jungle-rail','rail','Canopy Rail Terminal',281,-93,'jungle',{platform:true}));
stops.push(stop('snow-rail','rail','Frostpeak Rail Terminal',280,270,'snow',{platform:true}));
stops.push(stop('future-rail','rail','Neon Meridian Rail Terminal',280,486,'future',{platform:true}));
export const stopById=id=>stops.find(s=>s.id===id);
export const stopTypes={rail:'RAIL + METRO',ferry:'FERRY',airport:'AIRPORT',bus:'BUS',taxi:'TAXI',sports:'SPORTS',law:'POLICE',bank:'BANK',garage:'GARAGE',good:'CROSSING',hospital:'HOSPITAL',arena:'ARENA'};
const surfaceLine=[
  [-110,86,0],[-8,86,0],[11.8,99,0],[28,92,0],[60,70,0],[232,53,0],[280,54,0],
  [313,54,0],[313,-93,0],[281,-93,0],[313,-93,0],[313,270,0],[280,270,0],
  [313,270,0],[313,486,0],[280,486,0]
];
const metroLine=[
  [-110,86,0],[-8,106,0],[11.8,99,0],[28,104,-4],[48,64,-12],[232,47,-12],[262,47,-12],
  [280,54,0],[301,54,-8],[301,-93,-8],[281,-93,0],[301,-93,-8],[301,270,-8],
  [280,270,0],[301,270,-8],[301,486,-8],[280,486,0]
];
export const railRoutes={surface:surfaceLine,below:metroLine};
export const routeLine=surfaceLine;
export const railSector=(x,y)=>y>-3?'Surface line':x>31&&x<237?'Under the bay':'Underground line';
const makeSegments=points=>{
  const segments=[];let length=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    segments.push({a,b,len,start:length});length+=len;
  }
  return {segments,length};
};
const routes=Object.fromEntries(Object.entries(railRoutes).map(([id,points])=>[id,makeSegments(points)]));
export const railRouteLength=line=>routes[line==='below'?'below':'surface'].length;
export const railLength=railRouteLength('surface');
export function railAt(distance,line='surface'){
  const {segments,length}=routes[line==='below'?'below':'surface'];
  const s=Math.max(0,Math.min(length,distance)), seg=segments.find(q=>s<=q.start+q.len)??segments.at(-1);
  const p=(s-seg.start)/seg.len,{a,b}=seg;
  return {x:a[0]+(b[0]-a[0])*p,z:a[1]+(b[1]-a[1])*p,y:a[2]+(b[2]-a[2])*p,heading:Math.atan2(b[0]-a[0],a[1]-b[1])};
}
export function nearestRail(x,z,includeBelow=false,line='surface'){
  const {segments}=routes[line==='below'?'below':'surface'];
  let best;
  for(const {a,b,len,start} of segments){
    let t=Math.max(0,Math.min(1,((x-a[0])*(b[0]-a[0])+(z-a[1])*(b[1]-a[1]))/(Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2))));
    if(line==='surface'&&!includeBelow&&a[2]<-2&&b[2]<-2)continue;
    const p=railAt(start+len*t,line);
    if(line==='surface'&&!includeBelow&&p.y<-2){t=a[2]>b[2]?0:1;Object.assign(p,railAt(start+len*t,line))}
    const d=Math.hypot(x-p.x,z-p.z);
    if(!best||d<best.d)best={...p,d,track:start+len*t};
  }
  return best;
}
export const railStop=(s,line='surface')=>nearestRail(s.x,s.z,line==='below',line).track;

const boxGeo=new T.BoxGeometry(), tubeGeo=new T.CylinderGeometry(.5,.5,1,8);
const matCache=new Map();
function mat(c,lit=false){const id=c+lit;if(!matCache.has(id))matCache.set(id,lit?new T.MeshBasicMaterial({color:c}):new T.MeshLambertMaterial({color:c}));return matCache.get(id)}
function box(g,x,y,z,w,h,d,c,lit=false){
  const m=new T.Mesh(boxGeo,mat(c,lit));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;
}
function rod(g,a,b,w,c,lit=false){
  const p=new T.Vector3(...a),q=new T.Vector3(...b),delta=q.clone().sub(p);
  const m=box(g,...p.addScaledVector(delta,.5).toArray(),w,delta.length(),w,c,lit);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
function tower(g,x,y,z,r,h,c){
  const m=new T.Mesh(tubeGeo,mat(c));m.position.set(x,y+h*.5,z);m.scale.set(r*2,h,r*2);g.add(m);return m;
}
function sign(g,x,y,z,name,color='#92f2d2',rot=0){
  const cvs=document.createElement('canvas');cvs.width=704;cvs.height=112;
  const ctx=cvs.getContext('2d');ctx.fillStyle='#121e2b';ctx.fillRect(0,0,704,112);ctx.fillStyle=color;ctx.fillRect(0,0,12,112);
  ctx.font='700 53px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name.toUpperCase(),356,57,655);
  const tx=new T.CanvasTexture(cvs);tx.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(Math.min(12,Math.max(4,name.length*.53)),1.32),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));
  m.position.set(x,y,z);m.rotation.y=rot;g.add(m);
}
function batch(group){
  group.updateMatrixWorld(true);
  const batches=new Map();
  for(const m of [...group.children])if(m.isMesh&&(m.geometry===boxGeo||m.geometry===tubeGeo)){
    const k=`${m.geometry.id}/${m.material.id}`;
    if(!batches.has(k))batches.set(k,[]);
    batches.get(k).push(m);
  }
  for(const list of batches.values())if(list.length>2){
    const inst=new T.InstancedMesh(list[0].geometry,list[0].material,list.length);
    list.forEach((m,i)=>{inst.setMatrixAt(i,m.matrix);m.removeFromParent()});group.add(inst);
  }
}
function makeInfrastructure(g,solids){
  const asphalt='#4f555b',edge='#9eaeb4', railSide='#737d82';
  const bridge=(x,z,w,d,breakAt=null)=>{
    box(g,x,-.29,z,w,.68,d,asphalt);
    const xwise=w>d,L=xwise?w:d;
    for(const s of [-1,1]){
      const runs=breakAt===null?[[-L/2,L/2]]:[[-L/2,breakAt-9],[breakAt+9,L/2]];
      for(const [lo,hi] of runs){
        const mid=(lo+hi)*.5;
        box(g,x+(xwise?mid:s*(w/2-.35)),.57,z+(xwise?s*(d/2-.35):mid),xwise?hi-lo:.25,.53,xwise?.25:hi-lo,edge);
      }
      for(let n=-L/2+6;n<L/2;n+=12)box(g,x+(xwise?n:s*(w/2-1.5)),-3.2,z+(xwise?s*(d/2-1.5):n),1.1,6,1.1,railSide);
    }
    for(let n=-L/2+4;n<L/2;n+=6)if(breakAt===null||Math.abs(n-breakAt)>8)box(g,x+(xwise?n:0),.06,z+(xwise?0:n),xwise?2.8:.13,.018,xwise?.13:2.8,'#eed9a4',true);
  };
  bridge(160,96,306,16.2);bridge(313,204,16.2,648,96-204);
  for(const x of [68,150,213])for(const side of [-1,1]){
    const z=96+side*7.8;
    box(g,x,5.1,z,1.25,10.2,1.2,'#d1b6a2');
    rod(g,[x,10,z],[x+22,1.3,z],.14,'#d9d4be');
    rod(g,[x,10,z],[x-22,1.3,z],.14,'#d9d4be');
  }
  for(const s of [-1,1])box(g,150,10.35,96+s*7.8,3.4,.4,1.7,'#83ccb4',true);
  for(const i of islands){
    const z=i.z;
    box(g,312.5,-.38,z,151,.73,140,i.rim);
    box(g,314,-.14,z,139,.30,130,i.ground);
    box(g,312,.03,z,145,.05,17,i.road);
    box(g,313,.03,z,17,.05,139,i.road);
    box(g,345,.03,z+40,73,.05,10,i.road);
    box(g,369,.046,z,11,.06,113,'#565a67');
    for(let n=-50;n<=50;n+=8)box(g,369,.083,z+n,.16,.02,3,'#ede4d3',true);
    for(let n=0;n<11;n++)box(g,244+n*13,.068,z,.32,.02,8.5,'#ece7ba');
    for(let n=-8;n<=8;n++)box(g,313,.069,z+n*7,2.8,.024,.15,'#ded0a4');
    box(g,238,-.12,z+27,18,.35,8.5,'#a98b70');
    for(const a of [-1,1])for(let n=0;n<5;n++)box(g,230+n*3.9,.45,z+27+a*3.9,.23,1,.23,'#dfcbb2');
    const develop=(x,zz,n)=>{
      let h=8+(n*7%13),base=i.id==='future'?'#485275':i.id==='snow'?'#677f97':i.id==='jungle'?'#6e6752':'#b77a52';
      if(i.id==='future')h+=8+(n%3)*7;
      box(g,x,h*.5,zz,11,h,10,base);
      box(g,x,h+.2,zz,12,.45,11,i.id==='snow'?'#e9f5f8':i.accent);
      for(let j=2;j<h-1;j+=3)for(const b of [-1,1])box(g,x+b*2.8,j,zz+5.05,2.1,1,.13,i.accent,true);
      const kind=n===1||n===4?'shop':n===2||n===3?'business':'home',doorX=x+(n%3-1)*2.2,doorZ=zz+5.78;
      box(g,doorX,1.25,zz+5.08,1.62,2.49,.18,i.accent);
      box(g,doorX,1.18,zz+5.19,1.28,2.25,.12,'#455967');
      box(g,doorX+.39,1.08,zz+5.27,.11,.08,.055,'#f2d6a2',true);
      const names={shop:['Market Hall','Supply Exchange','General Store','Transit Kiosk'],business:['Solar Observatory','Botanical Office','Summit Lodge','Skyline Workshop'],home:['Sandstone House','Canopy House','Alpine Lodge','Meridian Flat']};
      solids.push({x,z:zz,w:5.5,d:5,h:h+.5,kind,name:names[kind][islands.indexOf(i)],doorX,doorZ,id:`${i.id}-${n}`,variant:(n+islands.indexOf(i)*2)%5});
      if(i.id==='future'){box(g,x,h+1.85,zz,.36,3.2,.36,i.accent,true);box(g,x+.02,h*.54,zz+5.15,.12,h*.89,.14,'#9cf4f1',true)}
    };
    for(const [n,x,zz] of [[0,258,-29],[1,277,-24],[2,343,-31],[3,345,24],[4,276,23],[5,253,50],[6,336,-51],[7,346,52]])develop(x,z+zz,n);
    for(let n=0;n<17;n++){
      const x=247+(n*17%42),zz=z+(n%2===0?-1:1)*(31+n*7%29);
      if(i.id==='jungle'){
        tower(g,x,0,zz,.53,7,'#715c43');for(let j=0;j<3;j++)tower(g,x+Math.cos(j*2)*1.6,6+j*.8,zz+Math.sin(j*2)*1.5,2.9,2.1,['#347c5c','#459b62','#76a867'][j]);
      }else if(i.id==='snow'||i.id==='dune'){
        const r=4+n%4,h=7+n%5*3;
        const m=new T.Mesh(new T.ConeGeometry(r,h,5),mat(i.id==='snow'?(n%2?'#e5f4fb':'#9fbfd7'):(n%2?'#d39866':'#bd7752')));
        m.position.set(x,h*.5,zz);m.rotation.y=n*2.1;g.add(m);
      }else{
        tower(g,x,0,zz,.34,5,i.accent);box(g,x,4.2,zz,1.3,1.35,1.3,'#73f0e4',true);
      }
    }
    if(i.id==='snow')for(const [x,dz,r,h] of [[255,-43,14,28],[265,-54,11,38],[279,-56,12,31],[287,-50,9,22]]){
      const peak=(radius,height,y,color)=>{
        const m=new T.Mesh(new T.ConeGeometry(radius,height,5),mat(color));m.position.set(x,y,z+dz);m.rotation.y=.48+x;g.add(m);
      };
      peak(r,h,h*.5-.17,'#819bb6');peak(r*.58,h*.59,h*.7,'#f1fbf7');
      solids.push({x,z:z+dz,w:r*.57,d:r*.57,h:h*.42});
    }
    if(i.id==='future'){
      box(g,344,13,z-.2,3.6,2.6,48,'#506080');
      for(const s of [-1,1])box(g,344+s*1.84,13.14,z-.2,.11,.19,48,'#70eeea',true);
      for(const s of [-1,1])box(g,344+s*1.74,12.8,z-.2,.16,.62,47,'#9eb1c7');
    }
    sign(g,300,7,z+16,i.name,i.accent);
  }
}
function makeRailInfrastructure(g){
  for(const {segments} of Object.values(routes))for(const {a,b,len} of segments){
    const dx=b[0]-a[0],dz=b[1]-a[1],xz=Math.hypot(dx,dz), nx=-dz/xz,nz=dx/xz, angle=Math.atan2(dx,dz);
    const P=(t,s=0,y=0)=>[a[0]+dx*t+nx*s,a[2]+(b[2]-a[2])*t+y,a[1]+dz*t+nz*s];
    for(const s of [-1,1])rod(g,P(0,s*.9,.09),P(1,s*.9,.09),.15,'#a9b2b3');
    for(let l=0;l<len;l+=2.45){const [x,y,z]=P(l/len);box(g,x,y-.12,z,3.5,.17,.26,'#716153').rotation.y=angle;}
    if(Math.min(a[2],b[2])<-2){
      const middle=(a[2]+b[2])*.5, submerged=middle<-4;
      const slab=(offset,dy,w,h,c)=>{
        const [x,y,z]=P(.5,offset,dy);const m=box(g,x,y,z,w,h,len+.09,c);m.rotation.set(-Math.asin((b[2]-a[2])/len),angle,0,'YXZ');
      };
      slab(0,-.31,8,.43,'#34485d');
      for(const s of [-1,1]){slab(s*3.9,1.35,.26,3.1,'#527387');slab(s*3.66,2.45,.14,.12,'#a3f0d9')}
      if(submerged){slab(0,4.5,8.1,.24,'#3d566c');slab(0,4.31,.2,.1,'#a3e6dc')}
      if(submerged)for(const side of [-1,1]){
        slab(side*3.94,3.73,.23,1.54,'#3c6677');
        slab(side*3.81,3.00,.11,.06,'#538d96');
      }
      for(let l=2;l<len-1;l+=6)for(const s of [-1,1]){
        const [x,y,z]=P(l/len,s*3.72,1.92);
        box(g,x,y,z,.26,2.0,.22,submerged?'#85dcd2':'#efbb7e',true).rotation.y=angle;
      }
    }
    if(a[0]>=297&&Math.abs(dz)>90){
      for(let n=6;n<len;n+=12){const [x,y,z]=P(n/len,0,-2.6);box(g,x,y,z,2,5,1.2,'#85928d')}
      const [x,y,z]=P(.5,0,-.26);box(g,x,y,z,5,.42,len,'#687d80').rotation.y=angle;
    }
  }
}
const shade={rail:'#8de9cf',bus:'#acd6a5',taxi:'#ffd69a',ferry:'#87dde8',airport:'#a8baff',sports:'#aaf198',law:'#a2b9f9',bank:'#f5d28f',garage:'#f195d7',good:'#f5c894',hospital:'#a0ece0',arena:'#d6aef2'};
function makeStops(g){
  for(const s of stops){
    const {x,z,type}=s,c=shade[type],major=['airport','rail','ferry','sports','hospital','arena','bank'].includes(type);
    if(type==='good')continue;
    if(type==='bus'&&s.id!=='boardwalk'){
      box(g,x,.018,z,4.5,.13,3.2,'#aaa99a');
      box(g,x,2.53,z,4.6,.23,3.25,c);
      for(const a of [-1,1])box(g,x+a*2,1.24,z-1.4,.18,2.5,.17,'#667c87');
      box(g,x,1.5,z-1.47,4.2,1.76,.12,'#557680');
      box(g,x,.47,z-.93,3.6,.21,.54,'#cfb28e');
      sign(g,x,3.08,z+1.6,s.name,c);
      box(g,x,.032,z+3.55,3.2,.043,1.1,c);
      continue;
    }
    if(!major){
      box(g,x,1.12,z,.16,2.24,.16,'#adb9bb');sign(g,x,2.1,z,stopTypes[type],c);
      if(type==='bus'||type==='taxi')box(g,x,.032,z+3.55,3.2,.043,1.1,c);
      continue;
    }
    const w=type==='rail'?15:type==='bank'?12:9,d=type==='rail'?5:type==='bank'?7:4.5;
    box(g,x,.027,z,w,.12,d,'#879596');
    box(g,x,3.04,z,w+.5,.29,d+.55,c);
    for(const a of [-1,1])for(const b of [-1,1])box(g,x+a*(w*.45),1.46,z+b*(d*.42),.24,2.9,.23,'#566c73');
    box(g,x,1.25,z-d*.5,w-.48,2.47,.21,'#314c58');
    for(const side of [-1,1]){
      box(g,x+side*w*.28,.46,z-d*.28,w*.27,.31,.61,'#bca583');
      box(g,x+side*(w*.5-.4),1.1,z+.9,.48,.41,.38,c,true);
    }
    if(type==='rail'){
      box(g,x,.016,z+3.7,w,.11,4.8,'#a5a99c');
      box(g,x,3.22,z,8,.10,4.7,'#3b5360');
      for(const a of [-1,1]){
        box(g,x+a*1.62,.46,z+1,.34,.93,.35,'#e4be8f');
        box(g,x+a*1.3,.89,z+1,1,.075,.12,'#f0cd9f',true);
        box(g,x+a*5.4,.91,z-1.46,1.45,1.82,.55,'#405361');
        box(g,x+a*5.4,1.38,z-1.15,.89,.53,.10,c,true);
        for(let q=-1;q<=1;q++)box(g,x+a*4.4+q*1.1,.09,z+2.7,.72,.03,.09,'#f5ce91',true);
      }
      sign(g,x,2.5,z-d*.49,s.id==='depot'?'COASTAL RAIL · WESTBOUND':'METRO · TICKET HALL',c);
    }
    if(type==='hospital'||type==='arena'){
      box(g,x+6.4,2.8,z,7.4,5.6,14,type==='hospital'?'#b5cbd0':'#71728c');
      box(g,x+6.4,5.8,z,7.7,.38,14.3,c);
      for(const a of [-1,0,1])box(g,x+3.2,3.5,z+a*3.1,.15,1.24,2.2,'#436677');
    }
    if(type==='bank'){
      box(g,x,5.4,z,6.4,.42,3.8,'#d4b77a');
      for(const side of [-1,1])box(g,x+side*4.6,2.1,z-d*.5,1.15,4.2,1.3,'#d9c49b');
    }
    if(type!=='sports')box(g,x,.053,z+3.55,3.2,.043,1.1,c);
    sign(g,x,type==='rail'?4.02:3.76,z+d*.5,s.name,c);
  }
}
export const signals=[
  {x:0,z:48,offset:0},{x:-48,z:-48,offset:7},{x:0,z:96,offset:4},
  ...islands.map((i,k)=>({x:313,z:i.z,offset:3+k*4}))
];
export function signalAt(signal,t,axis){
  const p=((t+signal.offset+(axis==='x'?8:0))%16+16)%16;
  return p<6.4?'green':p<7.6?'amber':'red';
}
function trafficSignal(scene,s){
  const heads=[];
  for(const [sx,sz,axis] of [[-7,7,'z'],[7,-7,'z'],[7,7,'x'],[-7,-7,'x']]){
    const x=s.x+sx,z=s.z+sz;
    box(scene,x,1.75,z,.16,3.5,.16,'#748087');box(scene,x,3.5,z,.53,1.28,.47,'#303942');
    const bulbs=[];
    for(const [i,c] of ['#fe776b','#ffc77c','#8dffac'].entries()){
      const m=new T.Mesh(new T.SphereGeometry(.12,7,6),new T.MeshBasicMaterial({color:c}));
      m.position.set(x+(axis==='x'?(sx>0?.27:-.27):0),3.91-i*.37,z+(axis==='z'?(sz>0?.26:-.26):0));scene.add(m);bulbs.push(m);
    }
    heads.push({axis,bulbs});
  }
  return {s,heads};
}
function shell(g,w,h,l,color,glass='#314c63'){
  box(g,0,.44,0,w*.94,.66,l*.98,'#343e4c');
  box(g,0,h*.51,0,w,h*.72,l,color);
  box(g,0,h*.85,0,w*.94,.17,l*.95,color);
  for(const side of [-1,1]){
    for(let z=-l*.37;z<=l*.38;z+=l*.20)box(g,side*w*.504,h*.61,z,.09,h*.30,l*.146,glass);
    box(g,side*w*.31,.56,-l*.505,.41,.27,.1,'#ffebaa',true);
    box(g,side*w*.31,.57,l*.505,.41,.26,.1,'#f28b7f',true);
  }
  box(g,0,h*.62,-l*.506,w*.72,h*.31,.1,glass);
}
function modelTrain(){
  const front=new T.Group(),back=new T.Group();
  shell(front,3.1,3.0,7.8,'#8cd9c0');shell(back,3.1,2.9,7.5,'#9cadb6');
  box(front,0,3.02,.7,2.4,.27,2.35,'#465c64');
  return {front,back};
}
function modelFlight(){
  const g=new T.Group();
  shell(g,4.1,3.5,23,'#d5e0e5','#57788a');
  box(g,0,1.42,.25,32,.24,5.25,'#a9bdc9');
  box(g,0,2.7,9.3,.24,2.4,2.05,'#718c9c');
  box(g,0,2.18,9.7,7.1,.16,1.4,'#a9bdc9');
  for(const x of [-5.7,5.7]){
    box(g,x,1.13,.25,2.0,1.12,4.0,'#8198a5');
    box(g,x,.99,-1.45,1.55,.72,.13,'#314857');
    for(let z=-8;z<=8;z+=2.35)box(g,Math.sign(x)*2.055,2.12,z,.055,.48,.73,'#96c3d1',true);
  }
  box(g,-1.05,.34,4.9,.13,.61,.13,'#536b75');box(g,1.05,.34,4.9,.13,.61,.13,'#536b75');
  return g;
}
function modelFerry(){
  const g=new T.Group();
  box(g,0,.17,0,6.2,.81,14.5,'#344967');box(g,0,.58,0,5.7,.41,13.3,'#e9d7ab');
  shell(g,4.8,2.7,9,'#a4dae1');
  box(g,0,3.05,1,4.7,.19,5,'#e7bd86');
  box(g,0,3.82,2,1.2,1.5,1,'#ab705a');
  return g;
}
export function makeArchipelago(scene){
  const statics=new T.Group(),solids=[];
  makeInfrastructure(statics,solids);makeRailInfrastructure(statics);makeStops(statics);batch(statics);scene.add(statics);
  const lights=signals.map(s=>trafficSignal(scene,s));
  const train=modelTrain(),metro=modelTrain(),ferry=modelFerry(),flight=modelFlight(),bus=new T.Group(),taxi=new T.Group(),patrol=new T.Group();
  shell(bus,2.9,2.91,8,'#75b599');shell(taxi,2.24,1.57,4.35,'#e7b468');shell(patrol,2.22,1.61,4.62,'#d3e0e9');
  const red=box(patrol,-.36,1.65,.06,.65,.21,.31,'#ff6869',true),blue=box(patrol,.36,1.65,.06,.65,.21,.31,'#6c98ff',true);
  const helicopter=new T.Group(),rotor=new T.Group();
  box(helicopter,0,.62,0,1.6,.72,2.9,'#354653');
  box(helicopter,0,.82,-.63,1.43,.57,.07,'#7db0c0',true);
  box(helicopter,0,1.18,1.63,.18,.16,2.8,'#465966');
  box(helicopter,0,1.52,0,.13,.12,4.2,'#273842');
  box(rotor,0,0,0,5.1,.07,.16,'#202d35');rotor.rotation.y=.72;
  const rotorBlade=new T.Group();box(rotorBlade,0,0,0,5.1,.07,.16,'#202d35');rotorBlade.rotation.y=-.72;rotor.add(rotorBlade);
  rotor.position.y=1.58;helicopter.add(rotor);helicopter.visible=false;scene.add(helicopter);
  box(taxi,0,1.55,.16,.79,.21,.34,'#ffe5a9',true);
  const traffic=[];
  for(let i=0;i<6;i++){
    const g=new T.Group();shell(g,2.23,1.55,4.24,['#c98878','#84aeba','#b1bbd2','#d5b47b','#91a497','#b796ac'][i]);
    traffic.push({mesh:g,axis:i<4?'x':'z',lane:i<4?96:313,dir:i%2?1:-1,coord:i<4?39+i*62:48+i*34,v:10+i*.65,span:i<4?[14,305]:[-122,534],highway:true,name:['Remy','Elena','Jules','Sam','Mina','Teo'][i]});scene.add(g);
  }
  for(const model of [train.front,train.back,metro.front,metro.back,ferry,flight,bus,taxi,patrol]){model.visible=false;scene.add(model)}
  const mae=person('#b789af','#ad7757');mae.model.position.set(11.8,0,55.8);scene.add(mae.model);
  const way=new T.Group();
  const arrow=new T.Mesh(new T.OctahedronGeometry(.53),mat('#9bf6dd',true));arrow.position.y=4;way.add(arrow);
  const ring=new T.Mesh(new T.RingGeometry(1.35,1.55,34),new T.MeshBasicMaterial({color:'#a3f7dc',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.16;way.add(ring);way.visible=false;scene.add(way);
  const props=Array.from({length:10},(_,i)=>{
    const x=i<6?12.2+(i%2)*1.44:292, z=i<6?-20-(i%3)*2.2:528+(i-6)*2.1;
    const mesh=box(scene,x,.55,z,.85,.9,.84,i%2?'#bc906d':'#c79572');
    return {mesh,x,z,vx:0,vz:0,vy:0};
  });
  const pulse=new T.Mesh(new T.RingGeometry(.88,1,42),new T.MeshBasicMaterial({color:'#b4f9f0',side:T.DoubleSide,transparent:true}));
  pulse.rotation.x=-Math.PI/2;scene.add(pulse);pulse.visible=false;
  const vehicleModels={rail:metro.front,bus,taxi,ferry,airport:flight};
  return {train,metro,vehicleModels,patrol,red,blue,helicopter,helicopterRotor:rotor,mae,way,arrow,traffic,props,pulse,
    hit:(x,z,y=.5,r=.35)=>solids.some(o=>y<o.h&&Math.abs(x-o.x)<o.w+r&&Math.abs(z-o.z)<o.d+r),
    properties:solids,
    signal(t){for(const {s,heads} of lights)for(const {axis,bulbs} of heads){const k=['red','amber','green'].indexOf(signalAt(s,t,axis));for(let n=0;n<3;n++)bulbs[n].visible=n===k;}}
  };
}
