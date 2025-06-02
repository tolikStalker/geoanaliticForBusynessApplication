import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../components/UserContext.jsx";
import { useNavigate } from "react-router-dom";

const formatDate = (isoString) => {
	if (!isoString) return "N/A";
	try {
		const date = new Date(isoString);
		return date.toLocaleString("ru-RU", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch (error) {
		console.error("Error formatting date:", error);
		return isoString;
	}
};

const formatNumber = (value) => {
	if (value === null || value === undefined) return "N/A";
	return Number(value).toLocaleString("ru-RU");
};

export default function Profile() {
	const { user } = useUser();
	const [history, setHistory] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchHistory = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await axios.get(
					"http://localhost:5000/api/history",
					{
						withCredentials: true,
					}
				);
				setHistory(response.data || []);
				console.log("Analysis history:", response.data);
			} catch (err) {
				console.error("Error fetching analysis history:", err);
				let errorMessage = "Не удалось загрузить историю запросов.";
				if (err.response) {
					if (err.response.status === 401) {
						errorMessage =
							"Пожалуйста, войдите в систему для просмотра истории.";
					} else {
						errorMessage = `Ошибка сервера: ${
							err.response.status
						} ${err.response.data?.message || ""}`;
					}
				} else if (err.request) {
					errorMessage =
						"Нет ответа от сервера. Проверьте соединение.";
				}
				setError(errorMessage);
				setHistory(null);
			} finally {
				setLoading(false);
			}
		};

		fetchHistory();
	}, []);

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6 text-gray-800">
				Профиль пользователя {user ? `(${user})` : ""}
			</h1>

			<section>
				<h2 className="text-2xl font-semibold mb-4 text-gray-700">
					История запросов анализа
				</h2>

				{loading && (
					<div className="text-center text-gray-500 py-5">
						<div
							className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
							role="status"
						>
							<span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
								Загрузка...
							</span>
						</div>
						<p className="mt-2">Загрузка истории...</p>
					</div>
				)}

				{error && (
					<div
						className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
						role="alert"
					>
						<strong className="font-bold">Ошибка! </strong>
						<span className="block sm:inline">{error}</span>
					</div>
				)}

				{!loading && !error && history?.length === 0 && (
					<p className="text-gray-600">
						У вас пока нет истории запросов.
					</p>
				)}

				{!loading && !error && history?.length > 0 && (
					<div className="space-y-4">
						{history.map((item) => (
							<HistoryItemCard key={item.id} item={item} />
						))}
					</div>
				)}
			</section>
		</div>
	);
}

function HistoryItemCard({ item }) {
	const navigate = useNavigate();

	const handleClick = () => {
		const queryParams = new URLSearchParams({
			city_id: item.city_id, // название города
			category_id: item.category_id, // название категории
			radius: item.radius,
			rent: item.rent,
			max_competitors: item.max_competitors,
			area_count: item.area_count,
		}).toString();

		navigate(`/analyze?${queryParams}`);
	};

	return (
		<div
			onClick={handleClick}
			name="history-entry"
			className="bg-white shadow-md rounded-lg p-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200"
		>
			<p className="text-sm text-gray-500 mb-2">
				{formatDate(item.created_at)}
			</p>
			<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
				<Detail label="Город" value={item.city} />
				<Detail label="Категория" value={item.category} />
				<Detail label="Радиус" value={`${item.radius} км`} />
				<Detail
					label="Макс. аренда"
					value={`${formatNumber(item.rent)} ₽`}
				/>
				<Detail label="Макс. конкур." value={item.max_competitors} />
				<Detail label="Кол-во зон" value={item.area_count} />
			</div>
		</div>
	);
}

function Detail({ label, value }) {
	return (
		<div>
			<span className="font-medium text-gray-600">{label}:</span>
			<span className="text-gray-800 ml-1">{value ?? "N/A"}</span>
		</div>
	);
}
