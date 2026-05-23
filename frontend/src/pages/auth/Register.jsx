import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Target, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('employee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password, role, department);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register');
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen flex bg-dark-900 text-white font-sans overflow-hidden">
      
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-dark-900 overflow-hidden border-r border-dark-800">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-brand-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-fuchsia-600/20 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] right-[10%] w-[20rem] h-[20rem] bg-cyan-600/20 rounded-full blur-[80px] mix-blend-screen animate-blob animation-delay-4000"></div>

        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Target size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold font-display tracking-tight">GoalProof</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="z-10 mt-auto mb-24 max-w-lg">
          <h1 className="text-5xl font-display font-bold leading-tight mb-6">
            Join the <span className="text-gradient">high-performance</span> enterprise platform.
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed mb-8">
            Set ambitious targets, track check-ins with AI validation, and seamlessly align your goals with company-wide strategies.
          </p>
          <div className="flex items-center gap-4 text-sm font-medium text-gray-400 bg-dark-800/50 backdrop-blur-md border border-dark-700/50 w-fit px-4 py-2 rounded-full">
            <Sparkles size={16} className="text-brand-400" />
            Built for modern engineering teams
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-dark-900 overflow-y-auto custom-scrollbar">
        
        {/* Mobile Background Elements */}
        <div className="lg:hidden absolute top-[-10%] left-[-10%] w-[20rem] h-[20rem] bg-brand-600/20 rounded-full blur-[80px]"></div>
        
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible"
          className="w-full max-w-md py-12"
        >
          <motion.div variants={itemVariants} className="text-center mb-10 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20 mb-4">
              <Target size={24} className="text-white" />
            </div>
            <h2 className="text-3xl font-display font-bold">GoalProof</h2>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-3xl font-display font-bold mb-2">Create an account</h2>
            <p className="text-gray-400">Sign up to join the GoalProof enterprise platform.</p>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-dark-800 border border-dark-700 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all outline-none text-white placeholder-gray-500"
                placeholder="John Doe"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-dark-800 border border-dark-700 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all outline-none text-white placeholder-gray-500"
                placeholder="name@company.com"
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-dark-800 border border-dark-700 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all outline-none text-white placeholder-gray-500"
                placeholder="••••••••"
              />
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-dark-800 border border-dark-700 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all outline-none text-white placeholder-gray-500"
                  placeholder="Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role (Demo)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-dark-800 border border-dark-700 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all outline-none text-white"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full py-3.5 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-brand-600 to-fuchsia-600 hover:from-brand-500 hover:to-fuchsia-500 focus:ring-4 focus:ring-brand-500/20 transition-all shadow-lg shadow-brand-500/25 overflow-hidden disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          <motion.p variants={itemVariants} className="mt-8 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
