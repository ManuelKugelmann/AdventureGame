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
import { classIcon, playerColor, zoneLabel } from './format';

// custom cursor: a dashed 4-way move-arrow (stealth). Built-in `move` is the solid 4-way arrow for open moves.
const SNEAK_ARROW_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'><g fill='none' stroke='#5fbf7f' stroke-width='2' stroke-dasharray='3 2' stroke-linejoin='round'><path d='M13 4V22M4 13H22'/><path d='M10 7 13 4 16 7M10 19 13 22 16 19M7 10 4 13 7 16M19 10 22 13 19 16'/></g></svg>";
const SNEAK_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(SNEAK_ARROW_SVG)}") 13 13, move`;

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
  // info = the descriptive box; action = what a click does. cancelBubble makes the innermost shape under the cursor
  // win; we DON'T clear on leave (the outer shape re-asserts via its own onMouseMove, and the Stage clears over empty
  // space) — otherwise leaving a nested icon blanks the outer tooltip.
  const showTip = (info: string, action?: string, cursor?: string) => {
    const set = (e: KonvaEventObject<MouseEvent>): void => {
      e.cancelBubble = true;
      setTip({ info, action, x: e.evt.clientX, y: e.evt.clientY });
      setCursor(e, cursor ?? (action ? 'pointer' : 'grab'));
    };
    return { onMouseEnter: set, onMouseMove: set };
  };

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

  const moveLabel = `move openly (${config.costs.moveSection}⚡)`;

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
      onMouseMove={(e) => {
        if (e.target === e.target.getStage()) setTip(null); // over empty space between cards
      }}
      onMouseLeave={() => setTip(null)}
    >
      <Layer>
        {cards.map((card) => {
          const def = getCardDef(content, card.defId);
          const { x, y } = cardXY(card);
          const geoms = sectionGeoms(content, card);
          const cardInfo = `${def.name}\n${def.biome} · tier ${def.tier}`;
          return (
            <Group key={card.id} x={x} y={y}>
              {/* card background also carries the card tooltip so empty areas re-assert it */}
              <Rect width={CARD_W} height={CARD_H} fill="#1e2420" stroke="#5a6b5a" strokeWidth={2} cornerRadius={10} {...showTip(cardInfo)} />
              {/* tile marker (matches the Stacks icon); tier colour */}
              <Rect x={9} y={10} width={17} height={9} fill={def.tier === 2 ? '#a86a4a' : '#c9a86a'} cornerRadius={1.5} {...showTip(cardInfo)} />
              <Text text={def.name} x={31} y={6} fontSize={14} fontStyle="bold" fill="#d8d2b8" {...showTip(cardInfo)} />
              {/* alert pips */}
              {[0, 1, 2, 3].map((i) => (
                <Circle
                  key={i}
                  x={CARD_W - 16 - i * 16}
                  y={14}
                  radius={5}
                  fill={card.alert > i ? ALERT_COLORS[Math.min(card.alert, 3)] : '#2c332c'}
                  stroke="#555"
                  {...showTip(`alert ${card.alert}/3`)}
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
                  exitInfo = 'walled off';
                } else if (blocked && blocker) {
                  exitInfo = `${blocker.label}${blocker.openable ? ' (shut door)' : ' (sealed grate)'}`;
                  exitAction = canOpen ? `open (${config.costs.crossExit}⚡)` : canPeek ? `peek through (${config.costs.inspect}⚡)` : undefined;
                } else {
                  exitInfo = `exit — ${exit.side} brick above`;
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
                  `${zoneLabel(sDef.id)}${sDef.hiding ? ' (nook)' : ''}`,
                  `${sDef.cover} cover · width ${sDef.chokepoint}${sDef.capacity ? ` · cap ${sDef.capacity}` : ''}`,
                  ...(contents.length > 0 ? ['', ...contents] : ['', 'empty']),
                ].join('\n');
                // action is independent of the info tooltip: only shown when a move is actually legal
                const canMoveHere =
                  !!hero && hero.cardId === card.id &&
                  legal.some((c) => (c.kind === 'MoveSection' && c.toSection === sDef.id) || (c.kind === 'StealthMove' && c.route[0] === sDef.id));
                const stealthCmd = hero && hero.cardId === card.id ? legal.find((c) => c.kind === 'StealthMove' && c.route[0] === sDef.id) : undefined;
                const rehideCmd = hero && hero.cardId === card.id && hero.section === sDef.id ? legal.find((c) => c.kind === 'ReHide') : undefined;
                const canCrossHere =
                  !!hero && hero.cardId !== card.id &&
                  legal.some((c) => c.kind === 'CrossExit' && state.cards[hero.cardId]?.exploredExits[c.exitIdx] === card.id);
                const zoneAction = canMoveHere ? moveLabel : canCrossHere ? 'cross into here' : undefined;
                return (
                  <Group key={sDef.id} x={geom.x} y={geom.y} {...showTip(zoneTip, zoneAction, zoneAction ? 'move' : undefined)} onClick={() => tryMove(card.id, sDef.id)} onTap={() => tryMove(card.id, sDef.id)}>
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
                    <Text text={`${COVER_GLYPH[sDef.cover]} · width ${sDef.chokepoint}${sDef.capacity ? ` · cap ${sDef.capacity}` : ''}`} x={5} y={18} fontSize={10} fill="#8a967e" width={geom.w - 10} ellipsis wrap="none" />
                    {/* mystery slots — larger; click to inspect */}
                    {sDef.slots.map((_, i) => {
                      const used = slotStates[i];
                      const slotInfo = used ? 'mystery cache (searched)' : 'mystery cache ❖';
                      const canInspect =
                        !used && !!hero && hero.cardId === card.id && hero.section === sDef.id &&
                        legal.some((c) => c.kind === 'Inspect' && c.slotIdx === i);
                      const slotAction = canInspect ? `Inspect (${config.costs.inspect}⚡)` : undefined;
                      return (
                        <Text
                          key={i}
                          text="❖"
                          x={4}
                          y={30 + i * 19}
                          fontSize={18}
                          fill={used ? '#4e584e' : def.tier === 2 ? '#3f8fa8' : '#7ec8e3'}
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
                    {/* alt-action: sneak into this zone — footsteps inside a dashed ring (walking, but hidden) */}
                    {stealthCmd && (
                      <Group
                        x={geom.w - 15}
                        y={11}
                        {...showTip('stealth move', `sneak (${config.costs.moveSection}⚡)`, SNEAK_CURSOR)}
                        onClick={(evt) => {
                          evt.cancelBubble = true;
                          store.dispatch(stealthCmd);
                        }}
                        onTap={(evt) => {
                          evt.cancelBubble = true;
                          store.dispatch(stealthCmd);
                        }}
                      >
                        <Circle radius={10} stroke="#86e0a0" strokeWidth={1.4} dash={[3, 2]} />
                        {/* 4-way move arrow */}
                        <Line points={[0, -6, 0, 6]} stroke="#86e0a0" strokeWidth={1.3} />
                        <Line points={[-6, 0, 6, 0]} stroke="#86e0a0" strokeWidth={1.3} />
                        <Line points={[-2, -4, 0, -6, 2, -4]} stroke="#86e0a0" strokeWidth={1.3} lineJoin="round" />
                        <Line points={[-2, 4, 0, 6, 2, 4]} stroke="#86e0a0" strokeWidth={1.3} lineJoin="round" />
                        <Line points={[-4, -2, -6, 0, -4, 2]} stroke="#86e0a0" strokeWidth={1.3} lineJoin="round" />
                        <Line points={[4, -2, 6, 0, 4, 2]} stroke="#86e0a0" strokeWidth={1.3} lineJoin="round" />
                      </Group>
                    )}
                    {/* alt-action: hide in place — a dashed circle, matching the hidden hero ring */}
                    {rehideCmd && (
                      <Circle
                        x={geom.w - 16}
                        y={9}
                        radius={7}
                        stroke="#86e0a0"
                        strokeWidth={1.6}
                        dash={[3, 2]}
                        {...showTip('hide in place', `hide (${config.costs.reHide}⚡)`)}
                        onClick={(evt) => {
                          evt.cancelBubble = true;
                          store.dispatch(rehideCmd);
                        }}
                        onTap={(evt) => {
                          evt.cancelBubble = true;
                          store.dispatch(rehideCmd);
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
                            {...showTip(`${blk.label} (open)`, closeCmd ? `pull shut (${config.costs.crossExit}⚡)` : undefined)}
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
                      const bInfo = `${blk.label}${blk.openable ? ' (shut door)' : ' (sealed grate)'}`;
                      const bAction = canOpen ? `open (${config.costs.crossExit}⚡)` : peekCmd ? `peek through (${config.costs.inspect}⚡)` : undefined;
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
                              {...showTip('peek through', `peek (${config.costs.inspect}⚡)`)}
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
                        ? `${eDef?.name ?? e.defId} (dormant 💤)`
                        : `${eDef?.name ?? e.defId} — ${stateName} · ${remaining}/${total}♥`;
                      const atkAps = legal
                        .filter((c) => c.kind === 'Attack' && c.targetId === e.id)
                        .map((c) => (c as Extract<Command, { kind: 'Attack' }>).ap)
                        .sort((a, b) => a - b);
                      return (
                        <Group
                          key={e.id}
                          x={26 + i * 24}
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
                          {/* alt-action: direct attack — one sword per AP spent, stacked above the enemy */}
                          {atkAps.map((ap, k) => (
                            <Group
                              key={ap}
                              x={-10}
                              y={-25 - k * 13}
                              {...showTip(`attack — ${ap}⚡`, `attack ${'⚔'.repeat(ap)}`)}
                              onClick={(evt) => {
                                evt.cancelBubble = true;
                                store.dispatch({ kind: 'Attack', targetId: e.id, ap });
                              }}
                              onTap={(evt) => {
                                evt.cancelBubble = true;
                                store.dispatch({ kind: 'Attack', targetId: e.id, ap });
                              }}
                            >
                              <Rect width={ap * 7 + 5} height={11} cornerRadius={2} fill="#5a2020" stroke="#a05050" strokeWidth={0.5} />
                              <Text text={'†'.repeat(ap)} x={3} y={1} fontSize={11} fontStyle="bold" fill="#f0c0c0" />
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
                        h.detected ? 'In the open' : 'Hidden',
                        ...(h.idx === state.activeHeroIdx ? ['Active this turn'] : []),
                      ].join('\n');
                      return (
                        <Group key={h.idx} x={geom.w - 15 - i * 26} y={tokenY} {...showTip(heroTip)}>
                          {h.idx === state.activeHeroIdx && <Circle radius={13} stroke="#e8d44d" strokeWidth={1.5} />}
                          <Circle
                            radius={11}
                            fill={playerColor(h.idx)}
                            opacity={h.idx === state.activeHeroIdx ? 1 : 0.7}
                            stroke={h.detected ? '#3a4652' : '#e8fff0'}
                            strokeWidth={2.5}
                            dash={h.detected ? undefined : [3, 2]}
                          />
                          <Text text={classIcon(h.classId)} x={-11} y={-11} width={22} height={22} align="center" verticalAlign="middle" fontSize={14} fill="#14201a" />
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
                    <Group key={`bar${i}`} {...showTip(`${zoneLabel(e.a)} ↔ ${zoneLabel(e.b)} — needs ${e.requires}`)}>
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
