import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

const NoteCardSkeleton = ({ className }: Props) => {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="mt-1 h-4 w-2/5 rounded-md" />
      </CardHeader>

      <CardContent className="flex-1 space-y-2 overflow-hidden py-2">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-11/12 rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />

        <div className="flex flex-wrap gap-1 pt-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </CardContent>

      <CardFooter className="border-t border-border pt-2">
        <Skeleton className="h-4 w-20 rounded-md" />
      </CardFooter>
    </Card>
  )
}

export default NoteCardSkeleton
