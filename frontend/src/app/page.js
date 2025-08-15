export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600">Welcome to Converto</h1>
      <p className="mt-4 text-lg text-gray-700">Upload your meeting audio to get started!</p>
      <input type="file" accept="audio/*" className="mt-4 p-2 border rounded text-gray-400" />
    </div>
  );
}