import { MaterialReturnInterface } from '@/components/MaterialReturnInterface';

export const metadata = {
    title: 'Return Material | Exhibition Manager',
    description: 'Scan and return allocated materials',
};

export default function ReturnMaterialPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Return Material</h1>
            </div>

            <MaterialReturnInterface />
        </div>
    );
}
