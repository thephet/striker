window.SR = window.SR || {};

(function (SR) {
  const Game = {
    canvas: null,
    ctx: null,
    tick: 0,

    // Roguelite Meta & Run State
    coachLegacyLevel: 0,
    regionIndex: 0, // 0 = Reg 1, 1 = Reg 2, 2 = Reg 3
    world: null,
    currentMapIndex: 0,

    // Cutscene state in Bedroom (0 = inactive, 1 = Grandad wakes you, 2 = 5 friends enter room)
    cutsceneStage: 0,

    playerPos: { x: 4, y: 4 },
    playerFacing: { dx: 0, dy: 1 },

    cash: 150,
    contracts: 2,
    morale: 3, // 3 hearts/strikes per Season Run
    squad: [],
    bag: ['ENERGY_DRINK'],
    freeAgents: [],
    questState: {}, // { [regionId]: 'NOT_STARTED' | 'ACTIVE' | 'FOUND_ITEM' | 'COMPLETED' }

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

      // Step 1 of Cutscene: Grandad opens the door and says "Wake up! Your friends are here!"
      SR.UI.showDialogue('Grandad', [
        'Wake up! Your friends are here!'
      ], () => {
        // Step 2 of Cutscene: The 5 team players enter the bedroom!
        this.cutsceneStage = 2;
        SR.UI.showDialogue('Teammates', [
          'Your 5 teammates rush into your room, ready for kick-off!'
        ], () => {
          // Step 3 of Cutscene: Blank screen showing the 5 characters + names + stats
          SR.UI.openTeamShowcase(() => {
            // Step 4: Player clicks Next -> Spawn outside Hero's House in Hometown!
            this.cutsceneStage = 0;
            this.currentMapIndex = 1; // Hometown Street
            const town = this.world.maps[1];
            this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
            this.updateTopHud();

            SR.UI.showDialogue('Axel (Teammate)', [
              'We need to rush to the school! The team of Jocks want to take over, we need to beat them!',
              'You can go back inside your house anytime, visit my Mum in the house next door (Blue Roof), or head NORTH to the High School!'
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

      // Populate 3 Free Agents for this region's Clubhouse
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

    removeBagItem: function (idx) {
      if (idx >= 0 && idx < this.bag.length) {
        this.bag.splice(idx, 1);
      }
    },

    // Update Fog of War explored tiles around player
    updateFogOfWar: function () {
      const map = this.currentMap();
      if (!map || !map.fogOfWar || !map.explored) return;
      const r = map.visionRadius || 4.5;
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 20; x++) {
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

    // Unified Input Dispatcher ('UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT')
    handleActionInput: function (cmd) {
      // 1. If Match is active, route to Match Engine
      if (SR.Match.active) {
        if (SR.Match.subState === 'ANIM_RESULT' || SR.Match.subState === 'MATCH_OVER') {
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

      // 2. If UI Modal/Dialogue is open, route to UI
      if (SR.UI.mode !== 'NONE') {
        SR.UI.handleInput(cmd, this);
        return;
      }

      // 3. Overworld Controls
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

      if (nx < 0 || nx >= 20 || ny < 0 || ny >= 18) return;

      // Check if an undefeated NPC is standing on (nx, ny) -> interact with them!
      const npcAtDest = map.npcs.find(n => n.x === nx && n.y === ny && !n.defeated);
      if (npcAtDest) {
        this.triggerNpcInteraction(npcAtDest);
        return;
      }

      // Check if an unopened Chest is at (nx, ny) -> open it!
      const chestAtDest = map.chests.find(c => c.x === nx && c.y === ny && !c.opened);
      if (chestAtDest) {
        this.openChest(chestAtDest);
        return;
      }

      const tile = map.grid[ny][nx];

      // Check if bumping into an interactive prop (TV/Console, Bookshelf, Sofa, Kitchen Stove)
      if (SR.isTileBlocked(tile)) {
        if (map.props) {
          const prop = map.props.find(p => p.x === nx && p.y === ny);
          if (prop) {
            if (prop.heal) {
              this.squad.forEach(p => { p.sta = p.maxSta; });
            }
            SR.UI.showDialogue(prop.name, [prop.text]);
          }
        }
        return;
      }

      // Move Player
      this.playerPos.x = nx;
      this.playerPos.y = ny;
      this.updateFogOfWar();

      // Check Prologue Doors & School Stairs
      if (this.world.isPrologue) {
        if (tile === SR.TILE.HOUSE_DOOR_HERO) {
          if (this.currentMapIndex === 1) {
            // Enter Hero's Bedroom from Hometown
            this.currentMapIndex = 0;
            const bedMap = this.currentMap();
            this.playerPos = { x: bedMap.spawnDoor.x, y: bedMap.spawnDoor.y };
          } else {
            // Exit Hero's Bedroom to Hometown
            this.currentMapIndex = 1;
            const town = this.currentMap();
            this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
          }
          this.updateTopHud();
          return;
        }

        if (tile === SR.TILE.HOUSE_DOOR_FRIEND) {
          if (this.currentMapIndex === 1) {
            // Enter Friend's House from Hometown
            this.currentMapIndex = 2;
            const fMap = this.currentMap();
            this.playerPos = { x: fMap.spawnDoor.x, y: fMap.spawnDoor.y };
          } else {
            // Exit Friend's House to Hometown
            this.currentMapIndex = 1;
            const town = this.currentMap();
            this.playerPos = { x: town.spawnOutsideFriend.x, y: town.spawnOutsideFriend.y };
          }
          this.updateTopHud();
          return;
        }

        if (tile === SR.TILE.PORTAL_UP && this.currentMapIndex === 1) {
          // Enter High School 1F from Hometown!
          this.currentMapIndex = 3;
          const s1 = this.currentMap();
          this.playerPos = { x: s1.spawnStart.x, y: s1.spawnStart.y };
          this.updateFogOfWar();
          this.updateTopHud();
          SR.UI.showDialogue('HIGH SCHOOL — 1F', [
            'The school lights are dim! Explore the classrooms and corridors to find the STAIRS UP to the 2nd Floor.',
            'Watch out: if a Hallway Jock spots you inside your vision circle, they will chase you!'
          ]);
          return;
        }

        if (tile === SR.TILE.STAIRS_UP) {
          if (this.currentMapIndex === 3) {
            // Climb from 1F to 2F
            this.currentMapIndex = 4;
            const s2 = this.currentMap();
            this.playerPos = { x: s2.spawnStart.x, y: s2.spawnStart.y };
            this.updateFogOfWar();
            this.updateTopHud();
            SR.UI.showDialogue('HIGH SCHOOL — 2F', [
              'You reached the 2nd Floor! Find the next staircase to enter the School Gymnasium!'
            ]);
            return;
          } else if (this.currentMapIndex === 4) {
            // Climb from 2F into the School Gymnasium!
            this.currentMapIndex = 5;
            const gym = this.currentMap();
            this.playerPos = { x: gym.spawnStart.x, y: gym.spawnStart.y };
            this.updateTopHud();
            SR.UI.showDialogue('SCHOOL GYMNASIUM', [
              'You burst into the School Gym! Varsity Captain Chad and the Team of Jocks are waiting at center court!'
            ]);
            return;
          }
        }

        // If on a School Floor (1F or 2F), step chasing enemies!
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

      // Check Wild Street Turf Random Encounter!
      if (tile === SR.TILE.TURF_WILD) {
        if (Math.random() < 0.24) {
          this.startWildStreetMatch();
        }
      }
    },

    // Roguelike Turn-Based Enemy Chase in School Corridors
    stepSchoolEnemies: function () {
      const map = this.currentMap();
      if (!map || !map.npcs) return;

      for (let i = 0; i < map.npcs.length; i++) {
        const en = map.npcs[i];
        if (!en.chaser || en.defeated) continue;

        const dist = Math.hypot(en.x - this.playerPos.x, en.y - this.playerPos.y);
        // If player is within sight range, enemy spots player and chases!
        if (dist <= 5.0) {
          en.alerted = true;
          en.badge = '!';
        }

        if (!en.alerted) continue;

        // Move 1 step toward player
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
          // If enemy reaches player's tile -> trigger battle immediately!
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

        // If enemy is now standing on player's tile -> battle!
        if (en.x === this.playerPos.x && en.y === this.playerPos.y) {
          this.triggerNpcInteraction(en);
          return;
        }
      }
    },

    interactInOverworld: function () {
      const map = this.currentMap();
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

      // Check Chest in front or adjacent
      let chest = map.chests.find(c => c.x === tx && c.y === ty && !c.opened);
      if (!chest) {
        chest = map.chests.find(c => !c.opened && Math.abs(c.x - this.playerPos.x) + Math.abs(c.y - this.playerPos.y) <= 1);
      }
      if (chest) {
        this.openChest(chest);
        return;
      }

      // Check Prop in front or under player (Bed, TV, Console, Bookshelf, Sofa, Kitchen)
      if (map.props) {
        const prop = map.props.find(p => (p.x === tx && p.y === ty) || (p.x === this.playerPos.x && p.y === this.playerPos.y));
        if (prop) {
          if (prop.heal) {
            this.squad.forEach(p => { p.sta = p.maxSta; });
          }
          SR.UI.showDialogue(prop.name, [prop.text]);
          return;
        }
      }

      // Check Door tile in front
      if (ty >= 0 && ty < 18 && tx >= 0 && tx < 20) {
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
        SR.UI.showDialogue('QUEST CHEST FOUND!', [
          `You opened the purple chest and recovered the [${chest.questItem}] + $40!`,
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
        SR.UI.showDialogue('ITEM FOUND!', [`Found $${cGain}${extraMsg}`]);
      }
    },

    triggerNpcInteraction: function (npc) {
      const reg = this.world.region;

      if (npc.role === 'GRANDAD' || npc.role === 'PROLOGUE_FRIEND') {
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
          SR.UI.showDialogue(npc.name, ['You already schooled us! Keep looking for the stairs!']);
          return;
        }
        SR.UI.showDialogue(npc.name, [
          `Hey!! Freshmen aren't allowed in these corridors! Next Goal Wins—prepare to get tackled!`
        ], () => {
          const enemyTeam = SR.generateEnemyTeam(1, false, npc.teamName);
          SR.Match.start(this, enemyTeam, { isBoss: false, goalsToWin: 1, maxTurns: 6 }, (res) => {
            if (res.won) {
              npc.defeated = true;
              npc.badge = '✓';
              this.cash += 35;
              this.updateTopHud();
              SR.UI.showDialogue('HALLWAY WIN!', [
                `You beat ${npc.teamName} (${res.playerScore}-${res.enemyScore}) and found $35! Keep searching for the stairs!`
              ]);
            } else {
              // If player loses in the School, warp back outside in Hometown with full Stamina
              this.currentMapIndex = 1;
              const town = this.world.maps[1];
              this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
              this.squad.forEach(p => { p.sta = p.maxSta; });
              this.updateTopHud();
              SR.UI.showDialogue('REGROUP AT HOME', [
                'The Jocks pushed you back outside the school! Your squad caught their breath (100% Stamina)—head back North when ready!'
              ]);
            }
          });
        });
        return;
      }

      if (npc.role === 'SCHOOL_BOSS') {
        SR.UI.showDialogue(npc.name, [
          'Well, well! Look who made it to the Gymnasium! This school belongs to the VARSITY JOCKS now!',
          'MINI-BOSS MATCH: Varsity Jocks V! First to 2 Goals takes over the school!'
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
                'Varsity Capt. Chad: "No way!! How did a bunch of street kids beat the Varsity Jocks?!"',
                'Axel: "We did it, Leo!! We saved the High School gym! Now let\'s head to the Rustyard Base Camp and enter the Regional Striker Championship!"'
              ], () => {
                // Transition to original game starting at Region 1 Base Camp!
                this.loadRegion(0);
                SR.UI.showDialogue('ARRIVED AT BASE CAMP', [
                  `Welcome to ${this.world.region.townName}! Your squad leveled up and won $100 prize cash!`,
                  `Visit the CLUBHOUSE (Red Roof) to recruit players, check the SHOP (Blue Roof), talk to Kael (!), or head NORTH to the Stadium!`
                ]);
              });
            } else {
              this.currentMapIndex = 1;
              const town = this.world.maps[1];
              this.playerPos = { x: town.spawnOutsideHero.x, y: town.spawnOutsideHero.y };
              this.squad.forEach(p => { p.sta = p.maxSta; });
              this.updateTopHud();
              SR.UI.showDialogue('REGROUP AT HOME', [
                'The Varsity Jocks defended the Gym this time! Rest up at home or Mum\'s kitchen and rush back to the School!'
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
          npc.badge = '★';
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
              npc.badge = '✓';
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

    // Render Overworld + Fog of War + Cutscene + UI or Match
    render: function () {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, 320, 288);

      if (SR.Match.active) {
        SR.Match.render(ctx, this.tick);
        return;
      }

      const map = this.currentMap();
      const pal = this.world.region.palette;
      const isFog = !!map.fogOfWar;
      const visR = map.visionRadius || 4.5;

      // 1. Draw 20x18 Tile Grid (with Fog of War if enabled)
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 20; x++) {
          const dist = Math.hypot(x - this.playerPos.x, y - this.playerPos.y);
          const inSight = !isFog || (dist <= visR);
          const wasExplored = !isFog || (map.explored && map.explored[y][x]);

          if (!wasExplored) {
            ctx.fillStyle = '#06080e';
            ctx.fillRect(x * 16, y * 16, 16, 16);
            continue;
          }

          SR.drawTile(ctx, map.grid[y][x], x * 16, y * 16, pal, this.tick);

          if (!inSight) {
            // Dimmed memory fog for previously explored corridors
            ctx.fillStyle = 'rgba(6, 8, 14, 0.72)';
            ctx.fillRect(x * 16, y * 16, 16, 16);
          }
        }
      }

      // 2. Draw Map Labels (Signs / Portals)
      if (map.labels && !isFog) {
        ctx.font = 'bold 8px monospace';
        map.labels.forEach(lb => {
          const lx = lb.x * 16;
          const ly = lb.y * 16;
          const tw = ctx.measureText(lb.text).width;
          ctx.fillStyle = 'rgba(10, 13, 20, 0.78)';
          ctx.fillRect(lx - tw / 2 - 3, ly - 8, tw + 6, 11);
          ctx.fillStyle = lb.color || '#ffffff';
          ctx.fillText(lb.text, lx - tw / 2, ly);
        });
      }

      // 3. Draw Chests (only if within vision on fog maps)
      map.chests.forEach(c => {
        if (isFog && Math.hypot(c.x - this.playerPos.x, c.y - this.playerPos.y) > visR) return;
        SR.drawChest(ctx, c.x * 16, c.y * 16, c.opened, c.isQuest);
        if (!c.opened && c.isQuest) {
          ctx.fillStyle = '#ffd166';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('QUEST', c.x * 16 - 4, c.y * 16 - 2);
        }
      });

      // 4. Draw NPCs (only if within vision on fog maps)
      map.npcs.forEach(n => {
        if (isFog && Math.hypot(n.x - this.playerPos.x, n.y - this.playerPos.y) > visR) return;
        SR.drawCharacter(ctx, n.x * 16, n.y * 16, {
          skin: n.skin,
          hair: n.hair,
          kitPrimary: n.kitPrimary,
          kitSecondary: n.kitSecondary,
          moving: !!n.alerted
        }, this.tick);

        if (n.badge) {
          ctx.fillStyle = '#0d1017';
          ctx.fillRect(n.x * 16 + 1, n.y * 16 - 10, 15, 9);
          ctx.fillStyle = n.badge === '!' || n.badge === 'BOSS' ? '#ffd166' : '#4cc9f0';
          ctx.font = 'bold 7px monospace';
          ctx.fillText(n.badge.slice(0, 4), n.x * 16 + 2, n.y * 16 - 3);
        }
      });

      // 5. If Bedroom Cutscene Stage 2 is active, draw the 5 teammates gathered in the bedroom!
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
          SR.drawCharacter(ctx, fp.x * 16, fp.y * 16, {
            skin: mate.skin,
            hair: mate.hair,
            kitPrimary: '#3a86ff',
            kitSecondary: '#ffffff',
            moving: true
          }, this.tick);
        }
      }

      // 6. Draw Player Captain
      SR.drawCharacter(ctx, this.playerPos.x * 16, this.playerPos.y * 16, {
        skin: '#f4c29f',
        hair: '#3a86ff',
        kitPrimary: '#3a86ff',
        kitSecondary: '#ffffff',
        moving: this.cutsceneStage !== 1,
        hasBall: this.cutsceneStage === 0
      }, this.tick);

      // Sleeping "Zzz" indicator while in bed at start of cutscene
      if (this.cutsceneStage === 1 && this.currentMapIndex === 0) {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('Zzz...', this.playerPos.x * 16 + 2, this.playerPos.y * 16 - 4);
      }

      // 7. Draw UI Overlay if active
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
        if (SR.Match.active && SR.Match.subState !== 'ANIM_RESULT' && SR.Match.subState !== 'MATCH_OVER') {
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
          if (SR.Match.subState === 'ANIM_RESULT' || SR.Match.subState === 'MATCH_OVER') {
            SR.Match.executeCommand(0);
            return;
          }
          if (cy >= 210) {
            const col = cx >= 160 ? 1 : 0;
            const row = cy >= 240 ? 1 : 0;
            const idx = row * 2 + col;
            if (SR.Match.cursor === idx) {
              SR.Match.executeCommand(idx);
            } else {
              SR.Match.cursor = idx;
            }
          }
          return;
        }

        if (SR.UI.mode !== 'NONE') {
          this.handleActionInput('A');
          return;
        }

        const tx = Math.floor(cx / 16);
        const ty = Math.floor(cy / 16);
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
