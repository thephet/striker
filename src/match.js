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
    goalsToWin: 2,

    // zone: 0 = Player Defense, 1 = Midfield, 2 = Player Attack
    zone: 1,
    // possession: 'PLAYER' | 'ENEMY'
    possession: 'PLAYER',
    // subState: 'INTRO' | 'COMMAND' | 'GK_DEFEND' | 'ANIM_RESULT' | 'MATCH_OVER'
    subState: 'INTRO',

    // Active indices in the 5-man lineup [0:GK, 1:DEF, 2:MID1, 3:MID2, 4:FWD]
    activePlayerIdx: 2,
    activeEnemyIdx: 2,
    rhythmBonus: 0,
    incomingShotPower: 0,
    incomingShooter: null,

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
      this.goalsToWin = (opts && opts.goalsToWin) ? opts.goalsToWin : (this.isBoss ? 3 : 2);

      this.zone = 1; // Kickoff in Midfield
      this.possession = 'PLAYER';
      this.subState = 'INTRO';
      this.activePlayerIdx = 2; // Captain / MID1 starts with the ball
      this.activeEnemyIdx = 2;
      this.rhythmBonus = 0;
      this.cursor = 0;
      this.flashTimer = 0;

      const goalWord = this.goalsToWin === 1 ? '1 Goal' : `${this.goalsToWin} Goals`;
      this.resultHeadline = `VS ${enemyTeam.name.toUpperCase()}`;
      this.resultColor = '#ffd166';
      this.resultBody = `First to ${goalWord} wins (up to ${this.maxTurns} turns)! ${this.getPlayer().name} takes the kickoff in Midfield.`;
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

    syncMatchupForZone: function () {
      if (this.zone === 0) {
        this.activePlayerIdx = 1; // Player DEF
        this.activeEnemyIdx = 4;  // Enemy FWD
      } else if (this.zone === 1) {
        if (this.activePlayerIdx !== 2 && this.activePlayerIdx !== 3) {
          this.activePlayerIdx = 2;
        }
        this.activeEnemyIdx = (this.turn % 2 === 0) ? 3 : 2;
      } else if (this.zone === 2) {
        if (this.possession === 'PLAYER') {
          if (this.activePlayerIdx !== 4 && this.activePlayerIdx !== 3) {
            this.activePlayerIdx = 4; // Player FWD
          }
          this.activeEnemyIdx = 1; // Enemy DEF
        } else {
          this.activePlayerIdx = 4;
          this.activeEnemyIdx = 1;
        }
      }
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

    // Clean Command Definitions + Structured Side-Box Info (Type, STA Cost, Clear Tactical Tip)
    getCommands: function () {
      const p = this.getPlayer();

      if (this.subState === 'GK_DEFEND') {
        const gk = this.getPlayerSquad()[0];
        const sk = this.getAvailableSkill(gk, false, true);
        return [
          {
            id: 'GK_CATCH',
            label: 'Catch Hold',
            moveType: 'SAVE',
            cost: 4,
            unitSta: gk.sta,
            tip: 'Hold onto the ball in Defense.'
          },
          {
            id: 'GK_PUNCH',
            label: 'Punch Clear',
            moveType: 'SAVE',
            cost: 5,
            unitSta: gk.sta,
            tip: '+16% Save power. Clears to Midfield.'
          },
          {
            id: 'GK_SKILL',
            label: sk ? `${sk.name} ★` : 'Titan Catch ★',
            moveType: 'SPECIAL',
            cost: sk ? sk.cost : 18,
            unitSta: gk.sta,
            tip: sk ? `+${Math.round((sk.mult - 1) * 100)}% GK Save power!` : 'Signature GK save!'
          },
          {
            id: 'GK_DIVE',
            label: 'Reflex Dive',
            moveType: 'SAVE',
            cost: 0,
            unitSta: gk.sta,
            tip: 'Quick dive & recover +5 STA.'
          }
        ];
      }

      if (this.possession === 'PLAYER') {
        const sk = this.getAvailableSkill(p, true, false);
        const shootBtn = this.zone === 2 ? 'Shoot!' : (this.zone === 1 ? 'Long Shot' : 'Clear Ball');
        const shootTip = this.zone === 2
          ? 'Strike at Goal past the Keeper!'
          : (this.zone === 1 ? 'Long-range shot from Midfield.' : 'Safe boot out to Midfield.');

        return [
          {
            id: 'DRIBBLE',
            label: 'Dribble',
            moveType: 'DRIBBLE',
            cost: 5,
            unitSta: p.sta,
            tip: 'Solo run forward. Beats INTERCEPT.'
          },
          {
            id: 'PASS',
            label: 'Pass',
            moveType: 'PASS',
            cost: 5,
            unitSta: p.sta,
            tip: 'Pass upfield. Beats TACKLE (+Boost).'
          },
          {
            id: 'SHOOT',
            label: shootBtn,
            moveType: this.zone === 0 ? 'CLEAR' : 'SHOOT',
            cost: 5,
            unitSta: p.sta,
            tip: shootTip
          },
          {
            id: 'SKILL',
            label: sk ? `${sk.name} ★` : 'Special ★',
            moveType: sk ? `${sk.type} ★` : 'SPECIAL',
            cost: sk ? sk.cost : 15,
            unitSta: p.sta,
            tip: sk ? `+${Math.round((sk.mult - 1) * 100)}% ${sk.type} power!` : 'Signature move!'
          }
        ];
      } else {
        const sk = this.getAvailableSkill(p, false, false);
        return [
          {
            id: 'TACKLE',
            label: 'Tackle',
            moveType: 'TACKLE',
            cost: 5,
            unitSta: p.sta,
            tip: 'Steal the ball. Beats DRIBBLE.'
          },
          {
            id: 'INTERCEPT',
            label: 'Intercept',
            moveType: 'INTERCEPT',
            cost: 5,
            unitSta: p.sta,
            tip: 'Cut passing lane. Beats PASS.'
          },
          {
            id: 'BLOCK',
            label: 'Block Wall',
            moveType: 'BLOCK',
            cost: 5,
            unitSta: p.sta,
            tip: 'Cuts incoming Shot power by 35%.'
          },
          {
            id: 'SKILL',
            label: sk ? `${sk.name} ★` : 'Special ★',
            moveType: sk ? `${sk.type} ★` : 'SPECIAL',
            cost: sk ? sk.cost : 15,
            unitSta: p.sta,
            tip: sk ? `+${Math.round((sk.mult - 1) * 100)}% ${sk.type} power!` : 'Defensive skill!'
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

      // Safe Clearance from Defense to Midfield
      if (cmdId === 'SHOOT' && this.zone === 0) {
        p.sta = Math.max(0, p.sta - 4);
        this.zone = 1;
        this.activePlayerIdx = 2;
        this.syncMatchupForZone();
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
      const staPenaltyP = p.sta < 15 ? 0.78 : 1.0;
      const staPenaltyE = e.sta < 15 ? 0.78 : 1.0;
      const skillMult = usedSkill ? usedSkill.mult : 1.0;
      const rhythmMult = 1.0 + this.rhythmBonus;

      if (baseType === 'SHOOT') {
        const distMult = this.zone === 2 ? 1.15 : 0.78;
        let shotPow = p.sho * aff.mult * staPenaltyP * skillMult * rhythmMult * distMult;
        shotPow *= (0.92 + Math.random() * 0.18);

        let blockNote = '';
        if (enemyCmd === 'BLOCK') {
          shotPow *= 0.70;
          blockNote = ` ${e.name} blocked part of it!`;
        }

        const enemyGK = this.enemyTeam.players[0];
        const gkPow = (enemyGK.gk * 1.12 + enemyGK.int * 0.25) * (enemyGK.sta < 15 ? 0.8 : 1.0) * (0.9 + Math.random() * 0.2);
        enemyGK.sta = Math.max(0, enemyGK.sta - 6);
        this.rhythmBonus = 0;

        const moveTitle = usedSkill ? usedSkill.name : 'a powerful shot';
        if (shotPow >= gkPow) {
          this.playerScore++;
          this.flashTimer = 24;
          this.flashColor = '#ffd166';
          this.resultHeadline = `GOAL!! ${p.name.toUpperCase()} SCORES! (${this.playerScore} - ${this.enemyScore})`;
          this.resultColor = '#06d6a0';
          this.resultBody = `${p.name} fires ${moveTitle} (${Math.round(shotPow)}) right past GK ${enemyGK.name} (${Math.round(gkPow)})!`;
          this.resetAfterGoal('ENEMY');
        } else {
          this.possession = 'ENEMY';
          this.zone = 1;
          this.syncMatchupForZone();
          this.resultHeadline = `SAVED BY GK ${enemyGK.name.toUpperCase()}!`;
          this.resultColor = '#ef476f';
          this.resultBody = `${p.name} fires ${moveTitle} (${Math.round(shotPow)}).${blockNote} GK ${enemyGK.name} saves (${Math.round(gkPow)}) and launches a counter!`;
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

        if (this.zone === 1) {
          this.activePlayerIdx = (this.activePlayerIdx === 2) ? 3 : 2;
        } else if (this.zone === 2) {
          this.activePlayerIdx = (baseType === 'PASS' && oldZone === 2) ? (this.activePlayerIdx === 4 ? 3 : 4) : 4;
        }
        this.syncMatchupForZone();

        const nextZoneName = this.zone === 1 ? 'Midfield' : 'the Attack Zone';
        this.resultHeadline = `BREAKTHROUGH TO ${this.zone === 1 ? 'MIDFIELD' : 'ATTACK'}!`;
        this.resultColor = '#06d6a0';
        this.resultBody = `${p.name}'s ${actionTitle} (${atkRoll}) beat ${e.name}'s ${enemyCmd.toLowerCase()} (${defRoll})! ${tacNote || `Ball advances to ${nextZoneName}!`}`;
      } else {
        this.rhythmBonus = 0;
        this.possession = 'ENEMY';
        this.syncMatchupForZone();
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
      const staPenaltyP = p.sta < 15 ? 0.78 : 1.0;
      const staPenaltyE = e.sta < 15 ? 0.78 : 1.0;

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
            this.syncMatchupForZone();
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
        this.syncMatchupForZone();
        this.resultHeadline = `BALL WON BY ${p.name.toUpperCase()}!`;
        this.resultColor = '#06d6a0';
        this.resultBody = `${p.name}'s ${defMoveName} (${defRoll}) beat ${e.name}'s ${enemyAtkCmd.toLowerCase()} (${atkRoll})! ${tacNote || 'Time to counter-attack!'}`;
      } else {
        this.zone = Math.max(0, this.zone - 1);
        this.syncMatchupForZone();
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

      let saveMult = 1.0;
      let moveName = 'Catch Hold';
      let clearsToMid = false;

      if (gkCmd === 'GK_PUNCH') {
        saveMult = 1.16;
        moveName = 'Punch Clear';
        clearsToMid = true;
        gk.sta = Math.max(0, gk.sta - 5);
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
        }
      } else if (gkCmd === 'GK_DIVE') {
        saveMult = 1.05;
        moveName = 'Reflex Dive';
        gk.sta = Math.min(gk.maxSta, gk.sta + 5);
      } else {
        gk.sta = Math.max(0, gk.sta - 4);
      }

      const aff = SR.getAffinityAdvantage(gk.affinity, shooter.affinity);
      const staMod = gk.sta < 15 ? 0.8 : 1.0;
      const saveRoll = Math.round((gk.gk * 1.15 + gk.tac * 0.2) * aff.mult * staMod * saveMult * (0.92 + Math.random() * 0.2));

      if (saveRoll >= shotPow) {
        this.possession = 'PLAYER';
        this.zone = clearsToMid ? 1 : 0;
        this.activePlayerIdx = clearsToMid ? 2 : 1;
        this.syncMatchupForZone();
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

    resetAfterGoal: function (nextPossession) {
      this.zone = 1;
      this.possession = nextPossession;
      this.activePlayerIdx = 2;
      this.activeEnemyIdx = 2;
      this.rhythmBonus = 0;

      if (this.playerScore >= this.goalsToWin || this.enemyScore >= this.goalsToWin) {
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

      this.turn++;
      if (this.turn > this.maxTurns) {
        if (this.playerScore === this.enemyScore) {
          this.resultHeadline = 'SUDDEN DEATH OVERTIME!';
          this.resultColor = '#ffd166';
          this.resultBody = `Score tied ${this.playerScore}-${this.enemyScore} at full time! Next goal wins the match!`;
          this.subState = 'INTRO';
          this.cursor = 0;
          return;
        } else {
          this.subState = 'MATCH_OVER';
          return;
        }
      }

      this.syncMatchupForZone();
      this.subState = 'COMMAND';
      this.cursor = 0;
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

      // Right Turn & Goal Target
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 9px monospace';
      const rightInfo = this.turn > this.maxTurns
        ? 'OVERTIME'
        : `T${this.turn}/${this.maxTurns} • ${this.goalsToWin}G`;
      ctx.fillText(rightInfo, 246, 14);

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

      // Draw Pitch Lines & 3 Zone Columns (x: 16..304, y: 74..144)
      const px = 16, py = 74, pw = 288, ph = 68;
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
      ctx.arc(px + 144, py + 34, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Highlight the Active Zone on the Pitch
      const activeZ = this.subState === 'GK_DEFEND' ? 0 : this.zone;
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
      ctx.fillRect(px - 6, py + 20, 6, 28);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(px - 6, py + 20, 6, 28);

      ctx.fillStyle = '#ef476f';
      ctx.fillRect(px + pw, py + 20, 6, 28);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(px + pw, py + 20, 6, 28);

      // Draw 5v5 Squad Sprites on the Pitch!
      const playerUnit = this.subState === 'GK_DEFEND' ? this.getPlayerSquad()[0] : this.getPlayer();
      const enemyUnit = this.subState === 'GK_DEFEND' ? (this.incomingShooter || this.getEnemy()) : this.getEnemy();
      const pSquad = this.getPlayerSquad();
      const eSquad = this.enemyTeam.players;

      // Base formation coords on the pitch
      const pCoords = [
        { x: px + 4,   y: py + 26 }, // 0: GK
        { x: px + 36,  y: py + 26 }, // 1: DEF
        { x: px + 114, y: py + 14 }, // 2: MID1
        { x: px + 114, y: py + 40 }, // 3: MID2
        { x: px + 206, y: py + 26 }  // 4: FWD
      ];
      const eCoords = [
        { x: px + pw - 20, y: py + 26 }, // 0: Enemy GK
        { x: px + 246,     y: py + 26 }, // 1: Enemy DEF
        { x: px + 158,     y: py + 14 }, // 2: Enemy MID1
        { x: px + 158,     y: py + 40 }, // 3: Enemy MID2
        { x: px + 64,      y: py + 26 }  // 4: Enemy FWD
      ];

      // Snap active duelists face-to-face inside the active zone!
      const duelCenterX = px + activeZ * zw + 48;
      const activePIdx = this.subState === 'GK_DEFEND' ? 0 : this.activePlayerIdx;
      const activeEIdx = this.subState === 'GK_DEFEND' ? 4 : this.activeEnemyIdx;
      pCoords[activePIdx] = { x: duelCenterX - 22, y: py + 26 };
      eCoords[activeEIdx] = { x: duelCenterX + 6,  y: py + 26 };

      // Draw Spotlight Rings under the two active duelists
      ctx.strokeStyle = '#ffd166';
      ctx.strokeRect(pCoords[activePIdx].x + 1, pCoords[activePIdx].y + 12, 14, 5);
      ctx.strokeRect(eCoords[activeEIdx].x + 1, eCoords[activeEIdx].y + 12, 14, 5);

      for (let i = 0; i < 5; i++) {
        const isActP = (i === activePIdx);
        SR.drawCharacter(ctx, pCoords[i].x, pCoords[i].y, {
          skin: pSquad[i].skin,
          hair: pSquad[i].hair,
          kitPrimary: '#3a86ff',
          kitSecondary: '#ffffff',
          moving: isActP,
          hasBall: isActP && this.possession === 'PLAYER' && this.subState !== 'GK_DEFEND'
        }, tick);

        const isActE = (i === activeEIdx);
        SR.drawCharacter(ctx, eCoords[i].x, eCoords[i].y, {
          skin: eSquad[i].skin,
          hair: eSquad[i].hair,
          kitPrimary: this.enemyTeam.kitPrimary || '#ef476f',
          kitSecondary: this.enemyTeam.kitSecondary || '#111111',
          moving: isActE,
          hasBall: isActE && (this.possession === 'ENEMY' || this.subState === 'GK_DEFEND')
        }, tick);
      }

      // 3. POKÉMON GBA FLOATING HUD PLATES (Clean Name + Role + Style + Stamina Bar!)
      // Top-Left: Opponent Active Player Plate
      this.drawHudPlate(ctx, 8, 26, enemyUnit, false);

      // Top-Right: Clear, High-Contrast Style Matchup Pill!
      this.drawStyleMatchupBadge(ctx, 160, 26, playerUnit, enemyUnit);

      // Bottom-Right: Your Active Player Plate
      this.drawHudPlate(ctx, 164, 148, playerUnit, true);

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

    drawHudPlate: function (ctx, x, y, unit, isPlayer) {
      const w = 148, h = 42;
      ctx.fillStyle = 'rgba(13, 17, 26, 0.92)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = isPlayer ? '#3a86ff' : '#ef476f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.lineWidth = 1;

      // Row 1: Player Name & Role
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${unit.name.slice(0, 12)}`, x + 6, y + 13);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`[${unit.role}]`, x + 112, y + 13);

      // Row 2: Full Style Name Badge + Stamina Bar
      const aff = SR.AFFINITIES[unit.affinity] || SR.AFFINITIES.SPEED;
      ctx.fillStyle = aff.color;
      ctx.fillRect(x + 6, y + 19, 40, 12);
      ctx.fillStyle = '#090c12';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(aff.name.toUpperCase(), x + 9, y + 28);

      // Stamina Bar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 52, y + 20, 88, 10);
      const pct = Math.max(0, Math.min(1, unit.sta / unit.maxSta));
      ctx.fillStyle = pct > 0.35 ? '#06d6a0' : '#ef476f';
      ctx.fillRect(x + 52, y + 20, Math.round(88 * pct), 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText(`STA ${unit.sta}/${unit.maxSta}`, x + 62, y + 28);

      // Pass Rhythm indicator on Player Plate
      if (isPlayer && this.rhythmBonus > 0) {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(`★ PASS BOOST +${Math.round(this.rhythmBonus * 100)}%`, x + 6, y + 39);
      }
    },

    drawStyleMatchupBadge: function (ctx, x, y, pUnit, eUnit) {
      const pAff = SR.AFFINITIES[pUnit.affinity] || SR.AFFINITIES.SPEED;
      const eAff = SR.AFFINITIES[eUnit.affinity] || SR.AFFINITIES.SPEED;
      const adv = SR.getAffinityAdvantage(pUnit.affinity, eUnit.affinity);

      ctx.fillStyle = 'rgba(13, 17, 26, 0.92)';
      ctx.fillRect(x, y, 152, 30);

      if (adv.mult > 1) {
        ctx.strokeStyle = '#06d6a0';
        ctx.strokeRect(x + 0.5, y + 0.5, 151, 29);
        ctx.fillStyle = '#06d6a0';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`STYLE ADVANTAGE (+22%)`, x + 8, y + 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Your ${pAff.name} beats ${eAff.name}`, x + 8, y + 24);
      } else if (adv.mult < 1) {
        ctx.strokeStyle = '#ffca3a';
        ctx.strokeRect(x + 0.5, y + 0.5, 151, 29);
        ctx.fillStyle = '#ffca3a';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`STYLE DISADVANTAGE (-15%)`, x + 8, y + 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Foe ${eAff.name} beats ${pAff.name}`, x + 8, y + 24);
      } else {
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(x + 0.5, y + 0.5, 151, 29);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`STYLE MATCHUP: EVEN`, x + 8, y + 13);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${pAff.name} vs ${eAff.name}`, x + 8, y + 24);
      }
    },

    renderTextBoxFrame: function (ctx) {
      ctx.fillStyle = '#111624';
      ctx.fillRect(6, 201, 308, 81);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(7, 202, 306, 79);
      ctx.lineWidth = 1;

      const title = this.subState === 'MATCH_OVER'
        ? (this.playerScore > this.enemyScore
          ? `VICTORY!! (${this.playerScore} - ${this.enemyScore})`
          : `FULL TIME — DEFEAT (${this.playerScore} - ${this.enemyScore})`)
        : this.resultHeadline;

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

      // Move Type Header
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`TYPE: ${active.moveType}`, 205, 215);

      // Explicit Stamina Cost Line!
      const canAfford = active.unitSta >= active.cost;
      ctx.fillStyle = canAfford ? '#06d6a0' : '#ef476f';
      ctx.font = 'bold 8px monospace';
      const costText = active.cost > 0
        ? (canAfford ? `COST: ${active.cost} STA` : `NEED ${active.cost} STA!`)
        : 'COST: FREE';
      ctx.fillText(costText, 205, 229);

      // Divider line
      ctx.fillStyle = '#334155';
      ctx.fillRect(205, 234, 103, 1);

      // Wrapped Tactical Tip
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '8px monospace';
      this.drawWrappedText(ctx, active.tip, 205, 246, 104, 11, 3);
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
