window.SR = window.SR || {};

(function (SR) {
  // 1. PLAYSTYLE AFFINITIES (Type Triangle: POWER > GRIT > SPEED > TECH > POWER)
  SR.AFFINITIES = {
    POWER: { id: 'POWER', name: 'Power', icon: 'PWR', color: '#ff595e', beats: 'GRIT' },
    GRIT:  { id: 'GRIT',  name: 'Grit',  icon: 'GRT', color: '#8ac926', beats: 'SPEED' },
    SPEED: { id: 'SPEED', name: 'Speed', icon: 'SPD', color: '#ffca3a', beats: 'TECH' },
    TECH:  { id: 'TECH',  name: 'Tech',  icon: 'TCH', color: '#4cc9f0', beats: 'POWER' }
  };

  SR.getAffinityAdvantage = function (atkAff, defAff) {
    if (!atkAff || !defAff) return { mult: 1.0, tag: '' };
    const a = SR.AFFINITIES[atkAff];
    const d = SR.AFFINITIES[defAff];
    if (!a || !d) return { mult: 1.0, tag: '' };
    if (a.beats === defAff) return { mult: 1.22, tag: `${a.name} > ${d.name} (+22%)` };
    if (d.beats === atkAff) return { mult: 0.85, tag: `${d.name} resists ${a.name} (-15%)` };
    return { mult: 1.0, tag: '' };
  };

  // 2. SPECIAL SKILLS DATABASE
  SR.SKILLS = {
    // Offensive Skills
    FIRE_VOLLEY: {
      id: 'FIRE_VOLLEY', name: 'Fire Volley', type: 'SHOOT', cost: 20, mult: 1.45,
      color: '#ff595e', desc: 'Blazing cannon shot (+45% SHO power).'
    },
    CYCLONE_DRIVE: {
      id: 'CYCLONE_DRIVE', name: 'Cyclone Drive', type: 'SHOOT', cost: 22, mult: 1.50,
      color: '#4cc9f0', desc: 'Spinning wind shot that curves past keepers (+50% SHO).'
    },
    THUNDER_BOLT: {
      id: 'THUNDER_BOLT', name: 'Thunder Strike', type: 'SHOOT', cost: 25, mult: 1.55,
      color: '#ffca3a', desc: 'High-voltage long-range thunderbolt (+55% SHO).'
    },
    PHANTOM_STEP: {
      id: 'PHANTOM_STEP', name: 'Phantom Step', type: 'DRIBBLE', cost: 16, mult: 1.42,
      color: '#b5179e', desc: 'After-image feint to slip past tacklers (+42% DRI).'
    },
    SONIC_BURST: {
      id: 'SONIC_BURST', name: 'Sonic Dash', type: 'DRIBBLE', cost: 15, mult: 1.40,
      color: '#ffca3a', desc: 'Explosive sprint down the wing (+40% DRI).'
    },
    BULLDOZER_RUN: {
      id: 'BULLDOZER_RUN', name: 'Titan Charge', type: 'DRIBBLE', cost: 18, mult: 1.44,
      color: '#ff595e', desc: 'Powers straight through defenders (+44% DRI).'
    },
    LASER_PASS: {
      id: 'LASER_PASS', name: 'Laser Through', type: 'PASS', cost: 15, mult: 1.42,
      color: '#06d6a0', desc: 'Pinpoint needle pass (+42% PAS & extra receiver boost).'
    },
    VELVET_CROSS: {
      id: 'VELVET_CROSS', name: 'Golden Arc', type: 'PASS', cost: 16, mult: 1.45,
      color: '#ffd166', desc: 'Lofted playmaker pass (+45% PAS).'
    },

    // Defensive & Goalkeeper Skills
    IRON_SLIDE: {
      id: 'IRON_SLIDE', name: 'Spiked Slide', type: 'TACKLE', cost: 16, mult: 1.42,
      color: '#8ac926', desc: 'Earth-shaking sliding tackle (+42% TAC).'
    },
    CRUSHER_PRESS: {
      id: 'CRUSHER_PRESS', name: 'Giga Press', type: 'TACKLE', cost: 18, mult: 1.46,
      color: '#ff595e', desc: 'Relentless body check to strip the ball (+46% TAC).'
    },
    HAWK_INTERCEPT: {
      id: 'HAWK_INTERCEPT', name: 'Hawk Eye Cut', type: 'INTERCEPT', cost: 15, mult: 1.44,
      color: '#4cc9f0', desc: 'Reads the passing lane before it happens (+44% INT).'
    },
    AEGIS_WALL: {
      id: 'AEGIS_WALL', name: 'Aegis Wall', type: 'BLOCK', cost: 16, mult: 1.45,
      color: '#8ac926', desc: 'Steel defensive block that slashes shot power by 55%.'
    },
    GOD_HAND: {
      id: 'GOD_HAND', name: 'Titan Catch', type: 'GK', cost: 18, mult: 1.45,
      color: '#ffd166', desc: 'Giant glowing aura catch (+45% GK save power).'
    },
    NOVA_PUNCH: {
      id: 'NOVA_PUNCH', name: 'Nova Fist', type: 'GK', cost: 20, mult: 1.52,
      color: '#ff595e', desc: 'Explosive two-fisted punch clear (+52% GK save power).'
    }
  };

  // 3. HELPER TO CREATE A PLAYER INSTANCE
  let nextUid = 100;
  SR.createPlayer = function (tpl, levelBoost) {
    const lv = (tpl.level || 1) + (levelBoost || 0);
    const scale = 1 + (lv - 1) * 0.1;
    const maxSta = Math.round((tpl.sta || 65) + (lv - 1) * 5);
    return {
      uid: 'p_' + (nextUid++),
      name: tpl.name,
      role: tpl.role, // 'GK', 'DEF', 'MID', 'FWD'
      affinity: tpl.affinity || 'SPEED',
      level: lv,
      xp: 0,
      xpNext: lv * 40,
      sta: maxSta,
      maxSta: maxSta,
      dri: Math.round((tpl.dri || 14) * scale),
      pas: Math.round((tpl.pas || 14) * scale),
      sho: Math.round((tpl.sho || 14) * scale),
      tac: Math.round((tpl.tac || 14) * scale),
      int: Math.round((tpl.int || 14) * scale),
      gk:  Math.round((tpl.gk  || 10) * scale),
      skills: tpl.skills ? tpl.skills.slice() : ['SONIC_BURST'],
      skin: tpl.skin || '#f4c29f',
      hair: tpl.hair || '#2b2d42',
      cost: tpl.cost || 80,
      bio: tpl.bio || 'Hungry street footballer looking for glory.'
    };
  };

  // 4. STARTER SQUAD (5 Active Starters: GK, DEF, MID-L, MID-R, FWD + 1 Bench Sub)
  SR.STARTER_TEMPLATES = [
    {
      name: 'Bram', role: 'GK', affinity: 'GRIT', level: 1, sta: 75,
      dri: 10, pas: 14, sho: 8, tac: 15, int: 15, gk: 24,
      skills: ['GOD_HAND'], skin: '#f1c27d', hair: '#d90429',
      bio: 'Fearless street keeper who trained stopping cannonballs at the docks.'
    },
    {
      name: 'Rocco', role: 'DEF', affinity: 'GRIT', level: 1, sta: 72,
      dri: 13, pas: 15, sho: 11, tac: 22, int: 19, gk: 12,
      skills: ['IRON_SLIDE', 'AEGIS_WALL'], skin: '#8d5524', hair: '#1a1a1a',
      bio: 'No-nonsense sweeper known as the Rustyard Brick Wall.'
    },
    {
      name: 'Leo (Capt)', role: 'MID', affinity: 'TECH', level: 1, sta: 78,
      dri: 20, pas: 22, sho: 18, tac: 16, int: 18, gk: 10,
      skills: ['LASER_PASS', 'PHANTOM_STEP'], skin: '#f4c29f', hair: '#3a86ff',
      bio: 'Team captain with 360-degree pitch vision and relentless drive.'
    },
    {
      name: 'Mina', role: 'MID', affinity: 'SPEED', level: 1, sta: 74,
      dri: 21, pas: 19, sho: 15, tac: 15, int: 20, gk: 9,
      skills: ['SONIC_BURST', 'HAWK_INTERCEPT'], skin: '#ffdbac', hair: '#ff006e',
      bio: 'Lightning-quick box-to-box winger who intercepts passes in a blink.'
    },
    {
      name: 'Axel', role: 'FWD', affinity: 'POWER', level: 1, sta: 72,
      dri: 19, pas: 14, sho: 24, tac: 12, int: 12, gk: 8,
      skills: ['FIRE_VOLLEY', 'BULLDOZER_RUN'], skin: '#e0ac69', hair: '#ffbe0b',
      bio: 'Hot-blooded striker whose Fire Volley scorched three street nets.'
    },
    // Bench Reserve #1
    {
      name: 'Toby', role: 'FWD', affinity: 'SPEED', level: 1, sta: 70,
      dri: 20, pas: 16, sho: 19, tac: 13, int: 14, gk: 9,
      skills: ['SONIC_BURST', 'CYCLONE_DRIVE'], skin: '#f4c29f', hair: '#6a4c93',
      bio: 'Super-sub utility attacker ready to bring fresh legs off the bench.'
    }
  ];

  // 5. QUEST STAR RECRUITS (One special recruitable hero per Region via Town Mini-Quest)
  SR.QUEST_RECRUITS = {
    1: {
      name: 'Kael "Goldboot"', role: 'FWD', affinity: 'TECH', level: 2, sta: 82,
      dri: 24, pas: 21, sho: 26, tac: 14, int: 16, gk: 10,
      skills: ['CYCLONE_DRIVE', 'PHANTOM_STEP'], skin: '#e0ac69', hair: '#ffd166',
      bio: 'Former youth prodigy who vowed to join whoever recovers his Stolen Golden Cleats.'
    },
    2: {
      name: 'Zero-9', role: 'MID', affinity: 'SPEED', level: 4, sta: 88,
      dri: 25, pas: 25, sho: 21, tac: 19, int: 24, gk: 11,
      skills: ['VELVET_CROSS', 'HAWK_INTERCEPT'], skin: '#f1faee', hair: '#00f5d4',
      bio: 'Cyber-visor playmaker who computes 1,000 pass trajectories per second.'
    },
    3: {
      name: 'Valeria', role: 'DEF', affinity: 'POWER', level: 6, sta: 95,
      dri: 22, pas: 22, sho: 24, tac: 29, int: 26, gk: 15,
      skills: ['CRUSHER_PRESS', 'THUNDER_BOLT'], skin: '#c68642', hair: '#ef476f',
      bio: 'Legendary libero with a cannon long-shot and unbreakable tackle.'
    }
  };

  // 6. FREE AGENTS & STREET RECRUIT POOL
  SR.RECRUIT_POOL = [
    {
      name: 'Dante', role: 'FWD', affinity: 'POWER', sta: 76,
      dri: 18, pas: 15, sho: 25, tac: 13, int: 12, gk: 9,
      skills: ['FIRE_VOLLEY', 'BULLDOZER_RUN'], skin: '#c68642', hair: '#e63946', cost: 95,
      bio: 'Heavy-hitting center forward from the dockside cages.'
    },
    {
      name: 'Soren', role: 'MID', affinity: 'TECH', sta: 78,
      dri: 20, pas: 24, sho: 16, tac: 16, int: 21, gk: 10,
      skills: ['LASER_PASS', 'HAWK_INTERCEPT'], skin: '#ffdbac', hair: '#457b9d', cost: 90,
      bio: 'Calm architect who slices defenses with clinical through-balls.'
    },
    {
      name: 'Juno', role: 'DEF', affinity: 'SPEED', sta: 76,
      dri: 18, pas: 17, sho: 12, tac: 23, int: 22, gk: 11,
      skills: ['IRON_SLIDE', 'HAWK_INTERCEPT'], skin: '#f4c29f', hair: '#9b5de5', cost: 85,
      bio: 'Rapid wing-back who tracks down breakaways cleanly.'
    },
    {
      name: 'Goliath', role: 'GK', affinity: 'POWER', sta: 80,
      dri: 10, pas: 15, sho: 11, tac: 18, int: 16, gk: 26,
      skills: ['NOVA_PUNCH', 'GOD_HAND'], skin: '#8d5524', hair: '#f77f00', cost: 95,
      bio: 'Towering shot-stopper whose punches launch instant counterattacks.'
    },
    {
      name: 'Kira', role: 'FWD', affinity: 'SPEED', sta: 75,
      dri: 24, pas: 18, sho: 23, tac: 13, int: 15, gk: 8,
      skills: ['SONIC_BURST', 'THUNDER_BOLT'], skin: '#ffdbac', hair: '#00bbf9', cost: 105,
      bio: 'Electric striker who leaves defenders grasping at sparks.'
    },
    {
      name: 'Bastion', role: 'DEF', affinity: 'GRIT', sta: 82,
      dri: 14, pas: 17, sho: 13, tac: 25, int: 21, gk: 13,
      skills: ['AEGIS_WALL', 'CRUSHER_PRESS'], skin: '#e0ac69', hair: '#2ec4b6', cost: 100,
      bio: 'Veteran anchor who absorbs the hardest shots without flinching.'
    },
    {
      name: 'Riku', role: 'MID', affinity: 'TECH', sta: 77,
      dri: 23, pas: 22, sho: 19, tac: 15, int: 19, gk: 9,
      skills: ['PHANTOM_STEP', 'VELVET_CROSS'], skin: '#f4c29f', hair: '#f15bb5', cost: 100,
      bio: 'Freestyle street trickster turned midfield maestro.'
    }
  ];

  // 7. REGIONS, QUESTS & BOSS TEAMS
  SR.REGIONS = [
    {
      id: 1,
      name: 'Reg 1: Rustyard Docklands',
      townName: 'RUSTYARD TOWN',
      dungeonName: 'DOCKSIDE CAGE ARENA',
      stadiumName: 'IRON ANCHOR STADIUM',
      palette: { turf1: '#234f2e', turf2: '#1d4226', road: '#5c5346', wall: '#3d352e' },
      quest: {
        giverName: 'Kael "Goldboot"',
        itemName: 'Golden Cleats',
        introText: 'Yo Captain! Dockside thugs stole my lucky GOLDEN CLEATS and hid them in a chest inside the Dockside Cage Arena north of town. Bring them back and I\'ll join your squad!',
        activeText: 'Check the chests in the Dockside Cage Arena (North of Town) for Kael\'s Golden Cleats!',
        completeText: 'My Golden Cleats!! Lace \'em up—Kael "Goldboot" is officially joining your squad for the Championship run!'
      },
      boss: {
        teamName: 'Ironclad Dockers FC',
        captainName: 'Captain Vance',
        kitPrimary: '#d90429',
        kitSecondary: '#edf2f4',
        introLine: 'Nobody leaves the Docklands with the Regional Badge! Prepare to get crushed by our Ironclad Press!',
        defeatLine: 'Impossible! Your passing tore right through our steel defense... Take the Docklands Badge!',
        level: 2
      }
    },
    {
      id: 2,
      name: 'Reg 2: Neon Metro District',
      townName: 'NEON CROSSING',
      dungeonName: 'SUBWAY TURF LABYRINTH',
      stadiumName: 'CYBER DOME ARENA',
      palette: { turf1: '#1a4a5e', turf2: '#143b4b', road: '#333d52', wall: '#222838' },
      quest: {
        giverName: 'Zero-9',
        itemName: 'Tactical Holo-Lens',
        introText: 'Greetings Captain. My Tactical Holo-Lens was dropped in the Subway Turf Labyrinth. Recover it from the dungeon chest and my playmaking algorithms are yours!',
        activeText: 'Find Zero-9\'s Tactical Holo-Lens inside a chest in the Subway Turf Labyrinth!',
        completeText: 'Tactical Holo-Lens restored! Zero-9 is synced and joining your squad!'
      },
      boss: {
        teamName: 'Cyber Voltz Academy',
        captainName: 'Captain Sora',
        kitPrimary: '#00f5d4',
        kitSecondary: '#10002b',
        introLine: 'Our data predicts a 99.8% victory for Cyber Voltz. Let\'s see you outrun lightning!',
        defeatLine: 'System overload! Your intuition beat our calculations. You\'ve earned passage to the Apex Summit!',
        level: 4
      }
    },
    {
      id: 3,
      name: 'Reg 3: Apex Summit Citadel',
      townName: 'SUMMIT VILLAGE',
      dungeonName: 'CHAMPIONS GAUNTLET',
      stadiumName: 'GRAND APEX COLOSSEUM',
      palette: { turf1: '#2b580c', turf2: '#224609', road: '#6c584c', wall: '#3c2f2f' },
      quest: {
        giverName: 'Valeria',
        itemName: 'Champion Crest',
        introText: 'If you want me on your backline for the Grand Final, prove your grit—recover the Champion Crest hidden in the Champions Gauntlet!',
        activeText: 'Locate the Champion Crest inside the Champions Gauntlet dungeon!',
        completeText: 'You\'ve got real fire, Captain! Valeria joins your squad—let\'s win the Grand Cup!'
      },
      boss: {
        teamName: 'Royal Galacticos XI',
        captainName: 'Emperor Kaiser',
        kitPrimary: '#ffd166',
        kitSecondary: '#240046',
        introLine: 'A street team on my hallowed pitch?! Witness absolute football perfection!',
        defeatLine: 'Unbelievable... From street cages to Champions of the World! The Striker Cup is yours!',
        level: 6
      }
    }
  ];

  // 8. GENERATE AN OPPONENT 5-A-SIDE SQUAD
  const STREET_NAMES = ['Viper', 'Torque', 'Slash', 'Blaze', 'Diesel', 'Echo', 'Jett', 'Cobra', 'Spike', 'Zane', 'Raze', 'Flint'];
  const AFF_LIST = ['POWER', 'SPEED', 'TECH', 'GRIT'];

  SR.generateEnemyTeam = function (regionId, isBoss, customName) {
    const reg = SR.REGIONS[Math.min(regionId - 1, SR.REGIONS.length - 1)];
    const baseLv = isBoss ? reg.boss.level : Math.max(1, reg.boss.level - 1);
    const teamName = isBoss ? reg.boss.teamName : (customName || `Street Crew #${10 + Math.floor(Math.random() * 89)}`);
    const kitPrimary = isBoss ? reg.boss.kitPrimary : ['#e63946', '#9b5de5', '#f77f00', '#00bbf9'][regionId % 4];
    const kitSecondary = isBoss ? reg.boss.kitSecondary : '#1f2421';

    const roles = ['GK', 'DEF', 'MID', 'MID', 'FWD'];
    const players = roles.map((role, idx) => {
      const aff = AFF_LIST[(idx + regionId) % AFF_LIST.length];
      const name = (isBoss && idx === 4)
        ? reg.boss.captainName
        : STREET_NAMES[(idx * 3 + regionId * 2 + Math.floor(Math.random() * 4)) % STREET_NAMES.length];

      const isStar = isBoss && (idx === 4 || idx === 2 || idx === 0);
      const statBase = isBoss ? 16 : 13;

      const tpl = {
        name: name,
        role: role,
        affinity: aff,
        level: baseLv + (isStar ? 1 : 0),
        sta: isBoss ? 80 : 65,
        dri: statBase + (role === 'FWD' || role === 'MID' ? 4 : 0),
        pas: statBase + (role === 'MID' ? 5 : 1),
        sho: statBase + (role === 'FWD' ? 6 : 1),
        tac: statBase + (role === 'DEF' ? 6 : 1),
        int: statBase + (role === 'MID' || role === 'DEF' ? 4 : 0),
        gk:  role === 'GK' ? statBase + 8 : 9,
        skills: role === 'GK' ? ['GOD_HAND']
          : role === 'DEF' ? ['IRON_SLIDE', 'AEGIS_WALL']
          : role === 'MID' ? ['LASER_PASS', 'HAWK_INTERCEPT']
          : ['FIRE_VOLLEY', 'PHANTOM_STEP'],
        skin: ['#f4c29f', '#c68642', '#8d5524', '#ffdbac'][idx % 4],
        hair: ['#2b2d42', '#d90429', '#ffbe0b', '#00f5d4', '#9b5de5'][idx % 5],
        cost: 70 + baseLv * 20
      };
      return SR.createPlayer(tpl, 0);
    });

    return {
      name: teamName,
      isBoss: !!isBoss,
      kitPrimary: kitPrimary,
      kitSecondary: kitSecondary,
      players: players // [0]=GK, [1]=DEF, [2]=MID1, [3]=MID2, [4]=FWD
    };
  };

  // 9. SHOP ITEMS & BAG GEAR
  SR.ITEMS = {
    ENERGY_DRINK: {
      id: 'ENERGY_DRINK', name: 'Pitch Soda', price: 30, type: 'HEAL',
      desc: 'Restores +40 Stamina to all squad players.'
    },
    SCOUT_CONTRACT: {
      id: 'SCOUT_CONTRACT', name: 'Scout Contract', price: 55, type: 'CONTRACT',
      desc: 'Used after a win to recruit an opposing standout player for free!'
    },
    TURBO_BOOTS: {
      id: 'TURBO_BOOTS', name: 'Turbo Cleats', price: 85, type: 'GEAR',
      stat: 'dri', boost: 4, stat2: 'pas', boost2: 3,
      desc: 'Permanently boosts a player\'s DRI +4 and PAS +3.'
    },
    STRIKER_ANKLET: {
      id: 'STRIKER_ANKLET', name: 'Cannon Anklet', price: 90, type: 'GEAR',
      stat: 'sho', boost: 5, stat2: 'maxSta', boost2: 10,
      desc: 'Permanently boosts a player\'s SHO +5 and Max STA +10.'
    },
    TITAN_GUARDS: {
      id: 'TITAN_GUARDS', name: 'Titan Guards', price: 85, type: 'GEAR',
      stat: 'tac', boost: 4, stat2: 'int', boost2: 4,
      desc: 'Permanently boosts a player\'s TAC +4 and INT +4.'
    },
    MAGNA_GLOVES: {
      id: 'MAGNA_GLOVES', name: 'Magna Gloves', price: 85, type: 'GEAR',
      stat: 'gk', boost: 6, stat2: 'pas', boost2: 2,
      desc: 'Permanently boosts a keeper\'s GK +6 and PAS +2.'
    }
  };

})(window.SR);
