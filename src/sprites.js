window.SR = window.SR || {};

(function (SR) {
  // Tile Types
  SR.TILE = {
    GRASS: 0,
    ROAD: 1,
    WALL: 2,
    TURF_WILD: 3,          // Street pitch encounter turf
    PORTAL_UP: 4,          // Exit to next zone
    PORTAL_DOWN: 5,        // Exit to previous zone
    CLUB_DOOR: 6,          // Clubhouse / Free Agents & Rest
    SHOP_DOOR: 7,          // Kit & Item Shop
    ROOF_RED: 8,
    ROOF_BLUE: 9,
    WATER: 10,
    PITCH_LINE: 11,
    GOAL_TOP: 12,
    WOOD_FLOOR: 13,        // Warm honey-oak floorboards
    RUG: 14,               // Woven area rug
    BED: 15,               // Legacy/collision bed tile
    SOFA: 16,              // Legacy/collision sofa tile
    TV_CONSOLE: 17,        // Legacy/collision TV tile
    BOOKSHELF: 18,         // Legacy/collision bookshelf tile
    KITCHEN_COUNTER: 19,   // Legacy/collision counter tile
    HOUSE_DOOR_HERO: 20,   // Door/Doormat for Hero's House
    HOUSE_DOOR_FRIEND: 21, // Door/Doormat for Friend's House
    SCHOOL_FLOOR: 22,      // Bright linoleum school corridor floor
    STAIRS_UP: 23,         // School stairwell leading up
    GYM_FLOOR: 24,         // Hardwood school gymnasium court
    GYM_LINE: 25,          // Painted gym court line

    // New Rich GBA Architecture, Nature & School Tiles
    VOID: 26,              // Clean dark background outside indoor walls
    INT_WALL: 27,          // House interior wallpaper + wainscoting baseboard
    INT_WINDOW: 28,        // Sunlit house interior window
    DOORMAT_HERO: 29,      // Indoor exit mat (Hero's bedroom -> outside)
    DOORMAT_FRIEND: 30,    // Indoor exit mat (Friend's house -> outside)
    HOUSE_WALL: 31,        // Cream stucco exterior house wall
    HOUSE_WINDOW: 32,      // Exterior house window with shutters
    TREE: 33,              // Leafy GBA neighborhood tree
    FENCE: 34,             // White wooden picket fence
    FLOWERS: 35,           // Walkable grass with animated wildflowers
    FURNITURE_SOLID: 36,   // Solid tile covered by multi-tile SR.drawDecor furniture
    SCHOOL_WALL: 37,       // Painted cream/blue school wall
    LOCKER: 38,            // Tall blue steel school locker along corridor wall
    CLASSROOM_FLOOR: 39,   // Warm classroom parquet/tile floor
    CLASSROOM_DOOR: 40,    // Open classroom threshold doorway
    STUDENT_DESK: 41,      // Classroom student desk + chair
    SCHOOL_WINDOW: 42      // School hallway/classroom window
  };

  // Draw a 16x16 Base Tile
  SR.drawTile = function (ctx, type, x, y, palette, tick) {
    const pal = palette || { turf1: '#388659', turf2: '#2d6a4f', road: '#b09878', wall: '#3d352e' };
    const T = SR.TILE;

    switch (type) {
      case T.VOID: {
        ctx.fillStyle = '#090c12';
        ctx.fillRect(x, y, 16, 16);
        break;
      }

      case T.GRASS: {
        ctx.fillStyle = pal.turf1;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = pal.turf2;
        ctx.fillRect(x + 2, y + 3, 2, 2);
        ctx.fillRect(x + 11, y + 10, 2, 2);
        ctx.fillRect(x + 6, y + 13, 2, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x + 9, y + 4, 2, 1);
        break;
      }

      case T.FLOWERS: {
        ctx.fillStyle = pal.turf1;
        ctx.fillRect(x, y, 16, 16);
        const sway = (Math.floor(tick / 24) % 2);
        // Stems
        ctx.fillStyle = '#1b4332';
        ctx.fillRect(x + 4, y + 6, 2, 3);
        ctx.fillRect(x + 11, y + 11, 2, 3);
        // Petals
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 3 + sway, y + 4, 4, 3);
        ctx.fillStyle = '#ff595e';
        ctx.fillRect(x + 4 + sway, y + 5, 2, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 10 - sway, y + 9, 4, 3);
        ctx.fillStyle = '#ffca3a';
        ctx.fillRect(x + 11 - sway, y + 10, 2, 1);
        break;
      }

      case T.TREE: {
        // Grass base + lush GBA round tree canopy
        ctx.fillStyle = pal.turf1;
        ctx.fillRect(x, y, 16, 16);
        // Shadow & trunk
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x + 2, y + 12, 12, 3);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 6, y + 10, 4, 5);
        // Canopy layers
        ctx.fillStyle = '#1b4332';
        ctx.fillRect(x + 1, y + 2, 14, 10);
        ctx.fillRect(x + 3, y + 1, 10, 11);
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(x + 2, y + 2, 12, 8);
        ctx.fillStyle = '#52b788';
        ctx.fillRect(x + 4, y + 2, 8, 4);
        ctx.fillRect(x + 3, y + 4, 4, 3);
        break;
      }

      case T.FENCE: {
        ctx.fillStyle = pal.turf1;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, y + 13, 16, 2);
        // Rails
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x, y + 7, 16, 2);
        ctx.fillRect(x, y + 11, 16, 2);
        // Posts
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x + 2, y + 4, 3, 10);
        ctx.fillRect(x + 11, y + 4, 3, 10);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 2, y + 13, 3, 1);
        ctx.fillRect(x + 11, y + 13, 3, 1);
        break;
      }

      case T.ROAD: {
        ctx.fillStyle = pal.road;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x + 1, y + 2, 6, 5);
        ctx.fillRect(x + 9, y + 9, 6, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(x + 1, y + 2, 5, 1);
        ctx.fillRect(x + 9, y + 9, 5, 1);
        break;
      }

      case T.WALL: {
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

      case T.HOUSE_WALL: {
        // Warm cream cottage siding exterior wall
        ctx.fillStyle = '#ede0d4';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#ddb892';
        ctx.fillRect(x, y + 4, 16, 1);
        ctx.fillRect(x, y + 9, 16, 1);
        ctx.fillStyle = '#7f5539';
        ctx.fillRect(x, y + 14, 16, 2);
        break;
      }

      case T.HOUSE_WINDOW: {
        ctx.fillStyle = '#ede0d4';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#7f5539';
        ctx.fillRect(x, y + 14, 16, 2);
        // Shutters
        ctx.fillStyle = '#457b9d';
        ctx.fillRect(x + 1, y + 3, 2, 9);
        ctx.fillRect(x + 13, y + 3, 2, 9);
        // Frame & Glass
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 3, y + 2, 10, 10);
        ctx.fillStyle = '#90e0ef';
        ctx.fillRect(x + 4, y + 3, 8, 8);
        ctx.fillStyle = '#caf0f8';
        ctx.fillRect(x + 4, y + 3, 3, 3);
        // Mullion cross
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 7, y + 3, 2, 8);
        ctx.fillRect(x + 4, y + 6, 8, 2);
        break;
      }

      case T.INT_WALL: {
        // Warm GBA interior wallpaper + wooden wainscoting trim
        ctx.fillStyle = '#f3e9d2';
        ctx.fillRect(x, y, 16, 10);
        // Subtle wallpaper stripe
        ctx.fillStyle = '#e6d8b8';
        ctx.fillRect(x + 3, y, 2, 10);
        ctx.fillRect(x + 11, y, 2, 10);
        // Wainscoting wood dado rail & paneling
        ctx.fillStyle = '#6f4518';
        ctx.fillRect(x, y + 10, 16, 2);
        ctx.fillStyle = '#8b5e34';
        ctx.fillRect(x, y + 12, 16, 3);
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(x, y + 15, 16, 1);
        break;
      }

      case T.INT_WINDOW: {
        // Interior wall with bright sunlit window
        SR.drawTile(ctx, T.INT_WALL, x, y, palette, tick);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 2, y + 1, 12, 10);
        ctx.fillStyle = '#90e0ef';
        ctx.fillRect(x + 3, y + 2, 10, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 3, 3, 3);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 7, y + 2, 2, 8);
        break;
      }

      case T.WOOD_FLOOR:
      case T.FURNITURE_SOLID: {
        // Warm honey-oak floorboards
        ctx.fillStyle = '#c68b59';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#b07646';
        ctx.fillRect(x, y + 5, 16, 1);
        ctx.fillRect(x, y + 11, 16, 1);
        ctx.fillRect(x + 7, y, 1, 5);
        ctx.fillRect(x + 13, y + 6, 1, 5);
        ctx.fillRect(x + 4, y + 12, 1, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 1, y + 1, 5, 1);
        ctx.fillRect(x + 1, y + 7, 10, 1);
        break;
      }

      case T.RUG: {
        SR.drawTile(ctx, T.WOOD_FLOOR, x, y, palette, tick);
        ctx.fillStyle = '#a4161a';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#ba181b';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 1, y + 1, 14, 1);
        ctx.fillRect(x + 1, y + 14, 14, 1);
        ctx.fillRect(x + 7, y + 7, 2, 2);
        break;
      }

      case T.DOORMAT_HERO:
      case T.DOORMAT_FRIEND: {
        // Pokémon-style indoor exit doormat with subtle downward indicator
        SR.drawTile(ctx, T.WOOD_FLOOR, x, y, palette, tick);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 1, y + 3, 14, 11);
        ctx.fillStyle = type === T.DOORMAT_HERO ? '#d94e4e' : '#2a9d8f';
        ctx.fillRect(x + 2, y + 4, 12, 9);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 6, y + 7, 4, 2);
        ctx.fillRect(x + 7, y + 9, 2, 2);
        break;
      }

      case T.TURF_WILD: {
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

      case T.PORTAL_UP:
      case T.PORTAL_DOWN: {
        ctx.fillStyle = pal.road;
        ctx.fillRect(x, y, 16, 16);
        const glow = (Math.floor(tick / 14) % 2) === 0 ? '#ffd166' : '#ffffff';
        ctx.fillStyle = 'rgba(29, 53, 87, 0.55)';
        ctx.fillRect(x + 3, y + 3, 10, 10);
        ctx.fillStyle = glow;
        if (type === T.PORTAL_UP) {
          ctx.fillRect(x + 7, y + 4, 2, 7);
          ctx.fillRect(x + 5, y + 6, 6, 2);
        } else {
          ctx.fillRect(x + 7, y + 5, 2, 7);
          ctx.fillRect(x + 5, y + 8, 6, 2);
        }
        break;
      }

      case T.ROOF_RED:
      case T.ROOF_BLUE: {
        const mainC = type === T.ROOF_RED ? '#bc3908' : '#1d6fa5';
        const hiC = type === T.ROOF_RED ? '#e85d04' : '#38a3a5';
        const darkC = type === T.ROOF_RED ? '#7f1d1d' : '#0f3d5e';
        ctx.fillStyle = mainC;
        ctx.fillRect(x, y, 16, 16);
        // Shingle pattern
        ctx.fillStyle = hiC;
        ctx.fillRect(x, y + 2, 16, 2);
        ctx.fillRect(x, y + 8, 16, 2);
        ctx.fillStyle = darkC;
        ctx.fillRect(x, y + 6, 16, 1);
        ctx.fillRect(x, y + 13, 16, 3);
        ctx.fillRect(x + 7, y + 2, 1, 4);
        ctx.fillRect(x + 15, y + 8, 1, 5);
        break;
      }

      case T.CLUB_DOOR:
      case T.SHOP_DOOR:
      case T.HOUSE_DOOR_HERO:
      case T.HOUSE_DOOR_FRIEND: {
        ctx.fillStyle = '#ede0d4';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#7f5539';
        ctx.fillRect(x, y + 14, 16, 2);
        // Doorframe
        ctx.fillStyle = '#3d2514';
        ctx.fillRect(x + 2, y + 2, 12, 14);
        // Wood door panel
        ctx.fillStyle = '#6f4518';
        ctx.fillRect(x + 3, y + 3, 10, 13);
        // Door window & awning color cue (no text needed!)
        const awning = type === T.CLUB_DOOR ? '#ffd166'
          : type === T.SHOP_DOOR ? '#4cc9f0'
          : type === T.HOUSE_DOOR_HERO ? '#e85d04'
          : '#38a3a5';
        ctx.fillStyle = awning;
        ctx.fillRect(x + 1, y + 0, 14, 3);
        ctx.fillStyle = '#caf0f8';
        ctx.fillRect(x + 5, y + 5, 6, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 10, y + 10, 2, 2);
        break;
      }

      // ================= SCHOOL TILES =================
      case T.SCHOOL_FLOOR: {
        // Bright polished cream & powder-blue school hallway linoleum tiles!
        ctx.fillStyle = '#e8edf2';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#d0dce8';
        ctx.fillRect(x, y, 8, 8);
        ctx.fillRect(x + 8, y + 8, 8, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x + 1, y + 1, 5, 1);
        ctx.fillRect(x + 9, y + 9, 5, 1);
        break;
      }

      case T.CLASSROOM_FLOOR: {
        // Warm tan classroom flooring
        ctx.fillStyle = '#d8be98';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#c8ab83';
        ctx.fillRect(x, y + 7, 16, 1);
        ctx.fillRect(x, y + 15, 16, 1);
        ctx.fillRect(x + 8, y, 1, 7);
        break;
      }

      case T.CLASSROOM_DOOR: {
        // Open classroom threshold connecting hallway & classroom
        ctx.fillStyle = '#c8ab83';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#7f5539';
        ctx.fillRect(x, y, 2, 16);
        ctx.fillRect(x + 14, y, 2, 16);
        ctx.fillStyle = '#b08968';
        ctx.fillRect(x + 2, y + 6, 12, 4);
        break;
      }

      case T.SCHOOL_WALL: {
        // Institutional cream upper wall + navy/slate lower stripe & molding
        ctx.fillStyle = '#f1ece1';
        ctx.fillRect(x, y, 16, 10);
        ctx.fillStyle = '#3d5a80';
        ctx.fillRect(x, y + 10, 16, 5);
        ctx.fillStyle = '#293241';
        ctx.fillRect(x, y + 9, 16, 1);
        ctx.fillRect(x, y + 15, 16, 1);
        break;
      }

      case T.SCHOOL_WINDOW: {
        SR.drawTile(ctx, T.SCHOOL_WALL, x, y, palette, tick);
        ctx.fillStyle = '#293241';
        ctx.fillRect(x + 2, y + 1, 12, 9);
        ctx.fillStyle = '#a8dadc';
        ctx.fillRect(x + 3, y + 2, 10, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 3, 3, 2);
        ctx.fillStyle = '#293241';
        ctx.fillRect(x + 7, y + 2, 2, 7);
        break;
      }

      case T.LOCKER: {
        // Two tall steel blue high-school lockers side-by-side!
        ctx.fillStyle = '#293241';
        ctx.fillRect(x, y, 16, 16);
        for (let lx = 1; lx <= 8; lx += 7) {
          ctx.fillStyle = '#3a86ff';
          ctx.fillRect(x + lx, y + 1, 6, 14);
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(x + lx, y + 1, 6, 1);
          // Locker vents
          ctx.fillStyle = '#1d3557';
          ctx.fillRect(x + lx + 1, y + 3, 4, 1);
          ctx.fillRect(x + lx + 1, y + 5, 4, 1);
          // Handle
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(x + lx + 4, y + 8, 1, 3);
        }
        break;
      }

      case T.STUDENT_DESK: {
        // Classroom floor underneath + wooden student desk + blue chair tucked behind!
        SR.drawTile(ctx, T.CLASSROOM_FLOOR, x, y, palette, tick);
        // Chair back (north side)
        ctx.fillStyle = '#3d5a80';
        ctx.fillRect(x + 4, y + 1, 8, 4);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x + 2, y + 13, 12, 2);
        // Wooden desk top
        ctx.fillStyle = '#6f4518';
        ctx.fillRect(x + 2, y + 5, 12, 8);
        ctx.fillStyle = '#a66e38';
        ctx.fillRect(x + 3, y + 6, 10, 6);
        // Open white notebook & pencil on desk!
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(x + 5, y + 7, 4, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 10, y + 8, 1, 3);
        break;
      }

      case T.STAIRS_UP: {
        // School Stairwell with steel handrail & bright steps!
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 1, y + 1, 14, 14);
        // Ascending light concrete steps
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + 2, y + 12, 12, 2);
        ctx.fillRect(x + 2, y + 9, 12, 2);
        ctx.fillRect(x + 2, y + 6, 12, 2);
        ctx.fillRect(x + 2, y + 3, 12, 2);
        // Yellow safety handrails on sides
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x + 1, y + 1, 2, 14);
        ctx.fillRect(x + 13, y + 1, 2, 14);
        break;
      }

      case T.PITCH_LINE: {
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#f1faee';
        ctx.fillRect(x + 7, y, 2, 16);
        ctx.fillRect(x, y + 7, 16, 2);
        break;
      }

      case T.GOAL_TOP: {
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

      case T.GYM_FLOOR: {
        ctx.fillStyle = '#d49452';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#bf8040';
        ctx.fillRect(x, y + 5, 16, 1);
        ctx.fillRect(x, y + 11, 16, 1);
        break;
      }

      case T.GYM_LINE: {
        ctx.fillStyle = '#d49452';
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

  // =========================================================================
  // MULTI-TILE GBA FURNITURE & SCHOOL PROPS RENDERER (SR.drawDecor)
  // =========================================================================
  SR.drawDecor = function (ctx, d, sx, sy, tick) {
    switch (d.kind) {
      case 'BIG_BED': {
        // 2x3 tiles (32x48 px) cozy double/twin bed!
        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(sx + 3, sy + 6, 28, 41);
        // Oak bedframe & headboard
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(sx + 2, sy + 2, 28, 44);
        ctx.fillStyle = '#7f4f24';
        ctx.fillRect(sx + 3, sy + 3, 26, 9);
        // Bedposts
        ctx.fillStyle = '#9c6644';
        ctx.fillRect(sx + 2, sy + 1, 4, 4);
        ctx.fillRect(sx + 26, sy + 1, 4, 4);
        ctx.fillRect(sx + 2, sy + 42, 4, 4);
        ctx.fillRect(sx + 26, sy + 42, 4, 4);
        // Crisp white mattress sheet & two fluffy pillows
        ctx.fillStyle = '#e9ecef';
        ctx.fillRect(sx + 4, sy + 11, 24, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 5, sy + 12, 10, 7);
        ctx.fillRect(sx + 17, sy + 12, 10, 7);
        // Quilted cobalt-blue comforter + folded top cuff
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(sx + 4, sy + 20, 24, 23);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(sx + 4, sy + 20, 24, 5);
        // Quilt stitching lines
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(sx + 11, sy + 25, 1, 18);
        ctx.fillRect(sx + 20, sy + 25, 1, 18);
        ctx.fillRect(sx + 4, sy + 33, 24, 1);
        break;
      }

      case 'BIG_SOFA': {
        // 3x2 tiles (48x32 px) wide plush 3-seater living/bedroom couch!
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(sx + 2, sy + 6, 45, 25);
        // Sofa backrest
        ctx.fillStyle = '#1b4332';
        ctx.fillRect(sx + 2, sy + 3, 44, 25);
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(sx + 4, sy + 4, 40, 11);
        // 3 Back cushions
        ctx.fillStyle = '#40916c';
        ctx.fillRect(sx + 6, sy + 5, 11, 9);
        ctx.fillRect(sx + 18, sy + 5, 12, 9);
        ctx.fillRect(sx + 31, sy + 5, 11, 9);
        // 3 Plush seat cushions
        ctx.fillStyle = '#52b788';
        ctx.fillRect(sx + 6, sy + 15, 11, 10);
        ctx.fillRect(sx + 18, sy + 15, 12, 10);
        ctx.fillRect(sx + 31, sy + 15, 11, 10);
        // Left & Right rolled armrests
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(sx + 1, sy + 9, 5, 19);
        ctx.fillRect(sx + 42, sy + 9, 5, 19);
        // Throw pillow
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(sx + 7, sy + 13, 5, 5);
        break;
      }

      case 'COFFEE_TABLE': {
        // 2x1 tiles (32x16 px) low wooden coffee table
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx + 3, sy + 5, 27, 10);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(sx + 2, sy + 3, 28, 10);
        ctx.fillStyle = '#8b5e34';
        ctx.fillRect(sx + 3, sy + 4, 26, 7);
        // Magazine & mug on table
        ctx.fillStyle = '#4cc9f0';
        ctx.fillRect(sx + 7, sy + 5, 6, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 21, sy + 6, 3, 3);
        break;
      }

      case 'TV_AND_CONSOLE': {
        // 2x2 tiles (32x32 px) Wide CRT TV on wooden cabinet + old 16-bit console & gamepads wired below!
        // Wooden TV stand
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(sx + 2, sy + 12, 28, 10);
        ctx.fillStyle = '#3d2514';
        ctx.fillRect(sx + 4, sy + 14, 11, 6);
        ctx.fillRect(sx + 17, sy + 14, 11, 6);
        // Big CRT Television
        ctx.fillStyle = '#2b2d42';
        ctx.fillRect(sx + 4, sy + 0, 24, 15);
        ctx.fillStyle = '#4a4e69';
        ctx.fillRect(sx + 5, sy + 1, 22, 1);
        // Animated football pitch screen on CRT!
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(sx + 6, sy + 2, 17, 11);
        ctx.fillStyle = '#52b788';
        ctx.fillRect(sx + 14, sy + 2, 1, 11);
        const bx = (Math.floor(tick / 10) % 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 9 + bx, sy + 6, 2, 2);
        // Power LED & speaker grill
        ctx.fillStyle = '#06d6a0';
        ctx.fillRect(sx + 25, sy + 11, 2, 1);

        // Black AV cable running down to the retro console on the floor!
        ctx.fillStyle = '#111111';
        ctx.fillRect(sx + 15, sy + 21, 2, 4);

        // Classic SNES-style grey/purple 16-bit console on the floor!
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(sx + 8, sy + 25, 14, 7);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(sx + 8, sy + 24, 13, 7);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx + 9, sy + 25, 11, 2);
        // Cartridge & purple power/reset switches
        ctx.fillStyle = '#7209b7';
        ctx.fillRect(sx + 10, sy + 28, 3, 2);
        ctx.fillRect(sx + 16, sy + 28, 3, 2);
        // Two wired controllers beside the console!
        ctx.fillStyle = '#111111';
        ctx.fillRect(sx + 5, sy + 27, 3, 1);
        ctx.fillRect(sx + 21, sy + 27, 3, 1);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(sx + 2, sy + 26, 4, 3);
        ctx.fillRect(sx + 24, sy + 26, 4, 3);
        break;
      }

      case 'WIDE_BOOKSHELF': {
        // 2x2 tiles (32x32 px) Tall oak bookcase packed with colorful books + golden cup on top!
        ctx.fillStyle = '#4a2c11';
        ctx.fillRect(sx + 1, sy + 2, 30, 29);
        ctx.fillStyle = '#7f4f24';
        ctx.fillRect(sx + 2, sy + 3, 28, 27);
        // 3 dark shelf cavities
        for (let row = 0; row < 3; row++) {
          const ry = sy + 5 + row * 8;
          ctx.fillStyle = '#2b1807';
          ctx.fillRect(sx + 4, ry, 24, 6);
          const paletteCols = ['#ef476f', '#ffd166', '#06d6a0', '#4cc9f0', '#9b5de5', '#f77f00', '#e2e8f0'];
          for (let b = 0; b < 7; b++) {
            ctx.fillStyle = paletteCols[(b + row * 2) % paletteCols.length];
            ctx.fillRect(sx + 5 + b * 3.2, ry + 1, 2.5, 5);
          }
        }
        // Little golden football trophy on top of bookcase
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(sx + 22, sy, 4, 3);
        break;
      }

      case 'POTTED_PLANT': {
        // 1x2 tiles (16x32 px) Lush indoor potted monstera/fern
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx + 3, sy + 26, 10, 4);
        // Terracotta pot
        ctx.fillStyle = '#bc4749';
        ctx.fillRect(sx + 4, sy + 20, 8, 9);
        ctx.fillStyle = '#d66853';
        ctx.fillRect(sx + 3, sy + 19, 10, 3);
        // Lush layered leaves
        ctx.fillStyle = '#1b4332';
        ctx.fillRect(sx + 2, sy + 8, 12, 12);
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(sx + 1, sy + 6, 14, 10);
        ctx.fillStyle = '#52b788';
        ctx.fillRect(sx + 3, sy + 5, 4, 5);
        ctx.fillRect(sx + 9, sy + 7, 4, 5);
        ctx.fillRect(sx + 6, sy + 3, 4, 5);
        break;
      }

      case 'KITCHEN_SUITE': {
        // 4x2 tiles (64x32 px): Tall Fridge + Sink Counter + 4-Burner Stove + Prep Counter!
        // 1. Tall Silver Fridge (left 16x32)
        ctx.fillStyle = '#64748b';
        ctx.fillRect(sx + 1, sy + 1, 14, 30);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(sx + 2, sy + 2, 12, 11);
        ctx.fillRect(sx + 2, sy + 14, 12, 16);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx + 11, sy + 6, 1, 5);
        ctx.fillRect(sx + 11, sy + 16, 1, 7);

        // 2. Long Kitchen Counter & Cabinets (right 48x24)
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(sx + 16, sy + 9, 47, 22);
        ctx.fillStyle = '#8b5e34';
        ctx.fillRect(sx + 18, sy + 19, 13, 10);
        ctx.fillRect(sx + 33, sy + 19, 13, 10);
        ctx.fillRect(sx + 48, sy + 19, 13, 10);
        // Marble/white countertop
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(sx + 16, sy + 9, 47, 9);
        // Sink basin + faucet
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx + 19, sy + 11, 11, 6);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(sx + 20, sy + 12, 9, 4);
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx + 24, sy + 8, 2, 3);
        // Stove hob + simmering red pot!
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sx + 34, sy + 10, 13, 7);
        ctx.fillStyle = '#ef476f';
        ctx.fillRect(sx + 36, sy + 11, 5, 5);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(sx + 42, sy + 12, 3, 3);
        // Cutting board & oranges on right counter
        ctx.fillStyle = '#ddb892';
        ctx.fillRect(sx + 50, sy + 11, 10, 6);
        ctx.fillStyle = '#fb8500';
        ctx.fillRect(sx + 52, sy + 12, 3, 3);
        ctx.fillRect(sx + 56, sy + 13, 3, 3);
        break;
      }

      case 'DINING_TABLE': {
        // 3x2 tiles (48x32 px) Family Dining Table with 4 chairs & fruit bowl!
        // Chairs tucked top & bottom
        ctx.fillStyle = '#6f4518';
        ctx.fillRect(sx + 9, sy + 1, 10, 5);
        ctx.fillRect(sx + 29, sy + 1, 10, 5);
        ctx.fillRect(sx + 9, sy + 26, 10, 5);
        ctx.fillRect(sx + 29, sy + 26, 10, 5);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(sx + 4, sy + 8, 42, 20);
        // Table top
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(sx + 3, sy + 5, 42, 21);
        ctx.fillStyle = '#9c6644';
        ctx.fillRect(sx + 4, sy + 6, 40, 19);
        // Cream table runner & fruit bowl
        ctx.fillStyle = '#fefae0';
        ctx.fillRect(sx + 8, sy + 13, 32, 5);
        ctx.fillStyle = '#3a86ff';
        ctx.fillRect(sx + 21, sy + 11, 6, 6);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(sx + 22, sy + 12, 4, 3);
        break;
      }

      case 'CHALKBOARD': {
        // 3x1 tiles (48x16 px) Classroom Green Chalkboard mounted on upper school wall!
        ctx.fillStyle = '#7f5539';
        ctx.fillRect(sx + 2, sy + 1, 44, 12);
        ctx.fillStyle = '#1b4332';
        ctx.fillRect(sx + 4, sy + 2, 40, 9);
        // Chalk football tactic X's & arrows drawn on the board!
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(sx + 8, sy + 4, 8, 1);
        ctx.fillRect(sx + 8, sy + 7, 12, 1);
        ctx.fillRect(sx + 28, sy + 4, 3, 3);
        ctx.fillRect(sx + 34, sy + 5, 6, 1);
        // White chalk sticks on tray
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 14, sy + 11, 4, 1);
        ctx.fillRect(sx + 30, sy + 11, 3, 1);
        break;
      }

      case 'TEACHER_DESK': {
        // 2x1 tiles (32x16 px) Front Classroom Teacher's Desk with globe/apple!
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(sx + 2, sy + 5, 28, 10);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(sx + 2, sy + 3, 28, 11);
        ctx.fillStyle = '#8b5e34';
        ctx.fillRect(sx + 3, sy + 4, 26, 9);
        // Stack of papers & red apple
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 6, sy + 5, 7, 6);
        ctx.fillStyle = '#e63946';
        ctx.fillRect(sx + 22, sy + 6, 4, 4);
        break;
      }

      case 'CLUB_SIGN': {
        // Pixel Football Club emblem mounted on Clubhouse roof (no text!)
        ctx.fillStyle = '#1d3557';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.strokeStyle = '#ffd166';
        ctx.strokeRect(sx + 1.5, sy + 1.5, 13, 13);
        SR.drawBall(ctx, sx + 5, sy + 5);
        break;
      }

      case 'SHOP_SIGN': {
        // Pixel Jersey / Kit Shop emblem mounted on Shop roof (no text!)
        ctx.fillStyle = '#1d3557';
        ctx.fillRect(sx + 1, sy + 1, 14, 14);
        ctx.strokeStyle = '#4cc9f0';
        ctx.strokeRect(sx + 1.5, sy + 1.5, 13, 13);
        ctx.fillStyle = '#4cc9f0';
        ctx.fillRect(sx + 4, sy + 4, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 6, sy + 4, 4, 2);
        break;
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
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
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

    // Hair
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

  // Draw Loot Container: Sports Gym Duffel Bag (in School) or Equipment Crate (in Dungeons)
  SR.drawChest = function (ctx, x, y, opened, isQuestChest, isGymBag) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 2, y + 13, 12, 3);

    if (isGymBag) {
      // Zippered Sports Duffel Bag on classroom floor!
      ctx.fillStyle = opened ? '#64748b' : '#2563eb';
      ctx.fillRect(x + 2, y + 6, 12, 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 4, y + 4, 2, 10);
      ctx.fillRect(x + 10, y + 4, 2, 10);
      // Zipper line
      ctx.fillStyle = opened ? '#0f172a' : '#ffd166';
      ctx.fillRect(x + 3, y + 8, 10, 2);
      return;
    }

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
