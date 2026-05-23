import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Target, Award, Activity, Users, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const { user } = useAuth();

  const getLinks = () => {
    const baseLinks = [
      { name: 'Dashboard', icon: LayoutDashboard, path: `/dashboard/${user?.role}` },
      { name: 'My Goals', icon: Target, path: '#' },
      { name: 'Achievements', icon: Award, path: '#' },
    ];

    if (user?.role === 'manager') {
      baseLinks.push({ name: 'Team Performance', icon: Users, path: '#' });
    }

    if (user?.role === 'admin') {
      baseLinks.push(
        { name: 'Manage Users', icon: Users, path: '#' },
        { name: 'System Logs', icon: Activity, path: '#' },
        { name: 'Settings', icon: Settings, path: '#' }
      );
    }

    return baseLinks;
  };

  const links = getLinks();

  return (
    <motion.aside 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 glass h-screen fixed top-0 left-0 flex flex-col z-50 rounded-none border-y-0 border-l-0 border-r border-white/5 bg-dark-900/50 backdrop-blur-xl"
    >
      <div className="h-20 flex items-center px-8 border-b border-white/5">
        <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Target size={18} className="text-white" />
          </div>
          <span className="text-white">GoalProof</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group ${
                  isActive && link.path !== '#'
                    ? 'text-white font-medium'
                    : 'text-gray-400 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {(isActive && link.path !== '#') && (
                    <motion.div layoutId="activeSidebarTab" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
                  )}
                  <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Icon size={18} className="relative z-10" />
                  <span className="relative z-10">{link.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </motion.aside>
  );
};

export default Sidebar;
