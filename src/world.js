window.SR = window.SR || {};

(function (SR) {
  const T = SR.TILE;

  function makeGrid(w, h, fillTile) {
    const g = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) row.push(fillTile);
      g.push(row);
    }
    return g;
  }

  function makeBoolGrid(w, h, val) {
    const g = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) row.push(!!val);
      g.push(row);
    }
    return g;
  }

  function fillRect(g, x0, y0, w, h, tile) {
    const gh = g.length;
    const gw = gh > 0 ? g[0].length : 0;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (y >= 0 && y < gh && x >= 0 && x < gw) g[y][x] = tile;
      }
    }
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // =========================================================================
  // PROLOGUE CHAPTER MAPS (Bedroom -> Hometown & Friend's House -> School 1F/2F/Gym)
  // =========================================================================

  // Prologue Map 0: Hero's Bedroom (Rich Multi-Tile GBA Interior, Zero Text Labels)
  function createBedroomMap() {
    const W = 20, H = 18;
    const g = makeGrid(W, H, T.VOID);

    // Warm indoor floor (x: 3..16, y: 4..14) + top wallpaper wall (y: 2..3)
    fillRect(g, 2, 2, 16, 14, T.INT_WALL);
    fillRect(g, 3, 4, 14, 11, T.WOOD_FLOOR);

    // Sunlit Windows on back wall
    g[2][6] = T.INT_WINDOW;
    g[2][14] = T.INT_WINDOW;

    // Large woven bedroom area rug in center
    fillRect(g, 7, 8, 5, 4, T.RUG);

    // Exit doormat at bottom center (stepping onto y=14, x=9..10 or pressing Down exits outside)
    g[14][9] = T.DOORMAT_HERO;
    g[14][10] = T.DOORMAT_HERO;

    // Multi-tile furniture solid collision footprints:
    // 1. Big 2x3 Bed at (3, 4) -> leave (4, 5) walkable so hero sleeps in bed & steps out cleanly
    g[4][3] = T.FURNITURE_SOLID;
    g[5][3] = T.FURNITURE_SOLID;
    g[6][3] = T.FURNITURE_SOLID;
    g[4][4] = T.FURNITURE_SOLID;
    g[6][4] = T.FURNITURE_SOLID;

    // 2. Wide 2x2 Bookshelf against top wall at (7, 3..4)
    fillRect(g, 7, 3, 2, 2, T.FURNITURE_SOLID);

    // 3. Wide 2x2 CRT TV + Retro Console on floor at (10, 3..4)
    fillRect(g, 10, 3, 2, 2, T.FURNITURE_SOLID);

    // 4. Lush Potted Plant in top-right corner at (15, 3..4)
    fillRect(g, 15, 3, 1, 2, T.FURNITURE_SOLID);

    // 5. Big 3x2 Plush Sofa on right side at (13..15, 7..8) + 2x1 Coffee Table at (13..14, 10)
    fillRect(g, 13, 7, 3, 2, T.FURNITURE_SOLID);
    fillRect(g, 13, 10, 2, 1, T.FURNITURE_SOLID);

    const decor = [
      { kind: 'BIG_BED',        x: 3,  y: 4,  w: 2, h: 3 },
      { kind: 'WIDE_BOOKSHELF', x: 7,  y: 3,  w: 2, h: 2 },
      { kind: 'TV_AND_CONSOLE', x: 10, y: 3,  w: 2, h: 2 },
      { kind: 'POTTED_PLANT',   x: 15, y: 3,  w: 1, h: 2 },
      { kind: 'BIG_SOFA',       x: 13, y: 7,  w: 3, h: 2 },
      { kind: 'COFFEE_TABLE',   x: 13, y: 10, w: 2, h: 1 }
    ];

    const npcs = [
      {
        id: 'grandad',
        name: 'Grandad',
        x: 8, y: 12,
        skin: '#f4c29f', hair: '#e2e8f0', kitPrimary: '#6c584c', kitSecondary: '#3d352e',
        role: 'GRANDAD',
        dialogue: [
          'Go on, Leo! Your 5 teammates are waiting outside, and those Varsity Jocks are trying to take over the High School gym!',
          'You can rest in your bed anytime or visit your friend\'s Mum next door before heading North to the School!'
        ]
      }
    ];

    const props = [
      { x: 3, y: 4, w: 2, h: 3, name: 'Bed', text: 'Your big comfy bed! Your squad takes a quick breather—Stamina 100% restored!', heal: true },
      { x: 7, y: 3, w: 2, h: 2, name: 'Bookshelf', text: '"Tactical Football Vol. 1: PASS beats TACKLE, TACKLE beats DRIBBLE, and DRIBBLE beats INTERCEPT!"' },
      { x: 10, y: 3, w: 2, h: 2, name: 'TV & Old Console', text: 'A classic 16-bit console with two controllers is hooked up to the CRT TV! "SUPER STRIKER 96" is glowing on screen.' },
      { x: 13, y: 7, w: 3, h: 2, name: 'Sofa', text: 'A big plush green sofa where you and your teammates watch Championship matches.' },
      { x: 13, y: 10, w: 2, h: 1, name: 'Coffee Table', text: 'Football magazines and a warm mug sit on the coffee table.' }
    ];

    return {
      id: 'PROLOGUE_BEDROOM',
      width: W,
      height: H,
      name: 'LEO\'S ROOM',
      subtitle: 'Home Sweet Home',
      grid: g,
      decor: decor,
      npcs: npcs,
      chests: [],
      props: props,
      fogOfWar: false,
      spawnBed: { x: 4, y: 5 },
      spawnDoor: { x: 9, y: 13 },
      labels: []
    };
  }

  // Prologue Map 1: Hometown Neighborhood Exterior (Trees, Flowers, Fences, Cottages, Zero Text Labels)
  function createHometownMap() {
    const W = 20, H = 18;
    const g = makeGrid(W, H, T.GRASS);

    // Leafy tree border around town perimeter
    fillRect(g, 0, 0, W, 1, T.TREE);
    fillRect(g, 0, H - 1, W, 1, T.TREE);
    fillRect(g, 0, 0, 1, H, T.TREE);
    fillRect(g, W - 1, 0, 1, H, T.TREE);

    // Extra corner trees & wildflower patches
    g[1][1] = T.TREE; g[1][18] = T.TREE;
    g[16][1] = T.TREE; g[16][18] = T.TREE;
    fillRect(g, 2, 13, 4, 2, T.FLOWERS);
    fillRect(g, 14, 13, 4, 2, T.FLOWERS);
    g[11][3] = T.FLOWERS; g[11][16] = T.FLOWERS;

    // Sandy/Cobblestone neighborhood roads
    fillRect(g, 9, 1, 2, H - 2, T.ROAD);
    fillRect(g, 3, 9, 14, 2, T.ROAD);
    // Doorstep paths
    g[8][5] = T.ROAD;
    g[8][14] = T.ROAD;

    // White picket fences framing front yards
    fillRect(g, 2, 8, 3, 1, T.FENCE);
    fillRect(g, 6, 8, 2, 1, T.FENCE);
    fillRect(g, 12, 8, 2, 1, T.FENCE);
    fillRect(g, 15, 8, 3, 1, T.FENCE);

    // North Avenue Exit to High School
    g[0][9] = T.PORTAL_UP;
    g[0][10] = T.PORTAL_UP;
    g[1][9] = T.PORTAL_UP;
    g[1][10] = T.PORTAL_UP;

    // Left Cottage: Hero's House (Pitched Red Shingle Roof + Windows + Front Door)
    fillRect(g, 2, 3, 6, 3, T.ROOF_RED);
    fillRect(g, 2, 6, 6, 2, T.HOUSE_WALL);
    g[6][3] = T.HOUSE_WINDOW;
    g[6][6] = T.HOUSE_WINDOW;
    g[7][5] = T.HOUSE_DOOR_HERO;

    // Right Cottage: Friend's House (Pitched Blue Shingle Roof + Windows + Front Door)
    fillRect(g, 12, 3, 6, 3, T.ROOF_BLUE);
    fillRect(g, 12, 6, 6, 2, T.HOUSE_WALL);
    g[6][13] = T.HOUSE_WINDOW;
    g[6][16] = T.HOUSE_WINDOW;
    g[7][14] = T.HOUSE_DOOR_FRIEND;

    const npcs = [
      {
        id: 'friend_axel',
        name: 'Axel (Teammate)',
        x: 9, y: 5,
        skin: '#e0ac69', hair: '#ffbe0b', kitPrimary: '#3a86ff', kitSecondary: '#ffffff',
        role: 'PROLOGUE_FRIEND',
        alertIcon: true,
        dialogue: [
          'Leo!! We need to rush to the school right now—the team of Jocks want to take over, we need to beat them!',
          'You can also visit my Mum inside my house on the right before we head up the north road to the School!'
        ]
      }
    ];

    return {
      id: 'PROLOGUE_TOWN',
      width: W,
      height: H,
      name: 'SUNNYVALE STREET',
      subtitle: 'Neighborhood',
      grid: g,
      decor: [],
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnOutsideHero: { x: 5, y: 8 },
      spawnOutsideFriend: { x: 14, y: 8 },
      spawnFromSchool: { x: 9, y: 2 },
      labels: []
    };
  }

  // Prologue Map 2: Friend's House Interior (Spacious Living Room + Full Kitchen & Dining, Zero Text Labels)
  function createFriendHouseMap() {
    const W = 20, H = 18;
    const g = makeGrid(W, H, T.VOID);

    fillRect(g, 2, 2, 16, 14, T.INT_WALL);
    fillRect(g, 3, 4, 14, 11, T.WOOD_FLOOR);

    // Sunlit Windows along back wall
    g[2][5] = T.INT_WINDOW;
    g[2][13] = T.INT_WINDOW;

    // Partial room divider pillar between Living Room (Left) & Kitchen (Right)
    fillRect(g, 10, 4, 1, 3, T.INT_WALL);

    // Living Room woven rug (Left)
    fillRect(g, 4, 7, 5, 4, T.RUG);

    // Exit doormat at bottom center
    g[14][9] = T.DOORMAT_FRIEND;
    g[14][10] = T.DOORMAT_FRIEND;

    // Multi-tile Furniture Solid Footprints:
    // Living Room: Wide Bookshelf (3..4, 3..4), TV Unit (6..7, 3..4), Coffee Table (5..6, 8), Big Sofa (4..6, 10..11), Plant (3, 12..13)
    fillRect(g, 3, 3, 2, 2, T.FURNITURE_SOLID);
    fillRect(g, 6, 3, 2, 2, T.FURNITURE_SOLID);
    fillRect(g, 5, 8, 2, 1, T.FURNITURE_SOLID);
    fillRect(g, 4, 10, 3, 2, T.FURNITURE_SOLID);
    fillRect(g, 3, 12, 1, 2, T.FURNITURE_SOLID);

    // Kitchen & Dining (Right): Full 4x2 Kitchen Counter Suite (12..15, 3..4) + 3x2 Family Dining Table (12..14, 9..10)
    fillRect(g, 12, 3, 4, 2, T.FURNITURE_SOLID);
    fillRect(g, 12, 9, 3, 2, T.FURNITURE_SOLID);

    const decor = [
      { kind: 'WIDE_BOOKSHELF', x: 3,  y: 3,  w: 2, h: 2 },
      { kind: 'TV_AND_CONSOLE', x: 6,  y: 3,  w: 2, h: 2 },
      { kind: 'COFFEE_TABLE',   x: 5,  y: 8,  w: 2, h: 1 },
      { kind: 'BIG_SOFA',       x: 4,  y: 10, w: 3, h: 2 },
      { kind: 'POTTED_PLANT',   x: 3,  y: 12, w: 1, h: 2 },
      { kind: 'KITCHEN_SUITE',  x: 12, y: 3,  w: 4, h: 2 },
      { kind: 'DINING_TABLE',   x: 12, y: 9,  w: 3, h: 2 }
    ];

    const npcs = [
      {
        id: 'friend_mum',
        name: 'Mum',
        x: 14, y: 6,
        skin: '#ffdbac', hair: '#e63946', kitPrimary: '#2a9d8f', kitSecondary: '#ffffff',
        role: 'MUM',
        dialogue: [
          'Oh, hello Leo! Good luck with your adventure today!',
          'Those school Jocks are tough, so make sure you eat something warm before you go—your whole squad\'s Stamina is 100% restored!'
        ]
      }
    ];

    const props = [
      { x: 12, y: 3, w: 4, h: 2, name: 'Kitchen', text: 'Homemade soup is simmering on the stove beside fresh halftime orange slices!' },
      { x: 12, y: 9, w: 3, h: 2, name: 'Dining Table', text: 'A warm family dining table set with a bowl of fresh fruit.' },
      { x: 4, y: 10, w: 3, h: 2, name: 'Living Room Sofa', text: 'A super comfortable family couch!' },
      { x: 6, y: 3, w: 2, h: 2, name: 'Television', text: 'Sports highlights from the Regional Striker League are playing on TV.' }
    ];

    return {
      id: 'PROLOGUE_FRIEND_HOUSE',
      width: W,
      height: H,
      name: 'FRIEND\'S HOUSE',
      subtitle: 'Living Room & Kitchen',
      grid: g,
      decor: decor,
      npcs: npcs,
      chests: [],
      props: props,
      fogOfWar: false,
      spawnDoor: { x: 9, y: 13 },
      labels: []
    };
  }

  // Prologue Map 3 & 4: Scrolling Procedural High School (38x28) — Locker Corridors & Real Classrooms!
  function createSchoolRoguelikeFloor(floorNum) {
    const MW = 38;
    const MH = 28;
    const g = makeGrid(MW, MH, T.VOID);
    const decor = [];
    const props = [];

    // 1. Build Main School Hallway Spine +Randomized Cross-Corridor
    // Horizontal Hallway runs across y = 12..14 (3 tiles wide!) from x = 3..34
    fillRect(g, 2, 11, 34, 5, T.SCHOOL_WALL);
    fillRect(g, 3, 12, 32, 3, T.SCHOOL_FLOOR);

    // Line the Main Hallway top wall (y = 11) with Blue Lockers & School Windows!
    for (let x = 4; x <= 33; x++) {
      g[11][x] = (x % 5 === 0) ? T.SCHOOL_WINDOW : T.LOCKER;
    }

    // Candidate Classroom Bays along North Wing (y: 3..10) and South Wing (y: 16..23)
    // Each bay is 7 tiles wide (interior) + walls!
    const candidateBays = [
      { side: 'N', x: 3,  y: 3,  w: 7, h: 7 },
      { side: 'N', x: 12, y: 3,  w: 7, h: 7 },
      { side: 'N', x: 21, y: 3,  w: 7, h: 7 },
      { side: 'N', x: 29, y: 3,  w: 6, h: 7 },
      { side: 'S', x: 3,  y: 16, w: 7, h: 8 },
      { side: 'S', x: 12, y: 16, w: 7, h: 8 },
      { side: 'S', x: 21, y: 16, w: 7, h: 8 },
      { side: 'S', x: 29, y: 16, w: 6, h: 8 }
    ];

    // Randomly pick 6 out of the 8 classroom bays each run so every floor layout feels fresh!
    shuffleArray(candidateBays);
    const chosenBays = candidateBays.slice(0, 6);

    const classrooms = [];

    chosenBays.forEach((bay) => {
      const rx = bay.x;
      const ry = bay.y;
      const rw = bay.w;
      const rh = bay.h;

      // Carve outer walls + warm classroom floor interior
      fillRect(g, rx - 1, ry - 1, rw + 2, rh + 2, T.SCHOOL_WALL);
      fillRect(g, rx, ry, rw, rh, T.CLASSROOM_FLOOR);

      // Connect Classroom to Main Hallway via a 2-tile-wide Classroom Doorway + short vestibule!
      const doorX = rx + Math.floor(rw / 2) - 1;
      if (bay.side === 'N') {
        // North classroom sits at y = 3..9; hallway top wall is y = 11, hallway floor is y = 12
        g[ry + rh][doorX] = T.CLASSROOM_DOOR;
        g[ry + rh][doorX + 1] = T.CLASSROOM_DOOR;
        g[11][doorX] = T.CLASSROOM_DOOR;
        g[11][doorX + 1] = T.CLASSROOM_DOOR;

        // Sunlit School Windows on North outer wall (ry - 1)
        g[ry - 1][rx + 1] = T.SCHOOL_WINDOW;
        g[ry - 1][rx + rw - 2] = T.SCHOOL_WINDOW;

        // Green Chalkboard centered on North wall + Teacher's Desk!
        const cbX = rx + Math.floor((rw - 3) / 2);
        decor.push({ kind: 'CHALKBOARD', x: cbX, y: ry - 1, w: 3, h: 1 });
        decor.push({ kind: 'TEACHER_DESK', x: rx + 1, y: ry + 1, w: 2, h: 1 });
        g[ry + 1][rx + 1] = T.FURNITURE_SOLID;
        g[ry + 1][rx + 2] = T.FURNITURE_SOLID;
      } else {
        // South classroom sits at y = 16..23; hallway bottom wall is y = 15, hallway floor is y = 14
        g[15][doorX] = T.CLASSROOM_DOOR;
        g[15][doorX + 1] = T.CLASSROOM_DOOR;

        // Green Chalkboard on South classroom's north wall (to the left of the door)
        if (rw >= 7) {
          decor.push({ kind: 'CHALKBOARD', x: rx, y: 15, w: 3, h: 1 });
        }
        decor.push({ kind: 'TEACHER_DESK', x: rx + 1, y: ry + rh - 2, w: 2, h: 1 });
        g[ry + rh - 2][rx + 1] = T.FURNITURE_SOLID;
        g[ry + rh - 2][rx + 2] = T.FURNITURE_SOLID;
      }

      // Place neat rows of Student Desks inside the classroom (leaving wide clear aisles!)
      const deskRows = [ry + 3, ry + 5];
      const deskCols = rw >= 7 ? [rx + 1, rx + 3, rx + 5] : [rx + 1, rx + 4];
      deskRows.forEach(dy => {
        deskCols.forEach(dx => {
          if (dy < ry + rh - 1 && dx < rx + rw - 1) {
            g[dy][dx] = T.STUDENT_DESK;
          }
        });
      });

      // Safe open center/aisle tile inside this classroom for spawning Player, Stairs, Enemy, or Gym Bag!
      const openX = rx + Math.floor(rw / 2);
      const openY = ry + 2;
      g[openY][openX] = T.CLASSROOM_FLOOR;

      classrooms.push({
        x: rx, y: ry, w: rw, h: rh,
        cx: openX,
        cy: openY,
        side: bay.side
      });
    });

    // Sort classrooms left-to-right so Player starts on the West end and Stairs are on the East end (or vice versa randomly!)
    classrooms.sort((a, b) => a.x - b.x);
    if (Math.random() < 0.5) classrooms.reverse();

    // Classroom 0: Player Spawn Classroom
    const startRoom = classrooms[0];
    const spawnPos = { x: startRoom.cx, y: startRoom.cy };

    // Last Classroom: School Stairwell Room (2x1 wide stairs up to next floor / Gym!)
    const stairsRoom = classrooms[classrooms.length - 1];
    g[stairsRoom.cy][stairsRoom.cx] = T.STAIRS_UP;
    if (g[stairsRoom.cy][stairsRoom.cx + 1] === T.CLASSROOM_FLOOR) {
      g[stairsRoom.cy][stairsRoom.cx + 1] = T.STAIRS_UP;
    }

    // Intermediate Classrooms: Each room has EITHER 1 Chasing Varsity Jock OR 1 Sports Gym Bag!
    const npcs = [];
    const chests = [];
    for (let i = 1; i < classrooms.length - 1; i++) {
      const rm = classrooms[i];
      if (i % 2 === 1) {
        npcs.push({
          id: `school_f${floorNum}_enemy_${i}`,
          name: `Varsity Jock`,
          x: rm.cx,
          y: rm.cy,
          skin: '#f4c29f',
          hair: '#ffd166',
          kitPrimary: '#c1121f',
          kitSecondary: '#ffffff',
          role: 'SCHOOL_ENEMY',
          chaser: true,
          alerted: false,
          defeated: false,
          teamName: `Hallway Jocks ${floorNum}-${i}`
        });
      } else {
        chests.push({
          id: `school_f${floorNum}_bag_${i}`,
          x: rm.cx,
          y: rm.cy,
          opened: false,
          isQuest: false,
          isGymBag: true,
          cash: 35 + floorNum * 15,
          item: 'ENERGY_DRINK'
        });
      }
    }

    // Add 1 extra patrolling Hallway Jock in the far end of the locker corridor!
    const hallJockX = startRoom.x < 18 ? 26 : 10;
    npcs.push({
      id: `school_f${floorNum}_hall_jock`,
      name: 'Hall Monitor Jock',
      x: hallJockX,
      y: 13,
      skin: '#e0ac69',
      hair: '#ef476f',
      kitPrimary: '#c1121f',
      kitSecondary: '#ffd166',
      role: 'SCHOOL_ENEMY',
      chaser: true,
      alerted: false,
      defeated: false,
      teamName: `Corridor Jocks ${floorNum}`
    });

    return {
      id: `PROLOGUE_SCHOOL_F${floorNum}`,
      width: MW,
      height: MH,
      name: `HIGH SCHOOL — ${floorNum}F`,
      subtitle: 'Classrooms & Corridors',
      grid: g,
      decor: decor,
      npcs: npcs,
      chests: chests,
      props: props,
      fogOfWar: true,
      visionRadius: 5.5,
      explored: makeBoolGrid(MW, MH, false),
      spawnStart: spawnPos,
      labels: []
    };
  }

  // Prologue Map 5: High School Gymnasium (Polished Court, Zero Floating Text Labels)
  function createSchoolGymMap() {
    const W = 20, H = 18;
    const g = makeGrid(W, H, T.VOID);
    fillRect(g, 1, 1, 18, 16, T.SCHOOL_WALL);
    fillRect(g, 2, 3, 16, 13, T.GYM_FLOOR);

    // Windows high up on Gym North Wall
    g[1][4] = T.SCHOOL_WINDOW;
    g[1][7] = T.SCHOOL_WINDOW;
    g[1][12] = T.SCHOOL_WINDOW;
    g[1][15] = T.SCHOOL_WINDOW;

    // Painted court boundary & center line
    fillRect(g, 3, 4, 14, 1, T.GYM_LINE);
    fillRect(g, 3, 14, 14, 1, T.GYM_LINE);
    fillRect(g, 3, 4, 1, 11, T.GYM_LINE);
    fillRect(g, 16, 4, 1, 11, T.GYM_LINE);
    fillRect(g, 3, 9, 14, 1, T.GYM_LINE);

    // Indoor Futsal Goal at North End
    g[3][9] = T.GOAL_TOP;
    g[3][10] = T.GOAL_TOP;

    const npcs = [
      {
        id: 'school_jock_boss',
        name: 'Varsity Capt. Chad',
        x: 9, y: 6,
        skin: '#e0ac69',
        hair: '#ffd166',
        kitPrimary: '#c1121f',
        kitSecondary: '#ffd166',
        role: 'SCHOOL_BOSS',
        teamName: 'Varsity Jocks V'
      }
    ];

    return {
      id: 'PROLOGUE_SCHOOL_GYM',
      width: W,
      height: H,
      name: 'SCHOOL GYMNASIUM',
      subtitle: 'Showdown vs The Jocks',
      grid: g,
      decor: [],
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnStart: { x: 9, y: 13 },
      labels: []
    };
  }

  SR.generatePrologueWorld = function () {
    return {
      isPrologue: true,
      region: {
        id: 0,
        name: 'Prologue: High School',
        townName: 'SUNNYVALE STREET',
        palette: { turf1: '#388659', turf2: '#2d6a4f', road: '#b09878', wall: '#3d352e' }
      },
      maps: [
        createBedroomMap(),                 // 0: Hero's Bedroom
        createHometownMap(),                // 1: Hometown Outside
        createFriendHouseMap(),             // 2: Friend's House (Living Room & Kitchen with Mum)
        createSchoolRoguelikeFloor(1),      // 3: School Floor 1 (38x28 Scrolling Classrooms & Locker Corridors)
        createSchoolRoguelikeFloor(2),      // 4: School Floor 2 (38x28 Scrolling Classrooms & Locker Corridors)
        createSchoolGymMap()                // 5: School Gym (Team of Jocks Mini-Boss)
      ]
    };
  };

  // =========================================================================
  // MAIN REGIONAL WORLD GENERATOR (Regions 1, 2, 3 — Base Camp -> Dungeon -> Stadium)
  // =========================================================================

  function createTownMap(region) {
    const W = 20, H = 18;
    const g = makeGrid(W, H, T.GRASS);
    fillRect(g, 0, 0, W, 1, T.TREE);
    fillRect(g, 0, H - 1, W, 1, T.TREE);
    fillRect(g, 0, 0, 1, H, T.TREE);
    fillRect(g, W - 1, 0, 1, H, T.TREE);

    fillRect(g, 8, 1, 4, H - 2, T.ROAD);
    fillRect(g, 3, 7, 14, 3, T.ROAD);
    fillRect(g, 4, 12, 12, 3, T.ROAD);

    g[1][9] = T.PORTAL_UP;
    g[1][10] = T.PORTAL_UP;

    // Clubhouse Building (Left — Red Roof + Pixel Ball Emblem)
    fillRect(g, 3, 3, 5, 2, T.ROOF_RED);
    fillRect(g, 3, 5, 5, 2, T.HOUSE_WALL);
    g[5][4] = T.HOUSE_WINDOW;
    g[5][6] = T.HOUSE_WINDOW;
    g[6][5] = T.CLUB_DOOR;

    // Pro Kit Shop Building (Right — Blue Roof + Pixel Jersey Emblem)
    fillRect(g, 12, 3, 5, 2, T.ROOF_BLUE);
    fillRect(g, 12, 5, 5, 2, T.HOUSE_WALL);
    g[5][13] = T.HOUSE_WINDOW;
    g[5][15] = T.HOUSE_WINDOW;
    g[6][14] = T.SHOP_DOOR;

    // Mini practice pitch in bottom-left
    fillRect(g, 2, 11, 5, 5, T.PITCH_LINE);
    fillRect(g, 3, 12, 3, 3, T.GRASS);

    const decor = [
      { kind: 'CLUB_SIGN', x: 5,  y: 4, w: 1, h: 1 },
      { kind: 'SHOP_SIGN', x: 14, y: 4, w: 1, h: 1 }
    ];

    const npcs = [
      {
        id: 'coach_rio',
        name: 'Coach Rio',
        x: 8, y: 10,
        skin: '#c68642', hair: '#edf2f4', kitPrimary: '#2ec4b6', kitSecondary: '#1a1a1a',
        role: 'COACH',
        dialogue: [
          `Welcome to ${region.townName} Base Camp, Captain! Amazing job beating the School Jocks!`,
          `Step into the left building (Ball Sign) to recruit Free Agents & heal Stamina, visit the Shop on the right (Jersey Sign), or head North!`
        ]
      },
      {
        id: 'quest_star',
        name: region.quest.giverName,
        x: 13, y: 11,
        skin: '#e0ac69', hair: '#ffd166', kitPrimary: '#9b5de5', kitSecondary: '#ffffff',
        role: 'QUEST_GIVER',
        alertIcon: true,
        dialogue: []
      }
    ];

    return {
      zoneIndex: 0,
      width: W,
      height: H,
      name: region.townName,
      subtitle: 'Base Camp',
      grid: g,
      decor: decor,
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnDown: { x: 9, y: 13 },
      spawnFromNorth: { x: 9, y: 2 },
      labels: []
    };
  }

  function createDungeonMap(region) {
    const W = 20, H = 18;
    const g = makeGrid(W, H, T.WALL);
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
        teamName: 'Back-Alley Strikers'
      },
      {
        id: `rival_${region.id}_2`,
        name: 'Cage Boss Kira',
        x: 10, y: 5,
        skin: '#c68642', hair: '#ffd166', kitPrimary: '#f77f00', kitSecondary: '#111',
        role: 'RIVAL',
        defeated: false,
        teamName: 'Neon Turbos V'
      }
    ];

    return {
      zoneIndex: 1,
      width: W,
      height: H,
      name: region.dungeonName,
      subtitle: 'Wild Turf & Rivals',
      grid: g,
      decor: [],
      npcs: npcs,
      chests: chests,
      props: [],
      fogOfWar: false,
      spawnDown: { x: 9, y: 15 },
      spawnFromNorth: { x: 9, y: 2 },
      labels: []
    };
  }

  function createStadiumMap(region) {
    const W = 20, H = 18;
    const g = makeGrid(W, H, T.WALL);
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
        role: 'MEDIC'
      }
    ];

    return {
      zoneIndex: 2,
      width: W,
      height: H,
      name: region.stadiumName,
      subtitle: region.boss.teamName,
      grid: g,
      decor: [],
      npcs: npcs,
      chests: [],
      props: [],
      fogOfWar: false,
      spawnDown: { x: 9, y: 14 },
      spawnFromNorth: { x: 9, y: 14 },
      labels: []
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
      tile === T.VOID ||
      tile === T.WALL ||
      tile === T.INT_WALL ||
      tile === T.INT_WINDOW ||
      tile === T.HOUSE_WALL ||
      tile === T.HOUSE_WINDOW ||
      tile === T.TREE ||
      tile === T.FENCE ||
      tile === T.FURNITURE_SOLID ||
      tile === T.SCHOOL_WALL ||
      tile === T.SCHOOL_WINDOW ||
      tile === T.LOCKER ||
      tile === T.STUDENT_DESK ||
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
