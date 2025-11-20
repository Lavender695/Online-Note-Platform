import React from 'react'
import MyEditorPage from '@/features/editor/page'

type Props = {}

const EdittingBlock = (props: Props) => {
  return (
    <div className='grow bg-blue-50 h-screen'>
      <MyEditorPage />
    </div>
  )
}

export default EdittingBlock