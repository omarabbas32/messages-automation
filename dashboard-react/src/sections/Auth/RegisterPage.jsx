import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Zap, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

const RegisterPage = ({ onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            return window.Swal.fire({
                title: 'Mismatch',
                text: 'Passwords do not match',
                icon: 'warning',
                confirmButtonColor: '#000000'
            });
        }

        setIsSubmitting(true);
        const result = await register(email, password);
        setIsSubmitting(false);
        
        if (!result.success) {
            window.Swal.fire({
                title: 'Registration Failed',
                text: result.error || 'Failed to create account',
                icon: 'error',
                confirmButtonColor: '#000000'
            });
        }
    };

    return (
        <div className="min-h-screen bg-wink-black flex items-center justify-center p-6">
            <div className="w-full max-w-[440px] animate-pop-in">
                {/* Brand */}
                <div className="flex items-center space-x-3 mb-12 justify-center">
                    <div className="bg-wink-white p-2 rounded-xl">
                        <Zap size={24} className="text-wink-black fill-wink-black" />
                    </div>
                    <span className="text-3xl font-black text-wink-white uppercase tracking-tighter">Wink</span>
                </div>

                <div className="bg-wink-white rounded-[2.5rem] p-10 lg:p-12 shadow-2xl">
                    <div className="mb-10 text-center">
                        <h1 className="text-3xl font-black text-wink-black uppercase tracking-tighter mb-2">Create Account</h1>
                        <p className="text-wink-gray-400 font-medium text-sm tracking-tight">Establish your automation workspace.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-wink-gray-400 ml-1">Identity (Email)</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-wink-gray-300 group-focus-within:text-wink-black transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-wink-white focus:border-wink-black outline-none transition-all shadow-sm"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-wink-gray-400 ml-1">Access Key (Password)</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-wink-gray-300 group-focus-within:text-wink-black transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-wink-white focus:border-wink-black outline-none transition-all shadow-sm"
                                    placeholder="Min. 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-wink-gray-400 ml-1">Confirm Access Key</label>
                            <div className="relative group">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-wink-gray-300 group-focus-within:text-wink-black transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-wink-white focus:border-wink-black outline-none transition-all shadow-sm"
                                    placeholder="Repeat password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-wink-black text-wink-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-wink-gray-800 transition-all shadow-xl shadow-wink-black/20 flex items-center justify-center space-x-3 disabled:opacity-50 mt-10 group"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <span>Start Automating</span>}
                            {!isSubmitting && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-12 text-center pt-8 border-t border-wink-gray-50">
                        <p className="text-wink-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">Already have a workshop?</p>
                        <button
                            onClick={onSwitchToLogin}
                            className="text-wink-black font-black uppercase text-xs tracking-widest hover:bg-wink-gray-50 px-6 py-3 rounded-xl border border-wink-gray-200 transition-all shadow-sm"
                        >
                            Log In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
