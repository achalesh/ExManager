'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addEmployee } from '@/app/hr-actions';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const DEPARTMENTS = ['Office', 'Amusement', 'Security', 'Booking'];

export function AddEmployeeDialog({ eventId }: { eventId: number }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const router = useRouter();

    const [age, setAge] = useState<number | ''>('');

    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dobVal = e.target.value;
        if (dobVal) {
            const birthDate = new Date(dobVal);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            setAge(calculatedAge);
        } else {
            setAge('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (selectedDepartments.length === 0) {
            setError('Please select at least one department');
            setLoading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);
        formData.append('eventId', eventId.toString());
        if (age) formData.set('age', age.toString());
        formData.set('department', selectedDepartments.join(', '));

        const result = await addEmployee(formData);

        if (result.success) {
            setOpen(false);
            setPreview(null);
            setAge('');
            setSelectedDepartments([]);
            router.refresh();
        } else {
            setError(result.error || 'Failed to add employee');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Employee
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">Personal Details</h3>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" name="name" required placeholder="John Doe" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input id="dob" name="dob" type="date" required onChange={handleDobChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="age">Age</Label>
                                    <Input id="age" name="age" type="number" value={age} readOnly className="bg-gray-100" placeholder="Auto" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea id="address" name="address" required placeholder="Full address..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contactNo">Contact</Label>
                                    <Input id="contactNo" name="contactNo" type="tel" required placeholder="10 digits" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="secContact">Sec. Contact</Label>
                                    <Input id="secContact" name="secContact" type="tel" placeholder="Optional" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adharNumber">Aadhar Number</Label>
                                <Input id="adharNumber" name="adharNumber" required placeholder="12-digit UID" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2">Employment Details</h3>

                            <div className="space-y-3">
                                <Label>Departments</Label>
                                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-md border">
                                    {DEPARTMENTS.map(dept => (
                                        <div key={dept} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`dept-${dept}`}
                                                checked={selectedDepartments.includes(dept)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedDepartments([...selectedDepartments, dept]);
                                                    else setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
                                                }}
                                            />
                                            <Label htmlFor={`dept-${dept}`} className="font-normal cursor-pointer">{dept}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="joiningDate">Joining Date</Label>
                                    <Input id="joiningDate" name="joiningDate" type="date" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">End Date (Optional)</Label>
                                    <Input id="endDate" name="endDate" type="date" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="salaryAmount">Base Salary (₹)</Label>
                                    <Input id="salaryAmount" name="salaryAmount" type="number" min="0" defaultValue="0" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="salaryFrequency">Salary Frequency</Label>
                                    <Select name="salaryFrequency" defaultValue="Monthly">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Monthly">Monthly</SelectItem>
                                            <SelectItem value="Daily">Daily Wage</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="photo">Photo (Optional)</Label>
                                <Input id="photo" name="photo" type="file" accept="image/*" onChange={handleFileChange} />
                                {preview && (
                                    <img src={preview} alt="Preview" className="h-20 w-20 object-cover mt-2 rounded-md border" />
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Employee'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
