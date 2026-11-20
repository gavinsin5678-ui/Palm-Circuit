// Handling presets and timed abilities are used by the player-controlled physics.
const chassis={
  car:{kind:'road',model:'car',variants:[
    ['volt','Volt Roadster',92,'#7ae5bd','launch','Quick-start torque under 40 km/h',1.06,1.03],
    ['rally','Rally Roadster',104,'#f4b178','grip','Sticky tires on sand or gravel',.98,1.15],
    ['silk','Silk Roadster',110,'#b6a5ec','slip','A controllable slide, even without the handbrake',1.1,1.12]]},
  sport:{kind:'road',model:'sport',variants:[
    ['apex','Apex Coupe',116,'#91c8ee','grip','Corner grip with reduced lateral slip',1.24,1.08],
    ['ghost','Ghost Coupe',124,'#af9ef4','slip','Longer sustained drift',1.3,1.10],
    ['tailwind','Tailwind Coupe',138,'#eaac7a','launch','Fast throttle response at low speed',1.27,1.02]]},
  van:{kind:'road',model:'van',variants:[
    ['cargo','Cargo Mule Van',69,'#c7a976','buffer','Soft impact buffer',.76,.9],
    ['marshal','Marshal Van',85,'#f5d9a3','anchor','Reinforced braking under load',.8,.95],
    ['tracker','Tracker Van',98,'#a2dfa9','grip','Loose-surface traction',.84,1.02]]},
  plane:{kind:'air',model:'plane',variants:[
    ['thermal','Thermal Glider',45,'#c9e6db','soar','Climb assist with a wide, high-lift wing',.87,.82],
    ['sprintjet','Sprintjet',108,'#adc0eb','afterburn','Short high-speed cruise boost',1.27,1.02],
    ['trimotor','TriStar Courier',142,'#edc28a','stabilize','Automatic bank damping for approaches',1.05,.91]]},
  boat:{kind:'boat',model:'boat',variants:[
    ['dart','Dart Jetboat',75,'#f8aa9f','skim','Stronger acceleration across chop',1.15,1.02],
    ['spin','Spinline Runabout',88,'#9ed9e0','rudder','Tight low-speed turns',1.05,1.24],
    ['hold','Harbor Holding Boat',96,'#d6ca96','hold','Water brake holds the craft on station',.96,1.04]]},
  yacht:{kind:'boat',model:'yacht',variants:[
    ['cat','Tandem Catamaran',92,'#9edfd6','steady','Suppresses wave motion for a steadier deck',1.09,1.09],
    ['dock','Dockhand Yacht',107,'#aecef0','rudder','Sharper turns while docking',1,1.15],
    ['manta','Manta Cruiser',125,'#d2b3eb','hold','Station keeping in currents',1.19,1.05]]},
  train:{kind:'rail',model:'train',variants:[
    ['electro','Electroliner',85,'#aad7e4','rail-sprint','Short traction boost',1.10,1],
    ['regen','Regent Railcar',100,'#edc9a1','regen','Brake hard without reversing',.93,1],
    ['switch','Switchback Railcar',114,'#97deb4','shunt','Caps speed for slow automated shunting',1.02,1]]},
  bike:{kind:'road',model:'bike',variants:[
    ['velobike','Velo Bike',48,'#83e1aa','bank','Sharper steering for narrow corners',.85,1.4],
    ['scrambler','Scrambler Bike',67,'#edb47c','grip','Traction on loose roadside surfaces',.90,1.25],
    ['sprintbike','Sprint Bike',90,'#abb5f0','launch','Fast acceleration out of corners',1.08,1.33]]},
  rover:{kind:'road',model:'rover',variants:[
    ['survey','Survey Rover',60,'#e0b99a','buffer','Reduced collision recoil',.65,1.01],
    ['duner','Dune Rover',79,'#eed2a3','grip','Grip on gravel and sand',.75,1.15],
    ['rescue','Rescue Rover',99,'#d1a9dc','anchor','Emergency stopping assistance',.83,1.12]]},
  sub:{kind:'boat',model:'sub',variants:[
    ['pearl','Pearl Submersible',74,'#f2c988','dive','A shallow dive and quick resurfacing',.59,.9],
    ['echo','Echo Submersible',91,'#a6dcd9','scan','Pings nearby ferry piers from the water',.67,1.1],
    ['abyss','Abyss Submersible',125,'#c7b4ed','deep','A longer, deeper dive',.72,1]]},
  float:{kind:'air',model:'float',variants:[
    ['skipper','Skipper Floatplane',75,'#e5a281','floats','Float gear for a low-speed water landing',.91,.95],
    ['albatross','Albatross Floatplane',97,'#9ccbc6','glide','A shallow glide at idle power',.90,.90],
    ['otter','Otter Floatplane',122,'#94b8e8','short','Reduced liftoff speed for short runways',1.02,1.03]]},
  tram:{kind:'rail',model:'tram',variants:[
    ['civic','Civic Tram',51,'#98ead3','station','Highlights the closest train station',.63,1],
    ['metrotram','Metro Tram',76,'#a2b8eb','regen','Stops precisely with electric braking',.72,1],
    ['ridge','Ridge Tram',97,'#f2bb88','climb','Maintains traction on track gradients',.78,1]]}
};
export const fleetProducts=Object.fromEntries(Object.entries(chassis).flatMap(([family,{kind,model,variants}])=>variants.map(
  ([id,name,price,color,ability,info,power,steer])=>[id,{family,kind,model,name,price,color,ability,info:`${info}. Press H to activate.`,power,steer}]
)));
export const aircraft=Object.keys(fleetProducts).filter(id=>fleetProducts[id].kind==='air');
export const servicePackages={
  bus:[
    {name:'Local Coach',extra:0,info:'Regular trip',pace:1},
    {name:'Express Coach',extra:4,info:'Shorter ride time',pace:.74},
    {name:'Panorama Coach',extra:7,info:'Longer ride with a detour on local routes',pace:1.25,scenic:true}],
  taxi:[
    {name:'City Meter',extra:0,info:'Regular city ride',pace:1},
    {name:'Express Cab',extra:5,info:'Faster trip',pace:.76},
    {name:'Scenic Taxi',extra:8,info:'Slower ride with a city detour',pace:1.23,scenic:true}],
  ferry:[
    {name:'Harbor Ferry',extra:0,info:'Regular crossing',pace:1},
    {name:'Hydrofoil Express',extra:8,info:'Faster crossing on raised foils',pace:.73,foil:true},
    {name:'Bay Observation Cruise',extra:12,info:'Extended open-water route',pace:1.26,scenic:true}]
};
