import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLoader from './components/AppLoader';
import { useAuth } from './context/AuthContext';

// Route-level code splitting for better initial load performance
// Each page is loaded on-demand, reducing initial bundle size
const Conversation = lazy(() => import('./pages/conversation'));
const Guid = lazy(() => import('./pages/guid'));
const About = lazy(() => import('./pages/settings/About'));
const AgentSettings = lazy(() => import('./pages/settings/AgentSettings'));
const DisplaySettings = lazy(() => import('./pages/settings/DisplaySettings'));
const GeminiSettings = lazy(() => import('./pages/settings/GeminiSettings'));
const ModeSettings = lazy(() => import('./pages/settings/ModeSettings'));
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'));
const SystemSettings = lazy(() => import('./pages/settings/SystemSettings'));
const ToolsSettings = lazy(() => import('./pages/settings/ToolsSettings'));
const WebuiSettings = lazy(() => import('./pages/settings/WebuiSettings'));
const HivemindSettings = lazy(() => import('./pages/settings/HivemindSettings'));
const LoginPage = lazy(() => import('./pages/login'));
const ComponentsShowcase = lazy(() => import('./pages/test/ComponentsShowcase'));
const MonitorLayout = lazy(() => import('./pages/monitor/MonitorLayout'));
const Dashboard = lazy(() => import('./pages/monitor/Dashboard'));
const CacheManager = lazy(() => import('./pages/monitor/CacheManager'));
const TaskQueue = lazy(() => import('./pages/monitor/TaskQueue'));
const KnowledgeHub = lazy(() => import('./pages/knowledge'));
const MemoryHub = lazy(() => import('./pages/memory'));
const AgentTeamsLayout = lazy(() => import('./pages/agentTeams'));
const AgentTeamsDashboard = lazy(() => import('./pages/agentTeams/Dashboard'));
const TeamsPage = lazy(() => import('./pages/agentTeams/TeamsPage'));
const TeamDetailPage = lazy(() => import('./pages/agentTeams/TeamDetailPage'));
const TasksKanbanPage = lazy(() => import('./pages/agentTeams/TasksKanbanPage'));
const TaskDetailPage = lazy(() => import('./pages/agentTeams/TaskDetailPage'));
const AgentTeamsMonitorDashboard = lazy(() => import('./pages/agentTeams/MonitorDashboard'));
const AgentTeamsAnalyticsPage = lazy(() => import('./pages/agentTeams/AnalyticsPage'));
const AgentTeamsChatPage = lazy(() => import('./pages/agentTeams/ChatPage'));
const SkillsPage = lazy(() => import('./pages/skills'));
const SkillEditor = lazy(() => import('./pages/skills/SkillEditor'));

// Loading fallback component for lazy-loaded routes
const PageLoader: React.FC = () => (
  <div className='flex items-center justify-center min-h-[200px] w-full'>
    <AppLoader />
  </div>
);

const ProtectedLayout: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  if (status === 'checking') {
    return <AppLoader />;
  }

  if (status !== 'authenticated') {
    return <Navigate to='/login' replace />;
  }

  return React.cloneElement(layout);
};

const PanelRoute: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route
          path='/login'
          element={
            status === 'authenticated' ? (
              <Navigate to='/guid' replace />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            )
          }
        />
        <Route element={<ProtectedLayout layout={layout} />}>
          <Route index element={<Navigate to='/guid' replace />} />
          <Route
            path='/guid'
            element={
              <Suspense fallback={<PageLoader />}>
                <Guid />
              </Suspense>
            }
          />
          <Route
            path='/conversation/:id'
            element={
              <Suspense fallback={<PageLoader />}>
                <Conversation />
              </Suspense>
            }
          />

          <Route
            path='/monitor'
            element={
              <Suspense fallback={<PageLoader />}>
                <MonitorLayout />
              </Suspense>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path='stats'
              element={
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path='cache'
              element={
                <Suspense fallback={<PageLoader />}>
                  <CacheManager />
                </Suspense>
              }
            />
            <Route
              path='tasks'
              element={
                <Suspense fallback={<PageLoader />}>
                  <TaskQueue />
                </Suspense>
              }
            />
          </Route>
          <Route
            path='/knowledge'
            element={
              <Suspense fallback={<PageLoader />}>
                <KnowledgeHub />
              </Suspense>
            }
          />
          <Route
            path='/memory'
            element={
              <Suspense fallback={<PageLoader />}>
                <MemoryHub />
              </Suspense>
            }
          />

          <Route
            path='/agent-teams'
            element={
              <Suspense fallback={<PageLoader />}>
                <AgentTeamsLayout />
              </Suspense>
            }
          >
            <Route index element={<Navigate to='dashboard' replace />} />
            <Route
              path='dashboard'
              element={
                <Suspense fallback={<PageLoader />}>
                  <AgentTeamsDashboard />
                </Suspense>
              }
            />
            <Route
              path='teams'
              element={
                <Suspense fallback={<PageLoader />}>
                  <TeamsPage />
                </Suspense>
              }
            />
            <Route
              path='teams/:teamId'
              element={
                <Suspense fallback={<PageLoader />}>
                  <TeamDetailPage />
                </Suspense>
              }
            />
            <Route
              path='tasks'
              element={
                <Suspense fallback={<PageLoader />}>
                  <TasksKanbanPage />
                </Suspense>
              }
            />
            <Route
              path='tasks/:taskId'
              element={
                <Suspense fallback={<PageLoader />}>
                  <TaskDetailPage />
                </Suspense>
              }
            />
            <Route
              path='chat'
              element={
                <Suspense fallback={<PageLoader />}>
                  <AgentTeamsChatPage />
                </Suspense>
              }
            />
            <Route
              path='monitor'
              element={
                <Suspense fallback={<PageLoader />}>
                  <AgentTeamsMonitorDashboard />
                </Suspense>
              }
            />
            <Route
              path='analytics'
              element={
                <Suspense fallback={<PageLoader />}>
                  <AgentTeamsAnalyticsPage />
                </Suspense>
              }
            />
          </Route>

          <Route
            path='/skills'
            element={
              <Suspense fallback={<PageLoader />}>
                <SkillsPage />
              </Suspense>
            }
          />
          <Route
            path='/skills/new'
            element={
              <Suspense fallback={<PageLoader />}>
                <SkillEditor />
              </Suspense>
            }
          />
          <Route
            path='/skills/:skillId'
            element={
              <Suspense fallback={<PageLoader />}>
                <SkillEditor />
              </Suspense>
            }
          />
          <Route
            path='/settings/gemini'
            element={
              <Suspense fallback={<PageLoader />}>
                <GeminiSettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/model'
            element={
              <Suspense fallback={<PageLoader />}>
                <ModeSettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/agent'
            element={
              <Suspense fallback={<PageLoader />}>
                <AgentSettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/display'
            element={
              <Suspense fallback={<PageLoader />}>
                <DisplaySettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/webui'
            element={
              <Suspense fallback={<PageLoader />}>
                <WebuiSettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/hivemind'
            element={
              <Suspense fallback={<PageLoader />}>
                <HivemindSettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/system'
            element={
              <Suspense fallback={<PageLoader />}>
                <SystemSettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/about'
            element={
              <Suspense fallback={<PageLoader />}>
                <About />
              </Suspense>
            }
          />
          <Route
            path='/settings/tools'
            element={
              <Suspense fallback={<PageLoader />}>
                <ToolsSettings />
              </Suspense>
            }
          />
          <Route
            path='/settings/security'
            element={
              <Suspense fallback={<PageLoader />}>
                <SecuritySettings />
              </Suspense>
            }
          />
          <Route path='/settings' element={<Navigate to='/settings/hivemind' replace />} />
          <Route
            path='/test/components'
            element={
              <Suspense fallback={<PageLoader />}>
                <ComponentsShowcase />
              </Suspense>
            }
          />
        </Route>
        <Route path='*' element={<Navigate to={status === 'authenticated' ? '/guid' : '/login'} replace />} />
      </Routes>
    </HashRouter>
  );
};

export default PanelRoute;
