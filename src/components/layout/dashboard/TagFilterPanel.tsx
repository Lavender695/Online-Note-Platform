import { ChevronDown, Filter, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  tags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  onClear: () => void
  className?: string
  defaultExpanded?: boolean
}

const TagFilterPanel = ({
  tags,
  selectedTags,
  onToggleTag,
  onClear,
  className,
  defaultExpanded = false,
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const helperText = useMemo(() => {
    if (selectedTags.length > 0) {
      return `已选择 ${selectedTags.length} 个标签`
    }

    if (tags.length > 0) {
      return `共 ${tags.length} 个标签，点击展开选择`
    }

    return '当前还没有可用标签'
  }, [selectedTags.length, tags.length])

  return (
    <section
      className={cn(
        'w-full rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <div className="flex min-h-10 items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Filter className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">标签筛选</div>
            <div className="truncate text-xs text-muted-foreground">{helperText}</div>
          </div>

          <span
            className={cn(
              'ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>

        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 rounded-full px-3">
            <X className="mr-1 h-3.5 w-3.5" />
            清除
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 rounded-2xl border border-dashed border-border/80 bg-muted/35 px-3 py-3">
          <div className="flex h-24 content-start flex-wrap gap-2 overflow-y-auto pr-1">
            {tags.length > 0 ? (
              tags.map((tag) => {
                const active = selectedTags.includes(tag)

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    className={cn(
                      'inline-flex h-9 items-center rounded-full border px-3 text-sm transition-all duration-200',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <Tags className="mr-1.5 h-3.5 w-3.5" />
                    {tag}
                  </button>
                )
              })
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                暂无标签
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default TagFilterPanel
