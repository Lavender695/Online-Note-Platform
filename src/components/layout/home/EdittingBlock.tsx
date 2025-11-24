import React from 'react'
import Page from '@/app/editor/page'

type Props = {}

const EdittingBlock = (props: Props) => {
  return (
    <div className='h-full overflow-hidden scrollbar-hide'>
      <Page />
    </div>
  )
}

export default EdittingBlock