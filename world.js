import * as T from './vendor/three.module.min.js';
import {addLifeWorld,makeWreck,person,beachAccess} from './life-world.js?v=articulated-physics';

export const roadsX = [-144,-96,-48,0], roadsZ = [-144,-96,-48,0,48,96];
export const runway = {x:-195,z:92,width:22,north:-161,south:117};
export const runwayWest = {x:-236,z:84,width:18,north:-154,south:110};
export const tileSize = 144, edge = -168;
export const gridCell = n=>Math.floor((n-edge)/tileSize);
const airportBounds={minX:-248,maxX:-169,minZ:-165,maxZ:119};
const inAirport=(x,z)=>x>=airportBounds.minX&&x<=airportBounds.maxX&&z>=airportBounds.minZ&&z<=airportBounds.maxZ;
export const onStreet = (x,z)=>Math.abs((((x+24)%48)+48)%48-24)<7.7 ||
  Math.abs((((z+24)%48)+48)%48-24)<6.9;
export const isCore = (x,z)=>x>=edge&&x<30&&z>=edge&&z<120;
export const atAirfield = (x,z)=>x>-248&&x<-170&&z>-165&&z<119;
export function districtFor(x,z){
  if(atAirfield(x,z))return ['PACIFICA AIRFIELD',x< -222?'Runway 36 West':'Runway 36'];
  if(x>30)return ['PACIFICA BAY','Open Water'];
  if(isCore(x,z))return x>-29?(z>20?['OCEAN DISTRICT','Boardwalk Blvd']:['OCEAN DISTRICT','Miramar Way']):x>-82?['ART DECO DISTRICT','Sunset Quarter']:['CENTRAL DISTRICT','Pacifica Central'];
  const i=gridCell(x),j=gridCell(z),n=((i*11+j*7)%6+6)%6;
  const places=x>-24?['Azure Coast','Coral Beach','High Tide','Vista Point','Seabreeze','Marina North']:
    ['Westhaven','Verde Heights','Sierra Vista','Cypress Point','Paloma Park','Juniper Hills'];
  return [`DISTRICT ${Math.abs(i-1)} W · ${Math.abs(j-1)} ${j>1?'S':'N'}`,places[n]];
}
const baseGeo = new T.BoxGeometry(), cylinder = new T.CylinderGeometry(.75,1,1,8), sphere = new T.IcosahedronGeometry(1,1);
const treeTrunk = new T.CylinderGeometry(.13,.25,1,9,4), canopy = new T.SphereGeometry(1,12,9);
const roadGeo = new T.PlaneGeometry(1,1); roadGeo.rotateX(-Math.PI/2);
const mat = (color, more={}) => new T.MeshStandardMaterial({color,roughness:.81,...more});
const raw = (color, more={}) => new T.MeshBasicMaterial({color,...more});
const dummy = new T.Object3D(), color = new T.Color(), batches = new Map();
const regular = mat('#ffffff'), buildingGlass = mat('#ffffff',{emissive:'#24868e',emissiveIntensity:.19,metalness:.25,roughness:.25});
const emissive = raw('#ffffff');
let foliage,barkMaterial;
let seed=10;
let activeOwner=null;
const destroyedBuildings=new Set(), buildingDamage=new Map(), ownerInstances=new Map(), rubbleById=new Set();
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function pick(xs){return xs[Math.floor(rand()*xs.length)]}
function detailMap(seedValue,repeat){
  const cvs=document.createElement('canvas');cvs.width=cvs.height=128;
  const ctx=cvs.getContext('2d'),image=ctx.createImageData(128,128);let n=seedValue>>>0;
  for(let i=0;i<image.data.length;i+=4){
    n=(Math.imul(n,1664525)+1013904223)>>>0;
    const v=128+(n>>>24)*.34;
    image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  const texture=new T.CanvasTexture(cvs);texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.repeat.set(repeat,repeat);texture.anisotropy=4;return texture;
}
let concreteMaterial,metalMaterial,terrainMaterial,facadeMaterial,masonryMaterial;
function barkTexture(){
  const cvs=document.createElement('canvas');cvs.width=256;cvs.height=256;
  const ctx=cvs.getContext('2d');ctx.fillStyle='#755b43';ctx.fillRect(0,0,256,256);
  let n=431;
  for(let i=0;i<96;i++){
    n=(Math.imul(n,1664525)+1013904223)>>>0;
    const x=n%256,width=1+(n>>>9)%6,light=(n>>>17)%45;
    ctx.strokeStyle=`rgba(${135+light},${105+light},${72+light},${.14+(n%20)/100})`;
    ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,0);
    ctx.bezierCurveTo(x-7,74,x+8,174,x-3,256);ctx.stroke();
  }
  for(let i=0;i<8;i++){
    n=(Math.imul(n,1664525)+1013904223)>>>0;
    const x=n%256,y=(n>>>8)%256;
    ctx.strokeStyle='rgba(45,34,25,.35)';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(x,y,3,13,n%3,0,Math.PI*2);ctx.stroke();
  }
  const texture=new T.CanvasTexture(cvs);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,2);texture.anisotropy=4;
  return texture;
}
function leafTextures(){
  const size=256,leaves=document.createElement('canvas'),alpha=document.createElement('canvas'),bump=document.createElement('canvas');
  for(const canvas of [leaves,alpha,bump])canvas.width=canvas.height=size;
  const ctx=leaves.getContext('2d'),a=alpha.getContext('2d'),b=bump.getContext('2d');
  let n=937;
  const palette=['#315b45','#426e4e','#587d50','#718957','#8b9b61','#385f50'];
  for(let i=0;i<900;i++){
    n=(Math.imul(n,1664525)+1013904223)>>>0;
    const x=n%size,y=(n>>>8)%size,rx=2+(n>>>16)%5,ry=1+(n>>>23)%3,rotation=(n%628)/100;
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=palette[(n>>>12)%palette.length];
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
    a.save();a.translate(x,y);a.rotate(rotation);a.fillStyle='#fff';
    a.beginPath();a.ellipse(0,0,rx,ry,0,0,Math.PI*2);a.fill();a.restore();
    b.save();b.translate(x,y);b.rotate(rotation);b.fillStyle=`rgb(${160+(n%70)},${160+(n%70)},${160+(n%70)})`;
    b.beginPath();b.ellipse(0,0,rx,ry,0,0,Math.PI*2);b.fill();b.restore();
  }
  const map=new T.CanvasTexture(leaves),alphaMap=new T.CanvasTexture(alpha),bumpMap=new T.CanvasTexture(bump);
  map.colorSpace=T.SRGBColorSpace;
  for(const texture of [map,alphaMap,bumpMap]){
    texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,2);texture.anisotropy=4;
  }
  return {map,alphaMap,bumpMap};
}
function initSurfaceMaterials(){
  const concreteNoise=detailMap(831,8),metalNoise=detailMap(1273,5);
  concreteMaterial=mat('#ffffff',{roughness:.94,roughnessMap:concreteNoise,bumpMap:concreteNoise,bumpScale:.018});
  metalMaterial=mat('#ffffff',{metalness:.64,roughness:.4,roughnessMap:metalNoise,bumpMap:metalNoise,bumpScale:.007});
  const terrainNoise=detailMap(5543,18);
  terrainMaterial=mat('#ffffff',{vertexColors:true,roughness:.94,roughnessMap:terrainNoise,bumpMap:terrainNoise,bumpScale:.028});
  facadeMaterial=mat('#ffffff',{map:facadeTexture(),roughness:.83,metalness:.05});
  masonryMaterial=mat('#ffffff',{map:facadeTexture(true),roughness:.94,roughnessMap:concreteNoise,bumpMap:concreteNoise,bumpScale:.025});
  const barkMap=barkTexture(),barkBump=barkTexture();barkBump.colorSpace=T.NoColorSpace;
  barkMaterial=mat('#ffffff',{map:barkMap,bumpMap:barkBump,bumpScale:.045,roughness:.98});
  const leaves=leafTextures();
  foliage=mat('#ffffff',{...leaves,side:T.DoubleSide,alphaTest:.5,roughness:.96,bumpScale:.025});
}
function lattice(x,z){
  let n=(Math.imul(x|0,374761393)+Math.imul(z|0,668265263))|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,z){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  const a=lattice(ix,iz),b=lattice(ix+1,iz),c=lattice(ix,iz+1),d=lattice(ix+1,iz+1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
function fbm(x,z){
  let value=0,amplitude=.5,total=.0;
  for(let octave=0;octave<4;octave++){
    value+=noise(x,z)*amplitude;total+=amplitude;
    x*=2.03;z*=2.03;amplitude*=.5;
  }
  return value/total;
}
function facadeTexture(masonry=false){
  const cvs=document.createElement('canvas');cvs.width=256;cvs.height=256;
  const ctx=cvs.getContext('2d');ctx.fillStyle=masonry?'#a77f68':'#b8b8b2';ctx.fillRect(0,0,256,256);
  if(masonry){
    for(let row=0;row<20;row++)for(let col=0;col<8;col++){
      const x=col*34+(row%2)*17,y=row*13;
      ctx.strokeStyle='rgba(64,54,49,.46)';ctx.lineWidth=1.5;ctx.strokeRect(x,y,34,13);
      ctx.fillStyle=(row+col)%3===0?'rgba(230,194,163,.17)':'rgba(72,53,45,.11)';
      ctx.fillRect(x+1,y+1,32,11);
    }
  }else for(let row=0;row<8;row++)for(let col=0;col<5;col++){
      const x=8+col*50,y=7+row*31;
      ctx.fillStyle='#787f7e';ctx.fillRect(x,y,39,23);
      ctx.fillStyle=(row+col)%5===0?'#687c80':'#4c6870';ctx.fillRect(x+3,y+3,33,16);
      ctx.fillStyle='rgba(225,229,218,.28)';ctx.fillRect(x+4,y+3,3,16);
      ctx.fillStyle='#d1cfc3';ctx.fillRect(x-2,y+24,43,3);
  }
  const image=ctx.getImageData(0,0,256,256);
  let n=257;
  for(let i=0;i<image.data.length;i+=4){
    n=(Math.imul(n,1664525)+1013904223)>>>0;
    const delta=((n>>>24)-127)*.12;
    image.data[i]=Math.max(0,Math.min(255,image.data[i]+delta));
    image.data[i+1]=Math.max(0,Math.min(255,image.data[i+1]+delta));
    image.data[i+2]=Math.max(0,Math.min(255,image.data[i+2]+delta));
  }
  ctx.putImageData(image,0,0);
  const texture=new T.CanvasTexture(cvs);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;return texture;
}
const terrainBase=new T.Color(),terrainAccent=new T.Color(),terrainColor=new T.Color(),terrainRock=new T.Color('#77766f');
const wetSand=new T.Color('#665d51'),trailSoil=new T.Color('#88724f');
function terrainHeight(x,z,mode){
  const broad=fbm(x*.009,z*.009),fine=fbm(x*.035+13,z*.035-7);
  if(mode==='city')return (broad-.5)*.24+(fine-.5)*.045;
  if(mode==='shore')return (broad-.5)*.42+(fine-.5)*.10;
  if(mode.startsWith('island-')){
    const biome=mode.slice(7),amplitude=biome==='dune'?2.35:biome==='alpine'?3.2:
      biome==='jungle'?2.4:biome==='obsidian'?2.8:biome==='bamboo'?3.4:biome==='atoll'?.8:1.8;
    const ridge=biome==='dune'?Math.sin(z*.095+fbm(x*.018,z*.018)*4)*.26:
      biome==='bamboo'?Math.sin(x*.038+fbm(x*.018,z*.018)*2)*.55:
      biome==='obsidian'?Math.sin(x*.064+z*.035)*.72:0;
    return (broad-.5)*amplitude+(fine-.5)*.58+ridge;
  }
  return (broad-.5)*5.2+(fine-.5)*1.45;
}
function terrainGrid(parent,x,z,w,d,cols,rows,mode,baseY,offsetX=x,offsetZ=z,flattenAirport=false){
  const vertices=[],colors=[],indices=[],dx=w/cols,dz=d/rows;
  const palettes={
    dune:['#a98553','#e0bf7a'],jungle:['#42684b','#8c9860'],alpine:['#626f76','#e5ece8'],
    future:['#55566e','#a09bb3'],obsidian:['#34373c','#706c68'],bamboo:['#547b55','#a5b76d'],
    atoll:['#d8c49b','#f2dfbd']
  };
  const palette=mode.startsWith('island-')?palettes[mode.slice(7)]:null;
  terrainBase.set(palette?.[0]??(mode==='shore'?'#777f6f':'#75866f'));
  terrainAccent.set(palette?.[1]??(mode==='shore'?'#c5ad84':'#9a9677'));
  const points=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
    const px=x-w/2+col*dx,pz=z-d/2+row*dz,gx=offsetX-w/2+col*dx,gz=offsetZ-d/2+row*dz;
    const airportGround=flattenAirport&&inAirport(gx,gz);
    let height=airportGround?-.12:terrainHeight(gx,gz,mode);
    if(mode==='shore'){
      const fade=Math.max(0,Math.min(1,(30.5-gx)/12));
      height*=fade;
    }
    if(mode.startsWith('island-')){
      const fade=Math.max(0,Math.min(1,(gx-(offsetX-w/2))/20,(offsetX+w/2-gx)/20,
        (gz-(offsetZ-d/2))/20,(offsetZ+d/2-gz)/20));
      const urban=Math.abs(gx-offsetX)<=90&&Math.abs(gz-offsetZ)<=82;
      const centralIsland=Math.abs(offsetX-313)<1,
        bridgeApproach=centralIsland&&Math.abs(gx-offsetX)<=9&&Math.abs(gz-offsetZ)>=72&&Math.abs(gz-offsetZ)<=94,
        westBridgeApproach=centralIsland&&Math.abs(gz-offsetZ)<=9&&gx>=offsetX-100&&gx<=offsetX-78;
      height=urban||bridgeApproach||westBridgeApproach?1.9:1.9*fade+Math.max(0,height)*fade-1.9;
      if(mode==='island-dune'&&Math.abs(gz-offsetZ)<=7.4&&gx>=offsetX-100&&gx<=offsetX-80)
        height=-.10+(gx-(offsetX-100))/20*1.99;
    }
    if(mode==='city'&&onStreet(gx,gz))height=0;
    points.push({px,pz,gx,gz,height,airportGround});
    vertices.push(px,baseY+height,pz);
  }
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
    const i=row*(cols+1)+col,{gx,gz,height,airportGround}=points[i];
    const left=points[row*(cols+1)+Math.max(0,col-1)],right=points[row*(cols+1)+Math.min(cols,col+1)];
    const up=points[Math.max(0,row-1)*(cols+1)+col],down=points[Math.min(rows,row+1)*(cols+1)+col];
    const slope=Math.hypot((right.height-left.height)/(dx*(col===0||col===cols?1:2)),(down.height-up.height)/(dz*(row===0||row===rows?1:2)));
    const beach=mode==='shore'?Math.max(0,Math.min(1,(gx-15)/16)):0;
    const heightTint=Math.max(0,Math.min(1,(height+1.1)/5.5));
    terrainColor.copy(terrainBase).lerp(terrainAccent,Math.max(beach,heightTint*.55));
    if(slope>.36)terrainColor.lerp(terrainRock,Math.min(.62,(slope-.36)*.55));
    if(mode==='shore')terrainColor.lerp(wetSand,Math.max(0,Math.min(1,(gx-27)/3))*.58);
    if(mode==='island-jungle'){
      const trail=Math.max(0,1-Math.abs(gx-(282+7*Math.sin(gz*.06)))/2.8);
      terrainColor.lerp(trailSoil,trail*.72);
    }
    if(airportGround)terrainColor.set('#62686d');
    const variation=(fbm(gx*.22,gz*.22)-.5)*.10;
    terrainColor.multiplyScalar(1+variation);
    colors.push(terrainColor.r,terrainColor.g,terrainColor.b);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a=row*(cols+1)+col,b=a+cols+1;
    indices.push(a,b,a+1,a+1,b,b+1);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,terrainMaterial);mesh.position.y=0;mesh.receiveShadow=true;mesh.userData.terrain=true;parent.add(mesh);
  return mesh;
}
export function createTerrainPatch(parent,x,z,w,d,cols,rows,mode,baseY,offsetX=x,offsetZ=z){
  return terrainGrid(parent,x,z,w,d,cols,rows,mode,baseY,offsetX,offsetZ);
}
export function getBuildingMaterials(){
  if(!facadeMaterial||!masonryMaterial)throw new Error('Building materials must be initialized before creating island buildings.');
  return {facade:facadeMaterial,masonry:masonryMaterial};
}
const buildingId=(x,z)=>`${x.toFixed(2)}/${z.toFixed(2)}`;
function add(g,m,x,y,z,sx,sy,sz,c,rx=0,ry=0,rz=0){
  const id=`${g.id}/${m.id}`;
  if(!batches.has(id)) batches.set(id,{g,m,items:[]});
  batches.get(id).items.push([x,y,z,sx,sy,sz,c,rx,ry,rz,activeOwner]);
}
function box(x,y,z,w,h,d,c,m=regular,ry=0){add(baseGeo,m,x,y,z,w,h,d,c,0,ry,0)}
function plane(x,y,z,w,d,c,m=regular){add(roadGeo,m,x,y,z,w,1,d,c)}
function bake(scene){
  for(const {g,m,items} of batches.values()){
    const set=new T.InstancedMesh(g,m,items.length);
    set.castShadow=g===palmLeaf||g===treeTrunk||g===canopy;
    set.receiveShadow=!!m.userData.receiveShadow;
    items.forEach(([x,y,z,w,h,d,c,rx,ry,rz,owner],i)=>{
      dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
      if(owner&&destroyedBuildings.has(owner))dummy.scale.set(0,0,0),dummy.updateMatrix();
      set.setMatrixAt(i,dummy.matrix);set.setColorAt(i,color.set(c));
      if(owner){
        if(!ownerInstances.has(owner))ownerInstances.set(owner,[]);
        ownerInstances.get(owner).push({mesh:set,index:i});
      }
    });
    set.computeBoundingSphere();scene.add(set);
  }
  batches.clear();
}
function hideBuilding(owner){
  for(const {mesh,index} of ownerInstances.get(owner)??[]){
    dummy.position.set(0,-100000,0);dummy.scale.set(0,0,0);dummy.rotation.set(0,0,0);dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);mesh.instanceMatrix.needsUpdate=true;
  }
}
function unregisterInstances(group){
  const meshes=new Set();group.traverse(o=>{if(o.isInstancedMesh)meshes.add(o)});
  for(const [owner,refs] of ownerInstances){
    const remaining=refs.filter(ref=>!meshes.has(ref.mesh));
    if(remaining.length)ownerInstances.set(owner,remaining);else ownerInstances.delete(owner);
  }
}
function roadMaterial(){
  const cvs=document.createElement('canvas');cvs.width=cvs.height=128;
  const c=cvs.getContext('2d');c.fillStyle='#292e34';c.fillRect(0,0,128,128);
  for(let i=0;i<5200;i++){
    const v=52+Math.floor(rand()*58);c.fillStyle=`rgba(${v},${v},${v},.35)`;
    c.fillRect(rand()*128,rand()*128,rand()<.07?3:1,1);
  }
  const texture=new T.CanvasTexture(cvs);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(5,5);texture.anisotropy=4;
  const detail=detailMap(317,7),material=mat('#ffffff',{map:texture,roughness:.92,roughnessMap:detail,bumpMap:detail,bumpScale:.012});
  material.userData.receiveShadow=true;return material;
}
const gridRoadGeometry=new T.BoxGeometry();
let gridRoadMaterials;
function roadGridMaterials(){
  if(!gridRoadMaterials)gridRoadMaterials={
    curb:concreteMaterial??mat('#aab1a5',{roughness:.92}),sidewalk:concreteMaterial??mat('#aab1a5',{roughness:.92}),
    yellow:raw('#e8bb74'),white:raw('#d8ded8'),lamp:metalMaterial??mat('#596878',{metalness:.64,roughness:.4}),
    glow:raw('#ffe4a5')
  };
  return gridRoadMaterials;
}
export function addOrthogonalRoadGrid(parent,{
  xLines,zLines,minX,maxX,minZ,maxZ,roadMaterial:asphaltMaterial,roadY=.01,
  xRoadWidth=14.8,zRoadWidth=13.2,exclusions=[],xLineRange,zLineRange,streetlights=false,
  lampExclusions=[]
}){
  if(!asphaltMaterial)throw new Error('A shared asphalt material is required for the road grid.');
  const materials=roadGridMaterials(),parts=new Map();
  const add=(type,x,y,z,w,h,d,material,rotation=0)=>{
    if(!parts.has(type))parts.set(type,{material,items:[]});
    parts.get(type).items.push([x,y,z,w,h,d,rotation]);
  };
  const outside=(x,z,rectangles)=>rectangles.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);
  const segments=(axis,line,start,end,roadWidth)=>{
    const cutouts=exclusions.filter(r=>axis==='x'
      ?line>=r.minX-roadWidth*.5&&line<=r.maxX+roadWidth*.5
      :line>=r.minZ-roadWidth*.5&&line<=r.maxZ+roadWidth*.5)
      .map(r=>axis==='x'?[r.minZ-roadWidth*.5,r.maxZ+roadWidth*.5]:[r.minX-roadWidth*.5,r.maxX+roadWidth*.5])
      .filter(([a,b])=>b>start&&a<end).sort((a,b)=>a[0]-b[0]);
    const ranges=[];let cursor=start;
    for(const [a,b] of cutouts){
      if(a>cursor)ranges.push([cursor,Math.min(a,end)]);
      cursor=Math.max(cursor,b);
    }
    if(cursor<end)ranges.push([cursor,end]);
    return ranges.filter(([a,b])=>b-a>.1);
  };
  const roadLines=[];
  const addRoad=(axis,line,start,end,width)=>{
    const half=width*.5,range=segments(axis,line,start,end,width);
    roadLines.push({axis,line,start,end,width});
    for(const [a,b] of range){
      const length=b-a,center=(a+b)*.5;
      add('asphalt',axis==='x'?line:center,roadY-.09,axis==='x'?center:line,
        axis==='x'?width:length,.18,axis==='x'?length:width,asphaltMaterial);
      for(const side of [-1,1]){
        add('curb',axis==='x'?line+side*(half+.12):center,roadY-.015,
          axis==='x'?center:line+side*(half+.12),axis==='x'?.24:length,.13,axis==='x'?length:.24,materials.curb);
        add('sidewalk',axis==='x'?line+side*(half+1.02):center,roadY-.015,
          axis==='x'?center:line+side*(half+1.02),axis==='x'?1.56:length,.09,axis==='x'?length:1.56,materials.sidewalk);
      }
      const dashed=(lateral,color,width,dash,gap)=>{
        const pitch=dash+gap;
        for(let p=Math.ceil(a/pitch)*pitch;p+dash<=b;p+=pitch){
          const middle=p+dash*.5;
          add(color,axis==='x'?line+lateral:middle,roadY+.019,axis==='x'?middle:line+lateral,
            axis==='x'?width:dash,.035,axis==='x'?dash:width,color==='yellow'?materials.yellow:materials.white);
        }
      };
      for(const side of [-1,1]){
        add('yellow',axis==='x'?line+side*.18:center,roadY+.019,axis==='x'?center:line+side*.18,
          axis==='x'?.13:length,.035,axis==='x'?length:.13,materials.yellow);
        dashed(side*3.35,'white',.12,3.2,4.8);
      }
    }
  };
  for(const x of xLines){
    const [a,b]=xLineRange?.(x)??[minZ,maxZ];
    addRoad('x',x,Math.max(a,minZ),Math.min(b,maxZ),xRoadWidth);
  }
  for(const z of zLines){
    const [a,b]=zLineRange?.(z)??[minX,maxX];
    addRoad('z',z,Math.max(a,minX),Math.min(b,maxX),zRoadWidth);
  }
  for(const x of xLines)for(const z of zLines){
    if(outside(x,z,exclusions))continue;
    const clear=(cx,cz,halfX,halfZ)=>!exclusions.some(r=>
      cx+halfX>=r.minX&&cx-halfX<=r.maxX&&cz+halfZ>=r.minZ&&cz-halfZ<=r.maxZ);
    for(let stripe=-4;stripe<=4;stripe++){
      const xCross=x+stripe*.92,zCross=z+stripe*.92;
      for(const crossZ of [z-zRoadWidth*.5-1.1,z+zRoadWidth*.5+1.1])
        if(clear(xCross,crossZ,.31,1.3))add('crosswalk',xCross,roadY+.02,crossZ,.62,.035,2.6,materials.white);
      for(const crossX of [x-xRoadWidth*.5-1.1,x+xRoadWidth*.5+1.1])
        if(clear(crossX,zCross,1.3,.31))add('crosswalk',crossX,roadY+.02,zCross,2.6,.035,.62,materials.white);
    }
  }
  if(streetlights){
    const polePositions=[],intersectionClear=(x,z)=>!xLines.some(ix=>
      Math.abs(x-ix)<xRoadWidth*.5+2.5&&zLines.some(iz=>Math.abs(z-iz)<zRoadWidth*.5+2.5));
    const place=(x,z,axis,side)=>{
      if(outside(x,z,lampExclusions)||!intersectionClear(x,z))return;
      const armX=axis==='x'?-side:0,armZ=axis==='z'?-side:0,y=3.1;
      polePositions.push([x,y,z,axis,armX,armZ]);
    };
    for(const x of xLines)for(const side of [-1,1]){
      const curbX=x+side*(xRoadWidth*.5+.65);
      for(let i=1;i<zLines.length;i++)place(curbX,(zLines[i-1]+zLines[i])*.5,'x',side);
    }
    for(const z of zLines)for(const side of [-1,1]){
      const curbZ=z+side*(zRoadWidth*.5+.65);
      for(let i=1;i<xLines.length;i++)place((xLines[i-1]+xLines[i])*.5,curbZ,'z',side);
    }
    for(const [x,y,z,axis,armX,armZ] of polePositions){
      const armLength=.7;
      add('lampPole',x,y,z,.14,6.2,.14,materials.lamp);
      add('lampArm',x+armX*armLength*.5,y+2.72,z+armZ*armLength*.5,
        axis==='x'?armLength:.14,.13,axis==='x'?.14:armLength,materials.lamp);
      add('lampHead',x+armX*armLength,y+2.68,z+armZ*armLength,
        axis==='x'?.24:.48,.12,axis==='x'?.48:.24,materials.glow);
    }
  }
  for(const [type,{material,items}] of parts){
    const mesh=new T.InstancedMesh(gridRoadGeometry,material,items.length);
    mesh.name=`Pacifica grid ${type}`;
    if(type==='lampPole'||type==='lampArm'||type==='lampHead')
      mesh.userData.roadGridStreetlights=true;
    items.forEach(([x,y,z,w,h,d,rotation],index)=>{
      dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(w,h,d);dummy.updateMatrix();
      mesh.setMatrixAt(index,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();parent.add(mesh);
  }
  return roadLines;
}
function shadow(scene){
  const c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d');const gradient=ctx.createRadialGradient(32,32,5,32,32,32);
  gradient.addColorStop(0,'rgba(10,12,22,.67)');gradient.addColorStop(.55,'rgba(12,15,24,.46)');gradient.addColorStop(1,'rgba(12,15,24,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const mesh=new T.Mesh(roadGeo,raw('#ffffff',{map:new T.CanvasTexture(c),transparent:true,depthWrite:false}));mesh.position.y=.085;mesh.scale.set(4.1,1,6.6);scene.add(mesh);return mesh;
}
const palmLeaf=(()=>{
  const vertices=[],indices=[];
  for(let i=0;i<=8;i++){
    const t=i/8, x=t*3.75,y=1.25*Math.sin(t*Math.PI)-1.55*t*t,w=.5*Math.sin(Math.PI*t)**.8;
    vertices.push(x,y,-w,x,y+.12*Math.sin(Math.PI*t),0,x,y,w);
    if(i<8){const j=i*3;indices.push(j,j+3,j+1,j+1,j+3,j+4,j+1,j+4,j+2,j+2,j+4,j+5)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
})();
function palm(x,z,s=1,offsetX=0,offsetZ=0){
  if(inAirport(x+offsetX,z+offsetZ))return;
  const h=(5.8+rand()*3)*s,lean=(rand()-.5)*1.6;
  const k=Math.atan2(-lean,h);
  add(cylinder,barkMaterial,x+lean*.5,h*.5,z,.24*s,Math.hypot(h,lean),.24*s,'#897065',0,0,k);
  for(let y=.5;y<h-.15;y+=.62*s) add(cylinder,barkMaterial,x+lean*y/h,y,z,.241*s,.08*s,.241*s,'#a28a74',0,0,k);
  add(canopy,foliage,x+lean,h,z,.38*s,.42*s,.38*s,'#4c6250');
  for(let i=0;i<9;i++){
    const f=(.75+rand()*.36)*s;
    add(palmLeaf,foliage,x+lean,h,z,f,f,f,pick(['#476b59','#305a4e','#638367','#3b6753','#638969']),0,i*.698+rand()*.25,(rand()-.52)*.35);
  }
}
function tree(x,z,s=1,offsetX=0,offsetZ=0){
  if(inAirport(x+offsetX,z+offsetZ))return;
  const h=(3.3+rand()*1.8)*s,lean=(rand()-.5)*.24*s;
  add(treeTrunk,barkMaterial,x+lean*.5,h*.5,z,.92*s,h,.92*s,'#856344');
  for(const side of [-1,1]){
    add(treeTrunk,barkMaterial,x+side*.36*s,h*.61,z,.46*s,h*.38,.46*s,'#795a40',0,0,side*.54);
  }
  const crownY=h+.58*s;
  for(const [dx,dy,dz,sx,sy,sz] of [
    [0,0,0,1.05,1.03,1.02],[-.83,-.27,.12,.76,.79,.78],[.78,-.18,-.16,.81,.82,.83],
    [-.28,.68,-.52,.72,.74,.72],[.34,.59,.53,.76,.76,.72]
  ]){
    add(canopy,foliage,x+dx*s+lean,crownY+dy*s,z+dz*s,sx*s,sy*s,sz*s,
      pick(['#42694c','#52764f','#668354','#3c6248','#758b57']));
  }
}
export function addIslandForest(parent,placements,biome){
  if(!foliage||!barkMaterial)throw new Error('Surface materials must be initialized before creating island forests.');
  if(!placements.length)return;
  const trunkMesh=new T.InstancedMesh(treeTrunk,barkMaterial,placements.length),
    clusters=[[0,0,0,1.05,1.04,1.05],[-.82,-.22,.12,.78,.8,.8],[.8,-.18,-.16,.81,.83,.82],
      [-.28,.65,-.52,.73,.77,.73],[.34,.58,.53,.76,.78,.73],[0,.85,.05,.67,.72,.68]],
    leafMesh=new T.InstancedMesh(canopy,foliage,placements.length*clusters.length),
    palettes={
      dune:['#536b42','#64764a','#7f8952'],jungle:['#315b45','#426e4e','#587d50'],
      snow:['#48675e','#58756c','#738778'],future:['#435a51','#5c7056','#7c8060'],
      obsidian:['#304b40','#3e5e45','#596c49'],bamboo:['#3b6947','#568154','#79a15d'],
      atoll:['#4c6946','#64804e','#82925a']
    },
    colors=palettes[biome]??palettes.jungle;
  let leafIndex=0;
  for(let index=0;index<placements.length;index++){
    const {x,z,scale=1}=placements[index];
    dummy.position.set(x,2.25*scale,z);dummy.rotation.set(0,0,.025*Math.sin(x+z));
    dummy.scale.set(.48*scale,4.5*scale,.48*scale);dummy.updateMatrix();
    trunkMesh.setMatrixAt(index,dummy.matrix);
    for(let cluster=0;cluster<clusters.length;cluster++){
      const [dx,dy,dz,sx,sy,sz]=clusters[cluster],pine=biome==='snow'||biome==='obsidian',
        spread=pine ? .78 : 1;
      dummy.position.set(x+dx*scale*spread,(5.1+dy)*scale,z+dz*scale*spread);
      dummy.rotation.set(0,(index%7)*.41+cluster*.83,0);
      dummy.scale.set(sx*scale*spread,sy*scale,sz*scale*spread);dummy.updateMatrix();
      leafMesh.setMatrixAt(leafIndex,dummy.matrix);
      leafMesh.setColorAt(leafIndex,new T.Color(colors[(index+cluster)%colors.length]));
      leafIndex++;
    }
  }
  trunkMesh.instanceMatrix.needsUpdate=true;leafMesh.instanceMatrix.needsUpdate=true;
  trunkMesh.castShadow=leafMesh.castShadow=true;
  trunkMesh.receiveShadow=leafMesh.receiveShadow=true;
  parent.add(trunkMesh,leafMesh);
}
function lamps(x,z,right,roadXs=roadsX,roadZs=roadsZ,xRoadWidth=14.8,zRoadWidth=13.2){
  if(roadXs.some(line=>Math.abs(x-line)<xRoadWidth*.5)||
     roadZs.some(line=>Math.abs(z-line)<zRoadWidth*.5)||
     roadXs.some(line=>Math.abs(x-line)<xRoadWidth*.5+2.5)&&
       roadZs.some(line=>Math.abs(z-line)<zRoadWidth*.5+2.5))return;
  const d=right?-1:1;
  box(x,2.85,z,.16,5.7,.16,'#596878',metalMaterial);
  box(x+d*.58,5.62,z,1.28,.13,.16,'#596878',metalMaterial);
  box(x+d*1.17,5.56,z,.64,.16,.3,'#626979',metalMaterial);
  box(x+d*1.17,5.464,z,.53,.025,.23,'#ffe4a5',emissive);
}
function building(x,z,w,d,h,c,style,lite=false,owner=null){
  const previousOwner=activeOwner;activeOwner=owner;
  const deco=style===1;
  box(x,h/2,z,w,h,d,c,deco?masonryMaterial:facadeMaterial);box(x,h+.12,z,w+.4,.25,d+.4,deco?'#f3cbb8':'#a8b8bf');
  if(deco){
    box(x,h+.8,z,w*.73,1.45,d*.9,c);box(x,h+1.54,z,w*.75,.18,d*.93,'#ecc3ad');
    for(const off of [-.32,0,.32]) box(x+w*off,h*.51,z+d*.5+.09,.34,h*.96,.24,'#e8c6b1');
  }else{
    box(x+.3,h+1.05,z-.2,w*.62,2,d*.53,'#758996');
    if(h>24) box(x,h+3.2,z,.11,4,.11,'#5b5d6a');
    for(const side of [-1,1]){
      box(x+side*w*.29,h+.43,z,.92,.62,1.12,'#69757a',metalMaterial);
      box(x+side*w*.29,h+.78,z,.72,.10,.9,'#929b99',metalMaterial);
    }
  }
  const rowgap=deco?2.05:2.75;
  for(let y=2.05;y<h-.35;y+=rowgap){
    if(!deco) {
      box(x,y,z,w+.08,rowgap*.48,d+.08,pick(['#486873','#587685','#638592']),facadeMaterial);
      if(!lite)for(let xx=-w*.43;xx<w*.46;xx+=2.2) if(rand()<.24) for(const side of [-1,1]) box(x+xx,y,z+side*(d/2+.052),1.03,rowgap*.32,.04,pick(['#e5c89f','#8fbcc0','#ffe3b3']),emissive);
    } else {
      for(let xx=-w*.4;xx<w*.43;xx+=2.2) for(const side of [-1,1]) box(x+xx,y,z+side*(d/2+.032),1.22,1.23,.07,pick(['#5b7881','#70939a','#c5a681','#658890']),buildingGlass);
      for(let zz=-d*.4;zz<d*.43;zz+=2.25) for(const side of [-1,1]) box(x+side*(w/2+.032),y,z+zz,.07,1.23,1.23,pick(['#5b7881','#70939a','#c5a681']),buildingGlass);
    }
  }
  for(const side of [-1,1]){
    box(x,h*.5,z+side*(d*.5+.09),w+.55,.11,.18,deco?'#fff0c9':'#8ca0af');
    if(deco) box(x+side*(w*.5+.08),1.57,z,.17,.21,d+.2,'#ff937e',emissive);
  }
  const variant=Math.abs(Math.round(x*13+z*17+w*41+d*59+h*23))%12;
  const doorX=x+(variant%3-1)*Math.min(2,w*.19),doorZ=z+d/2+.14;
  box(doorX,1.26,doorZ,1.89,2.54,.24,'#d3b99d');
  box(doorX,1.17,doorZ+.139,1.48,2.24,.081,['#3b5e63','#765b55','#557b68','#8f6050'][variant%4]);
  box(doorX+.48,1.02,doorZ+.196,.103,.1,.035,'#f3c78c',emissive);
  box(doorX,.06,doorZ+.22,2.08,.13,.66,'#a8a79d');
  if(variant%4===1)box(doorX,2.64,doorZ+.46,3.3,.25,1.13,'#c87e6a');
  if(variant%4===2){
    for(const s of [-1,1]){box(doorX+s*1.27,.22,doorZ+.33,.49,.45,.5,'#977969');add(sphere,regular,doorX+s*1.27,.66,doorZ+.33,.32,.39,.34,'#688574')}
  }
  if(variant%4===3)box(doorX,2.75,doorZ+.22,1.48,.15,.29,'#f5d593',emissive);
  activeOwner=previousOwner;
  return {doorX,doorZ:doorZ+.74,variant};
}
function property(x,z,w,d,h,door,kind,special=null,destructible=false){
  const name=special||(kind==='shop'?['Corner Market','Cypress Pantry','Bay Goods'][door.variant%3]:kind==='business'?['Coastline Offices','Pacifica Works','Seabreeze Studio'][door.variant%3]:['Courtyard Home','Bay Residence','Juniper Apartment'][door.variant%3]);
  return {x,z,w:w/2+.2,d:d/2+.2,h,...door,kind,name,id:buildingId(x,z),special:!!special,destructible};
}
function sign(scene,text,x,y,z){
  const cvs=document.createElement('canvas');cvs.width=512;cvs.height=112;const g=cvs.getContext('2d');
  g.fillStyle='#18363e';g.fillRect(0,0,512,112);g.strokeStyle='#e0a87b';g.lineWidth=7;g.strokeRect(5,5,502,102);
  g.textAlign='center';g.textBaseline='middle';g.font='bold 48px monospace';g.fillStyle='#ffdabb';g.fillText(text,256,55);
  const map=new T.CanvasTexture(cvs);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const s=new T.Mesh(new T.PlaneGeometry(8.3,1.8),raw('#ffffff',{map}));s.position.set(x,y,z);s.rotation.y=Math.PI/2;scene.add(s);
}
function waveNormalTexture(){
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
    const dx=Math.cos(u)*.34+Math.cos(u*2-v)*.15;
    const dy=Math.cos(v)*.28-Math.cos(u*2-v)*.30;
    const inv=1/Math.hypot(dx,dy,1),i=(y*size+x)*4;
    data[i]=Math.round((-.9*dx*inv*.5+.5)*255);
    data[i+1]=Math.round((-.9*dy*inv*.5+.5)*255);
    data[i+2]=Math.round((inv*.5+.5)*255);data[i+3]=255;
  }
  const texture=new T.DataTexture(data,size,size,T.RGBAFormat);
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.minFilter=T.LinearMipmapLinearFilter;
  texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}
function atmosphere(scene,lowSpec=false){
  const sky=new T.Mesh(new T.SphereGeometry(580,32,18),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,
    vertexShader:`varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 v;
    float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y);}
    void main(){vec3 d=normalize(v); float y=max(d.y,0.); float az=atan(d.x,-d.z);
      vec3 c=mix(vec3(.98,.57,.43),vec3(.28,.32,.50),smoothstep(0.,.59,pow(y,.75)));
      c=mix(c,vec3(.11,.20,.34),smoothstep(.25,.91,y));
      vec3 sun=normalize(vec3(.38,.13,-1.));float s=max(dot(d,sun),0.);
      c+=vec3(.39,.21,.09)*pow(s,53.)+vec3(.23,.09,.029)*pow(s,12.);
      float wisps=smoothstep(.54,.78,noise(vec2(az*9., y*41.))+noise(vec2(az*19.-7.,y*98.))*.24);
      c=mix(c,vec3(.66,.37,.44),wisps*smoothstep(.018,.08,y)*(1.-smoothstep(.12,.35,y))*.54);
      c=mix(c,vec3(1.,.86,.58),smoothstep(.99845,.99872,s));
      gl_FragColor=vec4(c,1.);
    }`
  }));sky.renderOrder=-100;scene.add(sky);
  const oceanSegments=lowSpec?64:128;
  const ocean=new T.Mesh(new T.PlaneGeometry(1800,1800,oceanSegments,oceanSegments),new T.ShaderMaterial({
    uniforms:{clock:{value:0},normalMap:{value:waveNormalTexture()},islandCenters:{value:[
      new T.Vector3(313,-120,0),new T.Vector3(313,96,0),new T.Vector3(313,312,0),new T.Vector3(313,528,0),
      new T.Vector3(560,-120,0),new T.Vector3(560,96,0),new T.Vector3(560,312,0)
    ]}},
    vertexShader:`uniform float clock;varying vec3 v;
    float waveAt(vec2 p,float t){
      float wave=-.13+sin(p.y*.34+t*1.1)*.18+sin(p.x*.2+p.y*.13-t*.82)*.12+sin(p.x*.63-p.y*.46+t*1.7)*.035;
      float channel=smoothstep(25.,30.,p.x)*(1.-smoothstep(213.,218.,p.x))*
        (1.-smoothstep(8.,11.,abs(p.y-96.)));
      return mix(wave,min(wave,-1.65),channel);
    }
    void main(){
      vec4 w=modelMatrix*vec4(position,1.);
      w.y=waveAt(w.xz,clock);
      v=w.xyz;
      gl_Position=projectionMatrix*viewMatrix*w;
    }`,
    fragmentShader:`uniform float clock;uniform sampler2D normalMap;uniform vec3 islandCenters[7];varying vec3 v;
    void main(){
      float x=max(0.,v.x-28.);
      float a=sin(v.z*.34+clock*1.1), b=sin(v.x*.2+v.z*.13-clock*.82);
      float r=sin(v.x*.63-v.z*.46+clock*1.7);
      vec3 n1=texture2D(normalMap,v.xz*.041+vec2(clock*.013,-clock*.009)).xyz*2.-1.;
      vec3 n2=texture2D(normalMap,v.xz*.093+vec2(-clock*.019,clock*.015)).xyz*2.-1.;
      vec3 normal=normalize(vec3((n1.x+n2.x*.48)*.74+cos(v.z*.34+clock*1.1)*.061+
        cos(v.x*.2+v.z*.13-clock*.82)*.026,1.,
        (n1.y+n2.y*.48)*.74+cos(v.x*.2+v.z*.13-clock*.82)*.016-
        cos(v.x*.63-v.z*.46+clock*1.7)*.016));
      vec3 c=mix(vec3(.035,.22,.25),vec3(.018,.075,.17),smoothstep(18.,205.,x));
      c=mix(vec3(.025,.12,.15),c,smoothstep(0.,25.,x));
      c=mix(c,vec3(.58,.49,.56),smoothstep(60.,300.,length(v.xz-cameraPosition.xz)));
      float crests=smoothstep(.22,.31,a*.49+b*.37+r*.14);
      float shore=smoothstep(0.,2.8,v.x-30.5)*(1.-smoothstep(6.,12.,v.x-30.5));
      for(int i=0;i<7;i++){
        vec2 d=abs(v.xz-islandCenters[i].xy)-vec2(99.,91.);
        float edge=max(d.x,d.y);
        shore=max(shore,(1.-smoothstep(0.,4.,abs(edge)))*smoothstep(-.8,1.2,edge));
      }
      c+=vec3(.12,.15,.14)*pow(max(0.,a*.54+b*.46),5.);
      c=mix(c,vec3(.88,.94,.87),crests*shore*.62);
      c=mix(c,vec3(.78,.85,.74),pow(max(0.,r),12.)*(1.-smoothstep(1.,8.,x))*.46);
      vec3 viewDir=normalize(v-cameraPosition);
      vec3 sunDir=normalize(vec3(.38,.13,-1.));
      float sun=max(dot(reflect(-sunDir,normal),viewDir),0.);
      c+=vec3(1.,.79,.52)*pow(sun,96.)*.95;
      c+=vec3(.20,.29,.32)*pow(max(dot(normal,normalize(sunDir+viewDir)),0.),12.)*.12;
      vec3 haze=vec3(.98,.57,.43)+vec3(.39,.21,.09)*pow(sun,53.)+vec3(.23,.09,.029)*pow(sun,12.);
      c=mix(c,haze,smoothstep(240.,535.,distance(v,cameraPosition)));
      gl_FragColor=vec4(c,1.);
    }`
  }));ocean.rotation.x=-Math.PI/2;ocean.position.set(930,0,-24);scene.add(ocean);
  return {sky,ocean};
}
function makeCar(paint, hero=false){
  const car=new T.Group(),dark=mat('#1c2531'), side=mat('#203047',{metalness:.18,roughness:.25}), body=mat(paint,{roughness:.34,metalness:.22}), trim=mat('#b8cacb',{roughness:.33,metalness:.25});
  function block(w,h,d,x,y,z,m=body){const o=new T.Mesh(baseGeo,m);o.scale.set(w,h,d);o.position.set(x,y,z);car.add(o);return o}
  function loft(sections,m){
    const p=[],idx=[];
    for(const [z,w,base,top] of sections) p.push(-w,base,z,w,base,z,w*.94,top,z,-w*.94,top,z);
    for(let i=0;i<sections.length-1;i++) for(let k=0;k<4;k++){const a=i*4+k,b=i*4+(k+1)%4;idx.push(a,b,b+4,a,b+4,a+4)}
    const j=(sections.length-1)*4;idx.push(0,3,2,0,2,1,j,j+1,j+2,j,j+2,j+3);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new T.Mesh(g,m);mesh.material.side=T.DoubleSide;car.add(mesh);
  }
  loft([[-2.22,.83,.39,.73],[-1.55,1.02,.39,.99],[.92,1.04,.41,1.01],[1.88,1.01,.39,.88],[2.14,.96,.39,.76]],body);
  loft([[-.99,.82,.94,1.03],[-.36,.73,.96,1.56],[.49,.71,.96,1.55],[1.15,.83,.96,1.02]],side);
  block(1.42,.072,.88,0,1.55,.06);
  for(const x of [-.74,.74]){
    block(.052,.52,.08,x,1.24,.40,dark);
    block(.16,.09,.24,x*1.3,1.1,-.54,body);
    block(.65,.16,.045,x*.8,.714,2.148,raw(hero?'#ff594f':'#db484c'));
    block(.6,.12,.045,x*.82,.674,-2.225,raw('#fff0bf'));
    if(hero) block(.74,.072,.08,x*.86,.862,2.07,body);
  }
  block(1.85,.14,.19,0,.435,2.15,dark);
  block(1.85,.09,.12,0,.38,-2.17,dark);block(.73,.17,.021,0,.61,2.154,dark);
  block(.4,.115,.024,0,.568,2.199,raw('#ded6a5'));block(.23,.024,.025,0,.576,2.217,raw('#414a58'));
  if(hero){block(1.89,.065,.27,0,1.00,1.81,body);for(const x of [-.63,.63]) block(.11,.12,.12,x,.94,1.81,dark)}
  const wheels=[], tire=new T.CylinderGeometry(.37,.37,.27,16), rim=new T.CylinderGeometry(.215,.215,.277,10);
  for(const x of [-.94,.94]) for(const z of [-1.38,1.31]){
    const mount=new T.Group();mount.position.set(x,.375,z);mount.userData.suspensionWheel={left:x<0,front:z<0,baseY:.375};car.add(mount);wheels.push({mount,front:z<0});
    const t=new T.Mesh(tire,dark);t.rotation.z=Math.PI/2;mount.add(t);
    if(hero){const r=new T.Mesh(rim,trim);r.rotation.z=Math.PI/2;mount.add(r);for(let i=0;i<5;i++){const bolt=new T.Mesh(baseGeo,dark);bolt.scale.set(.03,.055,.17);bolt.position.x=Math.sign(x)*.143;bolt.rotation.x=i*Math.PI/2.5;mount.add(bolt)}}
  }
  return {car,wheels};
}
function trainer(){
  const plane=new T.Group(), white=mat('#e3dfcc',{roughness:.32,metalness:.12}), navy=mat('#203747',{roughness:.36}), coral=mat('#e27055',{roughness:.43});
  const glass=mat('#354d65',{roughness:.17,metalness:.3}), rubber=mat('#222b35'), steel=mat('#bac5c6',{metalness:.5,roughness:.32});
  function block(x,y,z,w,h,l,m,rz=0){const o=new T.Mesh(baseGeo,m);o.position.set(x,y,z);o.scale.set(w,h,l);o.rotation.z=rz;plane.add(o);return o}
  const fuselage=new T.Mesh(new T.SphereGeometry(1,18,12),white);fuselage.scale.set(.78,.66,3.11);fuselage.position.set(0,1.15,-.37);plane.add(fuselage);
  const cabin=new T.Mesh(new T.SphereGeometry(1,12,8),glass);cabin.scale.set(.66,.43,1.18);cabin.position.set(0,1.58,-.42);plane.add(cabin);
  block(0,1.91,-.37,1.34,.106,1.45,white);
  const wingShape=new T.Shape();
  wingShape.moveTo(-4.95,.2);wingShape.lineTo(0,.84);wingShape.lineTo(4.95,.2);
  wingShape.lineTo(4.95,-.63);wingShape.lineTo(0,-.84);wingShape.lineTo(-4.95,-.63);wingShape.closePath();
  const wingGeometry=new T.ExtrudeGeometry(wingShape,{depth:.14,steps:1,bevelEnabled:true,bevelSegments:2,bevelThickness:.035,bevelSize:.04});
  wingGeometry.translate(0,0,-.07);wingGeometry.rotateX(-Math.PI/2);
  const mainWing=new T.Mesh(wingGeometry,white);mainWing.position.set(0,1.88,-.37);plane.add(mainWing);
  for(const dir of [-1,1]){
    block(dir*.709,1.19,-.4,.045,.185,2.25,coral);
    block(dir*.58,1.64,-.12,.07,.53,.08,white);
    block(dir*4.72,1.96,-.37,.52,.155,1.61,coral);
    block(dir*1.12,1.75,-.36,3.05,.115,.15,steel,dir*.18);
    block(dir*.91,1.33,2.28,1.89,.11,.87,white);
    block(dir*4.83,1.97,-.59,.18,.11,.30,raw(dir<0?'#ff735f':'#7af3a1'));
  }
  block(0,1.81,2.38,.17,1.16,.93,white);
  block(0,2.29,2.54,.18,.27,.61,coral);
  const front=new T.Mesh(new T.SphereGeometry(1,12,8),navy);front.scale.set(.39,.30,.44);front.position.set(0,1.2,-3.29);plane.add(front);
  const prop=new T.Group();prop.position.set(0,1.21,-3.62);plane.add(prop);
  const blade=new T.Mesh(baseGeo,navy);blade.scale.set(2.08,.12,.05);prop.add(blade);
  for(const [x,z,r] of [[-1,.35,.33],[1,.35,.33],[0,-2.16,.24]]){
    block(x,.57,z,.08,.67,.10,steel);const wheel=new T.Mesh(new T.CylinderGeometry(r,r,.20,11),rubber);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,r,z);plane.add(wheel);
  }
  plane.visible=false;return {mesh:plane,prop};
}
function addAirport(scene,solids,paving){
  const {x,north,south,width}=runway;
  plane(x,.007,(north+south)/2,45,south-north+8,'#778a7c');
  plane(x,.022,(north+south)/2,width,south-north,'#464e5d',paving);
  plane(-204,.023,96,70,9.5,'#444e5b',paving);
  plane(-214,.021,74,13,47,'#565a65');
  {
    const {x,north,south,width}=runwayWest,mid=(north+south)/2;
    plane(x,.022,mid,width,south-north,'#505966',paving);
    for(const a of [-1,1]){
      plane(x+a*(width*.46),.034,mid,.19,south-north-5,'#d4d5cb');
      for(let z=north+3;z<south-2;z+=8.5)box(x+a*(width*.54),.11,z,.25,.17,.26,'#a3e0d7',emissive);
    }
    for(let z=north+12;z<south-8;z+=9)plane(x,.039,z,.28,3.8,'#e3ddc8');
    for(const z of [north+8,south-8])for(let i=-3;i<=3;i++)plane(x+i*1.62,.04,z,.65,4.4,'#eee7d4');
    sign(scene,'RUNWAY 36 WEST',-223.5,2.9,99);
  }
  for(const a of [-1,1]){
    plane(x+a*10.3,.034,(north+south)/2,.19,south-north-2,'#d4d5cb');
    for(let z=north+3;z<south-2;z+=7.5)box(x+a*11.34,.11,z,.32,.19,.32,'#deebc0',emissive);
  }
  for(let z=north+12;z<south-8;z+=9)plane(x,.039,z,.29,4.6,'#e3ddc8');
  for(const z of [north+8,south-8]){
    for(let i=-4;i<=4;i++)plane(x+i*1.65,.04,z,.68,4.6,'#eee7d4');
    plane(x,.042,z+1,20,.2,'#eee7d4');
  }
  for(const [xx,zz,h] of [[-216,54,5],[-215,69,5],[-215,-122,8]]){
    const door=building(xx,zz,8,11,h,'#a6adaa',1,true);
    solids.push(property(xx,zz,8,11,h+1.7,door,'business','Airfield Hangar'));
  }
  sign(scene,'PACIFICA AIRFIELD',-210.8,4.1,69);
}
function makeTile(i,j,paving){
  const ox=edge+i*tileSize,oz=edge+j*tileSize,coast=i===1;
  const group=new T.Group(),colliders=[],people=[],variant=((i*11+j*7)%6+6)%6;
  group.position.set(ox,0,oz);seed=(Math.imul(i,0x9e3779b1)^Math.imul(j,0x85ebca6b)^0x32c6e15d)>>>0;
  const land=coast?54.5:144;
  const airport=i===-1&&(j===0||j===1);
  terrainGrid(group,land/2,72,land,144,20,36,coast?'shore':'wild',-.052,ox+land/2,oz+72,airport);
  if(coast){
    plane(44,-.038,72,21,144,'#c9ad84');plane(37,.062,72,5.4,144,'#a3a49b');
    box(40.35,.34,72,.50,.55,144,'#aca395');
    for(let z=4;z<143;z+=8.6)if(![24,72,120].some(p=>Math.abs(p-z)<8)){
      palm(34.5,z,.78+rand()*.34,ox,oz);
      if(rand()>.34)lamps(33.65,z,true,[24],[24,72,120]);
    }
  }
  const end=coast?36.5:airport?99:144;
  const vertical=coast?[24]:airport?[24,72]:[24,72,120],
    cutouts=airport?[runway,runwayWest].map(r=>({
      minX:r.x-r.width*.5-ox,maxX:r.x+r.width*.5-ox,
      minZ:r.north-oz,maxZ:r.south-oz
    })):[];
  addOrthogonalRoadGrid(group,{xLines:vertical,zLines:[24,72,120],minX:0,maxX:end,minZ:0,maxZ:144,
    roadMaterial:paving,roadY:.01,xRoadWidth:14.8,zRoadWidth:13.2,exclusions:cutouts});
  const lots=coast?[9]:[6,39,57,87,104,137];
  for(const x of lots)for(const z of [7,40,57,87,103,136]){
    if(airport&&x>66)continue;
    if(airport&&inAirport(ox+x,oz+z))continue;
    const open=rand()<.23;
    const t=coast?0:rand(), modern=(variant===0||variant===4)&&t>.45;
    if(open){
      tree(x,z,.83+rand()*.34,ox,oz);
      continue;
    }
    const w=x<10||x>130?7+rand()*4:10+rand()*6, d=z<10||z>130?8+rand()*3:10+rand()*6;
    const h=modern?14+rand()*35:4.2+rand()*(variant===3?10:5.5);
    const owner=buildingId(ox+x,oz+z),door=building(x,z,w,d,h,pick(modern?['#879aa8','#96aeb4','#aeb4bd','#8397a5']:['#d8b29e','#d8c6af','#aac7c3','#bea7b9','#adc4af']),modern?0:1,true,owner);
    const collider=property(ox+x,oz+z,w,d,h+(modern?3.4:1.7),{...door,doorX:ox+door.doorX,doorZ:oz+door.doorZ},modern?'business':door.variant%5===1?'shop':'home',null,true);
    if(!destroyedBuildings.has(owner))colliders.push(collider);
  }
  if(!airport){
    const streetX=coast?33.2:32.7,streetZ=35+(j%3)*1.4,p=person(pick(['#c88669','#658a99','#8d76a7']),pick(['#a96d56','#c59867','#936045']));
    p.model.position.set(streetX,.045,streetZ);p.model.rotation.y=.4+(i-j)*.67;group.add(p.model);
    people.push({...p,x:ox+streetX,z:oz+streetZ,id:`person/${i}/${j}`,name:['Avery','Remy','Maya','Kai','Sam','Luz'][variant],role:'Local resident'});
  }
  bake(group);
  return {group,colliders,people};
}
function createStream(scene,paving,baseSolids,ocean){
  const tiles=new Map();
  const key=(i,j)=>`${i}/${j}`;
  const core=(i,j)=>i>=0&&i<=1&&j>=0&&j<=1;
  const debrisMaterial=[mat('#6a665f'),mat('#8b8274'),mat('#555b5a')];
  let index='',queue=[];
  const addTile=(i,j)=>{
    const id=key(i,j);
    if(core(i,j)||tiles.has(id))return;
    const t=makeTile(i,j,paving);tiles.set(id,t);scene.add(t.group);
  };
  function sync(x,z,flying,boot=false){
    const ix=Math.min(1,gridCell(x)),iz=gridCell(z),range=flying?3:2;
    const next=`${ix}/${iz}/${range}`;
    ocean.position.x=Math.max(930,x);ocean.position.z=z;
    if(next!==index){
      index=next;queue=[];
      const desired=new Set();
      for(let i=ix-range;i<=Math.min(1,ix+range);i++)for(let j=iz-range;j<=iz+range;j++){
        if(core(i,j))continue;
        const id=key(i,j);desired.add(id);
        if(!tiles.has(id))queue.push([i,j,Math.max(Math.abs(i-ix),Math.abs(j-iz))]);
      }
      queue.sort((a,b)=>a[2]-b[2]);
      for(const [id,t] of tiles)if(!desired.has(id)){
        unregisterInstances(t.group);scene.remove(t.group);t.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();else if(o.userData.terrain)o.geometry.dispose()});tiles.delete(id);
      }
    }
    let made=0;
    while(queue.length&&(made<(boot?7:1)||queue[0][2]===0)){
      const [i,j]=queue.shift();addTile(i,j);made++;
    }
  }
  function hit(x,z,y,r){
    const tests=[baseSolids];
    const ix=gridCell(x),iz=gridCell(z);
    for(let i=ix-1;i<=ix+1;i++)for(let j=iz-1;j<=iz+1;j++){
      const candidate=tiles.get(key(i,j));if(candidate)tests.push(candidate.colliders);
    }
    return tests.some(list=>list.some(b=>y<b.h&&Math.abs(x-b.x)<b.w+r&&Math.abs(z-b.z)<b.d+r));
  }
  function nearby(x,z){
    const properties=baseSolids.filter(p=>p.kind),people=[];
    const ix=gridCell(x),iz=gridCell(z);
    for(let i=ix-1;i<=ix+1;i++)for(let j=iz-1;j<=iz+1;j++){
      const t=tiles.get(key(i,j));if(t){properties.push(...t.colliders);people.push(...t.people)}
    }
    return {properties,people};
  }
  function candidates(x,z){
    const ix=gridCell(x),iz=gridCell(z),result=baseSolids.filter(p=>p.destructible);
    for(let i=ix-1;i<=ix+1;i++)for(let j=iz-1;j<=iz+1;j++){
      const tile=tiles.get(key(i,j));if(tile)result.push(...tile.colliders.filter(p=>p.destructible));
    }
    return result;
  }
  function makeRubble(p){
    if(rubbleById.has(p.id))return;
    rubbleById.add(p.id);
    const group=new T.Group();
    const count=5+Math.floor(rand()*4);
    for(let i=0;i<count;i++){
      const width=.65+rand()*1.7,height=.32+rand()*1.25,depth=.6+rand()*1.5;
      const piece=new T.Mesh(baseGeo,debrisMaterial[i%debrisMaterial.length]);
      piece.position.set(p.x+(rand()-.5)*p.w*1.35,height/2,p.z+(rand()-.5)*p.d*1.35);
      piece.scale.set(width,height,depth);piece.rotation.set((rand()-.5)*.4,rand()*Math.PI,(rand()-.5)*.35);
      group.add(piece);
    }
    scene.add(group);
  }
  function destroy(p){
    destroyedBuildings.add(p.id);hideBuilding(p.id);
    const baseIndex=baseSolids.indexOf(p);if(baseIndex>=0)baseSolids.splice(baseIndex,1);
    for(const tile of tiles.values()){
      const index=tile.colliders.indexOf(p);if(index>=0)tile.colliders.splice(index,1);
    }
    makeRubble(p);buildingDamage.delete(p.id);
  }
  function damageAt(x,z,amount,radius=0){
    let damaged=0,destroyed=0;
    for(const p of candidates(x,z)){
      const dx=Math.max(0,Math.abs(x-p.x)-p.w),dz=Math.max(0,Math.abs(z-p.z)-p.d);
      const distance=Math.hypot(dx,dz);
      if(distance>radius)continue;
      const force=amount*(radius?Math.max(.35,1-distance/(radius+1e-6)):1);
      const value=(buildingDamage.get(p.id)??0)+force;
      const limit=125+Math.min(190,p.h*3.2);
      damaged++;
      if(value>=limit){destroyed++;destroy(p)}else buildingDamage.set(p.id,value);
    }
    return {damaged,destroyed};
  }
  function strike(from,to,amount,radius=0){
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(length/.45));
    for(let i=1;i<=steps;i++){
      const t=i/steps,x=from.x+dx*t,z=from.z+dz*t,y=(from.y??1)+( (to.y??from.y??1)-(from.y??1))*t;
      const p=candidates(x,z).find(b=>y<b.h&&Math.abs(x-b.x)<b.w&&Math.abs(z-b.z)<b.d);
      if(p){
        const hit={x,z,y};damageAt(x,z,amount,radius);return hit;
      }
    }
    if(radius)damageAt(to.x,to.z,amount,radius);
    return null;
  }
  return {sync,hit,nearby,strike,damageAt,count:()=>tiles.size,destroyed:()=>destroyedBuildings.size};
}
export function createWorld({lowSpec=false}={}){
  seed=10;
  initSurfaceMaterials();
  const scene=new T.Scene();scene.fog=new T.FogExp2('#ae8991',.0031);
  const sky=atmosphere(scene,lowSpec), solids=[];
  const hemi=new T.HemisphereLight('#d4e3ff','#967568',2.14);scene.add(hemi);
  const sun=new T.DirectionalLight('#ffd3a2',2.1);
  sun.position.set(65,37,-75);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-58,right:58,top:58,bottom:-58,near:.1,far:190});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=2;scene.add(sun);
  const bounce=new T.DirectionalLight('#a6cfe6',.35);bounce.position.set(-25,13,57);scene.add(bounce);
  terrainGrid(scene,-68.75,-24,198.5,288,40,58,'city',-.052);
  plane(20,-.036,-24,21,288,'#c9ad84');
  plane(13,.075,-24,5.4,288,'#a3a49b');
  const paving=roadMaterial();
  addOrthogonalRoadGrid(scene,{xLines:roadsX,zLines:roadsZ,minX:-168,maxX:12,minZ:-168,maxZ:120,
    roadMaterial:paving,roadY:.01,xRoadWidth:14.8,zRoadWidth:13.2});
  const boardwalkBuildings=[[-15,69,7.6,'#83bfb9'],[-16,32,9.1,'#e3b19b'],[-16,-16,10.3,'#b3b0be'],[-17,-64,11.4,'#d8bcaa'],[-17,-111,9.5,'#9bbdbb']];
  for(let i=0;i<roadsX.length-1;i++) for(let j=0;j<roadsZ.length-1;j++){
    const x=roadsX[i]+24,z=roadsZ[j]+24;
    terrainGrid(scene,x,z,33,33,10,10,'city',.025);
    for(const [dx,dz] of [[-8,-8],[8,8]]){
      const deco=i===2||rand()<.3,w=10+rand()*4,d=10+rand()*5;
      const h=deco?4.8+rand()*7:14+rand()*27;
      const tint=pick(deco?['#dfad9c','#d9c5ae','#acc9c6','#c2a7b6','#afd0ca']:['#8597a2','#adb8be','#93a1af','#b6b2b1']);
      // Reserve the named storefronts and the sidewalk in front of their doors.
      if(boardwalkBuildings.some(([bx,bz])=>Math.abs(x+dx-bx)<w/2+6.8&&
        z+dz+d/2>bz-7.25&&z+dz-d/2<bz+11.2))continue;
      const owner=buildingId(x+dx,z+dz),door=building(x+dx,z+dz,w,d,h,tint,deco?1:0,false,owner);
      solids.push(property(x+dx,z+dz,w,d,h+(deco?1.7:3.4),door,deco?(door.variant%4===1?'shop':'home'):'business',null,true));
    }
    tree(x+13,z-12,.69);tree(x-13,z+12,.76);
  }
  for(const [x,z,h,c] of boardwalkBuildings){
    const owner=buildingId(x,z),door=building(x,z,12,13,h,c,1,false,owner);
    const name=z===69?'Your Home':z===32?'Miramar Market':z===-16?'Sunset Works':null;
    solids.push(property(x,z,12,13,h+1.7,door,z===32?'shop':z===-16?'business':'home',name,true));
    const pathLength=9.4+door.doorX;
    plane((door.doorX-9.4)/2,.037,door.doorZ+1.32,Math.abs(pathLength),2.5,'#aeaca0');
  }
  for(const [text,y,z] of [['PACIFICA',4.9,69],['MIRAMAR',4.8,32],['SUNSET',5.3,-16]]) sign(scene,text,-8.91,y,z);
  for(let z=-157;z<=121;z+=9) {
    if(!roadsZ.some(zz=>Math.abs(z-zz)<7)) palm(10.1+rand()*1.75,z,.88+rand()*.25);
    if(!roadsZ.some(zz=>Math.abs(z-zz)<8)&&Math.round(z/9)%2===0) palm(-9.1-rand(),z+.9,.79+rand()*.19);
  }
  for(let z=-157;z<120;z+=17){lamps(8.05,z,true);lamps(-8.05,z+6,false)}
  for(let z=-165;z<120;z+=1.72){
    if(beachAccess(z)||Math.abs(z-69)<2.3||Math.abs(z-96)<8.9)continue;
    box(16.32,.13,z,.7,.23,1.68,'#b5afa2');
    if(Math.floor((z+165)/1.72)%3===0) box(16.35,.58,z,.13,.99,.13,'#8f9697');
  }
  box(16.35,1.06,-49.4,.15,.15,230.8,'#a9a099');
  box(16.35,1.06,82.9,.15,.15,10.3,'#a9a099');
  box(16.35,1.06,112.1,.15,.15,15.0,'#a9a099');
  for(let i=0;i<19;i++){const z=-157+i*14.75;const x=20.3+rand()*5;
    add(cylinder,regular,x,.46,z,.036,.95,.036,'#d6c0a7');
    add(cylinder,regular,x,.96,z,.92,.23,.92,pick(['#f68478','#f4d577','#75adad']));
  }
  for(let z=-151;z<115;z+=12) if(!roadsZ.some(k=>Math.abs(k-z)<12)){
    box(13,.36,z,1.04,.11,2.06,'#826b65');
    for(const a of [-.7,.7])box(13,.2,z+a,.12,.41,.11,'#596573');
  }
  addAirport(scene,solids,paving);
  bake(scene);
  const stream=createStream(scene,paving,solids,sky.ocean);
  const playerShadow=shadow(scene);
  const player=makeCar('#57c6b4',true);scene.add(player.car);
  const sport=makeCar('#e67d62',true);sport.car.scale.set(1.07,.82,1.10);scene.add(sport.car);
  const van=makeCar('#ddbe85',true);van.car.scale.set(1.12,1.24,1.22);
  const cargo=new T.Mesh(baseGeo,mat('#c9ad88'));cargo.position.set(0,1.48,.74);cargo.scale.set(1.74,1.19,2.30);van.car.add(cargo);scene.add(van.car);
  const jet=makeCar('#b684d2',true),gravity=makeCar('#88c3df',true);
  for(const s of [-1,1]){
    const booster=new T.Mesh(baseGeo,mat('#74568e'));booster.scale.set(.39,.54,1.52);booster.position.set(s*1.08,.69,1.21);jet.car.add(booster);
    const pod=new T.Mesh(baseGeo,mat('#427290'));pod.scale.set(.47,.43,2.1);pod.position.set(s*1.12,.44,.30);gravity.car.add(pod);
  }
  scene.add(jet.car,gravity.car);
  const aircraft=trainer();scene.add(aircraft.mesh);
  const life=addLifeWorld(scene),wreck=makeWreck(scene);
  const traffic=[];
  const palette=['#e17e76','#e0b272','#72a7cb','#c1ced2','#8e86a6','#e4b996'];
  for(let i=0;i<7;i++){
    const a=makeCar(palette[i%palette.length]);a.car.scale.setScalar(.88); scene.add(a.car);
    traffic.push({mesh:a.car,axis:i%3===0?'x':'z',lane:i%3===0?roadsZ[Math.floor(i/3)+1]:roadsX[i%4],coord:i===0?-117:i===4?12:-155+(i*53)%228,dir:i===4?1:i%2?1:-1,v:6+i*.43});
  }
  const gate=new T.Group(), ring=new T.Mesh(new T.TorusGeometry(3.3,.14,8,44),raw('#85f8d3',{transparent:true,opacity:.88}));
  ring.position.y=3.3;gate.add(ring);
  const circle=new T.Mesh(new T.RingGeometry(4.4,4.63,48),raw('#87f8d3',{side:T.DoubleSide,transparent:true,opacity:.55}));
  circle.rotation.x=-Math.PI/2;circle.position.y=.1;gate.add(circle);
  const beacon=new T.Mesh(new T.OctahedronGeometry(.48),raw('#e9ffe8'));beacon.position.y=7.5;gate.add(beacon);scene.add(gate);gate.visible=false;
  return {scene,...sky,stream,solids,roadSurfaceMaterial:paving,player,cars:{car:player,sport,van,jet,gravity},aircraft,life,wreck,playerShadow,traffic,gate,ring,circle,beacon};
}
