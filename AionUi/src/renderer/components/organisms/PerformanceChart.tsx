import React from 'react';
import { Typography } from '../atoms/Typography';

interface ChartData {
  name: string;
  completed: number;
  total: number;
}

interface PerformanceChartProps {
  data: ChartData[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const maxTasks = Math.max(...data.map(d => d.total), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {data.map((item) => {
        const completedWidth = (item.completed / maxTasks) * 100;
        const remainingWidth = ((item.total - item.completed) / maxTasks) * 100;

        return (
          <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" bold>{item.name}</Typography>
              <Typography variant="caption" color="secondary">
                {item.completed} / {item.total} tasks
              </Typography>
            </div>
            <div style={{
              height: '12px',
              width: '100%',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${completedWidth}%`,
                height: '100%',
                background: 'var(--color-success)',
                transition: 'width 0.5s ease-out'
              }} />
              <div style={{
                width: `${remainingWidth}%`,
                height: '100%',
                background: 'var(--color-primary)',
                opacity: 0.3,
                transition: 'width 0.5s ease-out'
              }} />
            </div>
          </div>
        );
      })}
      {data.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Typography variant="body2" color="tertiary">No data available</Typography>
        </div>
      )}
    </div>
  );
};
