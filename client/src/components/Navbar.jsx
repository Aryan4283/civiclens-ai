import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CivicPointsBadge from './CivicPointsBadge';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [civicPoints, setCivicPoints] = useState(0);

  // Live-sync civic points from Firestore
  React.useEffect(() => {
    if (!user) { setCivicPoints(0); return; }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setCivicPoints(snap.data().civic_points || 0);
    });
    return unsub;
  }, [user]);

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch (e) { console.error(e); }
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 hover:text-civic-primary ${
      isActive ? 'text-civic-primary' : 'text-gray-600'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-10">
            <span className="text-2xl">🏙️</span>
            <span className="text-lg font-extrabold text-civic-primary tracking-tight">
              CivicLens<span className="text-gray-400 font-light">.ai</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 flex-1">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/report" className={navLinkClass}>Report Issue</NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>My Dashboard</NavLink>
            <NavLink to="/authority" className={navLinkClass}>Authority Portal</NavLink>
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <CivicPointsBadge points={civicPoints} />
                <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-gray-500 hover:text-civic-danger border border-gray-200
                    hover:border-civic-danger/40 px-3 py-1.5 rounded-lg transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-gray-600 hover:text-civic-primary transition-colors duration-200 px-3 py-1.5"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-bold text-white bg-civic-primary hover:bg-blue-600 px-4 py-2
                    rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 shadow-lg">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
          <div className="block">
            <NavLink to="/report" className={navLinkClass} onClick={() => setMenuOpen(false)}>Report Issue</NavLink>
          </div>
          <div className="block">
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>My Dashboard</NavLink>
          </div>
          <div className="block">
            <NavLink to="/authority" className={navLinkClass} onClick={() => setMenuOpen(false)}>Authority Portal</NavLink>
          </div>
          <div className="pt-3 border-t border-gray-100">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CivicPointsBadge points={civicPoints} />
                  <span className="text-sm text-gray-700 truncate max-w-[100px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </div>
                <button onClick={handleLogout} className="text-sm text-civic-danger font-semibold">Logout</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 bg-civic-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
