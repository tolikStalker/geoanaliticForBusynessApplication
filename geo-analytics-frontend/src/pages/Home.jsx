import { Link } from "react-router-dom";
import { useState } from "react";

const features = [
	{
		title: "Анализ конкурентов",
		text: "Выявление плотности аналогичных бизнесов",
		details:
			"Дополнительно анализируются ближайшие бизнесы, их количество, уровень конкуренции и потенциальная аудитория.",
	},
	// {
	// 	title: "Трафик",
	// 	text: "Пешеходный и автомобильный поток",
	// 	details:
	// 		"Используются данные о загруженности дорог, количестве пешеходов в разное время суток и сезонность трафика.",
	// },
	{
		title: "Экономика",
		text: "Стоимость аренды и окупаемость",
		details:
			"Рассчитываются средние цены аренды в регионе, потенциальный доход и сроки окупаемости бизнеса.",
	},
];

export default function Home() {
	const [expandedStates, setExpandedStates] = useState([false, false, false]);

	const handleToggle = (index) => {
		setExpandedStates((prevStates) =>
			prevStates.map((state, i) => (i === index ? !state : state))
		);
	};

	return (
		<div className="min-h-screen bg-gradient-to-t from-blue-100 to-blue-50">
			<main className="max-w-6xl mx-auto px-4 py-16">
				<div className="text-center mb-16">
					<h2 className="text-4xl font-bold mb-4">
						Оптимальное расположение бизнеса
					</h2>
					<p className="text-gray-600 mb-8">
						Анализ местности по конкурентам, трафику и стоимости
						аренды
					</p>
					<Link to="/analyze" className="btn-primary-lg">
						Начать анализ
					</Link>
				</div>

				<div className="grid md:grid-cols-2 gap-8 mb-16 items-start">
					{features.map((feature, index) => (
						<FeatureCard
							key={index}
							title={feature.title}
							text={feature.text}
							details={feature.details}
							isExpanded={expandedStates[index]}
							onToggle={() => handleToggle(index)}
						/>
					))}
				</div>
			</main>
		</div>
	);
}

const FeatureCard = ({ title, text, details, isExpanded, onToggle }) => {
	return (
		<div
			className={`p-6 bg-white rounded-xl shadow-md 
        hover:shadow-lg hover:bg-gray-100
        transition-all duration-300 cursor-pointer min-h-35 hover:transform hover:scale-[1.02] transition-max-height ${
			isExpanded ? "max-h-[500px]" : "max-h-35"
		}`}
			onClick={onToggle}
		>
			<h3 className="text-xl font-semibold mb-2">{title}</h3>
			<p className="text-gray-600 mb-4">{text}</p>

			<div
				className={`mt-4 text-gray-700 transition-all duration-300 ${
					isExpanded ? "" : "opacity-0"
				}`}
			>
				{details}
				<div className="flex justify-center mt-2">
					<div className="w-8 h-1 rounded-full bg-gray-200 transition-all duration-300" />
				</div>
			</div>
		</div>
	);
};
