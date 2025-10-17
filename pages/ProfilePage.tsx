import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { User, Team } from '../types';
import { Mail, Briefcase, Users, UserCircle } from 'lucide-react';

const ProfilePage: React.FC = () => {
    const { user, updateUserContext } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [team, setTeam] = useState<Team | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            if (user.teamId) {
                api.getTeamById(user.teamId).then(teamData => {
                    if (teamData) setTeam(teamData);
                });
            }
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');
        
        if (!user) {
            setErrorMessage('User not found.');
            return;
        }

        // The form is now only for password changes.
        if (!formData.newPassword) {
            setErrorMessage("Please enter a new password to make a change.");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setErrorMessage('New passwords do not match.');
            return;
        }
        
        if (!formData.currentPassword) {
            setErrorMessage('Please enter your current password to confirm changes.');
            return;
        }
        
        setIsLoading(true);

        try {
            const updates: Partial<User> & { currentPassword?: string } = {
                password: formData.newPassword,
                currentPassword: formData.currentPassword,
            };

            const updatedUser = await api.updateUser(user.id, updates);
            updateUserContext(updatedUser);

            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            
            setSuccessMessage('Password updated successfully!');
            
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return <p>Loading profile...</p>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-white text-4xl font-bold">
                    {user.fullName.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{user.fullName}</h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400">{user.role}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <Card title="Profile Details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                <div className="flex items-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                    <UserCircle className="w-5 h-5 text-gray-400 mr-2" />
                                    <span className="text-gray-700 dark:text-gray-300">{user.fullName}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <div className="flex items-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                    <Mail className="w-5 h-5 text-gray-400 mr-2" />
                                    <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
                                </div>
                            </div>
                                <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                                <div className="flex items-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                    <Users className="w-5 h-5 text-gray-400 mr-2" />
                                    <span className="text-gray-700 dark:text-gray-300">{team?.teamName || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Change Password">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            To change your password, enter your current password followed by the new one.
                        </p>
                        <div className="space-y-4">
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                label="Current Password"
                                type="password"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    label="New Password"
                                    type="password"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    label="Confirm New Password"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    </Card>
                    
                    {successMessage && <div className="p-3 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md">{successMessage}</div>}
                    {errorMessage && <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md">{errorMessage}</div>}
                    
                    <div className="flex justify-end pt-2">
                        <Button type="submit" isLoading={isLoading}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProfilePage;