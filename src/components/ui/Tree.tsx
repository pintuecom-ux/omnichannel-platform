import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown } from 'lucide-react'

export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
  icon?: React.ReactNode
}

export interface TreeProps {
  data: TreeNode[]
  onSelect?: (nodeId: string) => void
  selectedId?: string
  className?: string
}

export function Tree({ data, onSelect, selectedId, className }: TreeProps) {
  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      {data.map(node => (
        <TreeNodeItem 
          key={node.id} 
          node={node} 
          onSelect={onSelect} 
          selectedId={selectedId} 
          level={0} 
        />
      ))}
    </div>
  )
}

function TreeNodeItem({ 
  node, 
  onSelect, 
  selectedId, 
  level 
}: { 
  node: TreeNode
  onSelect?: (nodeId: string) => void
  selectedId?: string
  level: number 
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id

  return (
    <div className="flex flex-col gap-1">
      <div 
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium cursor-pointer transition-colors",
          isSelected ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100",
          !hasChildren && "pl-6"
        )}
        style={{ paddingLeft: `${level * 16 + (hasChildren ? 8 : 24)}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded)
          onSelect?.(node.id)
        }}
      >
        {hasChildren && (
          <span className="shrink-0 text-neutral-400">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
        {node.icon && <span className="shrink-0">{node.icon}</span>}
        <span className="truncate">{node.label}</span>
      </div>
      
      {hasChildren && expanded && (
        <div className="flex flex-col gap-1">
          {node.children!.map(child => (
            <TreeNodeItem 
              key={child.id} 
              node={child} 
              onSelect={onSelect} 
              selectedId={selectedId} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
