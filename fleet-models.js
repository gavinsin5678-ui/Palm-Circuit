import * as T from './vendor/three.module.min.js';
import {nearestRail} from './metro-world.js?v=gameplay-overhaul';
import {fleetProducts} from './fleet.js?v=road-dynamics';

const cube=new T.BoxGeometry(), round=new T.SphereGeometry(1,12,8), tire=new T.CylinderGeometry(.43,.43,.22,14);
function shape(g,geo,color,x,y,z,w,h,d){
  const m=new T.Mesh(geo,new T.MeshLambertMaterial({color}));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m
}
const box=(g,...args)=>shape(g,cube,...args);
function tires(g,w,z){
  return (w?[w,-w]:[0]).map(x=>{
    const m=shape(g,tire,'#282f39',x,.44,z,1,1,1);m.rotation.z=Math.PI/2;
    m.userData.suspensionWheel={left:x<0,front:z<0,baseY:.44};return {mount:m,front:z<0};
  })
}
export function makeExtraModels(w){
  const bike=new T.Group(),rover=new T.Group(),sub=new T.Group(),extras=new Map();
  box(bike,'#93e0bd',0,.75,0,.28,.34,1.6);box(bike,'#344956',0,1,.29,.32,.14,.64);
  box(bike,'#b5d3d0',0,.97,-.74,.095,.55,.11).rotation.x=-.28;
  box(bike,'#cbd5cf',0,1.27,-.8,.63,.08,.10);box(bike,'#dde7be',0,1.05,-.91,.28,.27,.18);
  const rider=new T.Group();bike.add(rider);
  box(rider,'#4f6474',0,1.39,-.08,.49,.57,.31).rotation.x=.47;
  shape(rider,round,'#e4dcbf',0,1.78,-.24,.23,.23,.22);
  for(const x of [-.31,.31])box(rider,'#4d6672',x,1.34,-.49,.14,.14,.65).rotation.x=.30;
  w.cars.bike={car:bike,wheels:[...tires(bike,0,-.97),...tires(bike,0,.94)]};bike.visible=false;w.scene.add(bike);
  box(rover,'#bba178',0,.76,0,1.92,.53,3.1);box(rover,'#778b8e',0,1.37,-.22,1.54,.78,1.6);
  box(rover,'#9dba9f',0,1.77,-.2,1.75,.14,1.7);box(rover,'#273e4a',0,1.47,-1.03,1.4,.36,.05);
  box(rover,'#303d4a',0,.64,-1.58,1.9,.18,.3);
  w.cars.rover={car:rover,wheels:[...tires(rover,.98,-1.04),...tires(rover,.98,1.05)]};rover.visible=false;w.scene.add(rover);
  shape(sub,round,'#d1b780',0,.36,0,1.28,.9,2.95);
  shape(sub,round,'#5e8e9c',0,.94,-.44,.76,.54,1.05);
  for(const s of [-1,1]){box(sub,'#6aa0b2',s*1.25,.32,.63,.84,.16,1.32);shape(sub,round,'#b9e7de',s*.8,.44,-1.86,.25,.22,.14)}
  w.life.craft.sub=sub;sub.visible=false;w.scene.add(sub);
  const shoal=new T.Group();
  for(let i=0;i<28;i++){
    const x=34+(i*91%107),z=51+(i*49%83),s=.45+(i%6)*.17;
    if(nearestRail(x,z,true).d<6.2)continue;
    shape(shoal,round,i%2?'#54716a':'#637c7d',x,-8.9,z,s*1.4,s,s*1.7);
    for(let k=0;k<3;k++)box(shoal,k%2?'#538577':'#719d7c',x+k*.27,-8.5+k*.26,z,.08,1.2+k*.43,.08).rotation.z=(k-1)*.21;
  }
  shoal.visible=false;w.scene.add(shoal);
  for(const x of [-1.7,1.7]){
    const o=box(w.aircraft.mesh,'#96b6ba',x,.28,.07,.48,.32,3.27);o.visible=false;extras.set(x,o);
    const leg=box(w.aircraft.mesh,'#98aeae',x,.67,0,.12,.62,.16);leg.visible=false;extras.set(x*2,leg);
  }
  const fleetModels={};
  for(const [id,p] of Object.entries(fleetProducts)){
    const model=makeFleetModel(p,w);
    addVariantKit(model,p);
    vehiclePaint(model,p.color);
    model.userData.suspensionWheels=[];
    model.traverse(o=>{if(o.userData.suspensionWheel)model.userData.suspensionWheels.push(o)});
    const back=p.kind==='rail'?w.arch.train.back.clone(true):null;
    model.visible=false;if(back){vehiclePaint(back,p.color);back.visible=false}
    w.scene.add(model);if(back)w.scene.add(back);
    fleetModels[id]={model,back,kind:p.kind,propellers:model.userData.propellers??[]};
  }
  function makeFleetModel(p,world){
    if(p.family==='bus'||p.family==='taxi')return makeRoadServiceVehicle(p);
    if(p.family==='ferry')return makeFerryVariant(p.variant);
    if(p.kind==='air')return makeAircraftVariant(p);
    const base=p.kind==='road'?world.cars[p.chassis]?.car:
      p.kind==='boat'?world.life.craft[p.chassis]:
      p.kind==='rail'?world.arch.train.front:null;
    if(!base)throw new Error(`Missing ${p.kind} chassis model "${p.chassis}" for vehicle "${p.model}".`);
    return base.clone(true);
  }
  function makeAircraftVariant(p){
    if(p.model==='fighter'){
      const g=new T.Group();
      box(g,p.color,0,.72,0,1.22,.58,7.6);
      shape(g,round,'#d6e5df',0,1.30,-.35,.62,.42,2.05);
      box(g,'#263e50',0,1.35,-.82,.82,.35,1.48);
      box(g,p.color,0,.72,.95,8.25,.16,3.65);
      box(g,p.color,0,.75,-1.25,6.85,.13,2.15);
      for(const x of [-1,1]){
        box(g,p.color,x*1.48,.78,-.45,1.42,.24,4.25).rotation.y=-x*.12;
        box(g,p.color,x*1.22,1.55,-2.15,.16,1.52,.82).rotation.z=x*.28;
        box(g,p.color,x*.62,.63,-3.58,.38,.38,.72);
        box(g,'#ff9a48',x*.62,.63,-4.02,.48,.48,.20).name='afterburner';
      }
      box(g,p.color,0,1.02,-3.15,.44,.42,1.05);
      g.userData.propellers=[];
      return g;
    }
    const g=new T.Group(),propellers=[];
    const fuselage=p.family==='plane'?[9.6,15.2,12.4][p.variant]:[10.1,11.8,10.8][p.variant];
    const span=p.family==='plane'?[21.5,14.4,17.4][p.variant]:[14.6,16.8,15.5][p.variant];
    const body=shape(g,round,p.color,0,1.14,0,1.34,.88,fuselage*.52);
    body.material.color.set(p.color);
    shape(g,round,'#d7e8e4',0,1.73,-fuselage*.19,.73,.32,fuselage*.20);
    box(g,'#d7e8e4',0,1.47,-fuselage*.43,1.08,.12,.19);
    if(p.family==='plane'&&p.model==='thermal'){
      box(g,'#d5e0dc',0,1.42,.15,span,.13,1.55);
      box(g,'#c7d8d1',0,1.48,fuselage*.34,5.25,.12,1.28);
      box(g,p.color,0,1.63,fuselage*.42,.22,.52,.33);
      box(g,'#566b75',0,.47,.12,.28,.62,.34);
      return g;
    }
    const wingChord=p.family==='plane'&&p.model==='sprintjet'?2.35:p.family==='plane'?2.0:1.75;
    const wing=box(g,'#b7c8ce',0,1.08,.28,span,.16,wingChord);
    if(p.model==='sprintjet'){
      for(const x of [-1,1]){
        box(g,p.color,x*span*.25,1.07,.69,span*.48,.15,wingChord*.9).rotation.y=x*.20;
        shape(g,round,'#647b8a',x*3.0,.77,.56,.67,.59,2.95);
        shape(g,round,'#253c4c',x*3.0,.77,-.93,.40,.39,.45);
      }
      box(g,p.color,0,1.35,fuselage*.34,5.3,.14,1.18);
      box(g,p.color,0,1.83,fuselage*.41,.24,.92,.82);
      box(g,'#718797',0,.55,fuselage*.28,1.25,.12,1.05);
    }else{
      box(g,p.color,0,1.39,fuselage*.34,5.1,.14,1.24);
      box(g,p.color,0,1.80,fuselage*.41,.22,.94,.88);
      if(p.model==='trimotor'){
        for(const x of [-span*.28,span*.28]){
          shape(g,round,'#a4b5ba',x,.89,-.12,.68,.59,1.78);
          propellers.push(makePropeller(g,x,.89,-1.07,'#526976'));
        }
        shape(g,round,'#a4b5ba',0,.92,-fuselage*.43,.49,.46,1.32);
        propellers.push(makePropeller(g,0,.92,-fuselage*.50,'#526976'));
      }else{
        const floatScale=p.variant===0?1:p.variant===1?1.18:1.06;
        for(const x of [-span*.17,span*.17]){
          box(g,'#aebdc0',x,.37,.45,.16,.58,.18);
          const pontoon=shape(g,round,p.color,x,.27,.54,.43*floatScale,.30,2.45*floatScale);
          pontoon.material.color.set(p.color);
        }
        box(g,'#465e6a',0,.43,.20,.27,.52,.42);
        if(p.model==='albatross')box(g,'#d7e3de',0,.12,.62,span*.56,.12,.38);
        if(p.model==='otter'){
          for(const x of [-1,1])box(g,'#526b77',x*span*.17,.58,-.16,.11,.44,.13);
        }
        propellers.push(makePropeller(g,0,.98,-fuselage*.50,'#526976'));
      }
    }
    if(p.model==='skipper')box(g,'#d6a77f',0,.35,fuselage*.23,.66,.27,.5);
    if(p.model==='albatross')box(g,'#dce8e3',0,1.1,fuselage*.18,1.18,.16,2.7);
    wing.userData.baseWing=true;
    g.userData.propellers=propellers;
    return g;
  }
  function makePropeller(parent,x,y,z,color){
    const prop=new T.Group();prop.position.set(x,y,z);parent.add(prop);
    box(prop,color,0,0,0,.13,1.56,.12);
    box(prop,color,0,0,0,1.56,.13,.12);
    shape(prop,round,'#344956',0,0,0,.23,.23,.22);
    return prop;
  }
  return {rider,shoal,floats:extras,fleetModels};
}
function makeRoadServiceVehicle(p){
  const g=new T.Group(),isBus=p.family==='bus',variant=p.variant;
  const body=isBus?'#8dc69e':'#e7c56e',glass='#b8e4d7',length=isBus?[7.2,8.5,7.7][variant]:[4.3,4.7,5.1][variant];
  if(isBus){
    const height=variant===1?2.45:2.08;
    box(g,body,0,1.20,0,2.7,height,length);
    box(g,'#344e5b',0,1.20+height*.52,0,2.55,.16,length-.12);
    for(let z=-length*.34;z<=length*.34;z+=length*.22)for(const x of [-1.37,1.37])box(g,glass,x,1.47,z,.08,.72,1.10);
    box(g,'#526e7b',0,1.5,-length*.5,2.34,.9,.09);
    for(const z of [-length*.31,length*.31])for(const x of [-1.18,1.18])wheel(g,x,z);
    if(variant===1){
      box(g,'#d7c58c',0,2.82,-.12,2.22,.19,1.75);
      box(g,'#405866',0,2.93,-.12,1.82,.05,1.44);
    }else if(variant===2){
      for(const x of [-1,1])box(g,'#496773',x*1.43,.67,0,.22,.38,length*.68);
      box(g,'#55727b',0,2.35,length*.34,.16,.28,.55);
    }else{
      box(g,'#f1d28d',0,.86,-length*.5-.08,1.08,.24,.14);
      box(g,'#f6e1a3',0,2.48,0,.14,.12,.65);
    }
  }else{
    const width=variant===2?2.12:1.88,height=variant===1?1.52:1.32;
    box(g,body,0,.68,0,width,.62,length);
    box(g,'#d9e2d7',0,1.22,-.13,width*.82,height*.57,length*.52);
    box(g,'#3b5865',0,1.22,-length*.39,width*.77,.46,.07);
    box(g,'#3b5865',0,1.22,length*.39,width*.77,.46,.07);
    for(const x of [-width*.48,width*.48]){
      box(g,'#ffe9a8',x,.72,-length*.5,.1,.23,.12);
      box(g,'#c54f4e',x,.72,length*.5,.1,.23,.12);
    }
    for(const z of [-length*.31,length*.31])for(const x of [-width*.49,width*.49])wheel(g,x,z);
    if(variant===0){
      box(g,'#fff0af',0,1.79,-.03,.72,.14,.32);
      box(g,'#435967',0,1.70,-.03,.58,.035,.15);
    }else if(variant===1){
      box(g,'#d6bd78',0,1.76,.04,1.1,.12,.62);
      box(g,'#3b5865',0,1.22,0,width*.62,.04,length*.30);
    }else{
      box(g,'#c9d1c5',0,1.53,.1,width*.88,.12,1.32);
      box(g,'#fff0af',0,1.75,-.08,.5,.14,.24);
    }
  }
  return g;
}
function wheel(g,x,z){
  const mount=new T.Group();mount.position.set(x,0,z);mount.userData.suspensionWheel={left:x<0,front:z<0,baseY:0};g.add(mount);
  const m=shape(mount,tire,'#28323b',0,.38,0,.96,.96,.96);m.rotation.z=Math.PI/2;
  const rim=shape(mount,tire,'#9babb0',0,.38,0,.42,.42,.98);rim.rotation.z=Math.PI/2;
}
function makeFerryVariant(variant){
  const g=new T.Group(),hullColor=['#397783','#477b84','#597987'][variant];
  const hullAt=(x,z,w,l)=>box(g,hullColor,x,.22,z,w,.52,l);
  const deck=(x,z,w,l)=>box(g,'#e6dec9',x,.54,z,w,.12,l);
  if(variant===0){
    for(const x of [-1.8,1.8]){hullAt(x,0,1.25,10);deck(x,0,1.35,9.3)}
    box(g,'#a5d9d4',0,1.38,-.6,3.15,1.48,5.2);
    box(g,'#e7e2d3',0,2.18,-.6,3.3,.16,5.35);
    for(const x of [-1.18,1.18])for(let z=-2.2;z<1.6;z+=1.2)box(g,'#315263',x,1.53,z,.08,.72,.76);
    box(g,'#bfaa82',0,.88,3.3,2.75,.28,1.25);
  }else if(variant===1){
    hullAt(0,0,2.45,11);deck(0,0,2.55,10.2);
    box(g,'#86cdd0',0,1.35,-.7,2.5,1.35,4.4);
    box(g,'#e5e0d1',0,2.1,-.7,2.65,.16,4.55);
    for(const x of [-1.55,1.55]){
      box(g,'#c7b27c',x,.17,.55,.18,.16,6.8);
      box(g,'#99c9ce',x,.04,.55,.13,.12,6.4);
    }
    box(g,'#d1b680',0,.04,-1.1,3.55,.12,.18);
  }else{
    hullAt(0,0,1.7,10);
    for(const x of [-2.5,2.5]){hullAt(x,.7,.72,7.4);box(g,'#d8c99b',x,.57,.7,.82,.1,7.2)}
    deck(0,0,1.84,9.2);
    box(g,'#8dc7cc',0,1.24,-.65,1.95,1.13,3.8);
    box(g,'#e6dfce',0,1.84,-.65,2.08,.14,3.94);
    for(const x of [-.68,.68])for(let z=-1.85;z<.8;z+=1.05)box(g,'#365864',x,1.34,z,.07,.55,.62);
    box(g,'#d5bb87',0,.83,3,1.45,.2,.9);
  }
  for(const x of [-1.12,1.12])box(g,'#f3d795',x,.75,-4.75,.18,.16,.28);
  return g;
}
function addVariantKit(g,p){
  const color=p.color,boxKit=(x,y,z,w,h,d)=>box(g,color,x,y,z,w,h,d);
  if(p.family==='bus'||p.family==='taxi'||p.kind==='air')return;
  if(p.kind==='road'){
    if(p.chassis==='bike'){
      if(p.variant===0){
        boxKit(0,1.14,-1.03,.47,.48,.20);boxKit(0,.84,1.08,.42,.34,.44);
        boxKit(-.47,1.33,-.74,.34,.11,.11);boxKit(.47,1.33,-.74,.34,.11,.11);
      }else if(p.variant===1){
        boxKit(0,1.22,-1.05,.44,.17,.42);boxKit(0,.55,-1.07,.58,.13,.24);
        boxKit(0,.93,.92,.72,.44,.34);boxKit(0,1.32,.30,.42,.12,.43);
      }else{
        boxKit(0,1.22,.84,.83,.50,.55);boxKit(0,1.48,.78,.62,.12,.40);
        boxKit(-.44,1.10,-.68,.20,.27,.39);boxKit(.44,1.10,-.68,.20,.27,.39);
      }
      return;
    }
    if(p.variant===0){
      boxKit(-.72,1.18,1.72,.16,.12,.38);boxKit(.72,1.18,1.72,.16,.12,.38);
      boxKit(0,1.30,1.80,1.72,.12,.14);
    }else if(p.variant===1){
      boxKit(-1.06,.57,0,.16,.2,2.35);boxKit(1.06,.57,0,.16,.2,2.35);
    }else{
      boxKit(-1.16,1.07,-.38,.14,.24,1.06);boxKit(1.16,1.07,-.38,.14,.24,1.06);
      boxKit(0,1.72,.15,.68,.13,.18);
    }
  }else if(p.family==='ferry'){
    if(p.variant===0){
      for(const x of [-1,1])boxKit(x*2.15,.42,.7,1.05,.14,1.45);
    }else if(p.variant===1){
      for(const x of [-1,1])boxKit(x*1.65,.04,.32,.18,.2,2.6);
      boxKit(0,.27,-.82,3.9,.13,.2);
    }else{
      boxKit(0,2.4,-.2,.12,1.7,.12);boxKit(0,3.05,-.2,.95,.12,.12);
      boxKit(-1.45,.62,1.2,.85,.16,.55);boxKit(1.45,.62,1.2,.85,.16,.55);
    }
  }else if(p.kind==='air'){
    if(p.variant===0)boxKit(0,3.1,-1.8,.22,.46,.48);
    else if(p.variant===1){boxKit(-5,.14,.25,.58,.3,1.25);boxKit(5,.14,.25,.58,.3,1.25)}
    else{boxKit(-2.2,.58,2,.52,.56,.65);boxKit(2.2,.58,2,.52,.56,.65)}
  }else if(p.kind==='rail'){
    if(p.variant===0){boxKit(0,3.35,-.25,.18,.62,.2);boxKit(0,3.63,-.25,1.05,.1,.2)}
    else if(p.variant===1){boxKit(-1.62,.24,-3.3,.12,.22,.85);boxKit(1.62,.24,-3.3,.12,.22,.85)}
    else{boxKit(0,3.3,.9,.72,.13,.25);boxKit(0,3.42,.9,.14,.4,.14)}
  }else if(p.kind==='boat'){
    if(p.variant===0){
      for(const x of [-1,1])boxKit(x*2.15,.42,.7,1.05,.14,1.45);
    }else if(p.variant===1){
      for(const x of [-1,1])boxKit(x*1.65,.04,.32,.18,.2,2.6);
      boxKit(0,.27,-.82,3.9,.13,.2);
    }else{
      boxKit(0,2.4,-.2,.12,1.7,.12);boxKit(0,3.05,-.2,.95,.12,.12);
      boxKit(-1.45,.62,1.2,.85,.16,.55);boxKit(1.45,.62,1.2,.85,.16,.55);
    }
  }
}
const palette=new Map();
export function vehiclePaint(g,color){
  if(g.userData.paint===color)return;
  g.userData.paint=color;
  const body=g.children.find(x=>x.isMesh&&x.material?.color&&x.scale.x>1)??g.children.find(x=>x.isMesh&&x.material?.color);
  if(!body)return;
  const base=body.userData.original??=body.material;
  if(!color){body.material=base;return}
  const key=base.uuid+color;
  if(!palette.has(key)){const m=base.clone();m.color.set(color);palette.set(key,m)}
  body.material=palette.get(key);
}
