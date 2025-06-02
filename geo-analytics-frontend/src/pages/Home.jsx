import { Link } from "react-router-dom";
import { useState } from "react";

const features = [
	{
		title: "Анализ конкурентов",
		text: "Картина конкурентной среды рядом с выбранной локацией",
		details:
			"Система определяет плотность аналогичных бизнесов, их рейтинг, количество отзывов и потенциальную аудиторию. Это позволяет оценить уровень конкуренции и выбрать оптимальное место для открытия нового объекта.",
	},
	{
		title: "Экономика",
		text: "Анализ аренды и расчет окупаемости",
		details:
			"Автоматически рассчитываются средние цены аренды по выбранному району, потенциальный доход и сроки окупаемости инвестиций. Можно подобрать лучшие варианты с точки зрения бюджета и рисков.",
	},
	{
		title: "Плотность населения",
		text: "Где больше клиентов?",
		details:
			"Отображается плотность и структура населения по районам и кварталам, что помогает выбрать наиболее перспективные точки с максимальным потоком потенциальных клиентов.",
	},
	{
		title: "Интерактивная карта",
		text: "Гибкая визуализация данных",
		details:
			"Вся аналитика отображается на современной интерактивной карте: можно управлять слоями — смотреть конкурентов, предложения аренды, демографию, фильтровать и сравнивать локации.",
	},
	{
		title: "Фильтрация и сценарии поиска",
		text: "Под ваши задачи",
		details:
			"Гибкие фильтры позволяют учитывать тип бизнеса, целевой бюджет, радиус поиска, допустимое количество конкурентов и другие параметры для индивидуального анализа.",
	},
	{
		title: "Автоматический сбор и обновление данных",
		text: "Только актуальная информация",
		details:
			"Данные агрегируются из разных источников и регулярно обновляются: вы всегда работаете с актуальной картиной рынка.",
	},
];

export default function Home() {
	const [expandedStates, setExpandedStates] = useState(
		features.map(() => false)
	);

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

				<div className="grid md:grid-cols-3 gap-8 mb-16 items-start">
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
		transition-all duration-300 cursor-pointer min-h-35 
		hover:transform hover:scale-[1.02]
		${isExpanded ? "" : "overflow-hidden max-h-[160px]"}`}
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
