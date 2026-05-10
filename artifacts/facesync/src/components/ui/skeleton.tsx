import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-br from-primary/5 via-primary/10 to-transparent ring-1 ring-white/10 shadow-inner backdrop-blur-sm", 
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
