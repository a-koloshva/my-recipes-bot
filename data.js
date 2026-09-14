import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Эмуляция __dirname для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'recipes.json');

export const CATEGORIES = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
};

export async function loadData() {
    const emptyData = { recipes: [], nextId: 1 };

    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');

        if (!data.trim()) {
            throw new Error(`Файл данных пуст: ${DATA_FILE}`);
        }

        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await saveData(emptyData);
            return emptyData;
        }

        throw new Error(`Не удалось загрузить данные из ${DATA_FILE}: ${error.message}`, {
            cause: error,
        });
    }
}

export async function saveData(data) {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

let dataOperation = Promise.resolve();

function withDataLock(operation) {
    const result = dataOperation.then(operation);

    // Ошибка одной операции не блокирует следующие
    dataOperation = result.catch(() => {});

    return result;
}

export async function addRecipe(name, category, description) {
    return withDataLock(async () => {
        const data = await loadData();

        const recipe = {
            id: data.nextId,
            name: name.trim(),
            category,
            description: description.trim(),
            createdAt: new Date().toISOString(),
        };

        data.recipes.push(recipe);
        data.nextId++;

        await saveData(data);
        return recipe;
    });
}

export async function getAllRecipes() {
    const data = await loadData();
    return data.recipes;
}

export async function getRecipesByCategory(category) {
    const data = await loadData();
    return data.recipes.filter((r) => r.category === category);
}

export async function deleteRecipe(id) {
    return withDataLock(async () => {
        const data = await loadData();
        const initialLength = data.recipes.length;

        data.recipes = data.recipes.filter((recipe) => recipe.id !== id);

        if (data.recipes.length < initialLength) {
            await saveData(data);
            return true;
        }

        return false;
    });
}
