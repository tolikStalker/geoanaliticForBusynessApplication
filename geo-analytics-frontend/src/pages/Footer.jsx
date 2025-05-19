import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";

export default function Footer() {
	return (
		<footer className="bg-gradient-to-t shadow-lg from-blue-100 to-blue-50 text-gray-700 border-t border-gray-300">
			<div className="max-w-6xl mx-auto px-4 py-10">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-10">
					{/* О компании */}
					<div>
						<h3 className="text-xl text-center font-semibold mb-4 text-gray-900">
							GeoAnalytics
						</h3>
						<p className="text-sm leading-relaxed text-justify">
							Сайт создан в рамках дипломной работы студента 4 курса ЮФУ, кафедры МОП ЭВМ,
							специальности 09.03.04 "Программная инженерия" — Евстратьева Анатолия.
							Данные используются исключительно в учебных и научных целях и не
							предназначены для коммерческого использования.
						</p>
					</div>

					{/* Контакты */}
					<div>
						<h3 className="text-xl text-center font-semibold mb-4 text-gray-900">
							Контакты
						</h3>
						<ul className="space-y-4 text-sm">
							<li className="flex items-center justify-center gap-3">
								<EnvelopeIcon className="w-5 h-5 text-gray-600" />
								<a
									href="mailto:evstratev@sfedu.ru"
									className="hover:underline break-all"
								>
									evstratev@sfedu.ru
								</a>
							</li>
							<li className="flex items-center justify-center gap-3">
								<PhoneIcon className="w-5 h-5 text-gray-600" />
								<a
									href="tel:+79888585418"
									className="hover:underline"
								>
									+7 (988) 858-54-18
								</a>
							</li>
						</ul>
					</div>
				</div>

				{/* Нижняя часть */}
				<div className="mt-10 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
					<p>
						© {new Date().getFullYear()} GeoAnalytics. Все права защищены.
					</p>
				</div>
			</div>
		</footer>
	);
}
