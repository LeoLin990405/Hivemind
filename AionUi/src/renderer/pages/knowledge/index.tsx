/**
 * Knowledge Hub v2.1 - Main Page
 * 
 * Unified interface for NotebookLM + Obsidian + PDF Pipeline
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Upload,
  List,
  Badge,
  Tabs,
  Empty,
  Message,
  Spin,
  Tag,
  Space,
  Typography,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconUpload,
  IconFile,
  IconSound,
  IconBook,
  IconRefresh,
} from '@arco-design/web-react/icon';

const { TabPane } = Tabs;
const { Title, Paragraph, Text } = Typography;

const GATEWAY_URL = 'http://localhost:8765';

type Notebook = {
  notebook_id: string;
  title: string;
  category: string;
  source_count: number;
  created_at: string;
};

type SystemStatus = {
  obsidian_cli_available: boolean;
  obsidian_cli_version: string | null;
  vault_path: string;
  notebooklm_manager_ready: boolean;
  total_notebooks: number;
};

const KnowledgeHubPage: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch system status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/knowledge/v2/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      Message.error('Failed to fetch system status');
    }
  };

  // Fetch notebooks
  const fetchNotebooks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${GATEWAY_URL}/knowledge/v2/notebook/list`);
      const data = await response.json();
      setNotebooks(data.notebooks || []);
    } catch (error) {
      Message.error('Failed to fetch notebooks');
    } finally {
      setLoading(false);
    }
  };

  // Upload PDF
  const handleUploadPDF = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace('.pdf', ''));
      formData.append('category', 'research');
      formData.append('run_deep_research', 'false');

      const response = await fetch(`${GATEWAY_URL}/knowledge/v2/pipeline/pdf-full`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.status === 'success') {
        Message.success(`PDF processed successfully! Notebook ID: ${result.notebook_id}`);
        fetchNotebooks();
      } else {
        Message.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      Message.error('Failed to upload PDF');
    } finally {
      setUploading(false);
    }
    return false; // Prevent default upload behavior
  };

  useEffect(() => {
    fetchStatus();
    fetchNotebooks();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title heading={3} style={{ margin: 0 }}>知识中心 v2.1</Title>
            <Paragraph style={{ margin: '8px 0 0 0', color: 'var(--color-text-3)' }}>
              NotebookLM + Obsidian + PDF 全自动处理
            </Paragraph>
          </div>
          <Space>
            <Upload
              accept='.pdf'
              beforeUpload={handleUploadPDF}
              showUploadList={false}
            >
              <Button
                type='primary'
                icon={<IconUpload />}
                loading={uploading}
              >
                上传 PDF
              </Button>
            </Upload>
            <Button
              icon={<IconRefresh />}
              onClick={fetchNotebooks}
            >
              刷新
            </Button>
          </Space>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type='secondary'>Obsidian CLI</Text>
              <Title heading={5} style={{ margin: '8px 0 0 0' }}>
                {status?.obsidian_cli_version || 'Loading...'}
              </Title>
            </div>
            <Badge
              status={status?.obsidian_cli_available ? 'success' : 'error'}
              text={status?.obsidian_cli_available ? '可用' : '不可用'}
            />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type='secondary'>NotebookLM Manager</Text>
              <Title heading={5} style={{ margin: '8px 0 0 0' }}>
                {status?.notebooklm_manager_ready ? '就绪' : '未就绪'}
              </Title>
            </div>
            <Badge
              status={status?.notebooklm_manager_ready ? 'success' : 'error'}
            />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type='secondary'>总 Notebooks</Text>
              <Title heading={5} style={{ margin: '8px 0 0 0' }}>
                {status?.total_notebooks || 0}
              </Title>
            </div>
            <IconBook style={{ fontSize: '24px', color: 'var(--color-primary-6)' }} />
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type='secondary'>Vault 路径</Text>
              <Title heading={6} style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                {status?.vault_path?.split('/').pop() || 'N/A'}
              </Title>
            </div>
            <IconFile style={{ fontSize: '24px', color: 'var(--color-primary-6)' }} />
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <Tabs defaultActiveTab='notebooks'>
          <TabPane key='notebooks' title='Notebooks'>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin />
              </div>
            ) : notebooks.length === 0 ? (
              <Empty
                description='暂无 Notebooks'
                style={{ padding: '40px' }}
              />
            ) : (
              <List
                dataSource={notebooks}
                render={(item: Notebook) => (
                  <List.Item key={item.notebook_id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text bold>{item.title}</Text>
                          <div style={{ marginTop: '4px' }}>
                            <Tag color='blue' size='small'>{item.category}</Tag>
                            <Tag size='small'>{item.source_count} sources</Tag>
                            <Text type='secondary' style={{ fontSize: '12px', marginLeft: '8px' }}>
                              {new Date(item.created_at).toLocaleDateString('zh-CN')}
                            </Text>
                          </div>
                        </div>
                        <Space>
                          <Button size='small' icon={<IconSound />}>Audio</Button>
                          <Button size='small' type='primary'>查看</Button>
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </TabPane>

          <TabPane key='upload' title='上传 PDF'>
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Upload
                drag
                accept='.pdf'
                beforeUpload={handleUploadPDF}
                showUploadList={false}
              >
                <div style={{ padding: '40px' }}>
                  <IconUpload style={{ fontSize: '48px', color: 'var(--color-primary-6)' }} />
                  <Title heading={5} style={{ marginTop: '16px' }}>
                    拖拽 PDF 文件到此处上传
                  </Title>
                  <Paragraph type='secondary'>
                    自动创建 Notebook + 生成 Artifacts + 同步 Obsidian
                  </Paragraph>
                </div>
              </Upload>
            </div>
          </TabPane>

          <TabPane key='settings' title='设置'>
            <div style={{ padding: '20px' }}>
              <Title heading={6}>系统配置</Title>
              <Paragraph>
                <Text bold>Vault 路径: </Text>
                <Text code>{status?.vault_path || 'N/A'}</Text>
              </Paragraph>
              <Paragraph>
                <Text bold>Obsidian CLI: </Text>
                <Text code>{status?.obsidian_cli_version || 'Not installed'}</Text>
              </Paragraph>
              <Paragraph>
                <Text bold>Gateway API: </Text>
                <Text code>{GATEWAY_URL}</Text>
              </Paragraph>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default KnowledgeHubPage;
