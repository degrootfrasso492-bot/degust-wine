'use client';

import { X } from 'lucide-react';
import DescriptorGroups from './DescriptorGroups';
import { WsetDescriptor, DescriptorType } from '@/types/api';

interface WheelDrawerProps {
  open: boolean;
  onClose: () => void;
  tree: WsetDescriptor[];
  aromaDescriptorIds: string[];
  flavourDescriptorIds: string[];
  onToggleDescriptor: (descriptor: WsetDescriptor, type: DescriptorType) => void;
}

export default function WheelDrawer({
  open,
  onClose,
  tree,
  aromaDescriptorIds,
  flavourDescriptorIds,
  onToggleDescriptor,
}: WheelDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl p-4 pb-8 max-h-[85vh] overflow-y-auto drawer-slide-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Вкусоароматика</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
        <DescriptorGroups
          tree={tree}
          aromaDescriptorIds={aromaDescriptorIds}
          flavourDescriptorIds={flavourDescriptorIds}
          onToggleDescriptor={onToggleDescriptor}
        />
      </div>
    </div>
  );
}
