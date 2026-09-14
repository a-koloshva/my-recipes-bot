import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY = path.join(__dirname, 'data');
const DATABASE_FILE = path.join(DATA_DIRECTORY, 'recipes.sqlite');
const LEGACY_DATA_FILE = path.join(DATA_DIRECTORY, 'recipes.json');

export const CATEGORIES = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
};

fs.mkdirSync(DATA_DIRECTORY, { recursive: true });

const database = new DatabaseSync(DATABASE_FILE);
database.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        link TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
`);

const recipeColumns = database.prepare('PRAGMA table_info(recipes)').all();
if (!recipeColumns.some((column) => column.name === 'link')) {
    database.exec("ALTER TABLE recipes ADD COLUMN link TEXT NOT NULL DEFAULT ''");
}

function migrateLegacyData() {
    const recipeCount = database.prepare('SELECT COUNT(*) AS count FROM recipes').get().count;

    if (Number(recipeCount) > 0 || !fs.existsSync(LEGACY_DATA_FILE)) {
        return;
    }

    const legacyData = JSON.parse(fs.readFileSync(LEGACY_DATA_FILE, 'utf8'));
    const recipes = Array.isArray(legacyData.recipes) ? legacyData.recipes : [];
    const insert = database.prepare(`
        INSERT INTO recipes (id, name, category, description, link, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    database.exec('BEGIN');
    try {
        for (const recipe of recipes) {
            insert.run(
                recipe.id,
                String(recipe.name ?? '').trim(),
                recipe.category,
                String(recipe.description ?? '').trim(),
                String(recipe.link ?? '').trim(),
                recipe.createdAt || new Date().toISOString(),
            );
        }
        database.exec('COMMIT');
    } catch (error) {
        database.exec('ROLLBACK');
        throw new Error(`Не удалось перенести данные из ${LEGACY_DATA_FILE}: ${error.message}`, {
            cause: error,
        });
    }
}

migrateLegacyData();

function mapRecipe(recipe) {
    return {
        id: Number(recipe.id),
        name: recipe.name,
        category: recipe.category,
        description: recipe.description,
        link: recipe.link,
        createdAt: recipe.created_at,
    };
}

export async function loadData() {
    const recipes = database
        .prepare('SELECT id, name, category, description, link, created_at FROM recipes ORDER BY id')
        .all()
        .map(mapRecipe);

    return {
        recipes,
        nextId: recipes.length > 0 ? recipes[recipes.length - 1].id + 1 : 1,
    };
}

export async function saveData(data) {
    database.exec('BEGIN');
    try {
        database.exec('DELETE FROM recipes');
        const insert = database.prepare(`
            INSERT INTO recipes (id, name, category, description, link, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const recipe of data.recipes) {
            insert.run(
                recipe.id,
                recipe.name,
                recipe.category,
                recipe.description ?? '',
                recipe.link ?? '',
                recipe.createdAt || new Date().toISOString(),
            );
        }

        database.exec('COMMIT');
    } catch (error) {
        database.exec('ROLLBACK');
        throw error;
    }
}

let dataOperation = Promise.resolve();

function withDataLock(operation) {
    const result = dataOperation.then(operation);
    dataOperation = result.catch(() => {});
    return result;
}

export function addRecipe(name, category, description, link = '') {
    return withDataLock(async () => {
        const createdAt = new Date().toISOString();
        const result = database
            .prepare(
                `
                INSERT INTO recipes (name, category, description, link, created_at)
                VALUES (?, ?, ?, ?, ?)
            `,
            )
            .run(name.trim(), category, description.trim(), link.trim(), createdAt);

        return {
            id: Number(result.lastInsertRowid),
            name: name.trim(),
            category,
            description: description.trim(),
            link: link.trim(),
            createdAt,
        };
    });
}

export async function getAllRecipes() {
    return (await loadData()).recipes;
}

export async function getRecipesByCategory(category) {
    return database
        .prepare(
            `
            SELECT id, name, category, description, link, created_at
            FROM recipes
            WHERE category = ?
            ORDER BY id
        `,
        )
        .all(category)
        .map(mapRecipe);
}

export function deleteRecipe(id) {
    return withDataLock(async () => {
        const result = database.prepare('DELETE FROM recipes WHERE id = ?').run(id);
        return result.changes > 0;
    });
}
