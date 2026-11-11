window.SR = window.SR || {};

(function (SR) {
  // Clean Pokémon GBA 2-Part Match Engine
  SR.Match = {
    active: false,
    enemyTeam: null,
    isBoss: false,
    onComplete: null,

    playerScore: 0,
    enemyScore: 0,
    turn: 1,
    maxTurns: 10,
    maxOvertimeTurns: 3,
    goalsToWin: 2,

    // zone: 0 = Player Defense, 1 = Midfield, 2 = Player Attack
    zone: 1,
    // possession: 'PLAYER' | 'ENEMY'
    possession: 'PLAYER',
    // subState: 'INTRO' | 'COMMAND' | 'GK_DEFEND' | 'ANIM_RESULT' | 'PENALTY_INTRO' | 'PENALTY_KICK' | 'PENALTY_SAVE' | 'PENALTY_RESULT' | 'MATCH_OVER'
    subState: 'INTRO',

    // Active indices in the 5-man lineup [0:GK, 1:DEF, 2:MID1, 3:MID2, 4:FWD]
    activePlayerIdx: 2,
    activeEnemyIdx: 2,
    actedPlayerIdx: -1,
    actedEnemyIdx: -1,
    rhythmBonus: 0,
    enemyKeeperPressure: 0,
    playerKeeperPressure: 0,
    incomingShotPower: 0,
    incomingShooter: null,

    // Penalty Shootout state
    inPenalties: false,
    wonOnPenalties: false,
    penRound: 1,
    penPlayerScore: 0,
    penEnemyScore: 0,
    penHistoryP: [],
    penHistoryE: [],
    penLastPhase: 'PLAYER_KICK',

    cursor: 0, // 0..3 in the 2x2 command grid
    resultHeadline: '',
    resultColor: '#ffd166',
    resultBody: '',
    flashTimer: 0,
    flashColor: '#ffffff',

    isTextBoxState: function () {
      return (
        this.subState === 'INTRO' ||
        this.subState === 'ANIM_RESULT' ||
        this.subState === 'PENALTY_INTRO' ||
        this.subState === 'PENALTY_RESULT' ||
        this.subState === 'MATCH_OVER'
      );
    },

    start: function (game, enemyTeam, opts, onComplete) {
      this.game = game;
      this.enemyTeam = enemyTeam;
      this.isBoss = !!(opts && opts.isBoss);
      this.onComplete = onComplete;
      this.active = true;

      this.playerScore = 0;
      this.enemyScore = 0;
      this.turn = 1;
      this.maxTurns = (opts && opts.maxTurns) ? opts.maxTurns : (this.isBoss ? 14 : 10);
      this.maxOvertimeTurns = 3;
      this.goalsToWin = (opts && opts.goalsToWin) ? opts.goalsToWin : (this.isBoss ? 3 : 2);

      this.zone = 1; // Kickoff in Midfield
      this.possession = 'PLAYER';
      this.subState = 'INTRO';
      this.activePlayerIdx = 2; // Captain / MID1 starts with the ball
      this.activeEnemyIdx = 2;
      this.actedPlayerIdx = -1;
      this.actedEnemyIdx = -1;
      this.rhythmBonus = 0;
      this.enemyKeeperPressure = 0;
      this.playerKeeperPressure = 0;
      this._pendingGKShowdown = false;

      this.inPenalties = false;
      this.wonOnPenalties = false;
      this.penRound = 1;
      this.penPlayerScore = 0;
      this.penEnemyScore = 0;
      this.penHistoryP = [];
      this.penHistoryE = [];
      this.penLastPhase = 'PLAYER_KICK';

      this.cursor = 0;
      this.flashTimer = 0;

      const goalWord = this.goalsToWin === 1 ? '1 Goal' : `${this.goalsToWin} Goals`;
      this.resultHeadline = `VS ${enemyTeam.name.toUpperCase()}`;
      this.resultColor = '#ffd166';
      this.resultBody = `First to ${goalWord} wins (${this.maxTurns} turns)! Tip: Press [B] to Swap Partner or [M] for Bench Subs.`;
    },

    getPlayerSquad: function () {
      return this.game.squad.slice(0, 5);
    },

    getPlayer: function () {
      const sq = this.getPlayerSquad();
      return sq[this.activePlayerIdx] || sq[0];
    },

    getEnemy: function () {
      const eq = this.enemyTeam.players;
      return eq[this.activeEnemyIdx] || eq[0];
    },

    // Partner Switch: lets you swap between MID1 & MID2 in Midfield, or overlap a Midfielder into Attack/Defense!
    canSwapPartner: function () {
      return this.subState === 'COMMAND' && !this.inPenalties;
    },

    getSwapCandidates: function () {
      if (this.zone === 1) return [2, 3];    // Midfield: MID1 <-> MID2
      if (this.zone === 2) return [4, 2, 3]; // Attack: FWD -> MID1 -> MID2
      return [1, 2, 3];                      // Defense: DEF -> MID1 -> MID2
    },

    getNextSwapIdx: function () {
      const cands = this.getSwapCandidates();
      const curPos = cands.indexOf(this.activePlayerIdx);
      if (curPos === -1) return cands[0];
      return cands[(curPos + 1) % cands.length];
    },

    swapPartner: function () {
      if (!this.canSwapPartner()) return false;
      this.activePlayerIdx = this.getNextSwapIdx();
      return true;
    },

    syncMatchupForZone: function (preserveOverlap) {
      if (this.zone === 0) {
        if (!preserveOverlap || [1, 2, 3].indexOf(this.activePlayerIdx) === -1) {
          this.activePlayerIdx = 1; // Player DEF
        }
        this.activeEnemyIdx = 4;    // Enemy FWD
      } else if (this.zone === 1) {
        if (this.activePlayerIdx !== 2 && this.activePlayerIdx !== 3) {
          this.activePlayerIdx = 2;
        }
        this.activeEnemyIdx = (this.turn % 2 === 0) ? 3 : 2;
      } else if (this.zone === 2) {
        if (!preserveOverlap || [4, 2, 3].indexOf(this.activePlayerIdx) === -1) {
          this.activePlayerIdx = 4; // Player FWD
        }
        this.activeEnemyIdx = 1;    // Enemy DEF
      }
    },

    getEnemyGkBasePower: function () {
      const enemyGK = this.enemyTeam.players[0];
      const staMod = enemyGK.sta < 15 ? 0.78 : 1.0;
      const pressMod = Math.max(0.60, 1.0 - this.enemyKeeperPressure * 0.12);
      return (enemyGK.gk * 0.96 + enemyGK.int * 0.18) * staMod * pressMod;
    },

    getPlayerGkBasePower: function (gk, shooter, afterSta, saveMult) {
      const aff = SR.getAffinityAdvantage(gk.affinity, shooter.affinity);
      const staMod = afterSta < 15 ? 0.82 : 1.0;
      const pressMod = Math.max(0.68, 1.0 - this.playerKeeperPressure * 0.10);
      return (gk.gk * 1.15 + gk.tac * 0.2) * aff.mult * staMod * pressMod * saveMult;
    },

    getPenaltyKickerIdx: function () {
      const order = [4, 2, 3, 1];
      return order[(this.penRound - 1) % order.length];
    },

    getEnemyPenaltyKickerIdx: function () {
      const order = [4, 2, 3, 1];
      return order[(this.penRound - 1) % order.length];
    },

    getAvailableSkill: function (unit, isOffense, isGK) {
      if (!unit || !unit.skills) return null;
      for (let i = 0; i < unit.skills.length; i++) {
        const sk = SR.SKILLS[unit.skills[i]];
        if (!sk) continue;
        if (isGK && sk.type === 'GK') return sk;
        if (isOffense && (sk.type === 'DRIBBLE' || sk.type === 'PASS' || sk.type === 'SHOOT')) return sk;
        if (!isOffense && !isGK && (sk.type === 'TACKLE' || sk.type === 'INTERCEPT' || sk.type === 'BLOCK')) return sk;
      }
      return SR.SKILLS[unit.skills[0]] || null;
    },

    // Clean Command Definitions + Structured Side-Box Info (Type, STA Cost, Live Stat Clash, Clear Tip)
    getCommands: function () {
      const pSquad = this.getPlayerSquad();
      const eSquad = this.enemyTeam.players;

      // Penalty Shootout: Player Spot-Kick!
      if (this.subState === 'PENALTY_KICK') {
        const kicker = pSquad[this.getPenaltyKickerIdx()] || pSquad[4];
        const enemyGK = eSquad[0];
        const blastPow = Math.round(kicker.sho * 1.25);
        const gkHands = Math.round(enemyGK.gk * 1.05);
        return [
          {
            id: 'PEN_LEFT',
            label: 'Aim Left',
            moveType: 'CORNER',
            cost: 0,
            unitSta: kicker.sta,
            clashText: 'BEATS RIGHT / MID',
            clashFavored: true,
            tip: 'Whip low into the bottom-left corner!'
          },
          {
            id: 'PEN_RIGHT',
            label: 'Aim Right',
            moveType: 'CORNER',
            cost: 0,
            unitSta: kicker.sta,
            clashText: 'BEATS LEFT / MID',
            clashFavored: true,
            tip: 'Curl high into the top-right corner!'
          },
          {
            id: 'PEN_CENTER',
            label: 'Chip Center',
            moveType: 'PANENKA',
            cost: 0,
            unitSta: kicker.sta,
            clashText: 'BEATS DIVING GK',
            clashFavored: true,
            tip: 'Cheeky dink straight down the middle!'
          },
          {
            id: 'PEN_POWER',
            label: 'Power Blast ★',
            moveType: 'POWER ★',
            cost: 10,
            unitSta: kicker.sta,
            clashText: kicker.sta >= 10 ? `SHO ${blastPow} vs GK ${gkHands}` : 'LOW STA (Need 10)',
            clashFavored: kicker.sta >= 10 && blastPow >= gkHands,
            tip: 'Smash hard enough to beat GK hands!'
          }
        ];
      }

      // Penalty Shootout: Player Goalkeeper Save!
      if (this.subState === 'PENALTY_SAVE') {
        const gk = pSquad[0];
        const shooter = eSquad[this.getEnemyPenaltyKickerIdx()] || eSquad[4];
        const readPow = Math.round(gk.gk * 1.15 + gk.int * 0.25);
        const shoPow = Math.round(shooter.sho);
        return [
          {
            id: 'SAVE_LEFT',
            label: 'Dive Left',
            moveType: 'DIVE',
            cost: 0,
            unitSta: gk.sta,
            clashText: 'STOPS AIM LEFT',
            clashFavored: true,
            tip: 'Leap full-stretch to your left post!'
          },
          {
            id: 'SAVE_RIGHT',
            label: 'Dive Right',
            moveType: 'DIVE',
            cost: 0,
            unitSta: gk.sta,
            clashText: 'STOPS AIM RIGHT',
            clashFavored: true,
            tip: 'Fly full-stretch to your right post!'
          },
          {
            id: 'SAVE_CENTER',
            label: 'Hold Center',
            moveType: 'STAND',
            cost: 0,
            unitSta: gk.sta,
            clashText: 'STOPS CHIP CENTER',
            clashFavored: true,
            tip: 'Stand tall against middle Panenkas!'
          },
          {
            id: 'SAVE_READ',
            label: 'Read Eyes ★',
            moveType: 'INSTINCT',
            cost: 10,
            unitSta: gk.sta,
            clashText: gk.sta >= 10 ? `GK ${readPow} vs SHO ${shoPow}` : 'LOW STA (Need 10)',
            clashFavored: gk.sta >= 10 && readPow >= shoPow,
            tip: 'Use GK + INT reflexes to read shooter!'
          }
        ];
      }

      const p = this.getPlayer();
      const e = this.getEnemy();

      if (this.subState === 'GK_DEFEND') {
        const gk = pSquad[0];
        const shooter = this.incomingShooter || e;
        const shotPow = this.incomingShotPower;
        const sk = this.getAvailableSkill(gk, false, true);
        const skCost = sk ? sk.cost : 18;
        const skMult = sk ? sk.mult : 1.45;

        const catchVal = Math.round(this.getPlayerGkBasePower(gk, shooter, gk.sta - 4, 1.0));
        const punchVal = Math.round(this.getPlayerGkBasePower(gk, shooter, gk.sta - 5, 1.16));
        const skillVal = Math.round(this.getPlayerGkBasePower(gk, shooter, gk.sta - skCost, skMult));
        const diveVal = Math.round(this.getPlayerGkBasePower(gk, shooter, Math.min(gk.maxSta, gk.sta + 5), 1.05));

        return [
          {
            id: 'GK_CATCH',
            label: 'Catch Hold',
            moveType: 'SAVE',
            cost: 4,
            unitSta: gk.sta,
            clashText: `SAVE ${catchVal} vs SHO ${shotPow}`,
            clashFavored: catchVal >= shotPow,
            tip: 'Hold onto the ball in Defense.'
          },
          {
            id: 'GK_PUNCH',
            label: 'Punch Clear',
            moveType: 'SAVE',
            cost: 5,
            unitSta: gk.sta,
            clashText: `SAVE ${punchVal} vs SHO ${shotPow}`,
            clashFavored: punchVal >= shotPow,
            tip: '+16% Save power. Clears to Midfield.'
          },
          {
            id: 'GK_SKILL',
            label: sk ? `${sk.name} ★` : 'Titan Catch ★',
            moveType: 'SPECIAL',
            cost: skCost,
            unitSta: gk.sta,
            clashText: gk.sta >= skCost ? `SAVE ${skillVal} vs SHO ${shotPow}` : `LOW STA (Need ${skCost})`,
            clashFavored: gk.sta >= skCost && skillVal >= shotPow,
            tip: sk ? `+${Math.round((sk.mult - 1) * 100)}% GK Save power!` : 'Signature GK save!'
          },
          {
            id: 'GK_DIVE',
            label: 'Reflex Dive',
            moveType: 'SAVE',
            cost: 0,
            unitSta: gk.sta,
            clashText: `SAVE ${diveVal} vs SHO ${shotPow}`,
            clashFavored: diveVal >= shotPow,
            tip: 'Quick dive & recover +5 STA.'
          }
        ];
      }

      const aff = SR.getAffinityAdvantage(p.affinity, e.affinity);

      if (this.possession === 'PLAYER') {
        const sk = this.getAvailableSkill(p, true, false);
        const skCost = sk ? sk.cost : 15;
        const staModP = (p.sta - 5) < 15 ? 0.85 : 1.0;
        const staModE = (e.sta - 4) < 15 ? 0.85 : 1.0;
        const rhythmMult = 1.0 + this.rhythmBonus;

        const pDri = Math.round(p.dri * aff.mult * staModP * rhythmMult);
        const pPas = Math.round(p.pas * aff.mult * staModP * rhythmMult);
        const eTac = Math.round(e.tac * staModE);
        const eInt = Math.round(e.int * staModE);

        const distMult = this.zone === 2 ? 1.15 : 0.78;
        const pSho = Math.round(p.sho * aff.mult * staModP * rhythmMult * distMult);
        const gkVal = Math.round(this.getEnemyGkBasePower());

        const shootBtn = this.zone === 2 ? 'Shoot!' : (this.zone === 1 ? 'Long Shot' : 'Clear Ball');
        const shootTip = this.zone === 2
          ? (this.enemyKeeperPressure > 0
            ? `Strike! Foe GK rattled (-${this.enemyKeeperPressure * 12}%).`
            : 'Strike at Goal past the Keeper!')
          : (this.zone === 1 ? 'Long-range shot from Midfield.' : 'Safe boot out to Midfield.');
        const shootClash = this.zone === 0 ? 'SAFE -> MIDFIELD' : `SHO ${pSho} vs GK ${gkVal}`;
        const shootFavored = this.zone === 0 ? true : (pSho >= gkVal);

        let skClash = `LOW STA (Need ${skCost})`;
        let skFavored = false;
        if (sk && p.sta >= skCost) {
          const staModSk = (p.sta - skCost) < 15 ? 0.85 : 1.0;
          if (sk.type === 'DRIBBLE') {
            const v = Math.round(p.dri * aff.mult * staModSk * rhythmMult * sk.mult);
            skClash = `DRI ${v} vs TAC ${eTac}`;
            skFavored = v >= eTac;
          } else if (sk.type === 'PASS') {
            const v = Math.round(p.pas * aff.mult * staModSk * rhythmMult * sk.mult);
            skClash = `PAS ${v} vs INT ${eInt}`;
            skFavored = v >= eInt;
          } else {
            const v = Math.round(p.sho * aff.mult * staModSk * rhythmMult * distMult * sk.mult);
            skClash = `SHO ${v} vs GK ${gkVal}`;
            skFavored = v >= gkVal;
          }
        }

        return [
          {
            id: 'DRIBBLE',
            label: 'Dribble',
            moveType: 'DRIBBLE',
            cost: 5,
            unitSta: p.sta,
            clashText: `DRI ${pDri} vs TAC ${eTac}`,
            clashFavored: pDri >= eTac,
            tip: 'Solo run forward. Beats INTERCEPT.'
          },
          {
            id: 'PASS',
            label: 'Pass',
            moveType: 'PASS',
            cost: 5,
            unitSta: p.sta,
            clashText: `PAS ${pPas} vs INT ${eInt}`,
            clashFavored: pPas >= eInt,
            tip: 'Pass upfield. Beats TACKLE (+Boost).'
          },
          {
            id: 'SHOOT',
            label: shootBtn,
            moveType: this.zone === 0 ? 'CLEAR' : 'SHOOT',
            cost: this.zone === 0 ? 4 : 5,
            unitSta: p.sta,
            clashText: shootClash,
            clashFavored: shootFavored,
            tip: shootTip
          },
          {
            id: 'SKILL',
            label: sk ? `${sk.name} ★` : 'Special ★',
            moveType: sk ? `${sk.type} ★` : 'SPECIAL',
            cost: skCost,
            unitSta: p.sta,
            clashText: skClash,
            clashFavored: skFavored,
            tip: sk ? `+${Math.round((sk.mult - 1) * 100)}% ${sk.type} power!` : 'Signature move!'
          }
        ];
      } else {
        const sk = this.getAvailableSkill(p, false, false);
        const skCost = sk ? sk.cost : 15;
        const staModP = (p.sta - 5) < 15 ? 0.85 : 1.0;
        const staModE = (e.sta - 5) < 15 ? 0.85 : 1.0;

        const pTac = Math.round(p.tac * aff.mult * staModP);
        const pInt = Math.round(p.int * aff.mult * staModP);
        const eDri = Math.round(e.dri * staModE);
        const ePas = Math.round(e.pas * staModE);
        const eSho = Math.round(e.sho * staModE);
        const eShoCut = Math.round(eSho * 0.65);
        const pBlk = Math.round((p.tac + p.int) * 0.55 * aff.mult * staModP);
        const eMaxMove = Math.max(eDri, ePas);

        const blkClash = this.zone === 0
          ? `FOE SHO ${eSho} -> ${eShoCut}`
          : `BLK ${pBlk} vs FOE ${eMaxMove}`;
        const blkFavored = this.zone === 0 ? true : (pBlk >= eMaxMove);
        const blkTip = this.zone === 0
          ? 'Cuts incoming Foe Shot by 35%!'
          : 'Guard stance (Foes shoot in DEF).';

        let skClash = `LOW STA (Need ${skCost})`;
        let skFavored = false;
        if (sk && p.sta >= skCost) {
          const staModSk = (p.sta - skCost) < 15 ? 0.85 : 1.0;
          if (sk.type === 'TACKLE') {
            const v = Math.round(p.tac * aff.mult * staModSk * sk.mult);
            skClash = `TAC ${v} vs DRI ${eDri}`;
            skFavored = v >= eDri;
          } else if (sk.type === 'INTERCEPT') {
            const v = Math.round(p.int * aff.mult * staModSk * sk.mult);
            skClash = `INT ${v} vs PAS ${ePas}`;
            skFavored = v >= ePas;
          } else {
            skClash = `FOE SHO ${eSho} -> ${Math.round(eSho * 0.45)}`;
            skFavored = true;
          }
        }

        return [
          {
            id: 'TACKLE',
            label: 'Tackle',
            moveType: 'TACKLE',
            cost: 5,
            unitSta: p.sta,
            clashText: `TAC ${pTac} vs DRI ${eDri}`,
            clashFavored: pTac >= eDri,
            tip: 'Steal the ball. Beats DRIBBLE.'
          },
          {
            id: 'INTERCEPT',
            label: 'Intercept',
            moveType: 'INTERCEPT',
            cost: 5,
            unitSta: p.sta,
            clashText: `INT ${pInt} vs PAS ${ePas}`,
            clashFavored: pInt >= ePas,
            tip: 'Cut passing lane. Beats PASS.'
          },
          {
            id: 'BLOCK',
            label: 'Block Wall',
            moveType: 'BLOCK',
            cost: 5,
            unitSta: p.sta,
            clashText: blkClash,
            clashFavored: blkFavored,
            tip: blkTip
          },
          {
            id: 'SKILL',
            label: sk ? `${sk.name} ★` : 'Special ★',
            moveType: sk ? `${sk.type} ★` : 'SPECIAL',
            cost: skCost,
            unitSta: p.sta,
            clashText: skClash,
            clashFavored: skFavored,
            tip: sk ? (sk.type === 'BLOCK' ? 'Cuts Foe Shot power by 55%!' : `+${Math.round((sk.mult - 1) * 100)}% ${sk.type} power!`) : 'Defensive skill!'
          }
        ];
      }
    },

    executeCommand: function (cmdIndex) {
      if (this.subState === 'INTRO') {
        this.subState = 'COMMAND';
        this.cursor = 0;
        return;
      }
      if (this.subState === 'PENALTY_INTRO') {
        this.subState = 'PENALTY_KICK';
        this.cursor = 0;
        return;
      }
      if (this.subState === 'PENALTY_RESULT') {
        this.advancePenaltyAfterResult();
        return;
      }
      if (this.subState === 'ANIM_RESULT') {
        this.advanceAfterPause();
        return;
      }
      if (this.subState === 'MATCH_OVER') {
        this.finishMatch();
        return;
      }

      const cmds = this.getCommands();
      const chosen = cmds[cmdIndex] || cmds[0];

      if (this.subState === 'PENALTY_KICK') {
        this.resolvePenaltyKick(chosen.id);
        return;
      }
      if (this.subState === 'PENALTY_SAVE') {
        this.resolvePenaltySave(chosen.id);
        return;
      }
      if (this.subState === 'GK_DEFEND') {
        this.resolvePlayerGoalkeeperSave(chosen.id);
        return;
      }

      if (this.possession === 'PLAYER') {
        this.resolvePlayerOffense(chosen.id);
      } else {
        this.resolvePlayerDefense(chosen.id);
      }
    },

    handleCanvasClick: function (cx, cy) {
      if (this.isTextBoxState()) {
        this.executeCommand(0);
        return;
      }

      // Bottom-left quick tactical pills (y: 165..192) during COMMAND / GK_DEFEND
      if (!this.inPenalties && cy >= 164 && cy <= 193) {
        if (this.canSwapPartner() && cx >= 6 && cx <= 98) {
          this.swapPartner();
          return;
        }
        if ((this.subState === 'COMMAND' && cx >= 100 && cx <= 158) ||
            (this.subState === 'GK_DEFEND' && cx >= 6 && cx <= 104)) {
          SR.UI.openSquadMenu();
          return;
        }
      }

      // Tapping a swappable teammate sprite on the pitch swaps directly to them!
      if (this.canSwapPartner() && this._lastPlayerSpriteCoords && cy >= 75 && cy <= 140) {
        const cands = this.getSwapCandidates();
        for (let i = 0; i < cands.length; i++) {
          const idx = cands[i];
          const sc = this._lastPlayerSpriteCoords[idx];
          if (sc && cx >= sc.x - 4 && cx <= sc.x + 20 && cy >= sc.y - 4 && cy <= sc.y + 20) {
            this.activePlayerIdx = idx;
            return;
          }
        }
      }

      // Left 2x2 command grid sits at x: 6..194, y: 200..282
      if (cy >= 198 && cx <= 198) {
        const col = cx >= 101 ? 1 : 0;
        const row = cy >= 241 ? 1 : 0;
        const idx = row * 2 + col;
        if (this.cursor === idx) {
          this.executeCommand(idx);
        } else {
          this.cursor = idx;
        }
      }
    },

    // PLAYER HAS THE BALL (OFFENSE)
    resolvePlayerOffense: function (cmdId) {
      const p = this.getPlayer();
      const e = this.getEnemy();
      this.actedPlayerIdx = this.activePlayerIdx;
      this.actedEnemyIdx = this.activeEnemyIdx;

      // Safe Clearance from Defense to Midfield
      if (cmdId === 'SHOOT' && this.zone === 0) {
        p.sta = Math.max(0, p.sta - 4);
        this.zone = 1;
        this.playerKeeperPressure = 0;
        this.activePlayerIdx = 2;
        this.syncMatchupForZone(false);
        this.resultHeadline = 'CLEARED TO MIDFIELD!';
        this.resultColor = '#4cc9f0';
        this.resultBody = `${p.name} boots the ball out of danger! ${this.getPlayer().name} controls it in Midfield.`;
        this.subState = 'ANIM_RESULT';
        return;
      }

      let usedSkill = null;
      let baseType = cmdId;
      if (cmdId === 'SKILL') {
        const sk = this.getAvailableSkill(p, true, false);
        if (sk && p.sta >= sk.cost) {
          usedSkill = sk;
          baseType = sk.type;
          p.sta -= sk.cost;
          this.flashTimer = 18;
          this.flashColor = sk.color;
        } else {
          baseType = this.zone === 2 ? 'SHOOT' : 'DRIBBLE';
          p.sta = Math.max(0, p.sta - 5);
        }
      } else {
        p.sta = Math.max(0, p.sta - 5);
      }

      const aiChoices = this.zone === 2 ? ['TACKLE', 'INTERCEPT', 'BLOCK'] : ['TACKLE', 'INTERCEPT'];
      const enemyCmd = aiChoices[Math.floor(Math.random() * aiChoices.length)];
      e.sta = Math.max(0, e.sta - 4);

      const aff = SR.getAffinityAdvantage(p.affinity, e.affinity);
      const staPenaltyP = p.sta < 15 ? 0.85 : 1.0;
      const staPenaltyE = e.sta < 15 ? 0.85 : 1.0;
      const skillMult = usedSkill ? usedSkill.mult : 1.0;
      const rhythmMult = 1.0 + this.rhythmBonus;

      if (baseType === 'SHOOT') {
        const distMult = this.zone === 2 ? 1.15 : 0.78;
        let shotPow = p.sho * aff.mult * staPenaltyP * skillMult * rhythmMult * distMult;
        shotPow *= (0.92 + Math.random() * 0.18);

        let blockNote = '';
        if (enemyCmd === 'BLOCK') {
          shotPow *= 0.72;
          blockNote = ` ${e.name} deflected part of it!`;
        }

        const enemyGK = this.enemyTeam.players[0];
        const gkPow = this.getEnemyGkBasePower() * (0.9 + Math.random() * 0.2);
        enemyGK.sta = Math.max(0, enemyGK.sta - 12);
        this.rhythmBonus = 0;

        const moveTitle = usedSkill ? usedSkill.name : 'a fierce strike';
        if (shotPow >= gkPow) {
          this.playerScore++;
          this.flashTimer = 24;
          this.flashColor = '#ffd166';
          this.resultHeadline = `GOAL!! ${p.name.toUpperCase()} SCORES! (${this.playerScore} - ${this.enemyScore})`;
          this.resultColor = '#06d6a0';
          this.resultBody = `${p.name} fires ${moveTitle} (${Math.round(shotPow)}) right past GK ${enemyGK.name} (${Math.round(gkPow)})!`;
          this.resetAfterGoal('ENEMY');
        } else {
          // Consecutive saves tire and rattle the Enemy Keeper!
          this.enemyKeeperPressure = Math.min(3, this.enemyKeeperPressure + 1);
          this.possession = 'ENEMY';
          this.zone = 1;
          this.syncMatchupForZone(false);
          this.resultHeadline = `SAVED BY GK ${enemyGK.name.toUpperCase()}!`;
          this.resultColor = '#ef476f';
          this.resultBody = `${p.name} fires ${moveTitle} (${Math.round(shotPow)}).${blockNote} GK ${enemyGK.name} saves (${Math.round(gkPow)}, tiring -${this.enemyKeeperPressure * 12}%)!`;
          this.subState = 'ANIM_RESULT';
        }
        return;
      }

      const atkStat = baseType === 'PASS' ? p.pas : p.dri;
      const defStat = enemyCmd === 'INTERCEPT' ? e.int : (enemyCmd === 'TACKLE' ? e.tac : (e.tac + e.int) * 0.5);

      let tacMultP = 1.0;
      let tacMultE = 1.0;
      let tacNote = '';
      if (baseType === 'PASS' && enemyCmd === 'TACKLE') {
        tacMultP = 1.25;
        tacNote = 'Smart read: Pass beat Tackle!';
      } else if (baseType === 'DRIBBLE' && enemyCmd === 'INTERCEPT') {
        tacMultP = 1.25;
        tacNote = 'Smart read: Dribble beat Intercept!';
      } else if (baseType === 'DRIBBLE' && enemyCmd === 'TACKLE') {
        tacMultE = 1.22;
        tacNote = `${e.name}'s Tackle countered your Dribble!`;
      } else if (baseType === 'PASS' && enemyCmd === 'INTERCEPT') {
        tacMultE = 1.22;
        tacNote = `${e.name} intercepted your Pass!`;
      }

      const atkRoll = Math.round(atkStat * aff.mult * staPenaltyP * skillMult * rhythmMult * tacMultP * (0.9 + Math.random() * 0.2));
      const defRoll = Math.round(defStat * staPenaltyE * tacMultE * (0.9 + Math.random() * 0.2));
      const actionTitle = usedSkill ? usedSkill.name : (baseType === 'PASS' ? 'Pass' : 'Dribble');

      if (atkRoll >= defRoll) {
        this.rhythmBonus = (baseType === 'PASS') ? 0.15 : 0.05;
        const oldZone = this.zone;
        this.zone = Math.min(2, this.zone + 1);
        this.playerKeeperPressure = 0;

        if (this.zone === 1) {
          this.activePlayerIdx = (this.activePlayerIdx === 2) ? 3 : 2;
          this.syncMatchupForZone(false);
        } else if (this.zone === 2) {
          if (baseType === 'PASS' && oldZone === 2) {
            // Passing inside the Attack Zone rotates between Striker and Overlapping Midfielders!
            this.activePlayerIdx = this.getNextSwapIdx();
          } else {
            // Auto-feed freshest attacker if Striker is exhausted!
            const sq = this.getPlayerSquad();
            this.activePlayerIdx = (sq[4] && sq[4].sta < 15 && sq[3] && sq[3].sta >= 20) ? 3 : 4;
          }
          this.syncMatchupForZone(true);
        }

        const nextZoneName = this.zone === 1 ? 'Midfield' : 'the Attack Zone';
        this.resultHeadline = `BREAKTHROUGH TO ${this.zone === 1 ? 'MIDFIELD' : 'ATTACK'}!`;
        this.resultColor = '#06d6a0';
        this.resultBody = `${p.name}'s ${actionTitle} (${atkRoll}) beat ${e.name}'s ${enemyCmd.toLowerCase()} (${defRoll})! ${tacNote || `Ball advances to ${nextZoneName}!`}`;
      } else {
        this.rhythmBonus = 0;
        this.possession = 'ENEMY';
        this.syncMatchupForZone(true);
        this.resultHeadline = `BALL LOST TO ${e.name.toUpperCase()}!`;
        this.resultColor = '#ef476f';
        this.resultBody = `${e.name} (${defRoll}) stopped ${p.name}'s ${actionTitle} (${atkRoll}). ${tacNote || `${this.enemyTeam.name} takes the ball!`}`;
      }
      this.subState = 'ANIM_RESULT';
    },

    // ENEMY HAS THE BALL (PLAYER DEFENDING)
    resolvePlayerDefense: function (playerDefCmd) {
      const p = this.getPlayer();
      const e = this.getEnemy();
      this.actedPlayerIdx = this.activePlayerIdx;
      this.actedEnemyIdx = this.activeEnemyIdx;

      let usedSkill = null;
      let defType = playerDefCmd;
      if (playerDefCmd === 'SKILL') {
        const sk = this.getAvailableSkill(p, false, false);
        if (sk && p.sta >= sk.cost) {
          usedSkill = sk;
          defType = sk.type;
          p.sta -= sk.cost;
          this.flashTimer = 18;
          this.flashColor = sk.color;
        } else {
          defType = 'TACKLE';
          p.sta = Math.max(0, p.sta - 5);
        }
      } else {
        p.sta = Math.max(0, p.sta - 5);
      }

      let enemyAtkCmd = 'DRIBBLE';
      if (this.zone === 0) {
        enemyAtkCmd = Math.random() < 0.68 ? 'SHOOT' : (Math.random() < 0.5 ? 'DRIBBLE' : 'PASS');
      } else {
        enemyAtkCmd = Math.random() < 0.5 ? 'DRIBBLE' : 'PASS';
      }
      e.sta = Math.max(0, e.sta - 5);

      const aff = SR.getAffinityAdvantage(p.affinity, e.affinity);
      const skillMult = usedSkill ? usedSkill.mult : 1.0;
      const staPenaltyP = p.sta < 15 ? 0.85 : 1.0;
      const staPenaltyE = e.sta < 15 ? 0.85 : 1.0;

      if (enemyAtkCmd === 'SHOOT') {
        let shotPow = e.sho * staPenaltyE * (0.92 + Math.random() * 0.2);
        let blockMsg = '';

        if (defType === 'BLOCK') {
          const cut = usedSkill ? 0.45 : 0.65;
          shotPow *= cut;
          blockMsg = `${p.name} blocked -${Math.round((1 - cut) * 100)}% power! `;
        } else if (defType === 'TACKLE') {
          const tacCheck = p.tac * aff.mult * skillMult * staPenaltyP;
          if (tacCheck > e.dri * 1.25) {
            this.possession = 'PLAYER';
            this.syncMatchupForZone(true);
            this.resultHeadline = `GREAT SLIDE TACKLE BY ${p.name.toUpperCase()}!`;
            this.resultColor = '#06d6a0';
            this.resultBody = `${e.name} wound up to shoot, but ${p.name} stripped the ball clean in Defense!`;
            this.subState = 'ANIM_RESULT';
            return;
          }
        }

        this.incomingShotPower = Math.max(6, Math.round(shotPow));
        this.incomingShooter = e;
        this.subState = 'ANIM_RESULT'; // Show shot warning cleanly before GK picks!
        this._pendingGKShowdown = true;
        const gk = this.getPlayerSquad()[0];
        this.resultHeadline = `SHOT ON GOAL BY ${e.name.toUpperCase()}!`;
        this.resultColor = '#ffca3a';
        this.resultBody = `${blockMsg}${e.name} blasts a shot toward goal (Power ${this.incomingShotPower})! Get ready to save with GK ${gk.name}!`;
        return;
      }

      const defStat = defType === 'INTERCEPT' ? p.int : (defType === 'TACKLE' ? p.tac : (p.tac + p.int) * 0.55);
      const atkStat = enemyAtkCmd === 'PASS' ? e.pas : e.dri;

      let tacMultP = 1.0;
      let tacMultE = 1.0;
      let tacNote = '';
      if (defType === 'TACKLE' && enemyAtkCmd === 'DRIBBLE') {
        tacMultP = 1.25;
        tacNote = 'Great read: Tackle stopped Dribble!';
      } else if (defType === 'INTERCEPT' && enemyAtkCmd === 'PASS') {
        tacMultP = 1.25;
        tacNote = 'Great read: Intercept cut the Pass!';
      } else if (defType === 'TACKLE' && enemyAtkCmd === 'PASS') {
        tacMultE = 1.20;
        tacNote = `${e.name} passed around your Tackle!`;
      } else if (defType === 'INTERCEPT' && enemyAtkCmd === 'DRIBBLE') {
        tacMultE = 1.20;
        tacNote = `${e.name} dribbled past your Intercept!`;
      }

      const defRoll = Math.round(defStat * aff.mult * staPenaltyP * skillMult * tacMultP * (0.9 + Math.random() * 0.2));
      const atkRoll = Math.round(atkStat * staPenaltyE * tacMultE * (0.9 + Math.random() * 0.2));
      const defMoveName = usedSkill ? usedSkill.name : (defType === 'INTERCEPT' ? 'Intercept' : (defType === 'BLOCK' ? 'Block' : 'Tackle'));

      if (defRoll >= atkRoll) {
        this.possession = 'PLAYER';
        this.rhythmBonus = 0.10;
        this.syncMatchupForZone(true);
        this.resultHeadline = `BALL WON BY ${p.name.toUpperCase()}!`;
        this.resultColor = '#06d6a0';
        this.resultBody = `${p.name}'s ${defMoveName} (${defRoll}) beat ${e.name}'s ${enemyAtkCmd.toLowerCase()} (${atkRoll})! ${tacNote || 'Time to counter-attack!'}`;
      } else {
        this.zone = Math.max(0, this.zone - 1);
        if (this.zone === 0) {
          this.enemyKeeperPressure = Math.max(0, this.enemyKeeperPressure - 1);
        }
        this.syncMatchupForZone(false);
        const zoneDanger = this.zone === 0 ? 'your Defense Zone' : 'Midfield';
        this.resultHeadline = `FOE PUSHES INTO ${this.zone === 0 ? 'DEFENSE' : 'MIDFIELD'}!`;
        this.resultColor = '#ef476f';
        this.resultBody = `${e.name}'s ${enemyAtkCmd.toLowerCase()} (${atkRoll}) beat ${p.name}'s ${defMoveName} (${defRoll}). ${tacNote || `${this.enemyTeam.name} advances into ${zoneDanger}!`}`;
      }
      this.subState = 'ANIM_RESULT';
    },

    resolvePlayerGoalkeeperSave: function (gkCmd) {
      const gk = this.getPlayerSquad()[0];
      const shooter = this.incomingShooter || this.getEnemy();
      const shotPow = this.incomingShotPower;
      this.actedPlayerIdx = 0;

      let saveMult = 1.0;
      let moveName = 'Catch Hold';
      let clearsToMid = false;

      if (gkCmd === 'GK_PUNCH') {
        saveMult = 1.16;
        moveName = 'Punch Clear';
        clearsToMid = true;
        gk.sta = Math.max(0, gk.sta - 7);
      } else if (gkCmd === 'GK_SKILL') {
        const sk = this.getAvailableSkill(gk, false, true);
        if (sk && gk.sta >= sk.cost) {
          saveMult = sk.mult;
          moveName = sk.name;
          gk.sta -= sk.cost;
          this.flashTimer = 20;
          this.flashColor = sk.color;
          clearsToMid = true;
        } else {
          saveMult = 1.08;
          moveName = 'Diving Catch';
          gk.sta = Math.max(0, gk.sta - 6);
        }
      } else if (gkCmd === 'GK_DIVE') {
        saveMult = 1.05;
        moveName = 'Reflex Dive';
        gk.sta = Math.min(gk.maxSta, gk.sta + 5);
      } else {
        gk.sta = Math.max(0, gk.sta - 6);
      }

      const saveRoll = Math.round(this.getPlayerGkBasePower(gk, shooter, gk.sta, saveMult) * (0.92 + Math.random() * 0.2));

      if (saveRoll >= shotPow) {
        this.playerKeeperPressure = clearsToMid
          ? Math.max(0, this.playerKeeperPressure - 1)
          : Math.min(3, this.playerKeeperPressure + 1);
        this.possession = 'PLAYER';
        this.zone = clearsToMid ? 1 : 0;
        this.activePlayerIdx = clearsToMid ? 2 : 1;
        this.syncMatchupForZone(false);
        this.resultHeadline = `SAVED BY GK ${gk.name.toUpperCase()}!`;
        this.resultColor = '#06d6a0';
        this.resultBody = `GK ${gk.name} used ${moveName} (${saveRoll} vs Shot ${shotPow})! ${clearsToMid ? 'Cleared straight to Midfield!' : 'Held safely in Defense!'}`;
        this.subState = 'ANIM_RESULT';
      } else {
        this.enemyScore++;
        this.flashTimer = 20;
        this.flashColor = '#ef476f';
        this.resultHeadline = `GOAL CONCEDED... (${this.playerScore} - ${this.enemyScore})`;
        this.resultColor = '#ef476f';
        this.resultBody = `${shooter.name}'s shot (${shotPow}) slipped past GK ${gk.name}'s ${moveName} (${saveRoll})!`;
        this.resetAfterGoal('PLAYER');
      }
    },

    // Off-ball teammates recover +4 STA/turn while resting (Bench recovers +6 STA/turn!)
    recoverRestingStamina: function () {
      const allP = this.game.squad;
      for (let i = 0; i < allP.length; i++) {
        if (i < 5) {
          if (i !== this.actedPlayerIdx) {
            allP[i].sta = Math.min(allP[i].maxSta, allP[i].sta + 4);
          }
        } else {
          allP[i].sta = Math.min(allP[i].maxSta, allP[i].sta + 6);
        }
      }
      const eq = this.enemyTeam.players;
      // Enemy outfielders (1..4) recover +3 STA when off-ball; Enemy GK (0) does NOT recover so shot pressure sticks!
      for (let j = 1; j < eq.length; j++) {
        if (j !== this.actedEnemyIdx) {
          eq[j].sta = Math.min(eq[j].maxSta, eq[j].sta + 3);
        }
      }
      this.actedPlayerIdx = -1;
      this.actedEnemyIdx = -1;
    },

    resetAfterGoal: function (nextPossession) {
      this.zone = 1;
      this.possession = nextPossession;
      this.activePlayerIdx = 2;
      this.activeEnemyIdx = 2;
      this.rhythmBonus = 0;
      this.enemyKeeperPressure = 0;
      this.playerKeeperPressure = 0;

      const hitGoalTarget = (this.playerScore >= this.goalsToWin || this.enemyScore >= this.goalsToWin);
      const goldenGoal = (this.turn > this.maxTurns && this.playerScore !== this.enemyScore);

      if (hitGoalTarget || goldenGoal) {
        this.subState = 'MATCH_OVER';
      } else {
        this.subState = 'ANIM_RESULT';
      }
    },

    advanceAfterPause: function () {
      // If an enemy shot was just announced, switch into Keeper Command choice!
      if (this._pendingGKShowdown) {
        this._pendingGKShowdown = false;
        this.subState = 'GK_DEFEND';
        this.cursor = 0;
        return;
      }

      if (this.playerScore >= this.goalsToWin || this.enemyScore >= this.goalsToWin) {
        this.subState = 'MATCH_OVER';
        return;
      }
      if (this.turn > this.maxTurns && this.playerScore !== this.enemyScore) {
        this.subState = 'MATCH_OVER';
        return;
      }

      this.recoverRestingStamina();
      this.turn++;

      // End of Regulation -> Check Winner or Start 3-Turn Golden Goal Overtime!
      if (this.turn === this.maxTurns + 1) {
        if (this.playerScore !== this.enemyScore) {
          this.subState = 'MATCH_OVER';
          return;
        }
        this.syncMatchupForZone(false);
        this.resultHeadline = `GOLDEN GOAL OVERTIME! (${this.maxOvertimeTurns} TURNS)`;
        this.resultColor = '#ffd166';
        this.resultBody = `Tied ${this.playerScore}-${this.enemyScore} at Full Time! Next goal wins immediately—or after ${this.maxOvertimeTurns} turns we go to PENALTIES!`;
        this.subState = 'INTRO';
        this.cursor = 0;
        return;
      }

      // End of 3-Turn Overtime -> Check Winner or Launch Interactive Penalty Shootout!
      if (this.turn > this.maxTurns + this.maxOvertimeTurns) {
        if (this.playerScore !== this.enemyScore) {
          this.subState = 'MATCH_OVER';
          return;
        }
        this.startPenaltyShootout();
        return;
      }

      this.syncMatchupForZone(true);
      this.subState = 'COMMAND';
      this.cursor = 0;
    },

    // =========================================================================
    // INTERACTIVE PENALTY SHOOTOUT (Best of 3 + Sudden Death — Zero Stalemates!)
    // =========================================================================
    startPenaltyShootout: function () {
      this.inPenalties = true;
      this.wonOnPenalties = false;
      this.penRound = 1;
      this.penPlayerScore = 0;
      this.penEnemyScore = 0;
      this.penHistoryP = [];
      this.penHistoryE = [];
      this.penLastPhase = 'PLAYER_KICK';

      // Quick breather (+12 STA) before stepping up to the penalty spot
      this.game.squad.forEach(u => { u.sta = Math.min(u.maxSta, u.sta + 12); });
      this.enemyTeam.players.forEach(u => { u.sta = Math.min(u.maxSta, u.sta + 12); });

      this.resultHeadline = 'PENALTY SHOOTOUT!!';
      this.resultColor = '#ffd166';
      this.resultBody = 'Still tied after Overtime! Best of 3 spot-kicks decides the winner. Your squad steps up to shoot first!';
      this.subState = 'PENALTY_INTRO';
      this.cursor = 0;
    },

    resolvePenaltyKick: function (cmdId) {
      const pSquad = this.getPlayerSquad();
      const kicker = pSquad[this.getPenaltyKickerIdx()] || pSquad[4];
      const enemyGK = this.enemyTeam.players[0];
      const dirs = ['LEFT', 'RIGHT', 'CENTER'];
      const gkDive = dirs[Math.floor(Math.random() * dirs.length)];
      this.penLastPhase = 'PLAYER_KICK';

      let scored = false;
      let story = '';

      if (cmdId === 'PEN_POWER' && kicker.sta >= 10) {
        kicker.sta -= 10;
        const shoRoll = Math.round(kicker.sho * 1.25 * (0.92 + Math.random() * 0.22));
        const gkRoll = Math.round(enemyGK.gk * 1.02 * (0.90 + Math.random() * 0.20));
        scored = shoRoll >= gkRoll;
        story = scored
          ? `${kicker.name} unleashes a Power Blast (${shoRoll}) right through GK ${enemyGK.name} (${gkRoll})!`
          : `GK ${enemyGK.name} (${gkRoll}) stood strong and parried ${kicker.name}'s Power Blast (${shoRoll})!`;
      } else {
        const chosenDir = cmdId === 'PEN_RIGHT' ? 'RIGHT' : (cmdId === 'PEN_CENTER' ? 'CENTER' : 'LEFT');
        const dirWord = chosenDir === 'CENTER' ? 'down the middle' : `to the ${chosenDir.toLowerCase()} corner`;
        if (chosenDir !== gkDive) {
          scored = true;
          story = `${kicker.name} slots it ${dirWord} while GK ${enemyGK.name} dives ${gkDive.toLowerCase()}!`;
        } else {
          const shoRoll = kicker.sho * (0.9 + Math.random() * 0.25);
          const gkRoll = enemyGK.gk * 1.12;
          scored = shoRoll > gkRoll;
          story = scored
            ? `GK ${enemyGK.name} guessed ${chosenDir.toLowerCase()}, but ${kicker.name}'s strike was too clinical!`
            : `GK ${enemyGK.name} guessed ${chosenDir.toLowerCase()} and denied ${kicker.name}'s spot-kick!`;
        }
      }

      if (scored) {
        this.penPlayerScore++;
        this.penHistoryP.push('O');
        this.flashTimer = 18;
        this.flashColor = '#06d6a0';
        this.resultHeadline = `PENALTY GOAL!! (PENS: ${this.penPlayerScore} - ${this.penEnemyScore})`;
        this.resultColor = '#06d6a0';
      } else {
        this.penHistoryP.push('X');
        this.resultHeadline = `PENALTY SAVED! (PENS: ${this.penPlayerScore} - ${this.penEnemyScore})`;
        this.resultColor = '#ef476f';
      }
      this.resultBody = story;

      if (this.isPenaltyShootoutDecided()) {
        this.concludePenaltyShootout();
      } else {
        this.subState = 'PENALTY_RESULT';
      }
    },

    resolvePenaltySave: function (cmdId) {
      const pSquad = this.getPlayerSquad();
      const gk = pSquad[0];
      const shooter = this.enemyTeam.players[this.getEnemyPenaltyKickerIdx()] || this.enemyTeam.players[4];
      const dirs = ['LEFT', 'RIGHT', 'CENTER'];
      const shotDir = dirs[Math.floor(Math.random() * dirs.length)];
      this.penLastPhase = 'ENEMY_KICK';

      let saved = false;
      let story = '';

      if (cmdId === 'SAVE_READ' && gk.sta >= 10) {
        gk.sta -= 10;
        const gkRoll = Math.round((gk.gk * 1.18 + gk.int * 0.25) * (0.92 + Math.random() * 0.22));
        const shoRoll = Math.round(shooter.sho * (0.90 + Math.random() * 0.20));
        saved = gkRoll >= shoRoll;
        story = saved
          ? `GK ${gk.name} read ${shooter.name}'s eyes (${gkRoll} vs ${shoRoll}) and made a stunning save!`
          : `${shooter.name}'s penalty (${shoRoll}) beat GK ${gk.name}'s read (${gkRoll}) into the net!`;
      } else {
        const diveDir = cmdId === 'SAVE_RIGHT' ? 'RIGHT' : (cmdId === 'SAVE_CENTER' ? 'CENTER' : 'LEFT');
        if (diveDir === shotDir) {
          const miracleShot = shooter.sho * 0.80 > gk.gk * 1.35 && Math.random() < 0.2;
          saved = !miracleShot;
          story = saved
            ? `GK ${gk.name} dove ${diveDir.toLowerCase()} and smothered ${shooter.name}'s penalty!`
            : `GK ${gk.name} guessed ${diveDir.toLowerCase()}, but ${shooter.name}'s shot kissed the post and went in!`;
        } else {
          // Small Sudden Death nerves chance for shooter to rattle the woodwork!
          const hitPost = (this.penRound >= 5 && Math.random() < 0.18) || Math.random() < 0.08;
          saved = hitPost;
          story = hitPost
            ? `${shooter.name} aimed ${shotDir.toLowerCase()}—CLANG! Off the crossbar and out!`
            : `${shooter.name} sent GK ${gk.name} the wrong way (${shotDir.toLowerCase()} corner).`;
        }
      }

      if (saved) {
        this.penHistoryE.push('X');
        this.flashTimer = 18;
        this.flashColor = '#06d6a0';
        this.resultHeadline = `STOPPED BY GK ${gk.name.toUpperCase()}!! (PENS: ${this.penPlayerScore} - ${this.penEnemyScore})`;
        this.resultColor = '#06d6a0';
      } else {
        this.penEnemyScore++;
        this.penHistoryE.push('O');
        this.flashTimer = 16;
        this.flashColor = '#ef476f';
        this.resultHeadline = `FOE CONVERTS... (PENS: ${this.penPlayerScore} - ${this.penEnemyScore})`;
        this.resultColor = '#ef476f';
      }
      this.resultBody = story;

      if (this.isPenaltyShootoutDecided()) {
        this.concludePenaltyShootout();
      } else {
        this.subState = 'PENALTY_RESULT';
      }
    },

    isPenaltyShootoutDecided: function () {
      const kicksP = this.penHistoryP.length;
      const kicksE = this.penHistoryE.length;

      // Best-of-3 regulation shootout rounds: check mathematical clinch!
      if (kicksP <= 3 && kicksE <= 3) {
        const remP = 3 - kicksP;
        const remE = 3 - kicksE;
        if (this.penPlayerScore > this.penEnemyScore + remE) return true;
        if (this.penEnemyScore > this.penPlayerScore + remP) return true;
        return false;
      }

      // Sudden Death rounds (Round 4+): decided once both teams have taken equal kicks and score differs!
      return (kicksP === kicksE && this.penPlayerScore !== this.penEnemyScore);
    },

    concludePenaltyShootout: function () {
      this.wonOnPenalties = true;
      if (this.penPlayerScore > this.penEnemyScore) {
        this.playerScore++;
      } else {
        this.enemyScore++;
      }
      this.subState = 'MATCH_OVER';
    },

    advancePenaltyAfterResult: function () {
      if (this.penLastPhase === 'PLAYER_KICK') {
        this.subState = 'PENALTY_SAVE';
        this.cursor = 0;
      } else {
        this.penRound++;
        this.subState = 'PENALTY_KICK';
        this.cursor = 0;
      }
    },

    finishMatch: function () {
      const won = this.playerScore > this.enemyScore;
      this.active = false;
      if (this.onComplete) {
        this.onComplete({
          won: won,
          playerScore: this.playerScore,
          enemyScore: this.enemyScore,
          enemyTeam: this.enemyTeam,
          isBoss: this.isBoss
        });
      }
    },

    // =========================================================================
    // CLEAN POKÉMON GBA 2-PART MATCH UI RENDERER (320 x 288)
    // =========================================================================
    render: function (ctx, tick) {
      // 1. TOP SCOREBOARD HEADER (y: 0..22)
      ctx.fillStyle = '#0d111a';
      ctx.fillRect(0, 0, 320, 22);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(0.5, 0.5, 319, 21);

      const isPlayerPenKick = (
        this.subState === 'PENALTY_KICK' ||
        this.subState === 'PENALTY_INTRO' ||
        (this.subState === 'PENALTY_RESULT' && this.penLastPhase === 'PLAYER_KICK')
      );

      if (this.inPenalties) {
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#4cc9f0';
        ctx.fillText(`PEN ${this.penPlayerScore}`, 8, 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('-', 48, 15);
        ctx.fillStyle = '#ef476f';
        ctx.fillText(`${this.penEnemyScore} FOE`, 57, 15);

        ctx.fillStyle = isPlayerPenKick ? '#06d6a0' : '#ffca3a';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`SHOOTOUT • ${isPlayerPenKick ? 'YOUR KICK' : 'SAVE IT!'}`, 104, 14);

        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(this.penRound <= 3 ? `RND ${this.penRound}/3` : `SUDDEN R${this.penRound}`, 252, 14);
      } else {
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#4cc9f0';
        ctx.fillText(`YOU ${this.playerScore}`, 8, 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('-', 44, 15);
        ctx.fillStyle = '#ef476f';
        ctx.fillText(`${this.enemyScore} FOE`, 53, 15);

        // Center Phase & Possession Indicator
        const zShort = this.subState === 'GK_DEFEND'
          ? 'GOALBOX'
          : (this.zone === 0 ? 'DEFENSE' : (this.zone === 1 ? 'MIDFIELD' : 'ATTACK'));
        const possShort = this.subState === 'GK_DEFEND'
          ? 'SAVE!'
          : (this.possession === 'PLAYER' ? 'YOUR BALL' : 'FOE BALL');
        ctx.fillStyle = this.possession === 'PLAYER' && this.subState !== 'GK_DEFEND' ? '#06d6a0' : '#ffca3a';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${zShort} • ${possShort}`, 100, 14);

        // Right Turn & Goal Target / Overtime Counter
        const inOT = this.turn > this.maxTurns;
        ctx.fillStyle = inOT ? '#ffd166' : '#cbd5e1';
        ctx.font = 'bold 9px monospace';
        const otTurn = Math.min(this.maxOvertimeTurns, Math.max(1, this.turn - this.maxTurns));
        const rightInfo = inOT
          ? `OT ${otTurn}/${this.maxOvertimeTurns} • GOLD`
          : `T${this.turn}/${this.maxTurns} • ${this.goalsToWin}G`;
        ctx.fillText(rightInfo, inOT ? 236 : 246, 14);
      }

      // 2. VISUAL 3-ZONE FOOTBALL PITCH (y: 22..196)
      ctx.fillStyle = '#1e5631';
      ctx.fillRect(0, 22, 320, 174);
      // Mow stripes across the pitch
      ctx.fillStyle = '#24633a';
      for (let sx = 0; sx < 320; sx += 40) {
        ctx.fillRect(sx, 22, 20, 174);
      }

      // Flash effect on Special Skill or Goal
      if (this.flashTimer > 0) {
        this.flashTimer--;
        if (this.flashTimer % 2 === 0) {
          ctx.fillStyle = this.flashColor;
          ctx.globalAlpha = 0.30;
          ctx.fillRect(0, 22, 320, 174);
          ctx.globalAlpha = 1.0;
        }
      }

      // Draw Pitch Lines & 3 Zone Columns (x: 16..304, y: 75..139)
      const px = 16, py = 75, pw = 288, ph = 64;
      const zw = 96; // 288 / 3

      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, pw, ph);
      // Zone dividers
      ctx.beginPath();
      ctx.moveTo(px + zw, py); ctx.lineTo(px + zw, py + ph);
      ctx.moveTo(px + zw * 2, py); ctx.lineTo(px + zw * 2, py + ph);
      ctx.stroke();

      // Center circle in Midfield
      ctx.beginPath();
      ctx.arc(px + 144, py + 32, 15, 0, Math.PI * 2);
      ctx.stroke();

      // Highlight the Active Zone on the Pitch
      const activeZ = this.inPenalties
        ? (isPlayerPenKick ? 2 : 0)
        : (this.subState === 'GK_DEFEND' ? 0 : this.zone);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + activeZ * zw + 1, py + 1, zw - 2, ph - 2);
      ctx.lineWidth = 1;

      const zTitles = ['DEFENSE', 'MIDFIELD', 'ATTACK'];
      for (let z = 0; z < 3; z++) {
        ctx.fillStyle = (z === activeZ) ? '#ffd166' : 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(zTitles[z], px + z * zw + 26, py + 10);
      }

      // Left Goal (Your Goal) & Right Goal (Foe Goal)
      ctx.fillStyle = '#4cc9f0';
      ctx.fillRect(px - 6, py + 18, 6, 28);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(px - 6, py + 18, 6, 28);

      ctx.fillStyle = '#ef476f';
      ctx.fillRect(px + pw, py + 18, 6, 28);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(px + pw, py + 18, 6, 28);

      // Draw 5v5 Squad Sprites on the Pitch!
      const pSquad = this.getPlayerSquad();
      const eSquad = this.enemyTeam.players;

      let activePIdx = this.subState === 'GK_DEFEND' ? 0 : this.activePlayerIdx;
      let activeEIdx = this.subState === 'GK_DEFEND' ? 4 : this.activeEnemyIdx;
      if (this.inPenalties) {
        activePIdx = isPlayerPenKick ? this.getPenaltyKickerIdx() : 0;
        activeEIdx = isPlayerPenKick ? 0 : this.getEnemyPenaltyKickerIdx();
      }

      const playerUnit = pSquad[activePIdx] || pSquad[0];
      const enemyUnit = (!this.inPenalties && this.subState === 'GK_DEFEND' && this.incomingShooter)
        ? this.incomingShooter
        : (eSquad[activeEIdx] || eSquad[0]);

      let pCoords, eCoords;
      if (this.inPenalties) {
        // Dramatic Penalty Shootout lineup: 4 teammates on the halfway line watching the 1v1 spot-kick!
        pCoords = [];
        eCoords = [];
        let pLine = 0, eLine = 0;
        for (let i = 0; i < 5; i++) {
          if (i === activePIdx) {
            pCoords[i] = isPlayerPenKick
              ? { x: px + pw - 56, y: py + 24 }
              : { x: px + 4,       y: py + 24 };
          } else {
            pCoords[i] = { x: px + 124, y: py + 8 + (pLine++) * 12 };
          }
          if (i === activeEIdx) {
            eCoords[i] = isPlayerPenKick
              ? { x: px + pw - 20, y: py + 24 }
              : { x: px + 42,      y: py + 24 };
          } else {
            eCoords[i] = { x: px + 148, y: py + 8 + (eLine++) * 12 };
          }
        }
      } else {
        // Base formation coords on the pitch (spread cleanly even when a Midfielder overlaps!)
        pCoords = [
          { x: px + 4,   y: py + 24 }, // 0: GK
          { x: px + 32,  y: activePIdx !== 1 && activeZ === 0 ? py + 39 : py + 24 }, // 1: DEF
          { x: px + 106, y: py + 13 }, // 2: MID1
          { x: px + 106, y: py + 38 }, // 3: MID2
          { x: px + 198, y: activePIdx !== 4 && activeZ === 2 ? py + 12 : py + 24 }  // 4: FWD
        ];
        eCoords = [
          { x: px + pw - 20, y: py + 24 }, // 0: Enemy GK
          { x: px + 246,     y: py + 24 }, // 1: Enemy DEF
          { x: px + 162,     y: py + 13 }, // 2: Enemy MID1
          { x: px + 162,     y: py + 38 }, // 3: Enemy MID2
          { x: px + 64,      y: py + 24 }  // 4: Enemy FWD
        ];

        // Snap active duelists face-to-face inside the active zone!
        const duelCenterX = px + activeZ * zw + 48;
        pCoords[activePIdx] = { x: duelCenterX - 22, y: py + 24 };
        eCoords[activeEIdx] = { x: duelCenterX + 6,  y: py + 24 };
      }
      this._lastPlayerSpriteCoords = pCoords;

      // Draw Spotlight Rings under the two active duelists
      ctx.strokeStyle = '#ffd166';
      ctx.strokeRect(pCoords[activePIdx].x + 1, pCoords[activePIdx].y + 12, 14, 5);
      ctx.strokeRect(eCoords[activeEIdx].x + 1, eCoords[activeEIdx].y + 12, 14, 5);

      for (let i = 0; i < 5; i++) {
        const isActP = (i === activePIdx);
        const playerHasBall = this.inPenalties
          ? (isActP && isPlayerPenKick)
          : (isActP && this.possession === 'PLAYER' && this.subState !== 'GK_DEFEND');
        SR.drawCharacter(ctx, pCoords[i].x, pCoords[i].y, {
          skin: pSquad[i].skin,
          hair: pSquad[i].hair,
          kitPrimary: '#3a86ff',
          kitSecondary: '#ffffff',
          moving: isActP,
          hasBall: playerHasBall
        }, tick);

        const isActE = (i === activeEIdx);
        const enemyHasBall = this.inPenalties
          ? (isActE && !isPlayerPenKick)
          : (isActE && (this.possession === 'ENEMY' || this.subState === 'GK_DEFEND'));
        SR.drawCharacter(ctx, eCoords[i].x, eCoords[i].y, {
          skin: eSquad[i].skin,
          hair: eSquad[i].hair,
          kitPrimary: this.enemyTeam.kitPrimary || '#ef476f',
          kitSecondary: this.enemyTeam.kitSecondary || '#111111',
          moving: isActE,
          hasBall: enemyHasBall
        }, tick);
      }

      // 3. POKÉMON GBA FLOATING HUD PLATES (Name + Style + Stamina + Contextual 3 Stats!)
      const playerIsAttacking = this.inPenalties
        ? isPlayerPenKick
        : (this.possession === 'PLAYER' && this.subState !== 'GK_DEFEND');

      // Top-Left: Opponent Active Player Plate
      this.drawHudPlate(ctx, 6, 24, enemyUnit, false, !playerIsAttacking, eSquad[0]);

      // Top-Right: Style Bonus/Penalty Pill (hidden when Even or during Penalties!)
      if (!this.inPenalties) {
        this.drawStyleMatchupBadge(ctx, 162, 24, playerUnit, enemyUnit);
      }

      // Bottom-Left: Crisp Partner Swap [B] & Bench Subs [M] Pills (only during active turn selection!)
      if (!this.inPenalties && (this.subState === 'COMMAND' || this.subState === 'GK_DEFEND')) {
        this.drawQuickTacticalPills(ctx, pSquad);
      }

      // Bottom-Right: Your Active Player Plate
      this.drawHudPlate(ctx, 162, 143, playerUnit, true, playerIsAttacking, pSquad[0]);

      // 4. BOTTOM CLASSIC GBA BOX (y: 196..288) — Switches cleanly between Text Box & Command Menu!
      ctx.fillStyle = '#0b0e16';
      ctx.fillRect(0, 196, 320, 92);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(0.5, 196.5, 319, 91);

      if (this.isTextBoxState()) {
        this.renderTextBoxFrame(ctx);
      } else {
        this.renderCommandMenuFrame(ctx);
      }
    },

    drawQuickTacticalPills: function (ctx, pSquad) {
      if (this.canSwapPartner()) {
        const nextUnit = pSquad[this.getNextSwapIdx()] || pSquad[2];
        ctx.fillStyle = 'rgba(13, 17, 26, 0.94)';
        ctx.fillRect(6, 168, 92, 22);
        ctx.strokeStyle = '#4cc9f0';
        ctx.strokeRect(6.5, 168.5, 91, 21);
        ctx.fillStyle = '#4cc9f0';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`[B] ⇄ ${nextUnit.name.split(' ')[0].slice(0, 7)}`, 11, 182);

        ctx.fillStyle = 'rgba(13, 17, 26, 0.94)';
        ctx.fillRect(102, 168, 54, 22);
        ctx.strokeStyle = '#ffd166';
        ctx.strokeRect(102.5, 168.5, 53, 21);
        ctx.fillStyle = '#ffd166';
        ctx.fillText('[M] Sub', 108, 182);
      } else if (this.subState === 'GK_DEFEND') {
        ctx.fillStyle = 'rgba(13, 17, 26, 0.94)';
        ctx.fillRect(6, 168, 96, 22);
        ctx.strokeStyle = '#ffd166';
        ctx.strokeRect(6.5, 168.5, 95, 21);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('[M] Sub / Soda', 12, 182);
      }
    },

    drawHudPlate: function (ctx, x, y, unit, isPlayer, isAttacking, teamGK) {
      const w = 152, h = 49;
      ctx.fillStyle = 'rgba(13, 17, 26, 0.94)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = isPlayer ? '#3a86ff' : '#ef476f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.lineWidth = 1;

      // Row 1: Player Name, Rhythm Boost (if active), & Role
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${unit.name.slice(0, 11)}`, x + 6, y + 12);

      if (isPlayer && this.rhythmBonus > 0 && this.subState !== 'GK_DEFEND') {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`+${Math.round(this.rhythmBonus * 100)}%`, x + 84, y + 12);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`[${unit.role}]`, x + 118, y + 12);

      // Row 2: Style Badge + Stamina Bar
      const aff = SR.AFFINITIES[unit.affinity] || SR.AFFINITIES.SPEED;
      ctx.fillStyle = aff.color;
      ctx.fillRect(x + 6, y + 17, 40, 12);
      ctx.fillStyle = '#090c12';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(aff.name.toUpperCase(), x + 8, y + 26);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 51, y + 18, 94, 10);
      const pct = Math.max(0, Math.min(1, unit.sta / unit.maxSta));
      ctx.fillStyle = pct > 0.35 ? '#06d6a0' : '#ef476f';
      ctx.fillRect(x + 51, y + 18, Math.round(94 * pct), 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText(`STA ${unit.sta}/${unit.maxSta}`, x + 64, y + 26);

      // Subtle Divider
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 6, y + 33, w - 12, 1);

      // Row 3: Contextual 3 Stats (Attack: DRI/PAS/SHO | Defense: TAC/INT/GK)
      const gkStat = teamGK ? teamGK.gk : unit.gk;
      const stats = isAttacking
        ? [
            { k: 'DRI', v: unit.dri },
            { k: 'PAS', v: unit.pas },
            { k: 'SHO', v: unit.sho }
          ]
        : [
            { k: 'TAC', v: unit.tac },
            { k: 'INT', v: unit.int },
            { k: 'GK',  v: gkStat }
          ];

      ctx.font = 'bold 8px monospace';
      for (let s = 0; s < 3; s++) {
        const sx = x + 6 + s * 48;
        ctx.fillStyle = isAttacking ? '#7dd3fc' : '#cbd5e1';
        ctx.fillText(stats[s].k, sx, y + 44);
        const labelW = ctx.measureText(stats[s].k).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(stats[s].v), sx + labelW + 4, y + 44);
      }
    },

    drawStyleMatchupBadge: function (ctx, x, y, pUnit, eUnit) {
      const pAff = SR.AFFINITIES[pUnit.affinity] || SR.AFFINITIES.SPEED;
      const eAff = SR.AFFINITIES[eUnit.affinity] || SR.AFFINITIES.SPEED;
      const adv = SR.getAffinityAdvantage(pUnit.affinity, eUnit.affinity);

      // Hide box completely when styles are identical (no bonus or penalty)
      if (adv.mult === 1) return;

      ctx.fillStyle = 'rgba(13, 17, 26, 0.94)';
      ctx.fillRect(x, y, 152, 30);

      if (adv.mult > 1) {
        ctx.strokeStyle = '#06d6a0';
        ctx.strokeRect(x + 0.5, y + 0.5, 151, 29);
        ctx.fillStyle = '#06d6a0';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('STYLE BONUS (+20%)', x + 8, y + 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Your ${pAff.name} beats ${eAff.name}`, x + 8, y + 24);
      } else {
        ctx.strokeStyle = '#ffca3a';
        ctx.strokeRect(x + 0.5, y + 0.5, 151, 29);
        ctx.fillStyle = '#ffca3a';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('STYLE PENALTY (-15%)', x + 8, y + 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Foe ${eAff.name} beats ${pAff.name}`, x + 8, y + 24);
      }
    },

    renderTextBoxFrame: function (ctx) {
      ctx.fillStyle = '#111624';
      ctx.fillRect(6, 201, 308, 81);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(7, 202, 306, 79);
      ctx.lineWidth = 1;

      let title = this.resultHeadline;
      if (this.subState === 'MATCH_OVER') {
        if (this.wonOnPenalties) {
          title = this.playerScore > this.enemyScore
            ? `SHOOTOUT VICTORY!! (PENS ${this.penPlayerScore} - ${this.penEnemyScore})`
            : `SHOOTOUT DEFEAT (PENS ${this.penPlayerScore} - ${this.penEnemyScore})`;
        } else {
          title = this.playerScore > this.enemyScore
            ? `VICTORY!! (${this.playerScore} - ${this.enemyScore})`
            : `FULL TIME — DEFEAT (${this.playerScore} - ${this.enemyScore})`;
        }
      }

      ctx.fillStyle = this.subState === 'MATCH_OVER'
        ? (this.playerScore > this.enemyScore ? '#06d6a0' : '#ef476f')
        : this.resultColor;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(title, 14, 218);

      // Multi-line word-wrapped body text — NEVER cut off!
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '9px monospace';
      this.drawWrappedText(ctx, this.resultBody, 14, 234, 292, 13, 3);

      ctx.fillStyle = '#4cc9f0';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Press [A / Enter] or Tap ▶', 178, 275);
    },

    renderCommandMenuFrame: function (ctx) {
      const cmds = this.getCommands();

      // Left 2x2 Command Buttons (x: 6..194, y: 201..281)
      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = 6 + col * 95;
        const by = 201 + row * 41;
        const bw = 92;
        const bh = 38;
        const sel = (this.cursor === i);

        ctx.fillStyle = sel ? '#1e293b' : '#121826';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = sel ? '#ffd166' : '#334155';
        ctx.lineWidth = sel ? 2 : 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        ctx.lineWidth = 1;

        ctx.fillStyle = sel ? '#ffd166' : '#f1f5f9';
        ctx.font = 'bold 9px monospace';
        const prefix = sel ? '▶ ' : '  ';
        this.drawWrappedText(ctx, prefix + cmds[i].label, bx + 5, by + 16, bw - 8, 12, 2);
      }

      // Right Pokémon GBA Move Info Side-Box (x: 199..314, y: 201..281)
      const active = cmds[this.cursor] || cmds[0];
      ctx.fillStyle = '#121826';
      ctx.fillRect(199, 201, 115, 80);
      ctx.strokeStyle = '#4cc9f0';
      ctx.strokeRect(199.5, 201.5, 114, 79);

      // Row 1: Move Type (left) + Stamina Cost (right-aligned)
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#ffd166';
      ctx.fillText(active.moveType, 205, 213);

      const canAfford = active.unitSta >= active.cost;
      const costStr = active.cost > 0
        ? (canAfford ? `${active.cost} STA` : `${active.cost} STA!`)
        : 'FREE';
      ctx.fillStyle = canAfford ? '#94a3b8' : '#ef476f';
      const costW = ctx.measureText(costStr).width;
      ctx.fillText(costStr, 309 - costW, 213);

      // Row 2: Live Effective Stat Clash Preview!
      const isBlockedSkill = !canAfford && (active.id === 'SKILL' || active.id === 'GK_SKILL');
      ctx.fillStyle = isBlockedSkill ? '#ef476f' : (active.clashFavored ? '#06d6a0' : '#ffca3a');
      ctx.font = 'bold 8px monospace';
      ctx.fillText(active.clashText || '', 205, 227);

      // Divider line
      ctx.fillStyle = '#334155';
      ctx.fillRect(205, 233, 104, 1);

      // Wrapped Tactical Tip
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '8px monospace';
      this.drawWrappedText(ctx, active.tip, 205, 245, 104, 11, 3);
    },

    drawWrappedText: function (ctx, text, x, y, maxWidth, lineHeight, maxLines) {
      const words = String(text || '').split(' ');
      let line = '';
      let cy = y;
      let count = 0;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), x, cy);
          count++;
          if (maxLines && count >= maxLines) return;
          line = words[n] + ' ';
          cy += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        ctx.fillText(line.trim(), x, cy);
      }
    }
  };
})(window.SR);
