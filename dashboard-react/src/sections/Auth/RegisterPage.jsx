import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const RegisterPage = ({ onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            return window.Swal.fire('Error', 'Passwords do not match', 'error');
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
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <img src="/logo.png" alt="Wink Logo" className="auth-logo" />
                    <h1>Create Account</h1>
                    <p>Start automating your Facebook pages</p>
                </div>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            placeholder="name@company.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            placeholder="Min 8 characters" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input 
                            type="password" 
                            placeholder="Repeat password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required 
                        />
                    </div>
                    <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>
                <div className="auth-footer">
                    Already have an account? <span onClick={onSwitchToLogin}>Login</span>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
