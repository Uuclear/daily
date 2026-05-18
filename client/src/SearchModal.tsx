import { useState, useCallback, useEffect } from 'react';
import { Modal, Input, List, Tag, Typography, Spin, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { search, type SearchResult } from './api/client';
import type { Task, ScheduleEvent } from './types/models';

const { Text } = Typography;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onTaskSelect: (task: Task) => void;
  onEventSelect: (event: ScheduleEvent) => void;
}

export function SearchModal({ open, onClose, onTaskSelect, onEventSelect }: SearchModalProps) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ tasks: SearchResult[]; events: SearchResult[] } | null>(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (kw: string) => {
    if (!kw.trim()) {
      setResults(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const data = await search(kw.trim());
      setResults(data);
      setSearched(true);
    } catch {
      setResults(null);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword) {
        doSearch(keyword);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, doSearch]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setKeyword('');
      setResults(null);
      setSearched(false);
    }
  }, [open]);

  const handleTaskClick = (item: SearchResult) => {
    onTaskSelect(item as unknown as Task);
    onClose();
  };

  const handleEventClick = (item: SearchResult) => {
    onEventSelect(item as unknown as ScheduleEvent);
    onClose();
  };

  const renderTaskItem = (item: SearchResult) => (
    <List.Item
      onClick={() => handleTaskClick(item)}
      style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 4 }}
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text strong>{item.project_name}</Text>
          <Tag color="blue">{item.matchedField}</Tag>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
          {item.status} &middot; 进度 {item.progress}%
          {item.assigned_team && <> &middot; {item.assigned_team}</>}
        </div>
      </div>
    </List.Item>
  );

  const renderEventItem = (item: SearchResult) => (
    <List.Item
      onClick={() => handleEventClick(item)}
      style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 4 }}
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text strong>{item.title}</Text>
          <Tag color="green">{item.matchedField}</Tag>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
          {item.date} &middot; {item.start_time}-{item.end_time}
        </div>
      </div>
    </List.Item>
  );

  const hasResults = (results?.tasks?.length ?? 0) > 0 || (results?.events?.length ?? 0) > 0;

  return (
    <Modal
      title="关键词搜索"
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Input.Search
        placeholder="输入关键词搜索任务或日程..."
        allowClear
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        prefix={<SearchOutlined />}
        autoFocus
        size="large"
        style={{ marginBottom: 16 }}
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      )}

      {!loading && searched && !hasResults && (
        <Empty description="没有找到匹配的结果" style={{ padding: '24px 0' }} />
      )}

      {!loading && searched && hasResults && (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {results?.tasks && results.tasks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                任务 ({results.tasks.length})
              </Text>
              <List
                dataSource={results.tasks}
                renderItem={renderTaskItem}
                size="small"
                bordered
              />
            </div>
          )}
          {results?.events && results.events.length > 0 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                日程 ({results.events.length})
              </Text>
              <List
                dataSource={results.events}
                renderItem={renderEventItem}
                size="small"
                bordered
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
