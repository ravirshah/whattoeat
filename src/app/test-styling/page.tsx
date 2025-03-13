'use client';

export default function TestStyling() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        Tailwind CSS Test
      </h1>
      
      <p className="text-gray-700 mb-4">
        This page tests if Tailwind CSS is working correctly.
      </p>
      
      <div className="bg-green-100 border border-green-500 text-green-700 p-4 rounded mb-4">
        This box should have a green background and border.
      </div>
      
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        This should be a blue button
      </button>
    </div>
  );
}