export function buildDescendantZoneSet(zones, targetName) {
  const target = zones.find((z) => z.name === targetName);
  if (!target) throw new Error(`Zone not found by name: "${targetName}"`);

  const childrenMap = new Map();
  for (const z of zones) {
    if (!childrenMap.has(z.parentId)) childrenMap.set(z.parentId, []);
    childrenMap.get(z.parentId).push(z.zoneId);
  }

  const set = new Set([target.zoneId]);
  const stack = [target.zoneId];
  

  while (stack.length) {
    const cur = stack.pop();
    const kids = childrenMap.get(cur) || [];
    for (const k of kids) {
      if (!set.has(k)) {
        set.add(k);
        stack.push(k);
      }
    }
  }

  return { rootZoneId: target.zoneId, zoneIds: set };
}
