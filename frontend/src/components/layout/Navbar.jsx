import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Moon, Sun, User as UserIcon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    // Force dark mode for the premium look by default, but allow toggle if needed
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <nav className="h-20 glass sticky top-0 z-40 flex items-center justify-between px-8 border-b border-white/10">
      <div className="flex items-center">
        {/* Left side empty for dashboard layouts where Sidebar has the logo */}
      </div>
      
      <div className="flex items-center space-x-6">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme} 
          className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-10 h-10 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-fuchsia-500 ring-2 ring-dark-800"></span>
        </motion.button>

        <div className="flex items-center space-x-4 border-l border-dark-700 pl-6 relative">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-medium text-white">{user?.name}</span>
            <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider">{user?.role}</span>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowMenu(!showMenu)}
            className="h-11 w-11 rounded-full bg-gradient-premium p-0.5 cursor-pointer shadow-lg shadow-brand-500/20"
          >
            <div className="h-full w-full bg-dark-900 rounded-full flex items-center justify-center text-white">
              <UserIcon size={18} />
            </div>
          </motion.div>

          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 mt-2 w-56 glass-card p-2 shadow-2xl border border-white/10 transform origin-top-right"
              >
                <div className="px-3 py-2 mb-2 border-b border-dark-700/50 md:hidden">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-brand-400 font-semibold uppercase">{user?.role}</p>
                </div>
                <button 
                  onClick={logout} 
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
