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

  function fillRect(g, x0, y0, w, h, tile) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = tile;
      }
    }
  }

  // Generate Town Hub (Zone 0)
  function createTownMap(region) {
    const g = makeGrid(T.GRASS);
    // Outer trees/walls
    fillRect(g, 0, 0, W, 1, T.WALL);
    fillRect(g, 0, H - 1, W, 1, T.WALL);
    fillRect(g, 0, 0, 1, H, T.WALL);
    fillRect(g, W - 1, 0, 1, H, T.WALL);

    // Central Roads
    fillRect(g, 8, 1, 4, H - 2, T.ROAD);
    fillRect(g, 3, 7, 14, 3, T.ROAD);
    fillRect(g, 4, 12, 12, 3, T.ROAD);

    // North Exit Portal to Dungeon
    g[1][9] = T.PORTAL_UP;
    g[1][10] = T.PORTAL_UP;

    // Left Building: Clubhouse / Free Agent Pub
    fillRect(g, 3, 3, 5, 2, T.ROOF_RED);
    fillRect(g, 3, 5, 5, 2, T.WALL);
    g[6][5] = T.CLUB_DOOR;

    // Right Building: Kit & Gear Shop
    fillRect(g, 12, 3, 5, 2, T.ROOF_BLUE);
    fillRect(g, 12, 5, 5, 2, T.WALL);
    g[6][14] = T.SHOP_DOOR;

    // Mini practice pitch in bottom-left
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
          `Welcome to ${region.townName}, Captain! Every match has 3 zones: DEFENSE, MIDFIELD, and ATTACK.`,
          `In each phase, pick a command that counters your opponent: PASS beats TACKLE, TACKLE beats DRIBBLE, and DRIBBLE beats INTERCEPT!`,
          `Step into the CLUBHOUSE (red roof) to recruit Free Agents & heal Stamina, or head NORTH to the ${region.dungeonName}!`
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
      subtitle: 'Safe Hub — Clubhouse, Shop & Quests',
      grid: g,
      npcs: npcs,
      chests: [],
      spawnDown: { x: 9, y: 13 },
      spawnFromNorth: { x: 9, y: 2 },
      labels: [
        { x: 5.5, y: 2.7, text: 'CLUB & RECRUITS', color: '#ffd166' },
        { x: 14.5, y: 2.7, text: 'PRO KIT SHOP', color: '#4cc9f0' },
        { x: 10, y: 0.8, text: '▲ TO DUNGEON', color: '#06d6a0' }
      ]
    };
  }

  // Generate Procedural Street Dungeon (Zone 1)
  function createDungeonMap(region) {
    const g = makeGrid(T.WALL);

    // Carve main procedural rooms & corridors
    fillRect(g, 2, 2, 16, 14, T.GRASS);

    // Internal procedural walls / street barriers
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

    // Wild Street Turf patches (random encounters like tall grass)
    fillRect(g, 2, 6, 3, 5, T.TURF_WILD);
    fillRect(g, 15, 6, 3, 5, T.TURF_WILD);
    fillRect(g, 7, 3, 6, 2, T.TURF_WILD);
    fillRect(g, 7, 13, 6, 2, T.TURF_WILD);

    // Central guaranteed road spine + side branches
    fillRect(g, 9, 1, 2, 16, T.ROAD);
    fillRect(g, 3, 9, 14, 2, T.ROAD);

    // South Portal back to Town, North Portal to Stadium
    g[16][9] = T.PORTAL_DOWN;
    g[16][10] = T.PORTAL_DOWN;
    g[1][9] = T.PORTAL_UP;
    g[1][10] = T.PORTAL_UP;

    // 3 Chests: 1 Quest Chest + 2 Loot Chests
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

    // Roaming / Standing Street Captains
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
      spawnDown: { x: 9, y: 15 },
      spawnFromNorth: { x: 9, y: 2 },
      labels: [
        { x: 10, y: 0.8, text: '▲ TO STADIUM BOSS', color: '#ffd166' },
        { x: 10, y: 17.3, text: '▼ BACK TO TOWN', color: '#4cc9f0' }
      ]
    };
  }

  // Generate Regional Stadium (Zone 2)
  function createStadiumMap(region) {
    const g = makeGrid(T.WALL);

    // Grand Pitch interior
    fillRect(g, 2, 2, 16, 14, T.GRASS);
    // Pitch boundary lines & halfway line
    fillRect(g, 3, 3, 14, 1, T.PITCH_LINE);
    fillRect(g, 3, 14, 14, 1, T.PITCH_LINE);
    fillRect(g, 3, 3, 1, 12, T.PITCH_LINE);
    fillRect(g, 16, 3, 1, 12, T.PITCH_LINE);
    fillRect(g, 3, 8, 14, 1, T.PITCH_LINE);

    // Goal at North End
    g[2][9] = T.GOAL_TOP;
    g[2][10] = T.GOAL_TOP;

    // South Tunnel Exit back to Dungeon
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
      spawnDown: { x: 9, y: 14 },
      spawnFromNorth: { x: 9, y: 14 },
      labels: [
        { x: 9.5, y: 4.1, text: `★ ${region.boss.teamName.toUpperCase()} ★`, color: '#ffd166' },
        { x: 10, y: 17.3, text: '▼ TUNNEL EXIT', color: '#4cc9f0' }
      ]
    };
  }

  // Generate all 3 maps for a Region
  SR.generateRegionWorld = function (regionIndex) {
    const region = SR.REGIONS[Math.min(regionIndex, SR.REGIONS.length - 1)];
    return {
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
      tile === T.GOAL_TOP
    );
  };
})(window.SR);
