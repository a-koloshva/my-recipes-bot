import pkg from 'telegraf';
const { Markup } = pkg;

export function mainMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('➕ Добавить рецепт', 'add_recipe'),
            Markup.button.callback('📋 Все рецепты', 'list_all'),
        ],
        [Markup.button.callback('🍽 Приёмы пищи', 'show_meals')],
        [Markup.button.callback('🗑 Удалить рецепт', 'delete_recipe')],
    ]);
}

export function backToMenu() {
    return Markup.inlineKeyboard([[Markup.button.callback('⬅️ Главное меню', 'back_to_menu')]]);
}
