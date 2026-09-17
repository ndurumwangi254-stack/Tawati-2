export default function BarChart({ data, valuePrefix = '', danger = false }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.name} className="grid grid-cols-[110px_1fr_60px] items-center gap-2.5 text-[13px]">
          <span>{d.name}</span>
          <div className="bg-gray-100 rounded h-2.5 overflow-hidden">
            <div
              className={`h-full rounded ${danger ? 'bg-danger' : 'bg-primary'}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-right">
            {valuePrefix}
            {d.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
