import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { ShieldCheck } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loading } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        }
    };
    
    const fillDemoUser = (userEmail: string) => {
        setEmail(userEmail);
        setPassword('123456');
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="mx-auto flex items-center justify-center h-12 w-auto">
                      <ShieldCheck className="h-12 w-12 text-primary-600" />
                      <span className="ml-3 text-3xl font-bold text-gray-800 dark:text-white">KPI Pro</span>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Sign in to your account
                    </h2>
                </div>
                <Card>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <Input
                            id="email"
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <div>
                            <Button type="submit" className="w-full" isLoading={loading}>
                                Sign in
                            </Button>
                        </div>
                    </form>
                </Card>
                 <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    <p>Demo accounts (password: 123456)</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        <button onClick={() => fillDemoUser('owner@demo.com')} className="text-xs text-primary-600 hover:underline">Owner</button>
                        <button onClick={() => fillDemoUser('supervisor@demo.com')} className="text-xs text-primary-600 hover:underline">Supervisor</button>
                        <button onClick={() => fillDemoUser('leader@demo.com')} className="text-xs text-primary-600 hover:underline">Team Leader</button>
                        <button onClick={() => fillDemoUser('assistant@demo.com')} className="text-xs text-primary-600 hover:underline">Assistant</button>
                        <button onClick={() => fillDemoUser('agent1@demo.com')} className="text-xs text-primary-600 hover:underline">Agent</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;