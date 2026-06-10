import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../features/auth/AuthContext';
import { API_BASE_URL } from '../config';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { email, username, password });
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
      setError(err.response?.data?.message || 'Failed to register');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=2000&auto=format&fit=crop)' }}>
      <div className="bg-[#313338] p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Create an account</h2>
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
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-2.5 rounded transition duration-200 mt-2"
          >
            Continue
          </button>
        </form>

        <div className="mt-4 text-sm text-[#949ba4]">
          <Link to="/login" className="text-[#00a8fc] hover:underline">
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
};
