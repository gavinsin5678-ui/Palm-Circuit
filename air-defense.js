import * as T from './vendor/three.module.min.js';

const baseGeometry=new T.CylinderGeometry(2.2,2.7,.65,10);
const towerGeometry=new T.BoxGeometry(1.7,1.35,1.7);
const barrelGeometry=new T.CylinderGeometry(.24,.32,3.8,8);
const projectileGeometry=new T.SphereGeometry(.82,10,8);
const baseMaterial=new T.MeshStandardMaterial({color:'#3f4b4c',roughness:.88});
const towerMaterial=new T.MeshStandardMaterial({color:'#776f59',roughness:.8});
const barrelMaterial=new T.MeshStandardMaterial({color:'#333c40',metalness:.45,roughness:.55});
const projectileMaterial=new T.MeshBasicMaterial({color:'#ff9c59'});
const tailMaterial=new T.MeshBasicMaterial({color:'#ffcf83',transparent:true,opacity:.8});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function createAirDefense(scene){
  const batteries=[],projectiles=[];
  let nextShot=0,elapsed=0;
  function deploy(target){
    const index=batteries.length,angle=index*2.399,range=72+(index%3)*17;
    const group=new T.Group(),base=new T.Mesh(baseGeometry,baseMaterial),tower=new T.Mesh(towerGeometry,towerMaterial);
    const barrel=new T.Mesh(barrelGeometry,barrelMaterial);
    tower.position.y=.95;barrel.rotation.x=Math.PI/2;barrel.position.set(0,1.75,-1.7);
    group.add(base,tower,barrel);group.position.set(target.x+Math.cos(angle)*range,0,target.z+Math.sin(angle)*range);
    scene.add(group);batteries.push({group,barrel,next:index*1.1});
  }
  function launch(target,index){
    const battery=batteries[index%batteries.length],origin=new T.Vector3(
      battery.group.position.x,2.05,battery.group.position.z
    ),aim=new T.Vector3(target.x,target.altitude+1.15,target.z),direction=aim.sub(origin).normalize();
    const mesh=new T.Group(),projectile=new T.Mesh(projectileGeometry,projectileMaterial),tail=new T.Mesh(new T.ConeGeometry(.42,2.8,8),tailMaterial);
    tail.rotation.x=-Math.PI/2;tail.position.z=1.55;mesh.add(projectile,tail);
    mesh.position.copy(origin);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),direction);scene.add(mesh);
    projectiles.push({mesh,velocity:direction.multiplyScalar(40),age:0});
  }
  function clear(){
    for(const battery of batteries)scene.remove(battery.group);
    for(const projectile of projectiles)scene.remove(projectile.mesh);
    batteries.length=projectiles.length=0;nextShot=0;elapsed=0;
  }
  function step(dt,time,target,onHit){
    elapsed=time;
    if(time<120||!target.hijackedAirliner){if(!target.hijackedAirliner)clear();return}
    const count=Math.min(8,1+Math.floor((time-120)/32));
    while(batteries.length<count)deploy(target);
    for(const battery of batteries)battery.group.lookAt(target.x,0,target.z);
    if(!target.airborne)return;
    nextShot-=dt;
    if(nextShot<=0&&batteries.length){
      launch(target,Math.floor(time/4.5)%batteries.length);
      nextShot=Math.max(2.6,6.1-batteries.length*.42);
    }
    const aim=new T.Vector3(target.x,target.altitude+1.15,target.z);
    for(let i=projectiles.length-1;i>=0;i--){
      const shot=projectiles[i];shot.age+=dt;
      const desired=aim.clone().sub(shot.mesh.position).normalize();
      const direction=shot.velocity.clone().normalize().lerp(desired,Math.min(1,dt*.72)).normalize();
      shot.velocity.copy(direction.multiplyScalar(40));shot.mesh.position.addScaledVector(shot.velocity,dt);
      shot.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),direction);
      if(shot.mesh.position.distanceTo(aim)<2.8){
        scene.remove(shot.mesh);projectiles.splice(i,1);onHit();return;
      }
      if(shot.age>8){scene.remove(shot.mesh);projectiles.splice(i,1)}
    }
  }
  return {step,clear,count:()=>batteries.length,projectiles:()=>projectiles.length,elapsed:()=>elapsed};
}
