/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button } from '@/renderer/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/renderer/components/ui/dialog';
import { Loader2, File, Folder, ChevronUp } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile?: boolean;
}

interface DirectoryData {
  items: DirectoryItem[];
  canGoUp: boolean;
  parentPath?: string;
}

interface DirectorySelectionModalProps {
  visible: boolean;
  isFileMode?: boolean;
  onConfirm: (paths: string[] | undefined) => void;
  onCancel: () => void;
}

const DirectorySelectionModal: React.FC<DirectorySelectionModalProps> = ({ visible, isFileMode = false, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [directoryData, setDirectoryData] = useState<DirectoryData>({ items: [], canGoUp: false });
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');

  const loadDirectory = useCallback(
    async (path = '') => {
      setLoading(true);
      try {
        const showFiles = isFileMode ? 'true' : 'false';
        const response = await fetch(`/api/directory/browse?path=${encodeURIComponent(path)}&showFiles=${showFiles}`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        setDirectoryData(data);
        setCurrentPath(path);
      } catch (error) {
        console.error('Failed to load directory:', error);
      } finally {
        setLoading(false);
      }
    },
    [isFileMode]
  );

  useEffect(() => {
    if (visible) {
      setSelectedPath('');
      loadDirectory('').catch((error) => console.error('Failed to load initial directory:', error));
    }
  }, [visible, loadDirectory]);

  const handleItemClick = (item: DirectoryItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path).catch((error) => console.error('Failed to load directory:', error));
    }
  };

  // Double-click behavior removed - single click now handles directory navigation
  // 移除双击行为 - 单击现在处理目录导航
  const handleItemDoubleClick = (_item: DirectoryItem) => {
    // No-op: single click already handles navigation
  };

  const handleSelect = (path: string) => {
    setSelectedPath(path);
  };

  const handleGoUp = () => {
    if (directoryData.parentPath !== undefined) {
      loadDirectory(directoryData.parentPath).catch((error) => console.error('Failed to load parent directory:', error));
    }
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onConfirm([selectedPath]);
    }
  };

  const canSelect = (item: DirectoryItem) => {
    return isFileMode ? item.isFile : item.isDirectory;
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[600px] w-[90vw]" style={{ zIndex: 3000 }}>
        <DialogHeader>
          <DialogTitle>
            {isFileMode ? '📄 ' + t('fileSelection.selectFile') : '📁 ' + t('fileSelection.selectDirectory')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <div className='w-full border border-border rounded-md overflow-hidden' style={{ height: 'min(400px, 60vh)' }}>
            <div className='h-full overflow-y-auto'>
              {directoryData.canGoUp && (
                <div className='flex items-center p-10px border-b border-border cursor-pointer hover:bg-muted transition' onClick={handleGoUp}>
                  <ChevronUp className='mr-10px text-muted-foreground h-4 w-4' />
                  <span>..</span>
                </div>
              )}
              {directoryData.items.map((item, index) => (
                <div 
                  key={index} 
                  className='flex items-center justify-between p-10px border-b border-border cursor-pointer hover:bg-muted transition' 
                  style={selectedPath === item.path ? { background: 'var(--brand-light)' } : {}} 
                  onClick={() => handleItemClick(item)} 
                  onDoubleClick={() => handleItemDoubleClick(item)}
                >
                  <div className='flex items-center flex-1 min-w-0'>
                    {item.isDirectory ? 
                      <Folder className='mr-10px text-warning h-4 w-4 shrink-0' /> : 
                      <File className='mr-10px text-primary h-4 w-4 shrink-0' />
                    }
                    <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{item.name}</span>
                  </div>
                  {canSelect(item) && (
                    <Button
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item.path);
                      }}
                    >
                      {t('common.select')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className='text-muted-foreground text-sm overflow-hidden text-ellipsis whitespace-nowrap flex-1' title={selectedPath || currentPath}>
            {selectedPath || currentPath || (isFileMode ? t('fileSelection.pleaseSelectFile') : t('fileSelection.pleaseSelectDirectory'))}
          </div>
          <div className='flex gap-2'>
            <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
            <Button onClick={handleConfirm} disabled={!selectedPath}>
              {t('common.confirm')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DirectorySelectionModal;
