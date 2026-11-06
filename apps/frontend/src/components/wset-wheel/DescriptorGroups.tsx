'use client';

import { useState } from 'react';
import { WsetDescriptor, DescriptorType } from '@/types/api';

interface DescriptorGroupsProps {
  /** Единое дерево дескрипторов — одинаковое для аромата и вкуса. */
  tree: WsetDescriptor[];
  aromaDescriptorIds: string[];
  flavourDescriptorIds: string[];
  onToggleDescriptor: (descriptor: WsetDescriptor, type: DescriptorType) => void;
}

/** Палитра для цветового кодирования категорий верхнего уровня. */
const PALETTE = [
  '#9c2b3a',
  '#c0392b',
  '#d35400',
  '#e67e22',
  '#b8860b',
  '#27ae60',
  '#16a085',
  '#2980b9',
  '#8e44ad',
  '#c2185b',
  '#6d4c41',
  '#546e7a',
];

function Chip({
  descriptor,
  selected,
  color,
  onToggle,
}: {
  descriptor: WsetDescriptor;
  selected: boolean;
  color: string;
  onToggle: (descriptor: WsetDescriptor) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(descriptor)}
      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
      style={
        selected
          ? { backgroundColor: color, borderColor: color, color: '#ffffff' }
          : { backgroundColor: '#ffffff', borderColor: '#e5e7eb', color: '#374151' }
      }
    >
      {descriptor.labelRu}
    </button>
  );
}

interface TreeNodeProps {
  node: WsetDescriptor;
  color: string;
  selectedIds: string[];
  onToggle: (descriptor: WsetDescriptor) => void;
  depth: number;
}

function TreeNode({ node, color, selectedIds, onToggle, depth }: TreeNodeProps) {
  const children = node.children ?? [];

  if (children.length === 0) {
    return (
      <Chip
        descriptor={node}
        selected={selectedIds.includes(node.id)}
        color={color}
        onToggle={onToggle}
      />
    );
  }

  const childrenAreLeaves = children.every((c) => (c.children?.length ?? 0) === 0);

  return (
    <div>
      {depth === 0 ? (
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-sm text-gray-800">
            {node.labelRu}
          </span>
        </div>
      ) : (
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-1.5">
          {node.labelRu}
        </p>
      )}

      <div className={childrenAreLeaves ? 'flex flex-wrap gap-1.5' : 'space-y-2.5'}>
        {children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            color={color}
            selectedIds={selectedIds}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Вкусоароматика: аромат и вкус показывают один и тот же список дескрипторов,
 * но выбор фиксируется отдельно для каждой вкладки (чтобы топы ароматов и
 * вкусов в итогах могли различаться).
 */
export default function DescriptorGroups({
  tree,
  aromaDescriptorIds,
  flavourDescriptorIds,
  onToggleDescriptor,
}: DescriptorGroupsProps) {
  const [mode, setMode] = useState<DescriptorType>('AROMA');
  const selectedIds =
    mode === 'AROMA' ? aromaDescriptorIds : flavourDescriptorIds;

  return (
    <div>
      {/* Переключатель аромат/вкус */}
      <div className="flex gap-2 mb-4 bg-gray-100 rounded-full p-1">
        <button
          type="button"
          onClick={() => setMode('AROMA')}
          className={`flex-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'AROMA' ? 'bg-wine-500 text-white' : 'text-gray-600'
          }`}
        >
          Аромат
          {aromaDescriptorIds.length > 0 && (
            <span className="ml-1.5 text-xs opacity-80">
              {aromaDescriptorIds.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMode('FLAVOUR')}
          className={`flex-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'FLAVOUR' ? 'bg-wine-500 text-white' : 'text-gray-600'
          }`}
        >
          Вкус
          {flavourDescriptorIds.length > 0 && (
            <span className="ml-1.5 text-xs opacity-80">
              {flavourDescriptorIds.length}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {tree.map((root, idx) => (
          <TreeNode
            key={root.id}
            node={root}
            color={PALETTE[idx % PALETTE.length]}
            selectedIds={selectedIds}
            onToggle={(d) => onToggleDescriptor(d, mode)}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}
