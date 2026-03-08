import { ChatInterface } from './components/ChatInterface'

function App() {
  return (
    <div className="h-screen flex flex-col bg-[#f5f5f5]">
      <main className="flex-1 min-h-0 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  )
}

export default App
