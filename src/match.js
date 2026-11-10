window.SR = window.SR || {};

(function (SR) {
  // Match Engine State
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
    // subState: 'COMMAND' | 'GK_DEFEND' | 'ANIM_RESULT' | 'MATCH_OVER'
    subState: 'COMMAND',

    // Active indices in the 5-man lineup [0:GK, 1:DEF, 2:MID1, 3:MID2, 4:FWD]
    activePlayerIdx: 2,
    activeEnemyIdx: 2,
    rhythmBonus: 0, // +0.15 after a successful pass
    incomingShotPower: 0,
    incomingShooter: null,

    cursor: 0, // 0..3 in the 2x2 command box
    logLines: [],
    bannerText: '',
    bannerColor: '#ffd166',
    flashTimer: 0,
    flashColor: '#ffffff',

    start: function (game, enemyTeam, opts, onComplete) {
      this.game = game;
      this.enemyTeam = enemyTeam;
      this.isBoss = !!(opts && opts.isBoss);
      this.onComplete = onComplete;
      this.active = true;

      this.playerScore = 0;
      this.enemyScore = 0;
      this.turn = 1;
      this.maxTurns = this.isBoss ? 14 : 10;
      this.goalsToWin = this.isBoss ? 3 : 2;

      this.zone = 1; // Kickoff in Midfield
      this.possession = 'PLAYER';
      this.subState = 'COMMAND';
      this.activePlayerIdx = 2; // Captain / MID1 starts with the ball
      this.activeEnemyIdx = 2;
      this.rhythmBonus = 0;
      this.cursor = 0;
      this.bannerText = 'KICK OFF! MIDFIELD PHASE';
      this.bannerColor = '#ffd166';
      this.flashTimer = 0;

      const modeDesc = this.isBoss
        ? `BOSS MATCH: First to ${this.goalsToWin} Goals (or Lead at ${this.maxTurns} Turns)`
        : `STREET MATCH: First to ${this.goalsToWin} Goals (or ${this.maxTurns} Turns)`;
      this.logLines = [
        `VS ${enemyTeam.name}! ${modeDesc}`,
        `${this.getPlayer().name} takes the kickoff in MIDFIELD!`
      ];
    },

    getPlayerSquad: function () {
      return this.game.squad.slice(0, 5); // Active 5 starters
    },

    getPlayer: function () {
      const sq = this.getPlayerSquad();
      return sq[this.activePlayerIdx] || sq[0];
    },

    getEnemy: function () {
      const eq = this.enemyTeam.players;
      return eq[this.activeEnemyIdx] || eq[0];
    },

    // Assign default zone matchups when entering a zone
    syncMatchupForZone: function () {
      if (this.zone === 0) {
        // Player Defense vs Enemy Attack
        if (this.possession === 'ENEMY') {
          this.activePlayerIdx = 1; // Player DEF
          this.activeEnemyIdx = 4;  // Enemy FWD
        } else {
          // Player recovering ball in own defense
          this.activePlayerIdx = 1;
          this.activeEnemyIdx = 4;
        }
      } else if (this.zone === 1) {
        // Midfield
        if (this.activePlayerIdx !== 2 && this.activePlayerIdx !== 3) {
          this.activePlayerIdx = 2;
        }
        this.activeEnemyIdx = (this.turn % 2 === 0) ? 3 : 2;
      } else if (this.zone === 2) {
        // Player Attack vs Enemy Defense
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
      // Fallback to first skill
      return SR.SKILLS[unit.skills[0]] || null;
    },

    getCommands: function () {
      const p = this.getPlayer();
      if (this.subState === 'GK_DEFEND') {
        const gk = this.getPlayerSquad()[0];
        const sk = this.getAvailableSkill(gk, false, true);
        const skLabel = sk ? `${sk.name} (${sk.cost}MP)` : 'Aura Catch (15MP)';
        return [
          { id: 'GK_CATCH', label: '1. CATCH HOLD', desc: 'Catch & keep ball in Defense' },
          { id: 'GK_PUNCH', label: '2. PUNCH CLEAR', desc: '+15% Save Power, clears to Midfield' },
          { id: 'GK_SKILL', label: `3. ${skLabel}`, desc: sk ? sk.desc : 'Special GK Save!' },
          { id: 'GK_DIVE',  label: '4. REFLEX DIVE', desc: 'Balanced dive +5 Stamina recovery' }
        ];
      }

      if (this.possession === 'PLAYER') {
        const sk = this.getAvailableSkill(p, true, false);
        const shootLabel = this.zone === 2 ? '3. SHOOT GOAL!' : (this.zone === 1 ? '3. LONG SHOT' : '3. CLEAR UPFIELD');
        const skLabel = sk ? `4. ${sk.name} (${sk.cost})` : '4. SPECIAL MOVE';
        return [
          { id: 'DRIBBLE', label: '1. DRIBBLE', desc: 'Advance solo (Beats INTERCEPT +25%)' },
          { id: 'PASS',    label: '2. PASS',    desc: 'Pass ahead (Beats TACKLE +25%, +Rhythm)' },
          { id: 'SHOOT',   label: shootLabel,   desc: this.zone === 2 ? 'Strike at Goal!' : (this.zone === 1 ? 'Long distance shot' : 'Safe clear to Midfield') },
          { id: 'SKILL',   label: skLabel,      desc: sk ? sk.desc : 'Signature offensive move' }
        ];
      } else {
        const sk = this.getAvailableSkill(p, false, false);
        const skLabel = sk ? `4. ${sk.name} (${sk.cost})` : '4. SPECIAL DEF';
        return [
          { id: 'TACKLE',    label: '1. TACKLE',    desc: 'Steal ball (Beats DRIBBLE +25%)' },
          { id: 'INTERCEPT', label: '2. INTERCEPT', desc: 'Cut pass (Beats PASS +25%)' },
          { id: 'BLOCK',     label: '3. BLOCK WALL', desc: 'Cut enemy Shot power by 35%' },
          { id: 'SKILL',     label: skLabel,         desc: sk ? sk.desc : 'Signature defensive move' }
        ];
      }
    },

    executeCommand: function (cmdIndex) {
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

    // PLAYER HAS THE BALL (OFFENSE)
    resolvePlayerOffense: function (cmdId) {
      const p = this.getPlayer();
      const e = this.getEnemy();

      // Special case: In Zone 0 (Defense), "SHOOT" is a safe Clearance to Midfield
      if (cmdId === 'SHOOT' && this.zone === 0) {
        p.sta = Math.max(0, p.sta - 4);
        this.zone = 1;
        this.activePlayerIdx = 2;
        this.syncMatchupForZone();
        this.bannerText = 'LONG CLEARANCE TO MIDFIELD!';
        this.bannerColor = '#4cc9f0';
        this.logLines = [
          `${p.name} boots a high clearance out of danger!`,
          `${this.getPlayer().name} controls the ball in MIDFIELD!`
        ];
        this.subState = 'ANIM_RESULT';
        return;
      }

      // Check Special Skill
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
          // Not enough stamina -> fallback to Dribble/Shoot
          baseType = this.zone === 2 ? 'SHOOT' : 'DRIBBLE';
        }
      } else {
        p.sta = Math.max(0, p.sta - 5);
      }

      // Enemy AI picks a defensive reaction: TACKLE, INTERCEPT, or BLOCK
      const aiChoices = this.zone === 2 ? ['TACKLE', 'INTERCEPT', 'BLOCK'] : ['TACKLE', 'INTERCEPT'];
      const enemyCmd = aiChoices[Math.floor(Math.random() * aiChoices.length)];
      e.sta = Math.max(0, e.sta - 4);

      const aff = SR.getAffinityAdvantage(p.affinity, e.affinity);
      const staPenaltyP = p.sta < 15 ? 0.78 : 1.0;
      const staPenaltyE = e.sta < 15 ? 0.78 : 1.0;
      const skillMult = usedSkill ? usedSkill.mult : 1.0;
      const rhythmMult = 1.0 + this.rhythmBonus;

      // If command is SHOOT -> test vs Block & Goalkeeper!
      if (baseType === 'SHOOT') {
        const distMult = this.zone === 2 ? 1.15 : 0.78; // Attack zone vs Long Shot
        let shotPow = p.sho * aff.mult * staPenaltyP * skillMult * rhythmMult * distMult;
        shotPow *= (0.92 + Math.random() * 0.18);

        let blockNote = '';
        if (enemyCmd === 'BLOCK') {
          shotPow *= 0.70;
          blockNote = ` (${e.name} BLOCKED -30%!)`;
        }

        const enemyGK = this.enemyTeam.players[0];
        const gkAff = SR.getAffinityAdvantage(p.affinity, enemyGK.affinity);
        const gkPow = (enemyGK.gk * 1.12 + enemyGK.int * 0.25) * (enemyGK.sta < 15 ? 0.8 : 1.0) * (0.9 + Math.random() * 0.2);
        enemyGK.sta = Math.max(0, enemyGK.sta - 6);
        this.rhythmBonus = 0;

        const moveTitle = usedSkill ? usedSkill.name.toUpperCase() : 'SHOT';
        if (shotPow >= gkPow) {
          // GOAL SCORED!
          this.playerScore++;
          this.flashTimer = 24;
          this.flashColor = '#ffd166';
          this.bannerText = `GOAL!! ${p.name.toUpperCase()} SCORES! (${Math.round(shotPow)} vs GK ${Math.round(gkPow)})`;
          this.bannerColor = '#06d6a0';
          this.logLines = [
            `${p.name} unleashes ${moveTitle}! Power ${Math.round(shotPow)}${blockNote}`,
            `Past GK ${enemyGK.name} (${Math.round(gkPow)}) — GOOOAAAL!! (${this.playerScore}-${this.enemyScore})`
          ];
          this.resetAfterGoal('ENEMY');
        } else {
          // SAVED BY ENEMY GK!
          this.possession = 'ENEMY';
          this.zone = 1; // Enemy GK launches counter to Midfield
          this.syncMatchupForZone();
          this.bannerText = `SAVED BY GK ${enemyGK.name.toUpperCase()}! (${Math.round(gkPow)} vs ${Math.round(shotPow)})`;
          this.bannerColor = '#ef476f';
          this.logLines = [
            `${p.name} fires ${moveTitle} (${Math.round(shotPow)})${blockNote}`,
            `GK ${enemyGK.name} makes a diving save (${Math.round(gkPow)}) and launches a counter!`
          ];
          this.subState = 'ANIM_RESULT';
        }
        return;
      }

      // Otherwise DRIBBLE or PASS duel!
      const atkStat = baseType === 'PASS' ? p.pas : p.dri;
      const defStat = enemyCmd === 'INTERCEPT' ? e.int : (enemyCmd === 'TACKLE' ? e.tac : (e.tac + e.int) * 0.5);

      // Tactical Read Triangle:
      // PASS beats TACKLE (+25%), DRIBBLE beats INTERCEPT (+25%), TACKLE beats DRIBBLE (+25%), INTERCEPT beats PASS (+25%)
      let tacMultP = 1.0;
      let tacMultE = 1.0;
      let tacNote = '';
      if (baseType === 'PASS' && enemyCmd === 'TACKLE') {
        tacMultP = 1.25;
        tacNote = 'TACTICAL READ! Pass beats Tackle (+25%)';
      } else if (baseType === 'DRIBBLE' && enemyCmd === 'INTERCEPT') {
        tacMultP = 1.25;
        tacNote = 'TACTICAL READ! Dribble beats Intercept (+25%)';
      } else if (baseType === 'DRIBBLE' && enemyCmd === 'TACKLE') {
        tacMultE = 1.22;
        tacNote = `COUNTERED! ${e.name}'s Tackle reads Dribble!`;
      } else if (baseType === 'PASS' && enemyCmd === 'INTERCEPT') {
        tacMultE = 1.22;
        tacNote = `COUNTERED! ${e.name}'s Intercept reads Pass!`;
      }

      const atkRoll = Math.round(atkStat * aff.mult * staPenaltyP * skillMult * rhythmMult * tacMultP * (0.9 + Math.random() * 0.2));
      const defRoll = Math.round(defStat * staPenaltyE * tacMultE * (0.9 + Math.random() * 0.2));

      const actionTitle = usedSkill ? usedSkill.name : baseType;

      if (atkRoll >= defRoll) {
        // PLAYER WINS THE PHASE DUEL!
        this.rhythmBonus = (baseType === 'PASS') ? 0.15 : 0.05;
        const oldZone = this.zone;
        this.zone = Math.min(2, this.zone + 1);

        // Pick receiver if PASS or advancing zone
        if (this.zone === 1) {
          this.activePlayerIdx = (this.activePlayerIdx === 2) ? 3 : 2;
        } else if (this.zone === 2) {
          this.activePlayerIdx = (baseType === 'PASS' && oldZone === 2) ? (this.activePlayerIdx === 4 ? 3 : 4) : 4;
        }
        this.syncMatchupForZone();

        const nextZoneName = this.zone === 1 ? 'MIDFIELD' : 'ATTACK ZONE';
        this.bannerText = `DUEL WON! (${atkRoll} vs ${defRoll}) -> ${nextZoneName}`;
        this.bannerColor = '#06d6a0';
        this.logLines = [
          `${p.name} used ${actionTitle} (${atkRoll}) vs ${e.name}'s ${enemyCmd} (${defRoll})!`,
          tacNote || (aff.tag ? `Style: ${aff.tag}` : `Clean breakthrough into ${nextZoneName}!`)
        ];
      } else {
        // ENEMY WINS TURNOVER!
        this.rhythmBonus = 0;
        this.possession = 'ENEMY';
        this.syncMatchupForZone();
        this.bannerText = `TURNOVER! ${e.name} (${defRoll} vs ${atkRoll})`;
        this.bannerColor = '#ef476f';
        this.logLines = [
          `${p.name}'s ${actionTitle} (${atkRoll}) stopped by ${e.name}'s ${enemyCmd} (${defRoll})!`,
          tacNote || `${this.enemyTeam.name} steals possession!`
        ];
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
        }
      } else {
        p.sta = Math.max(0, p.sta - 5);
      }

      // Enemy AI chooses Offense: in Zone 0 (Player Defense / Enemy Attack), Enemy frequently SHOOTS!
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

      // Case 1: Enemy attempts a SHOT on Player's Goal!
      if (enemyAtkCmd === 'SHOOT') {
        let shotPow = e.sho * staPenaltyE * (0.92 + Math.random() * 0.2);
        let blockMsg = '';

        // If player picked BLOCK (or Aegis Wall), reduce shot power! Furthermore, high block can outright deflect it!
        if (defType === 'BLOCK') {
          const cut = usedSkill ? 0.45 : 0.65;
          shotPow *= cut;
          blockMsg = `${p.name} ${usedSkill ? usedSkill.name : 'BLOCKS'} (-${Math.round((1 - cut) * 100)}% Shot Power)!`;
        } else if (defType === 'TACKLE') {
          // Small chance to slide-block before shot
          const tacCheck = p.tac * aff.mult * skillMult * staPenaltyP;
          if (tacCheck > e.dri * 1.25) {
            this.possession = 'PLAYER';
            this.syncMatchupForZone();
            this.bannerText = `LAST-DITCH TACKLE BY ${p.name.toUpperCase()}!`;
            this.bannerColor = '#06d6a0';
            this.logLines = [
              `${e.name} wound up to shoot, but ${p.name} stripped the ball clean!`,
              `Possession recovered in DEFENSE!`
            ];
            this.subState = 'ANIM_RESULT';
            return;
          }
        }

        // Transition to Interactive Goalkeeper Showdown!
        this.incomingShotPower = Math.max(6, Math.round(shotPow));
        this.incomingShooter = e;
        this.subState = 'GK_DEFEND';
        this.cursor = 0;
        const gk = this.getPlayerSquad()[0];
        this.bannerText = `DANGER! ${e.name.toUpperCase()} SHOOTS (POW ${this.incomingShotPower})!`;
        this.bannerColor = '#ffca3a';
        this.logLines = [
          blockMsg || `${e.name} blasts a shot toward goal (Power ${this.incomingShotPower})!`,
          `KEEPER SHOWDOWN! Choose how GK ${gk.name} reacts!`
        ];
        return;
      }

      // Case 2: Enemy attempts DRIBBLE or PASS vs Player's TACKLE / INTERCEPT / BLOCK
      const defStat = defType === 'INTERCEPT' ? p.int : (defType === 'TACKLE' ? p.tac : (p.tac + p.int) * 0.55);
      const atkStat = enemyAtkCmd === 'PASS' ? e.pas : e.dri;

      let tacMultP = 1.0;
      let tacMultE = 1.0;
      let tacNote = '';
      if (defType === 'TACKLE' && enemyAtkCmd === 'DRIBBLE') {
        tacMultP = 1.25;
        tacNote = 'GREAT READ! Tackle stops Dribble (+25%)!';
      } else if (defType === 'INTERCEPT' && enemyAtkCmd === 'PASS') {
        tacMultP = 1.25;
        tacNote = 'GREAT READ! Intercept cuts Pass (+25%)!';
      } else if (defType === 'TACKLE' && enemyAtkCmd === 'PASS') {
        tacMultE = 1.20;
        tacNote = `${e.name} passed around your Tackle!`;
      } else if (defType === 'INTERCEPT' && enemyAtkCmd === 'DRIBBLE') {
        tacMultE = 1.20;
        tacNote = `${e.name} dribbled through your Intercept lane!`;
      }

      const defRoll = Math.round(defStat * aff.mult * staPenaltyP * skillMult * tacMultP * (0.9 + Math.random() * 0.2));
      const atkRoll = Math.round(atkStat * staPenaltyE * tacMultE * (0.9 + Math.random() * 0.2));
      const defMoveName = usedSkill ? usedSkill.name : defType;

      if (defRoll >= atkRoll) {
        // PLAYER STEALS THE BALL!
        this.possession = 'PLAYER';
        this.rhythmBonus = 0.10; // Counter-attack momentum!
        this.syncMatchupForZone();
        this.bannerText = `BALL RECOVERED! (${defRoll} vs ${atkRoll})`;
        this.bannerColor = '#06d6a0';
        this.logLines = [
          `${p.name}'s ${defMoveName} (${defRoll}) beats ${e.name}'s ${enemyAtkCmd} (${atkRoll})!`,
          tacNote || `You won possession! Time to counter-attack!`
        ];
      } else {
        // ENEMY ADVANCES CLOSER TO PLAYER GOAL!
        this.zone = Math.max(0, this.zone - 1);
        this.syncMatchupForZone();
        const zoneDanger = this.zone === 0 ? 'YOUR PENALTY BOX (DEFENSE)!' : 'MIDFIELD!';
        this.bannerText = `ENEMY ADVANCES TO ${zoneDanger} (${atkRoll} vs ${defRoll})`;
        this.bannerColor = '#ef476f';
        this.logLines = [
          `${e.name}'s ${enemyAtkCmd} (${atkRoll}) slips past ${p.name}'s ${defMoveName} (${defRoll})!`,
          tacNote || `${this.enemyTeam.name} pushes into ${zoneDanger}`
        ];
      }
      this.subState = 'ANIM_RESULT';
    },

    // INTERACTIVE GOALKEEPER SAVE SHOWDOWN
    resolvePlayerGoalkeeperSave: function (gkCmd) {
      const gk = this.getPlayerSquad()[0];
      const shooter = this.incomingShooter || this.getEnemy();
      const shotPow = this.incomingShotPower;

      let saveMult = 1.0;
      let moveName = 'Diving Catch';
      let clearsToMid = false;

      if (gkCmd === 'GK_PUNCH') {
        saveMult = 1.16;
        moveName = 'Fist Punch Clear';
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
          moveName = 'Desperation Catch';
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
        // SAVED BY PLAYER GK!
        this.possession = 'PLAYER';
        this.zone = clearsToMid ? 1 : 0;
        this.activePlayerIdx = clearsToMid ? 2 : 1;
        this.syncMatchupForZone();
        this.bannerText = `WHAT A SAVE BY ${gk.name.toUpperCase()}! (${saveRoll} vs ${shotPow})`;
        this.bannerColor = '#06d6a0';
        this.logLines = [
          `GK ${gk.name} uses ${moveName} (Save ${saveRoll} vs Shot ${shotPow})!`,
          clearsToMid ? `Ball launched straight to MIDFIELD for a counter!` : `${gk.name} holds onto the ball in Defense!`
        ];
        this.subState = 'ANIM_RESULT';
      } else {
        // ENEMY SCORES!
        this.enemyScore++;
        this.flashTimer = 20;
        this.flashColor = '#ef476f';
        this.bannerText = `GOAL CONCEDED... (${shotPow} vs Save ${saveRoll})`;
        this.bannerColor = '#ef476f';
        this.logLines = [
          `${shooter.name}'s shot (${shotPow}) beats GK ${gk.name}'s ${moveName} (${saveRoll})...`,
          `${this.enemyTeam.name} scores! Score: YOU ${this.playerScore} - ${this.enemyScore} FOE`
        ];
        this.resetAfterGoal('PLAYER');
      }
    },

    resetAfterGoal: function (nextPossession) {
      this.zone = 1;
      this.possession = nextPossession;
      this.activePlayerIdx = 2;
      this.activeEnemyIdx = 2;
      this.rhythmBonus = 0;

      // Check instant win by goal target
      if (this.playerScore >= this.goalsToWin || this.enemyScore >= this.goalsToWin) {
        this.subState = 'MATCH_OVER';
      } else {
        this.subState = 'ANIM_RESULT';
      }
    },

    advanceAfterPause: function () {
      if (this.playerScore >= this.goalsToWin || this.enemyScore >= this.goalsToWin) {
        this.subState = 'MATCH_OVER';
        return;
      }

      this.turn++;
      if (this.turn > this.maxTurns) {
        // If tied at max turns, Sudden Death overtime!
        if (this.playerScore === this.enemyScore) {
          this.bannerText = 'OVERTIME! NEXT GOAL WINS!';
          this.bannerColor = '#ffd166';
          this.logLines = [
            `Full time tied ${this.playerScore}-${this.enemyScore}! Entering SUDDEN DEATH OVERTIME!`,
            `First team to score wins the match!`
          ];
          this.subState = 'COMMAND';
          this.cursor = 0;
          return;
        } else {
          this.subState = 'MATCH_OVER';
          return;
        }
      }

      this.syncMatchupForZone();
      const zName = this.zone === 0 ? 'DEFENSE PHASE' : (this.zone === 1 ? 'MIDFIELD PHASE' : 'ATTACK PHASE');
      const possTag = this.possession === 'PLAYER' ? 'YOUR BALL' : 'ENEMY BALL';
      this.bannerText = `TURN ${this.turn}/${this.maxTurns} — ${zName} (${possTag})`;
      this.bannerColor = this.possession === 'PLAYER' ? '#4cc9f0' : '#ffca3a';
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

    // RENDER THE 320x288 MATCH SCREEN
    render: function (ctx, tick) {
      // Background Pitch Turf
      ctx.fillStyle = '#1b4332';
      ctx.fillRect(0, 0, 320, 288);

      // Flash effect on Special Skill or Goal
      if (this.flashTimer > 0) {
        this.flashTimer--;
        if (this.flashTimer % 2 === 0) {
          ctx.fillStyle = this.flashColor;
          ctx.globalAlpha = 0.28;
          ctx.fillRect(0, 0, 320, 288);
          ctx.globalAlpha = 1.0;
        }
      }

      // 1. TOP SCOREBOARD BAR (y: 0..22)
      ctx.fillStyle = '#0d1017';
      ctx.fillRect(0, 0, 320, 22);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(0.5, 0.5, 319, 21);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#4cc9f0';
      ctx.fillText(`YOU ${this.playerScore}`, 8, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`-`, 46, 14);
      ctx.fillStyle = '#ef476f';
      ctx.fillText(`${this.enemyScore} FOE`, 56, 14);

      ctx.fillStyle = '#ffd166';
      const turnText = this.turn > this.maxTurns ? 'OVERTIME!' : `TURN ${this.turn}/${this.maxTurns}`;
      ctx.fillText(turnText, 122, 14);

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`1ST TO ${this.goalsToWin}G`, 252, 14);

      // 2. MINI PITCH 3-ZONE RADAR (y: 25..73)
      const px = 14, py = 25, pw = 292, ph = 46;
      const zw = Math.floor(pw / 3);

      // Draw the 3 zones: DEF (0), MID (1), ATK (2)
      const zoneColors = ['#1e3a2f', '#234f3b', '#1e3a2f'];
      const zoneLabels = ['DEFENSE', 'MIDFIELD', 'ATTACK'];
      for (let z = 0; z < 3; z++) {
        ctx.fillStyle = (this.zone === z) ? '#2d6a4f' : zoneColors[z];
        ctx.fillRect(px + z * zw, py, zw, ph);
        if (this.zone === z) {
          ctx.strokeStyle = '#ffd166';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + z * zw + 1, py + 1, zw - 2, ph - 2);
          ctx.lineWidth = 1;
        }
        ctx.fillStyle = (this.zone === z) ? '#ffd166' : 'rgba(255,255,255,0.45)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(zoneLabels[z], px + z * zw + 26, py + 10);
      }

      // Pitch lines on radar
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.strokeRect(px, py, pw, ph);
      ctx.beginPath();
      ctx.moveTo(px + zw, py); ctx.lineTo(px + zw, py + ph);
      ctx.moveTo(px + zw * 2, py); ctx.lineTo(px + zw * 2, py + ph);
      ctx.stroke();

      // Goals on left (Your Goal) and right (Enemy Goal)
      ctx.fillStyle = '#4cc9f0';
      ctx.fillRect(px - 4, py + 13, 4, 20);
      ctx.fillStyle = '#ef476f';
      ctx.fillRect(px + pw, py + 13, 4, 20);

      // Plot 5v5 dots on radar + ball
      const pDots = [
        { x: px + 10, y: py + 23 },             // GK
        { x: px + 52, y: py + 23 },             // DEF
        { x: px + zw + 35, y: py + 15 },        // MID1
        { x: px + zw + 55, y: py + 33 },        // MID2
        { x: px + zw * 2 + 45, y: py + 23 }     // FWD
      ];
      const eDots = [
        { x: px + pw - 10, y: py + 23 },        // Enemy GK
        { x: px + zw * 2 + 65, y: py + 23 },    // Enemy DEF
        { x: px + zw + 62, y: py + 15 },        // Enemy MID1
        { x: px + zw + 42, y: py + 33 },        // Enemy MID2
        { x: px + 68, y: py + 23 }              // Enemy FWD
      ];

      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#3a86ff';
        ctx.fillRect(pDots[i].x - 3, pDots[i].y - 3, 6, 6);
        ctx.fillStyle = this.enemyTeam.kitPrimary || '#ef476f';
        ctx.fillRect(eDots[i].x - 3, eDots[i].y - 3, 6, 6);
      }

      // Draw Ball on Radar
      const ballX = this.subState === 'GK_DEFEND'
        ? px + 14
        : (px + this.zone * zw + Math.floor(zw / 2));
      SR.drawBall(ctx, ballX - 3, py + 20);

      // 3. PHASE BANNER (y: 74..90)
      ctx.fillStyle = '#0d1017';
      ctx.fillRect(0, 74, 320, 16);
      ctx.fillStyle = this.bannerColor;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(this.bannerText.slice(0, 44), 8, 85);

      // 4. 1v1 CLASH ARENA (y: 92..172)
      ctx.fillStyle = '#255f42';
      ctx.fillRect(0, 92, 320, 80);
      // Decorative turf stripes
      ctx.fillStyle = '#1f5138';
      for (let sx = 0; sx < 320; sx += 32) {
        ctx.fillRect(sx, 92, 16, 80);
      }

      const leftUnit = this.subState === 'GK_DEFEND' ? this.getPlayerSquad()[0] : this.getPlayer();
      const rightUnit = this.subState === 'GK_DEFEND' ? (this.incomingShooter || this.getEnemy()) : this.getEnemy();

      // Left Card (Player Unit)
      this.drawUnitCard(ctx, 8, 96, leftUnit, true, this.possession === 'PLAYER' && this.subState !== 'GK_DEFEND', tick);
      // Right Card (Enemy Unit)
      this.drawUnitCard(ctx, 172, 96, rightUnit, false, this.possession === 'ENEMY' || this.subState === 'GK_DEFEND', tick);

      // VS & Affinity Indicator in Center
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('VS', 152, 132);

      const affAdv = SR.getAffinityAdvantage(leftUnit.affinity, rightUnit.affinity);
      if (affAdv.mult > 1) {
        ctx.fillStyle = '#06d6a0';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('ADV +22%', 139, 146);
      } else if (affAdv.mult < 1) {
        ctx.fillStyle = '#ef476f';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('WEAK -15%', 138, 146);
      }

      // 5. MATCH COMMENTARY LOG (y: 173..208)
      ctx.fillStyle = '#111622';
      ctx.fillRect(0, 173, 320, 35);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(0.5, 173.5, 319, 34);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px monospace';
      if (this.logLines[0]) ctx.fillText(this.logLines[0].slice(0, 50), 6, 186);
      ctx.fillStyle = '#ffd166';
      if (this.logLines[1]) ctx.fillText(this.logLines[1].slice(0, 50), 6, 200);

      // 6. BOTTOM COMMAND MENU / CONTINUE PROMPT (y: 209..288)
      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(0, 209, 320, 79);

      if (this.subState === 'ANIM_RESULT' || this.subState === 'MATCH_OVER') {
        ctx.strokeStyle = '#ffd166';
        ctx.strokeRect(8, 217, 304, 58);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 12px monospace';
        const msg = this.subState === 'MATCH_OVER'
          ? (this.playerScore > this.enemyScore ? 'VICTORY!! FULL TIME!' : 'DEFEAT... FULL TIME')
          : 'PHASE COMPLETE';
        ctx.fillText(msg, 20, 240);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText('Press [A / Z / Enter] or Tap to Continue ▶', 20, 260);
        return;
      }

      const cmds = this.getCommands();
      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = 6 + col * 156;
        const by = 212 + row * 28;
        const bw = 152;
        const bh = 25;
        const sel = (this.cursor === i);

        ctx.fillStyle = sel ? '#1e293b' : '#141a26';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = sel ? '#ffd166' : '#334155';
        ctx.lineWidth = sel ? 2 : 1;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.lineWidth = 1;

        ctx.fillStyle = sel ? '#ffd166' : '#f1f5f9';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(cmds[i].label.slice(0, 22), bx + 6, by + 16);
      }

      // Description of highlighted command
      const activeCmd = cmds[this.cursor] || cmds[0];
      ctx.fillStyle = '#4cc9f0';
      ctx.font = '9px monospace';
      ctx.fillText(activeCmd.desc.slice(0, 50), 8, 281);
    },

    drawUnitCard: function (ctx, x, y, unit, isPlayer, hasBall, tick) {
      ctx.fillStyle = 'rgba(13, 16, 23, 0.85)';
      ctx.fillRect(x, y, 140, 72);
      ctx.strokeStyle = isPlayer ? '#3a86ff' : '#ef476f';
      ctx.strokeRect(x + 0.5, y + 0.5, 139, 71);

      // Character Sprite
      SR.drawCharacter(ctx, x + 6, y + 10, {
        skin: unit.skin,
        hair: unit.hair,
        kitPrimary: isPlayer ? '#3a86ff' : (this.enemyTeam.kitPrimary || '#ef476f'),
        kitSecondary: isPlayer ? '#ffffff' : (this.enemyTeam.kitSecondary || '#111111'),
        moving: true,
        hasBall: hasBall
      }, tick);

      // Name & Role
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${unit.name.slice(0, 11)} [${unit.role}]`, x + 26, y + 14);

      // Affinity Badge
      const aff = SR.AFFINITIES[unit.affinity] || SR.AFFINITIES.SPEED;
      ctx.fillStyle = aff.color;
      ctx.fillRect(x + 26, y + 18, 28, 10);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(aff.icon, x + 31, y + 26);

      // Stamina Bar
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + 58, y + 19, 74, 8);
      const staPct = Math.max(0, Math.min(1, unit.sta / unit.maxSta));
      ctx.fillStyle = staPct > 0.35 ? '#06d6a0' : '#ef476f';
      ctx.fillRect(x + 58, y + 19, Math.round(74 * staPct), 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = '7px monospace';
      ctx.fillText(`STA ${unit.sta}/${unit.maxSta}`, x + 64, y + 26);

      // Key Stats Row
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px monospace';
      ctx.fillText(`DRI:${unit.dri} PAS:${unit.pas} SHO:${unit.sho}`, x + 6, y + 44);
      ctx.fillText(`TAC:${unit.tac} INT:${unit.int} GK:${unit.gk}`, x + 6, y + 56);

      // Rhythm Bonus Tag
      if (isPlayer && this.rhythmBonus > 0) {
        ctx.fillStyle = '#ffd166';
        ctx.fillText(`★ PASS RHYTHM +${Math.round(this.rhythmBonus * 100)}%`, x + 6, y + 67);
      }
    }
  };
})(window.SR);
