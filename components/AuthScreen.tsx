import React, { useState } from 'react';
import { MailIcon, LockIcon, UserIcon, EyeIcon, EyeOffIcon, SendIcon } from './Icons';

interface AuthScreenProps {
  onLogin: (userData: { name: string; id: string }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isLogin && !name) return;

    setIsLoading(true);

    // Simulate Network Request
    setTimeout(() => {
      const displayName = isLogin ? email.split('@')[0] : name;
      const userId = email.replace(/[^a-zA-Z0-9]/g, '');
      
      onLogin({
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        id: userId
      });
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-[#517da2] bg-opacity-10 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-300 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-300 rounded-full blur-[100px]"></div>
        </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden z-10 transition-all duration-300">
        <div className="p-8">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-[#517da2] text-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <SendIcon />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-gray-500 text-sm mt-1">
                    {isLogin ? 'Log in to continue to TeleReact' : 'Sign up for a secure messaging experience'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <UserIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#517da2] focus:border-transparent transition bg-gray-50 hover:bg-white"
                            required={!isLogin}
                        />
                    </div>
                )}

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <MailIcon />
                    </div>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#517da2] focus:border-transparent transition bg-gray-50 hover:bg-white"
                        required
                    />
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <div className="scale-125">
                            <LockIcon />
                        </div>
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#517da2] focus:border-transparent transition bg-gray-50 hover:bg-white"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#517da2] text-white py-3 rounded-xl font-semibold hover:bg-[#40688a] transition duration-200 shadow-md flex justify-center items-center mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        isLogin ? 'Log In' : 'Sign Up'
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setName('');
                            setEmail('');
                            setPassword('');
                        }}
                        className="text-[#517da2] font-semibold hover:underline focus:outline-none"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
