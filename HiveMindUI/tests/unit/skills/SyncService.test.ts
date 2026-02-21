import { describe, expect, it } from '@jest/globals';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { SymlinkManager } from '@/process/services/skills/SymlinkManager';
import { SyncService } from '@/process/services/skills/SyncService';

type SkillRow = {
  id: string;
  file_path: string;
  updated_at: number;
};

type ToolRow = {
  id: string;
  name: string;
  display_name: string;
  type: string;
  skills_path: string;
  enabled: number;
  detected: number;
};

type MappingRow = {
  id: string;
  skill_id: string;
  tool_id: string;
  enabled: number;
  synced: number;
  symlink_path: string | null;
  synced_at: number | null;
  sync_error: string | null;
  created_at: number;
  updated_at: number;
};

type Statement = {
  run: (...args: any[]) => { changes: number };
  get: (...args: any[]) => any;
  all: (...args: any[]) => any[];
};

const normalizeSql = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const createFakeDb = (seed: { skills: SkillRow[]; tools: ToolRow[]; mappings?: MappingRow[] }) => {
  const skills = [...seed.skills];
  const tools = [...seed.tools];
  const mappings = [...(seed.mappings || [])];

  const getMapping = (skillId: string, toolId: string): MappingRow | undefined => mappings.find((mapping) => mapping.skill_id === skillId && mapping.tool_id === toolId);

  const getJoinRow = (skillId: string, toolId: string) => {
    const mapping = getMapping(skillId, toolId);
    if (!mapping) {
      return undefined;
    }

    const tool = tools.find((item) => item.id === toolId);
    const skill = skills.find((item) => item.id === skillId);
    if (!tool || !skill) {
      return undefined;
    }

    return {
      ...mapping,
      tool_skills_path: tool.skills_path,
      tool_enabled: tool.enabled,
      tool_detected: tool.detected,
      skill_file_path: skill.file_path,
    };
  };

  const prepare = (rawSql: string): Statement => {
    const sql = normalizeSql(rawSql);

    if (sql === 'SELECT * FROM ai_tools ORDER BY name ASC') {
      return {
        run: () => ({ changes: 0 }),
        get: () => null,
        all: () => [...tools].sort((left, right) => left.name.localeCompare(right.name)),
      };
    }

    if (sql === 'SELECT * FROM skills ORDER BY updated_at DESC') {
      return {
        run: () => ({ changes: 0 }),
        get: () => null,
        all: () => [...skills].sort((left, right) => right.updated_at - left.updated_at),
      };
    }

    if (sql === 'SELECT * FROM skill_tool_mapping WHERE skill_id = ? AND tool_id = ?') {
      return {
        run: () => ({ changes: 0 }),
        get: (skillId: string, toolId: string) => getMapping(skillId, toolId),
        all: () => [],
      };
    }

    if (sql.includes('INSERT INTO skill_tool_mapping')) {
      return {
        run: (id: string, skillId: string, toolId: string, createdAt: number, updatedAt: number) => {
          mappings.push({
            id,
            skill_id: skillId,
            tool_id: toolId,
            enabled: 1,
            synced: 0,
            symlink_path: null,
            synced_at: null,
            sync_error: null,
            created_at: createdAt,
            updated_at: updatedAt,
          });
          return { changes: 1 };
        },
        get: () => null,
        all: () => [],
      };
    }

    if (sql === 'UPDATE skill_tool_mapping SET enabled = 1, updated_at = ? WHERE skill_id = ? AND tool_id = ?') {
      return {
        run: (updatedAt: number, skillId: string, toolId: string) => {
          const mapping = getMapping(skillId, toolId);
          if (!mapping) {
            return { changes: 0 };
          }
          mapping.enabled = 1;
          mapping.updated_at = updatedAt;
          return { changes: 1 };
        },
        get: () => null,
        all: () => [],
      };
    }

    if (sql === 'SELECT symlink_path FROM skill_tool_mapping WHERE skill_id = ? AND tool_id = ?') {
      return {
        run: () => ({ changes: 0 }),
        get: (skillId: string, toolId: string) => {
          const mapping = getMapping(skillId, toolId);
          return mapping ? { symlink_path: mapping.symlink_path } : undefined;
        },
        all: () => [],
      };
    }

    if (sql === 'UPDATE skill_tool_mapping SET enabled = 0, synced = 0, symlink_path = NULL, sync_error = NULL, updated_at = ? WHERE skill_id = ? AND tool_id = ?') {
      return {
        run: (updatedAt: number, skillId: string, toolId: string) => {
          const mapping = getMapping(skillId, toolId);
          if (!mapping) {
            return { changes: 0 };
          }
          mapping.enabled = 0;
          mapping.synced = 0;
          mapping.symlink_path = null;
          mapping.sync_error = null;
          mapping.updated_at = updatedAt;
          return { changes: 1 };
        },
        get: () => null,
        all: () => [],
      };
    }

    if (sql.includes('FROM skill_tool_mapping m JOIN ai_tools t ON t.id = m.tool_id JOIN skills s ON s.id = m.skill_id WHERE m.enabled = 1 AND t.enabled = 1')) {
      return {
        run: () => ({ changes: 0 }),
        get: () => null,
        all: () =>
          mappings
            .filter((mapping) => mapping.enabled === 1)
            .map((mapping) => getJoinRow(mapping.skill_id, mapping.tool_id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
            .filter((row) => row.tool_enabled === 1),
      };
    }

    if (sql.includes('FROM skill_tool_mapping m JOIN ai_tools t ON t.id = m.tool_id JOIN skills s ON s.id = m.skill_id WHERE m.skill_id = ? AND m.tool_id = ?')) {
      return {
        run: () => ({ changes: 0 }),
        get: (skillId: string, toolId: string) => getJoinRow(skillId, toolId),
        all: () => [],
      };
    }

    if (sql.includes('SET synced = 1, symlink_path = ?, synced_at = ?, sync_error = NULL, updated_at = ?')) {
      return {
        run: (symlinkPath: string, syncedAt: number, updatedAt: number, skillId: string, toolId: string) => {
          const mapping = getMapping(skillId, toolId);
          if (!mapping) {
            return { changes: 0 };
          }
          mapping.synced = 1;
          mapping.symlink_path = symlinkPath;
          mapping.synced_at = syncedAt;
          mapping.sync_error = null;
          mapping.updated_at = updatedAt;
          return { changes: 1 };
        },
        get: () => null,
        all: () => [],
      };
    }

    if (sql.includes('SET synced = 0, sync_error = ?, updated_at = ?')) {
      return {
        run: (syncError: string, updatedAt: number, skillId: string, toolId: string) => {
          const mapping = getMapping(skillId, toolId);
          if (!mapping) {
            return { changes: 0 };
          }
          mapping.synced = 0;
          mapping.sync_error = syncError;
          mapping.updated_at = updatedAt;
          return { changes: 1 };
        },
        get: () => null,
        all: () => [],
      };
    }

    if (sql.includes('SELECT m.symlink_path FROM skill_tool_mapping m WHERE m.skill_id = ? AND m.tool_id = ?')) {
      return {
        run: () => ({ changes: 0 }),
        get: (skillId: string, toolId: string) => {
          const mapping = getMapping(skillId, toolId);
          return mapping ? { symlink_path: mapping.symlink_path } : undefined;
        },
        all: () => [],
      };
    }

    if (sql === 'UPDATE skill_tool_mapping SET synced = 0, symlink_path = NULL, sync_error = NULL, updated_at = ? WHERE skill_id = ? AND tool_id = ?') {
      return {
        run: (updatedAt: number, skillId: string, toolId: string) => {
          const mapping = getMapping(skillId, toolId);
          if (!mapping) {
            return { changes: 0 };
          }
          mapping.synced = 0;
          mapping.symlink_path = null;
          mapping.sync_error = null;
          mapping.updated_at = updatedAt;
          return { changes: 1 };
        },
        get: () => null,
        all: () => [],
      };
    }

    if (sql.includes('SELECT tool_id, enabled, synced, symlink_path, sync_error FROM skill_tool_mapping WHERE skill_id = ? ORDER BY tool_id ASC')) {
      return {
        run: () => ({ changes: 0 }),
        get: () => null,
        all: (skillId: string) =>
          mappings
            .filter((mapping) => mapping.skill_id === skillId)
            .sort((left, right) => left.tool_id.localeCompare(right.tool_id))
            .map((mapping) => ({
              tool_id: mapping.tool_id,
              enabled: mapping.enabled,
              synced: mapping.synced,
              symlink_path: mapping.symlink_path,
              sync_error: mapping.sync_error,
            })),
      };
    }

    if (sql === 'SELECT COUNT(*) as cnt FROM skills') {
      return {
        run: () => ({ changes: 0 }),
        get: () => ({ cnt: skills.length }),
        all: () => [],
      };
    }

    if (sql === 'SELECT COUNT(*) as cnt FROM skill_tool_mapping WHERE synced = 1') {
      return {
        run: () => ({ changes: 0 }),
        get: () => ({ cnt: mappings.filter((mapping) => mapping.synced === 1).length }),
        all: () => [],
      };
    }

    if (sql === "SELECT COUNT(*) as cnt FROM skill_tool_mapping WHERE sync_error IS NOT NULL AND sync_error != ''") {
      return {
        run: () => ({ changes: 0 }),
        get: () => ({ cnt: mappings.filter((mapping) => Boolean(mapping.sync_error)).length }),
        all: () => [],
      };
    }

    return {
      run: () => {
        throw new Error(`Unsupported SQL in SyncService test fake DB: ${sql}`);
      },
      get: () => {
        throw new Error(`Unsupported SQL in SyncService test fake DB: ${sql}`);
      },
      all: () => {
        throw new Error(`Unsupported SQL in SyncService test fake DB: ${sql}`);
      },
    };
  };

  return {
    prepare,
  };
};

const makeTempDir = async (): Promise<string> => fs.mkdtemp(path.join(os.tmpdir(), 'hm-sync-'));

const createSeed = (toolSkillsPath: string) => {
  const now = Date.now();

  return {
    skills: [
      {
        id: 'skill-1',
        file_path: 'demo-skill',
        updated_at: now,
      },
    ],
    tools: [
      {
        id: 'tool-1',
        name: 'claude-code',
        display_name: 'Claude Code',
        type: 'builtin',
        skills_path: toolSkillsPath,
        enabled: 1,
        detected: 1,
      },
    ],
    mappings: [] as MappingRow[],
  };
};

describe('SyncService', () => {
  it('supports sync -> edit reflection -> unsync flow', async () => {
    const root = await makeTempDir();
    const skillsRootPath = path.join(root, 'skills-root');
    const toolSkillsPath = path.join(root, 'tool-skills');

    const skillFolder = path.join(skillsRootPath, 'demo-skill');
    await fs.mkdir(skillFolder, { recursive: true });
    await fs.writeFile(path.join(skillFolder, 'SKILL.md'), 'v1', 'utf8');

    const db = createFakeDb(createSeed(toolSkillsPath)) as any;
    const service = new SyncService(db, skillsRootPath, new SymlinkManager());

    await service.setMappingEnabled('skill-1', 'tool-1', true);
    const results = await service.executeAll();
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);

    const linkedSkillPath = path.join(toolSkillsPath, 'demo-skill');
    const stat = await fs.lstat(linkedSkillPath);
    expect(stat.isSymbolicLink()).toBe(true);
    expect(await fs.readFile(path.join(linkedSkillPath, 'SKILL.md'), 'utf8')).toBe('v1');

    await fs.writeFile(path.join(skillFolder, 'SKILL.md'), 'v2', 'utf8');
    expect(await fs.readFile(path.join(linkedSkillPath, 'SKILL.md'), 'utf8')).toBe('v2');

    expect(service.status()).toEqual({ totalSkills: 1, syncedSkills: 1, errors: 0 });

    await service.unsync('skill-1', 'tool-1');
    await expect(fs.lstat(linkedSkillPath)).rejects.toBeTruthy();

    const mapping = service.getMappingsForSkill('skill-1');
    expect(mapping[0]).toMatchObject({
      tool_id: 'tool-1',
      enabled: 1,
      synced: 0,
      symlink_path: null,
      sync_error: null,
    });
  });

  it('removes symlink immediately when mapping gets disabled', async () => {
    const root = await makeTempDir();
    const skillsRootPath = path.join(root, 'skills-root');
    const toolSkillsPath = path.join(root, 'tool-skills');

    const skillFolder = path.join(skillsRootPath, 'demo-skill');
    await fs.mkdir(skillFolder, { recursive: true });
    await fs.writeFile(path.join(skillFolder, 'SKILL.md'), 'content', 'utf8');

    const db = createFakeDb(createSeed(toolSkillsPath)) as any;
    const service = new SyncService(db, skillsRootPath, new SymlinkManager());

    await service.setMappingEnabled('skill-1', 'tool-1', true);
    await service.executeOne('skill-1', 'tool-1');

    const linkedSkillPath = path.join(toolSkillsPath, 'demo-skill');
    expect((await fs.lstat(linkedSkillPath)).isSymbolicLink()).toBe(true);

    await service.setMappingEnabled('skill-1', 'tool-1', false);

    await expect(fs.lstat(linkedSkillPath)).rejects.toBeTruthy();
    const mapping = service.getMappingsForSkill('skill-1');
    expect(mapping[0]).toMatchObject({
      tool_id: 'tool-1',
      enabled: 0,
      synced: 0,
      symlink_path: null,
      sync_error: null,
    });
  });

  it('returns friendly result when tool is not detected', async () => {
    const root = await makeTempDir();
    const skillsRootPath = path.join(root, 'skills-root');
    const toolSkillsPath = path.join(root, 'tool-skills');

    const skillFolder = path.join(skillsRootPath, 'demo-skill');
    await fs.mkdir(skillFolder, { recursive: true });
    await fs.writeFile(path.join(skillFolder, 'SKILL.md'), 'content', 'utf8');

    const seed = createSeed(toolSkillsPath);
    seed.tools[0].detected = 0;

    const db = createFakeDb(seed) as any;
    const service = new SyncService(db, skillsRootPath, new SymlinkManager());

    await service.setMappingEnabled('skill-1', 'tool-1', true);
    const results = await service.executeAll();

    expect(results).toEqual([
      {
        skill_id: 'skill-1',
        tool_id: 'tool-1',
        success: false,
        error: 'Tool not detected',
      },
    ]);
  });
});
