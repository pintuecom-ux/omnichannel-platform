'use client'

import React from 'react'
import { Plus, Trash2, ChevronDown, Filter } from 'lucide-react'
import { ConditionSet } from '@/types'

// Type guards to distinguish between a Condition and a ConditionSet
export interface Condition {
  field: string
  operator: string
  value: any
}

export type ConditionNode = Condition | ConditionSet

export function isConditionSet(node: ConditionNode): node is ConditionSet {
  return (node as ConditionSet).operator === 'AND' || (node as ConditionSet).operator === 'OR'
}

interface SegmentRuleBuilderProps {
  conditionSet: ConditionSet
  onChange: (newSet: ConditionSet) => void
  isRoot?: boolean
  level?: number
  customFields?: { value: string, label: string, type: string }[]
}

const FIELD_OPTIONS = [
  { value: 'first_name', label: 'First Name', type: 'string' },
  { value: 'last_name', label: 'Last Name', type: 'string' },
  { value: 'email', label: 'Email Address', type: 'string' },
  { value: 'phone', label: 'Phone Number', type: 'string' },
  { value: 'city', label: 'City', type: 'string' },
  { value: 'country', label: 'Country', type: 'string' },
  { value: 'tags', label: 'Tags', type: 'array' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
  { value: 'ai_score', label: 'AI Score', type: 'number' },
  { value: 'churn_risk', label: 'Churn Risk', type: 'number' },
]

const OPERATORS_BY_TYPE: Record<string, { value: string, label: string }[]> = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'not_empty', label: 'Is Not Empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater Than or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less Than or Equal' },
  ],
  date: [
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'relative', label: 'Relative Date' },
  ],
  array: [
    { value: 'contains', label: 'Contains Any' },
    { value: 'not_contains', label: 'Does Not Contain' },
  ]
}

export function SegmentRuleBuilder({ conditionSet, onChange, isRoot = true, level = 0, customFields = [] }: SegmentRuleBuilderProps) {
  const ALL_FIELDS = [...FIELD_OPTIONS, ...customFields]
  
  const updateOperator = (op: 'AND' | 'OR') => {
    onChange({ ...conditionSet, operator: op })
  }

  const addCondition = () => {
    onChange({
      ...conditionSet,
      conditions: [
        ...conditionSet.conditions,
        { field: 'first_name', operator: 'equals', value: '' }
      ]
    })
  }

  const addGroup = () => {
    onChange({
      ...conditionSet,
      conditions: [
        ...conditionSet.conditions,
        { operator: 'AND', conditions: [{ field: 'first_name', operator: 'equals', value: '' }] }
      ]
    })
  }

  const removeNode = (index: number) => {
    const newConditions = [...conditionSet.conditions]
    newConditions.splice(index, 1)
    onChange({ ...conditionSet, conditions: newConditions })
  }

  const updateNode = (index: number, updatedNode: ConditionNode) => {
    const newConditions = [...conditionSet.conditions]
    newConditions[index] = updatedNode
    onChange({ ...conditionSet, conditions: newConditions })
  }

  // Colors based on nesting level
  const borderColors = ['border-primary-500/30', 'border-accent3/30', 'border-accent4/30', 'border-accent/30']
  const bgColors = ['bg-primary-500/5', 'bg-accent3/5', 'bg-accent4/5', 'bg-accent/5']
  
  const borderColor = borderColors[level % borderColors.length]
  const bgColor = bgColors[level % bgColors.length]

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRoot && <Filter className="w-4 h-4 text-text-muted" />}
          <div className="flex bg-surface/50 p-1 rounded-lg border border-border">
            <button
              onClick={() => updateOperator('AND')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${conditionSet.operator === 'AND' ? 'bg-primary-500 text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
            >
              AND
            </button>
            <button
              onClick={() => updateOperator('OR')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${conditionSet.operator === 'OR' ? 'bg-primary-500 text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
            >
              OR
            </button>
          </div>
          <span className="text-xs text-text-muted ml-2">
            Match {conditionSet.operator === 'AND' ? 'ALL' : 'ANY'} of the following rules
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={addCondition} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> Rule
          </button>
          {level < 3 && (
            <button onClick={addGroup} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Group
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-2 pl-2">
        {conditionSet.conditions.length === 0 && (
          <div className="text-sm text-text-muted italic py-2">No rules added yet.</div>
        )}
        
        {conditionSet.conditions.map((node, index) => {
          if (isConditionSet(node)) {
            return (
              <div key={index} className="relative">
                <div className="absolute -left-4 top-6 w-4 border-t border-border/50"></div>
                <div className="absolute -left-4 top-0 bottom-0 border-l border-border/50"></div>
                <div className="flex items-start gap-2 group">
                  <div className="flex-1">
                    <SegmentRuleBuilder 
                      conditionSet={node} 
                      onChange={(newSet) => updateNode(index, newSet)} 
                      isRoot={false}
                      level={level + 1}
                    />
                  </div>
                  <button 
                    onClick={() => removeNode(index)}
                    className="p-2 mt-4 text-text-muted hover:text-danger-400 hover:bg-danger-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          } else {
            // It's a single Condition
            const condition = node as Condition
            const fieldDef = ALL_FIELDS.find(f => f.value === condition.field)
            const type = fieldDef ? fieldDef.type : 'string'
            const operators = OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string

            return (
              <div key={index} className="relative flex items-center gap-2 group">
                <div className="absolute -left-4 top-1/2 w-4 border-t border-border/50"></div>
                {index !== conditionSet.conditions.length - 1 && (
                  <div className="absolute -left-4 top-0 bottom-0 border-l border-border/50"></div>
                )}
                {index === conditionSet.conditions.length - 1 && (
                  <div className="absolute -left-4 top-0 h-1/2 border-l border-border/50"></div>
                )}
                
                <div className="flex-1 flex flex-wrap items-center gap-2 bg-surface p-2 rounded-lg border border-border shadow-sm">
                  {/* Field Selector */}
                  <div className="relative">
                    <select 
                      className="appearance-none bg-base border border-border rounded-md pl-3 pr-8 py-1.5 text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-40"
                      value={condition.field}
                      onChange={(e) => updateNode(index, { ...condition, field: e.target.value, operator: OPERATORS_BY_TYPE[ALL_FIELDS.find(f => f.value === e.target.value)?.type || 'string'][0].value, value: '' })}
                    >
                      {ALL_FIELDS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>

                  {/* Operator Selector */}
                  <div className="relative">
                    <select 
                      className="appearance-none bg-base border border-border rounded-md pl-3 pr-8 py-1.5 text-sm text-primary-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none w-48"
                      value={condition.operator}
                      onChange={(e) => updateNode(index, { ...condition, operator: e.target.value })}
                    >
                      {operators.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-300 pointer-events-none" />
                  </div>

                  {/* Value Input (hide if operator is is_empty or not_empty) */}
                  {!['is_empty', 'not_empty'].includes(condition.operator) && (
                    <input 
                      type={type === 'number' ? 'number' : type === 'date' && condition.operator !== 'relative' ? 'date' : 'text'}
                      className="flex-1 bg-base border border-border rounded-md px-3 py-1.5 text-sm text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-w-[150px]"
                      placeholder="Enter value..."
                      value={condition.value}
                      onChange={(e) => updateNode(index, { ...condition, value: e.target.value })}
                    />
                  )}
                </div>
                
                <button 
                  onClick={() => removeNode(index)}
                  className="p-2 text-text-muted hover:text-danger-400 hover:bg-danger-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-none"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
