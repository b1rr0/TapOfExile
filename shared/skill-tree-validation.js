"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAllocations = validateAllocations;
const skill_tree_1 = require("./skill-tree");
function validateAllocations(classId, level, allocated) {
    const errors = [];
    const tree = (0, skill_tree_1.buildSkillTree)();
    const startNodeId = (0, skill_tree_1.getClassStartNode)(classId);
    if (startNodeId < 0) {
        errors.push(`Unknown class: ${classId}`);
        return { valid: false, errors };
    }
    const allocSet = new Set(allocated);
    if (!allocSet.has(startNodeId)) {
        errors.push('Start node must be allocated');
    }
    for (const id of allocated) {
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 0 || id >= tree.nodes.length) {
            errors.push(`Invalid node ID: ${id}`);
        }
    }
    if (allocSet.has(startNodeId)) {
        const visited = new Set();
        const queue = [startNodeId];
        visited.add(startNodeId);
        while (queue.length > 0) {
            const cur = queue.shift();
            const node = tree.nodes[cur];
            if (!node)
                continue;
            for (const neighbor of node.connections) {
                if (!visited.has(neighbor) && allocSet.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        const disconnected = allocated.filter(id => id >= 0 && id < tree.nodes.length && !visited.has(id));
        if (disconnected.length > 0) {
            errors.push(`Disconnected nodes: ${disconnected.join(', ')}`);
        }
    }
    let outerCount = 0;
    let classSkillCount = 0;
    for (const id of allocated) {
        const node = tree.nodes[id];
        if (!node)
            continue;
        if (node.type === 'classSkill') {
            classSkillCount++;
        }
        else if (node.type !== 'start') {
            outerCount++;
        }
    }
    const maxOuter = Math.max(0, level - 1);
    if (outerCount > maxOuter) {
        errors.push(`Too many outer nodes: ${outerCount} > ${maxOuter}`);
    }
    if (classSkillCount > skill_tree_1.MAX_CLASS_SKILLS) {
        errors.push(`Too many class skills: ${classSkillCount} > ${skill_tree_1.MAX_CLASS_SKILLS}`);
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=skill-tree-validation.js.map