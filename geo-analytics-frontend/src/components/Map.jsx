import { useRef, useEffect } from "react";
import L from "leaflet";
import { scaleLog } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";

const customIcon = new L.Icon({
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
});

function getHexColor(pop, popMax) {
	if (!pop || pop <= 0 || !popMax || popMax <= 0) return "#f7fcb9"; // безопасный цвет

	const scale = scaleLog().domain([1, popMax]).range([0, 1]).clamp(true);

	return interpolateRdYlGn(scale(pop)); // от светло-желтого к зелёному
}

export default function Map({ center, zoom, analysisResult }) {
	const mapRef = useRef(null);
	const mapInstance = useRef(null);
	const layerRefs = useRef({
		bounds: null,
		hexs: null,
		legend: null,
		circles: null,
	});
	const hexStyle = (feature) => {
		// Предполагаем, что население хранится в feature.properties.population
		const pop = feature.properties.pop;
		return {
			fillColor: getHexColor(pop, analysisResult.hexs.max),
			weight: 1,
			opacity: 0.3,
			color: "gray",
			fillOpacity: 0.5,
		};
	};

	// const tileLayerRef = useRef(null);
	const markersRef = useRef([]);

	useEffect(() => {
		// Инициализация карты
		if (!mapInstance.current && mapRef.current) {
			mapInstance.current = L.map(mapRef.current, {
				center: center,
				zoom: zoom,
				zoomControl: false,
			});

			// Добавление тайлов OpenStreetMap
			L.tileLayer(
				"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			).addTo(mapInstance.current);

			// Добавление кастомного контрола зума
			L.control
				.zoom({
					position: "bottomright",
				})
				.addTo(mapInstance.current);
		}

		// Обновление позиции и зума
		if (mapInstance.current) {
			mapInstance.current.setView(center, zoom);
		}

		// Очистка при размонтировании
		return () => {
			if (mapInstance.current) {
				mapInstance.current.remove();
				mapInstance.current = null;
			}
		};
	}, [center, zoom]);

	useEffect(() => {
		if (!mapInstance.current) return;

		// Если слой границ уже добавлен, удаляем его
		if (layerRefs.current.bounds) {
			mapInstance.current.removeLayer(layerRefs.current.bounds);
			layerRefs.current.bounds = null;
		}
		// Если слой гексагонов уже добавлен, удаляем его
		if (layerRefs.current.hexs) {
			mapInstance.current.removeLayer(layerRefs.current.hexs);
			layerRefs.current.hexs = null;
		}
		// Удаляем предыдущую легенду
		if (layerRefs.current.legend) {
			mapInstance.current.removeControl(layerRefs.current.legend);
			layerRefs.current.legend = null;
		}

		// Удаление старых маркеров
		markersRef.current.forEach((marker) => marker.remove());
		markersRef.current = [];

		// Удаляем старые круги (если захочешь хранить в layerRefs.current.circles)
		(layerRefs.current.circles || []).forEach((circle) => circle.remove());
		layerRefs.current.circles = [];

		// Добавляем границы города
		if (analysisResult?.bounds) {
			layerRefs.current.bounds = L.geoJSON(analysisResult.bounds, {
				style: { color: "red", weight: 2, fillOpacity: 0.1 },
			}).addTo(mapInstance.current);
		}

		// Добавляем гексагоны
		if (analysisResult?.hexs) {
			layerRefs.current.hexs = L.geoJSON(analysisResult.hexs, {
				style: hexStyle,
				onEachFeature: (feature, layer) => {
					const pop = feature.properties.pop;
					layer.bindPopup(`<b>Население:</b> ${pop} чел.`);
				},
			}).addTo(mapInstance.current);
		}

		if (analysisResult?.locations?.length) {
			analysisResult.locations.forEach((loc) => {
				const [lat, lon] = loc.center;

				const circle = L.circle([lat, lon], {
					radius: analysisResult.circle_radius_km * 1000,
					color: "blue",
					weight: 2,
					fillOpacity: 0.1,
				})
					.bindPopup(
						`<b>Население:</b> ${loc.pop_sum.toLocaleString()}`
					)
					.addTo(mapInstance.current);

				layerRefs.current.circles.push(circle);
			});
		}

		// Добавление новых маркеров
		if (mapInstance.current && analysisResult?.rent_places.length > 0) {
			analysisResult.rent_places.forEach((place) => {
				const marker = L.marker(place.coordinates, { icon: customIcon })
					.bindPopup(
						`<b>Ссылка:</b> <a href="https://rostov.cian.ru/rent/commercial/${place.id}" target="_blank">Посмотреть</a><br><b>Стоимость:</b> ${place.price} ₽<br><b>Площадь:</b> ${place.total_area} м²`
					)
					.addTo(mapInstance.current);
				markersRef.current.push(marker);
			});
		}

		// Добавление новых маркеров
		if (mapInstance.current && analysisResult?.competitors.length > 0) {
			analysisResult.competitors.forEach((place) => {
				const marker = L.marker(place.coordinates, { icon: customIcon })
					.bindPopup(
						`<b>${place.name}</b><br><b>Рейтинг:</b> ${place.rate}<br><b>Количество отзывов:</b> ${place.rate_count}`
					)
					.addTo(mapInstance.current);
				markersRef.current.push(marker);
			});
		}

		if (analysisResult?.hexs?.max) {
			const legend = L.control({ position: "bottomleft" });

			legend.onAdd = function () {
				const div = L.DomUtil.create(
					"div",
					"info legend bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md space-y-2 min-w-[300px]"
				);
				const maxPop = analysisResult.hexs.max;

				// Генерация меток для логарифмической шкалы
				const generateLogLabels = (max) => {
					const labels = new Set([0]);
					const maxOrder = Math.ceil(Math.log10(Math.max(max, 10)));

					for (let i = 0; i <= maxOrder; i++) {
						const value = Math.pow(10, i);
						if (value <= max) labels.add(value);
					}
					labels.add(max);
					return Array.from(labels).sort((a, b) => a - b);
				};

				const logScalePoints = generateLogLabels(maxPop);

				div.innerHTML = `
				<h4 class="text-sm font-medium text-gray-700 mb-2">Население, чел.</h4>
				<div class="relative">
					<svg width="100%" height="20" class="rounded opacity-90">
						<defs>
							<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
							${Array.from(
								{ length: 10 },
								(_, i) =>
									`<stop offset="${
										i * 10
									}%" stop-color="${interpolateRdYlGn(
										i / 9
									)}"/>`
							).join("")}							</linearGradient>
						</defs>
						<rect width="100%" height="20" fill="url(#gradient)" fill-opacity="0.8"/>
					</svg>
					<div class="flex justify-between mt-1 text-xs text-gray-600">
					${logScalePoints
						.map(
							(p) => `
                        <span class="block transform">
                            ${
								p === 0
									? 0
									: p.toLocaleString().replace(/,/g, " ")
							}
                        </span>
                    `
						)
						.join("")}
					</div>
				</div>
			`;

				return div;
			};

			legend.addTo(mapInstance.current);
			layerRefs.current.legend = legend;
		}
	}, [analysisResult]);

	return <div ref={mapRef} className="h-full w-full" />;
}
