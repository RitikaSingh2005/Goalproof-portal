import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, LogOut, Camera, X, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  // Local state for forms
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: 'System Administrator managing the GoalProof enterprise architecture.',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (activeTab === 'security' && formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match.');
      setIsSaving(false);
      return;
    }
    
    toast.success(`${activeTab === 'profile' ? 'Profile' : 'Security settings'} updated successfully!`);
    setIsSaving(false);
    onClose();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-4xl glass-card border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
          >
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-dark-900/50 border-r border-white/5 p-6 flex flex-col justify-between shrink-0">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-display font-bold text-white">Settings</h2>
                  <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <nav className="space-y-1">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all relative font-medium ${
                          isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={18} />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-6 border-t border-white/5 mt-8 md:mt-0">
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-dark-800/30 p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
              <button onClick={onClose} className="hidden md:flex absolute top-6 right-6 text-gray-400 hover:text-white transition-colors w-8 h-8 items-center justify-center rounded-full hover:bg-white/10">
                <X size={20} />
              </button>

              <form onSubmit={handleSave} className="max-w-xl">
                {activeTab === 'profile' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="text-2xl font-display font-bold text-white mb-2">Public Profile</h3>
                    <p className="text-gray-400 text-sm mb-8">Manage your profile details and representation across the platform.</p>

                    <div className="flex items-center gap-6 mb-8">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-gradient-premium p-[2px]">
                          <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center overflow-hidden">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl font-display font-bold text-white">{user?.name?.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/20"
                        >
                          <Camera size={24} className="text-white" />
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          accept="image/*"
                        />
                      </div>
                      <div>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
                        >
                          Change Avatar
                        </button>
                        <p className="text-xs text-gray-500 mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-dark-900 border border-white/10 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-dark-900 border border-white/10 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-dark-900 border border-white/10 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none resize-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="text-2xl font-display font-bold text-white mb-2">Security Settings</h3>
                    <p className="text-gray-400 text-sm mb-8">Update your password and secure your account.</p>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Current Password</label>
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-dark-900 border border-white/10 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                        />
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-dark-900 border border-white/10 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-dark-900 border border-white/10 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="mt-10 pt-6 border-t border-white/5 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 mr-3 text-gray-400 hover:text-white transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-70"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
