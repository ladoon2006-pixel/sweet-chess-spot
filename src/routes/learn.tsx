import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/learn')({
  component: LearnPage,
})

function LearnPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">📚 Learn Chess</h1>
        <p className="text-gray-600 text-lg">Coming soon...</p>
      </div>
    </div>
  )
}
