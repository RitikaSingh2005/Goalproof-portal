import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import { Users, Activity, Database, ShieldAlert, Cpu, Download, Search, Unlock, Plus, Share2, CheckSquare, Settings } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="glass-card p-6 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 ${colorClass}/5 rounded-full blur-2xl -mr-8 -mt-8 transition-all group-hover:${colorClass}/10`}></div>
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl ${colorClass}/10 flex items-center justify-center`}>
        <Icon size={24} className={`text-${colorClass.split('-')[1]}-600 dark:text-${colorClass.split('-')[1]}-400`} />
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('insights'); // 'insights', 'cycles', 'audit', 'overrides'
  const [loading, setLoading] = useState(true);

  // Data
  const [insights, setInsights] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Forms
  const [cycleForm, setCycleForm] = useState({ name: '', start_date: '', end_date: '' });
  const [unlockForm, setUnlockForm] = useState({ goal_id: '', justification: '' });
  const [sharedGoalForm, setSharedGoalForm] = useState({ title: '', description: '', target_value: '', uom_type: 'Numeric', thrust_area: 'Operations', employeeIds: [] });
  const [sharedAnalytics, setSharedAnalytics] = useState(null);
  const [editingCycle, setEditingCycle] = useState(null);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [insRes, cycRes, audRes, empRes, sharedRes] = await Promise.all([
        api.getAdminInsights(),
        api.getCycles(),
        api.getAuditLogs(),
        api.getEmployees(),
        api.getSharedAnalytics().catch(() => ({ data: null }))
      ]);
      setInsights(insRes.data);
      setCycles(cycRes.data.cycles);
      setAuditLogs(audRes.data.logs);
      setEmployees(empRes.data.employees);
      if (sharedRes.data) setSharedAnalytics(sharedRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    try {
      if (editingCycle) {
        await api.updateCycle(editingCycle.id, cycleForm);
        setMessage('Cycle updated successfully!');
        setEditingCycle(null);
      } else {
        await api.createCycle(cycleForm);
        setMessage('Cycle created successfully!');
      }
      setCycleForm({ name: '', start_date: '', end_date: '', status: 'active' });
      fetchData();
    } catch (err) {
      setMessage('Failed to save cycle.');
    }
  };

  const openEditCycle = (c) => {
    setEditingCycle(c);
    setCycleForm({ name: c.name, start_date: c.start_date.split('T')[0], end_date: c.end_date.split('T')[0], status: c.status });
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    try {
      await api.unlockGoal(unlockForm.goal_id, unlockForm.justification);
      setMessage('Goal unlocked successfully!');
      setUnlockForm({ goal_id: '', justification: '' });
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to unlock goal.');
    }
  };

  const handleCreateSharedGoal = async (e) => {
    e.preventDefault();
    try {
      await api.createSharedGoal(sharedGoalForm);
      setMessage('Shared KPI successfully assigned!');
      setSharedGoalForm({ title: '', description: '', target_value: '', uom_type: 'Numeric', thrust_area: 'Operations', employeeIds: [] });
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create shared KPI.');
    }
  };

  const toggleEmployeeSelection = (id) => {
    setSharedGoalForm(prev => {
      const ids = prev.employeeIds.includes(id) 
        ? prev.employeeIds.filter(eId => eId !== id)
        : [...prev.employeeIds, id];
      return { ...prev, employeeIds: ids };
    });
  };

  if (loading) return <div className="p-8 flex justify-center items-center h-screen"><Activity className="animate-spin text-brand-500" size={48} /></div>;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-white">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold">Admin Portal</span>
          </div>
          <div className="space-y-2">
            {[
              { id: 'insights', icon: Activity, label: 'Org Intelligence' },
              { id: 'shared', icon: Share2, label: 'Shared KPIs' },
              { id: 'cycles', icon: Settings, label: 'Cycle Config' },
              { id: 'audit', icon: Database, label: 'Audit Trail' },
              { id: 'overrides', icon: Unlock, label: 'Data & Overrides' },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
              <div key={tab.id} onClick={() => setActiveTab(tab.id)} className={`p-3 rounded-lg font-medium cursor-pointer transition-colors ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-600 dark:text-gray-400'}`}>
                <Icon size={18} className="inline mr-2" /> {tab.label}
              </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="p-4 bg-gray-50 dark:bg-dark-900 rounded-xl mb-4">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">System Administrator</p>
          </div>
          <button onClick={logout} className="w-full py-2 px-4 rounded-lg border border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700 text-sm font-medium transition-colors">
            Log out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 custom-scrollbar">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold capitalize">
              {activeTab === 'insights' ? 'Organization Intelligence' : 
               activeTab === 'shared' ? 'Shared KPIs & Bulk Assignment' :
               activeTab === 'cycles' ? 'Cycle Configuration' : 
               activeTab === 'audit' ? 'Audit Trail' : 'Data & Overrides'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Admin control center and system analytics.</p>
          </div>
          {activeTab === 'overrides' && (
            <a href="/api/admin/report" download className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2">
              <Download size={18} /> Export Full CSV Report
            </a>
          )}
        </header>

        {message && <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl">{message}</div>}

        {/* ORG INTELLIGENCE */}
        {activeTab === 'insights' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Total Goals" value={insights?.totalGoals || 0} icon={Users} colorClass="bg-blue-500" />
              <StatCard title="Completed Goals" value={insights?.completedGoals || 0} icon={Activity} colorClass="bg-green-500" />
              <StatCard title="Pending Check-ins" value={(insights?.totalEmployees || 0) - (insights?.employeesCompletedCheckins || 0)} icon={ShieldAlert} colorClass="bg-red-500" />
              <StatCard title="Manager Pending" value={insights?.pendingManagerReviews || 0} icon={Cpu} colorClass="bg-yellow-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl h-80">
                <h3 className="text-lg font-bold mb-4">SMART Score by Department</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights?.smartScoreByDept || []} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="department" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="avgScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6 rounded-2xl h-80">
                <h3 className="text-lg font-bold mb-4">Manager Effectiveness Leaderboard</h3>
                <div className="space-y-4">
                  {insights?.managerRankings?.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-700'}`}>#{i + 1}</div>
                        <span className="font-medium">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${m.effectiveness}%` }}></div>
                        </div>
                        <span className="text-sm font-bold w-8 text-right">{m.effectiveness}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl h-80">
                <h3 className="text-lg font-bold mb-4">Goal Abandonment Rate</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Active/Completed', value: 100 - (insights?.abandonmentRate || 0) },
                      { name: 'Abandoned', value: insights?.abandonmentRate || 0 }
                    ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6 rounded-2xl h-80">
                <h3 className="text-lg font-bold mb-4">Quality Issues Tracking</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights?.commonIssues || []} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.2} />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="issue" type="category" axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SHARED KPIS */}
        {activeTab === 'shared' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Master KPIs" value={sharedAnalytics?.totalMasterGoals || 0} icon={Users} colorClass="bg-blue-500" />
              <StatCard title="Total Distributed" value={sharedAnalytics?.totalAssignedGoals || 0} icon={Share2} colorClass="bg-indigo-500" />
              <StatCard title="Employee Participation" value={`${sharedAnalytics?.participationRate || 0}%`} icon={Activity} colorClass="bg-green-500" />
              <StatCard title="Completion Rate" value={`${sharedAnalytics?.overallCompletionRate || 0}%`} icon={Cpu} colorClass="bg-purple-500" />
            </div>

            {sharedAnalytics?.departmentPerformance?.length > 0 && (
              <div className="glass-card p-6 rounded-2xl h-80">
                <h3 className="text-lg font-bold mb-4">Department-wise Shared KPI Performance</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sharedAnalytics.departmentPerformance} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="department" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                    <Bar dataKey="performance" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-6 rounded-2xl h-fit">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Share2 size={18}/> Create Organization KPI</h3>
                <p className="text-sm text-gray-500 mb-6">These goals will be locked. Assigned employees can only edit their weightage.</p>
              
              <form onSubmit={handleCreateSharedGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">KPI Title</label>
                  <input required value={sharedGoalForm.title} onChange={e => setSharedGoalForm({...sharedGoalForm, title: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none" placeholder="e.g. Q3 Compliance Training" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={sharedGoalForm.description} onChange={e => setSharedGoalForm({...sharedGoalForm, description: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none h-20 resize-none"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Value</label>
                    <input type="number" required value={sharedGoalForm.target_value} onChange={e => setSharedGoalForm({...sharedGoalForm, target_value: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <select value={sharedGoalForm.uom_type} onChange={e => setSharedGoalForm({...sharedGoalForm, uom_type: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none">
                      <option>Numeric</option><option>Percentage</option><option>Timeline</option>
                    </select>
                  </div>
                </div>
                
                <button type="submit" disabled={sharedGoalForm.employeeIds.length === 0} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors">
                  Assign to {sharedGoalForm.employeeIds.length} Employees
                </button>
              </form>
            </div>

            <div className="glass-card p-6 rounded-2xl h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Bulk Assign Employees</h3>
                <button onClick={() => setSharedGoalForm(p => ({...p, employeeIds: employees.map(e => e.id)}))} className="text-sm text-indigo-600 font-medium">Select All</button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {employees.map(emp => (
                  <div key={emp.id} onClick={() => toggleEmployeeSelection(emp.id)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${sharedGoalForm.employeeIds.includes(emp.id) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-100 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-500'}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${sharedGoalForm.employeeIds.includes(emp.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                      {sharedGoalForm.employeeIds.includes(emp.id) && <CheckSquare size={14} className="text-white" />}
                    </div>
                    <div>
                      <p className="font-bold">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.department}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CYCLE CONFIG */}
        {activeTab === 'cycles' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-6 rounded-2xl h-fit">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={18}/> New Quarter Cycle</h3>
              <form onSubmit={handleCreateCycle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cycle Name</label>
                  <input required value={cycleForm.name} onChange={e => setCycleForm({...cycleForm, name: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none" placeholder="e.g. Q1 2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" required value={cycleForm.start_date} onChange={e => setCycleForm({...cycleForm, start_date: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" required value={cycleForm.end_date} onChange={e => setCycleForm({...cycleForm, end_date: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none" />
                </div>
                {editingCycle && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select value={cycleForm.status} onChange={e => setCycleForm({...cycleForm, status: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-2 outline-none">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
                  {editingCycle ? 'Update Cycle' : 'Activate Cycle'}
                </button>
                {editingCycle && (
                  <button type="button" onClick={() => { setEditingCycle(null); setCycleForm({ name: '', start_date: '', end_date: '', status: 'active' })}} className="w-full py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600 rounded-xl font-medium transition-colors text-sm mt-2">Cancel Edit</button>
                )}
              </form>
            </div>
            
            <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-dark-700">
                <h3 className="text-xl font-bold">Cycle History</h3>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-dark-800 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Start Date</th>
                    <th className="px-6 py-4 font-medium">End Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                  {cycles.map(c => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 font-bold">{c.name}</td>
                      <td className="px-6 py-4">{new Date(c.start_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{new Date(c.end_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditCycle(c)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold">Edit</button>
                      </td>
                    </tr>
                  ))}
                  {cycles.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No cycles configured.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">System Audit Logs</h3>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark-800 px-4 py-2 rounded-lg w-64 border border-transparent focus-within:border-indigo-500">
                <Search size={16} className="text-gray-400" />
                <input placeholder="Search logs..." className="bg-transparent border-none outline-none text-sm w-full" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-dark-800 text-gray-500 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-medium">Timestamp</th>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                    <th className="px-6 py-4 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                  {auditLogs.map(log => {
                    let detailsObj = null;
                    try { detailsObj = JSON.parse(log.details); } catch (e) { }
                    return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium">{log.user.name} <span className="block text-xs text-gray-400">{log.user.email}</span></td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 dark:bg-dark-700 rounded-md text-xs font-mono">{log.action}</span></td>
                      <td className="px-6 py-4">
                        {detailsObj ? (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">{detailsObj.message}</p>
                            <div className="flex items-center gap-4 text-xs font-mono">
                              <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-2 rounded w-full">
                                <span className="block font-bold mb-1">Before:</span>
                                {JSON.stringify(detailsObj.old)}
                              </div>
                              <div className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 p-2 rounded w-full">
                                <span className="block font-bold mb-1">After:</span>
                                {JSON.stringify(detailsObj.new)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="max-w-md truncate block" title={log.details}>{log.details}</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                  {auditLogs.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No audit logs found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATA & OVERRIDES */}
        {activeTab === 'overrides' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
            <div className="glass-card p-8 rounded-2xl border border-red-500/20">
              <div className="flex items-center gap-3 text-red-500 mb-6">
                <ShieldAlert size={28} />
                <h2 className="text-2xl font-bold">Emergency Goal Override</h2>
              </div>
              <p className="text-gray-500 mb-8">Unlocking a goal allows an employee to edit and resubmit it. This action is permanently logged in the audit trail.</p>
              
              <form onSubmit={handleUnlock} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Goal ID</label>
                  <input type="number" required value={unlockForm.goal_id} onChange={e => setUnlockForm({...unlockForm, goal_id: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-3 outline-none" placeholder="e.g. 42" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mandatory Justification</label>
                  <textarea required minLength="10" value={unlockForm.justification} onChange={e => setUnlockForm({...unlockForm, justification: e.target.value})} className="w-full bg-gray-50 dark:bg-dark-800 rounded-lg px-4 py-3 outline-none h-32 resize-none" placeholder="Explain why this goal is being overridden..."></textarea>
                </div>
                <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors">Force Unlock Goal</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
