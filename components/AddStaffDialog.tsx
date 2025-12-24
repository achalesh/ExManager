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
import { addStaff } from '@/app/staff-actions';
import { useRouter } from 'next/navigation';
import { Plus, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

import { Checkbox } from '@/components/ui/checkbox';

const DEPARTMENTS = ['Office', 'Amusement', 'Security', 'Booking'];

export function AddStaffDialog({ eventId }: { eventId: number }) {
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
        // eventId is passed as prop, ensure it's in formData
        formData.append('eventId', eventId.toString());
        // Ensure calculated age is used if present (though backend will recalc)
        if (age) formData.set('age', age.toString());

        // Set departments as comma-separated string
        formData.set('department', selectedDepartments.join(', '));

        const result = await addStaff(formData);

        if (result.success) {
            setOpen(false);
            setPreview(null);
            setAge(''); // Reset age
            setSelectedDepartments([]); // Reset departments
            router.refresh();
        } else {
            setError(result.error || 'Failed to add staff');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff Member
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" required placeholder="John Doe" />
                        </div>
                        <div className="space-y-3">
                            <Label>Departments</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {DEPARTMENTS.map(dept => (
                                    <div key={dept} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`dept-${dept}`}
                                            checked={selectedDepartments.includes(dept)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedDepartments([...selectedDepartments, dept]);
                                                } else {
                                                    setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
                                                }
                                            }}
                                        />
                                        <Label htmlFor={`dept-${dept}`} className="font-normal cursor-pointer">
                                            {dept}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Input
                                id="dob"
                                name="dob"
                                type="date"
                                required
                                onChange={handleDobChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="age">Age</Label>
                            <Input
                                id="age"
                                name="age"
                                type="number"
                                value={age}
                                readOnly
                                className="bg-gray-100"
                                placeholder="Auto-calculated"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" name="address" required placeholder="Permanent address..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactNo">Contact Number</Label>
                            <Input id="contactNo" name="contactNo" type="tel" required placeholder="10-digit mobile" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secContact">Secondary Number (Optional)</Label>
                            <Input id="secContact" name="secContact" type="tel" placeholder="Backup contact" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adharNumber">Aadhar Number (ID Proof)</Label>
                        <Input id="adharNumber" name="adharNumber" required placeholder="12-digit UID" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="photo">Photo (Optional)</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <Input
                                    id="photo"
                                    name="photo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                            {preview && (
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="h-16 w-16 object-cover rounded-md border border-gray-200"
                                />
                            )}
                        </div>
                        <p className="text-xs text-gray-500">Upload a clear passport-size photo.</p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Staff'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
