const SLOT_NAMES = Object.freeze({
  head: 'Head',
  body: 'Body',
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
  feet: 'Feet',
  accessory: 'Accessory'
});

const STAT_NAMES = Object.freeze({
  attack: 'Attack',
  defense: 'Defense',
  hp: 'Max HP',
  mp: 'Max MP',
  str: 'Strength',
  agility: 'Agility',
  mind: 'Mind',
  vitality: 'Vitality'
});

export function renderCharacterScreen({
  state,
  inDungeon = false,
  gearSlot = null,
  characterMode = 'gear',
  header,
  townStatus,
  esc,
  stats,
  groupedInventory,
  items,
  equipmentSlots,
  canEquipItem,
  itemMods,
  compareMarkup,
  compareEquipment,
  inventoryUsed,
  inventoryCapacity,
  questReservedQuantity,
  innEffectSummary,
  message = ''
}) {
  const compatibleSlotItems = slot => [...new Set(state.inventory.map(entry => entry.id))]
    .filter(id => items[id]?.slot === slot && canEquipItem(id, slot));

  if (gearSlot) {
    const label = SLOT_NAMES[gearSlot] || 'Equipment';
    const currentId = state.equipment[gearSlot];
    const current = items[currentId];
    const candidates = compatibleSlotItems(gearSlot).filter(id => id !== currentId);

    return `${header()}${townStatus(inDungeon)}<section class="town-service gear-slot-service"><div class="gear-slot-sticky"><button class="gear-back" data-gear-back aria-label="Back to Gear">← Back</button><span>${inDungeon ? 'Inventory & Gear' : 'Character'} · ${esc(label)}</span></div><div class="town-service-heading"><span class="service-emblem" aria-hidden="true">◈</span><div><p class="eyebrow">EQUIPMENT SLOT</p><h1 class="section-title">${esc(label)} Gear</h1></div></div><section class="gear-current"><small>CURRENT</small>${current ? `<b>${esc(current.name)}</b><span>${esc(itemMods(current))}</span><button data-unequip="${gearSlot}" ${state.combat ? 'disabled' : ''}>Unequip</button>` : '<b>Nothing</b>'}</section><h2 class="gear-available-heading">Available</h2><div class="gear-candidates">${candidates.map(id => {
      const item = items[id];
      const comparison = compareEquipment(id);
      const changes = Object.entries(comparison?.deltas || {}).map(([key, value]) => `<span class="delta ${value > 0 ? 'positive' : 'negative'}">${value > 0 ? '↑' : '↓'} ${value > 0 ? '+' : ''}${value} ${STAT_NAMES[key] || key}</span>`).join('');
      return `<article class="gear-candidate"><div><button class="shop-item-title" data-inspect="${id}">${esc(item.name)}</button><small>${esc(itemMods(item))}</small>${changes ? `<div class="gear-comparison">${changes}</div>` : '<small class="subtle">No stat changes</small>'}</div><button class="gear-equip" data-equip="${id}" ${state.combat || !canEquipItem(id, gearSlot) ? 'disabled' : ''}>Equip</button></article>`;
    }).join('') || `<p class="compact-empty">No other ${esc(label)} gear in your pack.</p>`}</div>${message && !message.startsWith('The town has posted') ? `<p class="notice" role="status">${esc(message)}</p>` : ''}</section>`;
  }

  const inventory = groupedInventory();
  const tab = characterMode;
  const tabs = `<div class="service-tabs character-tabs" role="tablist" aria-label="Character sections">${[['gear', 'GEAR'], ['pack', 'PACK'], ['stats', 'STATS']].map(([id, label]) => `<button role="tab" aria-selected="${tab === id}" class="${tab === id ? 'is-selected' : ''}" data-character-mode="${id}">${label}</button>`).join('')}</div>`;
  let content = '';

  if (tab === 'gear') {
    content = `<div class="character-summary">${stats()}</div><h2>Equipment</h2><div class="slot-grid">${equipmentSlots.map(slot => {
      const id = state.equipment[slot];
      const alternatives = compatibleSlotItems(slot).filter(candidate => candidate !== id).length;
      return `<button type="button" class="slot slot-picker" data-gear-slot="${slot}" aria-label="Choose ${SLOT_NAMES[slot]} gear"><small>${SLOT_NAMES[slot]}</small><b>${id ? esc(items[id]?.name || 'Unknown item') : 'Nothing equipped'}</b><small>${alternatives} ${alternatives === 1 ? 'alternative' : 'alternatives'}</small></button>`;
    }).join('')}</div>`;
  } else if (tab === 'pack') {
    content = `<h2>Pack · ${inventoryUsed()}/${inventoryCapacity()} slots</h2>${inventory.map(({ id, item, quantity, provenance }) => `<article class="item-row compact-item"><div><button class="shop-item-title" data-inspect="${id}">${esc(item.name)}</button><b> × ${quantity}</b>${provenance?.length ? `<small class="provenance">${esc(provenance.map(p => `${p.sourceName || p.sourceType || 'Found'} · Level ${p.acquiredFloor || '?'}`).join(' · '))}</small>` : ''}${item.slot ? `<small>${esc(itemMods(item))}</small>${compareMarkup(id)}` : ''}${questReservedQuantity(id) ? `<small class="unavailable-copy">${questReservedQuantity(id)} reserved for an active quest</small>` : ''}</div><div class="row item-actions">${item.slot ? `<button data-equip="${id}" ${!canEquipItem(id, item.slot) ? 'disabled' : ''}>Equip</button>` : ''}${item.effect ? `<button data-use="${id}">Use</button>` : ''}</div></article>`).join('') || '<p class="compact-empty">Nothing carried.</p>'}`;
  } else {
    content = `<div class="character-stats"><h2>${esc(state.player.name)} · Level ${state.player.level} ${esc(state.player.class)}</h2><div class="career-grid">${[['Strength', state.player.str], ['Agility', state.player.agi], ['Mind', state.player.mind], ['Vitality', state.player.vit], ['Attack', state.player.attack], ['Defense', state.player.defense], ['HP', `${state.player.hp}/${state.player.maxHp}`], ['MP', `${state.player.mp}/${state.player.maxMp}`], ['XP to next', Math.max(0, state.player.level * 25 - state.player.xp)]].map(([name, value]) => `<div><span>${name}</span><b>${value}</b></div>`).join('')}</div>${stats().includes('Well Rested') ? '' : innEffectSummary().map(effect => `<small class="town-status-effect">${esc(effect)}</small>`).join('')}</div>`;
  }

  return `${header()}${townStatus(inDungeon)}<section class="town-service character-service"><div class="town-service-heading"><span class="service-emblem" aria-hidden="true">◉</span><div><p class="eyebrow">${inDungeon ? 'BELOW TOWN · PACK CHECK' : 'TOWN · DELVER RECORD'}</p><h1 class="section-title">${inDungeon ? 'Inventory & Gear' : 'Character'}</h1></div></div>${tabs}<section class="character-content">${content}</section></section>`;
}
