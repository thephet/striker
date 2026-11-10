window.SR = window.SR || {};

(function (SR) {
  // Tile Types
  SR.TILE = {
    GRASS: 0,
    ROAD: 1,
    WALL: 2,
    TURF_WILD: 3,         // High-encounter street pitch turf (like tall grass)
    PORTAL_UP: 4,         // Exit to next zone
    PORTAL_DOWN: 5,       // Exit to previous zone
    CLUB_DOOR: 6,         // Clubhouse / Free Agents & Rest
    SHOP_DOOR: 7,         // Kit & Item Shop
    ROOF_RED: 8,
    ROOF_BLUE: 9,
    WATER: 10,
    PITCH_LINE: 11,
    GOAL_TOP: 12,
    WOOD_FLOOR: 13,       // Bedroom & House interior wood floor
    RUG: 14,              // Cozy living room / bedroom rug
    BED: 15,              // Hero's bed
    SOFA: 16,             // Living room / bedroom sofa
    TV_CONSOLE: 17,       // CRT TV + retro console connected
    BOOKSHELF: 18,        // Bookshelf with colorful books
    KITCHEN_COUNTER: 19,  // Kitchen stove/sink/counter
    HOUSE_DOOR_HERO: 20,  // Door to Hero's house / bedroom
    HOUSE_DOOR_FRIEND: 21,// Door to Friend's house (Mum's kitchen/living room)
    SCHOOL_FLOOR: 22,     // School hallway & classroom floor
    STAIRS_UP: 23,        // Roguelike stairs to next school floor / gym
    GYM_FLOOR: 24,        // Hardwood school gym court
    GYM_LINE: 25          // Painted gym court line
  };

  // Draw a 16x16 Overworld Tile
  SR.drawTile = function (ctx, type, x, y, palette, tick) {
    const pal = palette || { turf1: '#234f2e', turf2: '#1d4226', road: '#5c5346', wall: '#3d352e' };

    switch (type) {
      case SR.TILE.GRASS: {
        ctx.fillStyle = pal.turf1;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = pal.turf2;
        ctx.fillRect(x + 2, y + 3, 2, 2);
        ctx.fillRect(x + 11, y + 10, 2, 2);
        ctx.fillRect(x + 6, y + 13, 2, 1);
        break;
      }
      case SR.TILE.ROAD: {
        ctx.fillStyle = pal.road;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + 1, y + 1, 6, 6);
        ctx.fillRect(x + 9, y + 8, 6, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 1, y + 1, 5, 1);
        ctx.fillRect(x + 9, y + 8, 5, 1);
        break;
      }
      case SR.TILE.WALL: {
        ctx.fillStyle = pal.wall;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, y + 7, 16, 2);
        ctx.fillRect(x, y + 14, 16, 2);
        ctx.fillRect(x + 7, y, 2, 7);
        ctx.fillRect(x + 13, y + 9, 2, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 1, y + 1, 5, 1);
        ctx.fillRect(x + 1, y + 9, 10, 1);
        break;
      }
      case SR.TILE.TURF_WILD: {
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#40916c';
        ctx.fillRect(x, y, 8, 8);
        ctx.fillRect(x + 8, y + 8, 8, 8);
        ctx.fillStyle = '#74c69d';
        const sway = (Math.floor(tick / 20) % 2);
        ctx.fillRect(x + 3 + sway, y + 3, 1, 4);
        ctx.fillRect(x + 5 + sway, y + 2, 1, 5);
        ctx.fillRect(x + 11 - sway, y + 9, 1, 4);
        ctx.fillRect(x + 13 - sway, y + 8, 1, 5);
        break;
      }
      case SR.TILE.PORTAL_UP:
      case SR.TILE.PORTAL_DOWN: {
        ctx.fillStyle = pal.road;
        ctx.fillRect(x, y, 16, 16);
        const glow = (Math.floor(tick / 12) % 2) === 0 ? '#ffd166' : '#4cc9f0';
        ctx.fillStyle = '#1d3557';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.strokeStyle = glow;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2.5, y + 2.5, 11, 11);
        ctx.fillStyle = glow;
        if (type === SR.TILE.PORTAL_UP) {
          ctx.fillRect(x + 7, y + 4, 2, 7);
          ctx.fillRect(x + 5, y + 6, 6, 2);
        } else {
          ctx.fillRect(x + 7, y + 5, 2, 7);
          ctx.fillRect(x + 5, y + 8, 6, 2);
        }
        break;
      }
      case SR.TILE.ROOF_RED:
      case SR.TILE.ROOF_BLUE: {
        const mainC = type === SR.TILE.ROOF_RED ? '#c1121f' : '#0077b6';
        const hiC = type === SR.TILE.ROOF_RED ? '#ef476f' : '#48cae4';
        ctx.fillStyle = mainC;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = hiC;
        ctx.fillRect(x, y + 2, 16, 2);
        ctx.fillRect(x, y + 8, 16, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, y + 14, 16, 2);
        break;
      }
      case SR.TILE.CLUB_DOOR:
      case SR.TILE.SHOP_DOOR:
      case SR.TILE.HOUSE_DOOR_HERO:
      case SR.TILE.HOUSE_DOOR_FRIEND: {
        ctx.fillStyle = '#e0d6c3';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 3, y + 3, 10, 13);
        const lintel = type === SR.TILE.CLUB_DOOR ? '#ffd166'
          : type === SR.TILE.SHOP_DOOR ? '#4cc9f0'
          : type === SR.TILE.HOUSE_DOOR_HERO ? '#ef476f'
          : '#06d6a0';
        ctx.fillStyle = lintel;
        ctx.fillRect(x + 3, y + 1, 10, 2);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 10, y + 9, 2, 2);
        break;
      }
      case SR.TILE.PITCH_LINE: {
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#f1faee';
        ctx.fillRect(x + 7, y, 2, 16);
        ctx.fillRect(x, y + 7, 16, 2);
        break;
      }
      case SR.TILE.GOAL_TOP: {
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 1, y + 2, 14, 3);
        ctx.fillRect(x + 1, y + 2, 2, 12);
        ctx.fillRect(x + 13, y + 2, 2, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 3, y + 5, 10, 7);
        break;
      }
      case SR.TILE.WOOD_FLOOR: {
        ctx.fillStyle = '#8d5b3c';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#73482d';
        ctx.fillRect(x, y + 4, 16, 1);
        ctx.fillRect(x, y + 9, 16, 1);
        ctx.fillRect(x, y + 14, 16, 1);
        ctx.fillRect(x + 6, y, 1, 4);
        ctx.fillRect(x + 12, y + 5, 1, 4);
        break;
      }
      case SR.TILE.RUG: {
        ctx.fillStyle = '#8d5b3c';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#9b2226';
        ctx.fillRect(x + 1, y + 1, 14, 14);
        ctx.strokeStyle = '#ffd166';
        ctx.strokeRect(x + 2.5, y + 2.5, 11, 11);
        break;
      }
      case SR.TILE.BED: {
        // Wood floor base + bed frame + pillow + blue blanket
        ctx.fillStyle = '#8d5b3c';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(x + 1, y + 1, 14, 14);
        // Pillow
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(x + 3, y + 2, 10, 4);
        // Blanket
        ctx.fillStyle = '#3a86ff';
        ctx.fillRect(x + 2, y + 6, 12, 8);
        ctx.fillStyle = '#4cc9f0';
        ctx.fillRect(x + 2, y + 6, 12, 2);
        break;
      }
      case SR.TILE.SOFA: {
        ctx.fillStyle = '#8d5b3c';
        ctx.fillRect(x, y, 16, 16);
        // Plush green/teal retro sofa
        ctx.fillStyle = '#1b4332';
        ctx.fillRect(x + 1, y + 3, 14, 11);
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(x + 2, y + 4, 12, 5);
        ctx.fillStyle = '#40916c';
        ctx.fillRect(x + 3, y + 8, 10, 5);
        break;
      }
      case SR.TILE.TV_CONSOLE: {
        // Wood floor + CRT TV at top + Retro Game Console box & wire at bottom
        ctx.fillStyle = '#8d5b3c';
        ctx.fillRect(x, y, 16, 16);
        // CRT casing
        ctx.fillStyle = '#2b2d42';
        ctx.fillRect(x + 2, y + 1, 12, 9);
        // Animated screen glow
        ctx.fillStyle = (Math.floor(tick / 15) % 2 === 0) ? '#4cc9f0' : '#3a86ff';
        ctx.fillRect(x + 3, y + 2, 9, 7);
        // Wire to console
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 7, y + 10, 1, 2);
        // Retro 16-bit console on floor
        ctx.fillStyle = '#adb5bd';
        ctx.fillRect(x + 4, y + 11, 8, 4);
        ctx.fillStyle = '#ef476f';
        ctx.fillRect(x + 5, y + 12, 2, 2);
        ctx.fillStyle = '#2b2d42';
        ctx.fillRect(x + 8, y + 12, 3, 2);
        break;
      }
      case SR.TILE.BOOKSHELF: {
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#2b1807';
        ctx.fillRect(x + 1, y + 2, 14, 5);
        ctx.fillRect(x + 1, y + 9, 14, 5);
        // Colorful book spines
        const cols = ['#ef476f', '#ffd166', '#06d6a0', '#4cc9f0', '#9b5de5'];
        for (let b = 0; b < 5; b++) {
          ctx.fillStyle = cols[b];
          ctx.fillRect(x + 2 + b * 2.5, y + 3, 2, 4);
          ctx.fillStyle = cols[(b + 2) % 5];
          ctx.fillRect(x + 2 + b * 2.5, y + 10, 2, 4);
        }
        break;
      }
      case SR.TILE.KITCHEN_COUNTER: {
        ctx.fillStyle = '#8d5b3c';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#6c757d';
        ctx.fillRect(x, y + 2, 16, 13);
        ctx.fillStyle = '#dee2e6';
        ctx.fillRect(x + 1, y + 2, 14, 6);
        // Burners / Sink detail
        ctx.fillStyle = '#ef476f';
        ctx.fillRect(x + 3, y + 4, 3, 3);
        ctx.fillStyle = '#4cc9f0';
        ctx.fillRect(x + 9, y + 3, 5, 4);
        break;
      }
      case SR.TILE.SCHOOL_FLOOR: {
        ctx.fillStyle = '#3d405b';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#33364d';
        ctx.fillRect(x, y, 8, 8);
        ctx.fillRect(x + 8, y + 8, 8, 8);
        break;
      }
      case SR.TILE.STAIRS_UP: {
        ctx.fillStyle = '#3d405b';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#1d3557';
        ctx.fillRect(x + 1, y + 1, 14, 14);
        // Gold steps ascending
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 2, y + 11, 12, 2);
        ctx.fillRect(x + 4, y + 8, 10, 2);
        ctx.fillRect(x + 6, y + 5, 8, 2);
        ctx.fillRect(x + 8, y + 2, 6, 2);
        break;
      }
      case SR.TILE.GYM_FLOOR: {
        ctx.fillStyle = '#c98a4b';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#b5783c';
        ctx.fillRect(x, y + 5, 16, 1);
        ctx.fillRect(x, y + 11, 16, 1);
        break;
      }
      case SR.TILE.GYM_LINE: {
        ctx.fillStyle = '#c98a4b';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y, 2, 16);
        ctx.fillRect(x, y + 7, 16, 2);
        break;
      }
      default: {
        ctx.fillStyle = pal.turf1;
        ctx.fillRect(x, y, 16, 16);
      }
    }
  };

  // Draw a 16x16 Character Sprite (Player, NPC, Opponent, or Match Footballer)
  SR.drawCharacter = function (ctx, x, y, opts, tick) {
    const skin = (opts && opts.skin) || '#f4c29f';
    const hair = (opts && opts.hair) || '#2b2d42';
    const kit1 = (opts && opts.kitPrimary) || '#3a86ff';
    const kit2 = (opts && opts.kitSecondary) || '#ffffff';
    const bounce = opts && opts.moving ? (Math.floor(tick / 8) % 2) : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 3, y + 13, 10, 3);

    const py = y - bounce;

    // Boots / Legs
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 4, py + 12, 3, 3);
    ctx.fillRect(x + 9, py + 12, 3, 3);

    // Shorts
    ctx.fillStyle = kit2;
    ctx.fillRect(x + 4, py + 10, 8, 2);

    // Jersey / Torso
    ctx.fillStyle = kit1;
    ctx.fillRect(x + 3, py + 6, 10, 4);
    ctx.fillStyle = kit2;
    ctx.fillRect(x + 7, py + 6, 2, 4);

    // Arms
    ctx.fillStyle = skin;
    ctx.fillRect(x + 2, py + 7, 1, 3);
    ctx.fillRect(x + 13, py + 7, 1, 3);

    // Head
    ctx.fillStyle = skin;
    ctx.fillRect(x + 4, py + 2, 8, 5);

    // Eyes
    ctx.fillStyle = '#0d1017';
    ctx.fillRect(x + 5, py + 4, 2, 2);
    ctx.fillRect(x + 9, py + 4, 2, 2);

    // Hair & Headband
    ctx.fillStyle = hair;
    ctx.fillRect(x + 3, py + 0, 10, 3);
    ctx.fillRect(x + 3, py + 2, 1, 2);
    ctx.fillRect(x + 12, py + 2, 1, 2);

    if (opts && opts.hasBall) {
      SR.drawBall(ctx, x + 11, y + 11);
    }
  };

  // Draw a crisp pixel Football (6x6)
  SR.drawBall = function (ctx, x, y) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 1, y + 1, 4, 4);
    ctx.fillStyle = '#111111';
    ctx.fillRect(x + 2, y + 2, 2, 2);
  };

  // Draw a Loot Chest (16x16)
  SR.drawChest = function (ctx, x, y, opened, isQuestChest) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2, y + 13, 12, 3);

    ctx.fillStyle = isQuestChest ? '#9b5de5' : '#b5651d';
    ctx.fillRect(x + 2, y + 4, 12, 10);

    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x + 2, y + 4, 12, 2);
    ctx.fillRect(x + 2, y + 8, 12, 2);
    ctx.fillRect(x + 7, y + 7, 2, 4);

    if (opened) {
      ctx.fillStyle = '#111';
      ctx.fillRect(x + 3, y + 5, 10, 3);
    }
  };
})(window.SR);
