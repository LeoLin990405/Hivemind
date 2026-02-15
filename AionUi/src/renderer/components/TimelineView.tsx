/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';

export type TimelineEvent = {
  id: string;
  timestamp?: string;
  type: string;
  title: string;
  category?: string;
  source_count?: number;
};

type TimelineViewProps = {
  events: TimelineEvent[];
};

const TimelineView: React.FC<TimelineViewProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-8'>
          <div className='text-muted-foreground text-sm'>暂无时间线数据</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Timeline</CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <div className='divide-y divide-border'>
          {events.map((event) => (
            <div key={`${event.id}-${event.timestamp || ''}`} className='p-4 hover:bg-muted/50 transition-colors'>
              <div className='flex flex-col gap-1 w-full'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <Badge variant='default' className='text-xs'>
                    {event.type}
                  </Badge>
                  {event.category && (
                    <Badge variant='outline' className='text-xs'>
                      {event.category}
                    </Badge>
                  )}
                  <span className='font-semibold text-sm'>{event.title}</span>
                </div>

                <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                  <span>{event.timestamp || 'unknown'}</span>
                  {typeof event.source_count === 'number' && (
                    <span>
                      Sources: <code className='bg-muted px-1 py-0.5 rounded text-xs'>{event.source_count}</code>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineView;
