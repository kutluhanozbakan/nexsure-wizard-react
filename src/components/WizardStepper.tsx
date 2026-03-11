import React from 'react';

interface Props {
  steps: string[];
  currentStep: number;
  onStepClicked: (step: number) => void;
}

export const WizardStepper: React.FC<Props> = ({ steps, currentStep, onStepClicked }) => {
  return (
    <div className="stepper-container">
      {steps.map((title, index) => {
        const isActive = currentStep === index;
        // Optional: add 'past' styling if desired
        return (
          <div 
            key={index} 
            className={`step-item ${isActive ? 'active' : ''}`}
            onClick={() => onStepClicked(index)}
          >
            <div className="step-circle">{index + 1}</div>
            <span className="step-label font-semibold">{title}</span>
          </div>
        );
      })}
    </div>
  );
};
