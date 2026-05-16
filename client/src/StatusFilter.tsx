import { Tag } from 'antd';

interface StatusFilterProps {
  counts: Record<string, number>;
  activeFilter: string;
  onChange: (filter: string) => void;
}

const filterConfig = [
  { key: 'all', label: '全部', activeColor: '#1890ff', defaultBg: '#f0f0f0', defaultColor: '#555' },
  { key: 'entrusted', label: '委托', activeColor: '#fa8c16', defaultBg: '#fff7e6', defaultColor: '#d48806' },
  { key: 'in_progress', label: '进行中', activeColor: '#1890ff', defaultBg: '#e6f7ff', defaultColor: '#096dd9' },
  { key: 'reporting', label: '报告出具', activeColor: '#52c41a', defaultBg: '#f6ffed', defaultColor: '#389e0d' },
  { key: 'completed', label: '任务结束', activeColor: '#8c8c8c', defaultBg: '#fafafa', defaultColor: '#666' },
];

export function StatusFilter({ counts, activeFilter, onChange }: StatusFilterProps) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
      {filterConfig.map(f => {
        const isActive = activeFilter === f.key;
        return (
          <Tag
            key={f.key}
            style={{
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: isActive ? 600 : 500,
              background: isActive ? f.activeColor : f.defaultBg,
              color: isActive ? '#fff' : f.defaultColor,
              border: '1px solid transparent',
              transition: 'all 0.2s',
            }}
            onClick={() => onChange(f.key)}
          >
            {f.label} <span style={{ opacity: 0.8, marginLeft: 2 }}>{counts[f.key] || 0}</span>
          </Tag>
        );
      })}
    </div>
  );
}
