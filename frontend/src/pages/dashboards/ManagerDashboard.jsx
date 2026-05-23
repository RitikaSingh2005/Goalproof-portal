import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Target, Users, TrendingUp, AlertCircle, Edit2, CheckCircle, XCircle, MessageCircle, Clock, Share2, Lock, Loader2, BarChart2, User, Settings } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../services/api';
import toast from 'react-hot-toast';
import ProfileModal from '../../components/ProfileModal';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const StatCard = ({ title, value, icon: Icon, trend, colorClass = "brand" }) => (
  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card p-6 relative overflow-hidden group border border-white/5 hover:border-white/10 transition-colors">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${colorClass}-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500`}></div>
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-3xl font-display font-bold text-white mt-2">{value}</p>
        {trend && (
          <p className="text-xs text-yellow-400 font-medium mt-2 flex items-center bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 w-fit">
            <TrendingUp size={12} className="mr-1" />
            {trend}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-2xl bg-${colorClass}-500/10 flex items-center justify-center border border-${colorClass}-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]`}>
        <Icon size={24} className={`text-${colorClass}-400`} />
      </div>
    </div>
  </motion.div>
);

const EditGoalModal = ({ goal, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: goal.title,
    description: goal.description || '',
    target_value: goal.target_value,
    weightage: goal.weightage,
    thrust_area: goal.thrust_area || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(goal.id, formData);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-dark-900 border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <h3 className="text-2xl font-display font-bold text-white mb-6">Edit Goal</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 text-white" rows="2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Target</label>
              <input type="number" value={formData.target_value} onChange={(e) => setFormData({...formData, target_value: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Weightage (%)</label>
              <input type="number" value={formData.weightage} onChange={(e) => setFormData({...formData, weightage: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 text-white" required />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-8">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20">Save Changes</button>
          </div>
        </form>
      </motion.div>
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </motion.div>
  );
};

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [pendingGoals, setPendingGoals] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [attentionScore, setAttentionScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, teamRes, scoreRes] = await Promise.all([
        api.getPendingGoals(),
        api.getTeamAnalytics(),
        api.getAttentionScore()
      ]);
      setPendingGoals(goalsRes.data.goals || []);
      setTeamStats(teamRes.data.team || []);
      setAttentionScore(scoreRes.data.score || 0);
    } catch (error) {
      console.error('Error fetching manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.approveGoal(id);
      toast.success('Goal approved!');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve goal.');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.rejectGoal(id);
      toast.success('Goal rejected.');
      fetchData();
    } catch (err) {
      toast.error('Failed to reject goal.');
    }
  };

  const handleSaveEdit = async (id, data) => {
    try {
      await api.editGoalByManager(id, data);
      toast.success('Goal updated successfully!');
      setEditingGoal(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update goal.');
    }
  };

  const teamProgressData = teamStats.map(member => ({
    name: member.name.split(' ')[0],
    Progress: member.overallProgress
  }));

  const goalStatusDistribution = [
    { name: 'On Track', value: teamStats.filter(t => t.status === 'On Track').length },
    { name: 'At Risk', value: teamStats.filter(t => t.status === 'At Risk').length },
    { name: 'Critical', value: teamStats.filter(t => t.status === 'Critical').length }
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)] bg-dark-900">
        <Loader2 size={48} className="animate-spin text-brand-500" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-dark-900 text-white font-sans p-8 lg:p-12 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <motion.h2 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-display font-bold">Manager Dashboard</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-gray-400 mt-2 text-lg">Review team goals, assess risks, and track performance.</motion.p>
          </div>
          <div className="flex items-center gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center space-x-4 bg-dark-800/50 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg border border-white/10">
              <div className="relative">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" 
                    strokeDasharray={150.8} strokeDashoffset={150.8 - (150.8 * attentionScore) / 100}
                    className={`${attentionScore >= 80 ? 'text-green-500' : attentionScore >= 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold">{attentionScore}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Attention Score</p>
                <p className="text-lg font-bold bg-clip-text text-transparent bg-gradient-premium">{attentionScore >= 80 ? 'Excellent' : attentionScore >= 50 ? 'Needs Focus' : 'Critical Risk'}</p>
              </div>
            </motion.div>

            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 bg-dark-800/50 hover:bg-white/5 border border-white/10 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg transition-all group h-[82px]"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-premium p-[1px] group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-shadow">
                <div className="w-full h-full bg-dark-900 rounded-full flex items-center justify-center font-bold text-sm text-white">
                  {user?.name?.charAt(0)}
                </div>
              </div>
              <div className="text-left hidden sm:block pr-2">
                <p className="text-sm font-medium leading-tight text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">Manager</p>
              </div>
              <Settings size={16} className="text-gray-500 group-hover:text-white transition-colors" />
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Team Members" value={teamStats.length} icon={Users} colorClass="brand" />
          <StatCard title="Pending Approvals" value={pendingGoals.length} icon={AlertCircle} trend={pendingGoals.length > 5 ? "Needs Attention" : ""} colorClass={pendingGoals.length > 0 ? "yellow" : "gray"} />
          <StatCard title="Avg Completion" value={`${Math.round(teamStats.reduce((a, b) => a + b.overallProgress, 0) / (teamStats.length || 1))}%`} icon={Target} colorClass="fuchsia" />
          <StatCard title="On Track" value={goalStatusDistribution.find(d => d.name === 'On Track')?.value || 0} icon={CheckCircle} colorClass="green" />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pending Approvals */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[600px] border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display font-bold flex items-center">
                <Clock className="mr-2 text-brand-400" size={20} />
                Pending Approvals
              </h3>
              <span className="bg-brand-500/10 text-brand-300 border border-brand-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {pendingGoals.length} Tasks
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-4 custom-scrollbar">
              {pendingGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                  <CheckCircle size={64} className="mb-4 text-green-400/50" />
                  <p className="text-lg font-medium">All caught up! No pending approvals.</p>
                </div>
              ) : (
                pendingGoals.map((goal, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={goal.id} 
                    className={`p-5 rounded-2xl border ${goal.isMismatch ? 'border-red-500/30 bg-red-500/5' : goal.isDecayed ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 bg-dark-800/50 hover:bg-dark-800'} relative transition-colors group`}
                  >
                    
                    {goal.isMismatch && (
                      <div className="absolute -top-3 -right-2 bg-red-500/20 text-red-300 border border-red-500/30 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-lg flex items-center shadow-lg z-10 animate-pulse">
                        <AlertCircle size={12} className="mr-1" /> Verification Mismatch
                      </div>
                    )}
                    {goal.isDecayed && !goal.isMismatch && (
                      <div className="absolute -top-3 -right-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-lg flex items-center shadow-lg z-10">
                        <Clock size={12} className="mr-1" /> Stale &gt; 14 Days
                      </div>
                    )}
                    {goal.is_shared && goal.weightage === 0 && (
                      <div className="absolute -top-3 -right-2 bg-red-500/20 text-red-300 border border-red-500/30 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-lg flex items-center shadow-lg z-10 animate-pulse">
                        <AlertCircle size={12} className="mr-1" /> At-Risk: Weight Missing
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 pr-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {goal.is_shared && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-fuchsia-300 bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20">
                              <Share2 size={10} /> SHARED KPI
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 uppercase tracking-wider">{goal.user.name}</span>
                        </div>
                        <h4 className="font-display font-bold mt-1 text-lg flex items-center gap-2">
                          {goal.title} {goal.is_shared && <Lock size={14} className="text-gray-500" />}
                        </h4>
                        <p className="text-sm text-gray-400 mt-2 mb-4 line-clamp-2 leading-relaxed">{goal.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="bg-dark-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Weight</span>
                            <span className="font-medium text-brand-300">{goal.weightage}%</span>
                          </div>
                          <div className="bg-dark-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Target</span>
                            <span className="font-medium text-white">{goal.target_value} <span className="text-xs text-gray-500">{goal.uom_type}</span></span>
                          </div>
                          <div className="bg-dark-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Current</span>
                            <span className={`font-medium ${goal.isMismatch ? 'text-red-400' : 'text-white'}`}>{goal.progress} <span className="text-xs text-gray-500">{goal.uom_type}</span></span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 shrink-0 opacity-100 lg:opacity-50 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleApprove(goal.id)} className="w-28 px-3 py-2 text-xs font-bold text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-all flex justify-center items-center shadow-lg">
                          <CheckCircle size={14} className="mr-1.5" /> Approve
                        </button>
                        <button onClick={() => setEditingGoal(goal)} className="w-28 px-3 py-2 text-xs font-bold text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 rounded-xl transition-all flex justify-center items-center shadow-lg">
                          <Edit2 size={14} className="mr-1.5" /> Edit
                        </button>
                        <button onClick={() => handleReject(goal.id)} className="w-28 px-3 py-2 text-xs font-bold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all flex justify-center items-center shadow-lg">
                          <XCircle size={14} className="mr-1.5" /> Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Team Analytics Side */}
          <div className="space-y-8 flex flex-col h-[600px]">
            <div className="glass-card p-6 flex-1 flex flex-col border border-white/5 relative overflow-hidden">
              <div className="absolute top-[-20%] left-[-10%] w-[15rem] h-[15rem] bg-brand-600/10 rounded-full blur-[60px] pointer-events-none"></div>
              <h3 className="text-lg font-display font-bold mb-4 relative z-10 flex items-center gap-2"><BarChart2 size={18} className="text-brand-400"/> Team Progress</h3>
              <div className="flex-1 w-full min-h-[200px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.4} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} dx={-10} />
                    <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="Progress" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6 flex-1 flex flex-col border border-white/5 relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-[15rem] h-[15rem] bg-fuchsia-600/10 rounded-full blur-[60px] pointer-events-none"></div>
              <h3 className="text-lg font-display font-bold mb-4 relative z-10">Status Distribution</h3>
              <div className="flex-1 w-full min-h-[150px] flex items-center justify-center relative z-10">
                {goalStatusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={goalStatusDistribution} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                        {goalStatusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm">No data available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Roster */}
        <div className="glass-card overflow-hidden border border-white/5 mt-8">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h3 className="text-xl font-display font-bold">Team Roster</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-dark-800/50 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Employee</th>
                  <th className="px-6 py-4 font-bold">Department</th>
                  <th className="px-6 py-4 font-bold">Goals (Appr / Pend)</th>
                  <th className="px-6 py-4 font-bold">Completion</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teamStats.map((member, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    key={member.id} className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-premium p-[1px]">
                        <div className="w-full h-full bg-dark-900 rounded-full flex items-center justify-center font-bold text-xs">{member.name.charAt(0)}</div>
                      </div>
                      {member.name}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{member.department}</td>
                    <td className="px-6 py-4 font-medium"><span className="text-green-400">{member.approvedGoals}</span> <span className="text-gray-600 mx-1">/</span> <span className="text-yellow-400">{member.pendingGoals}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-8">{member.overallProgress}%</span>
                        <div className="w-full bg-dark-700 rounded-full h-1.5 max-w-[80px] overflow-hidden">
                          <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${member.overallProgress}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded border uppercase tracking-wider
                        ${member.status === 'On Track' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          member.status === 'At Risk' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                          'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center transition-colors">
                        <MessageCircle size={14} className="mr-1.5" /> Feedback
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>

      <AnimatePresence>
        {editingGoal && (
          <EditGoalModal 
            goal={editingGoal} 
            onClose={() => setEditingGoal(null)} 
            onSave={handleSaveEdit} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManagerDashboard;
