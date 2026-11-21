const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function stepSpringDamper(position,velocity,target,stiffness,damping,dt,maxVelocity=2.2){
  const nextVelocity=clamp(velocity+(target-position)*stiffness*dt-velocity*damping*dt,-maxVelocity,maxVelocity);
  return {position:position+nextVelocity*dt,velocity:nextVelocity};
}

export function flightEnvelope(speed,bank,baseStallSpeed){
  const stallSpeed=baseStallSpeed*Math.sqrt(1/Math.max(.35,Math.cos(bank)));
  const ratio=clamp(speed/stallSpeed,0,1);
  const stalled=speed<stallSpeed;
  return {
    stallSpeed,
    stalled,
    control:.25+.75*ratio,
    sink:stalled ? .65+(stallSpeed-speed)*.5 : 0
  };
}

export function coordinatedTurnRate(speed,bank,minSpeed){
  return 9.81*Math.tan(bank)/Math.max(Math.abs(speed),minSpeed);
}

export function stepWatercraft(state,controls,dt){
  const {x,z,heading,vx,vz}=state;
  const {
    throttle,reverse,brake,steer,acceleration,reverseAcceleration,brakeAcceleration,
    maxSpeed,reverseLimit,steerRate,rudder,waveAlong,waveAcross,time
  }=controls;
  const forwardX=Math.sin(heading),forwardZ=-Math.cos(heading);
  const sideX=Math.cos(heading),sideZ=Math.sin(heading);
  let surge=vx*forwardX+vz*forwardZ;
  let sway=vx*sideX+vz*sideZ;

  if(throttle)surge+=acceleration*dt;
  if(reverse)surge-=(surge>0?brakeAcceleration:reverseAcceleration)*dt;
  if(brake)surge-=Math.sign(surge)*brakeAcceleration*dt;
  const chop=1+Math.min(.35,Math.abs(waveAlong)*2.6);
  surge-=Math.sign(surge)*(.12+surge*surge*.0045)*chop*dt;
  surge=clamp(surge,-reverseLimit,maxSpeed);

  const headingNext=(heading+steer*steerRate*rudder*Math.min(1,Math.abs(surge)/5)*Math.sign(surge)*dt+Math.PI*2)%(Math.PI*2);
  sway+=waveAcross*.32*dt;
  sway*=Math.exp(-dt*(1.25+Math.abs(surge)*.035));
  const nextForwardX=Math.sin(headingNext),nextForwardZ=-Math.cos(headingNext);
  const nextSideX=Math.cos(headingNext),nextSideZ=Math.sin(headingNext);
  const nextVx=nextForwardX*surge+nextSideX*sway;
  const nextVz=nextForwardZ*surge+nextSideZ*sway;
  const currentX=Math.sin(z*.012+time*.12)*.12;
  const currentZ=Math.cos(x*.011-time*.10)*.10;

  return {
    x:x+(nextVx+currentX)*dt,
    z:z+(nextVz+currentZ)*dt,
    heading:headingNext,
    speed:Math.sign(surge||1)*Math.hypot(surge,sway),
    vx:nextVx,
    vz:nextVz
  };
}
