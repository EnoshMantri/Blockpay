import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Send, LayoutDashboard, ShieldCheck, FileText, Wallet,
  ChevronRight, Activity, Menu, X, BarChart2, Settings,
  LogOut, LogIn
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import SendRemittance from './pages/SendRemittance'
import Compliance from './pages/Compliance'
import Transactions from './pages/Transactions'
import WalletPage from './pages/WalletPage'
import LoginPage from './pages/LoginPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AdminPage from './pages/AdminPage'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { Web3Provider, useWeb3 } from './contexts/Web3Context'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import ErrorBoundary from './components/ErrorBoundary'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/send', icon: Send, label: 'Send Money' },
  { to: '/compliance', icon: ShieldCheck, label: 'Compliance' },
  { to: '/transactions', icon: FileText, label: 'Transactions' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/admin', icon: Settings, label: 'Admin Panel' },
]

function Sidebar({ mobile, onClose }) {
  const { user, logout, isAuthenticated } = useAuth()
  const { address, connectWallet, disconnectWallet } = useWeb3()
  const { toast } = useToast()

  const handleLogout = () => {
    logout()
    toast('Logged out successfully', 'info')
    if (mobile) onClose()
  }

  return (
    <aside className={`flex flex-col h-full ${mobile ? 'w-full bg-void' : 'w-64 bg-transparent'}`}>
      {/* Logo */}
      <div className="px-6 py-8 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center shadow-btn-glow transform hover:scale-110 hover:-rotate-6 transition-all duration-300">
            <span className="text-void font-bold text-lg font-mono">B</span>
          </div>
          <div>
            <div className="font-bold text-text-primary text-lg tracking-tight">BlockPay</div>
            <div className="text-text-muted text-[10px] font-mono">Sepolia Testnet</div>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Live indicator */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-accent inline-block" />
          <span className="text-xs text-text-secondary font-mono">Simulation Mode</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.filter(n => {
          // Hide Admin Panel from non-admin users
          if (n.to === '/admin') return user?.role === 'admin';
          return true;
        }).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
              ${isActive
                ? 'bg-accent/10 text-accent font-medium border border-accent/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'} />
                <span>{label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Area */}
      <div className="px-4 py-4 border-t border-border">
        {isAuthenticated ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-void/50 border border-border">
              <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center">
                <span className="text-accent text-[10px] font-bold">A</span>
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-text-primary font-medium truncate">Logged In</div>
                <div className="text-[10px] text-text-muted font-mono truncate">{user?.walletAddress}</div>
              </div>
            </div>

            {/* MetaMask Connection Area */}
            {address ? (
               <div className="flex flex-col gap-2 p-3 rounded-xl bg-accent/5 border border-accent/20">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-accent animate-pulse-accent"></span>
                     <span className="text-xs font-semibold text-accent">MetaMask</span>
                   </div>
                 </div>
                 <div className="text-[10px] font-mono text-text-primary bg-void rounded px-2 py-1 max-w-full truncate border border-border">
                   {address}
                 </div>
                 <button onClick={disconnectWallet} className="text-[10px] text-text-muted hover:text-danger text-left mt-1 transition-colors">Disconnect</button>
               </div>
            ) : (
              <button
                onClick={connectWallet}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface border border-accent/30 text-accent font-medium text-xs hover:bg-accent hover:text-[#0B0D17] hover:shadow-btn-glow transition-all duration-300"
              >
                Connect MetaMask
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors border border-transparent hover:border-danger/20"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent hover:text-[#0B0D17] transition-colors"
          >
            <LogIn size={14} />
            Login
          </NavLink>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border/50">
        <div className="text-[10px] text-text-muted font-mono leading-relaxed">
          <div>BlockPay v2.0 · Pro</div>
          <div className="text-accent/60">Production Grade</div>
        </div>
      </div>
    </aside>
  )
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  
  // Find current label
  let current = NAV.find(n => n.to === location.pathname)?.label || 'BlockPay'
  if (location.pathname === '/login') current = 'Authentication'

  return (
    <div className="flex h-screen overflow-hidden bg-void relative print:h-auto print:overflow-visible print:bg-white text-text-primary print:text-black">
      {/* Background Ambient Glows - Animated 3D Float */}
      <div className="absolute top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-accent/10 rounded-full mix-blend-screen filter blur-[100px] opacity-60 pointer-events-none z-0 animate-float" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-[#B026FF]/10 rounded-full mix-blend-screen filter blur-[120px] opacity-50 pointer-events-none z-0 animate-float" style={{ animationDelay: '3s' }} />
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0 z-10 print:hidden backdrop-blur-3xl bg-surface/30 border-r border-border shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-72">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-void/80 backdrop-blur-md z-40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden z-10 print:overflow-visible relative">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-8 py-5 border-b border-border bg-transparent backdrop-blur-xl print:hidden sticky top-0 z-20">
          <button
            className="md:hidden text-text-secondary hover:text-text-primary"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-accent" />
            <span className="text-text-primary font-medium text-sm">{current}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-text-muted font-mono hidden sm:block">
              {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent print:overflow-visible print:p-0 print:bg-white print:block scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in relative min-h-full flex flex-col print:block">
            <ErrorBoundary>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/send" element={<SendRemittance />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                </Route>

                {/* Admin-only */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Web3Provider>
            <Layout />
          </Web3Provider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
