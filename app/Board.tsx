import { useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Group, Rect, Text, Line, Circle } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  config,
  getCardDef,
  getHeroClassDef,
  type CardInstance,
  type Command,
  type ContentDB,
  type Row,
  type SectionDef,
} from '../engine/index';
import { useStore, legalForActive } from './store';
import { zoneLabel } from './format';

const COVER_HINT = {
  open: 'exposed — easier to be spotted',
  partial: 'scattered cover',
  covered: 'well hidden — easier to stay unseen',
} as const;

const CARD_W = 300;
const CARD_H = 180;
const GAP = 26;
const SECTION_PAD = 8;
const BODY_TOP = 26; // below the card name
const BODY_BOT = 8;

const COVER_GLYPH = { open: '○ open', partial: '◐ partial', covered: '● covered' } as const;
const COVER_FILL = { open: '#3b3f2e', partial: '#33402f', covered: '#28372f' } as const;
const ALERT_COLORS = ['#4a5a4a', '#c9a227', '#d9702b', '#cc3333'] as const;
/** vertical stacking of zone bands within a card: exits on top, entry at bottom */
const ROW_ORDER: Row[] = ['exit', 'core', 'entry'];

function cardXY(card: CardInstance): { x: number; y: number } {
  return { x: (card.col + card.row * 0.5) * (CARD_W + GAP), y: -card.row * (CARD_H + GAP) };
}

interface SectionGeom {
  section: SectionDef;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lay zones out in up-to-three horizontal bands (exit/core/entry), each split full or left/right. */
function sectionGeoms(content: ContentDB, card: CardInstance): SectionGeom[] {
  const def = getCardDef(content, card.defId);
  const present = ROW_ORDER.filter((r) => def.sections.some((s) => s.row === r));
  const rowH = (CARD_H - BODY_TOP - BODY_BOT) / Math.max(1, present.length);
  const halfW = (CARD_W - 3 * SECTION_PAD) / 2;
  return def.sections.map((s) => {
    const y = BODY_TOP + present.indexOf(s.row) * rowH;
    let x = SECTION_PAD;
    let w = CARD_W - 2 * SECTION_PAD;
    if (s.col === 'left') w = halfW;
    else if (s.col === 'right') {
      w = halfW;
      x = CARD_W - SECTION_PAD - halfW;
    }
    let rect = { x, y, w, h: rowH - SECTION_PAD };
    if (s.hiding) {
      const ins = 12; // a nook: drawn smaller and inset
      rect = { x: rect.x + ins, y: rect.y + 4, w: rect.w - 2 * ins, h: rect.h - 8 };
    }
    return { section: s, ...rect };
  });
}

export function Board(): JSX.Element {
  const store = useStore();
  const { content, state } = store;
  const legal = useMemo(() => legalForActive(store), [store]);
  const [tip, setTip] = useState<{ info: string; action?: string; x: number; y: number } | null>(null);
  const [vp, setVp] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const onResize = (): void => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  if (!content || !state) return <div className="board-empty">loading…</div>;

  const hero = state.heroes[state.activeHeroIdx];

  /** hover-tooltip handlers for any Konva shape; `clickable` shows a hand cursor */
  const setCursor = (e: KonvaEventObject<MouseEvent>, c: string): void => {
    const s = e.target.getStage();
    if (s) s.container().style.cursor = c;
  };
  // info = the descriptive box; action = what a click does (label sits at the pointer). action ⇒ clickable ⇒ hand cursor
  const showTip = (info: string, action?: string) => ({
    onMouseEnter: (e: KonvaEventObject<MouseEvent>) => {
      setTip({ info, action, x: e.evt.clientX, y: e.evt.clientY });
      if (action) setCursor(e, 'pointer');
    },
    onMouseMove: (e: KonvaEventObject<MouseEvent>) => setTip((t) => (t ? { ...t, x: e.evt.clientX, y: e.evt.clientY } : t)),
    onMouseLeave: (e: KonvaEventObject<MouseEvent>) => {
      setTip(null);
      if (action) setCursor(e, 'grab'); // back to the pannable-board cursor
    },
  });

  const tryMove = (cardId: string, sectionId: string): void => {
    if (!hero) return;
    if (hero.cardId === cardId) {
      // default click = move openly; the 🥿 alt-icon does the stealth move
      const move = legal.find((c) => c.kind === 'MoveSection' && c.toSection === sectionId);
      const stealth = legal.find((c) => c.kind === 'StealthMove' && c.route[0] === sectionId);
      const cmd: Command | undefined = move ?? stealth;
      if (cmd) store.dispatch(cmd);
      return;
    }
    // clicking a revealed neighbour card = cross the exit that leads there (no need to hit the ↑)
    const fromCard = state.cards[hero.cardId];
    const cross = legal.find(
      (c) => c.kind === 'CrossExit' && fromCard?.exploredExits[c.exitIdx] === cardId,
    );
    if (cross) store.dispatch(cross);
  };

  const tryExit = (cardId: string, exitIdx: number): void => {
    if (!hero || hero.cardId !== cardId) return;
    // prefer crossing; else open a shut door; else peek through a blocker
    const cmd =
      legal.find((c) => c.kind === 'CrossExit' && c.exitIdx === exitIdx) ??
      legal.find((c) => c.kind === 'OpenExit' && c.exitIdx === exitIdx) ??
      legal.find((c) => c.kind === 'PeekExit' && c.exitIdx === exitIdx);
    if (cmd) store.dispatch(cmd);
  };

  const tryInspect = (cardId: string, sectionId: string, slotIdx: number): void => {
    if (!hero || hero.cardId !== cardId || hero.section !== sectionId) return;
    const cmd = legal.find((c) => c.kind === 'Inspect' && c.slotIdx === slotIdx);
    if (cmd) store.dispatch(cmd);
  };

  const moveLabel = `move openly (${config.costs.moveSection} AP)`;

  const cards = Object.values(state.cards);
  const minX = Math.min(...cards.map((c) => cardXY(c).x));
  const maxY = Math.max(...cards.map((c) => cardXY(c).y));
  const stageW = Math.max(480, vp.w - 16); // 100% viewport width
  const stageH = Math.max(320, Math.round(vp.h * 0.5)); // 50% viewport height

  return (
    <>
    <Stage
      width={stageW}
      height={stageH}
      draggable
      x={stageW / 2 - CARD_W / 2 - minX}
      y={stageH - CARD_H - 30 - maxY}
      className="board-stage"
      onMouseDown={(e) => setCursor(e, 'grabbing')}
      onMouseUp={(e) => setCursor(e, 'grab')}
      onDragStart={(e) => setCursor(e, 'grabbing')}
      onDragEnd={(e) => setCursor(e, 'grab')}
    >
      <Layer>
        {cards.map((card) => {
          const def = getCardDef(content, card.defId);
          const { x, y } = cardXY(card);
          const geoms = sectionGeoms(content, card);
          return (
            <Group key={card.id} x={x} y={y}>
              <Rect width={CARD_W} height={CARD_H} fill="#1e2420" stroke="#5a6b5a" strokeWidth={2} cornerRadius={10} />
              <Text
                text={def.name}
                x={10}
                y={6}
                fontSize={14}
                fontStyle="bold"
                fill="#d8d2b8"
                {...showTip([`${def.name}`, `Alert ${card.alert}/3${card.alert === 0 ? ' (calm)' : ''}`, 'Higher alert = harder stealth, more encounters.', 'The dots at right show the level.'].join('\n'))}
              />
              {/* alert pips */}
              {[0, 1, 2, 3].map((i) => (
                <Circle
                  key={i}
                  x={CARD_W - 16 - i * 16}
                  y={14}
                  radius={5}
                  fill={card.alert > i ? ALERT_COLORS[Math.min(card.alert, 3)] : '#2c332c'}
                  stroke="#555"
                />
              ))}
              {/* exits — separate from top zones; a top zone may carry none */}
              {def.topExits.map((exit, exitIdx) => {
                const geom = geoms.find((g) => g.section.id === exit.section);
                if (!geom) return null;
                const walled = card.blockedExits.includes(exitIdx);
                const explored = card.exploredExits[exitIdx] !== undefined;
                const opened = card.openedExits.includes(exitIdx);
                const blocker = exit.blocker;
                const blocked = !!blocker && !opened;
                // action only when actually legal for the active hero
                const canCross = legal.some((c) => c.kind === 'CrossExit' && c.exitIdx === exitIdx);
                const canOpen = legal.some((c) => c.kind === 'OpenExit' && c.exitIdx === exitIdx);
                const canPeek = legal.some((c) => c.kind === 'PeekExit' && c.exitIdx === exitIdx);
                let exitInfo: string;
                let exitAction: string | undefined;
                if (walled) {
                  exitInfo = 'This exit is walled off.\n(The tile pool ran dry here.)';
                } else if (blocked && blocker) {
                  exitInfo = `${blocker.label}\n${
                    blocker.openable ? 'A shut door — open it to pass, or peek through.' : 'Sealed for good — you can only peek through.'
                  }`;
                  exitAction = canOpen ? `open (${config.costs.crossExit} AP)` : canPeek ? `peek through (${config.costs.inspect} AP)` : undefined;
                } else {
                  exitInfo = `Exit to the ${exit.side} brick above.${explored ? '\nAlready explored.' : ''}`;
                  exitAction = canCross ? (explored ? 'cross' : 'explore') : undefined;
                }
                // anchor to the left/right brick above, never centered — even for a lone full-width exit
                const exitX = exit.side === 'left' ? CARD_W * 0.25 : CARD_W * 0.75;
                return (
                  <Group key={exitIdx} x={exitX} y={geom.y - 6} {...showTip(exitInfo, exitAction)} onClick={() => tryExit(card.id, exitIdx)} onTap={() => tryExit(card.id, exitIdx)}>
                    {/* triangle = exit; red bar = walled. The blocker (door/grate) is drawn inside its zone. */}
                    <Line
                      points={walled ? [-10, 2, 10, 2] : [-9, 5, 0, -9, 9, 5]}
                      closed={!walled}
                      fill={walled ? undefined : blocked ? '#6b6b52' : '#c9a227'}
                      stroke={walled ? '#884444' : '#7a6a1e'}
                      strokeWidth={walled ? 4 : 1}
                    />
                  </Group>
                );
              })}
              {/* zones — up to three bands (exit / core / entry) */}
              {geoms.map((geom) => {
                const sDef = geom.section;
                const heroesHere = state.heroes.filter((h) => !h.downed && h.cardId === card.id && h.section === sDef.id);
                const enemiesHere = Object.values(state.enemies)
                  .filter((e) => e.cardId === card.id && e.section === sDef.id)
                  .sort((a, b) => a.id.localeCompare(b.id));
                const slotStates = sDef.slots.map((_, i) => !!card.usedSlots[`${sDef.id}:${i}`]);
                const isActiveHere = hero && hero.cardId === card.id && hero.section === sDef.id;
                const tokenY = geom.h - 16;
                const unsearched = slotStates.filter((u) => !u).length;
                const contents = [
                  ...enemiesHere.map((e) => {
                    const eDef = content.enemies[e.defId];
                    return `⚔ ${eDef?.name ?? e.defId}${e.sleeper ? ' (dormant 💤)' : ` — ${eDef?.states[e.stateIdx]?.name ?? '?'}`}`;
                  }),
                  ...heroesHere.map((h) => `♦ Player ${h.idx + 1} (${getHeroClassDef(content, h.classId).name})`),
                  ...(unsearched > 0 ? [`❖ ${unsearched} unsearched cache${unsearched === 1 ? '' : 's'}`] : []),
                ];
                const zoneTip = [
                  `${zoneLabel(sDef.id)}${sDef.hiding ? ' (hiding nook)' : ''}`,
                  `${sDef.cover} cover — ${COVER_HINT[sDef.cover]}`,
                  `chokepoint ${sDef.chokepoint} — ${sDef.chokepoint}+ enemies here block passage`,
                  ...(sDef.capacity ? [`holds up to ${sDef.capacity} occupant${sDef.capacity === 1 ? '' : 's'}`] : []),
                  ...(sDef.ambush ? ['may conceal an ambusher'] : []),
                  ...(contents.length > 0 ? ['', 'contents:', ...contents] : ['', 'empty']),
                ].join('\n');
                // action is independent of the info tooltip: only shown when a move is actually legal
                const canMoveHere =
                  !!hero && hero.cardId === card.id &&
                  legal.some((c) => (c.kind === 'MoveSection' && c.toSection === sDef.id) || (c.kind === 'StealthMove' && c.route[0] === sDef.id));
                const stealthCmd = hero && hero.cardId === card.id ? legal.find((c) => c.kind === 'StealthMove' && c.route[0] === sDef.id) : undefined;
                const canCrossHere =
                  !!hero && hero.cardId !== card.id &&
                  legal.some((c) => c.kind === 'CrossExit' && state.cards[hero.cardId]?.exploredExits[c.exitIdx] === card.id);
                const zoneAction = canMoveHere ? moveLabel : canCrossHere ? 'cross into here' : undefined;
                return (
                  <Group key={sDef.id} x={geom.x} y={geom.y} {...showTip(zoneTip, zoneAction)} onClick={() => tryMove(card.id, sDef.id)} onTap={() => tryMove(card.id, sDef.id)}>
                    <Rect
                      width={geom.w}
                      height={geom.h}
                      fill={sDef.hiding ? '#2b2e22' : COVER_FILL[sDef.cover]}
                      stroke={isActiveHere ? '#e8d44d' : sDef.hiding ? '#6b5a3a' : '#47543f'}
                      strokeWidth={isActiveHere ? 2.5 : 1}
                      cornerRadius={6}
                      dash={sDef.hiding ? [5, 3] : undefined}
                    />
                    <Text text={`${sDef.hiding ? '🌿 ' : ''}${zoneLabel(sDef.id)}`} x={5} y={4} fontSize={11} fill="#b8c4a8" width={geom.w - 10} ellipsis wrap="none" />
                    <Text text={`${COVER_GLYPH[sDef.cover]} · choke ${sDef.chokepoint}${sDef.capacity ? ` · cap ${sDef.capacity}` : ''}`} x={5} y={18} fontSize={10} fill="#8a967e" width={geom.w - 10} ellipsis wrap="none" />
                    {/* mystery slots — larger; click to inspect */}
                    {sDef.slots.map((_, i) => {
                      const used = slotStates[i];
                      const slotInfo = used
                        ? 'Mystery cache ❖\nAlready searched.'
                        : 'Mystery cache ❖\nDraws a token: item, clue, trap, or rune.';
                      const canInspect =
                        !used && !!hero && hero.cardId === card.id && hero.section === sDef.id &&
                        legal.some((c) => c.kind === 'Inspect' && c.slotIdx === i);
                      const slotAction = canInspect ? `Inspect (${config.costs.inspect} AP)` : undefined;
                      return (
                        <Text
                          key={i}
                          text="❖"
                          x={6 + i * 22}
                          y={30}
                          fontSize={19}
                          fill={used ? '#4e584e' : '#7ec8e3'}
                          {...showTip(slotInfo, slotAction)}
                          onClick={(evt) => {
                            evt.cancelBubble = true;
                            if (!used) tryInspect(card.id, sDef.id, i);
                          }}
                          onTap={(evt) => {
                            evt.cancelBubble = true;
                            if (!used) tryInspect(card.id, sDef.id, i);
                          }}
                        />
                      );
                    })}
                    {/* alt-action: sneak into this zone (default click moves openly) */}
                    {stealthCmd && (
                      <Text
                        text="🥿"
                        x={geom.w / 2 - 9}
                        y={2}
                        fontSize={15}
                        {...showTip('Stealth move here.\nRoll vs alert; slip in unseen if you succeed.', `sneak (${config.costs.moveSection} AP)`)}
                        onClick={(evt) => {
                          evt.cancelBubble = true;
                          store.dispatch(stealthCmd);
                        }}
                        onTap={(evt) => {
                          evt.cancelBubble = true;
                          store.dispatch(stealthCmd);
                        }}
                      />
                    )}
                    {/* blockers (doors/grates) belong to the exit zone and are interacted with here */}
                    {def.topExits.map((e, idx) => {
                      if (e.section !== sDef.id || !e.blocker || card.blockedExits.includes(idx)) return null;
                      const blk = e.blocker;
                      const isOpen = card.openedExits.includes(idx);
                      if (isOpen) {
                        const closeCmd = legal.find((c) => c.kind === 'CloseExit' && c.exitIdx === idx);
                        return (
                          <Text
                            key={`blk${idx}`}
                            text="🔓"
                            x={geom.w - 24}
                            y={3}
                            fontSize={16}
                            {...showTip(`${blk.label} — standing open`, closeCmd ? `pull shut (${config.costs.crossExit} AP)` : undefined)}
                            onClick={(evt) => {
                              evt.cancelBubble = true;
                              if (closeCmd) store.dispatch(closeCmd);
                            }}
                            onTap={(evt) => {
                              evt.cancelBubble = true;
                              if (closeCmd) store.dispatch(closeCmd);
                            }}
                          />
                        );
                      }
                      const canOpen = legal.some((c) => c.kind === 'OpenExit' && c.exitIdx === idx);
                      const peekCmd = legal.find((c) => c.kind === 'PeekExit' && c.exitIdx === idx);
                      const bInfo = `${blk.label}\n${blk.openable ? 'A shut door — open to pass, or peek through.' : 'Sealed for good — peek through only.'}`;
                      const bAction = canOpen ? `open (${config.costs.crossExit} AP)` : peekCmd ? `peek through (${config.costs.inspect} AP)` : undefined;
                      return (
                        <Group key={`blk${idx}`}>
                          <Text
                            text={blk.openable ? '🚪' : '▦'}
                            x={geom.w - 24}
                            y={3}
                            fontSize={18}
                            {...showTip(bInfo, bAction)}
                            onClick={(evt) => {
                              evt.cancelBubble = true;
                              tryExit(card.id, idx);
                            }}
                            onTap={(evt) => {
                              evt.cancelBubble = true;
                              tryExit(card.id, idx);
                            }}
                          />
                          {/* alt-action: peek through (default click opens the door) */}
                          {blk.openable && peekCmd && (
                            <Text
                              text="👁"
                              x={geom.w - 24}
                              y={24}
                              fontSize={13}
                              {...showTip('Peek through the keyhole without opening it.', `peek (${config.costs.inspect} AP)`)}
                              onClick={(evt) => {
                                evt.cancelBubble = true;
                                store.dispatch(peekCmd);
                              }}
                              onTap={(evt) => {
                                evt.cancelBubble = true;
                                store.dispatch(peekCmd);
                              }}
                            />
                          )}
                        </Group>
                      );
                    })}
                    {/* enemies */}
                    {enemiesHere.map((e, i) => {
                      const eDef = content.enemies[e.defId];
                      const selected = store.selectedEnemyId === e.id;
                      const total = eDef?.states.length ?? 1;
                      const remaining = Math.max(0, total - e.stateIdx);
                      const stateName = eDef?.states[e.stateIdx]?.name ?? '?';
                      const enemyInfo = e.sleeper
                        ? [`${eDef?.name ?? e.defId}`, 'Dormant 💤 — neutral until disturbed.', 'Sneak past, or strike first.'].join('\n')
                        : [`${eDef?.name ?? e.defId}`, `${stateName} — ${remaining}/${total} health`].join('\n');
                      const atkAps = legal
                        .filter((c) => c.kind === 'Attack' && c.targetId === e.id)
                        .map((c) => (c as Extract<Command, { kind: 'Attack' }>).ap)
                        .sort((a, b) => a - b);
                      return (
                        <Group
                          key={e.id}
                          x={15 + i * 26}
                          y={tokenY}
                          {...showTip(enemyInfo, atkAps.length ? 'focus (attack via the ⚔ icons)' : 'focus')}
                          onClick={(evt) => {
                            evt.cancelBubble = true;
                            store.selectEnemy(selected ? undefined : e.id);
                          }}
                          onTap={(evt) => {
                            evt.cancelBubble = true;
                            store.selectEnemy(selected ? undefined : e.id);
                          }}
                        >
                          <Circle radius={11} fill={e.sleeper ? '#4e4668' : '#7d3434'} stroke={selected ? '#e8d44d' : '#222'} strokeWidth={selected ? 3 : 1} />
                          <Text text={e.sleeper ? '💤' : (eDef?.name[0] ?? '?')} x={-5} y={-6} fontSize={11} fill="#e8dcc8" />
                          <Text text={'♥'.repeat(remaining) + '♡'.repeat(e.stateIdx)} x={-12} y={12} fontSize={9} fill="#d98080" />
                          {/* alt-action: direct attack at N AP (more AP = more dice) */}
                          {atkAps.map((ap, k) => (
                            <Group
                              key={ap}
                              x={-14 + k * 15}
                              y={-27}
                              {...showTip(`Attack with ${ap} AP → roll ${ap} dice.`, `attack ${ap} AP`)}
                              onClick={(evt) => {
                                evt.cancelBubble = true;
                                store.dispatch({ kind: 'Attack', targetId: e.id, ap });
                              }}
                              onTap={(evt) => {
                                evt.cancelBubble = true;
                                store.dispatch({ kind: 'Attack', targetId: e.id, ap });
                              }}
                            >
                              <Rect width={13} height={12} cornerRadius={2} fill="#5a2020" stroke="#a05050" strokeWidth={0.5} />
                              <Text text={`${ap}`} x={4} y={1} fontSize={10} fontStyle="bold" fill="#f0c0c0" />
                            </Group>
                          ))}
                        </Group>
                      );
                    })}
                    {/* heroes */}
                    {heroesHere.map((h, i) => {
                      const hDef = getHeroClassDef(content, h.classId);
                      const heroTip = [
                        `Player ${h.idx + 1} — ${hDef.name}`,
                        `HP ${h.hp}/${hDef.hp}`,
                        h.detected ? 'Detected' : 'Unseen',
                        ...(h.idx === state.activeHeroIdx ? ['Active this turn'] : []),
                      ].join('\n');
                      return (
                        <Group key={h.idx} x={geom.w - 15 - i * 26} y={tokenY} {...showTip(heroTip)}>
                          <Circle
                            radius={11}
                            fill={h.idx === state.activeHeroIdx ? '#2d6a4f' : '#40556a'}
                            stroke={h.detected ? '#cc3333' : '#88b088'}
                            strokeWidth={2.5}
                            dash={h.detected ? undefined : [3, 3]}
                          />
                          <Text text={`${h.idx + 1}`} x={-4} y={-7} fontSize={13} fontStyle="bold" fill="#fff" />
                        </Group>
                      );
                    })}
                  </Group>
                );
              })}
              {/* barrier links (climb/jump) — drawn on top; not walkable in v0 */}
              {def.sectionEdges
                .filter((e) => e.requires !== undefined)
                .map((e, i) => {
                  const a = geoms.find((g) => g.section.id === e.a);
                  const b = geoms.find((g) => g.section.id === e.b);
                  if (!a || !b) return null;
                  const ax = a.x + a.w / 2;
                  const ay = a.y + a.h / 2;
                  const bx = b.x + b.w / 2;
                  const by = b.y + b.h / 2;
                  return (
                    <Group key={`bar${i}`} {...showTip([`Barrier: ${zoneLabel(e.a)} ↔ ${zoneLabel(e.b)}`, `Requires ${e.requires}`, 'No special-move ability exists yet — uncrossable in v0.'].join('\n'))}>
                      <Line points={[ax, ay, bx, by]} stroke="#8a6d3b" strokeWidth={2} dash={[4, 4]} />
                      <Text text={`⛰ ${e.requires}`} x={(ax + bx) / 2 - 16} y={(ay + by) / 2 - 6} fontSize={9} fill="#c8a86a" />
                    </Group>
                  );
                })}
            </Group>
          );
        })}
      </Layer>
    </Stage>
    {tip?.action && (
      <div className="board-action" style={{ left: tip.x + 14, top: tip.y - 30 }}>
        {tip.action}
      </div>
    )}
    {tip && (
      <div className="board-tip" style={{ left: tip.x + 18, top: tip.y - 2 }}>
        {tip.info}
      </div>
    )}
    </>
  );
}
