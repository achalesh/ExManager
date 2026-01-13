'use client';

import { useState } from 'react';
import { DragEndEvent, useDraggable, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { ClientDndContext } from '@/components/shared/ClientDndContext';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { Button } from '@/components/ui/button';
import { updateSpacePosition } from '@/app/space-actions';
import { allocateSpace } from '@/app/allocation-actions';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { GripVertical, MapPin } from 'lucide-react';

interface InteractiveMapProps {
    spaces: any[];
    exhibitors: any[];
    eventId: number;
}

function DraggableSpace({ space, onClick, isMapItem = false }: { space: any; onClick?: () => void, isMapItem?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: space.id.toString(),
        data: { space, type: isMapItem ? 'map-item' : 'sidebar-item' }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        position: isMapItem ? 'absolute' as const : 'relative' as const,
        left: isMapItem ? space.positionX || 0 : undefined,
        top: isMapItem ? space.positionY || 0 : undefined,
        zIndex: isDragging ? 100 : 1,
    } : {
        position: isMapItem ? 'absolute' as const : 'relative' as const,
        left: isMapItem ? space.positionX || 0 : undefined,
        top: isMapItem ? space.positionY || 0 : undefined,
    };

    // Color code based on status
    const statusColor = space.status === 'Booked'
        ? 'bg-blue-100 border-blue-500 text-blue-900'
        : 'bg-green-100 border-green-500 text-green-900';

    if (isDragging && !isMapItem) {
        // Drag overlay look or placeholder
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={`
                group flex flex-col items-center justify-center p-2 rounded shadow-sm border-2 cursor-pointer 
                select-none transition-shadow hover:shadow-md
                ${statusColor}
                ${isDragging ? 'opacity-80 scale-105 z-50' : ''}
                ${isMapItem ? 'w-24 h-24' : 'w-full mb-2'}
            `}
            {...listeners}
            {...attributes}
        >
            <div className="font-bold text-sm truncate">{space.label}</div>
            <div className="text-xs truncate max-w-full">{space.category.name}</div>
            {isMapItem && space.status === 'Booked' && (
                <div className="text-[10px] mt-1 bg-blue-200 px-1 rounded truncate max-w-full text-blue-800">
                    booked
                </div>
            )}
            {!isMapItem && <GripVertical className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />}
        </div>
    );
}

export function InteractiveMap({ spaces: initialSpaces, exhibitors, eventId }: InteractiveMapProps) {
    const [spaces, setSpaces] = useState(initialSpaces);
    const [selectedSpace, setSelectedSpace] = useState<any>(null);
    const [selectedExhibitor, setSelectedExhibitor] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const router = useRouter();

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    async function handleDragEnd(event: DragEndEvent) {
        const { active, delta, over } = event;
        const spaceId = parseInt(active.id as string);
        const space = spaces.find(s => s.id === spaceId);

        if (!space) return;

        // Calculate new position
        // If it was already on the map (positionX defined), add delta to it.
        // If it was in the sidebar, we need to map the drop coordinate relative to the map container.
        // Since useDraggable transform is relative to start, and we want absolute coordinates:

        // This is a simplified approach: 
        // 1. If 'over' is the map container, we place it.
        // 2. We need the map container bounds to calculate relative position.

        // For simplicity with standard dnd-kit without droppables everywhere, let's assume:
        // - Space has positionX/Y: update = old + delta
        // - Space has NO position: new position = absolute drop position relative to Map container? 
        //   That's hard without droppable ref.

        // Let's use a simpler heuristic:
        // Update local state immediately for visual feedback.
        // If the item was dragged from sidebar (positionX is null), we default it to 0,0 + delta (if we can get meaningful delta).
        // Actually, without a detailed Droppable setup to capture the drop coordinates relative to the container, 
        // accurate "Sidebar to Map" dropping is tricky. 
        // strategy: We will just allow moving existing map items first. 
        // For sidebar items, maybe just "click to place" or a dedicated 'drop' zone.

        // Let's rely on `active.rect.current.translated` if available, or just delta.

        let newX = (space.positionX || 0);
        let newY = (space.positionY || 0);

        // If coming from sidebar (no position), let's place it at center or try to track mouse.
        // Implementing sidebar-to-map accurately requires ref to map container.

        if (space.positionX === null) {
            // It was in sidebar. Place it at a default location for now (e.g., center of screen or 0,0)
            // Or better, make the map a Droppable with an ID "map-container".
            // Then in onDragEnd, we can't easily get the relative coordinates without calc.
            newX = 50;
            newY = 50;
            // If we really want to follow the mouse, we need to subtract the map container offset.
            // We'll trust the user to move it after placement for now if it's tricky.
        } else {
            newX += delta.x;
            newY += delta.y;
        }

        // Snap to grid (20px)
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;

        // Prevent negative
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        // Optimistic update
        const updatedSpaces = spaces.map(s =>
            s.id === spaceId ? { ...s, positionX: newX, positionY: newY } : s
        );
        setSpaces(updatedSpaces);

        // Server action
        try {
            await updateSpacePosition(spaceId, newX, newY);
            router.refresh(); // Ensure server sync
        } catch (error) {
            console.error("Failed to update position", error);
            // Revert on error would be nice
        }
    }

    async function handleAllocate() {
        if (!selectedSpace || !selectedExhibitor) return;
        setLoading(true);
        try {
            const result = await allocateSpace({
                spaceId: selectedSpace.id,
                exhibitorId: selectedExhibitor,
                eventId
            });
            if (result.success) {
                setSpaces(spaces.map(s => s.id === selectedSpace.id ? { ...s, status: 'Booked' } : s));
                setSelectedSpace(null);
                setSelectedExhibitor(0);
                router.refresh();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const placedSpaces = spaces.filter(s => s.positionX !== null && s.positionY !== null);
    const unplacedSpaces = spaces.filter(s => s.positionX === null || s.positionY === null);

    return (
        <ClientDndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col lg:flex-row h-[700px] border rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Sidebar */}
                <div className="w-full lg:w-64 bg-gray-50 border-r p-4 flex flex-col print:hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-700">Unplaced Spaces</h3>
                        <Button
                            variant={editMode ? "secondary" : "default"}
                            size="sm"
                            onClick={() => setEditMode(!editMode)}
                        >
                            {editMode ? "Done" : "Edit Layout"}
                        </Button>
                    </div>

                    <div className="flex-1 pr-4 overflow-y-auto">
                        <div className="space-y-2">
                            {unplacedSpaces.map(space => (
                                <div key={space.id} className="relative">
                                    {editMode ? (
                                        <DraggableSpace space={space} />
                                    ) : (
                                        <div className="p-2 bg-white border rounded text-sm text-gray-500 cursor-not-allowed opacity-60">
                                            {space.label} (Enable edit to move)
                                        </div>
                                    )}
                                    {editMode && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="absolute right-1 top-1 h-6 w-6 p-0"
                                            onClick={() => updateSpacePosition(space.id, 50, 50).then(() => router.refresh())}
                                        >
                                            <span className="sr-only">Place</span>
                                            →
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {unplacedSpaces.length === 0 && <p className="text-sm text-gray-400 italic">All spaces placed</p>}
                        </div>
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 overflow-auto relative bg-slate-100 min-h-[500px] p-8 print:p-0 print:overflow-visible">
                    <div
                        className="w-[2000px] h-[2000px] bg-grid-pattern relative border border-dashed border-gray-300 rounded"
                        style={{ backgroundSize: '20px 20px', backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)' }}
                    >
                        {placedSpaces.map(space => (
                            editMode ? (
                                <DraggableSpace
                                    key={space.id}
                                    space={space}
                                    isMapItem={true}
                                />
                            ) : (
                                <div
                                    key={space.id}
                                    onClick={() => setSelectedSpace(space)}
                                    style={{
                                        left: space.positionX || 0,
                                        top: space.positionY || 0,
                                    }}
                                    className={`
                                        absolute w-24 h-24 p-2 rounded shadow-sm border-2 cursor-pointer
                                        flex flex-col items-center justify-center transition-all hover:scale-105
                                        ${space.status === 'Booked' ? 'bg-blue-100 border-blue-500' : 'bg-green-100 border-green-500'}
                                    `}
                                >
                                    <div className="font-bold text-sm text-gray-900 truncate">{space.label}</div>
                                    <div className="text-xs text-gray-600 truncate">{space.category.name}</div>
                                    {space.status === 'Booked' && <div className="text-xs font-semibold text-blue-700 mt-1">Booked</div>}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>

            {/* Allocation Dialog */}
            <Dialog open={!!selectedSpace} onOpenChange={() => setSelectedSpace(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Allocate Space {selectedSpace?.label}</DialogTitle>
                        <DialogDescription>
                            Select an exhibitor to allocate this space
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSpace && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Category</p>
                                    <p className="font-medium">{selectedSpace.category.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Price</p>
                                    <p className="font-medium text-green-600">${selectedSpace.category.price}</p>
                                </div>
                            </div>

                            {selectedSpace.status === 'Available' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Exhibitor</label>
                                    <Select
                                        value={selectedExhibitor.toString()}
                                        onValueChange={(val) => setSelectedExhibitor(Number(val))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose exhibitor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {exhibitors.map(ex => (
                                                <SelectItem key={ex.id} value={ex.id.toString()}>
                                                    {ex.name} {ex.faciaName ? `(${ex.faciaName})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-4 rounded text-blue-800 text-sm">
                                    This space is currently booked.
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSpace(null)}>Cancel</Button>
                        {selectedSpace?.status === 'Available' && (
                            <Button onClick={handleAllocate} disabled={loading || !selectedExhibitor}>
                                {loading ? 'Allocating...' : 'Allocate'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ClientDndContext>
    );
}
