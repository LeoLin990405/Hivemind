import React, { useEffect, useMemo, useState } from 'react';
import { ipcBridge } from '@/common';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/renderer/components/ui/select';
import type { AcpBackendAll, ModelConfig } from '@/types/acpTypes';
import classNames from 'classnames';

interface ModelSelectorProps {
  provider: AcpBackendAll;
  value?: string | null;
  onChange?: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ provider, value, onChange, disabled = false, className }) => {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(value ?? '');

  useEffect(() => {
    setSelectedModel(value ?? '');
  }, [value]);

  useEffect(() => {
    let disposed = false;

    const loadModels = async () => {
      setLoading(true);
      try {
        const modelList = await ipcBridge.models.getModels.invoke({ provider });
        if (disposed) return;
        setModels(modelList);

        if (modelList.length === 0) {
          if (!disposed) setSelectedModel('');
          return;
        }

        const current = value ?? selectedModel;
        const currentExists = current ? modelList.some((model) => model.id === current) : false;
        if (currentExists) {
          return;
        }

        const fallback = modelList.find((model) => model.isDefault) ?? modelList[0];
        setSelectedModel(fallback.id);
        onChange?.(fallback.id);
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void loadModels();

    return () => {
      disposed = true;
    };
  }, [provider]);

  const selectedLabel = useMemo(() => {
    const found = models.find((model) => model.id === selectedModel);
    return found?.displayName ?? selectedModel;
  }, [models, selectedModel]);

  return (
    <div className={className}>
      <Select
        value={selectedModel}
        onValueChange={(modelId) => {
          setSelectedModel(modelId);
          onChange?.(modelId);
        }}
        disabled={disabled || loading || models.length === 0}
      >
        <SelectTrigger className={classNames('hive-model-selector-trigger h-7 text-xs', className ? '' : 'w-[220px]')}>
          <SelectValue placeholder={loading ? 'Loading models...' : 'Select model'}>
            <span className='truncate'>{selectedLabel || (loading ? 'Loading models...' : 'Select model')}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className='hive-model-selector-content'>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id} className='text-xs'>
              <div className='flex items-center gap-2'>
                <span>{model.displayName}</span>
                {model.isDefault && <span className='text-[10px] text-t-secondary'>(Default)</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
