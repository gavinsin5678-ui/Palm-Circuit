const NS='http://www.w3.org/2000/svg';
function shape(name,attrs={}){const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n}
const modes={
  basketball:{name:'Basketball',icon:'01',instruction:'Time the release when the meter is close to the mint band. Land three of five shots to win $45.',court:'#9b604b',line:'#edbb9c',ball:'#f4a06a',target:.51},
  football:{name:'Football',icon:'02',instruction:'Time the strike on the mint band to send the ball away from the moving keeper. Score three of five for $45.',court:'#365d3f',line:'#c0d2a8',ball:'#f2e9d3',target:.53},
  tennis:{name:'Tennis',icon:'03',instruction:'Return the incoming ball as it reaches the mint band. Make three of five returns to win $45.',court:'#344f76',line:'#aec5e4',ball:'#dcee7a',target:.67}
};
const line=(x1,y1,x2,y2,stroke='#f0e9d0',w=2)=>shape('line',{x1,y1,x2,y2,stroke,'stroke-width':w});
const rect=(x,y,w,h,fill,other={})=>shape('rect',{x,y,width:w,height:h,fill,...other});
const circle=(cx,cy,r,fill,other={})=>shape('circle',{cx,cy,r,fill,...other});
const text=(x,y,val,attrs={})=>{const n=shape('text',{x,y,fill:'#e9f2ee','font-size':14,'font-weight':700,'text-anchor':'middle',...attrs});n.textContent=val;return n};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

export function sportsCard(id,pay){
  const mode=modes[id], root=document.createElement('div');
  const svg=shape('svg',{viewBox:'0 0 640 313',class:'sport-court',role:'img','aria-label':`${mode.name} court and timing meter`});
  const scoreboard=document.createElement('p');scoreboard.className='sport-status';scoreboard.setAttribute('aria-live','polite');
  const shoot=document.createElement('button');shoot.className='launch sport-action';
  shoot.textContent=id==='basketball'?'Release shot':id==='football'?'Take shot':'Return ball';
  root.append(scoreboard,svg,shoot);
  svg.append(rect(0,0,640,313,'#14252f'),rect(14,14,612,238,mode.court,{rx:8}),rect(39,31,562,207,'none',{stroke:mode.line,'stroke-width':2,rx:4}));
  const shadow=shape('ellipse',{cx:320,cy:216,rx:17,ry:4,fill:'#18222b55'}),ball=circle(320,208,10,mode.ball,{stroke:'#25313b','stroke-width':2});
  let keeper=null,racket=null,hit=0,round=0,feedback='Get ready',time=0,travel=0,success=false,angle=0,finished=false,resultPaid=false,started=false;
  if(id==='basketball'){
    svg.append(line(0,176,640,176,mode.line,3),shape('path',{d:'M172 237L245 159H395L468 237 M205 218Q318 154 435 218',stroke:mode.line,'stroke-width':3,fill:'none'}),rect(309,52,22,102,'#526171'),rect(267,49,106,68,'#d3dce1',{rx:4,stroke:'#263746','stroke-width':4}),rect(298,68,44,32,'none',{stroke:'#555e65','stroke-width':3}),shape('path',{d:'M294 102Q320 91 346 102L336 128H304Z',fill:'#e9ecdc65',stroke:'#e9ecdc','stroke-width':2}),shape('ellipse',{cx:320,cy:102,rx:27,ry:6,fill:'none',stroke:'#e77452','stroke-width':5}));
  }else if(id==='football'){
    const net=rect(199,47,242,94,'#244337',{stroke:'#ecf0de','stroke-width':5});svg.append(net);
    for(let x=209;x<440;x+=17)svg.append(line(x,50,x,138,'#c6d5bc',.72));
    for(let y=58;y<140;y+=13)svg.append(line(201,y,439,y,'#c6d5bc',.72));
    svg.append(shape('path',{d:'M122 218L169 147H469L518 218 M230 221Q320 178 410 221',stroke:mode.line,'stroke-width':2,fill:'none'}));
    keeper=shape('g');keeper.append(circle(0,-27,8,'#dca17c'),rect(-11,-19,22,26,'#e9a958',{rx:4}),line(-9,-13,-22,-19,'#e9a958',6),line(9,-13,22,-19,'#e9a958',6),line(-6,5,-10,16,'#293947',5),line(6,5,10,16,'#293947',5));svg.append(keeper);
  }else{
    svg.append(shape('path',{d:'M122 237L202 39H438L518 237 M162 137H478 M320 137V237 M209 83H431',stroke:mode.line,'stroke-width':2.8,fill:'none'}));
    for(let x=164;x<478;x+=14)svg.append(line(x,115,x,136,'#e3edf3aa',1));
    svg.append(line(152,115,488,115,'#eaf4f2',3),line(152,138,488,138,'#baced9',1),line(152,113,152,145,'#eaf4f2',4),line(488,113,488,145,'#eaf4f2',4));
    racket=shape('g');racket.append(line(0,0,0,26,'#e9af7e',4),shape('ellipse',{cx:0,cy:-10,rx:11,ry:16,fill:'#e1f1ef66',stroke:'#f1bd89','stroke-width':4}));svg.append(racket);
  }
  svg.append(shadow,ball);
  svg.append(rect(65,272,510,13,'#2d4451',{rx:6}),text(320,306,'TIMING WINDOW',{fill:'#abc2c4','font-size':11,'letter-spacing':2.4}));
  const zone=rect(320,272,50,13,'#8ee2be',{rx:5}),dot=rect(65,266,5,25,'#f7e7bc',{rx:2});svg.append(zone,dot);
  const windowCenter=()=>clamp(mode.target+Math.sin(round*2.1)*.115,.27,.79);
  const position=()=>{const q=(time*(.53+round*.034)+.13)%2;return q<=1?q:2-q};
  function refresh(){
    const caption=finished?`${hit} of 5 · ${hit>=3?'Challenge won · $45 prize':'Round complete · Try for three'}`:`${hit} scored · Attempt ${round+1}/5 · ${feedback}`;
    if(scoreboard.textContent!==caption)scoreboard.textContent=caption;
    zone.setAttribute('x',65+510*windowCenter()-29);zone.setAttribute('width',58);dot.setAttribute('x',65+510*position());
    if(keeper)keeper.setAttribute('transform',`translate(${320+Math.sin(time*5.1)*65} 117)`);
    if(racket)racket.setAttribute('transform',`translate(${365-Math.sin(time*3.4)*40} 204) rotate(${travel>0?25:8})`);
    let x=320,y=id==='tennis'?65+position()*150:211;
    if(travel>0){
      const p=clamp(travel/.53,0,1);
      x+=angle*p*122;
      y=211-(id==='basketball'?107:99)*p-Math.sin(p*Math.PI)*(id==='basketball'?66:26);
    }
    ball.setAttribute('cx',x);ball.setAttribute('cy',y);ball.setAttribute('r',10-(210-y)*.029);
    shadow.setAttribute('cx',x);shadow.setAttribute('cy',Math.min(226,y+16));
  }
  function action(){
    if(finished){hit=round=0;feedback='New round';time=travel=0;finished=false;resultPaid=false;shoot.textContent=id==='basketball'?'Release shot':id==='football'?'Take shot':'Return ball';refresh();return}
    if(travel>0)return;
    const p=position(),center=windowCenter();
    success=Math.abs(p-center)<.113;
    angle=id==='football'?(Math.sin(time*5.1)>0?-1:1)*(success?.80:1.45):success?.025:(p>center?.65:-.65);
    travel=.001;started=true;feedback='Ball in play';
  }
  function step(dt){
    if(finished)return;
    if(travel>0){
      travel+=dt;
      if(travel>.61){
        hit+=Number(success);round++;feedback=success?(id==='tennis'?'Clean return':'On target'):(id==='football'?'Shot saved':'Missed');
        travel=0;
        if(round===5){finished=true;shoot.textContent='Play again';if(hit>=3&&!resultPaid){resultPaid=true;pay(45)}}
      }
    }else time+=dt;
    refresh();
  }
  shoot.addEventListener('click',action);refresh();
  return {root,step,action,status:()=>({id,round,hit,finished,started,meter:position(),center:windowCenter()})};
}
export const sportModes=modes;
