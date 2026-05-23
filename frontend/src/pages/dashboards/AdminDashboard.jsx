import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import ProfileModal from '../../components/ProfileModal';
import { Users, Activity, Database, ShieldAlert, Cpu, Download, Search, Unlock, Plus, Share2, CheckSquare, Settings, CheckCircle2, Loader2, BarChart2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 relative overflow-hidden group border border-white/5 hover:border-white/10 transition-colors">
    <div className={`absolute top-0 right-0 w-24 h-24 ${colorClass}/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500`}></div>
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-3xl font-display font-bold text-white mt-2">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl ${colorClass}/10 flex items-center justify-center border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]`}>
        <Icon size={24} className={colorClass.replace('bg-', 'text-').replace('/10', '')} />
      </div>
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('insights');
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
        toast.success('Cycle updated successfully!');
        setEditingCycle(null);
      } else {
        await api.createCycle(cycleForm);
        toast.success('Cycle created successfully!');
      }
      setCycleForm({ name: '', start_date: '', end_date: '', status: 'active' });
      fetchData();
    } catch (err) {
      toast.error('Failed to save cycle.');
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
      toast.success('Goal unlocked successfully!');
      setUnlockForm({ goal_id: '', justification: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unlock goal.');
    }
  };

  const handleCreateSharedGoal = async (e) => {
    e.preventDefault();
    try {
      await api.createSharedGoal(sharedGoalForm);
      toast.success('Shared KPI successfully assigned!');
      setSharedGoalForm({ title: '', description: '', target_value: '', uom_type: 'Numeric', thrust_area: 'Operations', employeeIds: [] });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create shared KPI.');
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

  const handleDownloadReport = async (e) => {
    e.preventDefault();
    try {
      const response = await api.downloadAdminReport();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'goalproof_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download report.');
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 flex justify-center items-center h-screen bg-dark-900"><Loader2 className="animate-spin text-brand-500" size={48} /></div>;

  const tabs = [
    { id: 'insights', icon: Activity, label: 'Org Intelligence' },
    { id: 'shared', icon: Share2, label: 'Shared KPIs' },
    { id: 'cycles', icon: Settings, label: 'Cycle Config' },
    { id: 'audit', icon: Database, label: 'Audit Trail' },
    { id: 'overrides', icon: Unlock, label: 'Data & Overrides' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="flex h-screen bg-dark-900 text-white font-sans overflow-hidden relative">
      {/* Background glowing effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 glass border-r border-white/5 p-6 flex flex-col justify-between z-10"
      >
        <div>
          <div className="flex items-center gap-3 mb-10 pl-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold font-display tracking-tight">Admin Portal</span>
          </div>
          
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors relative ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  {isActive && (
                    <motion.div layoutId="activeAdminTab" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
                  )}
                  <Icon size={18} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsProfileOpen(true)}
          className="bg-dark-800/50 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all rounded-2xl p-4 w-full text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-premium p-[1px] group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-shadow">
              <div className="w-full h-full bg-dark-900 rounded-full flex items-center justify-center font-bold text-sm text-white">{user.name.charAt(0)}</div>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight text-white">{user.name}</p>
              <p className="text-xs text-gray-400">System Administrator</p>
            </div>
          </div>
          <Settings size={16} className="text-gray-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 md:hidden lg:block" />
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 lg:p-12 custom-scrollbar z-10 relative">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-display font-bold capitalize">
              {tabs.find(t => t.id === activeTab)?.label}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-gray-400 mt-2 text-lg">Admin control center and system analytics.</motion.p>
          </div>
          {activeTab === 'overrides' && (
            <motion.button onClick={handleDownloadReport} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
              <Download size={18} /> Export Full CSV Report
            </motion.button>
          )}
        </header>

        {/* ORG INTELLIGENCE */}
        {activeTab === 'insights' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Total Goals" value={insights?.totalGoals || 0} icon={Users} colorClass="bg-blue-500" />
              <StatCard title="Completed Goals" value={insights?.completedGoals || 0} icon={Activity} colorClass="bg-green-500" />
              <StatCard title="Pending Check-ins" value={(insights?.totalEmployees || 0) - (insights?.employeesCompletedCheckins || 0)} icon={ShieldAlert} colorClass="bg-red-500" />
              <StatCard title="Manager Pending" value={insights?.pendingManagerReviews || 0} icon={Cpu} colorClass="bg-yellow-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-[350px] relative overflow-hidden border border-white/5">
                <div className="absolute top-[-20%] right-[-10%] w-[15rem] h-[15rem] bg-indigo-600/10 rounded-full blur-[60px] pointer-events-none"></div>
                <h3 className="text-lg font-display font-bold mb-4 relative z-10 flex items-center gap-2"><BarChart2 size={18} className="text-indigo-400" /> SMART Score by Department</h3>
                <div className="h-[250px] relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights?.smartScoreByDept || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.4} />
                      <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dx={-10} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                      <Bar dataKey="avgScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-[350px] border border-white/5">
                <h3 className="text-lg font-display font-bold mb-4">Manager Effectiveness Leaderboard</h3>
                <div className="space-y-4 overflow-y-auto h-[250px] pr-2 custom-scrollbar">
                  {insights?.managerRankings?.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800 rounded-xl border border-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>#{i + 1}</div>
                        <span className="font-medium text-white">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3 w-1/3">
                        <div className="w-full h-2 bg-dark-900 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${m.effectiveness}%` }}></div>
                        </div>
                        <span className="text-sm font-bold w-8 text-right text-purple-300">{m.effectiveness}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-[350px] border border-white/5">
                <h3 className="text-lg font-display font-bold mb-4">Goal Abandonment Rate</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Active/Completed', value: 100 - (insights?.abandonmentRate || 0) },
                        { name: 'Abandoned', value: insights?.abandonmentRate || 0 }
                      ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-[350px] border border-white/5">
                <h3 className="text-lg font-display font-bold mb-4">Quality Issues Tracking</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights?.commonIssues || []} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" opacity={0.4} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                      <YAxis dataKey="issue" type="category" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* SHARED KPIS */}
        {activeTab === 'shared' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Master KPIs" value={sharedAnalytics?.totalMasterGoals || 0} icon={Users} colorClass="bg-blue-500" />
              <StatCard title="Total Distributed" value={sharedAnalytics?.totalAssignedGoals || 0} icon={Share2} colorClass="bg-indigo-500" />
              <StatCard title="Employee Participation" value={`${sharedAnalytics?.participationRate || 0}%`} icon={Activity} colorClass="bg-green-500" />
              <StatCard title="Completion Rate" value={`${sharedAnalytics?.overallCompletionRate || 0}%`} icon={Cpu} colorClass="bg-purple-500" />
            </div>

            {sharedAnalytics?.departmentPerformance?.length > 0 && (
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-[350px] border border-white/5">
                <h3 className="text-lg font-display font-bold mb-4">Department-wise Shared KPI Performance</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sharedAnalytics.departmentPerformance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.4} />
                      <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dx={-10} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                      <Bar dataKey="performance" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-fit border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <h3 className="text-lg font-display font-bold mb-2 flex items-center gap-2 relative z-10"><Share2 size={18} className="text-indigo-400"/> Create Organization KPI</h3>
                <p className="text-sm text-gray-400 mb-6 relative z-10">These goals will be locked. Assigned employees can only edit their weightage.</p>
              
                <form onSubmit={handleCreateSharedGoal} className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-300">KPI Title</label>
                    <input required value={sharedGoalForm.title} onChange={e => setSharedGoalForm({...sharedGoalForm, title: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors placeholder-gray-500" placeholder="e.g. Q3 Compliance Training" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-300">Description</label>
                    <textarea value={sharedGoalForm.description} onChange={e => setSharedGoalForm({...sharedGoalForm, description: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors h-24 resize-none placeholder-gray-500"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Target Value</label>
                      <input type="number" required value={sharedGoalForm.target_value} onChange={e => setSharedGoalForm({...sharedGoalForm, target_value: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Unit</label>
                      <select value={sharedGoalForm.uom_type} onChange={e => setSharedGoalForm({...sharedGoalForm, uom_type: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-indigo-500/50 transition-colors">
                        <option>Numeric</option><option>Percentage</option><option>Timeline</option>
                      </select>
                    </div>
                  </div>
                  
                  <button type="submit" disabled={sharedGoalForm.employeeIds.length === 0} className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20">
                    Assign to {sharedGoalForm.employeeIds.length} Employees
                  </button>
                </form>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-[600px] flex flex-col border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-display font-bold">Bulk Assign Employees</h3>
                  <button onClick={() => setSharedGoalForm(p => ({...p, employeeIds: employees.map(e => e.id)}))} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">Select All</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {employees.map(emp => (
                    <div key={emp.id} onClick={() => toggleEmployeeSelection(emp.id)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${sharedGoalForm.employeeIds.includes(emp.id) ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/5 bg-dark-800/50 hover:bg-dark-800'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${sharedGoalForm.employeeIds.includes(emp.id) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'}`}>
                        {sharedGoalForm.employeeIds.includes(emp.id) && <CheckSquare size={14} className="text-white" />}
                      </div>
                      <div>
                        <p className="font-bold text-white">{emp.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{emp.department}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* CYCLE CONFIG */}
        {activeTab === 'cycles' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 rounded-2xl h-fit border border-white/5">
              <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-2"><Plus size={18} className="text-brand-400" /> New Quarter Cycle</h3>
              <form onSubmit={handleCreateCycle} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-300">Cycle Name</label>
                  <input required value={cycleForm.name} onChange={e => setCycleForm({...cycleForm, name: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 transition-colors placeholder-gray-600" placeholder="e.g. Q1 2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-300">Start Date</label>
                  <input type="date" required value={cycleForm.start_date} onChange={e => setCycleForm({...cycleForm, start_date: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 transition-colors text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-300">End Date</label>
                  <input type="date" required value={cycleForm.end_date} onChange={e => setCycleForm({...cycleForm, end_date: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 transition-colors text-white [color-scheme:dark]" />
                </div>
                {editingCycle && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-300">Status</label>
                    <select value={cycleForm.status} onChange={e => setCycleForm({...cycleForm, status: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 transition-colors">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
                <div className="pt-2">
                  <button type="submit" className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-brand-500/20">
                    {editingCycle ? 'Update Cycle' : 'Activate Cycle'}
                  </button>
                  {editingCycle && (
                    <button type="button" onClick={() => { setEditingCycle(null); setCycleForm({ name: '', start_date: '', end_date: '', status: 'active' })}} className="w-full py-3 bg-dark-800 hover:bg-dark-700 border border-white/10 rounded-xl font-bold transition-colors text-sm mt-3">Cancel Edit</button>
                  )}
                </div>
              </form>
            </motion.div>
            
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border border-white/5">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xl font-display font-bold">Cycle History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-dark-800/50 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Name</th>
                      <th className="px-6 py-4 font-bold">Start Date</th>
                      <th className="px-6 py-4 font-bold">End Date</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {cycles.map(c => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                        <td className="px-6 py-4 text-gray-300">{new Date(c.start_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-gray-300">{new Date(c.end_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] rounded border font-bold uppercase tracking-wider ${c.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{c.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openEditCycle(c)} className="text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center transition-colors">Edit</button>
                        </td>
                      </tr>
                    ))}
                    {cycles.length === 0 && <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No cycles configured.</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-200px)] border border-white/5">
            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 className="text-xl font-display font-bold">System Audit Logs</h3>
              <div className="flex items-center gap-2 bg-dark-900 px-4 py-2 rounded-xl w-64 border border-white/10 focus-within:border-brand-500/50 transition-colors">
                <Search size={16} className="text-gray-500" />
                <input placeholder="Search logs..." className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-600" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-dark-800/80 backdrop-blur-md text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-bold">Timestamp</th>
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Action</th>
                    <th className="px-6 py-4 font-bold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log, i) => {
                    let detailsObj = null;
                    try { detailsObj = JSON.parse(log.details); } catch (e) { }
                    return (
                    <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-white">{log.user.name} <span className="block text-xs text-gray-500 mt-0.5">{log.user.email}</span></td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 bg-dark-900 border border-white/10 rounded-md text-xs font-mono text-brand-300">{log.action}</span></td>
                      <td className="px-6 py-4">
                        {detailsObj ? (
                          <div className="text-sm">
                            <p className="font-medium text-white mb-2">{detailsObj.message}</p>
                            <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 text-xs font-mono">
                              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl w-full">
                                <span className="block font-bold mb-1.5 text-red-400">Before:</span>
                                <span className="break-all">{JSON.stringify(detailsObj.old)}</span>
                              </div>
                              <div className="bg-green-500/10 border border-green-500/20 text-green-300 p-3 rounded-xl w-full">
                                <span className="block font-bold mb-1.5 text-green-400">After:</span>
                                <span className="break-all">{JSON.stringify(detailsObj.new)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="max-w-md truncate block text-gray-300" title={log.details}>{log.details}</span>
                        )}
                      </td>
                    </motion.tr>
                    );
                  })}
                  {auditLogs.length === 0 && <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">No audit logs found.</td></tr>}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* DATA & OVERRIDES */}
        {activeTab === 'overrides' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-2xl">
            <div className="glass-card p-8 rounded-2xl border border-red-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex items-center gap-3 text-red-400 mb-4 relative z-10">
                <ShieldAlert size={28} />
                <h2 className="text-2xl font-display font-bold">Emergency Goal Override</h2>
              </div>
              <p className="text-gray-400 mb-8 relative z-10 text-lg">Unlocking a goal allows an employee to edit and resubmit it. This action is permanently logged in the audit trail.</p>
              
              <form onSubmit={handleUnlock} className="space-y-6 relative z-10">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-300">Target Goal ID</label>
                  <input type="number" required value={unlockForm.goal_id} onChange={e => setUnlockForm({...unlockForm, goal_id: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-red-500/50 transition-colors placeholder-gray-600" placeholder="e.g. 42" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-300">Mandatory Justification</label>
                  <textarea required minLength="10" value={unlockForm.justification} onChange={e => setUnlockForm({...unlockForm, justification: e.target.value})} className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3.5 outline-none focus:border-red-500/50 transition-colors h-32 resize-none placeholder-gray-600" placeholder="Explain why this goal is being overridden..."></textarea>
                </div>
                <button type="submit" className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20 text-lg">Force Unlock Goal</button>
              </form>
            </div>
          </motion.div>
        )}

      </div>
      
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
};

export default AdminDashboard;
