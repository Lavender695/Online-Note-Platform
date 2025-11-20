import Headbar from './sidebar/Headbar'

type Props = {}

const Sidebar = (props: Props) => {
  return (
    <div className='hidden md:flex flex-col bg-pink-100 h-screen w-[18%] min-w-60'>
      <Headbar />
      <h2>content</h2>
    </div>
  )
}

export default Sidebar