import { useMemo } from 'react';
import { Stage, Layer, Group, Rect, Text, Line, Circle } from 'react-konva';
import {
  getCardDef,
  type CardInstance,
  type Command,
  type ContentDB,
} from '../engine/index';
import { useStore, legalForActive } from './store';

const CARD_W = 300;
const CARD_H = 170;
const GAP = 26;
const SECTION_PAD = 8;

const COVER_GLYPH = { open: '○ open', partial: '◐ partial', covered: '● covered' } as const;
const COVER_FILL = { open: '#3b3f2e', partial: '#33402f', covered: '#28372f' } as const;
const ALERT_COLORS = ['#4a5a4a', '#c9a227', '#d9702b', '#cc3333'] as const;

function cardXY(card: CardInstance): { x: number; y: number } {
  return { x: (card.col + card.row * 0.5) * (CARD_W + GAP), y: -card.row * (CARD_H + GAP) };
}

interface SectionGeom {
  sectionId: string;
  x: number;
  w: number;
}

function sectionGeoms(content: ContentDB, card: CardInstance): SectionGeom[] {
  const def = getCardDef(content, card.defId);
  const n = def.sections.length;
  const w = (CARD_W - SECTION_PAD * (n + 1)) / n;
  return def.sections.map((s, i) => ({ sectionId: s.id, x: SECTION_PAD + i * (w + SECTION_PAD), w }));
}

export function Board(): JSX.Element {
  const store = useStore();
  const { content, state } = store;
  const legal = useMemo(() => legalForActive(store), [store]);
  if (!content || !state) return <div className="board-empty">loading…</div>;

  const hero = state.heroes[state.activeHeroIdx];

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
              <Text text={def.name} x={10} y={6} fontSize={14} fontStyle="bold" fill="#d8d2b8" />
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
              {/* exits */}
              {def.topExits.map((exit, exitIdx) => {
                const geom = geoms.find((g) => g.sectionId === exit.section);
                if (!geom) return null;
                const walled = card.blockedExits.includes(exitIdx);
                const explored = card.exploredExits[exitIdx] !== undefined;
                return (
                  <Group key={exitIdx} x={geom.x + geom.w / 2} y={0} onClick={() => tryExit(card.id, exitIdx)} onTap={() => tryExit(card.id, exitIdx)}>
                    <Line
                      points={walled ? [-10, 2, 10, 2] : [-9, 4, 0, -8, 9, 4]}
                      closed={!walled}
                      fill={walled ? undefined : explored ? '#7a8f7a' : '#c9a227'}
                      stroke={walled ? '#884444' : '#3a3'}
                      strokeWidth={walled ? 4 : 1}
                    />
                    {!walled && <Text text={explored ? '↑' : '↑?'} x={-8} y={-26} fontSize={13} fill="#c9c9a0" />}
                  </Group>
                );
              })}
              {/* sections */}
              {geoms.map((geom) => {
                const sDef = def.sections.find((s) => s.id === geom.sectionId);
                if (!sDef) return null;
                const heroesHere = state.heroes.filter((h) => !h.downed && h.cardId === card.id && h.section === geom.sectionId);
                const enemiesHere = Object.values(state.enemies)
                  .filter((e) => e.cardId === card.id && e.section === geom.sectionId)
                  .sort((a, b) => a.id.localeCompare(b.id));
                const slotStates = sDef.slots.map((_, i) => !!card.usedSlots[`${geom.sectionId}:${i}`]);
                const isActiveHere = hero && hero.cardId === card.id && hero.section === geom.sectionId;
                return (
                  <Group key={geom.sectionId} x={geom.x} y={28} onClick={() => tryMove(card.id, geom.sectionId)} onTap={() => tryMove(card.id, geom.sectionId)}>
                    <Rect
                      width={geom.w}
                      height={CARD_H - 38}
                      fill={COVER_FILL[sDef.cover]}
                      stroke={isActiveHere ? '#e8d44d' : '#47543f'}
                      strokeWidth={isActiveHere ? 2.5 : 1}
                      cornerRadius={6}
                    />
                    <Text text={geom.sectionId} x={5} y={5} fontSize={11} fill="#b8c4a8" width={geom.w - 10} ellipsis wrap="none" />
                    <Text text={`${COVER_GLYPH[sDef.cover]}  ⋔${sDef.chokepoint}`} x={5} y={20} fontSize={10} fill="#8a967e" />
                    {/* mystery slots */}
                    {sDef.slots.map((_, i) => (
                      <Text key={i} text="❖" x={5 + i * 16} y={36} fontSize={13} fill={slotStates[i] ? '#4e584e' : '#7ec8e3'} />
                    ))}
                    {/* enemies */}
                    {enemiesHere.map((e, i) => {
                      const eDef = content.enemies[e.defId];
                      const selected = store.selectedEnemyId === e.id;
                      return (
                        <Group
                          key={e.id}
                          x={16 + i * 30}
                          y={78}
                          onClick={(evt) => {
                            evt.cancelBubble = true;
                            store.selectEnemy(selected ? undefined : e.id);
                          }}
                          onTap={(evt) => {
                            evt.cancelBubble = true;
                            store.selectEnemy(selected ? undefined : e.id);
                          }}
                        >
                          <Circle radius={12} fill={e.sleeper ? '#4e4668' : '#7d3434'} stroke={selected ? '#e8d44d' : '#222'} strokeWidth={selected ? 3 : 1} />
                          <Text text={e.sleeper ? '💤' : (eDef?.name[0] ?? '?')} x={-5} y={-6} fontSize={11} fill="#e8dcc8" />
                          <Text text={'♥'.repeat(Math.max(0, (eDef?.states.length ?? 1) - e.stateIdx))} x={-12} y={14} fontSize={9} fill="#d98080" />
                        </Group>
                      );
                    })}
                    {/* heroes */}
                    {heroesHere.map((h, i) => (
                      <Group key={h.idx} x={geom.w - 18 - i * 28} y={78}>
                        <Circle
                          radius={12}
                          fill={h.idx === state.activeHeroIdx ? '#2d6a4f' : '#40556a'}
                          stroke={h.detected ? '#cc3333' : '#88b088'}
                          strokeWidth={2.5}
                          dash={h.detected ? undefined : [3, 3]}
                        />
                        <Text text={`${h.idx + 1}`} x={-4} y={-7} fontSize={13} fontStyle="bold" fill="#fff" />
                      </Group>
                    ))}
                  </Group>
                );
              })}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
