import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Select, DatePicker, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { TaskCardComponent } from './TaskCard';
import { StatusFilter } from './StatusFilter';
import { useTasks } from './hooks/useTasks';
import type { Task } from './types/models';
import * as api from './api/client';

const { TextArea } = Input;

interface TaskPoolProps {
  compact?: boolean;
}

export function TaskPool({ compact }: TaskPoolProps = {}) {
  const { tasks, loading, createTask, updateTask, updateTaskStatus, deleteTask, fetchTasks } = useTasks();
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [persons, setPersons] = useState<string[]>([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.getPersons().then(setPersons).catch(() => setPersons([]));
  }, []);

  const handleStatusChange = async (id: string, status: Task['status']) => {
    if (status === 'completed') {
      await api.updateTask(id, { status, deadline: today });
    } else {
      await updateTaskStatus(id, status);
    }
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      message.success('任务已删除');
    } catch {
      message.error('删除失败，请重试');
    }
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const counts: Record<string, number> = { all: tasks.length };
  tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });

  const handleCreate = async () => {
    const values = await form.validateFields();
    await createTask({
      project_name: values.project_name,
      location: values.location,
      assigned_team: values.assigned_team || null,
      status: 'entrusted',
      progress: 0,
      planned_start_date: values.planned_start_date ? values.planned_start_date.format('YYYY-MM-DD') : null,
      deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null,
      notes: values.notes || '',
    });
    setModalOpen(false);
    form.resetFields();
    message.success('任务创建成功');
  };

  const handlePersonSelect = (value: string) => {
    if (!persons.includes(value)) {
      api.addPerson(value).then(() => {
        setPersons(prev => [...prev, value]);
      }).catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' }}>
      <div style={{ padding: compact ? '6px 8px' : '10px 12px', background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: compact ? 13 : 15 }}>项目任务池</strong>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchTasks()} />
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建任务
          </Button>
        </Space>
      </div>

      <StatusFilter counts={counts} activeFilter={filter} onChange={setFilter} compact={compact} />

      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>}
        {!loading && filteredTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#ccc' }}>暂无任务</div>
        )}
        {filteredTasks.map(task => (
          <TaskCardComponent
            key={task.id}
            task={task}
            onUpdateStatus={handleStatusChange}
            onDelete={handleDelete}
            onProgressChange={async (id, progress) => {
              await api.updateTask(id, { progress });
              // Update local state instead of full refetch to avoid visual shake
              fetchTasks();
            }}
          />
        ))}
      </div>

      <Modal
        title="新建任务"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="project_name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="如：静安寺商业广场改造" />
          </Form.Item>
          <Form.Item name="location" label="施工地点" rules={[{ required: true, message: '请输入施工地点' }]}>
            <Input placeholder="如：上海市静安区南京西路1688号" />
          </Form.Item>
          <Form.Item name="assigned_team" label="负责人">
            <Select allowClear placeholder="输入或选择负责人" showSearch mode="tags" maxCount={1}
              onSelect={handlePersonSelect}
            >
              {persons.map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="planned_start_date" label="计划开始日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="deadline" label="计划结束日期">
            <DatePicker style={{ width: '100%' }} placeholder="可选" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="可选备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
