import React from 'react';
import { Timeline, Tag, Empty } from '@arco-design/web-react';
import { Typography } from '../atoms/Typography';

export interface Activity {
  id: string;
  type: 'task' | 'message' | 'team';
  action: string;
  target: string;
  time: number;
  status?: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-1)', borderRadius: 'var(--radius-lg)' }}>
        <Empty description="No recent activity" />
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-1)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      border: '1px solid var(--color-border)',
      height: '100%',
      overflowY: 'auto'
    }}>
      <Typography variant="h6" bold style={{ marginBottom: '20px' }}>Recent Activity</Typography>
      <Timeline>
        {activities.map((activity) => (
          <Timeline.Item
            key={activity.id}
            label={<Typography variant="caption" color="secondary">{new Date(activity.time).toLocaleTimeString()}</Typography>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Tag
                  size="small"
                  color={
                    activity.type === 'task' ? 'purple' :
                    activity.type === 'message' ? 'arcoblue' : 'green'
                  }
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  {activity.type.toUpperCase()}
                </Tag>
                <Typography variant="body2" bold>{activity.action}</Typography>
              </div>
              <Typography variant="caption" color="secondary">
                {activity.target}
              </Typography>
              {activity.status && (
                <div style={{ marginTop: '4px' }}>
                  <Tag size="small" color={activity.status === 'completed' ? 'green' : 'orange'}>
                    {activity.status}
                  </Tag>
                </div>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
};
