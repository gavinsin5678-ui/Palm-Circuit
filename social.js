const $=id=>document.getElementById(id);
export function createSocial(state,onChange,onFocus,onTheft=()=>{}){
  const dialog=$('dialogue'), choices=$('dialogue-options'), gifts=new Set(), emptied=new Set(), jobs=new Set();
  const picked=new Set();
  state.economy??={cycle:1,wage:1,prices:{swimFins:30,marketMeal:12},reputation:0,volume:0,transactions:[],npcCash:220};
  let options=[];
  function notice(copy){state.message=copy;state.messageTime=4.2;onChange()}
  function changeCash(n,copy){
    state.cash+=n;
    state.economy.volume+=Math.abs(n);
    state.economy.transactions.unshift({amount:n,label:copy,cycle:state.economy.cycle});
    if(state.economy.transactions.length>24)state.economy.transactions.pop();
    notice(`${n>=0?'+':'−'}$${Math.abs(n)} · ${copy}`);
  }
  function economyIndex(){return clampIndex(state.economy.volume/900)}
  function clampIndex(n){return Math.max(.82,Math.min(1.24,n+.84))}
  function pay(base,reason,reputation=1){
    const wage=Math.round(base*economyIndex()/4)*4;
    state.economy.reputation+=reputation;
    changeCash(wage,reason);
    return wage;
  }
  function show(name,role,line,replies,you=''){
    const wasClosed=dialog.hidden;
    state.dialogue={name,line,you};dialog.hidden=false;
    $('speaker').textContent=name;$('speaker-role').textContent=role;$('speech').textContent=line;
    $('player-line').hidden=!you;$('player-reply').textContent=you;
    options=replies;
    choices.replaceChildren(...replies.map(([label,fn],i)=>{
      const b=document.createElement('button');b.type='button';b.className='reply';
      const key=document.createElement('kbd');key.textContent=String(i+1);
      const caption=document.createElement('span');caption.textContent=label;
      b.append(key,caption);b.addEventListener('click',()=>fn(label));return b;
    }));
    if(wasClosed||document.activeElement===document.body)choices.querySelector('button')?.focus({preventScroll:true});
    onChange();
  }
  function close(focus=true){if(dialog.hidden)return;state.dialogue=null;options=[];dialog.hidden=true;if(focus)onFocus()}
  const bye=['Goodbye.',()=>close()];
  function choose(i){const item=options[i];if(item)item[1](item[0])}
  function talk(npc){
    const {id,name,role,place}=npc;
    const market=place?.kind==='shop'||id==='leo';
    const business=place?.kind==='business';
    const response=(line,you,extra=[])=>show(name,role,line,[...extra,bye],you);
    const list=[];
    const openJob=(label)=>{
      state.job='cleanup';picked.clear();state.collected=0;notice('Job accepted · Beach cleanup');
      response('Look for three pieces of litter past the beach steps. Bring them back to me and I’ll pay you $90.',label);
    };
    if(id==='imani'){
      if(state.job==='available')list.push(['Is there any work going?',openJob]);
      if(state.job==='cleanup')list.push(['Where should I look?',label=>response(`Search the sand near the pier. You’ve collected ${state.collected} of 3.`,label)]);
      if(state.job==='turn-in')list.push(['I cleaned up the beach.',label=>{state.job='done';const payOut=pay(90,'Beach cleanup pay',2);response(`The beach looks better already. The live city wage is $${payOut}.`,label)}]);
    }
    if(business&&!jobs.has(id)){
      list.push(['Do you need a hand?',label=>{
        const payOut=Math.round(42*economyIndex()/2)*2;
        response(`I’ve got an inventory sheet that needs checking. It pays $${payOut} in the current market.`,label,[
          ['Help check the inventory.',reply=>{jobs.add(id);pay(payOut,'Inventory shift',1);response('That’s the last shelf checked. Thanks for your help.',reply)}]
        ]);
      }]);
    }
    if(market&&!state.fins)list.push([`Buy swim fins ($${state.economy.prices.swimFins}).`,label=>{
      const price=state.economy.prices.swimFins;
      if(state.cash<price){response(`You need $${price} for the fins. Come back when you have enough.`,label);return}
      state.fins=true;changeCash(-price,'Swim fins');state.economy.prices.swimFins=Math.min(42,price+2);state.economy.cycle++;
      response('Try them out by the pier. They’ll help you swim faster.',label);
    }]);
    if(!gifts.has(id)&&!market&&!business)list.push(['Could you spare a little cash?',label=>{
      gifts.add(id);
      const base=id==='nico'?25:15;
      const amount=Math.max(8,Math.round(base*(state.economy.reputation>4?1.15:.9)/5)*5);
      if(state.economy.npcCash<amount){response('I’m short of cash right now. I can’t spare any today.',label);return}
      state.economy.npcCash-=amount;changeCash(amount,'Neighborhood gift');
      response(id==='nico'?'Sure. Someone helped me out when I first moved here, too.':'Here you go. Welcome to the neighborhood.',label);
    }]);
    list.push(['What’s nearby?',label=>response(id==='imani'?'The steps beside the pier go straight down to the beach. You can swim to the boats at the end of the dock.':
      market?'My shop, Miramar Market, is north of your home. Look for the door on the south side.':
      'There are shops, homes, and offices all over the city. Walk up to a door and see where it leads.',label)]);
    list.push(bye);
    const greeting=state.heat>0&&id!=='imani'?'People are talking about missing cash. What do you need?':
      id==='imani'?'Hey, I’m Imani. I help look after the marina. Looking for something to do?':
      id==='nico'?'Evening. You picked a good night to visit the waterfront.':
      market?'Welcome. I’ve got swim fins if you’re heading down to the water.':
      business?'Welcome to the office. Are you here about work?':
      'Hi there. Is there something I can help you with?';
    show(name,role,greeting,list);
  }
  function cashDrawer(place){
    const own=place.name==='Your Home';
    const amount=own?35:(place.kind==='shop'?34:place.kind==='business'?58:19)+place.variant*4+Math.round(state.economy.reputation*.8);
    const name=place.kind==='shop'?'The till':'Cash drawer';
    if(emptied.has(place.id)){show(name,place.name,'There’s no cash left here.',[bye]);return}
    show(name,place.name,`${own?'Your spare cash':'Cash inside'}: $${amount}.`,[
      [own?`Collect your $${amount}.`:`Take $${amount}.`,label=>{
        emptied.add(place.id);if(!own)onTheft();
        if(!own){state.economy.npcCash=Math.max(0,state.economy.npcCash-amount);state.economy.cycle++}
        changeCash(amount,own?'Home savings':'Cash taken');
        show(name,place.name,own?'You added your savings to your wallet.':'The cash is in your wallet. The theft was added to your bounty ledger.',[bye],label);
      }],
      ['Leave it alone.',()=>close()]
    ]);
  }
  function collect(item){
    if(state.job!=='cleanup'||picked.has(item.id))return;
    picked.add(item.id);state.collected=picked.size;state.economy.reputation++;
    if(state.collected===3){state.job='turn-in';notice('Cleanup complete · Return to Imani')}
    else notice(`Litter picked up · ${state.collected} / 3`);
  }
  $('dialogue-close').addEventListener('click',()=>close());
  return {talk,cashDrawer,close,choose,picked,collect,changeCash,notice,
    economy:()=>({...state.economy,transactions:[...state.economy.transactions],index:Number(economyIndex().toFixed(2))})};
}
