import { getDb } from './init';

const now = new Date().toISOString();

const teams = [
  { id: 'team-1', name: '钢筋班', color: '#1890ff', members: '["张三","李四","王五"]' },
  { id: 'team-2', name: '结构加固组', color: '#52c41a', members: '["赵六","孙七"]' },
  { id: 'team-3', name: '防水班', color: '#faad14', members: '["周八","吴九"]' },
  { id: 'team-4', name: '外墙涂料组', color: '#722ed1', members: '["郑十","冯十一"]' },
  { id: 'team-5', name: '电工班', color: '#eb2f96', members: '["陈十二","褚十三"]' },
];

const tasks = [
  { id: 'task-1', project_name: '静安寺商业广场改造', location: '上海市静安区南京西路1688号', assigned_team: null, status: 'entrusted', progress: 0, planned_start_date: '2026-05-18', deadline: '2026-06-15', notes: '', created_at: now, updated_at: now },
  { id: 'task-2', project_name: '徐汇滨江办公楼加固', location: '上海市徐汇区龙腾大道300号', assigned_team: '结构加固组', status: 'in_progress', progress: 65, planned_start_date: '2026-05-12', deadline: '2026-05-30', notes: '需配合物业时间施工', created_at: now, updated_at: now },
  { id: 'task-3', project_name: '虹桥交通枢纽防水工程', location: '上海市闵行区申贵路1500号', assigned_team: '防水班', status: 'reporting', progress: 100, planned_start_date: '2026-05-05', deadline: '2026-05-20', notes: '', created_at: now, updated_at: now },
  { id: 'task-4', project_name: '浦东机场T3航站楼外墙翻新', location: '上海市浦东新区迎宾大道', assigned_team: '外墙涂料组', status: 'completed', progress: 100, planned_start_date: '2026-04-01', deadline: '2026-05-10', notes: '', created_at: now, updated_at: now },
  { id: 'task-5', project_name: '长宁区住宅加装电梯', location: '上海市长宁区天山路888号', assigned_team: null, status: 'entrusted', progress: 0, planned_start_date: '2026-05-25', deadline: '2026-07-01', notes: '', created_at: now, updated_at: now },
  { id: 'task-6', project_name: '黄浦江滨江步道维修', location: '上海市黄浦区外马路100号', assigned_team: null, status: 'entrusted', progress: 0, planned_start_date: '2026-05-20', deadline: '2026-06-10', notes: '户外作业，注意天气', created_at: now, updated_at: now },
  { id: 'task-7', project_name: '宝山工业园区地坪施工', location: '上海市宝山区富联路500号', assigned_team: '防水班', status: 'in_progress', progress: 30, planned_start_date: '2026-05-15', deadline: '2026-06-05', notes: '', created_at: now, updated_at: now },
  { id: 'task-8', project_name: '松江区学校操场改造', location: '上海市松江区文汇路200号', assigned_team: '钢筋班', status: 'in_progress', progress: 80, planned_start_date: '2026-05-08', deadline: '2026-05-25', notes: '暑假前需完成', created_at: now, updated_at: now },
];

const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));

function dayStr(offset: number): string {
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  return d.toISOString().split('T')[0];
}

const events = [
  { id: 'event-1', task_id: 'task-1', date: dayStr(0), start_time: '08:00', end_time: '12:00', title: '基础拆除', work_content: '一层A区基础拆除作业', is_milestone: 0, assigned_team: '钢筋班', location: '一层A区', notes: '' },
  { id: 'event-2', task_id: 'task-1', date: dayStr(0), start_time: '14:00', end_time: '16:00', title: '结构验收检查', work_content: '关键节点验收', is_milestone: 1, assigned_team: '项目经理', location: '', notes: '关键节点' },
  { id: 'event-3', task_id: 'task-2', date: dayStr(1), start_time: '08:00', end_time: '17:00', title: '办公楼加固3层施工', work_content: '三层结构加固作业', is_milestone: 0, assigned_team: '结构加固组', location: '3层', notes: '' },
  { id: 'event-4', task_id: 'task-8', date: dayStr(2), start_time: '09:00', end_time: '12:00', title: '室内电气布线', work_content: '体育馆室内电气布线', is_milestone: 0, assigned_team: '电工班', location: '体育馆室内', notes: '雨天改为室内作业' },
];

const summaries = [
  { id: 'sum-1', date: dayStr(0), content: '静安寺商业广场改造项目今日进行基础拆除和结构验收，进展顺利。', updated_at: now },
  { id: 'sum-2', date: dayStr(1), content: '徐汇滨江办公楼加固工程进入三层施工阶段。', updated_at: now },
  { id: 'sum-3', date: dayStr(2), content: '松江区学校操场改造项目完成室内电气布线。', updated_at: now },
];

function seed() {
  const db = getDb();

  db.prepare('DELETE FROM daily_summaries').run();
  db.prepare('DELETE FROM schedule_events').run();
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM teams').run();

  const insertTeam = db.prepare('INSERT INTO teams (id, name, color, members) VALUES (@id, @name, @color, @members)');
  const insertTask = db.prepare('INSERT INTO tasks (id, project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes, created_at, updated_at) VALUES (@id, @project_name, @location, @assigned_team, @status, @progress, @planned_start_date, @deadline, @notes, @created_at, @updated_at)');
  const insertEvent = db.prepare('INSERT INTO schedule_events (id, task_id, date, start_time, end_time, title, work_content, is_milestone, assigned_team, location, notes) VALUES (@id, @task_id, @date, @start_time, @end_time, @title, @work_content, @is_milestone, @assigned_team, @location, @notes)');
  const insertSummary = db.prepare('INSERT INTO daily_summaries (id, date, content, updated_at) VALUES (@id, @date, @content, @updated_at)');

  db.transaction(() => { teams.forEach(t => insertTeam.run(t)); })();
  db.transaction(() => { tasks.forEach(t => insertTask.run(t)); })();
  db.transaction(() => { events.forEach(e => insertEvent.run(e)); })();
  db.transaction(() => { summaries.forEach(s => insertSummary.run(s)); })();

  console.log('数据库初始化成功');
  db.close();
}

seed();
