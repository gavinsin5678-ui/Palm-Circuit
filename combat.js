import * as T from './vendor/three.module.min.js';
import {animatePerson} from './life-world.js?v=streets';

export const weapons={
  hands:{name:'Hands',damage:26,reach:2.35,wait:.48,style:'arc',color:'#ffd1a4'},
  baton:{name:'Vela Baton',price:24,damage:41,reach:2.95,wait:.52,style:'arc',color:'#99edcf',info:'A quick close-range sweep.'},
  breaker:{name:'Coil Hammer',price:35,damage:65,reach:2.8,wait:.78,style:'arc',color:'#f9bc83',info:'A heavy, slow close-range hit.'},
  spark:{name:'Spark Caster',price:43,damage:42,reach:12,wait:.52,style:'ray',color:'#a1eaff',info:'A narrow, fast energy bolt.'},
  flare:{name:'Flare Lance',price:59,damage:62,reach:20,wait:.82,style:'pierce',color:'#ffd382',info:'A long beam that can hit two aligned targets.'},
  fan:{name:'Aurora Fan',price:66,damage:35,reach:8,wait:.60,style:'fan',color:'#c9a4ff',info:'A short, broad cone of light.'},
  chain:{name:'Arc Link',price:72,damage:50,reach:12,wait:.83,style:'chain',color:'#9cffec',info:'A spark jumps to one nearby target.'},
  bloom:{name:'Bloom Orb',price:78,damage:54,reach:12,wait:1.02,style:'bloom',color:'#fca5e9',info:'A thrown light orb bursts around its landing point.'},
  nova:{name:'Nova Launcher',price:105,damage:100,reach:19,wait:1.38,style:'bloom',color:'#ffa989',info:'A large, slow blast of fictional energy.'},
  quake:{name:'Quake Cuff',price:85,damage:49,reach:4.3,wait:1.03,style:'ring',color:'#b8d4fc',info:'A shock ring around your character.'},
  loop:{name:'Afterimage Loop',price:98,damage:74,reach:10,wait:1.12,style:'fan',color:'#a2f0bc',info:'A wide arc with a longer recharge.'}
};

const pos=new T.Vector3();
const ringGeo=new T.RingGeometry(.83,1,28);
const beamGeo=new T.BoxGeometry(1,1,1);
const dotGeo=new T.IcosahedronGeometry(1,0);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

export function createCombat(api){
  const {state}=api, records=new Map(), effects=[], exposures=new Set();
  let time=0,next=0,strike=0,shown='';
  const held=new T.Group(),glow=new T.Mesh(beamGeo,new T.MeshBasicMaterial({color:'#9ff5e3'}));
  const handle=new T.Mesh(beamGeo,new T.MeshStandardMaterial({color:'#355160',roughness:.66}));
  handle.scale.set(.16,.26,.19);handle.position.y=-.48;held.add(handle,glow);
  state.weapon='hands';state.vitality=100;
  const record=p=>records.get(p.id);
  const vital=p=>record(p)?.hp??100;
  const point=p=>{p.model.getWorldPosition(pos);return {x:pos.x,z:pos.z,y:pos.y}};
  const eligible=()=>state.phase==='running'&&state.mode==='roam'&&api.walking()&&!state.swimming&&!state.dialogue&&!api.blocked();
  function aliveActors(){return api.actors().filter(p=>p.model.visible&&vital(p)>0)}
  const visible=(a,b)=>api.lineClear(a,b);
  function aims(gear){
    const origin={x:state.x,z:state.z,y:state.jump},sx=Math.sin(state.heading),sz=-Math.cos(state.heading);
    const cone=gear.style==='arc'?.36:gear.style==='fan'?.64:gear.style==='bloom'?.83:.91;
    const list=[];
    for(const p of aliveActors()){
      const at=point(p),dx=at.x-origin.x,dz=at.z-origin.z,d=Math.hypot(dx,dz);
      const dot=(dx*sx+dz*sz)/Math.max(.12,d);
      if(d<=gear.reach&&Math.abs(at.y-origin.y)<1.9&&(gear.style==='ring'||dot>=cone||d<.48)&&visible(origin,at))list.push({p,at,d,dot,score:d+(1-dot)*7});
    }
    return list.sort((a,b)=>a.score-b.score);
  }
  function damage(p,amount,cause,at=point(p)){
    let r=record(p);
    if(!r){r={hp:100,x:at.x,z:at.z,last:-99,poison:0,rescued:false};records.set(p.id,r)}
    if(r.hp<=0)return 0;
    const was=r.hp;r.hp=Math.max(0,r.hp-amount);r.last=time;r.poison=r.hp>0?r.poison:0;
    r.direction=Math.atan2(at.x-state.x,at.z-state.z);
    if(r.hp===0)exposures.delete(p.id);
    const ward=p.ward?45:0;
    if(!r.hp)return (cause==='vehicle'?340:270)+ward;
    return (cause==='vehicle'?(amount>=55?105:48):amount>=55?80:was<100?42:32)+(ward?20:0);
  }
  function consequence(hits,cause){
    if(!hits.length)return;
    const dead=hits.filter(h=>vital(h.p)===0).length,total=hits.reduce((n,h)=>n+h.fine,0);
    const text=cause==='vehicle'?(dead?'Fatal pedestrian collision':'Pedestrian collision'):
      dead?'Fatal attack':hits.length>1?'Multiple people injured':'Person injured';
    const subject=hits.length===1?hits[0].p.name:`${hits.length} people`;
    api.law(total,`${text} · ${subject}`);
  }
  function fx(style,start,end,color){
    const scene=api.scene();
    if(!scene)return;
    const add=(geo,at)=>{const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({color,transparent:true,depthWrite:false,side:T.DoubleSide}));mesh.position.copy(at);scene.add(mesh);return mesh};
    const a=new T.Vector3(start.x,(start.y??0)+1.05,start.z), b=new T.Vector3(end.x,(end.y??0)+.88,end.z);
    if(style==='ray'||style==='pierce'||style==='chain'){
      const beam=add(beamGeo,a.clone().lerp(b,.5));beam.scale.set(.085,.085,Math.max(.17,a.distanceTo(b)));beam.lookAt(b);
      effects.push({mesh:beam,born:time,end:time+.22,scene});
    }
    if(style==='bloom'){
      const orb=add(dotGeo,a);orb.scale.setScalar(.23);
      effects.push({mesh:orb,born:time,end:time+.24,scene,orb:[a.clone(),b.clone()]});
    }
    const isArea=['bloom','ring','fan','arc'].includes(style),delay=style==='bloom'?.24:0;
    const center=style==='ring'?start:end;
    const ring=add(ringGeo,new T.Vector3(center.x,(center.y??0)+.18,center.z));
    ring.rotation.x=-Math.PI/2;ring.visible=!delay;ring.scale.setScalar(.28);
    effects.push({mesh:ring,born:time+delay,end:time+delay+(isArea?.42:.24),scene,radius:style==='ring'?4.3:style==='bloom'?3.1:style==='fan'?2.5:1.05});
  }
  function attack(){
    if(!eligible()||time<next)return;
    const gear=weapons[state.weapon], list=aims(gear), main=list[0];
    const from={x:state.x,z:state.z,y:state.jump}, ranged=['ray','pierce','chain'].includes(gear.style),
      d=Math.min(gear.reach,gear.style==='bloom'?6:ranged?gear.reach:3.4);
    let end=main?.at??{x:from.x+Math.sin(state.heading)*d,z:from.z-Math.cos(state.heading)*d,y:from.y};
    if(!main&&gear.style==='bloom')while(!visible(from,end)&&Math.hypot(end.x-from.x,end.z-from.z)>.3){
      end={...end,x:from.x+(end.x-from.x)*.78,z:from.z+(end.z-from.z)*.78};
    }
    if(state.weapon!=='hands'){
      const impact=api.damageWorld(from,end,gear.damage,gear.style==='bloom'?3.3:0);
      if(impact&&!main)end=impact;
    }
    next=time+gear.wait;strike=time+.28;api.sound(gear.style==='arc'?128:232);
    fx(gear.style,from,end,gear.color);
    let target=[];
    if(gear.style==='chain'&&main){
      target=[main];const extra=aliveActors().map(p=>({p,at:point(p)})).find(o=>o.p!==main.p&&Math.hypot(o.at.x-end.x,o.at.z-end.z)<4.1&&visible(end,o.at));
      if(extra){target.push(extra);fx('chain',end,extra.at,gear.color)}
    }else if(gear.style==='bloom'){
      target=aliveActors().map(p=>({p,at:point(p)})).filter(o=>Math.hypot(o.at.x-end.x,o.at.z-end.z)<3&&visible(end,o.at));
    }else target=list.slice(0,gear.style==='fan'||gear.style==='ring'?4:gear.style==='pierce'?2:1);
    const hits=target.map((o,i)=>({p:o.p,fine:damage(o.p,gear.style==='chain'&&i?Math.ceil(gear.damage*.55):gear.damage,'weapon',o.at)})).filter(o=>o.fine);
    let crates=0;
    for(const prop of api.props()){
      const dx=prop.x-from.x,dz=prop.z-from.z,d=Math.hypot(dx,dz);
      const dot=(dx*Math.sin(state.heading)-dz*Math.cos(state.heading))/Math.max(.12,d);
      const touched=gear.style==='bloom'?Math.hypot(prop.x-end.x,prop.z-end.z)<3.3:d<gear.reach&&(gear.style==='ring'||dot>(gear.style==='arc'?.36:gear.style==='fan'?.64:.91));
      if(!touched||!visible(from,prop))continue;
      prop.origin??=[prop.x,prop.z];
      prop.vx+=dx/Math.max(.4,d)*gear.damage*.075;
      prop.vz+=dz/Math.max(.4,d)*gear.damage*.075;
      prop.vy=Math.max(prop.vy,gear.style==='bloom'?4.5:2.4);crates++;
    }
    consequence(hits,'weapon');
    if(!hits.length)api.notice(`${gear.name} · ${crates?`${crates} test ${crates===1?'crate':'crates'} moved`:'no one hit'}`);
  }
  function vehicle(ax,az,bx,bz,speed,width){
    if(state.mode!=='roam'||speed<3.2)return 0;
    const dx=bx-ax,dz=bz-az,den=dx*dx+dz*dz;
    if(den<.00001)return 0;
    const hits=[];
    for(const p of aliveActors()){
      const at=point(p),r=record(p);
      if(time-(r?.vehicleHit??-99)<2.1||Math.abs(at.y)>.85||Math.abs(at.x-bx)>4||Math.abs(at.z-bz)>4)continue;
      const u=clamp(((at.x-ax)*dx+(at.z-az)*dz)/den,0,1);
      if(Math.hypot(at.x-ax-u*dx,at.z-az-u*dz)>width)continue;
      const fine=damage(p,speed>=14?100:speed>=8?61:28,'vehicle',at);
      record(p).vehicleHit=time;hits.push({p,fine});fx('arc',at,at,'#ffd7a7');
    }
    consequence(hits,'vehicle');return hits.length;
  }
  function step(dt){
    time+=dt;
    const scene=api.scene();
    for(let i=effects.length-1;i>=0;i--){
      const e=effects[i],v=(time-e.born)/(e.end-e.born);
      if(v>=1||e.scene!==scene){e.mesh.removeFromParent();e.mesh.material.dispose();effects.splice(i,1);continue}
      e.mesh.visible=v>=0;if(v<0)continue;
      e.mesh.material.opacity=1-v*.83;
      if(e.radius)e.mesh.scale.setScalar(.27+e.radius*v);
      if(e.orb){e.mesh.position.lerpVectors(...e.orb,v);e.mesh.position.y+=Math.sin(v*Math.PI)*1.35}
    }
    for(const id of exposures){
      const r=records.get(id);
      if(time<r.poison)continue;
      r.hp=0;r.poison=0;r.last=time;exposures.delete(id);
      api.law(340,`Violet exposure fatality · ${r.name}`);
    }
    for(const p of api.actors()){
      let r=record(p);
      const idValue=String(p.id).split('').reduce((sum,c)=>sum+c.charCodeAt(0),0),
        aggressive=!!p.rival||!!p.hostile||state.heat>=3&&idValue%5===0;
      if(!r&&aggressive){
        const at=point(p);r={hp:100,x:at.x,z:at.z,last:-99,poison:0,rescued:false};records.set(p.id,r);
      }
      if(!r)continue;
      const model=p.model;
      if(!aggressive&&r.hp===100&&!r.poison&&model.userData.inCombat){
        model.userData.inCombat=false;model.rotation.x=p.resting?-Math.PI/2:0;model.rotation.z=0;
        continue;
      }
      if(!aggressive&&r.hp===100&&!r.poison)continue;
      model.userData.inCombat=true;model.visible=true;
      const here=point(p);
      if(aggressive&&r.hp>0&&!p.resting){
        const dx=state.x-r.x,dz=state.z-r.z,d=Math.hypot(dx,dz),pace=2.85;
        if(d>1.3){
          const dest={x:r.x+dx/d*pace*dt,z:r.z+dz/d*pace*dt};
          if(api.canMove(dest.x,dest.z)){r.x=dest.x;r.z=dest.z}
        }
        if(d<1.65&&eligible()&&time>(r.counter??0)){
          r.counter=time+.95;api.damagePlayer?.(9+state.heat*1.5,`Punch from ${p.name}`);api.sound(102);
        }
        animatePerson(p,time,pace);
        model.position.x+=r.x-here.x;model.position.z+=r.z-here.z;
        continue;
      }
      if(r.hp>0&&time-r.last>.38&&time-r.last<4.5&&!r.poison&&!p.resting){
        const d=Math.hypot(r.x-state.x,r.z-state.z),pace=p.rival&&eligible()&&d<9?2.5:2.85;
        const dir=p.rival&&eligible()&&d<9?-1:1;
        if(d>.8){
          const dest={x:r.x+Math.sin(r.direction)*pace*dt*dir,z:r.z+Math.cos(r.direction)*pace*dt*dir};
          if(p.rival&&dir===-1)r.direction=Math.atan2(r.x-state.x,r.z-state.z);
          if(api.canMove(dest.x,dest.z)){r.x=dest.x;r.z=dest.z}
        }
        if(p.rival&&d<1.65&&eligible()&&time>(r.counter??0)){
          r.counter=time+.85;api.damagePlayer?.(17,`Punch from ${p.name}`);api.sound(102);
        }
        animatePerson(p,time,pace);
      }else animatePerson(p,time,0);
      model.position.x+=r.x-here.x;model.position.z+=r.z-here.z;
      model.rotation.set(r.hp>0?(p.resting?-1.5:time-r.last<.22?-.29:0):-Math.PI/2,p.resting?0:Math.PI+r.direction,r.hp>0&&r.poison?.20:0,'YXZ');
      model.position.y=r.hp>0?(p.resting?.88:.05):.14;
      if(!r.hp)model.position.y=p.resting?.98:.14;
    }
  }
  function wardActions(p){
    const r=record(p);
    return {dead:r?.hp===0,injured:!!r&&r.hp>0&&r.hp<100,poison:!!r?.poison,rescued:!!r?.rescued,remaining:r?.poison?Math.max(0,Math.ceil(r.poison-time)):0};
  }
  function expose(p){
    const at=point(p);
    if(!records.has(p.id))records.set(p.id,{hp:100,x:at.x,z:at.z,last:-99,rescued:false});
    const r=record(p);if(r.hp<=0||r.poison)return;
    r.poison=time+22;r.hp=Math.min(55,r.hp);r.last=time;r.name=p.name;r.direction??=Math.PI;
    exposures.add(p.id);
    api.law(145,`Fictional Violet exposure · ${p.name}`);
    fx('ring',at,at,'#d8a6ff');
  }
  function aid(p){
    const r=record(p);if(!r||r.hp<=0)return;
    r.hp=100;r.poison=0;exposures.delete(p.id);
    const first=!r.rescued;r.rescued=true;
    if(first&&state.bounty)api.law(-Math.min(state.bounty,35),`Ward aid · ${p.name} stabilized`);
    else api.notice(`${p.name} stabilized`);
  }
  function cycle(){
    if(!eligible())return;
    const list=['hands',...Object.keys(weapons).filter(id=>state.owned.includes(id))];
    state.weapon=list[(list.indexOf(state.weapon)+1)%list.length];api.refresh();
  }
  function hud(){
    const target=document.getElementById('combat-status'), attackButton=document.getElementById('attack-tool'), equip=document.getElementById('weapon-tool');
    const show=eligible();attackButton.hidden=!show;equip.hidden=!show;target.hidden=!show;if(!show)return;
    const gear=weapons[state.weapon],a=aims(gear)[0];
    equip.title=`Cycle weapons (B) · ${gear.name}`;
    const key=`${state.weapon}/${a?.p.id}/${a?vital(a.p):0}`;
    if(key===shown)return;shown=key;
    document.getElementById('combat-weapon').textContent=gear.name;
    document.getElementById('combat-target').textContent=a?`${a.p.name} · ${vital(a.p)}%`:'No target ahead';
    target.classList.toggle('has-target',!!a);
  }
  function drawWeapon(player){
    held.visible=state.weapon!=='hands'&&!state.swimming&&!api.blocked();
    if(!held.visible)return;
    const arm=player.limbs[1].arm,gear=weapons[state.weapon],long=gear.style==='arc'||gear.style==='bloom';
    if(held.parent!==arm)arm.add(held);
    glow.material.color.set(gear.color);
    glow.scale.set(long?.15:.19,long?.38:.20,long?.16:.31);
    glow.position.set(0,long?-.67:-.5,long?0:-.14);
  }
  return {attack,cycle,step,vehicle,hud,vital,wardActions,expose,aid,striking:()=>time<strike,
    drawWeapon,inspect:()=>({actors:api.actors().map(p=>({id:p.id,name:p.name,...point(p),hp:vital(p),...wardActions(p)}))})};
}
