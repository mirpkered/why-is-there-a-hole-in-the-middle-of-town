export const questObjectiveTemplates={
  kill:{fields:['monsterId|family','quantity','minDepth','maxDepth']},
  collect:{fields:['itemId','quantity']},
  discover:{fields:['roomId|eventId|landmarkId']},
  reach:{fields:['floor']},
  return:{fields:['afterObjective']},
  trade:{fields:['npcId','tradeId']},
  survive:{fields:['monsterId|family','returnRequired']}
};

export function validateQuestTemplate(template,content){
  const issues=[];if(!template||!questObjectiveTemplates[template.type])return ['Unknown objective template type.'];
  const {monsters={},items={},rooms={},events={},landmarks=[],npcs={},trades={},maxPlayableDepth=3}=content||{};
  if(['kill','survive','collect'].includes(template.type)&&(!Number.isInteger(template.quantity)||template.quantity<1))issues.push('Quantity must be a positive integer.');
  const minDepth=template.minDepth??1,maxDepth=template.maxDepth??maxPlayableDepth;
  if(!Number.isInteger(minDepth)||!Number.isInteger(maxDepth)||minDepth<1||maxDepth<minDepth||maxDepth>maxPlayableDepth)issues.push('Depth range is outside currently playable content.');
  if(['kill','survive'].includes(template.type)&&template.monsterId){const monster=Object.values(monsters).find(candidate=>candidate.id===template.monsterId);if(!monster)issues.push(`Unknown monster target: ${template.monsterId}.`);else if(monster.minDepth>maxDepth)issues.push(`Monster ${template.monsterId} is not available in the requested depth range.`)}
  if(template.family){const familyMembers=(content?.families||{})[template.family]||[];if(!familyMembers.some(id=>Object.values(monsters).some(monster=>monster.id===id&&monster.minDepth<=maxDepth)))issues.push(`Unknown or unavailable monster family: ${template.family}.`)}
  if(template.type==='collect'&&!items[template.itemId])issues.push(`Unknown item target: ${template.itemId}.`);
  if(template.type==='discover'&&!rooms[template.roomId]&&!events[template.eventId]&&!landmarks.includes(template.landmarkId))issues.push('Discovery target is not present in playable content.');
  if(template.type==='reach'&&(!Number.isInteger(template.floor)||template.floor<1||template.floor>maxPlayableDepth))issues.push('Reach target is outside playable depth.');
  if(template.type==='trade'&&(!npcs[template.npcId]||!trades[template.tradeId]||trades[template.tradeId]?.npcId!==template.npcId))issues.push('Trade target is not reachable in current content.');
  if(template.type==='return'&&!template.afterObjective)issues.push('Return objectives must refer to a prior objective.');
  return issues;
}
