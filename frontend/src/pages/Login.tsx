import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../features/auth/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data);
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
          navigate(`/invite/${pendingInvite}`);
        } else {
          navigate('/channels/@me');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=2000&auto=format&fit=crop)' }}>
      <div className="bg-[#313338] p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
          <p className="text-[#b5bac1]">We're so excited to see you again!</p>
        </div>

        {error && <div className="text-red-500 mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1e1f22] text-white p-2.5 rounded border border-transparent focus:border-transparent focus:ring-none outline-none focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1e1f22] text-white p-2.5 rounded border border-transparent focus:border-transparent focus:ring-none outline-none focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-2.5 rounded transition duration-200"
          >
            Log In
          </button>
        </form>

        <div className="mt-4 text-sm text-[#949ba4]">
          Need an account?{' '}
          <Link to="/register" className="text-[#00a8fc] hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};
