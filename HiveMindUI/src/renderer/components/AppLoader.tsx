import { Loader2 } from 'lucide-react';
import React from 'react';

const AppLoader: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Loader2 className='h-8 w-8 animate-spin text-primary' />
    </div>
  );
};

export default AppLoader;
