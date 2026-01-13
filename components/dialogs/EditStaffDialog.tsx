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
import { updateStaff } from '@/app/staff-actions';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const DEPARTMENTS = ['Office', 'Amusement', 'Security', 'Booking'];

interface StaffMember {
    id: number;
    name: string;
    department: string;
    dob: Date;
    age: number;
    address: string;
    contactNo: string;
    secContact?: string | null;
    adharNumber: string;
    photoUrl?: string | null;
    eventId: number;
}

export function EditStaffDialog({ staff }: { staff: StaffMember }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<string | null>(staff.photoUrl || null);
    // Initialize department state by splitting comma-separated string
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
        staff.department ? staff.department.split(',').map(d => d.trim()) : []
    );
    const router = useRouter();

    const [age, setAge] = useState<number | ''>(staff.age);

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
        formData.append('eventId', staff.eventId.toString());
        formData.append('id', staff.id.toString());

        if (age) formData.set('age', age.toString());

        // Set departments as comma-separated string
        formData.set('department', selectedDepartments.join(', '));

        const result = await updateStaff(formData);

        if (result.success) {
            setOpen(false);
            router.refresh();
        } else {
            setError(result.error || 'Failed to update staff');
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Staff Details</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <input type="hidden" name="id" value={staff.id} />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" required defaultValue={staff.name} />
                        </div>
                        <div className="space-y-3">
                            <Label>Departments</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {DEPARTMENTS.map(dept => (
                                    <div key={dept} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`edit-dept-${dept}`}
                                            checked={selectedDepartments.includes(dept)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedDepartments([...selectedDepartments, dept]);
                                                } else {
                                                    setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
                                                }
                                            }}
                                        />
                                        <Label htmlFor={`edit-dept-${dept}`} className="font-normal cursor-pointer">
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
                                defaultValue={new Date(staff.dob).toISOString().split('T')[0]}
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
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" name="address" required defaultValue={staff.address} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactNo">Contact Number</Label>
                            <Input id="contactNo" name="contactNo" type="tel" required defaultValue={staff.contactNo} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secContact">Secondary Number (Optional)</Label>
                            <Input id="secContact" name="secContact" type="tel" defaultValue={staff.secContact || ''} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adharNumber">Aadhar Number</Label>
                        <Input id="adharNumber" name="adharNumber" required defaultValue={staff.adharNumber} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="photo">Photo (Optional update)</Label>
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
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
