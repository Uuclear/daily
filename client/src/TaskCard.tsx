import { Button, Space, Popconfirm, Slider, Modal, Form, Input, message, DatePicker } from 'antd';
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

  const openEditForm = () => {
    editForm.setFieldsValue({
      project_name: task.project_name,
      location: task.location,
      assigned_team: task.assigned_team,
      planned_start_date: task.planned_start_date ? dayjs(task.planned_start_date) : undefined,
      deadline: task.deadline ? dayjs(task.deadline) : undefined,
      notes: task.notes || '',
    });
    setEditModalOpen(true);
  };

  return (
    <>
    <div
      onDoubleClick={openEditForm}
      style={{
        background: 'linear-gradient(145deg, #fefefe 0%, #faf9f6 50%, #f5f3ef 100%)',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 6,
        ...(task.status === 'completed' ? { opacity: 0.55 } : {}),
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
        border: '1px solid #e8e4de',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
      }}
    >
      {/* 左侧任务色条 - 与任务颜色一致 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: `linear-gradient(180deg, ${task.color || '#3b82f6'}, ${(task.color || '#3b82f6')}99)`,
        borderRadius: '10px 0 0 10px',
      }} />

      {/* 状态标签 - 右上角 */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        fontSize: 12, color: config.color, fontWeight: 700, letterSpacing: 1,
        background: config.color + '10',
        borderRadius: 4, padding: '2px 10px',
      }}>
        {config.label}
      </div>

      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 8, paddingRight: 60, minWidth: 0 }}>
        <strong style={{
          fontSize: 14, color: '#2c2c2c', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          fontWeight: 700, letterSpacing: 0.5,
        }}>{task.project_name}</strong>
      </div>

      {/* 地点 + 负责人 + 日期 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, paddingLeft: 8, flexWrap: 'wrap' }}>
        {task.location && (
          <span style={{
            fontSize: 11, color: '#777',
            background: 'rgba(0,0,0,0.04)', borderRadius: 4,
            padding: '2px 8px', whiteSpace: 'nowrap',
          }}>
            <EnvironmentOutlined style={{ marginRight: 3, fontSize: 10, opacity: 0.7 }} />{task.location}
          </span>
        )}
        {task.assigned_team && (
          <span style={{
            fontSize: 11, color: '#555', fontWeight: 500,
            background: '#f5f2eb', border: '1px solid #e0dcd5',
            borderRadius: 5, padding: '2px 8px',
            whiteSpace: 'nowrap',
          }}>
            <UserOutlined style={{ marginRight: 3, fontSize: 10 }} />{task.assigned_team}
          </span>
        )}
        {task.planned_start_date && (
          <span style={{
            fontSize: 11, color: '#888',
            background: '#f0eeeb', borderRadius: 4,
            padding: '2px 8px', whiteSpace: 'nowrap',
          }}>
            <CalendarOutlined style={{ marginRight: 3, fontSize: 10, opacity: 0.7 }} />{task.planned_start_date}
          </span>
        )}
        {task.deadline && (
          <span style={{
            fontSize: 11, color: '#d46b6b', fontWeight: 500,
            background: '#fdf0f0', border: '1px solid #f0d4d4',
            borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap',
          }}>
            截止 {task.deadline}
          </span>
        )}
      </div>

      {/* 进度条 */}
      {task.status === 'in_progress' && (
        <div
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 8, paddingRight: 8 }}
        >
          <span style={{ fontSize: 10, color: '#999', minWidth: 28 }}>进度</span>
          <Slider
            value={displayValue}
            min={0}
            max={100}
            onChange={(val) => setDragValue(val)}
            onChangeComplete={(val) => onProgressChange?.(task.id, val)}
            tooltip={{ formatter: (v) => `${v}%` }}
            style={{ flex: 1, margin: 0 }}
          />
          <span style={{ fontSize: 11, color: config.color, minWidth: 36, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{displayValue}%</span>
        </div>
      )}

      {/* 底部 — 备注 + 按钮 */}
      <div
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingLeft: 8, paddingRight: 8,
          borderTop: '1px solid #edeae5', paddingTop: 6, marginTop: 2,
        }}
      >
        {task.notes && (
          <span style={{
            fontSize: 10, color: '#aaa', fontStyle: 'italic',
            lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            flex: 1,
          }}>
            {task.notes}
          </span>
        )}
        <Space size={0}>
          {onEdit && (
            <Button type="text" size="small" style={{ padding: '2px 4px', height: 22, fontSize: 11, color: '#999', borderRadius: 4 }}
              onClick={(e) => { e.stopPropagation(); openEditForm(); }}>
              <EditOutlined style={{ fontSize: 11 }} />
            </Button>
          )}
          {task.status === 'entrusted' && onUpdateStatus && (
            <Button type="text" size="small" style={{ padding: '2px 6px', height: 22, fontSize: 10, color: config.color, borderRadius: 4 }}
              onClick={() => onUpdateStatus(task.id, 'in_progress')}>
              开始
            </Button>
          )}
          {task.status === 'in_progress' && onUpdateStatus && (
            <Button type="text" size="small" style={{ padding: '2px 4px', height: 22, fontSize: 11, color: config.color, borderRadius: 4 }}
              onClick={() => onUpdateStatus(task.id, 'reporting')}>
              <CheckOutlined />
            </Button>
          )}
          {task.status === 'reporting' && onUpdateStatus && (
            <Button type="text" size="small" style={{ padding: '2px 6px', height: 22, fontSize: 10, color: config.color, borderRadius: 4 }}
              onClick={() => onUpdateStatus(task.id, 'completed')}>
              归档
            </Button>
          )}
          {task.status === 'completed' && onUpdateStatus && (
            <Popconfirm title="确认退回？" onConfirm={() => onUpdateStatus(task.id, 'entrusted')}>
              <Button type="text" size="small" style={{ padding: '2px 4px', height: 22, fontSize: 11, color: '#999', borderRadius: 4 }}><UndoOutlined /></Button>
            </Popconfirm>
          )}
          {onDelete && (
            <Popconfirm title="确认删除？" onConfirm={() => onDelete(task.id)}>
              <Button type="text" size="small" danger style={{ padding: '2px 4px', height: 22, fontSize: 11, borderRadius: 4 }}><DeleteOutlined /></Button>
            </Popconfirm>
          )}
        </Space>
      </div>
    </div>

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
          <DatePicker style={{ width: '100%' }} allowClear />
        </Form.Item>
        <Form.Item name="deadline" label="计划结束日期">
          <DatePicker style={{ width: '100%' }} allowClear placeholder="可选" />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={2} placeholder="可选备注信息" />
        </Form.Item>
      </Form>
    </Modal>
    </>
  );
}
