// Handling presets and timed abilities are used by the player-controlled physics.
const chassis={
  car:{kind:'road',model:'car',variants:[
    ['volt','Volt Roadster',92,'#7ae5bd','launch','Quick-start torque under 40 km/h',1.06,1.03],
    ['rally','Rally Roadster',104,'#f4b178','grip','Sticky tires on sand or gravel',.98,1.15],
    ['silk','Silk Roadster',110,'#b6a5ec','slip','A controllable slide, even without the handbrake',1.1,1.12]]},
  sport:{kind:'road',model:'sport',variants:[
    ['apex','Apex Coupe',116,'#91c8ee','cornering','Extra grip while steering through a turn',1.24,1.08],
    ['ghost','Ghost Coupe',124,'#af9ef4','race-drift','Longer sustained drift',1.3,1.10],
    ['tailwind','Tailwind Coupe',138,'#eaac7a','passing-burst','Speed burst while accelerating out of a turn',1.27,1.02]]},
  van:{kind:'road',model:'van',variants:[
    ['cargo','Cargo Mule Van',69,'#c7a976','buffer','Soft impact buffer',.76,.9],
    ['marshal','Marshal Van',85,'#f5d9a3','anchor','Reinforced braking under load',.8,.95],
    ['tracker','Tracker Van',98,'#a2dfa9','terrain-lock','Loose-surface traction',.84,1.02]]},
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
    ['dock','Dockhand Yacht',107,'#aecef0','dock-rudder','Sharper turns while docking',1,1.15],
    ['manta','Manta Cruiser',125,'#d2b3eb','current-anchor','Station keeping in currents',1.19,1.05]]},
  train:{kind:'rail',model:'train',variants:[
    ['electro','Electroliner',85,'#aad7e4','rail-sprint','Short traction boost',1.10,1],
    ['regen','Regent Railcar',100,'#edc9a1','regen','Brake hard without reversing',.93,1],
    ['switch','Switchback Railcar',114,'#97deb4','shunt','Caps speed for slow automated shunting',1.02,1]]},
  bike:{kind:'road',model:'bike',variants:[
    ['velobike','Velo Bike',48,'#83e1aa','bank','Sharper steering for narrow corners',.85,1.4],
    ['scrambler','Scrambler Bike',67,'#edb47c','scrambler-grip','Traction on loose roadside surfaces',.90,1.25],
    ['sprintbike','Sprint Bike',90,'#abb5f0','corner-launch','Fast acceleration out of corners',1.08,1.33]]},
  rover:{kind:'road',model:'rover',variants:[
    ['survey','Survey Rover',60,'#e0b99a','impact-cushion','Reduced collision recoil',.65,1.01],
    ['duner','Dune Rover',79,'#eed2a3','sand-skim','Grip on gravel and sand',.75,1.15],
    ['rescue','Rescue Rover',99,'#d1a9dc','rescue-brake','Emergency stopping assistance',.83,1.12]]},
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
    ['metrotram','Metro Tram',76,'#a2b8eb','metro-regen','Stops precisely with electric braking',.72,1],
    ['ridge','Ridge Tram',97,'#f2bb88','climb','Maintains traction on track gradients',.78,1]]}
};
chassis.bus={kind:'road',model:'bus',variants:[
  ['citycoach','City Coach',88,'#9ccf9d','bus-airbrake','Hard air braking for quick controlled stops',.78,.82],
  ['expressbus','Express Coach',109,'#e4c47f','bus-turbo','Temporary acceleration boost on straight roads',.96,.88],
  ['ridgebus','Ridge Bus',121,'#93b7d9','bus-allterrain','Maintains traction away from paved roads',.88,1.02]]};
chassis.taxi={kind:'road',model:'taxi',variants:[
  ['metercab','Meter Cab',66,'#f1c36e','taxi-drift','Extended controlled slide through corners',.96,1.16],
  ['silkcab','Silk Cab',82,'#e6d49b','taxi-sprint','Raises top speed for a short express run',1.04,1.22],
  ['nightcab','Night Cab',103,'#b3a5dc','taxi-evasion','Briefly sharpens steering and absorbs impacts',1.1,1.2]]};
chassis.ferry={kind:'boat',model:'ferry',variants:[
  ['harborferry','Harbor Ferry',118,'#80c9d0','ferryfoil','Hydrofoil lift and a stronger open-water speed cap',1.05,.94],
  ['swiftferry','Swift Ferry',146,'#9ddfc7','ferry-turn','Sharper rudder response at low speed',1.18,1.2],
  ['steadferry','Steadfast Ferry',159,'#e4c38d','ferry-stabilize','Cancels wave roll and damps drift',.92,1.02]]};
export const fleetProducts=Object.fromEntries(Object.entries(chassis).flatMap(([family,{kind,model,variants}])=>variants.map(
  ([id,name,price,color,ability,info,power,steer],variant)=>[id,{family,kind,chassis:model,model:id,variant,name,price,color,ability,info:`${info}. Press H to activate.`,power,steer}]
)));
export const aircraft=Object.keys(fleetProducts).filter(id=>fleetProducts[id].kind==='air');
