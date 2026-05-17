import { Card, Tag, Button, Space, Popconfirm, Slider, Modal, Form, Input, message, DatePicker } from 'antd';
import { DeleteOutlined, CheckOutlined, UndoOutlined, EditOutlined, EnvironmentOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Task } from './types/models';
import { useState } from 'react';
import * as api from './api/client';
import dayjs from 'dayjs';

const statusConfig: Record<string, { color: string; label: string; borderColor: string }> = {
  entrusted: { color: '#e67e22', label: '委托', borderColor: '#f5cba7' },
  in_progress: { color: '#2980b9', label: '进行中', borderColor: '#aed6f1' },
  reporting: { color: '#27ae60', label: '报告出具', borderColor: '#a9dfbf' },
  completed: { color: '#7f8c8d', label: '任务结束', borderColor: '#d5d8dc' },
};

interface TaskCardProps {
  task: Task;
  onUpdateStatus?: (id: string, status: Task['status']) => void;
  onDelete?: (id: string) => void;
  onProgressChange?: (id: string, progress: number) => void;
  onEdit?: (task: Task) => void;
}

export function TaskCardComponent({ task, onUpdateStatus, onDelete, onProgressChange, onEdit }: TaskCardProps) {
  const config = statusConfig[task.status] || statusConfig.entrusted;
  const [dragValue, setDragValue] = useState<number | null>(null);
  const displayValue = dragValue !== null ? dragValue : task.progress;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();

  const handleEditSave = async () => {
    const values = await editForm.validateFields();
    await api.updateTask(task.id, {
      project_name: values.project_name,
      location: values.location,
      assigned_team: values.assigned_team || null,
      planned_start_date: values.planned_start_date ? values.planned_start_date.format('YYYY-MM-DD') : null,
      deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null,
      notes: values.notes || '',
    });
    setEditModalOpen(false);
    editForm.resetFields();
    message.success('任务已更新');
    onEdit?.(task);
  };

  return (
    <>
    <Card
      style={{
        borderLeft: `4px solid ${config.color}`,
        borderColor: config.borderColor,
        background: '#fff',
        marginBottom: 4,
        ...(task.status === 'completed' ? { opacity: 0.6 } : {}),
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderRadius: 8,
      }}
      size="small"
      bodyStyle={{ padding: '8px 12px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
          <strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.project_name}</strong>
          {task.location && <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}><EnvironmentOutlined style={{ marginRight: 2, fontSize: 10 }} />{task.location}</span>}
          {task.assigned_team && <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}><UserOutlined style={{ marginRight: 2, fontSize: 10 }} />{task.assigned_team}</span>}
        </div>
        <Tag color={config.color} style={{ fontSize: 10, padding: '0 6px', lineHeight: '18px', borderRadius: 4, flexShrink: 0, marginLeft: 4 }}>{config.label}</Tag>
      </div>
      {task.status === 'in_progress' && (
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#888', minWidth: 28 }}>进度</span>
          <Slider
            value={displayValue}
            min={0}
            max={100}
            onChange={(val) => setDragValue(val)}
            onChangeComplete={(val) => onProgressChange?.(task.id, val)}
            tooltip={{ formatter: (v) => `${v}%` }}
            style={{ flex: 1, margin: 0 }}
            trackStyle={{ backgroundColor: config.color }}
            railStyle={{ backgroundColor: config.color + '22' }}
          />
          <span style={{ fontSize: 10, color: config.color, minWidth: 30, textAlign: 'right', fontWeight: 600 }}>{displayValue}%</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size={4}>
          {task.assigned_team && <span style={{ fontSize: 10, color: '#666' }}><UserOutlined style={{ marginRight: 2, fontSize: 10 }} />{task.assigned_team}</span>}
          {task.planned_start_date && <span style={{ fontSize: 10, color: '#666' }}><CalendarOutlined style={{ marginRight: 2, fontSize: 10 }} />{task.planned_start_date}</span>}
          {task.deadline && <span style={{ fontSize: 10, color: '#ff4d4f' }}>截止: {task.deadline}</span>}
        </Space>

        <Space size={0}>
          {onEdit && (
            <Button type="link" size="small" style={{ padding: '0 4px', height: 'auto', fontSize: 11 }} onClick={() => { editForm.setFieldsValue({ project_name: task.project_name, location: task.location, assigned_team: task.assigned_team, planned_start_date: task.planned_start_date ? dayjs(task.planned_start_date) : null, deadline: task.deadline ? dayjs(task.deadline) : null, notes: task.notes || '' }); setEditModalOpen(true); }}>
              <EditOutlined style={{ fontSize: 11 }} />
            </Button>
          )}
          {task.status === 'entrusted' && onUpdateStatus && (
            <Button type="link" size="small" style={{ padding: '0 4px', height: 'auto', fontSize: 11 }} onClick={() => onUpdateStatus(task.id, 'in_progress')}>
              开始
            </Button>
          )}
          {task.status === 'in_progress' && onUpdateStatus && (
            <Button type="link" size="small" style={{ padding: '0 4px', height: 'auto', fontSize: 11 }} onClick={() => onUpdateStatus(task.id, 'reporting')}>
              <CheckOutlined />
            </Button>
          )}
          {task.status === 'reporting' && onUpdateStatus && (
            <Button type="link" size="small" style={{ padding: '0 4px', height: 'auto', fontSize: 11 }} onClick={() => onUpdateStatus(task.id, 'completed')}>
              归档
            </Button>
          )}
          {task.status === 'completed' && onUpdateStatus && (
            <Popconfirm title="确认退回？" onConfirm={() => onUpdateStatus(task.id, 'entrusted')}>
              <Button type="link" size="small" style={{ padding: '0 4px', height: 'auto', fontSize: 11 }}><UndoOutlined /></Button>
            </Popconfirm>
          )}
          {onDelete && (
            <Popconfirm title="确认删除？" onConfirm={() => onDelete(task.id)}>
              <Button type="link" size="small" danger style={{ padding: '0 4px', height: 'auto', fontSize: 11 }}><DeleteOutlined /></Button>
            </Popconfirm>
          )}
        </Space>
      </div>
    </Card>

    <Modal
      title="编辑任务"
      open={editModalOpen}
      onOk={handleEditSave}
      onCancel={() => { setEditModalOpen(false); editForm.resetFields(); }}
      okText="保存"
      cancelText="取消"
      getContainer={document.body}
    >
      <Form form={editForm} layout="vertical">
        <Form.Item name="project_name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="项目名称" />
        </Form.Item>
        <Form.Item name="location" label="施工地点" rules={[{ required: true, message: '请输入施工地点' }]}>
          <Input placeholder="施工地点" />
        </Form.Item>
        <Form.Item name="assigned_team" label="负责人">
          <Input placeholder="负责人" />
        </Form.Item>
        <Form.Item name="planned_start_date" label="计划开始日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="deadline" label="计划结束日期">
          <DatePicker style={{ width: '100%' }} placeholder="可选" />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={2} placeholder="可选备注信息" />
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
}
