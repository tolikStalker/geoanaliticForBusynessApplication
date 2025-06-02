import { formatNumber } from "../utils/filters";

export default function ZoneList({ zones, circleRefs, onZoneClick }) {
	if (!zones || zones.length === 0) return null;

	return (
		<div className="mt-4">
			<h4 className="font-semibold mb-2">
				Рекомендуемые зоны размещения
			</h4>
			<ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
				{zones.map((zone, index) => (
					<li
						className="p-2 border rounded shadow-sm bg-gray-50"
						key={zone.id}
						onClick={() => onZoneClick?.(zone.id)}
					>
						<div>
							Ранг: <strong>{zone.rank ?? index + 1}</strong>
						</div>
						{zone.pop_sum && (
							<div>Население: {formatNumber(zone.pop_sum)}</div>
						)}
						{zone.comp_count && (
							<div>Конкурентов: {zone.comp_count}</div>
						)}
						<div className="text-sm text-gray-500">
							Координаты: {zone.center[0].toFixed(3)},{" "}
							{zone.center[1].toFixed(3)}
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
