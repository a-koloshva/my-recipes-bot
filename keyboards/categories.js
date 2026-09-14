import pkg from 'telegraf';
const { Markup } = pkg;
import { CATEGORIES } from '../data.js';

export function categoryMenu() {
    const buttons = Object.keys(CATEGORIES).map((key) =>
        Markup.button.callback(CATEGORIES[key], `category_${key}`),
    );

    buttons.push(Markup.button.callback('⬅️ Главное меню', 'back_to_menu'));

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }

    return Markup.inlineKeyboard(rows);
}
