import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftCircle, BookOpen, History, LayoutDashboard, Plus, Settings, Wrench } from 'lucide-react';
import WorkspaceGroupedHistory from './pages/conversation/WorkspaceGroupedHistory';
import SettingsSider from './pages/settings/SettingsSider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/renderer/components/ui/tooltip';
import { usePreviewContext } from './pages/conversation/preview';

interface SiderProps {
  onSessionClick?: () => void;
  collapsed?: boolean;
}

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  collapsed: boolean;
  active?: boolean;
  primary?: boolean;
  className?: string;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, onClick, collapsed, active = false, primary = false, className }) => {
  const content = (
    <div
      onClick={onClick}
      className={classNames('hive-nav-item', className, {
        'hive-nav-item--active': active,
        'hive-nav-item--primary': primary,
        'hive-nav-item--collapsed': collapsed,
      })}
    >
      <span className='hive-nav-item__icon'>{icon}</span>
      <span className='hive-nav-item__label collapsed-hidden'>{label}</span>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      {collapsed && <TooltipContent side='right'>{label}</TooltipContent>}
    </Tooltip>
  );
};

const Sider: React.FC<SiderProps> = ({ onSessionClick, collapsed = false }) => {
  const location = useLocation();
  const { pathname, search, hash } = location;

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { closePreview } = usePreviewContext();
  const isSettings = pathname.startsWith('/settings');
  const isMonitor = pathname.startsWith('/monitor');
  const isKnowledge = pathname.startsWith('/knowledge');
  const isMemory = pathname.startsWith('/memory');
  const isAgentTeams = pathname.startsWith('/agent-teams');
  const isSkills = pathname.startsWith('/skills');
  const lastNonSettingsPathRef = useRef('/guid');

  useEffect(() => {
    if (!pathname.startsWith('/settings')) {
      lastNonSettingsPathRef.current = `${pathname}${search}${hash}`;
    }
  }, [pathname, search, hash]);

  const safeNavigate = (target: string) => {
    Promise.resolve(navigate(target)).catch((error) => {
      console.error('Navigation failed:', error);
    });
    onSessionClick?.();
  };

  const handleSettingsClick = () => {
    if (isSettings) {
      safeNavigate(lastNonSettingsPathRef.current || '/guid');
      return;
    }
    safeNavigate('/settings/hivemind');
  };

  const handleMonitorClick = () => {
    safeNavigate(isMonitor ? '/guid' : '/monitor');
  };

  const handleKnowledgeClick = () => {
    safeNavigate(isKnowledge ? '/guid' : '/knowledge');
  };

  const handleAgentTeamsClick = () => {
    safeNavigate(isAgentTeams ? '/guid' : '/agent-teams/dashboard');
  };

  const handleSkillsClick = () => {
    safeNavigate(isSkills ? '/guid' : '/skills');
  };

  const handleMemoryClick = () => {
    safeNavigate(isMemory ? '/guid' : '/memory');
  };

  return (
    <TooltipProvider>
      <div className='size-full flex flex-col hive-nav'>
        <div className='flex-1 min-h-0 overflow-y-auto'>
          {isSettings ? (
            <SettingsSider collapsed={collapsed}></SettingsSider>
          ) : (
            <div className='size-full flex flex-col'>
              <NavItem
                label={t('conversation.welcome.newConversation')}
                icon={<Plus size={20} />}
                collapsed={collapsed}
                primary
                className='mb-10px'
                onClick={() => {
                  closePreview();
                  safeNavigate('/guid');
                }}
              />
              <WorkspaceGroupedHistory collapsed={collapsed} onSessionClick={onSessionClick}></WorkspaceGroupedHistory>
            </div>
          )}
        </div>

        <div className='hive-nav-section'>
          <NavItem label={t('knowledge.title', { defaultValue: 'Knowledge Hub' })} icon={<BookOpen size={20} />} collapsed={collapsed} active={isKnowledge} onClick={handleKnowledgeClick} />
          <NavItem label={t('memory.title')} icon={<History size={20} />} collapsed={collapsed} active={isMemory} onClick={handleMemoryClick} />
          <NavItem label={t('monitor.title', { defaultValue: 'Monitor' })} icon={<LayoutDashboard size={20} />} collapsed={collapsed} active={isMonitor} onClick={handleMonitorClick} />
          <NavItem label={t('skills.title', { defaultValue: 'Skills' })} icon={<Wrench size={20} />} collapsed={collapsed} active={isSkills} onClick={handleSkillsClick} />
          <NavItem label={t('agentTeams.title', { defaultValue: 'Agent Teams' })} icon={<LayoutDashboard size={20} />} collapsed={collapsed} active={isAgentTeams} onClick={handleAgentTeamsClick} />
        </div>

        <div className='hive-nav-section sider-footer'>
          <NavItem label={isSettings ? t('common.back') : t('common.settings')} icon={isSettings ? <ArrowLeftCircle size={20} /> : <Settings size={20} />} collapsed={collapsed} active={isSettings} onClick={handleSettingsClick} />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sider;
