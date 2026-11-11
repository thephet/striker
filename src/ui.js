window.SR = window.SR || {};

(function (SR) {
  SR.UI = {
    mode: 'NONE', // 'NONE' | 'DIALOGUE' | 'SQUAD' | 'CLUB' | 'SHOP' | 'SCOUT_POST' | 'QUEST_HELP' | 'VICTORY_CUP'

    // Dialogue queue
    dialoguePages: [],
    dialogueSpeaker: '',
    dialogueCallback: null,

    // Squad & Bag Menu state
    squadTab: 0, // 0 = Squad Lineup, 1 = Bag Items
    cursor: 0,
    swapSourceIdx: -1,
    pendingGearItem: null,

    // Post-match scouting candidate
    scoutCandidate: null,
    matchRewardSummary: '',

    // Open RPG Dialogue Box
    showDialogue: function (speaker, pages, callback) {
      this.mode = 'DIALOGUE';
      this.dialogueSpeaker = speaker || '';
      this.dialoguePages = Array.isArray(pages) ? pages.slice() : [String(pages)];
      this.dialogueCallback = callback || null;
    },

    advanceDialogue: function () {
      this.dialoguePages.shift();
      if (this.dialoguePages.length === 0) {
        this.mode = 'NONE';
        const cb = this.dialogueCallback;
        this.dialogueCallback = null;
        if (cb) cb();
      }
    },

    openSquadMenu: function () {
      this.mode = 'SQUAD';
      this.squadTab = 0;
      this.cursor = 0;
      this.swapSourceIdx = -1;
      this.pendingGearItem = null;
    },

    openClubMenu: function (game) {
      // Heal all players on visiting Clubhouse!
      game.squad.forEach(p => { p.sta = p.maxSta; });
      this.mode = 'CLUB';
      this.cursor = 0;
    },

    openShopMenu: function () {
      this.mode = 'SHOP';
      this.cursor = 0;
    },

    openPostMatchScout: function (candidate, summaryText) {
      this.mode = 'SCOUT_POST';
      this.scoutCandidate = candidate;
      this.matchRewardSummary = summaryText;
      this.cursor = 0;
    },

    openQuestHelp: function () {
      this.mode = 'QUEST_HELP';
    },

    openTeamShowcase: function (callback) {
      this.mode = 'TEAM_SHOWCASE';
      this.showcaseCallback = callback || null;
    },

    handleInput: function (key, game) {
      if (this.mode === 'DIALOGUE') {
        if (key === 'A' || key === 'B' || key === 'START') {
          this.advanceDialogue();
        }
        return true;
      }

      if (this.mode === 'TEAM_SHOWCASE') {
        if (key === 'A' || key === 'START') {
          this.mode = 'NONE';
          const cb = this.showcaseCallback;
          this.showcaseCallback = null;
          if (cb) cb();
        }
        return true;
      }

      if (this.mode === 'QUEST_HELP') {
        if (key === 'A' || key === 'B' || key === 'SELECT' || key === 'START') {
          this.mode = 'NONE';
        }
        return true;
      }

      if (this.mode === 'VICTORY_CUP') {
        if (key === 'A' || key === 'START') {
          this.mode = 'NONE';
          game.startNewSeasonRun(true);
        }
        return true;
      }

      if (this.mode === 'SQUAD') {
        if (key === 'B' || key === 'START') {
          if (this.pendingGearItem) {
            this.pendingGearItem = null;
            this.squadTab = 1;
            return true;
          }
          if (this.swapSourceIdx !== -1) {
            this.swapSourceIdx = -1;
            return true;
          }
          this.mode = 'NONE';
          return true;
        }
        if (key === 'LEFT' || key === 'RIGHT') {
          if (!this.pendingGearItem) {
            this.squadTab = this.squadTab === 0 ? 1 : 0;
            this.cursor = 0;
            this.swapSourceIdx = -1;
          }
          return true;
        }
        const listLen = this.squadTab === 0 ? game.squad.length : game.bag.length;
        if (key === 'UP') {
          this.cursor = (this.cursor - 1 + Math.max(1, listLen)) % Math.max(1, listLen);
        } else if (key === 'DOWN') {
          this.cursor = (this.cursor + 1) % Math.max(1, listLen);
        } else if (key === 'A') {
          if (this.squadTab === 0) {
            // If applying a Gear item to a chosen player:
            if (this.pendingGearItem) {
              const target = game.squad[this.cursor];
              const itemDef = SR.ITEMS[this.pendingGearItem.id];
              if (target && itemDef) {
                target[itemDef.stat] += itemDef.boost;
                if (itemDef.stat2) target[itemDef.stat2] += itemDef.boost2;
                if (itemDef.stat2 === 'maxSta') target.sta += itemDef.boost2;
                game.removeBagItem(this.pendingGearItem.bagIndex);
                this.pendingGearItem = null;
                this.showDialogue('GEAR EQUIPPED!', [`Equipped ${itemDef.name} on ${target.name}! Stats permanently boosted!`]);
              }
              return true;
            }
            // Otherwise swap two players in lineup/bench
            if (this.swapSourceIdx === -1) {
              this.swapSourceIdx = this.cursor;
            } else {
              const a = this.swapSourceIdx;
              const b = this.cursor;
              if (a !== b) {
                const tmp = game.squad[a];
                game.squad[a] = game.squad[b];
                game.squad[b] = tmp;
              }
              this.swapSourceIdx = -1;
            }
          } else {
            // Bag Tab: Use selected item
            if (game.bag.length === 0) return true;
            const itemId = game.bag[this.cursor];
            const itemDef = SR.ITEMS[itemId];
            if (!itemDef) return true;
            if (itemDef.type === 'HEAL') {
              game.squad.forEach(p => { p.sta = Math.min(p.maxSta, p.sta + 40); });
              game.removeBagItem(this.cursor);
              this.cursor = Math.max(0, this.cursor - 1);
              this.showDialogue('PITCH SODA', ['All squad members recovered +40 Stamina!']);
            } else if (itemDef.type === 'GEAR') {
              // Switch to Squad tab to pick which player gets the gear
              this.pendingGearItem = { id: itemId, bagIndex: this.cursor };
              this.squadTab = 0;
              this.cursor = 0;
            } else if (itemDef.type === 'CONTRACT') {
              this.showDialogue('SCOUT CONTRACT', ['Scout Contracts are used automatically after winning a match or in the Clubhouse!']);
            }
          }
        }
        return true;
      }

      if (this.mode === 'CLUB') {
        if (key === 'B') {
          this.mode = 'NONE';
          return true;
        }
        const agents = game.freeAgents;
        const totalOpts = agents.length + 1; // last is Exit
        if (key === 'UP') this.cursor = (this.cursor - 1 + totalOpts) % totalOpts;
        if (key === 'DOWN') this.cursor = (this.cursor + 1) % totalOpts;
        if (key === 'A') {
          if (this.cursor >= agents.length) {
            this.mode = 'NONE';
            return true;
          }
          const picked = agents[this.cursor];
          if (game.contracts > 0) {
            game.contracts--;
            game.squad.push(picked);
            agents.splice(this.cursor, 1);
            this.cursor = 0;
            game.updateTopHud();
            this.showDialogue('NEW SIGNING!', [`Used 1 Scout Contract! ${picked.name} [${picked.role}] joined your squad!`]);
          } else if (game.cash >= picked.cost) {
            game.cash -= picked.cost;
            game.squad.push(picked);
            agents.splice(this.cursor, 1);
            this.cursor = 0;
            game.updateTopHud();
            this.showDialogue('NEW SIGNING!', [`Signed ${picked.name} [${picked.role}] for $${picked.cost}!`]);
          } else {
            this.showDialogue('CLUBHOUSE', [`You need $${picked.cost} or 1 Scout Contract to sign ${picked.name}.`]);
          }
        }
        return true;
      }

      if (this.mode === 'SHOP') {
        if (key === 'B') {
          this.mode = 'NONE';
          return true;
        }
        const shopKeys = Object.keys(SR.ITEMS);
        const totalOpts = shopKeys.length + 1;
        if (key === 'UP') this.cursor = (this.cursor - 1 + totalOpts) % totalOpts;
        if (key === 'DOWN') this.cursor = (this.cursor + 1) % totalOpts;
        if (key === 'A') {
          if (this.cursor >= shopKeys.length) {
            this.mode = 'NONE';
            return true;
          }
          const item = SR.ITEMS[shopKeys[this.cursor]];
          if (game.cash >= item.price) {
            game.cash -= item.price;
            if (item.id === 'SCOUT_CONTRACT') {
              game.contracts++;
            } else {
              game.bag.push(item.id);
            }
            game.updateTopHud();
            this.showDialogue('PRO KIT SHOP', [`Purchased ${item.name} for $${item.price}!`]);
          } else {
            this.showDialogue('PRO KIT SHOP', [`Not enough cash! You need $${item.price}.`]);
          }
        }
        return true;
      }

      if (this.mode === 'SCOUT_POST') {
        if (key === 'UP' || key === 'DOWN' || key === 'LEFT' || key === 'RIGHT') {
          this.cursor = this.cursor === 0 ? 1 : 0;
        } else if (key === 'B') {
          this.mode = 'NONE';
        } else if (key === 'A') {
          if (this.cursor === 1) {
            this.mode = 'NONE';
            return true;
          }
          // Recruit standout opponent!
          const cand = this.scoutCandidate;
          if (!cand) {
            this.mode = 'NONE';
            return true;
          }
          const cashCost = 65;
          if (game.contracts > 0) {
            game.contracts--;
            cand.sta = cand.maxSta;
            game.squad.push(cand);
            game.updateTopHud();
            this.showDialogue('PLAYER RECRUITED!', [
              `Used 1 Scout Contract! ${cand.name} (${cand.role} / ${cand.affinity}) joined your squad!`,
              `Open SQUAD (M) anytime to put ${cand.name} in your starting 5!`
            ]);
          } else if (game.cash >= cashCost) {
            game.cash -= cashCost;
            cand.sta = cand.maxSta;
            game.squad.push(cand);
            game.updateTopHud();
            this.showDialogue('PLAYER RECRUITED!', [
              `Paid $${cashCost} sign-on bonus! ${cand.name} (${cand.role}) joined your squad!`
            ]);
          } else {
            this.showDialogue('SCOUTING', [`Not enough Contracts or Cash ($${cashCost}) to sign ${cand.name}.`]);
          }
        }
        return true;
      }

      return false;
    },

    handleCanvasClick: function (cx, cy, game) {
      if (this.mode === 'DIALOGUE' || this.mode === 'TEAM_SHOWCASE' || this.mode === 'QUEST_HELP' || this.mode === 'VICTORY_CUP') {
        this.handleInput('A', game);
        return;
      }

      if (this.mode === 'SQUAD') {
        // Top Tabs: Squad (14..156, 14..34) | Bag (164..306, 14..34)
        if (cy >= 12 && cy <= 36) {
          if (cx >= 14 && cx <= 156 && this.squadTab !== 0) {
            this.handleInput('LEFT', game);
          } else if (cx >= 164 && cx <= 306 && this.squadTab !== 1) {
            this.handleInput('RIGHT', game);
          }
          return;
        }
        // Bottom Close Strip
        if (cy >= 256) {
          this.handleInput('B', game);
          return;
        }
        if (this.squadTab === 0) {
          const maxVisible = 7;
          const startIdx = Math.max(0, Math.min(this.cursor - 3, Math.max(0, game.squad.length - maxVisible)));
          const row = Math.floor((cy - 50) / 26);
          if (row >= 0 && row < Math.min(maxVisible, game.squad.length)) {
            const targetIdx = startIdx + row;
            this.cursor = targetIdx;
            this.handleInput('A', game);
          }
        } else {
          const row = Math.floor((cy - 52) / 28);
          if (row >= 0 && row < Math.min(7, game.bag.length)) {
            this.cursor = row;
            this.handleInput('A', game);
          }
        }
        return;
      }

      this.handleInput('A', game);
    },

    // Render active UI overlay on the 320x288 canvas
    render: function (ctx, game, tick) {
      if (this.mode === 'NONE') return;

      if (this.mode === 'DIALOGUE') {
        this.renderDialogueBox(ctx);
        return;
      }

      if (this.mode === 'TEAM_SHOWCASE') {
        this.renderTeamShowcase(ctx, game, tick);
        return;
      }

      // Full-screen modal backdrop
      ctx.fillStyle = 'rgba(10, 13, 20, 0.95)';
      ctx.fillRect(6, 6, 308, 276);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(7, 7, 306, 274);
      ctx.lineWidth = 1;

      if (this.mode === 'SQUAD') {
        this.renderSquadMenu(ctx, game, tick);
      } else if (this.mode === 'CLUB') {
        this.renderClubMenu(ctx, game, tick);
      } else if (this.mode === 'SHOP') {
        this.renderShopMenu(ctx, game);
      } else if (this.mode === 'SCOUT_POST') {
        this.renderPostMatchScout(ctx, game, tick);
      } else if (this.mode === 'QUEST_HELP') {
        this.renderQuestHelp(ctx, game);
      } else if (this.mode === 'VICTORY_CUP') {
        this.renderVictoryCup(ctx, game);
      }
    },

    renderDialogueBox: function (ctx) {
      ctx.fillStyle = 'rgba(11, 15, 25, 0.94)';
      ctx.fillRect(8, 196, 304, 84);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(9, 197, 302, 82);
      ctx.lineWidth = 1;

      if (this.dialogueSpeaker) {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(14, 187, 130, 14);
        ctx.fillStyle = '#0d1017';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(this.dialogueSpeaker.slice(0, 18), 18, 197);
      }

      const text = this.dialoguePages[0] || '';
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '10px monospace';
      this.wrapText(ctx, text, 16, 216, 288, 14);

      ctx.fillStyle = '#4cc9f0';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Press [A / Z] or Tap ▶', 194, 272);
    },

    renderSquadMenu: function (ctx, game) {
      // Tabs
      ctx.fillStyle = this.squadTab === 0 ? '#ffd166' : '#334155';
      ctx.fillRect(14, 14, 142, 18);
      ctx.fillStyle = this.squadTab === 0 ? '#000' : '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('◄ 1. SQUAD (5v5) ►', 24, 26);

      ctx.fillStyle = this.squadTab === 1 ? '#ffd166' : '#334155';
      ctx.fillRect(164, 14, 142, 18);
      ctx.fillStyle = this.squadTab === 1 ? '#000' : '#fff';
      ctx.fillText(`◄ 2. BAG (${game.bag.length}) ►`, 185, 26);

      if (this.squadTab === 0) {
        ctx.fillStyle = '#4cc9f0';
        ctx.font = '8px monospace';
        const subHint = this.pendingGearItem
          ? 'Select player to equip Gear [A] (or [B] cancel)'
          : (this.swapSourceIdx !== -1 ? 'Select second player to SWAP positions [A]' : 'Press [A] on two players to Swap Starter/Bench');
        ctx.fillText(subHint, 14, 44);

        const slotNames = ['GK ', 'DEF', 'MID', 'MID', 'FWD'];
        const maxVisible = 7;
        const startIdx = Math.max(0, Math.min(this.cursor - 3, Math.max(0, game.squad.length - maxVisible)));

        for (let i = 0; i < Math.min(maxVisible, game.squad.length); i++) {
          const idx = startIdx + i;
          const p = game.squad[idx];
          const ry = 50 + i * 26;
          const isSel = (this.cursor === idx);
          const isSwap = (this.swapSourceIdx === idx);

          ctx.fillStyle = isSwap ? '#3a0ca3' : (isSel ? '#1e293b' : '#111622');
          ctx.fillRect(12, ry, 296, 24);
          ctx.strokeStyle = isSel ? '#ffd166' : (idx < 5 ? '#2ec4b6' : '#475569');
          ctx.strokeRect(12.5, ry + 0.5, 295, 23);

          const posLabel = idx < 5 ? slotNames[idx] : 'SUB';
          ctx.fillStyle = idx < 5 ? '#06d6a0' : '#94a3b8';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(posLabel, 16, ry + 10);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`${p.name.slice(0, 10)} Lv${p.level} (${p.role})`, 40, ry + 10);

          ctx.fillStyle = '#ffd166';
          ctx.font = '8px monospace';
          ctx.fillText(`STA:${p.sta}/${p.maxSta}`, 178, ry + 10);

          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`DRI:${p.dri} PAS:${p.pas} SHO:${p.sho} TAC:${p.tac} INT:${p.int} GK:${p.gk}`, 16, ry + 20);
        }
      } else {
        ctx.fillStyle = '#4cc9f0';
        ctx.font = '8px monospace';
        ctx.fillText('Press [A] to use Drink or Equip Gear | [B] Close', 14, 44);

        if (game.bag.length === 0) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText('Your Bag is empty. Visit the Pro Kit Shop!', 24, 110);
        } else {
          for (let i = 0; i < Math.min(7, game.bag.length); i++) {
            const itemId = game.bag[i];
            const item = SR.ITEMS[itemId];
            const ry = 52 + i * 28;
            const isSel = (this.cursor === i);
            ctx.fillStyle = isSel ? '#1e293b' : '#111622';
            ctx.fillRect(14, ry, 292, 25);
            ctx.strokeStyle = isSel ? '#ffd166' : '#334155';
            ctx.strokeRect(14.5, ry + 0.5, 291, 24);

            ctx.fillStyle = '#ffd166';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(item.name, 20, ry + 11);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '8px monospace';
            ctx.fillText(item.desc.slice(0, 46), 20, ry + 21);
          }
        }
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px monospace';
      ctx.fillText('[◄/►] Switch Tab   [A/Z] Select   [B/X] Close Menu', 24, 272);
    },

    renderClubMenu: function (ctx, game) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('CLUBHOUSE — FREE AGENTS & REST', 16, 24);

      ctx.fillStyle = '#06d6a0';
      ctx.font = '9px monospace';
      ctx.fillText(`★ Squad Stamina 100% Restored! | Cash: $${game.cash} | Contracts: ${game.contracts}`, 16, 40);

      const agents = game.freeAgents;
      for (let i = 0; i < agents.length; i++) {
        const p = agents[i];
        const ry = 50 + i * 44;
        const sel = (this.cursor === i);
        ctx.fillStyle = sel ? '#1e293b' : '#111622';
        ctx.fillRect(14, ry, 292, 40);
        ctx.strokeStyle = sel ? '#ffd166' : '#334155';
        ctx.strokeRect(14.5, ry + 0.5, 291, 39);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${p.name} [${p.role} / ${p.affinity}] — $${p.cost} or 1 Contract`, 20, ry + 13);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '8px monospace';
        ctx.fillText(`DRI:${p.dri} PAS:${p.pas} SHO:${p.sho} TAC:${p.tac} INT:${p.int} GK:${p.gk}`, 20, ry + 25);
        ctx.fillStyle = '#4cc9f0';
        ctx.fillText(p.bio.slice(0, 46), 20, ry + 35);
      }

      const exitY = 50 + agents.length * 44;
      const exitSel = (this.cursor === agents.length);
      ctx.fillStyle = exitSel ? '#1e293b' : '#111622';
      ctx.fillRect(14, exitY, 292, 24);
      ctx.strokeStyle = exitSel ? '#ffd166' : '#334155';
      ctx.strokeRect(14.5, exitY + 0.5, 291, 23);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('LEAVE CLUBHOUSE [B]', 105, exitY + 15);
    },

    renderShopMenu: function (ctx, game) {
      ctx.fillStyle = '#4cc9f0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`PRO KIT & GEAR SHOP — Cash: $${game.cash}`, 16, 24);

      const keys = Object.keys(SR.ITEMS);
      for (let i = 0; i < keys.length; i++) {
        const item = SR.ITEMS[keys[i]];
        const ry = 34 + i * 33;
        const sel = (this.cursor === i);
        ctx.fillStyle = sel ? '#1e293b' : '#111622';
        ctx.fillRect(14, ry, 292, 30);
        ctx.strokeStyle = sel ? '#ffd166' : '#334155';
        ctx.strokeRect(14.5, ry + 0.5, 291, 29);

        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${item.name} — $${item.price}`, 20, ry + 12);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '8px monospace';
        ctx.fillText(item.desc.slice(0, 47), 20, ry + 24);
      }

      const exitY = 34 + keys.length * 33;
      const exitSel = (this.cursor === keys.length);
      ctx.fillStyle = exitSel ? '#1e293b' : '#111622';
      ctx.fillRect(14, exitY, 292, 22);
      ctx.strokeStyle = exitSel ? '#ffd166' : '#334155';
      ctx.strokeRect(14.5, exitY + 0.5, 291, 21);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('EXIT SHOP [B]', 118, exitY + 14);
    },

    renderPostMatchScout: function (ctx, game, tick) {
      ctx.fillStyle = '#06d6a0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('MATCH VICTORY & SCOUTING REPORT!', 18, 26);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '9px monospace';
      this.wrapText(ctx, this.matchRewardSummary, 18, 44, 284, 13);

      const c = this.scoutCandidate;
      if (c) {
        ctx.fillStyle = '#141a26';
        ctx.fillRect(16, 86, 288, 108);
        ctx.strokeStyle = '#4cc9f0';
        ctx.strokeRect(16.5, 86.5, 287, 107);

        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('STANDOUT RIVAL AVAILABLE TO RECRUIT:', 24, 102);

        SR.drawCharacter(ctx, 26, 114, {
          skin: c.skin, hair: c.hair, kitPrimary: '#3a86ff', kitSecondary: '#fff', moving: true
        }, tick);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${c.name}  [Role: ${c.role} | Style: ${c.affinity}]`, 50, 122);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '9px monospace';
        ctx.fillText(`DRI:${c.dri}  PAS:${c.pas}  SHO:${c.sho}`, 50, 138);
        ctx.fillText(`TAC:${c.tac}  INT:${c.int}  GK:${c.gk}  STA:${c.maxSta}`, 50, 152);

        const costLabel = game.contracts > 0
          ? `Use 1 Scout Contract (You have ${game.contracts})`
          : `Sign-on Bonus: $65 (You have $${game.cash})`;
        ctx.fillStyle = '#06d6a0';
        ctx.fillText(costLabel, 26, 178);
      }

      // Buttons: Recruit vs Skip
      const btns = [
        `RECRUIT ${c ? c.name.toUpperCase() : ''}`,
        'CONTINUE TO OVERWORLD'
      ];
      for (let i = 0; i < 2; i++) {
        const by = 208 + i * 30;
        const sel = (this.cursor === i);
        ctx.fillStyle = sel ? '#1e293b' : '#111622';
        ctx.fillRect(24, by, 272, 24);
        ctx.strokeStyle = sel ? '#ffd166' : '#334155';
        ctx.strokeRect(24.5, by + 0.5, 271, 23);
        ctx.fillStyle = sel ? '#ffd166' : '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(btns[i], 70, by + 15);
      }
    },

    renderTeamShowcase: function (ctx, game, tick) {
      // Blank dark screen showing only the 5 team players (sprites + name + stats) + NEXT button
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, 320, 288);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, 312, 280);
      ctx.lineWidth = 1;

      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('★ YOUR 5-A-SIDE STARTING SQUAD ★', 48, 22);

      const starters = game.squad.slice(0, 5);
      for (let i = 0; i < starters.length; i++) {
        const p = starters[i];
        const ry = 30 + i * 44;

        ctx.fillStyle = '#111622';
        ctx.fillRect(12, ry, 296, 40);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(12.5, ry + 0.5, 295, 39);

        // Character Body Sprite
        SR.drawCharacter(ctx, 20, ry + 12, {
          skin: p.skin,
          hair: p.hair,
          kitPrimary: '#3a86ff',
          kitSecondary: '#ffffff',
          moving: true,
          hasBall: (i === 2)
        }, tick);

        // Name, Role & Affinity
        const aff = SR.AFFINITIES[p.affinity] || SR.AFFINITIES.SPEED;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${p.name}  [${p.role}]`, 44, ry + 14);

        ctx.fillStyle = aff.color;
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`Style: ${aff.name} (${aff.icon})`, 185, ry + 14);

        // Stats Row
        ctx.fillStyle = '#4cc9f0';
        ctx.font = '8px monospace';
        ctx.fillText(`DRI:${p.dri}  PAS:${p.pas}  SHO:${p.sho}  TAC:${p.tac}  INT:${p.int}  GK:${p.gk}  STA:${p.maxSta}`, 44, ry + 27);

        // Bio / Signature Move
        const sk = SR.SKILLS[p.skills[0]];
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Skill: ${sk ? sk.name : 'Dash'} — ${p.bio.slice(0, 32)}`, 44, ry + 36);
      }

      // NEXT button at bottom
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(60, 254, 200, 24);
      ctx.strokeStyle = '#06d6a0';
      ctx.strokeRect(60.5, 254.5, 199, 23);
      ctx.fillStyle = '#06d6a0';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('NEXT: GO OUTSIDE [A / Enter] ▶', 72, 269);
    },

    renderQuestHelp: function (ctx, game) {
      const reg = game.world.region;
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('QUEST LOG & TACTICAL GUIDE', 18, 26);

      ctx.fillStyle = '#4cc9f0';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`CURRENT CHAPTER: ${reg.name}`, 18, 46);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '9px monospace';
      let qDesc = '';
      if (game.world.isPrologue) {
        qDesc = 'Visit your Friend\'s Mum next door or head NORTH to the High School, climb 2 floors of classrooms & corridors, and defeat the Varsity Jocks in the Gym!';
      } else {
        const qState = game.questState[reg.id] || 'NOT_STARTED';
        qDesc = qState === 'COMPLETED'
          ? `COMPLETED! ${reg.quest.giverName} joined your squad!`
          : (qState === 'FOUND_ITEM'
            ? `Found ${reg.quest.itemName}! Return to ${reg.quest.giverName} in Town!`
            : `Talk to ${reg.quest.giverName} in Town & find the ${reg.quest.itemName} in the Dungeon chest!`);
      }
      this.wrapText(ctx, `OBJECTIVE: ${qDesc}`, 18, 62, 284, 13);

      ctx.fillStyle = '#06d6a0';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('3-PHASE CLASH TACTICAL TRIANGLE:', 18, 108);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px monospace';
      ctx.fillText('• PASS beats TACKLE (+25% & +15% Rhythm)', 18, 124);
      ctx.fillText('• TACKLE beats DRIBBLE (+25% Steal power)', 18, 138);
      ctx.fillText('• DRIBBLE beats INTERCEPT (+25% Solo run)', 18, 152);
      ctx.fillText('• INTERCEPT beats PASS (+25% Cut lane)', 18, 166);
      ctx.fillText('• BLOCK cuts incoming SHOOT power by 35%', 18, 180);

      ctx.fillStyle = '#ffca3a';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PLAYER STYLE TRIANGLE (+20% Advantage):', 18, 200);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('POWER beats TECH  •  TECH beats SPEED  •  SPEED beats POWER', 18, 214);

      ctx.fillStyle = '#4cc9f0';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SQUAD ROTATION & STAMINA:', 18, 234);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px monospace';
      ctx.fillText('• [B] Swap Partner in Midfield/Attack  • [M] Bench Subs & Sodas', 18, 247);
      ctx.fillText('• Resting teammates recover +4 STA/turn (+6 STA on Bench)', 18, 258);

      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Press [A / B / Q] to Close', 92, 274);
    },

    renderVictoryCup: function (ctx, game) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('★ WORLD STRIKER CHAMPIONS! ★', 38, 42);

      ctx.fillStyle = '#06d6a0';
      ctx.font = '10px monospace';
      this.wrapText(
        ctx,
        'Congratulations Captain! You conquered all 3 Regions—from the Rustyard Docklands and Neon Metro District to the Grand Apex Colosseum!',
        22, 74, 276, 15
      );

      ctx.fillStyle = '#4cc9f0';
      this.wrapText(
        ctx,
        `Coach Legacy Unlocked! Starting a New Season Run grants +1 Bonus Level to all starters and +$100 Starting Sponsorship Cash!`,
        22, 145, 276, 15
      );

      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('Press [A / Enter] to Start New Season+ ▶', 34, 244);
    },

    wrapText: function (ctx, text, x, y, maxWidth, lineHeight) {
      const words = String(text).split(' ');
      let line = '';
      let cy = y;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, cy);
          line = words[n] + ' ';
          cy += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, cy);
    }
  };
})(window.SR);
