import * as T from './vendor/three.module.min.js';
import {nearestRail} from './metro-world.js?v=rail-network';

const cube=new T.BoxGeometry(), round=new T.SphereGeometry(1,12,8), tire=new T.CylinderGeometry(.43,.43,.22,14);
function shape(g,geo,color,x,y,z,w,h,d){
  const m=new T.Mesh(geo,new T.MeshLambertMaterial({color}));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m
}
const box=(g,...args)=>shape(g,cube,...args);
function tires(g,w,z){
  return (w?[w,-w]:[0]).map(x=>shape(g,tire,'#282f39',x,.44,z,1,1,1)).map(m=>{m.rotation.z=Math.PI/2;return {mount:m,front:z<0}})
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
  return {rider,shoal,floats:extras};
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
