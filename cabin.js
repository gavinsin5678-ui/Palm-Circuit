import * as T from './vendor/three.module.min.js';

export const seats={
  Economy:{seat:'Standard fabric seat',food:'Trail mix and chilled water',drink:'Water',size:'Snack',screen:'',color:'#85b4c7'},
  Business:{seat:'Wide reclining seat · VIP service',food:'Hot flatbread, side salad and citrus spritz',drink:'Citrus spritz',size:'Two courses',screen:'Compact TV',color:'#83d7be'},
  'First Class':{seat:'Private lie-flat suite · VIP service',food:'Three-course tasting tray with dessert and sparkling juice',drink:'Sparkling juice',size:'Three courses',screen:'Large suite TV',color:'#f1c889'}
};
export const cabinLevel=name=>name==='First Class'?2:name==='Business'?1:0;
export const cabinService=type=>['airport','rail','bus'].includes(type);
export const cabinTitle=type=>type==='airport'?'Pacifica Air':type==='rail'?'Coastal Rail':'CityLink Coaches';
const geo=new T.BoxGeometry();
export function makePassengerCabins(camera){
  const models={};
  for(const type of ['airport','rail','bus'])for(let level=0;level<3;level++){
    const g=new T.Group();camera.add(g);g.visible=false;models[type+level]=g;
    const body=type==='airport'?'#4c667b':type==='rail'?'#3c6d72':'#657881';
    const cover=['#4d677c','#376b62','#674e52'][level], trim=['#8cabb7','#79d5b5','#edbf82'][level];
    const block=(x,y,z,w,h,d,c)=>{
      const o=new T.Mesh(geo,new T.MeshBasicMaterial({color:c}));o.position.set(x,y,z);o.scale.set(w,h,d);g.add(o);return o
    };
    const ws=type==='bus'?1.32:type==='rail'?1.55:1.64;
    block(0,.83,-1.61,3.5,.23,.46,body);block(0,-.80,-1.62,3.65,.42,.46,body);
    const a=type==='rail'?.12:type==='airport'?.25:.045;
    for(const s of [-1,1]){
      block(s*ws,.04,-1.54,.16,1.64,.34,body).rotation.z=s*a;
      const x=s*(.91+level*.095),w=.36+level*.15;
      block(x,-.51,-1.42,w,.14,.57,cover);
      block(x,-.28,-1.66,w,.54,.14,cover).rotation.x=level*-.15;
      block(x,-.009,-1.67,w*.67,.15,.14,trim);
      block(x+s*.22,-.40,-1.43,.12+level*.08,.09,.46,trim);
      block(s*1.33,.66,-1.56,.16,.06,.24,trim);
      if(level===2)block(s*1.24,-.09,-1.7,.16,.66,.5,cover);
    }
    if(level){
      const sz=level===2?.56:.31;
      block(.73,-.13,-1.95,sz+.09,sz*.64+.07,.08,'#192b36');
      block(.73,-.12,-1.906,sz,sz*.64,.022,trim);
      block(.73,-.16,-1.893,sz*.75,.022,.011,'#516f78');
    }
  }
  return {draw(type,level,show){for(const [key,model] of Object.entries(models))model.visible=show&&key===type+level}};
}
