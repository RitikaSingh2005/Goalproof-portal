import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGoals, createGoal, deleteGoal, submitAllGoals, getSmartScore, getActiveWindow, submitCheckin, getCheckinHistory, verifyAchievement } from '../../services/api';
import api from '../../services/api';
import CircularMeter from '../../components/CircularMeter';
import ProfileModal from '../../components/ProfileModal';
import { Target, CheckCircle2, AlertCircle, Plus, Trash2, Send, Loader2, Calendar, LineChart as LineChartIcon, Lock, Edit2, Share2, X, LayoutDashboard, Sparkles, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); 
  const [showWelcome, setShowWelcome] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Data State
  const [goals, setGoals] = useState([]);
  const [activeWindow, setActiveWindow] = useState({ isActive: false, quarter: null, year: null });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State - Goals
  const [thrustArea, setThrustArea] = useState('Sales');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uomType, setUomType] = useState('Numeric');
  const [targetValue, setTargetValue] = useState('');
  const [weightage, setWeightage] = useState('');
  
  // Edit Goal Modal
  const [editingGoal, setEditingGoal] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', target_value: '', weightage: '', thrust_area: '', uom_type: '' });
  
  // Form State - Checkin
  const [checkinForm, setCheckinForm] = useState({ goal_id: '', actual_value: '', status: 'Not Started', description: '' });
  const [aiWarning, setAiWarning] = useState(null);
  const [verifyingAi, setVerifyingAi] = useState(false);
  
  // AI State - Goals
  const [smartScore, setSmartScore] = useState(null);
  const [smartFeedback, setSmartFeedback] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [scoringLoading, setScoringLoading] = useState(false);

  // Status/Errors
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, windowRes, historyRes] = await Promise.all([
        getGoals(),
        getActiveWindow(),
        getCheckinHistory()
      ]);
      setGoals(goalsRes.data.goals || []);
      setActiveWindow(windowRes.data || { isActive: false, quarter: null, year: null });
      setHistory(historyRes.data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced AI Scoring for Goal Creation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title.trim().length > 5) {
        setScoringLoading(true);
        try {
          const res = await getSmartScore(title);
          setSmartScore(res.data.score);
          setSmartFeedback(res.data.feedback);
          setSmartSuggestions(res.data.suggestions || []);
        } catch (err) {
          console.error("AI scoring failed", err);
        } finally {
          setScoringLoading(false);
        }
      } else {
        setSmartScore(null);
        setSmartFeedback('');
        setSmartSuggestions([]);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title]);

  // Debounced AI Verification for Checkin
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (checkinForm.goal_id && checkinForm.actual_value !== '') {
        const goal = goals.find(g => g.id === parseInt(checkinForm.goal_id));
        if (!goal) return;
        
        setVerifyingAi(true);
        try {
          const res = await verifyAchievement({
            achievement: parseFloat(checkinForm.actual_value),
            goalTitle: goal.title,
            target: goal.target_value
          });
          setAiWarning(res.data.warning);
        } catch (err) {
          console.error("AI verification failed", err);
        } finally {
          setVerifyingAi(false);
        }
      } else {
        setAiWarning(null);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [checkinForm.actual_value, checkinForm.goal_id, goals]);

  const totalWeightage = goals.reduce((acc, g) => acc + g.weightage, 0);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setFormError('');
    if (goals.length >= 8) return setFormError('Maximum 8 goals allowed.');
    if (parseInt(weightage) < 10) return setFormError('Weightage must be at least 10%.');
    if (totalWeightage + parseInt(weightage) > 100) return setFormError(`Adding this exceeds 100% total weightage. Current: ${totalWeightage}%`);

    try {
      await createGoal({ thrust_area: thrustArea, title, description, uom_type: uomType, target_value: targetValue, weightage, smart_score: smartScore });
      toast.success('Goal created successfully!');
      fetchData();
      setTitle(''); setDescription(''); setTargetValue(''); setWeightage(''); setSmartScore(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create goal');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteGoal(id);
      toast.success('Goal deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleEditGoal = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.editGoal(editingGoal.id, editForm);
      toast.success('Goal updated successfully');
      setEditingGoal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update goal');
    }
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setEditForm({
      title: goal.title, description: goal.description || '', target_value: goal.target_value, weightage: goal.weightage, thrust_area: goal.thrust_area, uom_type: goal.uom_type
    });
  };

  const handleSubmitAll = async () => {
    if (totalWeightage !== 100) return toast.error('Total weightage must be exactly 100% before submission.');
    if (goals.some(g => g.weightage < 10)) return toast.error('All goals must have at least 10% weightage.');
    try {
      await submitAllGoals();
      fetchData();
      toast.success('Goals submitted for manager approval successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit goals');
    }
  };

  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitCheckin(checkinForm);
      toast.success('Check-in submitted successfully!');
      setCheckinForm({ goal_id: '', actual_value: '', status: 'Not Started', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit check-in');
    }
  };

  const isFormDisabled = goals.some(g => g.status === 'pending' || g.status === 'approved');
  const approvedGoals = goals.filter(g => g.status === 'approved');

  if (loading) return <div className="p-8 flex justify-center items-center h-screen bg-dark-900"><Loader2 size={48} className="animate-spin text-brand-500" /></div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'goals', label: 'My Goals', icon: Target },
    { id: 'checkin', label: 'Quarterly Check-in', icon: Calendar },
    { id: 'history', label: 'History & Analytics', icon: LineChartIcon }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex h-screen bg-dark-900 text-white font-sans overflow-hidden relative">
      {/* Background glowing effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-72 glass border-r border-white/5 p-6 flex flex-col justify-between z-10"
      >
        <div>
          <div className="flex items-center gap-3 mb-10 pl-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Target size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold font-display tracking-tight">GoalProof</span>
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
                    <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
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
              <div className="w-full h-full bg-dark-900 rounded-full flex items-center justify-center font-bold text-sm text-white">
                {user.name.charAt(0)}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight text-white">{user.name}</p>
              <p className="text-xs text-gray-400">{user.department}</p>
            </div>
          </div>
          <Settings size={16} className="text-gray-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 md:hidden lg:block" />
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 lg:p-12 custom-scrollbar z-10 relative">
        <header className="mb-10">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-display font-bold capitalize">
            {activeTab === 'overview' ? 'Dashboard Overview' :
             activeTab === 'checkin' ? 'Quarterly Check-In' : 
             activeTab === 'history' ? 'Check-In History' : 
             'My Goals'}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-gray-400 mt-2 text-lg">
            {activeTab === 'overview' ? 'High-level summary of your performance and alignment.' :
             activeTab === 'checkin' ? 'Update your approved goals for the current quarter.' : 
             activeTab === 'history' ? 'Review past performance and analytics.' : 
             'Manage and track your enterprise performance goals.'}
          </motion.p>
        </header>

        {activeTab === 'overview' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
                <p className="text-sm font-medium text-gray-400">Total Goals</p>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-4xl font-display font-bold">{goals.length}</p>
                  <p className="text-gray-500 mb-1">/ 8 allowed</p>
                </div>
                <Target size={24} className="absolute bottom-6 right-6 text-brand-500/50" />
              </motion.div>
              
              <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
                <p className="text-sm font-medium text-gray-400">Approved Goals</p>
                <p className="text-4xl font-display font-bold mt-2 text-green-400">{approvedGoals.length}</p>
                <CheckCircle2 size={24} className="absolute bottom-6 right-6 text-green-500/50" />
              </motion.div>
              
              <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500"></div>
                <p className="text-sm font-medium text-gray-400">Active Window</p>
                <p className="text-2xl font-display font-bold mt-3 text-fuchsia-400">{activeWindow.isActive ? `${activeWindow.quarter} ${activeWindow.year}` : 'Closed'}</p>
                <Calendar size={24} className="absolute bottom-6 right-6 text-fuchsia-500/50" />
              </motion.div>
            </div>

            <AnimatePresence>
              {showWelcome && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  className="glass-card p-8 bg-gradient-premium relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                  <button onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10">
                    <X size={20} />
                  </button>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-display font-bold mb-3 flex items-center gap-2">
                      <Sparkles size={24} className="text-white/80" /> Welcome back, {user.name}!
                    </h2>
                    <p className="text-white/80 max-w-2xl text-lg mb-6">
                      {goals.length === 0 ? "You haven't set any goals yet. Head over to the 'My Goals' tab to get started and align with your department's objectives." :
                       totalWeightage !== 100 ? `Your goals currently total ${totalWeightage}% weightage. You must reach exactly 100% before submitting for approval.` :
                       !isFormDisabled ? "Your goals are fully weighted at 100%. Don't forget to submit them for your manager's approval in the 'My Goals' tab." :
                       "Your goals are submitted. Check back during the active quarterly window to submit your check-ins."}
                    </p>
                    <button onClick={() => setActiveTab('goals')} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium rounded-xl transition-all shadow-lg">
                      Go to My Goals
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'goals' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex flex-wrap gap-4 mb-8">
              <motion.div variants={itemVariants} className="glass-card px-6 py-4 flex items-center gap-4 min-w-[200px]">
                <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center border border-white/5"><Target size={20} className="text-brand-400" /></div>
                <div>
                  <div className="text-sm text-gray-400">Total Goals</div>
                  <div className="text-2xl font-display font-bold">{goals.length}/8</div>
                </div>
              </motion.div>
              
              <motion.div variants={itemVariants} className={`glass-card px-6 py-4 flex items-center gap-4 min-w-[200px] ${totalWeightage > 100 || (totalWeightage < 100 && totalWeightage > 0) ? 'border-red-500/50 shadow-red-500/10' : ''}`}>
                <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center border border-white/5"><LineChartIcon size={20} className={totalWeightage === 100 ? 'text-green-400' : 'text-fuchsia-400'} /></div>
                <div>
                  <div className="text-sm text-gray-400">Weightage</div>
                  <div className={`text-2xl font-display font-bold ${totalWeightage === 100 ? 'text-green-400' : 'text-fuchsia-400'}`}>{totalWeightage}%</div>
                </div>
              </motion.div>

              {!isFormDisabled && goals.length > 0 && (
                <motion.div variants={itemVariants} className="ml-auto flex items-center">
                  <button onClick={handleSubmitAll} className="flex items-center gap-2 px-8 py-4 bg-gradient-premium text-white rounded-xl font-medium hover:opacity-90 shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5">
                    <Send size={18} /> Submit for Manager Approval
                  </button>
                </motion.div>
              )}
            </div>

            {totalWeightage < 100 && !isFormDisabled && (
              <motion.div variants={itemVariants} className="mb-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 flex items-center gap-3 backdrop-blur-md">
                <AlertCircle size={20} className="text-yellow-400" />
                <p>Total weightage is {totalWeightage}%. It must be exactly 100% to submit for approval.</p>
              </motion.div>
            )}
            {totalWeightage > 100 && (
              <motion.div variants={itemVariants} className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-center gap-3 backdrop-blur-md">
                <AlertCircle size={20} className="text-red-400" />
                <p>Total weightage exceeds 100%! Please adjust your goals.</p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Form */}
              {!isFormDisabled && (
                <motion.div variants={itemVariants} className="xl:col-span-1 glass-card p-6 h-fit sticky top-0">
                  <h2 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-white">
                    <Plus size={20} className="text-brand-400"/> Create Objective
                  </h2>
                  {formError && <div className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{formError}</div>}
                  
                  <form onSubmit={handleCreateGoal} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Thrust Area</label>
                      <select value={thrustArea} onChange={(e) => setThrustArea(e.target.value)} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm">
                        <option>Sales</option><option>Operations</option><option>Customer Success</option><option>Engineering</option><option>HR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Goal Title</label>
                      <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm placeholder-gray-500" placeholder="e.g., Increase Q3 revenue by 15%..." />
                    </div>
                    
                    <AnimatePresence>
                      {(title.length > 5 || scoringLoading) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-dark-800 border border-brand-500/20 rounded-xl p-4 overflow-hidden relative">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-brand-500/10 blur-xl"></div>
                          <div className="flex items-center gap-4 mb-2 relative z-10">
                            <CircularMeter score={smartScore} />
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2 text-brand-300">
                                AI SMART Analysis {scoringLoading && <Loader2 size={14} className="animate-spin" />}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{smartFeedback || 'Analyzing semantics...'}</p>
                            </div>
                          </div>
                          {smartSuggestions.length > 0 && (
                            <ul className="text-xs text-fuchsia-300 list-disc pl-4 mt-3 space-y-1 relative z-10">
                              {smartSuggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                            </ul>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm h-24 resize-none placeholder-gray-500" placeholder="Add specific context..."></textarea>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-300">Unit Type</label>
                        <select value={uomType} onChange={(e) => setUomType(e.target.value)} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm">
                          <option>Numeric</option><option>Percentage</option><option>Timeline</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-300">Target Value</label>
                        <input type="number" required value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm placeholder-gray-500" placeholder="e.g. 100" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Weightage (%)</label>
                      <input type="number" min="10" max="100" required value={weightage} onChange={(e) => setWeightage(e.target.value)} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm placeholder-gray-500" placeholder="Min 10%" />
                    </div>
                    
                    <button type="submit" disabled={scoringLoading} className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 mt-2">
                      Create Objective
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Goal List */}
              <div className={`${isFormDisabled ? 'xl:col-span-3' : 'xl:col-span-2'} space-y-4`}>
                {goals.length === 0 ? (
                  <motion.div variants={itemVariants} className="glass-card p-12 text-center text-gray-500 border border-dashed border-white/10">
                    <Target size={48} className="mx-auto mb-4 opacity-30 text-brand-400" />
                    <p className="text-lg">No objectives created yet.</p>
                    <p className="text-sm mt-1">Start defining your performance metrics to the left.</p>
                  </motion.div>
                ) : (
                  goals.map((goal, index) => (
                    <motion.div 
                      variants={itemVariants} 
                      key={goal.id} 
                      className="glass-card p-5 relative overflow-hidden group hover:border-brand-500/30 transition-colors"
                    >
                      {/* Status Badges */}
                      {goal.status === 'pending' && <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-300 text-[10px] px-3 py-1 rounded-bl-lg font-bold uppercase tracking-wider border-b border-l border-yellow-500/20 backdrop-blur-md">Pending Review</div>}
                      {goal.status === 'draft' && <div className="absolute top-0 right-0 bg-white/10 text-gray-300 text-[10px] px-3 py-1 rounded-bl-lg font-bold uppercase tracking-wider border-b border-l border-white/10 backdrop-blur-md">Draft</div>}
                      {goal.status === 'approved' && <div className="absolute top-0 right-0 bg-green-500/20 text-green-300 text-[10px] px-3 py-1 rounded-bl-lg font-bold uppercase tracking-wider border-b border-l border-green-500/20 backdrop-blur-md">Active</div>}
                      
                      <div className="flex justify-between items-start gap-4 pr-16">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {goal.is_shared && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-fuchsia-300 bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20">
                                <Share2 size={10} /> ENTERPRISE KPI
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded uppercase tracking-wider border border-brand-500/20">{goal.thrust_area}</span>
                            {goal.smart_score && <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${goal.smart_score >= 70 ? 'text-green-300 bg-green-500/10 border-green-500/20' : 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20'}`}>SMART {goal.smart_score}</span>}
                          </div>
                          
                          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                            {goal.title} {goal.is_shared && <Lock size={14} className="text-gray-500" />}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1 mb-4 leading-relaxed">{goal.description}</p>
                          
                          <div className="flex gap-8 text-sm">
                            <div className="bg-dark-800/50 px-3 py-1.5 rounded-lg border border-white/5">
                              <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Target</span>
                              <span className="font-medium text-white">{goal.target_value} <span className="text-gray-400 text-xs">{goal.uom_type}</span></span>
                            </div>
                            <div className="bg-dark-800/50 px-3 py-1.5 rounded-lg border border-white/5">
                              <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">Weight</span>
                              <span className="font-medium text-brand-300">{goal.weightage}%</span>
                            </div>
                          </div>
                        </div>
                        
                        {!isFormDisabled && (
                          <div className="flex flex-col gap-2 shrink-0">
                            <button onClick={() => openEditModal(goal)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10">
                              <Edit2 size={16} />
                            </button>
                            {!goal.is_shared && (
                              <button onClick={() => handleDelete(goal.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* CHECK-IN TAB */}
        {activeTab === 'checkin' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {!activeWindow.isActive ? (
              <motion.div variants={itemVariants} className="glass-card p-16 text-center border-red-500/20 shadow-red-500/5 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
                <AlertCircle size={48} className="mx-auto text-red-400 mb-6 relative z-10" />
                <h2 className="text-3xl font-display font-bold mb-3 relative z-10">Check-in Window Closed</h2>
                <p className="text-gray-400 text-lg relative z-10">Enterprise quarterly review cycles are currently inactive.</p>
              </motion.div>
            ) : approvedGoals.length === 0 ? (
              <motion.div variants={itemVariants} className="glass-card p-16 text-center border-yellow-500/20 shadow-yellow-500/5 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
                <AlertCircle size={48} className="mx-auto text-yellow-400 mb-6 relative z-10" />
                <h2 className="text-3xl font-display font-bold mb-3 relative z-10">No Active Objectives</h2>
                <p className="text-gray-400 text-lg relative z-10">You must have approved goals to log quarterly achievements.</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div variants={itemVariants} className="glass-card p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-2xl font-display font-bold">Log Achievement</h2>
                    <span className="bg-brand-500/20 border border-brand-500/30 text-brand-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {activeWindow.quarter} {activeWindow.year}
                    </span>
                  </div>

                  <form onSubmit={handleCheckinSubmit} className="space-y-6 relative z-10">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Select Objective</label>
                      <select required value={checkinForm.goal_id} onChange={(e) => setCheckinForm({...checkinForm, goal_id: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm">
                        <option value="">-- Choose Active Objective --</option>
                        {approvedGoals.map(g => <option key={g.id} value={g.id}>{g.title} (Target: {g.target_value})</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-300">Actual Result</label>
                        <div className="relative">
                          <input type="number" step="0.01" required value={checkinForm.actual_value} onChange={(e) => setCheckinForm({...checkinForm, actual_value: e.target.value})} className={`w-full bg-dark-800 border rounded-xl px-4 py-3.5 outline-none transition-all text-sm ${aiWarning ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/5 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50'}`} placeholder="Enter numeric value..." />
                          {verifyingAi && <Loader2 size={16} className="absolute right-4 top-4 animate-spin text-brand-400" />}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5 text-gray-300">Milestone Status</label>
                        <select value={checkinForm.status} onChange={(e) => setCheckinForm({...checkinForm, status: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm">
                          <option>Not Started</option>
                          <option>On Track</option>
                          <option>Completed</option>
                        </select>
                      </div>
                    </div>

                    <AnimatePresence>
                      {aiWarning && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl flex items-start gap-3 backdrop-blur-md">
                          <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-400" />
                          <div>
                            <h4 className="font-bold text-sm">AI Verification Flag</h4>
                            <p className="text-xs mt-1 text-red-200/70">{aiWarning}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-300">Context & Evidence</label>
                      <textarea value={checkinForm.description} onChange={(e) => setCheckinForm({...checkinForm, description: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3.5 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all text-sm h-28 resize-none placeholder-gray-600" placeholder="Provide qualitative context for your achievement..."></textarea>
                    </div>

                    <button type="submit" disabled={verifyingAi || !!aiWarning} className="w-full py-4 bg-gradient-premium text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-brand-500/20">
                      <Send size={18} /> Submit Quarter Achievement
                    </button>
                  </form>
                </motion.div>
                
                {/* Visual Placeholder for Right Side */}
                <motion.div variants={itemVariants} className="hidden lg:flex flex-col justify-center items-center glass-card p-8 border-dashed border-white/10 opacity-50">
                  <LineChartIcon size={64} className="mb-4 text-brand-500/50" />
                  <p className="text-center text-gray-400 max-w-sm">Submitting check-ins builds your performance history over time. Data will reflect in your analytics tab instantly.</p>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            <motion.div variants={itemVariants} className="glass-card p-8 h-[450px] relative overflow-hidden">
              <div className="absolute top-[-20%] left-[-10%] w-[30rem] h-[30rem] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none"></div>
              <h2 className="text-2xl font-display font-bold mb-6 relative z-10">Performance Trajectory</h2>
              {history.length > 0 ? (
                <div className="h-[320px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history.map(h => ({ name: h.quarter, score: h.progress_score }))} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.4} />
                      <Line type="monotone" dataKey="score" stroke="#c026d3" strokeWidth={4} dot={{ r: 6, fill: '#18181b', strokeWidth: 2, stroke: '#c026d3' }} activeDot={{ r: 8, fill: '#c026d3' }} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} dx={-10} />
                      <RechartsTooltip 
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 2 }} 
                        contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 relative z-10">No analytical data generated yet.</div>
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xl font-display font-bold">Audit Log</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-dark-800/50 text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Quarter</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Objective</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Result vs Target</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Status</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Computed Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((h, i) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.05 }}
                        key={h.id} 
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-white">{h.quarter} {h.year}</td>
                        <td className="px-6 py-4 text-gray-300 max-w-[200px] truncate">{h.goal.title}</td>
                        <td className="px-6 py-4 font-medium text-gray-200">{h.actual_value} <span className="text-gray-500 mx-1">/</span> {h.goal.target_value}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] rounded border font-bold tracking-wider uppercase ${h.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-brand-500/10 text-brand-400 border-brand-500/20'}`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-fuchsia-400">{h.progress_score.toFixed(1)}%</td>
                      </motion.tr>
                    ))}
                    {history.length === 0 && <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Log is empty</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingGoal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-md p-8 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <button onClick={() => setEditingGoal(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              <h2 className="text-2xl font-display font-bold mb-6">{editingGoal.is_shared ? 'Edit Enterprise KPI' : 'Edit Objective'}</h2>
              
              {editingGoal.is_shared && (
                <div className="mb-6 p-4 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-sm rounded-xl flex gap-3 backdrop-blur-sm">
                  <Lock size={18} className="shrink-0 mt-0.5" />
                  <p>Enterprise KPIs are locked. Only weightage distribution can be modified locally.</p>
                </div>
              )}
              
              <form onSubmit={handleEditGoal} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-400">Title</label>
                  <input required value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} disabled={editingGoal.is_shared} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 disabled:opacity-50 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-400">Target</label>
                    <input type="number" required value={editForm.target_value} onChange={e => setEditForm({...editForm, target_value: e.target.value})} disabled={editingGoal.is_shared} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 disabled:opacity-50 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-400">Weightage (%)</label>
                    <input type="number" min="10" max="100" required value={editForm.weightage} onChange={e => setEditForm({...editForm, weightage: e.target.value})} className="w-full bg-dark-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-brand-500/50 text-white" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 mt-4">Save Parameters</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </div>
  );
};

export default EmployeeDashboard;
