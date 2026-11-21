import * as T from './vendor/three.module.min.js';
import {person,animatePerson} from './life-world.js?v=streets';

export const sportModes={
  basketball:{name:'Basketball',icon:'1v1 · shoot and defend',instruction:'Move into the court and face the hoop. Press X to shoot; the first player to score three baskets wins.',action:'Shoot'},
  football:{name:'Football',icon:'Penalty shootout',instruction:'Move into the court, line up with the goal, and press X to shoot. The first player to score three goals wins.',action:'Shoot'},
  tennis:{name:'Tennis',icon:'Singles rally',instruction:'Move around the court and press X to serve or return the ball when it is close. First to three points wins.',action:'Serve / Return'},
  volleyball:{name:'Volleyball',icon:'1v1 · serve and spike',instruction:'Move around the court, use Space to jump, and press X to serve or spike the ball when it is close. First to three points wins.',action:'Serve / Spike'},
  badminton:{name:'Badminton',icon:'Singles rally',instruction:'Move around the court and press X to serve or return the shuttle when it is close. First to three points wins.',action:'Serve / Return'}
};

const boxGeometry=new T.BoxGeometry();
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function box(parent,x,y,z,w,h,d,color){
  const mesh=new T.Mesh(boxGeometry,new T.MeshLambertMaterial({color}));
  mesh.userData.sportMaterial=true;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
}
function line(parent,x,z,w,d,color='#dce7dc'){
  return box(parent,x,.09,z,w,.035,d,color);
}
function makeCourt(group,id){
  const racquet=['tennis','volleyball','badminton'].includes(id);
  const goalColor=id==='basketball'?'#f08c62':id==='football'?'#8ed0a4':'#d7e3df';
  if(racquet){
    for(const z of [-14,14])line(group,0,z,23,.12);
    for(const x of [-11.5,11.5])line(group,x,0,.12,28);
    line(group,0,0,.12,28);
    for(const z of [-7,7])line(group,0,z,23,.09);
    box(group,0,.8,0,23,.06,.10,'#e5e9d8');
    for(const x of [-11.1,11.1])box(group,x,.73,0,.14,1.35,.14,'#e5e9d8');
  }else if(id==='basketball'){
    for(const z of [-15,15]){
      box(group,0,3.8,z,4.2,2.1,.16,'#e1e9e2');
      const rim=new T.Mesh(new T.TorusGeometry(.66,.055,8,24),new T.MeshLambertMaterial({color:goalColor}));
      rim.userData.sportMaterial=true;rim.userData.sportGeometry=true;rim.rotation.x=Math.PI/2;rim.position.set(0,3.05,z+(z<0?.65:-.65));group.add(rim);
      box(group,0,1.6,z+(z<0?-.75:.75),4.6,3.2,.18,'#627988');
    }
    for(const x of [-11.5,11.5])line(group,x,0,.12,29);
    for(const z of [-14.5,14.5])line(group,0,z,23,.12);
    line(group,0,0,.1,29);
  }else{
    for(const z of [-15,15]){
      box(group,0,1.65,z,7.2,3.3,.16,goalColor);
      for(const x of [-3.6,3.6])box(group,x,1.65,z,.14,3.4,.15,'#e3e7d8');
      box(group,0,3.34,z,.15,3.45,.15,'#e3e7d8');
    }
    for(const x of [-11.5,11.5])line(group,x,0,.12,29);
    for(const z of [-14.5,14.5])line(group,0,z,23,.12);
    line(group,0,0,.1,29);
  }
}

export function createSportsMatch(scene,id,opponentName){
  const mode=sportModes[id];
  if(!mode)throw new Error(`Unknown sports mode: ${id}`);
  const group=new T.Group();scene.add(group);makeCourt(group,id);
  const rival=person(id==='basketball'?'#e08a5c':id==='football'?'#77ae84':id==='tennis'?'#7d95c5':id==='volleyball'?'#b485c0':'#c5a36d');
  group.add(rival.model);rival.model.position.set(0,.04,-8);rival.model.rotation.y=0;
  const ballGeometry=id==='badminton'?new T.ConeGeometry(.20,.60,8):new T.SphereGeometry(id==='basketball'?.32:id==='football'?.28:id==='volleyball'?.30:.20,16,12);
  const ballMaterial=new T.MeshLambertMaterial({color:id==='basketball'?'#e7854d':id==='football'?'#ece7d9':id==='volleyball'?'#f0d477':id==='badminton'?'#e5eadc':'#dce4ef'});
  const ball=new T.Mesh(ballGeometry,ballMaterial);ball.userData.sportMaterial=true;ball.userData.sportGeometry=true;group.add(ball);ball.visible=false;
  const score={player:0,opponent:0},target=3;
  let state='ready',cooldown=.8,flight=null,elapsed=0,opponentX=0,disposed=false;
  const status=()=>({id,name:mode.name,opponent:opponentName,player:score.player,opponentScore:score.opponent,done:state==='done',winner:score.player>=target?'player':'opponent',message:state==='done'?score.player>=target?'You won the match.':'Your opponent won the match.':state==='ready'?'Move close to the ball and press X.':state==='flight'?'Move to the ball and press X to return it.':`Score ${target} points to win.`});
  const resetBall=(delay=.8)=>{
    flight=null;ball.visible=false;state='ready';cooldown=delay;
  };
  const point=winner=>{
    if(state==='done')return;
    score[winner]++;
    if(score[winner]>=target){state='done';flight=null;ball.visible=false;return}
    resetBall(1.2);
  };
  function launch(owner,x,z,heading,jump=0){
    const toGoal=id==='basketball'||id==='football';
    const direction=heading;
    const speed=id==='basketball'?23:id==='football'?27:id==='badminton'?15:18;
    const startY=(id==='football'?.48:id==='badminton'?2.2:1.25)+(owner==='player'&&id==='volleyball'?Math.min(1.2,jump):0);
    let lift=id==='basketball'?8.1:id==='football'?2.4:id==='badminton'?5.0:id==='volleyball'?6.4:4.7;
    if(toGoal){
      const goalY=id==='basketball'?3.05:1.0,goalZ=owner==='player'?-15:15,
        travelTime=Math.abs(goalZ-z)/speed;
      lift=clamp((goalY-startY+4.905*travelTime*travelTime)/travelTime,1.3,9.5);
    }
    ball.position.set(x,startY,z);
    if(id==='badminton')ball.rotation.x=Math.PI;
    ball.visible=true;
    flight={owner,x,z,y:ball.position.y,vx:Math.sin(direction)*speed,vz:-Math.cos(direction)*speed,vy:lift,goal:toGoal};
    state='flight';
  }
  function action(x,z,heading,jump=0){
    if(disposed||state==='done'||cooldown>0)return false;
    if(flight){
      if(flight.owner==='player')return false;
      const d=Math.hypot(x-flight.x,z-flight.z);
      if(d>(id==='badminton'?3.2:3.8)||flight.y>4.5)return false;
      launch('player',x,z,heading,jump);return true;
    }
    const d=Math.hypot(x-ball.position.x,z-ball.position.z);
    if(state==='ready'&&ball.visible&&d>3.8)return false;
    launch('player',x,z,heading,jump);return true;
  }
  function step(dt,x,z){
    if(disposed)return status();
    elapsed+=dt;cooldown=Math.max(0,cooldown-dt);
    const courtZ=id==='basketball'||id==='football'?13:8;
    const targetX=flight?.x??x;
    opponentX+=Math.max(-1,Math.min(1,targetX-opponentX))*dt*2.7;
    rival.model.position.set(Math.max(-10,Math.min(10,opponentX)),.04,-courtZ);
    animatePerson(rival,elapsed,Math.abs(targetX-opponentX)>.6?2.4:0);
    if(state==='ready'&&cooldown<=0){
      if(id==='basketball'||id==='football'){
        const aiHeading=Math.PI;
        launch('opponent',opponentX,-courtZ,aiHeading);
      }else{
        const heading=Math.atan2(x-opponentX,-(z+courtZ));
        launch('opponent',opponentX,-courtZ,heading);
      }
    }
    if(!flight)return status();
    flight.x+=flight.vx*dt;flight.z+=flight.vz*dt;flight.y+=flight.vy*dt;flight.vy-=9.81*dt;
    ball.position.set(flight.x,Math.max(.18,flight.y),flight.z);
    if(id==='badminton')ball.rotation.z=Math.atan2(flight.vx,-flight.vz);
    if(flight.goal){
      const goalZ=flight.owner==='player'?-15:15,atGoal=(goalZ<0&&flight.vz<0&&flight.z<=goalZ)||(goalZ>0&&flight.vz>0&&flight.z>=goalZ);
      if(atGoal){
        const yGood=id==='basketball'?flight.y>2.65&&flight.y<3.55:flight.y<3.2;
        const xGood=Math.abs(flight.x)<(id==='basketball'?.72:3.25);
        point((yGood&&xGood)?flight.owner:flight.owner==='player'?'opponent':'player');return status();
      }
    }else if(flight.owner==='opponent'&&flight.z>=courtZ&&flight.vz>0){
      point('opponent');return status();
    }else if(flight.owner==='player'&&flight.z<=-courtZ&&flight.vz<0){
      const canReach=Math.abs(opponentX-flight.x)<2.7&&flight.y<3.6&&Math.sin(elapsed*1.17+2.1)>-.85;
      if(canReach){
        const heading=Math.atan2(x-opponentX,-(z+courtZ));
        launch('opponent',opponentX,-courtZ,heading);
        return status();
      }
      point('player');return status();
    }
    if(flight.y<=.2||Math.abs(flight.x)>12||Math.abs(flight.z)>17){
      if(flight.goal)point(flight.owner==='player'?'opponent':'player');
      else point((flight.owner==='player'&&flight.z<0)||(flight.owner==='opponent'&&flight.z>0)?flight.owner:flight.owner==='player'?'opponent':'player');
    }
    return status();
  }
  return {
    action,
    step,
    status,
    dispose(){if(disposed)return;disposed=true;scene.remove(group);group.traverse(o=>{if(o.userData.sportGeometry)o.geometry.dispose();if(o.userData.sportMaterial)o.material.dispose()})}
  };
}
