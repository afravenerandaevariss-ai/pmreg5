import React from "react"
import { cn } from "../../lib/utils"

const StepperContext = React.createContext({ orientation: "horizontal" })

const Stepper = React.forwardRef(({ className, orientation = "horizontal", children, ...props }, ref) => {
  return (
    <StepperContext.Provider value={{ orientation }}>
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "flex-row items-center space-x-4" : "flex-col space-y-4",
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child
          // Inject isLast prop into Step components so they know not to render a separator
          return React.cloneElement(child, {
            isLast: index === React.Children.count(children) - 1,
          })
        })}
      </div>
    </StepperContext.Provider>
  )
})
Stepper.displayName = "Stepper"

const Step = React.forwardRef(({ className, isLast, children, ...props }, ref) => {
  const { orientation } = React.useContext(StepperContext)
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex relative",
        orientation === "horizontal" ? "flex-1 flex-row items-center" : "flex-row items-start",
        className
      )}
      {...props}
    >
      {/* Extract StepSeparator if provided inside Step (or render implicitly if wanted, but usually explicitly added by user or child) */}
      {children}
      {!isLast && orientation === "horizontal" && (
        <div className="absolute top-1/2 left-full w-full h-[2px] bg-slate-200 -translate-y-1/2 -ml-2 z-0" />
      )}
      {!isLast && orientation === "vertical" && (
        <div className="absolute top-8 bottom-[-16px] left-4 w-[2px] bg-slate-200 -translate-x-1/2 z-0" />
      )}
    </div>
  )
})
Step.displayName = "Step"

const StepIndicator = React.forwardRef(({ className, active, completed, icon, index, ...props }, ref) => {
  const { orientation } = React.useContext(StepperContext)
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full border-2 text-sm font-semibold z-10",
        active ? "border-emerald-600 bg-emerald-600 text-white" : "",
        completed ? "border-emerald-600 bg-emerald-50 text-emerald-600" : "",
        !active && !completed ? "border-slate-300 bg-white text-slate-500" : "",
        className
      )}
      {...props}
    >
      {icon ? icon : index}
    </div>
  )
})
StepIndicator.displayName = "StepIndicator"

const StepContent = React.forwardRef(({ className, ...props }, ref) => {
  const { orientation } = React.useContext(StepperContext)
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col",
        orientation === "horizontal" ? "ml-3" : "ml-4 pb-6",
        className
      )}
      {...props}
    />
  )
})
StepContent.displayName = "StepContent"

const StepTitle = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn("text-sm font-bold text-slate-800 leading-none mb-1.5", className)}
      {...props}
    />
  )
})
StepTitle.displayName = "StepTitle"

const StepDescription = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-xs text-slate-500 leading-relaxed", className)}
      {...props}
    />
  )
})
StepDescription.displayName = "StepDescription"

const StepSeparator = React.forwardRef(({ className, ...props }, ref) => {
  const { orientation } = React.useContext(StepperContext)
  return (
    <div
      ref={ref}
      className={cn(
        "bg-slate-200 shrink-0",
        orientation === "horizontal" ? "h-[2px] flex-1 mx-4" : "w-[2px] h-full min-h-[32px] mx-auto my-2",
        className
      )}
      {...props}
    />
  )
})
StepSeparator.displayName = "StepSeparator"

export { Stepper, Step, StepIndicator, StepContent, StepTitle, StepDescription, StepSeparator }
