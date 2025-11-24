import React from 'react'
import EdittingBlock from './home/EdittingBlock' 
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../ui/sidebar'
import { AppSidebar } from './home/AppSidebar'

type Props = {}

const Main = (props: Props) => {
  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        {/* Header will be rendered outside Main component */}
        <div className="flex-1 flex">
          <AppSidebar />
          <SidebarInset className="flex-1 overflow-x-hidden">
            {/* Move SidebarTrigger inside the flex container but outside SidebarInset */}
            <EdittingBlock />
          </SidebarInset>
        </div>
        {/* Place SidebarTrigger at the bottom of sidebar */}
        <SidebarTrigger className="fixed bottom-20 left-4 z-50" />
      </div>
    </SidebarProvider>
  )
}

export default Main