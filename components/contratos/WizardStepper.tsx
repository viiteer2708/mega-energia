'use client'

import { Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error'

export interface Step {
  label: string
  status: StepStatus
}

interface WizardStepperProps {
  steps: Step[]
  currentStep: number
  onStepClick: (index: number) => void
  progress: number
}

export function WizardStepper({ steps, currentStep, onStepClick, progress }: WizardStepperProps) {
  return (
    <div className="mb-6">
      {/* Steps */}
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, i) => {
          const isActive = i === currentStep
          const isComplete = step.status === 'complete'
          const isError = step.status === 'error'
          const isInProgress = step.status === 'in_progress'

          return (
            <button
              key={i}
              type="button"
              onClick={() => onStepClick(i)}
              className={cn(
                'group flex flex-1 flex-col items-center gap-1.5 transition-all',
                'cursor-pointer'
              )}
            >
              {/* Circle */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
                  isActive && 'border-primary bg-primary text-primary-foreground scale-110',
                  isComplete && 'border-green-500 bg-green-500 text-white',
                  isError && 'border-red-500 bg-red-500/20 text-red-400',
                  isInProgress && !isActive && 'border-amber-500 bg-amber-500/20 text-amber-400',
                  !isActive && !isComplete && !isError && !isInProgress && 'border-border bg-background text-muted-foreground',
                  'group-hover:scale-105'
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : isError ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-[11px] font-medium transition-colors hidden sm:block',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {progress}%
        </span>
      </div>
    </div>
  )
}
