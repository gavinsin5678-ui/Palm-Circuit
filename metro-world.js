import * as T from './vendor/three.module.min.js';
import {person} from './life-world.js?v=articulated-physics';
import {createTerrainPatch,addIslandForest} from './world.js?v=surface-detail';

export const islands=[
  {id:'dune',name:'Saffron Dunes',tag:'DESERT ISLAND',centerX:313,z:96,ground:'#c89959',rim:'#e9c084',road:'#675652',accent:'#ffba73',about:'Sandstone mesas, market arcades and a solar observatory.'},
  {id:'jungle',name:'Canopy Key',tag:'JUNGLE ISLAND',centerX:313,z:-120,ground:'#48725a',rim:'#92a96b',road:'#435453',accent:'#9ceda7',about:'Rainforest towers, a botanical court and a treetop village.'},
  {id:'snow',name:'Frostpeak',tag:'ALPINE ISLAND',centerX:313,z:312,ground:'#c9dce7',rim:'#e5f1ee',road:'#586b79',accent:'#a8dcff',about:'Blue ice ridges, snowy lodges and a high alpine sports club.'},
  {id:'future',name:'Neon Meridian',tag:'FUTURE CITY',centerX:313,z:528,ground:'#393b58',rim:'#74668e',road:'#2f3a52',accent:'#f494eb',about:'Magenta skybridges, luminous towers and a prototype test district.'},
  {id:'obsidian',name:'Volcanic Obsidian Ridge',tag:'VOLCANIC METROPOLIS',centerX:560,z:-120,ground:'#34373c',rim:'#706c68',road:'#323940',accent:'#ff8750',about:'Basalt canyons, geothermal towers and a dark industrial metropolis.'},
  {id:'bamboo',name:'Emerald Bamboo Highlands',tag:'BAMBOO HIGHLANDS',centerX:560,z:96,ground:'#547b55',rim:'#a5b76d',road:'#455c4b',accent:'#a7e58d',about:'Terraced mountain districts, pagodas and forested hillside avenues.'},
  {id:'atoll',name:'Solaris Coral Atoll',tag:'CORAL ATOLL',centerX:560,z:312,ground:'#d8c49b',rim:'#f2dfbd',road:'#5b5c5a',accent:'#ffd18b',about:'Coastal resort boulevards, marinas and sun-bleached Mediterranean blocks.'}
];
export const mainland={id:'main',name:'Pacifica Bay',tag:'MAINLAND',z:96,accent:'#85f8d3',about:'The original coastal city, with Central Station, Runway 36 and the boardwalk.'};
export const regions=[mainland,...islands];
export const regionAt=(x,z)=>islands.find(i=>Math.abs(x-i.centerX)<=100&&Math.abs(z-i.z)<=92)??mainland;
export const islandAt=(x,z)=>islands.find(i=>Math.abs(x-i.centerX)<=100&&Math.abs(z-i.z)<=92);
export const islandSurfaceY=(x,z)=>{
  const island=islandAt(x,z);if(!island)return 0;
  const fade=Math.max(0,Math.min(1,(100-Math.abs(x-island.centerX))/20,(92-Math.abs(z-island.z))/20));
  return 1.9*fade;
};
const outerLinks=islands.filter(i=>i.centerX>313);
let interIslandTunnels=[];
export function roadHeightAt(x,z){
  for(const route of interIslandTunnels){
    if(Math.abs(z-route.z)>7.1||x<388||x>480)continue;
    const position=(x-388)/(480-388)*(route.points.length-1),index=Math.min(route.points.length-2,Math.floor(position));
    const t=position-index;
    return route.points[index].y+(route.points[index+1].y-route.points[index].y)*t;
  }
  return undefined;
}
export const highwayAt=(x,z)=>(x>=7&&x<=313&&Math.abs(z-96)<=8.1)||(Math.abs(x-313)<=8.1&&z>=-120&&z<=528)||
  outerLinks.some(i=>(x>=388&&x<=480&&Math.abs(z-i.z)<=7.2)||(x>313&&x<388&&Math.abs(z-i.z)<=7.2));
export const solidLand=(x,z)=>x<=30.45||!!islandAt(x,z)||highwayAt(x,z);
export const isRoad=(x,z)=>highwayAt(x,z)||!!islandAt(x,z)&&
  ([-80,-40,0,40,80].some(offset=>Math.abs(x-regionAt(x,z).centerX-offset)<7.8)||
    [-72,-36,0,36,72].some(offset=>Math.abs(z-regionAt(x,z).z-offset)<7.2)||
    Math.abs(x-(regionAt(x,z).centerX+56))<9);
export const runways=[{id:'main',x:-195,z:92,min:-161,max:117},...islands.map(i=>({id:i.id,x:i.centerX+56,z:i.z+1,min:i.z-56,max:i.z+57}))];

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
  stops.push(stop(`${i.id}-ferry`,'ferry',`${i.name} Ferry Pier`,i.centerX-70,i.z+27,i.id));
  stops.push(stop(`${i.id}-air`,'airport',`${i.name} Airfield`,i.centerX+56,i.z+1,i.id));
  stops.push(stop(`${i.id}-bus`,'bus',`${i.name} Bus Terminal`,i.centerX-12,i.z+8,i.id));
  stops.push(stop(`${i.id}-taxi`,'taxi',`${i.name} Taxi Rank`,i.centerX+12,i.z+8,i.id));
  stops.push(stop(`${i.id}-sports`,'sports',`${i.name} Recreation`,i.centerX+20,i.z-11,i.id));
  stops.push(stop(`${i.id}-bank`,'bank',`${i.name} Community Bank`,i.centerX+44,i.z+4,i.id));
  stops.push(stop(`${i.id}-law`,'law',`${i.name} Police Desk`,i.centerX-28,i.z-14,i.id));
}
for(const i of islands)stops.push(stop(`${i.id}-rail`,'rail',`${i.name} Rail Terminal`,i.centerX,i.z,i.id,{platform:true}));
export const stopById=id=>stops.find(s=>s.id===id);
export const stopTypes={rail:'RAIL + METRO',ferry:'FERRY',airport:'AIRPORT',bus:'BUS',taxi:'TAXI',sports:'SPORTS',law:'POLICE',bank:'BANK',garage:'GARAGE',good:'CROSSING',hospital:'HOSPITAL',arena:'ARENA'};
const surfaceLine=[
  [-110,86,12],[-96,96,12],[-48,96,12],[0,96,12],[11.8,99,12],
  [30,99,12],[30,54,12],[220,54,12],[302,54,12],
  [302,-120,12],[220,-120,12],[220,312,12],[302,312,12],[302,528,12],
  [388,528,12],[460,528,12],[560,528,12],[560,312,12],[560,96,12],[560,-120,12]
];
const metroLine=[
  [-110,86,-16],[-96,96,-16],[-48,96,-16],[0,96,-16],[11.8,99,-16],
  [30,99,-16],[30,54,-16],[220,54,-16],[302,54,-16],
  [302,-120,-16],[220,-120,-16],[220,312,-16],[302,312,-16],[302,528,-16],
  [388,528,-16],[460,528,-16],[560,528,-16],[560,312,-16],[560,96,-16],[560,-120,-16]
];
export const railRoutes={surface:surfaceLine,below:metroLine};
export const routeLine=surfaceLine;
export const railSector=(x,y)=>y>-3?'Surface line':x>31&&x<237?'Under the bay':'Underground line';
const makeSegments=points=>{
  const control=points.map(([x,z,y])=>new T.Vector3(x,y,z));
  const curve=new T.CatmullRomCurve3(control,false,'centripetal',.5);
  const count=Math.max((points.length-1)*16,Math.ceil(control.slice(1).reduce((n,p,i)=>n+p.distanceTo(control[i]),0)/4));
  const sampled=curve.getPoints(count).map(p=>[p.x,p.z,p.y]);
  const segments=[];let length=0;
  for(let i=1;i<sampled.length;i++){
    const a=sampled[i-1],b=sampled[i],len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    if(len>.001){segments.push({a,b,len,start:length});length+=len}
  }
  return {segments,length,curve};
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
function mat(c,lit=false){
  const id=c+lit;
  if(!matCache.has(id))matCache.set(id,lit?new T.MeshBasicMaterial({color:c}):
    new T.MeshStandardMaterial({color:c,roughness:.82,metalness:.08}));
  return matCache.get(id);
}
let sandstoneTexture;
const sandstoneMaterials=new Map();
function sandstone(c){
  if(!sandstoneTexture){
    const cvs=document.createElement('canvas');cvs.width=cvs.height=128;
    const ctx=cvs.getContext('2d');ctx.fillStyle='#858078';ctx.fillRect(0,0,128,128);
    for(let i=0;i<1900;i++){
      const shade=70+Math.floor(Math.random()*95),x=Math.random()*128,y=Math.random()*128;
      ctx.fillStyle=`rgba(${shade},${shade},${shade-8},${Math.random()*.32})`;
      ctx.fillRect(x,y,1+Math.random()*5,1+Math.random()*2);
    }
    sandstoneTexture=new T.CanvasTexture(cvs);sandstoneTexture.wrapS=sandstoneTexture.wrapT=T.RepeatWrapping;
    sandstoneTexture.repeat.set(2,2);
  }
  if(!sandstoneMaterials.has(c))sandstoneMaterials.set(c,new T.MeshStandardMaterial({
    color:c,roughness:.96,bumpMap:sandstoneTexture,bumpScale:.075
  }));
  return sandstoneMaterials.get(c);
}
function stoneBlock(g,x,y,z,w,h,d,c){
  const m=new T.Mesh(boxGeo,sandstone(c));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;
}
function steppedPyramid(g,x,z,size,courses){
  const height=.62,colors=['#cfb78e','#bfa67d','#dbc69c','#b9a17b'];
  const core=new T.Mesh(new T.ConeGeometry(size*.72,courses*height,4),sandstone('#bba47d'));
  core.position.set(x,courses*height*.48,z);core.rotation.y=Math.PI/4;g.add(core);
  for(let row=0;row<courses;row++){
    const span=size*(1-row/courses),y=row*height+height*.5,color=colors[row%colors.length];
    const count=Math.max(2,Math.ceil(span/1.35)),blockWidth=span/count;
    for(let i=0;i<count;i++){
      const offset=(i+.5)*blockWidth-span*.5;
      for(const side of [-1,1]){
        stoneBlock(g,x+offset,y,z+side*span*.5,blockWidth-.055,height-.035,.27,color);
        stoneBlock(g,x+side*span*.5,y,z+offset,.27,height-.035,blockWidth-.055,color);
      }
    }
  }
}
function craggyPeak(g,x,z,radius,height,seed){
  const sides=9,rings=5,vertices=[],colors=[],indices=[],rock=new T.Color('#687680'),snow=new T.Color('#e6eeea'),color=new T.Color();
  for(let ring=0;ring<=rings;ring++)for(let side=0;side<sides;side++){
    const angle=side/sides*Math.PI*2+seed*.17,rough=1+.13*Math.sin(side*7.1+seed*3.3)+.08*Math.cos(side*3.7);
    const t=ring/rings,rad=radius*(.12+t*.88)*rough;
    const y=height*(1-t)*(1-t*.58)*(1+.12*Math.sin(side*4.9+seed));
    vertices.push(x+Math.cos(angle)*rad,y,z+Math.sin(angle)*rad);
    const snowLine=.58-.14*Math.max(0,Math.sin(angle*3+seed));
    color.copy(rock).lerp(snow,Math.max(0,Math.min(1,(y/height-snowLine)*8)));
    if(y/height>.9)color.copy(snow);
    colors.push(color.r,color.g,color.b);
    if(ring<rings){const a=ring*sides+side,b=ring*sides+(side+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c)}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  g.add(new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.91,side:T.DoubleSide})));
}
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
function makeInfrastructure(g,solids,asphaltMaterial){
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
  const paving=asphaltMaterial?.clone()??mat('#424952');
  paving.color.set('#59616b');paving.roughness=.91;paving.metalness=.02;
  const runwayMark=mat('#e4e0d2',true),laneMark=mat('#ded1a4',true),curb=mat('#abb0a8'),
    light=mat('#fff0c1',true),buildingPalette={
      dune:['#b77a52','#d0a272','#c78e61'],jungle:['#6e6752','#887b5c','#a48b69'],
      snow:['#677f97','#8297a4','#9bb0ba'],future:['#485275','#586483','#636b8b'],
      obsidian:['#34383d','#45494b','#55524d'],bamboo:['#5c7357','#738666','#9a8b68'],
      atoll:['#d8c6a9','#c8b18f','#eee1c8']
    };
  interIslandTunnels=[];
  const roadBox=(parent,x,y,z,w,h,d,material)=>{
    const mesh=new T.Mesh(boxGeo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
  };
  for(const i of islands){
    const cx=i.centerX,z=i.z,terrainType=i.id==='snow'?'alpine':i.id,
      city=new T.Group(),solidStart=solids.length,
      runway=runways.find(item=>item.id===i.id),runwayX=runway.x,runwayZ=z,
      runwayClear=(x,zz)=>Math.abs(x-runwayX)<10&&Math.abs(zz-runwayZ)<58;
    city.position.y=1.9;g.add(city);
    createTerrainPatch(city,cx,z,200,184,64,58,`island-${terrainType}`,-1.9,cx,z);
    for(let n=-9;n<=9;n++){
      const offset=n*10;
      roadBox(city,cx-98,-1.03,z+offset,1.1,1.72,9.7,mat('#858b85'));
      roadBox(city,cx+98,-1.03,z+offset,1.1,1.72,9.7,mat('#858b85'));
      roadBox(city,cx+offset,-1.03,z-90,9.7,1.72,1.1,mat('#858b85'));
      roadBox(city,cx+offset,-1.03,z+90,9.7,1.72,1.1,mat('#858b85'));
    }
    for(const offset of [-80,-40,0,40,80]){
      roadBox(city,cx+offset,.08,z,14,.18,148,paving);
      for(const side of [-1,1]){
        roadBox(city,cx+offset+side*7.9,.12,z,1.65,.24,148,curb);
        roadBox(city,cx+offset+side*7.05,.205,z,.18,.035,148,runwayMark);
      }
      for(let n=-70;n<=70;n+=9)for(const side of [-1,1])
        roadBox(city,cx+offset+side*2.7,.19,z+n,.14,.035,3.8,runwayMark);
      roadBox(city,cx+offset-.14,.19,z, .12,.035,146,laneMark);
      roadBox(city,cx+offset+.14,.19,z, .12,.035,146,laneMark);
    }
    for(const offset of [-72,-36,0,36,72]){
      const spans=Math.abs(offset)<58
        ?[[cx-82,runwayX-10],[runwayX+10,cx+82]]
        :[[cx-82,cx+82]];
      for(const [start,end] of spans){
        const center=(start+end)*.5,width=end-start;
        roadBox(city,center,.08,z+offset,width,.18,13.2,paving);
        for(const side of [-1,1]){
          roadBox(city,center,.12,z+offset+side*7.55,width,.24,1.6,curb);
          roadBox(city,center,.205,z+offset+side*6.8,width,.035,.18,runwayMark);
        }
        for(let n=Math.ceil((start-cx)/9)*9;n<=end-cx;n+=9)for(const side of [-1,1])
          if(!runwayClear(cx+n,z+offset+side*2.6))
            roadBox(city,cx+n,.19,z+offset+side*2.6,3.8,.035,.14,runwayMark);
        roadBox(city,center,.19,z+offset-.14,width,.035,.12,laneMark);
        roadBox(city,center,.19,z+offset+.14,width,.035,.12,laneMark);
      }
    }
    for(const xOffset of [-80,-40,0,40,80])for(const zOffset of [-72,-36,0,36,72]){
      for(let stripe=-4;stripe<=4;stripe++)
        if(!runwayClear(cx+xOffset+stripe*1.35,z+zOffset+9))
          roadBox(city,cx+xOffset+stripe*1.35,.23,z+zOffset+9,.72,.035,3.4,runwayMark);
      if(!runwayClear(cx+xOffset,z+zOffset))roadBox(city,cx+xOffset,.25,z+zOffset,2.6,.035,2.6,curb);
    }
    for(const xOffset of [-80,-40,0,40,80])for(let zz=-66;zz<=66;zz+=33)for(const side of [-1,1]){
      const x=cx+xOffset+side*10.2,zzw=z+zz;
      if(runwayClear(x,zzw))continue;
      const pole=new T.Mesh(tubeGeo,mat('#64716d'));pole.position.set(x,3.1,zzw);pole.scale.set(.12,6.2,.12);city.add(pole);
      roadBox(city,x,6.3,zzw,1.35,.12,.16,light);
    }
    const develop=(x,zz,n)=>{
      const height=(i.id==='future'||i.id==='obsidian'?24:12)+(n*11%21),
        width=10+(n%3)*2.4,depth=10+((n+1)%3)*2.1,
        runwayOverlap=Math.abs(x-runwayX)<18+width*.5&&Math.abs(zz-runwayZ)<64+depth*.5,
        apronOverlap=Math.abs(x-(runwayX-18))<14+width*.5&&Math.abs(zz-runwayZ)<10+depth*.5;
      if(runwayOverlap||apronOverlap)return;
      const palette=buildingPalette[i.id],facade=sandstone(palette[n%palette.length]),
        building=new T.Mesh(boxGeo,facade);
      building.position.set(x,height*.5,zz);building.scale.set(width,height,depth);city.add(building);
      roadBox(city,x,height+.28,zz,width+.42,.56,depth+.42,mat(i.id==='snow'?'#e9f5f8':i.accent));
      for(let floor=2.2;floor<height-1;floor+=3.1){
        for(const side of [-1,1]){
          roadBox(city,x+side*(width*.5+.025),floor,zz, .05,1.25,depth*.72,mat('#9bcbd0',true));
          roadBox(city,x,floor,zz+side*(depth*.5+.025),width*.72,1.25,.05,mat('#9bcbd0',true));
        }
      }
      roadBox(city,x,1.28,zz+depth*.5+.055,width*.38,2.55,.09,mat('#365260'));
      roadBox(city,x,1.38,zz+depth*.5+.11,width*.3,2.25,.05,mat(i.accent,true));
      roadBox(city,x+width*.29,height+.85,zz,1.7,1.1,1.5,mat('#6a767a'));
      roadBox(city,x-width*.28,height+.72,zz+depth*.2,1.2,.84,1.1,mat('#768184'));
      const kind=n%5===0?'shop':n%4===0?'business':'home',doorX=x,doorZ=zz+depth*.5+.7;
      solids.push({x,z:zz,w:width*.51,d:depth*.51,h:height+.5,kind,name:`${i.name} ${kind}`,doorX,doorZ,id:`${i.id}-${n}`,variant:n%5});
      if(i.id==='future'||i.id==='obsidian'){
        roadBox(city,x,height+1.25,zz,.35,2.5,.35,mat(i.accent,true));
        roadBox(city,x,height*.58,zz+depth*.5+.09,.12,height*.82,.14,mat('#9cf4f1',true));
      }
    };
    let lot=0;const forest=[];
    for(const xOffset of [-60,-20,20,60])for(const zOffset of [-54,-18,18,54]){
      if(Math.abs(xOffset)===20&&Math.abs(zOffset)===18){
        for(const [dx,dz] of [[-7,-7],[-7,7],[7,-7],[7,7]])
          forest.push({x:cx+xOffset+dx,z:z+zOffset+dz,scale:.82+((lot++)%4)*.08});
        continue;
      }
      for(const [dx,dz] of [[-7,-7],[7,7]])develop(cx+xOffset+dx,z+zOffset+dz,lot++);
    }
    roadBox(city,runwayX,.16,runwayZ,18,.18,116,paving);
    for(const side of [-1,1]){
      roadBox(city,runwayX+side*8.15,.265,runwayZ,.18,.035,109,runwayMark);
      for(let n=-52;n<=52;n+=8)roadBox(city,runwayX+side*9.5,.31,runwayZ+n,.3,.11,.3,light);
    }
    for(let n=-44;n<=44;n+=9)roadBox(city,runwayX,.27,runwayZ+n,.28,.035,4.2,runwayMark);
    for(const edge of [-1,1])roadBox(city,runwayX,.27,runwayZ+edge*51,15,.035,.5,runwayMark);
    const apron=roadBox(city,runwayX-18,.16,runwayZ,24,.18,18,paving);
    apron.position.x=runwayX-18;
    for(const side of [-1,1])roadBox(city,runwayX-18+side*10,.25,runwayZ, .2,.04,15,runwayMark);
    if(i.id==='dune')steppedPyramid(city,cx-51,z+20,17,10);
    if(i.id==='snow')for(const [x,dz,r,h] of [[-67,-43,14,28],[-52,-54,11,38],[-34,-56,12,31],[-22,-50,9,22]]){
      craggyPeak(city,cx+x,z+dz,r,h,x+dz);
      solids.push({x:cx+x,z:z+dz,w:r*.57,d:r*.57,h:h*.42});
    }
    if(i.id==='obsidian'){
      for(const [x,dz,h] of [[-70,-58,30],[-48,48,38],[55,-38,26]]){
        const vent=new T.Mesh(new T.CylinderGeometry(3.2,5.3,h,12),mat('#30383d'));
        vent.position.set(cx+x,h*.5,z+dz);city.add(vent);
        for(const y of [h*.55,h*.82]){
          const ring=new T.Mesh(new T.TorusGeometry(3.8,.2,6,16),mat('#ff8750',true));
          ring.position.set(cx+x,y,z+dz);ring.rotation.x=Math.PI/2;city.add(ring);
        }
      }
    }
    if(i.id==='bamboo')for(const [x,dz,size] of [[-54,-43,11],[-8,40,14],[48,-35,10]]){
      steppedPyramid(city,cx+x,z+dz,size,6);
    }
    if(i.id==='atoll'){
      for(const x of [-74,-62,-50]){
        const dock=roadBox(city,cx+x,1.94,z+62,5.5,.22,23,mat('#b79973'));
        dock.rotation.y=0;
        for(let n=0;n<4;n++)roadBox(city,cx+x-2.2+n*1.45,1.85,z+62,.14,.35,23,mat('#776957'));
      }
    }
    addIslandForest(city,forest,i.id);
    sign(city,cx-88,7,z+20,i.name,i.accent);
    batch(city);
    for(let solid=solidStart;solid<solids.length;solid++)solids[solid].h+=1.9;
  }
  for(const i of outerLinks){
    const z=i.z,curve=new T.CatmullRomCurve3([
      new T.Vector3(388,1.9,z),new T.Vector3(398,.9,z),new T.Vector3(410,-.55,z),
      new T.Vector3(458,-.55,z),new T.Vector3(470,.9,z),new T.Vector3(480,1.9,z)
    ],false,'centripetal',.5),samples=curve.getPoints(72),
      shellCurve=new T.CatmullRomCurve3(samples.map(p=>new T.Vector3(p.x,p.y+5,p.z)),false,'centripetal',.5),
      shell=new T.Mesh(new T.TubeGeometry(shellCurve,96,5.65,14,false),new T.MeshStandardMaterial({color:'#58656a',roughness:.94,side:T.DoubleSide}));
    g.add(shell);
    interIslandTunnels.push({z,points:samples});
    const portalGeometry=new T.TorusGeometry(5.35,.42,10,32),portalMaterial=mat('#879398');
    for(const end of [0,samples.length-1]){
      const p=samples[end],tangent=curve.getTangentAt(end/(samples.length-1)).normalize();
      const ring=new T.Mesh(portalGeometry,portalMaterial);ring.position.set(p.x,p.y+5,p.z);
      ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),tangent);g.add(ring);
    }
    for(let n=0;n<samples.length-1;n+=2){
      const a=samples[n],b=samples[n+1],dx=b.x-a.x,dz=b.z-a.z,heading=Math.atan2(dx,dz),length=Math.hypot(dx,dz)+.12,
        road=roadBox(g,(a.x+b.x)*.5,(a.y+b.y)*.5,(a.z+b.z)*.5,11,.16,length,paving);
      road.rotation.y=heading;
      for(const side of [-1,1]){
        const line=roadBox(g,(a.x+b.x)*.5+Math.cos(heading)*side*2.7,(a.y+b.y)*.5+.11,(a.z+b.z)*.5-Math.sin(heading)*side*2.7,.13,.035,length,runwayMark);
        line.rotation.y=heading;
      }
      if(n%12===0)roadBox(g,(a.x+b.x)*.5,(a.y+b.y)*.5+9.9,z,3.4,.13,.22,light);
    }
  }
}
function makeRailInfrastructure(g){
  for(const [line,{segments,curve,length}] of Object.entries(routes)){
    if(line==='below'){
      const tunnel=new T.Mesh(
        new T.TubeGeometry(curve,Math.max(120,Math.ceil(length/4)),4.25,12,false),
        new T.MeshStandardMaterial({color:'#344b5c',roughness:.92,metalness:.08,side:T.DoubleSide})
      );
      g.add(tunnel);
      for(const d of [0,length]){
        const p=railAt(d,'below'),t=curve.getTangentAt(d/length);
        const axis=t.clone().normalize();
        const bulkhead=new T.Mesh(
          new T.CylinderGeometry(4.23,4.23,.48,20),
          mat('#536a75')
        );
        bulkhead.position.set(p.x,p.y,p.z);
        bulkhead.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);
        g.add(bulkhead);
        const buffer=new T.Mesh(
          new T.BoxGeometry(7.2,.55,3.2),
          mat('#8e6f55')
        );
        buffer.position.copy(new T.Vector3(p.x,p.y-.12,p.z).addScaledVector(axis,d===0?-2.1:2.1));
        buffer.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),axis);
        g.add(buffer);
      }
    }
    for(const {a,b,len,start} of segments){
      const dx=b[0]-a[0],dz=b[1]-a[1],xz=Math.hypot(dx,dz),nx=-dz/xz,nz=dx/xz,angle=Math.atan2(dx,dz);
      const P=(t,s=0,y=0)=>[a[0]+dx*t+nx*s,a[2]+(b[2]-a[2])*t+y,a[1]+dz*t+nz*s];
      for(const s of [-1,1])rod(g,P(0,s*.9,.09),P(1,s*.9,.09),.15,'#a9b2b3');
      for(let l=0;l<len;l+=2.45){
        const [x,y,z]=P(l/len);box(g,x,y-.12,z,3.5,.17,.26,'#716153').rotation.y=angle;
      }
      if(line==='below'){
        for(let l=3;l<len-1;l+=7)for(const s of [-1,1]){
          const [x,y,z]=P(l/len,s*3.84,0);
          box(g,x,y,z,.22,1.35,.18,'#718891').rotation.y=angle;
        }
      }else if(start%36<4&&
        ((a[0]>30&&a[0]<237)||(Math.abs(a[0]-302)<3))){
        for(const s of [-1,1]){
          const [x,y,z]=P(.5,s*2.7,-6);
          box(g,x,y,z,1.1,12,1.1,'#7f8e91');
        }
      }
    }
  }
}
const shade={rail:'#8de9cf',bus:'#acd6a5',taxi:'#ffd69a',ferry:'#87dde8',airport:'#a8baff',sports:'#aaf198',law:'#a2b9f9',bank:'#f5d28f',garage:'#f195d7',good:'#f5c894',hospital:'#a0ece0',arena:'#d6aef2'};
function makeStops(g){
  for(const s of stops){
    const {x,z,type}=s,c=shade[type],major=['airport','rail','ferry','sports','hospital','arena','bank'].includes(type);
    if(type==='good')continue;
    const first=g.children.length,offset=islandSurfaceY(x,z),
      lift=()=>{if(offset)for(let index=first;index<g.children.length;index++)g.children[index].position.y+=offset};
    if(type==='bus'&&s.id!=='boardwalk'){
      box(g,x,.018,z,4.5,.13,3.2,'#aaa99a');
      box(g,x,2.53,z,4.6,.23,3.25,c);
      for(const a of [-1,1])box(g,x+a*2,1.24,z-1.4,.18,2.5,.17,'#667c87');
      box(g,x,1.5,z-1.47,4.2,1.76,.12,'#557680');
      box(g,x,.47,z-.93,3.6,.21,.54,'#cfb28e');
      sign(g,x,3.08,z+1.6,s.name,c);
      box(g,x,.032,z+3.55,3.2,.043,1.1,c);
      lift();
      continue;
    }
    if(!major){
      box(g,x,1.12,z,.16,2.24,.16,'#adb9bb');sign(g,x,2.1,z,stopTypes[type],c);
      if(type==='bus'||type==='taxi')box(g,x,.032,z+3.55,3.2,.043,1.1,c);
      lift();
      continue;
    }
    const w=type==='rail'?15:type==='bank'?12:9,d=type==='rail'?9:type==='bank'?7:4.5;
    box(g,x,.027,z,w,.12,d,'#879596');
    box(g,x,3.04,z,w+.5,.29,d+.55,c);
    for(const a of [-1,1])for(const b of [-1,1])box(g,x+a*(w*.45),1.46,z+b*(d*.42),.24,2.9,.23,'#566c73');
    box(g,x,1.25,z-d*.5,w-.48,2.47,.21,'#314c58');
    for(const side of [-1,1]){
      box(g,x+side*w*.28,.46,z-d*.28,w*.27,.31,.61,'#bca583');
      box(g,x+side*(w*.5-.4),1.1,z+.9,.48,.41,.38,c,true);
    }
    if(type==='rail'){
      box(g,x,10.95,z,w,.3,d,'#89969a');
      for(const side of [-1,1])box(g,x+side*(w*.43),6.1,z,.55,12.1,.55,'#65757a');
      box(g,x,.065,z,4.2,.13,4.2,'#607c7b');
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
    lift();
  }
}
export const signals=[
  {x:0,z:48,offset:0},{x:-48,z:-48,offset:7},{x:0,z:96,offset:4},
  ...islands.map((i,k)=>({x:i.centerX,z:i.z,offset:3+k*4}))
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
export function makeArchipelago(scene,asphaltMaterial){
  const statics=new T.Group(),solids=[];
  makeInfrastructure(statics,solids,asphaltMaterial);makeRailInfrastructure(statics);makeStops(statics);batch(statics);scene.add(statics);
  const lights=signals.map(s=>trafficSignal(scene,s));
  const train=modelTrain(),metro=modelTrain(),ferry=modelFerry(),flight=modelFlight(),bus=new T.Group(),taxi=new T.Group(),patrol=new T.Group();
  shell(bus,2.9,2.91,8,'#75b599');shell(taxi,2.24,1.57,4.35,'#e7b468');shell(patrol,2.22,1.61,4.62,'#d3e0e9');
  const red=box(patrol,-.36,1.65,.06,.65,.21,.31,'#ff6869',true),blue=box(patrol,.36,1.65,.06,.65,.21,.31,'#6c98ff',true);
  const patrolBoat=new T.Group();
  shell(patrolBoat,2.35,1.05,6.2,'#d7e5e8');
  box(patrolBoat,0,.72,-.20,1.82,.62,3.2,'#4f6e7b');
  box(patrolBoat,-.42,1.31,-.10,.58,.19,.32,'#ff6869',true);
  box(patrolBoat,.42,1.31,-.10,.58,.19,.32,'#6c98ff',true);
  patrolBoat.visible=false;scene.add(patrolBoat);
  const patrolAircraft=new T.Group();
  box(patrolAircraft,0,.55,0,1.22,.55,5.8,'#d7e5e8');
  box(patrolAircraft,0,.65,.45,7.1,.12,2.0,'#617d8e');
  box(patrolAircraft,0,.88,-1.25,.90,.42,.95,'#2e4a5b');
  for(const x of [-1,1]){
    box(patrolAircraft,x*1.55,1.12,-2.05,.12,1.05,.75,'#617d8e');
    box(patrolAircraft,x*.48,.42,-3.10,.28,.28,.62,'#ff9a48',true);
  }
  patrolAircraft.visible=false;scene.add(patrolAircraft);
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
  return {train,metro,vehicleModels,patrol,patrolBoat,patrolAircraft,red,blue,helicopter,helicopterRotor:rotor,mae,way,arrow,traffic,props,pulse,roadHeightAt,
    hit:(x,z,y=.5,r=.35)=>solids.some(o=>y<o.h&&Math.abs(x-o.x)<o.w+r&&Math.abs(z-o.z)<o.d+r),
    properties:solids,
    signal(t){for(const {s,heads} of lights)for(const {axis,bulbs} of heads){const k=['red','amber','green'].indexOf(signalAt(s,t,axis));for(let n=0;n<3;n++)bulbs[n].visible=n===k;}}
  };
}
