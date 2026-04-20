import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { LogOut, LayoutDashboard, User, Mail, ShieldCheck, Loader2 } from 'lucide-react';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      alert("Sign-in failed. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        <p className="mt-4 text-slate-400 font-medium">Preparing your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        {user ? (
          <div className="glass-card rounded-3xl shadow-2xl p-8 text-center transition-all duration-300 hover:shadow-primary-500/10">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary-400" />
                <span className="text-sm font-bold uppercase tracking-wider text-slate-400">User Panel</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-500/10 text-red-400 transition-colors group"
                title="Logout"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="relative inline-block mb-6">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary-500 to-cyan-400 rounded-full blur opacity-25"></div>
              <img 
                src={user.photoURL} 
                alt={user.displayName} 
                className="relative w-24 h-24 rounded-full border-2 border-slate-800 object-cover mx-auto"
              />
              <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-slate-900 w-6 h-6 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{user.displayName}</h1>
            <p className="text-slate-400 text-sm mb-8 flex items-center justify-center gap-1">
              <Mail className="w-3 h-3" /> {user.email}
            </p>

            {/* Stats/Cards Example */}
            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1 uppercase font-bold">Rank</p>
                <p className="text-lg font-semibold text-white">Elite Pro</p>
              </div>
               <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1 uppercase font-bold">Points</p>
                <p className="text-lg font-semibold text-white">2.4k</p>
              </div>
            </div>

            {/* Action Button */}
            <button className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold shadow-lg shadow-primary-600/20 transition-all duration-300 transform active:scale-[0.98]">
              Manage Account
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-3xl shadow-2xl p-10 text-center transition-all duration-300">
            <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-12 transition-transform hover:rotate-0 duration-500">
              <User className="w-10 h-10 text-primary-400" />
            </div>
            
            <h1 className="text-3xl font-black text-white mb-4">Hello There!</h1>
            <p className="text-slate-400 mb-10 leading-relaxed">
              Welcome to the Smart Stadium. Sign in to access your personalized dashboard and rewards.
            </p>

            <button 
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-white/5 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
            
            <p className="mt-8 text-xs text-slate-500">
              You are not logged in. Please sign in to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
