/**
 * Skill Tree Validation - shared between FE (pre-validation) and BE (authoritative).
 *
 * Validates that a set of allocated node IDs forms a valid skill tree:
 * 1. Start node must be allocated
 * 2. All IDs must be valid node indices
 * 3. All allocated nodes must be connected to start via other allocated nodes (BFS)
 * 4. Points budget: outer nodes <= level - 1, class skills <= MAX_CLASS_SKILLS
 */

import { buildSkillTree, getClassStartNode, getMaxClassSkills } from './skill-tree';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a set of allocated node IDs for a given class and level.
 *
 * @param classId   - character class (samurai, warrior, mage, archer)
 * @param level     - current character level
 * @param allocated - array of allocated node IDs
 */
export function validateAllocations(
  classId: string,
  level: number,
  allocated: number[],
): ValidationResult {
  const errors: string[] = [];
  const tree = buildSkillTree(); // cached, deterministic (seed=42)
  const startNodeId = getClassStartNode(classId);

  if (startNodeId < 0) {
    errors.push(`Unknown class: ${classId}`);
    return { valid: false, errors };
  }

  const allocSet = new Set(allocated);

  // 1. Start node must be allocated
  if (!allocSet.has(startNodeId)) {
    errors.push('Start node must be allocated');
  }

  // 2. All IDs must be valid
  for (const id of allocated) {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0 || id >= tree.nodes.length) {
      errors.push(`Invalid node ID: ${id}`);
    }
  }

  // 3. Graph connectivity - BFS from start node
  if (allocSet.has(startNodeId)) {
    const visited = new Set<number>();
    const queue: number[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const node = tree.nodes[cur];
      if (!node) continue;
      for (const neighbor of node.connections) {
        if (!visited.has(neighbor) && allocSet.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const disconnected = allocated.filter(
      id => id >= 0 && id < tree.nodes.length && !visited.has(id),
    );
    if (disconnected.length > 0) {
      errors.push(`Disconnected nodes: ${disconnected.join(', ')}`);
    }
  }

  // 4. Points budget
  let outerCount = 0;
  let classSkillCount = 0;  // classSkill (connectors) + activeSkill (skill nodes)
  let activeSkillCount = 0; // only activeSkill nodes (for level-gating)
  for (const id of allocated) {
    const node = tree.nodes[id];
    if (!node) continue;
    if (node.type === 'classSkill' || node.type === 'activeSkill') {
      classSkillCount++;
      if (node.type === 'activeSkill') activeSkillCount++;
    } else if (node.type !== 'start') {
      outerCount++;
    }
  }

  const maxOuter = Math.max(0, level - 1);
  if (outerCount > maxOuter) {
    errors.push(`Too many outer nodes: ${outerCount} > ${maxOuter}`);
  }
  const maxClassSkills = getMaxClassSkills(level);
  if (classSkillCount > maxClassSkills) {
    errors.push(`Too many class skills: ${classSkillCount} > ${maxClassSkills}`);
  }

  // 5. Active skill budget: 0 by default, scales with level, 8 by level 45
  // Skills themselves have no level requirement - only the count is gated.
  const maxActiveSkills = Math.min(8, Math.floor(level * 8 / 45));
  if (activeSkillCount > maxActiveSkills) {
    errors.push(`Too many active skills for level ${level}: ${activeSkillCount} > ${maxActiveSkills}`);
  }

  return { valid: errors.length === 0, errors };
}
