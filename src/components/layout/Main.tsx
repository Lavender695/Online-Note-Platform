import React from 'react'
import Sidebar from './home/Sidebar'
import EdittingBlock from './home/EdittingBlock' 

type Props = {}

const Main = (props: Props) => {
  return (
    <div>
      <main className="flex">
        <Sidebar />
        <EdittingBlock />
      </main>
    </div>
  )
}

export default Main