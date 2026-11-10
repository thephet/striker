window.SR = window.SR || {};

(function (SR) {
  const W = 20;
  const H = 18;
  const T = SR.TILE;

  function makeGrid(fillTile) {
    const g = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) row.push(fillTile);
      g.push(row);
    }
    return g;
  }

  function makeBoolGrid(val) {
    const g = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) row.push(!!val);
      g.push(row);
    }
    return g;
  }

  function fillRect(g, x0, y0, w, h, tile) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = tile;
      }
    }
  }

  // =========================================================================
  // PROLOGUE CHAPTER MAPS (Bedroom -> Hometown & Friend's House -> School 1F/2F/Gym)
  // =========================================================================

  // Prologue Map 0: Hero's Bedroom
  function createBedroomMap() {
    const g = makeGrid(T.WALL);
    fillRect(g, 3, 3, 14, 12, T.WOOD_FLOOR);

    // Cozy rug in the center
    fillRect(g, 8, 7, 4, 4, T.RUG);

    // Bed in top-left corner
    g[4][4] = T.BED;

    // Bookshelves along top wall
    g[3][6] = T.BOOKSHELF;
    g[3][7] = T.BOOKSHELF;

    // CRT TV + Retro Console in top-center/right
    g[3][10] = T.TV_CONSOLE;

    // Sofa on the right side
    g[6][14] = T.SOFA;
    g[7][14] = T.SOFA;

    // Bedroom Door at bottom center leading outside to Hometown
    g[15][9] = T.HOUSE_DOOR_HERO;

    const npcs = [
      {
        id: 'grandad',
        name: 'Grandad',
        x: 8, y: 12,
        skin: '#f4c29f', hair: '#e2e8f0', kitPrimary: '#6c584c', kitSecondary: '#3d352e',
        role: 'GRANDAD',
        badge: '♥',
        dialogue: [
          'Go on, Leo! Your 5 teammates are waiting outside, and those Varsity Jocks are trying to take over the High School gym!',
          'Remember: you can always rest at your bed or visit your friend\'s Mum next door before heading North to the School!'
        ]
      }
    ];

    const props = [
      { x: 4, y: 4, name: 'HERO\'S BED', text: 'Your cozy bed. Your squad catches a quick breather—Stamina 100% restored!', heal: true },
      { x: 6, y: 3, name: 'BOOKSHELF', text: '"Tactical Football Vol. 1: PASS beats TACKLE, TACKLE beats DRIBBLE, and DRIBBLE beats INTERCEPT!"' },
      { x: 7, y: 3, name: 'BOOKSHELF', text: 'Comics and old football magazines stacked neatly on the shelf.' },
      { x: 10, y: 3, name: 'TV & RETRO CONSOLE', text: 'A classic 16-bit console is hooked up to the CRT TV! "SUPER STRIKER 96" is paused on the title screen.' },
      { x: 14, y: 6, name: 'COZY SOFA', text: 'A comfy green sofa where you and your friends watch Championship matches.' },
      { x: 14, y: 7, name: 'COZY SOFA', text: 'A comfy green sofa where you and your friends watch Championship matches.' }
    ];

    return {
      id: 'PROLOGUE_BEDROOM',
      name: 'LEO\'S BEDROOM',
      subtitle: 'Home Sweet Home — Inspect TV, Books, Sofa or Exit South',
      grid: g,
      npcs: npcs,
      chests: [],
      props: props,
      fogOfWar: false,
      spawnBed: { x: 4, y: 4 },
      spawnDoor: { x: 9, y: 14 },
      labels: [
        { x: 4.5, y: 3.4, text: 'BED', color: '#4cc9f0' },
        { x: 10.5, y: 2.5, text: 'TV+CONSOLE', color: '#ffd166' },
        { x: 9.5, y: 16.5, text: '▼ EXIT OUTSIDE', color: '#06d6a0' }
      ]
    };
  }

  // Prologue Map 1: Hometown Outside (Hero's House + Friend's House + Path to School)
  function createHometownMap() {
    const g = makeGrid(T.GRASS);
    fillRect(g, 0, 0, W, 1, T.WALL);
    fillRect(g, 0, H - 1, W, 1, T.WALL);
    fillRect(g, 0, 0, 1, H, T.WALL);
    fillRect(g, W - 1, 0, 1, H, T.WALL);

    // Neighborhood roads
    fillRect(g, 9, 1, 2, H - 2, T.ROAD);
    fillRect(g, 3, 8, 14, 2, T.ROAD);

    // North Gate to the High School
    g[1][9] = T.PORTAL_UP;
    g[1][10] = T.PORTAL_UP;

    // Left House: Hero's House (Red Roof)
    fillRect(g, 3, 3, 5, 2, T.ROOF_RED);
    fillRect(g, 3, 5, 5, 3, T.WALL);
    g[7][5] = T.HOUSE_DOOR_HERO;

    // Right House: Friend's House (Blue Roof)
    fillRect(g, 12, 3, 5, 2, T.ROOF_BLUE);
    fillRect(g, 12, 5, 5, 3, T.WALL);
    g[7][14] = T.HOUSE_DOOR_FRIEND;

    const npcs = [
      {
        id: 'friend_axel',
        name: 'Axel (Teammate)',
        x: 9, y: 5,
        skin: '#e0ac69', hair: '#ffbe0b', kitPrimary: '#3a86ff', kitSecondary: '#ffffff',
        role: 'PROLOGUE_FRIEND',
        badge: '!',
        dialogue: [
          'Leo!! We need to rush to the school right now—the team of Jocks want to take over the gym, we need to beat them!',
          'The school corridors are dark and crawling with hallway Jocks. We have to climb 2 floors of stairs to reach the Gym!',
          'You can also pop into my house (Blue Roof) to say hi to my Mum before we head North!'
        ]
      }
    ];

    return {
      id: 'PROLOGUE_TOWN',
      name: 'HOMETOWN STREET',
      subtitle: 'Visit Your House, Friend\'s House, or Rush North to School!',
      grid: g,
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnOutsideHero: { x: 5, y: 8 },
      spawnOutsideFriend: { x: 14, y: 8 },
      spawnFromSchool: { x: 9, y: 2 },
      labels: [
        { x: 5.5, y: 2.7, text: 'YOUR HOUSE', color: '#ef476f' },
        { x: 14.5, y: 2.7, text: 'FRIEND\'S HOUSE', color: '#4cc9f0' },
        { x: 10, y: 0.8, text: '▲ TO HIGH SCHOOL', color: '#ffd166' }
      ]
    };
  }

  // Prologue Map 2: Friend's House Interior (Living Room + Kitchen with Mum)
  function createFriendHouseMap() {
    const g = makeGrid(T.WALL);
    fillRect(g, 2, 3, 16, 12, T.WOOD_FLOOR);

    // Divider wall partial between Living Room (Left) & Kitchen (Right)
    fillRect(g, 10, 3, 1, 5, T.WALL);

    // Living Room (Left): Rug, Sofa, TV, Bookshelf
    fillRect(g, 4, 7, 4, 4, T.RUG);
    g[3][4] = T.BOOKSHELF;
    g[3][6] = T.TV_CONSOLE;
    g[8][3] = T.SOFA;
    g[9][3] = T.SOFA;

    // Kitchen (Right): Counters, Stove & Sink
    fillRect(g, 12, 3, 5, 1, T.KITCHEN_COUNTER);
    g[5][16] = T.KITCHEN_COUNTER;
    g[6][16] = T.KITCHEN_COUNTER;

    // Exit Door at bottom center
    g[15][9] = T.HOUSE_DOOR_FRIEND;

    const npcs = [
      {
        id: 'friend_mum',
        name: 'Friend\'s Mum',
        x: 13, y: 6,
        skin: '#ffdbac', hair: '#e63946', kitPrimary: '#06d6a0', kitSecondary: '#ffffff',
        role: 'MUM',
        badge: '♥',
        dialogue: [
          'Oh, hello Leo! Good luck with your adventure at the school today!',
          'Those big Jocks think they run the place, but I know you and the boys will show them real teamwork!',
          'Here, eat some fresh kitchen snacks before you go—your whole team\'s Stamina is 100% restored!'
        ]
      }
    ];

    const props = [
      { x: 12, y: 3, name: 'KITCHEN STOVE', text: 'Something delicious is simmering on the kitchen stove!' },
      { x: 13, y: 3, name: 'KITCHEN COUNTER', text: 'Freshly sliced oranges and energy snacks for half-time!' },
      { x: 6, y: 3, name: 'LIVING ROOM TV', text: 'A local news broadcast talks about the upcoming Regional Striker Tournament.' }
    ];

    return {
      id: 'PROLOGUE_FRIEND_HOUSE',
      name: 'FRIEND\'S HOUSE',
      subtitle: 'Living Room & Kitchen — Talk to Mum',
      grid: g,
      npcs: npcs,
      chests: [],
      props: props,
      fogOfWar: false,
      spawnDoor: { x: 9, y: 14 },
      labels: [
        { x: 5.5, y: 2.6, text: 'LIVING ROOM', color: '#4cc9f0' },
        { x: 14.5, y: 2.6, text: 'KITCHEN', color: '#ffd166' },
        { x: 9.5, y: 16.5, text: '▼ EXIT OUTSIDE', color: '#06d6a0' }
      ]
    };
  }

  // Prologue Map 3 & 4: Procedural Roguelike School Floor (Rooms + Corridors + Fog of War + Chasing Enemies)
  function createSchoolRoguelikeFloor(floorNum) {
    const g = makeGrid(T.WALL);
    const rooms = [];

    // Try placing 5 to 6 non-overlapping classrooms on the 20x18 grid
    const attempts = 45;
    for (let a = 0; a < attempts && rooms.length < 6; a++) {
      const rw = 4 + Math.floor(Math.random() * 2); // 4..5
      const rh = 3 + Math.floor(Math.random() * 2); // 3..4
      const rx = 1 + Math.floor(Math.random() * (W - rw - 2));
      const ry = 1 + Math.floor(Math.random() * (H - rh - 2));

      let overlaps = false;
      for (let i = 0; i < rooms.length; i++) {
        const o = rooms[i];
        if (rx < o.x + o.w + 1 && rx + rw + 1 > o.x && ry < o.y + o.h + 1 && ry + rh + 1 > o.y) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        rooms.push({
          x: rx, y: ry, w: rw, h: rh,
          cx: Math.floor(rx + rw / 2),
          cy: Math.floor(ry + rh / 2)
        });
        fillRect(g, rx, ry, rw, rh, T.SCHOOL_FLOOR);
      }
    }

    // Fallback guarantee: if fewer than 4 rooms spawned, add deterministic corner rooms
    const fallbackRooms = [
      { x: 2, y: 12, w: 4, h: 4, cx: 4, cy: 14 },
      { x: 2, y: 2,  w: 4, h: 4, cx: 4, cy: 4 },
      { x: 8, y: 7,  w: 4, h: 4, cx: 10, cy: 9 },
      { x: 14, y: 2, w: 4, h: 4, cx: 16, cy: 4 },
      { x: 14, y: 12, w: 4, h: 4, cx: 16, cy: 14 }
    ];
    for (let f = 0; f < fallbackRooms.length && rooms.length < 5; f++) {
      const fr = fallbackRooms[f];
      fillRect(g, fr.x, fr.y, fr.w, fr.h, T.SCHOOL_FLOOR);
      rooms.push(fr);
    }

    // Connect each room to the next with an L-shaped corridor
    for (let i = 0; i < rooms.length - 1; i++) {
      const r1 = rooms[i];
      const r2 = rooms[i + 1];
      let x = r1.cx;
      let y = r1.cy;
      while (x !== r2.cx) {
        g[y][x] = T.SCHOOL_FLOOR;
        x += (r2.cx > x ? 1 : -1);
      }
      while (y !== r2.cy) {
        g[y][x] = T.SCHOOL_FLOOR;
        y += (r2.cy > y ? 1 : -1);
      }
      g[y][x] = T.SCHOOL_FLOOR;
    }

    // Room 0 = Player Spawn Room
    const startRoom = rooms[0];
    const spawnPos = { x: startRoom.cx, y: startRoom.cy };

    // Last Room = Stairs Up to Next Floor (or Gym)
    const stairsRoom = rooms[rooms.length - 1];
    g[stairsRoom.cy][stairsRoom.cx] = T.STAIRS_UP;

    // Intermediate Rooms: each gets EITHER 1 Chasing Enemy OR 1 Item Chest!
    const npcs = [];
    const chests = [];
    for (let i = 1; i < rooms.length - 1; i++) {
      const rm = rooms[i];
      if (i % 2 === 1) {
        // Spawn 1 Hallway Jock Enemy who chases when in sight!
        npcs.push({
          id: `school_f${floorNum}_enemy_${i}`,
          name: `Hallway Jock #${floorNum}${i}`,
          x: rm.cx,
          y: rm.cy,
          skin: '#f4c29f',
          hair: '#ef476f',
          kitPrimary: '#ef476f',
          kitSecondary: '#ffd166',
          role: 'SCHOOL_ENEMY',
          chaser: true,
          alerted: false,
          defeated: false,
          badge: 'VS',
          teamName: `Hallway Jocks ${floorNum}-${i}`
        });
      } else {
        // Spawn 1 Item Chest in the room!
        chests.push({
          id: `school_f${floorNum}_chest_${i}`,
          x: rm.cx,
          y: rm.cy,
          opened: false,
          isQuest: false,
          cash: 35 + floorNum * 15,
          item: 'ENERGY_DRINK'
        });
      }
    }

    return {
      id: `PROLOGUE_SCHOOL_F${floorNum}`,
      name: `SCHOOL CORRIDORS — ${floorNum}F`,
      subtitle: 'Roguelike Floor — Explore Rooms & Find the Stairs!',
      grid: g,
      npcs: npcs,
      chests: chests,
      props: [],
      fogOfWar: true,
      visionRadius: 4.5,
      explored: makeBoolGrid(false),
      spawnStart: spawnPos,
      labels: []
    };
  }

  // Prologue Map 5: School Gymnasium (Mini-Boss vs The Team of Jocks!)
  function createSchoolGymMap() {
    const g = makeGrid(T.WALL);
    fillRect(g, 2, 2, 16, 14, T.GYM_FLOOR);

    // Painted court boundary & center line
    fillRect(g, 3, 3, 14, 1, T.GYM_LINE);
    fillRect(g, 3, 14, 14, 1, T.GYM_LINE);
    fillRect(g, 3, 3, 1, 12, T.GYM_LINE);
    fillRect(g, 16, 3, 1, 12, T.GYM_LINE);
    fillRect(g, 3, 8, 14, 1, T.GYM_LINE);

    // Indoor Futsal Goals at North End
    g[2][9] = T.GOAL_TOP;
    g[2][10] = T.GOAL_TOP;

    const npcs = [
      {
        id: 'school_jock_boss',
        name: 'Varsity Capt. Chad',
        x: 9, y: 5,
        skin: '#e0ac69',
        hair: '#ffd166',
        kitPrimary: '#c1121f',
        kitSecondary: '#ffd166',
        role: 'SCHOOL_BOSS',
        badge: 'BOSS',
        teamName: 'Varsity Jocks V'
      }
    ];

    return {
      id: 'PROLOGUE_SCHOOL_GYM',
      name: 'HIGH SCHOOL GYMNASIUM',
      subtitle: 'Showdown vs The Team of Jocks!',
      grid: g,
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnStart: { x: 9, y: 13 },
      labels: [
        { x: 9.5, y: 4.0, text: '★ THE VARSITY JOCKS ★', color: '#ffd166' }
      ]
    };
  }

  SR.generatePrologueWorld = function () {
    return {
      isPrologue: true,
      region: {
        id: 0,
        name: 'Prologue: High School Takeover',
        townName: 'HOMETOWN STREET',
        palette: { turf1: '#2d6a4f', turf2: '#1b4332', road: '#6c584c', wall: '#3d352e' }
      },
      maps: [
        createBedroomMap(),                 // 0: Hero's Bedroom
        createHometownMap(),                // 1: Hometown Outside
        createFriendHouseMap(),             // 2: Friend's House (Living Room & Kitchen with Mum)
        createSchoolRoguelikeFloor(1),      // 3: School Floor 1 (Random Rooms & Corridors + Fog of War)
        createSchoolRoguelikeFloor(2),      // 4: School Floor 2 (Random Rooms & Corridors + Fog of War)
        createSchoolGymMap()                // 5: School Gym (Team of Jocks Mini-Boss)
      ]
    };
  };

  // =========================================================================
  // MAIN REGIONAL WORLD GENERATOR (Regions 1, 2, 3 — Base Camp -> Dungeon -> Stadium)
  // =========================================================================

  function createTownMap(region) {
    const g = makeGrid(T.GRASS);
    fillRect(g, 0, 0, W, 1, T.WALL);
    fillRect(g, 0, H - 1, W, 1, T.WALL);
    fillRect(g, 0, 0, 1, H, T.WALL);
    fillRect(g, W - 1, 0, 1, H, T.WALL);

    fillRect(g, 8, 1, 4, H - 2, T.ROAD);
    fillRect(g, 3, 7, 14, 3, T.ROAD);
    fillRect(g, 4, 12, 12, 3, T.ROAD);

    g[1][9] = T.PORTAL_UP;
    g[1][10] = T.PORTAL_UP;

    fillRect(g, 3, 3, 5, 2, T.ROOF_RED);
    fillRect(g, 3, 5, 5, 2, T.WALL);
    g[6][5] = T.CLUB_DOOR;

    fillRect(g, 12, 3, 5, 2, T.ROOF_BLUE);
    fillRect(g, 12, 5, 5, 2, T.WALL);
    g[6][14] = T.SHOP_DOOR;

    fillRect(g, 2, 11, 5, 5, T.PITCH_LINE);
    fillRect(g, 3, 12, 3, 3, T.GRASS);

    const npcs = [
      {
        id: 'coach_rio',
        name: 'Coach Rio',
        x: 8, y: 10,
        skin: '#c68642', hair: '#edf2f4', kitPrimary: '#2ec4b6', kitSecondary: '#1a1a1a',
        role: 'COACH',
        badge: 'TIP',
        dialogue: [
          `Welcome to ${region.townName} Base Camp, Captain! Amazing job beating the School Jocks!`,
          `Step into the CLUBHOUSE (Red Roof) to recruit Free Agents & heal Stamina, visit the SHOP (Blue Roof), or head NORTH toward the Stadium!`
        ]
      },
      {
        id: 'quest_star',
        name: region.quest.giverName,
        x: 13, y: 11,
        skin: '#e0ac69', hair: '#ffd166', kitPrimary: '#9b5de5', kitSecondary: '#ffffff',
        role: 'QUEST_GIVER',
        badge: '!',
        dialogue: []
      }
    ];

    return {
      zoneIndex: 0,
      name: region.townName,
      subtitle: 'Base Camp — Clubhouse, Shop & Quests',
      grid: g,
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnDown: { x: 9, y: 13 },
      spawnFromNorth: { x: 9, y: 2 },
      labels: [
        { x: 5.5, y: 2.7, text: 'CLUB & RECRUITS', color: '#ffd166' },
        { x: 14.5, y: 2.7, text: 'PRO KIT SHOP', color: '#4cc9f0' },
        { x: 10, y: 0.8, text: '▲ TO DUNGEON', color: '#06d6a0' }
      ]
    };
  }

  function createDungeonMap(region) {
    const g = makeGrid(T.WALL);
    fillRect(g, 2, 2, 16, 14, T.GRASS);

    const layoutSeed = region.id;
    fillRect(g, 5, 5, 3, 2, T.WALL);
    fillRect(g, 12, 5, 3, 2, T.WALL);
    fillRect(g, 5, 11, 3, 2, T.WALL);
    fillRect(g, 12, 11, 3, 2, T.WALL);
    if (layoutSeed % 2 === 1) {
      fillRect(g, 8, 8, 4, 1, T.WALL);
    } else {
      fillRect(g, 4, 8, 2, 2, T.WALL);
      fillRect(g, 14, 8, 2, 2, T.WALL);
    }

    fillRect(g, 2, 6, 3, 5, T.TURF_WILD);
    fillRect(g, 15, 6, 3, 5, T.TURF_WILD);
    fillRect(g, 7, 3, 6, 2, T.TURF_WILD);
    fillRect(g, 7, 13, 6, 2, T.TURF_WILD);

    fillRect(g, 9, 1, 2, 16, T.ROAD);
    fillRect(g, 3, 9, 14, 2, T.ROAD);

    g[16][9] = T.PORTAL_DOWN;
    g[16][10] = T.PORTAL_DOWN;
    g[1][9] = T.PORTAL_UP;
    g[1][10] = T.PORTAL_UP;

    const chests = [
      {
        id: `reg${region.id}_quest_chest`,
        x: 3, y: 3,
        opened: false,
        isQuest: true,
        questItem: region.quest.itemName
      },
      {
        id: `reg${region.id}_loot_1`,
        x: 16, y: 3,
        opened: false,
        isQuest: false,
        cash: 65 + region.id * 25,
        contract: 1
      },
      {
        id: `reg${region.id}_loot_2`,
        x: 16, y: 14,
        opened: false,
        isQuest: false,
        cash: 50 + region.id * 20,
        item: 'ENERGY_DRINK'
      }
    ];

    const npcs = [
      {
        id: `rival_${region.id}_1`,
        name: 'Street Capt. Knox',
        x: 6, y: 9,
        skin: '#f4c29f', hair: '#ef476f', kitPrimary: '#ef476f', kitSecondary: '#111',
        role: 'RIVAL',
        defeated: false,
        badge: 'VS',
        teamName: 'Back-Alley Strikers'
      },
      {
        id: `rival_${region.id}_2`,
        name: 'Cage Boss Kira',
        x: 10, y: 5,
        skin: '#c68642', hair: '#ffd166', kitPrimary: '#f77f00', kitSecondary: '#111',
        role: 'RIVAL',
        defeated: false,
        badge: 'VS',
        teamName: 'Neon Turbos V'
      }
    ];

    return {
      zoneIndex: 1,
      name: region.dungeonName,
      subtitle: 'Wild Turf & Rivals — Find Chests & Advance North',
      grid: g,
      npcs: npcs,
      chests: chests,
      props: [],
      fogOfWar: false,
      spawnDown: { x: 9, y: 15 },
      spawnFromNorth: { x: 9, y: 2 },
      labels: [
        { x: 10, y: 0.8, text: '▲ TO STADIUM BOSS', color: '#ffd166' },
        { x: 10, y: 17.3, text: '▼ BACK TO TOWN', color: '#4cc9f0' }
      ]
    };
  }

  function createStadiumMap(region) {
    const g = makeGrid(T.WALL);
    fillRect(g, 2, 2, 16, 14, T.GRASS);
    fillRect(g, 3, 3, 14, 1, T.PITCH_LINE);
    fillRect(g, 3, 14, 14, 1, T.PITCH_LINE);
    fillRect(g, 3, 3, 1, 12, T.PITCH_LINE);
    fillRect(g, 16, 3, 1, 12, T.PITCH_LINE);
    fillRect(g, 3, 8, 14, 1, T.PITCH_LINE);

    g[2][9] = T.GOAL_TOP;
    g[2][10] = T.GOAL_TOP;

    g[16][9] = T.PORTAL_DOWN;
    g[16][10] = T.PORTAL_DOWN;
    g[15][9] = T.ROAD;
    g[15][10] = T.ROAD;

    const npcs = [
      {
        id: `boss_${region.id}`,
        name: region.boss.captainName,
        x: 9, y: 5,
        skin: '#f4c29f',
        hair: '#ffd166',
        kitPrimary: region.boss.kitPrimary,
        kitSecondary: region.boss.kitSecondary,
        role: 'BOSS',
        badge: 'BOSS',
        teamName: region.boss.teamName
      },
      {
        id: `medic_${region.id}`,
        name: 'Tunnel Physio',
        x: 6, y: 14,
        skin: '#ffdbac',
        hair: '#06d6a0',
        kitPrimary: '#06d6a0',
        kitSecondary: '#ffffff',
        role: 'MEDIC',
        badge: 'HEAL'
      }
    ];

    return {
      zoneIndex: 2,
      name: region.stadiumName,
      subtitle: `Championship Match vs ${region.boss.teamName}`,
      grid: g,
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnDown: { x: 9, y: 14 },
      spawnFromNorth: { x: 9, y: 14 },
      labels: [
        { x: 9.5, y: 4.1, text: `★ ${region.boss.teamName.toUpperCase()} ★`, color: '#ffd166' },
        { x: 10, y: 17.3, text: '▼ TUNNEL EXIT', color: '#4cc9f0' }
      ]
    };
  }

  SR.generateRegionWorld = function (regionIndex) {
    const region = SR.REGIONS[Math.min(regionIndex, SR.REGIONS.length - 1)];
    return {
      isPrologue: false,
      region: region,
      maps: [
        createTownMap(region),
        createDungeonMap(region),
        createStadiumMap(region)
      ]
    };
  };

  SR.isTileBlocked = function (tile) {
    return (
      tile === T.WALL ||
      tile === T.ROOF_RED ||
      tile === T.ROOF_BLUE ||
      tile === T.WATER ||
      tile === T.GOAL_TOP ||
      tile === T.BOOKSHELF ||
      tile === T.TV_CONSOLE ||
      tile === T.SOFA ||
      tile === T.KITCHEN_COUNTER
    );
  };
})(window.SR);
