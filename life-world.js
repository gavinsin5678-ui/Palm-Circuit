import * as T from './vendor/three.module.min.js';

const geom=new T.BoxGeometry(), ball=new T.IcosahedronGeometry(1,1);
const cache=new Map();
const material=(color,glow=false)=>{
  const key=color+glow;if(!cache.has(key))cache.set(key,glow?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,roughness:.74}));
  return cache.get(key);
};
function block(parent,x,y,z,w,h,d,c,glow=false){
  const o=new T.Mesh(geom,material(c,glow));o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;
}
function round(parent,x,y,z,w,h,d,c){
  const o=new T.Mesh(ball,material(c));o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;
}
export const parking={
  car:[3.5,75,0],sport:[3.5,75,0],van:[3.5,75,0],walk:[13.25,75,0],
  boat:[42,63,0],yacht:[54,84,0]
};
export const locals=[
  {id:'imani',name:'Imani',role:'Marina volunteer',x:12.1,z:71.7,shirt:'#d78859',skin:'#995f48'},
  {id:'nico',name:'Nico',role:'Boardwalk regular',x:10.8,z:81,shirt:'#7899c7',skin:'#c28d68'},
  {id:'sofia',name:'Sofia',role:'Local resident',x:-8.1,z:73,shirt:'#b8799b',skin:'#c68660'},
  {id:'leo',name:'Leo',role:'Shopkeeper',x:-8.5,z:34,shirt:'#648b83',skin:'#a4694e'},
  {id:'jules',name:'Jules',role:'Boardwalk pedestrian',x:13.25,z:87.2,shirt:'#dbab7d',skin:'#af6f50'},
  {id:'riven',name:'Riven',role:'Street sparring rival',x:13.1,z:27.8,shirt:'#a36f91',skin:'#92664d',rival:true},
  {id:'ellis',name:'Ellis',role:'Pedestrian crossing',x:3.5,z:6.2,shirt:'#9aaace',skin:'#c78560'},
  {id:'tala',name:'Tala',role:'Saffron Dunes local',x:299,z:100,shirt:'#e1ad83',skin:'#a76951'},
  {id:'maris',name:'Maris',role:'Canopy Key local',x:301,z:-109,shirt:'#79b5a7',skin:'#a67252'},
  {id:'nika',name:'Nika',role:'Frostpeak local',x:299,z:358,shirt:'#92aee6',skin:'#bd8967'},
  {id:'cyra',name:'Cyra',role:'Neon Meridian local',x:301,z:517,shirt:'#cc9ad0',skin:'#aa755e'}
];
export const cleanup=[
  {id:'beach-1',x:20.1,z:73.5},{id:'beach-2',x:23.3,z:79},{id:'beach-3',x:26.5,z:69}
];
export const beachAccess=z=>Math.abs(z-74)<3.5;
export const dockHeight=(x,z)=>{
  if((x>=16&&x<=48&&Math.abs(z-69)<2)||(x>=44&&x<=48&&z>69&&z<85)||(x>44&&x<52&&Math.abs(z-84)<1.8))return .56;
  return null;
};
export const waveHeight=(x,z,t)=>-.13+Math.sin(z*.40+t*2.8)*.115+Math.sin(x*.63+z*.17-t*1.8)*.075;
export function person(shirt='#5cbbad',skin='#bc8460',hero=false){
  const model=new T.Group(), limbs=[];
  block(model,0,1.13,0,.49,.57,.30,shirt);
  block(model,0,.83,0,.39,.18,.26,'#3c465b');
  round(model,0,1.62,-.025,.19,.23,.17,skin);
  round(model,0,1.72,.016,.18,.145,.168,'#46362e');
  block(model,0,1.768,-.075,.34,.092,.28,hero?'#35535a':'#795850');
  if(hero){
    block(model,0,1.71,-.207,.30,.048,.17,'#35535a');
    block(model,0,1.1,.208,.31,.35,.19,'#265651');
    block(model,0,1.12,.31,.22,.16,.02,'#82dcca');
  }
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.317,1.345,0);model.add(arm);
    block(arm,0,-.16,0,.153,.37,.16,shirt);block(arm,0,-.38,0,.13,.17,.14,skin);
    const leg=new T.Group();leg.position.set(side*.122,.78,0);model.add(leg);
    block(leg,0,-.30,0,.194,.62,.214,'#414c60');block(leg,0,-.65,-.055,.204,.17,.32,'#e1ccad');
    limbs.push({side,arm,leg});
  }
  return {model,limbs};
}
export function animatePerson(p,t,speed,swimming=false){
  const factor=Math.min(1,Math.abs(speed)/3), stride=Math.sin(t*(swimming?7:8.5))*factor;
  for(const {side,arm,leg} of p.limbs){
    arm.rotation.x=swimming?-.95+Math.sin(t*8+side*1.57)*1.15*factor:side*stride*.56;
    arm.rotation.z=swimming?side*.35:side*.06;
    leg.rotation.x=-side*stride*(swimming?.42:.78);
  }
}
function hull(parent,w,l,y,c){
  const v=[],idx=[],sections=[[-l/2,.08],[-l*.32,.72],[-l*.03,1],[l*.39,.9],[l*.50,.80]];
  for(const [z,s] of sections)v.push(-w*s*.44,-.31,z,w*s*.44,-.31,z,w*s*.53,y,z,-w*s*.53,y,z);
  for(let n=0;n<sections.length-1;n++)for(let k=0;k<4;k++){const a=n*4+k,b=n*4+(k+1)%4;idx.push(a,b,b+4,a,b+4,a+4)}
  idx.push(0,3,2,0,2,1,16,17,18,16,18,19);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();
  const m=new T.MeshStandardMaterial({color:c,roughness:.36,metalness:.16,side:T.DoubleSide});
  parent.add(new T.Mesh(g,m));
}
export function makeBoat(yacht){
  const boat=new T.Group(), w=yacht?4.6:2.6,l=yacht?11:5.9,top=yacht?.83:.54;
  hull(boat,w,l,top,yacht?'#f5ece0':'#eadfde');
  block(boat,0,top+.02,l*.09,w*.83,.09,l*.69,yacht?'#906e54':'#283745');
  for(const side of [-1,1]){
    block(boat,side*w*.438,top-.12,l*.095,.09,.14,l*.68,yacht?'#2e4b67':'#d9755a');
    if(yacht){
      for(let z=-3.4;z<4.9;z+=1.3)block(boat,side*2,.99,z,.045,.41,.045,'#c7c9c3');
      block(boat,side*2,1.2,.66,.048,.045,8.28,'#c7c9c3');
    }
  }
  if(yacht){
    block(boat,0,1.34,-.39,3.15,1.15,4.4,'#e9e7d9');
    block(boat,0,1.53,-2.62,2.96,.52,.07,'#304957');
    for(const s of [-1,1])for(let z=-1.8;z<1.6;z+=1.1)block(boat,s*1.58,1.54,z,.035,.38,.82,'#385366');
    block(boat,0,2.03,-.36,3.35,.14,4.46,'#f5ede0');block(boat,0,2.49,-.04,1.46,.81,.85,'#e3e1d6');
    block(boat,0,2.82,-.45,1.48,.16,.08,'#375661');block(boat,.42,3.06,.22,.06,1.43,.06,'#cecac0');
    block(boat,0,.96,3.40,2.8,.22,.87,'#bca18c');block(boat,0,1.11,3.77,2.8,.40,.14,'#bca18c');
  }else{
    const glass=block(boat,0,.82,-.78,1.88,.53,.10,'#34515e');glass.rotation.x=-.19;
    for(const x of [-.46,.46]){
      block(boat,x,.61,.23,.63,.18,.62,'#c89982');block(boat,x,.81,.51,.61,.44,.13,'#c89982');
    }
    block(boat,0,.48,2.8,.7,.62,.55,'#364454');
  }
  for(const x of [-w*.32,w*.32])block(boat,x,top+.12,l*.44,.17,.16,.17,x<0?'#ffa883':'#75ffe1',true);
  return boat;
}
export function addLifeWorld(scene){
  const player=person('#66ada2','#c48b65',true);scene.add(player.model);
  player.model.visible=false;
  const npcs=locals.map(n=>{const p=person(n.shirt,n.skin);p.model.position.set(n.x,.045,n.z);p.model.rotation.y=.8+n.x*.17;scene.add(p.model);return {...n,...p}});
  const shore=new T.Group();scene.add(shore);
  block(shore,32,.42,69,32,.27,3.8,'#957861');
  block(shore,46,.42,76.6,3.8,.27,15,'#a68a70');
  block(shore,48,.42,84,7.7,.27,3.7,'#8d7764');
  for(let x=17;x<47;x+=1.04)block(shore,x,.561,69,.055,.028,3.72,'#b6997a');
  for(let x=18;x<49;x+=4.5)for(const z of [67.3,70.7])block(shore,x,.25,z,.23,1.34,.24,'#665650');
  for(let z=71;z<85;z+=4.5)for(const x of [44.2,47.8])block(shore,x,.33,z,.21,1.46,.22,'#665650');
  block(shore,16.25,.39,69,1.78,.27,4,'#a18b77');block(shore,16.25,.16,74,1.7,.11,5.2,'#ac9e86');
  const beachItems=cleanup.map((p,i)=>{
    const g=new T.Group();g.position.set(p.x,.12,p.z);g.rotation.y=.9*i;scene.add(g);
    block(g,0,.04,0,.28,.18,.34,i===1?'#d58261':'#8cdacd');
    block(g,0,.28,0,.08,.12,.08,'#aaffde',true);g.visible=false;return {...p,model:g};
  });
  const craft={boat:makeBoat(false),yacht:makeBoat(true),hydro:makeBoat(false)};
  for(const k of ['boat','yacht','hydro']){const [x,z]=parking[k]??[48,64];craft[k].position.set(x,-.10,z);scene.add(craft[k])}
  for(const s of [-1,1]){
    block(craft.hydro,s*1.38,.49,.81,1.55,.13,1.72,'#8ed6c5',true);
    block(craft.hydro,s*1.54,.67,1.13,.21,.37,1.08,'#617c9c');
  }
  const wake=new T.Group(), ripples=[];
  for(let i=0;i<18;i++){
    const m=new T.MeshBasicMaterial({color:'#d5f5eb',transparent:true,opacity:0,depthWrite:false});
    const o=new T.Mesh(new T.PlaneGeometry(1,1),m);o.rotation.x=-Math.PI/2;wake.add(o);ripples.push(o);
  }
  scene.add(wake);
  return {player,npcs,craft,beachItems,wake,ripples};
}
export function paintWake(life,mode,x,z,heading,speed,t){
  life.wake.visible=(mode==='swim'||mode==='boat'||mode==='yacht')&&Math.abs(speed)>.5;
  if(!life.wake.visible)return;
  const n=mode==='yacht'?2.15:mode==='boat'?1.4:.45;
  for(const [i,p] of life.ripples.entries()){
    const phase=(i*.097+t*1.32)%1, d=(1+phase*12)*n,signed=(i%2?1:-1)*(n*.42+phase*n*1.6);
    const ax=x-Math.sin(heading)*d+Math.cos(heading)*signed,az=z+Math.cos(heading)*d+Math.sin(heading)*signed;
    p.position.set(ax,waveHeight(ax,az,t)*.38-.04,az);
    p.rotation.z=heading+i*.53;p.scale.set(n*(.4+phase),.25+n*phase*.54,1);
    p.material.opacity=(1-phase)*Math.min(.57,Math.abs(speed)*.09);
  }
}
export function makeInterior(place){
  const scene=new T.Scene(),decor=new T.Group();scene.add(decor);scene.background=new T.Color('#34444d');
  const hemi=new T.HemisphereLight('#f9eddd','#8794a1',2.28),sun=new T.DirectionalLight('#ffcd9d',2.25);
  sun.position.set(4,8,5);scene.add(hemi,sun);
  const n=place.variant%5, kind=place.kind;
  const w=3.85+(n%3)*.51+Math.min(.65,place.w*.083),d=3.42+n*.19+Math.min(.61,place.d*.08);
  const floor=kind==='shop'?'#8daba6':kind==='business'?'#8b939a':['#b38667','#a89775','#82958d','#baa685','#b9877a'][n];
  const wall=['#ded0b8','#95b7b5','#d4ab88','#a9a5b6','#d7bd9e'][n];
  block(decor,0,-.105,0,w*2+.38,.21,d*2+.38,floor);
  block(decor,0,1.39,-d,w*2,2.8,.22,wall);
  for(const s of [-1,1])block(decor,s*w,1.37,0,.18,2.74,d*2,wall);
  block(decor,0,.07,d,w*2,.14,.18,wall);
  block(decor,0,.025,d-.32,1.40,.05,.63,'#80d9bc');
  for(let z=-d+.8;z<d-.7;z+=.69)block(decor,0,.008,z,w*2-.1,.012,.026,'#aa9d89');
  const exitDoor=new T.Group();decor.add(exitDoor);
  block(exitDoor,0,1.23,d+.02,1.40,2.42,.10,'#476c62');block(exitDoor,.47,1.06,d-.048,.12,.09,.08,'#f1ce93');
  for(const s of [-1,1]){
    block(decor,s*(w*.53),1.61,-d+.13,1.75,.86,.075,'#375d67');
    block(decor,s*(w*.53),1.6,-d+.18,.039,.90,.06,'#e1c9a7');
  }
  const targets=[{id:'exit',label:'Leave building',x:0,z:d-.43,r:1.45,type:'exit'}];
  const points=[],cashX=-w+1.21,cashZ=kind==='home'?-.75:-d+1.21;
  const owner={id:`keeper-${place.id}`,name:kind==='shop'?place.special?'Leo':'Shopkeeper':kind==='business'?'Front desk':'Resident',role:kind==='shop'?'Shop counter':kind==='business'?'Office desk':'Local resident',x:kind==='home'?0:w-1.23,z:-d+1.35};
  if(kind==='shop'||kind==='business'){
    block(decor,w-1.62,.52,-d+2.14,2.58,1.04,.64,'#af8f71');
    block(decor,w-1.62,1.06,-d+2.14,2.72,.12,.76,'#d9c3a7');
    for(let j=0;j<3;j++){
      block(decor,cashX,.38+.44*j,-d+1.13,1.18,.089,.52,'#756d64');
      for(let k=0;k<4;k++)block(decor,cashX-.42+k*.28,.53+.44*j,-d+1.13,.14,.23,.22,['#b57958','#75a6a0','#a7af67','#d39d6a'][(k+n+j)%4]);
    }
    points.push({x:w-1.62,z:-d+2.14,w:1.3,d:.32});
  }else{
    const bx=n%2?-w+1.35:w-1.41;
    block(decor,bx,.29,-d+1.84,1.65,.56,2.42,'#7c6358');
    block(decor,bx,.61,-d+1.85,1.53,.18,2.28,['#7eab9c','#c88872','#8b94b4','#a0a56f','#d4a77e'][n]);
    block(decor,bx,.73,-d+.93,1.22,.17,.50,'#eee3cf');
    block(decor,n%2?1.5:-1.5,.40,.90,1.68,.80,.68,'#9b6d5a');
    block(decor,n%2?1.5:-1.5,.92,1.18,1.69,.66,.18,'#9b6d5a');
    points.push({x:bx,z:-d+1.84,w:.82,d:1.20});
    const rugX=n%2?.81:-.91;
    block(decor,rugX,.024,.49,1.48+n*.11,.035,1.69,['#a16d6b','#7c918f','#8d7667','#9c8896','#717e84'][n]);
    for(const side of [-1,1])block(decor,rugX+side*.63,.044,.49,.05,.021,1.60,'#d1b294');
    if(n%2===0)block(decor,w-.52,.92,.38,.48,1.81,1.49,'#6c786f');
  }
  block(decor,cashX,.55,cashZ+.55,.86,1.10,.73,'#716555');
  block(decor,cashX,1.14,cashZ+.55,.42,.12,.31,'#5e8273');
  targets.push({id:`cash-${place.id}`,label:kind==='shop'?'Inspect the till':'Check the cash drawer',x:cashX,z:cashZ+.55,r:1.72,type:'cash',place});
  const people=[];
  if(place.name!=='Your Home'){
    const inhabitant=person('#889c69','#ad795d');inhabitant.model.position.set(owner.x,0,owner.z);inhabitant.model.rotation.y=Math.PI;scene.add(inhabitant.model);
    people.push({...owner,...inhabitant});
    targets.push({...owner,actorId:owner.id,type:'talk',label:`Talk to ${owner.name}`,r:kind==='home'?1.7:2.6,place});
  }
  const player=person('#66ada2','#c48b65',true);scene.add(player.model);
  return {scene,w,d,targets,points,people,player,exitDoor,entry:[0,d-1.05]};
}
export function disposeInterior(interior){
  // Shared geometry and materials stay in the cache for the next room.
  interior.scene.clear();
}
export function makeWreck(scene){
  const wreck=new T.Group(),parts=[],clouds=[];
  scene.add(wreck);
  function clear(){for(const o of [...wreck.children]){if(o.userData.dispose)o.material.dispose();wreck.remove(o)}parts.length=clouds.length=0}
  function impact(input){
    clear();
    const {x,z,altitude,heading,vx,vz,vertical,energy,water}=input;
    const spec=[[0,.9,.1,1.6,1.05,5.1,'#545454'],[-2.42,1.3,-.32,4.86,.16,1.69,'#ded9c9'],[2.42,1.31,-.3,4.88,.16,1.69,'#e5dbc4'],[.2,1.55,2.2,2.0,.38,1.06,'#ba785f'],[0,1.13,-2.37,.91,.64,.91,'#393e46']];
    spec.forEach(([ox,oy,oz,w,h,d,c],i)=>{
      const xx=ox*Math.cos(heading)-oz*Math.sin(heading),zz=ox*Math.sin(heading)+oz*Math.cos(heading),mesh=block(wreck,x+xx,altitude+oy,z+zz,w,h,d,c);
      mesh.rotation.set(input.pitch,-heading,input.bank);
      const force=water?.18:.23;
      parts.push({mesh,v:new T.Vector3(vx*force+(i%2?1:-1)*i*2.7,i===0?Math.max(1,-vertical*.18):3.4+i*1.21,vz*force+(i-2)*1.19),rot:new T.Vector3(.2+i*.71,i*.5,i%2?2.8:-1.4),floor:(water?-.16:0)+Math.min(.48,h*.42)});
    });
    const high=energy>45&&!water;
    for(let i=0;i<(high?36:24);i++){
      const glow=i<(high?15:water?16:6);
      const m=new T.MeshBasicMaterial({color:water?'#b6eccf':glow?(i%2?'#ffb05d':'#f5774b'):'#52525b',transparent:true,opacity:.9,depthWrite:false});
      const mesh=new T.Mesh(ball,m);
      mesh.userData.dispose=true;mesh.position.set(x+(i%5-.2)*.43,altitude+.4+(i%6)*.18,z+(i%7-3)*.38);wreck.add(mesh);
      const k=i*2.399;
      clouds.push({mesh,age:-i*.021,ttl:glow?1.05+(i%8)*.14:4+(i%6)*.44,glow,v:new T.Vector3(Math.cos(k)*(glow?8:1.8),2+(i%4)*1.8,Math.sin(k)*(glow?8:1.8)),water});
    }
  }
  function step(dt){
    for(const p of parts){
      p.v.y-=9.81*dt;p.mesh.position.addScaledVector(p.v,dt);
      if(p.mesh.position.y<p.floor){p.mesh.position.y=p.floor;p.v.y=Math.abs(p.v.y)>.7?-p.v.y*.27:0;p.v.x*=1-2.8*dt;p.v.z*=1-2.8*dt;p.rot.multiplyScalar(1-2.1*dt)}
      p.mesh.rotation.x+=p.rot.x*dt;p.mesh.rotation.y+=p.rot.y*dt;p.mesh.rotation.z+=p.rot.z*dt;
    }
    for(const p of clouds){
      p.age+=dt;p.mesh.visible=p.age>=0&&p.age<p.ttl;
      if(!p.mesh.visible)continue;
      p.mesh.position.addScaledVector(p.v,dt);if(p.glow)p.v.y-=6.2*dt;
      const phase=p.age/p.ttl;
      p.mesh.material.opacity=(1-phase)*(p.glow?.86:.48);
      p.mesh.scale.setScalar(p.glow?(p.water?.14:.31)+(1-phase)*.8:.4+phase*2.4);
    }
  }
  return {impact,step,clear,count:()=>parts.length,center:()=>parts[0]?.mesh.position};
}
