import { Badge } from '@/renderer/components/ui/badge';
import { CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import type { IMessagePlan } from '../../common/chatLib';

const MessagePlan: React.FC<{ message: IMessagePlan }> = ({ message }) => {
  const [showMore, setShowMore] = useState(true);
  return (
    <div>
      <div className='flex items-center gap-10px color-#86909C cursor-pointer' onClick={() => setShowMore(!showMore)}>
        <Badge variant="outline" className="text-[#86909C] border-[#86909C]">To do list</Badge>
        {showMore ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </div>
      {showMore && (
        <div className='p-l-20px flex flex-col gap-8px pt-8px'>
          {message.content.entries.map((item, index) => {
            return (
              <div key={index} className='flex flex-row items-center color-#86909C gap-8px'>
                {item.status === 'completed' ? (
                  <CheckCircle size={22} strokeWidth={2} className='flex text-green-600' />
                ) : (
                  <div className='size-22px flex items-center justify-center'>
                    <div className='size-14px rd-10px b-2px b-solid b-[rgba(201,205,212,1)]'></div>
                  </div>
                )}
                <span>{item.content} </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessagePlan;
