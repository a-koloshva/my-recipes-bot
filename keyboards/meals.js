import pkg from 'telegraf';
const { Markup } = pkg;

export function mealsMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🍳 Завтрак', 'show_breakfast')],
        [Markup.button.callback('🥗 Обед', 'show_lunch')],
        [Markup.button.callback('🍲 Ужин', 'show_dinner')],
        [Markup.button.callback('⬅️ Главное меню', 'back_to_menu')],
    ]);
}

export function categoryActions(category) {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🍽 Выбрать блюдо', `choose_recipe_${category}`)],
        [Markup.button.callback('⬅️ Приёмы пищи', 'back_to_meals')],
    ]);
}
