/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { HivemindConnection } from '@/agent/hivemind/HivemindConnection';
import { DEFAULT_HIVEMIND_CONFIG } from '@/agent/hivemind/types';
import { agentTeamsDb, messageBroker, taskExecutionRuntime, taskManager, teamCoordinator } from '@process/services/agentTeams';
import type { IAgentTask, IAgentTeammate, IAgentTeam, IAgentTeamMessage } from '@/common/ipcBridge';

const ok = <T>(data?: T) => ({ success: true, data });
const fail = (msg: string) => ({ success: false, msg });

export function initAgentTeamsBridge(): void {
  const boundTeams = new Set<string>();

  ipcBridge.agentTeams.createTeam.provider(async (params) => {
    try {
      const team = teamCoordinator.createTeam(params);
      ipcBridge.agentTeams.onTeamUpdate.emit({ team_id: team.id, team: team as IAgentTeam });
      return ok(team as IAgentTeam);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.getTeam.provider(async ({ team_id }) => {
    const team = agentTeamsDb.getTeam(team_id);
    if (!team) {
      return fail('Team not found');
    }
    return ok(team as IAgentTeam);
  });

  ipcBridge.agentTeams.listTeams.provider(async (params) => {
    const teams = agentTeamsDb.listTeams(params);
    for (const team of teams) {
      if (boundTeams.has(team.id)) {
        continue;
      }

      boundTeams.add(team.id);
      messageBroker.subscribeToMessages(team.id, (message) => {
        ipcBridge.agentTeams.onMessageReceived.emit({
          team_id: team.id,
          message: message as IAgentTeamMessage,
        });
      });
    }
    return ok(teams as IAgentTeam[]);
  });

  ipcBridge.agentTeams.updateTeam.provider(async ({ team_id, updates }) => {
    const team = agentTeamsDb.updateTeam(team_id, updates as any);
    if (!team) {
      return fail('Team not found');
    }

    ipcBridge.agentTeams.onTeamUpdate.emit({ team_id, team: team as IAgentTeam });
    return ok(team as IAgentTeam);
  });

  ipcBridge.agentTeams.deleteTeam.provider(async ({ team_id }) => {
    const success = agentTeamsDb.deleteTeam(team_id);
    return success ? ok({ success: true }) : fail('Team not found');
  });

  ipcBridge.agentTeams.startTeam.provider(async ({ team_id }) => {
    const team = teamCoordinator.startTeam(team_id);
    if (!team) {
      return fail('Team not found');
    }

    void taskExecutionRuntime.executeTeam(team_id).catch((error) => {
      console.error('[AgentTeamsBridge] executeTeam failed after startTeam:', error);
    });

    ipcBridge.agentTeams.onTeamUpdate.emit({ team_id, team: team as IAgentTeam });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.pauseTeam.provider(async ({ team_id }) => {
    const team = teamCoordinator.pauseTeam(team_id);
    if (!team) {
      return fail('Team not found');
    }

    ipcBridge.agentTeams.onTeamUpdate.emit({ team_id, team: team as IAgentTeam });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.completeTeam.provider(async ({ team_id }) => {
    const team = teamCoordinator.completeTeam(team_id);
    if (!team) {
      return fail('Team not found');
    }

    ipcBridge.agentTeams.onTeamUpdate.emit({ team_id, team: team as IAgentTeam });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.addTeammate.provider(async (params) => {
    try {
      const teammate = teamCoordinator.addTeammate(params);
      ipcBridge.agentTeams.onTeammateUpdate.emit({ team_id: teammate.team_id, teammate: teammate as IAgentTeammate });
      return ok(teammate as IAgentTeammate);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.getTeammate.provider(async ({ teammate_id }) => {
    const teammate = agentTeamsDb.getTeammate(teammate_id);
    if (!teammate) {
      return fail('Teammate not found');
    }

    return ok(teammate as IAgentTeammate);
  });

  ipcBridge.agentTeams.listTeammates.provider(async ({ team_id, status }) => {
    const teammates = agentTeamsDb.listTeammates(team_id, status as any);
    return ok(teammates as IAgentTeammate[]);
  });

  ipcBridge.agentTeams.updateTeammate.provider(async ({ teammate_id, updates }) => {
    const teammate = agentTeamsDb.updateTeammate(teammate_id, updates as any);
    if (!teammate) {
      return fail('Teammate not found');
    }

    ipcBridge.agentTeams.onTeammateUpdate.emit({ team_id: teammate.team_id, teammate: teammate as IAgentTeammate });
    return ok(teammate as IAgentTeammate);
  });

  ipcBridge.agentTeams.removeTeammate.provider(async ({ teammate_id }) => {
    const teammate = agentTeamsDb.getTeammate(teammate_id);
    const success = agentTeamsDb.removeTeammate(teammate_id);
    if (!teammate || !success) {
      return fail('Teammate not found');
    }

    ipcBridge.agentTeams.onTeammateUpdate.emit({
      team_id: teammate.team_id,
      teammate: { ...teammate, status: 'offline' } as IAgentTeammate,
    });

    return ok({ success: true });
  });

  ipcBridge.agentTeams.createTask.provider(async (params) => {
    try {
      const task = taskManager.createTask(params);
      ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: task as IAgentTask });
      teamCoordinator.scheduleAllReadyTasks(task.team_id);

      void taskExecutionRuntime.executeTeam(task.team_id).catch((error) => {
        console.error('[AgentTeamsBridge] executeTeam failed after createTask:', error);
      });

      return ok(task as IAgentTask);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.getTask.provider(async ({ task_id }) => {
    const task = agentTeamsDb.getTask(task_id);
    if (!task) {
      return fail('Task not found');
    }

    return ok(task as IAgentTask);
  });

  ipcBridge.agentTeams.listTasks.provider(async (params) => {
    const tasks = agentTeamsDb.listTasks(params as any);
    return ok(tasks as IAgentTask[]);
  });

  ipcBridge.agentTeams.updateTask.provider(async ({ task_id, updates }) => {
    const task = agentTeamsDb.updateTask(task_id, updates as any);
    if (!task) {
      return fail('Task not found');
    }

    ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: task as IAgentTask });
    return ok(task as IAgentTask);
  });

  ipcBridge.agentTeams.deleteTask.provider(async ({ task_id }) => {
    const task = agentTeamsDb.getTask(task_id);
    const success = agentTeamsDb.deleteTask(task_id);
    if (!task || !success) {
      return fail('Task not found');
    }

    ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: { ...task, status: 'cancelled' } as IAgentTask });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.assignTask.provider(async ({ task_id, teammate_id }) => {
    const task = taskManager.assignTask(task_id, teammate_id);
    if (!task) {
      return fail('Task or teammate not found');
    }

    void taskExecutionRuntime.executeTask(task.id).catch((error) => {
      console.error('[AgentTeamsBridge] executeTask failed after assignTask:', error);
    });

    ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: task as IAgentTask });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.startTask.provider(async ({ task_id }) => {
    try {
      const task = taskManager.startTask(task_id);
      if (!task) {
        return fail('Task not found');
      }

      void taskExecutionRuntime.executeTask(task.id).catch((error) => {
        console.error('[AgentTeamsBridge] executeTask failed after startTask:', error);
      });

      ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: task as IAgentTask });
      return ok({ success: true });
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.completeTask.provider(async ({ task_id, result }) => {
    const task = teamCoordinator.handleTaskCompletion(task_id, result);
    if (!task) {
      return fail('Task not found');
    }

    ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: task as IAgentTask });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.failTask.provider(async ({ task_id, error }) => {
    const task = teamCoordinator.handleTaskFailure(task_id, error);
    if (!task) {
      return fail('Task not found');
    }

    ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: task as IAgentTask });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.cancelTask.provider(async ({ task_id }) => {
    const task = taskManager.cancelTask(task_id);
    if (!task) {
      return fail('Task not found');
    }

    ipcBridge.agentTeams.onTaskUpdate.emit({ team_id: task.team_id, task: task as IAgentTask });
    return ok({ success: true });
  });

  ipcBridge.agentTeams.addDependency.provider(async ({ task_id, depends_on_task_id, dependency_type }) => {
    try {
      agentTeamsDb.addDependency({ task_id, depends_on_task_id, dependency_type: dependency_type as any });
      return ok({ success: true });
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.removeDependency.provider(async ({ task_id, depends_on_task_id }) => {
    const success = agentTeamsDb.removeDependency(task_id, depends_on_task_id);
    return success ? ok({ success: true }) : fail('Dependency not found');
  });

  ipcBridge.agentTeams.getTaskDependencies.provider(async ({ task_id }) => {
    return ok(agentTeamsDb.getTaskDependencies(task_id));
  });

  ipcBridge.agentTeams.sendMessage.provider(async (params) => {
    try {
      const message = messageBroker.sendMessage(params as any);
      ipcBridge.agentTeams.onMessageReceived.emit({ team_id: message.team_id, message: message as IAgentTeamMessage });
      return ok(message as IAgentTeamMessage);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.getMessages.provider(async (params) => {
    const messages = messageBroker.getMessages(params as any);
    return ok(messages as IAgentTeamMessage[]);
  });

  ipcBridge.agentTeams.runTask.provider(async ({ task_id }) => {
    try {
      const result = await taskExecutionRuntime.executeTask(task_id);
      return ok(result);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.runTeam.provider(async ({ team_id }) => {
    try {
      const result = await taskExecutionRuntime.executeTeam(team_id);
      return ok(result);
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  });

  ipcBridge.agentTeams.getTeamStats.provider(async ({ team_id }) => {
    return ok(agentTeamsDb.getTeamStats(team_id));
  });

  ipcBridge.agentTeams.getCostAnalysis.provider(async ({ team_id }) => {
    return ok(agentTeamsDb.getCostAnalysis(team_id));
  });

  // Team Chat: send messages through Gateway API and stream responses back
  const teamChatConnection = new HivemindConnection({
    ...DEFAULT_HIVEMIND_CONFIG,
    streaming: true,
  });

  ipcBridge.agentTeams.teamChat.send.provider(async ({ team_id, message, provider, model, files }) => {
    const msg_id = `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Emit start event
    ipcBridge.agentTeams.teamChat.responseStream.emit({
      team_id,
      conversation_id: team_id,
      type: 'start',
      msg_id,
    } as any);

    // Also record in MessageBroker for team audit
    try {
      messageBroker.sendMessage({
        team_id,
        type: 'broadcast',
        content: message,
        from_teammate_id: null,
      } as any);
    } catch {
      // Non-critical: audit logging failure shouldn't block chat
    }

    // Fire and forget the streaming request
    void teamChatConnection.askStream(
      message,
      {
        onChunk: (chunk) => {
          ipcBridge.agentTeams.teamChat.responseStream.emit({
            team_id,
            conversation_id: team_id,
            type: 'text',
            msg_id,
            data: chunk.content,
          } as any);

          if (chunk.thinking) {
            ipcBridge.agentTeams.teamChat.responseStream.emit({
              team_id,
              conversation_id: team_id,
              type: 'thought',
              msg_id,
              data: { subject: 'Thinking', description: chunk.thinking },
            } as any);
          }
        },
        onDone: (fullResponse, resolvedProvider, summary) => {
          // Record AI response in MessageBroker
          try {
            messageBroker.sendMessage({
              team_id,
              type: 'broadcast',
              content: fullResponse,
              from_teammate_id: null,
              metadata: JSON.stringify({ provider: resolvedProvider, ...summary }),
            } as any);
          } catch {
            // Non-critical
          }

          ipcBridge.agentTeams.teamChat.responseStream.emit({
            team_id,
            conversation_id: team_id,
            type: 'agent_status',
            msg_id,
            data: {
              backend: resolvedProvider,
              cached: summary.cached,
              latencyMs: summary.latencyMs,
            },
          } as any);

          ipcBridge.agentTeams.teamChat.responseStream.emit({
            team_id,
            conversation_id: team_id,
            type: 'finish',
            msg_id,
          } as any);
        },
        onError: (error) => {
          ipcBridge.agentTeams.teamChat.responseStream.emit({
            team_id,
            conversation_id: team_id,
            type: 'error',
            msg_id,
            data: error.message,
          } as any);
        },
      },
      provider,
      files,
      model,
    );

    return ok({ msg_id });
  });
}
