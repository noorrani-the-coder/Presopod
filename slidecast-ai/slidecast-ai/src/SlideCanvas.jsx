export default function SlideCanvas({ slide }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-900">
      <div className="w-[960px] h-[540px] bg-white p-10 rounded-xl">
        <h1 className="text-3xl font-bold">{slide.title}</h1>
        <ul className="mt-6">
          {slide.bullets.map((b, i) => (
            <li key={i}>• {b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
