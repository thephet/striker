window.SR = window.SR || {};

(function (SR) {
  const Game = {
    canvas: null,
    ctx: null,
    tick: 0,

    // Roguelite Meta & Run State
    coachLegacyLevel: 0,
    regionIndex: 0,
    world: null,
    currentMapIndex: 0,

    // Cutscene state in Bedroom (0 = inactive, 1 = Grandad wakes you, 2 = 5 friends enter room)
    cutsceneStage: 0,

    playerPos: { x: 4, y: 5 },
    playerFacing: { dx: 0, dy: 1 },

    cash: 150,
    contracts: 2,
    morale: 3,
    squad: [],
    bag: ['ENERGY_DRINK'],
    freeAgents: [],
    questState: {},

    init: function () {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.startNewSeasonRun(false);
      this.bindInputs();
      requestAnimationFrame(() => this.loop());
    },

    startNewSeasonRun: function (isNewGamePlus) {
      if (isNewGamePlus) {
        this.coachLegacyLevel++;
      }
      this.regionIndex = 0;
      this.cash = 150 + this.coachLegacyLevel * 100;
      this.contracts = 2 + this.coachLegacyLevel;
      this.morale = 3;
      this.bag = ['ENERGY_DRINK'];
      this.questState = {};

      // Build starter 6-player squad (5 pitch starters + 1 sub)
      this.squad = SR.STARTER_TEMPLATES.map(tpl => SR.createPlayer(tpl, this.coachLegacyLevel));

      // Start in the Prologue World (Bedroom Wake-Up Cutscene!)
      this.world = SR.generatePrologueWorld();
      this.currentMapIndex = 0; // Bedroom
      const bedroom = this.world.maps[0];
      this.playerPos = { x: bedroom.spawnBed.x, y: bedroom.spawnBed.y };
      this.cutsceneStage = 1;
      this.updateTopHud();

      // Step 1: Grandad opens the door and says "Wake up! Your friends are here!"
      SR.UI.showDialogue('Grandad', [
        'Wake up! Your friends are here!'
      ], () => {
        // Step 2: The 5 team players enter the room!
        this.cutsceneStage = 2;
        SR.UI.showDialogue('Teammates', [
          'Your 5 teammates walk into your room, ready to roll!'
        ], () => {
          // Step 3: Blank screen showing the 5 characters + names + stats
          SR.UI.openTeamShowcase(() => {
            // Step 4: Player clicks Next -> Spawn outside Hero's House in Hometown!
            this.cutsceneStage = 0;
            this.currentMapIndex = 1; // Hometown Street
            const town = this.world.maps[1];
            this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
            this.updateTopHud();

            SR.UI.showDialogue('Axel (Teammate)', [
              'We need to rush to the school! The team of Jocks want to take over, we need to beat them!'
            ]);
          });
        });
      });
    },

    loadRegion: function (regIdx) {
      this.regionIndex = regIdx;
      this.world = SR.generateRegionWorld(regIdx);
      this.currentMapIndex = 0;
      const town = this.world.maps[0];
      this.playerPos = { x: town.spawnDown.x, y: town.spawnDown.y };

      this.freeAgents = [];
      for (let i = 0; i < 3; i++) {
        const tpl = SR.RECRUIT_POOL[(regIdx * 2 + i) % SR.RECRUIT_POOL.length];
        this.freeAgents.push(SR.createPlayer(tpl, regIdx));
      }

      this.updateTopHud();
    },

    currentMap: function () {
      return this.world.maps[this.currentMapIndex];
    },

    getCamera: function () {
      const map = this.currentMap();
      const mw = (map && map.width) || 20;
      const mh = (map && map.height) || 18;
      return {
        x: Math.max(0, Math.min(mw - 20, this.playerPos.x - 10)),
        y: Math.max(0, Math.min(mh - 18, this.playerPos.y - 9))
      };
    },

    findPropAt: function (map, tx, ty) {
      if (!map || !map.props) return null;
      return map.props.find(p => {
        const pw = p.w || 1;
        const ph = p.h || 1;
        return tx >= p.x && tx < p.x + pw && ty >= p.y && ty < p.y + ph;
      }) || null;
    },

    removeBagItem: function (idx) {
      if (idx >= 0 && idx < this.bag.length) {
        this.bag.splice(idx, 1);
      }
    },

    // Update Fog of War explored tiles around player
    updateFogOfWar: function () {
      const map = this.currentMap();
      if (!map || !map.fogOfWar || !map.explored) return;
      const mw = map.width || 20;
      const mh = map.height || 18;
      const r = map.visionRadius || 5.5;
      for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
          const dist = Math.hypot(x - this.playerPos.x, y - this.playerPos.y);
          if (dist <= r) {
            map.explored[y][x] = true;
          }
        }
      }
    },

    updateTopHud: function () {
      const reg = this.world.region;
      const map = this.currentMap();
      const elReg = document.getElementById('hudRegion');
      const elCash = document.getElementById('hudCash');
      const elCon = document.getElementById('hudContracts');
      const elMor = document.getElementById('hudMorale');
      const elZone = document.getElementById('bezelZoneName');
      const elQuest = document.getElementById('bezelQuestStatus');

      if (elReg) elReg.textContent = reg.name;
      if (elCash) elCash.textContent = `$${this.cash}`;
      if (elCon) elCon.textContent = `Contracts: ${this.contracts}`;
      if (elMor) elMor.textContent = `Morale: ${'♥'.repeat(Math.max(0, this.morale))}${'♡'.repeat(Math.max(0, 3 - this.morale))}`;
      if (elZone) elZone.textContent = map.name;

      if (elQuest) {
        if (this.world.isPrologue) {
          if (this.currentMapIndex <= 2) {
            elQuest.textContent = 'Quest: Rush North to the School!';
          } else if (this.currentMapIndex === 3 || this.currentMapIndex === 4) {
            elQuest.textContent = 'Quest: Find the Stairs to the Gym!';
          } else {
            elQuest.textContent = 'Quest: Beat the Team of Jocks!';
          }
        } else {
          const qs = this.questState[reg.id] || 'NOT_STARTED';
          if (qs === 'NOT_STARTED') elQuest.textContent = `Quest: Talk to ${reg.quest.giverName}`;
          else if (qs === 'ACTIVE') elQuest.textContent = `Quest: Find ${reg.quest.itemName} in Dungeon`;
          else if (qs === 'FOUND_ITEM') elQuest.textContent = `Quest: Return ${reg.quest.itemName} to ${reg.quest.giverName}!`;
          else elQuest.textContent = `Quest: Challenge ${reg.boss.teamName}!`;
        }
      }
    },

    handleActionInput: function (cmd) {
      if (SR.Match.active) {
        if (SR.Match.isTextBoxState()) {
          if (cmd === 'A' || cmd === 'B' || cmd === 'START') {
            SR.Match.executeCommand(0);
          }
          return;
        }
        if (cmd === 'LEFT')  SR.Match.cursor = (SR.Match.cursor % 2 === 1) ? SR.Match.cursor - 1 : SR.Match.cursor;
        if (cmd === 'RIGHT') SR.Match.cursor = (SR.Match.cursor % 2 === 0) ? SR.Match.cursor + 1 : SR.Match.cursor;
        if (cmd === 'UP')    SR.Match.cursor = (SR.Match.cursor >= 2) ? SR.Match.cursor - 2 : SR.Match.cursor;
        if (cmd === 'DOWN')  SR.Match.cursor = (SR.Match.cursor <= 1) ? SR.Match.cursor + 2 : SR.Match.cursor;
        if (cmd === 'A')     SR.Match.executeCommand(SR.Match.cursor);
        return;
      }

      if (SR.UI.mode !== 'NONE') {
        SR.UI.handleInput(cmd, this);
        return;
      }

      if (cmd === 'START') {
        SR.UI.openSquadMenu();
        return;
      }
      if (cmd === 'SELECT') {
        SR.UI.openQuestHelp();
        return;
      }
      if (cmd === 'UP')    this.tryMove(0, -1);
      if (cmd === 'DOWN')  this.tryMove(0, 1);
      if (cmd === 'LEFT')  this.tryMove(-1, 0);
      if (cmd === 'RIGHT') this.tryMove(1, 0);
      if (cmd === 'A')     this.interactInOverworld();
    },

    tryMove: function (dx, dy) {
      this.playerFacing = { dx: dx, dy: dy };
      const nx = this.playerPos.x + dx;
      const ny = this.playerPos.y + dy;
      const map = this.currentMap();
      const mw = map.width || 20;
      const mh = map.height || 18;

      if (nx < 0 || nx >= mw || ny < 0 || ny >= mh) return;

      // Check if an undefeated NPC is standing on (nx, ny) -> interact with them!
      const npcAtDest = map.npcs.find(n => n.x === nx && n.y === ny && !n.defeated);
      if (npcAtDest) {
        this.triggerNpcInteraction(npcAtDest);
        return;
      }

      // Check if an unopened Chest / Gym Bag is at (nx, ny) -> open it!
      const chestAtDest = map.chests.find(c => c.x === nx && c.y === ny && !c.opened);
      if (chestAtDest) {
        this.openChest(chestAtDest);
        return;
      }

      const tile = map.grid[ny][nx];

      // Check if bumping into an interactive multi-tile furniture prop (Bed, Sofa, TV & Console, Bookshelf, Kitchen)
      if (SR.isTileBlocked(tile)) {
        const prop = this.findPropAt(map, nx, ny);
        if (prop) {
          if (prop.heal) {
            this.squad.forEach(p => { p.sta = p.maxSta; });
          }
          SR.UI.showDialogue(prop.name, [prop.text]);
        }
        return;
      }

      // Move Player
      this.playerPos.x = nx;
      this.playerPos.y = ny;
      this.updateFogOfWar();

      // Check Prologue Doors, Doormats & School Stairs
      if (this.world.isPrologue) {
        // Enter Hero's House from Hometown
        if (tile === SR.TILE.HOUSE_DOOR_HERO && this.currentMapIndex === 1) {
          this.currentMapIndex = 0;
          const bedMap = this.currentMap();
          this.playerPos = { x: bedMap.spawnDoor.x, y: bedMap.spawnDoor.y };
          this.updateTopHud();
          return;
        }
        // Exit Hero's Bedroom via Doormat
        if (tile === SR.TILE.DOORMAT_HERO && this.currentMapIndex === 0) {
          this.currentMapIndex = 1;
          const town = this.currentMap();
          this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
          this.updateTopHud();
          return;
        }

        // Enter Friend's House from Hometown
        if (tile === SR.TILE.HOUSE_DOOR_FRIEND && this.currentMapIndex === 1) {
          this.currentMapIndex = 2;
          const fMap = this.currentMap();
          this.playerPos = { x: fMap.spawnDoor.x, y: fMap.spawnDoor.y };
          this.updateTopHud();
          return;
        }
        // Exit Friend's House via Doormat
        if (tile === SR.TILE.DOORMAT_FRIEND && this.currentMapIndex === 2) {
          this.currentMapIndex = 1;
          const town = this.currentMap();
          this.playerPos = { x: town.spawnOutsideFriend.x, y: town.spawnOutsideFriend.y };
          this.updateTopHud();
          return;
        }

        // Enter High School 1F from Hometown North Road!
        if (tile === SR.TILE.PORTAL_UP && this.currentMapIndex === 1) {
          this.currentMapIndex = 3;
          const s1 = this.currentMap();
          this.playerPos = { x: s1.spawnStart.x, y: s1.spawnStart.y };
          this.updateFogOfWar();
          this.updateTopHud();
          SR.UI.showDialogue('HIGH SCHOOL — 1F', [
            'Search the classrooms and locker corridors to find the Stairwell up to the 2nd Floor!',
            'Stay sharp: if a Varsity Jock spots you, they will chase you down the halls!'
          ]);
          return;
        }

        // Climb School Stairwells!
        if (tile === SR.TILE.STAIRS_UP) {
          if (this.currentMapIndex === 3) {
            this.currentMapIndex = 4;
            const s2 = this.currentMap();
            this.playerPos = { x: s2.spawnStart.x, y: s2.spawnStart.y };
            this.updateFogOfWar();
            this.updateTopHud();
            SR.UI.showDialogue('HIGH SCHOOL — 2F', [
              '2nd Floor! Find the next Stairwell to reach the School Gymnasium!'
            ]);
            return;
          } else if (this.currentMapIndex === 4) {
            this.currentMapIndex = 5;
            const gym = this.currentMap();
            this.playerPos = { x: gym.spawnStart.x, y: gym.spawnStart.y };
            this.updateTopHud();
            SR.UI.showDialogue('SCHOOL GYMNASIUM', [
              'You made it to the Gym! Varsity Captain Chad and the Team of Jocks are waiting on the court!'
            ]);
            return;
          }
        }

        // Step chasing school enemies on 1F & 2F!
        if (this.currentMapIndex === 3 || this.currentMapIndex === 4) {
          this.stepSchoolEnemies();
        }
        return;
      }

      // Main Regional World Special Tiles
      if (tile === SR.TILE.CLUB_DOOR) {
        SR.UI.openClubMenu(this);
        this.updateTopHud();
        return;
      }
      if (tile === SR.TILE.SHOP_DOOR) {
        SR.UI.openShopMenu();
        return;
      }
      if (tile === SR.TILE.PORTAL_UP) {
        if (this.currentMapIndex < 2) {
          this.currentMapIndex++;
          const nextMap = this.currentMap();
          this.playerPos = { x: nextMap.spawnDown.x, y: nextMap.spawnDown.y };
          this.updateTopHud();
        }
        return;
      }
      if (tile === SR.TILE.PORTAL_DOWN) {
        if (this.currentMapIndex > 0) {
          this.currentMapIndex--;
          const prevMap = this.currentMap();
          this.playerPos = { x: prevMap.spawnFromNorth.x, y: prevMap.spawnFromNorth.y };
          this.updateTopHud();
        }
        return;
      }

      if (tile === SR.TILE.TURF_WILD) {
        if (Math.random() < 0.24) {
          this.startWildStreetMatch();
        }
      }
    },

    // Roguelike Turn-Based Enemy Chase in School Classrooms & Corridors
    stepSchoolEnemies: function () {
      const map = this.currentMap();
      if (!map || !map.npcs) return;
      const visR = map.visionRadius || 5.5;

      for (let i = 0; i < map.npcs.length; i++) {
        const en = map.npcs[i];
        if (!en.chaser || en.defeated) continue;

        const dist = Math.hypot(en.x - this.playerPos.x, en.y - this.playerPos.y);
        if (dist <= visR) {
          en.alerted = true;
          en.alertIcon = true;
        }

        if (!en.alerted) continue;

        const dx = this.playerPos.x - en.x;
        const dy = this.playerPos.y - en.y;
        const candidates = [];
        if (Math.abs(dx) >= Math.abs(dy)) {
          if (dx !== 0) candidates.push({ x: en.x + Math.sign(dx), y: en.y });
          if (dy !== 0) candidates.push({ x: en.x, y: en.y + Math.sign(dy) });
        } else {
          if (dy !== 0) candidates.push({ x: en.x, y: en.y + Math.sign(dy) });
          if (dx !== 0) candidates.push({ x: en.x + Math.sign(dx), y: en.y });
        }

        for (let c = 0; c < candidates.length; c++) {
          const dest = candidates[c];
          if (dest.x === this.playerPos.x && dest.y === this.playerPos.y) {
            this.triggerNpcInteraction(en);
            return;
          }
          const t = map.grid[dest.y] && map.grid[dest.y][dest.x];
          const occupied = map.npcs.some(o => o !== en && !o.defeated && o.x === dest.x && o.y === dest.y);
          if (t !== undefined && !SR.isTileBlocked(t) && !occupied) {
            en.x = dest.x;
            en.y = dest.y;
            break;
          }
        }

        if (en.x === this.playerPos.x && en.y === this.playerPos.y) {
          this.triggerNpcInteraction(en);
          return;
        }
      }
    },

    interactInOverworld: function () {
      const map = this.currentMap();
      const mw = map.width || 20;
      const mh = map.height || 18;
      const tx = this.playerPos.x + this.playerFacing.dx;
      const ty = this.playerPos.y + this.playerFacing.dy;

      // Check NPC in front or adjacent
      let npc = map.npcs.find(n => n.x === tx && n.y === ty);
      if (!npc) {
        npc = map.npcs.find(n => Math.abs(n.x - this.playerPos.x) + Math.abs(n.y - this.playerPos.y) === 1);
      }
      if (npc) {
        this.triggerNpcInteraction(npc);
        return;
      }

      // Check Chest / Gym Bag in front or adjacent
      let chest = map.chests.find(c => c.x === tx && c.y === ty && !c.opened);
      if (!chest) {
        chest = map.chests.find(c => !c.opened && Math.abs(c.x - this.playerPos.x) + Math.abs(c.y - this.playerPos.y) <= 1);
      }
      if (chest) {
        this.openChest(chest);
        return;
      }

      // Check Multi-tile Furniture Prop in front or under player
      const prop = this.findPropAt(map, tx, ty) || this.findPropAt(map, this.playerPos.x, this.playerPos.y);
      if (prop) {
        if (prop.heal) {
          this.squad.forEach(p => { p.sta = p.maxSta; });
        }
        SR.UI.showDialogue(prop.name, [prop.text]);
        return;
      }

      // Check Door tile in front
      if (ty >= 0 && ty < mh && tx >= 0 && tx < mw) {
        const fTile = map.grid[ty][tx];
        if (fTile === SR.TILE.CLUB_DOOR) {
          SR.UI.openClubMenu(this);
          return;
        }
        if (fTile === SR.TILE.SHOP_DOOR) {
          SR.UI.openShopMenu();
          return;
        }
      }
    },

    openChest: function (chest) {
      chest.opened = true;
      const reg = this.world.region;
      if (chest.isQuest) {
        this.questState[reg.id] = 'FOUND_ITEM';
        this.cash += 40;
        this.updateTopHud();
        SR.UI.showDialogue('QUEST ITEM FOUND!', [
          `Recovered the [${chest.questItem}] + $40!`,
          `Bring the ${chest.questItem} back to ${reg.quest.giverName} in ${reg.townName} to recruit them!`
        ]);
      } else {
        const cGain = chest.cash || 50;
        this.cash += cGain;
        let extraMsg = '';
        if (chest.contract) {
          this.contracts += chest.contract;
          extraMsg = ` and +${chest.contract} Scout Contract!`;
        } else if (chest.item) {
          this.bag.push(chest.item);
          extraMsg = ` and 1 ${SR.ITEMS[chest.item].name}!`;
        }
        this.updateTopHud();
        const header = chest.isGymBag ? 'SPORTS GYM BAG' : 'SUPPLY CRATE';
        SR.UI.showDialogue(header, [`Found $${cGain}${extraMsg}`]);
      }
    },

    triggerNpcInteraction: function (npc) {
      const reg = this.world.region;

      if (npc.role === 'GRANDAD' || npc.role === 'PROLOGUE_FRIEND') {
        npc.alertIcon = false;
        SR.UI.showDialogue(npc.name, npc.dialogue);
        return;
      }

      if (npc.role === 'MUM') {
        this.squad.forEach(p => { p.sta = p.maxSta; });
        SR.UI.showDialogue(npc.name, npc.dialogue);
        return;
      }

      if (npc.role === 'SCHOOL_ENEMY') {
        if (npc.defeated) {
          SR.UI.showDialogue(npc.name, ['You already beat us! The stairs are down the hall!']);
          return;
        }
        SR.UI.showDialogue(npc.name, [
          'Hey!! These school halls belong to the Varsity Jocks now! Next Goal Wins—let\'s go!'
        ], () => {
          const enemyTeam = SR.generateEnemyTeam(1, false, npc.teamName);
          SR.Match.start(this, enemyTeam, { isBoss: false, goalsToWin: 1, maxTurns: 6 }, (res) => {
            if (res.won) {
              npc.defeated = true;
              npc.alertIcon = false;
              this.cash += 35;
              this.updateTopHud();
              SR.UI.showDialogue('CLASSROOM WIN!', [
                `Beat ${npc.teamName} (${res.playerScore}-${res.enemyScore}) and won $35! Keep exploring for the stairwell!`
              ]);
            } else {
              // Regenerate fresh school floors when pushed back outside so each attempt stays roguelike!
              this.world.maps[3] = SR.generatePrologueWorld().maps[3];
              this.world.maps[4] = SR.generatePrologueWorld().maps[4];
              this.currentMapIndex = 1;
              const town = this.world.maps[1];
              this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
              this.squad.forEach(p => { p.sta = p.maxSta; });
              this.updateTopHud();
              SR.UI.showDialogue('PUSHED OUTSIDE', [
                'The Jocks sent you back outside! Your squad caught their breath (100% Stamina)—head back North when ready!'
              ]);
            }
          });
        });
        return;
      }

      if (npc.role === 'SCHOOL_BOSS') {
        SR.UI.showDialogue(npc.name, [
          'Look who finally made it to the Gymnasium! This school belongs to the VARSITY JOCKS now!',
          'MINI-BOSS MATCH: Varsity Jocks V! First to 2 Goals wins the Gym!'
        ], () => {
          const jockBossTeam = SR.generateEnemyTeam(1, false, 'Varsity Jocks V');
          SR.Match.start(this, jockBossTeam, { isBoss: false, goalsToWin: 2, maxTurns: 10 }, (res) => {
            if (res.won) {
              this.cash += 100;
              this.squad.forEach(p => {
                p.level++;
                p.maxSta += 5;
                p.sta = p.maxSta;
                p.dri += 2; p.pas += 2; p.sho += 2; p.tac += 2; p.int += 2;
              });
              SR.UI.showDialogue('SCHOOL SAVED!!', [
                'Varsity Capt. Chad: "Impossible!! Beaten on our own gym court?!"',
                'Axel: "We did it, Leo!! We took back the school! Now let\'s head to the Rustyard Base Camp for the Regional Striker Championship!"'
              ], () => {
                this.loadRegion(0);
                SR.UI.showDialogue('BASE CAMP REACHED', [
                  `Welcome to ${this.world.region.townName}! Your squad leveled up and won $100 prize cash!`,
                  `Enter the Clubhouse (Ball Sign) to recruit Free Agents, visit the Kit Shop (Jersey Sign), or head North to the Stadium!`
                ]);
              });
            } else {
              this.world.maps[3] = SR.generatePrologueWorld().maps[3];
              this.world.maps[4] = SR.generatePrologueWorld().maps[4];
              this.currentMapIndex = 1;
              const town = this.world.maps[1];
              this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
              this.squad.forEach(p => { p.sta = p.maxSta; });
              this.updateTopHud();
              SR.UI.showDialogue('REGROUP AT HOME', [
                'The Varsity Jocks held the Gym this time! Rest up at home or Mum\'s kitchen and rush back North!'
              ]);
            }
          });
        });
        return;
      }

      if (npc.role === 'COACH') {
        this.squad.forEach(p => { p.sta = p.maxSta; });
        SR.UI.showDialogue(npc.name, npc.dialogue);
        return;
      }

      if (npc.role === 'MEDIC') {
        this.squad.forEach(p => { p.sta = p.maxSta; });
        SR.UI.showDialogue(npc.name, [
          'All squad players patched up to 100% Stamina! Good luck against the Regional Boss!'
        ]);
        return;
      }

      if (npc.role === 'QUEST_GIVER') {
        const qs = this.questState[reg.id] || 'NOT_STARTED';
        if (qs === 'NOT_STARTED') {
          this.questState[reg.id] = 'ACTIVE';
          this.updateTopHud();
          SR.UI.showDialogue(npc.name, [reg.quest.introText]);
        } else if (qs === 'ACTIVE') {
          SR.UI.showDialogue(npc.name, [reg.quest.activeText]);
        } else if (qs === 'FOUND_ITEM') {
          this.questState[reg.id] = 'COMPLETED';
          npc.alertIcon = false;
          const starTpl = SR.QUEST_RECRUITS[reg.id];
          const newHero = SR.createPlayer(starTpl, this.coachLegacyLevel);
          this.squad.push(newHero);
          this.updateTopHud();
          SR.UI.showDialogue(npc.name, [
            reg.quest.completeText,
            `★ ${newHero.name} (Lv.${newHero.level} ${newHero.role} / ${newHero.affinity}) joined your squad! Press [M] to put them in your starting 5!`
          ]);
        } else {
          SR.UI.showDialogue(npc.name, [
            `I'm proud to be on your squad, Captain! Let's take down ${reg.boss.teamName}!`
          ]);
        }
        return;
      }

      if (npc.role === 'RIVAL') {
        if (npc.defeated) {
          SR.UI.showDialogue(npc.name, [
            'You already beat my crew fair and square! Go challenge the Stadium Boss north of here!'
          ]);
          return;
        }
        SR.UI.showDialogue(npc.name, [
          `Hold it right there! My ${npc.teamName} own this street turf. First to 2 goals takes the pot!`
        ], () => {
          const enemyTeam = SR.generateEnemyTeam(reg.id, false, npc.teamName);
          SR.Match.start(this, enemyTeam, { isBoss: false }, (res) => {
            if (res.won) {
              npc.defeated = true;
            }
            this.handleMatchCompleted(res);
          });
        });
        return;
      }

      if (npc.role === 'BOSS') {
        SR.UI.showDialogue(npc.name, [
          reg.boss.introLine,
          `CHAMPIONSHIP MATCH: ${reg.boss.teamName}! First to 3 Goals (or lead at 14 Turns)!`
        ], () => {
          const bossTeam = SR.generateEnemyTeam(reg.id, true, reg.boss.teamName);
          SR.Match.start(this, bossTeam, { isBoss: true }, (res) => {
            this.handleMatchCompleted(res);
          });
        });
      }
    },

    startWildStreetMatch: function () {
      const reg = this.world.region;
      const enemyTeam = SR.generateEnemyTeam(reg.id, false);
      SR.UI.showDialogue('STREET CHALLENGE!', [
        `A rival street crew (${enemyTeam.name}) slides onto the pitch for a sudden scrimmage!`
      ], () => {
        SR.Match.start(this, enemyTeam, { isBoss: false }, (res) => {
          this.handleMatchCompleted(res);
        });
      });
    },

    handleMatchCompleted: function (res) {
      const reg = this.world.region;

      if (res.won) {
        const cashReward = res.isBoss ? (140 + reg.id * 50) : (55 + reg.id * 15);
        const xpReward = res.isBoss ? 50 : 25;
        this.cash += cashReward;

        const leveledNames = [];
        this.squad.forEach((p, idx) => {
          const gain = idx < 5 ? xpReward : Math.round(xpReward * 0.6);
          p.xp += gain;
          if (p.xp >= p.xpNext) {
            p.xp -= p.xpNext;
            p.level++;
            p.xpNext = p.level * 40;
            p.maxSta += 5;
            p.sta = p.maxSta;
            p.dri += 2; p.pas += 2; p.sho += 2; p.tac += 2; p.int += 2;
            if (p.role === 'GK') p.gk += 3;
            leveledNames.push(`${p.name} -> Lv.${p.level}`);
          }
        });

        this.updateTopHud();

        if (res.isBoss) {
          SR.UI.showDialogue(reg.boss.captainName, [
            reg.boss.defeatLine,
            `Won $${cashReward} Prize Purse! ${leveledNames.length ? 'Level Up: ' + leveledNames.join(', ') : ''}`
          ], () => {
            if (this.regionIndex + 1 < SR.REGIONS.length) {
              this.loadRegion(this.regionIndex + 1);
              SR.UI.showDialogue('NEW REGION UNLOCKED!', [
                `Welcome to ${this.world.region.name}! Explore ${this.world.region.townName} to recruit stronger stars and gear up!`
              ]);
            } else {
              SR.UI.mode = 'VICTORY_CUP';
            }
          });
          return;
        }

        const standout = res.enemyTeam.players[Math.floor(Math.random() * res.enemyTeam.players.length)];
        const summary = `Beat ${res.enemyTeam.name} (${res.playerScore}-${res.enemyScore})! Earned +$${cashReward} & +${xpReward} XP! ${leveledNames.length ? 'LV UP: ' + leveledNames.join(', ') : ''}`;
        SR.UI.openPostMatchScout(standout, summary);
      } else {
        this.morale--;
        if (res.isBoss || this.morale <= 0) {
          this.updateTopHud();
          SR.UI.showDialogue('SEASON RUN ENDED', [
            res.isBoss
              ? `Eliminated in the Regional Championship by ${res.enemyTeam.name}...`
              : `Your Club Morale hit zero after a tough losing streak...`,
            `Coach Experience gained! Starting a fresh Season Run with +1 Legacy Level (+Stats & +Cash)!`
          ], () => {
            this.startNewSeasonRun(true);
          });
        } else {
          const fee = Math.min(this.cash, 25);
          this.cash -= fee;
          this.currentMapIndex = 0;
          const town = this.world.maps[0];
          this.playerPos = { x: town.spawnDown.x, y: town.spawnDown.y };
          this.squad.forEach(p => { p.sta = p.maxSta; });
          this.updateTopHud();
          SR.UI.showDialogue('WARPED TO TOWN', [
            `Lost ${res.playerScore}-${res.enemyScore} (-$${fee}, -1 Morale Heart).`,
            `Your squad regrouped at ${town.name} with full Stamina. Train up or adjust your lineup [M] and try again!`
          ]);
        }
      }
    },

    // Draw a tiny pixel-art '!' bubble (zero font/text!) for alerted Jocks or active story quest
    drawPixelAlertBubble: function (ctx, sx, sy) {
      ctx.fillStyle = '#0d1017';
      ctx.fillRect(sx + 4, sy - 9, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 5, sy - 8, 6, 6);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(sx + 7, sy - 7, 2, 3);
      ctx.fillRect(sx + 7, sy - 3, 2, 1);
    },

    // Render Overworld (with Camera Scrolling, Multi-Tile GBA Furniture & Fog of War)
    render: function () {
      const ctx = this.ctx;
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, 320, 288);

      if (SR.Match.active) {
        SR.Match.render(ctx, this.tick);
        return;
      }

      const map = this.currentMap();
      const mw = map.width || 20;
      const mh = map.height || 18;
      const cam = this.getCamera();
      const pal = this.world.region.palette;
      const isFog = !!map.fogOfWar;
      const visR = map.visionRadius || 5.5;

      // 1. Draw Visible Base Tiles in 20x18 Camera Viewport
      for (let vy = 0; vy < 18; vy++) {
        const wy = cam.y + vy;
        if (wy < 0 || wy >= mh) continue;
        for (let vx = 0; vx < 20; vx++) {
          const wx = cam.x + vx;
          if (wx < 0 || wx >= mw) continue;

          const wasExplored = !isFog || (map.explored && map.explored[wy][wx]);
          if (!wasExplored) continue;

          SR.drawTile(ctx, map.grid[wy][wx], vx * 16, vy * 16, pal, this.tick);
        }
      }

      // 2. Draw Multi-Tile GBA Furniture & Classroom Props (SR.drawDecor)
      if (map.decor) {
        map.decor.forEach(d => {
          const sx = (d.x - cam.x) * 16;
          const sy = (d.y - cam.y) * 16;
          if (sx + (d.w || 1) * 16 < 0 || sx > 320 || sy + (d.h || 1) * 16 < 0 || sy > 288) return;

          if (isFog && map.explored) {
            // Only draw decor if at least one of its tiles has been explored
            let anyExplored = false;
            for (let dy = 0; dy < (d.h || 1); dy++) {
              for (let dx = 0; dx < (d.w || 1); dx++) {
                if (map.explored[d.y + dy] && map.explored[d.y + dy][d.x + dx]) {
                  anyExplored = true;
                }
              }
            }
            if (!anyExplored) return;
          }

          SR.drawDecor(ctx, d, sx, sy, this.tick);
        });
      }

      // 3. Apply Fog of War Dimming Layer over explored-but-out-of-sight tiles
      if (isFog) {
        for (let vy = 0; vy < 18; vy++) {
          const wy = cam.y + vy;
          if (wy < 0 || wy >= mh) continue;
          for (let vx = 0; vx < 20; vx++) {
            const wx = cam.x + vx;
            if (wx < 0 || wx >= mw) continue;

            const wasExplored = map.explored && map.explored[wy][wx];
            if (!wasExplored) {
              ctx.fillStyle = '#06080e';
              ctx.fillRect(vx * 16, vy * 16, 16, 16);
              continue;
            }
            const dist = Math.hypot(wx - this.playerPos.x, wy - this.playerPos.y);
            if (dist > visR) {
              ctx.fillStyle = 'rgba(8, 12, 20, 0.68)';
              ctx.fillRect(vx * 16, vy * 16, 16, 16);
            }
          }
        }
      }

      // 4. Draw Gym Bags / Loot Crates (only if within vision on fog maps)
      map.chests.forEach(c => {
        if (isFog && Math.hypot(c.x - this.playerPos.x, c.y - this.playerPos.y) > visR) return;
        const sx = (c.x - cam.x) * 16;
        const sy = (c.y - cam.y) * 16;
        if (sx < -16 || sx > 320 || sy < -16 || sy > 288) return;
        SR.drawChest(ctx, sx, sy, c.opened, c.isQuest, c.isGymBag);
      });

      // 5. Draw NPCs (only if within vision on fog maps)
      map.npcs.forEach(n => {
        if (isFog && Math.hypot(n.x - this.playerPos.x, n.y - this.playerPos.y) > visR) return;
        const sx = (n.x - cam.x) * 16;
        const sy = (n.y - cam.y) * 16;
        if (sx < -16 || sx > 320 || sy < -16 || sy > 288) return;

        SR.drawCharacter(ctx, sx, sy, {
          skin: n.skin,
          hair: n.hair,
          kitPrimary: n.kitPrimary,
          kitSecondary: n.kitSecondary,
          moving: !!n.alerted && !n.defeated
        }, this.tick);

        if (n.alertIcon && !n.defeated) {
          this.drawPixelAlertBubble(ctx, sx, sy);
        }
      });

      // 6. If Bedroom Cutscene Stage 2 is active, draw the 5 teammates gathered on the rug!
      if (this.cutsceneStage === 2 && this.currentMapIndex === 0) {
        const friendPositions = [
          { x: 7, y: 9 },
          { x: 9, y: 9 },
          { x: 11, y: 9 },
          { x: 8, y: 11 },
          { x: 10, y: 11 }
        ];
        for (let i = 0; i < Math.min(5, this.squad.length); i++) {
          const fp = friendPositions[i];
          const mate = this.squad[i];
          SR.drawCharacter(ctx, (fp.x - cam.x) * 16, (fp.y - cam.y) * 16, {
            skin: mate.skin,
            hair: mate.hair,
            kitPrimary: '#3a86ff',
            kitSecondary: '#ffffff',
            moving: true
          }, this.tick);
        }
      }

      // 7. Draw Player Captain (tucked under bed blanket during sleep stage 1, full sprite otherwise!)
      const px = (this.playerPos.x - cam.x) * 16;
      const py = (this.playerPos.y - cam.y) * 16;
      if (this.cutsceneStage === 1 && this.currentMapIndex === 0) {
        // Draw Leo's sleeping head resting on the pillow above the blanket!
        ctx.fillStyle = '#f4c29f';
        ctx.fillRect(px + 3, py - 2, 8, 5);
        ctx.fillStyle = '#3a86ff';
        ctx.fillRect(px + 2, py - 4, 10, 3);
        // Closed sleeping eyes
        ctx.fillStyle = '#2b2d42';
        ctx.fillRect(px + 4, py + 1, 2, 1);
        ctx.fillRect(px + 8, py + 1, 2, 1);
      } else {
        SR.drawCharacter(ctx, px, py, {
          skin: '#f4c29f',
          hair: '#3a86ff',
          kitPrimary: '#3a86ff',
          kitSecondary: '#ffffff',
          moving: true,
          hasBall: this.cutsceneStage === 0
        }, this.tick);
      }

      // 8. Draw UI Overlay if active
      SR.UI.render(ctx, this, this.tick);
    },

    loop: function () {
      this.tick++;
      this.render();
      requestAnimationFrame(() => this.loop());
    },

    bindInputs: function () {
      const keyMap = {
        ArrowUp: 'UP', KeyW: 'UP',
        ArrowDown: 'DOWN', KeyS: 'DOWN',
        ArrowLeft: 'LEFT', KeyA: 'LEFT',
        ArrowRight: 'RIGHT', KeyD: 'RIGHT',
        KeyZ: 'A', Enter: 'A', Space: 'A',
        KeyX: 'B', Escape: 'B', Backspace: 'B',
        KeyM: 'START',
        KeyQ: 'SELECT'
      };

      window.addEventListener('keydown', (e) => {
        if (SR.Match.active && !SR.Match.isTextBoxState()) {
          if (e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const idx = parseInt(e.key, 10) - 1;
            SR.Match.cursor = idx;
            SR.Match.executeCommand(idx);
            return;
          }
        }
        const mapped = keyMap[e.code];
        if (mapped) {
          e.preventDefault();
          this.handleActionInput(mapped);
        }
      });

      document.querySelectorAll('[data-key]').forEach(btn => {
        const code = btn.getAttribute('data-key');
        const mapped = keyMap[code];
        const trigger = (ev) => {
          ev.preventDefault();
          if (mapped) this.handleActionInput(mapped);
        };
        btn.addEventListener('pointerdown', trigger);
      });

      this.canvas.addEventListener('pointerdown', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const cx = ((e.clientX - rect.left) / rect.width) * 320;
        const cy = ((e.clientY - rect.top) / rect.height) * 288;

        if (SR.Match.active) {
          SR.Match.handleCanvasClick(cx, cy);
          return;
        }

        if (SR.UI.mode !== 'NONE') {
          this.handleActionInput('A');
          return;
        }

        const cam = this.getCamera();
        const tx = Math.floor(cx / 16) + cam.x;
        const ty = Math.floor(cy / 16) + cam.y;
        const dx = tx - this.playerPos.x;
        const dy = ty - this.playerPos.y;
        if (dx === 0 && dy === 0) {
          this.handleActionInput('A');
        } else if (Math.abs(dx) >= Math.abs(dy)) {
          this.handleActionInput(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          this.handleActionInput(dy > 0 ? 'DOWN' : 'UP');
        }
      });
    }
  };

  window.addEventListener('DOMContentLoaded', () => Game.init());
  SR.Game = Game;
})(window.SR);
