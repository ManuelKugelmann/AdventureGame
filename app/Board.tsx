import { useMemo, useState } from 'react';
import { Stage, Layer, Group, Rect, Text, Line, Circle } from 'react-konva';
import {
  getCardDef,
  getHeroClassDef,
  type CardInstance,
  type Command,
  type ContentDB,
  type Row,
  type SectionDef,
} from '../engine/index';
import { useStore, legalForActive } from './store';

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
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  if (!content || !state) return <div className="board-empty">loading…</div>;

  const hero = state.heroes[state.activeHeroIdx];

  /** hover-tooltip handlers for any Konva shape (tip follows the cursor) */
  const showTip = (text: string) => ({
    onMouseEnter: (e: { evt: MouseEvent }) => setTip({ text, x: e.evt.clientX, y: e.evt.clientY }),
    onMouseMove: (e: { evt: MouseEvent }) => setTip({ text, x: e.evt.clientX, y: e.evt.clientY }),
    onMouseLeave: () => setTip(null),
  });

  const tryMove = (cardId: string, sectionId: string): void => {
    if (!hero || hero.cardId !== cardId) return;
    const stealth = legal.find((c) => c.kind === 'StealthMove' && c.route[0] === sectionId);
    const move = legal.find((c) => c.kind === 'MoveSection' && c.toSection === sectionId);
    const cmd: Command | undefined = store.sneak && stealth ? stealth : (move ?? stealth);
    if (cmd) store.dispatch(cmd);
  };

  const tryExit = (cardId: string, exitIdx: number): void => {
    if (!hero || hero.cardId !== cardId) return;
    const cmd = legal.find((c) => c.kind === 'CrossExit' && c.exitIdx === exitIdx);
    if (cmd) store.dispatch(cmd);
  };

  const cards = Object.values(state.cards);
  const minX = Math.min(...cards.map((c) => cardXY(c).x));
  const maxY = Math.max(...cards.map((c) => cardXY(c).y));
  const stageW = 900;
  const stageH = 560;

  return (
    <>
    <Stage
      width={stageW}
      height={stageH}
      draggable
      x={stageW / 2 - CARD_W / 2 - minX}
      y={stageH - CARD_H - 30 - maxY}
      className="board-stage"
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
                {...showTip(`${def.name} — alert ${card.alert}/3${card.alert === 0 ? ' (calm)' : ''}. Higher alert means harder stealth and more encounters. The dots at right show the level.`)}
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
                const exitTip = walled
                  ? 'This exit is walled off — the tile pool ran dry here.'
                  : `Exit to the ${exit.side} brick above${explored ? ' (already explored)' : ' — click to explore what lies beyond'}.`;
                // anchor to the left/right brick above, never centered — even for a lone full-width exit
                const exitX = exit.side === 'left' ? CARD_W * 0.25 : CARD_W * 0.75;
                return (
                  <Group key={exitIdx} x={exitX} y={geom.y - 6} {...showTip(exitTip)} onClick={() => tryExit(card.id, exitIdx)} onTap={() => tryExit(card.id, exitIdx)}>
                    <Line
                      points={walled ? [-10, 2, 10, 2] : [-9, 4, 0, -8, 9, 4]}
                      closed={!walled}
                      fill={walled ? undefined : explored ? '#7a8f7a' : '#c9a227'}
                      stroke={walled ? '#884444' : '#3a3'}
                      strokeWidth={walled ? 4 : 1}
                    />
                    {!walled && <Text text={`${exit.side === 'left' ? '↖' : '↗'}${explored ? '' : '?'}`} x={-8} y={-22} fontSize={13} fill="#c9c9a0" />}
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
                const zoneTip =
                  `${sDef.id}${sDef.hiding ? ' — hiding nook' : ''}: ` +
                  `${sDef.cover} cover (${COVER_HINT[sDef.cover]}); ` +
                  `chokepoint ${sDef.chokepoint} (${sDef.chokepoint}+ enemies here block movement through this zone)` +
                  (sDef.capacity ? `; holds up to ${sDef.capacity} occupant${sDef.capacity === 1 ? '' : 's'}` : '') +
                  (sDef.ambush ? '; may conceal an ambusher' : '') +
                  `. Click to move here.`;
                return (
                  <Group key={sDef.id} x={geom.x} y={geom.y} {...showTip(zoneTip)} onClick={() => tryMove(card.id, sDef.id)} onTap={() => tryMove(card.id, sDef.id)}>
                    <Rect
                      width={geom.w}
                      height={geom.h}
                      fill={sDef.hiding ? '#2b2e22' : COVER_FILL[sDef.cover]}
                      stroke={isActiveHere ? '#e8d44d' : sDef.hiding ? '#6b5a3a' : '#47543f'}
                      strokeWidth={isActiveHere ? 2.5 : 1}
                      cornerRadius={6}
                      dash={sDef.hiding ? [5, 3] : undefined}
                    />
                    <Text text={`${sDef.hiding ? '🌿 ' : ''}${sDef.id}`} x={5} y={4} fontSize={11} fill="#b8c4a8" width={geom.w - 10} ellipsis wrap="none" />
                    <Text text={`${COVER_GLYPH[sDef.cover]} · choke ${sDef.chokepoint}${sDef.capacity ? ` · cap ${sDef.capacity}` : ''}`} x={5} y={18} fontSize={10} fill="#8a967e" width={geom.w - 10} ellipsis wrap="none" />
                    {/* mystery slots */}
                    {sDef.slots.map((_, i) => (
                      <Text key={i} text="❖" x={5 + i * 16} y={32} fontSize={13} fill={slotStates[i] ? '#4e584e' : '#7ec8e3'} />
                    ))}
                    {/* enemies */}
                    {enemiesHere.map((e, i) => {
                      const eDef = content.enemies[e.defId];
                      const selected = store.selectedEnemyId === e.id;
                      const total = eDef?.states.length ?? 1;
                      const remaining = Math.max(0, total - e.stateIdx);
                      const stateName = eDef?.states[e.stateIdx]?.name ?? '?';
                      const enemyTip = e.sleeper
                        ? `${eDef?.name ?? e.defId} — dormant 💤. Neutral until disturbed; sneak past or strike first.`
                        : `${eDef?.name ?? e.defId} — ${stateName} (${remaining}/${total} health). Click to focus, then Attack from the same zone.`;
                      return (
                        <Group
                          key={e.id}
                          x={15 + i * 26}
                          y={tokenY}
                          {...showTip(enemyTip)}
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
                        </Group>
                      );
                    })}
                    {/* heroes */}
                    {heroesHere.map((h, i) => {
                      const hDef = getHeroClassDef(content, h.classId);
                      const heroTip = `Player ${h.idx + 1} — ${hDef.name}. HP ${h.hp}/${hDef.hp}, ${
                        h.detected ? 'detected by enemies' : 'hidden'
                      }${h.idx === state.activeHeroIdx ? '; active this turn' : ''}.`;
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
                    <Group key={`bar${i}`} {...showTip(`Barrier between ${e.a} and ${e.b}: requires ${e.requires}. No special-move ability exists yet, so it can't be crossed in v0.`)}>
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
    {tip && (
      <div className="board-tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
        {tip.text}
      </div>
    )}
    </>
  );
}
